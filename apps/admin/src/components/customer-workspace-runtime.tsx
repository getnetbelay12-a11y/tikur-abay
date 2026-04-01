'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { type UnifiedBookingRequest } from '../lib/booking-quote-demo-data';
import {
  manualCorridorStorageUpdatedEvent,
  readManualDispatchTrips,
  readManualDjiboutiReleaseRecords,
  readManualYardRecords,
} from '../lib/manual-corridor-journey';
import { readShippingPhase1Workspace, shippingDeskLink, shippingPhase1UpdatedEvent, shippingStageLabel } from '../lib/shipping-phase1';
import { readSharedQuoteRequests, sharedQuoteStorageUpdatedEvent, writeSharedQuoteRequests } from '../lib/shared-quote-storage';

type CustomerPortalPayload = {
  portalTitle: string;
  customerName: string;
  activeShipmentRef: string;
  kpis: Array<{ key: string; label: string; value: string; helper: string }>;
  shipments: Array<{
    shipmentRef: string;
    customerName: string;
    currentStage: string;
    currentStatus: string;
    destinationNode: string;
    taxDutySummary: string;
    releaseReadiness: string;
    emptyReturnSummary: string;
    container: {
      containerNumber: string;
      sealNumber: string;
      currentLocation: string;
      currentEta: string;
      detentionRiskLevel: string;
      demurrageRiskLevel: string;
    };
    milestones: Array<{
      id: string;
      label: string;
      location?: string | null;
      occurredAt?: string | null;
      status: string;
    }>;
    linkedDocuments: Array<{
      id: string;
      title: string;
      documentType: string;
      status: string;
    }>;
    payments: Array<{
      id: string;
      invoiceRef: string;
      amount: number;
      status: string;
      timestamp: string;
    }>;
  }>;
};

type Props = {
  initialPortal: CustomerPortalPayload;
};

type CustomerInsight = {
  title: string;
  summary: string;
  actionLabel: string;
  href: string;
  tone: 'critical' | 'warning' | 'info' | 'success';
};

type CustomerShipment = CustomerPortalPayload['shipments'][number];
type PartialCustomerShipment = Partial<CustomerShipment> & {
  container?: Partial<CustomerShipment['container']>;
};

const customerPortalBaseUrl = process.env.NEXT_PUBLIC_CUSTOMER_PORTAL_URL || 'http://127.0.0.1:6011';
const clearAdminCustomerConsole = true;

function safeText(value?: string | null, fallback = 'Pending') {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || fallback;
}

function safeLower(value?: string | null) {
  return safeText(value, '').toLowerCase();
}

