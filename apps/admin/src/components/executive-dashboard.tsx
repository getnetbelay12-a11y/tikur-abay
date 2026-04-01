import Link from 'next/link';
import { LiveFleetMap } from './live-fleet-map';
import { DashboardStateActions } from './dashboard-state-actions';

type ExecutiveSummary = {
  urgentActions: Array<{ key: string; label: string; value: number; tone: string; href: string }>;
  kpis: Array<{ title: string; value: number; secondary: string; trend: number; href: string }>;
  liveFleetMap: {
    totalVehicles: number;
    activeVehicles: number;
    delayedVehicles: number;
    inDjiboutiVehicles: number;
    points: Array<{
      tripId: string;
      tripCode: string;
      vehicleDbId: string;
      vehicleId: string;
      plateNumber: string;
      driverName: string;
      branch: string;
      routeName: string;
      tripStatus: string;
      vehicleStatus: string;
      geofence: string;
      currentOdometerKm: number;
      lastFuelAt: string | null;
      lastMaintenanceAt: string | null;
      latestGpsAt: string | null;
      lastSeenMinutes: number | null;
      offline: boolean;
      latitude: number;
      longitude: number;
      speed: number;
      djiboutiFlag: boolean;
      delayed: boolean;
      markerColor: string;
    }>;
  };
  alerts: Array<{ id: string; title: string; detail: string; tone: string }>;
  highRiskItems: Array<{ id: string; title: string; detail: string; tone: string }>;
  performanceCards: {
    employeePerformance: { averageScore: number; totalLoadsHandled: number; totalCustomersHandled: number; secondary: string; trend: number };
    driverPerformance: { averageScore: number; totalLoadsCompleted: number; totalCustomersServed: number; secondary: string; trend: number };
    dispatchEfficiency: { averageScore: number; secondary: string; trend: number };
    vehicleUtilization: { averageScore: number; secondary: string; trend: number };
  };
  topCustomers: Array<{ id: string; companyName: string; invoiceTotal: number; outstandingAmount: number; tripVolume: number }>;
  latestAgreements: Array<{ id: string; agreementCode: string; customerName: string; status: string; totalValue: number }>;
  latestPayments: Array<{ id: string; paymentCode: string; invoiceCode: string; amount: number; status: string; paymentDate: string }>;
  revenueByRoute: Array<{ routeName: string; revenue: number; trips: number }>;
  latestTrips: Array<{ id: string; tripCode: string; customer: string; routeName: string; status: string; revenueAmount: number }>;
  maintenanceDueVehicles: Array<{ id: string; vehicleId: string; vehicleLabel: string; maintenanceType: string; overdue: boolean; blockedAssignment: boolean }>;
  openIncidents: Array<{ _id: string; reportCode: string; type: string; vehicleCode: string; driverName: string; urgency: string; status: string }>;
  lowPerformingDrivers: Array<{ id: string; driverId: string; name: string; performanceScore: number; delayedTrips: number; accidentCount: number }>;
  unpaidInvoices: Array<{ id: string; invoiceCode: string; customerName: string; outstandingAmount: number; status: string; dueDate: string }>;
};

function hasExecutiveData(data: ExecutiveSummary) {
  return data.kpis.some((item) => item.value > 0)
    || data.latestTrips.length > 0
    || data.topCustomers.length > 0
    || data.liveFleetMap.points.length > 0;
}

