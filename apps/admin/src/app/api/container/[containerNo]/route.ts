import { NextResponse } from 'next/server';
import { readServerContainer } from '../../../../lib/server-local-tracking-store';

export async function GET(
  _request: Request,
  context: { params: Promise<{ containerNo: string }> },
) {
  const { containerNo } = await context.params;
  const container = await readServerContainer(containerNo);
  return NextResponse.json({
    found: Boolean(container),
    container,
  });
}
