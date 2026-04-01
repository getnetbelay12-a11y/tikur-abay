import { NextResponse } from 'next/server';
import { upsertServerTrackingBooking } from '../../../../lib/server-local-tracking-store';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await upsertServerTrackingBooking({
    bookingNo: String(body.bookingNo || '').trim(),
    quoteId: String(body.quoteId || '').trim(),
    shipmentNo: String(body.shipmentNo || '').trim(),
    containerCount: Number(body.containerCount || 1),
    blNo: String(body.blNo || '').trim(),
    carrier: String(body.carrier || '').trim(),
    vesselName: String(body.vesselName || '').trim(),
    voyageNo: String(body.voyageNo || '').trim(),
    currentLocation: String(body.currentLocation || '').trim(),
    shipper: String(body.shipper || '').trim(),
    consignee: String(body.consignee || '').trim(),
    createdAt: String(body.createdAt || '').trim(),
    updatedAt: String(body.updatedAt || '').trim(),
    eta: String(body.eta || '').trim(),
  });
  return NextResponse.json({
    ...result,
    mode: 'local-server-store',
  });
}
