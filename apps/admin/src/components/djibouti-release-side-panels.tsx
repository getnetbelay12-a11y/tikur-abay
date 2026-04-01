'use client';

import { memo } from 'react';
import { OperationsAiPanel } from './operations-ai-panel';

type ExceptionRow = {
  id: string;
  severity: string;
  issueText: string;
  actionLabel: string;
};

export const DjiboutiReleaseSidePanels = memo(function DjiboutiReleaseSidePanels({
  aiBrief,
  checklistRows,
  gateOutReady,
  inlandReady,
  exceptions,
}: {
  aiBrief: Parameters<typeof OperationsAiPanel>[0]['brief'];
  checklistRows: ReadonlyArray<readonly [string, boolean]>;
  gateOutReady: boolean;
  inlandReady: boolean;
  exceptions: ExceptionRow[];
}) {
  return (
    <aside className="djibouti-support-column">
      <OperationsAiPanel brief={aiBrief} />

      <article className="djibouti-panel" id="djibouti-checklist">
        <header className="djibouti-panel-header">
          <div>
            <span className="djibouti-panel-eyebrow">Release control</span>
            <h2>Gate-Out Checklist</h2>
          </div>
        </header>
        <div className="djibouti-readiness-list">
          {checklistRows.map(([label, complete]) => (
            <div key={label} className={complete ? 'djibouti-check-item is-complete' : label.includes('Gate pass') || label.includes('Handoff') ? 'djibouti-check-item is-blocked' : 'djibouti-check-item is-pending'}>
              <span>{label}</span>
              <strong>{complete ? 'Complete' : 'Pending'}</strong>
            </div>
          ))}
        </div>
        <footer className="djibouti-readiness-footer">
          <div><span>Ready for gate-out</span><strong>{gateOutReady ? 'Yes' : 'No'}</strong></div>
          <div><span>Ready for transitor handoff</span><strong>{inlandReady ? 'Yes' : 'No'}</strong></div>
        </footer>
      </article>

      <article className="djibouti-panel">
        <header className="djibouti-panel-header">
          <div>
            <span className="djibouti-panel-eyebrow">Release issues</span>
            <h2>Exceptions</h2>
          </div>
        </header>
        <div className="djibouti-exception-list">
          {(exceptions.length ? exceptions : [{ id: 'none', severity: 'Low', issueText: 'No open release issues.', actionLabel: 'Monitor' }]).map((exception) => (
            <div key={exception.id} className="djibouti-exception-row">
              <span className={`djibouti-chip djibouti-chip-${exception.severity.toLowerCase()}`}>{exception.severity}</span>
              <div>
                <strong>{exception.issueText}</strong>
                <button type="button">{exception.actionLabel}</button>
              </div>
            </div>
          ))}
        </div>
      </article>
    </aside>
  );
});
