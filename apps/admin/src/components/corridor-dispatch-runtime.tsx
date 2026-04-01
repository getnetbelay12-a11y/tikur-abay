'use client';

import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { memo, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { corridorDispatchTrips, type DispatchTripRecord, type DispatchTripStatus } from '../lib/corridor-dispatch-demo-data';
import { apiGet, apiPost } from '../lib/api';
import {
  hydrateManualWorkflowStateFromServer,
  manualCorridorStorageUpdatedEvent,
  mergeDispatchTrips,
  upsertManualDispatchTrip,
} from '../lib/manual-corridor-journey';
import { downloadBillOfLadingPdf, downloadDispatchLoadingReportPdf, downloadDriverTransitPacketPdf, downloadSimpleShippingPdf, type ShippingBillOfLadingPdfPayload } from '../lib/shipping-pdf';
import { readShippingPhase1Workspace, shippingPhase1UpdatedEvent } from '../lib/shipping-phase1';
import { useConsoleI18n } from '../lib/use-console-i18n';
import { CorridorDispatchPrimaryWorkspace } from './corridor-dispatch-primary-workspace';

const CorridorDispatchSecondaryPanels = dynamic(
  () => import('./corridor-dispatch-secondary-panels').then((module) => module.CorridorDispatchSecondaryPanels),
  {
    ssr: false,
    loading: () => (
      <div className="dispatch-empty-state dispatch-empty-state-compact">
        Loading dispatch detail panels...
      </div>
    ),
  },
);
const progressLabels = [
  'Release handoff received',
  'Truck assigned',
  'Driver assigned',
  'Transit pack ready',
  'Departed',
  'Checkpoint progress',
  'Arrived inland',
  'Ready for unload handoff',
];

type DispatchAssignmentPreset = {
  truckPlate: string;
  trailerPlate: string;
  driverName: string;
  driverPhone: string;
};

const sharedDriverPhone = '+251900000015';
const sharedDriverPin = '2112';
const dispatchAssignmentPresets: DispatchAssignmentPreset[] = [
  { truckPlate: 'ET-TRK-46291', trailerPlate: 'ET-TRL-77101', driverName: 'Abel Hailu', driverPhone: sharedDriverPhone },
  { truckPlate: 'ET-TRK-44218', trailerPlate: 'ET-TRL-77102', driverName: 'Mohammed Omar', driverPhone: sharedDriverPhone },
  { truckPlate: 'ET-TRK-55102', trailerPlate: 'ET-TRL-77103', driverName: 'Getachew Kebede', driverPhone: sharedDriverPhone },
  { truckPlate: 'ET-TRK-33092', trailerPlate: 'ET-TRL-77104', driverName: 'Hassen Nur', driverPhone: sharedDriverPhone },
  { truckPlate: 'ET-TRK-22714', trailerPlate: 'ET-TRL-77105', driverName: 'Amanuel Desta', driverPhone: sharedDriverPhone },
  { truckPlate: 'ET-TRK-19834', trailerPlate: 'ET-TRL-77106', driverName: 'Yohannes Mulu', driverPhone: sharedDriverPhone },
] as const;
const truckOptions = dispatchAssignmentPresets.map((item) => item.truckPlate);
const driverOptions = dispatchAssignmentPresets.map((item) => item.driverName);
const driverPhoneByName: Record<string, string> = Object.fromEntries(dispatchAssignmentPresets.map((item) => [item.driverName, item.driverPhone]));
const assignmentPresetByTruck: Record<string, DispatchAssignmentPreset> = Object.fromEntries(dispatchAssignmentPresets.map((item) => [item.truckPlate, item]));
const routeOptions = ['Djibouti Port -> Galafi -> Modjo', 'Djibouti Port -> Galafi -> Addis', 'Djibouti Port -> Galafi -> Adama', 'Djibouti Port -> Galafi -> Kality'];
const shippingMovementStorageKeys = new Set([
  'tikur-abay:shipping-phase3:fleet',
  'tikur-abay:shipping-phase3:containers',
  'tikur-abay:shipping-phase3:incidents',
]);
let cachedDispatchOverlaySignature = '';
let cachedDispatchOverlayTrips: DispatchTripRecord[] | null = null;

type DispatchLivePoint = {
  tripCode?: string;
  vehicleId?: string;
  plateNumber?: string;
  locationLabel?: string;
  latestGpsAt?: string | null;
  latitude?: number;
  longitude?: number;
  speed?: number;
};

function formatDate(value: string) {
  if (!value || value === 'Not started') return value || 'Pending';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function getProgressIndex(status: DispatchTripStatus) {
  switch (status) {
    case 'Awaiting truck assignment':
    case 'Awaiting empty return assignment':
      return 0;
    case 'Awaiting driver assignment':
      return 2;
    case 'Assigned':
    case 'Ready to depart':
    case 'Awaiting empty return departure':
      return 3;
    case 'In transit':
    case 'Checkpoint hold':
    case 'Delayed':
    case 'Empty return in transit':
      return 5;
    case 'Arrived inland':
    case 'Empty returned':
      return 6;
    case 'Awaiting unload handoff':
      return 7;
    default:
      return 0;
  }
}

function transitPackReady(trip: DispatchTripRecord) {
  return trip.transitPack.packetComplete && trip.transitPack.qrGenerated;
}

function buildDriverPacketItems(trip: DispatchTripRecord) {
  return [
    { label: 'T1 transit document', complete: true },
    { label: 'Commercial invoice', complete: true },
    { label: 'Packing list', complete: true },
    { label: 'Transport document', complete: true },
    { label: 'Release note', complete: true },
    { label: 'Truck plate', complete: trip.assignedTruck !== 'Not assigned' },
    { label: 'Trailer plate', complete: trip.assignedTrailer !== 'Pending trailer' },
    { label: 'Assigned driver', complete: trip.assignedDriver !== 'Not assigned' && trip.assignedDriver !== 'Pending driver' },
    { label: 'Container number', complete: true },
    { label: 'Seal number', complete: true },
    { label: 'Consignee/contact', complete: true },
    { label: 'Route note', complete: true },
    { label: 'Special handling note', complete: true },
    { label: 'Item summary', complete: true },
  ];
}

function driverPacketDocumentList(trip: DispatchTripRecord) {
  return [
    `T1 transit document · T1-${trip.bookingNumber}`,
    `Bill of lading · ${trip.blNumber}`,
    `Packing list · PL-${trip.bookingNumber}`,
    `Invoice summary · INV-${trip.bookingNumber}`,
    `Release note · REL-${trip.bookingNumber}`,
    `Container number · ${trip.containerNumber}`,
    `Seal number · ${trip.sealNumber}`,
    `Truck / trailer / driver assignment · ${trip.assignedTruck} / ${trip.assignedTrailer} / ${trip.assignedDriver}`,
    `Route instruction · ${trip.corridorRoute}`,
  ];
}

function driverPacketDownloads(trip: DispatchTripRecord) {
  return [
    {
      key: 't1',
      label: 'Download T1',
      fileName: `${trip.bookingNumber.toLowerCase()}-t1.pdf`,
      title: 'T1 TRANSIT DOCUMENT',
      subtitle: `Trip ${trip.tripId} · Booking ${trip.bookingNumber}`,
      lines: [
        `T1 Reference: T1-${trip.bookingNumber}`,
        `Customer: ${trip.customerName}`,
        `Container: ${trip.containerNumber}`,
        `Seal: ${trip.sealNumber}`,
        `Route: ${trip.corridorRoute}`,
        `Truck / Driver: ${trip.assignedTruck} / ${trip.assignedDriver}`,
      ],
    },
    {
      key: 'bl',
      label: 'Download BL',
      fileName: `${trip.bookingNumber.toLowerCase()}-bl.pdf`,
      title: 'BILL OF LADING COPY FOR DRIVER',
      subtitle: `Trip ${trip.tripId} · Booking ${trip.bookingNumber}`,
      lines: [
        `BL Number: ${trip.blNumber}`,
        `Customer: ${trip.customerName}`,
        `Container: ${trip.containerNumber}`,
        `Seal: ${trip.sealNumber}`,
        `Route: ${trip.corridorRoute}`,
      ],
    },
    {
      key: 'invoice',
      label: 'Download Invoice',
      fileName: `${trip.bookingNumber.toLowerCase()}-invoice.pdf`,
      title: 'INVOICE SUMMARY FOR DRIVER',
      subtitle: `Trip ${trip.tripId} · Booking ${trip.bookingNumber}`,
      lines: [
        `Invoice Reference: INV-${trip.bookingNumber}`,
        `Customer: ${trip.customerName}`,
        `Container: ${trip.containerNumber}`,
        `Route: ${trip.corridorRoute}`,
      ],
    },
    {
      key: 'packing-list',
      label: 'Download Packing List',
      fileName: `${trip.bookingNumber.toLowerCase()}-packing-list.pdf`,
      title: 'PACKING LIST FOR DRIVER',
      subtitle: `Trip ${trip.tripId} · Booking ${trip.bookingNumber}`,
      lines: [
        `Packing List Reference: PL-${trip.bookingNumber}`,
        `Customer: ${trip.customerName}`,
        `Container: ${trip.containerNumber}`,
        `Seal: ${trip.sealNumber}`,
      ],
    },
    {
      key: 'release-note',
      label: 'Download Release Note',
      fileName: `${trip.bookingNumber.toLowerCase()}-release-note.pdf`,
      title: 'RELEASE NOTE FOR DRIVER',
      subtitle: `Trip ${trip.tripId} · Booking ${trip.bookingNumber}`,
      lines: [
        `Release Note Reference: REL-${trip.bookingNumber}`,
        `Customer: ${trip.customerName}`,
        `Container: ${trip.containerNumber}`,
        `Truck / Driver: ${trip.assignedTruck} / ${trip.assignedDriver}`,
      ],
    },
    {
      key: 'container-seal',
      label: 'Download Container + Seal',
      fileName: `${trip.bookingNumber.toLowerCase()}-container-seal.pdf`,
      title: 'CONTAINER AND SEAL CONTROL SHEET',
      subtitle: `Trip ${trip.tripId} · Booking ${trip.bookingNumber}`,
      lines: [
        `Container Number: ${trip.containerNumber}`,
        `Seal Number: ${trip.sealNumber}`,
        `Customer: ${trip.customerName}`,
      ],
    },
    {
      key: 'route',
      label: 'Download Route Note',
      fileName: `${trip.bookingNumber.toLowerCase()}-route-note.pdf`,
      title: 'ROUTE AND CHECKPOINT INSTRUCTION',
      subtitle: `Trip ${trip.tripId} · Booking ${trip.bookingNumber}`,
      lines: [
        `Route: ${trip.corridorRoute}`,
        `Origin handoff: ${trip.originHandoffPoint}`,
        `Destination: ${trip.inlandDestination}`,
        `Checkpoint guide: Djibouti -> PK12 -> Ali Sabieh -> Galafi -> Awash -> Inland destination`,
        `Dispatch note: ${trip.dispatchNote}`,
      ],
    },
    {
      key: 'assignment',
      label: 'Download Driver Assignment',
      fileName: `${trip.bookingNumber.toLowerCase()}-driver-assignment.pdf`,
      title: 'TRUCK / TRAILER / DRIVER ASSIGNMENT',
      subtitle: `Trip ${trip.tripId} · Booking ${trip.bookingNumber}`,
      lines: [
        `Truck: ${trip.assignedTruck}`,
        `Trailer: ${trip.assignedTrailer}`,
        `Driver: ${trip.assignedDriver}`,
        `Partner: ${trip.partnerName}`,
        `Planned departure: ${formatDate(trip.plannedDepartureTime)}`,
      ],
    },
  ];
}

function buildDispatchBillCopyPayload(
  trip: DispatchTripRecord,
  workspace: ReturnType<typeof readShippingPhase1Workspace>,
): ShippingBillOfLadingPdfPayload | null {
  const bill = workspace.billsOfLading.find((item) => item.bookingId === trip.bookingNumber);
  if (!bill || bill.status !== 'final') return null;

  const invoice = workspace.invoices.find((item) => item.bookingId === trip.bookingNumber);
  const chargeAmount = (name: string, currency: string) =>
    invoice?.charges.find((item) => item.name.toLowerCase() === name.toLowerCase() && item.currency === currency)?.amount || 0;

  return {
    fileName: `${bill.houseBlNumber || trip.bookingNumber}-bl-copy.pdf`,
    bookingReference: trip.bookingNumber,
    documentTitle: 'Multimodal Transport Bill of Lading',
    blNumber: bill.houseBlNumber,
    masterBlNumber: bill.masterBlNumber,
    slotCarrierBillNumber: bill.slotCarrierBillNumber,
    issueDate: bill.issueDate,
    placeOfIssue: bill.placeOfIssue,
    shipper: bill.shipperName,
    consignee: bill.consigneeName,
    notifyParty: bill.notifyParty,
    portOfLoading: bill.portOfLoading,
    portOfDischarge: bill.portOfDischarge,
    placeOfReceipt: bill.placeOfReceipt,
    placeOfDelivery: bill.placeOfDelivery,
    vessel: bill.vesselName,
    voyage: bill.voyageNumber,
    shippedOnBoardDate: bill.shippedOnBoardDate,
    incoterm: 'CIF',
    freightTerm: bill.freightTerm,
    containerNumber: bill.containerNumber,
    sealNumber: bill.sealNumber,
    containerType: '40HQ',
    packages: bill.packageSummary,
    weight: bill.grossWeight,
    measurementCbm: bill.measurementCbm,
    marksAndNumbers: bill.marksAndNumbers,
    cargoDescription: bill.cargoDescription,
    hsCode: bill.hsCode,
    tinNumber: bill.consigneeTinNumber,
    tinAreaCode: bill.tinAreaCode,
    lcNumber: bill.letterOfCreditNumber,
    numberOfOriginalBills: bill.numberOfOriginalBills,
    seaFreight: `USD ${chargeAmount('Sea freight', 'USD').toLocaleString('en-US')}`,
    clearanceFreight: `USD ${chargeAmount('Port clearance', 'USD').toLocaleString('en-US')}`,
    inlandFreight: `ETB ${chargeAmount('Inland transport', 'ETB').toLocaleString('en-US')}`,
    outputLabel: 'COPY',
    printVariant: 'copy',
  };
}

function compareBookingOrder(left: string, right: string) {
  const leftKey = left.replace(/\D/g, '');
  const rightKey = right.replace(/\D/g, '');
  if (leftKey.length !== rightKey.length) return rightKey.length - leftKey.length;
  return rightKey.localeCompare(leftKey);
}

function readyForArrivalHandoff(trip: DispatchTripRecord) {
  const latestCheckpoint = trip.checkpoints[trip.checkpoints.length - 1];
  const noBlockingIssue = !trip.issues.some((issue) => issue.severity === 'High');
  return (
    transitPackReady(trip) &&
    latestCheckpoint?.sealConfirmed === true &&
    noBlockingIssue &&
    trip.arrivalReadiness.arrivalNoticeSent &&
    trip.arrivalReadiness.unloadContactConfirmed &&
    (trip.currentTripStatus === 'Arrived inland' || trip.currentTripStatus === 'Awaiting unload handoff')
  );
}

function hasLoadedForDeparture(trip: DispatchTripRecord) {
  return Boolean(trip.cargoLoadedAt);
}

function getTripNextActionLabel(trip: DispatchTripRecord) {
  const truckAssigned = trip.assignedTruck !== 'Not assigned';
  const driverAssigned = trip.assignedDriver !== 'Not assigned' && trip.assignedDriver !== 'Pending driver';
  const packSynced = trip.transitPack.mobileSyncStatus === 'Synced to mobile' && trip.transitPack.qrGenerated;
  const loaded = hasLoadedForDeparture(trip);
  const isEmptyReturnTrip = trip.tripId.startsWith('ERT-') || trip.routeType.toLowerCase().includes('empty return');
  const departed = ['In transit', 'Checkpoint hold', 'Delayed', 'Arrived inland', 'Awaiting unload handoff', 'Empty return in transit', 'Empty returned'].includes(trip.currentTripStatus);
  const arrivedInland = trip.currentTripStatus === 'Arrived inland' || trip.currentTripStatus === 'Awaiting unload handoff';

  if (!truckAssigned) return 'Assign truck';
  if (!driverAssigned) return 'Assign driver';
  if (isEmptyReturnTrip && trip.currentTripStatus === 'Awaiting empty return departure') return 'Monitor empty release';
  if (isEmptyReturnTrip && trip.currentTripStatus === 'Empty return in transit') return 'Monitor empty return';
  if (isEmptyReturnTrip && trip.currentTripStatus === 'Empty returned') return 'Confirm empty return';
  if (!packSynced) return 'Push pack';
  if (!loaded) return 'Log loading complete';
  if (!departed) return 'Confirm departure';
  if (!arrivedInland) return 'Confirm arrival';
  if (!trip.arrivalReadiness.arrivalNoticeSent) return 'Send arrival notice';
  if (!trip.arrivalReadiness.unloadContactConfirmed) return 'Confirm unload contact';
  if (readyForArrivalHandoff(trip) && trip.currentTripStatus !== 'Awaiting unload handoff') return 'Push yard handoff';
  return 'Monitor movement';
}

function nextStepClass(isActive: boolean) {
  return isActive ? 'supplier-next-step-button' : '';
}

function activeStepPanelClass(isActive: boolean) {
  return isActive ? 'operations-step-active' : '';
}

function compactStatus(value: string) {
  return value.replace(/_/g, ' ');
}

function formatDispatchMilestone(value: string) {
  const normalized = compactStatus(value);
  if (normalized === 'Arrived inland') return 'Arrived inland (FULL_IN)';
  if (normalized === 'Awaiting unload handoff') return 'Awaiting unload handoff (FULL_IN)';
  if (normalized === 'Awaiting empty return assignment') return 'Awaiting empty return assignment (EMPTY_OUT)';
  if (normalized === 'Awaiting empty return departure') return 'Awaiting empty return departure (EMPTY_OUT)';
  if (normalized === 'Empty return in transit') return 'Empty return in transit (EMPTY_OUT)';
  if (normalized === 'Empty returned') return 'Empty returned (EMPTY_RETURNED)';
  return normalized;
}

function shouldSyncTripToBackend(trip: DispatchTripRecord) {
  return (
    trip.id.startsWith('manual-dispatch-') ||
    trip.id.startsWith('manual-dispatch-return-') ||
    trip.tripId.startsWith('TRP-BK-') ||
    trip.tripId.startsWith('TRP-TB-') ||
    trip.tripId.startsWith('TRP-TAB-') ||
    trip.tripId.startsWith('ERT-BK-') ||
    trip.tripId.startsWith('ERT-TB-') ||
    trip.tripId.startsWith('ERT-TAB-') ||
    trip.bookingNumber.startsWith('BK-') ||
    trip.bookingNumber.startsWith('TB-') ||
    trip.bookingNumber.startsWith('TAB-')
  );
}

function syncTripsToBackend(trips: DispatchTripRecord[]) {
  trips.filter(shouldSyncTripToBackend).forEach((trip) => {
    void syncManualTripToBackend(trip);
  });
}

function normalizeBackendTripStatus(status: DispatchTripStatus) {
  switch (status) {
    case 'Awaiting truck assignment':
      return 'awaiting_truck_assignment';
    case 'Awaiting driver assignment':
      return 'awaiting_driver_assignment';
    case 'Assigned':
      return 'assigned';
    case 'Ready to depart':
      return 'ready_to_depart';
    case 'In transit':
      return 'in_transit';
    case 'Checkpoint hold':
      return 'checkpoint_hold';
    case 'Delayed':
      return 'delayed';
    case 'Arrived inland':
      return 'arrived_inland';
    case 'Awaiting unload handoff':
      return 'handed_to_yard';
    case 'Awaiting empty return assignment':
      return 'awaiting_empty_return_assignment';
    case 'Awaiting empty return departure':
      return 'awaiting_empty_return_departure';
    case 'Empty return in transit':
      return 'empty_return_in_transit';
    case 'Empty returned':
      return 'empty_returned';
    default:
      return 'assigned';
  }
}

async function syncManualTripToBackend(trip: DispatchTripRecord) {
  if (!shouldSyncTripToBackend(trip)) return;
  try {
    const driverPhone =
      trip.driverStatus.startsWith('Driver assigned · ')
        ? trip.driverStatus.replace('Driver assigned · ', '')
        : driverPhoneByName[trip.assignedDriver] || '';
    const driverType = trip.driverType === 'External' ? 'external_driver' : 'internal_driver';
    await apiPost('/corridor/manual-sync/dispatch-trip', {
      bookingNumber: trip.bookingNumber,
      tripId: trip.tripId,
      customerName: trip.customerName,
      containerNumber: trip.containerNumber,
      sealNumber: trip.sealNumber,
      serviceType: trip.serviceType,
      route: trip.corridorRoute,
      corridorRoute: trip.corridorRoute,
      origin: trip.originHandoffPoint,
      destination: trip.inlandDestination,
      inlandDestination: trip.inlandDestination,
      shippingLine: 'MSC',
      originPort: 'Shanghai',
      finalDeliveryLocation: trip.inlandDestination,
      incoterm: 'CFR',
      driverName: trip.assignedDriver === 'Not assigned' || trip.assignedDriver === 'Pending driver' ? '' : trip.assignedDriver,
      driverPhone,
      driverType,
      truckPlate: trip.assignedTruck === 'Not assigned' ? '' : trip.assignedTruck,
      trailerPlate: trip.assignedTrailer === 'Pending trailer' ? '' : trip.assignedTrailer,
      blNumber: trip.blNumber,
      transitDocumentNumber: `T1-${trip.bookingNumber}`,
      packingListNumber: `PL-${trip.bookingNumber}`,
      invoiceNumber: `INV-${trip.bookingNumber}`,
      releaseNoteNumber: `REL-${trip.bookingNumber}`,
      expectedArrivalTime: trip.expectedArrivalTime,
      eta: trip.liveMovement.eta || trip.expectedArrivalTime,
      actualDeparture: ['In transit', 'Checkpoint hold', 'Delayed', 'Arrived inland', 'Awaiting unload handoff', 'Empty return in transit', 'Empty returned'].includes(trip.currentTripStatus)
        ? trip.departedDjiboutiAt || trip.checkpoints.find((event) => event.label === 'Gate-out from Djibouti')?.timestamp || trip.lastUpdated
        : undefined,
      actualArrival: ['Arrived inland', 'Awaiting unload handoff', 'Empty returned'].includes(trip.currentTripStatus)
        ? trip.checkpoints.find((event) => event.location === trip.inlandDestination)?.timestamp || trip.lastUpdated
        : undefined,
      currentCheckpoint: trip.liveMovement.currentLocation,
      tripStatus: normalizeBackendTripStatus(trip.currentTripStatus),
      dispatchStatus: normalizeBackendTripStatus(trip.currentTripStatus),
    });
  } catch (error) {
    console.error('Failed to sync manual dispatch trip to backend', error);
  }
}

function syncTripToTracking(
  trip: DispatchTripRecord,
  eventType: string,
  location: string,
  description: string,
) {
  async function postTracking(path: string, body: Record<string, unknown>) {
    try {
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        return;
      }
    } catch {
      // Best-effort sync only; dispatch actions should not fail because tracking mirror calls are unavailable.
    }
  }

  const payload = {
    bookingNo: trip.bookingNumber,
    containerNo: trip.containerNumber,
    blNo: trip.blNumber,
    currentLocation: location,
    consignee: trip.customerName,
    eta: trip.expectedArrivalTime,
  };
  void postTracking('/api/tracking/register-origin', {
      ...payload,
      eventType,
      description,
    });
  void postTracking('/api/tracking/event', {
    containerNo: trip.containerNumber,
    eventType,
    location,
    source: 'dispatch',
    description,
  });
}

function overlayTrackingState(trips: DispatchTripRecord[]) {
  if (typeof window === 'undefined') return trips;
  const baseSignature = JSON.stringify(
    trips.map((trip) => [
      trip.id,
      trip.tripId,
      trip.bookingNumber,
      trip.currentTripStatus,
      trip.assignedTruck,
      trip.assignedDriver,
      trip.lastGpsTimestamp,
      trip.liveMovement.currentLocation,
      trip.liveMovement.distanceToDestinationKm,
    ]),
  );
  const workspace = readShippingPhase1Workspace();
  const movementSignature = JSON.stringify(
    workspace.containerMovements.map((item) => [
      item.bookingId,
      item.currentStatus,
      item.currentLocation,
      item.assignedTruckId,
      item.assignedDriverName,
      item.events?.[0]?.timestamp,
    ]),
  );
  const fleetSignature = JSON.stringify(
    workspace.fleet.map((item) => [item.truckId, item.plateNumber, item.status, item.currentLocation, item.assignedBookingId]),
  );
  const signature = `${baseSignature}|${movementSignature}|${fleetSignature}`;
  if (cachedDispatchOverlaySignature === signature && cachedDispatchOverlayTrips) {
    return cachedDispatchOverlayTrips;
  }
  const movementByBooking = new Map(workspace.containerMovements.map((item) => [item.bookingId, item] as const));
  const fleetByTruck = new Map(workspace.fleet.map((item) => [item.truckId, item] as const));
  const nextTrips = trips.map((trip) => {
    const isEmptyReturnTrip = trip.tripId.startsWith('ERT-') || trip.routeType.toLowerCase().includes('empty return');
    if (isEmptyReturnTrip) return trip;
    const movement = movementByBooking.get(trip.bookingNumber);
    if (!movement) return trip;
    const fleetTruck = movement.assignedTruckId ? fleetByTruck.get(movement.assignedTruckId) : null;
    const nextDistance =
      movement.currentStatus === 'Arrived inland' || movement.currentStatus === 'Empty returned'
        ? 0
        : movement.currentLocation.toLowerCase().includes('galafi')
          ? Math.max(trip.liveMovement.distanceToDestinationKm - 180, 0)
          : movement.currentLocation.toLowerCase().includes('adama')
            ? 0
            : trip.liveMovement.distanceToDestinationKm;
    const nextStatus: DispatchTripStatus =
      movement.currentStatus === 'Arrived inland'
        ? 'Arrived inland'
        : movement.currentStatus === 'In transit'
          ? 'In transit'
          : movement.currentStatus === 'Truck assigned'
            ? movement.assignedDriverName
              ? 'Assigned'
              : 'Awaiting driver assignment'
            : trip.currentTripStatus;
    return {
      ...trip,
      assignedTruck: fleetTruck?.plateNumber || trip.assignedTruck,
      assignedDriver: movement.assignedDriverName || trip.assignedDriver,
      lastGpsTimestamp: movement.events[0]?.timestamp || trip.lastGpsTimestamp,
      currentTripStatus: nextStatus,
      liveMovement: {
        ...trip.liveMovement,
        currentLocation: movement.currentLocation || trip.liveMovement.currentLocation,
        distanceToDestinationKm: nextDistance,
        movementHealth: movement.currentStatus === 'In transit' ? 'On schedule' : trip.liveMovement.movementHealth,
        speedSummary:
          movement.currentStatus === 'In transit'
            ? `Tracked by ${movement.assignedTruckId || 'container event'} · ${movement.currentLatitude.toFixed(3)}, ${movement.currentLongitude.toFixed(3)}`
            : trip.liveMovement.speedSummary,
      },
    };
  });
  cachedDispatchOverlaySignature = signature;
  cachedDispatchOverlayTrips = nextTrips;
  return nextTrips;
}

export const CorridorDispatchRuntime = memo(function CorridorDispatchRuntime() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tx } = useConsoleI18n();
  const headerQuery = searchParams.get('query') || searchParams.get('q') || '';
  const [trips, setTrips] = useState<DispatchTripRecord[]>(() => overlayTrackingState(corridorDispatchTrips));
  const [detailsReady, setDetailsReady] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [searchValue, setSearchValue] = useState(headerQuery);
  const deferredSearchValue = useDeferredValue(searchValue);
  const [statusFilter, setStatusFilter] = useState<'all' | DispatchTripStatus>('all');
  const [corridorFilter, setCorridorFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState<'all' | DispatchTripRecord['delayRisk']>('all');
  const [dateRange, setDateRange] = useState<'all' | '7d' | '14d' | '30d'>('all');
  const [assignmentDraft, setAssignmentDraft] = useState({
    truckPlate: '',
    trailerPlate: '',
    driverName: '',
    driverPhone: '',
  });
  const [liveFleetPoints, setLiveFleetPoints] = useState<DispatchLivePoint[]>([]);
  const skipNextManualDispatchSyncRef = useRef(false);
  const lastTripSignatureRef = useRef('');

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const enableDetails = () => {
      if (!cancelled) {
        setDetailsReady(true);
      }
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(enableDetails, { timeout: 250 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(idleId);
        if (timeoutId) clearTimeout(timeoutId);
      };
    }

    timeoutId = setTimeout(enableDetails, 80);
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStorage = (event?: Event) => {
      if (event instanceof StorageEvent && event.key && event.key !== 'tikur-abay:manual-corridor:dispatch-trips') {
        return;
      }
      if (event && 'detail' in event && event.detail && typeof event.detail === 'object') {
        const detail = event.detail as { key?: string; bookingNumber?: string };
        if (detail.key && detail.key !== 'tikur-abay:manual-corridor:dispatch-trips' && detail.key !== 'dispatch-trips') {
          return;
        }
      }
      if (skipNextManualDispatchSyncRef.current) {
        skipNextManualDispatchSyncRef.current = false;
        return;
      }
      const nextTrips = overlayTrackingState(mergeDispatchTrips([]));
      const nextSignature = JSON.stringify(
        nextTrips.map((trip) => [
          trip.id,
          trip.tripId,
          trip.bookingNumber,
          trip.currentTripStatus,
          trip.assignedTruck,
          trip.assignedDriver,
          trip.lastGpsTimestamp,
          trip.liveMovement.currentLocation,
        ]),
      );
      if (lastTripSignatureRef.current === nextSignature) {
        return;
      }
      lastTripSignatureRef.current = nextSignature;
      setTrips(nextTrips);
      syncTripsToBackend(nextTrips);
      const bookingNumber =
        event && 'detail' in event && event.detail && typeof event.detail === 'object' && 'bookingNumber' in event.detail
          ? String((event.detail as { bookingNumber?: string }).bookingNumber || '')
          : '';
      if (bookingNumber) {
        const matched = nextTrips.find((trip) => trip.bookingNumber === bookingNumber);
        if (matched) {
          setSelectedTripId(matched.id);
        }
      }
    };
    handleStorage();
    void hydrateManualWorkflowStateFromServer().then(() => {
      handleStorage();
    });
    window.addEventListener(manualCorridorStorageUpdatedEvent, handleStorage as EventListener);
    return () => {
      window.removeEventListener(manualCorridorStorageUpdatedEvent, handleStorage as EventListener);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleShippingPhaseUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string }>).detail;
      if (!detail?.key || !shippingMovementStorageKeys.has(detail.key)) {
        return;
      }
      const nextTrips = overlayTrackingState(mergeDispatchTrips([]));
      const nextSignature = JSON.stringify(
        nextTrips.map((trip) => [
          trip.id,
          trip.tripId,
          trip.bookingNumber,
          trip.currentTripStatus,
          trip.assignedTruck,
          trip.assignedDriver,
          trip.lastGpsTimestamp,
          trip.liveMovement.currentLocation,
        ]),
      );
      if (lastTripSignatureRef.current === nextSignature) {
        return;
      }
      lastTripSignatureRef.current = nextSignature;
      setTrips(nextTrips);
    };
    window.addEventListener(shippingPhase1UpdatedEvent, handleShippingPhaseUpdate as EventListener);
    return () => {
      window.removeEventListener(shippingPhase1UpdatedEvent, handleShippingPhaseUpdate as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!selectedTripId && trips.length > 0) {
      setSelectedTripId(trips[0]?.id ?? '');
    }
  }, [selectedTripId, trips]);

  useEffect(() => {
    const booking = searchParams.get('booking');
    if (!booking) return;
    const matched = trips.find((item) => item.bookingNumber === booking);
    if (matched) setSelectedTripId(matched.id);
  }, [searchParams, trips]);

  useEffect(() => {
    setSearchValue(headerQuery);
  }, [headerQuery]);

  useEffect(() => {
    let cancelled = false;

    async function loadLiveFleet() {
      try {
        const payload = await apiGet<{ points?: DispatchLivePoint[] }>('/tracking/live-map');
        if (!cancelled) {
          setLiveFleetPoints(Array.isArray(payload.points) ? payload.points : []);
        }
      } catch {
        if (!cancelled) {
          setLiveFleetPoints([]);
        }
      }
    }

    void loadLiveFleet();
    const interval = window.setInterval(loadLiveFleet, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const corridorOptions = useMemo(
    () => ['all', ...Array.from(new Set(trips.map((trip) => trip.corridorRoute)))],
    [trips],
  );

  const filteredTrips = useMemo(() => {
    const now = new Date('2026-03-19T23:59:59Z').getTime();
    const cutoffMap = { all: 0, '7d': 7, '14d': 14, '30d': 30 } as const;
    const rangeDays = cutoffMap[dateRange];

    return trips
      .filter((trip) => {
        const matchesSearch = [trip.tripId, trip.containerNumber, trip.assignedDriver, trip.bookingNumber]
          .join(' ')
          .toLowerCase()
          .includes(deferredSearchValue.trim().toLowerCase());
        const matchesStatus = statusFilter === 'all' || trip.currentTripStatus === statusFilter;
        const matchesCorridor = corridorFilter === 'all' || trip.corridorRoute === corridorFilter;
        const matchesRisk = riskFilter === 'all' || trip.delayRisk === riskFilter;
        const matchesDate =
          rangeDays === 0 ||
          now - new Date(trip.lastUpdated).getTime() <= rangeDays * 24 * 60 * 60 * 1000;
        return matchesSearch && matchesStatus && matchesCorridor && matchesRisk && matchesDate;
      })
      .sort((left, right) => compareBookingOrder(left.bookingNumber, right.bookingNumber));
  }, [corridorFilter, dateRange, deferredSearchValue, riskFilter, statusFilter, trips]);

  const selectedTrip = useMemo(
    () =>
      filteredTrips.find((trip) => trip.id === selectedTripId) ??
      trips.find((trip) => trip.id === selectedTripId) ??
      filteredTrips[0] ??
      trips[0] ??
      null,
    [filteredTrips, selectedTripId, trips],
  );

  useEffect(() => {
    if (!selectedTrip) return;
    const preset = assignmentPresetByTruck[selectedTrip.assignedTruck];
    setAssignmentDraft({
      truckPlate: selectedTrip.assignedTruck === 'Not assigned' ? '' : selectedTrip.assignedTruck,
      trailerPlate: selectedTrip.assignedTrailer === 'Pending trailer' ? preset?.trailerPlate || '' : selectedTrip.assignedTrailer,
      driverName: selectedTrip.assignedDriver === 'Not assigned' || selectedTrip.assignedDriver === 'Pending driver' ? preset?.driverName || '' : selectedTrip.assignedDriver,
      driverPhone:
        selectedTrip.driverStatus.startsWith('Driver assigned · ')
          ? selectedTrip.driverStatus.replace('Driver assigned · ', '')
          : driverPhoneByName[selectedTrip.assignedDriver] || preset?.driverPhone || '',
    });
  }, [selectedTrip?.id]);

  const summaryCards = useMemo(
    () => [
      {
        label: 'Awaiting trip creation',
        value: trips.filter((trip) => trip.currentTripStatus === 'Awaiting truck assignment').length,
      },
      {
        label: 'Assigned and not departed',
        value: trips.filter((trip) => trip.currentTripStatus === 'Assigned' || trip.currentTripStatus === 'Ready to depart').length,
      },
      {
        label: 'In transit now',
        value: trips.filter((trip) => trip.currentTripStatus === 'In transit' || trip.currentTripStatus === 'Checkpoint hold' || trip.currentTripStatus === 'Delayed').length,
      },
      {
        label: 'Ready for inland arrival',
        value: trips.filter(readyForArrivalHandoff).length,
      },
    ],
    [trips],
  );

  function updateSelected(
    mutator: (trip: DispatchTripRecord) => DispatchTripRecord,
    afterUpdate?: (trip: DispatchTripRecord) => void,
  ) {
    if (!selectedTrip) return;
    const next = mutator(selectedTrip);
    setTrips((current) => current.map((trip) => (trip.id === selectedTrip.id ? next : trip)));
    skipNextManualDispatchSyncRef.current = true;
    upsertManualDispatchTrip(next);
    if (shouldSyncTripToBackend(next)) {
      void syncManualTripToBackend(next);
    }
    afterUpdate?.(next);
  }

  function assignTruck() {
    if (!selectedTrip) return;
    const nextTruck = assignmentDraft.truckPlate.trim() || truckOptions.find((truck) => truck !== selectedTrip.assignedTruck) || truckOptions[0];
    const preset = assignmentPresetByTruck[nextTruck];
    const nextTrailer = assignmentDraft.trailerPlate.trim() || preset?.trailerPlate || selectedTrip.assignedTrailer;
    updateSelected((trip) => ({
      ...trip,
      assignedTruck: nextTruck,
      assignedTrailer: nextTrailer,
      currentTripStatus: trip.assignedDriver === 'Not assigned' || trip.assignedDriver === 'Pending driver' ? 'Awaiting driver assignment' : 'Assigned',
      lastUpdated: '2026-03-19T18:52:00Z',
    }), (next) => {
      syncTripToTracking(next, 'TRUCK_ASSIGNED', next.originHandoffPoint, 'Dispatch assigned truck and trailer for inland movement.');
    });
  }

  function assignDriver() {
    if (!selectedTrip) return;
    const preset = assignmentPresetByTruck[assignmentDraft.truckPlate.trim()];
    const nextDriver = assignmentDraft.driverName.trim() || preset?.driverName || driverOptions.find((driver) => driver !== selectedTrip.assignedDriver) || driverOptions[0];
    const nextDriverPhone = assignmentDraft.driverPhone.trim() || preset?.driverPhone || driverPhoneByName[nextDriver] || sharedDriverPhone;
    updateSelected((trip) => ({
      ...trip,
      assignedDriver: nextDriver,
      driverStatus: nextDriverPhone ? `Driver assigned · ${nextDriverPhone}` : 'Driver assigned',
      currentTripStatus: trip.assignedTruck === 'Not assigned' ? 'Awaiting truck assignment' : 'Assigned',
      transitPack: {
        ...trip.transitPack,
        mobileSyncStatus: 'Ready to sync',
        driverAcknowledgement: `Acknowledged by ${nextDriver}`,
        lastPacketUpdate: '2026-03-19T18:54:00Z',
      },
      lastUpdated: '2026-03-19T18:54:00Z',
    }));
  }

  function changeRoute() {
    if (!selectedTrip) return;
    const nextRoute = routeOptions.find((route) => route !== selectedTrip.corridorRoute) ?? routeOptions[0];
    updateSelected((trip) => ({
      ...trip,
      corridorRoute: nextRoute,
      liveMovement: { ...trip.liveMovement, corridorName: nextRoute },
      lastUpdated: '2026-03-19T18:55:00Z',
    }));
  }

  function markGoodsLoaded() {
    if (!selectedTrip) return;
    const nowIso = new Date().toISOString();
    updateSelected((trip) => ({
      ...trip,
      cargoLoadedAt: nowIso,
      driverStatus:
        trip.assignedDriver === 'Not assigned' || trip.assignedDriver === 'Pending driver'
          ? 'Truck loading completed'
          : `Goods loaded · ${trip.assignedDriver} ready`,
      currentTripStatus: trip.currentTripStatus === 'Assigned' ? 'Ready to depart' : trip.currentTripStatus,
      lastUpdated: nowIso,
    }), (next) => {
      syncTripToTracking(next, 'LOADED_ON_TRUCK', next.originHandoffPoint, 'Dispatch logged goods loaded and staged for inland departure from Djibouti.');
    });
  }

  function confirmDeparture() {
    if (!selectedTrip) return;
    const nowIso = new Date().toISOString();
    updateSelected((trip) => ({
      ...trip,
      currentTripStatus: 'In transit',
      driverStatus: 'Departed from handoff point',
      cargoLoadedAt: trip.cargoLoadedAt || nowIso,
      departedDjiboutiAt: nowIso,
      lastGpsTimestamp: nowIso,
      liveMovement: {
        ...trip.liveMovement,
        currentLocation: trip.originHandoffPoint,
        movementHealth: 'On schedule',
        speedSummary: 'Departure confirmed from dispatch',
      },
      checkpoints: trip.checkpoints.map((event) =>
        event.label === 'Gate-out from Djibouti'
          ? {
              ...event,
              timestamp: nowIso,
              status: 'Passed',
              driverNote: 'Departure confirmed by dispatch.',
              sealConfirmed: true,
              officerNote: event.officerNote || 'Release handoff complete.',
            }
          : event,
      ),
      lastUpdated: nowIso,
    }), (next) => {
      syncTripToTracking(next, 'OUT_FOR_DELIVERY', next.originHandoffPoint, 'Dispatch confirmed corridor departure from Djibouti handoff point.');
    });
  }

  function pushPackToMobile() {
    if (!selectedTrip) return;
    const nowIso = new Date().toISOString();
    updateSelected((trip) => ({
      ...trip,
      transitPack: {
        ...trip.transitPack,
        packetComplete: true,
        mobileSyncStatus: 'Synced to mobile',
        driverAcknowledgement:
          trip.assignedDriver === 'Not assigned' || trip.assignedDriver === 'Pending driver'
            ? 'Waiting driver assignment'
            : `Acknowledged by ${trip.assignedDriver}`,
        lastPacketUpdate: nowIso,
        qrGenerated: true,
        packetItems: buildDriverPacketItems(trip),
      },
      currentTripStatus: trip.currentTripStatus === 'Assigned' ? 'Ready to depart' : trip.currentTripStatus,
      lastUpdated: nowIso,
    }));
  }

  function escalateFirstIssue() {
    if (!selectedTrip || selectedTrip.issues.length === 0) return;
    updateSelected((trip) => ({
      ...trip,
      issues: trip.issues.map((issue, index) =>
        index === 0 ? { ...issue, title: `${issue.title} · escalated`, actionLabel: 'Supervisor notified' } : issue,
      ),
      lastUpdated: '2026-03-19T19:05:00Z',
    }));
  }

  function pushToYardDesk() {
    if (!selectedTrip || !readyForArrivalHandoff(selectedTrip)) return;
    updateSelected((trip) => ({
      ...trip,
      currentTripStatus: 'Awaiting unload handoff',
      transitPack: {
        ...trip.transitPack,
        packetComplete: true,
        mobileSyncStatus: 'Synced to mobile',
        driverAcknowledgement:
          trip.assignedDriver === 'Not assigned' || trip.assignedDriver === 'Pending driver'
            ? 'Waiting driver assignment'
            : `Acknowledged by ${trip.assignedDriver}`,
        lastPacketUpdate: '2026-03-20T05:14:00Z',
        qrGenerated: true,
        packetItems: buildDriverPacketItems(trip),
      },
      lastUpdated: '2026-03-19T19:08:00Z',
    }), (next) => {
      syncTripToTracking(next, 'YARD_HANDOFF', next.inlandDestination, 'Dispatch handed the corridor file to the dry-port / yard desk.');
      router.push(`/operations/dry-port-yard?booking=${encodeURIComponent(next.bookingNumber)}`);
    });
  }

  function confirmEmptyReturnClosure() {
    if (!selectedTrip) return;
    updateSelected((trip) => ({
      ...trip,
      emptyReturnConfirmedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      dispatchNote: `Empty return confirmed by dispatch for ${trip.containerNumber}. Corridor file is fully closed.`,
    }), (next) => {
      syncTripToTracking(next, 'EMPTY_RETURN_CONFIRMED', next.inlandDestination, 'Dispatch acknowledged empty return completion and closed the corridor movement.');
    });
  }

  function confirmArrivedInland() {
    if (!selectedTrip) return;
    updateSelected((trip) => ({
      ...trip,
      currentTripStatus: 'Arrived inland',
      lastGpsTimestamp: '2026-03-20T05:10:00Z',
      liveMovement: {
        ...trip.liveMovement,
        currentLocation: trip.inlandDestination,
        distanceToDestinationKm: 0,
        speedSummary: 'Arrived at inland node.',
        movementHealth: 'On schedule',
      },
      checkpoints: trip.checkpoints.some((event) => event.location === trip.inlandDestination)
        ? trip.checkpoints.map((event) =>
            event.location === trip.inlandDestination
              ? {
                  ...event,
                  timestamp: '2026-03-20T05:10:00Z',
                  status: 'Passed',
                  driverNote: 'Arrived at inland node.',
                  sealConfirmed: true,
                  officerNote: event.officerNote || 'Arrival confirmed for yard handoff.',
                }
              : event,
          )
        : [
            ...trip.checkpoints,
            {
              id: `${trip.id}-arrival`,
              label: 'Inland arrival',
              timestamp: '2026-03-20T05:10:00Z',
              location: trip.inlandDestination,
              status: 'Passed',
              driverNote: 'Arrived at inland node.',
              sealConfirmed: true,
              officerNote: 'Arrival confirmed for yard handoff.',
            },
          ],
      lastUpdated: '2026-03-20T05:10:00Z',
    }), (next) => {
      syncTripToTracking(next, 'ARRIVED_INLAND', next.inlandDestination, 'Dispatch confirmed inland arrival at the dry-port destination.');
    });
  }

  function sendArrivalNotice() {
    if (!selectedTrip) return;
    updateSelected((trip) => ({
      ...trip,
      arrivalReadiness: {
        ...trip.arrivalReadiness,
        arrivalNoticeSent: true,
      },
      lastUpdated: '2026-03-20T05:12:00Z',
    }));
  }

  function confirmUnloadContact() {
    if (!selectedTrip) return;
    updateSelected((trip) => ({
      ...trip,
      arrivalReadiness: {
        ...trip.arrivalReadiness,
        unloadContactConfirmed: true,
      },
      lastUpdated: '2026-03-20T05:13:00Z',
    }));
  }

  if (!selectedTrip) {
    return <main className="shell"><section className="dispatch-desk-shell"><div className="dispatch-empty-state">No corridor trips available.</div></section></main>;
  }

  const selectedIndex = getProgressIndex(selectedTrip.currentTripStatus);
  const queueRows = filteredTrips.slice(0, 10);
  const packetItems = buildDriverPacketItems(selectedTrip);
  const packetDownloads = driverPacketDownloads(selectedTrip);
  const shippingWorkspace = readShippingPhase1Workspace();
  const packetPreviewItems = packetItems.slice(0, 6);
  const packetExtraItems = packetItems.slice(6);
  const packetGapCount = packetItems.filter((item) => !item.complete).length;
  const arrivalReady = readyForArrivalHandoff(selectedTrip);
  const latestCheckpoint = selectedTrip.checkpoints[selectedTrip.checkpoints.length - 1];
  const visibleCheckpoints = latestCheckpoint ? [latestCheckpoint] : [];
  const olderCheckpoints = selectedTrip.checkpoints.slice(0, -2).reverse();
  const truckAssigned = selectedTrip.assignedTruck !== 'Not assigned';
  const driverAssigned = selectedTrip.assignedDriver !== 'Not assigned' && selectedTrip.assignedDriver !== 'Pending driver';
  const packSynced = selectedTrip.transitPack.mobileSyncStatus === 'Synced to mobile' && selectedTrip.transitPack.qrGenerated;
  const loadingLogged = hasLoadedForDeparture(selectedTrip);
  const packetAcknowledged =
    packSynced &&
    Boolean(selectedTrip.transitPack.lastPacketUpdate) &&
    selectedTrip.transitPack.lastPacketUpdate !== 'Not started';
  const downloadPacketDocument = (document: ReturnType<typeof driverPacketDownloads>[number]) => {
    if (document.key === 'bl') {
      const payload = buildDispatchBillCopyPayload(selectedTrip, shippingWorkspace);
      if (payload) {
        void downloadBillOfLadingPdf(payload);
        return;
      }
    }
    void downloadSimpleShippingPdf({
      fileName: document.fileName,
      title: document.title,
      subtitle: document.subtitle,
      lines: document.lines,
    });
  };
  const departureReady = truckAssigned && driverAssigned && packSynced && loadingLogged;
  const departed = ['In transit', 'Checkpoint hold', 'Delayed', 'Arrived inland', 'Awaiting unload handoff'].includes(selectedTrip.currentTripStatus);
  const arrivedInland = selectedTrip.currentTripStatus === 'Arrived inland' || selectedTrip.currentTripStatus === 'Awaiting unload handoff';
  const movementStatus = shippingWorkspace.containerMovements.find((item) => item.bookingId === selectedTrip.bookingNumber)?.currentStatus || '';
  const emptyReturned = movementStatus === 'Empty returned';
  const emptyReturnConfirmed = Boolean(selectedTrip.emptyReturnConfirmedAt);
  const nextActionKey = !truckAssigned
    ? 'assign-truck'
    : !driverAssigned
      ? 'assign-driver'
      : !packSynced
        ? 'push-pack'
        : !loadingLogged
          ? 'log-loading'
        : !departed
          ? 'confirm-departure'
          : !arrivedInland
            ? 'confirm-arrived-inland'
            : !selectedTrip.arrivalReadiness.arrivalNoticeSent
              ? 'send-arrival-notice'
              : !selectedTrip.arrivalReadiness.unloadContactConfirmed
                ? 'confirm-unload-contact'
                  : arrivalReady && selectedTrip.currentTripStatus !== 'Awaiting unload handoff'
                    ? 'push-yard-handoff'
                    : emptyReturned && !emptyReturnConfirmed
                      ? 'confirm-empty-returned'
                      : 'in-transit';
  const nextActionTitle =
    nextActionKey === 'assign-truck'
      ? 'Assign truck'
      : nextActionKey === 'assign-driver'
        ? 'Assign driver'
        : nextActionKey === 'push-pack'
          ? 'Push pack to driver mobile'
          : nextActionKey === 'log-loading'
            ? 'Log goods loaded'
          : nextActionKey === 'confirm-departure'
            ? 'Confirm departure'
            : nextActionKey === 'confirm-arrived-inland'
              ? 'Confirm arrived inland'
              : nextActionKey === 'send-arrival-notice'
                ? 'Send arrival notice'
                : nextActionKey === 'confirm-unload-contact'
                  ? 'Confirm unload contact'
                  : nextActionKey === 'push-yard-handoff'
                    ? 'Dry-port / yard handoff'
                    : nextActionKey === 'confirm-empty-returned'
                      ? 'Confirm empty returned'
                    : 'Monitor live movement';
  const primaryIssue =
    (selectedTrip.issues.length > 0
      ? selectedTrip.issues
      : [{ id: 'clean', severity: 'Low' as const, title: 'No open trip issues', explanation: 'This trip is moving cleanly with no blocking dispatch actions.', actionLabel: 'Monitor' }])[0];
  const selectedLivePoint =
    liveFleetPoints.find((point) => point.plateNumber === selectedTrip.assignedTruck) ??
    liveFleetPoints.find((point) => point.vehicleId === selectedTrip.assignedTruck) ??
    liveFleetPoints.find((point) => point.tripCode === selectedTrip.tripId) ??
    null;
  function applyAssignmentPreset(truckPlate: string) {
    const preset = assignmentPresetByTruck[truckPlate];
    if (!preset) {
      setAssignmentDraft((current) => ({ ...current, truckPlate }));
      return;
    }
    setAssignmentDraft({
      truckPlate: preset.truckPlate,
      trailerPlate: preset.trailerPlate,
      driverName: preset.driverName,
      driverPhone: preset.driverPhone,
    });
  }

  return (
    <main className="shell">
      <section className="dispatch-desk-shell">
        <section className="dispatch-queue-top-control">
          <div className="dispatch-queue-top-row dispatch-queue-top-row-primary">
            <div className="dispatch-queue-metric-strip dispatch-queue-metric-strip-top">
              {summaryCards.map((card) => (
                <div key={card.label} className="dispatch-queue-metric">
                  <span>{card.label}</span>
                  <strong>{card.value}</strong>
                </div>
              ))}
            </div>
          </div>
          <div className="dispatch-queue-top-row dispatch-queue-top-row-filters">
            <select className="dispatch-desk-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | DispatchTripStatus)}>
              <option value="all">All status</option>
              {(['Awaiting truck assignment', 'Awaiting driver assignment', 'Assigned', 'Ready to depart', 'In transit', 'Checkpoint hold', 'Delayed', 'Arrived inland', 'Awaiting unload handoff', 'Awaiting empty return assignment', 'Awaiting empty return departure', 'Empty return in transit', 'Empty returned'] as DispatchTripStatus[]).map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <select className="dispatch-desk-select" value={corridorFilter} onChange={(event) => setCorridorFilter(event.target.value)}>
              {corridorOptions.map((option) => <option key={option} value={option}>{option === 'all' ? 'All corridors' : option}</option>)}
            </select>
            <select className="dispatch-desk-select" value={riskFilter} onChange={(event) => setRiskFilter(event.target.value as 'all' | DispatchTripRecord['delayRisk'])}>
              <option value="all">All delay risk</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
            <select className="dispatch-desk-select" value={dateRange} onChange={(event) => setDateRange(event.target.value as 'all' | '7d' | '14d' | '30d')}>
              <option value="all">All dates</option>
              <option value="7d">Last 7 days</option>
              <option value="14d">Last 14 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>
        </section>

        <section className="ops-selected-summary dispatch-selected-summary">
          <div className="dispatch-summary-item">
            <span>Current stage</span>
            <strong>{selectedTrip.currentTripStatus}</strong>
          </div>
          <div className="dispatch-summary-item">
            <span>Current blocker</span>
            <strong>{nextActionTitle}</strong>
          </div>
          <div className="dispatch-summary-item dispatch-summary-item-primary">
            <span>Next required action</span>
            <strong>{nextActionTitle}</strong>
          </div>
          <div className="dispatch-summary-item">
            <span>ETA</span>
            <strong>{formatDate(selectedTrip.expectedArrivalTime)}</strong>
          </div>
          <div className="dispatch-summary-item">
            <span>Loaded at Djibouti</span>
            <strong>{formatDate(selectedTrip.cargoLoadedAt || '')}</strong>
          </div>
          <div className="dispatch-summary-item">
            <span>Started driving</span>
            <strong>{formatDate(selectedTrip.departedDjiboutiAt || '')}</strong>
          </div>
          <div className="dispatch-summary-item">
            <span>Owner</span>
            <strong>{selectedTrip.assignedDriver === 'Not assigned' || selectedTrip.assignedDriver === 'Pending driver' ? 'Dispatch desk' : selectedTrip.assignedDriver}</strong>
          </div>
        </section>

        <section className="dispatch-workboard">
          <aside className="dispatch-workpane dispatch-workpane-left" data-testid="corridor-dispatch-queue">
            <article className="dispatch-panel dispatch-queue-panel">
              <header className="dispatch-panel-header">
                <div>
                  <span className="dispatch-panel-eyebrow">Dispatch queue</span>
                  <h2>{tx('Dispatch queue')}</h2>
                </div>
                <span className="dispatch-chip dispatch-chip-mode">{queueRows.length} live trip files</span>
              </header>
              <div className="dispatch-queue-list dispatch-queue-list-compact">
                {queueRows.map((trip) => (
                  <button
                    key={trip.id}
                    type="button"
                    className={trip.id === selectedTrip.id ? 'dispatch-queue-row dispatch-queue-row-compact active' : 'dispatch-queue-row dispatch-queue-row-compact'}
                    onClick={() => setSelectedTripId(trip.id)}
                    data-testid={`dispatch-queue-row-${trip.bookingNumber}`}
                  >
                    <div className="dispatch-queue-topline">
                      <strong>{trip.tripId}</strong>
                    <span className={`dispatch-chip ${trip.delayRisk === 'High' ? 'dispatch-chip-high' : trip.delayRisk === 'Medium' ? 'dispatch-chip-medium' : 'dispatch-chip-ready'}`}>{formatDispatchMilestone(trip.currentTripStatus)}</span>
                    </div>
                    <div className="dispatch-queue-copy">
                      <span>{trip.bookingNumber} · {trip.customerName}</span>
                      <span>{trip.corridorRoute}</span>
                    </div>
                    <div className="dispatch-queue-meta">
                      <span>{trip.containerNumber || 'Container pending'}</span>
                      <span>{getTripNextActionLabel(trip)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </article>

            <article className="dispatch-panel dispatch-arrival-context-panel dispatch-arrival-context-side-panel">
              <header className="dispatch-panel-header">
                <div>
                  <span className="dispatch-panel-eyebrow">Arrival context</span>
                  <h2>Current handoff details</h2>
                </div>
                <span className="dispatch-chip dispatch-chip-mode">{selectedTrip.arrivalReadiness.destinationNode}</span>
              </header>
              <div className="dispatch-arrival-context-list">
                <div className="dispatch-arrival-context-row">
                  <span>Destination node</span>
                  <strong>{selectedTrip.arrivalReadiness.destinationNode}</strong>
                </div>
                <div className="dispatch-arrival-context-row">
                  <span>Expected arrival</span>
                  <strong>{formatDate(selectedTrip.expectedArrivalTime)}</strong>
                </div>
                <div className="dispatch-arrival-context-row">
                  <span>Unload handoff owner</span>
                  <strong>{selectedTrip.arrivalReadiness.unloadHandoffOwner}</strong>
                </div>
                <div className="dispatch-arrival-context-row dispatch-arrival-context-row-wide">
                  <span>Yard contact</span>
                  <strong>{selectedTrip.arrivalReadiness.yardContact}</strong>
                </div>
              </div>
            </article>

            <article className="dispatch-panel dispatch-detail-panel dispatch-arrival-detail-side-panel">
              <header className="dispatch-panel-header">
                <div>
                  <span className="dispatch-panel-eyebrow">Arrival context</span>
                  <h2>Extended arrival details</h2>
                </div>
              </header>
              <div className="dispatch-detail-rows">
                <div className="dispatch-detail-row">
                  <span>POD expectation</span>
                  <strong>{selectedTrip.arrivalReadiness.podExpectation}</strong>
                </div>
                <div className="dispatch-detail-row">
                  <span>Empty return instruction</span>
                  <strong>{selectedTrip.arrivalReadiness.emptyReturnInstructionAvailable ? 'Available after unload' : 'Pending'}</strong>
                </div>
                <div className="dispatch-detail-row dispatch-detail-row-long">
                  <span>Special handling instructions</span>
                  <strong>{selectedTrip.arrivalReadiness.specialHandlingInstructions}</strong>
                </div>
                <div className="dispatch-detail-row dispatch-detail-row-long">
                  <span>Dispatch note</span>
                  <strong>{selectedTrip.dispatchNote}</strong>
                </div>
              </div>
            </article>

            <article className="dispatch-panel dispatch-detail-panel dispatch-detail-panel-history">
              <header className="dispatch-panel-header">
                <div>
                  <span className="dispatch-panel-eyebrow">Checkpoint history</span>
                  <h2>Earlier checkpoints</h2>
                </div>
              </header>
              <div className="dispatch-timeline dispatch-timeline-compact">
                {olderCheckpoints.length ? olderCheckpoints.map((event) => (
                  <div key={event.id} className={`dispatch-timeline-item ${event.timestamp ? 'is-complete' : 'is-next'}`}>
                    <div className="dispatch-timeline-dot" />
                    <div className="dispatch-timeline-content">
                      <div className="dispatch-timeline-headline">
                        <strong>{event.label}</strong>
                        <span>{event.location} · {event.status}</span>
                      </div>
                      <p>{event.timestamp ? formatDate(event.timestamp) : 'Pending event.'}</p>
                      <p>{event.driverNote || event.officerNote || 'No checkpoint note yet.'}</p>
                    </div>
                  </div>
                )) : <div className="dispatch-empty-state dispatch-empty-state-compact">No earlier checkpoint history.</div>}
              </div>
            </article>
          </aside>

          <CorridorDispatchPrimaryWorkspace
            selectedTrip={selectedTrip}
            selectedLivePoint={selectedLivePoint}
            nextActionKey={nextActionKey}
            nextActionTitle={nextActionTitle}
            truckAssigned={truckAssigned}
            driverAssigned={driverAssigned}
            departureReady={departureReady}
            loadingLogged={loadingLogged}
            packSynced={packSynced}
            packetAcknowledged={packetAcknowledged}
            arrivedInland={arrivedInland}
            departed={departed}
            arrivalReady={arrivalReady}
            emptyReturned={emptyReturned}
            emptyReturnConfirmed={emptyReturnConfirmed}
            latestCheckpointSealConfirmed={Boolean(latestCheckpoint?.sealConfirmed)}
            assignmentDraft={assignmentDraft}
            dispatchAssignmentPresets={dispatchAssignmentPresets}
            driverOptions={driverOptions}
            sharedDriverPin={sharedDriverPin}
            activeIssueTitle={primaryIssue.title}
            activeIssueExplanation={primaryIssue.explanation}
            activeIssueSeverity={primaryIssue.severity}
            arrivalReadinessTitle={tx('Arrival Readiness')}
            onApplyAssignmentPreset={applyAssignmentPreset}
            onAssignmentDraftChange={(next) => setAssignmentDraft((current) => ({ ...current, ...next }))}
            onAssignTruck={assignTruck}
            onAssignDriver={assignDriver}
            onMarkGoodsLoaded={markGoodsLoaded}
            onChangeRoute={changeRoute}
            onDownloadLoadingReport={() =>
              downloadDispatchLoadingReportPdf({
                fileName: `${selectedTrip.bookingNumber.toLowerCase()}-loading-report.pdf`,
                tripId: selectedTrip.tripId,
                bookingNumber: selectedTrip.bookingNumber,
                blNumber: selectedTrip.blNumber,
                containerNumber: selectedTrip.containerNumber,
                sealNumber: selectedTrip.sealNumber,
                customerName: selectedTrip.customerName,
                assignedTruck: selectedTrip.assignedTruck,
                assignedTrailer: selectedTrip.assignedTrailer,
                assignedDriver: selectedTrip.assignedDriver,
                driverPhone:
                  assignmentDraft.driverPhone ||
                  (selectedTrip.driverStatus.startsWith('Driver assigned · ')
                    ? selectedTrip.driverStatus.replace('Driver assigned · ', '')
                    : driverPhoneByName[selectedTrip.assignedDriver] || ''),
                corridorRoute: selectedTrip.corridorRoute,
                originHandoffPoint: selectedTrip.originHandoffPoint,
                inlandDestination: selectedTrip.inlandDestination,
                plannedDepartureTime: selectedTrip.plannedDepartureTime,
                expectedArrivalTime: selectedTrip.expectedArrivalTime,
                dispatchOwner: selectedTrip.assignedDispatchOwner,
                dispatchNote: selectedTrip.dispatchNote,
              })
            }
            packetPreviewItems={packetPreviewItems}
            onPushPackToMobile={pushPackToMobile}
            onDownloadAllRequiredDocs={() => {
              packetDownloads.forEach((document) => {
                downloadPacketDocument(document);
              });
            }}
            onDownloadDriverPacket={() =>
              downloadDriverTransitPacketPdf({
                fileName: `${selectedTrip.bookingNumber.toLowerCase()}-driver-transit-packet.pdf`,
                tripId: selectedTrip.tripId,
                bookingNumber: selectedTrip.bookingNumber,
                customerName: selectedTrip.customerName,
                route: selectedTrip.corridorRoute,
                truckPlate: selectedTrip.assignedTruck,
                trailerPlate: selectedTrip.assignedTrailer,
                driverName: selectedTrip.assignedDriver,
                containerNumber: selectedTrip.containerNumber,
                sealNumber: selectedTrip.sealNumber,
                departureTime: selectedTrip.departedDjiboutiAt ? formatDate(selectedTrip.departedDjiboutiAt) : '',
                documents: driverPacketDocumentList(selectedTrip),
                notes: selectedTrip.dispatchNote,
              })
            }
            onConfirmDeparture={confirmDeparture}
            onConfirmArrivedInland={confirmArrivedInland}
            onSendArrivalNotice={sendArrivalNotice}
            onConfirmUnloadContact={confirmUnloadContact}
            onPushToYardDesk={pushToYardDesk}
            onConfirmEmptyReturnClosure={confirmEmptyReturnClosure}
          />

            {detailsReady ? (
              <CorridorDispatchSecondaryPanels
                selectedTrip={selectedTrip}
                olderCheckpoints={olderCheckpoints}
                packetExtraItems={packetExtraItems}
                packetDownloads={packetDownloads}
                downloadPacketDocument={downloadPacketDocument}
                selectedLivePoint={selectedLivePoint}
                visibleCheckpoints={visibleCheckpoints}
                escalateFirstIssue={escalateFirstIssue}
              />
            ) : (
              <div className="dispatch-empty-state dispatch-empty-state-compact">
                Loading dispatch detail panels...
              </div>
            )}
        </section>
      </section>
    </main>
  );
});
