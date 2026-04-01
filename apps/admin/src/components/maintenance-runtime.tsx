'use client';

import Link from 'next/link';
import { useConsoleI18n } from '../lib/use-console-i18n';
import { MaintenancePlanForm } from './maintenance-plan-form';
import { RepairOrderForm } from './repair-order-form';

type VehicleOption = { id?: string; _id?: string; vehicleCode: string };

type PartUsageRow = {
  id: string;
  vehicleCode: string;
  partName: string;
  partCategory: string;
  replacementDate?: string | null;
  replacementKm?: number | null;
  cost?: number | null;
  vendor?: string | null;
};

type MaintenanceDashboard = {
  dueCount: number;
  tireInspectionDue: number;
  overdueCount: number;
  blockedAssignments: number;
  openRepairOrders: number;
  lowStockParts: number;
  averageFixHours: number;
  maintenanceCostSummary: number;
  recentPartUsage?: PartUsageRow[];
};

type DueVehicle = {
  id: string;
  vehicleId: string;
  vehicleLabel: string;
  vehicleCode: string;
  maintenanceType: string;
  overdue: boolean;
  blockedAssignment: boolean;
  dueDate?: string | null;
  dueKm?: number | null;
  currentOdometerKm?: number | null;
  critical?: boolean;
};

type RepairOrder = {
  _id: string;
  repairOrderCode: string;
  vehicleId?: string;
  vehicleCode: string;
  issueType: string;
  maintenanceType?: string;
  status: string;
  urgency?: string;
  priority?: string;
  technician?: string;
  workshop?: string;
  openedAt?: string | null;
  scheduledAt?: string | null;
  completedAt?: string | null;
  actualCost?: number | null;
  blockedAssignment?: boolean;
};

type PartsHistoryRow = {
  vehicleId: string;
  vehicleCode: string;
  lastTireChangeDate?: string | null;
  lastTireChangeKm?: number | null;
  nextTireDueKm?: number | null;
  lastMaintenanceDate?: string | null;
  lastMaintenanceKm?: number | null;
  lastPartReplaced?: string | null;
  partReplacementDate?: string | null;
  nextServiceDue?: string | number | null;
  overdue: boolean;
};

type LowStockPart = Record<string, unknown>;

type Props = {
  dashboard: MaintenanceDashboard;
  dueVehicles: DueVehicle[];
  overdueVehicles: DueVehicle[];
  tireDueVehicles: DueVehicle[];
  repairOrders: RepairOrder[];
  partsHistory: PartsHistoryRow[];
  lowStockParts: LowStockPart[];
  vehicleOptions: Array<{ id: string; code: string }>;
};

