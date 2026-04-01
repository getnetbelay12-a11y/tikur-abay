import { serverApiGet } from '../../../lib/server-api';
import { MaintenancePlanForm } from '../../../components/maintenance-plan-form';
export const dynamic = 'force-dynamic';

type VehicleOption = { _id: string; vehicleCode: string };

export default async function MaintenancePlansPage() {
  const [plans, vehicles] = await Promise.all([
    serverApiGet<Array<Record<string, unknown>>>('/maintenance/plans').catch(() => []),
    serverApiGet<VehicleOption[]>('/vehicles').catch(() => []),
  ]);
  return (
    <main className="shell">
      <div className="panel dashboard-layout">
        <MaintenancePlanForm vehicles={vehicles.slice(0, 80).map((item) => ({ id: String(item._id), code: item.vehicleCode }))} />
        <section className="section-card card" style={{ padding: 20 }}>
          <div className="label">Maintenance plans</div>
          <h1 style={{ margin: '6px 0 0' }}>Scheduled service rules</h1>
          <div className="list-stack" style={{ marginTop: 16 }}>
            {plans.map((item) => (
              <div key={String(item._id)} className="list-row">
                <div>
                  <strong>{String(item.vehicleCode)}</strong>
                  <div className="label">{String(item.serviceItemName)} · every {String(item.intervalKm)} km / {String(item.intervalDays)} days</div>
                </div>
                <span className={`status-badge ${item.overdue ? 'critical' : 'good'}`}>{item.overdue ? 'overdue' : 'active'}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
