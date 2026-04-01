'use client';

import type { ReactNode } from 'react';
import { useConsoleI18n } from '../lib/use-console-i18n';

type FilterOption = {
  value: string;
  label: string;
};

type FilterField =
  | {
      key: string;
      label: string;
      type: 'search';
      value: string;
      placeholder?: string;
      onChange: (value: string) => void;
    }
  | {
      key: string;
      label: string;
      type: 'select';
      value: string;
      options: FilterOption[];
      onChange: (value: string) => void;
    }
  | {
      key: string;
      label: string;
      type: 'date';
      value: string;
      onChange: (value: string) => void;
    };

export function WorkspaceFilterBar({
  fields,
  secondaryActions = null,
}: {
  fields: FilterField[];
  secondaryActions?: ReactNode;
}) {
  const { tx } = useConsoleI18n();

  return (
    <section className="card workspace-filter-card">
      <div className="workspace-filter-grid">
        {fields.map((field) => (
          <label key={field.key} className={`workspace-filter-field ${field.type === 'search' ? 'workspace-filter-search' : ''}`}>
            <span>{tx(field.label)}</span>
            {field.type === 'search' ? (
              <input
                value={field.value}
                onChange={(event) => field.onChange(event.target.value)}
                placeholder={tx(field.placeholder || 'Search')}
              />
            ) : null}
            {field.type === 'select' ? (
              <select value={field.value} onChange={(event) => field.onChange(event.target.value)}>
                {field.options.map((option) => <option key={`${field.key}-${option.value}`} value={option.value}>{tx(option.label)}</option>)}
              </select>
            ) : null}
            {field.type === 'date' ? (
              <input type="date" value={field.value} onChange={(event) => field.onChange(event.target.value)} />
            ) : null}
          </label>
        ))}
      </div>
      {secondaryActions ? <div className="workspace-filter-actions">{secondaryActions}</div> : null}
    </section>
  );
}
