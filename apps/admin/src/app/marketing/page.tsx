import { MarketingWorkspaceRuntime } from '../../components/marketing-workspace-runtime';
import { serverApiGet } from '../../lib/server-api';

export const dynamic = 'force-dynamic';

export default async function MarketingPage() {
  const workspace = await serverApiGet<any>('/commercial/marketing-workspace').catch(() => null);
  return <MarketingWorkspaceRuntime workspace={workspace} />;
}
