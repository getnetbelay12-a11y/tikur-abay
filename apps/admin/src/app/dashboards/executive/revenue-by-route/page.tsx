import { serverApiGet } from '../../../../lib/server-api';

export default async function ExecutiveRevenueByRoutePage() {
  const rows = await serverApiGet<Record<string, unknown>>('/dashboard/executive-summary')
    .then((data) => Array.isArray(data['revenueByRoute']) ? data['revenueByRoute'] as Array<Record<string, unknown>> : [])
    .catch(() => []);

  return (
    <main className="shell">
      <div className="panel">
        <section className="card console-card-pad">
          <h1 className="console-title-reset">Revenue by Route</h1>
          <p className="label">Route-level revenue and trip mix.</p>
          {rows.length === 0 ? (
            <div className="empty-state console-gap-top-md">
              <p>No records found for the current scope.</p>
            </div>
          ) : (
            <div className="list-stack console-gap-top-md">
              {rows.map((item) => (
                <div key={String(item['routeName'])} className="list-row">
                  <div>
                    <strong>{String(item['routeName'])}</strong>
                    <div className="label">{String(item['trips'] ?? 0)} trips</div>
                  </div>
                  <span className="label">ETB {String(item['revenue'] ?? 0)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
