'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { WorkspaceDetailDrawer } from './workspace-detail-drawer';
import { WorkspaceFilterBar } from './workspace-filter-bar';
import { toArray, toNumberValue, toObject, toStringValue } from '../lib/normalize';

type LeadRow = {
  id: string;
  leadCode: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  branch: string;
  routeInterest: string;
  status: string;
  assignedTo: string;
  notes: string;
  quotes: Array<{ quoteCode: string; status: string; amount: number }>;
  pendingAgreements: number;
  followUps: Array<{ taskCode: string; title: string; status: string; dueAt: string | null }>;
};

type MarketingWorkspace = {
  kpis: {
    newLeads: number;
    openQuotes: number;
    pendingFollowUp: number;
    pendingAgreements: number;
    availableVehiclesToOffer: number;
    conversionThisMonth: number;
  };
  leads: LeadRow[];
  quoteRequests: Array<{ id: string; quoteCode: string; customer: string; route: string; vehicleType: string; amount: number; status: string; requestedDate: string | null }>;
  availableByBranch: Array<{ branch: string; availableVehicles: number; highlightedVehicle: string }>;
  followUpTasks: Array<{ id: string; taskCode: string; customerId: string | null; title: string; status: string; dueAt: string | null; assignedTo: string }>;
};

const emptyWorkspace: MarketingWorkspace = {
  kpis: { newLeads: 0, openQuotes: 0, pendingFollowUp: 0, pendingAgreements: 0, availableVehiclesToOffer: 0, conversionThisMonth: 0 },
  leads: [],
  quoteRequests: [],
  availableByBranch: [],
  followUpTasks: [],
};