export function MaintenanceRuntime({
  dashboard,
  dueVehicles,
  overdueVehicles,
  tireDueVehicles,
  repairOrders,
  partsHistory,
  lowStockParts,
  vehicleOptions,
}: Props) {
  const { language, tx } = useConsoleI18n();

  const dueQueue = toArray<DueVehicle>(dueVehicles)
    .sort((left, right) => severityRank(right) - severityRank(left))
    .slice(0, 12);
  const overdueSet = new Set(toArray<DueVehicle>(overdueVehicles).map((item) => item.vehicleId));
  const tireDueSet = new Set(toArray<DueVehicle>(tireDueVehicles).map((item) => item.vehicleId));
  const openRepairOrders = toArray<RepairOrder>(repairOrders).slice(0, 10);
  const serviceRows = toArray<PartsHistoryRow>(partsHistory).slice(0, 10);
  const lowStockPartsList = toArray<LowStockPart>(lowStockParts);

  return (
    <main className="shell">
      <div className="panel dashboard-layout">
        <section className="section-grid-four">
          <MetricCard label={tx('Due Soon')} value={Number(dashboard.dueCount ?? 0)} href="/maintenance/due" helper={tx('Vehicles that need workshop planning')} />
          <MetricCard label={tx('Overdue')} value={Number(dashboard.overdueCount ?? 0)} href="/maintenance/overdue" helper={tx('Already past service threshold')} tone="critical" />
          <MetricCard label={tx('Blocked Vehicles')} value={Number(dashboard.blockedAssignments ?? 0)} href="/maintenance/blocked" helper={tx('Unavailable for dispatch')} tone="critical" />
          <MetricCard label={tx('Tire Due')} value={Number(dashboard.tireInspectionDue ?? tireDueVehicles.length)} href="/tire-due-list" helper={tx('Inspection or tire work pending')} tone="warning" />
          <MetricCard label={tx('Open Repair Orders')} value={Number(dashboard.openRepairOrders ?? 0)} href="/maintenance/repair-orders" helper={tx('Workshop queue in progress')} />
          <MetricCard label={tx('Average Fix Time')} value={`${Number(dashboard.averageFixHours ?? 0).toFixed(1)}h`} href="/maintenance/repair-orders" helper={tx('Average order turnaround')} />
        </section>

        <section className="section-grid-two">
          <section className="section-card card table-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
              <div>
                <div className="label">{tx('Due / overdue queue')}</div>
                <h1 style={{ margin: '6px 0 0' }}>{tx('Maintenance control board')}</h1>
              </div>
              <Link className="inline-action" href="/maintenance/due">{tx('Open full queue')}</Link>
            </div>
            <div className="table-wrap">
              <table className="enterprise-table">
                <thead>
                  <tr>
                    <th>{tx('Vehicle')}</th>
                    <th>{tx('Service type')}</th>
                    <th>{tx('Due KM / date')}</th>
                    <th>{tx('Severity')}</th>
                    <th>{tx('Blocked')}</th>
                    <th>{tx('Assign technician')}</th>
                  </tr>
                </thead>
                <tbody>
                  {dueQueue.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <Link className="table-primary-link" href={`/maintenance/vehicles/${item.vehicleId}/history`}>
                          {item.vehicleCode}
                        </Link>
                      </td>
                      <td>{tx(item.maintenanceType)}</td>
                      <td>{formatDue(item.dueKm, item.dueDate, language, tx)}</td>
                      <td><span className={`status-badge ${severityTone(item)}`}>{tx(severityLabel(item))}</span></td>
                      <td><span className={`status-badge ${item.blockedAssignment ? 'critical' : 'good'}`}>{item.blockedAssignment ? tx('Blocked') : tx('No')}</span></td>
                      <td><Link className="inline-action" href={`/maintenance/repair-orders?vehicle=${item.vehicleCode}`}>{tx('Assign technician')}</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!dueQueue.length ? (
              <div className="empty-state inline-state-card">
                <p>{tx('No due or overdue vehicles are in the queue right now.')}</p>
              </div>
            ) : null}
          </section>

          <section className="section-card card" style={{ padding: 20 }}>
            <div className="label">{tx('Workshop alerts')}</div>
            <h2 style={{ margin: '6px 0 0' }}>{tx('Critical maintenance attention')}</h2>
            <div className="list-stack" style={{ marginTop: 16 }}>
              <AlertRow title={tx('Overdue maintenance')} detail={`${formatNumber(overdueSet.size, language)} ${tx('vehicles already overdue')}`} tone={overdueSet.size ? 'critical' : 'good'} href="/maintenance/overdue" tx={tx} />
              <AlertRow title={tx('Tire inspection due')} detail={`${formatNumber(tireDueSet.size, language)} ${tx('vehicles need tire attention')}`} tone={tireDueSet.size ? 'warning' : 'good'} href="/tire-due-list" tx={tx} />
              <AlertRow title={tx('Blocked for assignment')} detail={`${formatNumber(Number(dashboard.blockedAssignments ?? 0), language)} ${tx('vehicles cannot be assigned')}`} tone={Number(dashboard.blockedAssignments ?? 0) ? 'critical' : 'good'} href="/maintenance/blocked" tx={tx} />
              <AlertRow title={tx('Low stock parts')} detail={`${formatNumber(lowStockPartsList.length, language)} ${tx('parts below minimum stock')}`} tone={lowStockPartsList.length ? 'warning' : 'good'} href="/maintenance/plans" tx={tx} />
            </div>
            <div className="grid grid-2" style={{ marginTop: 18 }}>
              <div className="card" style={{ padding: 14 }}>
                <div className="label">{tx('30 day maintenance spend')}</div>
                <div className="kpi-value">ETB {formatNumber(dashboard.maintenanceCostSummary ?? 0, language)}</div>
              </div>
              <div className="card" style={{ padding: 14 }}>
                <div className="label">{tx('Recent parts usage')}</div>
                <div className="kpi-value">{formatNumber(toArray(dashboard.recentPartUsage).length, language)}</div>
              </div>
            </div>
          </section>
        </section>

        <section className="section-card card table-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
            <div>
              <div className="label">{tx('Repair orders')}</div>
              <h2 style={{ margin: '6px 0 0' }}>{tx('Open workshop orders')}</h2>
            </div>
            <Link className="inline-action" href="/maintenance/repair-orders">{tx('Open repair orders page')}</Link>
          </div>
          <div className="table-wrap">
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th>{tx('Order ID')}</th>
                  <th>{tx('Vehicle')}</th>
                  <th>{tx('Issue')}</th>
                  <th>{tx('Opened at')}</th>
                  <th>{tx('Assigned to')}</th>
                  <th>{tx('Completed at')}</th>
                  <th>{tx('Fix hours')}</th>
                  <th>{tx('Cost')}</th>
                </tr>
              </thead>
              <tbody>
                {openRepairOrders.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <Link className="table-primary-link" href={`/maintenance/repair-orders/${item._id}`}>
                        {item.repairOrderCode}
                      </Link>
                    </td>
                    <td>{item.vehicleCode}</td>
                    <td>
                      <div>{tx(item.issueType)}</div>
                      <div className="label">{tx(item.maintenanceType || item.priority || 'General repair')}</div>
                    </td>
                    <td>{formatDateTime(item.openedAt, language, tx)}</td>
                    <td>{item.technician || item.workshop || tx('Unassigned')}</td>
                    <td>{formatDateTime(item.completedAt, language, tx)}</td>
                    <td>{formatFixHours(item.openedAt, item.completedAt, tx)}</td>
                    <td>ETB {formatNumber(item.actualCost ?? 0, language)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!openRepairOrders.length ? (
            <div className="empty-state inline-state-card">
              <p>{tx('No repair orders are open right now.')}</p>
            </div>
          ) : null}
        </section>

        <section className="section-grid-two">
          <section className="section-card card table-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
              <div>
                <div className="label">{tx('Vehicle service history')}</div>
                <h2 style={{ margin: '6px 0 0' }}>{tx('Tire and maintenance history')}</h2>
              </div>
              <Link className="inline-action" href="/maintenance/due">{tx('Open due list')}</Link>
            </div>
            <div className="table-wrap">
              <table className="enterprise-table">
                <thead>
                  <tr>
                    <th>{tx('Vehicle')}</th>
                    <th>{tx('Tire changed')}</th>
                    <th>{tx('Tire KM')}</th>
                    <th>{tx('Next tire due')}</th>
                    <th>{tx('Last maintenance')}</th>
                    <th>{tx('Next service due')}</th>
                    <th>{tx('Overdue')}</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceRows.map((item) => (
                    <tr key={item.vehicleId}>
                      <td>
                        <Link className="table-primary-link" href={`/maintenance/vehicles/${item.vehicleId}/history`}>
                          {item.vehicleCode}
                        </Link>
                      </td>
                      <td>{formatDate(item.lastTireChangeDate, language, tx)}</td>
                      <td>{formatKm(item.lastTireChangeKm, language, tx)}</td>
                      <td>{formatKm(item.nextTireDueKm, language, tx)}</td>
                      <td>{formatDate(item.lastMaintenanceDate, language, tx)}</td>
                      <td>{formatNextService(item.nextServiceDue, language, tx)}</td>
                      <td><span className={`status-badge ${item.overdue ? 'critical' : 'good'}`}>{item.overdue ? tx('Yes') : tx('No')}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!serviceRows.length ? (
              <div className="empty-state inline-state-card">
                <p>{tx('No service history records are available right now.')}</p>
              </div>
            ) : null}
          </section>

          <section className="section-card card table-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
              <div>
                <div className="label">{tx('Parts usage')}</div>
                <h2 style={{ margin: '6px 0 0' }}>{tx('Recent part replacements')}</h2>
              </div>
              <Link className="inline-action" href="/maintenance/plans">{tx('Open maintenance plans')}</Link>
            </div>
            <div className="table-wrap">
              <table className="enterprise-table">
                <thead>
                  <tr>
                    <th>{tx('Part name')}</th>
                    <th>{tx('Vehicle')}</th>
                    <th>{tx('Replaced at')}</th>
                    <th>{tx('Replaced KM')}</th>
                    <th>{tx('Cost')}</th>
                    <th>{tx('Vendor')}</th>
                  </tr>
                </thead>
                <tbody>
                  {toArray(dashboard.recentPartUsage).map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div>{item.partName}</div>
                        <div className="label">{tx(item.partCategory)}</div>
                      </td>
                      <td>{item.vehicleCode}</td>
                      <td>{formatDate(item.replacementDate, language, tx)}</td>
                      <td>{formatKm(item.replacementKm, language, tx)}</td>
                      <td>ETB {formatNumber(item.cost ?? 0, language)}</td>
                      <td>{item.vendor || tx('Vendor not recorded')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!toArray(dashboard.recentPartUsage).length ? (
              <div className="empty-state inline-state-card">
                <p>{tx('No recent part replacement records are available.')}</p>
              </div>
            ) : null}
          </section>
        </section>

        <section className="section-grid-two">
          <RepairOrderForm vehicles={vehicleOptions} />
          <MaintenancePlanForm vehicles={vehicleOptions} />
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  href,
  helper,
  tone = 'normal',
}: {
  label: string;
  value: number | string;
  href: string;
  helper: string;
  tone?: string;
}) {
  return (
    <Link className="card kpi-card" href={href}>
      <div className="label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className={`status-badge ${tone === 'critical' ? 'critical' : tone === 'warning' ? 'warning' : 'info'}`}>{helper}</div>
    </Link>
  );
}

function AlertRow({
  title,
  detail,
  tone,
  href,
  tx,
}: {
  title: string;
  detail: string;
  tone: 'good' | 'warning' | 'critical';
  href: string;
  tx: (text: string) => string;
}) {
  return (
    <Link className="list-row" href={href}>
      <div>
        <strong>{title}</strong>
        <div className="label">{detail}</div>
      </div>
      <span className={`status-badge ${tone}`}>{tone === 'good' ? tx('OK') : tone === 'warning' ? tx('Watch') : tx('Action')}</span>
    </Link>
  );
}

function toArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function severityRank(item: DueVehicle) {
  if (item.overdue) return 3;
  if (item.blockedAssignment) return 2;
  if (item.critical) return 1;
  return 0;
}

function severityTone(item: DueVehicle) {
  if (item.overdue) return 'critical';
  if (item.blockedAssignment || item.critical) return 'warning';
  return 'info';
}

function severityLabel(item: DueVehicle) {
  if (item.overdue) return 'Overdue';
  if (item.blockedAssignment) return 'Blocked';
  if (item.critical) return 'High';
  return 'Due soon';
}

function formatDue(dueKm: number | null | undefined, dueDate: string | null | undefined, language: 'en' | 'am', tx: (text: string) => string) {
  const kmLabel = typeof dueKm === 'number' ? `${formatNumber(dueKm, language)} km` : tx('KM pending');
  const dateLabel = dueDate ? formatDate(dueDate, language, tx) : tx('Date pending');
  return `${kmLabel} / ${dateLabel}`;
}

function formatDate(value: string | null | undefined, language: 'en' | 'am', tx: (text: string) => string) {
  if (!value) return tx('Pending');
  return new Intl.DateTimeFormat(language === 'am' ? 'am-ET' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function formatDateTime(value: string | null | undefined, language: 'en' | 'am', tx: (text: string) => string) {
  if (!value) return tx('Pending');
  return new Intl.DateTimeFormat(language === 'am' ? 'am-ET' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatFixHours(openedAt: string | null | undefined, completedAt: string | null | undefined, tx: (text: string) => string) {
  if (!openedAt || !completedAt) return tx('Open');
  const opened = new Date(openedAt).getTime();
  const completed = new Date(completedAt).getTime();
  if (!opened || !completed || completed <= opened) return tx('Pending');
  return `${((completed - opened) / (1000 * 60 * 60)).toFixed(1)}h`;
}

function formatKm(value: number | null | undefined, language: 'en' | 'am', tx: (text: string) => string) {
  if (typeof value !== 'number') return tx('Pending');
  return `${formatNumber(value, language)} km`;
}

function formatNextService(value: string | number | null | undefined, language: 'en' | 'am', tx: (text: string) => string) {
  if (typeof value === 'number') return `${formatNumber(value, language)} km`;
  if (typeof value === 'string') return formatDate(value, language, tx);
  return tx('Pending');
}

function formatNumber(value: number, language: 'en' | 'am') {
  return new Intl.NumberFormat(language === 'am' ? 'am-ET' : 'en-US', { maximumFractionDigits: 0 }).format(Number(value ?? 0));
}
