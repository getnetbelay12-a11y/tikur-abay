import { DriversRuntime } from '../../components/drivers-runtime';
import { serverApiGet } from '../../lib/server-api';

export default async function DriversPage() {
  const drivers = await serverApiGet<Array<Record<string, unknown>>>('/drivers').catch(() => []);

  return <DriversRuntime drivers={drivers} />;
}
