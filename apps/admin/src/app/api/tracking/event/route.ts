import { NextResponse } from 'next/server';
import { appendServerTrackingEvent } from '../../../../lib/server-local-tracking-store';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const containerNo = String(body.containerNo || '').trim();
  const eventType = String(body.eventType || '').trim();
  const location = String(body.location || '').trim();
  const source = String(body.source || 'manual').trim();
  const timestamp = String(body.timestamp || new Date().toISOString()).trim();
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
