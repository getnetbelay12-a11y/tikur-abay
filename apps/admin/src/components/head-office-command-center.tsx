'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDeferredValue, useState, type ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ActivityIcon,
  AlertTriangleIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  ClockIcon,
  DollarCircleIcon,
  FileTextIcon,
  GaugeIcon,
  RouteIcon,
  SearchIcon,
  ShieldIcon,
  TruckIcon,
} from './console-icons';

type Tone = 'good' | 'warning' | 'critical' | 'info';

type KpiCard = {
  label: string;
  value: number;
  tone: Tone;
  href: string;
  helper: string;
  trend: number;
};

type SpotlightRow = {
  id: string;
  shipmentId: string;
  title: string;
  route: string;
  owner: string;
  issue: string;
  severity: Tone;
  href: string;
  timestamp: string;
};

export type HeadOfficeCommandCenterPayload = {
  generatedAt: string;
  kpis: KpiCard[];
  charts: {
    shipmentTrend: { href: string; points: Array<{ label: string; total: number; delayed: number }> };
    revenueByRoute: { href: string; points: Array<{ route: string; revenue: number; delayed: number; onTimeRate: number; href: string }> };
    delayGauge: { href: string; delayedPercentage: number; delayedCount: number; activeCount: number };
  };
  performance: {
    route: { href: string; items: Array<{ route: string; revenue: number; delayed: number; onTimeRate: number; href: string }> };
    branch: { href: string; items: Array<{ branch: string; delayed: number; revenue: number; availability: number; blocked: number; href: string }> };
  };
  dispatchFleet: {
    queue: { href: string; rows: Array<{ id: string; shipmentId: string; route: string; branch: string; owner: string; status: string; eta: string; delayMinutes: number; href: string }> };
    fleetAvailability: { href: string; percent: number; items: Array<{ label: string; value: number; tone: Tone }> };
    driverAvailability: { href: string; percent: number; items: Array<{ label: string; value: number; tone: Tone }> };
  };
  alerts: Array<{ id: string; severity: Tone; shipmentId: string; route: string; reportedTime: string; owner: string; status: string; issue: string; href: string }>;
  executiveTrends: {
    revenue: { href: string; total: number; points: Array<{ label: string; value: number }> };
    delay: { href: string; total: number; points: Array<{ label: string; value: number }> };
    incident: { href: string; total: number; points: Array<{ label: string; value: number }> };
  };
};

const TONE_COLORS: Record<Tone, string> = {
  good: '#16a34a',
  warning: '#f59e0b',
  critical: '#ef4444',
  info: '#2563eb',
};

const GRID_COLOR = 'rgba(148, 163, 184, 0.18)';

