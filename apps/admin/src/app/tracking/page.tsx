import { serverApiGet } from '../../lib/server-api';
import { LiveTrackingRuntime } from '../../components/live-tracking-runtime';

export const dynamic = 'force-dynamic';

type FleetPoint = {
  tripId: string;
  tripCode: string;
  vehicleDbId: string;
  vehicleId: string;
  plateNumber: string;
  driverName: string;
  branch: string;
  routeName: string;
  tripStatus: string;
  vehicleStatus: string;
  geofence: string;
  currentOdometerKm: number;
  lastFuelAt: string | null;
  lastMaintenanceAt: string | null;
  latestGpsAt: string | null;
  lastSeenMinutes: number | null;
  offline: boolean;
  latitude: number;
  longitude: number;
  speed: number;
  djiboutiFlag: boolean;
  delayed: boolean;
  markerColor: string;
};

type LiveMapResponse = {
  totalVehicles: number;
  activeVehicles: number;
  delayedVehicles: number;
  inDjiboutiVehicles: number;
  points: FleetPoint[];
};

export default async function TrackingPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const initialLookupQuery =
    (typeof params.query === 'string' && params.query) ||
    (typeof params.q === 'string' && params.q) ||
    '';
  const query = new URLSearchParams();
  for (const key of ['branch', 'tripStatus', 'vehicleStatus', 'djiboutiOnly', 'delayedOnly', 'offlineOnly']) {
    const value = params[key];
    if (typeof value === 'string' && value) {
      query.set(key, value);
    }
  }

  const mapData = await serverApiGet<LiveMapResponse>(`/tracking/live-map${query.size ? `?${query.toString()}` : ''}`).catch(() => ({
    totalVehicles: 0,
    activeVehicles: 0,
    delayedVehicles: 0,
    inDjiboutiVehicles: 0,
    points: [],
  }));

  return (
    <main className="shell">
      <div className="panel">
        <LiveTrackingRuntime
          initialData={mapData}
          queryString={query.toString()}
          initialLookupQuery={initialLookupQuery}
        />
      </div>
    </main>
  );
}
