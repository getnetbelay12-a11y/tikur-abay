import { ExecutiveDashboardRuntime, type ExecutiveTab, type ExecutiveWorkspacePayload } from '../../../components/executive-dashboard-runtime';
import { serverApiGet } from '../../../lib/server-api';

function normalizeTab(tab?: string) {
  return ['finance', 'operations', 'attention'].includes(String(tab)) ? String(tab) : 'overview';
}

export default async function ExecutiveDashboardPage({ searchParams }: { searchParams?: Promise<{ tab?: string }> }) {
  const params = await searchParams;
  const initialTab = normalizeTab(params?.tab);
  const initialWorkspace = await serverApiGet<ExecutiveWorkspacePayload>(
    `/dashboard/executive-workspace${initialTab === 'overview' ? '' : `?tab=${initialTab}`}`,
    { revalidate: 15 },
  ).catch(() => null);

  return (
    <main className="shell">
      <ExecutiveDashboardRuntime initialWorkspace={initialWorkspace} initialTab={initialTab as ExecutiveTab} />
    </main>
  );
}
