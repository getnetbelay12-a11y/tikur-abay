'use client';

import { useMemo, useState } from 'react';
import { formatDateTime, formatText } from '../lib/formatters';
import { useConsoleI18n } from '../lib/use-console-i18n';
import { WorkspaceFilterBar } from './workspace-filter-bar';

type ManagementRuntimeProps = {
  executiveSummary: {
    urgentActions?: Array<Record<string, unknown>>;
    kpis?: Array<Record<string, unknown>>;
    latestPayments?: Array<Record<string, unknown>>;
  } | null;
  fleetSummary: Record<string, unknown> | null;
  financeWorkspace: Record<string, unknown> | null;
  onboardingTasks: Array<Record<string, unknown>>;
  trainingRecords: Array<Record<string, unknown>>;
};

export function ManagementRuntime({
  executiveSummary,
  fleetSummary,
  financeWorkspace,
  onboardingTasks,
  trainingRecords,
}: ManagementRuntimeProps) {
  const { tx } = useConsoleI18n();
  const [search, setSearch] = useState('');
  const [focus, setFocus] = useState('all');

  const urgentActions = executiveSummary?.urgentActions ?? [];
  const executiveKpis = executiveSummary?.kpis ?? [];
  const routeProfitability = asArray<Record<string, unknown>>(financeWorkspace?.routeProfitability);
  const outstandingInvoices = asArray<Record<string, unknown>>(financeWorkspace?.outstandingInvoices).slice(0, 6);
  const salarySummary = asArray<Record<string, unknown>>(financeWorkspace?.salarySummary);
  const financeKpis = (financeWorkspace?.kpis ?? {}) as Record<string, unknown>;

  const focusSections = useMemo(() => {
    const query = search.trim().toLowerCase();
    return {
      executive: includeSection(query, focus, 'executive', urgentActions, executiveKpis),
      fleet: includeSection(query, focus, 'fleet', [fleetSummary ?? {}]),
      finance: includeSection(query, focus, 'finance', routeProfitability, outstandingInvoices, [financeKpis]),
      people: includeSection(query, focus, 'people', onboardingTasks, trainingRecords, salarySummary),
    };
  }, [executiveKpis, financeKpis, focus, fleetSummary, onboardingTasks, outstandingInvoices, routeProfitability, salarySummary, search, trainingRecords, urgentActions]);

  const totalUrgent = urgentActions.reduce((sum, item) => sum + Number(item.value ?? 0), 0);
  const revenueMtd = Number(financeKpis.revenueMtd ?? 0);
  const outstanding = Number(financeKpis.outstandingInvoices ?? 0);
  const overdueInvoices = Number(financeKpis.overdueInvoices ?? 0);
  const activeFleet = Number(fleetSummary?.activeFleet ?? fleetSummary?.fleetActive ?? 0);
  const blockedFleet = Number(fleetSummary?.blockedVehicles ?? 0);
  const onboardingDue = onboardingTasks.filter((item) => formatText(item.status, '') !== 'completed').length;
  const trainingDue = trainingRecords.filter((item) => formatText(item.status, '') !== 'completed').length;

  return (
    <main className="shell">
      <div className="panel workspace-shell">
        <section className="workspace-header">
          <div className="workspace-header-copy">
            <div className="eyebrow">{tx('Management Console')}</div>
            <h1>{tx('Management')}</h1>
            <p>{tx('Executive pressure, fleet readiness, finance exposure, and people follow-up.')}</p>
          </div>
        </section>

        <section className="workspace-kpi-grid">
          <KpiCard label={tx('Urgent Actions')} value={totalUrgent} helper={tx('Immediate executive attention')} tone={totalUrgent ? 'warning' : 'good'} />
          <KpiCard label={tx('Revenue MTD')} value={revenueMtd} helper={tx('Collected this month')} currency />
          <KpiCard label={tx('Outstanding Balance')} value={outstanding} helper={tx('Open receivables exposure')} currency tone={outstanding ? 'warning' : 'good'} />
          <KpiCard label={tx('Overdue Invoices')} value={overdueInvoices} helper={tx('Collections escalation pressure')} tone={overdueInvoices ? 'critical' : 'good'} />
          <KpiCard label={tx('Fleet Active')} value={activeFleet} helper={tx('Fleet units in motion')} />
          <KpiCard label={tx('Blocked Fleet')} value={blockedFleet} helper={tx('Vehicles unavailable for assignment')} tone={blockedFleet ? 'critical' : 'good'} />
          <KpiCard label={tx('Onboarding Due')} value={onboardingDue} helper={tx('HR tasks still open')} tone={onboardingDue ? 'warning' : 'good'} />
          <KpiCard label={tx('Training Due')} value={trainingDue} helper={tx('Training and expiry follow-up')} tone={trainingDue ? 'warning' : 'good'} />
        </section>

        <WorkspaceFilterBar
          fields={[
            { key: 'search', label: tx('Search'), type: 'search', value: search, placeholder: tx('Route, branch, invoice, role, task'), onChange: setSearch },
            {
              key: 'focus',
              label: tx('Focus'),
              type: 'select',
              value: focus,
              onChange: setFocus,
              options: [
                { value: 'all', label: tx('All sections') },
                { value: 'executive', label: tx('Executive signals') },
                { value: 'fleet', label: tx('Fleet oversight') },
                { value: 'finance', label: tx('Finance and margin') },
                { value: 'people', label: tx('People and readiness') },
              ],
            },
          ]}
        />

        {focusSections.executive ? (
          <section className="card workspace-table-card">
            <div className="workspace-section-header">
              <div>
                    <div className="eyebrow">{tx('Executive Signals')}</div>
                    <h3>{tx('Urgency and movement overview')}</h3>
              </div>
            </div>
            <div className="grid grid-2">
              <div className="workspace-detail-card">
                <div className="workspace-section-header">
                  <div>
                    <div className="eyebrow">{tx('Urgent')}</div>
                    <h3>{tx('Priority counts')}</h3>
                  </div>
                </div>
                <div className="workspace-detail-list">
                  {urgentActions.length ? urgentActions.map((item, index) => (
                    <div key={`${formatText(item.key, 'urgent')}-${index}`} className="workspace-detail-row">
                      <div className="workspace-cell-stack">
                        <strong>{formatText(item.label, 'Priority')}</strong>
                        <span>{tx(formatText(item.href, 'Filtered detail view'))}</span>
                      </div>
                      <span className={`status-badge ${toneForUrgent(Number(item.value ?? 0))}`}>{formatNumber(Number(item.value ?? 0))}</span>
                    </div>
                  )) : <div className="empty-state inline-state-card"><p>{tx('No urgent signals are available.')}</p></div>}
                </div>
              </div>
              <div className="workspace-detail-card">
                <div className="workspace-section-header">
                  <div>
                    <div className="eyebrow">{tx('Movement')}</div>
                    <h3>{tx('Executive KPIs')}</h3>
                  </div>
                </div>
                <div className="workspace-detail-list">
                  {executiveKpis.length ? executiveKpis.map((item, index) => (
                    <div key={`${formatText(item.title, 'kpi')}-${index}`} className="workspace-detail-row">
                      <div className="workspace-cell-stack">
                        <strong>{formatText(item.title, 'KPI')}</strong>
                        <span>{tx(formatText(item.secondary, 'Summary update'))}</span>
                      </div>
                      <span className="label">{formatNumber(Number(item.value ?? 0))}</span>
                    </div>
                  )) : <div className="empty-state inline-state-card"><p>{tx('No executive KPI summary is available.')}</p></div>}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {focusSections.fleet ? (
          <section className="card workspace-table-card">
            <div className="workspace-section-header">
              <div>
                <div className="eyebrow">{tx('Fleet Oversight')}</div>
                <h3>{tx('Operational fleet position')}</h3>
              </div>
            </div>
            <div className="workspace-metric-pair-grid">
              <MetricPair label={tx('Total fleet')} value={formatNumber(Number(fleetSummary?.totalFleet ?? 0))} />
              <MetricPair label={tx('Available cars')} value={formatNumber(Number(fleetSummary?.availableCars ?? 0))} />
              <MetricPair label={tx('On road')} value={formatNumber(Number(fleetSummary?.onRoad ?? 0))} />
              <MetricPair label={tx('Under maintenance')} value={formatNumber(Number(fleetSummary?.underMaintenance ?? 0))} />
              <MetricPair label={tx('Blocked vehicles')} value={formatNumber(Number(fleetSummary?.blockedVehicles ?? 0))} />
              <MetricPair label={tx('External rental in use')} value={formatNumber(Number(fleetSummary?.rentedExternalCars ?? 0))} />
            </div>
          </section>
        ) : null}

        {focusSections.finance ? (
          <section className="card workspace-table-card">
            <div className="workspace-section-header">
              <div>
                <div className="eyebrow">{tx('Finance and margin')}</div>
                <h3>{tx('Route profitability and receivables watch')}</h3>
              </div>
            </div>
            <div className="grid grid-2">
              <div className="table-shell">
                <table className="data-table workspace-data-table">
                  <thead>
                    <tr>
                      <th>{tx('Route')}</th>
                      <th>{tx('Revenue')}</th>
                      <th>{tx('Direct Cost')}</th>
                      <th>{tx('Margin')}</th>
                      <th>{tx('Trips')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routeProfitability.length ? routeProfitability.map((row, index) => (
                      <tr key={`${formatText(row.route, 'route')}-${index}`}>
                        <td>{formatText(row.route, 'Unknown route')}</td>
                        <td>{formatCurrency(Number(row.revenue ?? 0))}</td>
                        <td>{formatCurrency(Number(row.directCost ?? 0))}</td>
                        <td>{formatCurrency(Number(row.margin ?? 0))}</td>
                        <td>{formatNumber(Number(row.invoiceCount ?? 0))}</td>
                      </tr>
                    )) : <tr><td colSpan={5}><div className="empty-state inline-state-card"><p>{tx('No route profitability summary is available.')}</p></div></td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="workspace-detail-card">
                <div className="workspace-section-header">
                  <div>
                    <div className="eyebrow">{tx('Collections Watch')}</div>
                    <h3>{tx('Top outstanding invoices')}</h3>
                  </div>
                </div>
                <div className="workspace-detail-list">
                  {outstandingInvoices.length ? outstandingInvoices.map((row, index) => (
                    <div key={`${formatText(row.invoiceCode, 'invoice')}-${index}`} className="workspace-detail-row">
                      <div className="workspace-cell-stack">
                        <strong>{formatText(row.invoiceCode, 'Invoice')}</strong>
                        <span>{tx(formatText(row.customerName, 'Customer account'))} · {tx(formatText(row.tripCode, 'Trip reference'))}</span>
                      </div>
                      <span className="label">{formatCurrency(Number(row.outstandingAmount ?? 0))}</span>
                    </div>
                  )) : <div className="empty-state inline-state-card"><p>{tx('No outstanding invoices are visible.')}</p></div>}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {focusSections.people ? (
          <section className="card workspace-table-card">
            <div className="workspace-section-header">
              <div>
                <div className="eyebrow">{tx('People and readiness')}</div>
                <h3>{tx('Payroll, onboarding, and training follow-up')}</h3>
              </div>
            </div>
            <div className="grid grid-3">
              <div className="workspace-detail-card">
                <div className="workspace-section-header">
                  <div>
                    <div className="eyebrow">{tx('Payroll')}</div>
                    <h3>{tx('Salary summary')}</h3>
                  </div>
                </div>
                <div className="workspace-detail-list">
                  {salarySummary.length ? salarySummary.map((row, index) => (
                    <div key={`${formatText(row.role, 'payroll')}-${index}`} className="workspace-detail-row">
                      <div className="workspace-cell-stack">
                        <strong>{formatText(row.role, 'Payroll')}</strong>
                        <span>{formatNumber(Number(row.headcount ?? 0))} {tx('headcount')}</span>
                      </div>
                      <span className="label">{formatCurrency(Number(row.payoutDue ?? 0) + Number(row.commissionDue ?? 0))}</span>
                    </div>
                  )) : <div className="empty-state inline-state-card"><p>{tx('No salary summary is available.')}</p></div>}
                </div>
              </div>
              <div className="workspace-detail-card">
                <div className="workspace-section-header">
                  <div>
                    <div className="eyebrow">{tx('Onboarding')}</div>
                    <h3>{tx('Open HR tasks')}</h3>
                  </div>
                </div>
                <div className="workspace-detail-list">
                  {onboardingTasks.slice(0, 6).length ? onboardingTasks.slice(0, 6).map((row, index) => (
                    <div key={`${formatText(row.taskCode, 'task')}-${index}`} className="workspace-detail-row">
                      <div className="workspace-cell-stack">
                        <strong>{formatText(row.taskCode, 'Task')}</strong>
                        <span>{tx(formatText(row.title, 'Onboarding task'))}</span>
                      </div>
                      <span className="label">{tx(formatText(row.status, 'pending'))}</span>
                    </div>
                  )) : <div className="empty-state inline-state-card"><p>{tx('No onboarding tasks are open.')}</p></div>}
                </div>
              </div>
              <div className="workspace-detail-card">
                <div className="workspace-section-header">
                  <div>
                    <div className="eyebrow">{tx('Training')}</div>
                    <h3>{tx('Training and expiry watch')}</h3>
                  </div>
                </div>
                <div className="workspace-detail-list">
                  {trainingRecords.slice(0, 6).length ? trainingRecords.slice(0, 6).map((row, index) => (
                    <div key={`${formatText(row.id, 'training')}-${index}`} className="workspace-detail-row">
                      <div className="workspace-cell-stack">
                        <strong>{formatText(row.title, 'Training')}</strong>
                        <span>{tx(formatText(row.subject, 'Training record'))}</span>
                      </div>
                      <span className="label">{formatDateTime(row.expiryDate ?? row.completedAt)}</span>
                    </div>
                  )) : <div className="empty-state inline-state-card"><p>{tx('No training records are visible.')}</p></div>}
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function KpiCard({
  label,
  value,
  helper,
  tone = 'info',
  currency = false,
}: {
  label: string;
  value: number;
  helper: string;
  tone?: 'good' | 'warning' | 'critical' | 'info';
  currency?: boolean;
}) {
  return (
    <div className={`compact-kpi-card card ${tone === 'critical' ? 'executive-urgent-card' : tone === 'warning' ? 'executive-moving-card warning' : tone === 'good' ? 'executive-moving-card good' : 'executive-money-card info'}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{currency ? formatCurrency(value) : formatNumber(value)}</div>
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

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(Number.isFinite(value) ? value : 0);
}

function formatCurrency(value: number) {
  return `ETB ${new Intl.NumberFormat().format(Number.isFinite(value) ? value : 0)}`;
}

function toneForUrgent(value: number) {
  if (value > 0) return 'critical';
  return 'good';
}

function includeSection(query: string, focus: string, key: string, ...sources: unknown[]) {
  if (focus !== 'all' && focus !== key) return false;
  if (!query) return true;
  return sources.flatMap((source) => Array.isArray(source) ? source : [source])
    .some((item) => JSON.stringify(item ?? {}).toLowerCase().includes(query));
}
