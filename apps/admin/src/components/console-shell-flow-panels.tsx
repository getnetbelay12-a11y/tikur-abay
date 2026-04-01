'use client';

import Link from 'next/link';
import { memo, useEffect, useMemo, useState } from 'react';

import { readShippingPhase1Workspace, shippingPhase1UpdatedEvent } from '../lib/shipping-phase1';
import { readSharedQuoteRequests, sharedQuoteStorageUpdatedEvent } from '../lib/shared-quote-storage';

type FlowCardStep = {
  key: string;
  title: string;
  helper: string;
  href: string;
  doc: string;
};

type FlowNavStep = {
  title: string;
  href: string;
};

type ClosureStep = {
  key: string;
  title: string;
  helper: string;
  href: string;
  proof: string;
};

type ShellAiMetric = {
  label: string;
  value: string | number;
};

type ShellAiState = {
  status: 'blocked' | 'watch' | 'ready' | 'balanced';
  summary: string;
  metrics: ShellAiMetric[];
  nextActionText: string;
  nextActionHref: string;
  nextActionLabel: string;
};

type KpiItem = {
  label: string;
  value: string;
  delta?: string;
  tone?: 'success' | 'warning' | 'danger';
};

type StatusSegment = {
  label: string;
  value: number;
  color: string;
};

type TrendPoint = {
  label: string;
  total: number;
  delayed: number;
};

type RiskItem = {
  label: string;
  value: number;
  tone: 'danger' | 'warning' | 'success';
};

type FinanceMetric = {
  label: string;
  value: string;
};

type PerformanceItem = {
  label: string;
  value: string;
  progress?: number;
};

type AttentionItem = {
  id: string;
  stage: string;
  problem: string;
  action: string;
  href: string;
  severity: 'critical' | 'watch' | 'normal';
};

type DashboardSnapshot = {
  kpis: KpiItem[];
  statusSegments: StatusSegment[];
  trend: TrendPoint[];
  avgTransitTime: string;
  avgClearanceTime: string;
  avgDeliveryTime: string;
  bottlenecks: RiskItem[];
  finance: FinanceMetric[];
  performance: PerformanceItem[];
  corridorSummary: Array<{ label: string; value: string }>;
  attention: AttentionItem[];
};

function formatCompactNumber(value: number, suffix = '') {
  if (!Number.isFinite(value)) return `0${suffix}`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M${suffix}`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K${suffix}`;
  return `${Math.round(value)}${suffix}`;
}

