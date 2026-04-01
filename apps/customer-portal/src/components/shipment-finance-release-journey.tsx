'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost } from '../lib/api';

type JourneyProps = {
  shipmentRef: string;
  bookingNumber: string;
  customerName: string;
};

type WorkflowWorkspace = {
  shipment: {
    shipmentId: string;
    bookingNumber: string;
    financeStatus: string;
    releaseStatus: string;
    dryPortStatus: string;
    interchangeStatus: string;
    totalInvoiced: number;
    totalPaid: number;
    balanceDue: number;
  };
  bankDocuments: Array<Record<string, any>>;
  invoices: Array<Record<string, any>>;
  paymentReceipts: Array<Record<string, any>>;
  officialReceipts: Array<Record<string, any>>;
  releaseAuthorization: Record<string, any> | null;
  containerInterchanges: Array<Record<string, any>>;
  documentPack: Array<Record<string, any>>;
  timeline: Array<Record<string, any>>;
  readiness: {
    totalInvoiced: number;
    totalVerified: number;
    balanceDue: number;
    blockedReason: string;
    readyForRelease: boolean;
  };
};

type UploadState = {
  fileName: string;
  mimeType: string;
  fileSize: number;
  fileContentBase64: string;
};

function formatMoney(value: number) {
  return `USD ${Number(value || 0).toLocaleString('en-US')}`;
}

function formatDate(value?: string | null) {
  if (!value) return 'Pending';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusTone(value: string) {
  const text = String(value || '').toLowerCase();
  if (text.includes('verified') || text.includes('cleared') || text.includes('released') || text.includes('ready') || text.includes('issued') || text.includes('closed')) return 'success';
  if (text.includes('rejected') || text.includes('blocked') || text.includes('mismatch') || text.includes('outstanding')) return 'danger';
  if (text.includes('pending') || text.includes('awaiting') || text.includes('review')) return 'warning';
  return 'info';
}

async function toUploadState(file: File): Promise<UploadState> {
  const buffer = await file.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index] || 0);
  }
  return {
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    fileSize: file.size,
    fileContentBase64: btoa(binary),
  };
}

async function uploadDocument(payload: {
  title: string;
  category: string;
  entityId: string;
  upload: UploadState;
}) {
  return apiPost<Record<string, any>>('/documents/upload', {
    title: payload.title,
    entityType: 'shipment',
    entityId: payload.entityId,
    category: payload.category,
    documentType: payload.category,
    fileName: payload.upload.fileName,
    mimeType: payload.upload.mimeType,
    fileSize: payload.upload.fileSize,
    fileContentBase64: payload.upload.fileContentBase64,
    visibilityScope: 'customer_visible',
    status: 'uploaded',
  });
}

