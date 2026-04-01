'use client';

import { useEffect } from 'react';
import { bookingQuoteStorageKey, type UnifiedBookingRequest } from '../lib/booking-quote-demo-data';
import type { DispatchTripRecord } from '../lib/corridor-dispatch-demo-data';
import type { DjiboutiReleaseRecord } from '../lib/djibouti-release-demo-data';
import type { YardRecord } from '../lib/dry-port-yard-demo-data';
import { readShippingPhase1Workspace } from '../lib/shipping-phase1';
import type { SupplierDeskShipment } from '../lib/supplier-agent-demo-data';

const supplierDeskStorageKey = 'tikur-abay:supplier-desk:manual-shipments';
const manualDjiboutiReleaseStorageKey = 'tikur-abay:manual-corridor:djibouti-release';
const manualDispatchTripStorageKey = 'tikur-abay:manual-corridor:dispatch-trips';
const manualYardRecordStorageKey = 'tikur-abay:manual-corridor:yard-records';
const sharedQuoteStorageUpdatedEvent = 'tikur-abay:booking-quote-desk:storage-updated';
const supplierDeskStorageUpdatedEvent = 'tikur-abay:supplier-desk:storage-updated';
const manualCorridorStorageUpdatedEvent = 'tikur-abay:manual-corridor:storage-updated';
const supplierDeskCookieKey = 'tikur_abay_supplier_shipments';
const shippingMovementCookieKey = 'tikur_abay_shipping_movements';
const shippingBillCookieKey = 'tikur_abay_shipping_bills';
const releaseCookieKey = 'tikur_abay_release_records';
const dispatchCookieKey = 'tikur_abay_dispatch_trips';
const yardCookieKey = 'tikur_abay_yard_records';
const trackingSyncSignatureKey = 'tikur-abay:tracking-sync:signature';
const trackingSyncRanAtKey = 'tikur-abay:tracking-sync:ran-at';
const trackingSyncMinIntervalMs = 15000;

function safeParse<T>(value: string | null): T[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function syncBookings(requests: UnifiedBookingRequest[]) {
  requests
    .filter((request) => request.bookingId)
    .forEach((request) => {
      void fetch('/api/tracking/register-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingNo: request.bookingId,
          quoteId: request.quoteId,
          shipmentNo: request.convertedToShipmentId || request.bookingId,
          containerCount: request.containerCount || 1,
          blNo: `HBL-${request.bookingId}`,
          carrier: request.vesselName ? 'Origin managed' : 'Pending carrier',
          vesselName: request.vesselName || '',
          voyageNo: request.voyageNumber || '',
          currentLocation: request.placeOfReceipt || request.portOfLoading || request.originCityOrPort || 'Origin terminal',
          shipper: request.company || request.customerName,
          consignee: request.consigneeName || request.customerName,
          createdAt: request.createdAt,
          updatedAt: request.updatedAt,
          eta: request.requestedArrivalWindow || '',
        }),
      }).catch(() => {});
    });
}

function syncOriginShipments(shipments: SupplierDeskShipment[]) {
  shipments.forEach((shipment) => {
    if (!shipment.bookingNumber) return;
    void fetch('/api/tracking/register-origin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingNo: shipment.bookingNumber,
        containerNo: shipment.container.containerNumber,
        blNo: shipment.handoff.houseBlNumber || shipment.handoff.carrierBlNumber || `HBL-${shipment.bookingNumber}`,
        carrier: shipment.handoff.carrier,
        vesselName: shipment.handoff.vesselName,
        voyageNo: shipment.handoff.voyageNumber,
        currentLocation: shipment.container.stuffingLocation || shipment.originPort,
        shipper: shipment.supplierName,
        consignee: shipment.customerName,
        eta: shipment.etaDjibouti,
        eventType: shipment.handoff.oceanHandoffStatus === 'Handed off to Djibouti release' ? 'LOADED_ON_VESSEL' : 'ORIGIN_UPDATED',
        description:
          shipment.handoff.oceanHandoffStatus === 'Handed off to Djibouti release'
            ? 'Origin desk completed ocean handoff with container and vessel details.'
            : 'Origin desk updated container and stuffing details.',
      }),
    }).catch(() => {});
  });
}

