import { serverApiGet } from '../../../../lib/server-api';

export default async function ExecutiveFuelLogsPage() {
  const fuel = await serverApiGet<{ latestFuelLogs?: Array<Record<string, unknown>> }>('/dashboard/executive/fuel-summary').catch(() => ({ latestFuelLogs: [] }));
  const rows = fuel.latestFuelLogs ?? [];

  return (
    <main className="shell">
      <div className="panel">
        <section className="card console-card-pad">
          <h1 className="console-title-reset">Fuel Logs</h1>
          <p className="label">Fuel cost, liters, and odometer activity.</p>
          {rows.length === 0 ? (
            <div className="empty-state console-gap-top-lg">
              <p>No records found for the current scope.</p>
            </div>
          ) : (
            <div className="list-stack console-gap-top-lg">
              {rows.map((item) => (
                <div key={String(item['_id'] ?? item['id'] ?? item['vehicleId'])} className="list-row">
                  <div>
                    <strong>{String(item['vehicleId'] ?? 'Vehicle')}</strong>
                    <div className="label">{String(item['station'] ?? 'Station')} · {String(item['liters'] ?? 0)} L</div>
                  </div>
                  <span className="label">ETB {String(item['cost'] ?? 0)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