function daysBetween(start?: string, end?: string) {
  if (!start || !end) return null;
  const from = new Date(start);
  const to = new Date(end);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  return Math.max(0, (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function minutesBetween(start?: string, end?: string) {
  if (!start || !end) return null;
  const from = new Date(start);
  const to = new Date(end);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  return Math.max(0, (to.getTime() - from.getTime()) / (1000 * 60));
}

function average(values: Array<number | null>) {
  const valid = values.filter((value): value is number => value !== null && Number.isFinite(value));
  if (!valid.length) return 0;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function formatDurationDays(value: number) {
  return `${value.toFixed(value >= 10 ? 0 : 1)} d`;
}

function toneForRisk(value: number, warningAt = 1, dangerAt = 3): 'danger' | 'warning' | 'success' {
  if (value >= dangerAt) return 'danger';
  if (value >= warningAt) return 'warning';
  return 'success';
}

function buildTrend(bookings: Array<{ bookingConfirmedAt: string }>, delayedBookingIds: Set<string>) {
  const today = new Date();
  const buckets = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(today.getDate() - (29 - index));
    return {
      key: date.toISOString().slice(0, 10),
      label: index % 5 === 0 ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
      total: 0,
      delayed: 0,
    };
  });

  bookings.forEach((booking: { bookingConfirmedAt: string; bookingId?: string }) => {
    const parsed = new Date(booking.bookingConfirmedAt || '');
    if (Number.isNaN(parsed.getTime())) return;
    const key = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).toISOString().slice(0, 10);
    const bucket = buckets.find((item) => item.key === key);
    if (!bucket) return;
    bucket.total += 1;
    if (booking.bookingId && delayedBookingIds.has(booking.bookingId)) bucket.delayed += 1;
  });

  return buckets;
}

function buildTrendPath(points: TrendPoint[], field: 'total' | 'delayed') {
  const max = Math.max(...points.map((point) => point[field]), 1);
  return points
    .map((point, index) => {
      const x = points.length === 1 ? 0 : (index / (points.length - 1)) * 100;
      const y = 92 - (point[field] / max) * 72;
      return `${x},${y}`;
    })
    .join(' ');
}

function buildStackStops(segments: StatusSegment[]) {
  const total = Math.max(segments.reduce((sum, item) => sum + item.value, 0), 1);
  let offset = 0;
  return segments.map((segment) => {
    const width = (segment.value / total) * 100;
    const stop = { ...segment, offset, width };
    offset += width;
    return stop;
  });
}

function deriveDashboardSnapshot(shellAiOperations: ShellAiState): DashboardSnapshot {
  const shipping = readShippingPhase1Workspace();
  const requests = readSharedQuoteRequests([]);
  const bookings = shipping.bookings || [];
  const instructions = shipping.instructions || [];
  const bills = shipping.billsOfLading || [];
  const manifests = shipping.manifests || [];
  const lettersOfCredit = shipping.lettersOfCredit || [];
  const releases = shipping.financeReleaseControls || [];
  const invoices = shipping.invoices || [];
  const payments = shipping.payments || [];
  const movements = shipping.containerMovements || [];
  const incidents = shipping.incidents || [];

  const delayedBookingIds = new Set(
    incidents.filter((item) => item.status === 'open').map((item) => item.bookingId).filter(Boolean),
  );
  movements.forEach((movement) => {
    if (movement.returnDelayDays > 0 || movement.demurragePenaltyAmount > 0) delayedBookingIds.add(movement.bookingId);
  });

  const totalShipments = bookings.length || requests.filter((item) => item.bookingId).length;
  const activeShipments = Math.max(
    0,
    totalShipments - movements.filter((item) => item.actualReturnDate || String(item.currentStatus || '').toLowerCase().includes('returned')).length,
  );
  const delayedShipments = delayedBookingIds.size;
  const inClearance = bookings.filter((item) => String(item.currentStage || '').toLowerCase().includes('clearance')).length;
  const inTransit = movements.filter((item) => {
    const status = String(item.currentStatus || '').toLowerCase();
    return status.includes('transit') || status.includes('vessel') || status.includes('delivery');
  }).length;
  const readyForRelease = releases.filter((item) => item.cargoReleaseAuthorizedAt && !item.releaseSentToDryPortAt).length;
  const emptyReturnPending = movements.filter((item) => !item.actualReturnDate).length;
  const delivered = movements.filter((item) => String(item.currentStatus || '').toLowerCase().includes('returned') || item.actualReturnDate).length;

  const onTimeBase = movements.filter((item) => item.expectedReturnDate);
  const onTimeCount = onTimeBase.filter((item) => {
    const delay = daysBetween(item.expectedReturnDate, item.actualReturnDate || item.expectedReturnDate);
    return delay !== null && delay <= 0;
  }).length;
  const onTimePercent = onTimeBase.length ? Math.round((onTimeCount / onTimeBase.length) * 100) : 89;

  const statusSegments: StatusSegment[] = [
    { label: 'Booked', value: bookings.filter((item) => String(item.currentStage || '').toLowerCase().includes('booking')).length, color: '#94a3b8' },
    { label: 'Sailing / In Transit', value: inTransit, color: '#2563eb' },
    { label: 'Djibouti / Release', value: releases.filter((item) => item.releaseNote || item.bankBillReference).length, color: '#38bdf8' },
    { label: 'Clearance', value: inClearance, color: '#f59e0b' },
    { label: 'Dispatch', value: bookings.filter((item) => String(item.currentStage || '').toLowerCase().includes('dispatch')).length, color: '#7c3aed' },
    { label: 'Delivered', value: delivered, color: '#16a34a' },
    { label: 'Delayed', value: delayedShipments, color: '#dc2626' },
  ];

  const trend = buildTrend(bookings, delayedBookingIds);

  const avgTransitTime = formatDurationDays(
    average(
      movements.map((movement) => {
        const departed = movement.events.find((event) => event.type === 'VESSEL_DEPARTED')?.timestamp;
        const arrived = movement.events.find((event) => event.type === 'VESSEL_ARRIVED')?.timestamp;
        return daysBetween(departed, arrived);
      }),
    ),
  );
  const avgClearanceTime = `${Math.round(
    average(releases.map((item) => minutesBetween(item.customsDocumentsHandedOverAt, item.cargoReleaseAuthorizedAt))) / 60,
  ) || 0} h`;
  const avgDeliveryTime = formatDurationDays(
    average(
      movements.map((movement) => {
        const assigned = movement.events.find((event) => event.type === 'TRUCK_ASSIGNED')?.timestamp;
        const arrived = movement.events.find((event) => event.type === 'ARRIVED_INLAND' || event.type === 'UNLOADED_INLAND')?.timestamp;
        return daysBetween(assigned, arrived);
      }),
    ),
  );

  const lcDiscrepancies = lettersOfCredit.filter((item) => item.documentChecks.some((check) => check.status === 'invalid')).length;
  const quotesAwaitingApproval = requests.filter((item) => item.approvalStatus === 'waiting_approval').length;
  const blPending = bills.filter((item) => item.status !== 'final').length;
  const missingShippingDocs = instructions.filter((item) => !item.cargoDescription || !item.hsCode || !item.containerNumber).length;
  const clearanceOverdue = incidents.filter((item) => item.status === 'open' && item.title.toLowerCase().includes('clearance')).length || inClearance;
  const emptyReturnOverdue = movements.filter((item) => item.returnDelayDays > 0).length;

  const totalRevenue = invoices.reduce((sum, item) => sum + item.totalUSD, 0);
  const pendingCollections = invoices.filter((item) => item.paymentStatus !== 'paid').reduce((sum, item) => sum + item.totalUSD, 0);
  const clearedPayments = payments.filter((item) => item.status === 'paid').reduce((sum, item) => sum + item.amount, 0);
  const reimbursementPending = incidents.filter((item) => item.title.toLowerCase().includes('expense') || item.title.toLowerCase().includes('reimbursement')).length;
  const avgShipmentCost = totalShipments ? totalRevenue / totalShipments : 0;
  const chargeDiscrepancies = invoices.filter((item) => item.paymentStatus === 'partial').length;

  const carrierCounts = new Map<string, number>();
  manifests.forEach((item) => {
    const carrier = item.vesselName || 'Carrier pending';
    carrierCounts.set(carrier, (carrierCounts.get(carrier) || 0) + 1);
  });
  bills.forEach((item) => {
    const carrier = item.carrierName || item.vesselName || 'Carrier pending';
    carrierCounts.set(carrier, (carrierCounts.get(carrier) || 0) + 1);
  });
  const topCarrierCount = Math.max(...carrierCounts.values(), 1);
  const topCarriers = [...carrierCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([label, count]) => ({ label, value: `${count} shipments`, progress: Math.round((count / topCarrierCount) * 100) }));

  const corridorCounts = new Map<string, { count: number; delayed: number }>();
  movements.forEach((item) => {
    const corridor = item.routeSummary || 'Djibouti -> Inland';
    const current = corridorCounts.get(corridor) || { count: 0, delayed: 0 };
    current.count += 1;
    if (delayedBookingIds.has(item.bookingId)) current.delayed += 1;
    corridorCounts.set(corridor, current);
  });
  const topCorridor = [...corridorCounts.entries()].sort((left, right) => right[1].count - left[1].count)[0];
  const hotspot = [...corridorCounts.entries()].sort((left, right) => right[1].delayed - left[1].delayed)[0];

  const performance: PerformanceItem[] = [
    ...topCarriers,
    { label: 'Avg transit time by corridor', value: avgTransitTime, progress: 76 },
    { label: 'On-time % by corridor', value: `${onTimePercent}%`, progress: onTimePercent },
    { label: 'Delay hotspots', value: hotspot ? `${hotspot[0]} (${hotspot[1].delayed})` : 'No hotspot', progress: hotspot ? Math.min(100, hotspot[1].delayed * 12) : 16 },
  ].slice(0, 5);

  const corridorSummary = [
    { label: 'Corridor', value: topCorridor ? topCorridor[0] : 'Djibouti -> Modjo' },
    { label: 'Active trips', value: String(inTransit) },
    { label: 'Blocked trips', value: String(delayedShipments) },
    { label: 'Avg ETA', value: avgTransitTime },
  ];

  const attention: AttentionItem[] = incidents
    .filter((item) => item.status === 'open')
    .sort((left, right) => {
      const toneValue = (value: string) => (value === 'critical' ? 0 : value === 'warning' ? 1 : 2);
      return toneValue(left.severity) - toneValue(right.severity);
    })
    .slice(0, 5)
    .map((item) => ({
      id: item.bookingId || item.id,
      stage: bookings.find((booking) => booking.bookingId === item.bookingId)?.currentStage || 'Exception',
      problem: item.title,
      action: item.severity === 'critical' ? 'Escalate and clear blocker' : 'Review and resolve',
      href: '/shipping/tracking',
      severity: item.severity === 'critical' ? 'critical' as const : item.severity === 'warning' ? 'watch' as const : 'normal' as const,
    }));

  if (!attention.length) {
    attention.push({
      id: activeShipments ? 'OPS-QUEUE' : 'FLOW-BALANCED',
      stage: activeShipments ? 'Operations queue' : 'Balanced',
      problem: shellAiOperations.summary,
      action: shellAiOperations.nextActionLabel,
      href: shellAiOperations.nextActionHref,
      severity: shellAiOperations.status === 'blocked' ? 'critical' : shellAiOperations.status === 'watch' ? 'watch' : 'normal',
    });
  }

  return {
    kpis: [
      { label: 'Total Shipments', value: formatCompactNumber(totalShipments), delta: `${formatCompactNumber(bookings.length)} live files` },
      { label: 'Active Shipments', value: formatCompactNumber(activeShipments), delta: 'Currently moving' },
      { label: 'Delayed Shipments', value: formatCompactNumber(delayedShipments), delta: 'Open exceptions', tone: delayedShipments ? 'danger' : 'success' },
      { label: 'In Clearance', value: formatCompactNumber(inClearance), delta: 'Customs pipeline' },
      { label: 'In Transit', value: formatCompactNumber(inTransit), delta: 'Ocean + inland', tone: 'success' },
      { label: 'Ready for Release', value: formatCompactNumber(readyForRelease), delta: 'Finance complete', tone: readyForRelease ? 'warning' : undefined },
      { label: 'Empty Return Pending', value: formatCompactNumber(emptyReturnPending), delta: 'Closure watch', tone: emptyReturnPending ? 'warning' : undefined },
      { label: 'On-Time Delivery %', value: `${onTimePercent}%`, delta: 'Corridor SLA', tone: onTimePercent >= 90 ? 'success' : onTimePercent >= 75 ? 'warning' : 'danger' },
    ],
    statusSegments,
    trend,
    avgTransitTime,
    avgClearanceTime,
    avgDeliveryTime,
    bottlenecks: [
      { label: 'LC discrepancies', value: lcDiscrepancies, tone: toneForRisk(lcDiscrepancies) },
      { label: 'Quotes awaiting approval', value: quotesAwaitingApproval, tone: toneForRisk(quotesAwaitingApproval, 2, 5) },
      { label: 'BL pending', value: blPending, tone: toneForRisk(blPending, 2, 4) },
      { label: 'Missing shipping docs', value: missingShippingDocs, tone: toneForRisk(missingShippingDocs, 1, 3) },
      { label: 'Clearance overdue', value: clearanceOverdue, tone: toneForRisk(clearanceOverdue, 1, 3) },
      { label: 'Empty return overdue', value: emptyReturnOverdue, tone: toneForRisk(emptyReturnOverdue, 1, 2) },
    ],
    finance: [
      { label: 'Revenue this month', value: `$${formatCompactNumber(totalRevenue)}` },
      { label: 'Pending collections', value: `$${formatCompactNumber(pendingCollections)}` },
      { label: 'Cleared payments', value: `$${formatCompactNumber(clearedPayments)}` },
      { label: 'Driver reimbursements pending', value: formatCompactNumber(reimbursementPending) },
      { label: 'Avg shipment cost', value: `$${formatCompactNumber(avgShipmentCost)}` },
      { label: 'Charge discrepancies', value: formatCompactNumber(chargeDiscrepancies) },
    ],
    performance,
    corridorSummary,
    attention,
  };
}

function StatusOverview({ segments }: { segments: StatusSegment[] }) {
  const stops = buildStackStops(segments);
  return (
    <div className="status-overview-card">
      <div className="status-segment-bar">
        {stops.map((segment) => (
          <span
            key={segment.label}
            className="status-segment-fill"
            style={{ left: `${segment.offset}%`, width: `${segment.width}%`, background: segment.color }}
          />
        ))}
      </div>
      <div className="status-legend-grid">
        {segments.map((segment) => (
          <div key={segment.label} className="status-legend-item">
            <span className="status-legend-dot" style={{ background: segment.color }} />
            <span>{segment.label}</span>
            <strong>{segment.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendChart({ points }: { points: TrendPoint[] }) {
  const totalPath = buildTrendPath(points, 'total');
  const delayedPath = buildTrendPath(points, 'delayed');
  return (
    <div className="trend-card">
      <svg viewBox="0 0 100 100" className="trend-chart" aria-hidden="true">
        <polyline fill="none" stroke="#e2e8f0" strokeWidth="1.2" points="0,92 100,92" />
        <polyline fill="none" stroke="#2563eb" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" points={totalPath} />
        <polyline fill="none" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" points={delayedPath} />
      </svg>
      <div className="trend-legend">
        <span><i className="trend-key trend-key-total" /> Total shipments</span>
        <span><i className="trend-key trend-key-delayed" /> Delayed shipments</span>
      </div>
      <div className="trend-axis-labels">
        {points.map((point) => (
          <span key={`${point.label}-${point.total}`}>{point.label}</span>
        ))}
      </div>
    </div>
  );
}

export const ConsoleShellFlowPanels = memo(function ConsoleShellFlowPanels({
  showFlowNavigator,
  activeWorkflowStep,
  previousWorkflowStep,
  nextWorkflowStep,
  activeWorkflowDocs,
  shellAiOperations,
  workflowSteps,
}: {
  showFlowNavigator: boolean;
  isConsoleWorkspaceRoute: boolean;
  workflowSteps: FlowCardStep[];
  activeWorkflowIndex: number;
  activeWorkflowStep: FlowCardStep;
  previousWorkflowStep: FlowNavStep | null;
  nextWorkflowStep: FlowNavStep | null;
  activeWorkflowDocs: string[];
  shellAiOperations: ShellAiState;
  closureJourneySteps: ClosureStep[];
  activeClosureIndex: number;
  activeClosureStep: ClosureStep;
  nextClosureStep: FlowNavStep | null;
}) {
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const reload = () => setRefreshKey((value) => value + 1);
    window.addEventListener(sharedQuoteStorageUpdatedEvent, reload as EventListener);
    window.addEventListener(shippingPhase1UpdatedEvent, reload as EventListener);
    return () => {
      window.removeEventListener(sharedQuoteStorageUpdatedEvent, reload as EventListener);
      window.removeEventListener(shippingPhase1UpdatedEvent, reload as EventListener);
    };
  }, []);

  const dashboard = useMemo(() => deriveDashboardSnapshot(shellAiOperations), [refreshKey, shellAiOperations]);
  const nextComment = nextWorkflowStep
    ? workflowSteps.find((step) => step.title === nextWorkflowStep.title)?.helper || nextWorkflowStep.title
    : 'The workflow is already at the final visible desk. Review closure and customer confirmation.';

  if (!showFlowNavigator) return null;

  return (
    <section className="executive-transport-dashboard">
      <div className="dashboard-shell">
        <div className="dashboard-kpi-grid">
          {dashboard.kpis.map((kpi) => (
            <article key={kpi.label} className={`kpi-card ${kpi.tone ? `is-${kpi.tone}` : ''}`}>
              <div className="kpi-value">{kpi.value}</div>
              <div className="kpi-label">{kpi.label}</div>
              <div className="kpi-delta">{kpi.delta || 'Tracking live'}</div>
            </article>
          ))}
        </div>

        <div className="dashboard-main-grid">
          <div className="dashboard-main-left">
            <section className="dashboard-card">
              <div className="section-title">Shipment Status Overview</div>
              <div className="section-subtitle">Current distribution across booked, transit, release, clearance, dispatch, delivery, and delayed files.</div>
              <StatusOverview segments={dashboard.statusSegments} />
            </section>

            <section className="dashboard-card">
              <div className="section-title">Shipment Volume &amp; Delay Trend</div>
              <div className="section-subtitle">Total shipment volume versus delayed files across the last 30 days.</div>
              <TrendChart points={dashboard.trend} />
              <div className="mini-stat-row">
                <article className="mini-stat-card">
                  <span>Avg Transit Time</span>
                  <strong>{dashboard.avgTransitTime}</strong>
                </article>
                <article className="mini-stat-card">
                  <span>Avg Clearance Time</span>
                  <strong>{dashboard.avgClearanceTime}</strong>
                </article>
                <article className="mini-stat-card">
                  <span>Avg Inland Delivery Time</span>
                  <strong>{dashboard.avgDeliveryTime}</strong>
                </article>
              </div>
            </section>
          </div>

          <div className="dashboard-main-right">
            <section className="dashboard-card">
              <div className="section-title">Bottlenecks &amp; Operational Risk</div>
              <div className="section-subtitle">Exceptions surfaced for commercial, document, clearance, and closure control.</div>
              <div className="risk-list">
                {dashboard.bottlenecks.map((item) => (
                  <div key={item.label} className="risk-row">
                    <span>{item.label}</span>
                    <span className={`risk-badge is-${item.tone}`}>{item.value}</span>
                  </div>
                ))}
              </div>
              <Link href="/shipping/tracking" className="dashboard-cta">
                Open Exception Desk
              </Link>
            </section>

            <section className="dashboard-card">
              <div className="section-title">Finance Snapshot</div>
              <div className="section-subtitle">Collections, cost, reimbursement, and discrepancy visibility for leadership review.</div>
              <div className="finance-stat-grid">
                {dashboard.finance.map((item) => (
                  <article key={item.label} className="finance-stat-card">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>

        <div className="dashboard-executive-grid">
          <section className="dashboard-card">
            <div className="section-title">Carrier &amp; Corridor Performance</div>
            <div className="section-subtitle">Top carriers, corridor timing, on-time performance, and delay hotspots.</div>
            <div className="performance-list">
              {dashboard.performance.map((item) => (
                <article key={item.label} className="performance-row">
                  <div className="performance-row-top">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                  <div className="performance-progress">
                    <span style={{ width: `${Math.max(8, item.progress || 0)}%` }} />
                  </div>
                </article>
              ))}
            </div>
            <div className="corridor-tile">
              {dashboard.corridorSummary.map((item) => (
                <div key={item.label} className="corridor-metric">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="dashboard-card">
            <div className="section-title">Attention Now</div>
            <div className="section-subtitle">Urgent files requiring executive or desk intervention now.</div>
            <div className="attention-list">
              {dashboard.attention.map((item) => (
                <article key={`${item.id}-${item.problem}`} className="attention-row">
                  <div className="attention-row-top">
                    <strong>{item.id}</strong>
                    <span className={`attention-pill is-${item.severity}`}>{item.severity === 'critical' ? 'Critical' : item.severity === 'watch' ? 'Watch' : 'Normal'}</span>
                  </div>
                  <div className="attention-meta">
                    <span>{item.stage}</span>
                    <span>{item.problem}</span>
                  </div>
                  <Link href={item.href} className="attention-link">{item.action}</Link>
                </article>
              ))}
            </div>
          </section>
        </div>

        <div className="dashboard-lower-grid">
          <article className="console-flow-card console-flow-card-current">
            <span className="eyebrow">Current Desk</span>
            <strong>{activeWorkflowStep.title}</strong>
            <p>{activeWorkflowStep.helper}</p>
          </article>
          <article className="console-flow-card">
            <span className="eyebrow">Key Documents</span>
            <div className="console-flow-tags">
              {activeWorkflowDocs.map((doc) => (
                <span key={doc} className="console-flow-tag">{doc}</span>
              ))}
            </div>
          </article>
          <article className="console-flow-card">
            <span className="eyebrow">Handoff</span>
            <div className="console-flow-links">
              {previousWorkflowStep ? (
                <Link href={previousWorkflowStep.href} className="console-flow-link">
                  Back: {previousWorkflowStep.title}
                </Link>
              ) : (
                <span className="console-flow-link is-muted">Back: Flow start</span>
              )}
              {nextWorkflowStep ? (
                <Link href={nextWorkflowStep.href} className="console-flow-link console-flow-link-next">
                  Next: {nextWorkflowStep.title}
                </Link>
              ) : (
                <span className="console-flow-link is-muted">Next: Customer closure</span>
              )}
            </div>
          </article>
          <article className="console-flow-card console-next-comment-card">
            <span className="eyebrow">Next Step Comment</span>
            <strong>{nextWorkflowStep ? nextWorkflowStep.title : activeWorkflowStep.title}</strong>
            <p>{nextComment}</p>
          </article>
          <article className="console-flow-card console-ai-card" data-status={shellAiOperations.status}>
            <div className="console-ai-head">
              <span className="eyebrow">AI Operations</span>
              <span className="console-ai-status-pill">
                {shellAiOperations.status === 'blocked' ? 'Blocked' : shellAiOperations.status === 'watch' ? 'Watch' : 'Balanced'}
              </span>
            </div>
            <strong>{shellAiOperations.summary}</strong>
            <div className="console-ai-metrics">
              {shellAiOperations.metrics.map((metric) => (
                <div key={metric.label} className="console-ai-metric">
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                </div>
              ))}
            </div>
            <div className="console-ai-next">
              <p>{shellAiOperations.nextActionText}</p>
              <Link href={shellAiOperations.nextActionHref} className="console-flow-link console-ai-link">
                {shellAiOperations.nextActionLabel}
              </Link>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
});
