'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { formatDateTime, formatPhone, formatText } from '../lib/formatters';
import { useConsoleI18n } from '../lib/use-console-i18n';
import { WorkspaceDetailDrawer } from './workspace-detail-drawer';
import { WorkspaceFilterBar } from './workspace-filter-bar';

type VehicleRow = Record<string, unknown>;

export function VehiclesRuntime({ vehicles }: { vehicles: VehicleRow[] }) {
  const { tx } = useConsoleI18n();
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('all');
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [location, setLocation] = useState('all');
  const [readiness, setReadiness] = useState('all');
  const [ownership, setOwnership] = useState('all');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  const branchOptions = useMemo(() => optionize(vehicles.map((vehicle) => formatText(vehicle.branch, 'Unknown branch'))), [vehicles]);
  const statusOptions = useMemo(() => optionize(vehicles.map((vehicle) => formatText(vehicle.currentStatus, 'Not available'))), [vehicles]);
  const typeOptions = useMemo(() => optionize(vehicles.map((vehicle) => formatText(vehicle.type, 'Fleet unit'))), [vehicles]);
  const locationOptions = useMemo(() => optionize(vehicles.map((vehicle) => formatText(vehicle.currentLocation, 'Location not recorded'))), [vehicles]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return vehicles.filter((vehicle) => {
      const vehicleBranch = formatText(vehicle.branch, 'Unknown branch');
      const vehicleStatus = formatText(vehicle.currentStatus, 'Not available');
      const vehicleType = formatText(vehicle.type, 'Fleet unit');
      const vehicleLocation = formatText(vehicle.currentLocation, 'Location not recorded');
      const vehicleReadiness = formatText(vehicle.readiness, 'Not available');
      const vehicleOwnership = formatText(vehicle.ownershipType, 'internal');

      if (branch !== 'all' && vehicleBranch !== branch) return false;
      if (status !== 'all' && vehicleStatus !== status) return false;
      if (type !== 'all' && vehicleType !== type) return false;
      if (location !== 'all' && vehicleLocation !== location) return false;
      if (readiness !== 'all' && vehicleReadiness !== readiness) return false;
      if (ownership !== 'all' && vehicleOwnership !== ownership) return false;

      if (!query) return true;
      return [
        formatText(vehicle.vehicleCode, 'Vehicle'),
        formatText(vehicle.plateNumber, 'No plate'),
        vehicleBranch,
        vehicleStatus,
        vehicleType,
        vehicleLocation,
        formatText(vehicle.driverName, 'System update'),
        formatPhone(vehicle.driverPhone),
        formatText(vehicle.currentTrip, 'Not available'),
      ].join(' ').toLowerCase().includes(query);
    });
  }, [branch, location, ownership, readiness, search, status, type, vehicles]);

  const selectedVehicle = filtered.find((vehicle) => formatText(vehicle.id, formatText(vehicle.vehicleCode, 'vehicle-row')) === selectedVehicleId)
    ?? vehicles.find((vehicle) => formatText(vehicle.id, formatText(vehicle.vehicleCode, 'vehicle-row')) === selectedVehicleId)
    ?? null;
  const selectedVehicleIdValue = selectedVehicle ? formatText(selectedVehicle.id, '') : '';
  const selectedTripIdValue = selectedVehicle ? formatText(selectedVehicle.currentTripId, '') : '';
  const hasActiveTrip = Boolean(selectedTripIdValue);

  return (
    <main className="shell">
      <div className="panel workspace-shell">
        <section className="workspace-header">
          <div className="workspace-header-copy">
            <div className="eyebrow">{tx('Fleet Master')}</div>
            <h1>{tx('Vehicles')}</h1>
            <p>{tx('Fleet status, driver, readiness, and current assignment in one table.')}</p>
          </div>
        </section>

        <WorkspaceFilterBar
          fields={[
            { key: 'search', label: 'Search', type: 'search', value: search, placeholder: 'Vehicle, plate, driver, trip', onChange: setSearch },
            { key: 'branch', label: 'Branch', type: 'select', value: branch, onChange: setBranch, options: [{ value: 'all', label: 'All branches' }, ...branchOptions] },
            { key: 'status', label: 'Status', type: 'select', value: status, onChange: setStatus, options: [{ value: 'all', label: 'All statuses' }, ...statusOptions] },
            { key: 'type', label: 'Type', type: 'select', value: type, onChange: setType, options: [{ value: 'all', label: 'All vehicle types' }, ...typeOptions] },
            { key: 'location', label: 'Location', type: 'select', value: location, onChange: setLocation, options: [{ value: 'all', label: 'All locations' }, ...locationOptions] },
            {
              key: 'readiness',
              label: 'Readiness',
              type: 'select',
              value: readiness,
              onChange: setReadiness,
              options: [
                { value: 'all', label: 'All readiness states' },
                { value: 'ready', label: 'Ready' },
                { value: 'hold', label: 'Hold' },
                { value: 'reserved', label: 'Reserved' },
                { value: 'on_road', label: 'On road' },
              ],
            },
            {
              key: 'ownership',
              label: 'Ownership',
              type: 'select',
              value: ownership,
              onChange: setOwnership,
              options: [
                { value: 'all', label: 'Internal and external' },
                { value: 'internal', label: 'Internal' },
                { value: 'external_rental', label: 'External rental' },
              ],
            },
          ]}
        />

        <section className="card workspace-table-card">
          <div className="workspace-section-header">
            <div>
              <div className="eyebrow">{tx('Fleet Register')}</div>
              <h3>{filtered.length} {tx('Vehicles').toLowerCase()}</h3>
            </div>
          </div>
          {!filtered.length ? (
            <div className="empty-state inline-state-card"><p>{tx('No vehicles match the current filters.')}</p></div>
          ) : (
            <div className="table-shell">
              <table className="data-table workspace-data-table">
                <thead>
                  <tr>
                    <th>{tx('Vehicle')}</th>
                    <th>{tx('Plate')}</th>
                    <th>{tx('Branch')}</th>
                    <th>{tx('Status')}</th>
                    <th>{tx('Driver')}</th>
                    <th>{tx('Phone')}</th>
                    <th>{tx('Current location')}</th>
                    <th>Trip</th>
                    <th>{tx('Last GPS')}</th>
                    <th>{tx('Readiness')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((vehicle) => (
                    <tr
                      key={formatText(vehicle.id, formatText(vehicle.vehicleCode, 'vehicle-row'))}
                      onClick={() => setSelectedVehicleId(formatText(vehicle.id, formatText(vehicle.vehicleCode, 'vehicle-row')))}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <div className="workspace-cell-stack">
                          <strong>{formatText(vehicle.vehicleCode, 'Vehicle')}</strong>
                          <span>{formatText(vehicle.type, 'Fleet unit')}</span>
                        </div>
                      </td>
                      <td>{formatText(vehicle.plateNumber, 'No plate')}</td>
                      <td>{formatText(vehicle.branch, 'Unknown branch')}</td>
                      <td><span className={`status-badge ${tone(formatText(vehicle.currentStatus, 'info'))}`}>{tx(formatText(vehicle.currentStatus, 'Not available').replace(/_/g, ' '))}</span></td>
                      <td>{formatText(vehicle.driverName, 'System update')}</td>
                      <td>{formatPhone(vehicle.driverPhone)}</td>
                      <td>{formatText(vehicle.currentLocation, 'Location not recorded')}</td>
                      <td>{tx(formatText(vehicle.currentTrip, 'No open trip'))}</td>
                      <td>{formatDateTime(vehicle.lastGpsAt)}</td>
                      <td><span className={`status-badge ${tone(formatText(vehicle.readiness, 'info'))}`}>{tx(formatText(vehicle.readiness, 'Not available').replace(/_/g, ' '))}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {selectedVehicle ? (
        <WorkspaceDetailDrawer
          title={formatText(selectedVehicle.vehicleCode, 'Vehicle')}
          subtitle={`${formatText(selectedVehicle.type, 'Fleet unit')} · ${formatText(selectedVehicle.branch, 'Unknown branch')}`}
          onClose={() => setSelectedVehicleId(null)}
          actions={(
            <>
              {hasActiveTrip ? (
                <Link className="btn btn-secondary btn-compact" href={`/trips/${encodeURIComponent(selectedTripIdValue)}`}>
                  {tx('Open trip')}
                </Link>
              ) : null}
              {selectedVehicleIdValue ? (
                <Link className="btn btn-secondary btn-compact" href={`/maintenance/vehicles/${encodeURIComponent(selectedVehicleIdValue)}/history`}>
                  {tx('Maintenance history')}
                </Link>
              ) : null}
              <Link className="btn btn-secondary btn-compact" href="/maintenance/repair-orders">
                {tx('Repair orders')}
              </Link>
            </>
          )}
        >
          <section className="workspace-metric-pair-grid">
            <MetricPair label={tx('Plate')} value={formatText(selectedVehicle.plateNumber, 'No plate')} />
            <MetricPair label={tx('Status')} value={tx(formatText(selectedVehicle.currentStatus, 'Not available').replace(/_/g, ' '))} />
            <MetricPair label={tx('Driver')} value={formatText(selectedVehicle.driverName, 'System update')} />
            <MetricPair label={tx('Driver phone')} value={formatPhone(selectedVehicle.driverPhone)} />
            <MetricPair label={tx('Current trip')} value={tx(formatText(selectedVehicle.currentTrip, 'No open trip'))} />
            <MetricPair label={tx('Trip route')} value={formatText(selectedVehicle.currentTripRoute, 'Route not available')} />
            <MetricPair label={tx('Current location')} value={formatText(selectedVehicle.currentLocation, 'Location not recorded')} />
            <MetricPair label={tx('Last GPS')} value={formatDateTime(selectedVehicle.lastGpsAt)} />
            <MetricPair label={tx('Last fuel')} value={formatDateTime(selectedVehicle.lastFuelAt)} />
            <MetricPair label={tx('Fuel station')} value={formatText(selectedVehicle.lastFuelStation)} />
            <MetricPair label={tx('Last maintenance')} value={formatDateTime(selectedVehicle.lastMaintenanceAt)} />
            <MetricPair label={tx('Next maintenance due')} value={formatNumber(selectedVehicle.nextMaintenanceDueKm, 'Not scheduled')} />
            <MetricPair label={tx('Next tire due')} value={formatNumber(selectedVehicle.nextTireDueKm, 'Not scheduled')} />
            <MetricPair label={tx('Readiness')} value={tx(formatText(selectedVehicle.readiness, 'Not available').replace(/_/g, ' '))} />
            <MetricPair label={tx('Safety status')} value={tx(formatText(selectedVehicle.safetyStatus, 'Not available').replace(/_/g, ' '))} />
            <MetricPair label={tx('Ownership')} value={tx(formatText(selectedVehicle.ownershipType, 'internal').replace(/_/g, ' '))} />
          </section>

          <section className="card workspace-detail-card">
            <div className="workspace-section-header">
              <div>
                <div className="eyebrow">Issue Context</div>
                <h3>Latest issue summary</h3>
              </div>
            </div>
            <div className="workspace-detail-list">
              <div className="workspace-detail-row">
                <div className="workspace-cell-stack">
                  <strong>{tx(formatText(selectedVehicle.issueCode, 'No active issue'))}</strong>
                  <span>{tx(formatText(selectedVehicle.issueSummary, 'No active issue'))}</span>
                </div>
                <span className={`status-badge ${tone(formatText(selectedVehicle.issueSeverity, 'info'))}`}>{tx(formatText(selectedVehicle.issueSeverity, 'info'))}</span>
              </div>
            </div>
          </section>
        </WorkspaceDetailDrawer>
      ) : null}
    </main>
  );
}

function optionize(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort().map((value) => ({ value, label: value.replace(/_/g, ' ') }));
}

function tone(value: string) {
  const normalized = value.toLowerCase();
  if (['blocked', 'breakdown', 'hold'].includes(normalized)) return 'critical';
  if (['under_maintenance', 'reserved', 'loading', 'warning'].includes(normalized)) return 'warning';
  if (['ready', 'available', 'partner_ready'].includes(normalized)) return 'good';
  return 'info';
}

function MetricPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="workspace-metric-pair">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatNumber(value: unknown, fallback: string) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(number)} km`;
}
