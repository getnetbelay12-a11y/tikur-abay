'use client';

import type { ReactNode } from 'react';

type ConsoleCommandHeaderProps = {
  title: string;
  subtitle: string;
  contextTitle: string;
  contextSubtitle: string;
  menuButton?: ReactNode;
  tools?: ReactNode;
  utilities?: ReactNode;
  profile?: ReactNode;
};

export function ConsoleCommandHeader({
  title,
  subtitle,
  contextTitle,
  contextSubtitle,
  menuButton,
  tools,
  utilities,
  profile,
}: ConsoleCommandHeaderProps) {
  const hasContext = Boolean(contextTitle.trim() || contextSubtitle.trim());
  return (
    <header className="console-command-header">
      <div className="console-command-identity console-command-zone console-command-zone-identity">
        {menuButton ? <div className="console-command-menu">{menuButton}</div> : null}
        <div className="console-command-title">
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        {hasContext ? (
          <div className="console-command-context console-command-zone-context" aria-label="Active desk context">
            <strong>{contextTitle}</strong>
            <small>{contextSubtitle}</small>
          </div>
        ) : null}
      </div>

      <div className="console-command-actions console-command-zone console-command-zone-actions">
        {tools ? <div className="console-command-tools console-command-zone-tools">{tools}</div> : null}
        {utilities ? <div className="console-command-utilities console-command-zone-utilities">{utilities}</div> : null}
        {profile ? <div className="console-command-profile console-command-zone-account">{profile}</div> : null}
      </div>
    </header>
  );
}
