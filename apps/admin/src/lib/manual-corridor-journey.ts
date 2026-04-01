import type { DispatchTripRecord, DispatchTripStatus } from './corridor-dispatch-demo-data';
import type { DjiboutiReleaseRecord } from './djibouti-release-demo-data';
import type { YardRecord } from './dry-port-yard-demo-data';
import type { SupplierDeskShipment } from './supplier-agent-demo-data';
import type { TransitorClearanceRecord } from './transitor-clearance-demo-data';
import { bookingQuoteStorageKey } from './booking-quote-demo-data';
import { type UnifiedBookingRequest } from './booking-quote-demo-data';
import { readSharedQuoteRequests } from './shared-quote-storage';
import { transitorClearanceStorageKey } from './transitor-clearance-demo-data';
import { readWorkflowState, writeWorkflowState, type WorkflowStateKey } from './workflow-state-client';

const djiboutiReleaseStorageKey = 'tikur-abay:manual-corridor:djibouti-release';
const dispatchTripStorageKey = 'tikur-abay:manual-corridor:dispatch-trips';
const yardRecordStorageKey = 'tikur-abay:manual-corridor:yard-records';
const supplierDeskStorageKey = 'tikur-abay:supplier-desk:manual-shipments';
const shippingBillsStorageKey = 'tikur-abay:shipping-phase2:bills';
const shippingManifestsStorageKey = 'tikur-abay:shipping-phase2:manifests';
export const manualCorridorStorageUpdatedEvent = 'tikur-abay:manual-corridor:storage-updated';

const workflowStateKeyByStorageKey: Partial<Record<string, WorkflowStateKey>> = {
  [djiboutiReleaseStorageKey]: 'djibouti-release',
  [dispatchTripStorageKey]: 'dispatch-trips',
  [yardRecordStorageKey]: 'yard-records',
  [transitorClearanceStorageKey]: 'transitor-clearance',
  [supplierDeskStorageKey]: 'supplier-shipments',
};

let manualWorkflowHydrationPromise: Promise<void> | null = null;
let manualWorkflowHydrationDone = false;
let cachedDjiboutiReleaseSignature = '';
let cachedDjiboutiReleaseRecords: DjiboutiReleaseRecord[] | null = null;

function isBrowser() {
  return typeof window !== 'undefined';
}

function readStoredArray<T>(key: string): T[] {
  if (!isBrowser()) return [];
  const raw = window.localStorage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    window.localStorage.removeItem(key);
    return [];
  }
}

function readStoredSnapshot(key: string) {
  if (!isBrowser()) return '';
  return window.localStorage.getItem(key) || '';
}

function writeStoredArray<T>(key: string, value: T[], detail?: Record<string, unknown>) {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
  const workflowKey = workflowStateKeyByStorageKey[key];
  if (workflowKey) {
    void writeWorkflowState(workflowKey, value).catch(() => {});
  }
  window.dispatchEvent(
    new CustomEvent(manualCorridorStorageUpdatedEvent, {
      detail: { key, ...(detail ?? {}) },
    }),
  );
}

function workflowIdentity(item: unknown) {
  if (!item || typeof item !== 'object') return '';
  const record = item as Record<string, unknown>;
  return String(
    record.id ||
    record.bookingNumber ||
    record.quoteId ||
    record.tripId ||
    record.releaseRecordId ||
    '',
  );
}

function mergeWorkflowItems<T>(localValue: T[], serverValue: T[]) {
  const merged = [...localValue];
  const seen = new Set(merged.map((item) => workflowIdentity(item)));
  serverValue.forEach((item) => {
    const key = workflowIdentity(item);
    if (key && seen.has(key)) return;
    merged.push(item);
    if (key) seen.add(key);
  });
  return merged;
}

async function runManualWorkflowHydration() {
  for (const [storageKey, workflowKey] of Object.entries(workflowStateKeyByStorageKey)) {
    if (!workflowKey) continue;
    const localValue = readStoredArray<unknown>(storageKey);
    try {
      const serverValue = await readWorkflowState<unknown>(workflowKey);
      const mergedValue =
        localValue.length > 0 && serverValue.length > 0
          ? mergeWorkflowItems(localValue, serverValue)
          : localValue.length > 0
            ? localValue
            : serverValue;
      if (mergedValue.length > 0) {
        window.localStorage.setItem(storageKey, JSON.stringify(mergedValue));
        if (JSON.stringify(mergedValue) !== JSON.stringify(serverValue)) {
          await writeWorkflowState(workflowKey, mergedValue);
        }
      }
    } catch {
      // Keep local fallback if server sync is unavailable.
    }
  }
}

export async function hydrateManualWorkflowStateFromServer(options?: { force?: boolean }) {
  if (!isBrowser()) return;
  if (options?.force) {
    manualWorkflowHydrationDone = false;
    manualWorkflowHydrationPromise = null;
  }
  if (manualWorkflowHydrationDone) return;
  if (!manualWorkflowHydrationPromise) {
    manualWorkflowHydrationPromise = runManualWorkflowHydration()
      .then(() => {
        manualWorkflowHydrationDone = true;
      })
      .finally(() => {
        manualWorkflowHydrationPromise = null;
      });
  }
  await manualWorkflowHydrationPromise;
}

function readStoredRecord<T>(key: string): Record<string, T> {
  if (!isBrowser()) return {};
  const raw = window.localStorage.getItem(key);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, T>;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    window.localStorage.removeItem(key);
    return {};
  }
}

function upsertById<T extends { id: string }>(items: T[], next: T) {
  const existingIndex = items.findIndex((item) => item.id === next.id);
  if (existingIndex === -1) return [next, ...items];
  return items.map((item, index) => (index === existingIndex ? next : item));
}

function upsertReleaseByBooking(items: DjiboutiReleaseRecord[], next: DjiboutiReleaseRecord) {
  const existingIndex = items.findIndex((item) => item.bookingNumber === next.bookingNumber);
  if (existingIndex === -1) return [next, ...items];
  return items.map((item, index) => (index === existingIndex ? next : item));
}

function upsertDispatchByBooking(items: DispatchTripRecord[], next: DispatchTripRecord) {
  const existingIndex = items.findIndex((item) => item.bookingNumber === next.bookingNumber);
  if (existingIndex === -1) return [next, ...items];
  return items.map((item, index) => (index === existingIndex ? next : item));
}

function upsertDispatchByTripId(items: DispatchTripRecord[], next: DispatchTripRecord) {
  const existingIndex = items.findIndex((item) => item.tripId === next.tripId || item.id === next.id);
  if (existingIndex === -1) return [next, ...items];
  return items.map((item, index) => (index === existingIndex ? next : item));
}

function mergeById<T extends { id: string }>(manual: T[], seeded: T[]) {
  const manualIds = new Set(manual.map((item) => item.id));
  return [...manual, ...seeded.filter((item) => !manualIds.has(item.id))];
}