export function ShipmentFinanceReleaseJourney({ shipmentRef, bookingNumber, customerName }: JourneyProps) {
  const [workspace, setWorkspace] = useState<WorkflowWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [bankDoc, setBankDoc] = useState({ documentType: 'ethiopian_bank_bill', bankName: '', referenceNo: '', issueDate: '', notes: '' });
  const [bankDocFile, setBankDocFile] = useState<File | null>(null);
  const [receipt, setReceipt] = useState({ invoiceId: '', invoiceNo: '', amount: '', currency: 'USD', paymentDate: '', transactionRef: '', bankName: '', remark: '' });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const loadWorkspace = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await apiGet<WorkflowWorkspace>(`/import-settlement/shipments/${encodeURIComponent(bookingNumber || shipmentRef)}/workspace`);
      setWorkspace(data);
      setReceipt((current) => ({
        ...current,
        invoiceId: data.invoices[0]?._id || '',
        invoiceNo: data.invoices[0]?.invoiceNo || '',
      }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load shipment finance workflow.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkspace();
  }, [bookingNumber, shipmentRef]);

  const verifiedPayments = useMemo(
    () => (workspace?.paymentReceipts || []).filter((item) => ['verified', 'partially_verified'].includes(String(item.verificationStatus))),
    [workspace],
  );
  const invoiceDocuments = useMemo(
    () => (workspace?.documentPack || []).filter((item) => String(item.category || item.documentType || '').toLowerCase() === 'charge_invoice'),
    [workspace],
  );
  const officialReceiptDocuments = useMemo(
    () => (workspace?.documentPack || []).filter((item) => String(item.category || item.documentType || '').toLowerCase() === 'official_receipt'),
    [workspace],
  );

  const customsAndReleaseDocs = useMemo(
    () => (workspace?.documentPack || []).filter((item) => {
      const category = String(item.category || item.documentType || '').toLowerCase();
      return ['release_authorization', 'release_note', 'customs_pack', 'bank_document_copy', 'cargo_handover_note', 'delivery_note', 'container_interchange'].some((needle) => category.includes(needle));
    }),
    [workspace],
  );

  const submitBankDocument = async () => {
    if (!workspace || !bankDoc.referenceNo || !bankDocFile) return;
    try {
      setUploading(true);
      const upload = await toUploadState(bankDocFile);
      const uploaded = await uploadDocument({
        title: `${bankDoc.documentType} ${bankDoc.referenceNo}`,
        category: 'bank_document_copy',
        entityId: workspace.shipment.shipmentId,
        upload,
      });
      await apiPost(`/import-settlement/shipments/${workspace.shipment.shipmentId}/bank-documents`, {
        ...bankDoc,
        fileUrl: uploaded.fileUrl,
        fileName: uploaded.fileName,
        uploadedDocumentId: uploaded.id,
      });
      setBankDocFile(null);
      setBankDoc({ documentType: 'ethiopian_bank_bill', bankName: '', referenceNo: '', issueDate: '', notes: '' });
      await loadWorkspace();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit bank document.');
    } finally {
      setUploading(false);
    }
  };

  const submitPaymentReceipt = async () => {
    if (!workspace || !receipt.transactionRef || !receiptFile || !receipt.amount) return;
    try {
      setUploading(true);
      const upload = await toUploadState(receiptFile);
      const uploaded = await uploadDocument({
        title: `payment receipt ${receipt.transactionRef}`,
        category: 'receipt',
        entityId: workspace.shipment.shipmentId,
        upload,
      });
      await apiPost(`/import-settlement/shipments/${workspace.shipment.shipmentId}/payment-receipts`, {
        ...receipt,
        amount: Number(receipt.amount || 0),
        fileUrl: uploaded.fileUrl,
        fileName: uploaded.fileName,
        uploadedDocumentId: uploaded.id,
      });
      setReceiptFile(null);
      setReceipt((current) => ({ ...current, amount: '', paymentDate: '', transactionRef: '', bankName: '', remark: '' }));
      await loadWorkspace();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit payment receipt.');
    } finally {
      setUploading(false);
    }
  };

  const openDocument = async (documentId?: string) => {
    if (!documentId) return;
    try {
      const download = await apiGet<Record<string, any>>(`/documents/${documentId}/download`);
      if (download.downloadUrl) {
        window.open(String(download.downloadUrl), '_blank', 'noopener,noreferrer');
      }
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Unable to open document.');
    }
  };

  if (loading) {
    return <article className="portal-card"><p className="portal-helper-text">Loading shipment finance and release workflow...</p></article>;
  }

  if (!workspace) {
    return (
      <article className="portal-card">
        <div className="portal-section-header">
          <div>
            <div className="portal-section-eyebrow">Finance & release</div>
            <h2>Post-LC import settlement</h2>
          </div>
        </div>
        <p className="portal-helper-text">{error || 'No workflow has been opened for this shipment yet.'}</p>
      </article>
    );
  }

  return (
    <section className="portal-grid">
      <article className="portal-card">
        <div className="portal-section-header">
          <div>
            <div className="portal-section-eyebrow">Post-LC Import Settlement</div>
            <h2>{bookingNumber} · {customerName}</h2>
          </div>
          <span className={`portal-status-chip ${workspace.readiness.readyForRelease ? 'success' : statusTone(workspace.readiness.blockedReason)}`}>
            {workspace.readiness.readyForRelease ? 'Ready for Release' : workspace.readiness.blockedReason}
          </span>
        </div>
        {error ? <p className="portal-helper-text" style={{ color: '#b42318' }}>{error}</p> : null}
        <div className="portal-data-grid">
          <div className="portal-data-item"><span>Finance status</span><strong>{workspace.shipment.financeStatus}</strong></div>
          <div className="portal-data-item"><span>Release status</span><strong>{workspace.shipment.releaseStatus}</strong></div>
          <div className="portal-data-item"><span>Total invoiced</span><strong>{formatMoney(workspace.shipment.totalInvoiced)}</strong></div>
          <div className="portal-data-item"><span>Total paid</span><strong>{formatMoney(workspace.shipment.totalPaid)}</strong></div>
          <div className="portal-data-item"><span>Balance due</span><strong>{formatMoney(workspace.shipment.balanceDue)}</strong></div>
          <div className="portal-data-item"><span>Dry-port status</span><strong>{workspace.shipment.dryPortStatus}</strong></div>
        </div>
      </article>

      <article className="portal-card">
        <div className="portal-section-header"><div><div className="portal-section-eyebrow">1. Bank / LC Documents</div><h2>Upload Ethiopian bank bill and LC papers</h2></div></div>
        <div className="portal-data-grid two-col">
          <label className="portal-data-item"><span>Document type</span><select className="portal-select" value={bankDoc.documentType} onChange={(event) => setBankDoc((current) => ({ ...current, documentType: event.target.value }))}><option value="ethiopian_bank_bill">Ethiopian bank bill</option><option value="lc_bank_document">LC bank document</option><option value="bank_payment_instruction">Bank payment instruction</option></select></label>
          <label className="portal-data-item"><span>Bank name</span><input className="portal-input" value={bankDoc.bankName} onChange={(event) => setBankDoc((current) => ({ ...current, bankName: event.target.value }))} /></label>
          <label className="portal-data-item"><span>Reference number</span><input className="portal-input" value={bankDoc.referenceNo} onChange={(event) => setBankDoc((current) => ({ ...current, referenceNo: event.target.value }))} /></label>
          <label className="portal-data-item"><span>Issue date</span><input className="portal-input" type="date" value={bankDoc.issueDate} onChange={(event) => setBankDoc((current) => ({ ...current, issueDate: event.target.value }))} /></label>
          <label className="portal-data-item portal-data-item-wide"><span>Notes</span><input className="portal-input" value={bankDoc.notes} onChange={(event) => setBankDoc((current) => ({ ...current, notes: event.target.value }))} /></label>
          <label className="portal-data-item portal-data-item-wide"><span>Attach file</span><input className="portal-input" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(event) => setBankDocFile(event.target.files?.[0] || null)} /></label>
        </div>
        <div className="portal-actions">
          <button type="button" className="portal-btn secondary" disabled={uploading || !bankDocFile || !bankDoc.referenceNo} onClick={() => void submitBankDocument()}>Upload bank document</button>
        </div>
        <div className="portal-list">
          {workspace.bankDocuments.length ? workspace.bankDocuments.map((item) => (
            <div key={String(item._id)} className="portal-list-row">
              <div>
                <strong>{item.documentType} · {item.referenceNo}</strong>
                <p>{item.bankName || 'Bank pending'} · {formatDate(item.issueDate)} · {item.notes || 'No notes'}</p>
              </div>
              <span className={`portal-status-chip ${statusTone(String(item.status))}`}>{item.status}</span>
            </div>
          )) : <p className="portal-helper-text">No bank or LC document has been submitted yet.</p>}
        </div>
      </article>

      <article className="portal-card">
        <div className="portal-section-header"><div><div className="portal-section-eyebrow">2. Tikur Abay Charges & Invoices</div><h2>Charge sheet and invoice summary</h2></div></div>
        <div className="portal-list">
          {workspace.invoices.length ? workspace.invoices.map((invoice) => (
            <div key={String(invoice._id)} className="portal-payment-row">
              <div>
                <strong>{invoice.invoiceNo} · {invoice.invoiceType}</strong>
                <p>Due {formatDate(invoice.dueDate)} · {invoice.currency} total {Number(invoice.total || 0).toLocaleString('en-US')}</p>
                <p>{(invoice.lines || []).map((line: any) => `${line.chargeType}: ${line.currency} ${Number(line.amount || 0).toLocaleString('en-US')}`).join(' • ') || 'Invoice lines pending'}</p>
              </div>
              <div className="portal-actions">
                <span className={`portal-status-chip ${statusTone(String(invoice.status))}`}>{invoice.status}</span>
                <span className={`portal-status-chip ${statusTone(String(invoice.approvalStatus))}`}>{invoice.approvalStatus}</span>
              </div>
            </div>
          )) : <p className="portal-helper-text">Tikur Abay has not issued the charge sheet yet.</p>}
        </div>
        {invoiceDocuments.length ? (
          <div className="portal-actions">
            {invoiceDocuments.map((item) => (
              <button key={String(item.id)} type="button" className="portal-btn ghost" onClick={() => void openDocument(String(item.id))}>
                Download {item.referenceNo || item.title || 'invoice PDF'}
              </button>
            ))}
          </div>
        ) : null}
      </article>

      <article className="portal-card">
        <div className="portal-section-header"><div><div className="portal-section-eyebrow">3. Upload Payment Receipts</div><h2>Submit bank transfer and payment proof</h2></div></div>
        <div className="portal-data-grid two-col">
          <label className="portal-data-item"><span>Invoice</span><select className="portal-select" value={receipt.invoiceId} onChange={(event) => setReceipt((current) => ({ ...current, invoiceId: event.target.value, invoiceNo: workspace.invoices.find((item) => String(item._id) === event.target.value)?.invoiceNo || '' }))}><option value="">Select invoice</option>{workspace.invoices.map((invoice) => <option key={String(invoice._id)} value={String(invoice._id)}>{invoice.invoiceNo}</option>)}</select></label>
          <label className="portal-data-item"><span>Amount</span><input className="portal-input" value={receipt.amount} onChange={(event) => setReceipt((current) => ({ ...current, amount: event.target.value }))} /></label>
          <label className="portal-data-item"><span>Currency</span><select className="portal-select" value={receipt.currency} onChange={(event) => setReceipt((current) => ({ ...current, currency: event.target.value }))}><option value="USD">USD</option><option value="ETB">ETB</option></select></label>
          <label className="portal-data-item"><span>Payment date</span><input className="portal-input" type="date" value={receipt.paymentDate} onChange={(event) => setReceipt((current) => ({ ...current, paymentDate: event.target.value }))} /></label>
          <label className="portal-data-item"><span>Transaction ID</span><input className="portal-input" value={receipt.transactionRef} onChange={(event) => setReceipt((current) => ({ ...current, transactionRef: event.target.value }))} /></label>
          <label className="portal-data-item"><span>Bank name</span><input className="portal-input" value={receipt.bankName} onChange={(event) => setReceipt((current) => ({ ...current, bankName: event.target.value }))} /></label>
          <label className="portal-data-item portal-data-item-wide"><span>Remark</span><input className="portal-input" value={receipt.remark} onChange={(event) => setReceipt((current) => ({ ...current, remark: event.target.value }))} /></label>
          <label className="portal-data-item portal-data-item-wide"><span>Attach payment proof</span><input className="portal-input" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(event) => setReceiptFile(event.target.files?.[0] || null)} /></label>
        </div>
        <div className="portal-actions">
          <button type="button" className="portal-btn secondary" disabled={uploading || !receiptFile || !receipt.transactionRef || !receipt.amount} onClick={() => void submitPaymentReceipt()}>Upload payment receipt</button>
        </div>
      </article>

      <article className="portal-card">
        <div className="portal-section-header"><div><div className="portal-section-eyebrow">4. Verified Payments</div><h2>Finance verification status</h2></div></div>
        <div className="portal-list">
          {workspace.paymentReceipts.length ? workspace.paymentReceipts.map((item) => (
            <div key={String(item._id)} className="portal-list-row">
              <div>
                <strong>{item.invoiceNo || 'Invoice pending'} · {item.transactionRef}</strong>
                <p>{item.bankName || 'Bank pending'} · {item.currency} {Number(item.amount || 0).toLocaleString('en-US')} · {formatDate(item.paymentDate)}</p>
                <p>{item.financeNote || item.remark || 'Awaiting finance review'}</p>
              </div>
              <span className={`portal-status-chip ${statusTone(String(item.verificationStatus))}`}>{item.verificationStatus}</span>
            </div>
          )) : <p className="portal-helper-text">No payment receipt has been submitted yet.</p>}
        </div>
      </article>

      <article className="portal-card">
        <div className="portal-section-header"><div><div className="portal-section-eyebrow">5. Official Tikur Abay Receipts</div><h2>Receipts issued after finance verification</h2></div></div>
        <div className="portal-list">
          {workspace.officialReceipts.length ? workspace.officialReceipts.map((item) => (
            <div key={String(item._id)} className="portal-list-row">
              <div>
                <strong>{item.officialReceiptNo}</strong>
                <p>{formatMoney(item.amountReceived)} · {formatDate(item.issuedAt)} · {item.paymentMethod || 'bank transfer'}</p>
              </div>
              <span className="portal-status-chip success">{item.status}</span>
            </div>
          )) : <p className="portal-helper-text">Tikur Abay official receipt will appear here after finance verifies payment.</p>}
        </div>
        {officialReceiptDocuments.length ? (
          <div className="portal-actions">
            {officialReceiptDocuments.map((item) => (
              <button key={String(item.id)} type="button" className="portal-btn ghost" onClick={() => void openDocument(String(item.id))}>
                Download {item.referenceNo || item.title || 'official receipt PDF'}
              </button>
            ))}
          </div>
        ) : null}
      </article>

      <article className="portal-card">
        <div className="portal-section-header"><div><div className="portal-section-eyebrow">6. Release Readiness</div><h2>Finance clearance and cargo release gate</h2></div></div>
        <div className="portal-data-grid">
          <div className="portal-data-item"><span>Blocked / ready</span><strong>{workspace.readiness.readyForRelease ? 'Ready for Release' : workspace.readiness.blockedReason}</strong></div>
          <div className="portal-data-item"><span>Release authorization</span><strong>{workspace.releaseAuthorization?.status || 'Pending'}</strong></div>
          <div className="portal-data-item"><span>Release mode</span><strong>{workspace.releaseAuthorization?.releaseMode || 'Pending'}</strong></div>
          <div className="portal-data-item"><span>Dry-port release</span><strong>{workspace.shipment.dryPortStatus}</strong></div>
        </div>
      </article>

      <article className="portal-card">
        <div className="portal-section-header"><div><div className="portal-section-eyebrow">7. Customs / Release Documents</div><h2>Document pack and handover files</h2></div></div>
        <div className="portal-doc-list">
          {customsAndReleaseDocs.length ? customsAndReleaseDocs.map((item) => (
            <div key={String(item.id || item._id)} className="portal-doc-row">
              <div>
                <strong>{item.title || item.fileName || item.category || item.documentType}</strong>
                <p>{item.categoryLabel || item.category || item.documentType} · {formatDate(item.createdAt)}</p>
              </div>
              <div className="portal-actions">
                <span className={`portal-status-chip ${statusTone(String(item.status || 'available'))}`}>{item.status || 'available'}</span>
                <button type="button" className="portal-btn ghost" onClick={() => void openDocument(String(item.id || item._id || ''))}>Open</button>
              </div>
            </div>
          )) : <p className="portal-helper-text">The customs and release pack will appear here once Tikur Abay shares it.</p>}
        </div>
      </article>

      <article className="portal-card">
        <div className="portal-section-header"><div><div className="portal-section-eyebrow">8. Container Interchange</div><h2>Full and empty container cycle</h2></div></div>
        <div className="portal-list">
          {workspace.containerInterchanges.length ? workspace.containerInterchanges.map((item) => (
            <div key={String(item._id)} className="portal-list-row">
              <div>
                <strong>{item.interchangeType} · {item.containerNo}</strong>
                <p>{item.location || 'Location pending'} · {formatDate(item.eventDate)} · {item.conditionNotes || 'No condition note'}</p>
              </div>
              <span className={`portal-status-chip ${statusTone(String(item.status))}`}>{item.status}</span>
            </div>
          )) : <p className="portal-helper-text">Container interchange events will appear here from full release to empty return in Djibouti.</p>}
        </div>
      </article>

      <article className="portal-card">
        <div className="portal-section-header"><div><div className="portal-section-eyebrow">9. Shipment Timeline</div><h2>Unified settlement and release timeline</h2></div></div>
        <div className="portal-list">
          {workspace.timeline.length ? workspace.timeline.map((item, index) => (
            <div key={`${item.code || item.title}-${index}`} className="portal-list-row">
              <div>
                <strong>{item.title}</strong>
                <p>{item.note || item.code}</p>
              </div>
              <span className="portal-status-chip info">{formatDate(item.at)}</span>
            </div>
          )) : <p className="portal-helper-text">Timeline events will appear as soon as the shipment moves through finance, release, and interchange steps.</p>}
        </div>
      </article>
    </section>
  );
}
