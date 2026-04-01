'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { apiPatch } from '../lib/api';
import { formatDateTime, formatText } from '../lib/formatters';
import {
  markAllShippingNotificationsRead,
  markShippingNotificationRead,
  shippingDeskLink,
  readShippingPhase1Workspace,
  readShippingNotifications,
  shippingPhase1UpdatedEvent,
} from '../lib/shipping-phase1';
import { useConsoleI18n } from '../lib/use-console-i18n';
import { WorkspaceDetailDrawer } from './workspace-detail-drawer';
import { WorkspaceFilterBar } from './workspace-filter-bar';

type NotificationRow = Record<string, unknown>;

function resolveNotificationTarget(row: NotificationRow) {
  const linked = row.linkedEntity as Record<string, unknown> | null;
  const linkedHref = formatText(linked?.href, '#');
  if (linkedHref !== '#') {
    return {
      href: linkedHref,
      label: formatText(row.actionLabel, 'Open detail'),
    };
  }

  const entityId = formatText(row.entityId, '');
  if (entityId.startsWith('BK-')) {
    const shippingWorkspace = readShippingPhase1Workspace();
    const booking = shippingWorkspace.bookings.find((item) => item.bookingId === entityId);
    if (booking) {
      return shippingDeskLink(booking.currentStage);
    }
  }

  return {
    href: '/notifications',
    label: formatText(row.actionLabel, 'Open detail'),
  };
}

