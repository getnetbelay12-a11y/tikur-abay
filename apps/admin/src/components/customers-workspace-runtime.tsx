'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { useConsoleI18n } from '../lib/use-console-i18n';
import { WorkspaceDetailDrawer } from './workspace-detail-drawer';
import { WorkspaceFilterBar } from './workspace-filter-bar';
import { toArray, toBooleanValue, toNumberValue, toObject, toStringValue } from '../lib/normalize';

type CustomerRow = {
  id: string;
  customerCode: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  branch: string;
  activeTrips: number;
  agreements: number;
  unpaidBalance: number;
  status: string;
  accountManager: string;
  accountManagerPhone: string;
  hasActiveAgreement: boolean;
  trips: Array<{ tripCode: string; route: string; status: string; eta: string | null; value: number }>;
  agreementsDetail: Array<{ agreementCode: string; status: string; totalValue: number; endDate: string | null }>;
  invoices: Array<{ invoiceCode: string; status: string; totalAmount: number; outstandingAmount: number; dueDate: string | null }>;
  payments: Array<{ paymentCode: string; amount: number; status: string; paymentDate: string | null }>;
  documents: Array<{ title: string; category: string; status: string }>;
  totalRevenue: number;
  pendingAgreements: number;
};

type CustomersWorkspace = {
  kpis: {
    total: number;
    active: number;
    activeTrips: number;
    unpaidBalance: number;
    pendingAgreements: number;
    topRevenue: number;
  };
  rows: CustomerRow[];
};

const emptyWorkspace: CustomersWorkspace = {
  kpis: { total: 0, active: 0, activeTrips: 0, unpaidBalance: 0, pendingAgreements: 0, topRevenue: 0 },
  rows: [],
};

