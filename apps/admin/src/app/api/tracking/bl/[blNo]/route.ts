import { NextResponse } from 'next/server';
import { readServerTrackingByBl } from '../../../../../lib/server-local-tracking-store';

export async function GET(
  _request: Request,
  context: { params: Promise<{ blNo: string }> },
) {
  const { blNo } = await context.params;
  return NextResponse.json(await readServerTrackingByBl(blNo));
}
