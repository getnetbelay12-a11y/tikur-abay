import {
  bookingQuoteStorageKey,
  seededBookingRequests,
  type UnifiedBookingRequest,
} from './booking-quote-demo-data';
import {
  corridorDispatchTrips,
  type DispatchTripRecord,
} from './corridor-dispatch-demo-data';
import {
  djiboutiReleaseRecords,
  type DjiboutiReleaseRecord,
} from './djibouti-release-demo-data';
import {
  dryPortYardRecords,
  type YardRecord,
} from './dry-port-yard-demo-data';
import {
  readManualDispatchTrips,
  readManualDjiboutiReleaseRecords,
  readManualYardRecords,
} from './manual-corridor-journey';
import {
  supplierDeskShipments,
  type SupplierDeskShipment,
} from './supplier-agent-demo-data';
import {
  seededTransitorRecords,
  transitorClearanceStorageKey,
  type TransitorClearanceRecord,
} from './transitor-clearance-demo-data';

const supplierDeskStorageKey = 'tikur-abay:supplier-desk:manual-shipments';

function mergeStoredWithSeeded<T extends { id: string }>(stored: T[], seeded: T[]) {
  const storedIds = new Set(stored.map((item) => item.id));
  return [...stored, ...seeded.filter((item) => !storedIds.has(item.id))];
}

export type ShipmentBlockerType =
  | 'booking_missing_details'
  | 'origin_docs_incomplete'
  | 'line_release_missing'
  | 'clearance_not_ready'
  | 'charges_not_paid'
  | 'dispatch_not_created'
  | 'driver_not_assigned'
  | 'no_checkpoint_update'
  | 'inland_arrival_not_confirmed'
  | 'unload_not_completed'
  | 'pod_missing'
  | 'customer_confirmation_pending'
  | 'shortage_damage_under_review'
  | 'empty_return_overdue'
  | 'return_receipt_missing';

export type ShipmentAttentionRoute = {
  stage: string;
  ownerRole: string;
  deskRoute: string;
  recommendedActionLabel: string;
};

export type ShipmentAttentionItem = ShipmentAttentionRoute & {
  bookingNumber: string;
  shipmentId: string;
  customer: string;
  consignee: string;
  container: string;
  seal: string;
  currentStage: string;
  currentOwner: string;
  blocker: ShipmentBlockerType;
  blockerLabel: string;
  riskState: 'Low' | 'Medium' | 'High' | 'Critical';
  milestoneProgress: {
    current: number;
    total: number;
    label: string;
  };
  nextAction: string;
  linkedDocs: string[];
  communicationStatus: string;
  lastUpdated: string;
  ageInHours: number;
  attentionScore: number;
  deskHref: string;
  sourceDesk:
    | 'booking'
    | 'origin'
    | 'release'
    | 'clearance'
    | 'dispatch'
    | 'yard'
    | 'empty_return';
};