function syncCorridorState(
  releaseRecords: DjiboutiReleaseRecord[],
  dispatchTrips: DispatchTripRecord[],
  yardRecords: YardRecord[],
) {
  releaseRecords.forEach((record) => {
    if (!record.bookingNumber || !record.containerNumber) return;
    const eventType = record.inlandHandoffSent
      ? 'CUSTOMS_CLEARED'
      : record.gateOutReady
        ? 'AVAILABLE_FOR_CLEARANCE'
        : record.vesselArrival
          ? 'VESSEL_ARRIVED'
          : 'ORIGIN_UPDATED';
    const timestamp = record.lastUpdated || record.dischargeTime || record.vesselArrival || new Date().toISOString();
    void fetch('/api/tracking/register-origin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingNo: record.bookingNumber,
        containerNo: record.containerNumber,
        blNo: record.blNumber,
        carrier: 'Djibouti release',
        vesselName: record.vesselName,
        voyageNo: record.voyageNumber,
        currentLocation: record.dischargePort || 'Djibouti Port',
        consignee: record.customerName,
        eta: record.expectedGateOutTime || '',
        eventType,
        timestamp,
        description: `Djibouti release updated the tracking file to ${record.currentStage}.`,
      }),
    }).catch(() => {});
  });

  dispatchTrips.forEach((trip) => {
    if (!trip.bookingNumber || !trip.containerNumber) return;
    const isEmptyReturnTrip = trip.tripId.startsWith('ERT-') || trip.routeType.toLowerCase().includes('empty return');
    const eventType = isEmptyReturnTrip
      ? trip.currentTripStatus === 'Empty returned'
        ? 'EMPTY_RETURNED'
        : trip.currentTripStatus === 'Empty return in transit'
          ? 'EMPTY_RETURN_STARTED'
          : 'EMPTY_RELEASED'
      : trip.currentTripStatus === 'Arrived inland' || trip.currentTripStatus === 'Awaiting unload handoff'
        ? 'ARRIVED_INLAND'
        : trip.currentTripStatus === 'In transit' || trip.currentTripStatus === 'Checkpoint hold' || trip.currentTripStatus === 'Delayed'
          ? 'OUT_FOR_DELIVERY'
          : 'TRUCK_ASSIGNED';
    const location = isEmptyReturnTrip
      ? trip.liveMovement.currentLocation || trip.originHandoffPoint
      : trip.currentTripStatus === 'Arrived inland' || trip.currentTripStatus === 'Awaiting unload handoff'
        ? trip.inlandDestination
        : trip.liveMovement.currentLocation || trip.originHandoffPoint;
    const timestamp =
      trip.emptyReturnConfirmedAt ||
      trip.lastUpdated ||
      trip.departedDjiboutiAt ||
      trip.plannedDepartureTime ||
      new Date().toISOString();
    void fetch('/api/tracking/register-origin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingNo: trip.bookingNumber,
        containerNo: trip.containerNumber,
        blNo: trip.blNumber,
        carrier: isEmptyReturnTrip ? 'Empty return dispatch' : 'Corridor dispatch',
        currentLocation: location,
        consignee: trip.customerName,
        eta: trip.expectedArrivalTime || '',
        eventType,
        timestamp,
        description: `${isEmptyReturnTrip ? 'Empty return' : 'Dispatch'} tracking updated from ${trip.currentTripStatus}.`,
      }),
    }).catch(() => {});
  });

  yardRecords.forEach((record) => {
    if (!record.bookingNumber || !record.containerNumber) return;
    const isClosed = record.emptyReturn.emptyReturned || record.emptyReturn.status === 'Cycle closed';
    const eventType = isClosed
      ? 'EMPTY_RETURNED'
      : record.consigneeHandoff.handoffStatus === 'Completed'
        ? 'ARRIVED'
        : record.arrivalControl.actualArrivalTime
          ? 'ARRIVED_INLAND'
          : 'YARD_HANDOFF';
    const location = isClosed
      ? record.emptyReturn.designatedDepot || 'Djibouti Empty Depot'
      : record.consigneeHandoff.handoffStatus === 'Completed'
        ? record.inlandNode
        : record.emptyReturn.currentLocation || record.inlandNode;
    const timestamp =
      record.emptyReturn.returnTimestamp ||
      record.consigneeHandoff.handoffTime ||
      record.arrivalControl.actualArrivalTime ||
      record.lastUpdated ||
      new Date().toISOString();
    void fetch('/api/tracking/register-origin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingNo: record.bookingNumber,
        containerNo: record.containerNumber,
        blNo: record.blNumber,
        carrier: 'Dry-port yard',
        currentLocation: location,
        consignee: record.customerName,
        eta: '',
        eventType,
        timestamp,
        description: isClosed
          ? 'Container empty return closure was completed and synced from yard operations.'
          : `Yard tracking updated from ${record.yardStage}.`,
      }),
    }).catch(() => {});
  });
}

