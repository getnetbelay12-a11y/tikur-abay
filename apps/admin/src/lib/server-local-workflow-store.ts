import 'server-only';

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const workflowStoreDir = path.join('/tmp', 'tikur_abay_workflow_store');
const workflowStorePath = path.join(workflowStoreDir, 'workflow.json');

export const workflowStateKeys = [
  'booking-quotes',
  'supplier-shipments',
  'djibouti-release',
  'transitor-clearance',
  'dispatch-trips',
  'yard-records',
] as const;

export type WorkflowStateKey = (typeof workflowStateKeys)[number];

type WorkflowStore = Record<WorkflowStateKey, unknown[]>;

function emptyWorkflowStore(): WorkflowStore {
  return {
    'booking-quotes': [],
    'supplier-shipments': [],
    'djibouti-release': [],
    'transitor-clearance': [],
    'dispatch-trips': [],
    'yard-records': [],
  };
}

function normalizeWorkflowStore(input: unknown): WorkflowStore {
  const next = emptyWorkflowStore();
  if (!input || typeof input !== 'object') return next;
  for (const key of workflowStateKeys) {
    const value = (input as Record<string, unknown>)[key];
    next[key] = Array.isArray(value) ? value : [];
  }
  return next;
}

async function ensureWorkflowStoreDir() {
  await mkdir(workflowStoreDir, { recursive: true });
}

async function readWorkflowStore(): Promise<WorkflowStore> {
  await ensureWorkflowStoreDir();
  try {
    const raw = await readFile(workflowStorePath, 'utf8');
    return normalizeWorkflowStore(JSON.parse(raw));
  } catch {
    const initial = emptyWorkflowStore();
    await writeFile(workflowStorePath, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
}

async function writeWorkflowStore(store: WorkflowStore) {
  await ensureWorkflowStoreDir();
  await writeFile(workflowStorePath, JSON.stringify(store, null, 2), 'utf8');
}

export async function readWorkflowState<T>(key: WorkflowStateKey): Promise<T[]> {
  const store = await readWorkflowStore();
  return (store[key] as T[]) || [];
}

export async function writeWorkflowState<T>(key: WorkflowStateKey, value: T[]) {
  const store = await readWorkflowStore();
  store[key] = Array.isArray(value) ? value : [];
  await writeWorkflowStore(store);
  return store[key] as T[];
}
