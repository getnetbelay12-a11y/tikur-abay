'use client';

import { OperationsAiPanel } from './operations-ai-panel';
import type { OperationsAiBrief } from '../lib/operations-ai-assistant';

export function TransitorClearanceSupportColumn({
  aiBrief,
  systemAuditLog,
}: {
  aiBrief: OperationsAiBrief;
  systemAuditLog: Array<Record<string, any>>;
}) {
  return (
    <>
      <OperationsAiPanel brief={aiBrief} />

      <article className="djibouti-panel">
        <header className="djibouti-panel-header">
          <div>
            <span className="djibouti-panel-eyebrow">Audit trail</span>
            <h2>Latest document access</h2>
          </div>
        </header>
        <div className="corridor-panel-rows">
          {systemAuditLog.length ? systemAuditLog.slice(0, 8).map((entry, index) => (
            <div key={`${entry.shipmentDocumentId || entry.fileName || 'audit'}-${index}`} className="corridor-row">
              <span>{entry.action || 'download'}</span>
              <strong>{entry.fileName || entry.shipmentDocumentId || 'Shipment document'}</strong>
            </div>
          )) : (
            <div className="djibouti-empty-state">No live document access log entries yet.</div>
          )}
        </div>
      </article>
    </>
  );
}
