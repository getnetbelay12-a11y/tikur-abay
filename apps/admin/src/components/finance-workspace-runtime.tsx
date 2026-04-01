'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { readShippingPhase1Workspace, shippingDeskLink, shippingNextActionLabel, shippingPhase1UpdatedEvent, shippingStageLabel } from '../lib/shipping-phase1';
import { useConsoleI18n } from '../lib/use-console-i18n';
import { WorkspaceDetailDrawer } from './workspace-detail-drawer';
import { WorkspaceFilterBar } from './workspace-filter-bar';
import { toArray, toNumberValue, toObject, toStringValue } from '../lib/normalize';

type OutstandingInvoice = {
  id: string;
  invoiceCode: string;
  customerName: string;
  contactPerson: string;
  contactPhone: string;
  routeName: string;
  outstandingAmount: number;
  totalAmount: number;
  status: string;
  dueDate: string | null;
  tripCode: string;
};

type FinanceWorkspace = {
  kpis: {
    revenueMtd: number;
    outstandingInvoices: number;
    overdueInvoices: number;
    paymentsToday: number;
    collectionsRequiringFollowUp: number;
    payoutsDue: number;
  };
  outstandingInvoices: OutstandingInvoice[];
  recentPayments: Array<{ id: string; paymentCode: string; customerCode: string; amount: number; status: string; routeName: string; paymentDate: string | null }>;
  collectionsQueue: Array<{ id: string; taskCode: string; customerName: string; assignedOwner: string; escalationLevel: string; balance: number; reminderCount: number; status: string; dueDate: string | null; lastFollowUpAt: string | null }>;
  routeProfitability: Array<{ route: string; revenue: number; directCost: number; margin: number; invoiceCount: number }>;
  salarySummary: Array<{ role: string; headcount: number; payoutDue: number; commissionDue: number }>;
};

const emptyWorkspace: FinanceWorkspace = {
  kpis: { revenueMtd: 0, outstandingInvoices: 0, overdueInvoices: 0, paymentsToday: 0, collectionsRequiringFollowUp: 0, payoutsDue: 0 },
  outstandingInvoices: [],
  recentPayments: [],
  collectionsQueue: [],
  routeProfitability: [],
  salarySummary: [],
};

