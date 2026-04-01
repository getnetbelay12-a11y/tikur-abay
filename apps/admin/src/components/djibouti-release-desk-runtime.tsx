'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { memo, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { buildDjiboutiAiBrief } from '../lib/operations-ai-assistant';
import { djiboutiReleaseRecords, type DjiboutiReleaseRecord, type DjiboutiReleaseStage } from '../lib/djibouti-release-demo-data';
import { apiBase, apiGet, apiPost } from '../lib/api';
import { downloadDjiboutiGatePassPdf, downloadDjiboutiHandoffPdf } from '../lib/shipping-pdf';
import {
  hydrateManualWorkflowStateFromServer,
  isManualDjiboutiReleaseRecord,
  manualCorridorStorageUpdatedEvent,
  mergeDjiboutiReleaseRecords,
  syncManualDispatchFromRelease,
  upsertManualDjiboutiReleaseRecord,
} from '../lib/manual-corridor-journey';

const progressLabels = ['Multimodal received', 'Vessel arrived', 'Discharge confirmed', 'Line release received', 'Customs review pending', 'Ready for transitor', 'Handoff to clearance'];
const DjiboutiReleaseSidePanels = dynamic(
  () => import('./djibouti-release-side-panels').then((module) => module.DjiboutiReleaseSidePanels),
  {
    ssr: false,
    loading: () => <div className="djibouti-empty-state">Loading release side panels...</div>,
  },
);
const djiboutiRelevantStorageKeys = new Set([
  'tikur-abay:manual-corridor:djibouti-release',
  'tikur-abay:manual-corridor:yard-records',
  'tikur-abay:supplier-desk:manual-shipments',
  'tikur-abay:shipping-phase2:bills',
  'tikur-abay:shipping-phase2:manifests',
  'tikur-abay:booking-quotes',
]);

function getProgressIndex(stage: DjiboutiReleaseStage) {
  switch (stage) {
    case 'Vessel arrived':
      return 0;
    case 'Awaiting discharge':
    case 'Discharged':
      return 1;
    case 'Shipping line release pending':
      return 2;
    case 'Customs note pending':
    case 'Transit document pending':
      return 3;
    case 'Gate-out ready':
      return 5;
    case 'Waiting inland handoff':
      return 6;
    default:
      return 0;
  }
}

