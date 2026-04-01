export type WorkflowStateKey =
  | 'booking-quotes'
  | 'supplier-shipments'
  | 'djibouti-release'
  | 'transitor-clearance'
  | 'dispatch-trips'
  | 'yard-records';

type WorkflowStateResponse<T> = {
  items?: T[];
};

export async function readWorkflowState<T>(key: WorkflowStateKey): Promise<T[]> {
  const response = await fetch(`/api/workflow-state/${encodeURIComponent(key)}`, {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Unable to read workflow state for ${key}`);
  }
  const payload = (await response.json()) as WorkflowStateResponse<T>;
  return Array.isArray(payload.items) ? payload.items : [];
}

export async function writeWorkflowState<T>(key: WorkflowStateKey, items: T[]) {
  const response = await fetch(`/api/workflow-state/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  if (!response.ok) {
    throw new Error(`Unable to write workflow state for ${key}`);
  }
  const payload = (await response.json()) as WorkflowStateResponse<T>;
  return Array.isArray(payload.items) ? payload.items : [];
}
