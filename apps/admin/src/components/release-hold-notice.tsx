import Link from 'next/link';

export function ReleaseHoldNotice({
  title,
  summary,
}: {
  title: string;
  summary: string;
}) {
  return (
    <main className="shell">
      <div className="panel dashboard-layout">
        <section className="section-card card" style={{ padding: 24, maxWidth: 920 }}>
          <div className="label">Current Release Focus</div>
          <h1 style={{ margin: '8px 0 10px' }}>{title}</h1>
          <p style={{ margin: 0, maxWidth: 720, color: 'var(--muted-foreground, #526072)' }}>{summary}</p>

          <div className="list-stack" style={{ marginTop: 18 }}>
            <div className="list-row">
              <div>
                <strong>Active platform scope</strong>
                <div className="label">China supplier handoff, ocean shipment, Djibouti release, inland tracking, customer approval, and empty return.</div>
              </div>
              <span className="status-badge warning">On hold</span>
            </div>
            <div className="list-row">
              <div>
                <strong>Reason</strong>
                <div className="label">Keep the production demo centered on the real shipment corridor instead of HR, training, or scorecard modules.</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 18 }}>
            <Link className="btn btn-compact" href="/operations/supplier-agent">Open Supplier Agent Desk</Link>
            <Link className="btn btn-secondary btn-compact" href="/operations/djibouti-release">Open Djibouti Release Desk</Link>
            <Link className="btn btn-secondary btn-compact" href="/operations/corridor-dispatch">Open Corridor Dispatch</Link>
            <Link className="btn btn-secondary btn-compact" href="/operations/dry-port-yard">Open Dry-Port Yard Desk</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
