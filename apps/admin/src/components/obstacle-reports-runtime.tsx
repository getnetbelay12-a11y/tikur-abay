'use client';

import { useMemo, useState } from 'react';
import { formatDateTime, formatPerson, formatText } from '../lib/formatters';
import { useConsoleI18n } from '../lib/use-console-i18n';
import { WorkspaceDetailDrawer } from './workspace-detail-drawer';
import { WorkspaceFilterBar } from './workspace-filter-bar';

type IncidentRow = Record<string, unknown>;

export function ObstacleReportsRuntime({ incidents }: { incidents: IncidentRow[] }) {
  const { tx } = useConsoleI18n();
  const rows = useMemo(
    () => incidents.filter((item) => formatText(item.type, '') === 'obstacle_report'),
    [incidents],
  );

  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('all');
  const [status, setStatus] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const severityOptions = useMemo(() => optionize(rows.map((row) => formatText(row.severity, 'medium'))), [rows]);
  const statusOptions = useMemo(() => optionize(rows.map((row) => formatText(row.status, 'reported'))), [rows]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      const rowSeverity = formatText(row.severity, 'medium');
      const rowStatus = formatText(row.status, 'reported');
      if (severity !== 'all' && rowSeverity !== severity) return false;
      if (status !== 'all' && rowStatus !== status) return false;
      if (!query) return true;
      return [
        formatText(row.tripCode, 'Trip pending'),
        formatText(row.vehicleCode, 'Vehicle pending'),
        formatPerson(row.driverName, 'Driver pending'),
        rowSeverity,
        rowStatus,
        formatText(row.description),
        locationLabel(row.location),
      ].join(' ').toLowerCase().includes(query);
    });
  }, [rows, search, severity, status]);

  const selected = filtered.find((row) => formatText(row.id, formatText(row._id, '')) === selectedId)
    ?? rows.find((row) => formatText(row.id, formatText(row._id, '')) === selectedId)
    ?? null;

  const total = rows.length;
  const open = rows.filter((row) => formatText(row.status, 'reported') === 'reported').length;
  const review = rows.filter((row) => formatText(row.status, '') === 'under_review').length;
  const critical = rows.filter((row) => formatText(row.severity, '') === 'critical').length;

  return (
    <main className="shell">
      <div className="panel workspace-shell">
        <section className="workspace-header">
          <div className="workspace-header-copy">
            <div className="eyebrow">{tx('Road Blockers')}</div>
            <h1>{tx('Obstacle Reports')}</h1>
            <p>{tx('Route obstacles and corridor disruption with trip, vehicle, and location context.')}</p>
          </div>
        </section>

        <section className="workspace-kpi-grid">
          <KpiCard label={tx('Total Reports')} value={total} helper={tx('Obstacle incidents in the queue')} />
          <KpiCard label={tx('Open')} value={open} helper={tx('Reported and awaiting route review')} tone={open ? 'warning' : 'good'} />
          <KpiCard label={tx('Under Review')} value={review} helper={tx('Operations follow-up in progress')} tone={review ? 'info' : 'good'} />
          <KpiCard label={tx('Critical')} value={critical} helper={tx('Highest severity corridor blockers')} tone={critical ? 'critical' : 'good'} />
        </section>

        <WorkspaceFilterBar
          fields={[
            { key: 'search', label: 'Search', type: 'search', value: search, placeholder: 'Trip, vehicle, driver, corridor', onChange: setSearch },
            { key: 'severity', label: 'Severity', type: 'select', value: severity, onChange: setSeverity, options: [{ value: 'all', label: 'All severities' }, ...severityOptions] },
            { key: 'status', label: 'Status', type: 'select', value: status, onChange: setStatus, options: [{ value: 'all', label: 'All statuses' }, ...statusOptions] },
          ]}
        />

        <section className="card workspace-table-card">
          <div className="workspace-section-header">
            <div>
              <div className="eyebrow">{tx('Obstacle Queue')}</div>
              <h3>{filtered.length} {tx('reports')}</h3>
            </div>
          </div>
          {!filtered.length ? (
            <div className="empty-state inline-state-card"><p>{tx('No obstacle reports match the current filters.')}</p></div>
          ) : (
            <div className="table-shell">
              <table className="data-table workspace-data-table">
                <thead>
                  <tr>
                    <th>{tx('Trip')}</th>
                    <th>{tx('Vehicle')}</th>
                    <th>{tx('Driver')}</th>
                    <th>{tx('Severity')}</th>
                    <th>{tx('Status')}</th>
                    <th>{tx('Location')}</th>
                    <th>{tx('Reported At')}</th>
                    <th>{tx('Action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const rowId = formatText(row.id, formatText(row._id, 'incident-row'));
                    return (
                      <tr key={rowId} onClick={() => setSelectedId(rowId)} style={{ cursor: 'pointer' }}>
                        <td>{formatText(row.tripCode, 'Trip pending')}</td>
                        <td>{formatText(row.vehicleCode, 'Vehicle pending')}</td>
                        <td>{formatPerson(row.driverName, 'Driver pending')}</td>
                        <td><span className={`status-badge ${toneForSeverity(formatText(row.severity, 'medium'))}`}>{humanize(formatText(row.severity, 'medium'))}</span></td>
                        <td><span className={`status-badge ${toneForStatus(formatText(row.status, 'reported'))}`}>{humanize(formatText(row.status, 'reported'))}</span></td>
                        <td>{locationLabel(row.location)}</td>
                        <td>{formatDateTime(row.createdAt)}</td>
                        <td>{tx('Review blocker')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {selected ? (
        <WorkspaceDetailDrawer
          title={formatText(selected.tripCode, 'Obstacle report')}
          subtitle={`${formatText(selected.vehicleCode, 'Vehicle pending')} · ${humanize(formatText(selected.status, 'reported'))}`}
          onClose={() => setSelectedId(null)}
        >
          <section className="workspace-metric-pair-grid">
            <MetricPair label={tx('Driver')} value={formatPerson(selected.driverName, 'Driver pending')} />
            <MetricPair label={tx('Vehicle')} value={formatText(selected.vehicleCode, 'Vehicle pending')} />
            <MetricPair label={tx('Trip')} value={formatText(selected.tripCode, 'Trip pending')} />
            <MetricPair label={tx('Severity')} value={humanize(formatText(selected.severity, 'medium'))} />
            <MetricPair label={tx('Status')} value={humanize(formatText(selected.status, 'reported'))} />
            <MetricPair label={tx('Location')} value={locationLabel(selected.location)} />
            <MetricPair label={tx('Reported At')} value={formatDateTime(selected.createdAt)} />
            <MetricPair label={tx('Attachment Count')} value={String(Array.isArray(selected.attachments) ? selected.attachments.length : 0)} />
          </section>

          <section className="card workspace-detail-card">
            <div className="workspace-section-header">
              <div>
                <div className="eyebrow">{tx('Blocker Detail')}</div>
                <h3>{tx('Road and corridor context')}</h3>
              </div>
            </div>
            <div className="workspace-detail-list">
              <div className="workspace-detail-row">
                <div className="workspace-cell-stack">
                  <strong>{tx('Description')}</strong>
                  <span>{formatText(selected.description, tx('Obstacle report submitted for operations escalation.'))}</span>
                </div>
                <span className={`status-badge ${toneForSeverity(formatText(selected.severity, 'medium'))}`}>{humanize(formatText(selected.severity, 'medium'))}</span>
              </div>
              <div className="workspace-detail-row">
                <div className="workspace-cell-stack">
                  <strong>{tx('Attachments')}</strong>
                  <span>{tx(attachmentSummary(selected.attachments))}</span>
                </div>
                <span className="label">{Array.isArray(selected.attachments) && selected.attachments[0] ? tx('Evidence uploaded') : tx('No file uploaded')}</span>
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

function toneForSeverity(value: string) {
  const normalized = value.toLowerCase();
  if (normalized === 'critical') return 'critical';
  if (normalized === 'high' || normalized === 'medium') return 'warning';
  if (normalized === 'low') return 'good';
  return 'info';
}

function toneForStatus(value: string) {
  const normalized = value.toLowerCase();
  if (normalized === 'reported') return 'critical';
  if (normalized === 'under_review') return 'warning';
  if (normalized === 'resolved') return 'good';
  return 'info';
}

function locationLabel(value: unknown) {
  if (!value || typeof value !== 'object') return 'Location not recorded';
  const point = value as { latitude?: number; longitude?: number };
  const latitude = Number(point.latitude);
  const longitude = Number(point.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return 'Location not recorded';
  if (latitude > 11.4 && latitude < 13.2 && longitude > 41.6 && longitude < 43.6) return 'Djibouti corridor';
  if (latitude > 8.8 && latitude < 9.2 && longitude > 38.6 && longitude < 39.1) return 'Addis Ababa corridor';
  if (latitude > 8.4 && latitude < 9.3 && longitude > 39.0 && longitude < 40.2) return 'Adama corridor';
  return 'Field route location';
}

function attachmentSummary(value: unknown) {
  if (!Array.isArray(value) || !value.length) return 'No evidence files attached';
  return `${value.length} attachment${value.length === 1 ? '' : 's'} uploaded`;
}
