import { FuelRequestsRuntime } from '../../components/fuel-requests-runtime';
import { serverApiGet } from '../../lib/server-api';

export default async function FuelRequestsPage() {
  const reports = await serverApiGet<Array<Record<string, unknown>>>('/driver-reports').catch(() => []);

  return <FuelRequestsRuntime reports={reports ?? []} />;
}
