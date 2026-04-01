import { DriverReportsRuntime } from '../../components/driver-reports-runtime';
import { serverApiGet } from '../../lib/server-api';

export default async function DriverReportsPage() {
  const reports = await serverApiGet<Array<Record<string, unknown>>>('/driver-reports').catch(() => []);

  return <DriverReportsRuntime reports={reports} />;
}
