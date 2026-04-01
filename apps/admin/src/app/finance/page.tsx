import { CorridorWorkspaceRuntime } from '../../components/corridor-workspace-runtime';
import { serverApiGet } from '../../lib/server-api';

export const dynamic = 'force-dynamic';

export default async function FinancePage() {
  const workspace = await serverApiGet<any>('/corridor/workspaces/finance').catch(() => null);
  return <CorridorWorkspaceRuntime workspace={workspace} />;
}
