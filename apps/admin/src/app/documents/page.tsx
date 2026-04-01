import { DocumentsWorkspaceRuntime } from '../../components/documents-workspace-runtime';
import { serverApiGet } from '../../lib/server-api';

export const dynamic = 'force-dynamic';

export default async function DocumentsPage() {
  const rows = await serverApiGet<any[]>('/documents').catch(() => []);
  return <DocumentsWorkspaceRuntime workspace={{ rows }} />;
}
