'use client';

export default function OperationsError({
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
          <div className="eyebrow">Operations Hub</div>
          <h1 className="console-title-tight">Operations workspace unavailable</h1>
          <p>{error.message || 'The operations page could not load its latest fleet data.'}</p>
          <button type="button" className="btn" onClick={reset}>Retry</button>
        </section>
      </div>
    </main>
  );
}
