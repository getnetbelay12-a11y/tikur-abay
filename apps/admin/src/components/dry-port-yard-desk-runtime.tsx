'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { memo, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { apiGet, apiPost } from '../lib/api';
import { bookingQuoteStorageKey, type UnifiedBookingRequest } from '../lib/booking-quote-demo-data';
import { dryPortYardRecords, type YardRecord } from '../lib/dry-port-yard-demo-data';
import {
  hydrateManualWorkflowStateFromServer,
  manualCorridorStorageUpdatedEvent,
  mergeYardRecords,
  syncManualEmptyReturnDispatchFromYard,
  upsertManualYardRecord,
} from '../lib/manual-corridor-journey';
import { readShippingPhase1Workspace } from '../lib/shipping-phase1';
import { downloadYardReceiptPdf } from '../lib/shipping-pdf';

const storageOptions = ['Zone B / Bay 14', 'Warehouse 2 / Bay 03', 'Kality zone D / Rack 08', 'Addis direct delivery dock 2', 'Modjo outbound empty lane'];
const YardSupportPanels = dynamic(
  () => import('./yard-support-panels').then((module) => module.YardSupportPanels),
  {
    ssr: false,
    loading: () => <div className="yard-empty-state">Loading support panels...</div>,
  },
);

type CustomerReceiptState = {
  status:
    | 'awaiting_customer_confirmation'
    | 'received_clean'
    | 'received_with_shortage'
    | 'received_with_damage'
    | 'received_with_shortage_and_damage'
    | 'under_review'
    | 'customer_confirmed'
    | 'customer_rejected'
    | 'resolved';
  receivedBy: string;
  receivingCompany: string;
  receivingContact: string;
  receivedAt: string;
  podStatus: 'pending' | 'uploaded' | 'signed' | 'verified' | 'disputed';
  signatureCaptured: boolean;
  photoProofCaptured: boolean;
  shortageStatus: 'none' | 'reported' | 'under_review' | 'resolved';
  damageStatus: 'none' | 'reported' | 'under_review' | 'resolved';
  remarks: string;
  claimRequired: boolean;
};

type DemurrageNotificationState = {
  emailSentAt: string;
  smsSentAt: string;
  telegramSentAt: string;
  lastChannel: 'email' | 'sms' | 'telegram' | 'all' | '';
  lastMessage: string;
  lastError: string;
};

type PostDeliveryFollowUpState = {
  emailSentAt: string;
  smsSentAt: string;
  telegramSentAt: string;
  lastChannel: 'email' | 'sms' | 'telegram' | 'all' | '';
  lastMessage: string;
  issueReportedAt: string;
  complaintSubmittedAt: string;
  supportCallLoggedAt: string;
  lastError: string;
};

const demurrageNotificationStorageKey = 'tikur-abay:yard-demurrage-notifications';
const postDeliveryFollowUpStorageKey = 'tikur-abay:yard-post-delivery-follow-up';
const customerReceiptStorageKey = 'tikur-abay:yard-customer-receipts';

function normalizeReceiptValue(value: string) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function defaultReceiptContact(record: YardRecord) {
  return '+251 900 000 215';
}

function defaultReceiptRepresentative(record: YardRecord) {
  return 'Solomon Bekele';
}

function defaultReceiptRemark(record: YardRecord) {
  return 'Received clean with no shortage or damage.';
}

function sanitizeCustomerReceipt(receipt: CustomerReceiptState) {
  return {
    ...receipt,
    receivedBy: normalizeReceiptValue(receipt.receivedBy),
    receivingCompany: normalizeReceiptValue(receipt.receivingCompany),
    receivingContact: normalizeReceiptValue(receipt.receivingContact),
    remarks: normalizeReceiptValue(receipt.remarks),
  };
}

function defaultCustomerReceipt(record: YardRecord): CustomerReceiptState {
  if (record.consigneeHandoff.handoffStatus === 'Completed') {
    return {
      status: 'customer_confirmed',
      receivedBy: defaultReceiptRepresentative(record),
      receivingCompany: 'Alem Logistics PLC',
      receivingContact: defaultReceiptContact(record),
      receivedAt: record.consigneeHandoff.handoffTime || '2026-03-20T14:05:00Z',
      podStatus: 'verified',
      signatureCaptured: true,
      photoProofCaptured: record.consigneeHandoff.photoProofUploaded,
      shortageStatus: 'none',
      damageStatus: record.consigneeHandoff.issueAtHandoff ? 'reported' : 'none',
      remarks: defaultReceiptRemark(record),
      claimRequired: record.consigneeHandoff.issueAtHandoff,
    };
  }

  return {
    status: record.unloadStatus.unloadCompleted ? 'under_review' : 'awaiting_customer_confirmation',
    receivedBy: defaultReceiptRepresentative(record),
    receivingCompany: 'Alem Logistics PLC',
    receivingContact: defaultReceiptContact(record),
    receivedAt: '',
    podStatus: record.podReadiness.deliveryNoteStatus === 'Prepared' ? 'uploaded' : 'pending',
    signatureCaptured: false,
    photoProofCaptured: false,
    shortageStatus: record.unloadStatus.varianceNote.toLowerCase().includes('shortage') ? 'reported' : 'none',
    damageStatus: record.unloadStatus.varianceNote.toLowerCase().includes('damage') ? 'reported' : 'none',
    remarks: record.unloadStatus.unloadCompleted
      ? defaultReceiptRemark(record)
      : 'Received clean with no shortage or damage.',
    claimRequired: record.unloadStatus.varianceNote.toLowerCase().includes('shortage') || record.unloadStatus.varianceNote.toLowerCase().includes('damage'),
  };
}

function buildRiskSnapshot(record: YardRecord) {
  const arrivalAt = record.arrivalControl.actualArrivalTime || record.arrivalTimestamp || record.arrivalControl.eta;
  const arrivalMs = new Date(arrivalAt).getTime();
  const freeTimeDays = record.serviceType === 'multimodal' ? 10 : 7;
  const freeTimeEnd = Number.isNaN(arrivalMs) ? '' : new Date(arrivalMs + freeTimeDays * 24 * 60 * 60 * 1000).toISOString();
  const dryPortCollectionDeadline =
    record.storageAssignment.expectedPickupTime ||
    (Number.isNaN(arrivalMs) ? '' : new Date(arrivalMs + 3 * 24 * 60 * 60 * 1000).toISOString());
  const emptyReturnDeadline =
    record.emptyReturn.emptyDepartureTime ||
    record.emptyReturn.emptyReleaseTimestamp ||
    (Number.isNaN(arrivalMs) ? '' : new Date(arrivalMs + 5 * 24 * 60 * 60 * 1000).toISOString());
  const emptyReturnRisk =
    record.emptyReturn.detentionRiskOpen
      ? record.emptyReturn.emptyReturned
        ? 'Watch'
        : 'Urgent'
      : 'Safe';
  const dryPortRisk =
    record.storageAssignment.consigneePickupReady
      ? 'Safe'
      : record.unloadStatus.unloadCompleted
        ? 'Watch'
        : 'Safe';

  return {
    freeTimeStart: formatDate(arrivalAt),
    freeTimeDays,
    freeTimeEnd: formatDate(freeTimeEnd),
    demurrageRiskLevel: record.emptyReturn.detentionRiskOpen ? 'Watch' : 'Safe',
    detentionRiskLevel: record.emptyReturn.detentionRiskOpen ? 'Urgent' : 'Safe',
    storageRiskLevel: dryPortRisk,
    tariffReference: record.serviceType === 'multimodal' ? 'Carrier import free-time contract / 10-day default' : 'Customer contract / unimodal local collection window',
    tariffOwner: record.serviceType === 'multimodal' ? 'carrier' : 'custom contract',
    dryPortCollectionDeadline: formatDate(dryPortCollectionDeadline),
    dryPortCollectionRiskLevel: dryPortRisk,
    customsClearanceDeadline: formatDate(dryPortCollectionDeadline),
    penaltyRiskNote: dryPortRisk === 'Watch' ? 'Collection deadline is approaching and storage exposure may open if pickup is delayed.' : 'Collection window is still within the contracted storage period.',
    emptyReleaseDate: formatDate(record.emptyReturn.emptyReleaseTimestamp),
    emptyReturnDeadline: formatDate(emptyReturnDeadline),
    emptyReturnRiskLevel: emptyReturnRisk,
    emptyReturnReceiptStatus: record.emptyReturn.returnReceiptAvailable ? 'uploaded' : 'missing',
  };
}

function slugifyCustomerName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '') || 'customer';
}

function defaultDemurrageNotificationState(): DemurrageNotificationState {
  return {
    emailSentAt: '',
    smsSentAt: '',
    telegramSentAt: '',
    lastChannel: '',
    lastMessage: '',
    lastError: '',
  };
}

function defaultPostDeliveryFollowUpState(): PostDeliveryFollowUpState {
  return {
    emailSentAt: '',
    smsSentAt: '',
    telegramSentAt: '',
    lastChannel: '',
    lastMessage: '',
    issueReportedAt: '',
    complaintSubmittedAt: '',
    supportCallLoggedAt: '',
    lastError: '',
  };
}

function buildDemurrageControl(record: YardRecord, receipt: CustomerReceiptState, notification: DemurrageNotificationState) {
  const arrivalAt = record.arrivalControl.actualArrivalTime || record.arrivalTimestamp || record.arrivalControl.eta;
  const arrivalMs = new Date(arrivalAt).getTime();
  const chargeStartsAtIso = Number.isNaN(arrivalMs) ? '' : new Date(arrivalMs + 24 * 60 * 60 * 1000).toISOString();
  const nowMs = new Date('2026-03-20T23:59:59Z').getTime();
  const customerReleased = ['received_clean', 'customer_confirmed', 'resolved'].includes(receipt.status);
  const chargeActive = Boolean(chargeStartsAtIso) && nowMs >= new Date(chargeStartsAtIso).getTime() && !customerReleased;
  const allChannelsSent = Boolean(notification.emailSentAt && notification.smsSentAt && notification.telegramSentAt);
  const customerSlug = slugifyCustomerName(record.customerName);

  return {
    chargeStartsAt: formatDate(chargeStartsAtIso),
    chargeActive,
    allChannelsSent,
    recipients: {
      email: `${customerSlug}@customer.tikurabay.com`,
      sms: '+251 900 000 210',
      telegram: `@${customerSlug.replace(/\./g, '_')}`,
    },
    statusLabel: chargeActive ? 'Demurrage active' : customerReleased ? 'Closed before charge start' : 'Pending 24-hour threshold',
  };
}

function buildPostDeliveryFollowUp(record: YardRecord, receipt: CustomerReceiptState, followUp: PostDeliveryFollowUpState) {
  const storedRequest = readStoredBookingRequest(record.bookingNumber, record.customerName);
  const customerSlug = slugifyCustomerName(record.customerName);
  const cleanReceipt = ['received_clean', 'customer_confirmed', 'resolved'].includes(receipt.status) && !receipt.claimRequired;
  const anyChannelSent = Boolean(followUp.emailSentAt || followUp.smsSentAt || followUp.telegramSentAt);
  const allChannelsSent = Boolean(followUp.emailSentAt && followUp.smsSentAt && followUp.telegramSentAt);
  const supportPhone = '+251 911 440 211';
  const active = cleanReceipt && !anyChannelSent;

  return {
    active,
    anyChannelSent,
    allChannelsSent,
    statusLabel: !cleanReceipt
      ? 'Available after clean receipt'
      : anyChannelSent
        ? 'Sent'
        : 'Ready to send',
    recipients: {
      email: storedRequest?.email || `${customerSlug}@customer.tikurabay.com`,
      sms: '+251 900 000 215',
      telegram: `@${customerSlug.replace(/\./g, '_')}`,
      supportPhone,
    },
  };
}

