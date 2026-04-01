import { serverApiGet } from '../../../../../lib/server-api';
export const dynamic = 'force-dynamic';

export default async function VehicleMaintenanceHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await serverApiGet<Record<string, unknown>>(`/maintenance/vehicles/${id}/history`).catch(() => null);
  const timeline = Array.isArray(data?.timeline) ? data.timeline as Array<Record<string, unknown>> : [];
  return (
    <main className="shell">
      <div className="panel">
        <section className="section-card card" style={{ padding: 20 }}>
          <div className="label">Vehicle maintenance timeline</div>
          <h1 style={{ margin: '6px 0 0' }}>{String((data?.vehicle as Record<string, unknown> | undefined)?.vehicleCode ?? 'Vehicle history')}</h1>
          <div className="label">{String((data?.vehicle as Record<string, unknown> | undefined)?.branchName ?? '')} · odometer {String((data?.vehicle as Record<string, unknown> | undefined)?.currentOdometerKm ?? '')}</div>
          <div className="list-stack" style={{ marginTop: 16 }}>
            {timeline.map((item) => (
              <div key={String(item.id)} className="list-row">
                <div>
                  <strong>{String(item.title)}</strong>
                  <div className="label">{String(item.detail)}</div>
                </div>
                <span className="label">{new Date(String(item.at)).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
