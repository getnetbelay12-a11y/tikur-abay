import { ObstacleReportsRuntime } from '../../components/obstacle-reports-runtime';
import { serverApiGet } from '../../lib/server-api';

export default async function ObstacleReportsPage() {
  const incidents = await serverApiGet<Array<Record<string, unknown>>>('/incident-reports').catch(() => []);

  return <ObstacleReportsRuntime incidents={incidents ?? []} />;
}
