import { NextRequest, NextResponse } from 'next/server';
import { readServerContainerList, upsertServerTrackingBooking, upsertServerTrackingOrigin } from '../../../lib/server-local-tracking-store';

type SharedQuoteCookieRecord = {
  quoteId?: string;
  bookingId?: string;
  containerCount?: number;
  vesselName?: string;
  voyageNumber?: string;
  portOfLoading?: string;
  placeOfReceipt?: string;
  company?: string;
  customerName?: string;
  consigneeName?: string;
  requestedArrivalWindow?: string;
};

type SupplierShipmentCookieRecord = {
  bookingNumber?: string;
  customerName?: string;
  supplierName?: string;
  originPort?: string;
  etaDjibouti?: string;
  container?: {
    containerNumber?: string;
    stuffingLocation?: string;
  };
  handoff?: {
    carrier?: string;
    vesselName?: string;
    voyageNumber?: string;
    carrierBlNumber?: string;
    houseBlNumber?: string;
    oceanHandoffStatus?: string;
  };
};

type ReleaseCookieRecord = {
  bookingNumber?: string;
  blNumber?: string;
  containerNumber?: string;
  customerName?: string;
  vesselName?: string;
  voyageNumber?: string;
  dischargePort?: string;
  currentStage?: string;
  gateOutReady?: boolean;
  inlandHandoffSent?: boolean;
  vesselArrival?: string;
  lastUpdated?: string;
  expectedGateOutTime?: string;
};

type DispatchCookieRecord = {
  bookingNumber?: string;
  blNumber?: string;
  containerNumber?: string;
  customerName?: string;
  currentTripStatus?: string;
  inlandDestination?: string;
  currentLocation?: string;
  expectedArrivalTime?: string;
  lastUpdated?: string;
  departedDjiboutiAt?: string;
};

type YardCookieRecord = {
  bookingNumber?: string;
  blNumber?: string;
  containerNumber?: string;
  customerName?: string;
  inlandNode?: string;
  yardStage?: string;
  actualArrivalTime?: string;
  handoffStatus?: string;
  handoffTime?: string;
  emptyReturned?: boolean;
  returnTimestamp?: string;
  currentLocation?: string;
  designatedDepot?: string;
  lastUpdated?: string;
};

type ShippingMovementCookieRecord = {
  bookingId?: string;
  containerNumber?: string;
  billOfLadingNumber?: string;
  carrierName?: string;
  currentLocation?: string;
  customerName?: string;
  expectedReturnDate?: string;
  latestEventAt?: string;
};

function readCanonicalShippingMovement(request: NextRequest, query: string) {
  const billRaw = request.cookies.get('tikur_abay_shipping_bills')?.value;
  if (billRaw) {
    try {
      const bills = JSON.parse(decodeURIComponent(billRaw)) as Array<{
        bookingId?: string;
        containerNumber?: string;
        billOfLadingNumber?: string;
        carrierName?: string;
        currentLocation?: string;
        customerName?: string;
        updatedAt?: string;
      }>;
      const billMatch = bills.find((item) => {
        const booking = String(item.bookingId || '').toLowerCase();
        const containerNo = String(item.containerNumber || '').toLowerCase();
        return booking === query || `trp-${booking}` === query || `trip-${booking}` === query || containerNo === query;
      });
      if (billMatch) {
        return {
          bookingId: billMatch.bookingId,
          containerNumber: billMatch.containerNumber,
          billOfLadingNumber: billMatch.billOfLadingNumber,
          carrierName: billMatch.carrierName,
          currentLocation: billMatch.currentLocation,
          customerName: billMatch.customerName,
          expectedReturnDate: '',
          latestEventAt: billMatch.updatedAt,
        };
      }
    } catch {}
  }
  const raw = request.cookies.get('tikur_abay_shipping_movements')?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as ShippingMovementCookieRecord[];
    return parsed.find((item) => {
      const booking = String(item.bookingId || '').toLowerCase();
      const containerNo = String(item.containerNumber || '').toLowerCase();
      return booking === query || `trp-${booking}` === query || `trip-${booking}` === query || containerNo === query;
    }) || null;
  } catch {
    return null;
  }
}

function shouldRefreshContainerPayload(payload: Awaited<ReturnType<typeof readServerContainerList>>) {
  if (payload.total === 0) return true;
  return payload.containers.every((item) => (
    item.currentStatus === 'BOOKED' &&
    item.currentLocation === 'Origin terminal' &&
    (!item.carrier || item.carrier === 'Pending carrier')
  ));
}

function normalizeContainerPayload(payload: Awaited<ReturnType<typeof readServerContainerList>>) {
  const normalizedContainers = payload.containers.map((container) => {
    const currentStatus = String(container.currentStatus || '');
    const emptyReturned =
      currentStatus.toUpperCase() === 'EMPTY_RETURNED' ||
      currentStatus.toLowerCase().includes('empty returned');
    if (!emptyReturned) return container;
    return {
      ...container,
      returnStatus: 'EMPTY_RETURNED' as const,
    };
  });
  return {
    ...payload,
    containers: normalizedContainers,
  };
}

