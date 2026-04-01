'use client';

import Link from 'next/link';
import { memo, useMemo } from 'react';

export type CorridorWorkspaceKey = 'supplier' | 'djibouti' | 'dispatch' | 'yard' | 'empty_return' | 'finance';

type CorridorWorkspaceAction = {
  label: string;
  tone: 'primary' | 'secondary';
  href?: string;
};

type CorridorMilestone = {
  id: string;
  label: string;
  status: 'done' | 'active' | 'next';
  occurredAt: string;
  location: string;
  note: string;
};

type CorridorException = {
  id: string;
  summary: string;
  details: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: string;
};

type CorridorWorkspacePayload = {
  workspace: CorridorWorkspaceKey;
  title: string;
  subtitle: string;
  ownerLabel: string;
  stageLabel: string;
  shipmentRef: string;
  serviceMode: 'multimodal' | 'unimodal';
  containerNumber: string;
  sealNumber: string;
  summaryBullets: string[];
  actions: CorridorWorkspaceAction[];
  sections: Array<{
    id: string;
    title: string;
    description: string;
    rows: Array<{
      label: string;
      value: string;
      tone?: 'neutral' | 'good' | 'warning' | 'critical';
    }>;
  }>;
  exceptions: CorridorException[];
  milestones: CorridorMilestone[];
};

const workspaceTabs: Array<{ key: CorridorWorkspaceKey; label: string; href: string }> = [
  { key: 'supplier', label: 'Supplier Desk', href: '/operations/supplier-agent' },
  { key: 'djibouti', label: 'Djibouti Desk', href: '/operations/djibouti-release' },
  { key: 'dispatch', label: 'Dispatch Hub', href: '/operations/corridor-dispatch' },
  { key: 'yard', label: 'Yard / Delivery', href: '/operations/dry-port-yard' },
  { key: 'empty_return', label: 'Empty Return', href: '/operations/empty-return' },
  { key: 'finance', label: 'Finance Control', href: '/finance' },
];

function toneClassName(tone?: 'neutral' | 'good' | 'warning' | 'critical') {
  switch (tone) {
    case 'good':
      return 'corridor-row corridor-row-good';
    case 'warning':
      return 'corridor-row corridor-row-warning';
    case 'critical':
      return 'corridor-row corridor-row-critical';
    default:
      return 'corridor-row';
  }
}

export const CorridorWorkspaceRuntime = memo(function CorridorWorkspaceRuntime({
  workspace,
}: {
  workspace: CorridorWorkspacePayload | null;
}) {
  const sectionColumns = useMemo(() => {
    if (!workspace) return [[], []] as Array<NonNullable<typeof workspace>['sections']>;
    const left = workspace.sections.filter((_, index) => index % 2 === 0);
    const right = workspace.sections.filter((_, index) => index % 2 === 1);
    return [left, right];
  }, [workspace]);

  if (!workspace) {
    return (
      <main className="shell">
        <section className="corridor-workspace-shell">
          <div className="corridor-empty-state">
            <h1>Workspace unavailable</h1>
            <p>The corridor workspace could not be loaded from the shipment record.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <section className="corridor-workspace-shell">
        <nav className="corridor-workspace-tabs" aria-label="Corridor workspaces">
          {workspaceTabs.map((tab) => (
            <Link key={tab.key} href={tab.href} className={tab.key === workspace.workspace ? 'active' : ''}>
              {tab.label}
            </Link>
          ))}
        </nav>

        <div className="corridor-workspace-hero">
          <div className="corridor-workspace-intro">
            <span className="corridor-workspace-eyebrow">{workspace.stageLabel}</span>
            <h1>{workspace.title}</h1>
            <p>{workspace.subtitle}</p>
            <ul className="corridor-workspace-bullets">
              {workspace.summaryBullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </div>
          <div className="corridor-workspace-meta">
            <div className="corridor-meta-card">
              <span>Shipment</span>
              <strong>{workspace.shipmentRef}</strong>
            </div>
            <div className="corridor-meta-card">
              <span>Owner</span>
              <strong>{workspace.ownerLabel}</strong>
            </div>
            <div className="corridor-meta-grid">
              <div className="corridor-meta-chip">
                <span>Service mode</span>
                <strong>{workspace.serviceMode === 'multimodal' ? 'Multimodal' : 'Unimodal'}</strong>
              </div>
              <div className="corridor-meta-chip">
                <span>Container</span>
                <strong>{workspace.containerNumber}</strong>
              </div>
              <div className="corridor-meta-chip">
                <span>Seal</span>
                <strong>{workspace.sealNumber}</strong>
              </div>
            </div>
            <div className="corridor-actions">
              {workspace.actions.map((action) =>
                action.href ? (
                  <Link
                    key={action.label}
                    href={action.href}
                    className={action.tone === 'primary' ? 'corridor-action corridor-action-primary' : 'corridor-action corridor-action-secondary'}
                  >
                    {action.label}
                  </Link>
                ) : (
                  <button
                    key={action.label}
                    type="button"
                    className={action.tone === 'primary' ? 'corridor-action corridor-action-primary' : 'corridor-action corridor-action-secondary'}
                  >
                    {action.label}
                  </button>
                ),
              )}
            </div>
          </div>
        </div>

        <div className="corridor-workspace-grid">
          {sectionColumns.map((column, columnIndex) => (
            <div key={`column-${columnIndex}`} className="corridor-workspace-column">
              {column.map((section) => (
                <article key={section.id} className="corridor-panel">
                  <header className="corridor-panel-header">
                    <div>
                      <span className="corridor-panel-eyebrow">Section</span>
                      <h2>{section.title}</h2>
                    </div>
                    <p>{section.description}</p>
                  </header>
                  <div className="corridor-panel-rows">
                    {section.rows.map((row) => (
                      <div key={`${section.id}-${row.label}`} className={toneClassName(row.tone)}>
                        <span>{row.label}</span>
                        <strong>{row.value}</strong>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ))}
        </div>

        <div className="corridor-lower-grid">
          <article className="corridor-panel">
            <header className="corridor-panel-header">
              <div>
                <span className="corridor-panel-eyebrow">Exceptions</span>
                <h2>Actionable issues only</h2>
              </div>
              <p>Open shipment exceptions remain visible across every desk, but each desk sees them in stage context.</p>
            </header>
            <div className="corridor-panel-rows">
              {(workspace.exceptions.length ? workspace.exceptions : [
                {
                  id: 'no-open-exception',
                  summary: 'No current issue',
                  details: 'The selected shipment has no active exceptions at this stage.',
                  severity: 'low' as const,
                  status: 'resolved',
                },
              ]).map((item) => (
                <div key={item.id} className={toneClassName(item.severity === 'high' || item.severity === 'critical' ? 'critical' : 'warning')}>
                  <span>{item.summary}</span>
                  <strong>{item.details}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="corridor-panel">
            <header className="corridor-panel-header">
              <div>
                <span className="corridor-panel-eyebrow">Milestones</span>
                <h2>Shared shipment chain</h2>
              </div>
              <p>The same shipment file moves stage by stage rather than being recreated in separate tools.</p>
            </header>
            <div className="corridor-timeline">
              {workspace.milestones.map((milestone) => (
                <div key={milestone.id} className={`corridor-timeline-item corridor-timeline-${milestone.status}`}>
                  <div className="corridor-timeline-dot" />
                  <div>
                    <strong>{milestone.label}</strong>
                    <span>{milestone.location}</span>
                    <p>{milestone.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>
    </main>
  );
});
