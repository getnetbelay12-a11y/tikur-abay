'use client';

import type { ReactNode } from 'react';
import { useConsoleI18n } from '../lib/use-console-i18n';

export function WorkspaceDetailDrawer({
  title,
  subtitle,
  onClose,
  actions = null,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { tx } = useConsoleI18n();

  return (
    <div className="workspace-drawer-backdrop" onClick={onClose}>
      <aside className="card workspace-drawer" onClick={(event) => event.stopPropagation()}>
        <div className="workspace-drawer-header">
          <div>
            <div className="eyebrow">{tx('Detail View')}</div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
          <div className="workspace-drawer-header-actions">
            {actions}
            <button type="button" className="btn btn-secondary btn-compact" onClick={onClose}>{tx('Close')}</button>
          </div>
        </div>
        <div className="workspace-drawer-body">{children}</div>
      </aside>
    </div>
  );
}
