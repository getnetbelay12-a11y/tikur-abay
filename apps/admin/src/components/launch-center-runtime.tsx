'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { apiPatch } from '../lib/api';
import { toArray, toObject, toStringValue } from '../lib/normalize';
import { useConsoleI18n } from '../lib/use-console-i18n';
import { WorkspaceDetailDrawer } from './workspace-detail-drawer';
import { WorkspaceFilterBar } from './workspace-filter-bar';

export type LaunchTrack = 'go_live' | 'soft_launch' | 'daily_review' | 'weekly_improvement' | 'full_rollout';
export type LaunchStatus = 'ready' | 'scheduled' | 'in_progress' | 'watch' | 'blocked';

type LaunchItem = {
  id: string;
  code: string;
  title: string;
  track: LaunchTrack;
  owner: string;
  audience: string;
  branch: string;
  dueDate: string;
  status: LaunchStatus;
  actionLabel: string;
  summary: string;
  checklist: string[];
  notes: string;
  lastUpdatedBy?: string;
  lastUpdatedByRole?: string;
  updatedAt: string | null;
};

export type LaunchWorkspace = {
  items: LaunchItem[];
  history?: Array<{ id: string; title: string; description: string; userName: string; action: string; createdAt: string | null }>;
};

const launchItems: LaunchItem[] = [
  {
    id: 'go-live-users',
    code: 'go-live-users',
    title: 'Real users and branch roster verified',
    track: 'go_live',
    owner: 'HR and branch admins',
    audience: 'executive, operations, finance',
    branch: 'HQ and Bole',
    dueDate: '2026-03-18',
    status: 'in_progress',
    actionLabel: 'Verify roster',
    summary: 'Confirm live staff accounts, active branches, and assigned roles before production access.',
    checklist: ['Validate real user list per branch.', 'Confirm each branch has dispatcher, finance, and approver coverage.', 'Remove expired demo-only accounts from production candidates.'],
    notes: 'Bole finance and dispatcher roster still needs final sign-off.',
    updatedAt: '2026-03-14T08:00:00.000Z',
  },
  {
    id: 'go-live-permissions',
    code: 'go-live-permissions',
    title: 'Role permissions and notification channels',
    track: 'go_live',
    owner: 'Platform admin',
    audience: 'all staff',
    branch: 'All launch branches',
    dueDate: '2026-03-18',
    status: 'ready',
    actionLabel: 'Audit access',
    summary: 'Permission matrix, SMS/email escalation channels, and branch-scoped access must be checked together.',
    checklist: ['Run role-permission audit for executive, operations, finance, HR, customer, and driver roles.', 'Verify urgent operational alerts send to the correct channel.', 'Confirm branch-limited roles cannot open out-of-scope records.'],
    notes: 'Initial audit passed for HQ and Adama.',
    updatedAt: '2026-03-14T08:30:00.000Z',
  },
  {
    id: 'go-live-payments',
    code: 'go-live-payments',
    title: 'Signing flow, payment flow, backups, and monitoring',
    track: 'go_live',
    owner: 'Finance and engineering',
    audience: 'finance, customer desk',
    branch: 'HQ',
    dueDate: '2026-03-19',
    status: 'watch',
    actionLabel: 'Run verification',
    summary: 'Production sign-off requires agreement signing, receipts, backups, monitoring, and error tracking to be verified as one release gate.',
    checklist: ['Run end-to-end agreement signing test.', 'Run payment posting and receipt visibility test.', 'Verify backup schedule and restore runbook.', 'Confirm monitoring and error tracking dashboards are live.'],
    notes: 'Receipt rendering is good. Restore drill still pending.',
    updatedAt: '2026-03-14T09:00:00.000Z',
  },
  {
    id: 'soft-launch-branches',
    code: 'soft-launch-branches',
    title: 'Limited branch and user cohort',
    track: 'soft_launch',
    owner: 'Operations manager',
    audience: 'operations, dispatcher',
    branch: 'HQ and Adama',
    dueDate: '2026-03-20',
    status: 'scheduled',
    actionLabel: 'Open plan',
    summary: 'Soft launch uses only the first two branches with limited drivers and customer accounts.',
    checklist: ['Enable only HQ and Adama.', 'Limit to named dispatcher and finance users.', 'Limit customer accounts to pilot customers only.'],
    notes: 'Pilot customer list drafted and waiting for finance confirmation.',
    updatedAt: '2026-03-14T09:20:00.000Z',
  },
  {
    id: 'soft-launch-review',
    code: 'soft-launch-review',
    title: 'Issue log and daily review cadence',
    track: 'soft_launch',
    owner: 'Program lead',
    audience: 'executive, operations, engineering',
    branch: 'Pilot branches',
    dueDate: '2026-03-20',
    status: 'ready',
    actionLabel: 'Open issue log',
    summary: 'Every pilot day closes with issue review, owner assignment, and next-day readiness confirmation.',
    checklist: ['Capture issue severity and owner daily.', 'Hold 30-minute end-of-day review.', 'Publish next-day release or workaround plan.'],
    notes: 'Daily review invite and issue log template are ready.',
    updatedAt: '2026-03-14T09:40:00.000Z',
  },
  {
    id: 'daily-delays',
    code: 'daily-delays',
    title: 'Daily delayed trip and blocked vehicle review',
    track: 'daily_review',
    owner: 'Operations control room',
    audience: 'operations, dispatcher',
    branch: 'All active branches',
    dueDate: 'Every day 08:00',
    status: 'ready',
    actionLabel: 'Open operations hub',
    summary: 'Operations starts every day by reviewing delayed trips, blocked vehicles, and overdue maintenance together.',
    checklist: ['Open delayed trips.', 'Open blocked vehicles.', 'Open overdue maintenance.', 'Confirm dispatch follow-up owners.'],
    notes: 'Morning control-room review is part of pilot kickoff.',
    updatedAt: '2026-03-14T10:00:00.000Z',
  },
  {
    id: 'daily-commercial',
    code: 'daily-commercial',
    title: 'Daily failed payments and unsigned agreement review',
    track: 'daily_review',
    owner: 'Finance and commercial desk',
    audience: 'finance, marketing, customer desk',
    branch: 'HQ',
    dueDate: 'Every day 09:00',
    status: 'ready',
    actionLabel: 'Open finance console',
    summary: 'Finance and commercial teams review failed payments, unsigned agreements, and complaints before midday.',
    checklist: ['Check failed payments.', 'Check outstanding invoices.', 'Check unsigned agreements.', 'Escalate customer complaints.'],
    notes: 'Collections queue is the primary commercial handoff.',
    updatedAt: '2026-03-14T10:10:00.000Z',
  },
  {
    id: 'daily-compliance',
    code: 'daily-compliance',
    title: 'Daily KYC, failed uploads, and support complaints',
    track: 'daily_review',
    owner: 'HR and support desk',
    audience: 'HR, support',
    branch: 'All active branches',
    dueDate: 'Every day 11:00',
    status: 'watch',
    actionLabel: 'Open HR console',
    summary: 'Compliance-sensitive issues must be checked daily during the pilot period.',
    checklist: ['Review KYC queue.', 'Review failed uploads.', 'Review user complaints and reopen blocked cases.'],
    notes: 'Driver KYC backlog needs one more reviewer during launch week.',
    updatedAt: '2026-03-14T10:20:00.000Z',
  },
  {
    id: 'weekly-triage',
    code: 'weekly-triage',
    title: 'Weekly issue triage and fix priority',
    track: 'weekly_improvement',
    owner: 'Product and engineering',
    audience: 'executive, operations, engineering',
    branch: 'HQ',
    dueDate: 'Every Friday',
    status: 'scheduled',
    actionLabel: 'Open workflow',
    summary: 'Each week closes with issue triage, priority assignment, and release scope lock.',
    checklist: ['Sort issues by severity and user impact.', 'Mark pilot blockers for immediate release.', 'Defer non-blockers with owner and target week.'],
    notes: 'Friday release cutoff is 15:00 Addis time.',
    updatedAt: '2026-03-14T10:30:00.000Z',
  },
  {
    id: 'weekly-release',
    code: 'weekly-release',
    title: 'Release notes and admin feedback capture',
    track: 'weekly_improvement',
    owner: 'Program lead',
    audience: 'all pilot admins',
    branch: 'Pilot branches',
    dueDate: 'Every Friday',
    status: 'in_progress',
    actionLabel: 'Export feedback',
    summary: 'Feedback from operations, finance, and HR is converted into release notes and tracked improvements.',
    checklist: ['Export the feedback template.', 'Collect admin notes from each pilot role.', 'Publish release notes for next week.'],
    notes: 'Release note template is ready; admin feedback export runs locally.',
    updatedAt: '2026-03-14T10:40:00.000Z',
  },
  {
    id: 'rollout-branches',
    code: 'rollout-branches',
    title: 'All branches enabled and staff trained',
    track: 'full_rollout',
    owner: 'Executive sponsor',
    audience: 'all staff',
    branch: 'Nationwide',
    dueDate: '2026-04-03',
    status: 'blocked',
    actionLabel: 'Review blocker',
    summary: 'Full rollout stays blocked until branch enablement, staff training, and permissions are complete.',
    checklist: ['Confirm branch cutover schedule.', 'Confirm all staff training attendance.', 'Confirm all branch role assignments.'],
    notes: 'Nazret training session has not been completed yet.',
    updatedAt: '2026-03-14T10:50:00.000Z',
  },
  {
    id: 'rollout-drivers',
    code: 'rollout-drivers',
    title: 'All drivers and customer accounts ready',
    track: 'full_rollout',
    owner: 'Operations and customer success',
    audience: 'drivers, customers',
    branch: 'Nationwide',
    dueDate: '2026-04-03',
    status: 'watch',
    actionLabel: 'Open readiness',
    summary: 'Before nationwide enablement, drivers must be onboarded and customer accounts must be validated.',
    checklist: ['Approve final driver onboarding queue.', 'Verify customer account contacts and agreements.', 'Recheck final permissions for driver and customer self-service flows.'],
    notes: 'Driver onboarding is ahead of customer agreement validation.',
    updatedAt: '2026-03-14T11:00:00.000Z',
  },
];

