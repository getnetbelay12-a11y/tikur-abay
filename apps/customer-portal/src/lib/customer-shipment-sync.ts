import { activeShipment, type ShipmentRecord } from './demo-logistics';
import { readSharedQuoteRequests } from './shared-quote-storage';

const releaseStorageKey = 'tikur-abay:manual-corridor:djibouti-release';
const dispatchStorageKey = 'tikur-abay:manual-corridor:dispatch-trips';
const yardStorageKey = 'tikur-abay:manual-corridor:yard-records';
const customerPortalSessionKey = 'tikur-abay:customer-portal:session';
const customerConfirmationCookiePrefix = 'tikur_abay_customer_confirmation_';

type SharedBookingRequest = {
  quoteId?: string;
  bookingId?: string;
  convertedToShipmentId?: string;
  customerName?: string;
  company?: string;
  email?: string;
  localPortalRecipientEmail?: string;
  quoteStatus?: string;
  bookingStatus?: string;
  quoteAmount?: number;
  quoteCurrency?: string;
  updatedAt?: string;
  requestedArrivalWindow?: string;
  assignedOriginAgentEmail?: string;
  serviceType?: 'multimodal' | 'unimodal';
  portOfLoading?: string;
  portOfDischarge?: string;
  inlandDestination?: string;
  finalDeliveryLocation?: string;
  commoditySummary?: string;
  cargoDescription?: string;
  containerType?: string;
  containerCount?: number;
  totalWeight?: number;
  cbm?: number;
};

type ReleaseRecord = {
  bookingNumber: string;
  blNumber?: string;
  containerNumber?: string;
  sealNumber?: string;
  customerName?: string;
  vesselName?: string;
  finalDestination?: string;
  currentStage?: string;
  lastUpdated?: string;
  expectedGateOutTime?: string;
  releaseStatus?: string;
  customsStatus?: string;
  storageRisk?: 'Safe' | 'Watch' | 'Urgent' | string;
  customsTransit?: {
    declarationReference?: string;
    transitType?: string;
    transitNumber?: string;
    customsCleared?: boolean;
    dutyTaxNote?: string;
  };
};

type DispatchTripRecord = {
  bookingNumber: string;
  containerNumber?: string;
  sealNumber?: string;
  customerName?: string;
  currentTripStatus?: string;
  inlandDestination?: string;
  expectedArrivalTime?: string;
  lastUpdated?: string;
  liveMovement?: {
    currentLocation?: string;
    eta?: string;
  };
};

type YardRecord = {
  bookingNumber: string;
  blNumber?: string;
  containerNumber?: string;
  sealNumber?: string;
  customerName?: string;
  consigneeName?: string;
  inlandNode?: string;
  yardStage?: string;
  lastUpdated?: string;
  arrivalControl?: {
    actualArrivalTime?: string;
    gateInConfirmed?: boolean;
  };
  unloadStatus?: {
    unloadCompleted?: boolean;
    unloadEndTime?: string;
    varianceNote?: string;
  };
  podReadiness?: {
    deliveryNoteStatus?: string;
  };
  consigneeHandoff?: {
    handoffStatus?: string;
    handoffTime?: string;
    signedBy?: string;
    photoProofUploaded?: boolean;
    issueAtHandoff?: boolean;
    finalCargoConditionNote?: string;
  };
  emptyReturn?: {
    status?: string;
    emptyReturned?: boolean;
    returnTimestamp?: string;
    returnReceiptAvailable?: boolean;
    returnReceiptRef?: string;
    detentionRiskOpen?: boolean;
  };
};

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
    return [];
  }
}

function readPortalSession() {
  if (!isBrowser()) return null as { email?: string; companyName?: string } | null;
  const raw =
    window.localStorage.getItem(customerPortalSessionKey) ||
    window.sessionStorage.getItem(customerPortalSessionKey);
  if (!raw) return null as { email?: string; companyName?: string } | null;
  try {
    return JSON.parse(raw) as { email?: string; companyName?: string } | null;
  } catch {
    window.localStorage.removeItem(customerPortalSessionKey);
    window.sessionStorage.removeItem(customerPortalSessionKey);
    return null as { email?: string; companyName?: string } | null;
  }
}