export function HeadOfficeCommandCenter({ data }: { data: HeadOfficeCommandCenterPayload }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<'today' | '7d' | '30d'>('7d');
  const [routeFilter, setRouteFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeView, setTimeView] = useState<'today' | 'week' | 'month'>('week');
  const deferredSearch = useDeferredValue(searchQuery.trim().toLowerCase());
  const routeOptions = ['all', ...new Set([
    ...data.dispatchFleet.queue.rows.map((row) => row.route),
    ...data.alerts.map((item) => item.route),
    ...data.charts.revenueByRoute.points.map((point) => point.route),
    ...data.performance.route.items.map((item) => item.route),
  ].filter(Boolean))];
  const statusOptions = ['all', ...new Set([
    ...data.dispatchFleet.queue.rows.map((row) => row.status),
    ...data.alerts.map((item) => item.status),
    ...data.alerts.map((item) => item.severity),
  ].filter(Boolean))];
  const matchesSearch = (...values: Array<string | number | undefined>) =>
    !deferredSearch || values.some((value) => String(value || '').toLowerCase().includes(deferredSearch));
  const matchesRoute = (route: string) => routeFilter === 'all' || route === routeFilter;
  const matchesStatus = (status: string, severity?: string) =>
    statusFilter === 'all' ||
    status.toLowerCase() === statusFilter.toLowerCase() ||
    String(severity || '').toLowerCase() === statusFilter.toLowerCase();
  const effectiveWindow = resolveWindow(dateRange, timeView);
  const shipmentTrendPoints = data.charts.shipmentTrend.points.slice(-effectiveWindow);
  const revenueByRoutePoints = data.charts.revenueByRoute.points.filter((point) => matchesRoute(point.route));
  const routePerformanceItems = data.performance.route.items.filter((item) => matchesRoute(item.route));
  const dispatchRows = data.dispatchFleet.queue.rows.filter((row) => matchesRoute(row.route) && matchesStatus(row.status));
  const alertRows = data.alerts.filter((item) => matchesRoute(item.route) && matchesStatus(item.status, item.severity));
  const highlightedDispatchCount = dispatchRows.filter((row) => matchesSearch(row.shipmentId, row.owner)).length;
  const highlightedAlertCount = alertRows.filter((item) => matchesSearch(item.shipmentId, item.owner)).length;
  const totalHighlighted = highlightedDispatchCount + highlightedAlertCount;
  const blockedCount = data.kpis.find((item) => item.label.toLowerCase().includes('blocked'))?.value ?? alertRows.filter((item) => item.severity === 'critical' || item.status.toLowerCase().includes('block')).length;
  const delayedCount = data.kpis.find((item) => item.label.toLowerCase().includes('delayed'))?.value ?? alertRows.filter((item) => item.severity === 'warning' || item.status.toLowerCase().includes('delay')).length;
  const incidentCount = alertRows.length;
  const attentionRows = alertRows.slice(0, 5);
  const delayGaugeData = [
    { name: 'Delayed', value: data.charts.delayGauge.delayedPercentage, fill: TONE_COLORS.warning },
    { name: 'Healthy', value: Math.max(100 - data.charts.delayGauge.delayedPercentage, 0), fill: 'rgba(148, 163, 184, 0.18)' },
  ];

  return (
    <section className="power-dashboard">
      <header className="power-dashboard-header card">
        <div>
          <p className="power-eyebrow">Executive Logistics Dashboard</p>
          <h1>Tikur Abay Head Office Logistics Command Dashboard</h1>
          <p className="power-subtitle">Dense operational visibility across shipments, revenue, fleet, dispatch, and exception pressure.</p>
        </div>
        <div className="power-header-meta">
          <span className="status-badge info">Live board</span>
          <span>Updated {formatTimestamp(data.generatedAt)}</span>
        </div>
      </header>

      <section className="power-command-bar card">
        <div className="power-command-search">
          <label className="power-command-field">
            <span className="power-command-icon"><SearchIcon size={15} /></span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search shipment ID or customer"
              aria-label="Search shipment ID or customer"
            />
          </label>
          <span className={`power-command-match ${deferredSearch && totalHighlighted ? 'active' : ''}`}>
            {deferredSearch ? `${formatNumber(totalHighlighted)} match${totalHighlighted === 1 ? '' : 'es'}` : 'Live search'}
          </span>
        </div>

        <div className="power-command-actions">
          <Link href="/shipments/intake?mode=booking" className="power-action-button">
            <FileTextIcon size={14} />
            <span>Create Shipment</span>
          </Link>
          <Link href="/operations/corridor-dispatch" className="power-action-button">
            <TruckIcon size={14} />
            <span>Dispatch</span>
          </Link>
          <Link href="#attention-zone" className="power-action-button">
            <AlertTriangleIcon size={14} />
            <span>View Alerts</span>
          </Link>
        </div>

        <div className="power-command-filters">
          <CommandSelect
            label="Date range"
            value={dateRange}
            onChange={setDateRange}
            options={[
              { value: 'today', label: 'Today' },
              { value: '7d', label: 'Last 7 days' },
              { value: '30d', label: 'Last 30 days' },
            ]}
          />
          <CommandSelect
            label="Route"
            value={routeFilter}
            onChange={setRouteFilter}
            options={routeOptions.map((route) => ({
              value: route,
              label: route === 'all' ? 'All routes' : route,
            }))}
          />
          <CommandSelect
            label="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={statusOptions.map((status) => ({
              value: status,
              label: status === 'all' ? 'All status' : status,
            }))}
          />
        </div>

        <div className="power-command-toggle" role="tablist" aria-label="Time window">
          {(['today', 'week', 'month'] as const).map((view) => (
            <button
              key={view}
              type="button"
              className={timeView === view ? 'active' : ''}
              onClick={() => setTimeView(view)}
            >
              {view}
            </button>
          ))}
        </div>
      </section>

      <section className="power-kpi-grid">
        {data.kpis.length ? data.kpis.map((item) => (
          <Link key={item.label} href={item.href} className={`power-kpi-card tone-${item.tone}`}>
            <div className="power-kpi-top">
              <span className="power-kpi-label">{item.label}</span>
              <span className={`power-kpi-icon tone-${item.tone}`}>{iconForKpi(item.label)}</span>
            </div>
            <strong>{item.label.includes('Revenue') ? `ETB ${formatNumber(item.value)}` : item.label.includes('%') ? `${item.value}%` : formatNumber(item.value)}</strong>
            <div className={`power-kpi-trend ${item.trend >= 0 ? 'up' : 'down'} tone-${item.tone}`}>
              <span>{item.trend >= 0 ? '▲' : '▼'}</span>
              <span>{formatTrend(item.label, item.trend)}</span>
            </div>
            <p>{item.helper}</p>
          </Link>
        )) : Array.from({ length: 7 }, (_, index) => <KpiSkeletonCard key={`kpi-skeleton-${index}`} />)}
      </section>

      <section className="power-section-shell power-section-attention" id="attention-zone">
        <SectionHeader
          eyebrow="Urgent Attention"
          title="Blockers And Escalations"
          subtitle="Immediate head-office action across blocked files, delayed trips, and active incidents"
        />
        <div className="power-panel card power-attention-panel">
          <div className="power-panel-head">
            <div>
              <p className="power-eyebrow">Critical visibility</p>
              <h2>What needs attention right now</h2>
            </div>
          </div>
          <div className="power-attention-summary-grid">
            <Link href="/shipments/enterprise?filter=blocked" className="power-attention-stat tone-critical">
              <div className="power-attention-stat-top">
                <span className="power-attention-icon tone-critical"><AlertTriangleIcon size={16} /></span>
                <span>Blocked Shipments</span>
              </div>
              <strong>{formatNumber(blockedCount)}</strong>
              <p>Files stopped by compliance, release, or document blockers</p>
            </Link>
            <Link href="/shipments/enterprise?filter=delayed" className="power-attention-stat tone-warning">
              <div className="power-attention-stat-top">
                <span className="power-attention-icon tone-warning"><ClockIcon size={16} /></span>
                <span>Delayed Shipments</span>
              </div>
              <strong>{formatNumber(delayedCount)}</strong>
              <p>Trips and files operating behind planned timing</p>
            </Link>
            <Link href="/driver-reports" className="power-attention-stat tone-critical">
              <div className="power-attention-stat-top">
                <span className="power-attention-icon tone-critical"><ShieldIcon size={16} /></span>
                <span>Active Incidents</span>
              </div>
              <strong>{formatNumber(incidentCount)}</strong>
              <p>Live operational incidents and escalations requiring action</p>
            </Link>
          </div>
          <div className="power-attention-feed">
            {attentionRows.length ? attentionRows.map((item) => (
              <Link key={item.id} href={item.href} className={`power-attention-row tone-${item.severity}`}>
                <div className="power-attention-row-main">
                  <div className="power-attention-row-top">
                    <strong>{item.shipmentId}</strong>
                    <span className={`status-badge ${item.severity}`}>{item.severity}</span>
                  </div>
                  <p>{item.issue}</p>
                </div>
                <div className="power-attention-row-meta">
                  <span>{item.route}</span>
                  <span>{formatAge(item.reportedTime)}</span>
                  <span>{item.owner}</span>
                  <span>{item.status}</span>
                </div>
              </Link>
            )) : data.alerts.length ? <div className="power-chart-empty">No urgent issues match the active filters.</div> : <ChartSkeleton compact />}
          </div>
        </div>
      </section>

      <section className="power-section-shell">
        <SectionHeader
          eyebrow="Operations Overview"
          title="Shipment Trend"
          subtitle="Primary movement view across dispatch volume and delayed flow in the active window"
        />
        <ChartCard
          title="Shipment Trend Over Time"
          subtitle="Dispatches and delayed movement across the selected period"
          href={data.charts.shipmentTrend.href}
          icon={<ActivityIcon size={16} />}
          className="power-panel-anchor"
        >
          {shipmentTrendPoints.length ? (
            <ResponsiveContainer width="100%" height={286}>
              <LineChart data={shipmentTrendPoints} margin={{ top: 8, right: 10, bottom: 0, left: -18 }}>
                <CartesianGrid stroke={GRID_COLOR} vertical={false} horizontal={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 2 }} />
                <Line type="monotone" dataKey="total" stroke={TONE_COLORS.info} strokeWidth={3.5} dot={false} activeDot={{ r: 4 }} name="Dispatches" />
                <Line type="monotone" dataKey="delayed" stroke={TONE_COLORS.warning} strokeWidth={3.5} dot={false} activeDot={{ r: 4 }} name="Delayed" />
              </LineChart>
            </ResponsiveContainer>
          ) : <ChartSkeleton anchor />}
        </ChartCard>
      </section>

      <section className="power-section-shell">
        <SectionHeader
          eyebrow="Dispatch"
          title="Dispatch"
          subtitle="Queue execution and readiness controls surfaced immediately for operations follow-through"
        />
        <section className="power-dispatch-grid">
          <div className="power-panel card">
          <div className="power-panel-head">
            <div>
              <p className="power-eyebrow">Dispatch Queue</p>
              <h2>Real-time dispatch queue</h2>
            </div>
            <Link href={data.dispatchFleet.queue.href} className="power-open-link">Open queue</Link>
          </div>
          <div className="power-table-wrap">
            <table className="power-table power-table-queue">
              <thead>
                <tr>
                  <th>Shipment</th>
                  <th>Route</th>
                  <th>Status</th>
                  <th>Owner</th>
                  <th>ETA</th>
                  <th>Delay</th>
                </tr>
              </thead>
              <tbody>
                {dispatchRows.length ? dispatchRows.map((row) => (
                  <tr
                    key={row.id}
                    className={`power-table-row-clickable ${matchesSearch(row.shipmentId, row.owner) ? 'is-highlighted' : ''}`}
                    onClick={() => router.push(row.href)}
                    role="link"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        router.push(row.href);
                      }
                    }}
                  >
                    <td><Link href={row.href}>{row.shipmentId}</Link></td>
                    <td>{row.route}</td>
                    <td><span className={`status-badge ${row.delayMinutes > 0 ? 'warning' : 'info'}`}>{row.status}</span></td>
                    <td>{row.owner}</td>
                    <td>{row.eta}</td>
                    <td>{row.delayMinutes ? `${formatNumber(row.delayMinutes)} min` : 'On time'}</td>
                  </tr>
                )) : data.dispatchFleet.queue.rows.length ? <TableEmptyRow columns={6} label="No dispatch rows match the active filters." /> : <TableSkeletonRows columns={6} rows={5} />}
              </tbody>
            </table>
          </div>
          </div>

          <div className="power-side-stack">
          <ChartCard
            title="Fleet Availability"
            subtitle={`${data.dispatchFleet.fleetAvailability.percent}% of fleet ready for assignment`}
            href={data.dispatchFleet.fleetAvailability.href}
            icon={<TruckIcon size={16} />}
          >
            {data.dispatchFleet.fleetAvailability.items.length ? (
              <ResponsiveContainer width="100%" height={192}>
                <RadialBarChart
                  cx="50%"
                  cy="52%"
                  innerRadius="28%"
                  outerRadius="90%"
                  barSize={14}
                  data={data.dispatchFleet.fleetAvailability.items.map((item) => ({ ...item, fill: TONE_COLORS[item.tone] }))}
                >
                  <RadialBar background dataKey="value" />
                  <Tooltip contentStyle={tooltipStyle} />
                </RadialBarChart>
              </ResponsiveContainer>
            ) : <ChartSkeleton compact />}
            <div className="power-mini-legend">
              {data.dispatchFleet.fleetAvailability.items.map((item) => (
                <span key={item.label}><i style={{ backgroundColor: TONE_COLORS[item.tone] }} />{item.label}: {formatNumber(item.value)}</span>
              ))}
            </div>
          </ChartCard>

          <ChartCard
            title="Driver Availability"
            subtitle={`${data.dispatchFleet.driverAvailability.percent}% driver readiness`}
            href={data.dispatchFleet.driverAvailability.href}
            icon={<GaugeIcon size={16} />}
          >
            {data.dispatchFleet.driverAvailability.items.length ? (
              <ResponsiveContainer width="100%" height={192}>
                <PieChart>
                  <Pie
                    data={data.dispatchFleet.driverAvailability.items.map((item) => ({ ...item, fill: TONE_COLORS[item.tone] }))}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={44}
                    outerRadius={72}
                    paddingAngle={2}
                  >
                    {data.dispatchFleet.driverAvailability.items.map((item) => (
                      <Cell key={item.label} fill={TONE_COLORS[item.tone]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            ) : <ChartSkeleton compact />}
            <div className="power-mini-legend">
              {data.dispatchFleet.driverAvailability.items.map((item) => (
                <span key={item.label}><i style={{ backgroundColor: TONE_COLORS[item.tone] }} />{item.label}: {formatNumber(item.value)}</span>
              ))}
            </div>
          </ChartCard>

          <ChartCard
            title="Branch Performance"
            subtitle="Delay, blocked units, and availability by branch"
            href={data.performance.branch.href}
            icon={<ShieldIcon size={16} />}
          >
            {data.performance.branch.items.length ? (
              <ResponsiveContainer width="100%" height={178}>
                <BarChart data={data.performance.branch.items} layout="vertical" margin={{ top: 4, right: 10, bottom: 0, left: 12 }}>
                  <CartesianGrid stroke={GRID_COLOR} horizontal={false} vertical={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis type="category" dataKey="branch" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#334155' }} width={72} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 10, paddingTop: 2 }} />
                  <Bar dataKey="availability" fill={TONE_COLORS.good} radius={[0, 6, 6, 0]} name="Availability %" />
                  <Bar dataKey="blocked" fill={TONE_COLORS.critical} radius={[0, 6, 6, 0]} name="Blocked" />
                </BarChart>
              </ResponsiveContainer>
            ) : <ChartSkeleton compact />}
          </ChartCard>
          </div>
        </section>
      </section>

      <section className="power-section-shell">
        <SectionHeader
          eyebrow="Analytics"
          title="Performance Analytics"
          subtitle="Revenue, delay pressure, and route throughput aligned into one operating band"
        />
        <section className="power-chart-grid power-chart-grid-3">
          <ChartCard
            title="Revenue By Route"
            subtitle="Top earning lanes with delay context"
            href={data.charts.revenueByRoute.href}
            icon={<DollarCircleIcon size={16} />}
          >
            {revenueByRoutePoints.length ? (
              <ResponsiveContainer width="100%" height={244}>
                <BarChart data={revenueByRoutePoints} layout="vertical" margin={{ top: 4, right: 10, bottom: 0, left: 18 }}>
                  <CartesianGrid stroke={GRID_COLOR} vertical={false} horizontal={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis type="category" dataKey="route" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#334155' }} width={88} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number, key) => key === 'revenue' ? `ETB ${formatNumber(value)}` : value} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 2 }} />
                  <Bar dataKey="revenue" fill={TONE_COLORS.good} radius={[0, 6, 6, 0]} name="Revenue" />
                  <Bar dataKey="delayed" fill={TONE_COLORS.warning} radius={[0, 6, 6, 0]} name="Delayed" />
                </BarChart>
              </ResponsiveContainer>
            ) : data.charts.revenueByRoute.points.length ? <ChartEmptyState label="No routes match the current filter." /> : <ChartSkeleton />}
          </ChartCard>

          <ChartCard
            title="Delay Percentage"
            subtitle={`${data.charts.delayGauge.delayedCount} delayed out of ${data.charts.delayGauge.activeCount} active shipments`}
            href={data.charts.delayGauge.href}
            icon={<ClockIcon size={16} />}
          >
            <div className="power-gauge-card">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={delayGaugeData}
                    dataKey="value"
                    innerRadius={60}
                    outerRadius={82}
                    startAngle={90}
                    endAngle={-270}
                    paddingAngle={2}
                  >
                    {delayGaugeData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="power-gauge-center">
                <strong>{data.charts.delayGauge.delayedPercentage}%</strong>
                <span>delay share</span>
              </div>
            </div>
          </ChartCard>

          <ChartCard
            title="Route Performance"
            subtitle="Revenue, delay count, and on-time rate by route"
            href={data.performance.route.href}
            icon={<RouteIcon size={16} />}
          >
            {routePerformanceItems.length ? (
              <ResponsiveContainer width="100%" height={244}>
                <BarChart data={routePerformanceItems} layout="vertical" margin={{ top: 4, right: 14, bottom: 0, left: 20 }}>
                  <CartesianGrid stroke={GRID_COLOR} horizontal={false} vertical={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis type="category" dataKey="route" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#334155' }} width={88} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number, key) => key === 'revenue' ? `ETB ${formatNumber(value)}` : value} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 2 }} />
                  <Bar dataKey="revenue" fill={TONE_COLORS.info} radius={[0, 6, 6, 0]} name="Revenue" />
                  <Bar dataKey="delayed" fill={TONE_COLORS.warning} radius={[0, 6, 6, 0]} name="Delayed" />
                </BarChart>
              </ResponsiveContainer>
            ) : data.performance.route.items.length ? <ChartEmptyState label="No route performance matches the current filter." /> : <ChartSkeleton />}
          </ChartCard>
        </section>
      </section>

      <section className="power-section-shell">
        <SectionHeader
          eyebrow="Alerts"
          title="Alerts And Incidents"
          subtitle="Full escalation register for delayed shipments, incidents, blockers, and route-level issues"
        />
        <div className="power-panel card power-attention-panel">
          <div className="power-panel-head">
            <div>
              <p className="power-eyebrow">Alert register</p>
              <h2>Operations alert table</h2>
            </div>
          </div>
          <div className="power-table-wrap power-table-wrap-attention">
            <table className="power-table power-table-attention">
              <thead>
                <tr>
                  <th>Shipment ID</th>
                  <th>Issue</th>
                  <th>Severity</th>
                  <th>Route</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {alertRows.length ? alertRows.map((item) => (
                  <tr
                    key={item.id}
                    className={`power-table-row-clickable ${matchesSearch(item.shipmentId, item.owner) ? 'is-highlighted' : ''}`}
                    onClick={() => router.push(item.href)}
                    role="link"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        router.push(item.href);
                      }
                    }}
                  >
                    <td><Link href={item.href}>{item.shipmentId}</Link></td>
                    <td>{item.issue}</td>
                    <td><span className={`status-badge ${item.severity}`}>{item.severity}</span></td>
                    <td>{item.route}</td>
                    <td>{item.owner}</td>
                    <td>{item.status}</td>
                    <td>{formatTimestamp(item.reportedTime)}</td>
                  </tr>
                )) : data.alerts.length ? <TableEmptyRow columns={7} label="No alerts match the active filters." /> : <TableSkeletonRows columns={7} rows={6} />}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </section>
  );
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="power-section-header">
      <p className="power-eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  );
}

function CommandSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="power-command-select">
      <span>{label}</span>
      <div className="power-command-select-wrap">
        <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={label}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <ChevronDownIcon size={14} />
      </div>
    </label>
  );
}

function ChartCard({
  title,
  subtitle,
  href,
  icon,
  className,
  children,
}: {
  title: string;
  subtitle: string;
  href: string;
  icon: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`power-panel card${className ? ` ${className}` : ''}`}>
      <div className="power-panel-head">
        <div className="power-panel-heading">
          <span className="power-panel-icon">{icon}</span>
          <div>
            <p className="power-eyebrow">{subtitle}</p>
            <h2>{title}</h2>
          </div>
        </div>
        <Link href={href} className="power-open-link">
          <ArrowRightIcon size={15} />
        </Link>
      </div>
      {children}
    </div>
  );
}

