import { serverApiGet } from '../../../../lib/server-api';

export default async function ExecutiveCoachingQueuePage() {
  const rows = await serverApiGet<Record<string, unknown>>('/dashboard/executive-summary')
    .then((data) => Array.isArray(data['lowPerformingDrivers']) ? data['lowPerformingDrivers'] as Array<Record<string, unknown>> : [])
    .catch(() => []);

  return (
    <main className="shell">
      <div className="panel">
        <section className="card console-card-pad">
          <h1 className="console-title-reset">Driver Coaching Queue</h1>
          <p className="label">Drivers requiring executive follow-up.</p>
          {rows.length === 0 ? (
            <div className="empty-state console-gap-top-lg">
              <p>No records found for the current scope.</p>
            </div>
          ) : (
            <div className="list-stack console-gap-top-lg">
              {rows.map((item) => (
                <div key={String(item['id'] ?? item['name'])} className="list-row">
                  <div>
                    <strong>{String(item['name'])}</strong>
                    <div className="label">Delayed trips {String(item['delayedTrips'] ?? 0)} · Accidents {String(item['accidentCount'] ?? 0)}</div>
                  </div>
                  <span className="label">Score {String(item['performanceScore'] ?? 0)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
