import { serverApiGet } from '../../../../lib/server-api';

export default async function ExecutiveIncidentsPage() {
  const rows = await serverApiGet<Array<Record<string, unknown>>>('/incidents/open').catch(() => []);

  return (
    <main className="shell">
      <div className="panel">
        <section className="card console-card-pad">
          <h1 className="console-title-reset">Incident List</h1>
          <p className="label">Field incidents and open reports.</p>
          {rows.length === 0 ? (
            <div className="empty-state console-gap-top-md">
              <p>No records found for the current scope.</p>
            </div>
          ) : (
            <div className="list-stack console-gap-top-md">
              {rows.map((item) => (
                <div key={String(item['_id'] ?? item['id'] ?? item['reportCode'])} className="list-row">
                  <div>
                    <strong>{String(item['type'] ?? 'Incident')} · {String(item['vehicleCode'] ?? '')}</strong>
                    <div className="label">{String(item['driverName'] ?? '')}</div>
                  </div>
                  <span className="label">{String(item['status'] ?? '')}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
