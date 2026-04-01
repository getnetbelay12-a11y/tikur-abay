import { serverApiGet } from '../../../../lib/server-api';

export default async function ExecutiveActivityFeedPage() {
  const rows = await serverApiGet<Array<Record<string, unknown>>>('/dashboard/executive/activity-feed').catch(() => []);

  return (
    <main className="shell">
      <div className="panel">
        <section className="card console-card-pad">
          <h1 className="console-title-reset">Activity Feed</h1>
          <p className="label">Operational activity across the business.</p>
          {rows.length === 0 ? (
            <div className="empty-state console-gap-top-lg">
              <p>No records found for the current scope.</p>
            </div>
          ) : (
            <div className="list-stack console-gap-top-lg">
              {rows.map((item) => (
                <div key={String(item['_id'] ?? item['id'] ?? item['title'])} className="list-row">
                  <div>
                    <strong>{String(item['title'] ?? 'Activity')}</strong>
                    <div className="label">{String(item['description'] ?? item['activityType'] ?? '')}</div>
                  </div>
                  <span className="label">{String(item['createdAt'] ?? '')}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
