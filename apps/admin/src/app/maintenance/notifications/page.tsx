import { serverApiGet } from '../../../lib/server-api';
import { MaintenanceNotificationForm } from '../../../components/maintenance-notification-form';
export const dynamic = 'force-dynamic';

type VehicleOption = { id?: string; _id?: string; vehicleCode: string };
type DueVehicle = { vehicleId: string; vehicleCode: string };

export default async function MaintenanceNotificationsPage() {
  const [notifications, vehicles, dueVehicles] = await Promise.all([
    serverApiGet<Array<Record<string, unknown>>>('/maintenance/notifications').catch(() => []),
    serverApiGet<VehicleOption[]>('/vehicles').catch(() => []),
    serverApiGet<DueVehicle[]>('/maintenance/due-vehicles').catch(() => []),
  ]);
  const vehicleOptions = uniqueVehicleOptions([
    ...vehicles.map((item) => ({ id: String(item.id ?? item._id ?? ''), code: item.vehicleCode })),
    ...dueVehicles.map((item) => ({ id: String(item.vehicleId ?? ''), code: item.vehicleCode })),
  ]);
  return (
    <main className="shell">
      <div className="panel dashboard-layout">
        <MaintenanceNotificationForm
          vehicles={vehicleOptions}
          notifications={notifications.map((item) => ({ id: String(item._id), status: String(item.status ?? '') }))}
        />
        <section className="section-card card" style={{ padding: 20 }}>
          <div className="label">Maintenance notifications</div>
          <h1 style={{ margin: '6px 0 0' }}>Driver instructions and service alerts</h1>
          <div className="list-stack" style={{ marginTop: 16 }}>
            {notifications.map((item) => (
              <div key={String(item._id)} className="list-row">
                <div>
                  <strong>{String(item.vehicleCode)}</strong>
                  <div className="label">{String(item.maintenanceType)} · {String(item.message)}</div>
                </div>
                <span className={`status-badge ${String(item.status) === 'read' ? 'good' : 'warning'}`}>{String(item.status)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function uniqueVehicleOptions(items: Array<{ id: string; code: string }>) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}
