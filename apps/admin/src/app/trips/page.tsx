import { TripsRuntime } from '../../components/trips-runtime';
import { serverApiGet } from '../../lib/server-api';

type TripRow = Record<string, unknown>;

export default async function TripsPage() {
  const trips = await serverApiGet<TripRow[]>('/trips').catch(() => []);

  return <TripsRuntime trips={trips ?? []} />;
}