async function backfillFromReleaseCookie(request: NextRequest, query: string) {
  const canonical = readCanonicalShippingMovement(request, query);
  const raw = request.cookies.get('tikur_abay_release_records')?.value;
  if (!raw) return false;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as ReleaseCookieRecord[];
    const match = parsed.find((item) => {
      const booking = String(item.bookingNumber || '').toLowerCase();
      const containerNo = String(item.containerNumber || '').toLowerCase();
      return booking === query || `trp-${booking}` === query || `trip-${booking}` === query || containerNo === query;
    });
    if (!match?.bookingNumber || !match.containerNumber) return false;
    await upsertServerTrackingOrigin({
      bookingNo: match.bookingNumber,
      containerNo: String(canonical?.containerNumber || match.containerNumber).trim(),
      blNo: String(canonical?.billOfLadingNumber || match.blNumber || `HBL-${match.bookingNumber}`).trim(),
      carrier: 'Djibouti release',
      vesselName: match.vesselName || '',
      voyageNo: match.voyageNumber || '',
      currentLocation: match.dischargePort || 'Djibouti Port',
      consignee: canonical?.customerName || match.customerName || '',
      eta: canonical?.expectedReturnDate || match.expectedGateOutTime || '',
      eventType: match.inlandHandoffSent ? 'CUSTOMS_CLEARED' : match.gateOutReady ? 'AVAILABLE_FOR_CLEARANCE' : match.vesselArrival ? 'VESSEL_ARRIVED' : 'ORIGIN_UPDATED',
      timestamp: match.lastUpdated || match.vesselArrival || '',
      description: 'Container backfilled from release cookie.',
    });
    return true;
  } catch {
    return false;
  }
}

async function backfillFromDispatchCookie(request: NextRequest, query: string) {
  const canonical = readCanonicalShippingMovement(request, query);
  const raw = request.cookies.get('tikur_abay_dispatch_trips')?.value;
  if (!raw) return false;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as DispatchCookieRecord[];
    const match = parsed.find((item) => {
      const booking = String(item.bookingNumber || '').toLowerCase();
      const containerNo = String(item.containerNumber || '').toLowerCase();
      return booking === query || `trp-${booking}` === query || `trip-${booking}` === query || containerNo === query;
    });
    if (!match?.bookingNumber || !match.containerNumber) return false;
    const status = String(match.currentTripStatus || '').toLowerCase();
    await upsertServerTrackingOrigin({
      bookingNo: match.bookingNumber,
      containerNo: String(canonical?.containerNumber || match.containerNumber).trim(),
      blNo: String(canonical?.billOfLadingNumber || match.blNumber || `HBL-${match.bookingNumber}`).trim(),
      carrier: 'Corridor dispatch',
      currentLocation: match.currentLocation || match.inlandDestination || 'Corridor route',
      consignee: canonical?.customerName || match.customerName || '',
      eta: canonical?.expectedReturnDate || match.expectedArrivalTime || '',
      eventType:
        status.includes('arrived inland') || status.includes('unload handoff')
          ? 'ARRIVED_INLAND'
          : status.includes('in transit') || status.includes('checkpoint') || status.includes('delayed')
            ? 'OUT_FOR_DELIVERY'
            : 'TRUCK_ASSIGNED',
      timestamp: match.lastUpdated || match.departedDjiboutiAt || '',
      description: 'Container backfilled from dispatch cookie.',
    });
    return true;
  } catch {
    return false;
  }
}

async function backfillFromYardCookie(request: NextRequest, query: string) {
  const canonical = readCanonicalShippingMovement(request, query);
  const raw = request.cookies.get('tikur_abay_yard_records')?.value;
  if (!raw) return false;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as YardCookieRecord[];
    const match = parsed.find((item) => {
      const booking = String(item.bookingNumber || '').toLowerCase();
      const containerNo = String(item.containerNumber || '').toLowerCase();
      return booking === query || `trp-${booking}` === query || `trip-${booking}` === query || containerNo === query;
    });
    if (!match?.bookingNumber || !match.containerNumber) return false;
    await upsertServerTrackingOrigin({
      bookingNo: match.bookingNumber,
      containerNo: String(canonical?.containerNumber || match.containerNumber).trim(),
      blNo: String(canonical?.billOfLadingNumber || match.blNumber || `HBL-${match.bookingNumber}`).trim(),
      carrier: 'Dry-port yard',
      currentLocation: match.emptyReturned ? match.designatedDepot || 'Djibouti Empty Depot' : match.currentLocation || match.inlandNode || 'Dry port',
      consignee: canonical?.customerName || match.customerName || '',
      eta: canonical?.expectedReturnDate || '',
      eventType: match.emptyReturned ? 'EMPTY_RETURNED' : match.handoffStatus === 'Completed' ? 'ARRIVED' : match.actualArrivalTime ? 'ARRIVED_INLAND' : 'YARD_HANDOFF',
      timestamp: match.returnTimestamp || match.handoffTime || match.actualArrivalTime || match.lastUpdated || '',
      description: 'Container backfilled from yard cookie.',
    });
    return true;
  } catch {
    return false;
  }
}

