'use client';

import Link from 'next/link';
import { startTransition, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { apiGet, apiHealth } from '../lib/api';
import { formatDateTime, formatText } from '../lib/formatters';
import { manualCorridorStorageUpdatedEvent } from '../lib/manual-corridor-journey';
import { readShippingPhase1Workspace, shippingDeskLink, shippingNextActionLabel, shippingPhase1UpdatedEvent, shippingStageLabel } from '../lib/shipping-phase1';
import { useConsoleI18n } from '../lib/use-console-i18n';

type HealthResponse = {
  status: string;
  service?: string;
  database?: {
    connected?: boolean;
    name?: string | null;
    state?: number;
  };
};

type MetricsResponse = {
  generatedAt: string;
  fleet: {
    byStatus: Record<string, number>;
    activeTrips: number;
    delayedTrips: number;
    blockedVehicles: number;
  };
  maintenance: {
    due: number;
    notificationsOpen: number;
  };
  incidents: {
    open: number;
    driverReportsOpen: number;
  };
  finance: {
    overdueInvoices: number;
    escalatedCollections: number;
    paymentsToday: number;
  };
  documents: {
    documentsToday: number;
    uploadedDocumentsToday: number;
  };
  activity: {
    activityFeedToday: number;
    fuelActivityToday: number;
    chatMessagesToday: number;
    unreadNotifications: number;
  };
  commercial: {
    agreementsAwaitingSignature: number;
    signedAgreementsThisWeek: number;
  };
  hr: {
    activeCandidates: number;
    averageEmployeePerformance: string;
  };
};

type KpiItem = {
  label: string;
  value: string;
  helper: string;
  tone: 'good' | 'warning' | 'critical' | 'info';
};

type CounterItem = {
  label: string;
  value: string;
  helper: string;
  tone: 'good' | 'warning' | 'critical' | 'info';
};

const TELEMETRY_ORDER = [
  'available',
  'blocked',
  'breakdown',
  'delayed',
  'in_djibouti',
  'in_transit',
  'loaded',
  'loading',
  'under_maintenance',
];

export function OperationsStatusRuntime() {
  const { tx } = useConsoleI18n();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);
  const [responseTimeMs, setResponseTimeMs] = useState<number | null>(null);
  const [shippingWorkspace, setShippingWorkspace] = useState(() => readShippingPhase1Workspace());

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const reload = () => setShippingWorkspace(readShippingPhase1Workspace());
    reload();
    window.addEventListener(shippingPhase1UpdatedEvent, reload as EventListener);
    window.addEventListener(manualCorridorStorageUpdatedEvent, reload as EventListener);
    return () => {
      window.removeEventListener(shippingPhase1UpdatedEvent, reload as EventListener);
      window.removeEventListener(manualCorridorStorageUpdatedEvent, reload as EventListener);
    };
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    const startedAt = performance.now();

    try {
      const [healthPayload, metricsPayload] = await Promise.all([
        apiHealth(),
        apiGet<MetricsResponse>('/metrics'),
      ]);
      setHealth(healthPayload);
      setMetrics(metricsPayload);
      setRefreshedAt(new Date().toISOString());
      setResponseTimeMs(Math.round(performance.now() - startedAt));
    } catch (loadError) {
      console.error('Failed to load operations status', loadError);
      setError(tx('The operations status workspace could not load the latest platform telemetry.'));
    } finally {
      setLoading(false);
    }
  }

  const fleetStatuses = useMemo(() => {
    const source = metrics?.fleet.byStatus || {};
    const ordered = TELEMETRY_ORDER
      .filter((status) => typeof source[status] === 'number')
      .map((status) => ({ status, count: Number(source[status] ?? 0) }));
    const remaining = Object.entries(source)
      .filter(([status]) => !TELEMETRY_ORDER.includes(status))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([status, count]) => ({ status, count: Number(count ?? 0) }));
    return [...ordered, ...remaining];
  }, [metrics?.fleet.byStatus]);

  const totalTelemetry = fleetStatuses.reduce((sum, item) => sum + item.count, 0);
  const platformTone = health?.status === 'ok' ? 'good' : 'critical';
  const databaseTone = health?.database?.connected ? 'good' : 'critical';

  const kpis: KpiItem[] = [
    {
      label: tx('Backend Health'),
      value: health?.status === 'ok' ? tx('Healthy') : tx('Attention needed'),
      helper: formatText(health?.service, tx('Backend service responding')),
      tone: platformTone,
    },
    {
      label: tx('Database'),
      value: health?.database?.connected ? tx('Connected') : tx('Disconnected'),
      helper: formatText(health?.database?.name, tx('Primary operational database')),
      tone: databaseTone,
    },
    {
      label: tx('Active Trips'),
      value: formatNumber(metrics?.fleet.activeTrips ?? 0),
      helper: tx('Trips currently active across the fleet'),
      tone: (metrics?.fleet.activeTrips ?? 0) > 0 ? 'info' : 'warning',
    },
    {
      label: tx('Delayed Trips'),
      value: formatNumber(metrics?.fleet.delayedTrips ?? 0),
      helper: tx('Trips requiring dispatch review'),
      tone: (metrics?.fleet.delayedTrips ?? 0) > 0 ? 'warning' : 'good',
    },
    {
      label: tx('Maintenance Due'),
      value: formatNumber(metrics?.maintenance.due ?? 0),
      helper: tx('Vehicles near or past service threshold'),
      tone: (metrics?.maintenance.due ?? 0) > 0 ? 'warning' : 'good',
    },
    {
      label: tx('Overdue Invoices'),
      value: formatNumber(metrics?.finance.overdueInvoices ?? 0),
      helper: tx('Finance follow-up required'),
      tone: (metrics?.finance.overdueInvoices ?? 0) > 0 ? 'critical' : 'good',
    },
    {
      label: tx('Unread Notifications'),
      value: formatNumber(metrics?.activity.unreadNotifications ?? 0),
      helper: tx('Support and admin alerts still open'),
      tone: (metrics?.activity.unreadNotifications ?? 0) > 0 ? 'info' : 'good',
    },
    {
      label: tx('Employee Performance'),
      value: formatText(metrics?.hr.averageEmployeePerformance, '0.00'),
      helper: tx('Average measured employee score'),
      tone: Number(metrics?.hr.averageEmployeePerformance ?? 0) >= 80 ? 'good' : 'warning',
    },
  ];

  const counters: CounterItem[] = [
    {
      label: tx('Driver reports open'),
      value: formatNumber(metrics?.incidents.driverReportsOpen ?? 0),
      helper: tx('Field issues requiring support review'),
      tone: (metrics?.incidents.driverReportsOpen ?? 0) > 0 ? 'warning' : 'good',
    },
    {
      label: tx('Field issues requiring review'),
      value: formatNumber(metrics?.incidents.open ?? 0),
      helper: tx('Accidents, breakdowns, and obstacles'),
      tone: (metrics?.incidents.open ?? 0) > 0 ? 'critical' : 'good',
    },
    {
      label: tx('Escalated collections'),
      value: formatNumber(metrics?.finance.escalatedCollections ?? 0),
      helper: tx('Receivables needing finance escalation'),
      tone: (metrics?.finance.escalatedCollections ?? 0) > 0 ? 'warning' : 'good',
    },
    {
      label: tx('Payments today'),
      value: formatNumber(metrics?.finance.paymentsToday ?? 0),
      helper: tx('Receipts booked today'),
      tone: 'good',
    },
    {
      label: tx('Documents uploaded'),
      value: formatNumber(metrics?.documents.uploadedDocumentsToday ?? 0),
      helper: tx('POD, receipts, and compliance uploads today'),
      tone: 'info',
    },
    {
      label: tx('Fuel activity today'),
      value: formatNumber(metrics?.activity.fuelActivityToday ?? 0),
      helper: tx('Fuel logs and requests submitted today'),
      tone: 'info',
    },
    {
      label: tx('Agreements awaiting signature'),
      value: formatNumber(metrics?.commercial.agreementsAwaitingSignature ?? 0),
      helper: tx('Commercial actions still pending'),
      tone: (metrics?.commercial.agreementsAwaitingSignature ?? 0) > 0 ? 'warning' : 'good',
    },
    {
      label: tx('Candidate pipeline'),
      value: formatNumber(metrics?.hr.activeCandidates ?? 0),
      helper: tx('HR hiring pipeline currently active'),
      tone: 'info',
    },
    {
      label: tx('Shipping docs active'),
      value: formatNumber(shippingWorkspace.bookings.filter((item) => item.currentStage !== 'Shipping packet complete').length),
      helper: tx('Bookings still moving through SI, BL, manifest, or finance gates'),
      tone: shippingWorkspace.bookings.some((item) => item.currentStage !== 'Shipping packet complete') ? 'warning' : 'good',
    },
    {
      label: tx('Shipping ready'),
      value: formatNumber(shippingWorkspace.bookings.filter((item) => item.currentStage === 'Shipping packet complete').length),
      helper: tx('Bookings whose shipping packet is fully clear for downstream execution'),
      tone: 'good',
    },
  ];
  const shippingBlockedRows = useMemo(
    () => shippingWorkspace.bookings.filter((item) => item.currentStage !== 'Shipping packet complete').slice(0, 6),
    [shippingWorkspace.bookings],
  );

  return (
    <div className="dashboard-console simplified-dashboard operations-status-console">
      <section className="operations-status-hero">
        <div className="operations-status-hero-copy">
          <div className="eyebrow">{tx('Operations Status')}</div>
          <h2>{tx('Platform health, telemetry, and support diagnostics')}</h2>
          <p>{tx('Use this workspace to confirm platform health, fleet telemetry, and support pressure without leaving the console.')}</p>
        </div>
        <div className="operations-status-hero-actions">
          <div className="operations-status-last-updated">
            <span>{tx('Last Updated')}</span>
            <strong>{formatDateTime(refreshedAt ?? metrics?.generatedAt, tx('Waiting for first refresh'))}</strong>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => exportSnapshot(health, metrics, refreshedAt, responseTimeMs)}
            disabled={!metrics && !health}
          >
            {tx('Export snapshot')}
          </button>
          <button
            type="button"
            className="btn btn-primary operations-status-refresh"
            onClick={() => startTransition(() => void load())}
            disabled={loading}
          >
            <span className={`refresh-dot ${loading ? 'spinning' : ''}`} aria-hidden="true" />
            {loading ? tx('Refreshing status...') : tx('Refresh Status')}
          </button>
        </div>
      </section>

      {error ? (
        <section className="card operations-panel">
          <div className="empty-state">
            <strong>{tx('Telemetry unavailable')}</strong>
            <p>{error}</p>
          </div>
        </section>
      ) : null}

      <section className="dashboard-question-row operations-panel">
          <div className="dashboard-question-header">
            <div>
              <div className="eyebrow">{tx('Support snapshot')}</div>
              <h3>{tx('Key health indicators')}</h3>
            </div>
          </div>
        <div className="operations-status-kpi-grid">
          {kpis.map((item) => (
            <div key={item.label} className={`operations-status-kpi-card ${item.tone}`}>
              <div className="operations-status-kpi-head">
                <span className="kpi-label">{item.label}</span>
                <span className={`status-badge ${item.tone}`}>{tx(toneLabel(item.tone))}</span>
              </div>
              <div className="kpi-value">{item.value}</div>
              <div className="kpi-supporting-text">{item.helper}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="operations-status-main-grid">
        <section className="dashboard-question-row operations-panel">
          <div className="dashboard-question-header">
            <div>
              <div className="eyebrow">{tx('Platform health')}</div>
              <h3>{tx('Core platform services')}</h3>
            </div>
          </div>
          <div className="operations-status-health-card">
            <div className="operations-status-health-topline">
              <div>
                <div className="operations-status-health-title">{tx('System readiness')}</div>
                <div className="operations-status-health-value">
                  <span className={`status-badge ${platformTone}`}>{health?.status === 'ok' ? tx('Online') : tx('Attention needed')}</span>
                </div>
              </div>
              <div className="operations-status-response">
                <span>{tx('Response time')}</span>
                <strong>{responseTimeMs !== null ? `${responseTimeMs} ms` : tx('Not measured yet')}</strong>
              </div>
            </div>
            <div className="operations-status-health-grid">
              <HealthItem label={tx('Backend status')} value={health?.status === 'ok' ? tx('Healthy') : tx('Unavailable')} tone={platformTone} />
              <HealthItem label={tx('Backend name')} value={formatText(health?.service, tx('Tikur Abay backend'))} />
              <HealthItem label={tx('Environment')} value={tx('Console diagnostics')} />
              <HealthItem label={tx('Database connection')} value={health?.database?.connected ? tx('Connected') : tx('Disconnected')} tone={databaseTone} />
              <HealthItem label={tx('Refresh time')} value={formatDateTime(refreshedAt, tx('Not refreshed yet'))} />
              <HealthItem label={tx('Metrics generated')} value={formatDateTime(metrics?.generatedAt, tx('Not generated yet'))} />
            </div>
          </div>
        </section>

        <section className="dashboard-question-row operations-panel">
          <div className="dashboard-question-header">
            <div>
              <div className="eyebrow">{tx('Fleet telemetry')}</div>
              <h3>{tx('Vehicle status breakdown')}</h3>
            </div>
            <span className="status-badge info">{formatNumber(totalTelemetry)} {tx('tracked units')}</span>
          </div>
          {!fleetStatuses.length ? (
            <div className="empty-state">
              <strong>{tx('No fleet status data')}</strong>
              <p>{tx('Vehicle current-state telemetry will appear here when live counts are available.')}</p>
            </div>
          ) : (
            <div className="operations-status-telemetry-list">
              {fleetStatuses.map((item) => {
                const width = totalTelemetry > 0 ? Math.max((item.count / totalTelemetry) * 100, item.count > 0 ? 8 : 0) : 0;
                return (
                  <div key={item.status} className="operations-status-telemetry-row">
                    <div className="operations-status-telemetry-meta">
                      <span>{tx(humanize(item.status))}</span>
                      <strong>{formatNumber(item.count)}</strong>
                    </div>
                    <div className="operations-status-telemetry-bar">
                      <span style={{ '--telemetry-width': `${width}%` } as CSSProperties} className={toneClassForStatus(item.status)} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <section className="dashboard-question-row operations-panel">
        <div className="dashboard-question-header">
          <div>
            <div className="eyebrow">{tx('Support counters')}</div>
            <h3>{tx('Support and business queues')}</h3>
          </div>
        </div>
        <div className="operations-status-counter-grid">
          {counters.map((item) => (
            <div key={item.label} className="operations-status-counter-card">
              <div className="operations-status-counter-top">
                <span>{item.label}</span>
                <span className={`status-badge ${item.tone}`}>{item.value}</span>
              </div>
              <p>{item.helper}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-question-row operations-panel">
        <div className="dashboard-question-header">
          <div>
            <div className="eyebrow">{tx('Shipping blockers')}</div>
            <h3>{tx('Exact downstream desk routing')}</h3>
          </div>
          <Link href="/shipping" className="btn btn-secondary btn-compact">Open shipping workspace</Link>
        </div>
        {!shippingBlockedRows.length ? (
          <div className="empty-state">
            <strong>{tx('No active shipping blockers')}</strong>
            <p>{tx('All booked files are ready for downstream execution.')}</p>
          </div>
        ) : (
          <div className="workspace-detail-list">
            {shippingBlockedRows.map((item) => {
              const target = shippingDeskLink(item.currentStage);
              return (
                <div className="workspace-detail-row" key={item.bookingId}>
                  <div className="workspace-cell-stack">
                    <strong>{item.bookingId} · {item.customerName}</strong>
                    <span>{shippingStageLabel(item.currentStage)} · {item.responsibleDesk}</span>
                  </div>
                  <div className="workspace-cell-stack">
                    <strong>{shippingNextActionLabel(item.nextAction)}</strong>
                    <Link className="inline-action" href={target.href}>{target.label}</Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function HealthItem({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'good' | 'warning' | 'critical' | 'info';
}) {
  return (
    <div className="operations-status-health-item">
      <span>{label}</span>
      {tone ? <strong className={`status-badge ${tone}`}>{value}</strong> : <strong>{value}</strong>}
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function humanize(value: string) {
  return formatText(value, 'Unknown').replace(/_/g, ' ');
}

function toneLabel(tone: 'good' | 'warning' | 'critical' | 'info') {
  if (tone === 'good') return 'Healthy';
  if (tone === 'critical') return 'Critical';
  if (tone === 'warning') return 'Watch';
  return 'Info';
}

function toneClassForStatus(status: string) {
  if (['blocked', 'breakdown', 'under_maintenance'].includes(status)) return 'critical';
  if (['delayed', 'loading'].includes(status)) return 'warning';
  if (['available', 'loaded', 'in_transit', 'in_djibouti'].includes(status)) return 'good';
  return 'info';
}

function exportSnapshot(
  health: HealthResponse | null,
  metrics: MetricsResponse | null,
  refreshedAt: string | null,
  responseTimeMs: number | null,
) {
  const payload = {
    exportedAt: new Date().toISOString(),
    refreshedAt,
    responseTimeMs,
    health,
    metrics,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `operations-status-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
