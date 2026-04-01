'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatDateTime, formatText } from '../lib/formatters';
import { apiGet } from '../lib/api';
import { WorkspaceDetailDrawer } from './workspace-detail-drawer';
import { WorkspaceFilterBar } from './workspace-filter-bar';

type AuditRow = Record<string, unknown>;

export function AuditLogsRuntime({ logs }: { logs: AuditRow[] }) {
  const [search, setSearch] = useState('');
  const [activityType, setActivityType] = useState('all');
  const [scope, setScope] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const activityOptions = useMemo(() => optionize(logs.map((log) => formatText(log.activityType, 'system_update'))), [logs]);
  const scopeOptions = useMemo(() => optionize(logs.map((log) => scopeLabel(log))), [logs]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return logs.filter((log) => {
      const type = formatText(log.activityType, 'system_update');
      const scopeValue = scopeLabel(log);
      if (activityType !== 'all' && type !== activityType) return false;
      if (scope !== 'all' && scopeValue !== scope) return false;
      if (!query) return true;
      return [
        formatText(log.title, 'Audit event'),
        formatText(log.description, 'Audit detail not recorded'),
        type,
        scopeValue,
        linkedRef(log),
      ].join(' ').toLowerCase().includes(query);
    });
  }, [activityType, logs, scope, search]);

  const selected = filtered.find((log) => rowId(log) === selectedId)
    ?? logs.find((log) => rowId(log) === selectedId)
    ?? null;

  const total = logs.length;
  const today = logs.filter((log) => isToday(log.createdAt)).length;
  const tripLinked = logs.filter((log) => formatText(log.tripId, '')).length;
  const vehicleLinked = logs.filter((log) => formatText(log.vehicleId, '')).length;
  const userLinked = logs.filter((log) => formatText(log.userId, '')).length;

  return (
    <main className="shell">
      <div className="panel workspace-shell">
        <section className="workspace-header">
          <div className="workspace-header-copy">
            <div className="eyebrow">Audit Explorer</div>
            <h1>Audit Logs</h1>
            <p>Review platform activity history across trips, vehicles, launch controls, and user actions with clear scope and event detail.</p>
          </div>
        </section>

        <section className="workspace-kpi-grid">
          <KpiCard label="Total Events" value={total} helper="Audit events loaded in this workspace" />
          <KpiCard label="Today" value={today} helper="Events logged today" tone={today ? 'info' : 'good'} />
          <KpiCard label="Trip Linked" value={tripLinked} helper="Events tied to trip execution" />
          <KpiCard label="Vehicle Linked" value={vehicleLinked} helper="Events tied to vehicle activity" />
          <KpiCard label="User Linked" value={userLinked} helper="Events tied to user actions" />
        </section>

        <WorkspaceFilterBar
          fields={[
            { key: 'search', label: 'Search', type: 'search', value: search, placeholder: 'Title, description, activity, linked record', onChange: setSearch },
            { key: 'activityType', label: 'Activity', type: 'select', value: activityType, onChange: setActivityType, options: [{ value: 'all', label: 'All activity types' }, ...activityOptions] },
            { key: 'scope', label: 'Scope', type: 'select', value: scope, onChange: setScope, options: [{ value: 'all', label: 'All scopes' }, ...scopeOptions] },
          ]}
        />

        <section className="card workspace-table-card">
          <div className="workspace-section-header">
            <div>
              <div className="eyebrow">Audit Trail</div>
              <h3>{filtered.length} events</h3>
            </div>
          </div>
          {!filtered.length ? (
            <div className="empty-state inline-state-card"><p>No audit events match the current filters.</p></div>
          ) : (
            <div className="table-shell">
              <table className="data-table workspace-data-table">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Activity Type</th>
                    <th>Scope</th>
                    <th>Linked Record</th>
                    <th>Created At</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log) => (
                    <tr key={rowId(log)} onClick={() => setSelectedId(rowId(log))} style={{ cursor: 'pointer' }}>
                      <td>
                        <div className="workspace-cell-stack">
                          <strong>{formatText(log.title, 'Audit event')}</strong>
                          <span>{formatText(log.description, 'Audit detail not recorded')}</span>
                        </div>
                      </td>
                      <td>{humanize(formatText(log.activityType, 'system_update'))}</td>
                      <td>{scopeLabel(log)}</td>
                      <td>{linkedRef(log)}</td>
                      <td>{formatDateTime(log.createdAt)}</td>
                      <td>Open event</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {selected ? (
        <WorkspaceDetailDrawer
          title={formatText(selected.title, 'Audit event')}
          subtitle={`${humanize(formatText(selected.activityType, 'system_update'))} · ${scopeLabel(selected)}`}
          onClose={() => setSelectedId(null)}
        >
          <section className="workspace-metric-pair-grid">
            <MetricPair label="Activity Type" value={humanize(formatText(selected.activityType, 'system_update'))} />
            <MetricPair label="Scope" value={scopeLabel(selected)} />
            <MetricPair label="Linked Record" value={linkedRef(selected)} />
            <MetricPair label="Trip ID" value={formatText(selected.tripId, 'No trip link')} />
            <MetricPair label="Vehicle ID" value={formatText(selected.vehicleId, 'No vehicle link')} />
            <MetricPair label="Driver ID" value={formatText(selected.driverId, 'No driver link')} />
            <MetricPair label="User ID" value={formatText(selected.userId, 'No user link')} />
            <MetricPair label="Created At" value={formatDateTime(selected.createdAt)} />
          </section>

          <section className="card workspace-detail-card">
            <div className="workspace-section-header">
              <div>
                <div className="eyebrow">Event Detail</div>
                <h3>Audit metadata</h3>
              </div>
            </div>
            <div className="workspace-detail-list">
              <div className="workspace-detail-row">
                <div className="workspace-cell-stack">
                  <strong>Description</strong>
                  <span>{formatText(selected.description, 'Audit detail not recorded')}</span>
                </div>
                <span className="label">{linkedRef(selected)}</span>
              </div>
              <div className="workspace-detail-row">
                <div className="workspace-cell-stack">
                  <strong>Metadata</strong>
                  <span>{metadataSummary(selected.metadata)}</span>
                </div>
                <span className="label">{humanize(formatText(selected.activityType, 'system_update'))}</span>
              </div>
            </div>
          </section>
        </WorkspaceDetailDrawer>
      ) : null}
    </main>
  );
}

export function AuditLogsPageRuntime() {
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    void apiGet<AuditRow[]>('/activity-logs')
      .then((result) => {
        if (!active) return;
        setLogs(Array.isArray(result) ? result : []);
        setLoaded(true);
      })
      .catch(() => {
        if (!active) return;
        setLogs([]);
        setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!loaded) {
    return (
      <main className="shell">
        <div className="panel workspace-shell">
          <section className="card workspace-table-card">
            <div className="empty-state inline-state-card"><p>Loading audit logs...</p></div>
          </section>
        </div>
      </main>
    );
  }

  return <AuditLogsRuntime logs={logs} />;
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

function rowId(log: AuditRow) {
  return formatText(log.id, formatText(log._id, formatText(log.title, 'audit-row')));
}

function scopeLabel(log: AuditRow) {
  if (formatText(log.tripId, '')) return 'Trip';
  if (formatText(log.vehicleId, '')) return 'Vehicle';
  if (formatText(log.driverId, '')) return 'Driver';
  if (formatText(log.userId, '')) return 'User';
  return 'Platform';
}

function linkedRef(log: AuditRow) {
  if (formatText(log.tripId, '')) return `Trip ${formatText(log.tripId)}`;
  if (formatText(log.vehicleId, '')) return `Vehicle ${formatText(log.vehicleId)}`;
  if (formatText(log.driverId, '')) return `Driver ${formatText(log.driverId)}`;
  if (formatText(log.userId, '')) return `User ${formatText(log.userId)}`;
  return 'No linked entity';
}

function metadataSummary(value: unknown) {
  if (!value || typeof value !== 'object') return 'No metadata recorded';
  const entries = Object.entries(value as Record<string, unknown>).slice(0, 3);
  if (!entries.length) return 'No metadata recorded';
  return entries.map(([key, entryValue]) => `${humanize(key)}: ${formatText(entryValue)}`).join(' · ');
}

function isToday(value: unknown) {
  const raw = formatText(value, '');
  if (!raw) return false;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}