const trackLinks: Record<LaunchTrack, { title: string; href: string }> = {
  go_live: { title: 'User access and settings', href: '/users' },
  soft_launch: { title: 'Operations Hub', href: '/operations' },
  daily_review: { title: 'Finance and HR review', href: '/finance' },
  weekly_improvement: { title: 'System settings', href: '/settings' },
  full_rollout: { title: 'Profile and access review', href: '/profile' },
};

const emptyWorkspace: LaunchWorkspace = { items: [] };

export function LaunchCenterRuntime({ workspace }: { workspace: LaunchWorkspace | null }) {
  const { tx } = useConsoleI18n();
  const safeWorkspace = toObject(workspace, emptyWorkspace);
  const [items, setItems] = useState<LaunchItem[]>(() => {
    const rows = toArray<LaunchItem>(safeWorkspace.items).map(normalizeItem);
    return rows.length ? rows : launchItems.map(normalizeItem);
  });
  const history = toArray<{ id: string; title: string; description: string; userName: string; action: string; createdAt: string | null }>(safeWorkspace.history);
  const [trackFilter, setTrackFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftNotes, setDraftNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const haystack = `${item.title} ${item.owner} ${item.audience} ${item.branch} ${item.summary}`.toLowerCase();
      if (search && !haystack.includes(search.toLowerCase())) return false;
      if (trackFilter !== 'all' && item.track !== trackFilter) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (ownerFilter !== 'all' && item.owner !== ownerFilter) return false;
      return true;
    });
  }, [ownerFilter, search, statusFilter, trackFilter]);

  const selected = items.find((item) => item.id === selectedId) || null;
  const readyCount = items.filter((item) => item.status === 'ready').length;
  const activePilotCount = items.filter((item) => item.track === 'soft_launch').length;
  const dailyChecks = items.filter((item) => item.track === 'daily_review').length;
  const blockedCount = items.filter((item) => item.status === 'blocked').length;
  const weeklyChanges = items.filter((item) => item.track === 'weekly_improvement').length;

  async function saveItem(code: string, payload: { status?: LaunchStatus; notes?: string }) {
    setIsSaving(true);
    setSaveMessage('');
    try {
      const updated = normalizeItem(await apiPatch<LaunchItem>(`/launch-center/${code}`, payload));
      setItems((current) => current.map((item) => (item.code === code ? updated : item)));
      setDraftNotes(updated.notes);
      setSaveMessage(tx('Launch item updated.'));
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : tx('Unable to update launch item.'));
    } finally {
      setIsSaving(false);
    }
  }

  function openItem(id: string) {
    const item = items.find((entry) => entry.id === id);
    setSelectedId(id);
    setDraftNotes(item?.notes || '');
    setSaveMessage('');
  }

  return (
    <main className="shell">
      <div className="panel workspace-shell">
        <section className="workspace-header">
          <div className="workspace-header-copy">
            <h1>{tx('Launch Center')}</h1>
          </div>
          <div className="workspace-filter-actions">
            <Link className="btn btn-secondary btn-compact" href="/settings">{tx('Open settings')}</Link>
            <Link className="btn btn-secondary btn-compact" href="/settings/launch/report">{tx('Open report')}</Link>
            <a className="btn btn-secondary btn-compact" href="/reports/uat-feedback-template.csv">{tx('Export feedback template')}</a>
          </div>
        </section>

        <section className="workspace-kpi-grid">
          <KpiCard label={tx('Launch Checks Ready')} value={readyCount} helper={tx('Items ready to execute')} tone="good" />
          <KpiCard label={tx('Soft Launch Tracks')} value={activePilotCount} helper={tx('Pilot cohorts and issue review')} />
          <KpiCard label={tx('Daily Review Tracks')} value={dailyChecks} helper={tx('Daily launch monitoring')} />
          <KpiCard label={tx('Weekly Improvement Tracks')} value={weeklyChanges} helper={tx('Release planning workflow')} />
          <KpiCard label={tx('Rollout Blockers')} value={blockedCount} helper={tx('Needs executive decision')} tone="critical" />
        </section>

        <WorkspaceFilterBar
          fields={[
            { key: 'search', label: 'Search', type: 'search', value: search, placeholder: 'Checklist, owner, branch, role', onChange: setSearch },
            { key: 'track', label: 'Track', type: 'select', value: trackFilter, onChange: setTrackFilter, options: [{ value: 'all', label: 'All tracks' }, ...uniqueOptions(items.map((item) => item.track))] },
            { key: 'status', label: 'Status', type: 'select', value: statusFilter, onChange: setStatusFilter, options: [{ value: 'all', label: 'All statuses' }, ...uniqueOptions(items.map((item) => item.status))] },
            { key: 'owner', label: 'Owner', type: 'select', value: ownerFilter, onChange: setOwnerFilter, options: [{ value: 'all', label: 'All owners' }, ...uniqueOptions(items.map((item) => item.owner))] },
          ]}
          secondaryActions={
            <>
              <Link className="btn btn-secondary btn-compact" href="/operations">{tx('Operations Hub')}</Link>
              <Link className="btn btn-secondary btn-compact" href="/finance">{tx('Finance Console')}</Link>
              <Link className="btn btn-secondary btn-compact" href="/hr">{tx('HR Console')}</Link>
            </>
          }
        />

        <section className="card workspace-table-card">
          <div className="workspace-section-header">
            <div>
              <div className="eyebrow">Launch Checklist</div>
              <h3>Execution tracker</h3>
            </div>
          </div>
          {!filteredItems.length ? (
            <div className="empty-state inline-state-card"><p>No launch items match the current filters.</p></div>
          ) : (
            <div className="table-shell">
              <table className="data-table workspace-data-table">
                <thead>
                  <tr>
                    <th>Checklist Item</th>
                    <th>Track</th>
                    <th>Owner</th>
                    <th>Audience</th>
                    <th>Branch</th>
                    <th>Due</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.id} onClick={() => openItem(item.id)} style={{ cursor: 'pointer' }}>
                      <td>
                        <div className="workspace-cell-stack">
                          <strong>{item.title}</strong>
                          <span>{item.summary}</span>
                        </div>
                      </td>
                      <td>{labelize(item.track)}</td>
                      <td>{item.owner}</td>
                      <td>{labelize(item.audience)}</td>
                      <td>{item.branch}</td>
                      <td>{item.dueDate}</td>
                      <td><span className={`status-badge ${toneForStatus(item.status)}`}>{labelize(item.status)}</span></td>
                      <td><span className="inline-action">{item.actionLabel}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="workspace-split-grid">
          <TrackPanel
            eyebrow="Soft Launch"
            title="Pilot rollout controls"
            items={items.filter((item) => item.track === 'soft_launch')}
            onSelect={openItem}
          />
          <TrackPanel
            eyebrow="Daily Review"
            title="Operational review cadence"
            items={items.filter((item) => item.track === 'daily_review')}
            onSelect={openItem}
          />
          <TrackPanel
            eyebrow="Weekly Improvement"
            title="Triage and release workflow"
            items={items.filter((item) => item.track === 'weekly_improvement')}
            onSelect={openItem}
          />
        </section>

        <section className="workspace-split-grid">
          <TrackPanel
            eyebrow="Full Rollout"
            title="Nationwide enablement gates"
            items={items.filter((item) => item.track === 'full_rollout')}
            onSelect={openItem}
          />
          <section className="card workspace-detail-card">
            <div className="workspace-section-header">
              <div>
                <div className="eyebrow">Launch History</div>
                <h3>Recent checklist updates</h3>
              </div>
            </div>
            <div className="workspace-detail-list">
              {history.length ? history.slice(0, 6).map((item) => (
                <DrawerRow key={item.id} title={item.title} subtitle={item.description} meta={`${item.userName} · ${formatDateTime(item.createdAt)}`} />
              )) : (
                <>
                  <DrawerRow title="Go-live gate" subtitle="Permissions, notifications, signing, payments, backups, monitoring, and error tracking must all be verified together." meta="Executive sign-off" />
                  <DrawerRow title="Soft launch scope" subtitle="Pilot only HQ and Adama with limited drivers and customer accounts." meta="Controlled rollout" />
                  <DrawerRow title="Daily launch review" subtitle="Operations, finance, HR, and support check exceptions before midday." meta="Under 30 minutes" />
                </>
              )}
            </div>
          </section>
        </section>
      </div>

      {selected ? (
        <WorkspaceDetailDrawer
          title={selected.title}
          subtitle={`${labelize(selected.track)} · ${selected.owner} · ${selected.branch}`}
          onClose={() => setSelectedId(null)}
          actions={
            <Link className="btn btn-secondary btn-compact" href={trackLinks[selected.track].href}>
              Open {trackLinks[selected.track].title}
            </Link>
          }
        >
          <section className="workspace-metric-pair-grid">
            <MetricPair label="Status" value={labelize(selected.status)} />
            <MetricPair label="Owner" value={selected.owner} />
            <MetricPair label="Audience" value={labelize(selected.audience)} />
            <MetricPair label="Due" value={selected.dueDate} />
          </section>

          <DrawerSection title="Execution summary">
            <DrawerRow title="What needs to happen" subtitle={selected.summary} meta={selected.actionLabel} />
            <DrawerRow title="Branch scope" subtitle={selected.branch} meta={trackLinks[selected.track].title} />
            <DrawerRow title="Last changed by" subtitle={selected.lastUpdatedBy || 'Launch owner'} meta={labelize(selected.lastUpdatedByRole || 'system')} />
          </DrawerSection>

          <DrawerSection title="Checklist">
            {selected.checklist.map((item, index) => (
              <DrawerRow key={`${selected.id}-${index}`} title={`Step ${index + 1}`} subtitle={item} meta={selected.owner} />
            ))}
          </DrawerSection>

          <DrawerSection title="Update launch item">
            <div className="workspace-launch-actions">
              <button type="button" className="btn btn-secondary btn-compact" disabled={isSaving} onClick={() => saveItem(selected.code, { status: 'ready' })}>Mark Ready</button>
              <button type="button" className="btn btn-secondary btn-compact" disabled={isSaving} onClick={() => saveItem(selected.code, { status: 'in_progress' })}>Mark In Progress</button>
              <button type="button" className="btn btn-secondary btn-compact" disabled={isSaving} onClick={() => saveItem(selected.code, { status: 'blocked' })}>Mark Blocked</button>
            </div>
            <label className="workspace-filter-field">
              <span>Launch notes</span>
              <textarea
                className="workspace-notes-input"
                value={draftNotes}
                onChange={(event) => {
                  setDraftNotes(event.target.value);
                  setSaveMessage('');
                }}
                placeholder="Add operational notes, blockers, or sign-off detail"
              />
            </label>
            <div className="workspace-filter-actions">
              <button type="button" className="btn btn-primary btn-compact" disabled={isSaving} onClick={() => saveItem(selected.code, { notes: draftNotes })}>
                Save Notes
              </button>
            </div>
            <DrawerRow title="Last updated" subtitle={formatDateTime(selected.updatedAt)} meta={saveMessage || 'Persisted in launch center'} />
          </DrawerSection>
        </WorkspaceDetailDrawer>
      ) : null}
    </main>
  );
}

