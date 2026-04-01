import { VehiclesRuntime } from '../../components/vehicles-runtime';
import { serverApiGet } from '../../lib/server-api';

export default async function VehiclesPage() {
  const vehicles = await serverApiGet<Array<Record<string, unknown>>>('/vehicles').catch(() => []);
  return <VehiclesRuntime vehicles={vehicles} />;
}
