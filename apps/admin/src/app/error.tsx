'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="shell">
      <section className="panel">
        <div className="card console-card-pad">
          <div className="eyebrow">Platform Error</div>
          <h1 className="console-title-tight">This page ran into a recoverable problem</h1>
          <p>{error.message || 'The page could not complete its latest request.'}</p>
          <button type="button" className="btn" onClick={reset}>Retry</button>
        </div>
      </section>
    </main>
  );
}
