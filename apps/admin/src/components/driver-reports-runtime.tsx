'use client';

import { useMemo, useState, useTransition } from 'react';
import { apiPatch } from '../lib/api';
import { formatDateTime, formatLocation, formatPerson, formatPhone, formatText } from '../lib/formatters';
import { useConsoleI18n } from '../lib/use-console-i18n';
import { WorkspaceDetailDrawer } from './workspace-detail-drawer';
import { WorkspaceFilterBar } from './workspace-filter-bar';

type ReportRow = Record<string, unknown>;

export function DriverReportsRuntime({ reports }: { reports: ReportRow[] }) {
  const { tx } = useConsoleI18n();
  const [reportRows, setReportRows] = useState(reports);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [status, setStatus] = useState('all');
  const [branch, setBranch] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();

  const typeOptions = useMemo(() => optionize(reportRows.map((report) => formatText(report.type, 'general_support'))), [reportRows]);
  const severityOptions = useMemo(() => optionize(reportRows.map((report) => formatText(report.severity, 'medium'))), [reportRows]);
  const statusOptions = useMemo(() => optionize(reportRows.map((report) => formatText(report.status, 'submitted'))), [reportRows]);
  const branchOptions = useMemo(() => optionize(reportRows.map((report) => formatText(report.branch, 'Unknown branch'))), [reportRows]);

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reportRows.filter((report) => {
      const reportType = formatText(report.type, 'general_support');
      const reportSeverity = formatText(report.severity, 'medium');
      const reportStatus = formatText(report.status, 'submitted');
      const reportBranch = formatText(report.branch, 'Unknown branch');
      if (type !== 'all' && reportType !== type) return false;
      if (severity !== 'all' && reportSeverity !== severity) return false;
      if (status !== 'all' && reportStatus !== status) return false;
      if (branch !== 'all' && reportBranch !== branch) return false;
      if (!query) return true;
      return [
        formatText(report.reportCode, 'Report'),
        reportType,
        reportSeverity,
        reportStatus,
        formatPerson(report.driver, 'Driver not assigned'),
        formatPhone(report.driverPhone),
        formatText(report.vehicle, 'Vehicle not assigned'),
        formatText(report.trip, 'Trip not assigned'),
        reportBranch,
        formatText(report.description),
      ].join(' ').toLowerCase().includes(query);
    });
  }, [branch, reportRows, search, severity, status, type]);

  const selectedReport = filteredReports.find((report) => formatText(report.id, '') === selectedId)
    ?? reportRows.find((report) => formatText(report.id, '') === selectedId)
    ?? null;

  function updateStatus(nextStatus: string) {
    if (!selectedReport) return;
    startTransition(async () => {
      try {
        const updated = await apiPatch<Record<string, unknown>>(`/driver-reports/${formatText(selectedReport.id, '')}/status`, {
          status: nextStatus,
        });
        setReportRows((current) => current.map((report) => (
          formatText(report.id, '') === formatText(selectedReport.id, '')
            ? {
                ...report,
                status: formatText(updated.status, nextStatus),
                assignedTo: assignedOwnerLabel(formatText(updated.status, nextStatus), formatText(report.type, 'general_support')),
              }
            : report
        )));
        setMessage(`${tx('Report moved to')} ${tx(nextStatus.replace(/_/g, ' '))}.`);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : tx('Failed to update report status.'));
      }
    });
  }

  return (
    <main className="shell">
      <div className="panel workspace-shell">
        <section className="workspace-header">
          <div className="workspace-header-copy">
            <div className="eyebrow">{tx('Incident Queue')}</div>
            <h1>{tx('Driver Reports Queue')}</h1>
            <p>{tx('Driver-submitted incidents, fuel, delays, and maintenance requests in one queue.')}</p>
          </div>
        </section>

        <WorkspaceFilterBar
          fields={[
            { key: 'search', label: 'Search', type: 'search', value: search, placeholder: 'Report code, driver, trip, vehicle', onChange: setSearch },
            { key: 'type', label: 'Type', type: 'select', value: type, onChange: setType, options: [{ value: 'all', label: 'All report types' }, ...typeOptions] },
            { key: 'severity', label: 'Severity', type: 'select', value: severity, onChange: setSeverity, options: [{ value: 'all', label: 'All severities' }, ...severityOptions] },
            { key: 'status', label: 'Status', type: 'select', value: status, onChange: setStatus, options: [{ value: 'all', label: 'All statuses' }, ...statusOptions] },
            { key: 'branch', label: 'Branch', type: 'select', value: branch, onChange: setBranch, options: [{ value: 'all', label: 'All branches' }, ...branchOptions] },
          ]}
        />

        <section className="card workspace-table-card">
          <div className="workspace-section-header">
            <div>
              <div className="eyebrow">{tx('Open Queue')}</div>
              <h3>{filteredReports.length} {tx('driver reports')}</h3>
            </div>
          </div>
          {!filteredReports.length ? (
            <div className="empty-state inline-state-card"><p>{tx('No driver reports match the current filters.')}</p></div>
          ) : (
            <div className="table-shell">
              <table className="data-table workspace-data-table">
                <thead>
                  <tr>
                    <th>{tx('Report')}</th>
                    <th>{tx('Driver')}</th>
                    <th>{tx('Phone')}</th>
                    <th>{tx('Vehicle')}</th>
                    <th>{tx('Trip')}</th>
                    <th>{tx('Location')}</th>
                    <th>{tx('Submitted')}</th>
                    <th>{tx('Status')}</th>
                    <th>{tx('Assigned to')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((report) => (
                    <tr key={formatText(report.id, formatText(report.reportCode, 'report-row'))} onClick={() => setSelectedId(formatText(report.id, ''))} style={{ cursor: 'pointer' }}>
                      <td>
                        <div className="workspace-cell-stack">
                          <strong>{formatText(report.reportCode, 'Report')}</strong>
                          <span>{tx(formatText(report.type, 'general_support').replace(/_/g, ' '))}</span>
                        </div>
                      </td>
                      <td>{formatPerson(report.driver, 'Driver not assigned')}</td>
                      <td>{formatPhone(report.driverPhone)}</td>
                      <td>{formatText(report.vehicle, 'Vehicle not assigned')}</td>
                      <td>{formatText(report.trip, 'Trip not assigned')}</td>
                      <td>{formatLocation(report.location)}</td>
                      <td>{formatDateTime(report.submitted)}</td>
                      <td><span className={`status-badge ${tone(formatText(report.status, 'submitted'))}`}>{tx(formatText(report.status, 'submitted').replace(/_/g, ' '))}</span></td>
                      <td>{tx(formatText(report.assignedTo, 'Dispatch queue'))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {selectedReport ? (
        <WorkspaceDetailDrawer
          title={formatText(selectedReport.reportCode, 'Driver report')}
          subtitle={`${tx(formatText(selectedReport.type, 'general_support').replace(/_/g, ' '))} · ${tx(formatText(selectedReport.status, 'submitted').replace(/_/g, ' '))}`}
          onClose={() => setSelectedId(null)}
          actions={(
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary btn-compact" disabled={pending} onClick={() => updateStatus('under_review')}>
                {pending ? tx('Updating...') : tx('Under Review')}
              </button>
              <button type="button" className="btn btn-secondary btn-compact" disabled={pending} onClick={() => updateStatus('resolved')}>
                {pending ? tx('Updating...') : tx('Resolve')}
              </button>
              <button type="button" className="btn btn-secondary btn-compact" disabled={pending} onClick={() => updateStatus('submitted')}>
                {pending ? tx('Updating...') : tx('Reopen')}
              </button>
            </div>
          )}
        >
          <section className="workspace-metric-pair-grid">
            <MetricPair label={tx('Driver')} value={formatPerson(selectedReport.driver, 'Driver not assigned')} />
            <MetricPair label={tx('Driver phone')} value={formatPhone(selectedReport.driverPhone)} />
            <MetricPair label={tx('Trip')} value={formatText(selectedReport.trip, 'Trip not assigned')} />
            <MetricPair label={tx('Vehicle')} value={formatText(selectedReport.vehicle, 'Vehicle not assigned')} />
            <MetricPair label={tx('Branch')} value={formatText(selectedReport.branch, 'Branch not assigned')} />
            <MetricPair label={tx('Reported at')} value={formatDateTime(selectedReport.submitted)} />
            <MetricPair label={tx('Severity')} value={tx(formatText(selectedReport.severity, 'medium').replace(/_/g, ' '))} />
            <MetricPair label={tx('Status')} value={tx(formatText(selectedReport.status, 'submitted').replace(/_/g, ' '))} />
            <MetricPair label={tx('Assigned to')} value={tx(formatText(selectedReport.assignedTo, 'Dispatch queue'))} />
            <MetricPair label={tx('Location')} value={formatLocation(selectedReport.location)} />
          </section>

          <section className="card workspace-detail-card">
            <div className="workspace-section-header">
              <div>
                <div className="eyebrow">{tx('Report Summary')}</div>
                <h3>{tx('Description')}</h3>
              </div>
            </div>
            <p style={{ marginTop: 0 }}>{formatText(selectedReport.description, tx('Driver report submitted for follow-up.'))}</p>
            <div className="workspace-detail-list">
              <div className="workspace-detail-row">
                <div className="workspace-cell-stack">
                  <strong>{tx('Trip context')}</strong>
                  <span>{formatText((selectedReport.tripDetail as Record<string, unknown> | null)?.route, 'Route not assigned')}</span>
                </div>
                <span className="label">{formatText((selectedReport.tripDetail as Record<string, unknown> | null)?.customer, 'Customer not assigned')}</span>
              </div>
              <div className="workspace-detail-row">
                <div className="workspace-cell-stack">
                  <strong>{tx('Vehicle context')}</strong>
                  <span>{formatText((selectedReport.vehicleDetail as Record<string, unknown> | null)?.plateNumber, 'Plate not recorded')}</span>
                </div>
                <span className="label">{tx(formatText((selectedReport.vehicleDetail as Record<string, unknown> | null)?.currentStatus, 'available').replace(/_/g, ' '))}</span>
              </div>
              <div className="workspace-detail-row">
                <div className="workspace-cell-stack">
                  <strong>{tx('Attachments')}</strong>
                  <span>{tx(attachmentSummary(selectedReport.attachments))}</span>
                </div>
                <span className="label">{formatText((selectedReport.tripDetail as Record<string, unknown> | null)?.eta ? formatDateTime((selectedReport.tripDetail as Record<string, unknown> | null)?.eta) : null, tx('ETA not recorded'))}</span>
              </div>
            </div>
            {message ? <div className="label" style={{ marginTop: 12 }}>{message}</div> : null}
          </section>
        </WorkspaceDetailDrawer>
      ) : null}
    </main>
  );
}

function optionize(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort().map((value) => ({ value, label: value.replace(/_/g, ' ') }));
}

function tone(value: string) {
  const normalized = value.toLowerCase();
  if (['resolved'].includes(normalized)) return 'good';
  if (['under_review', 'approved'].includes(normalized)) return 'warning';
  if (['submitted', 'critical'].includes(normalized)) return 'critical';
  return 'info';
}

function attachmentSummary(value: unknown) {
  if (!Array.isArray(value) || !value.length) return 'No attachments uploaded';
  return `${value.length} attachment${value.length === 1 ? '' : 's'} uploaded`;
}

function assignedOwnerLabel(status: string, type: string) {
  if (status === 'resolved') return 'Closed by operations';
  if (type === 'accident_report') return 'Safety lead';
  if (type === 'fuel_request') return 'Fleet desk';
  if (type === 'maintenance_needed' || type === 'tire_issue') return 'Maintenance desk';
  return status === 'under_review' ? 'Operations supervisor' : 'Dispatch queue';
}

function MetricPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="workspace-metric-pair">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
