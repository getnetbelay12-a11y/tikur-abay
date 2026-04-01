'use client';

import { useMemo, useState, useTransition } from 'react';
import { apiPatch } from '../lib/api';
import { formatDateTime, formatLocation, formatPerson, formatPhone, formatText } from '../lib/formatters';
import { useConsoleI18n } from '../lib/use-console-i18n';
import { WorkspaceDetailDrawer } from './workspace-detail-drawer';
import { WorkspaceFilterBar } from './workspace-filter-bar';

type ReportRow = Record<string, unknown>;

export function FuelRequestsRuntime({ reports }: { reports: ReportRow[] }) {
  const { tx } = useConsoleI18n();
  const fuelRows = useMemo(
    () => reports.filter((report) => formatText(report.type, '') === 'fuel_request'),
    [reports],
  );

  const [rows, setRows] = useState(fuelRows);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [branch, setBranch] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [pending, startTransition] = useTransition();

  const branchOptions = useMemo(() => optionize(rows.map((row) => formatText(row.branch, 'Unknown branch'))), [rows]);
  const statusOptions = useMemo(() => optionize(rows.map((row) => formatText(row.status, 'submitted'))), [rows]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      const rowStatus = formatText(row.status, 'submitted');
      const rowBranch = formatText(row.branch, 'Unknown branch');
      if (status !== 'all' && rowStatus !== status) return false;
      if (branch !== 'all' && rowBranch !== branch) return false;
      if (!query) return true;
      return [
        formatText(row.reportCode, 'Report'),
        formatPerson(row.driver, 'Driver pending'),
        formatPhone(row.driverPhone),
        formatText(row.vehicle, 'Vehicle pending'),
        formatText(row.trip, 'Trip pending'),
        rowBranch,
        formatText(row.description),
        formatLocation(row.location),
      ].join(' ').toLowerCase().includes(query);
    });
  }, [branch, rows, search, status]);

  const selected = filtered.find((row) => formatText(row.id, '') === selectedId)
    ?? rows.find((row) => formatText(row.id, '') === selectedId)
    ?? null;

  const openCount = rows.filter((row) => formatText(row.status, 'submitted') === 'submitted').length;
  const underReviewCount = rows.filter((row) => formatText(row.status, '') === 'under_review').length;
  const resolvedCount = rows.filter((row) => formatText(row.status, '') === 'resolved').length;
  const branchCoverage = new Set(rows.map((row) => formatText(row.branch, 'Unknown branch'))).size;

  function updateStatus(id: string, nextStatus: string) {
    startTransition(async () => {
      try {
        await apiPatch(`/driver-reports/${encodeURIComponent(id)}/status`, { status: nextStatus });
        setRows((current) => current.map((row) => (
          formatText(row.id, '') === id
            ? { ...row, status: nextStatus, assignedTo: nextStatus === 'resolved' ? 'Closed by fleet desk' : 'Fleet desk' }
            : row
        )));
        setFeedback(`${tx('Fuel request moved to')} ${tx(nextStatus.replace(/_/g, ' '))}.`);
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : tx('Unable to update the fuel request.'));
      }
    });
  }

  return (
    <main className="shell">
      <div className="panel workspace-shell">
        <section className="workspace-header">
          <div className="workspace-header-copy">
            <div className="eyebrow">{tx('Fuel Desk')}</div>
            <h1>{tx('Fuel Requests')}</h1>
            <p>{tx('Driver fuel requests with trip, vehicle, branch, and location context.')}</p>
          </div>
        </section>

        <section className="workspace-kpi-grid">
          <KpiCard label={tx('Fuel Requests')} value={rows.length} helper={tx('Requests loaded in the queue')} />
          <KpiCard label={tx('Open')} value={openCount} helper={tx('Submitted and waiting for review')} tone={openCount ? 'warning' : 'good'} />
          <KpiCard label={tx('Under Review')} value={underReviewCount} helper={tx('Fleet desk follow-up in progress')} tone={underReviewCount ? 'info' : 'good'} />
          <KpiCard label={tx('Resolved')} value={resolvedCount} helper={tx('Requests closed by operations')} tone="good" />
          <KpiCard label={tx('Branches')} value={branchCoverage} helper={tx('Current branch coverage in this queue')} />
        </section>

        <WorkspaceFilterBar
          fields={[
            { key: 'search', label: 'Search', type: 'search', value: search, placeholder: 'Report, driver, vehicle, trip, location', onChange: setSearch },
            { key: 'status', label: 'Status', type: 'select', value: status, onChange: setStatus, options: [{ value: 'all', label: 'All statuses' }, ...statusOptions] },
            { key: 'branch', label: 'Branch', type: 'select', value: branch, onChange: setBranch, options: [{ value: 'all', label: 'All branches' }, ...branchOptions] },
          ]}
        />

        <section className="card workspace-table-card">
          <div className="workspace-section-header">
            <div>
              <div className="eyebrow">{tx('Request Queue')}</div>
              <h3>{filtered.length} {tx('fuel requests')}</h3>
            </div>
          </div>
          {!filtered.length ? (
            <div className="empty-state inline-state-card"><p>{tx('No fuel requests match the current filters.')}</p></div>
          ) : (
            <div className="table-shell">
              <table className="data-table workspace-data-table">
                <thead>
                  <tr>
                    <th>{tx('Request')}</th>
                    <th>{tx('Driver')}</th>
                    <th>{tx('Phone')}</th>
                    <th>{tx('Vehicle')}</th>
                    <th>{tx('Trip')}</th>
                    <th>{tx('Branch')}</th>
                    <th>{tx('Location')}</th>
                    <th>{tx('Submitted')}</th>
                    <th>{tx('Status')}</th>
                    <th>{tx('Assigned To')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={formatText(row.id, formatText(row.reportCode, 'fuel-request-row'))} onClick={() => setSelectedId(formatText(row.id, ''))} style={{ cursor: 'pointer' }}>
                      <td>
                        <div className="workspace-cell-stack">
                          <strong>{formatText(row.reportCode, tx('Fuel request'))}</strong>
                          <span>{formatText(row.description, tx('Fuel request submitted.'))}</span>
                        </div>
                      </td>
                      <td>{formatPerson(row.driver, 'Driver not assigned')}</td>
                      <td>{formatPhone(row.driverPhone)}</td>
                      <td>{formatText(row.vehicle, 'Vehicle not assigned')}</td>
                      <td>{formatText(row.trip, 'Trip not assigned')}</td>
                      <td>{formatText(row.branch, 'Branch not assigned')}</td>
                      <td>{formatLocation(row.location)}</td>
                      <td>{formatDateTime(row.submitted)}</td>
                      <td><span className={`status-badge ${toneForStatus(formatText(row.status, 'submitted'))}`}>{tx(humanize(formatText(row.status, 'submitted')))}</span></td>
                      <td>{tx(formatText(row.assignedTo, 'Fleet desk'))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {feedback ? <div className="label" style={{ marginTop: 12 }}>{feedback}</div> : null}
        </section>
      </div>

      {selected ? (
        <WorkspaceDetailDrawer
          title={formatText(selected.reportCode, 'Fuel request')}
          subtitle={`${formatPerson(selected.driver, 'Driver not assigned')} · ${tx(humanize(formatText(selected.status, 'submitted')))}`}
          onClose={() => setSelectedId(null)}
          actions={(
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary btn-compact" disabled={pending} onClick={() => updateStatus(formatText(selected.id, ''), 'under_review')}>
                {pending ? tx('Updating...') : tx('Under Review')}
              </button>
              <button type="button" className="btn btn-secondary btn-compact" disabled={pending} onClick={() => updateStatus(formatText(selected.id, ''), 'resolved')}>
                {pending ? tx('Updating...') : tx('Resolve')}
              </button>
            </div>
          )}
        >
          <section className="workspace-metric-pair-grid">
            <MetricPair label={tx('Driver')} value={formatPerson(selected.driver, 'Driver not assigned')} />
            <MetricPair label={tx('Phone')} value={formatPhone(selected.driverPhone)} />
            <MetricPair label={tx('Vehicle')} value={formatText(selected.vehicle, 'Vehicle not assigned')} />
            <MetricPair label={tx('Trip')} value={formatText(selected.trip, 'Trip not assigned')} />
            <MetricPair label={tx('Branch')} value={formatText(selected.branch, 'Branch not assigned')} />
            <MetricPair label={tx('Location')} value={formatLocation(selected.location)} />
            <MetricPair label={tx('Submitted')} value={formatDateTime(selected.submitted)} />
            <MetricPair label={tx('Status')} value={tx(humanize(formatText(selected.status, 'submitted')))} />
            <MetricPair label={tx('Assigned To')} value={tx(formatText(selected.assignedTo, 'Fleet desk'))} />
            <MetricPair label={tx('Route')} value={formatText((selected.tripDetail as Record<string, unknown> | null)?.route, 'Route not assigned')} />
          </section>

          <section className="card workspace-detail-card">
            <div className="workspace-section-header">
              <div>
                <div className="eyebrow">{tx('Request Context')}</div>
                <h3>{tx('Request follow-up')}</h3>
              </div>
            </div>
            <div className="workspace-detail-list">
              <div className="workspace-detail-row">
                <div className="workspace-cell-stack">
                  <strong>{tx('Driver note')}</strong>
                  <span>{formatText(selected.description, tx('Fuel request submitted for review.'))}</span>
                </div>
                <span className={`status-badge ${toneForStatus(formatText(selected.status, 'submitted'))}`}>{tx(humanize(formatText(selected.status, 'submitted')))}</span>
              </div>
              <div className="workspace-detail-row">
                <div className="workspace-cell-stack">
                  <strong>{tx('Trip context')}</strong>
                  <span>{formatText((selected.tripDetail as Record<string, unknown> | null)?.customer, 'Customer not assigned')}</span>
                </div>
                <span className="label">{formatDateTime((selected.tripDetail as Record<string, unknown> | null)?.eta)}</span>
              </div>
              <div className="workspace-detail-row">
                <div className="workspace-cell-stack">
                  <strong>{tx('Vehicle context')}</strong>
                  <span>{formatText((selected.vehicleDetail as Record<string, unknown> | null)?.plateNumber, 'Plate not recorded')}</span>
                </div>
                <span className="label">{tx(formatText((selected.vehicleDetail as Record<string, unknown> | null)?.currentStatus, 'available').replace(/_/g, ' '))}</span>
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
      <div className="kpi-value">{new Intl.NumberFormat().format(value)}</div>
      <div className="kpi-supporting-text">{helper}</div>
    </div>
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
  if (normalized === 'resolved') return 'good';
  if (normalized === 'under_review') return 'warning';
  if (normalized === 'submitted') return 'critical';
  return 'info';
}