function compareReferenceOrder(left: string | undefined, right: string | undefined) {
  const leftKey = String(left || '').replace(/\D/g, '');
  const rightKey = String(right || '').replace(/\D/g, '');
  if (leftKey.length !== rightKey.length) return rightKey.length - leftKey.length;
  return rightKey.localeCompare(leftKey);
}

function sortReleaseRecords(records: DjiboutiReleaseRecord[]) {
  return [...records].sort((left, right) => {
    const bookingDelta = compareReferenceOrder(left.bookingNumber, right.bookingNumber);
    if (bookingDelta !== 0) return bookingDelta;
    return compareReferenceOrder(left.blNumber, right.blNumber);
  });
}

function sortDispatchTrips(trips: DispatchTripRecord[]) {
  return [...trips].sort((left, right) => {
    const bookingDelta = compareReferenceOrder(left.bookingNumber, right.bookingNumber);
    if (bookingDelta !== 0) return bookingDelta;
    return compareReferenceOrder(left.tripId, right.tripId);
  });
}

function dedupeDispatchTripsByBooking(trips: DispatchTripRecord[]) {
  return trips.reduce((current, trip) => upsertDispatchByBooking(current, trip), [] as DispatchTripRecord[]);
}

function dedupeDispatchTripsByTripId(trips: DispatchTripRecord[]) {
  return trips.reduce((current, trip) => upsertDispatchByTripId(current, trip), [] as DispatchTripRecord[]);
}

function isEmptyReturnTrip(trip: DispatchTripRecord) {
  return trip.tripId.startsWith('ERT-') || trip.routeType.toLowerCase().includes('empty return');
}

function sortYardRecords(records: YardRecord[]) {
  return [...records].sort((left, right) => {
    const bookingDelta = compareReferenceOrder(left.bookingNumber, right.bookingNumber);
    if (bookingDelta !== 0) return bookingDelta;
    return compareReferenceOrder(left.tripId, right.tripId);
  });
}

function resolveDryPort(destination: string) {
  return destination.toLowerCase().includes('combolcha') ? 'Combolcha Dry Port' : 'Adama Dry Port';
}

function resolveCorridor(destination: string) {
  return destination.includes('Combolcha') ? 'Djibouti -> Galafi -> Combolcha' : 'Djibouti -> Galafi -> Adama';
}

function resolveDispatchOwner(destination: string) {
  return destination.includes('Combolcha') ? 'Combolcha Corridor Control' : 'Adama Corridor Control';
}

function buildReferenceFromBooking(prefix: string, bookingNumber: string) {
  return `${prefix}-${bookingNumber.replace(/^TB-/, '').replace(/[^A-Za-z0-9-]/g, '-')}`;
}

function normalizeDateTime(value: string | undefined, fallback: string) {
  if (!value || value === '-') return fallback;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();

  const normalized = value.replace(/^(\d{3})(-\d{2}-\d{2})/, '2$1$2');
  const reparsed = new Date(normalized);
  if (!Number.isNaN(reparsed.getTime())) return reparsed.toISOString();

  return fallback;
}

