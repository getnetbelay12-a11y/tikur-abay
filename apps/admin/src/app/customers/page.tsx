import { CustomersWorkspaceRuntime } from '../../components/customers-workspace-runtime';
import { serverApiGet } from '../../lib/server-api';

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  const workspace = await serverApiGet<any>('/commercial/customers-workspace').catch(() => null);
  return <CustomersWorkspaceRuntime workspace={workspace} />;
}