function normalizeItem(item: Partial<LaunchItem>): LaunchItem {
  return {
    id: toStringValue(item.id, toStringValue(item.code, 'launch-item')),
    code: toStringValue(item.code, toStringValue(item.id, 'launch-item')),
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

function TrackPanel({
  eyebrow,
  title,
  items,
  onSelect,
}: {
  eyebrow: string;
  title: string;
  items: LaunchItem[];
  onSelect: (id: string) => void;
}) {
  return (
    <section className="card workspace-detail-card">
      <div className="workspace-section-header">
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h3>{title}</h3>
        </div>
      </div>
      <div className="workspace-detail-list">
        {items.map((item) => (
          <button key={item.id} type="button" className="workspace-launch-row" onClick={() => onSelect(item.id)}>
            <div className="workspace-cell-stack">
              <strong>{item.title}</strong>
              <span>{item.summary}</span>
            </div>
            <span className={`status-badge ${toneForStatus(item.status)}`}>{labelize(item.status)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function KpiCard({ label, value, helper, tone = 'info' }: { label: string; value: number; helper: string; tone?: string }) {
  return (
    <section className="card workspace-kpi-card">
      <div className="eyebrow">{label}</div>
      <div className={`kpi-value ${tone}`}>{value}</div>
      <div className="label">{helper}</div>
    </section>
  );
}

function DrawerSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="workspace-detail-card">
      <div className="workspace-section-header">
        <div>
          <div className="eyebrow">Launch Detail</div>
          <h3>{title}</h3>
        </div>
      </div>
      <div className="workspace-detail-list">{children}</div>
    </section>
  );
}

function DrawerRow({ title, subtitle, meta }: { title: string; subtitle: string; meta: string }) {
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

function MetricPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="workspace-metric-pair">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function uniqueOptions(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort().map((value) => ({ value, label: labelize(value) }));
}

function toneForStatus(value: string) {
  if (value === 'blocked') return 'critical';
  if (value === 'watch' || value === 'scheduled') return 'warning';
  if (value === 'ready') return 'good';
  return 'info';
}

function labelize(value: string) {
  return value.replace(/_/g, ' ');
}

function formatDateTime(value: string | null) {
  return value ? new Date(value).toLocaleString() : 'Not updated yet';
}
