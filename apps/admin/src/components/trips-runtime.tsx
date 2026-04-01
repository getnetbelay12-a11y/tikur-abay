'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { formatDateTime, formatText } from '../lib/formatters';
import { useConsoleI18n } from '../lib/use-console-i18n';
import { WorkspaceDetailDrawer } from './workspace-detail-drawer';

type TripRow = Record<string, unknown>;

export function TripsRuntime({ trips }: { trips: TripRow[] }) {
  const { tx } = useConsoleI18n();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [route, setRoute] = useState('all');
  const [customer, setCustomer] = useState('all');
  const [branch, setBranch] = useState('all');
  const [driver, setDriver] = useState('all');
  const [vehicle, setVehicle] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const statusOptions = useMemo(() => optionize(trips.map((trip) => formatText(trip.status, 'assigned'))), [trips]);
  const routeOptions = useMemo(() => optionize(trips.map((trip) => formatText(trip.route, 'Route not assigned'))), [trips]);
  const customerOptions = useMemo(() => optionize(trips.map((trip) => formatText(trip.customer, 'Customer not assigned'))), [trips]);
  const branchOptions = useMemo(() => optionize(trips.map((trip) => formatText(trip.branch, 'Branch not assigned'))), [trips]);
  const driverOptions = useMemo(() => optionize(trips.map((trip) => formatText(trip.driver, 'Driver not assigned'))), [trips]);
  const vehicleOptions = useMemo(() => optionize(trips.map((trip) => formatText(trip.vehicle, 'Vehicle not assigned'))), [trips]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return trips.filter((trip) => {
      const tripStatus = formatText(trip.status, 'assigned');
      const tripRoute = formatText(trip.route, 'Route not assigned');
      const tripCustomer = formatText(trip.customer, 'Customer not assigned');
      const tripBranch = formatText(trip.branch, 'Branch not assigned');
      const tripDriver = formatText(trip.driver, 'Driver not assigned');
      const tripVehicle = formatText(trip.vehicle, 'Vehicle not assigned');
      const lastUpdate = formatText(trip.lastUpdate, '');
      if (status !== 'all' && tripStatus !== status) return false;
      if (route !== 'all' && tripRoute !== route) return false;
      if (customer !== 'all' && tripCustomer !== customer) return false;
      if (branch !== 'all' && tripBranch !== branch) return false;
      if (driver !== 'all' && tripDriver !== driver) return false;
      if (vehicle !== 'all' && tripVehicle !== vehicle) return false;
      if (dateFrom && (!lastUpdate || String(lastUpdate).slice(0, 10) < dateFrom)) return false;
      if (dateTo && (!lastUpdate || String(lastUpdate).slice(0, 10) > dateTo)) return false;
      if (!query) return true;
      return [
        formatText(trip.tripCode, 'Trip'),
        tripCustomer,
        tripRoute,
        tripVehicle,
        tripDriver,
        tripStatus,
        formatText(trip.currentCheckpoint, 'Origin'),
      ].join(' ').toLowerCase().includes(query);
    });
  }, [branch, customer, dateFrom, dateTo, driver, route, search, status, trips, vehicle]);

  const selectedTrip = filtered.find((trip) => formatText(trip.id, '') === selectedId)
    ?? trips.find((trip) => formatText(trip.id, '') === selectedId)
    ?? null;

  const total = trips.length;
  const inTransit = trips.filter((trip) => ['in_transit', 'on_road', 'loading', 'offloading'].includes(formatText(trip.status, 'assigned'))).length;
  const delayed = trips.filter((trip) => trip.delayed === true || Number(trip.issues ?? 0) > 0 && formatText(trip.status, '') === 'delayed').length;
  const completed = trips.filter((trip) => formatText(trip.status, '') === 'completed').length;
  const assigned = trips.filter((trip) => ['assigned', 'loading'].includes(formatText(trip.status, 'assigned'))).length;
  const awaitingPod = trips.filter((trip) => formatText(trip.status, '') === 'completed' && trip.pod !== true).length;
  const isDelayedScope = status === 'delayed';
  const queueTitle = isDelayedScope ? tx('Delayed trips queue') : tx('Trip execution queue');

  function resetFilters() {
    setSearch('');
    setStatus('all');
    setRoute('all');
    setCustomer('all');
    setBranch('all');
    setDriver('all');
    setVehicle('all');
    setDateFrom('');
    setDateTo('');
  }

  function exportTripsCsv() {
    const headers = ['Trip ID', 'Customer', 'Route', 'Vehicle', 'Driver', 'Status', 'ETA', 'Value', 'POD', 'Issues', 'Last Update'];
    const rows = filtered.map((trip) => [
      formatText(trip.tripCode, 'Trip'),
      formatText(trip.customer, 'Customer not assigned'),
      formatText(trip.routeLabel, formatText(trip.route, 'Route not assigned')),
      formatText(trip.vehicle, 'Vehicle not assigned'),
      formatText(trip.driver, 'Driver not assigned'),
      humanize(formatText(trip.status, 'assigned')),
      formatDateTime(trip.eta),
      formatCurrency(Number(trip.value ?? 0)),
      trip.pod === true ? 'Uploaded' : 'Pending',
      formatNumber(Number(trip.issues ?? 0)),
      formatDateTime(trip.lastUpdate),
    ]);
    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'trip-operations.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="shell">
      <div className="panel workspace-shell trips-workspace">
        <section className="workspace-header">
          <div className="workspace-header-copy">
            <div className="eyebrow">{tx('Trip Operations')}</div>
            <h1>{tx('Trips')}</h1>
            <p>{tx('Live trip execution, delay review, POD status, and billing context.')}</p>
          </div>
        </section>

        <section className="trip-kpi-grid">
          <TripKpiCard label={tx('Total Trips')} value={total} helper={tx('Visible in current scope')} tone="neutral" />
          <TripKpiCard label={tx('In Transit')} value={inTransit} helper={tx('Trips currently moving')} tone="blue" />
          <TripKpiCard label={tx('Delayed')} value={delayed} helper={tx('Needs dispatch follow-up')} tone="red" active={isDelayedScope} />
          <TripKpiCard label={tx('Completed')} value={completed} helper={tx('Trips closed operationally')} tone="green" />
          <TripKpiCard label={tx('Assigned')} value={assigned} helper={tx('Ready for execution')} tone="blue" />
          <TripKpiCard label={tx('Awaiting POD')} value={awaitingPod} helper={tx('Missing POD file')} tone="amber" />
        </section>

        <section className="card trip-filter-toolbar">
          <div className="trip-filter-row trip-filter-row-primary">
            <label className="trip-filter-field trip-filter-search">
              <span>{tx('Search')}</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={tx('Trip, customer, route, vehicle, driver')} />
            </label>
            <SelectField label={tx('Status')} value={status} onChange={setStatus} options={[{ value: 'all', label: tx('All statuses') }, ...statusOptions.map((item) => ({ ...item, label: tx(item.label) }))]} />
            <SelectField label={tx('Route')} value={route} onChange={setRoute} options={[{ value: 'all', label: tx('All routes') }, ...routeOptions.map((item) => ({ ...item, label: tx(item.label) }))]} />
            <SelectField label={tx('Customer')} value={customer} onChange={setCustomer} options={[{ value: 'all', label: tx('All customers') }, ...customerOptions.map((item) => ({ ...item, label: tx(item.label) }))]} />
            <SelectField label={tx('Branch')} value={branch} onChange={setBranch} options={[{ value: 'all', label: tx('All branches') }, ...branchOptions.map((item) => ({ ...item, label: tx(item.label) }))]} />
            <SelectField label={tx('Driver')} value={driver} onChange={setDriver} options={[{ value: 'all', label: tx('All drivers') }, ...driverOptions.map((item) => ({ ...item, label: tx(item.label) }))]} />
            <SelectField label={tx('Vehicle')} value={vehicle} onChange={setVehicle} options={[{ value: 'all', label: tx('All vehicles') }, ...vehicleOptions.map((item) => ({ ...item, label: tx(item.label) }))]} />
          </div>
          <div className="trip-filter-row trip-filter-row-secondary">
            <label className="trip-filter-field">
              <span>{tx('Date From')}</span>
              <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            </label>
            <label className="trip-filter-field">
              <span>{tx('Date To')}</span>
              <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </label>
            <div className="trip-filter-actions">
              <button type="button" className="btn btn-secondary btn-compact" onClick={resetFilters}>{tx('Reset filters')}</button>
              <button type="button" className="btn btn-secondary btn-compact" onClick={exportTripsCsv}>{tx('Export')}</button>
            </div>
          </div>
        </section>

        <section className="card workspace-table-card trip-table-card">
          <div className="workspace-section-header">
            <div>
              <div className="eyebrow">{tx('Execution Queue')}</div>
              <h3>{queueTitle}</h3>
              <p className="trip-table-summary">{formatNumber(filtered.length)} {tx('Visible in current scope')}</p>
            </div>
          </div>
          {!filtered.length ? (
            <div className="empty-state inline-state-card"><p>{tx('No trips match the current filters.')}</p></div>
          ) : (
            <div className="table-shell trip-table-shell">
              <table className="data-table workspace-data-table trip-data-table">
                <thead>
                  <tr>
                    <th>{tx('Trip ID')}</th>
                    <th>{tx('Customer')}</th>
                    <th>{tx('Route')}</th>
                    <th>{tx('Vehicle')}</th>
                    <th>{tx('Driver')}</th>
                    <th>{tx('Status')}</th>
                    <th>{tx('ETA')}</th>
                    <th>{tx('Value')}</th>
                    <th>{tx('POD')}</th>
                    <th>{tx('Issues')}</th>
                    <th>{tx('Last Update')}</th>
                    <th>{tx('Action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((trip) => (
                    <tr key={formatText(trip.id, formatText(trip.tripCode, 'trip-row'))} className="trip-table-row" onClick={() => setSelectedId(formatText(trip.id, ''))} style={{ cursor: 'pointer' }}>
                      <td>
                        <div className="workspace-cell-stack trip-primary-cell">
                          <strong>{formatText(trip.tripCode, 'Trip')}</strong>
                          <span>{formatText(trip.branch, 'Unknown branch')}</span>
                        </div>
                      </td>
                      <td>
                        <div className="workspace-cell-stack">
                          <strong>{formatText(trip.customer, 'Customer not assigned')}</strong>
                          <span>{formatText(trip.routeLabel, formatText(trip.route, 'Route not assigned'))}</span>
                        </div>
                      </td>
                      <td>{formatText(trip.routeLabel, formatText(trip.route, 'Route not assigned'))}</td>
                      <td>{formatText(trip.vehicle, 'Vehicle not assigned')}</td>
                      <td>
                        <div className="workspace-cell-stack">
                          <strong>{formatText(trip.driver, 'Driver not assigned')}</strong>
                          <span>{formatText(trip.driverPhone, 'Phone not recorded')}</span>
                        </div>
                      </td>
                      <td><span className={`status-badge trip-status-badge ${toneForStatus(formatText(trip.status, 'assigned'))}`}>{tx(humanize(formatText(trip.status, 'assigned')))}</span></td>
                      <td>{formatDateTime(trip.eta)}</td>
                      <td>{formatCurrency(Number(trip.value ?? 0))}</td>
                      <td><span className={`status-badge trip-pod-badge ${trip.pod === true ? 'good' : 'warning'}`}>{trip.pod === true ? tx('Uploaded') : tx('Pending')}</span></td>
                      <td>{formatNumber(Number(trip.issues ?? 0))}</td>
                      <td>{formatDateTime(trip.lastUpdate)}</td>
                      <td>
                        <div className="trip-table-actions">
                          <span className="trip-action-link">{tx('Open trip')}</span>
                          {Number(trip.issues ?? 0) > 0 ? <span className="trip-action-link secondary">{tx('Review')}</span> : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {selectedTrip ? (
        <WorkspaceDetailDrawer
          title={formatText(selectedTrip.tripCode, 'Trip')}
          subtitle={`${formatText(selectedTrip.customer, 'Customer not assigned')} · ${humanize(formatText(selectedTrip.status, 'assigned'))}`}
          onClose={() => setSelectedId(null)}
          actions={(
            <>
              <Link className="btn btn-secondary btn-compact" href={`/trips/${encodeURIComponent(formatText(selectedTrip.id, ''))}`}>
                {tx('Open trip detail')}
              </Link>
              {selectedTrip.invoice ? (
                <Link className="btn btn-secondary btn-compact" href="/finance">
                  {tx('Open invoice')}
                </Link>
              ) : null}
            </>
          )}
        >
          <section className="workspace-metric-pair-grid">
            <MetricPair label={tx('Customer')} value={formatText(selectedTrip.customer, 'Customer not assigned')} />
            <MetricPair label={tx('Route')} value={formatText(selectedTrip.route, 'Route not assigned')} />
            <MetricPair label={tx('Vehicle')} value={formatText(selectedTrip.vehicle, 'Vehicle not assigned')} />
            <MetricPair label={tx('Driver')} value={formatText(selectedTrip.driver, 'Driver not assigned')} />
            <MetricPair label={tx('Status')} value={tx(humanize(formatText(selectedTrip.status, 'assigned')))} />
            <MetricPair label={tx('ETA')} value={formatDateTime(selectedTrip.eta)} />
            <MetricPair label={tx('Checkpoint')} value={formatText(selectedTrip.currentCheckpoint, 'Checkpoint not recorded')} />
            <MetricPair label={tx('Branch')} value={formatText(selectedTrip.branch, 'Branch not assigned')} />
            <MetricPair label={tx('Trip value')} value={formatCurrency(Number(selectedTrip.value ?? 0))} />
            <MetricPair label="POD" value={selectedTrip.pod === true ? tx('Uploaded') : tx('Pending')} />
          </section>

          <section className="card workspace-detail-card">
            <div className="workspace-section-header">
              <div>
                <div className="eyebrow">{tx('Execution Timeline')}</div>
                <h3>{tx('Latest trip updates')}</h3>
              </div>
            </div>
            {!Array.isArray(selectedTrip.timeline) || !selectedTrip.timeline.length ? (
              <div className="empty-state inline-state-card"><p>{tx('No trip timeline is available yet.')}</p></div>
            ) : (
              <div className="workspace-detail-list">
                {(selectedTrip.timeline as Array<Record<string, unknown>>).slice(-4).reverse().map((item, index) => (
                  <div key={formatText(item.title, `timeline-${index}`)} className="workspace-detail-row">
                    <div className="workspace-cell-stack">
                      <strong>{tx(formatText(item.title, 'Status update'))}</strong>
                      <span>{formatDateTime(item.eventAt)}</span>
                    </div>
                    <div className="workspace-cell-stack" style={{ justifyItems: 'end' }}>
                      <span>{tx(formatText(item.source, 'System update'))}</span>
                      <span className="label">{tx(formatText(item.location, formatText(item.description, 'Location not recorded')))}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card workspace-detail-card">
            <div className="workspace-section-header">
              <div>
                <div className="eyebrow">{tx('Linked Context')}</div>
                <h3>{tx('Documents, fuel, incidents, and invoice')}</h3>
              </div>
            </div>
            <div className="workspace-detail-list">
              <div className="workspace-detail-row">
                <div className="workspace-cell-stack">
                  <strong>{tx('Documents')}</strong>
                  <span>{documentSummary(selectedTrip.documents)}</span>
                </div>
                <span className="label">{Array.isArray(selectedTrip.documents) ? `${selectedTrip.documents.length} ${tx('file(s)')}` : tx('No documents')}</span>
              </div>
              <div className="workspace-detail-row">
                <div className="workspace-cell-stack">
                  <strong>{tx('Fuel')}</strong>
                  <span>{fuelSummary(selectedTrip.fuel)}</span>
                </div>
                <span className="label">{formatFuelMeta(selectedTrip.fuel)}</span>
              </div>
              <div className="workspace-detail-row">
                <div className="workspace-cell-stack">
                  <strong>{tx('Incidents')}</strong>
                  <span>{incidentSummary(selectedTrip.incidents)}</span>
                </div>
                <span className="label">{Array.isArray(selectedTrip.incidents) ? `${selectedTrip.incidents.length} ${tx('linked report(s)')}` : tx('No reports')}</span>
              </div>
              <div className="workspace-detail-row">
                <div className="workspace-cell-stack">
                  <strong>{tx('Invoice')}</strong>
                  <span>{invoiceSummary(selectedTrip.invoice)}</span>
                </div>
                <span className="label">{invoiceMeta(selectedTrip.invoice)}</span>
              </div>
            </div>
          </section>
        </WorkspaceDetailDrawer>
      ) : null}
    </main>
  );
}

function KpiCard({
  label,
  value,
  helper,
  tone = 'info',
}: {
  label: string;
  value: number;
  helper: string;
  tone?: 'good' | 'warning' | 'critical' | 'info';
}) {
  return (
    <div className={`compact-kpi-card card ${tone === 'critical' ? 'executive-urgent-card' : tone === 'warning' ? 'executive-moving-card warning' : tone === 'good' ? 'executive-moving-card good' : 'executive-money-card info'}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{formatNumber(value)}</div>
      <div className="kpi-supporting-text">{helper}</div>
    </div>
  );
}

function TripKpiCard({
  label,
  value,
  helper,
  tone,
  active = false,
}: {
  label: string;
  value: number;
  helper: string;
  tone: 'neutral' | 'blue' | 'red' | 'green' | 'amber';
  active?: boolean;
}) {
  return (
    <section className={`card trip-kpi-card ${tone} ${active ? 'active' : ''}`}>
      <div className="trip-kpi-topline" />
      <div className="trip-kpi-label">{label}</div>
      <div className="trip-kpi-value">{formatNumber(value)}</div>
      <div className="trip-kpi-helper">{helper}</div>
    </section>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="trip-filter-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={`${label}-${option.value}`} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function MetricPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="workspace-metric-pair">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function optionize(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort().map((value) => ({ value, label: humanize(value) }));
}

function humanize(value: string) {
  return formatText(value, 'Not available').replace(/_/g, ' ');
}

function toneForStatus(value: string) {
  const normalized = value.toLowerCase();
  if (['delayed', 'cancelled', 'blocked'].includes(normalized)) return 'critical';
  if (['loading', 'assigned', 'offloading'].includes(normalized)) return 'warning';
  if (['completed', 'delivered', 'in_transit', 'on_road'].includes(normalized)) return 'good';
  return 'info';
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatCurrency(value: number) {
  return `ETB ${new Intl.NumberFormat().format(Number.isFinite(value) ? value : 0)}`;
}

function csvCell(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function documentSummary(value: unknown) {
  if (!Array.isArray(value) || !value.length) return 'No linked trip documents';
  const latest = value[0] as Record<string, unknown>;
  return `${formatText(latest.type, 'document')} · ${formatText(latest.status, 'uploaded')}`;
}

function fuelSummary(value: unknown) {
  if (!value || typeof value !== 'object') return 'No linked fuel record';
  const row = value as Record<string, unknown>;
  return `${formatNumber(Number(row.liters ?? 0))} L at ${formatText(row.station, 'Fuel station')}`;
}

function formatFuelMeta(value: unknown) {
  if (!value || typeof value !== 'object') return 'No fuel metadata';
  const row = value as Record<string, unknown>;
  return formatDateTime(row.date);
}

function incidentSummary(value: unknown) {
  if (!Array.isArray(value) || !value.length) return 'No linked incidents';
  const latest = value[0] as Record<string, unknown>;
  return `${formatText(latest.reportCode, 'Report')} · ${humanize(formatText(latest.type, 'incident'))}`;
}

function invoiceSummary(value: unknown) {
  if (!value || typeof value !== 'object') return 'No linked invoice';
  const row = value as Record<string, unknown>;
  return `${formatText(row.code, 'Invoice')} · ${humanize(formatText(row.status, 'pending'))}`;
}

function invoiceMeta(value: unknown) {
  if (!value || typeof value !== 'object') return 'Invoice pending';
  const row = value as Record<string, unknown>;
  return `${formatCurrency(Number(row.outstandingAmount ?? 0))} outstanding`;
}
