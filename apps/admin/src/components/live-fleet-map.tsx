// @ts-nocheck
'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, ZoomControl } from 'react-leaflet';
import { translate, translateUiText, type ConsoleLanguage } from '../lib/i18n';
import { ClockIcon, MapPinIcon, RouteIcon, TruckIcon, WrenchIcon } from './console-icons';

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

type VehicleDetail = {
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

type FleetMapProps = {
  title: string;
  summary?: {
    totalVehicles: number;
    activeVehicles: number;
    delayedVehicles: number;
    inDjiboutiVehicles: number;
  };
  points: FleetPoint[];
  language?: ConsoleLanguage;
  showSummary?: boolean;
  selectedVehicleId?: string | null;
  onSelectVehicle?: (vehicleId: string) => void;
  routeHistoryPoints?: TripHistoryPoint[];
  vehicleDetail?: VehicleDetail | null;
  layout?: 'default' | 'executive';
};

function hasMeaningfulText(value: unknown) {
  if (typeof value !== 'string') return false;
  const normalized = value.trim();
  if (!normalized) return false;
  return !['undefined', 'null', 'nan', 'pending'].includes(normalized.toLowerCase());
}

function formatTime(value: string | null, language: ConsoleLanguage, fallback: string) {
  if (!value) return translateUiText(language, fallback);
  return new Intl.DateTimeFormat(language === 'am' ? 'am-ET' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatKm(value: number | null | undefined, language: ConsoleLanguage, fallback: string) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return translateUiText(language, fallback);
  }
  return `${new Intl.NumberFormat(language === 'am' ? 'am-ET' : 'en-US', { maximumFractionDigits: 0 }).format(value)} km`;
}

function formatSpeed(value: number | null | undefined, language: ConsoleLanguage) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return translateUiText(language, 'Speed update unavailable');
  }
  return `${new Intl.NumberFormat(language === 'am' ? 'am-ET' : 'en-US', { maximumFractionDigits: 0 }).format(value)} km/h`;
}

function formatStatus(value: string | null | undefined, language: ConsoleLanguage) {
  if (!hasMeaningfulText(value)) return translateUiText(language, 'Status update unavailable');
  return translateUiText(language, String(value).replace(/_/g, ' '));
}

function formatTextValue(value: string | null | undefined, language: ConsoleLanguage, fallback: string) {
  if (!hasMeaningfulText(value)) return translateUiText(language, fallback);
  return String(value).trim();
}