const blockerRoutes: Record<ShipmentBlockerType, ShipmentAttentionRoute> = {
  booking_missing_details: {
    stage: 'booking',
    ownerRole: 'Booking / Quote Team',
    deskRoute: '/operations/booking',
    recommendedActionLabel: 'Complete quote details',
  },
  origin_docs_incomplete: {
    stage: 'origin_preparation',
    ownerRole: 'China Port Agent',
    deskRoute: '/operations/supplier-agent',
    recommendedActionLabel: 'Upload BL / invoice / packing list',
  },
  line_release_missing: {
    stage: 'djibouti_release',
    ownerRole: 'Djibouti Release Team',
    deskRoute: '/operations/djibouti-release',
    recommendedActionLabel: 'Confirm discharge',
  },
  clearance_not_ready: {
    stage: 'clearance',
    ownerRole: 'Transitor / Clearance',
    deskRoute: '/operations/transitor-clearance',
    recommendedActionLabel: 'Mark clearance ready',
  },
  charges_not_paid: {
    stage: 'clearance',
    ownerRole: 'Transitor / Clearance',
    deskRoute: '/operations/transitor-clearance',
    recommendedActionLabel: 'Mark charges paid',
  },
  dispatch_not_created: {
    stage: 'dispatch',
    ownerRole: 'Corridor Dispatch',
    deskRoute: '/operations/corridor-dispatch',
    recommendedActionLabel: 'Create trip',
  },
  driver_not_assigned: {
    stage: 'dispatch',
    ownerRole: 'Corridor Dispatch',
    deskRoute: '/operations/corridor-dispatch',
    recommendedActionLabel: 'Assign driver',
  },
  no_checkpoint_update: {
    stage: 'inland_transit',
    ownerRole: 'Corridor Dispatch',
    deskRoute: '/operations/corridor-dispatch',
    recommendedActionLabel: 'Request checkpoint update',
  },
  inland_arrival_not_confirmed: {
    stage: 'dry_port',
    ownerRole: 'Dry Port / Yard Team',
    deskRoute: '/operations/dry-port-yard',
    recommendedActionLabel: 'Confirm inland arrival',
  },
  unload_not_completed: {
    stage: 'dry_port',
    ownerRole: 'Dry Port / Yard Team',
    deskRoute: '/operations/dry-port-yard',
    recommendedActionLabel: 'Confirm unload',
  },
  pod_missing: {
    stage: 'customer_confirmation',
    ownerRole: 'Dry Port / Yard Team',
    deskRoute: '/operations/dry-port-yard',
    recommendedActionLabel: 'Prepare POD',
  },
  customer_confirmation_pending: {
    stage: 'customer_confirmation',
    ownerRole: 'Customer Delivery Confirmation',
    deskRoute: '/operations/dry-port-yard',
    recommendedActionLabel: 'Request customer confirmation',
  },
  shortage_damage_under_review: {
    stage: 'customer_confirmation',
    ownerRole: 'Customer Delivery Confirmation',
    deskRoute: '/operations/dry-port-yard',
    recommendedActionLabel: 'Review shortage / damage',
  },
  empty_return_overdue: {
    stage: 'empty_return',
    ownerRole: 'Empty Return Control',
    deskRoute: '/operations/empty-return',
    recommendedActionLabel: 'Start empty return follow-up',
  },
  return_receipt_missing: {
    stage: 'empty_return',
    ownerRole: 'Empty Return Control',
    deskRoute: '/operations/empty-return',
    recommendedActionLabel: 'Upload return receipt',
  },
};

const blockerLabels: Record<ShipmentBlockerType, string> = {
  booking_missing_details: 'Booking details still need action',
  origin_docs_incomplete: 'Origin file is incomplete',
  line_release_missing: 'Line release is still missing',
  clearance_not_ready: 'Clearance is not ready',
  charges_not_paid: 'Required charges are not paid',
  dispatch_not_created: 'Dispatch trip is not created',
  driver_not_assigned: 'Driver is not assigned',
  no_checkpoint_update: 'Checkpoint update is missing',
  inland_arrival_not_confirmed: 'Inland arrival is not confirmed',
  unload_not_completed: 'Unload is not completed',
  pod_missing: 'POD is missing',
  customer_confirmation_pending: 'Customer confirmation is pending',
  shortage_damage_under_review: 'Shortage or damage is under review',
  empty_return_overdue: 'Empty return is overdue',
  return_receipt_missing: 'Return receipt is missing',
};

export function getBlockerRouting(blocker: ShipmentBlockerType) {
  return blockerRoutes[blocker];
}

export function getPriorityShipmentNow(): {
  priority: ShipmentAttentionItem | null;
  queue: ShipmentAttentionItem[];
  items: ShipmentAttentionItem[];
} {
  const items = buildAttentionItems().sort((left, right) => {
    if (right.attentionScore !== left.attentionScore) {
      return right.attentionScore - left.attentionScore;
    }
    return new Date(left.lastUpdated).getTime() - new Date(right.lastUpdated).getTime();
  });
  return {
    priority: items[0] ?? null,
    queue: items.slice(1, 6),
    items,
  };
}

export function getShipmentAttentionScore(item: ShipmentAttentionItem) {
  return item.attentionScore;
}

export function getNextActionForShipment(item: ShipmentAttentionItem) {
  return item.nextAction;
}

