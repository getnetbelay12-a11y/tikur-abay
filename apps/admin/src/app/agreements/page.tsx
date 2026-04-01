import { AgreementsWorkspaceRuntime } from '../../components/agreements-workspace-runtime';
import { serverApiGet } from '../../lib/server-api';

export const dynamic = 'force-dynamic';

export default async function AgreementsPage() {
  const workspace = await serverApiGet<any>('/commercial/agreements-workspace').catch(() => null);
  return <AgreementsWorkspaceRuntime workspace={workspace} />;
}
