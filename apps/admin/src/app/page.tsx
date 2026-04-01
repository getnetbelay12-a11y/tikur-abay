import { ExecutiveDashboardRuntime, type ExecutiveTab, type ExecutiveWorkspacePayload } from '../components/executive-dashboard-runtime';
import { DemoScenarioControl } from '../components/demo-scenario-control';
import { readDemoManifest } from '../lib/demo-manifest';
import { demoScenarioToolsEnabled } from '../lib/runtime-flags';
import { serverApiGet } from '../lib/server-api';

function normalizeTab(tab?: string) {
  return ['finance', 'operations', 'attention'].includes(String(tab)) ? String(tab) : 'overview';
}

export default async function AdminHomePage({ searchParams }: { searchParams?: Promise<{ tab?: string }> }) {
  const params = await searchParams;
  const initialTab = normalizeTab(params?.tab);
  const demoManifest = await readDemoManifest();
  const initialWorkspace = await serverApiGet<ExecutiveWorkspacePayload>(
    `/dashboard/executive-workspace${initialTab === 'overview' ? '' : `?tab=${initialTab}`}`,
    { revalidate: 15 },
  ).catch(() => null);

  return (
    <main className="shell">
      {demoScenarioToolsEnabled ? <DemoScenarioControl manifest={demoManifest} /> : null}
      <ExecutiveDashboardRuntime initialWorkspace={initialWorkspace} initialTab={initialTab as ExecutiveTab} />
    </main>
  );
}
