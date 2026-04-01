'use client';

import Link from 'next/link';
import { toArray, toObject, toStringValue } from '../lib/normalize';
import type { LaunchStatus, LaunchTrack, LaunchWorkspace } from './launch-center-runtime';

type LaunchItem = LaunchWorkspace['items'][number];
type LaunchHistory = NonNullable<LaunchWorkspace['history']>[number];

const emptyWorkspace: LaunchWorkspace = { items: [], history: [] };

export function LaunchReportRuntime({ workspace }: { workspace: LaunchWorkspace | null }) {
  const safeWorkspace = toObject(workspace, emptyWorkspace);
  const items = toArray<LaunchItem>(safeWorkspace.items).map(normalizeItem);
  const history = toArray<LaunchHistory>(safeWorkspace.history).map(normalizeHistory);

  const blockedItems = items.filter((item) => item.status === 'blocked');
  const watchItems = items.filter((item) => item.status === 'watch');
  const readyItems = items.filter((item) => item.status === 'ready');
  const inProgressItems = items.filter((item) => item.status === 'in_progress');
  const byTrack: LaunchTrack[] = ['go_live', 'soft_launch', 'daily_review', 'weekly_improvement', 'full_rollout'];

  function exportCsv() {
    const rows = [
      ['track', 'title', 'status', 'owner', 'branch', 'due_date', 'last_updated_by', 'updated_at', 'notes'],
      ...items.map((item) => [
        item.track,
        item.title,
        item.status,
        item.owner,
        item.branch,
        item.dueDate,
        item.lastUpdatedBy,
        item.updatedAt,
        item.notes,
      ]),
    ];
    const csv = rows
      .map((row) => row.map((value) => `"${String(value || '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'tikur-abay-launch-report.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="shell">
      <div className="panel workspace-shell">
        <section className="workspace-header">
          <div className="workspace-header-copy">
            <h1>Launch Report</h1>
          </div>
          <div className="workspace-filter-actions">
            <button type="button" className="btn btn-secondary btn-compact" onClick={exportCsv}>Export CSV</button>
            <button type="button" className="btn btn-secondary btn-compact" onClick={() => window.print()}>Print</button>
            <Link className="btn btn-secondary btn-compact" href="/settings/launch">Open launch center</Link>
          </div>
        </section>

        <section className="workspace-kpi-grid">
          <ReportKpi label="Ready" value={readyItems.length} helper="Checks ready for execution" tone="good" />
          <ReportKpi label="In Progress" value={inProgressItems.length} helper="Currently being worked" />
          <ReportKpi label="Watch Items" value={watchItems.length} helper="Needs close monitoring" tone="warning" />
          <ReportKpi label="Blocked" value={blockedItems.length} helper="Executive or owner action needed" tone="critical" />
          <ReportKpi label="Recent Updates" value={history.length} helper="Tracked launch changes" />
        </section>

        <section className="card workspace-detail-card">
          <div className="workspace-section-header">
            <div>
              <div className="eyebrow">Read-Only Summary</div>
              <h3>Launch report access</h3>
            </div>
          </div>
          <div className="workspace-detail-list">
            <ReportRow
              title="This page is read-only"
              subtitle="Use it for leadership review, branch follow-up, and rollout reporting."
              meta="No checklist edits here"
            />
            <ReportRow
              title="Checklist changes happen in Launch Center"
              subtitle="Authorized launch owners update status and notes in Launch Center."
              meta="Open /settings/launch if your role has edit access"
            />
          </div>
        </section>

        <section className="workspace-split-grid">
          <section className="card workspace-detail-card">
            <div className="workspace-section-header">
              <div>
                <div className="eyebrow">Track Summary</div>
                <h3>Readiness by workstream</h3>
              </div>
            </div>
            <div className="table-shell">
              <table className="data-table workspace-data-table">
                <thead>
                  <tr>
                    <th>Track</th>
                    <th>Ready</th>
                    <th>In Progress</th>
                    <th>Watch</th>
                    <th>Blocked</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {byTrack.map((track) => {
                    const rows = items.filter((item) => item.track === track);
                    return (
                      <tr key={track}>
                        <td>{labelize(track)}</td>
                        <td>{rows.filter((item) => item.status === 'ready').length}</td>
                        <td>{rows.filter((item) => item.status === 'in_progress').length}</td>
                        <td>{rows.filter((item) => item.status === 'watch').length}</td>
                        <td>{rows.filter((item) => item.status === 'blocked').length}</td>
                        <td>{rows.length}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card workspace-detail-card">
            <div className="workspace-section-header">
              <div>
                <div className="eyebrow">Blockers</div>
                <h3>Immediate launch risks</h3>
              </div>
            </div>
            <div className="workspace-detail-list">
              {blockedItems.length ? blockedItems.map((item) => (
                <ReportRow
                  key={item.id}
                  title={item.title}
                  subtitle={`${item.owner} · ${item.branch}`}
                  meta={`${item.dueDate} · ${item.notes || 'No blocker note added'}`}
                />
              )) : <ReportRow title="No blocked launch items" subtitle="Current launch blockers are clear." meta="Continue with watch items" />}
            </div>
          </section>
        </section>

        <section className="workspace-split-grid">
          <section className="card workspace-detail-card">
            <div className="workspace-section-header">
              <div>
                <div className="eyebrow">Owner Actions</div>
                <h3>In-progress work</h3>
              </div>
            </div>
            <div className="workspace-detail-list">
              {items.filter((item) => item.status === 'in_progress' || item.status === 'watch').map((item) => (
                <ReportRow
                  key={item.id}
                  title={item.title}
                  subtitle={`${item.owner} · ${labelize(item.track)}`}
                  meta={`${item.actionLabel} · ${item.lastUpdatedBy || item.owner}`}
                />
              ))}
            </div>
          </section>

          <section className="card workspace-detail-card">
            <div className="workspace-section-header">
              <div>
                <div className="eyebrow">Recent Changes</div>
                <h3>Launch activity history</h3>
              </div>
            </div>
            <div className="workspace-detail-list">
              {history.length ? history.slice(0, 10).map((item) => (
                <ReportRow
                  key={item.id}
                  title={item.title}
                  subtitle={item.description}
                  meta={`${item.userName} · ${formatDateTime(item.createdAt)}`}
                />
              )) : <ReportRow title="No launch history yet" subtitle="Status and notes updates will appear here." meta="Launch center activity" />}
            </div>
          </section>
        </section>

        <section className="card workspace-table-card">
          <div className="workspace-section-header">
            <div>
              <div className="eyebrow">Full Report</div>
              <h3>Launch checklist register</h3>
            </div>
          </div>
          <div className="table-shell">
            <table className="data-table workspace-data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Track</th>
                  <th>Status</th>
                  <th>Owner</th>
                  <th>Branch</th>
                  <th>Due</th>
                  <th>Last Updated By</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="workspace-cell-stack">
                        <strong>{item.title}</strong>
                        <span>{item.summary}</span>
                      </div>
                    </td>
                    <td>{labelize(item.track)}</td>
                    <td><span className={`status-badge ${toneForStatus(item.status)}`}>{labelize(item.status)}</span></td>
                    <td>{item.owner}</td>
                    <td>{item.branch}</td>
                    <td>{item.dueDate}</td>
                    <td>{item.lastUpdatedBy || item.owner}</td>
                    <td>{item.notes || 'No note added'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function normalizeItem(item: Partial<LaunchItem>): LaunchItem {
  return {
    id: toStringValue(item.id, 'launch-item'),
    code: toStringValue(item.code, 'launch-item'),
    title: toStringValue(item.title, 'Launch item'),
    track: toStringValue(item.track, 'go_live') as LaunchTrack,
    owner: toStringValue(item.owner, 'Launch owner'),
    audience: toStringValue(item.audience, 'all staff'),
    branch: toStringValue(item.branch, 'HQ'),
    dueDate: toStringValue(item.dueDate, 'TBD'),
    status: toStringValue(item.status, 'scheduled') as LaunchStatus,
    actionLabel: toStringValue(item.actionLabel, 'Open'),
    summary: toStringValue(item.summary, 'Launch detail not set.'),
    checklist: toArray<string>(item.checklist).map((entry) => toStringValue(entry, 'Checklist step')),
    notes: toStringValue(item.notes, ''),
    lastUpdatedBy: toStringValue(item.lastUpdatedBy, ''),
    lastUpdatedByRole: toStringValue(item.lastUpdatedByRole, ''),
    updatedAt: item.updatedAt || null,
  };
}

function normalizeHistory(item: Partial<LaunchHistory>): LaunchHistory {
  return {
    id: toStringValue(item.id, 'history-item'),
    title: toStringValue(item.title, 'Launch update'),
    description: toStringValue(item.description, 'No detail'),
    userName: toStringValue(item.userName, 'System'),
    action: toStringValue(item.action, 'updated'),
    createdAt: item.createdAt || null,
  };
}

function ReportKpi({ label, value, helper, tone = 'info' }: { label: string; value: number; helper: string; tone?: string }) {
  return (
    <section className="card workspace-kpi-card">
      <div className="eyebrow">{label}</div>
      <div className={`kpi-value ${tone}`}>{value}</div>
      <div className="label">{helper}</div>
    </section>
  );
}

function ReportRow({ title, subtitle, meta }: { title: string; subtitle: string; meta: string }) {
  return (
    <div className="workspace-detail-row">
      <div className="workspace-cell-stack">
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
      <div className="label">{meta}</div>
    </div>
  );
}

function labelize(value: string) {
  return value.replace(/_/g, ' ');
}

function toneForStatus(value: string) {
  if (value === 'blocked') return 'critical';
  if (value === 'watch' || value === 'scheduled') return 'warning';
  if (value === 'ready') return 'good';
  return 'info';
}

function formatDateTime(value: string | null) {
  return value ? new Date(value).toLocaleString() : 'Not updated yet';
}