function readStoredBookingRequest(bookingNumber: string, customerName: string) {
  if (typeof window === 'undefined') return null as UnifiedBookingRequest | null;
  const raw = window.localStorage.getItem(bookingQuoteStorageKey);
  if (!raw) return null as UnifiedBookingRequest | null;
  try {
    const parsed = JSON.parse(raw) as UnifiedBookingRequest[];
    if (!Array.isArray(parsed)) return null as UnifiedBookingRequest | null;
    return parsed.find((item) => item.bookingId === bookingNumber)
      || parsed.find((item) => item.quoteId === bookingNumber)
      || parsed.find((item) => String(item.customerName || '').trim().toLowerCase() === String(customerName || '').trim().toLowerCase())
      || null;
  } catch {
    return null as UnifiedBookingRequest | null;
  }
}

function formatDate(value: string) {
  if (!value) return 'Pending';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatStatusLabel(value: string) {
  const normalized = value.replace(/_/g, ' ');
  if (normalized === 'Arrived at gate' || normalized === 'Arrived inland') return `${normalized} (FULL_IN)`;
  if (normalized === 'Awaiting unload') return 'Awaiting unload (FULL_IN)';
  if (normalized === 'POD complete') return 'POD complete (FULL_OUT)';
  if (normalized === 'Ready for pickup') return 'Ready for pickup (FULL_OUT)';
  if (normalized === 'Awaiting consignee handoff') return 'Awaiting consignee handoff (FULL_OUT)';
  if (normalized === 'Ready for empty release') return 'Ready for empty release (EMPTY_IN)';
  if (normalized === 'Empty released') return 'Empty released (EMPTY_OUT)';
  if (normalized === 'Empty in return transit') return 'Empty in return transit (EMPTY_OUT)';
  if (normalized === 'Empty return in progress') return 'Empty return in progress (EMPTY_OUT)';
  if (normalized === 'Empty returned') return 'Empty returned (EMPTY_RETURNED)';
  if (normalized === 'Closure pending') return 'Closure pending (EMPTY_RETURNED)';
  if (normalized === 'Cycle closed') return 'Cycle closed (EMPTY_RETURNED)';
  return normalized;
}

function normalizeContainerLookup(value: string) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function deriveExactContainerLocation(record: YardRecord) {
  if (record.emptyReturn.currentLocation) return record.emptyReturn.currentLocation;
  if (record.emptyReturn.status === 'Cycle closed' || record.emptyReturn.status === 'Empty returned') {
    return record.emptyReturn.designatedDepot;
  }
  if (record.emptyReturn.status === 'Empty in return transit') {
    return `En route to ${record.emptyReturn.designatedDepot}`;
  }
  if (record.emptyReturn.status === 'Ready for empty release') {
    return `${record.inlandNode} outbound empty lane`;
  }
  return record.inlandNode;
}

function deriveContainerOwnership(record: YardRecord) {
  return (
    record.emptyReturn.assignedReturnDriver ||
    record.emptyReturn.returnOwner ||
    record.assignedYardAgent ||
    'Pending owner'
  );
}

function deriveContainerMovementMode(record: YardRecord) {
  return record.emptyReturn.status === 'Not released' ? 'Loaded / inland node' : 'Empty return';
}

function syncYardTrackingEvent(
  record: YardRecord,
  eventType: string,
  location: string,
  description: string,
) {
  void fetch('/api/tracking/register-origin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bookingNo: record.bookingNumber,
      containerNo: record.containerNumber,
      blNo: record.blNumber,
      currentLocation: location,
      consignee: record.consigneeName || record.customerName,
      eta: record.arrivalControl.eta || record.arrivalTimestamp,
      eventType,
      description,
    }),
  }).catch(() => {});
  void fetch('/api/tracking/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      containerNo: record.containerNumber,
      eventType,
      location,
      source: 'yard',
      description,
    }),
  }).catch(() => {});
}

function hasRecentNotificationSend(sentAt: string) {
  if (!sentAt) return false;
  const sentMs = new Date(sentAt).getTime();
  if (Number.isNaN(sentMs)) return false;
  return Date.now() - sentMs < 24 * 60 * 60 * 1000;
}

function nextNotificationWindow(sentAt: string) {
  if (!sentAt) return '';
  const sentMs = new Date(sentAt).getTime();
  if (Number.isNaN(sentMs)) return '';
  return new Date(sentMs + 24 * 60 * 60 * 1000).toISOString();
}

function readPortalCustomerConfirmation(shipmentRef: string): CustomerReceiptState | null {
  if (typeof document === 'undefined') return null;
  const cookieName = `tikur_abay_customer_confirmation_${shipmentRef}=`;
  const cookie = document.cookie
    .split('; ')
    .find((item) => item.startsWith(cookieName));
  if (!cookie) return null;

  try {
    return JSON.parse(decodeURIComponent(cookie.slice(cookieName.length))) as CustomerReceiptState;
  } catch {
    return null;
  }
}

function storageTone(status: YardRecord['storageAssignment']['storageStatus']) {
  if (status === 'Ready for pickup' || status === 'Released') return 'yard-chip-ready';
  if (status === 'Assigned') return 'yard-chip-medium';
  return 'yard-chip';
}

function readyToClose(record: YardRecord, receipt: CustomerReceiptState) {
  return (
    Boolean(record.arrivalControl.actualArrivalTime) &&
    record.arrivalControl.gateInConfirmed &&
    record.unloadStatus.unloadCompleted &&
    record.storageAssignment.consigneePickupReady &&
    ['received_clean', 'customer_confirmed', 'resolved'].includes(receipt.status) &&
    !receipt.claimRequired &&
    receipt.podStatus !== 'pending' &&
    record.emptyReturn.emptyReleaseGranted &&
    record.emptyReturn.emptyReturned &&
    record.emptyReturn.returnReceiptAvailable
  );
}

function nextStepClass(isActive: boolean) {
  return isActive ? 'supplier-next-step-button' : '';
}

const yardJourneyLabels = [
  'Arrival',
  'Gate-in',
  'Unload',
  'Storage',
  'POD',
  'Customer receipt',
  'Empty release',
  'Empty returned',
  'Cycle closed',
] as const;

function yardClosureStepKeyFromNextAction(title: string) {
  if (title === 'Confirm inland arrival') return 'arrival';
  if (title === 'Confirm gate-in') return 'gate_in';
  if (
    title === 'Start unload' ||
    title === 'Complete unload' ||
    title === 'Prepare storage and pickup handoff' ||
    title === 'Prepare POD' ||
    title === 'Capture signature' ||
    title === 'Upload POD'
  ) {
    return 'unload_pod';
  }
  if (title === 'Mark goods received') return 'customer_receipt';
  if (
    title === 'Mark empty released' ||
    title === 'Start empty return' ||
    title === 'Confirm empty returned' ||
    title === 'Upload return receipt'
  ) {
    return 'empty_return';
  }
  if (title === 'Close shipment cycle' || title === 'Send thank-you message') return 'closed';
  return 'gate_in';
}

function getYardJourneyIndex(record: YardRecord, receipt: CustomerReceiptState) {
  if (record.emptyReturn.status === 'Cycle closed' || record.yardStage === 'Cycle closed') return 8;
  if (record.emptyReturn.emptyReturned) return 7;
  if (record.emptyReturn.emptyReleaseGranted) return 6;
  if (['received_clean', 'customer_confirmed', 'resolved'].includes(receipt.status)) return 5;
  if (receipt.podStatus !== 'pending') return 4;
  if (record.storageAssignment.consigneePickupReady) return 3;
  if (record.unloadStatus.unloadCompleted) return 2;
  if (record.arrivalControl.gateInConfirmed) return 1;
  return 0;
}

function compareBookingOrder(left: string, right: string) {
  const leftKey = left.replace(/\D/g, '');
  const rightKey = right.replace(/\D/g, '');
  if (leftKey.length !== rightKey.length) return rightKey.length - leftKey.length;
  return rightKey.localeCompare(leftKey);
}