export function LiveFleetMap({
  title,
  summary,
  points,
  language = 'en',
  showSummary = true,
  selectedVehicleId = null,
  onSelectVehicle,
  routeHistoryPoints = [],
  vehicleDetail = null,
  layout = 'default',
}: FleetMapProps) {
  const t = (key: string, fallback?: string) => translate(language, key, fallback);
  const tx = (text: string) => translateUiText(language, text);
  const safePoints = Array.isArray(points) ? points : [];
  const safeRouteHistory = Array.isArray(routeHistoryPoints) ? routeHistoryPoints : [];
  const selected = useMemo(
    () => safePoints.find((point) => point.vehicleId === selectedVehicleId) ?? safePoints[0] ?? null,
    [safePoints, selectedVehicleId],
  );
  const selectedDetail = vehicleDetail ?? null;

  if (!safePoints.length) {
    return (
      <div className="empty-state dashboard-empty-card">
        <strong>{t('noMapData', 'No live fleet data available.')}</strong>
      </div>
    );
  }

  const mapCanvas = (
    <div className="map-frame premium-map-frame">
      <MapContainer center={[9.145, 40.4897]} zoom={6} scrollWheelZoom zoomControl={false} style={{ height: '100%', width: '100%' }}>
        <ZoomControl position="bottomright" />
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {safePoints.map((point) => (
          <CircleMarker
            key={point.vehicleId}
            center={[point.latitude, point.longitude]}
            radius={layout === 'executive' ? 7 : 8}
            pathOptions={{ color: point.markerColor, fillColor: point.markerColor, fillOpacity: 0.86, weight: selected?.vehicleId === point.vehicleId ? 4 : 2 }}
            eventHandlers={{ click: () => onSelectVehicle?.(point.vehicleId) }}
          >
            <Popup>
              <strong>{point.vehicleId}</strong>
              <div>{point.driverName}</div>
              <div>{point.branch} · {point.routeName}</div>
              <div>{formatTextValue(point.locationLabel || point.geofence, language, 'Location signal unavailable')}</div>
              <div>{point.driverPhone || translateUiText(language, 'Phone update unavailable')}</div>
              <div>{tx(String(point.tripStatus).replace(/_/g, ' '))} · {tx(String(point.vehicleStatus).replace(/_/g, ' '))}</div>
            </Popup>
          </CircleMarker>
        ))}
        {safeRouteHistory.length > 1 ? (
          <Polyline positions={safeRouteHistory.map((point) => [point.latitude, point.longitude])} pathOptions={{ color: selected?.markerColor || '#2563eb', opacity: 0.55, weight: 4 }} />
        ) : null}
      </MapContainer>
    </div>
  );

  if (layout === 'executive') {
    return (
      <div className="map-console-card simplified-map-card executive-map-workspace">
        <div className="map-console-header">
          <div><h3>{title}</h3></div>
          {summary && showSummary ? (
            <div className="map-summary-strip">
              <div className="map-summary-pill"><TruckIcon size={15} /><span>{summary.activeVehicles}</span></div>
              <div className="map-summary-pill warning"><RouteIcon size={15} /><span>{summary.delayedVehicles}</span></div>
              <div className="map-summary-pill info"><MapPinIcon size={15} /><span>{summary.inDjiboutiVehicles}</span></div>
            </div>
          ) : null}
        </div>
        {mapCanvas}
        {selected ? (
          <div className="executive-map-info-strip">
            <section className="executive-map-mini-panel">
              <div className="eyebrow">{t('selectedVehicle', 'Selected vehicle')}</div>
              <strong>{selected.vehicleId}</strong>
              <div className="executive-map-spec"><span>{tx('Driver')}</span><strong>{formatTextValue(selectedDetail?.driverName || selected.driverName, language, 'Driver assignment unavailable')}</strong></div>
              <div className="executive-map-spec"><span>{tx('Phone')}</span><strong>{formatTextValue(selectedDetail?.driverPhone || selected.driverPhone, language, 'Phone update unavailable')}</strong></div>
              <div className="executive-map-spec"><span>{t('trip', 'Trip code')}</span><strong>{formatTextValue(selectedDetail?.tripCode || selected.tripCode, language, 'Trip assignment unavailable')}</strong></div>
              <div className="executive-map-spec"><span>{tx('Branch')}</span><strong>{formatTextValue(selectedDetail?.branch || selected.branch, language, 'Branch assignment unavailable')}</strong></div>
              <div className="detail-actions">
                <Link className="inline-action" href={`/trips/${selected.tripId}`}>{t('openTrip', 'Open trip')}</Link>
                <Link className="inline-action" href={`/maintenance/vehicles/${selected.vehicleId}/history`}>{tx('Open vehicle history')}</Link>
              </div>
            </section>
            <section className="executive-map-mini-panel">
              <div className="eyebrow">{tx('Dispatch')}</div>
              <strong>{formatTextValue(selectedDetail?.routeName || selected.routeName, language, 'Route assignment unavailable')}</strong>
              <div className="executive-map-spec"><span>{tx('Destination')}</span><strong>{formatTextValue(selectedDetail?.destination || selected.destination, language, 'Destination update unavailable')}</strong></div>
              <div className="executive-map-spec"><span>{t('trip', 'Trip code')}</span><strong>{formatTextValue(selectedDetail?.tripCode || selected.tripCode, language, 'Trip assignment unavailable')}</strong></div>
              <div className="executive-map-spec"><span>{tx('Current status')}</span><strong>{formatStatus(selectedDetail?.status || selected.vehicleStatus, language)}</strong></div>
              <div className="executive-map-spec"><span>{tx('Where now')}</span><strong>{formatTextValue(selectedDetail?.locationLabel || selected.locationLabel || selectedDetail?.geofence || selected.geofence, language, 'Location signal unavailable')}</strong></div>
            </section>
            <section className="executive-map-mini-panel">
              <div className="eyebrow">{tx('Workshop')}</div>
              <strong>{formatTime(selectedDetail?.latestGpsAt || selected.latestGpsAt, language, 'Last signal unavailable')}</strong>
              <div className="executive-map-spec"><span>{tx('Current odometer')}</span><strong>{formatKm(selectedDetail?.currentOdometerKm ?? selected.currentOdometerKm, language, 'No odometer update yet')}</strong></div>
              <div className="executive-map-spec"><span>{tx('Last fuel')}</span><strong>{formatTime(selectedDetail?.lastFuelAt ?? selected.lastFuelAt, language, 'Awaiting fuel log')}</strong></div>
              <div className="executive-map-spec"><span>{tx('Fuel station')}</span><strong>{formatTextValue(selectedDetail?.fuelStation || selected.fuelStation || null, language, 'Fuel station update unavailable')}</strong></div>
              <div className="executive-map-spec"><span>{tx('Last maintenance')}</span><strong>{formatTime(selectedDetail?.lastMaintenanceAt ?? selected.lastMaintenanceAt, language, 'No recent maintenance entry')}</strong></div>
            </section>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="map-console-card simplified-map-card">
      <div className="map-console-header">
        <div>
          <h3>{title}</h3>
        </div>
        {summary && showSummary ? (
          <div className="map-summary-strip">
            <div className="map-summary-pill">
              <TruckIcon size={15} />
              <span>{summary.activeVehicles}</span>
            </div>
            <div className="map-summary-pill warning">
              <RouteIcon size={15} />
              <span>{summary.delayedVehicles}</span>
            </div>
            <div className="map-summary-pill info">
              <MapPinIcon size={15} />
              <span>{summary.inDjiboutiVehicles}</span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="map-console-body">
        {mapCanvas}

        <aside className="map-side-panel premium-map-panel">
          <div className="map-detail-card">
            <div className="map-detail-header">
              <div>
                <div className="eyebrow">{t('selectedVehicle', 'Selected vehicle')}</div>
                <h4>{t('quickDetail', 'Operations detail')}</h4>
              </div>
            </div>
            {selected ? (
              <div className="detail-stack">
                <div className="detail-identity">
                  <strong>{selected.vehicleId}</strong>
                  <span>{formatTextValue(selectedDetail?.driverName || selected.driverName, language, 'Driver assignment unavailable')}</span>
                </div>
                <div className="detail-grid">
                  <div className="detail-tile">
                    <span>{t('trip', 'Trip code')}</span>
                    <strong>{formatTextValue(selectedDetail?.tripCode || selected.tripCode, language, 'Trip assignment unavailable')}</strong>
                  </div>
                  <div className="detail-tile">
                    <span>{t('route', 'Route')}</span>
                    <strong>{formatTextValue(selectedDetail?.routeName || selected.routeName, language, 'Route assignment unavailable')}</strong>
                  </div>
                  <div className="detail-tile">
                    <span>{tx('Destination')}</span>
                    <strong>{formatTextValue(selectedDetail?.destination || selected.destination, language, 'Destination update unavailable')}</strong>
                  </div>
                  <div className="detail-tile">
                    <span>{tx('Phone')}</span>
                    <strong>{formatTextValue(selectedDetail?.driverPhone || selected.driverPhone, language, 'Phone update unavailable')}</strong>
                  </div>
                </div>
                <div className="detail-row"><span><MapPinIcon size={14} /> {tx('Branch')}</span><strong>{formatTextValue(selectedDetail?.branch || selected.branch, language, 'Branch assignment unavailable')}</strong></div>
                <div className="detail-row"><span><TruckIcon size={14} /> {tx('Current status')}</span><strong>{formatStatus(selectedDetail?.status || selected.vehicleStatus, language)}</strong></div>
                <div className="detail-row"><span><RouteIcon size={14} /> {tx('Where now')}</span><strong>{formatTextValue(selectedDetail?.locationLabel || selected.locationLabel || selectedDetail?.geofence || selected.geofence, language, 'Location signal unavailable')}</strong></div>
                <div className="detail-row"><span><ClockIcon size={14} /> {tx('Last GPS')}</span><strong>{formatTime(selectedDetail?.latestGpsAt || selected.latestGpsAt, language, 'Last signal unavailable')}</strong></div>
                <div className="detail-row"><span><RouteIcon size={14} /> {tx('Speed')}</span><strong>{formatSpeed(selectedDetail?.speed ?? selected.speed, language)}</strong></div>
                <div className="detail-row"><span><TruckIcon size={14} /> {tx('Current odometer')}</span><strong>{formatKm(selectedDetail?.currentOdometerKm ?? selected.currentOdometerKm, language, 'No odometer update yet')}</strong></div>
                <div className="detail-row"><span><MapPinIcon size={14} /> {tx('Last fuel')}</span><strong>{formatTime(selectedDetail?.lastFuelAt ?? selected.lastFuelAt, language, 'Awaiting fuel log')}</strong></div>
                <div className="detail-row"><span><MapPinIcon size={14} /> {tx('Fuel station')}</span><strong>{formatTextValue(selectedDetail?.fuelStation || selected.fuelStation || null, language, 'Fuel station update unavailable')}</strong></div>
                <div className="detail-row"><span><WrenchIcon size={14} /> {tx('Last maintenance')}</span><strong>{formatTime(selectedDetail?.lastMaintenanceAt ?? selected.lastMaintenanceAt, language, 'No recent maintenance entry')}</strong></div>
                <div className="detail-actions">
                  <Link className="inline-action" href={`/trips/${selected.tripId}`}>{t('openTrip', 'Open trip')}</Link>
                  <Link className="inline-action" href={`/maintenance/vehicles/${selected.vehicleId}/history`}>{tx('Open vehicle history')}</Link>
                </div>
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
