import Link from 'next/link';
import { serverApiGet } from '../../../../lib/server-api';
import { MaintenanceNotificationForm } from '../../../../components/maintenance-notification-form';
import { RepairOrderStatusActions } from '../../../../components/repair-order-status-actions';
export const dynamic = 'force-dynamic';

type VehicleOption = { _id: string; vehicleCode: string };

export default async function RepairOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [order, notifications, vehicles] = await Promise.all([
    serverApiGet<Record<string, unknown>>(`/maintenance/repair-orders/${id}`).catch(() => null),
    serverApiGet<Array<Record<string, unknown>>>('/maintenance/notifications').catch(() => []),
    serverApiGet<VehicleOption[]>('/vehicles').catch(() => []),
  ]);

  return (
    <main className="shell">
      <div className="panel dashboard-layout">
        <section className="section-card card" style={{ padding: 20 }}>
          <div className="label">Repair order detail</div>
          <h1 style={{ margin: '6px 0 0' }}>{String(order?.repairOrderCode ?? 'Repair order')}</h1>
          <div className="label">{String(order?.vehicleCode ?? '')} · {String(order?.maintenanceType ?? '')} · {String(order?.issueType ?? '')}</div>
          <div className="list-stack" style={{ marginTop: 16 }}>
            <div className="list-row"><span>Status</span><strong>{String(order?.status ?? '')}</strong></div>
            <div className="list-row"><span>Workshop</span><strong>{String(order?.workshop ?? 'Unassigned')}</strong></div>
            <div className="list-row"><span>Technician</span><strong>{String(order?.technician ?? 'Unassigned')}</strong></div>
            <div className="list-row"><span>Estimated Cost</span><strong>ETB {Number(order?.estimatedCost ?? 0).toLocaleString()}</strong></div>
            <div className="list-row"><span>Actual Cost</span><strong>ETB {Number(order?.actualCost ?? 0).toLocaleString()}</strong></div>
          </div>
          <p className="label" style={{ marginTop: 16 }}>{String(order?.description ?? order?.notes ?? '')}</p>
          {order?._id ? <RepairOrderStatusActions repairOrderId={String(order._id)} /> : null}
          <div style={{ marginTop: 16 }}>
            <Link className="btn btn-secondary btn-compact" href={`/maintenance/vehicles/${String(order?.vehicleId ?? '')}/history`}>View Vehicle History</Link>
          </div>
        </section>
        <MaintenanceNotificationForm
          vehicles={vehicles.slice(0, 80).map((item) => ({ id: String(item._id), code: item.vehicleCode }))}
          notifications={notifications.map((item) => ({ id: String(item._id), status: String(item.status ?? '') }))}
        />
      </div>
    </main>
  );
}
