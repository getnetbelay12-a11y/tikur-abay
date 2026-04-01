import Link from 'next/link';
import { DocumentDownloadActions } from '../../../components/document-download-actions';
import { formatDateTime, formatText } from '../../../lib/formatters';
import { serverApiGet } from '../../../lib/server-api';

type DocumentRecord = {
  _id?: string;
  id?: string;
  title?: string;
  fileName?: string;
  category?: string;
  documentType?: string;
  entityType?: string;
  entityId?: string;
  fileUrl?: string;
  approvalStatus?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

export const dynamic = 'force-dynamic';

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const document = await serverApiGet<DocumentRecord>(`/documents/${id}`).catch(() => null);

  if (!document) {
    return (
      <main className="shell">
        <div className="error-state">
          <strong>Document not found</strong>
          <p>The requested document record could not be loaded.</p>
          <Link className="btn" href="/documents">Back to documents</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="shell">
      <div className="panel">
        <section className="section-card card" style={{ padding: 20 }}>
          <div className="label">Document detail</div>
          <h1 style={{ margin: '4px 0 0' }}>{formatText(document.title ?? document.fileName, 'Document')}</h1>
          <div className="list-stack" style={{ marginTop: 16 }}>
            <div className="list-row"><span>Category</span><strong>{formatText(document.category ?? document.documentType, 'document').replace(/_/g, ' ')}</strong></div>
            <div className="list-row"><span>Entity</span><strong>{formatText(document.entityType, 'Record')} · {formatText(document.entityId, 'ID not recorded')}</strong></div>
            <div className="list-row"><span>Status</span><strong>{formatText(document.approvalStatus ?? document.status, 'uploaded')}</strong></div>
            <div className="list-row"><span>Created</span><strong>{formatDateTime(document.createdAt)}</strong></div>
            <div className="list-row"><span>Updated</span><strong>{formatDateTime(document.updatedAt)}</strong></div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
            <DocumentDownloadActions documentId={id} label="Open document" />
            <Link className="btn btn-secondary" href="/documents">Back to Document Center</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