function syncShippingWorkspace() {
  const workspace = readShippingPhase1Workspace();
  workspace.containerMovements.forEach((movement) => {
    if (!movement.bookingId || !movement.containerNumber) return;

    const status = String(movement.currentStatus || '').toLowerCase();
    const eventType =
      status.includes('empty returned')
        ? 'EMPTY_RETURNED'
        : status.includes('arrived inland')
          ? 'ARRIVED_INLAND'
          : status.includes('in transit')
            ? 'OUT_FOR_DELIVERY'
            : status.includes('truck assigned')
              ? 'TRUCK_ASSIGNED'
              : status.includes('customs cleared')
                ? 'CUSTOMS_CLEARED'
                : status.includes('discharged')
                  ? 'DISCHARGED_FROM_VESSEL'
                  : status.includes('vessel arrived')
                    ? 'VESSEL_ARRIVED'
                    : status.includes('loaded on vessel')
                      ? 'LOADED_ON_VESSEL'
                      : 'ORIGIN_UPDATED';
    const latestEventAt = movement.events[0]?.timestamp || new Date().toISOString();

    void fetch('/api/tracking/register-origin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingNo: movement.bookingId,
        containerNo: movement.containerNumber,
        blNo: movement.billOfLadingNumber,
        carrier: movement.carrierName,
        currentLocation: movement.currentLocation,
        consignee: movement.customerName,
        eta: movement.expectedReturnDate || '',
        eventType,
        timestamp: latestEventAt,
        description: `Shipping workspace synced tracking from ${movement.currentStatus}.`,
      }),
    }).catch(() => {});
  });
}

function writeCompactCookie(key: string, value: unknown) {
  document.cookie = `${key}=${encodeURIComponent(JSON.stringify(value))}; path=/; max-age=2592000; samesite=lax`;
}

function compareBookingKey(left: string, right: string) {
  const leftKey = String(left || '').replace(/\D/g, '');
  const rightKey = String(right || '').replace(/\D/g, '');
  if (leftKey.length !== rightKey.length) return rightKey.length - leftKey.length;
  return rightKey.localeCompare(leftKey);
}

