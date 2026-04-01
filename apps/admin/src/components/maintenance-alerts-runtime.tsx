'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { WorkspaceDetailDrawer } from './workspace-detail-drawer';
import { WorkspaceFilterBar } from './workspace-filter-bar';
import { useConsoleI18n } from '../lib/use-console-i18n';
import { toArray, toBooleanValue, toNumberValue, toObject, toStringValue } from '../lib/normalize';

type DueRow = {
  id: string;
  vehicleId: string;
  vehicleCode?: string;
  vehicleLabel: string;
  maintenanceType: string;
  dueKm: number;
  dueDate?: string | null;
  currentOdometerKm: number;
  overdue: boolean;
  blockedForAssignment?: boolean;
  blockedAssignment?: boolean;
  critical?: boolean;
};

type Dashboard = {
  blockedAssignments: number;
  openRepairOrders: number;
  averageFixHours: number;
};

type RepairOrder = {
  id?: string;
  vehicleCode?: string;
  maintenanceType?: string;
  urgency?: string;
  status?: string;
  workshop?: string;
  technician?: string;
};

type Workspace = {
  dashboard: Dashboard | null;
  dueVehicles: DueRow[];
  repairOrders: RepairOrder[];
};

const emptyWorkspace: Workspace = {
  dashboard: { blockedAssignments: 0, openRepairOrders: 0, averageFixHours: 0 },
  dueVehicles: [],
  repairOrders: [],
};

