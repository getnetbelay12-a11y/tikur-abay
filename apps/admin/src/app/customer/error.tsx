'use client';

export default function CustomerWorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="shell">
      <div className="panel">
        <div className="error-state enterprise-error-card">
          <strong>Commercial workspace is temporarily unavailable</strong>
          <p>{error.message || 'The customer workspace could not be loaded.'}</p>
          <button className="btn btn-secondary btn-compact" type="button" onClick={() => reset()}>
            Retry commercial workspace
          </button>
        </div>
      </div>
    </main>
  );
}