export function CustomersWorkspaceRuntime({ workspace }: { workspace: CustomersWorkspace | null }) {
  const { tx } = useConsoleI18n();
  const safeWorkspace = toObject(workspace, emptyWorkspace);
  const rows = useMemo(() => toArray<CustomerRow>(safeWorkspace.rows).map(normalizeRow), [safeWorkspace.rows]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [managerFilter, setManagerFilter] = useState('all');
  const [unpaidOnly, setUnpaidOnly] = useState('all');
  const [agreementOnly, setAgreementOnly] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const branchOptions = uniqueOptions(rows.map((row) => row.branch));
  const managerOptions = uniqueOptions(rows.map((row) => row.accountManager));

  const filteredRows = rows.filter((row) => {
    const haystack = `${row.companyName} ${row.customerCode} ${row.contactPerson} ${row.phone}`.toLowerCase();
    if (search && !haystack.includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && row.status !== statusFilter) return false;
    if (branchFilter !== 'all' && row.branch !== branchFilter) return false;
    if (managerFilter !== 'all' && row.accountManager !== managerFilter) return false;
    if (unpaidOnly === 'yes' && row.unpaidBalance <= 0) return false;
    if (agreementOnly === 'yes' && !row.hasActiveAgreement) return false;
    return true;
  });

  const selected = filteredRows.find((row) => row.id === selectedId) ?? rows.find((row) => row.id === selectedId) ?? null;

  return (
    <main className="shell">
      <div className="panel workspace-shell">
        <section className="workspace-header">
          <div className="workspace-header-copy">
            <div className="eyebrow">{tx('Customer Accounts')}</div>
            <h1>{tx('Customers')}</h1>
            <p>{tx('Accounts, agreements, invoices, and payment context in one table.')}</p>
          </div>
        </section>

        <section className="workspace-kpi-grid">
          <KpiCard label={tx('Total')} value={safeWorkspace.kpis.total} helper={tx('Customer accounts in scope')} />
          <KpiCard label={tx('Active')} value={safeWorkspace.kpis.active} helper={tx('Commercially active accounts')} tone="good" />
          <KpiCard label={tx('Active Trips')} value={safeWorkspace.kpis.activeTrips} helper={tx('Trips currently moving')} />
          <KpiCard label={tx('Unpaid Balance')} value={safeWorkspace.kpis.unpaidBalance} helper={tx('Open receivables')} currency tone="warning" />
          <KpiCard label={tx('Pending Agreements')} value={safeWorkspace.kpis.pendingAgreements} helper={tx('Contracts needing action')} tone="warning" />
          <KpiCard label={tx('Top Revenue')} value={safeWorkspace.kpis.topRevenue} helper={tx('Highest account revenue')} currency />
        </section>

        <WorkspaceFilterBar
          fields={[
            { key: 'search', label: 'Search', type: 'search', value: search, placeholder: 'Company, code, contact, phone', onChange: setSearch },
            { key: 'status', label: 'Status', type: 'select', value: statusFilter, onChange: setStatusFilter, options: [{ value: 'all', label: 'All statuses' }, ...uniqueOptions(rows.map((row) => row.status))] },
            { key: 'branch', label: 'Branch', type: 'select', value: branchFilter, onChange: setBranchFilter, options: [{ value: 'all', label: 'All branches' }, ...branchOptions] },
            { key: 'manager', label: 'Account Manager', type: 'select', value: managerFilter, onChange: setManagerFilter, options: [{ value: 'all', label: 'All managers' }, ...managerOptions] },
            { key: 'unpaid-only', label: 'Unpaid Only', type: 'select', value: unpaidOnly, onChange: setUnpaidOnly, options: [{ value: 'all', label: 'All balances' }, { value: 'yes', label: 'Unpaid only' }] },
            { key: 'active-agreement', label: 'Active Agreement', type: 'select', value: agreementOnly, onChange: setAgreementOnly, options: [{ value: 'all', label: 'All accounts' }, { value: 'yes', label: 'Active agreement only' }] },
          ]}
        />

        <section className="card workspace-table-card">
          <div className="workspace-section-header">
            <div>
              <div className="eyebrow">Customer Accounts</div>
              <h3>{tx('Commercial accounts table')}</h3>
            </div>
            <div className="label">{filteredRows.length} {tx('accounts')}</div>
          </div>
          {!filteredRows.length ? (
            <div className="empty-state inline-state-card"><p>{tx('No customers match the current filters.')}</p></div>
          ) : (
            <div className="table-shell">
              <table className="data-table workspace-data-table">
                <thead>
                  <tr>
                    <th>{tx('Customer')}</th>
                    <th>{tx('Contact')}</th>
                    <th>{tx('Branch')}</th>
                    <th>{tx('Active Trips')}</th>
                    <th>{tx('Agreements')}</th>
                    <th>{tx('Unpaid Balance')}</th>
                    <th>{tx('Status')}</th>
                    <th>{tx('Account Manager')}</th>
                    <th>{tx('Action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.id} onClick={() => setSelectedId(row.id)} className="console-click-row">
                      <td>
                        <div className="workspace-cell-stack">
                          <strong>{row.companyName}</strong>
                          <span>{row.customerCode}</span>
                        </div>
                      </td>
                      <td>
                        <div className="workspace-cell-stack">
                          <strong>{row.contactPerson}</strong>
                          <span>{row.phone}</span>
                        </div>
                      </td>
                      <td>{row.branch}</td>
                      <td>{row.activeTrips}</td>
                      <td>{row.agreements}</td>
                      <td>ETB {formatNumber(row.unpaidBalance)}</td>
                      <td><span className={`status-badge ${toneForStatus(row.status)}`}>{labelize(row.status)}</span></td>
                      <td>
                        <div className="workspace-cell-stack">
                          <strong>{row.accountManager}</strong>
                          <span>{row.accountManagerPhone}</span>
                        </div>
                      </td>
                      <td><span className="inline-action">{tx('Open detail')}</span></td>
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
          title={selected.companyName}
          subtitle={`${selected.customerCode} · ${selected.branch} · ${selected.accountManager}`}
          onClose={() => setSelectedId(null)}
        >
          <section className="workspace-metric-pair-grid">
            <MetricPair label={tx('Contact')} value={`${selected.contactPerson} · ${selected.phone}`} />
            <MetricPair label={tx('Account Manager')} value={`${selected.accountManager} · ${selected.accountManagerPhone}`} />
            <MetricPair label={tx('Unpaid Balance')} value={`ETB ${formatNumber(selected.unpaidBalance)}`} />
            <MetricPair label={tx('Revenue')} value={`ETB ${formatNumber(selected.totalRevenue)}`} />
          </section>

          <DrawerSection title={tx('Active trips')} emptyMessage={tx('No active trips linked to this customer.')} tx={tx}>
            {selected.trips.map((trip) => (
              <DrawerRow key={trip.tripCode} title={trip.tripCode} subtitle={`${trip.route} · ETB ${formatNumber(trip.value)}`} meta={`${labelize(trip.status)} · ETA ${formatDate(trip.eta)}`} />
            ))}
          </DrawerSection>

          <DrawerSection title={tx('Agreements')} emptyMessage={tx('No agreement records are linked to this account.')} tx={tx}>
            {selected.agreementsDetail.map((agreement) => (
              <DrawerRow key={agreement.agreementCode} title={agreement.agreementCode} subtitle={`ETB ${formatNumber(agreement.totalValue)}`} meta={`${labelize(agreement.status)} · Ends ${formatDate(agreement.endDate)}`} />
            ))}
          </DrawerSection>

          <DrawerSection title={tx('Invoices')} emptyMessage={tx('No invoices are linked to this customer.')} tx={tx}>
            {selected.invoices.map((invoice) => (
              <DrawerRow key={invoice.invoiceCode} title={invoice.invoiceCode} subtitle={`Outstanding ETB ${formatNumber(invoice.outstandingAmount)}`} meta={`${labelize(invoice.status)} · Due ${formatDate(invoice.dueDate)}`} />
            ))}
          </DrawerSection>

          <DrawerSection title={tx('Payments')} emptyMessage={tx('No payments have been recorded yet.')} tx={tx}>
            {selected.payments.map((payment) => (
              <DrawerRow key={payment.paymentCode} title={payment.paymentCode} subtitle={`ETB ${formatNumber(payment.amount)}`} meta={`${labelize(payment.status)} · ${formatDate(payment.paymentDate)}`} />
            ))}
          </DrawerSection>

          <DrawerSection title={tx('Documents')} emptyMessage={tx('No customer documents are available.')} tx={tx}>
            {selected.documents.map((document) => (
              <DrawerRow key={`${document.title}-${document.category}`} title={document.title} subtitle={labelize(document.category)} meta={labelize(document.status)} />
            ))}
          </DrawerSection>
        </WorkspaceDetailDrawer>
      ) : null}
    </main>
  );
}

function normalizeRow(row: CustomerRow): CustomerRow {
  return {
    id: toStringValue(row.id, cryptoFallback(row.customerCode)),
    customerCode: toStringValue(row.customerCode, 'Customer'),
    companyName: toStringValue(row.companyName, 'Customer account'),
    contactPerson: toStringValue(row.contactPerson, 'Contact not assigned'),
    phone: toStringValue(row.phone, 'Phone not recorded'),
    branch: toStringValue(row.branch, 'Branch not assigned'),
    activeTrips: toNumberValue(row.activeTrips),
    agreements: toNumberValue(row.agreements),
    unpaidBalance: toNumberValue(row.unpaidBalance),
    status: toStringValue(row.status, 'active'),
    accountManager: toStringValue(row.accountManager, 'Commercial desk'),
    accountManagerPhone: toStringValue(row.accountManagerPhone, 'Phone not recorded'),
    hasActiveAgreement: toBooleanValue(row.hasActiveAgreement),
    trips: toArray(row.trips),
    agreementsDetail: toArray(row.agreementsDetail),
    invoices: toArray(row.invoices),
    payments: toArray(row.payments),
    documents: toArray(row.documents),
    totalRevenue: toNumberValue(row.totalRevenue),
    pendingAgreements: toNumberValue(row.pendingAgreements),
  };
}

function KpiCard({ label, value, helper, tone = 'info', currency = false }: { label: string; value: number; helper: string; tone?: string; currency?: boolean }) {
  return (
    <section className="card workspace-kpi-card">
      <div className="eyebrow">{label}</div>
      <div className={`kpi-value ${tone}`}>{currency ? `ETB ${formatNumber(value)}` : formatNumber(value)}</div>
      <div className="label">{helper}</div>
    </section>
  );
}

function DrawerSection({ title, emptyMessage, children, tx }: { title: string; emptyMessage: string; children: ReactNode[] | ReactNode; tx: (text: string) => string }) {
  const items = Array.isArray(children) ? children : [children];
  return (
    <section className="workspace-detail-card">
      <div className="workspace-section-header">
        <div>
          <div className="eyebrow">{tx('Detail')}</div>
          <h3>{title}</h3>
        </div>
      </div>
      <div className="workspace-detail-list">
        {items.length && items.some(Boolean) ? items : <div className="empty-state inline-state-card"><p>{emptyMessage}</p></div>}
      </div>
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

function labelize(value: string) {
  return value.replace(/_/g, ' ');
}

function toneForStatus(value: string) {
  if (['inactive', 'blocked', 'expired'].includes(value)) return 'critical';
  if (['under_review', 'pending_signature'].includes(value)) return 'warning';
  if (['active', 'signed'].includes(value)) return 'good';
  return 'info';
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : 'Not scheduled';
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

function cryptoFallback(seed: string) {
  return seed || 'customer-row';
}
