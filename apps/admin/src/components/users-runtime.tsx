'use client';

import { useMemo, useState } from 'react';
import { formatDateTime, formatPhone, formatPerson, formatText } from '../lib/formatters';
import { useConsoleI18n } from '../lib/use-console-i18n';
import { WorkspaceDetailDrawer } from './workspace-detail-drawer';
import { WorkspaceFilterBar } from './workspace-filter-bar';

type UserRow = Record<string, unknown>;

export function UsersRuntime({ users }: { users: UserRow[] }) {
  const { tx } = useConsoleI18n();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [branch, setBranch] = useState('all');
  const [status, setStatus] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const roleOptions = useMemo(() => optionize(users.map((user) => formatText(user.role, 'staff'))), [users]);
  const branchOptions = useMemo(() => optionize(users.map((user) => formatText(user.branch, 'Unassigned'))), [users]);
  const statusOptions = useMemo(() => optionize(users.map((user) => formatText(user.status, 'active'))), [users]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      const userRole = formatText(user.role, 'staff');
      const userBranch = formatText(user.branch, 'Unassigned');
      const userStatus = formatText(user.status, 'active');
      if (role !== 'all' && userRole !== role) return false;
      if (branch !== 'all' && userBranch !== branch) return false;
      if (status !== 'all' && userStatus !== status) return false;
      if (!query) return true;
      return [
        formatPerson(user.name, 'System user'),
        formatText(user.email),
        formatPhone(user.phone),
        userRole,
        userBranch,
        userStatus,
        formatText(user.employeeCode),
        formatText(user.customerCode),
      ].join(' ').toLowerCase().includes(query);
    });
  }, [branch, role, search, status, users]);

  const selectedUser = filtered.find((user) => formatText(user.id, '') === selectedId)
    ?? users.find((user) => formatText(user.id, '') === selectedId)
    ?? null;

  const total = users.length;
  const active = users.filter((user) => formatText(user.status, 'active') === 'active').length;
  const disabled = users.filter((user) => ['disabled', 'inactive', 'suspended'].includes(formatText(user.status, '').toLowerCase())).length;
  const locked = users.filter((user) => formatText(user.status, '') === 'locked').length;
  const pending = users.filter((user) => formatText(user.status, '') === 'pending').length;
  const distinctRoles = new Set(users.map((user) => formatText(user.role, 'staff'))).size;

  return (
    <main className="shell">
      <div className="panel workspace-shell">
        <section className="workspace-header">
          <div className="workspace-header-copy">
            <div className="eyebrow">User Access</div>
            <h1>{tx('Users')}</h1>
            <p>{tx('Manage active access, branch coverage, role distribution, and linked employee or customer records across the console.')}</p>
          </div>
        </section>

        <section className="workspace-kpi-grid">
          <KpiCard label={tx('Total Users')} value={total} helper={tx('Accounts loaded in the access register')} />
          <KpiCard label={tx('Active')} value={active} helper={tx('Ready for daily workspace use')} tone={active ? 'good' : 'warning'} />
          <KpiCard label={tx('Disabled')} value={disabled} helper={tx('Accounts removed from active access')} tone={disabled ? 'warning' : 'good'} />
          <KpiCard label={tx('Roles')} value={distinctRoles} helper={tx('Distinct access roles in use')} />
          <KpiCard label={tx('Locked')} value={locked} helper={tx('Accounts needing admin reset')} tone={locked ? 'critical' : 'good'} />
          <KpiCard label={tx('Pending Invites')} value={pending} helper={tx('Users not yet active')} tone={pending ? 'warning' : 'good'} />
        </section>

        <WorkspaceFilterBar
          fields={[
            { key: 'search', label: tx('Search'), type: 'search', value: search, placeholder: tx('User, email, phone, code'), onChange: setSearch },
            { key: 'role', label: tx('Role'), type: 'select', value: role, onChange: setRole, options: [{ value: 'all', label: tx('All roles') }, ...roleOptions] },
            { key: 'branch', label: tx('Branch'), type: 'select', value: branch, onChange: setBranch, options: [{ value: 'all', label: tx('All branches') }, ...branchOptions] },
            { key: 'status', label: tx('Status'), type: 'select', value: status, onChange: setStatus, options: [{ value: 'all', label: tx('All statuses') }, ...statusOptions] },
          ]}
        />

        <section className="card workspace-table-card">
          <div className="workspace-section-header">
            <div>
                <div className="eyebrow">{tx('Access Register')}</div>
                <h3>{filtered.length} {tx('users')}</h3>
              </div>
            </div>
          {!filtered.length ? (
            <div className="empty-state inline-state-card"><p>{tx('No users match the current filters.')}</p></div>
          ) : (
            <div className="table-shell">
              <table className="data-table workspace-data-table">
                <thead>
                  <tr>
                    <th>{tx('User')}</th>
                    <th>{tx('Email')}</th>
                    <th>{tx('Phone')}</th>
                    <th>{tx('Role')}</th>
                    <th>{tx('Branch')}</th>
                    <th>{tx('Status')}</th>
                    <th>{tx('Last Updated')}</th>
                    <th>{tx('Action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user) => (
                    <tr key={formatText(user.id, formatText(user.email, 'user-row'))} onClick={() => setSelectedId(formatText(user.id, ''))} style={{ cursor: 'pointer' }}>
                      <td>
                        <div className="workspace-cell-stack">
                          <strong>{formatPerson(user.name, 'System user')}</strong>
                          <span>{linkedRecord(user)}</span>
                        </div>
                      </td>
                      <td>{formatText(user.email, 'Email pending')}</td>
                      <td>{formatPhone(user.phone)}</td>
                      <td>{humanize(formatText(user.role, 'staff'))}</td>
                      <td>{formatText(user.branch, 'Unassigned')}</td>
                      <td><span className={`status-badge ${toneForStatus(formatText(user.status, 'active'))}`}>{humanize(formatText(user.status, 'active'))}</span></td>
                      <td>{formatDateTime(user.updatedAt)}</td>
                      <td>{actionLabel(user)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {selectedUser ? (
        <WorkspaceDetailDrawer
          title={formatPerson(selectedUser.name, 'System user')}
          subtitle={`${tx(humanize(formatText(selectedUser.role, 'staff')))} · ${formatText(selectedUser.branch, 'Unassigned')}`}
          onClose={() => setSelectedId(null)}
        >
          <section className="workspace-metric-pair-grid">
            <MetricPair label={tx('Email')} value={formatText(selectedUser.email, tx('Email pending'))} />
            <MetricPair label={tx('Phone')} value={formatPhone(selectedUser.phone)} />
            <MetricPair label={tx('Role')} value={tx(humanize(formatText(selectedUser.role, 'staff')))} />
            <MetricPair label={tx('Branch')} value={formatText(selectedUser.branch, tx('Unassigned'))} />
            <MetricPair label={tx('Status')} value={tx(humanize(formatText(selectedUser.status, 'active')))} />
            <MetricPair label={tx('Employee code')} value={formatText(selectedUser.employeeCode, tx('No employee link'))} />
            <MetricPair label={tx('Customer code')} value={formatText(selectedUser.customerCode, tx('No customer link'))} />
            <MetricPair label={tx('Created')} value={formatDateTime(selectedUser.createdAt)} />
            <MetricPair label={tx('Last updated')} value={formatDateTime(selectedUser.updatedAt)} />
            <MetricPair label={tx('Permission count')} value={String(Array.isArray(selectedUser.permissions) ? selectedUser.permissions.length : 0)} />
          </section>

          <section className="card workspace-detail-card">
            <div className="workspace-section-header">
              <div>
                <div className="eyebrow">{tx('Access Context')}</div>
                <h3>{tx('Permissions and linked records')}</h3>
              </div>
            </div>
            <div className="workspace-detail-list">
              <div className="workspace-detail-row">
                <div className="workspace-cell-stack">
                  <strong>{tx('Linked record')}</strong>
                  <span>{tx(linkedRecord(selectedUser))}</span>
                </div>
                <span className={`status-badge ${toneForStatus(formatText(selectedUser.status, 'active'))}`}>{tx(humanize(formatText(selectedUser.status, 'active')))}</span>
              </div>
              <div className="workspace-detail-row">
                <div className="workspace-cell-stack">
                  <strong>{tx('Branch access')}</strong>
                  <span>{formatText(selectedUser.branch, tx('Unassigned'))}</span>
                </div>
                <span className="label">{formatText(selectedUser.branchId, tx('No branch ID'))}</span>
              </div>
              <div className="workspace-detail-row">
                <div className="workspace-cell-stack">
                  <strong>{tx('Permissions')}</strong>
                  <span>{tx(permissionSummary(selectedUser.permissions))}</span>
                </div>
                <span className="label">{tx(actionLabel(selectedUser))}</span>
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
  if (['disabled', 'inactive', 'suspended', 'locked'].includes(normalized)) return 'critical';
  if (['pending'].includes(normalized)) return 'warning';
  if (['active'].includes(normalized)) return 'good';
  return 'info';
}

function linkedRecord(user: UserRow) {
  if (formatText(user.employeeCode, '')) return `Employee ${formatText(user.employeeCode)}`;
  if (formatText(user.customerCode, '')) return `Customer ${formatText(user.customerCode)}`;
  return 'No linked business record';
}

function actionLabel(user: UserRow) {
  const status = formatText(user.status, 'active');
  if (status === 'locked') return 'Reset access';
  if (['disabled', 'inactive', 'suspended'].includes(status)) return 'Review status';
  if (status === 'pending') return 'Complete invite';
  return 'Manage access';
}

function permissionSummary(value: unknown) {
  if (!Array.isArray(value) || !value.length) return 'No explicit permissions recorded';
  const items = value.slice(0, 4).map((item) => humanize(formatText(item, 'permission')));
  return `${items.join(', ')}${value.length > 4 ? ` +${value.length - 4} more` : ''}`;
}
