'use client';

import { useState } from 'react';
import { apiGet } from '../lib/api';

type DownloadMeta = {
  id: string;
  fileName: string;
  mimeType?: string | null;
  fileSize?: number | null;
  downloadUrl: string;
  storageMode?: string;
};

export function DocumentDownloadActions({
  documentId,
  label = 'Download',
}: {
  documentId: string;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setLoading(true);
    setError(null);

    try {
      const meta = await apiGet<DownloadMeta>(`/documents/${documentId}/download`);
      window.open(meta.downloadUrl, '_blank', 'noopener,noreferrer');
    } catch (downloadError) {
      console.error('Document download failed', downloadError);
      setError('Unable to open this document right now.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
      <button className="btn console-download-button" type="button" onClick={handleDownload} disabled={loading}>
        {loading ? 'Opening...' : label}
      </button>
      {error ? <span style={{ color: 'var(--danger)' }}>{error}</span> : null}
    </div>
  );
}