function buildTrackingSyncSignature(
  bookings: UnifiedBookingRequest[],
  originShipments: SupplierDeskShipment[],
  releaseRecords: DjiboutiReleaseRecord[],
  dispatchTrips: DispatchTripRecord[],
  yardRecords: YardRecord[],
) {
  const shippingWorkspace = readShippingPhase1Workspace();
  return JSON.stringify({
    bookings: bookings
      .filter((request) => request.bookingId)
      .map((request) => [request.bookingId, request.updatedAt || request.createdAt || '']),
    originShipments: originShipments.map((shipment) => [
      shipment.bookingNumber,
      shipment.lastUpdated || shipment.handoff.oceanHandoffStatus || '',
      shipment.container.containerNumber,
    ]),
    releaseRecords: releaseRecords.map((record) => [
      record.bookingNumber,
      record.lastUpdated || '',
      record.currentStage,
      record.containerNumber,
    ]),
    dispatchTrips: dispatchTrips.map((trip) => [
      trip.tripId,
      trip.bookingNumber,
      trip.lastUpdated || '',
      trip.currentTripStatus,
      trip.containerNumber,
    ]),
    yardRecords: yardRecords.map((record) => [
      record.bookingNumber,
      record.lastUpdated || '',
      record.yardStage,
      record.containerNumber,
    ]),
    shippingMovements: shippingWorkspace.containerMovements.map((movement) => [
      movement.bookingId,
      movement.containerNumber,
      movement.currentStatus,
      movement.currentLocation,
      movement.events[0]?.timestamp || '',
    ]),
    shippingBills: shippingWorkspace.billsOfLading.map((bill) => [
      bill.bookingId,
      bill.containerNumber,
      bill.houseBlNumber,
      bill.issueDate || bill.approvedAt || '',
    ]),
  });
}

