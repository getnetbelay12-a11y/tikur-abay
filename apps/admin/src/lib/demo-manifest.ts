import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export type DemoManifestScenario = {
  label: string;
  bookingNumber: string;
  shipmentId: string;
  tripId: string | null;
  customerCode: string;
  containerNumber: string;
  sealNumber: string;
  blNumber: string;
  currentStage: string;
  requestSource: string;
  expectedOutcome: string;
};

export type DemoManifest = {
  mode: string;
  preparedAt: string;
  apiBase: string;
  manifest: {
    purpose: string;
    environment: {
      adminConsole: string;
      customerPortal: string;
      backendApi: string;
      mobileApp: string;
    };
    accounts: Record<string, Record<string, string>>;
    walkthroughOrder: string[];
    scenarios: DemoManifestScenario[];
  };
};

function resolveRepoRoot() {
  const cwd = process.cwd();
  if (cwd.includes('/apps/admin')) {
    return resolve(cwd, '../..');
  }
  return cwd;
}

export async function readDemoManifest(): Promise<DemoManifest | null> {
  try {
    const filePath = resolve(resolveRepoRoot(), 'reports/demo-scenario-manifest.json');
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw) as DemoManifest;
  } catch {
    return null;
  }
}