function buildAttentionItems(): ShipmentAttentionItem[] {
  const bookings = readStoredArray<UnifiedBookingRequest>(bookingQuoteStorageKey, seededBookingRequests);
  const origins = readStoredArray<SupplierDeskShipment>(supplierDeskStorageKey, supplierDeskShipments);
  const releases = mergeStoredWithSeeded(readManualDjiboutiReleaseRecords(), djiboutiReleaseRecords);
  const clearances = readStoredArray<TransitorClearanceRecord>(transitorClearanceStorageKey, seededTransitorRecords);
  const dispatch = mergeStoredWithSeeded(readManualDispatchTrips(), corridorDispatchTrips);
  const yard = mergeStoredWithSeeded(readManualYardRecords(), dryPortYardRecords);

  const items: ShipmentAttentionItem[] = [];
  const dispatchByBooking = new Map(dispatch.map((item) => [item.bookingNumber, item] as const));
  const yardByBooking = new Map(yard.map((item) => [item.bookingNumber, item] as const));

  bookings.forEach((request) => {
    if (['quote_rejected', 'assigned_to_origin', 'booking_created', 'quote_accepted'].includes(request.quoteStatus)) return;
    const nextAction =
      request.quoteStatus === 'quote_sent'
        ? 'Accept quote'
        : request.quoteStatus === 'quote_under_review'
          ? 'Send quote'
          : 'Complete quote details';
    items.push(createItem({
      blocker: 'booking_missing_details',
      bookingNumber: request.bookingId || request.quoteId,
      shipmentId: request.convertedToShipmentId || request.quoteId,
      customer: request.customerName,
      consignee: request.consigneeName,
      container: request.containerType,
      seal: 'Pending seal',
      currentStage: 'Booking / Quote',
      currentOwner: request.assignedDesk,
      riskState: request.quoteStatus === 'quote_sent' ? 'High' : 'Medium',
      progressCurrent: 0,
      nextAction,
      linkedDocs: [request.quoteId, request.commoditySummary, request.incoterm],
      communicationStatus: request.quoteStatus === 'quote_sent' ? 'Quote sent to request owner' : 'Commercial review is still open',
      lastUpdated: request.updatedAt,
      ageInHours: ageInHours(request.updatedAt),
      sourceDesk: 'booking',
      routeParams: request.bookingId ? { booking: request.bookingId } : { quote: request.quoteId },
      score: 65 + Math.min(ageInHours(request.updatedAt), 72),
    }));
  });

  origins.forEach((shipment) => {
    if (isOriginReady(shipment)) return;
    const docsMissing = shipment.documents.some((item) => ['Commercial invoice', 'Packing list', 'BL draft', 'Final BL'].includes(item.type) && item.status === 'missing');
    const nextAction = docsMissing
      ? 'Upload BL / invoice / packing list'
      : !shipment.container.stuffingConfirmed
        ? 'Confirm stuffing'
        : !shipment.container.gateInConfirmed
          ? 'Confirm gate-in'
          : 'Send to multimodal';
    items.push(createItem({
      blocker: 'origin_docs_incomplete',
      bookingNumber: shipment.bookingNumber,
      shipmentId: shipment.id,
      customer: shipment.customerName,
      consignee: shipment.customerName,
      container: shipment.container.containerNumber || 'Pending container',
      seal: shipment.container.sealNumber || 'Pending seal',
      currentStage: 'China Port Agent / Origin Preparation',
      currentOwner: shipment.assignedAgent,
      riskState: shipment.exceptionLabel ? 'High' : 'Medium',
      progressCurrent: 1,
      nextAction,
      linkedDocs: shipment.documents
        .filter((item) => item.status !== 'missing')
        .slice(0, 4)
        .map((item) => `${item.type}: ${item.referenceNumber}`),
      communicationStatus: 'Origin file follow-up is still open',
      lastUpdated: shipment.lastUpdated,
      ageInHours: ageInHours(shipment.lastUpdated),
      sourceDesk: 'origin',
      routeParams: { booking: shipment.bookingNumber },
      score: 78 + Math.min(ageInHours(shipment.lastUpdated), 72),
    }));
  });

  releases.forEach((record) => {
    if (record.inlandHandoffSent) return;
    if (!record.lineReleaseReceived) {
      const nextAction = !record.dischargeTime ? 'Confirm discharge' : 'Confirm line release';
      items.push(createItem({
        blocker: 'line_release_missing',
        bookingNumber: record.bookingNumber,
        shipmentId: record.id,
        customer: record.customerName,
        consignee: record.customerName,
        container: record.containerNumber,
        seal: record.sealNumber,
        currentStage: 'Djibouti Release / Multimodal',
        currentOwner: record.releaseOwner,
        riskState: record.storageRisk === 'Urgent' ? 'Critical' : record.storageRisk === 'Approaching' ? 'High' : 'Medium',
        progressCurrent: 3,
        nextAction,
        linkedDocs: [record.blNumber, record.customsTransit.transitNumber, record.storage.gatePassStatus],
        communicationStatus: record.storageRisk === 'Urgent' ? 'Release escalation should be sent now' : 'Release team is still working the file',
        lastUpdated: record.lastUpdated,
        ageInHours: ageInHours(record.lastUpdated),
        sourceDesk: 'release',
        routeParams: { booking: record.bookingNumber },
        score: 88 + riskBoost(record.storageRisk) + Math.min(ageInHours(record.lastUpdated), 72),
      }));
    }
  });

  clearances.forEach((record) => {
    if (record.transportClearanceReady) return;
    if (record.chargesPaymentStatus !== 'paid' && record.chargesPaymentStatus !== 'cleared') {
      items.push(createItem({
        blocker: 'charges_not_paid',
        bookingNumber: record.bookingNumber,
        shipmentId: record.id,
        customer: record.customerName,
        consignee: record.customerName,
        container: record.containerNumber,
        seal: 'Pending seal confirmation',
        currentStage: 'Transitor / Clearance',
        currentOwner: record.transitorAssignedTo,
        riskState: record.storageRisk === 'Urgent' ? 'Critical' : 'High',
        progressCurrent: 4,
        nextAction: 'Mark charges paid',
        linkedDocs: [record.transitDocumentRef, record.clearancePacketStatus],
        communicationStatus: 'Charge payment follow-up is still open',
        lastUpdated: record.multimodalReceivedAt,
        ageInHours: ageInHours(record.multimodalReceivedAt),
        sourceDesk: 'clearance',
        routeParams: { booking: record.bookingNumber },
        score: 92 + riskBoost(record.storageRisk) + Math.min(ageInHours(record.multimodalReceivedAt), 72),
      }));
      return;
    }

    items.push(createItem({
      blocker: 'clearance_not_ready',
      bookingNumber: record.bookingNumber,
      shipmentId: record.id,
      customer: record.customerName,
      consignee: record.customerName,
      container: record.containerNumber,
      seal: 'Pending seal confirmation',
      currentStage: 'Transitor / Clearance',
      currentOwner: record.transitorAssignedTo,
      riskState: record.storageRisk === 'Urgent' ? 'Critical' : 'High',
      progressCurrent: 4,
      nextAction: record.transitDocumentStatus !== 'prepared' ? 'Prepare T1' : 'Mark clearance ready',
      linkedDocs: [record.transitDocumentRef, record.clearancePacketStatus],
      communicationStatus: 'Clearance desk is still finalizing the transport packet',
      lastUpdated: record.multimodalReceivedAt,
      ageInHours: ageInHours(record.multimodalReceivedAt),
      sourceDesk: 'clearance',
      routeParams: { booking: record.bookingNumber },
      score: 84 + riskBoost(record.storageRisk) + Math.min(ageInHours(record.multimodalReceivedAt), 72),
    }));
  });

  clearances.forEach((record) => {
    if (!record.transportClearanceReady) return;
    if (dispatchByBooking.has(record.bookingNumber)) return;
    items.push(createItem({
      blocker: 'dispatch_not_created',
      bookingNumber: record.bookingNumber,
      shipmentId: record.id,
      customer: record.customerName,
      consignee: record.customerName,
      container: record.containerNumber,
      seal: 'Pending seal confirmation',
      currentStage: 'Corridor Dispatch',
      currentOwner: 'Corridor Dispatch',
      riskState: record.storageRisk === 'Urgent' ? 'Critical' : 'High',
      progressCurrent: 5,
      nextAction: 'Create trip',
      linkedDocs: [record.transitDocumentRef, 'Clearance packet complete'],
      communicationStatus: 'Dispatch has not created a live trip yet',
      lastUpdated: record.clearanceCompletedAt || record.multimodalReceivedAt,
      ageInHours: ageInHours(record.clearanceCompletedAt || record.multimodalReceivedAt),
      sourceDesk: 'dispatch',
      routeParams: { booking: record.bookingNumber },
      score: 89 + riskBoost(record.storageRisk) + Math.min(ageInHours(record.clearanceCompletedAt || record.multimodalReceivedAt), 72),
    }));
  });

  dispatch.forEach((trip) => {
    if (trip.currentTripStatus === 'Awaiting truck assignment') {
      items.push(createItem({
        blocker: 'dispatch_not_created',
        bookingNumber: trip.bookingNumber,
        shipmentId: trip.tripId,
        customer: trip.customerName,
        consignee: trip.customerName,
        container: trip.containerNumber,
        seal: trip.sealNumber,
        currentStage: 'Corridor Dispatch',
        currentOwner: trip.assignedDispatchOwner,
        riskState: trip.delayRisk === 'High' ? 'High' : 'Medium',
        progressCurrent: 5,
        nextAction: 'Create trip',
        linkedDocs: [trip.blNumber, `T1-${trip.bookingNumber}`],
        communicationStatus: 'Dispatch assignment has not started',
        lastUpdated: trip.lastUpdated,
        ageInHours: ageInHours(trip.lastUpdated),
        sourceDesk: 'dispatch',
        routeParams: { booking: trip.bookingNumber },
        score: 82 + riskBoost(trip.delayRisk) + Math.min(ageInHours(trip.lastUpdated), 72),
      }));
      return;
    }

    if (trip.assignedDriver === 'Not assigned' || trip.assignedDriver === 'Pending driver') {
      items.push(createItem({
        blocker: 'driver_not_assigned',
        bookingNumber: trip.bookingNumber,
        shipmentId: trip.tripId,
        customer: trip.customerName,
        consignee: trip.customerName,
        container: trip.containerNumber,
        seal: trip.sealNumber,
        currentStage: 'Corridor Dispatch',
        currentOwner: trip.assignedDispatchOwner,
        riskState: trip.delayRisk === 'High' ? 'High' : 'Medium',
        progressCurrent: 5,
        nextAction: 'Assign driver',
        linkedDocs: [trip.blNumber, `T1-${trip.bookingNumber}`],
        communicationStatus: 'Driver assignment is still open',
        lastUpdated: trip.lastUpdated,
        ageInHours: ageInHours(trip.lastUpdated),
        sourceDesk: 'dispatch',
        routeParams: { booking: trip.bookingNumber },
        score: 86 + riskBoost(trip.delayRisk) + Math.min(ageInHours(trip.lastUpdated), 72),
      }));
      return;
    }

    if (['In transit', 'Checkpoint hold', 'Delayed'].includes(trip.currentTripStatus) && hasNoCheckpointUpdate(trip)) {
      items.push(createItem({
        blocker: 'no_checkpoint_update',
        bookingNumber: trip.bookingNumber,
        shipmentId: trip.tripId,
        customer: trip.customerName,
        consignee: trip.customerName,
        container: trip.containerNumber,
        seal: trip.sealNumber,
        currentStage: 'Inland Truck Transit',
        currentOwner: trip.assignedDispatchOwner,
        riskState: trip.delayRisk === 'High' ? 'Critical' : 'High',
        progressCurrent: 6,
        nextAction: trip.transitPack.qrGenerated ? 'Request checkpoint update' : 'Push transit pack',
        linkedDocs: [trip.blNumber, `T1-${trip.bookingNumber}`, trip.liveMovement.currentLocation],
        communicationStatus: 'Driver update is overdue',
        lastUpdated: trip.lastUpdated,
        ageInHours: ageInHours(trip.lastUpdated),
        sourceDesk: 'dispatch',
        routeParams: { booking: trip.bookingNumber },
        score: 90 + riskBoost(trip.delayRisk) + Math.min(ageInHours(trip.lastUpdated), 72),
      }));
    }

    if (['Arrived inland', 'Awaiting unload handoff'].includes(trip.currentTripStatus) && !yardByBooking.has(trip.bookingNumber)) {
      items.push(createItem({
        blocker: 'inland_arrival_not_confirmed',
        bookingNumber: trip.bookingNumber,
        shipmentId: trip.tripId,
        customer: trip.customerName,
        consignee: trip.customerName,
        container: trip.containerNumber,
        seal: trip.sealNumber,
        currentStage: 'Dry Port Arrival',
        currentOwner: trip.arrivalReadiness.unloadHandoffOwner,
        riskState: trip.delayRisk === 'High' ? 'High' : 'Medium',
        progressCurrent: 7,
        nextAction: 'Confirm inland arrival',
        linkedDocs: [trip.blNumber, trip.arrivalReadiness.destinationNode],
        communicationStatus: 'Yard handoff record is not opened yet',
        lastUpdated: trip.lastUpdated,
        ageInHours: ageInHours(trip.lastUpdated),
        sourceDesk: 'yard',
        routeParams: { booking: trip.bookingNumber },
        score: 83 + riskBoost(trip.delayRisk) + Math.min(ageInHours(trip.lastUpdated), 72),
      }));
    }
  });

  yard.forEach((record) => {
    if (record.yardStage === 'Cycle closed' || record.emptyReturn.status === 'Cycle closed') return;
    const hasShortageDamageIssue =
      record.consigneeHandoff.handoffStatus === 'Issue raised' ||
      /shortage|damage/i.test(record.consigneeHandoff.finalCargoConditionNote) ||
      /shortage|damage/i.test(record.unloadStatus.varianceNote);

    if (record.arrivalControl.actualArrivalTime && !record.arrivalControl.gateInConfirmed) {
      items.push(createItem({
        blocker: 'inland_arrival_not_confirmed',
        bookingNumber: record.bookingNumber,
        shipmentId: record.tripId,
        customer: record.customerName,
        consignee: record.consigneeName,
        container: record.containerNumber,
        seal: record.sealNumber,
        currentStage: 'Dry Port Arrival',
        currentOwner: record.assignedYardAgent,
        riskState: 'High',
        progressCurrent: 7,
        nextAction: 'Confirm inland arrival',
        linkedDocs: [record.blNumber, record.arrivalControl.yardContact],
        communicationStatus: 'Arrival control still needs gate-in confirmation',
        lastUpdated: record.lastUpdated,
        ageInHours: ageInHours(record.lastUpdated),
        sourceDesk: 'yard',
        routeParams: { booking: record.bookingNumber },
        score: 84 + Math.min(ageInHours(record.lastUpdated), 72),
      }));
      return;
    }

    if (!record.unloadStatus.unloadCompleted) {
      items.push(createItem({
        blocker: 'unload_not_completed',
        bookingNumber: record.bookingNumber,
        shipmentId: record.tripId,
        customer: record.customerName,
        consignee: record.consigneeName,
        container: record.containerNumber,
        seal: record.sealNumber,
        currentStage: 'Dry Port / Yard',
        currentOwner: record.assignedYardAgent,
        riskState: record.emptyReturn.detentionRiskOpen ? 'High' : 'Medium',
        progressCurrent: 7,
        nextAction: 'Confirm unload',
        linkedDocs: [record.blNumber, record.podReadiness.deliveryNoteStatus],
        communicationStatus: 'Unload team still needs to close the handoff',
        lastUpdated: record.lastUpdated,
        ageInHours: ageInHours(record.lastUpdated),
        sourceDesk: 'yard',
        routeParams: { booking: record.bookingNumber },
        score: 88 + (record.emptyReturn.detentionRiskOpen ? 12 : 0) + Math.min(ageInHours(record.lastUpdated), 72),
      }));
      return;
    }

    if (!podReady(record)) {
      items.push(createItem({
        blocker: 'pod_missing',
        bookingNumber: record.bookingNumber,
        shipmentId: record.tripId,
        customer: record.customerName,
        consignee: record.consigneeName,
        container: record.containerNumber,
        seal: record.sealNumber,
        currentStage: 'Customer Delivery / Receipt Confirmation',
        currentOwner: record.assignedYardAgent,
        riskState: 'Medium',
        progressCurrent: 8,
        nextAction: 'Prepare POD',
        linkedDocs: [record.blNumber, record.podReadiness.deliveryNoteStatus],
        communicationStatus: 'POD file is still pending',
        lastUpdated: record.lastUpdated,
        ageInHours: ageInHours(record.lastUpdated),
        sourceDesk: 'yard',
        routeParams: { booking: record.bookingNumber },
        score: 81 + Math.min(ageInHours(record.lastUpdated), 72),
      }));
      return;
    }

    if (hasShortageDamageIssue) {
      items.push(createItem({
        blocker: 'shortage_damage_under_review',
        bookingNumber: record.bookingNumber,
        shipmentId: record.tripId,
        customer: record.customerName,
        consignee: record.consigneeName,
        container: record.containerNumber,
        seal: record.sealNumber,
        currentStage: 'Customer Delivery / Receipt Confirmation',
        currentOwner: record.assignedYardAgent,
        riskState: 'Critical',
        progressCurrent: 8,
        nextAction: 'Review shortage / damage',
        linkedDocs: [record.blNumber, record.consigneeHandoff.finalCargoConditionNote],
        communicationStatus: 'Claim or investigation workflow is open',
        lastUpdated: record.lastUpdated,
        ageInHours: ageInHours(record.lastUpdated),
        sourceDesk: 'yard',
        routeParams: { booking: record.bookingNumber },
        score: 98 + Math.min(ageInHours(record.lastUpdated), 72),
      }));
      return;
    }

    if (record.consigneeHandoff.handoffStatus !== 'Completed') {
      items.push(createItem({
        blocker: 'customer_confirmation_pending',
        bookingNumber: record.bookingNumber,
        shipmentId: record.tripId,
        customer: record.customerName,
        consignee: record.consigneeName,
        container: record.containerNumber,
        seal: record.sealNumber,
        currentStage: 'Customer Delivery / Receipt Confirmation',
        currentOwner: record.assignedYardAgent,
        riskState: 'Medium',
        progressCurrent: 8,
        nextAction: 'Request customer confirmation',
        linkedDocs: [record.blNumber, record.podReadiness.receivingContact],
        communicationStatus: 'Customer confirmation reminder is still open',
        lastUpdated: record.lastUpdated,
        ageInHours: ageInHours(record.lastUpdated),
        sourceDesk: 'yard',
        routeParams: { booking: record.bookingNumber },
        score: 85 + Math.min(ageInHours(record.lastUpdated), 72),
      }));
      return;
    }

    if (record.emptyReturn.detentionRiskOpen && !record.emptyReturn.emptyReturned) {
      items.push(createItem({
        blocker: 'empty_return_overdue',
        bookingNumber: record.bookingNumber,
        shipmentId: record.tripId,
        customer: record.customerName,
        consignee: record.consigneeName,
        container: record.containerNumber,
        seal: record.sealNumber,
        currentStage: 'Empty Return',
        currentOwner: record.emptyReturn.returnOwner,
        riskState: 'Critical',
        progressCurrent: 9,
        nextAction: 'Start empty return follow-up',
        linkedDocs: [record.blNumber, record.emptyReturn.designatedDepot],
        communicationStatus: 'Empty return escalation should be sent now',
        lastUpdated: record.lastUpdated,
        ageInHours: ageInHours(record.lastUpdated),
        sourceDesk: 'empty_return',
        routeParams: { booking: record.bookingNumber },
        score: 96 + Math.min(ageInHours(record.lastUpdated), 72),
      }));
      return;
    }

    if (record.emptyReturn.emptyReturned && !record.emptyReturn.returnReceiptAvailable) {
      items.push(createItem({
        blocker: 'return_receipt_missing',
        bookingNumber: record.bookingNumber,
        shipmentId: record.tripId,
        customer: record.customerName,
        consignee: record.consigneeName,
        container: record.containerNumber,
        seal: record.sealNumber,
        currentStage: 'Empty Return',
        currentOwner: record.emptyReturn.returnOwner,
        riskState: 'High',
        progressCurrent: 9,
        nextAction: 'Upload return receipt',
        linkedDocs: [record.blNumber, record.emptyReturn.designatedDepot],
        communicationStatus: 'Return receipt upload is still missing',
        lastUpdated: record.lastUpdated,
        ageInHours: ageInHours(record.lastUpdated),
        sourceDesk: 'empty_return',
        routeParams: { booking: record.bookingNumber },
        score: 87 + Math.min(ageInHours(record.lastUpdated), 72),
      }));
    }
  });

  return dedupeByBookingAndBlocker(items);
}

