'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { useConsoleI18n } from '../lib/use-console-i18n';
import { WorkspaceDetailDrawer } from './workspace-detail-drawer';
import { WorkspaceFilterBar } from './workspace-filter-bar';
import { toArray, toObject, toStringValue } from '../lib/normalize';
import { DocumentFormKitPanel } from './document-form-kit-panel';

type DocumentRow = {
  id: string;
  title: string;
  fileName?: string;
  category: string;
  entityType: string;
  entityId: string;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
  downloadUrl: string;
};

type Workspace = {
  rows: DocumentRow[];
};

const emptyWorkspace: Workspace = { rows: [] };

export function DocumentsWorkspaceRuntime({ workspace }: { workspace: Workspace | null }) {
  const { tx } = useConsoleI18n();
  const safeWorkspace = toObject(workspace, emptyWorkspace);
  const rows = useMemo(() => toArray<DocumentRow>(safeWorkspace.rows).map(normalizeRow), [safeWorkspace.rows]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filteredRows = rows.filter((row) => {
    const haystack = `${row.title} ${row.fileName || ''} ${row.entityType} ${row.entityId}`.toLowerCase();
    if (search && !haystack.includes(search.toLowerCase())) return false;
    if (typeFilter !== 'all' && row.category !== typeFilter) return false;
    if (ownerFilter !== 'all' && row.entityType !== ownerFilter) return false;
    if (statusFilter !== 'all' && row.status !== statusFilter) return false;
    return true;
  });

  const selected = filteredRows.find((row) => row.id === selectedId) ?? rows.find((row) => row.id === selectedId) ?? null;
  const recentUploads = rows.filter((row) => isWithinDays(row.createdAt, 7)).length;
  const expiringDocs = rows.filter((row) => ['pending_renewal', 'expired'].includes(row.status)).length;
  const signedAgreements = rows.filter((row) => row.entityType === 'agreement').length;
  const podReceipts = rows.filter((row) => ['proof_of_delivery', 'receipt', 'fuel_receipt'].includes(row.category)).length;

  return (
    <main className="shell">
      <div className="panel workspace-shell">
        <section className="workspace-header">
          <div className="workspace-header-copy">
            <div className="eyebrow">{tx('Document Center')}</div>
            <h1>{tx('Documents')}</h1>
            <p>{tx('Linked document records with status, owner, and download context.')}</p>
          </div>
        </section>

        <section className="workspace-kpi-grid">
          <KpiCard label={tx('Total')} value={rows.length} helper={tx('Documents in scope')} />
          <KpiCard label={tx('Pending Review')} value={rows.filter((row) => row.status === 'pending').length} helper={tx('Awaiting approval')} tone="warning" />
          <KpiCard label={tx('Recent Uploads')} value={recentUploads} helper={tx('Uploaded in the last 7 days')} />
          <KpiCard label={tx('Expiring Docs')} value={expiringDocs} helper={tx('Needs renewal or review')} tone="warning" />
          <KpiCard label={tx('Signed Agreements')} value={signedAgreements} helper={tx('Contract records')} tone="good" />
          <KpiCard label={tx('POD / Receipts')} value={podReceipts} helper={tx('Operational proof documents')} />
        </section>

        <DocumentFormKitPanel />

        <WorkspaceFilterBar
          fields={[
            { key: 'search', label: 'Search', type: 'search', value: search, placeholder: 'Document, owner, linked record', onChange: setSearch },
            { key: 'type', label: 'Document Type', type: 'select', value: typeFilter, onChange: setTypeFilter, options: [{ value: 'all', label: 'All document types' }, ...uniqueOptions(rows.map((row) => row.category))] },
            { key: 'owner', label: 'Owner Type', type: 'select', value: ownerFilter, onChange: setOwnerFilter, options: [{ value: 'all', label: 'All owners' }, ...uniqueOptions(rows.map((row) => row.entityType))] },
            { key: 'status', label: 'Status', type: 'select', value: statusFilter, onChange: setStatusFilter, options: [{ value: 'all', label: 'All statuses' }, ...uniqueOptions(rows.map((row) => row.status))] },
          ]}
        />

        <section className="card workspace-table-card">
          <div className="workspace-section-header">
            <div>
              <div className="eyebrow">{tx('Document Register')}</div>
              <h3>{tx('Versioned document table')}</h3>
            </div>
          </div>
          {!filteredRows.length ? (
            <div className="empty-state inline-state-card"><p>{tx('No documents match the current filters.')}</p></div>
          ) : (
            <div className="table-shell">
              <table className="data-table workspace-data-table">
                <thead>
                  <tr>
                    <th>{tx('Document Name')}</th>
                    <th>{tx('Type')}</th>
                    <th>{tx('Owner')}</th>
                    <th>{tx('Linked Record')}</th>
                    <th>{tx('Uploaded Date')}</th>
                    <th>{tx('Status')}</th>
                    <th>{tx('Expiry')}</th>
                    <th>{tx('Action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.id} onClick={() => setSelectedId(row.id)} style={{ cursor: 'pointer' }}>
                      <td>
                        <div className="workspace-cell-stack">
                          <strong>{row.title}</strong>
                          <span>{row.fileName || row.title}</span>
                        </div>
                      </td>
                      <td>{labelize(row.category)}</td>
                      <td>{labelize(row.entityType)}</td>
                      <td>{row.entityId}</td>
                      <td>{formatDate(row.createdAt)}</td>
                      <td><span className={`status-badge ${toneForStatus(row.status)}`}>{labelize(row.status)}</span></td>
                      <td>{row.status === 'expired' ? tx('Expired') : row.updatedAt ? formatDate(row.updatedAt) : tx('Active')}</td>
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
          title={selected.title}
          subtitle={`${labelize(selected.category)} · ${labelize(selected.entityType)} · ${selected.entityId}`}
          onClose={() => setSelectedId(null)}
          actions={<a className="btn btn-secondary btn-compact" href={selected.downloadUrl}>{tx('Download')}</a>}
        >
          <section className="workspace-metric-pair-grid">
            <MetricPair label={tx('Linked Entity')} value={`${labelize(selected.entityType)} · ${selected.entityId}`} />
            <MetricPair label={tx('Status')} value={labelize(selected.status)} />
            <MetricPair label={tx('Uploaded')} value={formatDate(selected.createdAt)} />
            <MetricPair label={tx('Version')} value={tx('v1 current')} />
          </section>

          <DrawerSection title={tx('Preview and notes')} tx={tx}>
            <DrawerRow title={tx('Preview')} subtitle={selected.fileName || selected.title} meta={tx('Open the document download action to view the file.')} />
            <DrawerRow title={tx('Notes')} subtitle={tx('Latest uploaded version is active in the document register.')} meta={selected.updatedAt ? `${tx('Updated')} ${formatDate(selected.updatedAt)}` : tx('Original upload')} />
          </DrawerSection>

          <DrawerSection title={tx('Version history')} tx={tx}>
            <DrawerRow title={tx('Current version')} subtitle={selected.fileName || selected.title} meta={formatDate(selected.updatedAt || selected.createdAt)} />
          </DrawerSection>
        </WorkspaceDetailDrawer>
      ) : null}
    </main>
  );
}

function normalizeRow(row: DocumentRow): DocumentRow {
  return {
    id: toStringValue(row.id, 'document'),
    title: toStringValue(row.title, 'Document'),
    fileName: toStringValue(row.fileName || '', ''),
    category: toStringValue(row.category, 'document'),
    entityType: toStringValue(row.entityType, 'system'),
    entityId: toStringValue(row.entityId, 'N/A'),
    status: toStringValue(row.status, 'available'),
    createdAt: row.createdAt || null,
    updatedAt: row.updatedAt || null,
    downloadUrl: toStringValue(row.downloadUrl, '#'),
  };
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
  if (['expired', 'failed'].includes(value)) return 'critical';
  if (['pending', 'under_review'].includes(value)) return 'warning';
  if (['signed', 'approved', 'available', 'uploaded'].includes(value)) return 'good';
  return 'info';
}

function labelize(value: string) {
  return value.replace(/_/g, ' ');
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : 'Not set';
}

function isWithinDays(value: string | null, days: number) {
  return Boolean(value && new Date(value).getTime() >= Date.now() - days * 24 * 60 * 60 * 1000);
}