export const DryPortYardDeskRuntime = memo(function DryPortYardDeskRuntime({
  mode = 'yard',
}: {
  mode?: 'yard' | 'empty-return';
}) {
  const searchParams = useSearchParams();
  const headerQuery = searchParams.get('query') || searchParams.get('q') || '';
  const [records, setRecords] = useState(() => mergeYardRecords([]));
  const [selectedRecordId, setSelectedRecordId] = useState('');
  const [searchValue, setSearchValue] = useState(headerQuery);
  const [containerSearch, setContainerSearch] = useState('');
  const deferredSearchValue = useDeferredValue(searchValue);
  const deferredContainerSearch = useDeferredValue(containerSearch);
  const [arrivalFilter, setArrivalFilter] = useState<'all' | 'pending' | 'arrived'>('all');
  const [unloadFilter, setUnloadFilter] = useState<'all' | 'awaiting' | 'in-progress' | 'complete'>('all');
  const [storageFilter, setStorageFilter] = useState<'all' | YardRecord['storageAssignment']['storageStatus']>('all');
  const [emptyFilter, setEmptyFilter] = useState<'all' | YardRecord['emptyReturn']['status']>(mode === 'empty-return' ? 'Not released' : 'all');
  const [dateRange, setDateRange] = useState<'all' | '7d' | '14d' | '30d'>('all');
  const [customerReceipts, setCustomerReceipts] = useState<Record<string, CustomerReceiptState>>({});
  const [demurrageNotifications, setDemurrageNotifications] = useState<Record<string, DemurrageNotificationState>>({});
  const [postDeliveryFollowUps, setPostDeliveryFollowUps] = useState<Record<string, PostDeliveryFollowUpState>>({});
  const [backendReleaseWorkspace, setBackendReleaseWorkspace] = useState<Record<string, any> | null>(null);
  const [backendReleaseError, setBackendReleaseError] = useState('');
  const isEmptyReturnMode = mode === 'empty-return';
  const skipNextManualYardSyncRef = useRef(false);

  const filteredRecords = useMemo(() => {
    const now = new Date('2026-03-19T23:59:59Z').getTime();
    const cutoffMap = { all: 0, '7d': 7, '14d': 14, '30d': 30 } as const;
    const rangeDays = cutoffMap[dateRange];
    return records
      .filter((record) => {
        const matchesSearch = [record.tripId, record.containerNumber, record.blNumber, record.consigneeName, record.bookingNumber]
          .join(' ')
          .toLowerCase()
          .includes(deferredSearchValue.trim().toLowerCase());
        const matchesArrival =
          arrivalFilter === 'all' ||
          (arrivalFilter === 'pending' ? !record.arrivalControl.actualArrivalTime : Boolean(record.arrivalControl.actualArrivalTime));
        const matchesUnload =
          unloadFilter === 'all' ||
          (unloadFilter === 'awaiting' ? !record.unloadStatus.unloadStarted
            : unloadFilter === 'in-progress' ? record.unloadStatus.unloadStarted && !record.unloadStatus.unloadCompleted
              : record.unloadStatus.unloadCompleted);
        const matchesStorage = storageFilter === 'all' || record.storageAssignment.storageStatus === storageFilter;
        const matchesEmpty = emptyFilter === 'all' || record.emptyReturn.status === emptyFilter;
        const matchesDate =
          rangeDays === 0 ||
          now - new Date(record.lastUpdated).getTime() <= rangeDays * 24 * 60 * 60 * 1000;
        return matchesSearch && matchesArrival && matchesUnload && matchesStorage && matchesEmpty && matchesDate;
      })
      .sort((left, right) => compareBookingOrder(left.bookingNumber, right.bookingNumber));
  }, [arrivalFilter, dateRange, deferredSearchValue, emptyFilter, records, storageFilter, unloadFilter]);

  const selectedRecord = useMemo(
    () =>
      filteredRecords.find((record) => record.id === selectedRecordId) ??
      records.find((record) => record.id === selectedRecordId) ??
      filteredRecords[0] ??
      records[0] ??
      null,
    [filteredRecords, records, selectedRecordId],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStorage = (event?: Event) => {
      if (skipNextManualYardSyncRef.current) {
        skipNextManualYardSyncRef.current = false;
        return;
      }
      const nextRecords = mergeYardRecords([]);
      setRecords(nextRecords);
      const bookingNumber =
        event && 'detail' in event && event.detail && typeof event.detail === 'object' && 'bookingNumber' in event.detail
          ? String((event.detail as { bookingNumber?: string }).bookingNumber || '')
          : '';
      if (bookingNumber) {
        const matched = nextRecords.find((record) => record.bookingNumber === bookingNumber);
        if (matched) {
          setSelectedRecordId(matched.id);
        }
      }
    };
    void hydrateManualWorkflowStateFromServer().then(() => {
      handleStorage();
    });
    window.addEventListener(manualCorridorStorageUpdatedEvent, handleStorage as EventListener);
    return () => {
      window.removeEventListener(manualCorridorStorageUpdatedEvent, handleStorage as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!selectedRecordId && records.length > 0) {
      setSelectedRecordId(records[0]?.id ?? '');
    }
  }, [records, selectedRecordId]);

  useEffect(() => {
    const booking = searchParams.get('booking');
    if (!booking) return;
    const matched = records.find((item) => item.bookingNumber === booking);
    if (matched) setSelectedRecordId(matched.id);
  }, [records, searchParams]);

  useEffect(() => {
    setSearchValue(headerQuery);
    setContainerSearch(headerQuery);
  }, [headerQuery]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(customerReceiptStorageKey);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Record<string, CustomerReceiptState>;
      if (parsed && typeof parsed === 'object') {
        setCustomerReceipts(parsed);
      }
    } catch {
      window.localStorage.removeItem(customerReceiptStorageKey);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(customerReceiptStorageKey, JSON.stringify(customerReceipts));
  }, [customerReceipts]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const activeRecord = records.find((record) => record.id === selectedRecordId) ?? null;
    if (!activeRecord) return;
    const normalizedReceipt = sanitizeCustomerReceipt(
      customerReceipts[activeRecord.id] ??
      readPortalCustomerConfirmation(activeRecord.bookingNumber) ??
      defaultCustomerReceipt(activeRecord),
    );
    document.cookie = [
      `tikur_abay_customer_confirmation_${activeRecord.bookingNumber}=${encodeURIComponent(JSON.stringify(normalizedReceipt))}`,
      'path=/',
      'max-age=2592000',
      'SameSite=Lax',
    ].join('; ');
  }, [customerReceipts, records, selectedRecordId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(demurrageNotificationStorageKey);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Record<string, DemurrageNotificationState>;
      if (parsed && typeof parsed === 'object') {
        setDemurrageNotifications(parsed);
      }
    } catch {
      window.localStorage.removeItem(demurrageNotificationStorageKey);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(demurrageNotificationStorageKey, JSON.stringify(demurrageNotifications));
  }, [demurrageNotifications]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(postDeliveryFollowUpStorageKey);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Record<string, PostDeliveryFollowUpState>;
      if (parsed && typeof parsed === 'object') {
        setPostDeliveryFollowUps(parsed);
      }
    } catch {
      window.localStorage.removeItem(postDeliveryFollowUpStorageKey);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(postDeliveryFollowUpStorageKey, JSON.stringify(postDeliveryFollowUps));
  }, [postDeliveryFollowUps]);

  const searchedContainerRecord = useMemo(() => {
    const needle = normalizeContainerLookup(deferredContainerSearch);
    if (!needle) return null;
    return records.find((record) => normalizeContainerLookup(record.containerNumber) === needle) || null;
  }, [deferredContainerSearch, records]);

  useEffect(() => {
    if (!isEmptyReturnMode || !searchedContainerRecord) return;
    setSelectedRecordId(searchedContainerRecord.id);
  }, [isEmptyReturnMode, searchedContainerRecord]);

  useEffect(() => {
    if (!selectedRecord?.bookingNumber) {
      setBackendReleaseWorkspace(null);
      return;
    }
    let cancelled = false;
    const loadReleaseWorkspace = async () => {
      try {
        setBackendReleaseError('');
        const next = await apiGet<Record<string, any>>(`/import-settlement/shipments/${encodeURIComponent(selectedRecord.bookingNumber)}/workspace`);
        if (!cancelled) {
          setBackendReleaseWorkspace(next);
        }
      } catch (error) {
        if (!cancelled) {
          setBackendReleaseError(error instanceof Error ? error.message : 'Unable to load release authorization workspace.');
          setBackendReleaseWorkspace(null);
        }
      }
    };
    void loadReleaseWorkspace();
    return () => {
      cancelled = true;
    };
  }, [selectedRecord?.bookingNumber]);

  useEffect(() => {
    setSelectedRecordId((current) => {
      if (!records.length) return '';
      if (records.some((record) => record.id === current)) return current;
      return filteredRecords[0]?.id ?? records[0]?.id ?? '';
    });
  }, [filteredRecords, records]);

  function updateSelected(
    mutator: (record: YardRecord) => YardRecord,
    afterUpdate?: (record: YardRecord) => void,
  ) {
    if (!selectedRecord) return;
    const nextRecord = mutator(selectedRecord);
    setRecords((current) =>
      current.map((record) => (record.id === selectedRecord.id ? nextRecord : record)),
    );
    if (nextRecord.id.startsWith('manual-yard-')) {
      skipNextManualYardSyncRef.current = true;
      upsertManualYardRecord(nextRecord);
    }
    afterUpdate?.(nextRecord);
  }

  function updateSelectedReceipt(mutator: (receipt: CustomerReceiptState) => CustomerReceiptState) {
    if (!selectedRecord) return;
    setCustomerReceipts((current) => ({
      ...current,
      [selectedRecord.id]: sanitizeCustomerReceipt(mutator(current[selectedRecord.id] ?? defaultCustomerReceipt(selectedRecord))),
    }));
  }

  function confirmArrival() {
    updateSelected((record) => ({
      ...record,
      yardStage: record.arrivalControl.gateInConfirmed ? 'Awaiting unload' : 'Arrived at gate',
      arrivalControl: {
        ...record.arrivalControl,
        actualArrivalTime: record.arrivalControl.actualArrivalTime || '2026-03-20T09:10:00Z',
        routeCompleted: true,
      },
      etaSummary: `Arrived ${formatDate(record.arrivalControl.actualArrivalTime || '2026-03-20T09:10:00Z')}`,
      lastUpdated: '2026-03-20T09:10:00Z',
      exceptions: record.exceptions.filter((item) => !item.issueText.toLowerCase().includes('arrival')),
    }), (next) => {
      syncYardTrackingEvent(next, 'ARRIVED_INLAND', next.inlandNode, 'Yard confirmed inland arrival at the dry-port gate.');
    });
  }

  function confirmGateIn() {
    updateSelected((record) => ({
      ...record,
      yardStage: record.unloadStatus.unloadStarted ? 'Unloading in progress' : 'Awaiting unload',
      arrivalControl: {
        ...record.arrivalControl,
        gateInConfirmed: true,
        actualArrivalTime: record.arrivalControl.actualArrivalTime || '2026-03-20T09:10:00Z',
      },
      lastUpdated: '2026-03-20T09:18:00Z',
      exceptions: record.exceptions.filter((item) => !item.issueText.toLowerCase().includes('gate-in')),
    }));
  }

  function startUnload() {
    updateSelected((record) => ({
      ...record,
      yardStage: 'Unloading in progress',
      unloadChip: 'Unload active',
      unloadStatus: {
        ...record.unloadStatus,
        unloadStarted: true,
        unloadStartTime: record.unloadStatus.unloadStartTime || '2026-03-20T10:05:00Z',
      },
      lastUpdated: '2026-03-20T10:05:00Z',
      exceptions: record.exceptions.filter((item) => !item.issueText.toLowerCase().includes('unload not yet started')),
    }));
  }

  function completeUnload() {
    updateSelected((record) => ({
      ...record,
      yardStage: 'In storage',
      unloadChip: 'Unload complete',
      unloadStatus: {
        ...record.unloadStatus,
        unloadStarted: true,
        unloadCompleted: true,
        unloadEndTime: record.unloadStatus.unloadEndTime || '2026-03-20T12:12:00Z',
        cargoCountVerified: true,
        unloadPhotosUploaded: true,
      },
      storageAssignment: {
        ...record.storageAssignment,
        storageStatus: record.storageAssignment.storageStatus === 'Not assigned' ? 'Assigned' : record.storageAssignment.storageStatus,
        storageStartTime: record.storageAssignment.storageStartTime || '2026-03-20T12:16:00Z',
      },
      podReadiness: {
        ...record.podReadiness,
        deliveryNoteStatus: 'Prepared',
      },
      lastUpdated: '2026-03-20T12:16:00Z',
      exceptions: record.exceptions.filter((item) => !item.issueText.toLowerCase().includes('unload variance')),
    }), (next) => {
      syncYardTrackingEvent(next, 'UNLOADED_INLAND', next.inlandNode, 'Dry-port yard completed unload and storage intake.');
    });
  }

  function recordDamageOrShortage() {
    updateSelected((record) => ({
      ...record,
      unloadStatus: {
        ...record.unloadStatus,
        varianceNote: 'Damage / shortage reported and acknowledged by receiving team.',
      },
      lastUpdated: '2026-03-20T11:24:00Z',
    }));
    updateSelectedReceipt((receipt) => ({
      ...receipt,
      status: receipt.status === 'awaiting_customer_confirmation' ? 'under_review' : receipt.status,
      shortageStatus: receipt.shortageStatus === 'none' ? 'reported' : receipt.shortageStatus,
      damageStatus: receipt.damageStatus === 'none' ? 'reported' : receipt.damageStatus,
      claimRequired: true,
      podStatus: receipt.podStatus === 'pending' ? 'disputed' : receipt.podStatus,
      remarks:
        !receipt.remarks || receipt.remarks === 'Awaiting customer confirmation after unload.' || receipt.remarks === 'Customer confirmation will open once unload is complete.'
          ? 'Damage / shortage reported at customer handoff. Claim review is required.'
          : receipt.remarks,
    }));
  }

  function markReceiptUnderReview() {
    if (!selectedRecord) return;
    const finalizedReceipt = sanitizeCustomerReceipt(selectedReceipt);
    markCustomerReceipt('under_review', {
      receivedBy: finalizedReceipt.receivedBy,
      receivingCompany: finalizedReceipt.receivingCompany,
      receivingContact: finalizedReceipt.receivingContact,
      shortageStatus: finalizedReceipt.shortageStatus === 'none' ? 'reported' : finalizedReceipt.shortageStatus,
      damageStatus: finalizedReceipt.damageStatus === 'none' ? 'reported' : finalizedReceipt.damageStatus,
      claimRequired: true,
      remarks: finalizedReceipt.remarks,
      podStatus: finalizedReceipt.podStatus === 'pending' ? 'disputed' : finalizedReceipt.podStatus,
      issueText: 'Damage or shortage reported at customer handoff. Claim review is required.',
      issueSeverity: 'High',
    });
  }

  function assignStorageLocation() {
    updateSelected((record) => {
      const nextLocation = storageOptions.find((option) => option !== record.storageAssignment.storageLocation) ?? storageOptions[0];
      return {
        ...record,
        yardStage: record.consigneeHandoff.handoffStatus === 'Completed' ? record.yardStage : 'Awaiting consignee handoff',
        storageAssignment: {
          ...record.storageAssignment,
          storageLocation: nextLocation,
          storageStatus: 'Ready for pickup',
          storageStartTime: record.storageAssignment.storageStartTime || '2026-03-20T12:20:00Z',
          consigneePickupReady: true,
        },
        lastUpdated: '2026-03-20T12:20:00Z',
        exceptions: record.exceptions.filter((item) => !item.issueText.toLowerCase().includes('storage location')),
      };
    });
  }

  function confirmConsigneeHandoff() {
    updateSelected((record) => ({
      ...record,
      yardStage: 'POD complete',
      consigneeHandoff: {
        ...record.consigneeHandoff,
        handoffStatus: 'Completed',
        handoffTime: record.consigneeHandoff.handoffTime || '2026-03-20T14:05:00Z',
        signedBy: record.consigneeHandoff.signedBy || record.consigneeHandoff.representative || 'Consignee representative',
        photoProofUploaded: true,
      },
      podReadiness: {
        ...record.podReadiness,
        deliveryNoteStatus: 'Completed',
      },
      lastUpdated: '2026-03-20T14:05:00Z',
      exceptions: record.exceptions.filter((item) => !item.issueText.toLowerCase().includes('pod') && !item.issueText.toLowerCase().includes('handoff')),
    }));
  }

  function markCustomerReceipt(
    status: CustomerReceiptState['status'],
    options?: Partial<CustomerReceiptState> & { issueText?: string; issueSeverity?: 'Low' | 'Medium' | 'High' },
  ) {
    if (!selectedRecord) return;

    confirmConsigneeHandoff();
    updateSelectedReceipt((receipt) => ({
      ...receipt,
      status,
      receivedBy: options?.receivedBy ?? (selectedRecord.consigneeHandoff.representative || 'Customer receiving desk'),
      receivingCompany: options?.receivingCompany ?? selectedRecord.consigneeName,
      receivingContact: options?.receivingContact ?? receipt.receivingContact,
      receivedAt: options?.receivedAt ?? '2026-03-20T14:05:00Z',
      podStatus: options?.podStatus ?? (status === 'under_review' ? 'disputed' : 'verified'),
      signatureCaptured: options?.signatureCaptured ?? true,
      photoProofCaptured: options?.photoProofCaptured ?? true,
      shortageStatus: options?.shortageStatus ?? receipt.shortageStatus,
      damageStatus: options?.damageStatus ?? receipt.damageStatus,
      remarks: options?.remarks ?? receipt.remarks,
      claimRequired: options?.claimRequired ?? false,
    }));
    updateSelected((record) => ({
      ...record,
      yardStage: status === 'under_review' ? 'POD complete' : record.yardStage,
      consigneeHandoff: {
        ...record.consigneeHandoff,
        issueAtHandoff: options?.claimRequired ?? false,
        finalCargoConditionNote: options?.remarks ?? record.consigneeHandoff.finalCargoConditionNote,
      },
      exceptions: options?.issueText
        ? [
            ...record.exceptions.filter((item) => !item.issueText.toLowerCase().includes('customer receipt') && !item.issueText.toLowerCase().includes('shortage') && !item.issueText.toLowerCase().includes('damage')),
            {
              id: `${record.id}-receipt-${status}`,
              severity: options.issueSeverity ?? 'High',
              issueText: options.issueText,
              actionLabel: 'Open claim',
            },
          ]
        : record.exceptions.filter((item) => !item.issueText.toLowerCase().includes('customer receipt') && !item.issueText.toLowerCase().includes('shortage') && !item.issueText.toLowerCase().includes('damage')),
      lastUpdated: '2026-03-20T14:05:00Z',
    }), (next) => {
      syncYardTrackingEvent(next, 'ARRIVED', next.inlandNode, 'Customer receipt completed and goods handoff confirmed at the inland destination.');
    });
  }

  function markEmptyReleased() {
    updateSelected((record) => {
      const next: YardRecord = {
        ...record,
        yardStage: 'Empty released',
        emptyReturnChip: 'Released',
        emptyReturn: {
          ...record.emptyReturn,
          status: 'Ready for empty release',
          emptyReleaseGranted: true,
          emptyReleaseTimestamp: record.emptyReturn.emptyReleaseTimestamp || '2026-03-20T15:12:00Z',
          returnTripId: record.emptyReturn.returnTripId || `ERT-${record.tripId.replace(/^TRP-/, '')}`,
          assignedReturnDriver: record.emptyReturn.assignedReturnDriver || 'Pending return driver',
          assignedReturnTruck: record.emptyReturn.assignedReturnTruck || 'Pending return truck',
          assignedReturnTrailer: record.emptyReturn.assignedReturnTrailer || 'Pending return trailer',
          currentLocation: `${record.inlandNode} outbound empty lane`,
          lastLocationUpdateAt: '2026-03-20T15:12:00Z',
          emptyPickupStatus: 'Empty can depart for designated depot',
        },
        lastUpdated: '2026-03-20T15:12:00Z',
        exceptions: record.exceptions.filter((item) => !item.issueText.toLowerCase().includes('empty release')),
      };
      syncManualEmptyReturnDispatchFromYard(next);
      return next;
    }, (next) => {
      syncYardTrackingEvent(next, 'EMPTY_RELEASED', next.inlandNode, 'Empty container was released from the dry-port yard for return.');
    });
  }

  function startEmptyReturn() {
    updateSelected((record) => {
      const next: YardRecord = {
        ...record,
        yardStage: 'Empty return in progress',
        emptyReturnChip: 'In return transit',
        emptyReturn: {
          ...record.emptyReturn,
          status: 'Empty in return transit',
          emptyReleaseGranted: true,
          returnTripId: record.emptyReturn.returnTripId || `ERT-${record.tripId.replace(/^TRP-/, '')}`,
          assignedReturnDriver: record.emptyReturn.assignedReturnDriver || 'Empty return driver assigned',
          returnDriverPhone: record.emptyReturn.returnDriverPhone || '+251 900 000 330',
          assignedReturnTruck: record.emptyReturn.assignedReturnTruck || 'ET-RET-3301',
          assignedReturnTrailer: record.emptyReturn.assignedReturnTrailer || 'RET-TRL-330',
          currentLocation: 'Galafi corridor checkpoint',
          lastLocationUpdateAt: '2026-03-20T16:00:00Z',
          emptyDepartureTime: record.emptyReturn.emptyDepartureTime || '2026-03-20T16:00:00Z',
          emptyPickupStatus: 'Empty dispatched to designated depot',
        },
        lastUpdated: '2026-03-20T16:00:00Z',
      };
      syncManualEmptyReturnDispatchFromYard(next);
      return next;
    }, (next) => {
      syncYardTrackingEvent(next, 'EMPTY_RETURN_STARTED', next.emptyReturn.designatedDepot, 'Empty container departed the yard and started return transit.');
    });
  }

  function confirmEmptyReturned() {
    updateSelected((record) => {
      const next: YardRecord = {
        ...record,
        yardStage: 'Cycle closed',
        emptyReturnChip: 'Returned',
        emptyReturn: {
          ...record.emptyReturn,
          status: 'Empty returned',
          emptyReturned: true,
          currentLocation: record.emptyReturn.designatedDepot,
          lastLocationUpdateAt: record.emptyReturn.returnTimestamp || '2026-03-21T07:18:00Z',
          returnTimestamp: record.emptyReturn.returnTimestamp || '2026-03-21T07:18:00Z',
          emptyPickupStatus: 'Return confirmed by depot',
        },
        lastUpdated: '2026-03-21T07:18:00Z',
        exceptions: record.exceptions.filter((item) => !item.issueText.toLowerCase().includes('empty return overdue')),
      };
      syncManualEmptyReturnDispatchFromYard(next);
      return next;
    }, (next) => {
      syncYardTrackingEvent(next, 'EMPTY_RETURNED', next.emptyReturn.designatedDepot, 'Depot confirmed empty container return.');
    });
  }

  function attachReturnReceipt() {
    updateSelected((record) => {
      const next: YardRecord = {
        ...record,
        emptyReturn: {
          ...record.emptyReturn,
          status: record.emptyReturn.emptyReturned ? 'Closure pending' : record.emptyReturn.status,
          returnReceiptAvailable: true,
          returnReceiptRef: record.emptyReturn.returnReceiptRef || `ERR-${record.tripId.replace(/-/g, '')}`,
        },
        lastUpdated: '2026-03-21T07:24:00Z',
        exceptions: record.exceptions.filter((item) => !item.issueText.toLowerCase().includes('receipt')),
      };
      syncManualEmptyReturnDispatchFromYard(next);
      return next;
    });
  }

  function closeShipmentCycle() {
    if (!selectedRecord || !readyToClose(selectedRecord, selectedReceipt)) return;
    updateSelected((record) => {
      const next: YardRecord = {
        ...record,
        yardStage: 'Cycle closed',
        unloadChip: 'Closed',
        emptyReturnChip: 'Cycle closed',
        emptyReturn: {
          ...record.emptyReturn,
          status: 'Cycle closed',
          detentionRiskOpen: false,
        },
        lastUpdated: '2026-03-21T07:36:00Z',
        exceptions: [],
      };
      syncManualEmptyReturnDispatchFromYard(next);
      return next;
    });
  }

  if (!selectedRecord) {
    return (
      <main className="shell">
        <section className="yard-desk-shell">
          <div className="yard-empty-state">No dry-port or yard files are available.</div>
        </section>
      </main>
    );
  }

  const queueRows = records;
  const selectedReceipt = sanitizeCustomerReceipt(
    customerReceipts[selectedRecord.id] ??
    readPortalCustomerConfirmation(selectedRecord.bookingNumber) ??
    defaultCustomerReceipt(selectedRecord),
  );
  const selectedDemurrageNotification =
    demurrageNotifications[selectedRecord.id] ?? defaultDemurrageNotificationState();
  const selectedPostDeliveryFollowUp =
    postDeliveryFollowUps[selectedRecord.id] ?? defaultPostDeliveryFollowUpState();
  const closureReady = readyToClose(selectedRecord, selectedReceipt);
  const cycleClosed = selectedRecord.yardStage === 'Cycle closed' || selectedRecord.emptyReturn.status === 'Cycle closed';
  const financeRelease = readShippingPhase1Workspace().financeReleaseControls.find((item) => item.bookingId === selectedRecord.bookingNumber) || null;
  const financeReleaseAuthorized = Boolean(financeRelease?.cargoReleaseAuthorizedAt);
  const financeReleaseSentToYard = Boolean(financeRelease?.releaseSentToDryPortAt);
  const riskSnapshot = buildRiskSnapshot(selectedRecord);
  const demurrageControl = buildDemurrageControl(selectedRecord, selectedReceipt, selectedDemurrageNotification);
  const postDeliveryFollowUp = buildPostDeliveryFollowUp(selectedRecord, selectedReceipt, selectedPostDeliveryFollowUp);
  const receiptFormReady =
    Boolean(selectedReceipt.receivedBy) &&
    selectedReceipt.receivedBy !== 'Awaiting customer receipt' &&
    Boolean(selectedReceipt.receivingCompany) &&
    Boolean(selectedReceipt.receivingContact) &&
    Boolean(selectedReceipt.remarks) &&
    selectedReceipt.remarks !== 'Awaiting customer confirmation after unload.' &&
    selectedReceipt.remarks !== 'Customer confirmation will open once unload is complete.';
  const receiptIssueRows: Array<{ id: string; severity: 'Low' | 'Medium' | 'High'; issueText: string; actionLabel: string }> = [];
  if (selectedReceipt.claimRequired) {
    if (selectedReceipt.shortageStatus !== 'none') {
      receiptIssueRows.push({
        id: `${selectedRecord.id}-shortage`,
        severity: 'High',
        issueText: 'Shortage reported at customer receipt confirmation.',
        actionLabel: 'Review shortage',
      });
    }
    if (selectedReceipt.damageStatus !== 'none') {
      receiptIssueRows.push({
        id: `${selectedRecord.id}-damage`,
        severity: 'High',
        issueText: 'Damage reported at customer receipt confirmation.',
        actionLabel: 'Review damage',
      });
    }
  }
  const displayedExceptions =
    selectedRecord.exceptions.length > 0
      ? [...selectedRecord.exceptions, ...receiptIssueRows]
      : receiptIssueRows.length > 0
        ? receiptIssueRows
        : [{ id: 'yard-clean', severity: 'Low' as const, issueText: 'No open yard exceptions on this file.', actionLabel: 'Monitor' }];
  const checklistRows = [
    ['Inland arrival confirmed', Boolean(selectedRecord.arrivalControl.actualArrivalTime)],
    ['Gate-in complete', selectedRecord.arrivalControl.gateInConfirmed],
    ['Unload complete', selectedRecord.unloadStatus.unloadCompleted],
    ['Cargo variance resolved or acknowledged', selectedRecord.unloadStatus.varianceNote.length > 0],
    ['Finance release authorized', financeReleaseAuthorized],
    ['Dry-port release note received', financeReleaseSentToYard],
    ['Storage / handoff ready', selectedRecord.storageAssignment.consigneePickupReady],
    ['POD captured', ['uploaded', 'signed', 'verified'].includes(selectedReceipt.podStatus)],
    ['Customer confirmation complete', ['received_clean', 'customer_confirmed', 'resolved'].includes(selectedReceipt.status)],
    ['Empty release complete', selectedRecord.emptyReturn.emptyReleaseGranted],
    ['Empty returned', selectedRecord.emptyReturn.emptyReturned],
    ['Return receipt uploaded', selectedRecord.emptyReturn.returnReceiptAvailable],
  ] as const;
  const nextAction = cycleClosed
    ? !postDeliveryFollowUp.anyChannelSent
      ? { title: 'Send thank-you message', helper: 'Post-delivery follow-up is still pending for this closed file.', href: '#yard-customer' }
      : { title: 'Shipment cycle complete', helper: 'This yard file is fully closed.', href: '#yard-checklist' }
    : !selectedRecord.arrivalControl.actualArrivalTime
    ? { title: 'Confirm inland arrival', helper: 'Start the yard file from the actual gate arrival.', href: '#yard-arrival' }
    : !selectedRecord.arrivalControl.gateInConfirmed
      ? { title: 'Confirm gate-in', helper: 'The trip must be gated in before unload can begin.', href: '#yard-arrival' }
      : !selectedRecord.unloadStatus.unloadStarted
        ? { title: 'Start unload', helper: 'Unload activity has not started yet.', href: '#yard-unload' }
        : !selectedRecord.unloadStatus.unloadCompleted
          ? { title: 'Complete unload', helper: 'Finish unload before POD and receipt can proceed.', href: '#yard-unload' }
          : !selectedRecord.storageAssignment.consigneePickupReady
            ? { title: 'Prepare storage and pickup handoff', helper: 'Storage location and consignee pickup readiness still need to be set.', href: '#yard-storage' }
          : !financeReleaseAuthorized
            ? { title: 'Await finance release', helper: 'Tikur Abay finance must authorize cargo release before the yard hands goods to the consignee.', href: '#yard-storage' }
            : !financeReleaseSentToYard
              ? { title: 'Receive finance release note', helper: 'Dry-port release note must be posted before pickup handoff proceeds.', href: '#yard-storage' }
              : !['Prepared', 'Completed'].includes(selectedRecord.podReadiness.deliveryNoteStatus)
                ? { title: 'Prepare POD', helper: 'Prepare the delivery note and POD packet before customer receipt.', href: '#yard-customer' }
              : !selectedReceipt.signatureCaptured
                ? { title: 'Capture signature', helper: 'Customer signature is still required before final receipt confirmation.', href: '#yard-customer' }
                : !['uploaded', 'signed', 'verified'].includes(selectedReceipt.podStatus)
                  ? { title: 'Upload POD', helper: 'Upload POD evidence before the customer receipt is marked complete.', href: '#yard-customer' }
              : !['received_clean', 'customer_confirmed', 'resolved'].includes(selectedReceipt.status)
                ? { title: 'Mark goods received', helper: 'Receipt confirmation is still the closure blocker.', href: '#yard-customer' }
                : !selectedRecord.emptyReturn.emptyReleaseGranted
                  ? { title: 'Mark empty released', helper: 'Release the empty container back into the return workflow.', href: '#yard-empty-return' }
                  : !selectedRecord.emptyReturn.emptyDepartureTime
                    ? { title: 'Start empty return', helper: 'The empty container still needs to depart for the designated depot.', href: '#yard-empty-return' }
                    : !selectedRecord.emptyReturn.emptyReturned
                      ? { title: 'Confirm empty returned', helper: 'Depot return confirmation is still required.', href: '#yard-empty-return' }
                      : !selectedRecord.emptyReturn.returnReceiptAvailable
                        ? { title: 'Upload return receipt', helper: 'Upload the depot return receipt to close detention exposure.', href: '#yard-empty-return' }
                      : { title: 'Close shipment cycle', helper: 'All closure controls are complete.', href: '#yard-checklist' };
  const journeyIndex = getYardJourneyIndex(selectedRecord, selectedReceipt);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('tikur-abay:yard-next-task', {
        detail: {
          closed: cycleClosed,
          title: nextAction.title,
          helper: nextAction.helper,
          closureStepKey: yardClosureStepKeyFromNextAction(nextAction.title),
        },
      }),
    );
  }, [cycleClosed, nextAction.helper, nextAction.title]);

  function markDemurrageNotification(channel: 'email' | 'sms' | 'telegram' | 'all') {
    const existing = demurrageNotifications[selectedRecord.id] ?? defaultDemurrageNotificationState();
    const relevantSentAt =
      channel === 'all'
        ? [existing.emailSentAt, existing.smsSentAt, existing.telegramSentAt].find(hasRecentNotificationSend) ?? ''
        : channel === 'email'
          ? existing.emailSentAt
          : channel === 'sms'
            ? existing.smsSentAt
            : existing.telegramSentAt;
    if (hasRecentNotificationSend(relevantSentAt)) {
      const retryAt = formatDate(nextNotificationWindow(relevantSentAt));
      setDemurrageNotifications((current) => ({
        ...current,
        [selectedRecord.id]: {
          ...(current[selectedRecord.id] ?? defaultDemurrageNotificationState()),
          lastError: `Already sent. Wait 24 hours before sending again. Next send window: ${retryAt}.`,
        },
      }));
      return;
    }
    const sentAt = new Date().toISOString();
    setDemurrageNotifications((current) => {
      const existingState = current[selectedRecord.id] ?? defaultDemurrageNotificationState();
      return {
        ...current,
        [selectedRecord.id]: {
          emailSentAt: channel === 'email' || channel === 'all' ? sentAt : existingState.emailSentAt,
          smsSentAt: channel === 'sms' || channel === 'all' ? sentAt : existingState.smsSentAt,
          telegramSentAt: channel === 'telegram' || channel === 'all' ? sentAt : existingState.telegramSentAt,
          lastChannel: channel,
          lastMessage:
            `Demurrage notice sent for ${selectedRecord.bookingNumber}. Charges start ${demurrageControl.chargeStartsAt}.`,
          lastError: '',
        },
      };
    });
    updateSelected((record) => ({
      ...record,
      lastUpdated: sentAt,
    }));
  }

  async function markPostDeliveryFollowUp(channel: 'email' | 'sms' | 'telegram' | 'all') {
    const existing = postDeliveryFollowUps[selectedRecord.id] ?? defaultPostDeliveryFollowUpState();
    const relevantSentAt =
      channel === 'all'
        ? [existing.emailSentAt, existing.smsSentAt, existing.telegramSentAt].find(Boolean) ?? ''
        : channel === 'email'
          ? existing.emailSentAt
          : channel === 'sms'
            ? existing.smsSentAt
            : existing.telegramSentAt;
    if (relevantSentAt) {
      const retryAt = formatDate(nextNotificationWindow(relevantSentAt));
      setPostDeliveryFollowUps((current) => ({
        ...current,
        [selectedRecord.id]: {
          ...(current[selectedRecord.id] ?? defaultPostDeliveryFollowUpState()),
          lastError: `Already sent. Wait 24 hours before sending again. Next send window: ${retryAt}.`,
        },
      }));
      return;
    }
    const sentAt = new Date().toISOString();
    const channels = channel === 'all' ? ['email', 'sms', 'telegram'] : [channel];
    const subject = 'Thank You for Choosing Tikur Abay 🚛';
    const messageBody = `Dear Valued Customer,

Thank you for choosing Tikur Abay Transportation Services.

We are pleased to inform you that your shipment has been successfully delivered. We truly appreciate your trust in us and your continued support.

If you have any questions, feedback, or if anything did not meet your expectations, please do not hesitate to reach out to us:

📞 Phone: +251-XXX-XXX-XXX
📧 Email: support@tikurabay.com

Your feedback helps us improve and serve you better.

We look forward to serving you again.

Warm regards,
Tikur Abay Team
Transportation You Can Trust`;
    setPostDeliveryFollowUps((current) => {
      const existing = current[selectedRecord.id] ?? defaultPostDeliveryFollowUpState();
      return {
        ...current,
        [selectedRecord.id]: {
          ...existing,
          emailSentAt: channel === 'email' || channel === 'all' ? sentAt : existing.emailSentAt,
          smsSentAt: channel === 'sms' || channel === 'all' ? sentAt : existing.smsSentAt,
          telegramSentAt: channel === 'telegram' || channel === 'all' ? sentAt : existing.telegramSentAt,
          lastChannel: channel,
          lastMessage: `Thank-you and support follow-up sent for ${selectedRecord.bookingNumber}.`,
          lastError: '',
        },
      };
    });
    updateSelected((record) => ({
      ...record,
      lastUpdated: sentAt,
    }));

    void (async () => {
      try {
        await apiPost('/communications/send', {
          entityType: 'shipment',
          entityId: selectedRecord.bookingNumber,
          channels,
        templateKey: 'shipment_delivery_thank_you',
        language: 'en',
        subject,
        messageBody,
        recipientOverrides: {
          email: postDeliveryFollowUp.recipients.email,
          sms: postDeliveryFollowUp.recipients.sms,
          telegram: postDeliveryFollowUp.recipients.telegram,
        },
        sendMode: 'now',
        });
      } catch (error) {
        const fallbackMessage = error instanceof Error ? error.message : 'Unable to send follow-up through communications service.';
        setPostDeliveryFollowUps((current) => {
          const existing = current[selectedRecord.id] ?? defaultPostDeliveryFollowUpState();
          return {
            ...current,
            [selectedRecord.id]: {
              ...existing,
              lastMessage: `Local follow-up recorded for ${selectedRecord.bookingNumber}. Communications service fallback used.`,
              lastError: '',
            },
          };
        });
        console.warn('Communications service unavailable. Recorded local follow-up instead.', fallbackMessage);
      }
    })();
  }

  function logPostDeliveryIssue(kind: 'issue' | 'complaint' | 'call') {
    const loggedAt =
      kind === 'issue'
        ? '2026-03-20T17:05:00Z'
        : kind === 'complaint'
          ? '2026-03-20T17:12:00Z'
          : '2026-03-20T17:18:00Z';
    setPostDeliveryFollowUps((current) => {
      const existing = current[selectedRecord.id] ?? defaultPostDeliveryFollowUpState();
      return {
        ...current,
        [selectedRecord.id]: {
          ...existing,
          issueReportedAt: kind === 'issue' ? loggedAt : existing.issueReportedAt,
          complaintSubmittedAt: kind === 'complaint' ? loggedAt : existing.complaintSubmittedAt,
          supportCallLoggedAt: kind === 'call' ? loggedAt : existing.supportCallLoggedAt,
          lastMessage:
            kind === 'issue'
              ? 'Customer reported a post-delivery issue.'
              : kind === 'complaint'
                ? 'Customer complaint submitted after thank-you follow-up.'
                : 'Customer requested or completed a support call.',
        },
      };
    });
    if (kind === 'call') {
      updateSelected((record) => ({ ...record, lastUpdated: loggedAt }));
      return;
    }
    markCustomerReceipt('under_review', {
      podStatus: 'disputed',
      claimRequired: true,
      shortageStatus: selectedReceipt.shortageStatus,
      damageStatus: selectedReceipt.damageStatus,
      remarks:
        kind === 'issue'
          ? 'Customer reported a post-delivery issue after thank-you follow-up.'
          : 'Customer submitted a complaint after delivery confirmation.',
      issueText:
        kind === 'issue'
          ? 'Post-delivery issue reported after receipt confirmation. Customer support review is required.'
          : 'Post-delivery complaint submitted after receipt confirmation. Customer support review is required.',
      issueSeverity: kind === 'issue' ? 'Medium' : 'High',
    });
  }

  return (
    <main className="shell">
      <section className="yard-desk-shell">
        <header className="yard-desk-header">
          <div>
            <span className="yard-panel-eyebrow">Step 6</span>
            <h1>Yard / Delivery Desk</h1>
            <p>Arrival, unloading, customer handoff, POD, empty return, and shipment closure in one desk.</p>
          </div>
        </header>
        <section className="yard-command-toolbar">
          <div className="yard-desk-toolbar">
            <input
              className="input yard-desk-search-input"
              value={containerSearch}
              onChange={(event) => setContainerSearch(event.target.value)}
              placeholder="Search container number, for example MSCU4589127"
            />
            <button
              type="button"
              className="yard-desk-button yard-desk-button-secondary"
              onClick={() => {
                if (searchedContainerRecord) {
                  setSelectedRecordId(searchedContainerRecord.id);
                  setSearchValue(searchedContainerRecord.containerNumber);
                }
              }}
              disabled={!searchedContainerRecord}
            >
              Find container
            </button>
            <select className="yard-desk-select" value={arrivalFilter} onChange={(event) => setArrivalFilter(event.target.value as 'all' | 'pending' | 'arrived')}>
              <option value="all">All arrival status</option>
              <option value="pending">Arrival pending</option>
              <option value="arrived">Arrived inland (FULL_IN)</option>
            </select>
            <select className="yard-desk-select" value={unloadFilter} onChange={(event) => setUnloadFilter(event.target.value as 'all' | 'awaiting' | 'in-progress' | 'complete')}>
              <option value="all">All unload status</option>
              <option value="awaiting">Awaiting unload (FULL_IN)</option>
              <option value="in-progress">Unload in progress</option>
              <option value="complete">Unload complete</option>
            </select>
            <select className="yard-desk-select" value={storageFilter} onChange={(event) => setStorageFilter(event.target.value as 'all' | YardRecord['storageAssignment']['storageStatus'])}>
              <option value="all">All storage status</option>
              <option value="Not assigned">Not assigned</option>
              <option value="Assigned">Assigned</option>
              <option value="Ready for pickup">Ready for pickup</option>
              <option value="Released">Released</option>
            </select>
            <select className="yard-desk-select" value={dateRange} onChange={(event) => setDateRange(event.target.value as 'all' | '7d' | '14d' | '30d')}>
              <option value="all">All dates</option>
              <option value="7d">Last 7 days</option>
              <option value="14d">Last 14 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>
        </section>

        <section className="yard-top-workspace">
          <div className="yard-top-primary-stack">
            {isEmptyReturnMode ? (
              <article className="yard-panel">
                <header className="yard-panel-header">
                  <div>
                    <span className="yard-panel-eyebrow">Container Search</span>
                    <h2>Where is this empty container now?</h2>
                  </div>
                  <span className={`yard-chip ${searchedContainerRecord ? 'yard-chip-medium' : 'yard-chip-high'}`}>
                    {searchedContainerRecord ? 'Live empty-return result' : 'Search required'}
                  </span>
                </header>
                {searchedContainerRecord ? (
                  <div className="ops-field-grid yard-arrival-grid">
                    <div className="ops-field-row"><span>Container</span><strong>{searchedContainerRecord.containerNumber}</strong></div>
                    <div className="ops-field-row"><span>Current status</span><strong>{formatStatusLabel(searchedContainerRecord.emptyReturn.status)}</strong></div>
                    <div className="ops-field-row ops-field-row-wide"><span>Exact current location</span><strong>{deriveExactContainerLocation(searchedContainerRecord)}</strong></div>
                    <div className="ops-field-row"><span>Movement mode</span><strong>{deriveContainerMovementMode(searchedContainerRecord)}</strong></div>
                    <div className="ops-field-row"><span>Current owner</span><strong>{deriveContainerOwnership(searchedContainerRecord)}</strong></div>
                    <div className="ops-field-row"><span>Return trip</span><strong>{searchedContainerRecord.emptyReturn.returnTripId || 'Not assigned'}</strong></div>
                    <div className="ops-field-row"><span>Return driver</span><strong>{searchedContainerRecord.emptyReturn.assignedReturnDriver || 'Not assigned'}</strong></div>
                    <div className="ops-field-row"><span>Driver phone</span><strong>{searchedContainerRecord.emptyReturn.returnDriverPhone || 'Pending'}</strong></div>
                    <div className="ops-field-row"><span>Truck / trailer</span><strong>{[searchedContainerRecord.emptyReturn.assignedReturnTruck, searchedContainerRecord.emptyReturn.assignedReturnTrailer].filter(Boolean).join(' / ') || 'Pending'}</strong></div>
                    <div className="ops-field-row"><span>Destination depot</span><strong>{searchedContainerRecord.emptyReturn.designatedDepot}</strong></div>
                    <div className="ops-field-row"><span>Last location update</span><strong>{formatDate(searchedContainerRecord.emptyReturn.lastLocationUpdateAt || searchedContainerRecord.lastUpdated)}</strong></div>
                    <div className="ops-field-row ops-field-row-wide"><span>Next action</span><strong>{searchedContainerRecord.emptyReturn.emptyPickupStatus}</strong></div>
                  </div>
                ) : (
                  <div className="yard-empty-state">
                    Enter the container number to see where the empty is, who owns it now, and what remains.
                  </div>
                )}
              </article>
            ) : null}

            <article className="yard-panel yard-arrival-panel" id="yard-arrival">
              <header className="yard-panel-header">
                <div>
                  <span className="yard-panel-eyebrow">Arrival &amp; Unloading</span>
                  <h2>Arrival &amp; Unloading</h2>
                </div>
                <span className={`yard-chip ${selectedRecord.unloadStatus.unloadCompleted ? 'yard-chip-ready' : selectedRecord.unloadStatus.unloadStarted ? 'yard-chip-medium' : 'yard-chip-mode'}`}>{formatStatusLabel(selectedRecord.yardStage)}</span>
              </header>
              <div className="ops-field-grid yard-arrival-grid">
                <div className="ops-field-row"><span>ETA</span><strong>{formatDate(selectedRecord.arrivalControl.eta)}</strong></div>
                <div className="ops-field-row"><span>Actual arrival</span><strong>{formatDate(selectedRecord.arrivalControl.actualArrivalTime)}</strong></div>
                <div className="ops-field-row"><span>Gate-in status</span><strong>{selectedRecord.arrivalControl.gateInConfirmed ? 'Confirmed' : 'Pending'}</strong></div>
                <div className="ops-field-row"><span>Route completed</span><strong>{selectedRecord.arrivalControl.routeCompleted ? 'Yes' : 'No'}</strong></div>
                <div className="ops-field-row"><span>Inspection needed</span><strong>{selectedRecord.arrivalControl.inspectionRequired ? 'Yes' : 'No'}</strong></div>
                <div className="ops-field-row"><span>Seal check</span><strong>{selectedRecord.arrivalControl.sealCheckAtArrival ? 'Confirmed' : 'Pending'}</strong></div>
                <div className="ops-field-row ops-field-row-wide ops-field-row-fit"><span>Yard contact</span><strong>{selectedRecord.arrivalControl.yardContact}</strong></div>
                <div className="ops-field-row ops-field-row-fit"><span>Arrival note</span><strong>{selectedRecord.etaSummary}</strong></div>
              </div>
              <div className="yard-submodule">
                <div className="yard-submodule-head">
                  <span className="yard-panel-eyebrow">Unload block</span>
                  <strong>{selectedRecord.unloadStatus.unloadCompleted ? 'Unload complete' : selectedRecord.unloadStatus.unloadStarted ? 'Unload in progress' : 'Unload pending'}</strong>
                </div>
                <div className="ops-field-grid yard-arrival-grid">
                  <div className="ops-field-row"><span>Unload started</span><strong>{selectedRecord.unloadStatus.unloadStarted ? 'Yes' : 'No'}</strong></div>
                  <div className="ops-field-row"><span>Unload completed</span><strong>{selectedRecord.unloadStatus.unloadCompleted ? 'Yes' : 'No'}</strong></div>
                  <div className="ops-field-row"><span>Start time</span><strong>{formatDate(selectedRecord.unloadStatus.unloadStartTime)}</strong></div>
                  <div className="ops-field-row"><span>End time</span><strong>{formatDate(selectedRecord.unloadStatus.unloadEndTime)}</strong></div>
                  <div className="ops-field-row ops-field-row-wide"><span>Unloaded by</span><strong>{selectedRecord.unloadStatus.unloadedBy}</strong></div>
                  <div className="ops-field-row ops-field-row-fit"><span>Cargo verified</span><strong>{selectedRecord.unloadStatus.cargoCountVerified ? 'Yes' : 'No'}</strong></div>
                  <div className="ops-field-row"><span>Photos uploaded</span><strong>{selectedRecord.unloadStatus.unloadPhotosUploaded ? 'Yes' : 'No'}</strong></div>
                  <div className="ops-field-row ops-field-row-wide"><span>Variance note</span><strong>{selectedRecord.unloadStatus.varianceNote}</strong></div>
                </div>
              </div>
              <div className="yard-action-grid">
                <button type="button" disabled={Boolean(selectedRecord.arrivalControl.actualArrivalTime)} className={`yard-desk-button yard-desk-button-secondary ${nextStepClass(nextAction.title === 'Confirm inland arrival')}`} onClick={confirmArrival} data-testid="yard-confirm-arrival">Confirm inland arrival</button>
                <button type="button" disabled={selectedRecord.arrivalControl.gateInConfirmed} className={`yard-desk-button yard-desk-button-secondary ${nextStepClass(nextAction.title === 'Confirm gate-in')}`} onClick={confirmGateIn} data-testid="yard-confirm-gate-in">Confirm gate-in</button>
                <button type="button" disabled={selectedRecord.unloadStatus.unloadStarted} className={`yard-desk-button yard-desk-button-secondary ${nextStepClass(nextAction.title === 'Start unload')}`} onClick={startUnload} data-testid="yard-start-unload">Start unload</button>
                <button type="button" disabled={selectedRecord.unloadStatus.unloadCompleted} className={`yard-desk-button yard-desk-button-primary ${nextStepClass(nextAction.title === 'Complete unload')}`} onClick={completeUnload} data-testid="yard-complete-unload">Complete unload</button>
                <button type="button" className="yard-desk-button yard-desk-button-secondary" onClick={() => updateSelected((record) => ({ ...record, unloadStatus: { ...record.unloadStatus, unloadPhotosUploaded: true }, lastUpdated: '2026-03-20T11:18:00Z' }))}>Upload unload photo</button>
                <button type="button" className="yard-desk-button yard-desk-button-secondary" onClick={recordDamageOrShortage} data-testid="yard-record-damage-shortage">Record damage / shortage</button>
                <button type="button" className="yard-desk-button yard-desk-button-secondary" onClick={confirmArrival}>Record arrival note</button>
                <button type="button" className="yard-desk-button yard-desk-button-secondary" onClick={() => updateSelected((record) => ({ ...record, arrivalControl: { ...record.arrivalControl, inspectionRequired: true }, lastUpdated: '2026-03-20T09:24:00Z' }))}>Mark inspection required</button>
              </div>
            </article>

            <article className="yard-panel yard-storage-panel" id="yard-storage">
              <header className="yard-panel-header">
                <div>
                  <span className="yard-panel-eyebrow">Storage &amp; Pickup</span>
                  <h2>Storage &amp; Pickup</h2>
                </div>
                <span className={`yard-chip ${storageTone(selectedRecord.storageAssignment.storageStatus)}`}>{selectedRecord.storageAssignment.storageStatus}</span>
              </header>
              <div className="ops-field-grid yard-arrival-grid">
                <div className="ops-field-row"><span>Storage location</span><strong>{selectedRecord.storageAssignment.storageLocation}</strong></div>
                <div className="ops-field-row"><span>Storage start time</span><strong>{formatDate(selectedRecord.storageAssignment.storageStartTime)}</strong></div>
                <div className="ops-field-row"><span>Storage status</span><strong>{formatStatusLabel(selectedRecord.storageAssignment.storageStatus)}</strong></div>
                <div className="ops-field-row"><span>Expected pickup</span><strong>{formatDate(selectedRecord.storageAssignment.expectedPickupTime)}</strong></div>
                <div className="ops-field-row"><span>Finance release</span><strong>{financeReleaseAuthorized ? 'Authorized' : 'Pending'}</strong></div>
                <div className="ops-field-row"><span>Dry-port note</span><strong>{financeReleaseSentToYard ? 'Received' : 'Pending'}</strong></div>
                <div className="ops-field-row"><span>Goods area</span><strong>{selectedRecord.storageAssignment.goodsArea}</strong></div>
                <div className="ops-field-row"><span>Consignee readiness</span><strong>{selectedRecord.storageAssignment.consigneePickupReady ? 'Ready' : 'Pending'}</strong></div>
                <div className="ops-field-row"><span>POD status</span><strong>{selectedRecord.podReadiness.deliveryNoteStatus}</strong></div>
                <div className="ops-field-row"><span>Receipt status</span><strong>{formatStatusLabel(selectedReceipt.status)}</strong></div>
              </div>
              <div className="yard-submodule">
                <div className="yard-submodule-head">
                  <span className="yard-panel-eyebrow">Receipt form</span>
                  <strong>Fill customer receipt before final confirmation</strong>
                </div>
                <div className="supplier-control-grid console-gap-bottom-md">
                  <label className="supplier-field-block">
                    <span>Consignee rep</span>
                    <input
                      className="supplier-desk-input"
                      value={selectedReceipt.receivedBy}
                      onChange={(event) => updateSelectedReceipt((receipt) => ({ ...receipt, receivedBy: event.target.value }))}
                      placeholder="Enter consignee representative"
                    />
                  </label>
                  <label className="supplier-field-block">
                    <span>Company</span>
                    <input
                      className="supplier-desk-input"
                      value={selectedReceipt.receivingCompany}
                      onChange={(event) => updateSelectedReceipt((receipt) => ({ ...receipt, receivingCompany: event.target.value }))}
                      placeholder="Enter receiving company"
                    />
                  </label>
                  <label className="supplier-field-block">
                    <span>Contact</span>
                    <input
                      className="supplier-desk-input"
                      value={selectedReceipt.receivingContact}
                      onChange={(event) => updateSelectedReceipt((receipt) => ({ ...receipt, receivingContact: event.target.value }))}
                      placeholder="Enter phone or contact reference"
                    />
                  </label>
                  <label className="supplier-field-block console-grid-span-full">
                    <span>Receipt note</span>
                    <textarea
                      className="supplier-desk-input"
                      rows={3}
                      value={selectedReceipt.remarks}
                      onChange={(event) => updateSelectedReceipt((receipt) => ({ ...receipt, remarks: event.target.value }))}
                      placeholder="Describe cargo condition at handoff"
                    />
                  </label>
                </div>
              </div>
              {!receiptFormReady ? (
                <div className="shipping-phase-note is-blocked console-gap-bottom-lg">
                  <span>Receipt validation</span>
                  <p>Enter consignee rep, company, contact, and a clean receipt note before final confirmation is allowed.</p>
                </div>
              ) : null}
              {!financeReleaseAuthorized || !financeReleaseSentToYard ? (
                <div className="shipping-phase-note is-blocked console-gap-bottom-lg">
                  <span>Release gate</span>
                  <p>{!financeReleaseAuthorized ? 'Finance has not authorized cargo release yet.' : 'Finance has authorized release, but the dry-port release note has not been sent to this desk yet.'}</p>
                </div>
              ) : null}
              <div className="yard-action-grid">
                <button type="button" className="yard-desk-button yard-desk-button-secondary" onClick={assignStorageLocation}>Assign storage location</button>
                <button type="button" className="yard-desk-button yard-desk-button-secondary" onClick={assignStorageLocation}>Update storage location</button>
                <button type="button" disabled={selectedRecord.storageAssignment.consigneePickupReady} className={`yard-desk-button yard-desk-button-secondary ${nextStepClass(nextAction.title === 'Prepare storage and pickup handoff')}`} onClick={() => updateSelected((record) => ({ ...record, storageAssignment: { ...record.storageAssignment, storageStatus: 'Ready for pickup', consigneePickupReady: true }, yardStage: 'Awaiting consignee handoff', lastUpdated: '2026-03-20T12:30:00Z' }))} data-testid="yard-mark-ready-pickup">Mark ready for pickup</button>
                <button type="button" className="yard-desk-button yard-desk-button-secondary" onClick={() => updateSelected((record) => ({ ...record, lastUpdated: '2026-03-20T12:32:00Z' }))}>Notify consignee</button>
                <button type="button" disabled={['Prepared', 'Completed'].includes(selectedRecord.podReadiness.deliveryNoteStatus)} className={`yard-desk-button yard-desk-button-secondary ${nextStepClass(nextAction.title === 'Prepare POD')}`} onClick={() => updateSelected((record) => ({ ...record, podReadiness: { ...record.podReadiness, deliveryNoteStatus: 'Prepared' }, lastUpdated: '2026-03-20T13:10:00Z' }))} data-testid="yard-prepare-pod">Prepare POD</button>
                <button type="button" disabled={selectedReceipt.signatureCaptured} className={`yard-desk-button yard-desk-button-secondary ${nextStepClass(nextAction.title === 'Capture signature')}`} onClick={() => updateSelectedReceipt((receipt) => ({ ...receipt, signatureCaptured: true, podStatus: receipt.podStatus === 'pending' ? 'signed' : receipt.podStatus }))} data-testid="yard-capture-signature">Capture signature</button>
                <button type="button" disabled={['uploaded', 'signed', 'verified'].includes(selectedReceipt.podStatus)} className={`yard-desk-button yard-desk-button-secondary ${nextStepClass(nextAction.title === 'Upload POD')}`} onClick={() => updateSelectedReceipt((receipt) => ({ ...receipt, podStatus: 'uploaded' }))} data-testid="yard-upload-pod">Upload POD</button>
                <button
                  type="button"
                  className="yard-desk-button yard-desk-button-secondary console-download-button"
                  onClick={() =>
                    downloadYardReceiptPdf({
                      fileName: `${selectedRecord.bookingNumber.toLowerCase()}-cargo-receipt.pdf`,
                      title: 'CARGO RECEIPT / INTERCHANGE RECORD',
                      bookingNumber: selectedRecord.bookingNumber,
                      containerNumber: selectedRecord.containerNumber,
                      customerName: selectedRecord.customerName,
                      consigneeName: selectedRecord.consigneeName,
                      storageLocation: selectedRecord.storageAssignment.storageLocation,
                      actualArrivalTime: selectedRecord.arrivalControl.actualArrivalTime,
                      receivedBy: selectedReceipt.receivedBy,
                      receivingCompany: selectedReceipt.receivingCompany,
                      receivingContact: selectedReceipt.receivingContact,
                      receivedAt: selectedReceipt.receivedAt,
                      receiptStatus: formatStatusLabel(selectedReceipt.status),
                      podStatus: selectedReceipt.podStatus,
                      remarks: selectedReceipt.remarks,
                      shortageStatus: selectedReceipt.shortageStatus,
                      damageStatus: selectedReceipt.damageStatus,
                      issueDate: new Date().toISOString(),
                    })
                  }
                >
                  Download receipt record
                </button>
                <button
                  type="button"
                  disabled={!financeReleaseAuthorized || !financeReleaseSentToYard || !receiptFormReady || !selectedReceipt.claimRequired}
                  className="yard-desk-button yard-desk-button-secondary"
                  onClick={markReceiptUnderReview}
                  data-testid="yard-mark-receipt-under-review"
                >
                  Mark receipt under review
                </button>
                <button
                  type="button"
                  disabled={['received_clean', 'customer_confirmed', 'resolved'].includes(selectedReceipt.status) || !financeReleaseAuthorized || !financeReleaseSentToYard || !receiptFormReady || selectedReceipt.claimRequired}
                  className={`yard-desk-button yard-desk-button-primary ${nextStepClass(nextAction.title === 'Mark goods received')}`}
                  onClick={() => {
                    const finalizedReceipt = sanitizeCustomerReceipt(selectedReceipt);
                    markCustomerReceipt('received_clean', {
                      receivedBy: finalizedReceipt.receivedBy,
                      receivingCompany: finalizedReceipt.receivingCompany,
                      receivingContact: finalizedReceipt.receivingContact,
                      shortageStatus: 'none',
                      damageStatus: 'none',
                      claimRequired: false,
                      remarks: finalizedReceipt.remarks,
                    });
                  }}
                  data-testid="yard-mark-goods-received"
                >
                  Mark goods received
                </button>
              </div>
            </article>

            <article className="yard-panel yard-return-panel" id="yard-empty-return">
              <header className="yard-panel-header">
                <div>
                  <span className="yard-panel-eyebrow">Return &amp; Closure</span>
                  <h2>Return &amp; Closure</h2>
                </div>
                <span className={`yard-chip ${cycleClosed ? 'yard-chip-ready' : closureReady ? 'yard-chip-medium' : 'yard-chip-high'}`}>{cycleClosed ? 'Closed' : closureReady ? 'Ready to close' : 'Open'}</span>
              </header>
              <div className="ops-field-grid yard-arrival-grid">
                <div className="ops-field-row"><span>Empty cycle status</span><strong>{formatStatusLabel(selectedRecord.emptyReturn.status)}</strong></div>
                <div className="ops-field-row"><span>Empty release</span><strong>{selectedRecord.emptyReturn.emptyReleaseGranted ? 'Granted' : 'Pending'}</strong></div>
                <div className="ops-field-row"><span>Release time</span><strong>{formatDate(selectedRecord.emptyReturn.emptyReleaseTimestamp)}</strong></div>
                <div className="ops-field-row"><span>Return departure</span><strong>{formatDate(selectedRecord.emptyReturn.emptyDepartureTime)}</strong></div>
                <div className="ops-field-row"><span>Return confirmed</span><strong>{selectedRecord.emptyReturn.emptyReturned ? 'Yes' : 'No'}</strong></div>
                <div className="ops-field-row"><span>Receipt attached</span><strong>{selectedRecord.emptyReturn.returnReceiptAvailable ? 'Yes' : 'No'}</strong></div>
                <div className="ops-field-row"><span>Closure state</span><strong>{cycleClosed ? 'Closed' : closureReady ? 'Ready to close' : 'Blocked'}</strong></div>
              </div>
              <div className="yard-closure-checklist">
                {checklistRows.slice(0, 6).map(([label, complete]) => (
                  <div key={label} className={complete ? 'yard-risk-row is-complete' : 'yard-risk-row is-pending'}>
                    <span>{label}</span>
                    <strong>{complete ? 'Complete' : 'Pending'}</strong>
                  </div>
                ))}
              </div>
              <div className="yard-action-grid">
                <button type="button" disabled={selectedRecord.emptyReturn.emptyReleaseGranted} className={`yard-desk-button yard-desk-button-secondary ${nextStepClass(nextAction.title === 'Mark empty released')}`} onClick={markEmptyReleased} data-testid="yard-mark-empty-released">Mark empty released</button>
                <button type="button" disabled={Boolean(selectedRecord.emptyReturn.emptyDepartureTime)} className={`yard-desk-button yard-desk-button-secondary ${nextStepClass(nextAction.title === 'Start empty return')}`} onClick={startEmptyReturn} data-testid="yard-start-empty-return">Start empty return</button>
                <button type="button" disabled={selectedRecord.emptyReturn.emptyReturned} className={`yard-desk-button yard-desk-button-secondary ${nextStepClass(nextAction.title === 'Confirm empty returned')}`} onClick={confirmEmptyReturned} data-testid="yard-confirm-empty-returned">Confirm empty returned</button>
                <button type="button" disabled={selectedRecord.emptyReturn.returnReceiptAvailable} className={`yard-desk-button yard-desk-button-secondary ${nextStepClass(nextAction.title === 'Upload return receipt')}`} onClick={attachReturnReceipt} data-testid="yard-upload-return-receipt">Upload return receipt</button>
                <button type="button" className={`yard-desk-button yard-desk-button-primary ${nextStepClass(nextAction.title === 'Close shipment cycle')}`} disabled={!closureReady || cycleClosed} onClick={closeShipmentCycle} data-testid="yard-close-cycle">Close shipment cycle</button>
              </div>
            </article>

            <article className="yard-panel">
              <header className="yard-panel-header">
                <div>
                  <span className="yard-panel-eyebrow">Dry-port release authorization</span>
                  <h2>Finance-cleared cargo release</h2>
                </div>
                <span className={`yard-chip ${backendReleaseWorkspace?.releaseAuthorization ? 'yard-chip-medium' : 'yard-chip-high'}`}>
                  {backendReleaseWorkspace?.shipment?.releaseStatus || 'Pending'}
                </span>
              </header>
              {backendReleaseError ? (
                <div className="shipping-phase-note is-blocked">
                  <span>Release workspace</span>
                  <p>{backendReleaseError}</p>
                </div>
              ) : null}
              {backendReleaseWorkspace ? (
                <>
                  <div className="ops-field-grid yard-arrival-grid">
                    <div className="ops-field-row"><span>Finance status</span><strong>{backendReleaseWorkspace.shipment?.financeStatus || 'Pending'}</strong></div>
                    <div className="ops-field-row"><span>Release mode</span><strong>{backendReleaseWorkspace.releaseAuthorization?.releaseMode || 'Pending'}</strong></div>
                    <div className="ops-field-row"><span>Authorized at</span><strong>{formatDate(backendReleaseWorkspace.releaseAuthorization?.issuedAt || '')}</strong></div>
                    <div className="ops-field-row"><span>Balance due</span><strong>{Number(backendReleaseWorkspace.shipment?.balanceDue || 0).toLocaleString('en-US')}</strong></div>
                    <div className="ops-field-row ops-field-row-wide"><span>Recipient</span><strong>{backendReleaseWorkspace.releaseAuthorization?.recipientDetails?.customer || backendReleaseWorkspace.releaseAuthorization?.recipientDetails?.desk || 'Pending'}</strong></div>
                    <div className="ops-field-row ops-field-row-wide"><span>Approved documents</span><strong>{backendReleaseWorkspace.releaseAuthorization?.documentIds?.length || 0} linked documents</strong></div>
                  </div>
                  <div className="yard-action-grid">
                    <button
                      type="button"
                      className="yard-desk-button yard-desk-button-secondary"
                      disabled={!backendReleaseWorkspace.releaseAuthorization}
                      onClick={async () => {
                        await apiPost(`/import-settlement/shipments/${selectedRecord.bookingNumber}/dry-port-release`, {
                          releasedBy: 'Dry Port Agent Desk',
                          receiverName: selectedRecord.consigneeName,
                          receiverIdRef: `${selectedRecord.bookingNumber}-RECEIVER`,
                          remarks: 'Cargo released against approved finance clearance and dry-port authorization.',
                          proofDocumentIds: backendReleaseWorkspace.releaseAuthorization?.documentIds || [],
                        });
                        const next = await apiGet<Record<string, any>>(`/import-settlement/shipments/${encodeURIComponent(selectedRecord.bookingNumber)}/workspace`);
                        setBackendReleaseWorkspace(next);
                      }}
                    >
                      Confirm dry-port release
                    </button>
                    <button
                      type="button"
                      className="yard-desk-button yard-desk-button-secondary"
                      disabled={!backendReleaseWorkspace.shipment}
                      onClick={async () => {
                        await apiPost(`/import-settlement/shipments/${selectedRecord.bookingNumber}/container-interchanges`, {
                          containerNo: selectedRecord.containerNumber,
                          sealNo: selectedRecord.sealNumber,
                          interchangeType: 'cargo_unloaded',
                          location: selectedRecord.inlandNode,
                          eventDate: new Date().toISOString(),
                          receivedBy: 'Dry Port Agent Desk',
                          conditionNotes: 'Cargo unload and handover completed at the dry port.',
                        });
                        const next = await apiGet<Record<string, any>>(`/import-settlement/shipments/${encodeURIComponent(selectedRecord.bookingNumber)}/workspace`);
                        setBackendReleaseWorkspace(next);
                      }}
                    >
                      Record cargo handover
                    </button>
                  </div>
                </>
              ) : (
                <div className="yard-empty-state">No release authorization is available for this booking yet.</div>
              )}
            </article>
          </div>
          <div className="yard-top-support-stack">
            <section className="yard-queue-strip" data-testid="yard-queue">
              <div className="yard-queue-strip-head">
                <div>
                  <span className="yard-panel-eyebrow">Queue</span>
                  <h2>Arrival and yard queue</h2>
                </div>
                <p>{records.length} files</p>
              </div>
              <div className="yard-queue-strip-list">
                {queueRows.map((record) => (
                  <button
                    key={record.id}
                    type="button"
                    className={record.id === selectedRecord.id ? 'yard-queue-row active' : 'yard-queue-row'}
                    onClick={() => setSelectedRecordId(record.id)}
                    data-testid={`yard-queue-row-${record.bookingNumber}`}
                  >
                    <div className="yard-queue-topline">
                      <strong>{record.tripId}</strong>
                      <span className={`yard-chip ${storageTone(record.storageAssignment.storageStatus)}`}>{formatStatusLabel(record.yardStage)}</span>
                    </div>
                    <span>{record.bookingNumber} · {record.containerNumber}</span>
                    <span>{record.customerName} · {record.inlandNode}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="yard-panel yard-journey-panel">
              <header className="yard-panel-header">
                <div>
                  <span className="yard-panel-eyebrow">Journey timeline</span>
                  <h2>Arrival to closure</h2>
                </div>
              </header>
              <div className="yard-progress-strip">
                {yardJourneyLabels.map((label, index) => {
                  const state =
                    index < journeyIndex ? 'done' :
                    index === journeyIndex ? 'active' :
                    index === journeyIndex + 1 ? 'next' :
                    'upcoming';
                  return (
                    <article key={label} className={`yard-progress-step yard-progress-${state}`}>
                      <span>{index + 1}</span>
                      <strong>{label}</strong>
                    </article>
                  );
                })}
              </div>
            </section>

            <YardSupportPanels
              postDeliveryFollowUp={postDeliveryFollowUp}
              selectedPostDeliveryFollowUp={selectedPostDeliveryFollowUp}
              selectedDemurrageNotification={selectedDemurrageNotification}
              riskSnapshot={riskSnapshot}
              demurrageControl={demurrageControl}
              displayedExceptions={displayedExceptions}
              onMarkPostDeliveryFollowUp={markPostDeliveryFollowUp}
              onLogPostDeliveryIssue={logPostDeliveryIssue}
              onMarkDemurrageNotification={markDemurrageNotification}
              nextStepClassName={nextStepClass(nextAction.title === 'Send thank-you message')}
            />
          </div>
        </section>

      </section>
    </main>
  );
});
