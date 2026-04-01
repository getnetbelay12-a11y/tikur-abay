import { PaymentsWorkspaceRuntime } from '../../components/payments-workspace-runtime';
import { serverApiGet } from '../../lib/server-api';

export const dynamic = 'force-dynamic';

export default async function PaymentsPage() {
  const workspace = await serverApiGet<any>('/payments/workspace').catch(() => ({ rows: [], communicationSummary: null }));
  return <PaymentsWorkspaceRuntime workspace={workspace} />;
}
