import { NextRequest, NextResponse } from 'next/server';
import { appendServerTrackingEvent, readServerTrackingByQuery, upsertServerTrackingBooking, upsertServerTrackingOrigin } from '../../../lib/server-local-tracking-store';

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
  assignedDriver?: string;
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
  currentStatus?: string;
  currentLocation?: string;
  customerName?: string;
  expectedReturnDate?: string;
  latestEventAt?: string;
};

type ShippingBillCookieRecord = {
  bookingId?: string;
  containerNumber?: string;
  billOfLadingNumber?: string;
  carrierName?: string;
  vesselName?: string;
  voyageNumber?: string;
  currentLocation?: string;
  customerName?: string;
  status?: string;
  updatedAt?: string;
};

function readCanonicalShippingMovement(request: NextRequest, query: string) {
  const billRaw = request.cookies.get('tikur_abay_shipping_bills')?.value;
  if (billRaw) {
    try {
      const bills = JSON.parse(decodeURIComponent(billRaw)) as ShippingBillCookieRecord[];
      const lowered = query.toLowerCase();
      const billMatch = bills.find((item) => {
        const booking = String(item.bookingId || '').toLowerCase();
        const containerNo = String(item.containerNumber || '').toLowerCase();
        return booking === lowered || `trp-${booking}` === lowered || `trip-${booking}` === lowered || containerNo === lowered;
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
    const lowered = query.toLowerCase();
    return parsed.find((item) => {
      const booking = String(item.bookingId || '').toLowerCase();
      const containerNo = String(item.containerNumber || '').toLowerCase();
      return booking === lowered || `trp-${booking}` === lowered || `trip-${booking}` === lowered || containerNo === lowered;
    }) || null;
  } catch {
    return null;
  }
}

function shouldRefreshTrackingPayload(payload: Awaited<ReturnType<typeof readServerTrackingByQuery>>) {
  const container = payload.container;
  if (!container) return true;
  const latestEvent = payload.events?.[0];
  return (
    container.currentStatus === 'BOOKED' &&
    container.currentLocation === 'Origin terminal' &&
    (!container.carrier || container.carrier === 'Pending carrier') &&
    (!latestEvent || latestEvent.source === 'fallback')
  );
}

async function backfillBookingFromCookie(request: NextRequest, query: string) {
  const raw = request.cookies.get('tikur_abay_quote_reviews')?.value;
  const lowered = query.toLowerCase();
  if (!raw || (!lowered.includes('bk-') && !lowered.startsWith('trp-') && !lowered.startsWith('trip-'))) return false;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as SharedQuoteCookieRecord[];
    const match = parsed.find((item) => {
      const bookingId = String(item.bookingId || '').toLowerCase();
      return bookingId === lowered || `trp-${bookingId}` === lowered || `trip-${bookingId}` === lowered;
    });
    if (!match?.bookingId) return false;
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
    return true;
  } catch {
    return false;
  }
}

async function backfillFromSupplierCookie(request: NextRequest, query: string) {
  const canonical = readCanonicalShippingMovement(request, query);
  const raw = request.cookies.get('tikur_abay_supplier_shipments')?.value;
  if (!raw) return false;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as SupplierShipmentCookieRecord[];
    const lowered = query.toLowerCase();
    const match = parsed.find((item) => {
      const booking = String(item.bookingNumber || '').toLowerCase();
      const containerNo = String(item.container?.containerNumber || '').toLowerCase();
      return booking === lowered || `trp-${booking}` === lowered || `trip-${booking}` === lowered || containerNo === lowered;
    });
    if (!match?.bookingNumber) return false;
    await upsertServerTrackingOrigin({
      bookingNo: match.bookingNumber,
      containerNo: String(canonical?.containerNumber || match.container?.containerNumber || '').trim(),
      blNo: String(canonical?.billOfLadingNumber || match.handoff?.houseBlNumber || match.handoff?.carrierBlNumber || `HBL-${match.bookingNumber}`).trim(),
      carrier: String(canonical?.carrierName || match.handoff?.carrier || '').trim(),
      vesselName: String(match.handoff?.vesselName || '').trim(),
      voyageNo: String(match.handoff?.voyageNumber || '').trim(),
      currentLocation: String(canonical?.currentLocation || match.container?.stuffingLocation || match.originPort || 'Origin terminal').trim(),
      shipper: String(match.supplierName || '').trim(),
      consignee: String(canonical?.customerName || match.customerName || '').trim(),
      eta: String(canonical?.expectedReturnDate || match.etaDjibouti || '').trim(),
      eventType: match.handoff?.oceanHandoffStatus === 'Handed off to Djibouti release' ? 'LOADED_ON_VESSEL' : 'ORIGIN_UPDATED',
      description: 'Tracking backfilled from supplier origin cookie.',
    });
    return true;
  } catch {
    return false;
  }
}

async function backfillFromReleaseCookie(request: NextRequest, query: string) {
  const canonical = readCanonicalShippingMovement(request, query);
  const raw = request.cookies.get('tikur_abay_release_records')?.value;
  if (!raw) return false;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as ReleaseCookieRecord[];
    const lowered = query.toLowerCase();
    const match = parsed.find((item) => {
      const booking = String(item.bookingNumber || '').toLowerCase();
      const containerNo = String(item.containerNumber || '').toLowerCase();
      return booking === lowered || `trp-${booking}` === lowered || `trip-${booking}` === lowered || containerNo === lowered;
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
      description: `Tracking backfilled from release stage ${match.currentStage || 'pending'}.`,
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
    const lowered = query.toLowerCase();
    const match = parsed.find((item) => {
      const booking = String(item.bookingNumber || '').toLowerCase();
      const containerNo = String(item.containerNumber || '').toLowerCase();
      return booking === lowered || `trp-${booking}` === lowered || `trip-${booking}` === lowered || containerNo === lowered;
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
      description: `Tracking backfilled from dispatch status ${match.currentTripStatus || 'pending'}.`,
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
    const lowered = query.toLowerCase();
    const match = parsed.find((item) => {
      const booking = String(item.bookingNumber || '').toLowerCase();
      const containerNo = String(item.containerNumber || '').toLowerCase();
      return booking === lowered || `trp-${booking}` === lowered || `trip-${booking}` === lowered || containerNo === lowered;
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
      description: `Tracking backfilled from yard stage ${match.yardStage || 'pending'}.`,
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
    description: `Tracking backfilled from shipping movement ${match.currentStatus || 'pending'}.`,
  });
  return true;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('query') || '';
  let payload = await readServerTrackingByQuery(query);
  if (query.trim()) {
    const trimmedQuery = query.trim();
    const bookingBackfilled = shouldRefreshTrackingPayload(payload)
      ? await backfillBookingFromCookie(request, trimmedQuery)
      : false;
    const supplierBackfilled = await backfillFromSupplierCookie(request, trimmedQuery);
    const shippingBackfilled = await backfillFromShippingCookie(request, trimmedQuery);
    const releaseBackfilled = await backfillFromReleaseCookie(request, trimmedQuery);
    const dispatchBackfilled = await backfillFromDispatchCookie(request, trimmedQuery);
    const yardBackfilled = await backfillFromYardCookie(request, trimmedQuery);
    if (bookingBackfilled || supplierBackfilled || shippingBackfilled || releaseBackfilled || dispatchBackfilled || yardBackfilled) {
      payload = await readServerTrackingByQuery(query);
    }
  }
  const canonical = readCanonicalShippingMovement(request, query.trim());
  if (canonical?.containerNumber && payload.container?.bookingNo === canonical.bookingId) {
    const canonicalPayload = await readServerTrackingByQuery(canonical.containerNumber);
    if (canonicalPayload.container) {
      payload = {
        ...payload,
        container: canonicalPayload.container,
        events: canonicalPayload.events,
        relatedContainers: canonicalPayload.relatedContainers,
        matchedAliases: canonicalPayload.matchedAliases,
        suggestions: canonicalPayload.suggestions,
      };
    }
  }
  return NextResponse.json(payload);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const containerNo = String(body.containerNo || '').trim();
  const eventType = String(body.eventType || '').trim();
  const location = String(body.location || '').trim();
  const source = String(body.source || 'manual').trim();
  const timestamp = String(body.timestamp || new Date().toISOString());
  const description = String(body.description || '').trim();
  const result = await appendServerTrackingEvent({
    containerNo,
    eventType,
    location,
    source,
    timestamp,
    description,
  });
  return NextResponse.json({
    ...result,
    mode: 'local-server-store',
  });
}