function createItem(input: {
  blocker: ShipmentBlockerType;
  bookingNumber: string;
  shipmentId: string;
  customer: string;
  consignee: string;
  container: string;
  seal: string;
  currentStage: string;
  currentOwner: string;
  riskState: ShipmentAttentionItem['riskState'];
  progressCurrent: number;
  nextAction: string;
  linkedDocs: string[];
  communicationStatus: string;
  lastUpdated: string;
  ageInHours: number;
  sourceDesk: ShipmentAttentionItem['sourceDesk'];
  routeParams: Record<string, string>;
  score: number;
}): ShipmentAttentionItem {
  const route = blockerRoutes[input.blocker];
  const params = new URLSearchParams({
    ...input.routeParams,
    focus: input.blocker,
  });

  return {
    ...route,
    bookingNumber: input.bookingNumber,
    shipmentId: input.shipmentId,
    customer: input.customer,
    consignee: input.consignee,
    container: input.container,
    seal: input.seal,
    currentStage: input.currentStage,
    currentOwner: input.currentOwner || route.ownerRole,
    blocker: input.blocker,
    blockerLabel: blockerLabels[input.blocker],
    riskState: input.riskState,
    milestoneProgress: {
      current: input.progressCurrent,
      total: 10,
      label: `${Math.min(input.progressCurrent + 1, 10)} / 10 stages progressed`,
    },
    nextAction: input.nextAction,
    linkedDocs: input.linkedDocs.filter(Boolean),
    communicationStatus: input.communicationStatus,
    lastUpdated: input.lastUpdated,
    ageInHours: input.ageInHours,
    attentionScore: input.score,
    deskHref: `${route.deskRoute}?${params.toString()}`,
    sourceDesk: input.sourceDesk,
  };
}

