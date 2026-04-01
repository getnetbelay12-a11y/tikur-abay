'use client';

import { useState } from 'react';
import { apiBase } from '../lib/api';
import { readToken } from '../lib/auth-session';

export function CsvExportButton({ path, fileName, label = 'Export CSV' }: { path: string; fileName: string; label?: string }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');

  async function exportCsv() {
    setPending(true);
    setMessage('');
    try {
      const token = readToken();
      const response = await fetch(`${apiBase}${path}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        throw new Error(`Export failed for ${path}`);
      }
      const blob = new Blob([await response.text()], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage('Export ready.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Export failed.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <button className="btn btn-secondary btn-compact" type="button" onClick={exportCsv} disabled={pending}>
        {pending ? 'Exporting...' : label}
      </button>
      {message ? <div className="label">{message}</div> : null}
    </div>
  );
}