export function MarketingWorkspaceRuntime({ workspace }: { workspace: MarketingWorkspace | null }) {
  const safeWorkspace = toObject(workspace, emptyWorkspace);
  const leads = useMemo(() => toArray<LeadRow>(safeWorkspace.leads).map(normalizeLead), [safeWorkspace.leads]);
  const quoteRequests = useMemo(() => toArray(safeWorkspace.quoteRequests), [safeWorkspace.quoteRequests]);
  const followUps = useMemo(() => toArray(safeWorkspace.followUpTasks), [safeWorkspace.followUpTasks]);
  const branches = useMemo(() => toArray(safeWorkspace.availableByBranch), [safeWorkspace.availableByBranch]);

  const [search, setSearch] = useState('');
  const [leadStatus, setLeadStatus] = useState('all');
  const [quoteStatus, setQuoteStatus] = useState('all');
  const [marketer, setMarketer] = useState('all');
  const [branch, setBranch] = useState('all');
  const [customer, setCustomer] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filteredLeads = leads.filter((lead) => {
    const haystack = `${lead.companyName} ${lead.leadCode} ${lead.contactPerson} ${lead.phone}`.toLowerCase();
    if (search && !haystack.includes(search.toLowerCase())) return false;
    if (leadStatus !== 'all' && lead.status !== leadStatus) return false;
    if (marketer !== 'all' && lead.assignedTo !== marketer) return false;
    if (branch !== 'all' && lead.branch !== branch) return false;
    if (customer !== 'all' && lead.companyName !== customer) return false;
    if (quoteStatus !== 'all' && !lead.quotes.some((quote) => quote.status === quoteStatus)) return false;
    return true;
  });

  const selected = filteredLeads.find((lead) => lead.id === selectedId) ?? leads.find((lead) => lead.id === selectedId) ?? null;

  return (
    <main className="shell">
      <div className="panel workspace-shell">
        <section className="workspace-header">
          <div className="workspace-header-copy">
            <div className="eyebrow">Commercial Pipeline</div>
            <h1>Marketing</h1>
            <p>Lead pipeline, quote pressure, branch supply, and follow-up actions connected to commercial handoff.</p>
          </div>
        </section>

        <section className="workspace-kpi-grid">
          <KpiCard label="New Leads" value={safeWorkspace.kpis.newLeads} helper="Fresh accounts in pipeline" />
          <KpiCard label="Open Quotes" value={safeWorkspace.kpis.openQuotes} helper="Pricing still active" />
          <KpiCard label="Pending Follow-Up" value={safeWorkspace.kpis.pendingFollowUp} helper="Tasks due across the desk" tone="warning" />
          <KpiCard label="Pending Agreements" value={safeWorkspace.kpis.pendingAgreements} helper="Commercial closure queue" tone="warning" />
          <KpiCard label="Available Vehicles" value={safeWorkspace.kpis.availableVehiclesToOffer} helper="Units ready to offer" tone="good" />
          <KpiCard label="Conversion This Month" value={safeWorkspace.kpis.conversionThisMonth} helper="Closed-won ratio %" suffix="%" />
        </section>

        <WorkspaceFilterBar
          fields={[
            { key: 'search', label: 'Search', type: 'search', value: search, placeholder: 'Lead, company, contact, phone', onChange: setSearch },
            { key: 'lead-status', label: 'Lead Status', type: 'select', value: leadStatus, onChange: setLeadStatus, options: [{ value: 'all', label: 'All leads' }, ...uniqueOptions(leads.map((lead) => lead.status))] },
            { key: 'quote-status', label: 'Quote Status', type: 'select', value: quoteStatus, onChange: setQuoteStatus, options: [{ value: 'all', label: 'All quote states' }, ...uniqueOptions(quoteRequests.map((quote: any) => toStringValue(quote.status)))] },
            { key: 'marketer', label: 'Marketer', type: 'select', value: marketer, onChange: setMarketer, options: [{ value: 'all', label: 'All owners' }, ...uniqueOptions(leads.map((lead) => lead.assignedTo))] },
            { key: 'branch', label: 'Branch', type: 'select', value: branch, onChange: setBranch, options: [{ value: 'all', label: 'All branches' }, ...uniqueOptions(leads.map((lead) => lead.branch))] },
            { key: 'customer', label: 'Customer', type: 'select', value: customer, onChange: setCustomer, options: [{ value: 'all', label: 'All companies' }, ...uniqueOptions(leads.map((lead) => lead.companyName))] },
          ]}
        />

        <section className="workspace-split-grid">
          <section className="card workspace-table-card">
            <div className="workspace-section-header">
              <div>
                <div className="eyebrow">Lead Pipeline</div>
                <h3>Pipeline accounts</h3>
              </div>
              <div className="label">{filteredLeads.length} leads</div>
            </div>
            {!filteredLeads.length ? (
              <div className="empty-state inline-state-card"><p>No leads match the current filters.</p></div>
            ) : (
              <div className="table-shell">
                <table className="data-table workspace-data-table">
                  <thead>
                    <tr>
                      <th>Lead</th>
                      <th>Contact</th>
                      <th>Branch</th>
                      <th>Route Interest</th>
                      <th>Status</th>
                      <th>Owner</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((lead) => (
                      <tr key={lead.id} onClick={() => setSelectedId(lead.id)} style={{ cursor: 'pointer' }}>
                        <td>
                          <div className="workspace-cell-stack">
                            <strong>{lead.companyName}</strong>
                            <span>{lead.leadCode}</span>
                          </div>
                        </td>
                        <td>
                          <div className="workspace-cell-stack">
                            <strong>{lead.contactPerson}</strong>
                            <span>{lead.phone}</span>
                          </div>
                        </td>
                        <td>{lead.branch}</td>
                        <td>{lead.routeInterest}</td>
                        <td><span className={`status-badge ${toneForStatus(lead.status)}`}>{labelize(lead.status)}</span></td>
                        <td>{lead.assignedTo}</td>
                        <td><span className="inline-action">Open detail</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="workspace-side-list">
            <section className="card workspace-detail-card">
              <div className="workspace-section-header">
                <div>
                  <div className="eyebrow">Supply View</div>
                  <h3>Available vehicles by branch</h3>
                </div>
              </div>
              <div className="workspace-detail-list">
                {branches.map((item: any) => (
                  <div className="workspace-detail-row" key={toStringValue(item.branch)}>
                    <div className="workspace-cell-stack">
                      <strong>{toStringValue(item.branch, 'Branch')}</strong>
                      <span>{toStringValue(item.highlightedVehicle, 'No ready unit')}</span>
                    </div>
                    <div className="label">{toNumberValue(item.availableVehicles)} ready</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="card workspace-detail-card">
              <div className="workspace-section-header">
                <div>
                  <div className="eyebrow">Follow-Up Queue</div>
                  <h3>Tasks</h3>
                </div>
              </div>
              <div className="workspace-detail-list">
                {followUps.slice(0, 6).map((task: any) => (
                  <div className="workspace-detail-row" key={toStringValue(task.id, toStringValue(task.taskCode))}>
                    <div className="workspace-cell-stack">
                      <strong>{toStringValue(task.title, 'Follow-up')}</strong>
                      <span>{toStringValue(task.assignedTo, 'Marketing desk')}</span>
                    </div>
                    <div className="label">{labelize(toStringValue(task.status, 'pending'))} · {formatDate(task.dueAt || null)}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>

        <section className="card workspace-table-card">
          <div className="workspace-section-header">
            <div>
              <div className="eyebrow">Quote Requests</div>
              <h3>Open and recent quote requests</h3>
            </div>
          </div>
          <div className="table-shell">
            <table className="data-table workspace-data-table">
              <thead>
                <tr>
                  <th>Quote</th>
                  <th>Customer</th>
                  <th>Route</th>
                  <th>Vehicle Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Requested Date</th>
                </tr>
              </thead>
              <tbody>
                {quoteRequests.slice(0, 10).map((quote: any) => (
                  <tr key={toStringValue(quote.id, toStringValue(quote.quoteCode))}>
                    <td>{toStringValue(quote.quoteCode, 'Quote')}</td>
                    <td>{toStringValue(quote.customer, 'Prospect')}</td>
                    <td>{toStringValue(quote.route, 'Route pending')}</td>
                    <td>{toStringValue(quote.vehicleType, 'Open vehicle')}</td>
                    <td>ETB {formatNumber(toNumberValue(quote.amount))}</td>
                    <td><span className={`status-badge ${toneForStatus(toStringValue(quote.status, 'requested'))}`}>{labelize(toStringValue(quote.status, 'requested'))}</span></td>
                    <td>{formatDate(quote.requestedDate || null)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {selected ? (
        <WorkspaceDetailDrawer
          title={selected.companyName}
          subtitle={`${selected.leadCode} · ${selected.branch} · ${selected.assignedTo}`}
          onClose={() => setSelectedId(null)}
        >
          <section className="workspace-metric-pair-grid">
            <MetricPair label="Contact" value={`${selected.contactPerson} · ${selected.phone}`} />
            <MetricPair label="Route Interest" value={selected.routeInterest} />
            <MetricPair label="Status" value={labelize(selected.status)} />
            <MetricPair label="Pending Agreements" value={String(selected.pendingAgreements)} />
          </section>

          <DrawerSection title="Lead notes">
            <DrawerRow title="Commercial note" subtitle={selected.notes} meta={`Owner ${selected.assignedTo}`} />
          </DrawerSection>

          <DrawerSection title="Quote history">
            {selected.quotes.map((quote) => (
              <DrawerRow key={quote.quoteCode} title={quote.quoteCode} subtitle={`ETB ${formatNumber(quote.amount)}`} meta={labelize(quote.status)} />
            ))}
          </DrawerSection>

          <DrawerSection title="Follow-up tasks">
            {selected.followUps.map((task) => (
              <DrawerRow key={task.taskCode} title={task.title} subtitle={task.taskCode} meta={`${labelize(task.status)} · ${formatDate(task.dueAt)}`} />
            ))}
          </DrawerSection>
        </WorkspaceDetailDrawer>
      ) : null}
    </main>
  );
}

function normalizeLead(lead: LeadRow): LeadRow {
  return {
    id: toStringValue(lead.id, lead.leadCode || 'lead-row'),
    leadCode: toStringValue(lead.leadCode, 'Lead'),
    companyName: toStringValue(lead.companyName, 'Prospect'),
    contactPerson: toStringValue(lead.contactPerson, 'Contact pending'),
    phone: toStringValue(lead.phone, 'Phone pending'),
    branch: toStringValue(lead.branch, 'Unknown branch'),
    routeInterest: toStringValue(lead.routeInterest, 'Route pending'),
    status: toStringValue(lead.status, 'new'),
    assignedTo: toStringValue(lead.assignedTo, 'Marketing desk'),
    notes: toStringValue(lead.notes, 'Follow-up required.'),
    quotes: toArray(lead.quotes),
    pendingAgreements: toNumberValue(lead.pendingAgreements),
    followUps: toArray(lead.followUps),
  };
}

function KpiCard({ label, value, helper, tone = 'info', suffix = '' }: { label: string; value: number; helper: string; tone?: string; suffix?: string }) {
  return (
    <section className="card workspace-kpi-card">
      <div className="eyebrow">{label}</div>
      <div className={`kpi-value ${tone}`}>{formatNumber(value)}{suffix}</div>
      <div className="label">{helper}</div>
    </section>
  );
}

function DrawerSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="workspace-detail-card">
      <div className="workspace-section-header">
        <div>
          <div className="eyebrow">Detail</div>
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
  if (['lost'].includes(value)) return 'critical';
  if (['quoted', 'requested', 'pending'].includes(value)) return 'warning';
  if (['won', 'onboarding'].includes(value)) return 'good';
  return 'info';
}

function labelize(value: string) {
  return value.replace(/_/g, ' ');
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : 'No due date';
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}