function formatDateTime(value?: string) {
  if (!value) return 'Pending';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function titleCase(value: string) {
  return value
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function normalizeStage(release?: ReleaseRecord, dispatch?: DispatchTripRecord, yard?: YardRecord): ShipmentRecord['currentStage'] {
  if (yard?.emptyReturn?.emptyReturned && yard.emptyReturn.returnReceiptAvailable) return 'Closed';
  if (yard?.emptyReturn?.status === 'Cycle closed' || yard?.yardStage === 'Cycle closed') return 'Closed';
  if (yard?.emptyReturn?.emptyReturned || yard?.emptyReturn?.status === 'Empty returned') return 'Empty Return';
  if (yard?.emptyReturn?.status === 'Empty return in progress') return 'Empty Return';
  if (yard?.consigneeHandoff?.handoffStatus === 'Completed' || yard?.yardStage === 'POD complete') return 'Customer Delivery';
  if (yard?.unloadStatus?.unloadCompleted || yard?.yardStage === 'Awaiting consignee handoff' || yard?.yardStage === 'In storage') return 'Dry Port Arrival';
  if (yard?.arrivalControl?.actualArrivalTime || yard?.arrivalControl?.gateInConfirmed || yard?.yardStage === 'Arrived at gate') return 'Dry Port Arrival';
  if (dispatch?.currentTripStatus === 'Awaiting unload handoff' || dispatch?.currentTripStatus === 'Arrived inland') return 'Truck Transit';
  if (dispatch?.bookingNumber) return 'Truck Transit';
  if (release?.bookingNumber) return 'Djibouti Release';
  return 'Booking / Quote';
}

function buildDeliveryConfirmation(yard: YardRecord | undefined, customerName: string): ShipmentRecord['deliveryConfirmation'] {
  if (yard?.emptyReturn?.status === 'Cycle closed' || (yard?.emptyReturn?.emptyReturned && yard.emptyReturn.returnReceiptAvailable)) {
    return {
      status: 'resolved',
      receivedBy: yard.consigneeHandoff?.signedBy || 'Customer receiving desk',
      receivingCompany: yard.consigneeName || customerName,
      receivedAt: formatDateTime(yard.emptyReturn?.returnTimestamp || yard.consigneeHandoff?.handoffTime),
      podStatus: 'verified',
      signatureCaptured: true,
      photoProofCaptured: true,
      shortageStatus: 'resolved',
      damageStatus: 'resolved',
      remarks: 'Shipment cycle closed after customer receipt and empty return confirmation.',
      claimRequired: false,
      customerActionNeeded: false,
    };
  }

  if (yard?.consigneeHandoff?.handoffStatus === 'Completed') {
    const issueOpen = Boolean(yard.consigneeHandoff.issueAtHandoff);
    return {
      status: issueOpen ? 'under_review' : 'customer_confirmed',
      receivedBy: yard.consigneeHandoff.signedBy || 'Customer receiving desk',
      receivingCompany: yard.consigneeName || customerName,
      receivedAt: formatDateTime(yard.consigneeHandoff.handoffTime),
      podStatus: 'verified',
      signatureCaptured: true,
      photoProofCaptured: Boolean(yard.consigneeHandoff.photoProofUploaded),
      shortageStatus: issueOpen ? 'under_review' : 'none',
      damageStatus: issueOpen ? 'under_review' : 'none',
      remarks: yard.consigneeHandoff.finalCargoConditionNote || 'Customer receipt was confirmed.',
      claimRequired: issueOpen,
      customerActionNeeded: issueOpen,
    };
  }

  if (yard?.unloadStatus?.unloadCompleted) {
    const variance = String(yard.unloadStatus.varianceNote || '').toLowerCase();
    const shortage = variance.includes('shortage');
    const damage = variance.includes('damage');
    return {
      status: shortage && damage ? 'received_with_shortage_and_damage' : shortage ? 'received_with_shortage' : damage ? 'received_with_damage' : 'under_review',
      receivedBy: 'Awaiting customer receipt',
      receivingCompany: yard.consigneeName || customerName,
      receivedAt: formatDateTime(yard.unloadStatus.unloadEndTime),
      podStatus: 'uploaded',
      signatureCaptured: false,
      photoProofCaptured: true,
      shortageStatus: shortage ? 'reported' : 'none',
      damageStatus: damage ? 'reported' : 'none',
      remarks: shortage || damage ? yard.unloadStatus.varianceNote || 'Variance reported during unload.' : 'Unload complete. Customer receipt confirmation is open.',
      claimRequired: shortage || damage,
      customerActionNeeded: true,
    };
  }

  return {
    status: 'awaiting_customer_confirmation',
    receivedBy: 'Awaiting arrival',
    receivingCompany: yard?.consigneeName || customerName,
    receivedAt: 'Pending',
    podStatus: 'pending',
    signatureCaptured: false,
    photoProofCaptured: false,
    shortageStatus: 'none',
    damageStatus: 'none',
    remarks: 'Customer confirmation opens after unload and POD handoff.',
    claimRequired: false,
    customerActionNeeded: false,
  };
}

function buildIssueSummary(stage: ShipmentRecord['currentStage'], booking: SharedBookingRequest, dispatch?: DispatchTripRecord, yard?: YardRecord) {
  if (stage === 'Closed') return 'No active exceptions. Shipment cycle closed with empty return receipt.';
  if (yard?.consigneeHandoff?.issueAtHandoff) return yard.consigneeHandoff.finalCargoConditionNote || 'Customer issue was raised during handoff.';
  if (yard?.unloadStatus?.varianceNote && yard.unloadStatus.varianceNote !== 'Awaiting unload') return yard.unloadStatus.varianceNote;
  if (dispatch?.currentTripStatus === 'Awaiting unload handoff') return 'Inland trip arrived. Yard handoff is still open.';
  if (dispatch?.currentTripStatus === 'In transit') return 'Inland corridor movement is in progress.';
  if (booking.quoteStatus === 'assigned_to_origin') return 'Booking converted and handed to origin operations.';
  if (booking.quoteStatus === 'quote_accepted') return 'Quote approved. Booking conversion is still pending.';
  return 'Customer-facing shipment visibility is waiting for the next lifecycle update.';
}

function buildTimeline(stage: ShipmentRecord['currentStage'], booking: SharedBookingRequest, release?: ReleaseRecord, dispatch?: DispatchTripRecord, yard?: YardRecord): ShipmentRecord['timeline'] {
  const bookingTimestamp = formatDateTime(booking.updatedAt);
  const releaseTimestamp = formatDateTime(release?.lastUpdated);
  const dispatchTimestamp = formatDateTime(dispatch?.lastUpdated);
  const yardTimestamp = formatDateTime(yard?.lastUpdated);
  const closed = stage === 'Closed';
  const hasYard = Boolean(yard?.bookingNumber);
  const hasDispatch = Boolean(dispatch?.bookingNumber);
  const hasRelease = Boolean(release?.bookingNumber);

  return [
    {
      id: `${booking.bookingId || booking.quoteId}-timeline-booking`,
      label: booking.bookingId ? 'Booking confirmed' : 'Quote in customer review',
      timestamp: bookingTimestamp,
      location: booking.portOfLoading || 'Commercial desk',
      note: booking.bookingId ? 'Commercial booking record is available in the shared customer portal state.' : 'Quote exists in the shared customer portal review queue.',
      status: 'done',
    },
    {
      id: `${booking.bookingId || booking.quoteId}-timeline-release`,
      label: 'Djibouti release',
      timestamp: hasRelease ? releaseTimestamp : 'Pending',
      location: release?.finalDestination || booking.portOfDischarge || 'Djibouti',
      note: hasRelease ? `${release?.releaseStatus || 'Release update posted'} with customs status ${release?.customsStatus || 'pending'}.` : 'Release desk has not posted a visible customer update yet.',
      status: hasRelease ? 'done' : 'next',
    },
    {
      id: `${booking.bookingId || booking.quoteId}-timeline-dispatch`,
      label: 'Inland dispatch',
      timestamp: hasDispatch ? dispatchTimestamp : 'Pending',
      location: dispatch?.liveMovement?.currentLocation || dispatch?.inlandDestination || booking.inlandDestination || 'Inland corridor',
      note: hasDispatch ? `${dispatch?.currentTripStatus || 'Dispatch update posted'} from the corridor desk.` : 'Dispatch trip is not visible yet.',
      status: hasDispatch ? (hasYard ? 'done' : 'active') : 'next',
    },
    {
      id: `${booking.bookingId || booking.quoteId}-timeline-yard`,
      label: closed ? 'Shipment cycle closed' : 'Customer delivery / closure',
      timestamp: hasYard ? yardTimestamp : 'Pending',
      location: yard?.inlandNode || booking.finalDeliveryLocation || booking.inlandDestination || 'Customer delivery',
      note: closed
        ? 'Empty return receipt and customer-visible closure controls are complete.'
        : hasYard
          ? `${yard?.yardStage || 'Yard update posted'} with empty return state ${yard?.emptyReturn?.status || 'pending'}.`
          : 'Yard and closure updates are still pending.',
      status: closed ? 'active' : hasYard ? 'active' : 'next',
    },
  ];
}

function buildLiveShipment(booking: SharedBookingRequest, release?: ReleaseRecord, dispatch?: DispatchTripRecord, yard?: YardRecord): ShipmentRecord {
  const stage = normalizeStage(release, dispatch, yard);
  const customerName = booking.customerName || yard?.customerName || dispatch?.customerName || release?.customerName || activeShipment.customerName;
  const deliveryConfirmation = buildDeliveryConfirmation(yard, customerName);
  const customsCleared = Boolean(release?.customsTransit?.customsCleared);
  const releaseStatus = release?.releaseStatus || (customsCleared ? 'Released' : 'Pending');
  const emptyReturnStatus = yard?.emptyReturn?.status || (stage === 'Closed' ? 'Cycle closed' : stage === 'Empty Return' ? 'Empty return in progress' : 'Not started');
  const route = [
    booking.portOfLoading || activeShipment.portOfLoading,
    booking.portOfDischarge || activeShipment.portOfDischarge,
    booking.inlandDestination || activeShipment.portOfDischarge,
    booking.finalDeliveryLocation || booking.inlandDestination || activeShipment.finalDestination,
  ].filter(Boolean).join(' -> ');

  return {
    ...activeShipment,
    shipmentRef: booking.convertedToShipmentId || booking.bookingId || booking.quoteId || activeShipment.shipmentRef,
    bookingNumber: booking.bookingId || booking.quoteId || activeShipment.bookingNumber,
    customerReference: booking.quoteId || activeShipment.customerReference,
    customerName,
    supplierName: activeShipment.supplierName,
    serviceType: booking.serviceType === 'unimodal' ? 'Unimodal' : 'Multimodal',
    blNumber: yard?.blNumber || release?.blNumber || `BL-${booking.bookingId || booking.quoteId || 'PENDING'}`,
    containerNumber: yard?.containerNumber || dispatch?.containerNumber || release?.containerNumber || activeShipment.containerNumber,
    sealNumber: yard?.sealNumber || dispatch?.sealNumber || release?.sealNumber || activeShipment.sealNumber,
    portOfLoading: booking.portOfLoading || activeShipment.portOfLoading,
    portOfDischarge: booking.portOfDischarge || activeShipment.portOfDischarge,
    finalDestination: booking.finalDeliveryLocation || booking.inlandDestination || yard?.inlandNode || dispatch?.inlandDestination || release?.finalDestination || activeShipment.finalDestination,
    route,
    vesselName: release?.vesselName || activeShipment.vesselName,
    etaDjibouti: formatDateTime(release?.expectedGateOutTime),
    etaFinal: formatDateTime(dispatch?.expectedArrivalTime || booking.requestedArrivalWindow),
    currentStage: stage,
    lastUpdated: formatDateTime(yard?.lastUpdated || dispatch?.lastUpdated || release?.lastUpdated || booking.updatedAt),
    customerContactStatus:
      stage === 'Closed'
        ? 'Closure completed and customer visibility is now final.'
        : deliveryConfirmation.customerActionNeeded
          ? 'Customer confirmation is still open on this file.'
          : 'Customer-facing shipment status is synchronized with the latest corridor update.',
    gateOutStatus: release?.releaseStatus ? `${releaseStatus} · customs ${release?.customsStatus || 'pending'}` : activeShipment.gateOutStatus,
    inlandTransportStatus: dispatch?.currentTripStatus ? `${dispatch.currentTripStatus} · ${dispatch.liveMovement?.currentLocation || dispatch.inlandDestination || 'location pending'}` : activeShipment.inlandTransportStatus,
    dryPortStatus: yard?.yardStage ? `${yard.yardStage} · ${yard.inlandNode || 'yard update posted'}` : activeShipment.dryPortStatus,
    podStatus: deliveryConfirmation.podStatus === 'verified' ? 'POD verified and visible to customer.' : deliveryConfirmation.podStatus === 'uploaded' ? 'POD uploaded and awaiting customer confirmation.' : 'POD pending yard handoff.',
    emptyReturnStatus: titleCase(emptyReturnStatus),
    deliveryConfirmation,
    riskControl: {
      freeTimeEnd: formatDateTime(dispatch?.expectedArrivalTime || yard?.arrivalControl?.actualArrivalTime),
      demurrageRiskLevel: release?.storageRisk === 'Urgent' ? 'Urgent' : release?.storageRisk === 'Watch' ? 'Watch' : 'Safe',
      dryPortCollectionDeadline: formatDateTime(booking.requestedArrivalWindow || dispatch?.expectedArrivalTime),
      dryPortCollectionRiskLevel: deliveryConfirmation.customerActionNeeded ? 'Watch' : 'Safe',
      emptyReturnDeadline: formatDateTime(yard?.emptyReturn?.returnTimestamp || dispatch?.expectedArrivalTime),
      emptyReturnRiskLevel: yard?.emptyReturn?.detentionRiskOpen ? 'Urgent' : stage === 'Empty Return' ? 'Watch' : 'Safe',
    },
    expectedNextStep:
      stage === 'Closed'
        ? 'No further customer action is pending.'
        : deliveryConfirmation.customerActionNeeded
          ? 'Confirm receipt or report a shortage / damage update.'
          : stage === 'Truck Transit'
            ? 'Await inland arrival and yard handoff.'
            : stage === 'Djibouti Release'
              ? 'Await dispatch handoff after release.'
              : 'Await the next corridor milestone.',
    issueSummary: buildIssueSummary(stage, booking, dispatch, yard),
    customsTax: {
      declarationReference: release?.customsTransit?.declarationReference || activeShipment.customsTax.declarationReference,
      transitDocumentType: release?.customsTransit?.transitType || activeShipment.customsTax.transitDocumentType,
      transitDocumentReference: release?.customsTransit?.transitNumber || activeShipment.customsTax.transitDocumentReference,
      customsReleaseStatus: release?.customsStatus || activeShipment.customsTax.customsReleaseStatus,
      inspectionStatus: customsCleared ? 'Cleared' : activeShipment.customsTax.inspectionStatus,
      taxDutySummary: release?.customsTransit?.dutyTaxNote || activeShipment.customsTax.taxDutySummary,
      releaseReadiness: releaseStatus,
      state: customsCleared ? 'Cleared' : activeShipment.customsTax.state,
      comments: customsCleared ? 'Customer-visible customs release is synchronized from the Djibouti release desk.' : activeShipment.customsTax.comments,
    },
    timeline: buildTimeline(stage, booking, release, dispatch, yard),
    documents: activeShipment.documents.map((document, index) => ({
      ...document,
      id: `${booking.bookingId || booking.quoteId || 'live'}-doc-${index + 1}`,
      shipmentRef: booking.convertedToShipmentId || booking.bookingId || booking.quoteId || activeShipment.shipmentRef,
      status:
        document.type === 'POD'
          ? deliveryConfirmation.podStatus === 'pending'
            ? 'Pending'
            : 'Shared'
          : document.type === 'Return receipt'
            ? stage === 'Closed'
              ? 'Available'
              : 'Pending'
            : document.status,
    })),
    payments: activeShipment.payments,
    supportThreads: activeShipment.supportThreads,
    cargoItems: activeShipment.cargoItems,
    exceptions: [
      ...(stage === 'Closed' ? [] : [buildIssueSummary(stage, booking, dispatch, yard)]),
    ],
    nextActions: [
      stage === 'Closed' ? 'Download POD and return receipt package.' : 'Review the current shipment status.',
      deliveryConfirmation.customerActionNeeded ? 'Confirm receipt or raise a customer issue.' : 'Monitor the next corridor milestone.',
    ],
  };
}

function belongsToCurrentCustomer(item: SharedBookingRequest, session: { email?: string; companyName?: string } | null) {
  const sessionEmail = String(session?.email || '').trim().toLowerCase();
  const sessionCompany = String(session?.companyName || '').trim().toLowerCase();
  const itemEmail = String(item.email || '').trim().toLowerCase();
  const portalEmail = String(item.localPortalRecipientEmail || '').trim().toLowerCase();
  const itemCustomer = String(item.customerName || item.company || '').trim().toLowerCase();

  if (!sessionEmail && !sessionCompany) return false;
  return Boolean(
    (sessionEmail && (itemEmail === sessionEmail || portalEmail === sessionEmail)) ||
    (sessionCompany && itemCustomer === sessionCompany),
  );
}

export function readPersistedCustomerConfirmations() {
  if (typeof document === 'undefined') return {} as Record<string, ShipmentRecord['deliveryConfirmation']>;
  return document.cookie
    .split('; ')
    .map((entry) => {
      const [name, ...rest] = entry.split('=');
      return { name, value: rest.join('=') };
    })
    .filter((entry) => entry.name.startsWith(customerConfirmationCookiePrefix))
    .reduce<Record<string, ShipmentRecord['deliveryConfirmation']>>((acc, entry) => {
      try {
        const shipmentRef = entry.name.slice(customerConfirmationCookiePrefix.length);
        acc[shipmentRef] = JSON.parse(decodeURIComponent(entry.value)) as ShipmentRecord['deliveryConfirmation'];
      } catch {
        return acc;
      }
      return acc;
    }, {});
}

export function buildCustomerPortalShipments() {
  const session = readPortalSession();
  if (!session?.email && !session?.companyName) {
    return [] as ShipmentRecord[];
  }
  const bookings = (readSharedQuoteRequests() as SharedBookingRequest[])
    .filter((item) => (item.bookingId || item.quoteId) && belongsToCurrentCustomer(item, session));
  const releases = readStoredArray<ReleaseRecord>(releaseStorageKey);
  const dispatchTrips = readStoredArray<DispatchTripRecord>(dispatchStorageKey);
  const yardRecords = readStoredArray<YardRecord>(yardStorageKey);

  const liveShipments = bookings
    .filter((item) => item.bookingId || item.quoteStatus === 'assigned_to_origin' || item.quoteStatus === 'quote_accepted')
    .map((booking) => {
      const key = booking.bookingId || booking.quoteId || '';
      return buildLiveShipment(
        booking,
        releases.find((item) => item.bookingNumber === key),
        dispatchTrips.find((item) => item.bookingNumber === key),
        yardRecords.find((item) => item.bookingNumber === key),
      );
    })
    .sort((left, right) => right.lastUpdated.localeCompare(left.lastUpdated));

  return liveShipments;
}