function deriveBookingIdFromQuote(quoteId?: string | null) {
  const safeQuoteId = safeText(quoteId, '');
  if (!safeQuoteId) return `BK-260326-${String(Date.now()).slice(-5)}`;
  return safeQuoteId.startsWith('QT-') ? `BK-${safeQuoteId.slice(3)}` : `BK-${safeQuoteId}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Pending';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatDate(value?: string | null) {
  if (!value) return 'Pending';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatMoney(amount?: number | null, currency?: string | null) {
  return `${safeText(currency, 'USD')} ${Number(amount || 0).toLocaleString('en-US')}`;
}

function toneClass(value?: string | null) {
  const text = safeLower(value);
  if (text.includes('closed') || text.includes('complete') || text.includes('safe') || text.includes('ready') || text.includes('approved')) return 'success';
  if (text.includes('urgent') || text.includes('blocked') || text.includes('overdue') || text.includes('rejected')) return 'danger';
  if (text.includes('pending') || text.includes('review') || text.includes('watch') || text.includes('draft') || text.includes('waiting')) return 'warning';
  return 'info';
}

function customerStageLabel(value?: string | null) {
  const stage = safeLower(value);
  if (
    stage.includes('document validation') ||
    stage.includes('carrier schedule') ||
    stage.includes('shipping instruction') ||
    stage.includes('bill of lading') ||
    stage.includes('manifest') ||
    stage.includes('trade finance') ||
    stage.includes('settlement') ||
    stage.includes('shipping packet complete') ||
    stage.includes('booking')
  ) return shippingStageLabel(value);
  if (stage.includes('djibouti')) return 'Shipment is being released';
  if (stage.includes('dispatch')) return 'Preparing inland movement';
  if (stage.includes('inland transit')) return 'Inland transit';
  if (stage.includes('dry port')) return 'Waiting for yard processing';
  if (stage.includes('closed')) return 'Completed';
  if (stage.includes('booking')) return 'Booking confirmed';
  return safeText(value, 'In progress');
}

function customerStatusLabel(value?: string | null) {
  const status = safeLower(value);
  if (status.includes('approve remaining')) return 'Documents are still under validation';
  if (status.includes('assign vessel')) return 'Waiting for vessel assignment';
  if (status.includes('shipping instruction')) return 'Shipping instruction is being prepared';
  if (status.includes('finalize house bl')) return 'Bill of lading is being finalized';
  if (status.includes('generate voyage manifest')) return 'Manifest is being prepared';
  if (status.includes('verify lc')) return 'Trade finance verification is in progress';
  if (status.includes('close settlement')) return 'Settlement is being closed';
  if (status.includes('proceed to corridor')) return 'Ready for corridor execution';
  if (status.includes('waiting yard handoff')) return 'Waiting for yard processing';
  if (status.includes('cycle closed')) return 'Completed';
  if (status.includes('arrived inland')) return 'Arrived inland (FULL_IN)';
  if (status.includes('awaiting unload handoff')) return 'Awaiting unload handoff (FULL_IN)';
  if (status.includes('ready for pickup')) return 'Ready for pickup (FULL_OUT)';
  if (status.includes('awaiting consignee handoff')) return 'Awaiting consignee handoff (FULL_OUT)';
  if (status.includes('ready for empty release')) return 'Ready for empty release (EMPTY_IN)';
  if (status.includes('empty released')) return 'Empty released (EMPTY_OUT)';
  if (status.includes('empty in return transit')) return 'Empty in return transit (EMPTY_OUT)';
  if (status.includes('empty return in progress')) return 'Empty return in progress (EMPTY_OUT)';
  if (status.includes('empty returned')) return 'Empty returned (EMPTY_RETURNED)';
  if (status.includes('closure pending')) return 'Closure pending (EMPTY_RETURNED)';
  if (status.includes('pod complete')) return 'POD complete (FULL_OUT)';
  if (status.includes('gate-out')) return 'Ready for inland movement';
  if (status.includes('clearance')) return 'Shipment is being cleared';
  if (status.includes('waiting')) return 'Waiting for update';
  return safeText(value, 'Pending');
}

function customerActionLabel(value?: string | null) {
  const status = safeLower(value);
  if (status.includes('confirm')) return 'Confirm receipt';
  if (status.includes('review')) return 'Review quote';
  if (status.includes('waiting')) return 'Monitor update';
  return 'No action needed';
}

function customerReleaseLabel(value?: string | null) {
  const status = safeLower(value);
  if (status.includes('gate-out') || status.includes('ready')) return 'Ready for inland movement';
  if (status.includes('clearance')) return 'Shipment is being cleared';
  if (status.includes('pending')) return 'Waiting for release processing';
  return safeText(value, 'In progress');
}

function customerReturnLabel(value?: string | null) {
  const status = safeLower(value);
  if (status.includes('returned') || status.includes('closed')) return 'Return completed (EMPTY_RETURNED)';
  if (status.includes('pending')) return 'Return still being processed';
  return safeText(value, 'Pending');
}

function customerProfileInitials(name: string) {
  const parts = safeText(name, 'Customer').split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || 'CU';
}

function normalizeShipment(shipment: PartialCustomerShipment | undefined, fallbackCustomerName: string): CustomerShipment {
  return {
    shipmentRef: safeText(shipment?.shipmentRef, ''),
    customerName: safeText(shipment?.customerName, fallbackCustomerName),
    currentStage: safeText(shipment?.currentStage, 'Booking'),
    currentStatus: safeText(shipment?.currentStatus, 'Pending'),
    destinationNode: safeText(shipment?.destinationNode, 'Pending'),
    taxDutySummary: safeText(shipment?.taxDutySummary, 'Pending'),
    releaseReadiness: safeText(shipment?.releaseReadiness, 'Pending'),
    emptyReturnSummary: safeText(shipment?.emptyReturnSummary, 'Pending'),
    container: {
      containerNumber: safeText(shipment?.container?.containerNumber, ''),
      sealNumber: safeText(shipment?.container?.sealNumber, ''),
      currentLocation: safeText(shipment?.container?.currentLocation, 'Pending'),
      currentEta: safeText(shipment?.container?.currentEta, ''),
      detentionRiskLevel: safeText(shipment?.container?.detentionRiskLevel, 'Safe'),
      demurrageRiskLevel: safeText(shipment?.container?.demurrageRiskLevel, 'Safe'),
    },
    milestones: Array.isArray(shipment?.milestones) ? shipment.milestones : [],
    linkedDocuments: Array.isArray(shipment?.linkedDocuments) ? shipment.linkedDocuments : [],
    payments: Array.isArray(shipment?.payments) ? shipment.payments : [],
  };
}

function downstreamStateAllowed(shippingBooking?: { currentStage?: string | null } | null) {
  const stage = safeLower(shippingBooking?.currentStage);
  if (!stage) return true;
  return stage.includes('shipping packet complete');
}

function deriveLiveState(bookingNumber: string, shippingBooking?: { currentStage?: string | null } | null) {
  if (!downstreamStateAllowed(shippingBooking)) return null;

  const yard = readManualYardRecords().find((item) => item.bookingNumber === bookingNumber);
  if (yard) {
    if (yard.emptyReturn.emptyReturned && yard.emptyReturn.returnReceiptAvailable) {
      return { stage: 'Closed', status: 'Cycle closed', location: yard.inlandNode };
    }
    if (yard.unloadStatus.unloadCompleted) {
      return { stage: 'Dry port', status: 'Unload complete', location: yard.inlandNode };
    }
    if (yard.arrivalControl.actualArrivalTime || yard.arrivalControl.gateInConfirmed) {
      return { stage: 'Dry port', status: 'Arrived inland', location: yard.inlandNode };
    }
  }

  const dispatch = readManualDispatchTrips().find((item) => item.bookingNumber === bookingNumber);
  if (dispatch) {
    if (dispatch.currentTripStatus === 'Awaiting unload handoff') {
      return { stage: 'Inland transit', status: 'Waiting yard handoff', location: dispatch.inlandDestination };
    }
    if (dispatch.currentTripStatus === 'Arrived inland') {
      return { stage: 'Inland transit', status: 'Arrived inland', location: dispatch.inlandDestination };
    }
    if (dispatch.currentTripStatus === 'In transit') {
      return { stage: 'Inland transit', status: 'In transit', location: dispatch.liveMovement.currentLocation };
    }
    return { stage: 'Dispatch', status: dispatch.currentTripStatus, location: dispatch.originHandoffPoint };
  }

  const release = readManualDjiboutiReleaseRecords().find((item) => item.bookingNumber === bookingNumber);
  if (release) {
    return { stage: 'Djibouti release', status: release.currentStage, location: release.dischargePort };
  }

  return null;
}

function buildMergedPortal(initialPortal: CustomerPortalPayload): CustomerPortalPayload {
  const shippingWorkspace = readShippingPhase1Workspace();
  const shippingBookingByRef = new Map(shippingWorkspace.bookings.map((item) => [item.bookingId, item] as const));
  const sourceShipments = Array.isArray(initialPortal.shipments) ? initialPortal.shipments : [];
  const merged = new Map(
    sourceShipments.map((shipment) => {
      const normalized = normalizeShipment(shipment, initialPortal.customerName);
      return [normalized.shipmentRef, normalized];
    }),
  );
  const releaseRecords = readManualDjiboutiReleaseRecords();
  const dispatchTrips = readManualDispatchTrips();
  const yardRecords = readManualYardRecords();
  const bookingNumbers = new Set([
    ...shippingWorkspace.bookings.map((item) => item.bookingId),
    ...releaseRecords.map((item) => item.bookingNumber),
    ...dispatchTrips.map((item) => item.bookingNumber),
    ...yardRecords.map((item) => item.bookingNumber),
  ]);

  bookingNumbers.forEach((bookingNumber) => {
    const existing = merged.get(bookingNumber);
    const release = releaseRecords.find((item) => item.bookingNumber === bookingNumber);
    const dispatch = dispatchTrips.find((item) => item.bookingNumber === bookingNumber);
    const yard = yardRecords.find((item) => item.bookingNumber === bookingNumber);
    const shippingBooking = shippingBookingByRef.get(bookingNumber);
    const liveState = deriveLiveState(bookingNumber, shippingBooking);
    merged.set(
      bookingNumber,
      normalizeShipment(
        {
          ...existing,
          shipmentRef: bookingNumber,
          customerName: existing?.customerName || shippingBooking?.customerName || yard?.customerName || dispatch?.customerName || release?.customerName || initialPortal.customerName,
          currentStage: liveState?.stage || shippingBooking?.currentStage || existing?.currentStage,
          currentStatus: liveState?.status || shippingBooking?.nextAction || existing?.currentStatus,
          destinationNode: yard?.inlandNode || dispatch?.inlandDestination || release?.handoff.inlandDestination || existing?.destinationNode,
          taxDutySummary: existing?.taxDutySummary || (release?.customsTransit.customsCleared ? 'Customs cleared' : 'Clearance pending'),
          releaseReadiness: existing?.releaseReadiness || (release?.gateOutReady ? 'Gate-out ready' : release?.currentStage),
          emptyReturnSummary: existing?.emptyReturnSummary || (yard?.emptyReturn.emptyReturned ? 'Empty returned' : yard?.emptyReturn.status),
          container: {
            containerNumber: safeText(yard?.containerNumber || dispatch?.containerNumber || release?.containerNumber || existing?.container?.containerNumber, ''),
            sealNumber: safeText(yard?.sealNumber || dispatch?.sealNumber || release?.sealNumber || existing?.container?.sealNumber, ''),
            currentLocation: safeText(liveState?.location || existing?.container?.currentLocation, 'Pending'),
            currentEta: safeText(dispatch?.expectedArrivalTime || release?.expectedGateOutTime || existing?.container?.currentEta, ''),
            detentionRiskLevel: safeText(existing?.container?.detentionRiskLevel || (yard?.emptyReturn.detentionRiskOpen ? 'Urgent' : 'Safe'), 'Safe'),
            demurrageRiskLevel: safeText(existing?.container?.demurrageRiskLevel || release?.storageRisk, 'Safe'),
          },
        },
        initialPortal.customerName,
      ),
    );
  });

  const shipments = Array.from(merged.values())
    .filter((shipment) => safeText(shipment.shipmentRef, '') !== '')
    .sort((left, right) => safeText(right.shipmentRef, '').localeCompare(safeText(left.shipmentRef, '')));
  const activeShipment = shipments[0] ?? null;

  return {
    ...initialPortal,
    customerName: safeText(activeShipment?.customerName || initialPortal.customerName, 'Customer'),
    activeShipmentRef: safeText(activeShipment?.shipmentRef || initialPortal.activeShipmentRef, ''),
    kpis: [
      { key: 'active_shipments', label: 'Active shipments', value: String(shipments.filter((item) => customerStageLabel(item.currentStage) !== 'Completed').length), helper: 'Currently visible in your portal' },
      { key: 'waiting_action', label: 'Waiting for your action', value: String(shipments.filter((item) => safeLower(item.currentStatus).includes('confirm') || safeLower(item.currentStatus).includes('review')).length), helper: 'Quotes or confirmations still open' },
      { key: 'in_transit', label: 'In transit', value: String(shipments.filter((item) => customerStageLabel(item.currentStage) === 'Inland transit').length), helper: 'Moving between release and delivery' },
      { key: 'completed', label: 'Delivered / completed', value: String(shipments.filter((item) => customerStageLabel(item.currentStage) === 'Completed').length), helper: 'Files already completed' },
      { key: 'open_quotes', label: 'Open quotes', value: '0', helper: 'Updated from quote approvals below' },
    ],
    shipments,
  };
}

function buildClearedPortal(initialPortal: CustomerPortalPayload): CustomerPortalPayload {
  return {
    ...initialPortal,
    customerName: safeText(initialPortal.customerName, 'Customer'),
    activeShipmentRef: '',
    kpis: [
      { key: 'active_shipments', label: 'Active shipments', value: '0', helper: 'No active shipments are visible in this console.' },
      { key: 'waiting_action', label: 'Waiting for your action', value: '0', helper: 'No customer actions are currently open.' },
      { key: 'in_transit', label: 'In transit', value: '0', helper: 'No inland shipments are currently visible.' },
      { key: 'completed', label: 'Delivered / completed', value: '0', helper: 'No completed shipments are currently visible.' },
      { key: 'open_quotes', label: 'Open quotes', value: '0', helper: 'No customer quotes are currently visible.' },
    ],
    shipments: [],
  };
}

function compareReferenceOrder(left: string | undefined, right: string | undefined) {
  const leftKey = String(left || '').replace(/\D/g, '');
  const rightKey = String(right || '').replace(/\D/g, '');
  if (leftKey.length !== rightKey.length) return rightKey.length - leftKey.length;
  return rightKey.localeCompare(leftKey);
}

function readSharedQuotes() {
  return readSharedQuoteRequests([] as UnifiedBookingRequest[]);
}

function writeSharedQuotes(next: UnifiedBookingRequest[]) {
  writeSharedQuoteRequests(next);
}

export function CustomerWorkspaceRuntime({ initialPortal }: Props) {
  const searchParams = useSearchParams();
  const headerQuery = searchParams.get('query') || searchParams.get('q') || '';
  const [portal, setPortal] = useState(() => (clearAdminCustomerConsole ? buildClearedPortal(initialPortal) : buildMergedPortal(initialPortal)));
  const [quotes, setQuotes] = useState<UnifiedBookingRequest[]>([]);
  const [quoteNotice, setQuoteNotice] = useState('');
  const [selectedShipmentRef, setSelectedShipmentRef] = useState(initialPortal.activeShipmentRef);
  const [searchValue, setSearchValue] = useState(headerQuery);
  const [shipmentStatusFilter, setShipmentStatusFilter] = useState<'all' | 'active' | 'in_transit' | 'waiting' | 'completed'>('all');
  const [quoteStatusFilter, setQuoteStatusFilter] = useState<'all' | 'review' | 'accepted' | 'revision' | 'rejected'>('all');
  const [shippingWorkspace, setShippingWorkspace] = useState(() => readShippingPhase1Workspace());

  useEffect(() => {
    const reload = () => {
      if (clearAdminCustomerConsole) {
        setPortal(buildClearedPortal(initialPortal));
        setQuotes([]);
        return;
      }
      const nextQuotes = readSharedQuotes();
      setPortal(buildMergedPortal(initialPortal));
      setQuotes(nextQuotes);
      setShippingWorkspace(readShippingPhase1Workspace());
    };
    reload();
    window.addEventListener('storage', reload);
    window.addEventListener(sharedQuoteStorageUpdatedEvent, reload as EventListener);
    window.addEventListener(manualCorridorStorageUpdatedEvent, reload as EventListener);
    window.addEventListener(shippingPhase1UpdatedEvent, reload as EventListener);
    return () => {
      window.removeEventListener('storage', reload);
      window.removeEventListener(sharedQuoteStorageUpdatedEvent, reload as EventListener);
      window.removeEventListener(manualCorridorStorageUpdatedEvent, reload as EventListener);
      window.removeEventListener(shippingPhase1UpdatedEvent, reload as EventListener);
    };
  }, [initialPortal]);

  useEffect(() => {
    setSearchValue(headerQuery);
  }, [headerQuery]);

  const customerQuotes = useMemo(
    () =>
      quotes
        .filter((quote) => {
          const portalRecipient = safeLower(quote.localPortalRecipientEmail);
          const customerEmail = safeLower(quote.email);
          return (
            portalRecipient === 'customer1@tikurabay.com' ||
            customerEmail === 'customer1@tikurabay.com' ||
            portalRecipient === 'write2get@gmail.com' ||
            customerEmail === 'write2get@gmail.com'
          );
        })
        .sort((left, right) => {
          const createdDelta = new Date(safeText(right.createdAt, '')).getTime() - new Date(safeText(left.createdAt, '')).getTime();
          if (createdDelta !== 0) return createdDelta;
          return compareReferenceOrder(left.bookingId || left.quoteId, right.bookingId || right.quoteId);
        })
        .slice(0, 12),
    [quotes],
  );

  const filteredShipments = useMemo(() => {
    const query = safeLower(searchValue);
    return portal.shipments
      .filter((shipment) => {
        const haystack = [
          shipment.shipmentRef,
          shipment.customerName,
          shipment.destinationNode,
          shipment.container.containerNumber,
          shipment.container.currentLocation,
          shipment.currentStage,
          shipment.currentStatus,
        ].map((value) => safeText(value, '')).join(' ').toLowerCase();
        const matchesQuery = !query || haystack.includes(query);
        const stage = customerStageLabel(shipment.currentStage);
        const status = customerStatusLabel(shipment.currentStatus);
        const matchesStatus =
          shipmentStatusFilter === 'all'
            ? true
            : shipmentStatusFilter === 'active'
              ? stage !== 'Completed'
              : shipmentStatusFilter === 'in_transit'
                ? stage === 'Inland transit'
                : shipmentStatusFilter === 'waiting'
                  ? safeLower(status).includes('waiting')
                  : stage === 'Completed';
        return matchesQuery && matchesStatus;
      })
      .sort((left, right) => compareReferenceOrder(left.shipmentRef, right.shipmentRef));
  }, [portal.shipments, searchValue, shipmentStatusFilter]);

  const filteredQuotes = useMemo(() => {
    const query = safeLower(searchValue);
    return customerQuotes
      .filter((quote) => {
        const haystack = [
          quote.quoteId,
          quote.bookingId,
          quote.customerName,
          quote.portOfLoading,
          quote.portOfDischarge,
          quote.inlandDestination,
          quote.serviceType,
        ].map((value) => safeText(value, '')).join(' ').toLowerCase();
        const matchesQuery = !query || haystack.includes(query);
        const approval = safeLower(quote.approvalStatus || quote.quoteStatus);
        const matchesStatus =
          quoteStatusFilter === 'all'
            ? true
            : quoteStatusFilter === 'review'
              ? approval !== 'accepted' && approval !== 'rejected'
              : quoteStatusFilter === 'accepted'
                ? approval === 'accepted'
                : quoteStatusFilter === 'revision'
                  ? approval.includes('draft') || approval.includes('revision')
                  : approval === 'rejected';
        return matchesQuery && matchesStatus;
      })
      .sort((left, right) => compareReferenceOrder(left.bookingId || left.quoteId, right.bookingId || right.quoteId));
  }, [customerQuotes, quoteStatusFilter, searchValue]);

  useEffect(() => {
    if (filteredShipments.some((item) => item.shipmentRef === selectedShipmentRef)) return;
    setSelectedShipmentRef(filteredShipments[0]?.shipmentRef || portal.shipments[0]?.shipmentRef || '');
  }, [filteredShipments, portal.shipments, selectedShipmentRef]);

  const selectedShipment = useMemo(
    () => filteredShipments.find((item) => item.shipmentRef === selectedShipmentRef) || portal.shipments.find((item) => item.shipmentRef === selectedShipmentRef) || filteredShipments[0] || portal.shipments[0] || null,
    [filteredShipments, portal.shipments, selectedShipmentRef],
  );
  const selectedAfterSales = useMemo(
    () => shippingWorkspace.afterSales.find((item) => item.bookingId === selectedShipment?.shipmentRef) || null,
    [selectedShipment?.shipmentRef, shippingWorkspace.afterSales],
  );
  const selectedShippingBooking = useMemo(
    () => shippingWorkspace.bookings.find((item) => item.bookingId === selectedShipment?.shipmentRef) || null,
    [selectedShipment?.shipmentRef, shippingWorkspace.bookings],
  );
  const selectedCarrierSchedule = useMemo(() => {
    const bill = shippingWorkspace.billsOfLading.find((item) => item.bookingId === selectedShipment?.shipmentRef);
    if (!bill) return null;
    return shippingWorkspace.carrierSchedules.find((item) => item.vesselName === bill.vesselName && item.voyageNumber === bill.voyageNumber) || null;
  }, [selectedShipment?.shipmentRef, shippingWorkspace.billsOfLading, shippingWorkspace.carrierSchedules]);

  const summaryCards = useMemo(() => {
    const waitingActionCount = filteredQuotes.filter((quote) => safeLower(quote.approvalStatus || quote.quoteStatus) !== 'accepted' && safeLower(quote.approvalStatus || quote.quoteStatus) !== 'rejected').length;
    const inTransitCount = portal.shipments.filter((item) => customerStageLabel(item.currentStage) === 'Inland transit').length;
    const completedCount = portal.shipments.filter((item) => customerStageLabel(item.currentStage) === 'Completed').length;
    const activeCount = portal.shipments.filter((item) => customerStageLabel(item.currentStage) !== 'Completed').length;
    return [
      { label: 'Active shipments', value: String(activeCount), helper: 'Currently moving or awaiting closure' },
      { label: 'Waiting for your action', value: String(waitingActionCount), helper: 'Quotes or confirmations still open' },
      { label: 'In transit', value: String(inTransitCount), helper: 'Moving inland right now' },
      { label: 'Delivered / completed', value: String(completedCount), helper: 'Files already completed' },
      { label: 'Open quotes', value: String(customerQuotes.length), helper: 'Visible for review and approval' },
    ];
  }, [customerQuotes.length, filteredQuotes, portal.shipments]);

  const nextAction = useMemo(() => {
    const quoteToReview = filteredQuotes.find((quote) => {
      const status = safeLower(quote.approvalStatus || quote.quoteStatus);
      return status !== 'accepted' && status !== 'rejected';
    });
    if (quoteToReview) {
      return {
        title: `Review quote ${safeText(quoteToReview.quoteId, 'Quote')}`,
        helper: 'Approval is still open and booking progress depends on your response.',
        href: `${customerPortalBaseUrl}/quotes/${encodeURIComponent(safeText(quoteToReview.quoteId, ''))}/review`,
        actionLabel: 'Review quote',
      };
    }
    if (selectedShipment && safeLower(selectedShipment.currentStatus).includes('confirm')) {
      return {
        title: `Confirm receipt for ${selectedShipment.shipmentRef}`,
        helper: 'Receipt confirmation is the remaining customer step for this shipment.',
        href: '#customer-shipments',
        actionLabel: 'Open shipment',
      };
    }
    if (selectedShipment && customerStageLabel(selectedShipment.currentStage) !== 'Completed') {
      return {
        title: `Track ${selectedShipment.shipmentRef}`,
        helper: 'The shipment is still active. Open the detail modules below for the latest update.',
        href: '#customer-dashboard',
        actionLabel: 'View status',
      };
    }
    return {
      title: 'No customer action needed right now',
      helper: 'Your current files are progressing normally. Reach support if you need an update.',
      href: `${customerPortalBaseUrl}/support`,
      actionLabel: 'Contact support',
    };
  }, [filteredQuotes, selectedShipment]);

  const aiInsight = useMemo<CustomerInsight>(() => {
    const quoteToReview = filteredQuotes.find((quote) => {
      const status = safeLower(quote.approvalStatus || quote.quoteStatus);
      return status !== 'accepted' && status !== 'rejected';
    });
    if (quoteToReview) {
      return {
        title: `Review quote ${safeText(quoteToReview.quoteId, 'Quote')} before it expires`,
        summary: 'This quote is still waiting for approval. Reviewing it now keeps booking and shipment planning on schedule.',
        actionLabel: 'Review quote',
        href: `${customerPortalBaseUrl}/quotes/${encodeURIComponent(safeText(quoteToReview.quoteId, ''))}/review`,
        tone: 'warning',
      };
    }

    if (selectedShipment && safeLower(selectedShipment.currentStatus).includes('waiting')) {
      return {
        title: `${selectedShipment.shipmentRef} is waiting for the next update`,
        summary: `${customerStatusLabel(selectedShipment.currentStatus)} at ${safeText(selectedShipment.container.currentLocation || selectedShipment.destinationNode, 'the current node')}. Support can help if you need a direct status check.`,
        actionLabel: 'Open shipment',
        href: '#customer-shipments',
        tone: 'info',
      };
    }

    if (selectedShipment && customerStageLabel(selectedShipment.currentStage) === 'Completed') {
      if (selectedAfterSales?.status === 'open') {
        return {
          title: `Support case is open for ${selectedShipment.shipmentRef}`,
          summary: `${selectedAfterSales.summary} Tikur Abay support should resolve this before final customer satisfaction is confirmed.`,
          actionLabel: 'Contact support',
          href: `${customerPortalBaseUrl}/support`,
          tone: 'warning',
        };
      }
      if (selectedAfterSales?.status === 'feedback_pending') {
        return {
          title: `Rate the completed shipment ${selectedShipment.shipmentRef}`,
          summary: 'Delivery is complete and the follow-up was sent. Customer feedback is the remaining after-sales step.',
          actionLabel: 'Contact support',
          href: `${customerPortalBaseUrl}/support`,
          tone: 'info',
        };
      }
      return {
        title: `Download documents for ${selectedShipment.shipmentRef}`,
        summary: 'This shipment is complete. Review the final document set and confirm that closure records match your files.',
        actionLabel: 'View documents',
        href: '#customer-documents',
        tone: 'success',
      };
    }

    if (selectedCarrierSchedule?.status === 'closing_soon') {
      return {
        title: `${selectedCarrierSchedule.vesselName} is approaching cutoff`,
        summary: `Your shipment is tied to voyage ${selectedCarrierSchedule.voyageNumber}. ETD is ${formatDateTime(selectedCarrierSchedule.etd)} and the carrier schedule is in the closing window.`,
        actionLabel: 'View shipment',
        href: '#customer-dashboard',
        tone: 'warning',
      };
    }

    if (selectedShipment) {
      return {
        title: `${selectedShipment.shipmentRef} is progressing normally`,
        summary: `${customerStageLabel(selectedShipment.currentStage)} with ${safeLower(customerStatusLabel(selectedShipment.currentStatus))}. No customer action is needed right now.`,
        actionLabel: 'View shipment',
        href: '#customer-dashboard',
        tone: 'success',
      };
    }

    return {
      title: 'No active shipment requires customer action',
      summary: 'There are no open approvals or delivery confirmations waiting from you right now.',
      actionLabel: 'Open support',
      href: `${customerPortalBaseUrl}/support`,
      tone: 'info',
    };
  }, [filteredQuotes, selectedAfterSales, selectedCarrierSchedule, selectedShipment]);

  const timelineStages = useMemo(() => {
    const shipment = selectedShipment;
    if (!shipment) return [] as Array<{ label: string; state: 'done' | 'current' | 'upcoming' }>;

    const current = safeLower(customerStageLabel(shipment.currentStage));
    const stages = [
      'Booking confirmed',
      'Origin preparation',
      'Vessel departed',
      'Port release',
      'Inland transit',
      'Yard processing',
      'Delivered',
      'Closure',
    ];
    const currentIndex =
      current.includes('booking') ? 0 :
      current.includes('origin') ? 1 :
      current.includes('vessel') ? 2 :
      current.includes('release') ? 3 :
      current.includes('transit') || current.includes('dispatch') ? 4 :
      current.includes('yard') ? 5 :
      current.includes('delivered') || current.includes('unload') ? 6 :
      current.includes('completed') || current.includes('closed') ? 7 : 4;
    return stages.map((label, index) => ({
      label,
      state: index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming',
    }));
  }, [selectedShipment]);

  const customerDocuments = useMemo(() => {
    if (!selectedShipment) return [] as Array<{ title: string; status: string }>;
    const docs = (Array.isArray(selectedShipment.linkedDocuments) ? selectedShipment.linkedDocuments : []).map((doc) => ({
      title: safeText(doc.title, 'Document'),
      status: safeText(doc.status, 'Pending visibility'),
    }));
    if (!docs.length) {
      return [
        { title: 'Commercial invoice', status: 'Pending visibility' },
        { title: 'Packing list', status: 'Pending visibility' },
        { title: 'Proof of delivery', status: customerStageLabel(selectedShipment.currentStage) === 'Completed' ? 'Available soon' : 'Pending delivery' },
      ];
    }
    return docs;
  }, [selectedShipment]);

  function updateQuote(quoteId: string, updater: (quote: UnifiedBookingRequest) => UnifiedBookingRequest) {
    const next = quotes.map((quote) => (quote.quoteId === quoteId ? updater(quote) : quote));
    setQuotes(next);
    writeSharedQuotes(next);
  }

  function openQuoteReview(quoteId: string) {
    writeSharedQuotes(quotes);
    window.open(`${customerPortalBaseUrl}/quotes/${encodeURIComponent(quoteId)}/review?format=pdf`, '_blank', 'noopener,noreferrer');
  }

  function approveQuote(quoteId: string) {
    const approvedAt = new Date().toISOString();
    updateQuote(quoteId, (quote) => ({
      ...quote,
      bookingId: quote.bookingId || deriveBookingIdFromQuote(quote.quoteId),
      quoteStatus: quote.quoteStatus === 'assigned_to_origin' ? 'assigned_to_origin' : 'quote_accepted',
      bookingStatus: quote.bookingStatus || 'draft',
      approvalStatus: 'accepted',
      approvalMethod: 'Customer approved via admin customer console',
      approvalRecordedBy: 'customer1@tikurabay.com',
      approvalRecordedAt: approvedAt,
      acceptedAt: approvedAt,
      updatedAt: approvedAt,
    }));
    setQuoteNotice(`Quote ${quoteId} approved.`);
  }

  function requestRevision(quoteId: string) {
    const requestedAt = new Date().toISOString();
    updateQuote(quoteId, (quote) => ({
      ...quote,
      quoteStatus: 'quote_revision_requested',
      approvalStatus: 'draft',
      approvalMethod: 'Revision requested',
      approvalRecordedBy: 'customer1@tikurabay.com',
      approvalRecordedAt: requestedAt,
      updatedAt: requestedAt,
    }));
    setQuoteNotice(`Revision request recorded for ${quoteId}.`);
  }

  function rejectQuote(quoteId: string) {
    const rejectedAt = new Date().toISOString();
    updateQuote(quoteId, (quote) => ({
      ...quote,
      quoteStatus: 'quote_rejected',
      approvalStatus: 'rejected',
      approvalMethod: 'Rejected by customer',
      approvalRecordedBy: 'customer1@tikurabay.com',
      approvalRecordedAt: rejectedAt,
      updatedAt: rejectedAt,
    }));
    setQuoteNotice(`Quote ${quoteId} rejected.`);
  }

  return (
    <main className="customer-portal-page">
      <div className="customer-portal-container customer-portal-shell">
        {quoteNotice ? <div className="customer-portal-notice">{quoteNotice}</div> : null}

        <section className="customer-portal-header customer-portal-command-header">
          <div className="customer-portal-header-copy">
            <div className="customer-portal-kicker">Customer portal</div>
            <h1>Customer Portal</h1>
            <p>Shipment timeline and customer actions</p>
          </div>
          <div className="customer-profile-chip">
            <span className="customer-profile-avatar">{customerProfileInitials(portal.customerName)}</span>
            <div>
              <strong>{safeText(portal.customerName, 'Customer')}</strong>
              <span>Portal account</span>
            </div>
          </div>
        </section>

        <section className="customer-workspace-hero">
          <div className="customer-workspace-copy">
            <span className="customer-portal-kicker">Workspace</span>
            <h2>{safeText(portal.customerName, 'Alem Logistics PLC')}</h2>
            <p>Follow the shipment workflow and review container movement in separate views.</p>
          </div>
          <div className="customer-workspace-card">
            <span className="customer-portal-kicker">Selected shipment</span>
            <strong>{selectedShipment?.shipmentRef || 'No active shipment'}</strong>
            <div className="customer-workspace-meta">
              <InfoPill label="Shipment workflow" value={selectedShipment ? customerStageLabel(selectedShipment.currentStage) : 'Pending'} />
              <InfoPill label="Current destination" value={selectedShipment?.destinationNode || 'Pending'} />
              <InfoPill label="Current location" value={selectedShipment?.container.currentLocation || 'Pending'} />
            </div>
          </div>
        </section>

        <section className="customer-portal-summary-strip">
          {summaryCards.map((card) => (
            <article key={card.label} className="customer-summary-card">
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <p>{card.helper}</p>
            </article>
          ))}
        </section>

        <section className="customer-toolbar-row">
          <div className="customer-toolbar-controls">
            <select className="customer-toolbar-select" value={shipmentStatusFilter} onChange={(event) => setShipmentStatusFilter(event.target.value as typeof shipmentStatusFilter)}>
              <option value="all">All shipments</option>
              <option value="active">Active shipments</option>
              <option value="in_transit">In transit</option>
              <option value="waiting">Waiting update</option>
              <option value="completed">Completed</option>
            </select>
            <select className="customer-toolbar-select" value={quoteStatusFilter} onChange={(event) => setQuoteStatusFilter(event.target.value as typeof quoteStatusFilter)}>
              <option value="all">All quotes</option>
              <option value="review">Waiting approval</option>
              <option value="accepted">Accepted</option>
              <option value="revision">Revision requested</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="customer-next-strip">
            <span className="customer-portal-kicker">Next action</span>
            <strong>{nextAction.title}</strong>
            <p>{nextAction.helper}</p>
            <a className="customer-inline-link" href={nextAction.href} target={nextAction.href.startsWith('http') ? '_blank' : undefined} rel={nextAction.href.startsWith('http') ? 'noreferrer' : undefined}>
              {nextAction.actionLabel}
            </a>
          </div>
        </section>

        <section id="customer-shipments" className="customer-section customer-active-shipments-section">
          <div className="customer-section-head">
            <div>
              <div className="customer-portal-kicker">Active shipments</div>
              <h2>Track your shipments</h2>
            </div>
            <span className="customer-section-meta">{filteredShipments.length} visible</span>
          </div>
          {!filteredShipments.length ? (
            <EmptyState message="No active shipments match the current search or filters." />
          ) : (
            <div className="customer-shipment-grid customer-shipment-queue-grid">
              {filteredShipments.map((shipment) => (
                <article
                  key={shipment.shipmentRef}
                  className={shipment.shipmentRef === selectedShipment?.shipmentRef ? 'customer-shipment-card active' : 'customer-shipment-card'}
                  onClick={() => setSelectedShipmentRef(shipment.shipmentRef)}
                  data-testid={`customer-shipment-row-${shipment.shipmentRef}`}
                >
                  <div className="customer-shipment-head">
                    <div>
                      <span className="customer-shipment-ref">{shipment.shipmentRef}</span>
                      <h3>{customerStageLabel(shipment.currentStage)}</h3>
                    </div>
                    <div className="customer-shipment-badges">
                      <span className={`status-badge ${toneClass(shipment.currentStage)}`}>{customerStageLabel(shipment.currentStage)}</span>
                      <span className={`status-badge ${toneClass(shipment.currentStatus)}`}>{customerStatusLabel(shipment.currentStatus)}</span>
                    </div>
                  </div>
                  <div className="customer-shipment-route">{safeText(shipment.customerName, 'Customer')} {'->'} {safeText(shipment.destinationNode, 'Destination')}</div>
                  <div className="customer-shipment-summary">
                    <InfoPill label="Shipment workflow" value={customerStageLabel(shipment.currentStage)} />
                    <InfoPill label="Action required" value={customerActionLabel(shipment.currentStatus)} />
                    <InfoPill label="Container" value={safeText(shipment.container.containerNumber, 'Pending')} />
                    <InfoPill label="Current location" value={safeText(shipment.container.currentLocation, 'Pending')} />
                  </div>
                  <div className="customer-shipment-actions">
                    <button type="button" className="customer-inline-link" onClick={() => setSelectedShipmentRef(shipment.shipmentRef)}>View shipment</button>
                    <a className="customer-inline-link" href={`${customerPortalBaseUrl}/documents`} target="_blank" rel="noreferrer">View documents</a>
                    <a className="customer-inline-link" href={`${customerPortalBaseUrl}/support`} target="_blank" rel="noreferrer">Contact support</a>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section id="customer-dashboard" className="customer-dashboard-grid">
          <article className="customer-section customer-dashboard-card">
            <div className="customer-section-head">
              <div>
                <div className="customer-portal-kicker">Shipment workflow</div>
                <h2>Shipment Workflow</h2>
              </div>
            </div>
            {selectedShipment ? (
              <>
                <div className="customer-status-list">
                  <StatusRow label="Current stage" value={customerStageLabel(selectedShipment.currentStage)} />
                  <StatusRow label="Release update" value={customerReleaseLabel(selectedShipment.releaseReadiness)} />
                  <StatusRow label="Delivery update" value={customerStatusLabel(selectedShipment.currentStatus)} />
                  <StatusRow label="Return status" value={customerReturnLabel(selectedShipment.emptyReturnSummary)} />
                  <StatusRow label="Carrier schedule" value={selectedCarrierSchedule ? `${selectedCarrierSchedule.carrierName} · ${selectedCarrierSchedule.vesselName} · ${selectedCarrierSchedule.voyageNumber}` : 'Pending vessel assignment'} />
                </div>
                {selectedShippingBooking && customerStageLabel(selectedShipment.currentStage) !== 'Completed' ? (
                  <div className="customer-module-actions">
                    <a className="customer-portal-button subtle" href={shippingDeskLink(selectedShippingBooking.currentStage).href}>
                      {shippingDeskLink(selectedShippingBooking.currentStage).label}
                    </a>
                  </div>
                ) : null}
              </>
            ) : (
              <EmptyState message="No shipment selected." />
            )}
          </article>

          <article className="customer-section customer-dashboard-card">
            <div className="customer-section-head">
              <div>
                <div className="customer-portal-kicker">Container lifecycle</div>
                <h2>Container Lifecycle</h2>
              </div>
            </div>
            {selectedShipment ? (
              <>
                <div className="customer-status-list">
                  <StatusRow label="Container" value={safeText(selectedShipment.container.containerNumber, 'Pending')} />
                  <StatusRow label="Seal" value={safeText(selectedShipment.container.sealNumber, 'Pending')} />
                  <StatusRow label="Current location" value={safeText(selectedShipment.container.currentLocation, 'Pending')} />
                  <StatusRow label="ETA" value={formatDateTime(selectedShipment.container.currentEta)} />
                  <StatusRow label="Detention risk" value={safeText(selectedShipment.container.detentionRiskLevel, 'Safe')} />
                  <StatusRow label="Demurrage risk" value={safeText(selectedShipment.container.demurrageRiskLevel, 'Safe')} />
                </div>
                <div className="customer-module-actions">
                  <a className="customer-portal-button subtle" href={`/shipping/track?query=${encodeURIComponent(selectedShipment.container.containerNumber || selectedShipment.shipmentRef)}`}>
                    Open container tracking
                  </a>
                </div>
              </>
            ) : (
              <EmptyState message="No container selected." />
            )}
          </article>

          <article className="customer-section customer-dashboard-card">
            <div className="customer-section-head">
              <div>
                <div className="customer-portal-kicker">Quotes & approvals</div>
                <h2>Quotes & Approvals</h2>
              </div>
            </div>
            <div className="customer-status-list">
              <StatusRow label="Open quotes" value={String(customerQuotes.length)} />
              <StatusRow label="Awaiting approval" value={String(customerQuotes.filter((quote) => safeLower(quote.approvalStatus || quote.quoteStatus) !== 'accepted' && safeLower(quote.approvalStatus || quote.quoteStatus) !== 'rejected').length)} />
              <StatusRow label="Accepted quotes" value={String(customerQuotes.filter((quote) => safeLower(quote.approvalStatus || quote.quoteStatus) === 'accepted').length)} />
              <StatusRow label="Latest validity" value={customerQuotes[0] ? formatDate(customerQuotes[0].requestedArrivalWindow || customerQuotes[0].updatedAt) : 'No quote visible'} />
            </div>
            <div className="customer-module-actions">
              <a className="customer-portal-button" href={`${customerPortalBaseUrl}/bookings`} target="_blank" rel="noreferrer">Review quote</a>
              <button type="button" className="customer-portal-button subtle" onClick={() => customerQuotes[0] && approveQuote(customerQuotes[0].quoteId)} disabled={!customerQuotes[0] || safeLower(customerQuotes[0].approvalStatus) === 'accepted'}>Approve</button>
              <button type="button" className="customer-portal-button subtle" onClick={() => customerQuotes[0] && requestRevision(customerQuotes[0].quoteId)} disabled={!customerQuotes[0]}>Request revision</button>
            </div>
          </article>

          <article className="customer-section customer-dashboard-card">
            <div className="customer-section-head">
              <div>
                <div className="customer-portal-kicker">Support & communication</div>
                <h2>Support & Communication</h2>
              </div>
            </div>
            <div className="customer-status-list">
              <StatusRow label="Email" value="support@tikurabay.com" />
              <StatusRow label="Phone" value="+251 911 440 211" />
              <StatusRow label="Telegram" value="@tikurabay_support" />
              <StatusRow label="Latest support update" value={selectedShipment ? `${customerStatusLabel(selectedShipment.currentStatus)} for ${selectedShipment.shipmentRef}` : 'Support updates will appear here'} />
              <StatusRow label="After-sales" value={selectedAfterSales ? `${selectedAfterSales.status.replace(/_/g, ' ')} · ${selectedAfterSales.kind.replace(/_/g, ' ')}` : 'No open after-sales case'} />
            </div>
            <div className="customer-module-actions">
              <a className="customer-portal-button" href={`${customerPortalBaseUrl}/support`} target="_blank" rel="noreferrer">Contact support</a>
              <a className="customer-portal-button subtle" href={`${customerPortalBaseUrl}/support?mode=issue`} target="_blank" rel="noreferrer">Report issue</a>
              <a className="customer-portal-button subtle" href={`${customerPortalBaseUrl}/support?mode=update`} target="_blank" rel="noreferrer">Request update</a>
            </div>
          </article>
        </section>

        <section className="customer-section customer-process-section">
          <div className="customer-section-head">
            <div>
              <div className="customer-portal-kicker">Shipment workflow</div>
              <h2>{selectedShipment?.shipmentRef || 'Shipment workflow timeline'}</h2>
            </div>
            <span className={`status-badge ${toneClass(selectedShipment?.currentStatus)}`}>{selectedShipment ? customerStatusLabel(selectedShipment.currentStatus) : 'Pending'}</span>
          </div>
          {selectedShipment ? (
            <>
              <div className="customer-selected-summary">
                <InfoPill label="Route" value={`${safeText(selectedShipment.customerName, 'Customer')} -> ${safeText(selectedShipment.destinationNode, 'Destination')}`} />
                <InfoPill label="Workflow stage" value={customerStageLabel(selectedShipment.currentStage)} />
                <InfoPill label="Delivery update" value={customerStatusLabel(selectedShipment.currentStatus)} />
                <InfoPill label="Release update" value={customerReleaseLabel(selectedShipment.releaseReadiness)} />
              </div>
              <div className="customer-timeline">
                {timelineStages.map((stage) => (
                  <div key={stage.label} className={`customer-timeline-item ${stage.state}`}>
                    <span className="customer-timeline-dot" />
                    <div>
                      <strong>{stage.label}</strong>
                      <p>{stage.state === 'done' ? 'Completed' : stage.state === 'current' ? 'Current stage' : 'Upcoming'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState message="No shipment selected." />
          )}
        </section>

        <section className="customer-section customer-quote-review-section">
          <div className="customer-section-head">
            <div>
              <div className="customer-portal-kicker">Quote review</div>
              <h2>Quote Reviews / Pending Approvals</h2>
            </div>
            <span className="customer-section-meta">{filteredQuotes.length} visible</span>
          </div>
          {!filteredQuotes.length ? (
            <EmptyState message="No quotes waiting for your review." />
          ) : (
            <div className="customer-quote-list customer-quote-review-grid">
              {filteredQuotes.map((quote) => (
                <article key={quote.quoteId} className="customer-quote-card">
                  <div className="customer-quote-head">
                    <div>
                      <span className="customer-shipment-ref">{safeText(quote.quoteId, 'Quote')}</span>
                      <h3>{safeText(quote.customerName, portal.customerName)}</h3>
                    </div>
                    <span className={`status-badge ${toneClass(quote.approvalStatus || quote.quoteStatus)}`}>{safeText(quote.approvalStatus || quote.quoteStatus, 'draft')}</span>
                  </div>
                  <div className="customer-quote-grid">
                    <InfoPill label="Quote total" value={formatMoney(quote.quoteAmount, quote.quoteCurrency)} />
                    <InfoPill label="Valid until" value={formatDate(quote.requestedArrivalWindow || quote.updatedAt)} />
                    <InfoPill label="Route summary" value={`${safeText(quote.portOfLoading, 'Origin')} -> ${safeText(quote.portOfDischarge, 'Djibouti')} -> ${safeText(quote.inlandDestination, 'Destination')}`} />
                    <InfoPill label="Service summary" value={`${safeText(quote.serviceType, 'Service')} · ${safeText(quote.containerType, 'Container')} x ${String(quote.containerCount || 0)}`} />
                  </div>
                  <div className="customer-quote-actions">
                    <button type="button" className="customer-portal-button" disabled={safeLower(quote.approvalStatus) === 'accepted'} onClick={() => approveQuote(quote.quoteId)}>
                      {safeLower(quote.approvalStatus) === 'accepted' ? 'Approved' : 'Approve'}
                    </button>
                    <button type="button" className="customer-portal-button subtle" disabled={safeLower(quote.approvalStatus) === 'accepted' || safeLower(quote.approvalStatus) === 'rejected'} onClick={() => requestRevision(quote.quoteId)}>
                      Request revision
                    </button>
                    <button type="button" className="customer-portal-button subtle" disabled={safeLower(quote.approvalStatus) === 'accepted' || safeLower(quote.approvalStatus) === 'rejected'} onClick={() => rejectQuote(quote.quoteId)}>
                      Reject quote
                    </button>
                    <button type="button" className="customer-portal-button subtle" onClick={() => openQuoteReview(quote.quoteId)}>
                      Review quote
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="customer-bottom-grid">
          <article id="customer-documents" className="customer-section customer-dashboard-card">
            <div className="customer-section-head">
              <div>
                <div className="customer-portal-kicker">Documents</div>
                <h2>Available documents</h2>
              </div>
            </div>
            <div className="customer-doc-list">
              {customerDocuments.map((doc) => (
                <div key={doc.title} className="customer-doc-row">
                  <div>
                    <strong>{doc.title}</strong>
                    <p>Customer-facing document visibility</p>
                  </div>
                  <span className={`status-badge ${toneClass(doc.status)}`}>{doc.status}</span>
                </div>
              ))}
            </div>
          </article>

            <article className="customer-section customer-dashboard-card">
              <div className="customer-section-head">
                <div>
                  <div className="customer-portal-kicker">What to check next</div>
                  <h2>Next steps</h2>
              </div>
            </div>
              <div className="customer-doc-list">
                <div className="customer-doc-row">
                  <div>
                    <strong>Review quote before expiry</strong>
                    <p>Approve or request revision while the quote is still valid.</p>
                </div>
                <a className="customer-inline-link" href={`${customerPortalBaseUrl}/bookings`} target="_blank" rel="noreferrer">Open quotes</a>
              </div>
                <div className="customer-doc-row">
                  <div>
                    <strong>Confirm shipment receipt after delivery</strong>
                    <p>Receipt confirmation helps complete the final shipment workflow.</p>
                  </div>
                  <a className="customer-inline-link" href="#customer-dashboard">View shipment</a>
                </div>
                <div className="customer-doc-row">
                  <div>
                    <strong>Open container tracking if movement slows</strong>
                    <p>Use the container lifecycle page to check exact location and movement status.</p>
                  </div>
                  <a className="customer-inline-link" href={selectedShipment ? `/shipping/track?query=${encodeURIComponent(selectedShipment.container.containerNumber || selectedShipment.shipmentRef)}` : '#customer-dashboard'}>Open tracking</a>
                </div>
              </div>
            </article>

          <article className="customer-section customer-dashboard-card">
            <div className="customer-section-head">
              <div>
                <div className="customer-portal-kicker">After-sales</div>
                <h2>Post-delivery support</h2>
              </div>
            </div>
            <div className="customer-doc-list">
              <div className="customer-doc-row">
                <div>
                  <strong>{selectedAfterSales ? selectedAfterSales.summary : 'No active after-sales case'}</strong>
                  <p>{selectedAfterSales ? selectedAfterSales.nextAction : 'Delivery follow-up, complaints, and feedback will appear here after closure.'}</p>
                </div>
                <span className={`status-badge ${toneClass(selectedAfterSales?.status)}`}>{selectedAfterSales ? selectedAfterSales.status.replace(/_/g, ' ') : 'resolved'}</span>
              </div>
            </div>
          </article>

          <article className={`customer-ai-insight customer-dashboard-card tone-${aiInsight.tone}`}>
            <div className="customer-ai-insight-main">
              <div className="customer-ai-insight-kicker">AI Shipment Insight</div>
              <h2>{aiInsight.title}</h2>
              <p>{aiInsight.summary}</p>
            </div>
            <a className="customer-portal-button" href={aiInsight.href} target={aiInsight.href.startsWith('http') ? '_blank' : undefined} rel={aiInsight.href.startsWith('http') ? 'noreferrer' : undefined}>
              {aiInsight.actionLabel}
            </a>
          </article>
        </section>
      </div>
    </main>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="customer-info-pill">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="customer-status-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="customer-empty-state">
      <p>{message}</p>
    </div>
  );
}