export function ExecutiveDashboard({
  data,
  errorMessage,
  unavailableReason = 'unknown',
}: {
  data: ExecutiveSummary | null;
  errorMessage?: string | null;
  unavailableReason?: 'backend' | 'empty' | 'unknown';
}) {
  if (!data) {
    const title = unavailableReason === 'backend'
      ? 'Executive dashboard is temporarily unavailable'
      : 'Executive dashboard could not be loaded';
    const detail = unavailableReason === 'backend'
      ? 'The console cannot reach the Tikur Abay API right now. Check that the backend is running and try again.'
      : 'We could not load the latest dashboard data. Please retry in a moment.';

    return (
      <div className="error-state">
        <strong>{title}</strong>
        <p>{detail}</p>
        <p className="label">Detailed error information is available in the developer console.</p>
        <DashboardStateActions />
      </div>
    );
  }

  if (!hasExecutiveData(data)) {
    return (
      <div className="empty-state">
        <strong>Executive dashboard is ready, but no summary data is available yet</strong>
        <p>The API is responding, but the dashboard does not have operational records to display.</p>
        <p className="label">Run the local seed and refresh the page to populate the executive overview.</p>
        <DashboardStateActions retryLabel="Refresh dashboard" />
      </div>
    );
  }

  return (
    <div className="panel dashboard-layout">
      <section className="urgent-strip">
        {data.urgentActions.map((item) => (
          <Link key={item.key} href={item.href} className={`alert-chip ${item.tone}`}>
            <div className="label">{item.label}</div>
            <div className="kpi-value">{item.value}</div>
            <div className="label">{item.tone === 'critical' ? 'Needs immediate action' : 'Requires attention'}</div>
          </Link>
        ))}
      </section>

      <section className="kpi-grid">
        {data.kpis.map((kpi) => (
          <Link key={kpi.title} href={kpi.href} className="card kpi-card">
            <div className="label">{kpi.title}</div>
            <div className="kpi-value">{formatNumber(kpi.value)}</div>
            <div className={`trend ${kpi.trend >= 0 ? 'up' : 'down'}`}>
              <span>{kpi.trend >= 0 ? '▲' : '▼'}</span>
              <span>{Math.abs(kpi.trend)} vs previous period</span>
            </div>
            <div className="label">{kpi.secondary}</div>
          </Link>
        ))}
      </section>

      <section className="section-grid-two">
        <LiveFleetMap title="Live Fleet Map Panel" summary={data.liveFleetMap} points={data.liveFleetMap.points} />

        <div className="grid">
          <div className="section-card card">
            <div className="label">Operational alerts</div>
            <h3 className="console-title-tight">High-risk items</h3>
            <div className="list-stack">
              {data.alerts.map((item) => (
                <div key={item.id} className="list-row">
                  <div>
                    <strong>{item.title}</strong>
                    <div className="label">{item.detail}</div>
                  </div>
                  <span className={`status-badge ${item.tone}`}>{item.tone}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="section-card card">
            <div className="label">High-risk field issues</div>
            <h3 className="console-title-tight">Dispatch follow-up queue</h3>
            <div className="list-stack">
              {data.highRiskItems.map((item) => (
                <div key={item.id} className="list-row">
                  <div>
                    <strong>{item.title}</strong>
                    <div className="label">{item.detail}</div>
                  </div>
                  <span className={`status-badge ${item.tone}`}>{item.tone}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-grid-four">
        <PerformanceCard
          href="/dashboard/performance/employees"
          title="Employee Performance Summary"
          value={data.performanceCards.employeePerformance.averageScore}
          context={`Loads ${formatNumber(data.performanceCards.employeePerformance.totalLoadsHandled)} · Customers ${formatNumber(data.performanceCards.employeePerformance.totalCustomersHandled)}`}
          trend={data.performanceCards.employeePerformance.trend}
        />
        <PerformanceCard
          href="/dashboard/performance/drivers"
          title="Driver Performance Summary"
          value={data.performanceCards.driverPerformance.averageScore}
          context={`Loads ${formatNumber(data.performanceCards.driverPerformance.totalLoadsCompleted)} · Customers ${formatNumber(data.performanceCards.driverPerformance.totalCustomersServed)}`}
          trend={data.performanceCards.driverPerformance.trend}
        />
        <PerformanceCard
          href="/operations"
          title="Dispatch Efficiency"
          value={data.performanceCards.dispatchEfficiency.averageScore}
          context={data.performanceCards.dispatchEfficiency.secondary}
          trend={data.performanceCards.dispatchEfficiency.trend}
        />
        <PerformanceCard
          href="/tracking"
          title="Vehicle Utilization"
          value={data.performanceCards.vehicleUtilization.averageScore}
          context={data.performanceCards.vehicleUtilization.secondary}
          trend={data.performanceCards.vehicleUtilization.trend}
        />
      </section>

      <section className="section-grid-four">
        <ListCard
          title="Top Customers"
          subtitle="Highest billed accounts"
          items={data.topCustomers.map((item) => ({
            id: item.id,
            primary: item.companyName,
            secondary: `${formatNumber(item.tripVolume)} trips · ETB ${formatNumber(item.outstandingAmount)} open`,
            href: `/customers/${item.id}`,
          }))}
        />
        <ListCard
          title="Latest Agreements"
          subtitle="Most recent customer contracts"
          items={data.latestAgreements.map((item) => ({
            id: item.id,
            primary: item.agreementCode,
            secondary: `${item.customerName} · ${item.status}`,
            href: `/agreements/${item.id}`,
          }))}
        />
        <ListCard
          title="Latest Payments"
          subtitle="Recently posted customer receipts"
          items={data.latestPayments.map((item) => ({
            id: item.id,
            primary: item.paymentCode,
            secondary: `${item.invoiceCode} · ETB ${formatNumber(item.amount)}`,
            href: `/payments/${item.id}`,
          }))}
        />
        <ListCard
          title="Revenue by Route"
          subtitle="Route contribution snapshot"
          items={data.revenueByRoute.map((item) => ({
            id: item.routeName,
            primary: item.routeName,
            secondary: `${formatNumber(item.trips)} trips · ETB ${formatNumber(item.revenue)}`,
            href: `/trips?route=${item.routeName}`,
          }))}
        />
      </section>

      <section className="grid">
        <div className="section-card card">
          <div className="card-header-row">
            <div>
              <div className="label">Latest operational flow</div>
              <h3 className="console-title-tight">Latest Trips</h3>
            </div>
            <Link className="btn btn-secondary btn-compact" href="/trips">Open full trip list</Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Trip</th>
                  <th>Customer</th>
                  <th>Route</th>
                  <th>Status</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.latestTrips.map((trip) => (
                  <tr key={trip.id}>
                    <td><Link href={`/trips/${trip.id}`}>{trip.tripCode}</Link></td>
                    <td>{trip.customer}</td>
                    <td>{trip.routeName}</td>
                    <td><span className={`status-badge ${trip.status === 'delayed' ? 'critical' : trip.status === 'in_transit' ? 'good' : 'warning'}`}>{trip.status}</span></td>
                    <td>ETB {formatNumber(trip.revenueAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="section-grid-four">
          <ListCard
            title="Maintenance Due Vehicles"
            subtitle="Fleet blocked or due soon"
            items={data.maintenanceDueVehicles.map((item) => ({
              id: item.id,
              primary: item.vehicleLabel,
              secondary: `${item.maintenanceType} · ${item.overdue ? 'overdue' : 'due soon'}`,
              href: '/maintenance-alerts',
            }))}
          />
          <ListCard
            title="Open Incidents"
            subtitle="Unresolved field reports"
            items={data.openIncidents.map((item) => ({
              id: item._id,
              primary: `${item.type.replace(/_/g, ' ')} · ${item.vehicleCode}`,
              secondary: `${item.driverName} · ${item.urgency} · ${item.status}`,
              href: '/driver-reports',
            }))}
          />
          <ListCard
            title="Low-performing Drivers"
            subtitle="Needs coaching or intervention"
            items={data.lowPerformingDrivers.map((item) => ({
              id: item.id,
              primary: item.name,
              secondary: `Score ${item.performanceScore} · delays ${item.delayedTrips} · accidents ${item.accidentCount}`,
              href: '/dashboard/performance/drivers',
            }))}
          />
          <ListCard
            title="Unpaid Invoices"
            subtitle="Finance collections queue"
            items={data.unpaidInvoices.map((item) => ({
              id: item.id,
              primary: item.invoiceCode,
              secondary: `${item.customerName} · ETB ${formatNumber(item.outstandingAmount)}`,
              href: '/payments',
            }))}
          />
        </div>
      </section>
    </div>
  );
}

function PerformanceCard({ href, title, value, context, trend }: { href: string; title: string; value: number; context: string; trend: number }) {
  return (
    <Link href={href} className="card kpi-card">
      <div className="label">{title}</div>
      <div className="kpi-value">{value}</div>
      <div className={`trend ${trend >= 0 ? 'up' : 'down'}`}>{trend >= 0 ? '▲' : '▼'} {Math.abs(trend)} vs previous period</div>
      <div className="label">{context}</div>
    </Link>
  );
}

function ListCard({ title, subtitle, items }: { title: string; subtitle: string; items: Array<{ id: string; primary: string; secondary: string; href: string }> }) {
  return (
    <div className="section-card card">
      <div className="label">{subtitle}</div>
      <h3 className="console-title-tight">{title}</h3>
      <div className="list-stack">
        {items.map((item) => (
          <Link key={item.id} href={item.href} className="list-row">
            <div>
              <strong>{item.primary}</strong>
              <div className="label">{item.secondary}</div>
            </div>
            <span className="label">Open</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}
