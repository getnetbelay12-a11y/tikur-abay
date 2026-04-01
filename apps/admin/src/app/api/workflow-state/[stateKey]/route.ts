import { NextResponse } from 'next/server';
import {
  readWorkflowState,
  workflowStateKeys,
  type WorkflowStateKey,
  writeWorkflowState,
} from '../../../../lib/server-local-workflow-store';

function resolveStateKey(value: string): WorkflowStateKey | null {
  return workflowStateKeys.includes(value as WorkflowStateKey)
    ? (value as WorkflowStateKey)
    : null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ stateKey: string }> },
) {
  const { stateKey } = await params;
  const resolved = resolveStateKey(stateKey);
  if (!resolved) {
    return NextResponse.json({ message: 'Unknown workflow state key.' }, { status: 404 });
  }
  const items = await readWorkflowState<unknown>(resolved);
  return NextResponse.json({ items });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ stateKey: string }> },
) {
  const { stateKey } = await params;
  const resolved = resolveStateKey(stateKey);
  if (!resolved) {
    return NextResponse.json({ message: 'Unknown workflow state key.' }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as { items?: unknown[] };
  const items = Array.isArray(body.items) ? body.items : [];
  const saved = await writeWorkflowState(resolved, items);
  return NextResponse.json({ items: saved });
}
