import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ blNumber: string }> },
) {
  const { blNumber } = await context.params;
  const shipmentId = request.nextUrl.searchParams.get('shipmentId') || '';
  const status = request.nextUrl.searchParams.get('status') || 'FINAL';
  const carrierBl = request.nextUrl.searchParams.get('carrierBl') || '';

  const valid = /^([A-Z]{2,4}-)?BL-/i.test(blNumber) || /^HBL-/i.test(blNumber) || /^TAB-BL-/i.test(blNumber);

  return NextResponse.json({
    valid,
    shipment: shipmentId || 'Pending shipment link',
    status,
    blNumber,
    carrierBl,
    verifiedAt: new Date().toISOString(),
  });
}
