'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { memo, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { type OperationsAiBrief } from '../lib/operations-ai-assistant';
import { apiBase, apiGet, apiPost } from '../lib/api';
import { downloadTransitorBatchSheetPdf, downloadTransitorClearancePdf } from '../lib/shipping-pdf';
import {
  hydrateManualWorkflowStateFromServer,
  manualCorridorStorageUpdatedEvent,
  mergeDjiboutiReleaseRecords,
  readManualDjiboutiReleaseRecords,
  syncManualDispatchFromRelease,
  upsertManualDjiboutiReleaseRecord,
} from '../lib/manual-corridor-journey';
import { djiboutiReleaseRecords, type DjiboutiReleaseRecord } from '../lib/djibouti-release-demo-data';
import { transitorClearanceStorageKey, type TransitorClearanceRecord, type TransitorDeskStatus } from '../lib/transitor-clearance-demo-data';
import { writeWorkflowState } from '../lib/workflow-state-client';

const TransitorClearanceSupportColumn = dynamic(
  () => import('./transitor-clearance-support-column').then((module) => module.TransitorClearanceSupportColumn),
  {
    ssr: false,
    loading: () => (
      <div className="djibouti-empty-state">
        Loading clearance support panels...
      </div>
    ),
  },
);

type TransitorContactPreset = {
  key: string;
  name: string;
  company: string;
  phone: string;
  email: string;
};

const transitorContactPresets: TransitorContactPreset[] = [
  {
    key: 'abay-transit-services',
    name: 'Abebe Tesfaye',
    company: 'Abay Transit Services',
    phone: '+251911440011',
    email: 'write2get@gmail.com',
  },
  {
    key: 'horn-clearing-forwarding',
    name: 'Mekdes Wolde',
    company: 'Horn Clearing & Forwarding',
    phone: '+251911550022',
    email: 'write2get@gmail.com',
  },
  {
    key: 'redsea-transit-link',
    name: 'Samuel Hailu',
    company: 'RedSea Transit Link',
    phone: '+251911660033',
    email: 'write2get@gmail.com',
  },
] as const;

const defaultTransitorEmail = 'write2get@gmail.com';
const djiboutiRelevantStorageKeys = new Set([
  'tikur-abay:manual-corridor:djibouti-release',
  transitorClearanceStorageKey,
  'djibouti-release',
  'transitor-clearance',
]);
let cachedTransitorMergeSignature = '';
let cachedTransitorMergeResult: {
  releaseRecords: DjiboutiReleaseRecord[];
  records: TransitorClearanceRecord[];
} | null = null;

const transitorWorkflowDocuments = [
  'BL',
  'Invoice',
  'Packing list',
  'Transit/customs doc',
  'Release note',
  'Container + seal',
] as const;

const transitorBlockerPresets = [
  'Seal broken',
  'Seal number mismatch',
  'Physical seal number does not match document',
  'Container number mismatch',
  'BL data mismatch',
  'Invoice or packing list mismatch',
  'Transit document rejected',
  'Customs system offline',
  'Release note missing',
  'Charges receipt missing',
  'Inspection hold',
  'Driver not assigned',
] as const;

const clearanceWorkflowLabels: Record<string, string> = {
  waiting_for_documents: 'Waiting for documents',
  documents_ready: 'Documents ready',
  clearance_acknowledged: 'Clearance acknowledged',
  clearance_in_progress: 'Clearance in progress',
  clearance_completed: 'Clearance completed',
  blocked_missing_document: 'Blocked - missing document',
};

const clearanceDocumentLabels: Record<string, string> = {
  manifest: 'Manifest',
  bl: 'Bill of Lading',
  invoice: 'Invoice',
  packing_list: 'Packing List',
  release_note: 'Release Note',
  container_details: 'Container Details',
  customs: 'Customs Docs',
};

type CorridorListShipment = {
  shipmentRef: string;
  bookingNumber: string;
  customerName?: string;
  route?: string;
  currentStage?: string;
  clearance?: {
    documentsReadyForClearance?: boolean;
    clearanceWorkflowStatus?: string;
    documentsReadyAt?: string;
    clearanceMissingDocumentReason?: string;
  };
  container?: {
    containerNumber?: string;
  };
};

type CorridorDetailShipment = {
  shipmentRef: string;
  bookingNumber: string;
  customerName?: string;
  route?: { portOfLoading?: string; portOfDischarge?: string; inlandDestination?: string };
  ocean?: { billOfLadingNumber?: string };
  containers?: Array<{ containerNumber?: string; sealNumber?: string }>;
  readiness?: { missingItems?: string[]; missingFields?: string[]; blockedReasons?: string[] };
  clearance?: {
    documentsReadyForClearance?: boolean;
    documentsReadyAt?: string;
    documentsReadyMarkedBy?: string;
    clearanceWorkflowStatus?: string;
    clearanceAcknowledgedAt?: string;
    clearanceAcknowledgedBy?: string;
    clearanceStartedAt?: string;
    clearanceStartedBy?: string;
    clearanceCompletedAt?: string;
    clearanceMissingDocumentReason?: string;
    clearanceMissingDocumentRequestedAt?: string;
    clearanceMissingDocumentRequestedBy?: string;
  };
  documentHub?: {
    groups?: Array<{
      tag: string;
      latest?: {
        shipmentDocumentId?: string;
        fileName?: string;
        status?: string;
        issuedBy?: string;
        uploadedAt?: string;
      };
    }>;
  };
};

function workflowLabel(value?: string) {
  return clearanceWorkflowLabels[String(value || 'waiting_for_documents')] || String(value || 'waiting_for_documents').replace(/_/g, ' ');
}

function nextStepClass(isActive: boolean) {
  return isActive ? 'supplier-next-step-button' : '';
}

function activeStepPanelClass(isActive: boolean) {
  return isActive ? 'operations-step-active' : '';
}

function readStoredRecords() {
  if (typeof window === 'undefined') return [] as TransitorClearanceRecord[];
  const raw = window.localStorage.getItem(transitorClearanceStorageKey);
  if (!raw) return [] as TransitorClearanceRecord[];
  try {
    const parsed = JSON.parse(raw) as TransitorClearanceRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [] as TransitorClearanceRecord[];
  }
}

