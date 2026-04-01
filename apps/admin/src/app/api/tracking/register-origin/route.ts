import { NextResponse } from 'next/server';
import { upsertServerTrackingOrigin } from '../../../../lib/server-local-tracking-store';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await upsertServerTrackingOrigin({
    bookingNo: String(body.bookingNo || '').trim(),
    containerNo: String(body.containerNo || '').trim(),
    blNo: String(body.blNo || '').trim(),
    carrier: String(body.carrier || '').trim(),
    vesselName: String(body.vesselName || '').trim(),
    voyageNo: String(body.voyageNo || '').trim(),
    currentLocation: String(body.currentLocation || '').trim(),
    shipper: String(body.shipper || '').trim(),
    consignee: String(body.consignee || '').trim(),
    eta: String(body.eta || '').trim(),
    eventType: String(body.eventType || '').trim(),
    description: String(body.description || '').trim(),
    timestamp: String(body.timestamp || '').trim(),
  });
  return NextResponse.json({
    ...result,
    mode: 'local-server-store',
  });
}
