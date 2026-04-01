import Link from 'next/link';
import { serverApiGet } from '../../../lib/server-api';
import { RepairOrderForm } from '../../../components/repair-order-form';
export const dynamic = 'force-dynamic';

type VehicleOption = { _id: string; vehicleCode: string };

export default async function RepairOrdersPage() {
  const [orders, vehicles] = await Promise.all([
    serverApiGet<Array<Record<string, unknown>>>('/maintenance/repair-orders').catch(() => []),
    serverApiGet<VehicleOption[]>('/vehicles').catch(() => []),
  ]);
  return (
    <main className="shell">
      <div className="panel dashboard-layout">
        <RepairOrderForm vehicles={vehicles.slice(0, 80).map((item) => ({ id: String(item._id), code: item.vehicleCode }))} />
        <section className="section-card card" style={{ padding: 20 }}>
          <div className="label">Repair orders</div>
          <h1 style={{ margin: '6px 0 0' }}>Workshop queue</h1>
          <div className="list-stack" style={{ marginTop: 16 }}>
            {orders.map((item) => (
              <Link key={String(item._id)} href={`/maintenance/repair-orders/${String(item._id)}`} className="list-row">
                <div>
                  <strong>{String(item.repairOrderCode)}</strong>
                  <div className="label">{String(item.vehicleCode)} · {String(item.maintenanceType)} · {String(item.workshop ?? 'No workshop')}</div>
                </div>
                <span className={`status-badge ${String(item.status) === 'completed' ? 'good' : String(item.status).includes('rejected') ? 'critical' : 'warning'}`}>{String(item.status)}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
