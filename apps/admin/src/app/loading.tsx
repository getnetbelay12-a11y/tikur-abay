export default function Loading() {
  return (
    <main className="shell">
      <div className="panel dashboard-console simplified-dashboard">
        <section className="critical-alerts-grid compact-alert-grid">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="critical-alert-card skeleton-block" />
          ))}
        </section>
        <section className="kpi-grid premium-kpi-grid compact-kpi-grid">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="card skeleton-block kpi-console-card" />
          ))}
        </section>
        <section className="hero-operations-grid">
          <div className="card skeleton-block hero-map-skeleton" />
          <div className="hero-side-stack">
            <div className="card skeleton-block compact-list-skeleton" />
            <div className="card skeleton-block compact-list-skeleton" />
            <div className="card skeleton-block compact-list-skeleton" />
          </div>
        </section>
        <section className="analytics-grid compact-analytics-grid">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="card skeleton-block analytic-skeleton" />
          ))}
        </section>
      </div>
    </main>
  );
}