export function TrackingStoreSync() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const runSync = () => {
      const bookings = safeParse<UnifiedBookingRequest>(window.localStorage.getItem(bookingQuoteStorageKey));
      const originShipments = safeParse<SupplierDeskShipment>(window.localStorage.getItem(supplierDeskStorageKey));
      const releaseRecords = safeParse<DjiboutiReleaseRecord>(window.localStorage.getItem(manualDjiboutiReleaseStorageKey));
      const dispatchTrips = safeParse<DispatchTripRecord>(window.localStorage.getItem(manualDispatchTripStorageKey));
      const yardRecords = safeParse<YardRecord>(window.localStorage.getItem(manualYardRecordStorageKey));
      const shippingWorkspace = readShippingPhase1Workspace();
      const signature = buildTrackingSyncSignature(
        bookings,
        originShipments,
        releaseRecords,
        dispatchTrips,
        yardRecords,
      );
      const previousSignature = window.sessionStorage.getItem(trackingSyncSignatureKey);
      const lastRanAt = Number(window.sessionStorage.getItem(trackingSyncRanAtKey) || '0');
      const throttled = Date.now() - lastRanAt < trackingSyncMinIntervalMs;
      if (signature !== previousSignature && !throttled) {
        syncBookings(bookings);
        syncOriginShipments(originShipments);
        syncShippingWorkspace();
        syncCorridorState(releaseRecords, dispatchTrips, yardRecords);
        window.sessionStorage.setItem(trackingSyncSignatureKey, signature);
        window.sessionStorage.setItem(trackingSyncRanAtKey, String(Date.now()));
      }
      writeCompactCookie(
        supplierDeskCookieKey,
        originShipments
          .sort((left, right) => compareBookingKey(left.bookingNumber, right.bookingNumber))
          .slice(0, 8),
      );
      writeCompactCookie(
        shippingMovementCookieKey,
        shippingWorkspace.containerMovements
          .sort((left, right) => compareBookingKey(left.bookingId, right.bookingId))
          .slice(0, 8)
          .map((movement) => ({
          bookingId: movement.bookingId,
          containerNumber: movement.containerNumber,
          billOfLadingNumber: movement.billOfLadingNumber,
          carrierName: movement.carrierName,
          currentStatus: movement.currentStatus,
          currentLocation: movement.currentLocation,
          customerName: movement.customerName,
          expectedReturnDate: movement.expectedReturnDate,
          latestEventAt: movement.events[0]?.timestamp || '',
        })),
      );
      writeCompactCookie(
        shippingBillCookieKey,
        shippingWorkspace.billsOfLading
          .filter((bill) => Boolean(bill.bookingId))
          .sort((left, right) => compareBookingKey(left.bookingId, right.bookingId))
          .slice(0, 8)
          .map((bill) => ({
            bookingId: bill.bookingId,
            containerNumber: bill.containerNumber,
            billOfLadingNumber: bill.houseBlNumber,
            carrierName: bill.carrierName,
            currentLocation: bill.portOfDischarge || bill.portOfLoading,
            customerName: bill.customerName,
            updatedAt: bill.issueDate || bill.approvedAt || '',
          })),
      );
      writeCompactCookie(
        releaseCookieKey,
        releaseRecords
          .sort((left, right) => compareBookingKey(left.bookingNumber, right.bookingNumber))
          .slice(0, 8)
          .map((record) => ({
          bookingNumber: record.bookingNumber,
          blNumber: record.blNumber,
          containerNumber: record.containerNumber,
          customerName: record.customerName,
          dischargePort: record.dischargePort,
          currentStage: record.currentStage,
          gateOutReady: record.gateOutReady,
          inlandHandoffSent: record.inlandHandoffSent,
          vesselArrival: record.vesselArrival,
          lastUpdated: record.lastUpdated,
          expectedGateOutTime: record.expectedGateOutTime,
        })),
      );
      writeCompactCookie(
        dispatchCookieKey,
        dispatchTrips
          .sort((left, right) => compareBookingKey(left.bookingNumber, right.bookingNumber))
          .slice(0, 8)
          .map((trip) => ({
          bookingNumber: trip.bookingNumber,
          blNumber: trip.blNumber,
          containerNumber: trip.containerNumber,
          customerName: trip.customerName,
          currentTripStatus: trip.currentTripStatus,
          inlandDestination: trip.inlandDestination,
          currentLocation: trip.liveMovement.currentLocation || trip.originHandoffPoint,
          expectedArrivalTime: trip.expectedArrivalTime,
          lastUpdated: trip.lastUpdated,
          departedDjiboutiAt: trip.departedDjiboutiAt,
        })),
      );
      writeCompactCookie(
        yardCookieKey,
        yardRecords
          .sort((left, right) => compareBookingKey(left.bookingNumber, right.bookingNumber))
          .slice(0, 8)
          .map((record) => ({
          bookingNumber: record.bookingNumber,
          blNumber: record.blNumber,
          containerNumber: record.containerNumber,
          customerName: record.customerName,
          inlandNode: record.inlandNode,
          yardStage: record.yardStage,
          actualArrivalTime: record.arrivalControl.actualArrivalTime,
          handoffStatus: record.consigneeHandoff.handoffStatus,
          handoffTime: record.consigneeHandoff.handoffTime,
          emptyReturned: record.emptyReturn.emptyReturned,
          returnTimestamp: record.emptyReturn.returnTimestamp,
          currentLocation: record.emptyReturn.currentLocation,
          designatedDepot: record.emptyReturn.designatedDepot,
          lastUpdated: record.lastUpdated,
        })),
      );
    };

    runSync();
    window.addEventListener('storage', runSync);
    window.addEventListener(sharedQuoteStorageUpdatedEvent, runSync as EventListener);
    window.addEventListener(supplierDeskStorageUpdatedEvent, runSync as EventListener);
    window.addEventListener(manualCorridorStorageUpdatedEvent, runSync as EventListener);

    return () => {
      window.removeEventListener('storage', runSync);
      window.removeEventListener(sharedQuoteStorageUpdatedEvent, runSync as EventListener);
      window.removeEventListener(supplierDeskStorageUpdatedEvent, runSync as EventListener);
      window.removeEventListener(manualCorridorStorageUpdatedEvent, runSync as EventListener);
    };
  }, []);

  return null;
}
