'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { DemoManifest } from '../lib/demo-manifest';

export function DemoScenarioControl({ manifest }: { manifest: DemoManifest | null }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();

  async function loadDemo() {
    setMessage('');
    const response = await fetch('/api/demo/load', { method: 'POST' });
    const payload = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    if (!response.ok || !payload?.ok) {
      setMessage(payload?.message || 'Scenario load failed');
      return;
    }
    setMessage('Operational scenarios loaded and verified.');
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <section className="card console-card-pad console-gap-bottom-xl">
      <div className="console-split-wrap">
        <div className="console-copy-block">
          <div className="eyebrow">Scenario Control</div>
          <h2 className="console-title-band">One-click logistics scenario loader</h2>
          <p className="console-muted-reset">
            Reload prepared booking-to-closure scenarios directly from the console, then use the same manifest-backed records across admin, portal, and mobile.
          </p>
          <div className="console-wrap-row console-gap-top-md">
            <span className="status-chip">Scenario A · Clean closure</span>
            <span className="status-chip">Scenario B · Customer issue</span>
            <span className="status-chip">Scenario C · Clearance risk</span>
            {manifest?.preparedAt ? <span className="status-chip">Prepared {new Date(manifest.preparedAt).toLocaleString('en-US')}</span> : null}
          </div>
        </div>
        <div className="console-action-stack">
          <button className="btn" type="button" onClick={loadDemo} disabled={isPending}>
            {isPending ? 'Loading scenarios...' : 'Load Prepared Shipments'}
          </button>
          <div className="console-small-muted">
            Runbook: <code>docs/demo-scenario-runbook.md</code>
          </div>
        </div>
      </div>
      {message ? <p className="console-message">{message}</p> : null}
      {manifest?.manifest?.scenarios?.length ? (
        <div className="console-auto-grid console-gap-top-lg">
          {manifest.manifest.scenarios.map((scenario) => (
            <article key={scenario.shipmentId} className="console-scenario-card">
              <strong>{scenario.label}</strong>
              <p className="console-scenario-primary">{scenario.bookingNumber} · {scenario.shipmentId}</p>
              <p className="console-scenario-secondary">{scenario.currentStage.replace(/_/g, ' ')}</p>
              <p className="console-scenario-secondary console-text-reset">{scenario.expectedOutcome}</p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