function deriveManualBillNumber(shipment: SupplierDeskShipment) {
  const finalBl = shipment.documents.find((document) => document.type === 'Final BL');
  const draftBl = shipment.documents.find((document) => document.type === 'BL draft');
  const bookingSuffix = shipment.bookingNumber.replace(/^BK-/, '').replace(/^TAB-/, '').trim() || shipment.id;
  const candidates = [
    finalBl?.referenceNumber,
    shipment.handoff.houseBlNumber,
    shipment.handoff.carrierBlNumber,
    draftBl?.referenceNumber,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .filter((value) => value !== '-' && !/\.[a-z0-9]{2,8}$/i.test(value));

  return candidates[0] || `HBL-${bookingSuffix}`;
}

function buildManualReleaseRecord(shipment: SupplierDeskShipment): DjiboutiReleaseRecord {
  const inlandDestination = resolveDryPort(shipment.finalDestination);
  const transitDocument = shipment.documents.find((document) => document.type === 'Export permit / customs doc');
  const releaseNote = shipment.documents.find((document) => document.type === 'Final BL');
  const gateOutTarget = normalizeDateTime(
    shipment.etaDjibouti,
    new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  );

  const packetItems: DjiboutiReleaseRecord['handoff']['packetItems'] = [
    { label: 'BL', complete: shipment.handoff.blStatus === 'Final uploaded' },
    { label: 'Invoice', complete: shipment.documents.some((document) => document.type === 'Commercial invoice' && document.status !== 'missing') },
    { label: 'Packing list', complete: shipment.documents.some((document) => document.type === 'Packing list' && document.status !== 'missing') },
    { label: 'Transit/customs doc', complete: Boolean(transitDocument && transitDocument.status !== 'missing') },
    { label: 'Release note', complete: Boolean(releaseNote && releaseNote.status !== 'missing') },
    { label: 'Container + seal', complete: Boolean(shipment.container.containerNumber && shipment.container.sealNumber) },
    { label: 'Customer contact', complete: Boolean(shipment.customerName) },
    { label: 'Special handling notes', complete: true },
  ];

  return {
    id: `manual-release-${shipment.id}`,
    bookingNumber: shipment.bookingNumber,
    blNumber: deriveManualBillNumber(shipment),
    containerNumber: shipment.container.containerNumber,
    sealNumber: shipment.container.sealNumber,
    customerName: shipment.customerName,
    serviceType: shipment.serviceType,
    vesselName: shipment.handoff.vesselName,
    voyageNumber: shipment.handoff.voyageNumber,
    dischargePort: shipment.dischargePort,
    finalDestination: shipment.finalDestination,
    currentStage: 'Vessel arrived',
    assignedAgent: 'Manual Djibouti desk',
    lastUpdated: new Date().toISOString(),
    vesselArrival: '',
    dischargeTime: '',
    etaSummary: `Ocean handoff received · ETA ${shipment.etaDjibouti !== '-' ? shipment.etaDjibouti : 'pending'}`,
    releaseStatus: 'Awaiting release',
    customsStatus: 'Pending',
    storageRisk: 'Approaching',
    lineReleaseReceived: false,
    terminalReleaseReady: false,
    customsHold: false,
    releaseNoteUploaded: Boolean(releaseNote && releaseNote.status !== 'missing'),
    gateOutReady: false,
    inlandHandoffSent: false,
    releaseOwner: 'Manual Djibouti desk',
    releaseDeadline: gateOutTarget,
    expectedGateOutTime: gateOutTarget,
    releaseBlockers: 'Vessel arrival, discharge, customs clearance, and gate pass still need confirmation.',
    customsTransit: {
      declarationReference: 'Pending declaration',
      transitType: 'T1',
      transitNumber: transitDocument?.referenceNumber && transitDocument.referenceNumber !== '-' ? transitDocument.referenceNumber : 'Pending transit number',
      inspectionStatus: 'Pending',
      customsNoteStatus: transitDocument && transitDocument.status !== 'missing' ? 'Uploaded' : 'Missing',
      customsCleared: false,
      dutyTaxNote: 'Customer final destination remains customer location. Hold at Adama Dry Port if customs clearance is not completed.',
      bondGuaranteeNote: 'Transit bond note still pending Djibouti clearance.',
      transitPacketComplete: Boolean(transitDocument && transitDocument.status !== 'missing'),
    },
    storage: {
      terminalDepot: 'Djibouti Port Terminal',
      freeTimeStart: gateOutTarget,
      freeTimeEnd: new Date(new Date(gateOutTarget).getTime() + 48 * 60 * 60 * 1000).toISOString(),
      timeRemainingHours: 48,
      warningText: 'Free-time window created. Gate-out should complete before detention exposure.',
      gatePassStatus: 'Pending',
      terminalPickupStatus: 'Pickup blocked until release controls are complete.',
    },
    handoff: {
      destinationCorridor: resolveCorridor(inlandDestination),
      inlandDestination,
      dispatchOwner: resolveDispatchOwner(inlandDestination),
      truckAssignmentStatus: 'Awaiting push to dispatch',
      tripCreationStatus: 'Not created',
      handoffPacketComplete: packetItems.every((item) => item.complete),
      packetItems,
    },
    exceptions: [
      {
        id: `manual-release-exception-${shipment.id}`,
        severity: 'Medium',
        issueText: 'Manual release file created from origin handoff. Finish vessel arrival, customs, and gate-out before inland dispatch.',
        actionLabel: 'Process release',
      },
    ],
  };
}

type ShippingBillSnapshot = {
  bookingId: string;
  status?: 'draft' | 'approved' | 'final';
  vesselName?: string;
  voyageNumber?: string;
  carrierName?: string;
  slotCarrierBillNumber?: string;
  shipperName?: string;
  consigneeName?: string;
  notifyParty?: string;
  marksAndNumbers?: string;
  containerNumber?: string;
  sealNumber?: string;
  packageSummary?: string;
  cargoDescription?: string;
  hsCode?: string;
  consigneeTinNumber?: string;
  tinAreaCode?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  placeOfDelivery?: string;
  issueDate?: string;
};

type ShippingManifestSnapshot = {
  bookingId: string;
  status?: 'pending' | 'generated';
  manifestId?: string;
  vesselName?: string;
  voyageNumber?: string;
  portOfDischarge?: string;
  placeOfDelivery?: string;
  sailingDate?: string;
  slotCarrierWaybillNumber?: string;
  containerNumber?: string;
  sealNumber?: string;
  packageSummary?: string;
  goodsDescription?: string;
  hsCode?: string;
  tinNo?: string;
  areaCode?: string;
  generatedAt?: string;
};

function buildShippingDerivedReleaseRecord(
  request: UnifiedBookingRequest,
  bill?: ShippingBillSnapshot,
  manifest?: ShippingManifestSnapshot,
): DjiboutiReleaseRecord {
  const inlandDestination = resolveDryPort(request.finalDeliveryLocation || request.inlandDestination || '');
  const vesselName = manifest?.vesselName || bill?.vesselName || request.vesselName || `${request.portOfLoading} Service`;
  const voyageNumber = manifest?.voyageNumber || bill?.voyageNumber || request.voyageNumber || `VOY-${request.bookingId?.replace(/^BK-/, '') || request.quoteId}`;
  const dischargePort = manifest?.portOfDischarge || bill?.portOfDischarge || request.portOfDischarge || 'Djibouti Port';
  const releaseTime =
    manifest?.generatedAt ||
    bill?.issueDate ||
    request.updatedAt ||
    new Date().toISOString();
  const gateOutTarget = normalizeDateTime(
    request.requestedArrivalWindow,
    new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  );
  const packetItems: DjiboutiReleaseRecord['handoff']['packetItems'] = [
    { label: 'BL', complete: bill?.status === 'final' || manifest?.status === 'generated' },
    { label: 'Invoice', complete: true },
    { label: 'Packing list', complete: true },
    { label: 'Transit/customs doc', complete: Boolean(request.bankPermitNumber || request.lcNumber) },
    { label: 'Release note', complete: bill?.status === 'final' || manifest?.status === 'generated' },
    { label: 'Container + seal', complete: Boolean((manifest?.containerNumber || bill?.containerNumber) && (manifest?.sealNumber || bill?.sealNumber)) },
    { label: 'Customer contact', complete: Boolean(request.customerName) },
    { label: 'Special handling notes', complete: true },
  ];

  return {
    id: `manual-release-shipping-${request.bookingId}`,
    bookingNumber: request.bookingId,
    blNumber: bill?.slotCarrierBillNumber || (request.bookingId ? `HBL-${request.bookingId}` : request.quoteId),
    containerNumber: manifest?.containerNumber || bill?.containerNumber || '',
    sealNumber: manifest?.sealNumber || bill?.sealNumber || '',
    customerName: request.customerName,
    serviceType: request.serviceType,
    vesselName,
    voyageNumber,
    dischargePort,
    finalDestination: request.finalDeliveryLocation || request.inlandDestination,
    currentStage: 'Vessel arrived',
    assignedAgent: 'Djibouti release auto-sync',
    lastUpdated: releaseTime,
    vesselArrival: releaseTime,
    dischargeTime: '',
    etaSummary: `Shipping packet synchronized from ${manifest?.status === 'generated' ? 'generated manifest' : 'final BL'} state.`,
    releaseStatus: 'Awaiting release',
    customsStatus: 'Pending',
    storageRisk: 'Approaching',
    lineReleaseReceived: false,
    terminalReleaseReady: false,
    customsHold: false,
    releaseNoteUploaded: bill?.status === 'final' || manifest?.status === 'generated',
    gateOutReady: false,
    inlandHandoffSent: false,
    releaseOwner: 'Djibouti release desk',
    releaseDeadline: gateOutTarget,
    expectedGateOutTime: gateOutTarget,
    releaseBlockers: 'Release file auto-created from shipping completion. Vessel discharge, line release, customs clearance, and gate pass still need confirmation.',
    customsTransit: {
      declarationReference: 'Pending declaration',
      transitType: 'T1',
      transitNumber: request.bankPermitNumber || request.lcNumber || 'Pending transit number',
      inspectionStatus: 'Pending',
      customsNoteStatus: request.bankPermitNumber || request.lcNumber ? 'Uploaded' : 'Missing',
      customsCleared: false,
      dutyTaxNote: 'Customer final destination remains customer location until customs and gate-out are cleared.',
      bondGuaranteeNote: 'Transit bond note still pending Djibouti clearance.',
      transitPacketComplete: Boolean(request.bankPermitNumber || request.lcNumber),
    },
    storage: {
      terminalDepot: 'Djibouti Port Terminal',
      freeTimeStart: gateOutTarget,
      freeTimeEnd: new Date(new Date(gateOutTarget).getTime() + 48 * 60 * 60 * 1000).toISOString(),
      timeRemainingHours: 48,
      warningText: 'Release file was auto-created from shipping progression. Confirm arrival and gate-out to avoid detention exposure.',
      gatePassStatus: 'Pending',
      terminalPickupStatus: 'Pickup blocked until release controls are complete.',
    },
    handoff: {
      destinationCorridor: resolveCorridor(inlandDestination),
      inlandDestination,
      dispatchOwner: resolveDispatchOwner(inlandDestination),
      truckAssignmentStatus: 'Awaiting push to dispatch',
      tripCreationStatus: 'Not created',
      handoffPacketComplete: packetItems.every((item) => item.complete),
      packetItems,
    },
    exceptions: [
      {
        id: `manual-release-shipping-exception-${request.bookingId}`,
        severity: 'Medium',
        issueText: 'Release file was auto-created from shipping BL/manifest state. Confirm vessel discharge and customs controls before dispatch.',
        actionLabel: 'Process release',
      },
    ],
  };
}

function hydrateReleaseFromDownstream(record: DjiboutiReleaseRecord): DjiboutiReleaseRecord {
  const yardRecord = readManualYardRecords().find((item) => item.bookingNumber === record.bookingNumber);
  if (yardRecord && (yardRecord.yardStage === 'Cycle closed' || yardRecord.emptyReturn.status === 'Cycle closed')) {
    const closedRecord: DjiboutiReleaseRecord = {
      ...record,
      currentStage: 'Waiting inland handoff',
      releaseStatus: 'Handed to dispatch',
      customsStatus: 'Cleared',
      vesselArrival: record.vesselArrival || yardRecord.lastUpdated,
      dischargeTime: record.dischargeTime || yardRecord.lastUpdated,
      lineReleaseReceived: true,
      terminalReleaseReady: true,
      releaseNoteUploaded: true,
      gateOutReady: true,
      inlandHandoffSent: true,
      lastUpdated: yardRecord.lastUpdated || record.lastUpdated,
      etaSummary: yardRecord.etaSummary || 'Shipment cycle closed downstream.',
      releaseBlockers: 'Release lifecycle completed downstream and the file is closed.',
      customsTransit: {
        ...record.customsTransit,
        customsCleared: true,
        customsNoteStatus: 'Approved',
        inspectionStatus: 'Cleared',
        transitPacketComplete: true,
      },
      storage: {
        ...record.storage,
        gatePassStatus: 'Approved',
        terminalPickupStatus: 'Closed downstream',
      },
      handoff: {
        ...record.handoff,
        truckAssignmentStatus: 'Closed downstream',
        tripCreationStatus: 'Closed downstream',
        handoffPacketComplete: true,
        packetItems: record.handoff.packetItems.map((item) => ({ ...item, complete: true })),
      },
      exceptions: [],
    };
    return closedRecord;
  }

  const dispatchTrip = readManualDispatchTrips().find((trip) => trip.bookingNumber === record.bookingNumber);
  if (!dispatchTrip) return record;

  const gateOutTime = record.expectedGateOutTime || dispatchTrip.plannedDepartureTime || new Date().toISOString();
  const releasedRecord: DjiboutiReleaseRecord = {
    ...record,
    currentStage: 'Waiting inland handoff',
    releaseStatus: 'Handed to dispatch',
    customsStatus: 'Cleared',
    vesselArrival: record.vesselArrival || gateOutTime,
    dischargeTime: record.dischargeTime || gateOutTime,
    lineReleaseReceived: true,
    terminalReleaseReady: true,
    releaseNoteUploaded: true,
    gateOutReady: true,
    inlandHandoffSent: true,
    lastUpdated: dispatchTrip.lastUpdated || record.lastUpdated,
    etaSummary: dispatchTrip.etaSummary || record.etaSummary,
    releaseBlockers: 'No release blockers remain.',
    customsTransit: {
      ...record.customsTransit,
      customsCleared: true,
      customsNoteStatus: 'Approved',
      inspectionStatus: 'Cleared',
      transitPacketComplete: true,
    },
    storage: {
      ...record.storage,
      gatePassStatus: 'Approved',
      terminalPickupStatus: 'Pickup can proceed today.',
    },
    handoff: {
      ...record.handoff,
      truckAssignmentStatus: dispatchTrip.assignedTruck === 'Not assigned' ? 'Awaiting dispatch allocation' : dispatchTrip.assignedTruck,
      tripCreationStatus: 'Dispatch packet sent',
      handoffPacketComplete: true,
      packetItems: record.handoff.packetItems.map((item) => ({ ...item, complete: true })),
    },
    exceptions: record.exceptions.filter((item) => item.severity !== 'High' && item.severity !== 'Medium'),
  };

  return releasedRecord;
}

function buildManualDispatchTrip(record: DjiboutiReleaseRecord): DispatchTripRecord {
  const tripId = buildReferenceFromBooking('TRP', record.bookingNumber);
  const expectedArrivalTime = record.expectedGateOutTime || new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString();

  return {
    id: `manual-dispatch-${record.id}`,
    tripId,
    bookingNumber: record.bookingNumber,
    blNumber: record.blNumber,
    containerNumber: record.containerNumber,
    sealNumber: record.sealNumber,
    customerName: record.customerName,
    serviceType: record.serviceType,
    corridorRoute: `${record.dischargePort} -> Galafi -> ${record.handoff.inlandDestination}`,
    originHandoffPoint: `${record.dischargePort} Gate`,
    inlandDestination: record.handoff.inlandDestination,
    currentTripStatus: 'Awaiting truck assignment',
    assignedDispatchOwner: record.handoff.dispatchOwner,
    assignedTruck: 'Not assigned',
    assignedTrailer: 'Pending trailer',
    assignedDriver: 'Pending driver',
    driverType: 'Internal',
    partnerName: 'Tikur Abay Fleet',
    plannedDepartureTime: record.expectedGateOutTime,
    cargoLoadedAt: '',
    departedDjiboutiAt: '',
    expectedArrivalTime,
    routeType: record.handoff.inlandDestination.includes('Combolcha') ? 'Djibouti to Combolcha corridor' : 'Djibouti to Adama corridor',
    dispatchNote: `Manual release handoff from Djibouti for ${record.customerName}. Final customer location remains customer site after dry-port release.`,
    handoffSource: 'Multimodal / Djibouti Release Desk / Manual handoff',
    etaSummary: `Awaiting trip creation for ${record.handoff.inlandDestination}`,
    driverStatus: 'Awaiting assignment',
    issueChip: null,
    delayRisk: 'Low',
    lastGpsTimestamp: 'Not started',
    lastUpdated: new Date().toISOString(),
    transitPack: {
      packetComplete: record.handoff.packetItems.every((item) => item.complete),
      mobileSyncStatus: 'Not synced',
      driverAcknowledgement: 'Waiting driver assignment',
      lastPacketUpdate: record.lastUpdated,
      qrGenerated: false,
      packetItems: [
        { label: 'BL', complete: true },
        { label: 'Packing list', complete: true },
        { label: 'Invoice summary', complete: true },
        { label: 'Transit/customs document', complete: record.customsTransit.transitPacketComplete },
        { label: 'Release note', complete: record.releaseNoteUploaded },
        { label: 'Container number', complete: Boolean(record.containerNumber) },
        { label: 'Seal number', complete: Boolean(record.sealNumber) },
        { label: 'Consignee/contact', complete: Boolean(record.customerName) },
        { label: 'Route note', complete: true },
        { label: 'Special handling note', complete: true },
        { label: 'Item summary', complete: true },
      ],
    },
    liveMovement: {
      currentLocation: record.dischargePort,
      corridorName: resolveCorridor(record.handoff.inlandDestination),
      distanceToDestinationKm: record.handoff.inlandDestination.includes('Combolcha') ? 650 : 480,
      eta: expectedArrivalTime,
      speedSummary: 'Trip has not departed yet.',
      movementHealth: 'No update risk',
    },
    checkpoints: [
      {
        id: `manual-checkpoint-${record.id}-1`,
        label: 'Gate-out from Djibouti',
        timestamp: '',
        location: `${record.dischargePort} Gate`,
        status: 'Pending',
        driverNote: 'Awaiting dispatch creation and gate-out.',
        sealConfirmed: true,
        officerNote: 'Release handoff packet prepared.',
      },
    ],
    issues: [],
    arrivalReadiness: {
      destinationNode: record.handoff.inlandDestination,
      unloadHandoffOwner: record.handoff.inlandDestination.includes('Combolcha') ? 'Combolcha yard desk' : 'Adama yard desk',
      yardContact: record.handoff.inlandDestination.includes('Combolcha') ? 'Combolcha yard desk · +251 911 440 212' : 'Adama yard desk · +251 911 440 211',
      specialHandlingInstructions: 'Keep POD and empty-return instructions visible after unload.',
      podExpectation: 'Digital POD expected after unload completion.',
      emptyReturnInstructionAvailable: true,
      arrivalNoticeSent: false,
      unloadContactConfirmed: false,
    },
  };
}

function buildManualEmptyReturnDispatchTrip(record: YardRecord): DispatchTripRecord | null {
  if (!record.emptyReturn.emptyReleaseGranted && !record.emptyReturn.emptyDepartureTime && !record.emptyReturn.emptyReturned) {
    return null;
  }

  const tripId = record.emptyReturn.returnTripId || `ERT-${record.tripId.replace(/^TRP-/, '')}`;
  const releaseTimestamp = record.emptyReturn.emptyReleaseTimestamp || record.lastUpdated || new Date().toISOString();
  const departureTimestamp = record.emptyReturn.emptyDepartureTime || '';
  const returnTimestamp = record.emptyReturn.returnTimestamp || '';
  const assignedTruck = record.emptyReturn.assignedReturnTruck || 'Pending return truck';
  const assignedTrailer = record.emptyReturn.assignedReturnTrailer || 'Pending return trailer';
  const assignedDriver = record.emptyReturn.assignedReturnDriver || 'Pending return driver';
  const currentStatus: DispatchTripStatus =
    record.emptyReturn.emptyReturned
      ? 'Empty returned'
      : record.emptyReturn.emptyDepartureTime
        ? 'Empty return in transit'
        : assignedTruck === 'Pending return truck' || assignedDriver === 'Pending return driver'
          ? 'Awaiting empty return assignment'
          : 'Awaiting empty return departure';

  return {
    id: `manual-dispatch-return-${record.id}`,
    tripId,
    bookingNumber: record.bookingNumber,
    blNumber: record.blNumber,
    containerNumber: record.containerNumber,
    sealNumber: record.sealNumber,
    customerName: record.customerName,
    serviceType: record.serviceType,
    corridorRoute: `${record.inlandNode} -> Galafi -> ${record.emptyReturn.designatedDepot || 'Djibouti Empty Depot'}`,
    originHandoffPoint: `${record.inlandNode} empty release lane`,
    inlandDestination: record.emptyReturn.designatedDepot || 'Djibouti Empty Depot',
    currentTripStatus: currentStatus,
    assignedDispatchOwner: 'Empty Return Control',
    assignedTruck,
    assignedTrailer,
    assignedDriver,
    driverType: 'Internal',
    partnerName: 'Tikur Abay Empty Return Fleet',
    plannedDepartureTime: releaseTimestamp,
    cargoLoadedAt: releaseTimestamp,
    departedDjiboutiAt: departureTimestamp,
    expectedArrivalTime:
      returnTimestamp ||
      (departureTimestamp
        ? new Date(new Date(departureTimestamp).getTime() + 24 * 60 * 60 * 1000).toISOString()
        : ''),
    routeType: 'Empty return corridor',
    dispatchNote: 'Separate empty-return trip opened after customer handoff. Return truck and driver may differ from the inbound delivery trip.',
    handoffSource: 'Yard / Empty return handoff',
    etaSummary:
      currentStatus === 'Empty returned'
        ? `Returned to ${record.emptyReturn.designatedDepot || 'Djibouti Empty Depot'}`
        : currentStatus === 'Empty return in transit'
          ? `Returning to ${record.emptyReturn.designatedDepot || 'Djibouti Empty Depot'}`
          : `Awaiting empty-return dispatch from ${record.inlandNode}`,
    driverStatus:
      currentStatus === 'Awaiting empty return assignment'
        ? 'Awaiting return driver assignment'
        : currentStatus === 'Awaiting empty return departure'
          ? 'Return driver assigned'
          : currentStatus === 'Empty returned'
            ? 'Return completed'
            : 'Empty return in progress',
    issueChip: null,
    delayRisk: record.emptyReturn.detentionRiskOpen ? 'Medium' : 'Low',
    lastGpsTimestamp: returnTimestamp || departureTimestamp || releaseTimestamp,
    lastUpdated: record.lastUpdated || new Date().toISOString(),
    emptyReturnConfirmedAt: record.emptyReturn.emptyReturned ? returnTimestamp || record.lastUpdated : '',
    transitPack: {
      packetComplete: true,
      mobileSyncStatus:
        currentStatus === 'Awaiting empty return assignment'
          ? 'Waiting assignment'
          : currentStatus === 'Awaiting empty return departure'
            ? 'Ready to sync'
            : 'Synced to mobile',
      driverAcknowledgement:
        assignedDriver === 'Pending return driver' ? 'Waiting return driver assignment' : `Acknowledged by ${assignedDriver}`,
      lastPacketUpdate: record.lastUpdated || releaseTimestamp,
      qrGenerated: assignedDriver !== 'Pending return driver' && assignedTruck !== 'Pending return truck',
      packetItems: [
        { label: 'Empty release note', complete: record.emptyReturn.emptyReleaseGranted },
        { label: 'Container number', complete: true },
        { label: 'Return driver', complete: assignedDriver !== 'Pending return driver' },
        { label: 'Return truck', complete: assignedTruck !== 'Pending return truck' },
        { label: 'Return trailer', complete: assignedTrailer !== 'Pending return trailer' },
        { label: 'Depot destination', complete: true },
      ],
    },
    liveMovement: {
      currentLocation: record.emptyReturn.currentLocation || record.inlandNode,
      corridorName: `${record.inlandNode} -> Galafi -> ${record.emptyReturn.designatedDepot || 'Djibouti Empty Depot'}`,
      distanceToDestinationKm: record.emptyReturn.emptyReturned ? 0 : record.emptyReturn.emptyDepartureTime ? 320 : 480,
      eta: returnTimestamp || '',
      speedSummary:
        currentStatus === 'Empty return in transit'
          ? 'Separate empty-return movement is active.'
          : currentStatus === 'Empty returned'
            ? 'Empty return completed at depot.'
            : 'Return trip has not departed yet.',
      movementHealth: currentStatus === 'Empty return in transit' ? 'On schedule' : 'No update risk',
    },
    checkpoints: [
      {
        id: `${record.id}-return-release`,
        label: 'Empty released',
        timestamp: releaseTimestamp,
        location: record.inlandNode,
        status: record.emptyReturn.emptyReleaseGranted ? 'Passed' : 'Pending',
        driverNote: 'Empty container released for separate return trip planning.',
        sealConfirmed: false,
        officerNote: 'Return trip created from yard operations.',
      },
      {
        id: `${record.id}-return-departure`,
        label: 'Empty return departure',
        timestamp: departureTimestamp,
        location: record.emptyReturn.currentLocation || `${record.inlandNode} outbound empty lane`,
        status: record.emptyReturn.emptyDepartureTime ? 'Passed' : 'Pending',
        driverNote: record.emptyReturn.emptyDepartureTime ? 'Empty container departed for depot return.' : 'Awaiting departure.',
        sealConfirmed: false,
        officerNote: '',
      },
      {
        id: `${record.id}-return-complete`,
        label: 'Depot return confirmed',
        timestamp: returnTimestamp,
        location: record.emptyReturn.designatedDepot || 'Djibouti Empty Depot',
        status: record.emptyReturn.emptyReturned ? 'Passed' : 'Pending',
        driverNote: record.emptyReturn.emptyReturned ? 'Depot confirmed empty container return.' : 'Awaiting depot confirmation.',
        sealConfirmed: false,
        officerNote: '',
      },
    ],
    issues: [],
    arrivalReadiness: {
      destinationNode: record.emptyReturn.designatedDepot || 'Djibouti Empty Depot',
      unloadHandoffOwner: 'Djibouti Empty Depot',
      yardContact: 'Djibouti Empty Depot · +253 21 44 10 10',
      specialHandlingInstructions: 'Track the empty return as a separate corridor leg with its own truck and driver.',
      podExpectation: 'Depot return receipt expected before final closure.',
      emptyReturnInstructionAvailable: true,
      arrivalNoticeSent: Boolean(record.emptyReturn.emptyReleaseGranted),
      unloadContactConfirmed: Boolean(record.emptyReturn.emptyReleaseGranted),
    },
  };
}

function buildManualTransitorRecord(record: DjiboutiReleaseRecord): TransitorClearanceRecord {
  return {
    id: `transitor-${record.id}`,
    releaseRecordId: record.id,
    bookingNumber: record.bookingNumber,
    blNumber: record.blNumber,
    containerNumber: record.containerNumber,
    customerName: record.customerName,
    inlandDestination: record.handoff.inlandDestination,
    transitorAssignedTo: 'Pending transitor owner',
    transitorCompany: '',
    transitorPhone: '',
    transitorEmail: 'write2get@gmail.com',
    transitorClearanceNote: '',
    transitDocumentRef: record.customsTransit.transitNumber || 'Pending T1',
    transitDocumentStatus: record.customsTransit.transitPacketComplete ? 'prepared' : 'draft',
    chargesPaymentStatus: 'pending',
    clearancePacketStatus: record.handoff.handoffPacketComplete ? 'review_pending' : 'incomplete',
    transportClearanceReady: false,
    clearanceCompletedAt: '',
    multimodalReceivedAt: record.lastUpdated,
    storageRisk: record.storageRisk,
    status: 'transitor_assigned',
    issues: ['Multimodal handoff received. Transitor must prepare T1, pay required charges, and complete transport packet before dispatch.'],
  };
}

function mergeManualTransitorRecord(
  current: TransitorClearanceRecord | undefined,
  record: DjiboutiReleaseRecord,
): TransitorClearanceRecord {
  const base = buildManualTransitorRecord(record);
  if (!current) return base;

  return {
    ...base,
    ...current,
    id: base.id,
    releaseRecordId: base.releaseRecordId,
    bookingNumber: base.bookingNumber,
    blNumber: base.blNumber,
    containerNumber: base.containerNumber || current.containerNumber,
    customerName: base.customerName || current.customerName,
    inlandDestination: base.inlandDestination || current.inlandDestination,
    transitDocumentRef: current.transitDocumentRef || base.transitDocumentRef,
    transitDocumentStatus: current.transitDocumentStatus || base.transitDocumentStatus,
    chargesPaymentStatus: current.chargesPaymentStatus || base.chargesPaymentStatus,
    clearancePacketStatus: current.clearancePacketStatus || base.clearancePacketStatus,
    transportClearanceReady: current.transportClearanceReady || base.transportClearanceReady,
    clearanceCompletedAt: current.clearanceCompletedAt || base.clearanceCompletedAt,
    multimodalReceivedAt: current.multimodalReceivedAt || base.multimodalReceivedAt,
    storageRisk: base.storageRisk,
    status: current.status || base.status,
    issues: current.issues?.length ? current.issues : base.issues,
    blockerType: current.blockerType || '',
    blockerNote: current.blockerNote || '',
    blockerSubmittedAt: current.blockerSubmittedAt || '',
  };
}

function buildManualYardRecord(trip: DispatchTripRecord): YardRecord {
  const arrivalEta = trip.expectedArrivalTime || new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString();
  const inlandNode = trip.inlandDestination;
  const arrivalCheckpoint = trip.checkpoints.find((event) => event.location === trip.inlandDestination && event.timestamp);
  const actualArrivalTime = arrivalCheckpoint?.timestamp || (trip.currentTripStatus === 'Arrived inland' || trip.currentTripStatus === 'Awaiting unload handoff' ? trip.lastUpdated : '');
  const hasArrivedInland = trip.currentTripStatus === 'Arrived inland' || trip.currentTripStatus === 'Awaiting unload handoff';
  const handedToYard = trip.currentTripStatus === 'Awaiting unload handoff';
  const gateInConfirmed = handedToYard;
  const routeCompleted = hasArrivedInland;
  const yardStage: YardRecord['yardStage'] = handedToYard ? 'Awaiting unload' : hasArrivedInland ? 'Arrived at gate' : 'Arriving inland';
  const unloadChip = handedToYard ? 'Gate-in complete' : hasArrivedInland ? 'Arrived at gate' : 'Awaiting arrival';
  const arrivalNote = handedToYard
    ? 'Dispatch handed the trip to yard. Gate-in and unload coordination can begin.'
    : hasArrivedInland
      ? 'Trip has reached the inland node and is waiting for final yard handoff.'
      : 'Manual dispatch trip has not yet reached the inland gate.';
  const storageStatus: YardRecord['storageAssignment']['storageStatus'] = handedToYard ? 'Assigned' : 'Not assigned';
  return {
    id: `manual-yard-${trip.id}`,
    tripId: trip.tripId,
    bookingNumber: trip.bookingNumber,
    blNumber: trip.blNumber,
    containerNumber: trip.containerNumber,
    sealNumber: trip.sealNumber,
    customerName: trip.customerName,
    consigneeName: trip.customerName,
    serviceType: trip.serviceType,
    inlandNode,
    yardStage,
    unloadChip,
    emptyReturnChip: 'Not released',
    etaSummary: hasArrivedInland ? `Arrived at ${inlandNode}` : `ETA ${inlandNode} ${arrivalEta}`,
    assignedYardAgent: inlandNode.includes('Combolcha') ? 'Combolcha Yard Control' : 'Adama Yard Control',
    arrivalTimestamp: actualArrivalTime,
    lastUpdated: new Date().toISOString(),
    arrivalControl: {
      eta: arrivalEta,
      actualArrivalTime,
      gateInConfirmed,
      routeCompleted,
      arrivalNote,
      yardContact: inlandNode.includes('Combolcha') ? 'Combolcha Gate Office · +251 911 440 212' : 'Adama Gate Office · +251 911 440 211',
      inspectionRequired: false,
      sealCheckAtArrival: handedToYard,
    },
    unloadStatus: {
      unloadStarted: false,
      unloadCompleted: false,
      unloadStartTime: '',
      unloadEndTime: '',
      unloadedBy: inlandNode.includes('Combolcha') ? 'Combolcha unload team' : 'Adama unload team',
      cargoCountVerified: false,
      varianceNote: 'No variance recorded yet.',
      unloadPhotosUploaded: false,
    },
    storageAssignment: {
      storageLocation: inlandNode.includes('Combolcha') ? 'Combolcha Bay 02' : 'Adama Bay 01',
      storageStartTime: handedToYard ? actualArrivalTime || trip.lastUpdated : '',
      storageStatus,
      expectedPickupTime: arrivalEta,
      specialHandlingConditions: 'Keep POD and customer receipt confirmation visible before closure.',
      goodsArea: 'Controlled',
      consigneePickupReady: false,
    },
    podReadiness: {
      podRequired: true,
      consigneeContact: `${trip.customerName} receiving desk`,
      receivingContact: 'Pending receiving contact',
      deliveryNoteStatus: 'Awaiting unload completion',
      releaseNoteAvailable: true,
      handoffInstruction: 'Customer must confirm receipt after unload. Empty return remains open until receipt upload.',
      signatureRequired: true,
      photoProofRequired: true,
    },
    consigneeHandoff: {
      representative: 'Awaiting customer receipt',
      handoffStatus: 'Pending',
      handoffTime: '',
      signedBy: '',
      photoProofUploaded: false,
      issueAtHandoff: false,
      finalCargoConditionNote: 'Awaiting unload and customer receipt.',
    },
    emptyReturn: {
      status: 'Not released',
      emptyReleaseGranted: false,
      emptyReleaseTimestamp: '',
      returnOwner: 'Tikur Abay Yard Control',
      returnTripId: '',
      assignedReturnDriver: '',
      returnDriverPhone: '',
      assignedReturnTruck: '',
      assignedReturnTrailer: '',
      designatedDepot: 'Djibouti Empty Depot',
      currentLocation: inlandNode,
      lastLocationUpdateAt: '',
      emptyPickupStatus: 'Awaiting unload completion',
      emptyDepartureTime: '',
      emptyReturned: false,
      returnTimestamp: '',
      returnReceiptAvailable: false,
      returnReceiptRef: '',
      detentionRiskOpen: true,
    },
    exceptions: [
      {
        id: `manual-yard-exception-${trip.id}`,
        severity: 'Low',
        issueText: handedToYard
          ? 'Trip is now in yard control. Start unload and continue POD / receipt workflow.'
          : 'Manual trip handed to yard. Confirm inland arrival and unload before POD and customer receipt.',
        actionLabel: handedToYard ? 'Start unload' : 'Confirm arrival',
      },
    ],
  };
}

export function readManualDjiboutiReleaseRecords() {
  return readStoredArray<DjiboutiReleaseRecord>(djiboutiReleaseStorageKey);
}

export function writeManualDjiboutiReleaseRecords(records: DjiboutiReleaseRecord[]) {
  writeStoredArray(djiboutiReleaseStorageKey, records);
}

export function mergeDjiboutiReleaseRecords(seeded: DjiboutiReleaseRecord[]) {
  const cacheSignature = isBrowser()
    ? [
      seeded.map((record) => `${record.id}:${record.lastUpdated || ''}`).join('|'),
      readStoredSnapshot(djiboutiReleaseStorageKey),
      readStoredSnapshot(shippingBillsStorageKey),
      readStoredSnapshot(shippingManifestsStorageKey),
      readStoredSnapshot(supplierDeskStorageKey),
      readStoredSnapshot(yardRecordStorageKey),
      readStoredSnapshot(bookingQuoteStorageKey),
    ].join('::')
    : '';
  if (cacheSignature && cacheSignature === cachedDjiboutiReleaseSignature && cachedDjiboutiReleaseRecords) {
    return cachedDjiboutiReleaseRecords;
  }
  const storedReleaseRecords = readManualDjiboutiReleaseRecords();
  const shippingBills = readStoredRecord<ShippingBillSnapshot>(shippingBillsStorageKey);
  const shippingManifests = readStoredRecord<ShippingManifestSnapshot>(shippingManifestsStorageKey);
  const supplierDerivedReleaseRecords = readStoredArray<Partial<SupplierDeskShipment>>(supplierDeskStorageKey)
    .filter((shipment): shipment is SupplierDeskShipment => {
      return Boolean(
        shipment &&
        typeof shipment.id === 'string' &&
        typeof shipment.bookingNumber === 'string' &&
        typeof shipment.customerName === 'string' &&
        typeof shipment.serviceType === 'string' &&
        typeof shipment.dischargePort === 'string' &&
        typeof shipment.finalDestination === 'string' &&
        shipment.handoff &&
        typeof shipment.handoff === 'object' &&
        shipment.container &&
        typeof shipment.container === 'object' &&
        Array.isArray(shipment.documents) &&
        shipment.handoff.oceanHandoffStatus === 'Handed off to Djibouti release'
      );
    })
    .map((shipment) => {
      try {
        return buildManualReleaseRecord(shipment);
      } catch {
        return null;
      }
    })
    .filter((record): record is DjiboutiReleaseRecord => record !== null);
  const shippingDerivedReleaseRecords = readSharedQuoteRequests([])
    .filter((request) => Boolean(request.bookingId))
    .map((request) => {
      const bookingId = String(request.bookingId || '');
      const bill = shippingBills[bookingId];
      const manifest = shippingManifests[bookingId];
      if (manifest?.status !== 'generated' && bill?.status !== 'final') {
        return null;
      }
      return buildShippingDerivedReleaseRecord(request, bill, manifest);
    })
    .filter((record): record is DjiboutiReleaseRecord => record !== null);
  const derivedBaselineRecords = [...shippingDerivedReleaseRecords, ...supplierDerivedReleaseRecords].reduce(
    (current, record) => upsertReleaseByBooking(current, record),
    [] as DjiboutiReleaseRecord[],
  );
  const manualRecords = storedReleaseRecords.reduce(
    (current, record) => upsertReleaseByBooking(current, record),
    derivedBaselineRecords,
  ).map(hydrateReleaseFromDownstream);
  const yardRecords = readManualYardRecords();
  const activeManualRecords = manualRecords.filter((record) => {
    const yardRecord = yardRecords.find((item) => item.bookingNumber === record.bookingNumber);
    if (!yardRecord) return true;
    return yardRecord.yardStage !== 'Cycle closed' && yardRecord.emptyReturn.status !== 'Cycle closed';
  });
  if (JSON.stringify(manualRecords) !== JSON.stringify(storedReleaseRecords)) {
    writeManualDjiboutiReleaseRecords(manualRecords);
  }
  const mergedRecords = sortReleaseRecords(mergeById(activeManualRecords, seeded));
  if (cacheSignature) {
    cachedDjiboutiReleaseSignature = cacheSignature;
    cachedDjiboutiReleaseRecords = mergedRecords;
  }
  return mergedRecords;
}

export function syncManualReleaseFromShipment(shipment: SupplierDeskShipment) {
  const next = buildManualReleaseRecord(shipment);
  writeStoredArray(
    djiboutiReleaseStorageKey,
    upsertById(readManualDjiboutiReleaseRecords(), next),
    { bookingNumber: shipment.bookingNumber },
  );
}

export function upsertManualDjiboutiReleaseRecord(record: DjiboutiReleaseRecord) {
  writeStoredArray(
    djiboutiReleaseStorageKey,
    upsertById(readManualDjiboutiReleaseRecords(), record),
    { bookingNumber: record.bookingNumber },
  );
}

export function isManualDjiboutiReleaseRecord(recordId: string) {
  return recordId.startsWith('manual-release-');
}

export function readManualDispatchTrips() {
  return readStoredArray<DispatchTripRecord>(dispatchTripStorageKey);
}

export function writeManualDispatchTrips(trips: DispatchTripRecord[]) {
  writeStoredArray(dispatchTripStorageKey, trips);
}

export function mergeDispatchTrips(seeded: DispatchTripRecord[]) {
  const storedDispatchTrips = readManualDispatchTrips();
  const derivedReturnTrips = readManualYardRecords()
    .map((record) => buildManualEmptyReturnDispatchTrip(record))
    .filter((record): record is DispatchTripRecord => record !== null);
  const manualTrips = dedupeDispatchTripsByTripId([...storedDispatchTrips, ...derivedReturnTrips]);
  if (JSON.stringify(manualTrips) !== JSON.stringify(storedDispatchTrips)) {
    writeManualDispatchTrips(manualTrips);
  }
  return sortDispatchTrips(dedupeDispatchTripsByTripId(mergeById(manualTrips, seeded)));
}

export function syncManualDispatchFromRelease(record: DjiboutiReleaseRecord) {
  const next = buildManualDispatchTrip(record);
  const currentTransitorRecords = readStoredArray<TransitorClearanceRecord>(transitorClearanceStorageKey);
  const existingTransitorRecord = currentTransitorRecords.find((item) => item.bookingNumber === record.bookingNumber);
  writeStoredArray(
    dispatchTripStorageKey,
    upsertDispatchByTripId(readManualDispatchTrips(), next),
    { bookingNumber: record.bookingNumber, tripId: next.tripId },
  );
  writeStoredArray(
    transitorClearanceStorageKey,
    upsertById(currentTransitorRecords, mergeManualTransitorRecord(existingTransitorRecord, record)),
    { bookingNumber: record.bookingNumber },
  );
  syncManualYardFromDispatch(next);
}

export function upsertManualDispatchTrip(trip: DispatchTripRecord) {
  writeStoredArray(
    dispatchTripStorageKey,
    upsertDispatchByTripId(readManualDispatchTrips(), trip),
    { bookingNumber: trip.bookingNumber, tripId: trip.tripId },
  );
  if (!isEmptyReturnTrip(trip)) {
    syncManualYardFromDispatch(trip);
  }
}

export function readManualYardRecords() {
  return readStoredArray<YardRecord>(yardRecordStorageKey);
}

export function writeManualYardRecords(records: YardRecord[]) {
  writeStoredArray(yardRecordStorageKey, records);
}

export function mergeYardRecords(seeded: YardRecord[]) {
  const storedYardRecords = readManualYardRecords();
  const dispatchDerivedYardRecords = readManualDispatchTrips()
    .filter((trip) => !isEmptyReturnTrip(trip))
    .map((trip) => buildManualYardRecord(trip));
  const storedIds = new Set(storedYardRecords.map((record) => record.id));
  const backfilledYardRecords = dispatchDerivedYardRecords.filter((record) => !storedIds.has(record.id));
  const manualRecords = [...storedYardRecords, ...backfilledYardRecords];
  if (JSON.stringify(manualRecords) !== JSON.stringify(storedYardRecords)) {
    writeManualYardRecords(manualRecords);
  }
  return sortYardRecords(mergeById(manualRecords, seeded));
}

export function syncManualYardFromDispatch(trip: DispatchTripRecord) {
  if (isEmptyReturnTrip(trip)) return;
  const next = buildManualYardRecord(trip);
  writeStoredArray(
    yardRecordStorageKey,
    upsertById(readManualYardRecords(), next),
    { bookingNumber: trip.bookingNumber, tripId: trip.tripId },
  );
}

export function upsertManualYardRecord(record: YardRecord) {
  writeStoredArray(
    yardRecordStorageKey,
    upsertById(readManualYardRecords(), record),
    { bookingNumber: record.bookingNumber, tripId: record.tripId },
  );
}

export function syncManualEmptyReturnDispatchFromYard(record: YardRecord) {
  const next = buildManualEmptyReturnDispatchTrip(record);
  if (!next) return;
  writeStoredArray(
    dispatchTripStorageKey,
    upsertDispatchByTripId(readManualDispatchTrips(), next),
    { bookingNumber: record.bookingNumber, tripId: next.tripId },
  );
}
