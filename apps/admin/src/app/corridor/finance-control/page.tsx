import { CorridorWorkspaceRuntime, type CorridorWorkspaceKey } from '../../../components/corridor-workspace-runtime';
import { serverApiGet } from '../../../lib/server-api';

async function loadWorkspace(workspace: CorridorWorkspaceKey) {
  return serverApiGet<any>(`/corridor/workspaces/${workspace}`).catch(() => null);
}

export default async function FinanceControlDeskPage() {
  const workspace = await loadWorkspace('finance');
  return <CorridorWorkspaceRuntime workspace={workspace} />;
}
