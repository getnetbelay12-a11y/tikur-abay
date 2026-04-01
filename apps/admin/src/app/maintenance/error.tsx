'use client';

export default function MaintenanceError({
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
          <strong>Maintenance dashboard is temporarily unavailable</strong>
          <p>{error.message || 'The maintenance workspace could not be loaded.'}</p>
          <button className="btn btn-secondary btn-compact" type="button" onClick={() => reset()}>
            Retry maintenance dashboard
          </button>
        </div>
      </div>
    </main>
  );
}