function ChartSkeleton({ compact = false, anchor = false }: { compact?: boolean; anchor?: boolean }) {
  return (
    <div className={`power-chart-skeleton${compact ? ' compact' : ''}${anchor ? ' anchor' : ''}`} aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

function KpiSkeletonCard() {
  return (
    <div className="power-kpi-card power-kpi-card-skeleton" aria-hidden="true">
      <div className="power-kpi-top">
        <span className="power-kpi-skeleton-line short" />
        <span className="power-kpi-skeleton-icon" />
      </div>
      <span className="power-kpi-skeleton-line value" />
      <span className="power-kpi-skeleton-pill" />
      <span className="power-kpi-skeleton-line" />
    </div>
  );
}

function ChartEmptyState({ label }: { label: string }) {
  return <div className="power-chart-empty">{label}</div>;
}

function TableSkeletonRows({ columns, rows }: { columns: number; rows: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <tr key={`skeleton-${rowIndex}`} className="power-table-skeleton-row" aria-hidden="true">
          {Array.from({ length: columns }, (_, columnIndex) => (
            <td key={`skeleton-${rowIndex}-${columnIndex}`}>
              <span className="power-cell-skeleton" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function TableEmptyRow({ columns, label }: { columns: number; label: string }) {
  return (
    <tr className="power-table-empty-row">
      <td colSpan={columns}>{label}</td>
    </tr>
  );
}

function iconForKpi(label: string) {
  const key = label.toLowerCase();
  if (key.includes('total')) return <ActivityIcon size={16} />;
  if (key.includes('active')) return <TruckIcon size={16} />;
  if (key.includes('delay')) return <ClockIcon size={16} />;
  if (key.includes('revenue')) return <DollarCircleIcon size={16} />;
  if (key.includes('fleet')) return <GaugeIcon size={16} />;
  if (key.includes('on-time')) return <RouteIcon size={16} />;
  if (key.includes('incident')) return <AlertTriangleIcon size={16} />;
  return <ShieldIcon size={16} />;
}

function formatTrend(label: string, value: number) {
  if (label.includes('%')) return `${Math.abs(value)} pts`;
  if (label.includes('Revenue')) return `ETB ${formatNumber(Math.abs(value))}`;
  return formatNumber(Math.abs(value));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatAge(value: string) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  if (Number.isNaN(date.getTime()) || diffMs < 0) return formatTimestamp(value);
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${minutes}m old`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h old`;
  const days = Math.floor(hours / 24);
  return `${days}d old`;
}

function resolveWindow(dateRange: 'today' | '7d' | '30d', timeView: 'today' | 'week' | 'month') {
  const rangeWindow = dateRange === 'today' ? 1 : dateRange === '30d' ? 30 : 7;
  const viewWindow = timeView === 'today' ? 1 : timeView === 'month' ? 30 : 7;
  return Math.min(rangeWindow, viewWindow);
}

const tooltipStyle = {
  borderRadius: '12px',
  border: '1px solid rgba(148, 163, 184, 0.24)',
  boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)',
  fontSize: '12px',
};
