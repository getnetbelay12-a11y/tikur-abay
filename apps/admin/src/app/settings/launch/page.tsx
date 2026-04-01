import { LaunchCenterRuntime, type LaunchWorkspace } from '../../../components/launch-center-runtime';
import { serverApiGet } from '../../../lib/server-api';

export const dynamic = 'force-dynamic';

export default async function LaunchCenterPage() {
  let workspace: LaunchWorkspace | null = null;
  try {
    workspace = await serverApiGet<LaunchWorkspace>('/launch-center');
  } catch {
    workspace = null;
  }

  return <LaunchCenterRuntime workspace={workspace} />;
}