export function FinanceWorkspaceRuntime({ workspace }: { workspace: FinanceWorkspace | null }) {
  const { tx } = useConsoleI18n();
  const safeWorkspace = toObject(workspace, emptyWorkspace);
  const [shippingWorkspace, setShippingWorkspace] = useState(() => readShippingPhase1Workspace());
  const invoices = useMemo(() => toArray<OutstandingInvoice>(safeWorkspace.outstandingInvoices), [safeWorkspace.outstandingInvoices]);
  const collections = useMemo(() => toArray(safeWorkspace.collectionsQueue), [safeWorkspace.collectionsQueue]);
  const payments = useMemo(() => toArray(safeWorkspace.recentPayments), [safeWorkspace.recentPayments]);
  const routes = useMemo(() => toArray(safeWorkspace.routeProfitability), [safeWorkspace.routeProfitability]);
  const salarySummary = useMemo(() => toArray(safeWorkspace.salarySummary), [safeWorkspace.salarySummary]);

  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [invoiceStatus, setInvoiceStatus] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [routeFilter, setRouteFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const reload = () => setShippingWorkspace(readShippingPhase1Workspace());
    reload();
    window.addEventListener(shippingPhase1UpdatedEvent, reload as EventListener);
    return () => {
      window.removeEventListener(shippingPhase1UpdatedEvent, reload as EventListener);
    };
  }, []);

  const shippingFinanceRows = useMemo(() => (
    shippingWorkspace.lettersOfCredit.map((lc) => {
      const invoice = shippingWorkspace.invoices.find((item) => item.bookingId === lc.bookingId);
      const settlement = shippingWorkspace.settlements.find((item) => item.bookingId === lc.bookingId);
      const booking = shippingWorkspace.bookings.find((item) => item.bookingId === lc.bookingId);
      return {
        bookingId: lc.bookingId,
        customerName: lc.customerName,
        lcNumber: lc.lcNumber,
        bankName: lc.bankName,
        status: lc.status,
        shippingStage: shippingStageLabel(booking?.currentStage || 'Shipping finance'),
        nextAction: shippingNextActionLabel(booking?.nextAction || 'Verify LC and bank packet'),
        verificationNote: lc.verificationNote,
        amount: lc.amount,
        balanceUSD: settlement?.balanceUSD ?? 0,
        balanceETB: settlement?.balanceETB ?? 0,
        invoiceId: invoice?.invoiceId || '',
        deskTarget: shippingDeskLink(booking?.currentStage),
      };
    })
  ), [shippingWorkspace.bookings, shippingWorkspace.invoices, shippingWorkspace.lettersOfCredit, shippingWorkspace.settlements]);

  const shippingFinanceKpis = {
    pendingLc: shippingFinanceRows.filter((item) => item.status === 'pending').length,
    verifiedLc: shippingFinanceRows.filter((item) => item.status === 'verified').length,
    paidLc: shippingFinanceRows.filter((item) => item.status === 'paid').length,
    openShippingSettlement: shippingFinanceRows.filter((item) => item.balanceUSD > 0 || item.balanceETB > 0).length,
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const haystack = `${invoice.invoiceCode} ${invoice.customerName} ${invoice.tripCode}`.toLowerCase();
    if (search && !haystack.includes(search.toLowerCase())) return false;
    if (customerFilter !== 'all' && invoice.customerName !== customerFilter) return false;
    if (invoiceStatus !== 'all' && invoice.status !== invoiceStatus) return false;
    if (routeFilter !== 'all' && invoice.routeName !== routeFilter) return false;
    return true;
  });

  const selectedInvoice = filteredInvoices.find((invoice) => invoice.id === selectedId) ?? invoices.find((invoice) => invoice.id === selectedId) ?? null;
  const linkedCollections = collections.filter((item: any) => !selectedInvoice || toStringValue(item.customerName) === selectedInvoice.customerName);
  const linkedPayments = payments.filter((item: any) => paymentStatus === 'all' || toStringValue(item.status) === paymentStatus);

  return (
    <main className="shell">
      <div className="panel workspace-shell">
        <section className="workspace-header">
          <div className="workspace-header-copy">
            <div className="eyebrow">{tx('Finance Console')}</div>
            <h1>{tx('Finance')}</h1>
            <p>{tx('Receivables, payments, collections, route margin, and payout obligations.')}</p>
          </div>
        </section>

        <section className="workspace-kpi-grid finance-kpi-grid">
          <KpiCard label={tx('Revenue MTD')} value={safeWorkspace.kpis.revenueMtd} helper={tx('Paid cash this month')} currency tone="good" />
          <KpiCard label={tx('Outstanding Invoices')} value={safeWorkspace.kpis.outstandingInvoices} helper={tx('Open receivables')} currency tone="warning" />
          <KpiCard label={tx('Overdue Invoices')} value={safeWorkspace.kpis.overdueInvoices} helper={tx('Past due accounts')} tone="critical" />
          <KpiCard label={tx('Payments Today')} value={safeWorkspace.kpis.paymentsToday} helper={tx('Receipts logged today')} />
          <KpiCard label={tx('Collections Follow-Up')} value={safeWorkspace.kpis.collectionsRequiringFollowUp} helper={tx('Tasks still open')} tone="warning" />
          <KpiCard label={tx('Payouts Due')} value={safeWorkspace.kpis.payoutsDue} helper={tx('Salary and commission exposure')} currency />
        </section>

        <section className="workspace-kpi-grid finance-kpi-grid">
          <KpiCard label="Shipping LC Pending" value={shippingFinanceKpis.pendingLc} helper="Trade finance packets still blocked" tone="warning" />
          <KpiCard label="Shipping LC Verified" value={shippingFinanceKpis.verifiedLc} helper="Bank-approved packets awaiting settlement" tone="info" />
          <KpiCard label="Shipping LC Paid" value={shippingFinanceKpis.paidLc} helper="Shipping finance packets already closed" tone="good" />
          <KpiCard label="Open Shipping Settlements" value={shippingFinanceKpis.openShippingSettlement} helper="Bookings still carrying shipping balance" tone="warning" />
        </section>

        <WorkspaceFilterBar
          fields={[
            { key: 'search', label: 'Search', type: 'search', value: search, placeholder: 'Invoice, customer, trip', onChange: setSearch },
            { key: 'customer', label: 'Customer', type: 'select', value: customerFilter, onChange: setCustomerFilter, options: [{ value: 'all', label: 'All customers' }, ...uniqueOptions(invoices.map((invoice) => invoice.customerName))] },
            { key: 'invoice-status', label: 'Invoice Status', type: 'select', value: invoiceStatus, onChange: setInvoiceStatus, options: [{ value: 'all', label: 'All invoice states' }, ...uniqueOptions(invoices.map((invoice) => invoice.status))] },
            { key: 'payment-status', label: 'Payment Status', type: 'select', value: paymentStatus, onChange: setPaymentStatus, options: [{ value: 'all', label: 'All payment states' }, ...uniqueOptions(payments.map((payment: any) => toStringValue(payment.status)))] },
            { key: 'route', label: 'Route', type: 'select', value: routeFilter, onChange: setRouteFilter, options: [{ value: 'all', label: 'All routes' }, ...uniqueOptions(invoices.map((invoice) => invoice.routeName))] },
          ]}
        />

        <section className="workspace-split-grid">
          <section className="card workspace-table-card">
            <div className="workspace-section-header">
              <div>
                <div className="eyebrow">Shipping Finance</div>
                <h3>LC and settlement control</h3>
              </div>
              <Link className="btn btn-secondary btn-compact" href="/shipping/finance">Open shipping finance</Link>
            </div>
            {!shippingFinanceRows.length ? (
              <div className="empty-state inline-state-card"><p>No shipping finance files are active yet.</p></div>
            ) : (
              <div className="table-shell">
                <table className="data-table workspace-data-table">
                  <thead>
                    <tr>
                      <th>Booking</th>
                      <th>Customer</th>
                      <th>LC</th>
                      <th>Bank</th>
                      <th>Status</th>
                      <th>Shipping Stage</th>
                      <th>Amount</th>
                      <th>Balance</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shippingFinanceRows.slice(0, 10).map((row) => (
                      <tr key={row.bookingId}>
                        <td>{row.bookingId}</td>
                        <td>{row.customerName}</td>
                        <td>{row.lcNumber}</td>
                        <td>{row.bankName}</td>
                        <td><span className={`status-badge ${toneForStatus(row.status)}`}>{labelize(row.status)}</span></td>
                        <td>
                          <div className="workspace-cell-stack">
                            <strong>{row.shippingStage}</strong>
                            <span>{row.nextAction}</span>
                          </div>
                        </td>
                        <td>USD {formatNumber(row.amount)}</td>
                        <td>
                          <div className="workspace-cell-stack">
                            <strong>USD {formatNumber(row.balanceUSD)}</strong>
                            <span>ETB {formatNumber(row.balanceETB)}</span>
                          </div>
                        </td>
                        <td><Link className="inline-action" href={row.deskTarget.href}>{row.deskTarget.label}</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card workspace-detail-card">
            <div className="workspace-section-header">
              <div>
                <div className="eyebrow">Shipping Finance</div>
                <h3>Trade-finance exceptions</h3>
              </div>
            </div>
            <div className="workspace-detail-list">
              {shippingFinanceRows.slice(0, 8).map((row) => (
                <div className="workspace-detail-row" key={`${row.bookingId}-shipping-finance`}>
                  <div className="workspace-cell-stack">
                    <strong>{row.bookingId} · {row.customerName}</strong>
                    <span>{row.lcNumber} · {row.bankName}</span>
                  </div>
                  <div className="workspace-cell-stack">
                    <strong>{row.shippingStage}</strong>
                    <span>{row.nextAction}</span>
                    <span>{row.verificationNote}</span>
                    <Link className="inline-action" href={row.deskTarget.href}>{row.deskTarget.label}</Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </section>

        <section className="workspace-split-grid">
          <section className="card workspace-table-card">
            <div className="workspace-section-header">
              <div>
                <div className="eyebrow">{tx('Outstanding Invoices')}</div>
                <h3>{tx('Receivables queue')}</h3>
              </div>
              <div className="label">{filteredInvoices.length} {tx('invoices')}</div>
            </div>
            {!filteredInvoices.length ? (
              <div className="empty-state inline-state-card"><p>{tx('No outstanding invoices match the current filters.')}</p></div>
            ) : (
              <div className="table-shell">
                <table className="data-table workspace-data-table">
                  <thead>
                    <tr>
                      <th>{tx('Invoice')}</th>
                      <th>{tx('Customer')}</th>
                      <th>{tx('Route')}</th>
                      <th>{tx('Outstanding')}</th>
                      <th>{tx('Status')}</th>
                      <th>{tx('Due Date')}</th>
                      <th>{tx('Trip')}</th>
                      <th>{tx('Action')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((invoice) => (
                      <tr key={invoice.id} onClick={() => setSelectedId(invoice.id)} style={{ cursor: 'pointer' }}>
                        <td>{invoice.invoiceCode}</td>
                        <td>{invoice.customerName}</td>
                        <td>{invoice.routeName}</td>
                        <td>ETB {formatNumber(invoice.outstandingAmount)}</td>
                        <td><span className={`status-badge ${toneForStatus(invoice.status)}`}>{labelize(invoice.status)}</span></td>
                        <td>{formatDate(invoice.dueDate)}</td>
                        <td>{invoice.tripCode}</td>
                        <td><span className="inline-action">{tx('Open detail')}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card workspace-detail-card">
            <div className="workspace-section-header">
              <div>
                <div className="eyebrow">{tx('Collections Queue')}</div>
                <h3>{tx('Follow-up actions')}</h3>
              </div>
            </div>
            <div className="workspace-detail-list">
              {linkedCollections.slice(0, 8).map((task: any) => (
                <div className="workspace-detail-row" key={toStringValue(task.id, toStringValue(task.taskCode))}>
                  <div className="workspace-cell-stack">
                    <strong>{toStringValue(task.customerName, 'Customer pending')}</strong>
                    <span>{toStringValue(task.assignedOwner, 'Finance desk')} · {toStringValue(task.taskCode, 'Collection')}</span>
                  </div>
                  <div className="label">{labelize(toStringValue(task.status, 'open'))} · ETB {formatNumber(toNumberValue(task.balance))}</div>
                </div>
              ))}
            </div>
          </section>
        </section>

        <section className="workspace-split-grid">
          <section className="card workspace-table-card">
            <div className="workspace-section-header">
              <div>
                <div className="eyebrow">{tx('Recent Payments')}</div>
                <h3>{tx('Incoming receipts')}</h3>
              </div>
            </div>
            <div className="table-shell">
              <table className="data-table workspace-data-table">
                <thead>
                  <tr>
                    <th>{tx('Payment')}</th>
                    <th>{tx('Customer')}</th>
                    <th>{tx('Amount')}</th>
                    <th>{tx('Status')}</th>
                    <th>{tx('Route')}</th>
                    <th>{tx('Date')}</th>
                  </tr>
                </thead>
                <tbody>
                  {linkedPayments.slice(0, 10).map((payment: any) => (
                    <tr key={toStringValue(payment.id, toStringValue(payment.paymentCode))}>
                      <td>{toStringValue(payment.paymentCode, 'Payment')}</td>
                      <td>{toStringValue(payment.customerCode, 'Customer')}</td>
                      <td>ETB {formatNumber(toNumberValue(payment.amount))}</td>
                      <td><span className={`status-badge ${toneForStatus(toStringValue(payment.status, 'paid'))}`}>{labelize(toStringValue(payment.status, 'paid'))}</span></td>
                      <td>{toStringValue(payment.routeName, 'Route pending')}</td>
                      <td>{formatDate(payment.paymentDate || null)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card workspace-detail-card">
            <div className="workspace-section-header">
              <div>
                <div className="eyebrow">{tx('Route Profitability')}</div>
                <h3>{tx('Route margin summary')}</h3>
              </div>
            </div>
            <div className="workspace-detail-list">
              {routes.map((route: any) => (
                <div className="workspace-detail-row" key={toStringValue(route.route)}>
                  <div className="workspace-cell-stack">
                    <strong>{toStringValue(route.route, 'Route')}</strong>
                    <span>{toNumberValue(route.invoiceCount)} invoices</span>
                  </div>
                  <div className="label">Margin ETB {formatNumber(toNumberValue(route.margin))}</div>
                </div>
              ))}
            </div>
          </section>
        </section>

        <section className="card workspace-detail-card">
          <div className="workspace-section-header">
            <div>
              <div className="eyebrow">Salary and Commission</div>
              <h3>Payout summary</h3>
            </div>
          </div>
          <div className="table-shell">
            <table className="data-table workspace-data-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Headcount</th>
                  <th>Payout Due</th>
                  <th>Commission Due</th>
                </tr>
              </thead>
              <tbody>
                {salarySummary.map((row: any) => (
                  <tr key={toStringValue(row.role)}>
                    <td>{toStringValue(row.role, 'Team')}</td>
                    <td>{toNumberValue(row.headcount)}</td>
                    <td>ETB {formatNumber(toNumberValue(row.payoutDue))}</td>
                    <td>ETB {formatNumber(toNumberValue(row.commissionDue))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {selectedInvoice ? (
        <WorkspaceDetailDrawer
          title={selectedInvoice.invoiceCode}
          subtitle={`${selectedInvoice.customerName} · ${selectedInvoice.routeName} · ${selectedInvoice.tripCode}`}
          onClose={() => setSelectedId(null)}
        >
          <section className="workspace-metric-pair-grid">
            <MetricPair label="Contact Person" value={selectedInvoice.contactPerson} />
            <MetricPair label="Contact Phone" value={selectedInvoice.contactPhone} />
            <MetricPair label="Outstanding" value={`ETB ${formatNumber(selectedInvoice.outstandingAmount)}`} />
            <MetricPair label="Total Amount" value={`ETB ${formatNumber(selectedInvoice.totalAmount)}`} />
            <MetricPair label="Status" value={labelize(selectedInvoice.status)} />
            <MetricPair label="Due Date" value={formatDate(selectedInvoice.dueDate)} />
          </section>

          <DrawerSection title="Invoice Context" tx={tx}>
            <DrawerRow
              title={selectedInvoice.customerName}
              subtitle={`${selectedInvoice.contactPerson} · ${selectedInvoice.contactPhone}`}
              meta={`${selectedInvoice.routeName} · ${selectedInvoice.tripCode}`}
            />
          </DrawerSection>

          <DrawerSection title={tx('Recent payments')} tx={tx}>
            {linkedPayments.slice(0, 5).map((payment: any) => (
              <DrawerRow key={toStringValue(payment.id, toStringValue(payment.paymentCode))} title={toStringValue(payment.paymentCode, 'Payment')} subtitle={`ETB ${formatNumber(toNumberValue(payment.amount))}`} meta={`${labelize(toStringValue(payment.status, 'paid'))} · ${formatDate(payment.paymentDate || null)}`} />
            ))}
          </DrawerSection>

          <DrawerSection title={tx('Collections')} tx={tx}>
            {linkedCollections.slice(0, 5).map((task: any) => (
              <DrawerRow key={toStringValue(task.id, toStringValue(task.taskCode))} title={toStringValue(task.taskCode, 'Collection')} subtitle={`${toStringValue(task.assignedOwner, 'Finance desk')} · ${toStringValue(task.escalationLevel, 'finance_officer')}`} meta={`ETB ${formatNumber(toNumberValue(task.balance))} · ${labelize(toStringValue(task.status, 'open'))}`} />
            ))}
          </DrawerSection>
        </WorkspaceDetailDrawer>
      ) : null}
    </main>
  );
}

function KpiCard({ label, value, helper, tone = 'info', currency = false }: { label: string; value: number; helper: string; tone?: string; currency?: boolean }) {
  const safeValue = Math.abs(value || 0);
  return (
    <section className={`card workspace-kpi-card finance-kpi-card ${currency ? 'currency' : 'count'} ${tone}`}>
      <div className="eyebrow">{label}</div>
      <div className={`kpi-value ${tone}`}>{currency ? `ETB ${formatNumber(safeValue)}` : formatNumber(safeValue)}</div>
      <div className="label">{helper}</div>
    </section>
  );
}

function DrawerSection({ title, children, tx }: { title: string; children: ReactNode; tx: (text: string) => string }) {
  return (
    <section className="workspace-detail-card">
      <div className="workspace-section-header">
        <div>
          <div className="eyebrow">{tx('Detail')}</div>
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
  if (['overdue', 'escalated'].includes(value)) return 'critical';
  if (['pending', 'partially_paid', 'open'].includes(value)) return 'warning';
  if (['paid'].includes(value)) return 'good';
  return 'info';
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