export function NotificationsRuntime({ notifications }: { notifications: NotificationRow[] }) {
  const { tx } = useConsoleI18n();
  const [serverRows, setServerRows] = useState<NotificationRow[]>(notifications);
  const [shippingRows, setShippingRows] = useState<NotificationRow[]>([]);
  const [search, setSearch] = useState('');
  const [readState, setReadState] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [category, setCategory] = useState('all');
  const [branch, setBranch] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [pending, startTransition] = useTransition();
  const rows = useMemo(() => [...serverRows, ...shippingRows], [serverRows, shippingRows]);

  useEffect(() => {
    function syncShippingNotifications() {
      setShippingRows(readShippingNotifications() as NotificationRow[]);
    }

    syncShippingNotifications();
    window.addEventListener(shippingPhase1UpdatedEvent, syncShippingNotifications);
    return () => window.removeEventListener(shippingPhase1UpdatedEvent, syncShippingNotifications);
  }, []);

  const categoryOptions = useMemo(() => optionize(rows.map((row) => formatText(row.category, 'operations'))), [rows]);
  const severityOptions = useMemo(() => optionize(rows.map((row) => formatText(row.severity, 'info'))), [rows]);
  const branchOptions = useMemo(() => optionize(rows.map((row) => formatText(row.branch, 'All branches'))), [rows]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      const rowRead = row.isRead === true ? 'read' : 'unread';
      const rowSeverity = formatText(row.severity, 'info');
      const rowCategory = formatText(row.category, 'operations');
      const rowBranch = formatText(row.branch, 'All branches');
      const rowTimestamp = formatText(row.timestamp, '');
      if (readState !== 'all' && rowRead !== readState) return false;
      if (severity !== 'all' && rowSeverity !== severity) return false;
      if (category !== 'all' && rowCategory !== category) return false;
      if (branch !== 'all' && rowBranch !== branch) return false;
      if (dateFrom && (!rowTimestamp || String(rowTimestamp).slice(0, 10) < dateFrom)) return false;
      if (!query) return true;
      return [
        formatText(row.title, 'System update'),
        formatText(row.secondaryText, 'Review and follow up'),
        rowRead,
        rowSeverity,
        rowCategory,
        rowBranch,
        formatText((row.linkedEntity as Record<string, unknown> | null)?.label, 'Related record'),
        formatText(row.actionLabel, 'Open detail'),
      ].join(' ').toLowerCase().includes(query);
    });
  }, [branch, category, dateFrom, readState, rows, search, severity]);

  const selected = filtered.find((row) => formatText(row.id, '') === selectedId)
    ?? rows.find((row) => formatText(row.id, '') === selectedId)
    ?? null;
  const selectedTarget = useMemo(() => (selected ? resolveNotificationTarget(selected) : null), [selected]);

  const unreadCount = rows.filter((row) => row.isRead !== true).length;
  const criticalCount = rows.filter((row) => formatText(row.severity, 'info') === 'critical').length;
  const financeCount = rows.filter((row) => formatText(row.category, 'operations') === 'finance').length;
  const driverCount = rows.filter((row) => formatText(row.category, 'operations') === 'driver').length;
  const todayCount = rows.filter((row) => isToday(row.timestamp)).length;
  const actionQueueCount = rows.filter((row) => ['critical', 'high'].includes(formatText(row.severity, 'info')) && row.isRead !== true).length;

  function markOneRead(id: string) {
    startTransition(async () => {
      if (id.startsWith('shipping-')) {
        markShippingNotificationRead(id);
        setShippingRows(readShippingNotifications() as NotificationRow[]);
        setFeedback(tx('Notification marked as read.'));
        return;
      }
      try {
        await apiPatch(`/notifications/${encodeURIComponent(id)}/read`, {});
        setServerRows((current) => current.map((row) => (
          formatText(row.id, '') === id ? { ...row, isRead: true } : row
        )));
        setFeedback(tx('Notification marked as read.'));
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : tx('Unable to mark notification as read.'));
      }
    });
  }

  function markAllRead() {
    startTransition(async () => {
      markAllShippingNotificationsRead();
      setShippingRows(readShippingNotifications() as NotificationRow[]);
      try {
        const updated = await apiPatch<NotificationRow[]>('/notifications/read-all', {});
        setServerRows(Array.isArray(updated) ? updated : serverRows.map((row) => ({ ...row, isRead: true })));
        setFeedback(tx('All notifications marked as read.'));
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : tx('Unable to mark all notifications as read.'));
      }
    });
  }

  return (
    <main className="shell">
      <div className="panel workspace-shell">
        <section className="workspace-header">
          <div className="workspace-header-copy">
            <div className="eyebrow">{tx('Notification Center')}</div>
            <h1>{tx('Notifications')}</h1>
            <p>Review operational, finance, HR, maintenance, agreements, and compliance alerts with clear status and linked actions.</p>
          </div>
        </section>

        <section className="workspace-kpi-grid">
          <KpiCard label={tx('Total')} value={rows.length} helper={tx('Notifications loaded in the queue')} />
          <KpiCard label={tx('Unread')} value={unreadCount} helper={tx('Still requiring user attention')} tone={unreadCount ? 'warning' : 'good'} />
          <KpiCard label={tx('Critical')} value={criticalCount} helper={tx('Highest severity support items')} tone={criticalCount ? 'critical' : 'good'} />
          <KpiCard label={tx('Today')} value={todayCount} helper={tx('Notifications generated today')} />
          <KpiCard label={tx('Driver Alerts')} value={driverCount} helper={tx('Trip and field activity related alerts')} />
          <KpiCard label={tx('Finance Alerts')} value={financeCount} helper={tx('Invoices, collections, and payment items')} />
          <KpiCard label={tx('Action Queue')} value={actionQueueCount} helper={tx('Unread high-priority follow-up')} tone={actionQueueCount ? 'warning' : 'good'} />
        </section>

        <WorkspaceFilterBar
          fields={[
            { key: 'search', label: 'Search', type: 'search', value: search, placeholder: 'Title, linked entity, category', onChange: setSearch },
            {
              key: 'readState',
              label: 'Read State',
              type: 'select',
              value: readState,
              onChange: setReadState,
              options: [
                { value: 'all', label: 'All notifications' },
                { value: 'unread', label: 'Unread' },
                { value: 'read', label: 'Read' },
              ],
            },
            {
              key: 'severity',
              label: 'Severity',
              type: 'select',
              value: severity,
              onChange: setSeverity,
              options: [{ value: 'all', label: 'All severities' }, ...severityOptions],
            },
            {
              key: 'category',
              label: 'Category',
              type: 'select',
              value: category,
              onChange: setCategory,
              options: [{ value: 'all', label: 'All categories' }, ...categoryOptions],
            },
            {
              key: 'branch',
              label: 'Branch',
              type: 'select',
              value: branch,
              onChange: setBranch,
              options: [{ value: 'all', label: 'All branches' }, ...branchOptions],
            },
            { key: 'dateFrom', label: 'Date From', type: 'date', value: dateFrom, onChange: setDateFrom },
          ]}
          secondaryActions={(
            <button type="button" className="btn btn-secondary" disabled={pending || !unreadCount} onClick={markAllRead}>
              {pending ? tx('Updating...') : tx('Mark all read')}
            </button>
          )}
        />

        <section className="card workspace-table-card">
          <div className="workspace-section-header">
            <div>
              <div className="eyebrow">{tx('Alert Queue')}</div>
              <h3>{filtered.length} {tx('Notifications').toLowerCase()}</h3>
            </div>
          </div>
          {!filtered.length ? (
            <div className="empty-state inline-state-card"><p>{tx('No notifications match the current filters.')}</p></div>
          ) : (
            <div className="table-shell">
              <table className="data-table workspace-data-table">
                <thead>
                  <tr>
                    <th>{tx('Notification')}</th>
                    <th>{tx('Category')}</th>
                    <th>{tx('Severity')}</th>
                    <th>{tx('Branch')}</th>
                    <th>{tx('Timestamp')}</th>
                    <th>{tx('Status')}</th>
                    <th>{tx('Linked Entity')}</th>
                    <th>{tx('Action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const rowId = formatText(row.id, formatText(row.title, 'notification-row'));
                    const linked = row.linkedEntity as Record<string, unknown> | null;
                    return (
                      <tr key={rowId} onClick={() => setSelectedId(formatText(row.id, ''))} style={{ cursor: 'pointer' }}>
                        <td>
                          <div className="workspace-cell-stack">
                            <strong>{formatText(row.title, 'System update')}</strong>
                            <span>{formatText(row.secondaryText, 'Review and follow up')}</span>
                          </div>
                        </td>
                        <td>{tx(humanize(formatText(row.category, 'operations')))}</td>
                        <td><span className={`status-badge ${toneForSeverity(formatText(row.severity, 'info'))}`}>{tx(humanize(formatText(row.severity, 'info')))}</span></td>
                        <td>{formatText(row.branch, 'All branches')}</td>
                        <td>{formatDateTime(row.timestamp)}</td>
                        <td><span className={`status-badge ${row.isRead === true ? 'good' : 'warning'}`}>{row.isRead === true ? tx('Read') : tx('Unread')}</span></td>
                        <td>{formatText(linked?.label, tx('Related record'))}</td>
                        <td>{tx(formatText(row.actionLabel, 'Open detail'))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {feedback ? <div className="label" style={{ marginTop: 12 }}>{feedback}</div> : null}
        </section>
      </div>

      {selected ? (
        <WorkspaceDetailDrawer
          title={formatText(selected.title, 'System update')}
          subtitle={`${tx(humanize(formatText(selected.category, 'operations')))} · ${tx(rowState(selected))}`}
          onClose={() => setSelectedId(null)}
          actions={selected.isRead === true ? null : (
            <button
              type="button"
              className="btn btn-secondary btn-compact"
              disabled={pending}
              onClick={() => markOneRead(formatText(selected.id, ''))}
            >
              {pending ? tx('Updating...') : tx('Mark read')}
            </button>
          )}
        >
          <section className="workspace-metric-pair-grid">
            <MetricPair label="Category" value={tx(humanize(formatText(selected.category, 'operations')))} />
            <MetricPair label="Severity" value={tx(humanize(formatText(selected.severity, 'info')))} />
            <MetricPair label="Branch" value={formatText(selected.branch, 'All branches')} />
            <MetricPair label="Timestamp" value={formatDateTime(selected.timestamp)} />
            <MetricPair label="Status" value={tx(rowState(selected))} />
            <MetricPair label="Action label" value={tx(formatText(selected.actionLabel, 'Open detail'))} />
          </section>

          <section className="card workspace-detail-card">
            <div className="workspace-section-header">
              <div>
                <div className="eyebrow">Notification Detail</div>
                <h3>Context and follow-up</h3>
              </div>
            </div>
            <div className="workspace-detail-list">
              <div className="workspace-detail-row">
                <div className="workspace-cell-stack">
                  <strong>Summary</strong>
                  <span>{formatText(selected.secondaryText, 'Review and follow up.')}</span>
                </div>
                <span className={`status-badge ${toneForSeverity(formatText(selected.severity, 'info'))}`}>{tx(humanize(formatText(selected.severity, 'info')))}</span>
              </div>
              <div className="workspace-detail-row">
                <div className="workspace-cell-stack">
                  <strong>Linked record</strong>
                  <span>{formatText((selected.linkedEntity as Record<string, unknown> | null)?.label, 'Related record')}</span>
                </div>
                {selectedTarget ? (
                  <Link className="btn btn-secondary btn-compact" href={selectedTarget.href}>
                    {selectedTarget.label}
                  </Link>
                ) : (
                  <span className="label">No linked page</span>
                )}
              </div>
              <div className="workspace-detail-row">
                <div className="workspace-cell-stack">
                  <strong>Entity type</strong>
                  <span>{tx(humanize(formatText(selected.entityType, 'system')))}</span>
                </div>
                <span className="label">{formatText(selected.entityId, 'No record ID')}</span>
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
  if (normalized === 'read') return 'good';
  return 'info';
}

function rowState(row: NotificationRow) {
  return row.isRead === true ? 'Read' : 'Unread';
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