function readStoredArray<T>(key: string, fallback: T[]) {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function ageInHours(value: string) {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return 0;
  return Math.max(0, Math.round((Date.now() - timestamp) / (60 * 60 * 1000)));
}

function riskBoost(value: string) {
  if (value === 'Urgent' || value === 'High') return 18;
  if (value === 'Approaching' || value === 'Medium') return 10;
  return 0;
}

function dedupeByBookingAndBlocker(items: ShipmentAttentionItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.bookingNumber}:${item.blocker}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isOriginReady(shipment: SupplierDeskShipment) {
  const hasCargoLines = shipment.cargoItems.length > 0 && shipment.cargoItems.every((item) => item.status === 'Complete');
  const docsReady = shipment.documents
    .filter((item) => ['Commercial invoice', 'Packing list', 'BL draft', 'Final BL'].includes(item.type))
    .every((item) => item.status !== 'missing');
  return (
    hasCargoLines &&
    docsReady &&
    Boolean(shipment.container.containerNumber) &&
    Boolean(shipment.container.sealNumber) &&
    shipment.container.stuffingConfirmed &&
    shipment.container.gateInConfirmed &&
    shipment.handoff.blStatus !== 'Draft pending'
  );
}

function hasNoCheckpointUpdate(trip: DispatchTripRecord) {
  if (!trip.lastGpsTimestamp || trip.lastGpsTimestamp === 'Not started') return true;
  if (trip.liveMovement.movementHealth === 'No update risk' || trip.liveMovement.movementHealth === 'Checkpoint hold') return true;
  const age = ageInHours(trip.lastGpsTimestamp);
  return age >= 6;
}

function podReady(record: YardRecord) {
  return ['Prepared', 'Uploaded', 'Signed', 'Verified', 'Complete'].some((label) =>
    record.podReadiness.deliveryNoteStatus.toLowerCase().includes(label.toLowerCase()),
  );
}
