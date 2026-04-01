'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiGet } from '../lib/api';

export function DocumentsLibrary() {
  const [rows, setRows] = useState<any[]>([]);
  const [shipmentFilter, setShipmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    void (async () => {
      const shipments = await apiGet<any[]>('/shipments?role=customer_user').catch(() => []);
      const details = await Promise.all(
        shipments.map((shipment) => apiGet<any>(`/shipment/${shipment.shipmentId}/documents?role=customer_user`).catch(() => ({ items: [] }))),
      );
      const merged = details.flatMap((detail, index) => (detail?.items || []).map((item: any) => ({
        ...item,
        shipmentRef: shipments[index]?.shipmentRef || shipments[index]?.bookingNumber,
      })));
      setRows(merged);
    })();
  }, []);

  const shipments = Array.from(new Set(rows.map((item) => item.shipmentRef).filter(Boolean)));
  const filtered = useMemo(() => rows.filter((item) => {
    if (shipmentFilter !== 'all' && item.shipmentRef !== shipmentFilter) return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    return true;
  }), [rows, shipmentFilter, statusFilter]);

  return (
    <section className="portal-grid">
      <article className="portal-card">
        <div className="portal-section-header">
          <div>
            <div className="portal-section-eyebrow">Document library</div>
            <h2>Verified document vault</h2>
          </div>
        </div>
        <div className="portal-toolbar">
          <select className="portal-select" value={shipmentFilter} onChange={(event) => setShipmentFilter(event.target.value)}>
            <option value="all">All shipments</option>
            {shipments.map((shipmentRef) => <option key={shipmentRef} value={shipmentRef}>{shipmentRef}</option>)}
          </select>
          <select className="portal-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All status</option>
            <option value="draft">Draft</option>
            <option value="uploaded">Uploaded</option>
            <option value="verified">Verified</option>
            <option value="locked">Locked</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div className="portal-doc-list">
          {filtered.map((document) => (
            <div key={document.shipmentDocumentId || document.id} className="portal-doc-row">
              <div>
                <strong>{document.shipmentRef} · {document.tag || document.documentType}</strong>
                <p>{document.fileName} · v{document.versionNumber || 0} · {document.verificationStatus || 'valid'}</p>
              </div>
              <div className="portal-actions">
                <span className="portal-status-chip info">{document.status}</span>
                <span className="portal-status-chip">{document.signedAt ? 'Signed' : 'Unsigned'}</span>
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
