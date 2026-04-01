'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { apiGet } from '../lib/api';
import { useLiveTracking } from '../hooks/useLiveTracking';
import { toArray } from '../lib/normalize';
import { getAdminSocket } from '../lib/realtime';
import { readShippingPhase1Workspace } from '../lib/shipping-phase1';
import { useConsoleI18n } from '../lib/use-console-i18n';
import { LiveFleetMap } from './live-fleet-map';
import LiveMap, { type LiveMapShipment } from './tracking/LiveMap';

type FleetPoint = {
  tripId: string;
  tripCode: string;
  vehicleDbId: string;
  vehicleId: string;
  plateNumber: string;
  driverName: string;
  driverPhone?: string;
  branch: string;
  routeName: string;
  destination?: string;
  tripStatus: string;
  vehicleStatus: string;
  geofence: string;
  locationLabel?: string;
  currentOdometerKm: number;
  lastFuelAt: string | null;
  fuelStation?: string | null;
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

type VehicleLive = {
  vehicleDbId: string;
  vehicleId: string;
  plateNumber: string;
  branch: string;
  status: string;
  currentOdometerKm: number;
  lastFuelAt: string | null;
  lastFuelKm: number | null;
  lastMaintenanceAt: string | null;
  lastMaintenanceKm: number | null;
  driverName: string | null;
  driverPhone?: string | null;
  emergencyContact?: string | null;
  tripCode: string | null;
  routeName: string | null;
  destination?: string | null;
  geofence: string | null;
  locationLabel?: string | null;
  fuelStation?: string | null;
  latestGpsAt: string | null;
  speed: number;
  latitude: number | null;
  longitude: number | null;
};

type TripHistoryPoint = {
  latitude: number;
  longitude: number;
  speed: number;
  geofence: string;
  recordedAt: string;
};

type TrackingLookupResponse = {
  container?: {
    containerNo: string;
    bookingNo: string;
    shipmentNo: string;
    currentStatus: string;
    currentLocation: string;
    assignedDriver: string;
    deliveredBy: string;
    returnedBy: string;
    returnStatus: string;
    updatedAt: string;
    expectedReturnDate: string;
  } | null;
  events?: Array<{
    eventType: string;
    location: string;
    timestamp: string;
    description?: string;
  }>;
  alerts?: Array<{ title: string; tone: 'critical' | 'warning' | 'info' | 'good'; detail: string }>;
};

type TrackingTimelineRow = {
  eventType: string;
  location: string;
  timestamp: string;
  description?: string;
};

const emptyMapData: LiveMapResponse = {
  totalVehicles: 0,
  activeVehicles: 0,
  delayedVehicles: 0,
  inDjiboutiVehicles: 0,
  points: [],
};

function formatDateTime(value: string | null) {
  if (!value) return 'No update';
  return new Date(value).toLocaleString();
}

function buildQueryString(baseQuery: string, updates: Record<string, string | null>) {
  const params = new URLSearchParams(baseQuery);
  Object.entries(updates).forEach(([key, value]) => {
    if (!value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  });
  return params.toString();
}

function classifyContainerMovement(status: string) {
  const normalized = String(status || '').toUpperCase();
  if (normalized.includes('EMPTY') || normalized === 'RETURNED') return 'Empty return';
  if (normalized === 'DELIVERED' || normalized === 'UNLOADED_INLAND') return 'Delivered / awaiting empty';
  return 'Loaded in journey';
}

function resolveCanonicalTrackingPayload(query: string, payload: TrackingLookupResponse) {
  const normalizedQuery = String(query || '').trim().toUpperCase();
  if (!normalizedQuery.startsWith('BK-') && !normalizedQuery.startsWith('TB-') && !normalizedQuery.startsWith('TAB-')) {
    return payload;
  }

  const bookingNo = String(payload.container?.bookingNo || normalizedQuery).trim().toUpperCase();
  if (!bookingNo) return payload;

  const workspace = readShippingPhase1Workspace();
  const bill = workspace.billsOfLading.find((item) => String(item.bookingId || '').trim().toUpperCase() === bookingNo);
  const movement = workspace.containerMovements.find((item) => String(item.bookingId || '').trim().toUpperCase() === bookingNo);
  const canonicalContainerNo = bill?.containerNumber || movement?.containerNumber || payload.container?.containerNo;
  if (!canonicalContainerNo) return payload;
  const latestEvent = movement?.events?.[0];
  const updatedAt = latestEvent?.timestamp || payload.container?.updatedAt || '';
  const currentStatus = String(movement?.currentStatus || payload.container?.currentStatus || '');
  const returnStatus =
    String(latestEvent?.type || '').toUpperCase() === 'EMPTY_RETURNED' ||
    currentStatus.toUpperCase() === 'EMPTY_RETURNED' ||
    currentStatus.toLowerCase().includes('empty returned')
      ? 'EMPTY_RETURNED'
      : String(payload.container?.returnStatus || 'PENDING');

  return {
    ...payload,
    container: {
      containerNo: canonicalContainerNo,
      bookingNo,
      shipmentNo: payload.container?.shipmentNo || bookingNo,
      currentStatus,
      currentLocation: String(movement?.currentLocation || payload.container?.currentLocation || ''),
      assignedDriver: String(movement?.assignedDriverName || payload.container?.assignedDriver || ''),
      deliveredBy: String(payload.container?.deliveredBy || ''),
      returnedBy: String(payload.container?.returnedBy || ''),
      returnStatus,
      updatedAt,
      expectedReturnDate: String(movement?.expectedReturnDate || payload.container?.expectedReturnDate || ''),
    },
    events: latestEvent
      ? [{
          eventType: latestEvent.type,
          location: latestEvent.location,
          timestamp: latestEvent.timestamp,
          description: latestEvent.note,
        }]
      : payload.events,
  };
}

export function LiveTrackingRuntime({
  initialData = emptyMapData,
  queryString,
  initialLookupQuery = '',
}: {
  initialData?: LiveMapResponse;
  queryString: string;
  initialLookupQuery?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { language, tx } = useConsoleI18n();
  const [mapData, setMapData] = useState<LiveMapResponse>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleLive | null>(null);
  const [routeHistory, setRouteHistory] = useState<TripHistoryPoint[]>([]);
  const [showRouteHistory, setShowRouteHistory] = useState(false);
  const [containerQuery, setContainerQuery] = useState(initialLookupQuery);
  const [containerLookup, setContainerLookup] = useState<TrackingLookupResponse | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [filters, setFilters] = useState(() => {
    const params = new URLSearchParams(queryString);
    return {
      branch: params.get('branch') || 'all',
      djiboutiOnly: params.get('djiboutiOnly') === 'true',
      delayedOnly: params.get('delayedOnly') === 'true',
      offlineOnly: params.get('offlineOnly') === 'true',
    };
  });
  const liveTracking = useLiveTracking(
    '',
    containerLookup?.container?.containerNo || containerQuery.trim() || undefined,
  );

  async function reloadFleet(nextQueryString = queryString) {
    setLoading(true);
    setError(null);
    try {
      const result = await apiGet<LiveMapResponse>(`/tracking/live-map${nextQueryString ? `?${nextQueryString}` : ''}`);
      setMapData(result);
    } catch (reloadError) {
      console.error('Live tracking refresh failed', reloadError);
      setError(tx('Live fleet data is temporarily unavailable.'));
      setMapData(emptyMapData);
    } finally {
      setLoading(false);
    }
  }

  async function locateContainer(query = containerQuery) {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      setContainerLookup(null);
      const params = new URLSearchParams(searchParams.toString());
      params.delete('query');
      params.delete('q');
      const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      router.replace(nextUrl);
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set('query', normalizedQuery);
    params.delete('q');
    router.replace(`${pathname}?${params.toString()}`);
    setLookupLoading(true);
    try {
      const response = await fetch(`/api/tracking?query=${encodeURIComponent(normalizedQuery)}`, { cache: 'no-store' });
      const rawPayload = (await response.json()) as TrackingLookupResponse;
      const payload = resolveCanonicalTrackingPayload(normalizedQuery, rawPayload);
      setContainerLookup(payload);
      const matchedVehicle = safeFleet.find((item) => {
        const bookingNeedle = String(payload?.container?.bookingNo || '').trim().toLowerCase();
        return bookingNeedle && String(item.tripCode || '').toLowerCase().includes(bookingNeedle);
      });
      if (matchedVehicle?.vehicleId) {
        setSelectedVehicleId(matchedVehicle.vehicleId);
      }
    } catch (lookupError) {
      console.error('Container locator failed', lookupError);
      setContainerLookup(null);
    } finally {
      setLookupLoading(false);
    }
  }

  useEffect(() => {
    const socket = getAdminSocket();
    if (!socket) return undefined;

    const onFleetUpdate = () => {
      const nextQuery = buildQueryString(queryString, {
        branch: filters.branch === 'all' ? null : filters.branch,
        djiboutiOnly: filters.djiboutiOnly ? 'true' : null,
        delayedOnly: filters.delayedOnly ? 'true' : null,
        offlineOnly: filters.offlineOnly ? 'true' : null,
      });
      void reloadFleet(nextQuery);
    };

    socket.on('fleet:update', onFleetUpdate);
    socket.on('fleet:branch-update', onFleetUpdate);

    return () => {
      socket.off('fleet:update', onFleetUpdate);
      socket.off('fleet:branch-update', onFleetUpdate);
    };
  }, [queryString, filters]);

  useEffect(() => {
    if (!liveTracking.trackingEvents.length && !liveTracking.latestShipmentUpdate) {
      return;
    }

    const nextQuery = buildQueryString(queryString, {
      branch: filters.branch === 'all' ? null : filters.branch,
      djiboutiOnly: filters.djiboutiOnly ? 'true' : null,
      delayedOnly: filters.delayedOnly ? 'true' : null,
      offlineOnly: filters.offlineOnly ? 'true' : null,
    });
    void reloadFleet(nextQuery);

    if (containerQuery.trim()) {
      void locateContainer(containerQuery.trim());
    }
  }, [liveTracking.latestShipmentUpdate?.updatedAt, liveTracking.trackingEvents[0]?.timestamp]);

  useEffect(() => {
    if (!initialLookupQuery.trim()) return;
    void locateContainer(initialLookupQuery);
  }, [initialLookupQuery]);

  const safeFleet = toArray<FleetPoint>(mapData?.points);
  const selectedPoint = useMemo(
    () => safeFleet.find((item) => item.vehicleId === selectedVehicleId) ?? safeFleet[0] ?? null,
    [safeFleet, selectedVehicleId],
  );

  useEffect(() => {
    if (!selectedPoint) {
      setSelectedVehicle(null);
      setRouteHistory([]);
      return;
    }

    let cancelled = false;

    async function loadSelectedDetails() {
      const [vehicleResult, historyResult] = await Promise.allSettled([
        apiGet<VehicleLive>(`/tracking/vehicles/${selectedPoint.vehicleId}/live`),
        apiGet<TripHistoryPoint[]>(`/tracking/trips/${selectedPoint.tripId}/history`),
      ]);

      if (cancelled) return;

      if (vehicleResult.status === 'fulfilled') {
        setSelectedVehicle(vehicleResult.value);
      } else {
        console.warn(`Vehicle live detail unavailable for ${selectedPoint.vehicleId}`, vehicleResult.reason);
        setSelectedVehicle(null);
      }

      if (historyResult.status === 'fulfilled') {
        setRouteHistory(toArray<TripHistoryPoint>(historyResult.value));
      } else {
        console.warn(`Trip history unavailable for ${selectedPoint.tripId}`, historyResult.reason);
        setRouteHistory([]);
      }
    }

    void loadSelectedDetails();
    return () => {
      cancelled = true;
    };
  }, [selectedPoint?.vehicleId, selectedPoint?.tripId]);

  const summary = {
    totalVehicles: safeFleet.length,
    activeVehicles: safeFleet.filter((item) => !item.offline).length,
    delayedVehicles: safeFleet.filter((item) => item.delayed).length,
    inDjiboutiVehicles: safeFleet.filter((item) => item.djiboutiFlag || item.vehicleStatus === 'in_djibouti').length,
  };

  const branchOptions = Array.from(new Set(safeFleet.map((item) => item.branch).filter(Boolean))).sort();
  const publicBookingHref = containerLookup?.container?.bookingNo
    ? `/shipping/track?query=${encodeURIComponent(containerLookup.container.bookingNo)}&embed=1`
    : '';
  const publicContainerHref = containerLookup?.container?.containerNo
    ? `/track/${encodeURIComponent(containerLookup.container.containerNo)}?embed=1`
    : containerQuery.trim()
      ? `/track/${encodeURIComponent(containerQuery.trim())}?embed=1`
      : '';

  const applyFilters = (next: Partial<typeof filters>) => {
    const merged = { ...filters, ...next };
    setFilters(merged);
    const nextQuery = buildQueryString(queryString, {
      branch: merged.branch === 'all' ? null : merged.branch,
      djiboutiOnly: merged.djiboutiOnly ? 'true' : null,
      delayedOnly: merged.delayedOnly ? 'true' : null,
      offlineOnly: merged.offlineOnly ? 'true' : null,
    });
    void reloadFleet(nextQuery);
  };

  const trackingTimeline = useMemo<TrackingTimelineRow[]>(() => {
    const baseEvents = toArray<TrackingTimelineRow>(containerLookup?.events).map((event) => ({
      eventType: String(event.eventType || 'Update'),
      location: String(event.location || containerLookup?.container?.currentLocation || 'In corridor'),
      timestamp: String(event.timestamp || containerLookup?.container?.updatedAt || ''),
      description: event.description,
    }));

    const liveEvents = liveTracking.trackingEvents.map((event) => ({
      eventType: String(event.eventType || 'Live update'),
      location: String(event.location || 'In corridor'),
      timestamp: String(event.timestamp || ''),
      description: 'Received from live tracking feed',
    }));

    return [...liveEvents, ...baseEvents]
      .filter((event) => event.eventType || event.location || event.timestamp)
      .sort((left, right) => new Date(right.timestamp || 0).getTime() - new Date(left.timestamp || 0).getTime())
      .slice(0, 8);
  }, [containerLookup?.container?.currentLocation, containerLookup?.container?.updatedAt, containerLookup?.events, liveTracking.trackingEvents]);

  const shipmentMap = useMemo<LiveMapShipment>(() => {
    const route: Array<[number, number]> = [
      [31.23, 121.47],
      [11.6, 43.15],
      [8.98, 39.27],
    ];
    const currentPosition: [number, number] | null = selectedPoint
      ? [selectedPoint.latitude, selectedPoint.longitude]
      : safeFleet[0]
        ? [safeFleet[0].latitude, safeFleet[0].longitude]
        : null;
    const destinationLabel = selectedPoint?.destination || selectedVehicle?.destination || 'Modjo';
    const currentStatus = containerLookup?.container?.currentStatus || liveTracking.latestShipmentUpdate?.status || selectedPoint?.tripStatus || 'In transit';

    return {
      route,
      stops: [
        { name: 'Shanghai', status: 'Loaded', lat: 31.23, lng: 121.47 },
        { name: 'Djibouti', status: String(currentStatus).toUpperCase().includes('CLEAR') ? 'Clearance' : 'Arrived / port handling', lat: 11.6, lng: 43.15 },
        { name: destinationLabel, status: currentStatus, lat: 8.98, lng: 39.27 },
      ],
      currentPosition,
      currentLabel: containerLookup?.container?.currentLocation || liveTracking.latestShipmentUpdate?.location || selectedPoint?.locationLabel || 'Live shipment position',
    };
  }, [containerLookup?.container?.currentLocation, containerLookup?.container?.currentStatus, liveTracking.latestShipmentUpdate?.location, liveTracking.latestShipmentUpdate?.status, safeFleet, selectedPoint, selectedVehicle?.destination]);

  return (
    <div className="dashboard-console simplified-dashboard tracking-dense-dashboard">
      <section className="dashboard-question-row">
        <div className="dashboard-question-header">
          <div>
            <div className="eyebrow">{tx('Live Fleet Map')}</div>
            <h3>{tx('Real-time corridor and vehicle visibility')}</h3>
          </div>
          <span className={`status-badge ${liveTracking.connectionState === 'live' ? 'good' : liveTracking.connectionState === 'reconnecting' ? 'warning' : 'info'}`}>
            {liveTracking.connectionState === 'live' ? tx('Live') : liveTracking.connectionState === 'reconnecting' ? tx('Reconnecting') : tx('Offline fallback')}
          </span>
          <div className="topbar-control-row tracking-toolbar">
            <form
              className="tracking-search-group"
              onSubmit={(event) => {
                event.preventDefault();
                void locateContainer();
              }}
            >
              <input
                className="input tracking-toolbar-input"
                value={containerQuery}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setContainerQuery(nextValue);
                  if (!nextValue.trim()) {
                    setContainerLookup(null);
                  }
                }}
                placeholder={tx('Enter container number, BL number, or booking number')}
                aria-label={tx('Enter container number, BL number, or booking number')}
              />
              <button type="submit" className="btn btn-secondary tracking-toolbar-button" disabled={lookupLoading}>
                {lookupLoading ? tx('Searching...') : tx('Find container')}
              </button>
            </form>
            <div className="tracking-filter-group">
              <label className="toolbar-select tracking-toolbar-select">
                <span className="toolbar-select-label">{tx('Branch')}</span>
                <select value={filters.branch} onChange={(event) => applyFilters({ branch: event.target.value })}>
                  <option value="all">{tx('All branches')}</option>
                  {branchOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <button type="button" className={filters.djiboutiOnly ? 'btn tracking-toolbar-button' : 'btn btn-secondary tracking-toolbar-button'} onClick={() => applyFilters({ djiboutiOnly: !filters.djiboutiOnly })}>
                {tx('Djibouti corridor')}
              </button>
              <button type="button" className={filters.delayedOnly ? 'btn tracking-toolbar-button' : 'btn btn-secondary tracking-toolbar-button'} onClick={() => applyFilters({ delayedOnly: !filters.delayedOnly })}>
                {tx('Delayed')}
              </button>
              <button type="button" className={filters.offlineOnly ? 'btn tracking-toolbar-button' : 'btn btn-secondary tracking-toolbar-button'} onClick={() => applyFilters({ offlineOnly: !filters.offlineOnly })}>
                {tx('Offline')}
              </button>
              <button type="button" className={showRouteHistory ? 'btn tracking-toolbar-button' : 'btn btn-secondary tracking-toolbar-button'} onClick={() => setShowRouteHistory((value) => !value)}>
                {tx('Route history')}
              </button>
            </div>
          </div>
        </div>
        {error ? (
          <div className="error-state tracking-inline-error">
            <strong>{tx('Live tracking temporarily unavailable')}</strong>
            <p>{error}</p>
            <button className="btn" type="button" onClick={() => void reloadFleet(queryString)} disabled={loading}>
              {loading ? tx('Refreshing...') : tx('Retry')}
            </button>
          </div>
        ) : null}
        {containerLookup?.container ? (
          <div className="card tracking-locator-card">
            <div className="tracking-locator-head">
              <div>
                <div className="label">Container locator</div>
                <h3>Where is {containerLookup.container.containerNo}?</h3>
              </div>
              <span className={`status-badge ${String(containerLookup.container.currentStatus).includes('EMPTY') || containerLookup.container.currentStatus === 'RETURNED' ? 'warning' : 'info'}`}>
                {containerLookup.container.currentStatus}
              </span>
            </div>
            <div className="tracking-locator-grid">
              <LocatorRow label="Exact current location" value={containerLookup.container.currentLocation} />
              <LocatorRow label="Movement mode" value={classifyContainerMovement(containerLookup.container.currentStatus)} />
              <LocatorRow label="Last update" value={formatDateTime(containerLookup.container.updatedAt)} />
              <LocatorRow label="Booking" value={containerLookup.container.bookingNo} />
              <LocatorRow label="Shipment" value={containerLookup.container.shipmentNo} />
              <LocatorRow label="Owner / driver" value={containerLookup.container.returnedBy || containerLookup.container.deliveredBy || containerLookup.container.assignedDriver || 'Pending assignment'} />
              <LocatorRow label="Return status" value={containerLookup.container.returnStatus} />
              <LocatorRow label="Expected return" value={formatDateTime(containerLookup.container.expectedReturnDate)} />
              <LocatorRow label="Latest event" value={containerLookup.events?.[0] ? `${containerLookup.events[0].eventType} @ ${containerLookup.events[0].location}` : 'No events'} />
            </div>
            {(containerLookup.alerts || []).length ? (
              <div className="tracking-locator-alerts">
                {(containerLookup.alerts || []).slice(0, 2).map((alert) => (
                  <div key={`${alert.title}-${alert.detail}`} className="label">{alert.title}: {alert.detail}</div>
                ))}
              </div>
            ) : null}
            <div className="tracking-locator-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  if (!containerLookup?.container?.bookingNo) return;
                  window.location.assign(`/shipments/enterprise?booking=${encodeURIComponent(containerLookup.container.bookingNo)}`);
                }}
              >
                Open shipment
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  if (!containerLookup?.container?.containerNo) return;
                  window.location.assign(`/operations/empty-return?q=${encodeURIComponent(containerLookup.container.containerNo)}`);
                }}
              >
                Open empty return
              </button>
            </div>
          </div>
        ) : null}
        {containerLookup?.container ? (
          <div className="card tracking-journey-card">
            <div className="tracking-journey-head">
              <div>
                <div className="label">Container journey</div>
                <h3>{containerLookup.container.containerNo} timeline and route</h3>
              </div>
              <span className={`status-badge ${String(containerLookup.container.currentStatus).toLowerCase().includes('deliver') ? 'good' : String(containerLookup.container.currentStatus).toLowerCase().includes('delay') ? 'critical' : String(containerLookup.container.currentStatus).toLowerCase().includes('clear') ? 'warning' : 'info'}`}>
                {containerLookup.container.currentStatus}
              </span>
            </div>
            <div className="tracking-journey-grid">
              <div className="tracking-journey-timeline">
                {trackingTimeline.map((event) => (
                  <div key={`${event.eventType}-${event.timestamp}-${event.location}`} className="tracking-journey-item">
                    <span className="tracking-journey-dot" />
                    <div className="tracking-journey-copy">
                      <strong>{event.eventType}</strong>
                      <p>{event.location}</p>
                      <p>{formatDateTime(event.timestamp || null)}</p>
                      {event.description ? <p>{event.description}</p> : null}
                    </div>
                  </div>
                ))}
                {!trackingTimeline.length ? (
                  <div className="tracking-journey-empty">No live timeline events yet.</div>
                ) : null}
              </div>
              <LiveMap shipment={shipmentMap} />
            </div>
          </div>
        ) : null}
        <LiveFleetMap
          title={tx('Live Fleet Map')}
          summary={summary}
          points={safeFleet}
          language={language}
          selectedVehicleId={selectedPoint?.vehicleId ?? null}
          onSelectVehicle={setSelectedVehicleId}
          routeHistoryPoints={showRouteHistory ? routeHistory : []}
          vehicleDetail={selectedVehicle}
        />
        {(publicBookingHref || publicContainerHref) ? (
          <div className="card tracking-public-card">
            <div className="tracking-public-head">
              <div>
                <div className="label">Public tracking view</div>
                <h3>Maersk-style container tracking</h3>
              </div>
              <a className="btn btn-secondary" href={(publicBookingHref || publicContainerHref).replace('&embed=1', '').replace('?embed=1', '')} target="_blank" rel="noreferrer">
                Open full page
              </a>
            </div>
            <iframe
              title="Public tracking preview"
              src={publicBookingHref || publicContainerHref}
              className="tracking-public-frame"
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}

function LocatorRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="tracking-locator-row">
      <span className="label">{label}</span>
      <strong>{value || 'Pending'}</strong>
    </div>
  );
}