function writeStoredRecords(records: TransitorClearanceRecord[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(transitorClearanceStorageKey, JSON.stringify(records));
  void writeWorkflowState('transitor-clearance', records).catch(() => {});
}

function statusTone(status: TransitorDeskStatus) {
  if (status === 'clearance_ready' || status === 'charges_paid' || status === 't1_prepared') return 'good';
  if (status === 'charges_pending') return 'critical';
  return 'warning';
}

function formatDeskDate(value?: string) {
  if (!value) return 'Pending';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function deriveTransitorLocation(record: TransitorClearanceRecord, linkedRelease: DjiboutiReleaseRecord | null) {
  if (record.transportClearanceReady) return 'Released to dispatch desk';
  if (record.transitDocumentStatus === 'prepared' && record.chargesPaymentStatus !== 'paid') return 'Finance / customs counter';
  if (record.transitDocumentStatus === 'draft') return 'Transitor desk preparing T1 packet';
  if (linkedRelease?.currentStage) return `Djibouti release: ${linkedRelease.currentStage}`;
  return 'Awaiting transitor assignment';
}

function deriveDocumentProgress(record: TransitorClearanceRecord, linkedRelease: DjiboutiReleaseRecord | null) {
  const packetItems = linkedRelease?.handoff.packetItems ?? [];
  const completed = transitorWorkflowDocuments.filter((label) => {
    if (label === 'Transit/customs doc') return record.transitDocumentStatus === 'prepared' || record.transitDocumentStatus === 'approved';
    if (label === 'Release note') return packetItems.find((item) => item.label === label)?.complete ?? linkedRelease?.releaseNoteUploaded ?? false;
    return packetItems.find((item) => item.label === label)?.complete ?? false;
  });
  const remaining = transitorWorkflowDocuments.filter((label) => !completed.includes(label));
  return { completed, remaining };
}

function deriveClearanceSla(record: TransitorClearanceRecord) {
  const startValue = record.transitorAssignedAt || '';
  const start = new Date(startValue);
  if (Number.isNaN(start.getTime())) {
    return { dueAt: '', remainingHours: null as number | null, breached: false, label: 'SLA starts when transitor is assigned' };
  }
  const dueAt = new Date(start.getTime() + 72 * 60 * 60 * 1000);
  const remainingHours = Math.round((dueAt.getTime() - Date.now()) / (60 * 60 * 1000));
  return {
    dueAt: dueAt.toISOString(),
    remainingHours,
    breached: remainingHours < 0,
    label: remainingHours >= 0 ? `${remainingHours}h left after transitor assignment` : `${Math.abs(remainingHours)}h overdue`,
  };
}

function renderBlockerSummary(record: TransitorClearanceRecord) {
  if (!record.blockerType) return 'No blocker submitted yet';
  if (!record.blockerNote) return record.blockerType;
  return `${record.blockerType} · ${record.blockerNote}`;
}

function isT1Ready(status: TransitorClearanceRecord['transitDocumentStatus']) {
  return ['prepared', 'approved'].includes(status);
}

function deriveRecord(release: DjiboutiReleaseRecord): TransitorClearanceRecord {
  return {
    id: `transitor-${release.id}`,
    releaseRecordId: release.id,
    bookingNumber: release.bookingNumber,
    blNumber: release.blNumber,
    containerNumber: release.containerNumber,
    customerName: release.customerName,
    inlandDestination: release.handoff.inlandDestination,
    transitorAssignedTo: 'Pending transitor owner',
    transitorCompany: '',
    transitorPhone: '',
    transitorEmail: defaultTransitorEmail,
    transitorClearanceNote: '',
    transitorAssignedAt: '',
    transitDocumentRef: release.customsTransit.transitNumber || 'Pending T1',
    transitDocumentStatus: release.customsTransit.transitPacketComplete ? 'prepared' : 'draft',
    chargesPaymentStatus: 'pending',
    clearancePacketStatus: release.handoff.handoffPacketComplete ? 'review_pending' : 'incomplete',
    transportClearanceReady: false,
    clearanceCompletedAt: '',
    multimodalReceivedAt: release.lastUpdated,
    storageRisk: release.storageRisk,
    status: 'transitor_assigned',
    issues: ['Multimodal handoff received. Transitor must prepare T1, pay required charges, and complete transport packet before dispatch.'],
  };
}

function mergeRecords(releaseRecords: DjiboutiReleaseRecord[], storedRecords: TransitorClearanceRecord[]) {
  const eligible = releaseRecords.filter((record) => record.inlandHandoffSent || record.currentStage === 'Waiting inland handoff');
  const derived = eligible.map(deriveRecord);
  const merged = [...storedRecords];
  derived.forEach((record) => {
    const index = merged.findIndex((item) => item.id === record.id);
    if (index === -1) {
      merged.unshift(record);
    }
  });
  return merged.sort((left, right) => {
    const leftKey = String(left.bookingNumber || '').replace(/\D/g, '');
    const rightKey = String(right.bookingNumber || '').replace(/\D/g, '');
    if (leftKey.length !== rightKey.length) return rightKey.length - leftKey.length;
    return rightKey.localeCompare(leftKey);
  });
}

function buildMergedTransitorState() {
  const releaseRecords = mergeDjiboutiReleaseRecords([]);
  const storedRecords = readStoredRecords();
  const signature = JSON.stringify([
    releaseRecords.map((record) => [record.id, record.bookingNumber, record.currentStage, record.lastUpdated, record.inlandHandoffSent]),
    storedRecords.map((record) => [record.id, record.bookingNumber, record.status, record.transitDocumentStatus, record.chargesPaymentStatus, record.transportClearanceReady]),
  ]);
  if (cachedTransitorMergeSignature === signature && cachedTransitorMergeResult) {
    return cachedTransitorMergeResult;
  }
  const next = {
    releaseRecords,
    records: mergeRecords(releaseRecords, storedRecords),
  };
  cachedTransitorMergeSignature = signature;
  cachedTransitorMergeResult = next;
  return next;
}

export const TransitorClearanceDeskRuntime = memo(function TransitorClearanceDeskRuntime() {
  const searchParams = useSearchParams();
  const headerQuery = searchParams.get('query') || searchParams.get('q') || '';
  const [supportReady, setSupportReady] = useState(false);
  const [records, setRecords] = useState<TransitorClearanceRecord[]>([]);
  const [releaseRecords, setReleaseRecords] = useState<DjiboutiReleaseRecord[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState(headerQuery);
  const deferredSearch = useDeferredValue(search);
  const [transitorDraft, setTransitorDraft] = useState({ name: '', company: '', phone: '', email: '', note: '' });
  const [blockerDraft, setBlockerDraft] = useState({ type: '', note: '' });
  const [systemQueue, setSystemQueue] = useState<CorridorListShipment[]>([]);
  const [systemQueueLoading, setSystemQueueLoading] = useState(false);
  const [systemQueueError, setSystemQueueError] = useState('');
  const [selectedSystemRef, setSelectedSystemRef] = useState('');
  const [systemDetail, setSystemDetail] = useState<CorridorDetailShipment | null>(null);
  const [systemDetailLoading, setSystemDetailLoading] = useState(false);
  const [systemDetailError, setSystemDetailError] = useState('');
  const [systemAuditLog, setSystemAuditLog] = useState<Array<Record<string, any>>>([]);
  const [systemActionNote, setSystemActionNote] = useState('');
  const [systemActionMessage, setSystemActionMessage] = useState('');
  const lastMergedSignatureRef = useRef('');

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const enableSupport = () => {
      if (!cancelled) {
        setSupportReady(true);
      }
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(enableSupport, { timeout: 250 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(idleId);
        if (timeoutId) clearTimeout(timeoutId);
      };
    }

    timeoutId = setTimeout(enableSupport, 80);
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    const mergedState = buildMergedTransitorState();
    const signature = JSON.stringify(mergedState.records.map((record) => [record.id, record.status, record.transitDocumentStatus, record.chargesPaymentStatus, record.transportClearanceReady]));
    lastMergedSignatureRef.current = signature;
    setReleaseRecords(mergedState.releaseRecords);
    setRecords(mergedState.records);
    setSelectedId(mergedState.records[0]?.id ?? '');
    void hydrateManualWorkflowStateFromServer().then(() => {
      const hydratedState = buildMergedTransitorState();
      const hydratedSignature = JSON.stringify(hydratedState.records.map((record) => [record.id, record.status, record.transitDocumentStatus, record.chargesPaymentStatus, record.transportClearanceReady]));
      lastMergedSignatureRef.current = hydratedSignature;
      setReleaseRecords(hydratedState.releaseRecords);
      setRecords(hydratedState.records);
      setSelectedId(hydratedState.records[0]?.id ?? '');
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reload = (event?: Event) => {
      if (event instanceof StorageEvent && event.key && !djiboutiRelevantStorageKeys.has(event.key)) {
        return;
      }
      if (event && 'detail' in event && event.detail && typeof event.detail === 'object') {
        const detail = event.detail as { key?: string; bookingNumber?: string };
        if (detail.key && !djiboutiRelevantStorageKeys.has(detail.key)) {
          return;
        }
      }
      const mergedState = buildMergedTransitorState();
      const signature = JSON.stringify(mergedState.records.map((record) => [record.id, record.status, record.transitDocumentStatus, record.chargesPaymentStatus, record.transportClearanceReady]));
      if (lastMergedSignatureRef.current === signature) {
        return;
      }
      lastMergedSignatureRef.current = signature;
      setReleaseRecords(mergedState.releaseRecords);
      setRecords(mergedState.records);
      const bookingNumber =
        event && 'detail' in event && event.detail && typeof event.detail === 'object' && 'bookingNumber' in event.detail
          ? String((event.detail as { bookingNumber?: string }).bookingNumber || '')
          : '';
      if (bookingNumber) {
        const matched = mergedState.records.find((item) => item.bookingNumber === bookingNumber);
        if (matched) {
          setSelectedId(matched.id);
        }
      }
    };
    window.addEventListener('storage', reload);
    window.addEventListener(manualCorridorStorageUpdatedEvent, reload as EventListener);
    return () => {
      window.removeEventListener('storage', reload);
      window.removeEventListener(manualCorridorStorageUpdatedEvent, reload as EventListener);
    };
  }, []);


  useEffect(() => {
    const booking = searchParams.get('booking');
    if (!booking) return;
    const matched = records.find((item) => item.bookingNumber === booking);
    if (matched) setSelectedId(matched.id);
  }, [records, searchParams]);

  useEffect(() => {
    setSearch(headerQuery);
  }, [headerQuery]);

  useEffect(() => {
    let cancelled = false;
    setSystemQueueLoading(true);
    setSystemQueueError('');
    apiGet<CorridorListShipment[]>('/corridor/shipments?readyForClearance=true&currentStage=transitor_clearance')
      .then((payload) => {
        if (cancelled) return;
        setSystemQueue(Array.isArray(payload) ? payload : []);
        const requestedBooking = searchParams.get('booking') || '';
        const preferred = (Array.isArray(payload) ? payload : []).find((item) => item.bookingNumber === requestedBooking || item.shipmentRef === requestedBooking);
        setSelectedSystemRef(preferred?.shipmentRef || payload?.[0]?.shipmentRef || '');
      })
      .catch((error) => {
        if (cancelled) return;
        setSystemQueue([]);
        setSelectedSystemRef('');
        setSystemQueueError(error instanceof Error ? error.message : 'Unable to load ready-for-clearance queue');
      })
      .finally(() => {
        if (!cancelled) setSystemQueueLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  useEffect(() => {
    if (!selectedSystemRef) {
      setSystemDetail(null);
      setSystemAuditLog([]);
      return;
    }
    let cancelled = false;
    setSystemDetailLoading(true);
    setSystemDetailError('');
    Promise.all([
      apiGet<CorridorDetailShipment>(`/corridor/shipments/${encodeURIComponent(selectedSystemRef)}`),
      apiGet<Array<Record<string, any>>>(`/corridor/shipments/${encodeURIComponent(selectedSystemRef)}/document-access-log`),
    ])
      .then(([detail, auditLog]) => {
        if (cancelled) return;
        setSystemDetail(detail);
        setSystemAuditLog(Array.isArray(auditLog) ? auditLog : []);
      })
      .catch((error) => {
        if (cancelled) return;
        setSystemDetail(null);
        setSystemAuditLog([]);
        setSystemDetailError(error instanceof Error ? error.message : 'Unable to load live clearance shipment');
      })
      .finally(() => {
        if (!cancelled) setSystemDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSystemRef]);

  function persist(next: TransitorClearanceRecord[]) {
    setRecords(next);
    writeStoredRecords(next);
  }

  async function refreshSystemShipment(shipmentRef: string) {
    const [detail, auditLog, queue] = await Promise.all([
      apiGet<CorridorDetailShipment>(`/corridor/shipments/${encodeURIComponent(shipmentRef)}`),
      apiGet<Array<Record<string, any>>>(`/corridor/shipments/${encodeURIComponent(shipmentRef)}/document-access-log`),
      apiGet<CorridorListShipment[]>('/corridor/shipments?readyForClearance=true&currentStage=transitor_clearance'),
    ]);
    setSystemDetail(detail);
    setSystemAuditLog(Array.isArray(auditLog) ? auditLog : []);
    setSystemQueue(Array.isArray(queue) ? queue : []);
    const stillPresent = (Array.isArray(queue) ? queue : []).find((item) => item.shipmentRef === shipmentRef);
    if (!stillPresent) {
      setSelectedSystemRef(queue?.[0]?.shipmentRef || shipmentRef);
    }
  }

  async function runSystemAction(pathSuffix: string, body: Record<string, unknown>) {
    if (!selectedSystemRef) return;
    setSystemActionMessage('');
    try {
      const response = await apiPost<{ message?: string }>(
        `/corridor/shipments/${encodeURIComponent(selectedSystemRef)}${pathSuffix}`,
        body,
      );
      await refreshSystemShipment(selectedSystemRef);
      setSystemActionMessage(response.message || 'Clearance action saved.');
    } catch (error) {
      setSystemActionMessage(error instanceof Error ? error.message : 'Unable to save clearance action');
    }
  }

  async function downloadSystemPack() {
    if (!selectedSystemRef) return;
    setSystemActionMessage('');
    try {
      const response = await apiPost<{ downloadUrl?: string; fileName?: string }>(
        `/corridor/shipments/${encodeURIComponent(selectedSystemRef)}/clearance-pack`,
        {},
      );
      if (response.downloadUrl && typeof window !== 'undefined') {
        window.open(response.downloadUrl, '_blank', 'noopener,noreferrer');
      }
      await refreshSystemShipment(selectedSystemRef);
      setSystemActionMessage(response.fileName ? `Generated ${response.fileName}` : 'Clearance pack generated.');
    } catch (error) {
      setSystemActionMessage(error instanceof Error ? error.message : 'Unable to generate clearance pack');
    }
  }

  async function openSystemDocument(shipmentDocumentId?: string) {
    if (!shipmentDocumentId || typeof window === 'undefined' || !selectedSystemRef) return;
    try {
      await apiPost(
        `/corridor/shipments/${encodeURIComponent(selectedSystemRef)}/documents/${encodeURIComponent(shipmentDocumentId)}/access-log`,
        { action: 'download', note: 'Downloaded from clearance document center' },
      );
    } catch {
      // best effort audit write
    }
    window.open(`${apiBase}/documents/${encodeURIComponent(shipmentDocumentId)}/download/resolve`, '_blank', 'noopener,noreferrer');
  }

  const filtered = useMemo(() => records.filter((record) => {
    return [
      record.bookingNumber,
      record.blNumber,
      record.containerNumber,
      record.customerName,
      record.transitorAssignedTo,
    ].join(' ').toLowerCase().includes(deferredSearch.trim().toLowerCase());
  }), [deferredSearch, records]);

  const selected = filtered.find((item) => item.id === selectedId) ?? records.find((item) => item.id === selectedId) ?? filtered[0] ?? records[0] ?? null;
  useEffect(() => {
    if (!selected || !systemQueue.length) return;
    const matched = systemQueue.find((item) => item.bookingNumber === selected.bookingNumber);
    if (matched && matched.shipmentRef !== selectedSystemRef) {
      setSelectedSystemRef(matched.shipmentRef);
    }
  }, [selected, selectedSystemRef, systemQueue]);
  useEffect(() => {
    setSelectedId((current) => {
      if (!records.length) return '';
      if (records.some((record) => record.id === current)) return current;
      return filtered[0]?.id ?? records[0]?.id ?? '';
    });
  }, [filtered, records]);
  useEffect(() => {
    if (!selected) return;
    setTransitorDraft({
      name: selected.transitorAssignedTo === 'Pending transitor owner' ? '' : selected.transitorAssignedTo,
      company: selected.transitorCompany || '',
      phone: selected.transitorPhone || '',
      email: selected.transitorEmail || defaultTransitorEmail,
      note: selected.transitorClearanceNote || '',
    });
    setBlockerDraft({
      type: selected.blockerType || '',
      note: selected.blockerNote || '',
    });
  }, [selected?.id]);
  const selectedTransitorPresetKey = useMemo(() => {
    const match = transitorContactPresets.find((preset) => preset.name === transitorDraft.name);
    return match?.key || '';
  }, [transitorDraft.name]);
  const linkedRelease = selected ? releaseRecords.find((item) => item.id === selected.releaseRecordId) ?? readManualDjiboutiReleaseRecords().find((item) => item.id === selected.releaseRecordId) ?? null : null;
  const transitorLocation = selected ? deriveTransitorLocation(selected, linkedRelease) : 'Pending';
  const documentProgress = selected ? deriveDocumentProgress(selected, linkedRelease) : { completed: [], remaining: [] };
  const clearanceSla = selected ? deriveClearanceSla(selected) : { dueAt: '', remainingHours: null, breached: false, label: 'SLA unavailable' };
  const nextActionKey = !selected
    ? 'none'
    : selected.transitorAssignedTo === 'Pending transitor owner'
      ? 'assign-transitor'
      : !isT1Ready(selected.transitDocumentStatus)
        ? 'prepare-t1'
        : selected.chargesPaymentStatus !== 'paid'
          ? 'mark-charges-paid'
          : !selected.transportClearanceReady
            ? 'release-to-dispatch'
            : 'done';
  const nextActionTitle =
    nextActionKey === 'assign-transitor'
      ? 'Assign transitor'
      : nextActionKey === 'prepare-t1'
        ? 'Prepare T1'
        : nextActionKey === 'mark-charges-paid'
          ? 'Mark charges paid'
          : nextActionKey === 'release-to-dispatch'
            ? 'Release to dispatch'
            : 'Clearance complete';
  const nextActionHelper =
    nextActionKey === 'assign-transitor'
      ? 'Set the named clearance owner first.'
      : nextActionKey === 'prepare-t1'
        ? 'Prepare the T1 transit document before dispatch can be considered.'
        : nextActionKey === 'mark-charges-paid'
          ? 'Required charges must be cleared before transport clearance can open.'
          : nextActionKey === 'release-to-dispatch'
            ? 'Driver pack is ready. Release this file to dispatch now.'
            : 'Driver pack is ready and this clearance file is complete for downstream dispatch use.';
  const aiBrief: OperationsAiBrief = {
    title: 'AI Clearance Copilot',
    summary: 'Clearance is monitoring transitor ownership, T1 readiness, missing documents, the 3-day SLA, and the release gate to dispatch.',
    nextAction: nextActionTitle,
    blockers: [
      selected?.transitorAssignedTo === 'Pending transitor owner' ? 'A named transitor owner is still missing.' : '',
      selected?.transitDocumentStatus !== 'prepared' ? 'The T1 transit document is not prepared yet.' : '',
      selected?.chargesPaymentStatus !== 'paid' ? 'Required clearance charges are still unpaid.' : '',
      documentProgress.remaining.length ? `Remaining documents: ${documentProgress.remaining.join(', ')}.` : '',
      clearanceSla.breached ? (selected?.blockerSubmittedAt ? `Clearance breached the 3-day SLA. Blocker submitted: ${renderBlockerSummary(selected)}.` : 'Clearance breached the 3-day SLA and a blocker must be submitted now.') : '',
      selected?.transportClearanceReady ? '' : 'Dispatch remains blocked until transport clearance is released.',
    ].filter(Boolean),
    validations: [
      !selected?.bookingNumber ? 'Booking number is missing from the clearance file.' : '',
      !selected?.containerNumber ? 'Container number is missing from the clearance file.' : '',
      selected?.transitDocumentRef === 'Pending T1' ? 'Transit document reference still needs a real T1 number.' : '',
    ].filter(Boolean),
    risks: [
      { label: `Storage risk is ${selected?.storageRisk || 'Safe'}.`, tone: selected?.storageRisk === 'Urgent' ? 'urgent' : selected?.storageRisk === 'Approaching' ? 'watch' : 'info' },
    ],
    draftMessage: `Clearance file ${selected?.bookingNumber || ''} is waiting on ${nextActionTitle.toLowerCase()}.`,
    secureMode: 'AI is advisory only. T1, charge release, and dispatch release still require desk approval.',
  };
  const systemDocumentGroups = systemDetail?.documentHub?.groups ?? [];
  const systemMissingTags = new Set((systemDetail?.readiness?.missingItems ?? []).map((item) => String(item).toLowerCase()));
  const systemMissingFields = systemDetail?.readiness?.missingFields ?? [];
  const systemBlockedReasons = systemDetail?.readiness?.blockedReasons ?? [];

  function updateSelected(updater: (record: TransitorClearanceRecord) => TransitorClearanceRecord) {
    if (!selected) return;
    const next = records.map((record) => record.id === selected.id ? updater(record) : record);
    persist(next);
  }

  const transitorAssignmentReady = Boolean(transitorDraft.name.trim() && transitorDraft.company.trim() && transitorDraft.phone.trim());
  const transitorAlreadyAssigned = Boolean(selected && selected.transitorAssignedTo !== 'Pending transitor owner');
  const transitorDraftChanged = Boolean(selected) && (
    transitorDraft.name.trim() !== (selected?.transitorAssignedTo === 'Pending transitor owner' ? '' : selected?.transitorAssignedTo || '') ||
    transitorDraft.company.trim() !== (selected?.transitorCompany || '') ||
    transitorDraft.phone.trim() !== (selected?.transitorPhone || '') ||
    transitorDraft.email.trim() !== (selected?.transitorEmail || '') ||
    transitorDraft.note.trim() !== (selected?.transitorClearanceNote || '')
  );
  const workflowLocked = Boolean(selected?.transportClearanceReady);
  const canAssignTransitor = Boolean(
    selected &&
    !workflowLocked &&
    transitorAssignmentReady &&
    (!transitorAlreadyAssigned || transitorDraftChanged),
  );
  const canPrepareT1 = Boolean(selected && !workflowLocked && !isT1Ready(selected.transitDocumentStatus));
  const canMarkChargesPaid = Boolean(selected && !workflowLocked && selected.chargesPaymentStatus !== 'paid');
  const canReleaseToDispatch = Boolean(
    selected &&
    !workflowLocked &&
    isT1Ready(selected.transitDocumentStatus) &&
    selected.chargesPaymentStatus === 'paid' &&
    (!clearanceSla.breached || Boolean(selected.blockerType && (selected.blockerNote ?? '').trim()))
  );

  async function assignTransitor() {
    if (!canAssignTransitor) return;
    if (!selected) return;
    const now = new Date().toISOString();
    const assignedEmail = transitorDraft.email.trim() || defaultTransitorEmail;
    setSystemActionMessage('');
    const nextRecord = {
      ...selected,
      transitorAssignedTo: transitorDraft.name.trim(),
      transitorCompany: transitorDraft.company.trim(),
      transitorPhone: transitorDraft.phone.trim(),
      transitorEmail: assignedEmail,
      transitorClearanceNote: transitorDraft.note.trim(),
      transitorAssignedAt: selected.transitorAssignedAt || now,
      status: 'transitor_assigned' as const,
      issues: selected.issues.filter((item) => !item.includes('Pending transitor owner')),
    };
    const assignmentDetails = [
      `Booking Number: ${nextRecord.bookingNumber}`,
      `Customer: ${nextRecord.customerName}`,
      `BL Number: ${nextRecord.blNumber}`,
      `Container Number: ${nextRecord.containerNumber || 'Pending'}`,
      `Destination: ${nextRecord.inlandDestination}`,
      `Assigned Transitor: ${nextRecord.transitorAssignedTo}`,
      `Transitor Company: ${nextRecord.transitorCompany}`,
      `Transitor Phone: ${nextRecord.transitorPhone}`,
      `Transitor Email: ${nextRecord.transitorEmail}`,
      `Transit Document Ref: ${nextRecord.transitDocumentRef}`,
      `Transit Document Status: ${nextRecord.transitDocumentStatus}`,
      `Charges Payment Status: ${nextRecord.chargesPaymentStatus}`,
      `Clearance Packet Status: ${nextRecord.clearancePacketStatus}`,
      `Storage Risk: ${nextRecord.storageRisk}`,
      `Multimodal Received At: ${nextRecord.multimodalReceivedAt || 'Pending'}`,
      `Assigned At: ${nextRecord.transitorAssignedAt}`,
      `Release Stage: ${linkedRelease?.currentStage || 'Pending'}`,
      `Vessel / Voyage: ${linkedRelease?.vesselName || 'Pending'} / ${linkedRelease?.voyageNumber || 'Pending'}`,
      `Discharge Port: ${linkedRelease?.dischargePort || 'Djibouti Port'}`,
      `Final Destination: ${linkedRelease?.finalDestination || nextRecord.inlandDestination}`,
      `Customs Transit Ref: ${linkedRelease?.customsTransit.transitNumber || 'Pending transit number'}`,
      `Gate Pass Status: ${linkedRelease?.storage.gatePassStatus || 'Pending'}`,
      `Blockers: ${linkedRelease?.releaseBlockers || 'No release blocker recorded.'}`,
      `Clearance Note: ${nextRecord.transitorClearanceNote || 'None'}`,
      `Open Issues: ${nextRecord.issues.length ? nextRecord.issues.join(' | ') : 'None'}`,
    ].join('\n');

    updateSelected(() => nextRecord);

    try {
      await apiPost('/communications/direct-send', {
        entityType: 'booking',
        entityId: nextRecord.bookingNumber,
        channels: ['email'],
        templateKey: 'custom_message',
        language: 'en',
        subject: `Transitor assigned for ${nextRecord.bookingNumber}`,
        messageBody: `Transitor assignment details\n\n${assignmentDetails}`,
        recipientName: nextRecord.transitorAssignedTo,
        recipientType: 'vendor',
        recipientOverrides: {
          email: assignedEmail,
        },
      });
      setSystemActionMessage(`Assignment email sent to ${assignedEmail}.`);
    } catch (error) {
      setSystemActionMessage(error instanceof Error ? error.message : 'Assignment saved, but the email could not be sent.');
    }
  }

  function applyTransitorPreset(presetKey: string) {
    const preset = transitorContactPresets.find((item) => item.key === presetKey);
    if (!preset) return;
    setTransitorDraft((current) => ({
      ...current,
      name: preset.name,
      company: preset.company,
      phone: preset.phone,
      email: preset.email,
    }));
  }

  function prepareT1() {
    if (!canPrepareT1) return;
    updateSelected((record) => ({
      ...record,
      transitDocumentStatus: 'prepared',
      status: record.chargesPaymentStatus === 'paid' ? 't1_prepared' : 'clearance_in_progress',
      transitDocumentRef: record.transitDocumentRef === 'Pending T1' ? `T1-${record.bookingNumber}` : record.transitDocumentRef,
    }));
  }

  function markChargesPaid() {
    if (!canMarkChargesPaid) return;
    updateSelected((record) => ({
      ...record,
      chargesPaymentStatus: 'paid',
      status: isT1Ready(record.transitDocumentStatus) ? 'charges_paid' : 'charges_pending',
    }));
  }

  function markClearanceReady() {
    if (!selected) return;
    const transportClearanceReady = isT1Ready(selected.transitDocumentStatus) && selected.chargesPaymentStatus === 'paid';
    const blockerReady = !clearanceSla.breached || Boolean(selected.blockerType && (selected.blockerNote ?? '').trim());
    if (!canReleaseToDispatch || !transportClearanceReady || !blockerReady) return;

    const now = new Date().toISOString();
    updateSelected((record) => ({
      ...record,
      status: 'clearance_ready',
      transportClearanceReady: true,
      clearancePacketStatus: 'complete',
      clearanceCompletedAt: now,
    }));

    if (!linkedRelease) return;

    const releaseUpdate: DjiboutiReleaseRecord = {
      ...linkedRelease,
      lastUpdated: now,
      handoff: {
        ...linkedRelease.handoff,
        tripCreationStatus: 'Released to transitor / clearance',
      },
    };

    upsertManualDjiboutiReleaseRecord(releaseUpdate);
    syncManualDispatchFromRelease(releaseUpdate);
  }

  function submitBlocker() {
    if (!selected || !blockerDraft.type || !blockerDraft.note.trim()) return;
    const submittedAt = new Date().toISOString();
    const blockerIssue = `Overdue blocker: ${blockerDraft.type}. ${blockerDraft.note.trim()}`;
    updateSelected((record) => ({
      ...record,
      blockerType: blockerDraft.type,
      blockerNote: blockerDraft.note.trim(),
      blockerSubmittedAt: submittedAt,
      issues: [blockerIssue, ...record.issues.filter((item) => !item.startsWith('Overdue blocker:'))],
    }));
  }

  const summaryCards = [
    { label: 'Awaiting transitor assignment', value: records.filter((item) => item.transitorAssignedTo === 'Pending transitor owner').length, helper: 'Multimodal files need named clearance ownership.' },
    { label: 'Charges pending', value: records.filter((item) => item.chargesPaymentStatus === 'pending').length, helper: 'Dispatch must stay blocked until required charges are cleared.' },
    { label: 'T1 prepared', value: records.filter((item) => item.transitDocumentStatus === 'prepared').length, helper: 'Transit document is ready for transport packet completion.' },
    { label: 'Ready for dispatch', value: records.filter((item) => item.transportClearanceReady).length, helper: 'Only these files can create a corridor trip.' },
  ];

  return (
    <main className="shell">
      <section className="djibouti-desk-shell transitor-clearance-shell">
        <header className="djibouti-desk-header">
          <div className="djibouti-desk-title">
            <span className="djibouti-desk-eyebrow">Step 4</span>
            <h1>Transitor / Clearance Desk</h1>
            <p>Prepare customs and transit clearance, complete T1 and charge controls, then unblock dispatch only when the transport packet is truly ready.</p>
          </div>
        </header>

        <section className="djibouti-summary-grid">
          {summaryCards.map((card) => (
            <article key={card.label} className="djibouti-summary-card">
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <p>{card.helper}</p>
            </article>
          ))}
        </section>

        <section className="djibouti-main-grid">
          <article className="djibouti-panel transitor-clearance-queue-panel">
            <header className="djibouti-panel-header">
              <div>
                <span className="djibouti-panel-eyebrow">Queue</span>
                <h2>Clearance files</h2>
              </div>
              <p>{filtered.length + ' desk files' + (systemQueueLoading ? ' · syncing live queue…' : systemQueue.length ? ' · ' + systemQueue.length + ' live files' : '')}</p>
            </header>
            {systemQueueError ? (
              <div className="shipping-phase-note is-blocked console-gap-bottom-md">
                <strong>Live clearance queue unavailable</strong>
                <p>{systemQueueError}</p>
              </div>
            ) : null}
            <div className="djibouti-queue-list" data-testid="transitor-clearance-queue">
              {filtered.map((record) => {
                const liveMatch = systemQueue.find((item) => item.bookingNumber === record.bookingNumber);
                const rowStatus = record.transportClearanceReady
                  ? 'Ready for dispatch'
                  : liveMatch?.clearance?.clearanceWorkflowStatus
                    ? workflowLabel(liveMatch.clearance.clearanceWorkflowStatus)
                    : record.transitorAssignedTo === 'Pending transitor owner'
                      ? 'Awaiting assignment'
                      : 'In clearance';
                return (
                  <button
                    key={record.id}
                    type="button"
                    className={record.id === selected?.id ? 'djibouti-queue-row active' : 'djibouti-queue-row'}
                    onClick={() => {
                      setSelectedId(record.id);
                      if (liveMatch?.shipmentRef) {
                        setSelectedSystemRef(liveMatch.shipmentRef);
                      }
                    }}
                    data-testid={`clearance-live-queue-row-${record.bookingNumber}`}
                  >
                    <div className="djibouti-queue-topline">
                      <strong>{record.bookingNumber}</strong>
                      <span className={`status-badge ${record.transportClearanceReady ? 'good' : record.transitorAssignedTo === 'Pending transitor owner' ? 'warning' : 'medium'}`}>{rowStatus}</span>
                    </div>
                    <span>{record.customerName}</span>
                    <span>{record.containerNumber || liveMatch?.container?.containerNumber || 'Container pending'}</span>
                    <div className="djibouti-queue-meta">
                      <span>{record.inlandDestination || liveMatch?.route || 'Transitor clearance'}</span>
                      <span className={`djibouti-chip ${(liveMatch?.clearance?.documentsReadyForClearance || record.status !== 'transitor_assigned') ? 'djibouti-chip-ready' : 'djibouti-chip-medium'}`}>
                        {(liveMatch?.clearance?.documentsReadyForClearance || record.status !== 'transitor_assigned') ? 'Visible to clearance' : 'Waiting handoff sync'}
                      </span>
                    </div>
                  </button>
                );
              })}
              {!filtered.length ? (
                <div className="djibouti-empty-state">No clearance files are in the desk queue yet. Push the Djibouti release handoff first.</div>
              ) : null}
            </div>
            <div className="shipping-phase-note console-gap-top-md">
              <strong>System-only clearance rule</strong>
              <p>The desk queue keeps the handoff file visible immediately. The live document center still remains the operating source for official clearance actions.</p>
            </div>
          </article>

          {selected ? (
            <div className="djibouti-workspace">
              <div className="djibouti-primary-column">
                <article className="djibouti-panel">
                  <header className="djibouti-panel-header">
                    <div>
                      <span className="djibouti-panel-eyebrow">System document center</span>
                      <h2>{systemDetail?.bookingNumber || 'Ready-for-clearance shipment'}</h2>
                    </div>
                    <p>{systemDetailLoading ? 'Loading live detail…' : workflowLabel(systemDetail?.clearance?.clearanceWorkflowStatus)}</p>
                  </header>
                  {systemDetailError ? (
                    <div className="shipping-phase-note is-blocked console-gap-bottom-md">
                      <strong>Unable to load live clearance file</strong>
                      <p>{systemDetailError}</p>
                    </div>
                  ) : null}
                  <div className="djibouti-detail-summary console-gap-bottom-md">
                    <div className="djibouti-detail-item"><span>Booking</span><strong>{systemDetail?.bookingNumber || 'Pending'}</strong></div>
                    <div className="djibouti-detail-item"><span>Customer</span><strong>{systemDetail?.customerName || 'Pending'}</strong></div>
                    <div className="djibouti-detail-item"><span>BL</span><strong>{systemDetail?.ocean?.billOfLadingNumber || 'Pending'}</strong></div>
                    <div className="djibouti-detail-item"><span>Container</span><strong>{systemDetail?.containers?.[0]?.containerNumber || 'Pending'}</strong></div>
                    <div className="djibouti-detail-item"><span>Documents ready</span><strong>{systemDetail?.clearance?.documentsReadyForClearance ? 'Yes' : 'No'}</strong></div>
                    <div className="djibouti-detail-item"><span>Ready at</span><strong>{formatDeskDate(systemDetail?.clearance?.documentsReadyAt)}</strong></div>
                    <div className="djibouti-detail-item"><span>Acknowledged</span><strong>{formatDeskDate(systemDetail?.clearance?.clearanceAcknowledgedAt)}</strong></div>
                    <div className="djibouti-detail-item"><span>Started</span><strong>{formatDeskDate(systemDetail?.clearance?.clearanceStartedAt)}</strong></div>
                    <div className="djibouti-detail-item"><span>Completed</span><strong>{formatDeskDate(systemDetail?.clearance?.clearanceCompletedAt)}</strong></div>
                  </div>
                  <div className="djibouti-checklist console-gap-bottom-md">
                    {Object.entries(clearanceDocumentLabels).map(([tag, label]) => {
                      const group = systemDocumentGroups.find((item) => item.tag === tag);
                      const latest = group?.latest;
                      const ready = Boolean(latest) && ['verified', 'locked'].includes(String(latest?.status || '').toLowerCase());
                      const className = ready ? 'djibouti-check-item is-complete' : systemMissingTags.has(tag) ? 'djibouti-check-item is-blocked' : 'djibouti-check-item is-pending';
                      return (
                        <div key={tag} className={className}>
                          <span>{label}</span>
                          <strong>{ready ? latest?.fileName || 'Verified' : latest?.status ? String(latest.status).replace(/_/g, ' ') : 'Missing'}</strong>
                        </div>
                      );
                    })}
                  </div>
                  {!!systemBlockedReasons.length && (
                    <div className="corridor-panel-rows console-gap-bottom-md">
                      {systemBlockedReasons.map((reason) => (
                        <div key={reason} className="corridor-row corridor-row-warning">
                          <span>Blocked reason</span>
                          <strong>{reason}</strong>
                        </div>
                      ))}
                      {systemMissingFields.map((field) => (
                        <div key={field} className="corridor-row corridor-row-warning">
                          <span>Missing field</span>
                          <strong>{field}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="djibouti-inline-actions console-wrap-actions console-gap-bottom-md">
                    {systemDocumentGroups.map((group) => (
                      <button
                        key={group.tag}
                        type="button"
                        className="djibouti-desk-button djibouti-desk-button-secondary"
                        disabled={!group.latest?.shipmentDocumentId}
                        onClick={() => openSystemDocument(group.latest?.shipmentDocumentId)}
                      >
                        Open {clearanceDocumentLabels[group.tag] || group.tag}
                      </button>
                    ))}
                    <button type="button" className="djibouti-desk-button djibouti-desk-button-secondary console-download-button" onClick={downloadSystemPack} disabled={!selectedSystemRef}>
                      Download ZIP
                    </button>
                  </div>
                  <div className="supplier-control-grid console-gap-bottom-md">
                    <label className="supplier-field-block console-grid-span-full">
                      <span>Clearance action note</span>
                      <textarea
                        className="supplier-desk-input"
                        rows={3}
                        value={systemActionNote}
                        onChange={(event) => setSystemActionNote(event.target.value)}
                        placeholder="Add acknowledgement, missing document request, or completion note."
                      />
                    </label>
                  </div>
                  <div className="djibouti-inline-actions console-wrap-actions">
                    <button type="button" className="djibouti-desk-button djibouti-desk-button-secondary" disabled={!selectedSystemRef} onClick={() => runSystemAction('/clearance/acknowledge', { note: systemActionNote.trim() })}>
                      Acknowledge receipt
                    </button>
                    <button type="button" className="djibouti-desk-button djibouti-desk-button-secondary" disabled={!selectedSystemRef || !systemActionNote.trim()} onClick={() => runSystemAction('/clearance/request-missing-docs', { reason: systemActionNote.trim(), note: systemActionNote.trim(), notifyDjibouti: true })}>
                      Request missing docs
                    </button>
                    <button type="button" className="djibouti-desk-button djibouti-desk-button-secondary" disabled={!selectedSystemRef} onClick={() => runSystemAction('/clearance/start', { note: systemActionNote.trim() })}>
                      Start clearance
                    </button>
                    <button type="button" className="djibouti-desk-button djibouti-desk-button-primary" disabled={!selectedSystemRef} onClick={() => runSystemAction('/clearance/complete', { note: systemActionNote.trim() })}>
                      Complete clearance
                    </button>
                  </div>
                  {systemActionMessage ? <p className="console-message">{systemActionMessage}</p> : null}
                </article>

                <article className={`djibouti-panel ${activeStepPanelClass(nextActionKey !== 'done')}`} data-testid="transitor-clearance-selected-shipment">
                <header className="djibouti-panel-header">
                  <div>
                    <span className={`djibouti-panel-eyebrow ${activeStepPanelClass(nextActionKey !== 'done')}`}>Selected Clearance File</span>
                    <h2>{selected.bookingNumber}</h2>
                  </div>
                  <p>{selected.customerName}</p>
                </header>
                <div className="djibouti-detail-summary">
                  <div className="djibouti-detail-item"><span>BL / container</span><strong>{selected.blNumber} · {selected.containerNumber}</strong></div>
                  <div className="djibouti-detail-item"><span>Inland destination</span><strong>{selected.inlandDestination}</strong></div>
                  <div className="djibouti-detail-item"><span>Transitor owner</span><strong>{selected.transitorAssignedTo}</strong></div>
                  <div className="djibouti-detail-item"><span>Where is the transitor now?</span><strong>{transitorLocation}</strong></div>
                  <div className="djibouti-detail-item"><span>Transitor company</span><strong>{selected.transitorCompany || 'Pending'}</strong></div>
                  <div className="djibouti-detail-item"><span>Transitor phone</span><strong>{selected.transitorPhone || 'Pending'}</strong></div>
                  <div className="djibouti-detail-item"><span>Transitor email</span><strong>{selected.transitorEmail || 'Pending'}</strong></div>
                  <div className="djibouti-detail-item"><span>Transit document ref</span><strong>{selected.transitDocumentRef}</strong></div>
                  <div className="djibouti-detail-item"><span>Transit document status</span><strong>{selected.transitDocumentStatus}</strong></div>
                  <div className="djibouti-detail-item"><span>Charges</span><strong>{selected.chargesPaymentStatus}</strong></div>
                  <div className="djibouti-detail-item"><span>Clearance packet</span><strong>{selected.clearancePacketStatus}</strong></div>
                  <div className="djibouti-detail-item"><span>Transport clearance ready</span><strong>{selected.transportClearanceReady ? 'Yes' : 'No'}</strong></div>
                  <div className="djibouti-detail-item"><span>Transitor assigned at</span><strong>{formatDeskDate(selected.transitorAssignedAt || '')}</strong></div>
                  <div className="djibouti-detail-item"><span>3-day SLA due</span><strong>{formatDeskDate(clearanceSla.dueAt)}</strong></div>
                  <div className="djibouti-detail-item"><span>Clearance SLA</span><strong>{clearanceSla.label}</strong></div>
                  <div className="djibouti-detail-item"><span>Overdue blocker</span><strong>{selected.blockerSubmittedAt ? renderBlockerSummary(selected) : 'Not submitted'}</strong></div>
                </div>
                <div className={`supplier-control-card console-gap-bottom-md ${clearanceSla.breached ? 'shipping-phase-note is-blocked' : 'supplier-control-card-primary'}`}>
                  <span className="supplier-panel-eyebrow">Transitor SLA</span>
                  <strong>{clearanceSla.breached ? 'Clearance overdue' : 'Clearance must finish in 3 days'}</strong>
                  <p>
                    {selected.transitorAssignedAt ? '3-day SLA started at ' + formatDeskDate(selected.transitorAssignedAt) + '. ' : 'Assign the transitor first to start the 3-day SLA. '}
                    {clearanceSla.breached ? 'Escalate immediately to operations and admin. The transitor must submit the blocker reason and note before this file can move forward.' : 'Track the countdown and finish T1, charges, and dispatch release before the deadline.'}
                  </p>
                </div>
                <div className="supplier-control-grid transitor-contact-grid console-gap-bottom-md">
                  <label className={`supplier-field-block ${nextActionKey === 'assign-transitor' && !transitorDraft.name.trim() ? 'supplier-next-step-field' : ''}`}>
                    <span>Transitor name</span>
                    <select className="supplier-desk-input" value={selectedTransitorPresetKey} onChange={(event) => applyTransitorPreset(event.target.value)} disabled={workflowLocked}>
                      <option value="">Select transitor</option>
                      {transitorContactPresets.map((preset) => (
                        <option key={preset.key} value={preset.key}>{preset.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className={`supplier-field-block ${nextActionKey === 'assign-transitor' && !transitorDraft.company.trim() ? 'supplier-next-step-field' : ''}`}>
                    <span>Transitor company</span>
                    <input className="supplier-desk-input" value={transitorDraft.company} onChange={(event) => setTransitorDraft((current) => ({ ...current, company: event.target.value }))} placeholder="Enter transitor company" disabled={workflowLocked} />
                  </label>
                  <label className={`supplier-field-block ${nextActionKey === 'assign-transitor' && !transitorDraft.phone.trim() ? 'supplier-next-step-field' : ''}`}>
                    <span>Phone number</span>
                    <input className="supplier-desk-input" value={transitorDraft.phone} onChange={(event) => setTransitorDraft((current) => ({ ...current, phone: event.target.value }))} placeholder="Enter transitor phone" disabled={workflowLocked} />
                  </label>
                  <label className="supplier-field-block">
                    <span>Email</span>
                    <input className="supplier-desk-input" value={transitorDraft.email} onChange={(event) => setTransitorDraft((current) => ({ ...current, email: event.target.value }))} placeholder="Enter transitor email" disabled={workflowLocked} />
                  </label>
                  <label className="supplier-field-block console-grid-span-full">
                    <span>Clearance note</span>
                    <textarea className="supplier-desk-input" rows={3} value={transitorDraft.note} onChange={(event) => setTransitorDraft((current) => ({ ...current, note: event.target.value }))} placeholder="Add branch contact, broker note, or clearance instruction" disabled={workflowLocked} />
                  </label>
                </div>
                <div className="supplier-control-card supplier-control-card-primary supplier-next-step-button console-gap-bottom-md">
                  <span className="supplier-panel-eyebrow">Next action</span>
                  <strong>{nextActionTitle}</strong>
                  <p>{nextActionHelper}</p>
                </div>
                <div className="djibouti-inline-actions">
                  <button type="button" className={`djibouti-desk-button djibouti-desk-button-secondary ${nextStepClass(nextActionKey === 'assign-transitor')}`} disabled={!canAssignTransitor} onClick={assignTransitor} data-testid="clearance-assign-transitor">{workflowLocked ? 'Assignment locked' : transitorAlreadyAssigned && !transitorDraftChanged ? 'Transitor assigned' : 'Assign transitor'}</button>
                  <button type="button" className={`djibouti-desk-button djibouti-desk-button-secondary ${nextStepClass(nextActionKey === 'prepare-t1')}`} disabled={!canPrepareT1} onClick={prepareT1} data-testid="clearance-prepare-t1">{workflowLocked ? 'T1 locked' : ['prepared', 'approved'].includes(selected.transitDocumentStatus) ? 'T1 prepared' : 'Prepare T1'}</button>
                  <button type="button" className={`djibouti-desk-button djibouti-desk-button-secondary ${nextStepClass(nextActionKey === 'mark-charges-paid')}`} disabled={!canMarkChargesPaid} onClick={markChargesPaid} data-testid="clearance-mark-charges-paid">{workflowLocked ? 'Charges locked' : selected.chargesPaymentStatus === 'paid' ? 'Charges paid' : 'Mark charges paid'}</button>
                  <button
                    type="button"
                    className="djibouti-desk-button djibouti-desk-button-secondary console-download-button"
                    onClick={() =>
                      downloadTransitorBatchSheetPdf({
                        fileName: `${selected.bookingNumber.toLowerCase()}-batch-sheet.pdf`,
                        batchNumber: `BATCH-${selected.bookingNumber.replace(/^TAB-/, '')}`,
                        bookingNumber: selected.bookingNumber,
                        blNumber: selected.blNumber,
                        containerNumber: selected.containerNumber,
                        customerName: selected.customerName,
                        inlandDestination: selected.inlandDestination,
                        transitorAssignedTo: selected.transitorAssignedTo,
                        transitorCompany: selected.transitorCompany,
                        transitorPhone: selected.transitorPhone,
                        transitDocumentRef: selected.transitDocumentRef,
                        transitDocumentStatus: selected.transitDocumentStatus,
                        chargesPaymentStatus: selected.chargesPaymentStatus,
                        clearancePacketStatus: selected.clearancePacketStatus,
                        multimodalReceivedAt: selected.multimodalReceivedAt,
                      })
                    }
                  >
                    Download batch sheet
                  </button>
                  <button
                    type="button"
                    className="djibouti-desk-button djibouti-desk-button-secondary console-download-button"
                    onClick={() =>
                      downloadTransitorClearancePdf({
                        fileName: `${selected.bookingNumber.toLowerCase()}-clearance-release.pdf`,
                        bookingNumber: selected.bookingNumber,
                        blNumber: selected.blNumber,
                        containerNumber: selected.containerNumber,
                        customerName: selected.customerName,
                        inlandDestination: selected.inlandDestination,
                        transitorAssignedTo: selected.transitorAssignedTo,
                        transitorCompany: selected.transitorCompany,
                        transitorPhone: selected.transitorPhone,
                        transitorEmail: selected.transitorEmail,
                        transitorClearanceNote: selected.transitorClearanceNote,
                        transitDocumentRef: selected.transitDocumentRef,
                        transitDocumentStatus: selected.transitDocumentStatus,
                        chargesPaymentStatus: selected.chargesPaymentStatus,
                        clearancePacketStatus: selected.clearancePacketStatus,
                        clearanceCompletedAt: selected.clearanceCompletedAt,
                      })
                    }
                  >
                    Download clearance release
                  </button>
                  <button type="button" className={`djibouti-desk-button djibouti-desk-button-primary ${nextStepClass(nextActionKey === 'release-to-dispatch')}`} disabled={!canReleaseToDispatch} onClick={markClearanceReady} data-testid="clearance-release-to-dispatch">{selected.transportClearanceReady ? 'Released to dispatch' : 'Release to dispatch'}</button>
                </div>
                </article>

                <article className="djibouti-panel djibouti-command-panel">
                  <header className="djibouti-panel-header">
                    <div>
                      <span className="djibouti-panel-eyebrow">Command</span>
                      <h2>Next action and dispatch gate</h2>
                    </div>
                  </header>
                  <div className="djibouti-command-grid">
                    <div className="djibouti-command-card djibouti-command-card-primary">
                      <span className="djibouti-panel-eyebrow">Next action</span>
                      <strong>{nextActionTitle}</strong>
                      <p>{nextActionHelper}</p>
                    </div>
                    <div className="djibouti-command-card">
                      <span className="djibouti-panel-eyebrow">Clearance state</span>
                      <strong>{selected.transportClearanceReady ? 'Ready for dispatch' : 'Dispatch still blocked'}</strong>
                      <p>{selected.transportClearanceReady ? 'All release controls are satisfied and dispatch can pick up the trip.' : clearanceSla.breached ? 'Prepare T1, clear charges, and submit the overdue blocker before dispatch can proceed.' : 'Prepare T1, clear charges, and release the file before dispatch can proceed.'}</p>
                    </div>
                    <div className="djibouti-command-card">
                      <span className="djibouti-panel-eyebrow">Current owner</span>
                      <strong>{selected.transitorAssignedTo}</strong>
                      <p>Keep transitor ownership visible so charge and T1 controls do not stall between desks.</p>
                    </div>
                  </div>
                </article>

                <article className="djibouti-panel">
                <header className="djibouti-panel-header">
                  <div>
                    <span className="djibouti-panel-eyebrow">Workflow tracking</span>
                    <h2>Finished vs remaining documents</h2>
                  </div>
                </header>
                <div className="djibouti-command-grid">
                  <div className="djibouti-command-card">
                    <span className="djibouti-panel-eyebrow">Finished</span>
                    <strong>{documentProgress.completed.length} documents done</strong>
                    <p>{documentProgress.completed.length ? documentProgress.completed.join(' · ') : 'No transitor-controlled document is complete yet.'}</p>
                  </div>
                  <div className="djibouti-command-card">
                    <span className="djibouti-panel-eyebrow">Remaining</span>
                    <strong>{documentProgress.remaining.length} items still open</strong>
                    <p>{documentProgress.remaining.length ? documentProgress.remaining.join(' · ') : 'All required transitor documents are complete.'}</p>
                  </div>
                  <div className="djibouti-command-card">
                    <span className="djibouti-panel-eyebrow">Current workflow stage</span>
                    <strong>{nextActionTitle}</strong>
                    <p>{transitorLocation}</p>
                  </div>
                </div>
                </article>

                <article className="djibouti-panel">
                <header className="djibouti-panel-header">
                  <div>
                    <span className="djibouti-panel-eyebrow">Dispatch block rule</span>
                    <h2>Dispatch stays blocked until all three are true</h2>
                  </div>
                </header>
                <div className="djibouti-checklist">
                  <div className="djibouti-check-item is-complete">
                    <span>transportClearanceReady = true</span>
                    <strong>{selected.transportClearanceReady ? 'Complete' : 'Blocked'}</strong>
                  </div>
                  <div className={selected.transitDocumentStatus === 'prepared' ? 'djibouti-check-item is-complete' : 'djibouti-check-item is-pending'}>
                    <span>Transit document exists</span>
                    <strong>{selected.transitDocumentStatus === 'prepared' ? selected.transitDocumentRef : 'Missing / draft only'}</strong>
                  </div>
                  <div className={selected.chargesPaymentStatus === 'paid' ? 'djibouti-check-item is-complete' : 'djibouti-check-item is-pending'}>
                    <span>Required charges paid or cleared</span>
                    <strong>{selected.chargesPaymentStatus}</strong>
                  </div>
                  <div className={!clearanceSla.breached || selected.blockerSubmittedAt ? 'djibouti-check-item is-complete' : 'djibouti-check-item is-blocked'}>
                    <span>Overdue blocker submitted when SLA missed</span>
                    <strong>{!clearanceSla.breached ? 'Not required yet' : selected.blockerSubmittedAt ? formatDeskDate(selected.blockerSubmittedAt) : 'Missing blocker submission'}</strong>
                  </div>
                </div>
                </article>

                <article className="djibouti-panel">
                <header className="djibouti-panel-header">
                  <div>
                    <span className="djibouti-panel-eyebrow">Risk and handoff</span>
                    <h2>Visible multimodal-to-clearance ownership</h2>
                  </div>
                </header>
                <div className="djibouti-detail-summary">
                  <div className="djibouti-detail-item"><span>Multimodal received at</span><strong>{new Date(selected.multimodalReceivedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</strong></div>
                  <div className="djibouti-detail-item"><span>Transitor assigned at</span><strong>{formatDeskDate(selected.transitorAssignedAt || '')}</strong></div>
                  <div className="djibouti-detail-item"><span>Storage risk</span><strong>{selected.storageRisk}</strong></div>
                  <div className="djibouti-detail-item"><span>Clearance completed at</span><strong>{selected.clearanceCompletedAt ? new Date(selected.clearanceCompletedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Pending'}</strong></div>
                  <div className="djibouti-detail-item"><span>Latest Djibouti stage</span><strong>{linkedRelease?.currentStage || 'Pending linkage'}</strong></div>
                  <div className="djibouti-detail-item"><span>Dispatch handoff</span><strong>{linkedRelease?.handoff.tripCreationStatus || 'Not created'}</strong></div>
                  <div className="djibouti-detail-item"><span>Latest blocker submission</span><strong>{selected.blockerSubmittedAt ? formatDeskDate(selected.blockerSubmittedAt) : 'None'}</strong></div>
                </div>
                <div className="corridor-panel-rows">
                  {selected.issues.map((issue) => (
                    <div key={issue} className="corridor-row corridor-row-warning">
                      <span>Open clearance issue</span>
                      <strong>{issue}</strong>
                    </div>
                  ))}
                </div>
                </article>

                <article className={`djibouti-panel ${clearanceSla.breached ? 'shipping-phase-note is-blocked' : ''}`}>
                <header className="djibouti-panel-header">
                  <div>
                    <span className="djibouti-panel-eyebrow">Overdue blocker submission</span>
                    <h2>Only required after 3 days from transitor assignment</h2>
                  </div>
                </header>
                <p>{clearanceSla.breached ? 'The 3-day SLA is missed. Submit the blocker now.' : 'Day 1 starts when the transitor is assigned. This stays inactive through the first 3 days and only starts blinking after the 72-hour limit is missed.'}</p>
                <div className="supplier-control-grid transitor-contact-grid console-gap-top-sm">
                  <label className={`supplier-field-block ${clearanceSla.breached && !blockerDraft.type ? 'supplier-next-step-field supplier-next-step-button' : ''}`}>
                    <span>Common blocker issue</span>
                    <select className="supplier-desk-input" value={blockerDraft.type} onChange={(event) => setBlockerDraft((current) => ({ ...current, type: event.target.value }))}>
                      <option value="">Select blocker</option>
                      {transitorBlockerPresets.map((preset) => (
                        <option key={preset} value={preset}>{preset}</option>
                      ))}
                    </select>
                  </label>
                  <label className={`supplier-field-block console-grid-span-full ${clearanceSla.breached && !blockerDraft.note.trim() ? 'supplier-next-step-field supplier-next-step-button' : ''}`}>
                    <span>Blocker note</span>
                    <textarea
                      className="supplier-desk-input"
                      rows={3}
                      value={blockerDraft.note}
                      onChange={(event) => setBlockerDraft((current) => ({ ...current, note: event.target.value }))}
                      placeholder="Example: seal broken, seal number on the document does not match the physical seal, customs asked for re-check."
                    />
                  </label>
                </div>
                <div className="djibouti-inline-actions console-gap-top-sm">
                  <button
                    type="button"
                    className={`djibouti-desk-button djibouti-desk-button-secondary ${nextStepClass(clearanceSla.breached && (!selected.blockerSubmittedAt || !selected.blockerType || !selected.blockerNote?.trim()))}`}
                    disabled={!clearanceSla.breached || !blockerDraft.type || !blockerDraft.note.trim()}
                    onClick={submitBlocker}
                  >
                    Submit blocker
                  </button>
                </div>
                <p className="console-message">
                  {selected.blockerSubmittedAt
                    ? `Latest blocker submitted ${formatDeskDate(selected.blockerSubmittedAt)}.`
                    : clearanceSla.breached ? 'No blocker has been submitted for this overdue file yet.' : 'No blocker needed unless the SLA is missed.'}
                </p>
                </article>
              </div>

              <aside className="djibouti-support-column">
                {supportReady ? (
                  <TransitorClearanceSupportColumn
                    aiBrief={aiBrief}
                    systemAuditLog={systemAuditLog}
                  />
                ) : (
                  <div className="djibouti-empty-state">
                    Loading clearance support panels...
                  </div>
                )}

                <article className="djibouti-panel">
                  <header className="djibouti-panel-header">
                    <div>
                      <span className="djibouti-panel-eyebrow">Readiness</span>
                      <h2>Clearance controls</h2>
                    </div>
                  </header>
                  <div className="djibouti-readiness-list">
                    <div className={selected.transitorAssignedTo !== 'Pending transitor owner' ? 'djibouti-check-item is-complete' : 'djibouti-check-item is-pending'}>
                      <span>Transitor owner assigned</span>
                      <strong>{selected.transitorAssignedTo !== 'Pending transitor owner' ? 'Complete' : 'Pending'}</strong>
                    </div>
                    <div className={selected.transitorCompany && selected.transitorPhone ? 'djibouti-check-item is-complete' : 'djibouti-check-item is-pending'}>
                      <span>Transitor contact captured</span>
                      <strong>{selected.transitorCompany && selected.transitorPhone ? 'Complete' : 'Pending'}</strong>
                    </div>
                    <div className={selected.transitDocumentStatus === 'prepared' ? 'djibouti-check-item is-complete' : 'djibouti-check-item is-pending'}>
                      <span>T1 prepared</span>
                      <strong>{selected.transitDocumentStatus === 'prepared' ? 'Complete' : 'Pending'}</strong>
                    </div>
                    <div className={selected.chargesPaymentStatus === 'paid' ? 'djibouti-check-item is-complete' : 'djibouti-check-item is-pending'}>
                      <span>Charges cleared</span>
                      <strong>{selected.chargesPaymentStatus === 'paid' ? 'Complete' : 'Pending'}</strong>
                    </div>
                    <div className={selected.transportClearanceReady ? 'djibouti-check-item is-complete' : 'djibouti-check-item is-blocked'}>
                      <span>Released to dispatch</span>
                      <strong>{selected.transportClearanceReady ? 'Complete' : 'Blocked'}</strong>
                    </div>
                    <div className={clearanceSla.breached ? 'djibouti-check-item is-blocked' : 'djibouti-check-item is-pending'}>
                      <span>3-day completion SLA</span>
                      <strong>{clearanceSla.label}</strong>
                    </div>
                    <div className={!clearanceSla.breached || selected.blockerSubmittedAt ? 'djibouti-check-item is-complete' : 'djibouti-check-item is-blocked'}>
                      <span>Blocker submission for overdue file</span>
                      <strong>{!clearanceSla.breached ? 'Not required' : selected.blockerSubmittedAt ? 'Submitted' : 'Required now'}</strong>
                    </div>
                  </div>
                </article>
              </aside>
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
});