async function backfillFromShippingCookie(request: NextRequest, query: string) {
  const match = readCanonicalShippingMovement(request, query);
  if (!match?.bookingId || !match.containerNumber) return false;
  await upsertServerTrackingOrigin({
    bookingNo: match.bookingId,
    containerNo: match.containerNumber,
    blNo: match.billOfLadingNumber || `HBL-${match.bookingId}`,
    carrier: match.carrierName || '',
    currentLocation: match.currentLocation || 'Origin terminal',
    consignee: match.customerName || '',
    eta: match.expectedReturnDate || '',
    eventType: 'ORIGIN_UPDATED',
    timestamp: match.latestEventAt || '',
    description: 'Container backfilled from shipping movement cookie.',
  });
  return true;
}

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get('query') || '').trim().toLowerCase();
  let payload = await readServerContainerList(query);
  if (query) {
    const shippingBackfilled = await backfillFromShippingCookie(request, query);
    const releaseBackfilled = await backfillFromReleaseCookie(request, query);
    const dispatchBackfilled = await backfillFromDispatchCookie(request, query);
    const yardBackfilled = await backfillFromYardCookie(request, query);
    if (shippingBackfilled || releaseBackfilled || dispatchBackfilled || yardBackfilled) {
      payload = await readServerContainerList(query);
    }
  }
  if (shouldRefreshContainerPayload(payload) || query) {
    const supplierRaw = request.cookies.get('tikur_abay_supplier_shipments')?.value;
    if (supplierRaw) {
      try {
        const parsed = JSON.parse(decodeURIComponent(supplierRaw)) as SupplierShipmentCookieRecord[];
        const match = parsed.find((item) => {
          const booking = String(item.bookingNumber || '').toLowerCase();
          const containerNo = String(item.container?.containerNumber || '').toLowerCase();
          return booking === query || `trp-${booking}` === query || `trip-${booking}` === query || containerNo === query;
        });
        if (match?.bookingNumber) {
          await upsertServerTrackingOrigin({
            bookingNo: match.bookingNumber,
            containerNo: String(match.container?.containerNumber || '').trim(),
            blNo: String(match.handoff?.houseBlNumber || match.handoff?.carrierBlNumber || `HBL-${match.bookingNumber}`).trim(),
            carrier: String(match.handoff?.carrier || '').trim(),
            vesselName: String(match.handoff?.vesselName || '').trim(),
            voyageNo: String(match.handoff?.voyageNumber || '').trim(),
            currentLocation: String(match.container?.stuffingLocation || match.originPort || 'Origin terminal').trim(),
            shipper: String(match.supplierName || '').trim(),
            consignee: String(match.customerName || '').trim(),
            eta: String(match.etaDjibouti || '').trim(),
            eventType: match.handoff?.oceanHandoffStatus === 'Handed off to Djibouti release' ? 'LOADED_ON_VESSEL' : 'ORIGIN_UPDATED',
            description: 'Container backfilled from supplier origin cookie.',
          });
          payload = await readServerContainerList(query);
        }
      } catch {
        // Ignore malformed supplier cookie and continue.
      }
    }
  }
  if (shouldRefreshContainerPayload(payload) && (query.includes('bk-') || query.startsWith('trp-') || query.startsWith('trip-'))) {
    const raw = request.cookies.get('tikur_abay_quote_reviews')?.value;
    if (raw) {
      try {
        const parsed = JSON.parse(decodeURIComponent(raw)) as SharedQuoteCookieRecord[];
        const match = parsed.find((item) => {
          const bookingId = String(item.bookingId || '').toLowerCase();
          return bookingId === query || `trp-${bookingId}` === query || `trip-${bookingId}` === query;
        });
        if (match?.bookingId) {
          await upsertServerTrackingBooking({
            bookingNo: match.bookingId,
            quoteId: match.quoteId || '',
            shipmentNo: match.bookingId,
            containerCount: Number(match.containerCount || 1),
            blNo: `HBL-${match.bookingId}`,
            carrier: 'Pending carrier',
            vesselName: match.vesselName || 'Pending vessel',
            voyageNo: match.voyageNumber || 'Pending voyage',
            currentLocation: match.placeOfReceipt || match.portOfLoading || 'Origin terminal',
            shipper: match.company || match.customerName || '',
            consignee: match.consigneeName || match.customerName || '',
            eta: match.requestedArrivalWindow || '',
          });
          payload = await readServerContainerList(query);
        }
      } catch {
        // Ignore malformed shared quote cookie and return the current payload.
      }
    }
  }
  const canonical = readCanonicalShippingMovement(request, query);
  if (canonical?.containerNumber && (query.includes('bk-') || query.startsWith('trp-') || query.startsWith('trip-'))) {
    const canonicalPayload = await readServerContainerList(canonical.containerNumber.toLowerCase());
    if (canonicalPayload.total > 0) {
      payload = canonicalPayload;
    }
  }
  return NextResponse.json(normalizeContainerPayload(payload));
}
