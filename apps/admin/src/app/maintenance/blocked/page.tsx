import Link from 'next/link';
import { serverApiGet } from '../../../lib/server-api';
export const dynamic = 'force-dynamic';

export default async function MaintenanceBlockedPage() {
  const rows = await serverApiGet<Array<Record<string, unknown>>>('/maintenance/blocked').catch(() => []);
  return (
    <main className="shell">
      <div className="panel">
        <section className="section-card card" style={{ padding: 20 }}>
          <div className="label">Maintenance workflow</div>
          <h1 style={{ margin: '6px 0 0' }}>Blocked Vehicles</h1>
          <div className="list-stack" style={{ marginTop: 16 }}>
            {rows.map((item) => (
              <Link key={String(item.id ?? item.vehicleId)} href={`/maintenance/vehicles/${String(item.vehicleId)}/history`} className="list-row">
                <div>
                  <strong>{String(item.vehicleLabel)}</strong>
                  <div className="label">{String(item.maintenanceType)} · critical maintenance overdue</div>
                </div>
                <span className="status-badge critical">blocked assignment</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
