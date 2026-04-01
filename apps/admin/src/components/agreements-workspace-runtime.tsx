'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { useConsoleI18n } from '../lib/use-console-i18n';
import { WorkspaceDetailDrawer } from './workspace-detail-drawer';
import { WorkspaceFilterBar } from './workspace-filter-bar';
import { toArray, toBooleanValue, toNumberValue, toObject, toStringValue } from '../lib/normalize';

type AgreementRow = {
  id: string;
  agreementCode: string;
  customer: string;
  status: string;
  value: number;
  startDate: string | null;
  endDate: string | null;
  signStatus: string;
  signedAt: string | null;
  pdfUrl: string;
  signer: string;
  signerPhone: string;
  secureSignLink: string | null;
  expiringSoon: boolean;
  expired: boolean;
  auditTrail: string[];
  documents: Array<{ title: string; status: string; href: string }>;
};

type AgreementsWorkspace = {
  kpis: {
    total: number;
    signed: number;
    pendingSignature: number;
    underReview: number;
    expiringSoon: number;
    expired: number;
  };
  rows: AgreementRow[];
};

const emptyWorkspace: AgreementsWorkspace = {
  kpis: { total: 0, signed: 0, pendingSignature: 0, underReview: 0, expiringSoon: 0, expired: 0 },
  rows: [],
};