function formatDate(value: string) {
  if (!value) return 'Pending';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function compareBookingOrder(left: string, right: string) {
  const leftKey = left.replace(/\D/g, '');
  const rightKey = right.replace(/\D/g, '');
  if (leftKey.length !== rightKey.length) return rightKey.length - leftKey.length;
  return rightKey.localeCompare(leftKey);
}

function isGateOutReady(record: {
  vesselArrival?: string;
  dischargeTime?: string;
  lineReleaseReceived?: boolean;
  customsTransit: { customsCleared?: boolean; transitPacketComplete?: boolean };
  releaseNoteUploaded?: boolean;
  storage: { gatePassStatus?: string };
}) {
  return (
    Boolean(record.vesselArrival) &&
    Boolean(record.dischargeTime) &&
    record.lineReleaseReceived &&
    record.customsTransit.customsCleared &&
    record.customsTransit.transitPacketComplete &&
    record.releaseNoteUploaded &&
    record.storage.gatePassStatus === 'Approved'
  );
}

function isReadyForInlandHandoff(record: DjiboutiReleaseRecord) {
  return isGateOutReady(record) && record.handoff.handoffPacketComplete;
}

function storageTone(risk: DjiboutiReleaseRecord['storageRisk']) {
  if (risk === 'Urgent') return 'djibouti-chip-high';
  if (risk === 'Approaching') return 'djibouti-chip-medium';
  return 'djibouti-chip-ready';
}

function withNormalizedHandoff(record: DjiboutiReleaseRecord): DjiboutiReleaseRecord {
  const handoffPacketComplete = record.handoff.packetItems.every((item) => item.complete);
  return {
    ...record,
    handoff: {
      ...record.handoff,
      handoffPacketComplete,
    },
  };
}

function nextStepClass(isActive: boolean) {
  return isActive ? 'supplier-next-step-button' : '';
}

function activeStepPanelClass(isActive: boolean) {
  return isActive ? 'operations-step-active' : '';
}

const clearanceDocumentLabels: Record<string, string> = {
  manifest: 'Manifest',
  bl: 'Bill of Lading',
  invoice: 'Invoice',
  packing_list: 'Packing List',
  release_note: 'Release Note',
  container_details: 'Container Details',
  customs: 'Customs Docs',
};

type CorridorDocumentGroup = {
  tag: string;
  latest?: {
    shipmentDocumentId?: string;
    fileName?: string;
    status?: string;
    documentType?: string;
    tag?: string;
    issuedBy?: string;
    issueDate?: string;
    uploadedAt?: string;
  };
  versions?: Array<{ shipmentDocumentId?: string; fileName?: string; status?: string }>;
};

type CorridorShipmentDetail = {
  shipmentRef: string;
  bookingNumber: string;
  readiness?: {
    missingItems?: string[];
    missingFields?: string[];
    blockedReasons?: string[];
  };
  clearance?: {
    documentsReadyForClearance?: boolean;
    documentsReadyAt?: string;
    documentsReadyMarkedBy?: string;
    clearanceWorkflowStatus?: string;
  };
  documentHub?: {
    groups?: CorridorDocumentGroup[];
  };
};

type DjiboutiSummaryCard = {
  label: string;
  value: number;
  helper: string;
};

const DjiboutiSummaryGrid = memo(function DjiboutiSummaryGrid({
  cards,
}: {
  cards: DjiboutiSummaryCard[];
}) {
  return (
    <section className="djibouti-summary-grid">
      {cards.map((card) => (
        <article key={card.label} className="djibouti-summary-card">
          <span>{card.label}</span>
          <strong>{card.value}</strong>
          <p>{card.helper}</p>
        </article>
      ))}
    </section>
  );
});

const DjiboutiQueuePanel = memo(function DjiboutiQueuePanel({
  records,
  selectedRecordId,
  onSelect,
}: {
  records: DjiboutiReleaseRecord[];
  selectedRecordId: string;
  onSelect: (recordId: string) => void;
}) {
  return (
    <article className="djibouti-panel">
      <header className="djibouti-panel-header">
        <div>
          <span className="djibouti-panel-eyebrow">Queue</span>
          <h2>Arrival and release queue</h2>
        </div>
        <p>{records.length} active Djibouti files</p>
      </header>
      <div className="djibouti-queue-list" data-testid="djibouti-release-queue">
        {records.map((record) => (
          <button
            key={record.id}
            type="button"
            className={record.id === selectedRecordId ? 'djibouti-queue-row active' : 'djibouti-queue-row'}
            onClick={() => onSelect(record.id)}
            data-testid={`djibouti-queue-row-${record.bookingNumber}`}
          >
            <div className="djibouti-queue-topline">
              <strong>{record.bookingNumber}</strong>
              <span className={record.serviceType === 'multimodal' ? 'djibouti-chip djibouti-chip-mode' : 'djibouti-chip'}>{record.serviceType}</span>
            </div>
            <span>{record.blNumber}</span>
            <span>{record.containerNumber} · {record.customerName}</span>
            <div className="djibouti-queue-meta">
              <span>{record.currentStage}</span>
              <span className={`djibouti-chip ${storageTone(record.storageRisk)}`}>{record.storageRisk}</span>
            </div>
            <p>{record.etaSummary}</p>
          </button>
        ))}
      </div>
    </article>
  );
});

const DjiboutiSelectedFileHeader = memo(function DjiboutiSelectedFileHeader({
  selectedRecord,
  selectedIndex,
}: {
  selectedRecord: DjiboutiReleaseRecord;
  selectedIndex: number;
}) {
  return (
    <article className="djibouti-panel" data-testid="djibouti-selected-shipment">
      <header className="djibouti-panel-header">
        <div>
          <span className="djibouti-panel-eyebrow">Selected Release File</span>
          <h2>{selectedRecord.bookingNumber}</h2>
        </div>
        <p>Last updated {formatDate(selectedRecord.lastUpdated)}</p>
      </header>
      <div className="djibouti-detail-summary">
        <div className="djibouti-detail-item"><span>Customer</span><strong>{selectedRecord.customerName}</strong></div>
        <div className="djibouti-detail-item"><span>BL / container</span><strong>{selectedRecord.blNumber} · {selectedRecord.containerNumber}</strong></div>
        <div className="djibouti-detail-item"><span>Vessel / voyage</span><strong>{selectedRecord.vesselName} / {selectedRecord.voyageNumber}</strong></div>
        <div className="djibouti-detail-item"><span>Final destination</span><strong>{selectedRecord.finalDestination}</strong></div>
        <div className="djibouti-detail-item"><span>Stage</span><strong>{selectedRecord.currentStage}</strong></div>
        <div className="djibouti-detail-item"><span>Owner</span><strong>{selectedRecord.assignedAgent}</strong></div>
      </div>
      <div className="djibouti-progress-strip">
        {progressLabels.map((label, index) => {
          const state = index < selectedIndex ? 'done' : index === selectedIndex ? 'active' : 'next';
          return (
            <div key={label} className={`djibouti-progress-step djibouti-progress-${state}`}>
              <span>{index + 1}</span>
              <strong>{label}</strong>
            </div>
          );
        })}
      </div>
    </article>
  );
});

function formatWorkflowLabel(value?: string) {
  return String(value || 'waiting_for_documents').replace(/_/g, ' ');
}

function documentLabel(tag: string) {
  return clearanceDocumentLabels[tag] || tag.replace(/_/g, ' ');
}

export const DjiboutiReleaseDeskRuntime = memo(function DjiboutiReleaseDeskRuntime() {
  const searchParams = useSearchParams();
  const headerQuery = searchParams.get('q') || searchParams.get('query') || '';
  const [records, setRecords] = useState<DjiboutiReleaseRecord[]>(() => mergeDjiboutiReleaseRecords([]));
  const [selectedRecordId, setSelectedRecordId] = useState('');
  const [searchValue, setSearchValue] = useState(headerQuery);
  const deferredSearchValue = useDeferredValue(searchValue);
  const [releaseFilter, setReleaseFilter] = useState<'all' | DjiboutiReleaseRecord['releaseStatus']>('all');
  const [customsFilter, setCustomsFilter] = useState<'all' | DjiboutiReleaseRecord['customsStatus']>('all');
  const [riskFilter, setRiskFilter] = useState<'all' | DjiboutiReleaseRecord['storageRisk']>('all');
  const [dateRange, setDateRange] = useState<'all' | '7d' | '14d' | '30d'>('all');
  const [liveShipment, setLiveShipment] = useState<CorridorShipmentDetail | null>(null);
  const [liveShipmentLoading, setLiveShipmentLoading] = useState(false);
  const [liveShipmentError, setLiveShipmentError] = useState('');
  const [clearanceNote, setClearanceNote] = useState('');
  const [clearanceActionMessage, setClearanceActionMessage] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setRecords(mergeDjiboutiReleaseRecords([]));
    void hydrateManualWorkflowStateFromServer().then(() => {
      setRecords(mergeDjiboutiReleaseRecords([]));
    });
    const handleStorage = (event?: Event) => {
      if (event instanceof StorageEvent) {
        if (event.key && !djiboutiRelevantStorageKeys.has(event.key)) return;
      } else if (event && 'detail' in event && event.detail && typeof event.detail === 'object') {
        const detailKey = 'key' in event.detail ? String((event.detail as { key?: string }).key || '') : '';
        if (detailKey && !djiboutiRelevantStorageKeys.has(detailKey)) return;
      }
      const nextRecords = mergeDjiboutiReleaseRecords([]);
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
    window.addEventListener('storage', handleStorage);
    window.addEventListener(manualCorridorStorageUpdatedEvent, handleStorage as EventListener);
    return () => {
      window.removeEventListener('storage', handleStorage);
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
  }, [headerQuery]);

  const selectedBookingNumber = records.find((item) => item.id === selectedRecordId)?.bookingNumber || '';

  useEffect(() => {
    if (!selectedBookingNumber) {
      setLiveShipment(null);
      return;
    }
    let cancelled = false;
    setLiveShipmentLoading(true);
    setLiveShipmentError('');
    apiGet<CorridorShipmentDetail>(`/corridor/shipments/${encodeURIComponent(selectedBookingNumber)}`)
      .then((payload) => {
        if (!cancelled) setLiveShipment(payload);
      })
      .catch((error) => {
        if (!cancelled) {
          setLiveShipment(null);
          setLiveShipmentError(error instanceof Error ? error.message : 'System document center unavailable');
        }
      })
      .finally(() => {
        if (!cancelled) setLiveShipmentLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedBookingNumber]);

  const filteredRecords = useMemo(() => {
    const now = new Date('2026-03-19T23:59:59Z').getTime();
    const cutoffMap = { all: 0, '7d': 7, '14d': 14, '30d': 30 };
    const rangeDays = cutoffMap[dateRange];
    return records
      .filter((record) => {
        const matchesSearch = [record.bookingNumber, record.blNumber, record.containerNumber, record.customerName]
          .join(' ')
          .toLowerCase()
          .includes(deferredSearchValue.trim().toLowerCase());
        const matchesRelease = releaseFilter === 'all' || record.releaseStatus === releaseFilter;
        const matchesCustoms = customsFilter === 'all' || record.customsStatus === customsFilter;
        const matchesRisk = riskFilter === 'all' || record.storageRisk === riskFilter;
        const matchesDate =
          rangeDays === 0 ||
          now - new Date(record.lastUpdated).getTime() <= rangeDays * 24 * 60 * 60 * 1000;
        return matchesSearch && matchesRelease && matchesCustoms && matchesRisk && matchesDate;
      })
      .sort((left, right) => compareBookingOrder(left.bookingNumber, right.bookingNumber));
  }, [customsFilter, dateRange, deferredSearchValue, records, releaseFilter, riskFilter]);

  const selectedRecord = useMemo(() => {
    return filteredRecords.find((record) => record.id === selectedRecordId)
      ?? records.find((record) => record.id === selectedRecordId)
      ?? filteredRecords[0]
      ?? records[0]
      ?? null;
  }, [filteredRecords, records, selectedRecordId]);

  useEffect(() => {
    setSelectedRecordId((current) => {
      if (!records.length) return '';
      if (records.some((record) => record.id === current)) return current;
      return filteredRecords[0]?.id ?? records[0]?.id ?? '';
    });
  }, [filteredRecords, records]);

  const selectedIndex = selectedRecord ? getProgressIndex(selectedRecord.currentStage as DjiboutiReleaseStage) : 0;
  const liveDocumentGroups = liveShipment?.documentHub?.groups ?? [];
  const liveMissingTags = new Set((liveShipment?.readiness?.missingItems ?? []).map((item) => String(item).toLowerCase()));
  const liveMissingFields = liveShipment?.readiness?.missingFields ?? [];
  const liveBlockedReasons = liveShipment?.readiness?.blockedReasons ?? [];
  const liveDocumentsReady = Boolean(liveShipment?.clearance?.documentsReadyForClearance);
  const manualReleaseCompatibility = Boolean(selectedRecord && isManualDjiboutiReleaseRecord(selectedRecord.id) && !liveShipment);
  const effectiveDocumentsReady = liveDocumentsReady || manualReleaseCompatibility || Boolean(selectedRecord?.inlandHandoffSent);

  const summaryCards = useMemo(() => {
    return [
      {
        label: 'Awaiting discharge confirmation',
        value: records.filter((record) => !record.dischargeTime).length,
        helper: 'Arrived units still waiting on terminal discharge confirmation.',
      },
      {
        label: 'Waiting shipping line release',
        value: records.filter((record) => !record.lineReleaseReceived).length,
        helper: 'Containers that cannot move until line release is captured.',
      },
      {
        label: 'Customs / transit pending',
        value: records.filter((record) => !record.customsTransit.transitPacketComplete || !record.customsTransit.customsCleared).length,
        helper: 'Release files still missing customs clearance or transit packet readiness.',
      },
      {
        label: 'Storage risk approaching',
        value: records.filter((record) => record.storageRisk !== 'Safe').length,
        helper: 'Files already nearing free-time or detention risk thresholds.',
      },
      {
        label: 'Ready for gate-out',
        value: records.filter((record) => isGateOutReady(record)).length,
        helper: 'Containers that can move once the transitor / clearance desk receives the full file.',
      },
    ];
  }, [records]);

  function updateSelected(mutator: (record: DjiboutiReleaseRecord) => DjiboutiReleaseRecord) {
    if (!selectedRecord) return;
    const nextRecord = withNormalizedHandoff(mutator(selectedRecord));
    setRecords((current) =>
      current.map((record) => (record.id === selectedRecord.id ? nextRecord : record)),
    );
    if (isManualDjiboutiReleaseRecord(nextRecord.id)) {
      upsertManualDjiboutiReleaseRecord(nextRecord);
    }
  }

  function confirmVesselArrived() {
    updateSelected((record): DjiboutiReleaseRecord => ({
      ...record,
      vesselArrival: record.vesselArrival || new Date().toISOString(),
      currentStage: record.dischargeTime ? record.currentStage : 'Awaiting discharge',
      etaSummary: record.dischargeTime ? record.etaSummary : 'Vessel arrived · discharge confirmation still pending',
      lastUpdated: new Date().toISOString(),
      releaseBlockers: record.dischargeTime ? record.releaseBlockers : 'Discharge confirmation, customs clearance, and gate pass still need to be completed.',
    }));
  }

  function confirmDischarge() {
    updateSelected((record): DjiboutiReleaseRecord => ({
      ...record,
      dischargeTime: record.dischargeTime || '2026-03-19T13:30:00Z',
      currentStage: record.lineReleaseReceived ? record.currentStage : 'Shipping line release pending',
      lastUpdated: '2026-03-19T18:34:00Z',
      releaseBlockers: record.lineReleaseReceived ? record.releaseBlockers : 'Shipping line release still pending after discharge confirmation.',
      exceptions: record.exceptions.filter((item) => !item.issueText.toLowerCase().includes('discharge confirmation')),
    }));
  }

  function confirmLineRelease() {
    updateSelected((record): DjiboutiReleaseRecord => ({
      ...record,
      lineReleaseReceived: true,
      terminalReleaseReady: true,
      currentStage: record.customsTransit.customsCleared ? (isGateOutReady({ ...record, lineReleaseReceived: true, terminalReleaseReady: true } as DjiboutiReleaseRecord) ? 'Gate-out ready' : 'Transit document pending') : 'Customs note pending',
      releaseStatus: 'Release in progress',
      lastUpdated: '2026-03-19T18:36:00Z',
      releaseBlockers: 'Customs and transit packet still need to be closed before gate-out.',
      exceptions: record.exceptions.filter((item) => !item.issueText.toLowerCase().includes('line release')),
    }));
  }

  function markCustomsCleared() {
    updateSelected((record) => {
      const handoffPacketItems = record.handoff.packetItems.map((item) =>
        item.label.toLowerCase().includes('transit/customs doc')
          ? { ...item, complete: true }
          : item,
      );
      const customsTransit: DjiboutiReleaseRecord['customsTransit'] = {
        ...record.customsTransit,
        customsCleared: true,
        customsNoteStatus: 'Approved',
        inspectionStatus: 'Cleared',
        transitPacketComplete: true,
      };
      const currentStage: DjiboutiReleaseRecord['currentStage'] = isGateOutReady({
        ...record,
        customsTransit,
      })
        ? 'Gate-out ready'
        : 'Transit document pending';
      const next = {
        ...record,
        customsStatus: 'Cleared' as const,
        customsTransit,
        handoff: {
          ...record.handoff,
          packetItems: handoffPacketItems,
        },
        currentStage,
        releaseStatus: 'Release in progress' as const,
        lastUpdated: '2026-03-19T18:38:00Z',
        releaseBlockers: record.releaseNoteUploaded ? 'Gate pass approval remains the final release control.' : 'Release note and gate pass still need to be closed.',
        exceptions: record.exceptions.filter((item) => !item.issueText.toLowerCase().includes('customs')),
      };
      return next;
    });
  }

  function markGateOutReady() {
    updateSelected((record) => {
      const next = {
        ...record,
        releaseNoteUploaded: true,
        gateOutReady: true,
        storage: { ...record.storage, gatePassStatus: 'Approved' as const, terminalPickupStatus: 'Pickup can proceed today.' },
        releaseStatus: 'Gate-out ready' as const,
        currentStage: 'Gate-out ready' as const,
        lastUpdated: '2026-03-19T18:40:00Z',
        releaseBlockers: 'No release blockers remain.',
        exceptions: record.exceptions.filter((item) => !item.issueText.toLowerCase().includes('gate pass') && !item.issueText.toLowerCase().includes('release note')),
      };
      return next;
    });
  }

  function handoffToTransitor() {
    if (!selectedRecord || !isReadyForInlandHandoff(selectedRecord)) return;
    const nextRecord: DjiboutiReleaseRecord = withNormalizedHandoff({
      ...selectedRecord,
      inlandHandoffSent: true,
      currentStage: 'Waiting inland handoff',
      releaseStatus: 'Handed to dispatch',
      handoff: {
        ...selectedRecord.handoff,
        truckAssignmentStatus: 'Awaiting transitor / clearance desk',
        tripCreationStatus: 'Sent to transitor / clearance desk',
      },
      lastUpdated: '2026-03-19T18:43:00Z',
      exceptions: selectedRecord.exceptions.filter((item) => !item.issueText.toLowerCase().includes('dispatch push')),
    });
    setRecords((current) => current.map((record) => (record.id === selectedRecord.id ? nextRecord : record)));
    if (isManualDjiboutiReleaseRecord(nextRecord.id)) {
      upsertManualDjiboutiReleaseRecord(nextRecord);
    }
    syncManualDispatchFromRelease(nextRecord);
    setSelectedRecordId(nextRecord.id);
  }

  async function markDocumentsReadyForClearance() {
    if (!selectedRecord?.bookingNumber) return;
    setClearanceActionMessage('');
    try {
      const response = await apiPost<{ shipment?: CorridorShipmentDetail; message?: string }>(
        `/corridor/shipments/${encodeURIComponent(selectedRecord.bookingNumber)}/clearance/documents-ready`,
        {
          note: clearanceNote.trim(),
          notifyClearanceTeam: true,
        },
      );
      if (response.shipment) {
        setLiveShipment(response.shipment);
      } else {
        const refreshed = await apiGet<CorridorShipmentDetail>(`/corridor/shipments/${encodeURIComponent(selectedRecord.bookingNumber)}`);
        setLiveShipment(refreshed);
      }
      setClearanceActionMessage(response.message || 'Documents are now system-verified and ready for clearance.');
    } catch (error) {
      setClearanceActionMessage(error instanceof Error ? error.message : 'Unable to mark documents ready');
    }
  }

  async function downloadClearancePack() {
    if (!selectedRecord?.bookingNumber) return;
    setClearanceActionMessage('');
    try {
      const response = await apiPost<{ clearancePackUrl?: string | null; clearancePackPdfUrl?: string | null; fileName?: string }>(
        `/corridor/shipments/${encodeURIComponent(selectedRecord.bookingNumber)}/clearance-pack`,
        {},
      );
      const directUrl = response.clearancePackUrl || response.clearancePackPdfUrl;
      if (typeof window !== 'undefined') {
        if (directUrl) {
          window.open(directUrl, '_blank', 'noopener,noreferrer');
        } else {
          liveDocumentGroups.forEach((group) => {
            if (group.latest?.shipmentDocumentId) {
              openShipmentDocument(group.latest.shipmentDocumentId);
            }
          });
        }
      }
      setClearanceActionMessage(
        directUrl
          ? (response.fileName ? 'Clearance pack ready: ' + response.fileName : 'Clearance pack generated.')
          : 'Clearance pack URL is not available yet. Opened the clearance documents individually instead.',
      );
    } catch (error) {
      setClearanceActionMessage(error instanceof Error ? error.message : 'Unable to generate clearance pack');
    }
  }

  function openShipmentDocument(documentId?: string) {
    if (!documentId || typeof window === 'undefined') return;
    window.open(`${apiBase}/documents/${encodeURIComponent(documentId)}/download/resolve`, '_blank', 'noopener,noreferrer');
  }

  if (!selectedRecord) {
    return (
      <main className="shell">
        <section className="djibouti-desk-shell">
          <div className="djibouti-empty-state">No Djibouti release files are available.</div>
        </section>
      </main>
    );
  }

  const queueRows = filteredRecords;
  const gateOutReady = isGateOutReady(selectedRecord);
  const inlandReady = isReadyForInlandHandoff(selectedRecord);
  const nextActionKey = !selectedRecord.vesselArrival
    ? 'confirm-vessel-arrival'
    : !selectedRecord.dischargeTime
      ? 'confirm-discharge'
      : !selectedRecord.lineReleaseReceived
        ? 'confirm-line-release'
        : !selectedRecord.customsTransit.customsCleared || !selectedRecord.customsTransit.transitPacketComplete
          ? 'clear-customs-transit'
          : !gateOutReady
            ? 'approve-gate-out'
            : inlandReady
              ? (selectedRecord.inlandHandoffSent ? 'handoff-complete' : 'push-inland-dispatch')
              : 'finish-handoff-pack';
  const alertClass = selectedRecord.storageRisk === 'Urgent' ? 'djibouti-alert-red' : selectedRecord.storageRisk === 'Approaching' ? 'djibouti-alert-amber' : 'djibouti-alert-green';
  const checklistRows = [
    ['Vessel arrival confirmed', Boolean(selectedRecord.vesselArrival)],
    ['Discharge confirmed', Boolean(selectedRecord.dischargeTime)],
    ['Line release received', selectedRecord.lineReleaseReceived],
    ['Customs cleared', selectedRecord.customsTransit.customsCleared],
    ['Transit document complete', selectedRecord.customsTransit.transitPacketComplete],
    ['Release note uploaded', selectedRecord.releaseNoteUploaded],
    ['Gate pass ready', selectedRecord.storage.gatePassStatus === 'Approved'],
    ['Handoff packet complete', selectedRecord.handoff.handoffPacketComplete],
  ] as const;
  const nextAction = !selectedRecord.vesselArrival
    ? { title: 'Confirm vessel arrival', helper: 'Start the Djibouti release file from the actual arrival event.', href: '#djibouti-readiness' }
    : !selectedRecord.dischargeTime
      ? { title: 'Confirm discharge', helper: 'Discharge must be posted before line release and customs can progress.', href: '#djibouti-readiness' }
      : !selectedRecord.lineReleaseReceived
        ? { title: 'Capture shipping line release', helper: 'Line release is still blocking gate-out.', href: '#djibouti-readiness' }
        : !selectedRecord.customsTransit.customsCleared || !selectedRecord.customsTransit.transitPacketComplete
          ? { title: 'Clear customs and transit packet', helper: 'Transit packet and customs approval must both be complete.', href: '#djibouti-customs' }
          : !gateOutReady
            ? { title: 'Approve gate-out', helper: 'Release note and gate pass are the last gate-out controls.', href: '#djibouti-storage' }
            : !inlandReady
              ? { title: 'Finish clearance handoff pack', helper: 'Transitor cannot receive the file until the handoff packet is complete.', href: '#djibouti-handoff' }
              : { title: 'Send to transitor / clearance', helper: 'The multimodal file is ready to move into transitor clearance.', href: '#djibouti-handoff' };
  const readinessStepActive = ['confirm-vessel-arrival', 'confirm-discharge', 'confirm-line-release'].includes(nextActionKey);
  const customsStepActive = nextActionKey === 'clear-customs-transit';
  const storageStepActive = nextActionKey === 'approve-gate-out';
  const handoffStepActive = ['finish-handoff-pack', 'push-inland-dispatch'].includes(nextActionKey);
  const aiBrief = buildDjiboutiAiBrief(selectedRecord, nextAction);

  return (
    <main className="shell">
      <section className="djibouti-desk-shell">
        <header className="djibouti-desk-header">
          <div className="djibouti-desk-title">
            <span className="djibouti-desk-eyebrow">Step 3</span>
            <h1>Djibouti Release Desk</h1>
            <p>Review the origin file, track release milestones, manage free time, and hand off the cleared file to transitor / clearance.</p>
          </div>
          <div className="djibouti-desk-toolbar">
            <select value={releaseFilter} onChange={(event) => setReleaseFilter(event.target.value as any)} className="djibouti-desk-select">
              <option value="all">All release status</option>
              <option value="Awaiting release">Awaiting release</option>
              <option value="Release in progress">Release in progress</option>
              <option value="Gate-out ready">Gate-out ready</option>
              <option value="Handed to dispatch">Handed to dispatch</option>
            </select>
            <select value={customsFilter} onChange={(event) => setCustomsFilter(event.target.value as any)} className="djibouti-desk-select">
              <option value="all">All customs status</option>
              <option value="Pending">Pending</option>
              <option value="Under review">Under review</option>
              <option value="Cleared">Cleared</option>
            </select>
            <select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value as any)} className="djibouti-desk-select">
              <option value="all">All storage risk</option>
              <option value="Safe">Safe</option>
              <option value="Approaching">Approaching</option>
              <option value="Urgent">Urgent</option>
            </select>
            <select value={dateRange} onChange={(event) => setDateRange(event.target.value as any)} className="djibouti-desk-select">
              <option value="all">All dates</option>
              <option value="7d">Last 7 days</option>
              <option value="14d">Last 14 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>
        </header>

        <DjiboutiSummaryGrid cards={summaryCards} />

        <section className="djibouti-main-grid">
          <DjiboutiQueuePanel
            records={queueRows}
            selectedRecordId={selectedRecord.id}
            onSelect={setSelectedRecordId}
          />

          <div className="djibouti-workspace">
            <div className="djibouti-primary-column">
              <DjiboutiSelectedFileHeader selectedRecord={selectedRecord} selectedIndex={selectedIndex} />

              <article className="djibouti-panel djibouti-command-panel">
                <header className="djibouti-panel-header">
                  <div>
                    <span className="djibouti-panel-eyebrow">Command</span>
                    <h2>Next action and release guidance</h2>
                  </div>
                </header>
                <div className="djibouti-command-grid">
                  <div className="djibouti-command-card djibouti-command-card-primary supplier-next-step-button">
                    <span className="djibouti-panel-eyebrow">Next action</span>
                    <strong>{nextAction.title}</strong>
                    <p>{nextAction.helper}</p>
                    <a className="djibouti-command-link" href={nextAction.href}>Open required section</a>
                  </div>
                  <div className="djibouti-command-card">
                    <span className="djibouti-panel-eyebrow">File state</span>
                    <strong>{gateOutReady ? 'Ready for clearance handoff' : 'Release still in progress'}</strong>
                    <p>{inlandReady ? 'Transitor / clearance handoff can proceed.' : nextAction.helper}</p>
                  </div>
                  <div className="djibouti-command-card">
                    <span className="djibouti-panel-eyebrow">Jump to</span>
                    <div className="djibouti-jump-links">
                      <a className="djibouti-jump-link" href="#djibouti-readiness">Readiness</a>
                      <a className="djibouti-jump-link" href="#djibouti-customs">Customs</a>
                      <a className="djibouti-jump-link" href="#djibouti-storage">Gate-out</a>
                      <a className="djibouti-jump-link" href="#djibouti-handoff">Handoff</a>
                      <a className="djibouti-jump-link" href="#djibouti-document-center">Document Center</a>
                      <a className="djibouti-jump-link" href="#djibouti-checklist">Checklist</a>
                    </div>
                  </div>
                </div>
              </article>

              <article className={`djibouti-panel djibouti-panel-wide ${activeStepPanelClass(readinessStepActive)}`} id="djibouti-readiness">
                <header className="djibouti-panel-header">
                  <div>
                    <span className={`djibouti-panel-eyebrow ${activeStepPanelClass(readinessStepActive)}`}>Step 1-3</span>
                    <h2>Release Readiness</h2>
                  </div>
                </header>
                <div className="djibouti-detail-summary">
                  <div className="djibouti-detail-item"><span>Vessel arrived</span><strong>{selectedRecord.vesselArrival ? 'Yes' : 'No'}</strong></div>
                  <div className="djibouti-detail-item"><span>Discharge confirmed</span><strong>{selectedRecord.dischargeTime ? 'Yes' : 'No'}</strong></div>
                  <div className="djibouti-detail-item"><span>Line release received</span><strong>{selectedRecord.lineReleaseReceived ? 'Yes' : 'No'}</strong></div>
                  <div className="djibouti-detail-item"><span>Gate-out readiness</span><strong>{gateOutReady ? 'Ready' : 'Pending'}</strong></div>
                  <div className="djibouti-detail-item"><span>Release owner</span><strong>{selectedRecord.releaseOwner}</strong></div>
                  <div className="djibouti-detail-item"><span>Release deadline</span><strong>{formatDate(selectedRecord.releaseDeadline)}</strong></div>
                  <div className="djibouti-detail-item"><span>Expected gate-out</span><strong>{formatDate(selectedRecord.expectedGateOutTime)}</strong></div>
                </div>
                <div className="djibouti-inline-actions">
                  <button type="button" className={`djibouti-desk-button djibouti-desk-button-secondary ${nextStepClass(nextActionKey === 'confirm-vessel-arrival')}`} onClick={confirmVesselArrived} data-testid="djibouti-confirm-vessel-arrived">Confirm vessel arrived</button>
                  <button type="button" className={`djibouti-desk-button djibouti-desk-button-secondary ${nextStepClass(nextActionKey === 'confirm-discharge')}`} onClick={confirmDischarge} data-testid="djibouti-confirm-discharge">Confirm discharge</button>
                  <button type="button" className={`djibouti-desk-button djibouti-desk-button-secondary ${nextStepClass(nextActionKey === 'confirm-line-release')}`} onClick={confirmLineRelease} data-testid="djibouti-confirm-line-release">Confirm line release</button>
                  <button type="button" className={`djibouti-desk-button djibouti-desk-button-primary ${nextStepClass(nextActionKey === 'approve-gate-out')}`} onClick={markGateOutReady} data-testid="djibouti-mark-gate-out-ready">Mark gate-out ready</button>
                </div>
              </article>

              <article className={`djibouti-panel djibouti-panel-wide ${activeStepPanelClass(customsStepActive)}`} id="djibouti-customs">
                <header className="djibouti-panel-header">
                  <div>
                    <span className={`djibouti-panel-eyebrow ${activeStepPanelClass(customsStepActive)}`}>Step 4</span>
                    <h2>Customs &amp; Transit</h2>
                  </div>
                </header>
                <div className="djibouti-detail-summary">
                  <div className="djibouti-detail-item"><span>Declaration reference</span><strong>{selectedRecord.customsTransit.declarationReference}</strong></div>
                  <div className="djibouti-detail-item"><span>Transit document type</span><strong>{selectedRecord.customsTransit.transitType}</strong></div>
                  <div className="djibouti-detail-item"><span>Transit document number</span><strong>{selectedRecord.customsTransit.transitNumber}</strong></div>
                  <div className="djibouti-detail-item"><span>Inspection status</span><strong>{selectedRecord.customsTransit.inspectionStatus}</strong></div>
                  <div className="djibouti-detail-item"><span>Customs note status</span><strong>{selectedRecord.customsTransit.customsNoteStatus}</strong></div>
                  <div className="djibouti-detail-item"><span>Released from customs</span><strong>{selectedRecord.customsTransit.customsCleared ? 'Yes' : 'No'}</strong></div>
                  <div className="djibouti-detail-item"><span>Duty / tax</span><strong>{selectedRecord.customsTransit.dutyTaxNote}</strong></div>
                  <div className="djibouti-detail-item"><span>Bond / guarantee</span><strong>{selectedRecord.customsTransit.bondGuaranteeNote}</strong></div>
                </div>
                <div className="djibouti-inline-actions">
                  <button type="button" className="djibouti-desk-button djibouti-desk-button-secondary">View customs note</button>
                  <button type="button" className="djibouti-desk-button djibouti-desk-button-secondary">Upload customs file</button>
                  <button type="button" className={`djibouti-desk-button djibouti-desk-button-secondary ${nextStepClass(nextActionKey === 'clear-customs-transit')}`} onClick={markCustomsCleared} data-testid="djibouti-mark-customs-cleared">Mark customs cleared</button>
                  <button type="button" className={`djibouti-desk-button djibouti-desk-button-primary ${nextStepClass(nextActionKey === 'clear-customs-transit')}`} onClick={markCustomsCleared} data-testid="djibouti-mark-transit-packet-complete">Mark transit packet complete</button>
                </div>
              </article>

              <article className={`djibouti-panel ${activeStepPanelClass(storageStepActive)}`} id="djibouti-storage">
              <header className="djibouti-panel-header">
                <div>
                  <span className={`djibouti-panel-eyebrow ${activeStepPanelClass(storageStepActive)}`}>Step 5-6</span>
                  <h2>Storage, Free Time &amp; Gate-Out</h2>
                </div>
              </header>
              <div className={`djibouti-alert-strip ${alertClass}`}>
                <strong>{selectedRecord.storage.warningText}</strong>
                <span>{selectedRecord.storage.terminalPickupStatus}</span>
              </div>
                <div className="djibouti-detail-summary">
                  <div className="djibouti-detail-item"><span>Terminal / depot</span><strong>{selectedRecord.storage.terminalDepot}</strong></div>
                  <div className="djibouti-detail-item"><span>Free-time start</span><strong>{formatDate(selectedRecord.storage.freeTimeStart)}</strong></div>
                  <div className="djibouti-detail-item"><span>Free-time end</span><strong>{formatDate(selectedRecord.storage.freeTimeEnd)}</strong></div>
                  <div className="djibouti-detail-item"><span>Time remaining</span><strong>{selectedRecord.storage.timeRemainingHours} hours</strong></div>
                  <div className="djibouti-detail-item"><span>Storage risk level</span><strong>{selectedRecord.storageRisk}</strong></div>
                  <div className="djibouti-detail-item"><span>Gate pass status</span><strong>{selectedRecord.storage.gatePassStatus}</strong></div>
                  <div className="djibouti-detail-item"><span>Terminal pickup status</span><strong>{selectedRecord.storage.terminalPickupStatus}</strong></div>
                </div>
                <div className="djibouti-inline-actions">
                  <button type="button" className="djibouti-desk-button djibouti-desk-button-secondary">Escalate release</button>
                  <button type="button" className="djibouti-desk-button djibouti-desk-button-secondary">Send reminder</button>
                  <button
                    type="button"
                    className="djibouti-desk-button djibouti-desk-button-secondary console-download-button"
                    onClick={() =>
                      downloadDjiboutiGatePassPdf({
                        fileName: `${selectedRecord.bookingNumber.toLowerCase()}-gate-pass.pdf`,
                        bookingNumber: selectedRecord.bookingNumber,
                        blNumber: selectedRecord.blNumber,
                        containerNumber: selectedRecord.containerNumber,
                        sealNumber: selectedRecord.sealNumber,
                        customerName: selectedRecord.customerName,
                        vesselName: selectedRecord.vesselName,
                        voyageNumber: selectedRecord.voyageNumber,
                        dischargePort: selectedRecord.dischargePort,
                        terminalDepot: selectedRecord.storage.terminalDepot,
                        finalDestination: selectedRecord.finalDestination,
                        releaseOwner: selectedRecord.releaseOwner,
                        expectedGateOutTime: selectedRecord.expectedGateOutTime,
                        gatePassStatus: selectedRecord.storage.gatePassStatus,
                        pickupStatus: selectedRecord.storage.terminalPickupStatus,
                      })
                    }
                  >
                    Download gate pass
                  </button>
                  <button type="button" className={`djibouti-desk-button djibouti-desk-button-secondary ${nextStepClass(nextActionKey === 'approve-gate-out')}`} onClick={markGateOutReady}>Approve gate-out</button>
                </div>
              </article>

              <article className="djibouti-panel djibouti-panel-wide" id="djibouti-document-center">
                <header className="djibouti-panel-header">
                  <div>
                    <span className="djibouti-panel-eyebrow">System source of truth</span>
                    <h2>Document Center &amp; Clearance Readiness</h2>
                  </div>
                  <p>{liveShipmentLoading ? 'Loading live shipment file…' : effectiveDocumentsReady ? 'Clearance handoff is ready for this file.' : 'Clearance is blocked until required documents are verified.'}</p>
                </header>
                {liveShipmentError ? (
                  <div className={`shipping-phase-note ${manualReleaseCompatibility ? '' : 'is-blocked'}`}>
                    <strong>{manualReleaseCompatibility ? 'Manual clearance handoff file' : 'System document center unavailable'}</strong>
                    <p>{manualReleaseCompatibility ? 'This file is already ready for clearance handoff from the Djibouti desk. Manual handoff data is active even though the live shipment document center is not linked yet.' : liveShipmentError}</p>
                  </div>
                ) : null}
                <div className="djibouti-detail-summary console-gap-bottom-md">
                  <div className="djibouti-detail-item"><span>Documents ready</span><strong>{effectiveDocumentsReady ? 'Yes' : 'No'}</strong></div>
                  <div className="djibouti-detail-item"><span>Workflow state</span><strong>{formatWorkflowLabel(liveShipment?.clearance?.clearanceWorkflowStatus)}</strong></div>
                  <div className="djibouti-detail-item"><span>Marked at</span><strong>{formatDate(liveShipment?.clearance?.documentsReadyAt || '')}</strong></div>
                  <div className="djibouti-detail-item"><span>Marked by</span><strong>{liveShipment?.clearance?.documentsReadyMarkedBy || 'Pending'}</strong></div>
                  <div className="djibouti-detail-item"><span>Missing documents</span><strong>{liveMissingTags.size}</strong></div>
                  <div className="djibouti-detail-item"><span>Missing fields</span><strong>{liveMissingFields.length || 0}</strong></div>
                </div>
                <div className="djibouti-checklist console-gap-bottom-md">
                  {Object.entries(clearanceDocumentLabels).map(([tag, label]) => {
                    const group = liveDocumentGroups.find((item) => item.tag === tag);
                    const latest = group?.latest;
                    const ready = Boolean(latest) && ['verified', 'locked'].includes(String(latest?.status || '').toLowerCase());
                    const className = ready ? 'djibouti-check-item is-complete' : liveMissingTags.has(tag) ? 'djibouti-check-item is-blocked' : 'djibouti-check-item is-pending';
                    return (
                      <div key={tag} className={className}>
                        <span>{label}</span>
                        <strong>{ready ? latest?.fileName || 'Verified' : latest?.status ? String(latest.status).replace(/_/g, ' ') : 'Missing'}</strong>
                      </div>
                    );
                  })}
                </div>
                {!!liveBlockedReasons.length && (
                  <div className="corridor-panel-rows console-gap-bottom-md">
                    {liveBlockedReasons.map((reason) => (
                      <div key={reason} className="corridor-row corridor-row-warning">
                        <span>Blocked reason</span>
                        <strong>{reason}</strong>
                      </div>
                    ))}
                  </div>
                )}
                <div className="djibouti-inline-actions console-wrap-actions">
                  {liveDocumentGroups.map((group) => (
                    <button
                      key={group.tag}
                      type="button"
                      className="djibouti-desk-button djibouti-desk-button-secondary"
                      disabled={!group.latest?.shipmentDocumentId}
                      onClick={() => openShipmentDocument(group.latest?.shipmentDocumentId)}
                    >
                      Open {documentLabel(group.tag)}
                    </button>
                  ))}
                  <button type="button" className="djibouti-desk-button djibouti-desk-button-secondary console-download-button" onClick={downloadClearancePack} disabled={!liveShipment && !manualReleaseCompatibility}>
                    Download clearance ZIP
                  </button>
                </div>
                <div className="supplier-control-grid console-gap-top-md">
                  <label className="supplier-field-block console-grid-span-full">
                    <span>Readiness note</span>
                    <textarea
                      className="supplier-desk-input"
                      rows={3}
                      value={clearanceNote}
                      onChange={(event) => setClearanceNote(event.target.value)}
                      placeholder="Optional note for the clearance team. Notification is optional; the system file is the source of truth."
                    />
                  </label>
                </div>
                <div className="djibouti-inline-actions console-gap-top-md">
                  <button
                    type="button"
                    className={`djibouti-desk-button djibouti-desk-button-primary ${nextStepClass(!effectiveDocumentsReady && !manualReleaseCompatibility)}`}
                    disabled={liveShipmentLoading || effectiveDocumentsReady || manualReleaseCompatibility}
                    onClick={markDocumentsReadyForClearance}
                  >
                    Mark documents ready for clearance
                  </button>
                </div>
                {clearanceActionMessage ? <p className="console-message">{clearanceActionMessage}</p> : null}
              </article>

              <article className={`djibouti-panel ${activeStepPanelClass(handoffStepActive)}`} id="djibouti-handoff">
              <header className="djibouti-panel-header">
                <div>
                  <span className={`djibouti-panel-eyebrow ${activeStepPanelClass(handoffStepActive)}`}>Step 6</span>
                  <h2>Handoff to Transitor / Clearance</h2>
                </div>
              </header>
              <div className="djibouti-two-column djibouti-nested-grid">
                <div className="djibouti-detail-summary">
                  <div className="djibouti-detail-item"><span>Destination corridor</span><strong>{selectedRecord.handoff.destinationCorridor}</strong></div>
                  <div className="djibouti-detail-item"><span>Dry-port / inland destination</span><strong>{selectedRecord.handoff.inlandDestination}</strong></div>
                  <div className="djibouti-detail-item"><span>Clearance owner</span><strong>{selectedRecord.handoff.dispatchOwner}</strong></div>
                  <div className="djibouti-detail-item"><span>Handoff status</span><strong>{selectedRecord.handoff.tripCreationStatus}</strong></div>
                  <div className="djibouti-detail-item"><span>Handoff packet completeness</span><strong>{selectedRecord.handoff.handoffPacketComplete ? 'Complete' : 'Incomplete'}</strong></div>
                </div>
                <div className="djibouti-packet-list">
                  {selectedRecord.handoff.packetItems.map((item) => (
                    <div key={item.label} className={item.complete ? 'djibouti-check-item is-complete' : 'djibouti-check-item is-pending'}>
                      <span>{item.label}</span>
                      <strong>{item.complete ? 'Ready' : 'Missing'}</strong>
                    </div>
                  ))}
                  <div className={selectedRecord.inlandHandoffSent ? 'djibouti-check-item is-complete' : 'djibouti-check-item is-blocked'}>
                    <span>Required sync rule</span>
                    <strong>{selectedRecord.inlandHandoffSent ? 'Clearance handoff completed' : 'Dispatch stays blocked until transitor clearance is complete'}</strong>
                  </div>
                  {selectedRecord.inlandHandoffSent ? (
                    <div className="djibouti-check-item is-complete">
                      <span>Transitor / clearance handoff</span>
                      <strong>Done</strong>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="djibouti-desk-button djibouti-desk-button-secondary console-download-button"
                        onClick={() =>
                          downloadDjiboutiHandoffPdf({
                            fileName: `${selectedRecord.bookingNumber.toLowerCase()}-handoff-packet.pdf`,
                            bookingNumber: selectedRecord.bookingNumber,
                            blNumber: selectedRecord.blNumber,
                            containerNumber: selectedRecord.containerNumber,
                            customerName: selectedRecord.customerName,
                            destinationCorridor: selectedRecord.handoff.destinationCorridor,
                            inlandDestination: selectedRecord.handoff.inlandDestination,
                            dispatchOwner: selectedRecord.handoff.dispatchOwner,
                            tripCreationStatus: selectedRecord.handoff.tripCreationStatus,
                            packetItems: selectedRecord.handoff.packetItems,
                          })
                        }
                      >
                        Download handoff packet
                      </button>
                      <button
                        type="button"
                        className={`djibouti-desk-button djibouti-desk-button-primary djibouti-cta ${nextStepClass(nextActionKey === 'push-inland-dispatch')}`}
                        disabled={!inlandReady}
                        onClick={handoffToTransitor}
                        data-testid="djibouti-send-to-clearance"
                      >
                        Release to system clearance queue
                      </button>
                    </>
                  )}
                </div>
              </div>
              </article>
            </div>

            <DjiboutiReleaseSidePanels
              aiBrief={aiBrief}
              checklistRows={checklistRows}
              gateOutReady={Boolean(gateOutReady)}
              inlandReady={Boolean(inlandReady)}
              exceptions={selectedRecord.exceptions}
            />
          </div>
        </section>
      </section>
    </main>
  );
});
