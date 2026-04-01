'use client';

export default function TrackingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="shell">
      <div className="panel">
        <section className="card console-card-pad">
          <div className="eyebrow">Live Fleet Map</div>
          <h1 className="console-title-tight">Tracking workspace unavailable</h1>
          <p>{error.message || 'The live fleet map could not load the latest tracking data.'}</p>
          <button type="button" className="btn" onClick={reset}>Retry</button>
        </section>
      </div>
    </main>
  );
}