export function MaintenanceAlertsRuntime({ workspace }: { workspace: Workspace | null }) {
  const { tx } = useConsoleI18n();
  const safeWorkspace = toObject(workspace, emptyWorkspace);
  const rows = useMemo(() => toArray<DueRow>(safeWorkspace.dueVehicles).map(normalizeRow), [safeWorkspace.dueVehicles]);
  const repairOrders = useMemo(() => toArray<RepairOrder>(safeWorkspace.repairOrders), [safeWorkspace.repairOrders]);
  const [search, setSearch] = useState('');
  const [serviceType, setServiceType] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [blocked, setBlocked] = useState('all');
  const [assignable, setAssignable] = useState('all');
  const [workshop, setWorkshop] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const workshops = uniqueOptions(repairOrders.map((item) => toStringValue(item.workshop || '')));
  const filteredRows = rows.filter((row) => {
    const linkedRepair = repairOrders.find((item) => toStringValue(item.vehicleCode) === row.vehicleLabel || toStringValue(item.vehicleCode) === row.vehicleCode);
    const computedSeverity = row.overdue ? 'overdue' : row.critical ? 'critical' : 'due_soon';
    const isBlocked = row.blockedAssignment;
    const isAssignable = !row.blockedAssignment;
    const haystack = `${row.vehicleLabel} ${row.maintenanceType}`.toLowerCase();
    if (search && !haystack.includes(search.toLowerCase())) return false;
    if (serviceType !== 'all' && row.maintenanceType !== serviceType) return false;
    if (severity !== 'all' && computedSeverity !== severity) return false;
    if (blocked === 'yes' && !isBlocked) return false;
    if (assignable === 'yes' && !isAssignable) return false;
    if (workshop !== 'all' && toStringValue(linkedRepair?.workshop) !== workshop) return false;
    return true;
  });

  const selected = filteredRows.find((row) => row.id === selectedId) ?? rows.find((row) => row.id === selectedId) ?? null;
  const selectedRepair = repairOrders.find((item) => selected && (toStringValue(item.vehicleCode) === selected.vehicleLabel || toStringValue(item.vehicleCode) === selected.vehicleCode)) ?? null;
  const dueSoon = rows.filter((row) => !row.overdue).length;
  const overdue = rows.filter((row) => row.overdue).length;
  const assignableCount = rows.filter((row) => !row.blockedAssignment).length;

  return (
    <main className="shell">
      <div className="panel workspace-shell">
        <section className="workspace-header">
          <div className="workspace-header-copy">
            <div className="eyebrow">{tx('Technical Console')}</div>
            <h1>{tx('Maintenance Alerts')}</h1>
            <p>{tx('Due-soon and overdue maintenance with assignment impact, workshop ownership, and repair context.')}</p>
          </div>
        </section>

        <section className="workspace-kpi-grid">
          <KpiCard label={tx('Due Soon')} value={dueSoon} helper={tx('Upcoming service alerts')} />
          <KpiCard label={tx('Overdue')} value={overdue} helper={tx('Past due units')} tone="critical" />
          <KpiCard label={tx('Blocked Assignment')} value={safeWorkspace.dashboard?.blockedAssignments ?? 0} helper={tx('Units blocked from dispatch')} tone="warning" />
          <KpiCard label={tx('Assignable')} value={assignableCount} helper={tx('Still assignable today')} tone="good" />
          <KpiCard label={tx('Open Repair Orders')} value={safeWorkspace.dashboard?.openRepairOrders ?? 0} helper={tx('Workshop queue')} />
          <KpiCard label={tx('Average Fix Time')} value={Math.round(toNumberValue(safeWorkspace.dashboard?.averageFixHours))} helper={tx('Hours to complete')} />
        </section>

        <WorkspaceFilterBar
          fields={[
            { key: 'search', label: tx('Search'), type: 'search', value: search, placeholder: tx('Vehicle or service type'), onChange: setSearch },
            { key: 'service', label: tx('Service Type'), type: 'select', value: serviceType, onChange: setServiceType, options: [{ value: 'all', label: tx('All service types') }, ...uniqueOptions(rows.map((row) => row.maintenanceType))] },
            { key: 'severity', label: tx('Severity'), type: 'select', value: severity, onChange: setSeverity, options: [{ value: 'all', label: tx('All severities') }, { value: 'critical', label: tx('Critical') }, { value: 'overdue', label: tx('Overdue') }, { value: 'due_soon', label: tx('Due soon') }] },
            { key: 'blocked', label: tx('Blocked'), type: 'select', value: blocked, onChange: setBlocked, options: [{ value: 'all', label: tx('All units') }, { value: 'yes', label: tx('Blocked only') }] },
            { key: 'assignable', label: tx('Assignable'), type: 'select', value: assignable, onChange: setAssignable, options: [{ value: 'all', label: tx('All units') }, { value: 'yes', label: tx('Assignable only') }] },
            { key: 'workshop', label: tx('Workshop'), type: 'select', value: workshop, onChange: setWorkshop, options: [{ value: 'all', label: tx('All workshops') }, ...workshops] },
          ]}
        />

        <section className="card workspace-table-card">
          <div className="workspace-section-header">
            <div>
              <div className="eyebrow">{tx('Maintenance Queue')}</div>
              <h3>{tx('Maintenance alert table')}</h3>
            </div>
          </div>
          {!filteredRows.length ? (
            <div className="empty-state inline-state-card"><p>{tx('No maintenance alerts match the current filters.')}</p></div>
          ) : (
            <div className="table-shell">
              <table className="data-table workspace-data-table">
                <thead>
                  <tr>
                    <th>{tx('Vehicle')}</th>
                    <th>{tx('Service Type')}</th>
                    <th>{tx('Current KM')}</th>
                    <th>{tx('Due KM / Date')}</th>
                    <th>{tx('Severity')}</th>
                    <th>{tx('Blocked')}</th>
                    <th>{tx('Workshop')}</th>
                    <th>{tx('Assigned Tech')}</th>
                    <th>{tx('Status')}</th>
                    <th>{tx('Action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const linkedRepair = repairOrders.find((item) => toStringValue(item.vehicleCode) === row.vehicleLabel || toStringValue(item.vehicleCode) === row.vehicleCode);
                    const severityLabel = row.overdue ? 'overdue' : row.critical ? 'critical' : 'due_soon';
                    return (
                      <tr key={row.id} onClick={() => setSelectedId(row.id)} style={{ cursor: 'pointer' }}>
                        <td>{row.vehicleLabel}</td>
                        <td>{row.maintenanceType}</td>
                        <td>{formatNumber(row.currentOdometerKm)} km</td>
                        <td>{row.dueKm ? `${formatNumber(row.dueKm)} km` : formatDate(row.dueDate || null)}</td>
                        <td><span className={`status-badge ${toneForStatus(severityLabel)}`}>{tx(labelize(severityLabel))}</span></td>
                        <td><span className={`status-badge ${row.blockedAssignment ? 'critical' : 'good'}`}>{row.blockedAssignment ? tx('Blocked') : tx('Assignable')}</span></td>
                        <td>{toStringValue(linkedRepair?.workshop, tx('Unassigned'))}</td>
                        <td>{toStringValue(linkedRepair?.technician, tx('Unassigned'))}</td>
                        <td>{tx(labelize(toStringValue(linkedRepair?.status, 'planned')))}</td>
                        <td><span className="inline-action">{tx('Open detail')}</span></td>
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
          title={selected.vehicleLabel}
          subtitle={`${selected.maintenanceType} · ${selected.overdue ? tx('Overdue') : tx('Due soon')}`}
          onClose={() => setSelectedId(null)}
        >
          <section className="workspace-metric-pair-grid">
            <MetricPair label={tx('Current KM')} value={`${formatNumber(selected.currentOdometerKm)} km`} />
            <MetricPair label={tx('Due Threshold')} value={selected.dueKm ? `${formatNumber(selected.dueKm)} km` : formatDate(selected.dueDate || null)} />
            <MetricPair label={tx('Blocked')} value={selected.blockedAssignment ? tx('Yes') : tx('No')} />
            <MetricPair label={tx('Repair Status')} value={tx(labelize(toStringValue(selectedRepair?.status, 'planned')))} />
          </section>

          <DrawerSection title={tx('Repair context')} eyebrow={tx('Detail')}>
            <DrawerRow title={tx('Workshop')} subtitle={toStringValue(selectedRepair?.workshop, tx('Unassigned workshop'))} meta={toStringValue(selectedRepair?.technician, tx('No technician assigned'))} />
            <DrawerRow title={tx('Repair order status')} subtitle={tx(labelize(toStringValue(selectedRepair?.status, 'planned')))} meta={tx(labelize(toStringValue(selectedRepair?.urgency, 'medium')))} />
          </DrawerSection>
        </WorkspaceDetailDrawer>
      ) : null}
    </main>
  );
}

function normalizeRow(row: DueRow): DueRow {
  return {
    id: toStringValue(row.id, 'maintenance-alert'),
    vehicleId: toStringValue(row.vehicleId, ''),
    vehicleCode: toStringValue(row.vehicleCode || '', ''),
    vehicleLabel: toStringValue(row.vehicleLabel, 'Vehicle'),
    maintenanceType: toStringValue(row.maintenanceType, 'Service'),
    dueKm: toNumberValue(row.dueKm),
    dueDate: row.dueDate || null,
    currentOdometerKm: toNumberValue(row.currentOdometerKm),
    overdue: toBooleanValue(row.overdue),
    blockedForAssignment: toBooleanValue(row.blockedForAssignment),
    blockedAssignment: toBooleanValue(row.blockedAssignment ?? row.blockedForAssignment),
    critical: toBooleanValue(row.critical),
  };
}

function KpiCard({ label, value, helper, tone = 'info' }: { label: string; value: number; helper: string; tone?: string }) {
  return (
    <section className="card workspace-kpi-card">
      <div className="eyebrow">{label}</div>
      <div className={`kpi-value ${tone}`}>{formatNumber(value)}</div>
      <div className="label">{helper}</div>
    </section>
  );
}

function DrawerSection({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  return (
    <section className="workspace-detail-card">
      <div className="workspace-section-header">
        <div>
          <div className="eyebrow">{eyebrow}</div>
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
  return Array.from(new Set(values.filter(Boolean))).sort().map((value) => ({ value, label: value }));
}

function toneForStatus(value: string) {
  if (['critical', 'overdue', 'blocked'].includes(value)) return 'critical';
  if (['due_soon', 'warning'].includes(value)) return 'warning';
  return 'good';
}

function labelize(value: string) {
  return value.replace(/_/g, ' ');
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : 'Not set';
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}
