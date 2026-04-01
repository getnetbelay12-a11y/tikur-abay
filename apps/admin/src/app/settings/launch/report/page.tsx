import { LaunchReportRuntime } from '../../../../components/launch-report-runtime';
import type { LaunchWorkspace } from '../../../../components/launch-center-runtime';
import { serverApiGet } from '../../../../lib/server-api';

export const dynamic = 'force-dynamic';

export default async function LaunchReportPage() {
  let workspace: LaunchWorkspace | null = null;
  try {
    workspace = await serverApiGet<LaunchWorkspace>('/launch-center');
  } catch {
    workspace = null;
  }

  return <LaunchReportRuntime workspace={workspace} />;
}