export function AgreementsWorkspaceRuntime({ workspace }: { workspace: AgreementsWorkspace | null }) {
  const { tx } = useConsoleI18n();
  const safeWorkspace = toObject(workspace, emptyWorkspace);
  const rows = useMemo(() => toArray<AgreementRow>(safeWorkspace.rows).map(normalizeRow), [safeWorkspace.rows]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [signFilter, setSignFilter] = useState('all');
  const [expiringFilter, setExpiringFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filteredRows = rows.filter((row) => {
    const haystack = `${row.agreementCode} ${row.customer} ${row.signer}`.toLowerCase();
    if (search && !haystack.includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && row.status !== statusFilter) return false;
    if (customerFilter !== 'all' && row.customer !== customerFilter) return false;
    if (signFilter !== 'all' && row.signStatus !== signFilter) return false;
    if (expiringFilter === 'yes' && !row.expiringSoon) return false;
    if (dateFrom && row.startDate && new Date(row.startDate).getTime() < new Date(dateFrom).getTime()) return false;
    if (dateTo && row.endDate && new Date(row.endDate).getTime() > new Date(dateTo).getTime()) return false;
    return true;
  });

  const selected = filteredRows.find((row) => row.id === selectedId) ?? rows.find((row) => row.id === selectedId) ?? null;

  return (
    <main className="shell">
      <div className="panel workspace-shell">
        <section className="workspace-header">
          <div className="workspace-header-copy">
            <div className="eyebrow">{tx('Contract Lifecycle')}</div>
            <h1>{tx('Agreements')}</h1>
            <p>{tx('Contract status, value, signature state, and renewal timing.')}</p>
          </div>
        </section>

        <section className="workspace-kpi-grid">
          <KpiCard label={tx('Total')} value={safeWorkspace.kpis.total} helper={tx('Agreements in scope')} />
          <KpiCard label={tx('Signed')} value={safeWorkspace.kpis.signed} helper={tx('Ready for execution')} tone="good" />
          <KpiCard label={tx('Pending Signature')} value={safeWorkspace.kpis.pendingSignature} helper={tx('Waiting on customer signer')} tone="warning" />
          <KpiCard label={tx('Under Review')} value={safeWorkspace.kpis.underReview} helper={tx('Internal review queue')} />
          <KpiCard label={tx('Expiring Soon')} value={safeWorkspace.kpis.expiringSoon} helper={tx('Renewal attention within 21 days')} tone="warning" />
          <KpiCard label={tx('Expired')} value={safeWorkspace.kpis.expired} helper={tx('Needs renewal or closure')} tone="critical" />
        </section>

        <WorkspaceFilterBar
          fields={[
            { key: 'search', label: 'Search', type: 'search', value: search, placeholder: 'Agreement, customer, signer', onChange: setSearch },
            { key: 'status', label: 'Status', type: 'select', value: statusFilter, onChange: setStatusFilter, options: [{ value: 'all', label: 'All statuses' }, ...uniqueOptions(rows.map((row) => row.status))] },
            { key: 'customer', label: 'Customer', type: 'select', value: customerFilter, onChange: setCustomerFilter, options: [{ value: 'all', label: 'All customers' }, ...uniqueOptions(rows.map((row) => row.customer))] },
            { key: 'sign-status', label: 'Sign Status', type: 'select', value: signFilter, onChange: setSignFilter, options: [{ value: 'all', label: 'All sign states' }, ...uniqueOptions(rows.map((row) => row.signStatus))] },
            { key: 'expiring', label: 'Expiring Soon', type: 'select', value: expiringFilter, onChange: setExpiringFilter, options: [{ value: 'all', label: 'All dates' }, { value: 'yes', label: 'Expiring soon only' }] },
            { key: 'from', label: 'Start From', type: 'date', value: dateFrom, onChange: setDateFrom },
            { key: 'to', label: 'End By', type: 'date', value: dateTo, onChange: setDateTo },
          ]}
        />

        <section className="card workspace-table-card">
          <div className="workspace-section-header">
            <div>
              <div className="eyebrow">{tx('Contract Register')}</div>
              <h3>{tx('Agreement lifecycle table')}</h3>
            </div>
            <div className="label">{filteredRows.length} {tx('agreements')}</div>
          </div>
          {!filteredRows.length ? (
            <div className="empty-state inline-state-card"><p>{tx('No agreements match the current filters.')}</p></div>
          ) : (
            <div className="table-shell">
              <table className="data-table workspace-data-table">
                <thead>
                  <tr>
                    <th>{tx('Agreement ID')}</th>
                    <th>{tx('Customer')}</th>
                    <th>{tx('Status')}</th>
                    <th>{tx('Value')}</th>
                    <th>{tx('Start')}</th>
                    <th>{tx('End')}</th>
                    <th>{tx('Sign Status')}</th>
                    <th>{tx('Signed At')}</th>
                    <th>{tx('PDF')}</th>
                    <th>{tx('Action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.id} onClick={() => setSelectedId(row.id)} style={{ cursor: 'pointer' }}>
                      <td>{row.agreementCode}</td>
                      <td>{row.customer}</td>
                      <td><span className={`status-badge ${toneForStatus(row.status)}`}>{labelize(row.status)}</span></td>
                      <td>ETB {formatNumber(row.value)}</td>
                      <td>{formatDate(row.startDate)}</td>
                      <td>{formatDate(row.endDate)}</td>
                      <td><span className={`status-badge ${toneForStatus(row.signStatus)}`}>{labelize(row.signStatus)}</span></td>
                      <td>{formatDate(row.signedAt)}</td>
                      <td><a href={row.pdfUrl} className="inline-action" onClick={(event) => event.stopPropagation()}>{tx('Open PDF')}</a></td>
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
          title={selected.agreementCode}
          subtitle={`${selected.customer} · ${labelize(selected.status)} · ETB ${formatNumber(selected.value)}`}
          onClose={() => setSelectedId(null)}
          actions={selected.secureSignLink ? <a className="btn btn-secondary btn-compact" href={selected.secureSignLink}>{tx('Open sign link')}</a> : null}
        >
          <section className="workspace-metric-pair-grid">
            <MetricPair label={tx('Signer')} value={`${selected.signer} · ${selected.signerPhone}`} />
            <MetricPair label={tx('Sign Status')} value={labelize(selected.signStatus)} />
            <MetricPair label={tx('Start')} value={formatDate(selected.startDate)} />
            <MetricPair label={tx('End')} value={formatDate(selected.endDate)} />
          </section>

          <DrawerSection title={tx('Agreement scope')} tx={tx}>
            <DrawerRow title={tx('Contract value')} subtitle={`ETB ${formatNumber(selected.value)}`} meta={`${tx('Status')} ${labelize(selected.status)}`} />
            <DrawerRow title={tx('PDF package')} subtitle={tx('Primary contract and signed copy')} meta={tx('Available from PDF actions below')} />
          </DrawerSection>

          <DrawerSection title={tx('Audit trail')} tx={tx}>
            {selected.auditTrail.map((item, index) => (
              <DrawerRow key={`${selected.id}-audit-${index}`} title={`${tx('Step')} ${index + 1}`} subtitle={item} meta={index === selected.auditTrail.length - 1 ? tx('Latest') : tx('Completed')} />
            ))}
          </DrawerSection>

          <DrawerSection title={tx('Documents')} tx={tx}>
            {selected.documents.map((document) => (
              <DrawerRow key={document.title} title={document.title} subtitle={labelize(document.status)} meta={document.href} />
            ))}
          </DrawerSection>
        </WorkspaceDetailDrawer>
      ) : null}
    </main>
  );
}

function normalizeRow(row: AgreementRow): AgreementRow {
  return {
    id: toStringValue(row.id, row.agreementCode || 'agreement-row'),
    agreementCode: toStringValue(row.agreementCode, 'Agreement'),
    customer: toStringValue(row.customer, 'Customer pending'),
    status: toStringValue(row.status, 'draft'),
    value: toNumberValue(row.value),
    startDate: row.startDate || null,
    endDate: row.endDate || null,
    signStatus: toStringValue(row.signStatus, 'unsigned'),
    signedAt: row.signedAt || null,
    pdfUrl: toStringValue(row.pdfUrl, '#'),
    signer: toStringValue(row.signer, 'Pending signer'),
    signerPhone: toStringValue(row.signerPhone, 'Phone pending'),
    secureSignLink: row.secureSignLink || null,
    expiringSoon: toBooleanValue(row.expiringSoon),
    expired: toBooleanValue(row.expired),
    auditTrail: toArray<string>(row.auditTrail),
    documents: toArray(row.documents),
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

function labelize(value: string) {
  return value.replace(/_/g, ' ');
}

function toneForStatus(value: string) {
  if (['expired', 'unsigned'].includes(value)) return 'critical';
  if (['under_review', 'awaiting_signature', 'pending_signature', 'expiring_soon'].includes(value)) return 'warning';
  if (['signed'].includes(value)) return 'good';
  return 'info';
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : 'Not set';
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}
