'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { readSession } from '../lib/auth-session';
import { apiGet, apiPatch, apiPost } from '../lib/api';
import {
  canOperateShippingAction,
  markShippingLetterOfCreditPaid,
  readShippingPhase1Workspace,
  recordShippingPayment,
  shippingActionOwner,
  shippingCtaLabel,
  shippingPhase1UpdatedEvent,
  type ShippingDocumentStatus,
  type ShippingFinanceReleaseRecord,
  type ShippingTradeDocumentKey,
  updateShippingFinanceReleaseControl,
  updateShippingLetterOfCreditDocument,
  verifyShippingLetterOfCredit,
} from '../lib/shipping-phase1';
import { sharedQuoteStorageUpdatedEvent } from '../lib/shared-quote-storage';
import {
  buildChargeInvoicePdfBase64,
  buildDocumentHandoverSheetPdfBase64,
  buildDriverReimbursementStatementPdfBase64,
  buildOfficialReceiptPdfBase64,
  buildReleaseAuthorizationPdfBase64,
} from '../lib/shipping-pdf';

const lcDocumentStatusOptions: ShippingDocumentStatus[] = ['pending', 'invalid', 'corrected', 'approved'];

function formatMoney(value: number, currency: string) {
  return `${currency} ${value.toLocaleString('en-US')}`;
}

function formatDate(value: string) {
  if (!value) return 'Pending';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function nextStepClass(isActive: boolean) {
  return isActive ? 'supplier-next-step-button' : '';
}

function activeStepPanelClass(isActive: boolean) {
  return isActive ? 'operations-step-active' : '';
}

function isComplete(value?: string) {
  return Boolean(value);
}

function formatState(value?: string) {
  return value ? formatDate(value) : 'Pending';
}

type BackendSettlementWorkspace = Record<string, any> | null;

async function registerShipmentPdf(options: {
  shipmentId: string;
  title: string;
  documentType: string;
  referenceNo: string;
  fileName: string;
  fileContentBase64: string;
  visibilityScope?: 'customer_visible' | 'internal' | 'internal_only' | 'driver_visible';
}) {
  const uploaded = await apiPost<Record<string, any>>('/documents/upload', {
    title: options.title,
    entityType: 'shipment',
    entityId: options.shipmentId,
    category: options.documentType,
    documentType: options.documentType,
    referenceNo: options.referenceNo,
    visibilityScope: options.visibilityScope || 'customer_visible',
    status: 'uploaded',
    fileName: options.fileName,
    mimeType: 'application/pdf',
    fileContentBase64: options.fileContentBase64,
  });
  return uploaded;
}

export function ShippingPhase4FinanceWorkspace() {
  const [workspace, setWorkspace] = useState(() => readShippingPhase1Workspace());
  const [sessionRole, setSessionRole] = useState(() => readSession()?.role ?? null);
  const [search, setSearch] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [backendWorkspace, setBackendWorkspace] = useState<BackendSettlementWorkspace>(null);
  const [backendError, setBackendError] = useState('');
  const [backendLoading, setBackendLoading] = useState(false);

  useEffect(() => {
    const reload = () => setWorkspace(readShippingPhase1Workspace());
    reload();
    setSessionRole(readSession()?.role ?? null);
    window.addEventListener(sharedQuoteStorageUpdatedEvent, reload as EventListener);
    window.addEventListener(shippingPhase1UpdatedEvent, reload as EventListener);
    return () => {
      window.removeEventListener(sharedQuoteStorageUpdatedEvent, reload as EventListener);
      window.removeEventListener(shippingPhase1UpdatedEvent, reload as EventListener);
    };
  }, []);

  const records = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return workspace.lettersOfCredit.filter((record) => {
      if (!needle) return true;
      return [
        record.bookingId,
        record.quoteId,
        record.customerName,
        record.lcNumber,
        record.bankName,
      ].join(' ').toLowerCase().includes(needle);
    });
  }, [search, workspace.lettersOfCredit]);

  const selectedLc = records.find((item) => item.bookingId === selectedBookingId) || records[0] || null;
  const selectedInvoice = workspace.invoices.find((item) => item.bookingId === selectedLc?.bookingId) || null;
  const selectedSettlement = workspace.settlements.find((item) => item.bookingId === selectedLc?.bookingId) || null;
  const selectedPayments = workspace.payments.filter((item) => item.bookingId === selectedLc?.bookingId);
  const selectedRelease = workspace.financeReleaseControls.find((item) => item.bookingId === selectedLc?.bookingId) || null;

  useEffect(() => {
    if (!selectedBookingId && records[0]?.bookingId) {
      setSelectedBookingId(records[0].bookingId);
    }
  }, [records, selectedBookingId]);

  useEffect(() => {
    if (!selectedLc?.bookingId) {
      setBackendWorkspace(null);
      return;
    }
    let cancelled = false;
    const loadBackendWorkspace = async () => {
      try {
        setBackendLoading(true);
        setBackendError('');
        const next = await apiGet<Record<string, any>>(`/import-settlement/shipments/${encodeURIComponent(selectedLc.bookingId)}/workspace`);
        if (!cancelled) {
          setBackendWorkspace(next);
        }
      } catch (error) {
        if (!cancelled) {
          setBackendError(error instanceof Error ? error.message : 'Unable to load settlement workflow.');
          setBackendWorkspace(null);
        }
      } finally {
        if (!cancelled) {
          setBackendLoading(false);
        }
      }
    };
    void loadBackendWorkspace();
    return () => {
      cancelled = true;
    };
  }, [selectedLc?.bookingId]);

  const kpis = {
    pendingLc: workspace.lettersOfCredit.filter((item) => item.status === 'pending').length,
    verifiedLc: workspace.lettersOfCredit.filter((item) => item.status === 'verified').length,
    paidLc: workspace.lettersOfCredit.filter((item) => item.status === 'paid').length,
    outstandingSettlement: workspace.settlements.filter((item) => item.status === 'outstanding').length,
    releasePending: workspace.financeReleaseControls.filter((item) => !item.cargoReleaseAuthorizedAt).length,
  };
  const canVerifyLc = canOperateShippingAction(sessionRole, 'letter_of_credit_verify');
  const canPayLc = canOperateShippingAction(sessionRole, 'letter_of_credit_pay');
  const lcDocsApproved = Boolean(selectedLc?.documentChecks.every((item) => item.status === 'approved'));
  const lcPaid = selectedLc?.status === 'paid';
  const settlementBalancesOutstanding = Boolean(
    selectedSettlement && (selectedSettlement.balanceUSD > 0 || selectedSettlement.balanceETB > 0 || selectedSettlement.status !== 'closed'),
  );
  const verifyLcIsNext = Boolean(lcDocsApproved && selectedLc?.status === 'pending' && canVerifyLc);
  const markLcPaidIsNext = Boolean(selectedLc?.status === 'verified' && canPayLc);
  const recordUsdIsNext = Boolean(lcPaid && selectedSettlement && selectedSettlement.balanceUSD > 0);
  const recordEtbIsNext = Boolean(lcPaid && selectedSettlement && selectedSettlement.balanceUSD <= 0 && selectedSettlement.balanceETB > 0);
  const releaseAuthorized = isComplete(selectedRelease?.cargoReleaseAuthorizedAt);
  const releaseSent = isComplete(selectedRelease?.releaseSentToDryPortAt);
  const releaseFlowReady = Boolean(
    selectedLc?.status === 'paid' &&
    selectedSettlement?.status === 'closed' &&
    selectedRelease,
  );
  const releaseNextActionKey =
    !releaseFlowReady || !selectedRelease ? '' :
    !selectedRelease.bankBillReceivedAt ? 'receive_bank_bill' :
    !selectedRelease.customerBankSlipReceivedAt ? 'receive_bank_slip' :
    !selectedRelease.cFeeInvoiceIssuedAt || !selectedRelease.portClearanceInvoiceIssuedAt || !selectedRelease.transportInvoiceIssuedAt ? 'issue_local_invoices' :
    !selectedRelease.customerReceiptsReceivedAt ? 'receive_customer_receipts' :
    !selectedRelease.tikurFinanceReceiptIssuedAt ? 'issue_tikur_receipt' :
    !selectedRelease.cargoReleaseAuthorizedAt ? 'authorize_cargo_release' :
    !selectedRelease.releaseSentToDryPortAt ? 'send_release_to_dry_port' :
    !selectedRelease.customsDocumentsHandedOverAt ? 'hand_over_customs_docs' :
    !selectedRelease.fullContainerInterchangeIssuedAt ? 'hand_over_full_in' :
    !selectedRelease.emptyReturnInterchangeReceivedAt ? 'record_empty_in' :
    '';
  const releaseControlIsNext = Boolean(
    releaseFlowReady && Boolean(releaseNextActionKey),
  );
  const releaseNextActionTitle =
    releaseNextActionKey === 'receive_bank_bill' ? 'Step 15: Receive bank bill' :
    releaseNextActionKey === 'receive_bank_slip' ? 'Step 15: Receive customer bank slip / payment proof' :
    releaseNextActionKey === 'issue_local_invoices' ? 'Step 16: Issue local finance invoices' :
    releaseNextActionKey === 'receive_customer_receipts' ? 'Step 16: Verify customer receipts' :
    releaseNextActionKey === 'issue_tikur_receipt' ? 'Step 17: Issue official Tikur receipt' :
    releaseNextActionKey === 'authorize_cargo_release' ? 'Step 18: Approve financial clearance and authorize cargo release' :
    releaseNextActionKey === 'send_release_to_dry_port' ? 'Step 19: Send release authorization to dry port' :
    releaseNextActionKey === 'hand_over_customs_docs' ? 'Step 19: Hand over customs documents' :
    releaseNextActionKey === 'hand_over_full_in' ? 'Step 19: Hand over FULL IN release packet' :
    releaseNextActionKey === 'record_empty_in' ? 'Step 20: Record EMPTY IN at Djibouti' :
    releaseFlowReady ? 'Finance and release packet complete' :
    'Complete LC payment and settlement first';
  const releaseNextActionHelper =
    releaseNextActionKey === 'receive_bank_bill' ? 'Start the release packet by recording the Ethiopian bank bill.' :
    releaseNextActionKey === 'receive_bank_slip' ? 'Customer payment proof is the next required checkpoint. Record the customer bank slip now.' :
    releaseNextActionKey === 'issue_local_invoices' ? 'Generate the local sea freight, port clearance, and transport invoices before receipt closure.' :
    releaseNextActionKey === 'receive_customer_receipts' ? 'Customer has paid. Record the customer receipts so finance can close the file.' :
    releaseNextActionKey === 'issue_tikur_receipt' ? 'Issue the official Tikur Abay receipt after customer receipts are confirmed.' :
    releaseNextActionKey === 'authorize_cargo_release' ? 'All finance proof is in place. Approve cargo release now.' :
    releaseNextActionKey === 'send_release_to_dry_port' ? 'Release is authorized. Send the release packet to the dry-port side.' :
    releaseNextActionKey === 'hand_over_customs_docs' ? 'Transfer the customs document set with the approved release packet.' :
    releaseNextActionKey === 'hand_over_full_in' ? 'Hand over the FULL IN / interchange side of the release packet.' :
    releaseNextActionKey === 'record_empty_in' ? 'Finalize the Djibouti-side closure by recording EMPTY IN.' :
    releaseFlowReady ? 'Every finance and release checkpoint is already completed for this booking.' :
    'The release packet remains blocked until LC is paid and settlement is closed.';
  const verifyLcDisabledReason = !selectedLc
    ? 'Choose a booking from the finance queue first.'
    : !canVerifyLc
      ? `LC verification belongs to ${shippingActionOwner('letter_of_credit_verify')}.`
      : !lcDocsApproved
        ? 'Approve every bank-packet document first.'
        : selectedLc.status !== 'pending'
          ? `LC is already ${selectedLc.status}.`
          : '';
  const payLcDisabledReason = !selectedLc
    ? 'Choose a booking from the finance queue first.'
    : !canPayLc
      ? `LC payment closure belongs to ${shippingActionOwner('letter_of_credit_pay')}.`
      : lcPaid
        ? 'LC is already marked paid.'
        : selectedLc.status !== 'verified'
        ? 'Verify the LC packet first.'
        : '';
  const reloadWorkspace = () => setWorkspace(readShippingPhase1Workspace());
  const stampRelease = (
    patch: Partial<ShippingFinanceReleaseRecord>,
    options?: { requirePaid?: boolean; requireAuthorized?: boolean },
  ) => {
    if (!selectedLc || !selectedRelease) return;
    if (options?.requirePaid && (selectedLc.status !== 'paid' || selectedSettlement?.status !== 'closed')) return;
    if (options?.requireAuthorized && !selectedRelease.cargoReleaseAuthorizedAt) return;
    updateShippingFinanceReleaseControl(selectedLc.bookingId, patch);
    reloadWorkspace();
  };
  const applyLocalLcPaidState = (bookingId: string) => {
    setWorkspace((current) => ({
      ...current,
      lettersOfCredit: current.lettersOfCredit.map((record) => (
        record.bookingId === bookingId
          ? {
              ...record,
              status: 'paid',
              verificationNote: 'Trade finance packet is verified and marked paid. Record the settlement payments to close the finance file.',
            }
          : record
      )),
    }));
  };
  const refreshBackendWorkspace = async () => {
    if (!selectedLc?.bookingId) return;
    const next = await apiGet<Record<string, any>>(`/import-settlement/shipments/${encodeURIComponent(selectedLc.bookingId)}/workspace`);
    setBackendWorkspace(next);
  };
  const issueStandardInvoice = async () => {
    if (!selectedLc?.bookingId || !backendWorkspace?.shipment) return;
    const invoiceNo = `TAB-INV-${new Date().getUTCFullYear()}-${selectedLc.bookingId.replace(/[^A-Z0-9]/gi, '').slice(-6)}`;
    const lines = [
      { chargeType: 'c_fee_rate', amount: 4200, currency: 'USD', taxAmount: 0, description: 'Sea freight invoice' },
      { chargeType: 'port_clearance_fee', amount: 1850, currency: 'USD', taxAmount: 0, description: 'Port clearance invoice' },
      { chargeType: 'transport_fee', amount: 3900, currency: 'USD', taxAmount: 0, description: 'Inland transport invoice' },
      { chargeType: 'customs_handling_fee', amount: 650, currency: 'USD', taxAmount: 0, description: 'Customs handling fee' },
    ];
    const subtotal = lines.reduce((sum, line) => sum + Number(line.amount || 0), 0);
    const pdf = await registerShipmentPdf({
      shipmentId: backendWorkspace.shipment.shipmentId,
      title: `${invoiceNo} customer charge invoice`,
      documentType: 'charge_invoice',
      referenceNo: invoiceNo,
      fileName: `${selectedLc.bookingId.toLowerCase()}-charge-invoice.pdf`,
      fileContentBase64: await buildChargeInvoicePdfBase64({
        fileName: `${selectedLc.bookingId.toLowerCase()}-charge-invoice.pdf`,
        invoiceNo,
        shipmentReference: backendWorkspace.shipment.bookingNumber || selectedLc.bookingId,
        customerName: backendWorkspace.shipment.customerName || selectedLc.customerName,
        lcReference: backendWorkspace.shipment.lcReference || selectedLc.lcNumber,
        invoiceType: 'final_invoice',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        currency: 'USD',
        subtotal,
        tax: 0,
        total: subtotal,
        createdBy: readSession()?.name || 'Finance desk',
        notes: 'Includes sea freight, port clearance, inland transport, and customs handling.',
        lines,
      }),
    });
    await apiPost(`/import-settlement/shipments/${selectedLc.bookingId}/invoices`, {
      invoiceNo,
      invoiceType: 'final_invoice',
      currency: 'USD',
      approveNow: true,
      pdfDocumentId: pdf.id,
      lines,
    });
    await refreshBackendWorkspace();
  };
  const verifyNextReceipt = async () => {
    const target = backendWorkspace?.paymentReceipts?.find((item: Record<string, any>) => item.verificationStatus === 'pending_verification');
    if (!target) return;
    await apiPatch(`/import-settlement/payment-receipts/${target._id}/verify`, {
      verificationStatus: Number(target.amount || 0) < Number(backendWorkspace?.shipment?.balanceDue || 0) ? 'partially_verified' : 'verified',
      amountVerified: Number(target.amount || 0),
      financeNote: 'Finance verified the submitted bank payment receipt.',
    });
    await refreshBackendWorkspace();
  };
  const issueOfficialReceipt = async () => {
    if (!selectedLc?.bookingId || !backendWorkspace?.shipment) return;
    const verifiedReceipts = (backendWorkspace.paymentReceipts || []).filter((item: Record<string, any>) => ['verified', 'partially_verified'].includes(String(item.verificationStatus)));
    if (!verifiedReceipts.length) return;
    const officialReceiptNo = `TAB-RCPT-${new Date().getUTCFullYear()}-${selectedLc.bookingId.replace(/[^A-Z0-9]/gi, '').slice(-6)}`;
    const amountReceived = verifiedReceipts.reduce((sum: number, item: Record<string, any>) => sum + Number(item.matchedAmount || item.amount || 0), 0);
    const pdf = await registerShipmentPdf({
      shipmentId: backendWorkspace.shipment.shipmentId,
      title: `${officialReceiptNo} official receipt`,
      documentType: 'official_receipt',
      referenceNo: officialReceiptNo,
      fileName: `${selectedLc.bookingId.toLowerCase()}-official-receipt.pdf`,
      fileContentBase64: await buildOfficialReceiptPdfBase64({
        fileName: `${selectedLc.bookingId.toLowerCase()}-official-receipt.pdf`,
        officialReceiptNo,
        shipmentReference: backendWorkspace.shipment.bookingNumber || selectedLc.bookingId,
        customerName: backendWorkspace.shipment.customerName || selectedLc.customerName,
        issuedAt: new Date().toISOString(),
        issuedBy: readSession()?.name || 'Finance desk',
        paymentMethod: 'bank_transfer',
        amountReceived,
        currency: 'USD',
        invoiceReferences: (backendWorkspace.invoices || []).map((item: Record<string, any>) => String(item.invoiceNo || item._id)),
        paymentReferences: verifiedReceipts.map((item: Record<string, any>) => String(item.transactionRef || item._id)),
      }),
    });
    await apiPost(`/import-settlement/shipments/${selectedLc.bookingId}/official-receipts`, {
      officialReceiptNo,
      linkedInvoiceIds: (backendWorkspace.invoices || []).map((item: Record<string, any>) => String(item._id)),
      linkedPaymentReceiptIds: verifiedReceipts.map((item: Record<string, any>) => String(item._id)),
      paymentMethod: 'bank_transfer',
      pdfDocumentId: pdf.id,
    });
    await refreshBackendWorkspace();
  };
  const createReleaseAuthorization = async (releaseMode: 'release_to_dry_port_agent' | 'release_to_customer') => {
    if (!selectedLc?.bookingId || !backendWorkspace?.shipment) return;
    const releaseAuthorizationId = `REL-${selectedLc.bookingId.replace(/[^A-Z0-9]/gi, '').slice(-8)}`;
    const releaseDoc = await registerShipmentPdf({
      shipmentId: backendWorkspace.shipment.shipmentId,
      title: `${releaseAuthorizationId} release authorization`,
      documentType: 'release_authorization',
      referenceNo: releaseAuthorizationId,
      fileName: `${selectedLc.bookingId.toLowerCase()}-release-authorization.pdf`,
      fileContentBase64: await buildReleaseAuthorizationPdfBase64({
        fileName: `${selectedLc.bookingId.toLowerCase()}-release-authorization.pdf`,
        releaseAuthorizationId,
        shipmentReference: backendWorkspace.shipment.bookingNumber || selectedLc.bookingId,
        customerName: backendWorkspace.shipment.customerName || selectedLc.customerName,
        releaseMode,
        recipientName: releaseMode === 'release_to_dry_port_agent' ? 'Adama Dry Port agent' : backendWorkspace.shipment.customerName || selectedLc.customerName,
        issuedAt: new Date().toISOString(),
        issuedBy: readSession()?.name || 'Finance desk',
        financeStatus: backendWorkspace.shipment.financeStatus || 'finance_cleared',
        note: releaseMode === 'release_to_dry_port_agent'
          ? 'Release authorization sent to the dry-port desk after finance clearance.'
          : 'Direct customer release approved after finance clearance.',
        documents: [
          'Official Tikur Abay receipt',
          'Bank document copy',
          'Customs document pack',
          'Release note / cargo release authorization',
        ],
      }),
    });
    const handoverDoc = await registerShipmentPdf({
      shipmentId: backendWorkspace.shipment.shipmentId,
      title: `${selectedLc.bookingId} document handover sheet`,
      documentType: 'document_handover_sheet',
      referenceNo: `${selectedLc.bookingId}-handover`,
      fileName: `${selectedLc.bookingId.toLowerCase()}-document-handover-sheet.pdf`,
      fileContentBase64: await buildDocumentHandoverSheetPdfBase64({
        fileName: `${selectedLc.bookingId.toLowerCase()}-document-handover-sheet.pdf`,
        shipmentReference: backendWorkspace.shipment.bookingNumber || selectedLc.bookingId,
        customerName: backendWorkspace.shipment.customerName || selectedLc.customerName,
        issuedAt: new Date().toISOString(),
        issuedBy: readSession()?.name || 'Finance desk',
        handoverTo: releaseMode === 'release_to_dry_port_agent' ? 'Adama Dry Port release desk' : backendWorkspace.shipment.customerName || selectedLc.customerName,
        purpose: 'Customer customs handover, release pack control, and cargo release execution.',
        documentRows: [
          { name: 'Bank / LC document copy', reference: backendWorkspace.bankDocuments?.[0]?.referenceNo || selectedLc.lcNumber, status: 'attached' },
          { name: 'Charge invoice', reference: backendWorkspace.invoices?.[0]?.invoiceNo || 'pending', status: backendWorkspace.invoices?.length ? 'attached' : 'pending' },
          { name: 'Official Tikur Abay receipt', reference: backendWorkspace.officialReceipts?.[0]?.officialReceiptNo || 'pending', status: backendWorkspace.officialReceipts?.length ? 'attached' : 'pending' },
          { name: 'Release authorization', reference: releaseAuthorizationId, status: 'attached' },
        ],
      }),
    });
    await apiPost(`/import-settlement/shipments/${selectedLc.bookingId}/release-authorizations`, {
      releaseAuthorizationId,
      releaseMode,
      recipientDetails: releaseMode === 'release_to_dry_port_agent'
        ? { desk: 'Dry Port Agent', branch: 'Adama Dry Port' }
        : { customer: backendWorkspace.shipment.customerName },
      note: releaseMode === 'release_to_dry_port_agent'
        ? 'Release authorization sent to the dry-port desk after finance clearance.'
        : 'Direct customer release approved after finance clearance.',
      documentIds: [releaseDoc.id, handoverDoc.id],
      pdfDocumentId: releaseDoc.id,
    });
    await refreshBackendWorkspace();
  };
  const reviewDriverClaim = async (claim: Record<string, any>) => {
    await apiPatch(`/import-settlement/driver-expense-claims/${claim._id}/review`, {
      status: 'approved',
      financeNote: 'Finance reviewed and approved the submitted driver expense claim.',
      items: (claim.items || []).map((item: Record<string, any>) => ({
        itemId: item._id,
        status: 'approved',
        approvedAmount: Number(item.amount || 0),
        financeNote: 'Approved in full',
      })),
    });
    await refreshBackendWorkspace();
  };
  const reimburseDriverClaim = async (claim: Record<string, any>) => {
    if (!backendWorkspace?.shipment) return;
    const pdf = await registerShipmentPdf({
      shipmentId: backendWorkspace.shipment.shipmentId,
      title: `${claim.tripId || claim._id} driver reimbursement statement`,
      documentType: 'driver_reimbursement_statement',
      referenceNo: claim.tripId || String(claim._id),
      fileName: `${selectedLc?.bookingId.toLowerCase()}-driver-reimbursement.pdf`,
      fileContentBase64: await buildDriverReimbursementStatementPdfBase64({
        fileName: `${selectedLc?.bookingId.toLowerCase()}-driver-reimbursement.pdf`,
        shipmentReference: backendWorkspace.shipment.bookingNumber || selectedLc?.bookingId || '',
        tripId: claim.tripId,
        driverName: claim.driverName || 'Assigned driver',
        claimReference: String(claim._id),
        paidAt: new Date().toISOString(),
        paidBy: readSession()?.name || 'Finance desk',
        method: 'bank_transfer',
        referenceNo: `DRV-RMB-${String(claim._id).slice(-6)}`,
        amountPaid: Number(claim.totalApproved || 0),
        currency: 'ETB',
        items: (claim.items || []).map((item: Record<string, any>) => ({
          category: item.category,
          location: item.location,
          amount: Number(item.amount || 0),
          approvedAmount: Number(item.approvedAmount || 0),
          note: item.financeNote || item.notes,
        })),
      }),
      visibilityScope: 'driver_visible',
    });
    await apiPost(`/import-settlement/driver-expense-claims/${claim._id}/reimburse`, {
      amountPaid: Number(claim.totalApproved || 0),
      paidAt: new Date().toISOString(),
      method: 'bank_transfer',
      referenceNo: `DRV-RMB-${String(claim._id).slice(-6)}`,
      status: 'reimbursed',
      pdfDocumentId: pdf.id,
    });
    await refreshBackendWorkspace();
  };

  return (
    <main className="shell">
      <section className="supplier-desk-shell">
        <header className="supplier-desk-header">
          <div className="supplier-desk-title">
            <span className="supplier-desk-eyebrow">Shipping Phase 4</span>
            <h1>Trade Finance and LC Control</h1>
            <p>Operate LC verification, bank-document control, payments, and settlement closure from one shipping finance desk.</p>
          </div>
          <div className="supplier-desk-toolbar">
            <input className="supplier-desk-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search booking, customer, LC, bank" />
          </div>
        </header>

        <nav className="supplier-jump-links">
          <Link className="supplier-jump-link" href="/shipping/carrier-schedules">Carrier Schedules</Link>
          <Link className="supplier-jump-link" href="/shipping/after-sales">After-Sales</Link>
          <Link className="supplier-jump-link is-active" href="/shipping/finance">Finance</Link>
          <Link className="supplier-jump-link" href="/shipping/instructions">Shipping Instructions</Link>
          <Link className="supplier-jump-link" href="/shipping/bills-of-lading">Bills of Lading</Link>
          <Link className="supplier-jump-link" href="/shipping/manifest">Manifest</Link>
          <Link className="supplier-jump-link" href="/shipping/tracking">Tracking</Link>
          <Link className="supplier-jump-link" href="/shipping">Full workspace</Link>
        </nav>

        <section className="supplier-summary-grid">
          <article className="supplier-summary-card"><span>LC pending</span><strong>{kpis.pendingLc}</strong><p>Trade-document packets still blocked before bank verification.</p></article>
          <article className="supplier-summary-card"><span>LC verified</span><strong>{kpis.verifiedLc}</strong><p>Bank-approved packets waiting on payment closure.</p></article>
          <article className="supplier-summary-card"><span>LC paid</span><strong>{kpis.paidLc}</strong><p>Trade-finance packets already settled and closed.</p></article>
          <article className="supplier-summary-card"><span>Settlement outstanding</span><strong>{kpis.outstandingSettlement}</strong><p>Bookings still carrying open invoice balance.</p></article>
          <article className="supplier-summary-card"><span>Release blocked</span><strong>{kpis.releasePending}</strong><p>Finance release packets still waiting before cargo handoff.</p></article>
        </section>

        <section className="shipping-phase4-layout">
          <article className="supplier-panel">
            <header className="supplier-panel-header">
              <div>
                <span className="supplier-panel-eyebrow">Finance queue</span>
                <h2>LC and settlement files</h2>
              </div>
              <p>{records.length} files</p>
            </header>
            <div className="supplier-queue-list shipping-phase2-queue">
              {records.map((record) => (
                <button key={record.bookingId} type="button" className={record.bookingId === selectedLc?.bookingId ? 'supplier-queue-row active' : 'supplier-queue-row'} onClick={() => setSelectedBookingId(record.bookingId)}>
                  <div className="supplier-queue-topline">
                    <strong>{record.bookingId}</strong>
                    <span className={`status-badge ${record.status === 'paid' ? 'good' : record.status === 'verified' ? 'info' : 'warning'}`}>{record.status}</span>
                  </div>
                  <span>{record.customerName}</span>
                  <span>{record.lcNumber} · {record.bankName}</span>
                </button>
              ))}
            </div>
          </article>

          <div className="shipping-phase4-main">
            <article className={`supplier-panel ${activeStepPanelClass(verifyLcIsNext || markLcPaidIsNext)}`}>
              <header className="supplier-panel-header">
                <div>
                  <span className="supplier-panel-eyebrow">Letter of credit</span>
                  <h2>{selectedLc?.lcNumber || 'LC packet'}</h2>
                </div>
                <p>{selectedLc?.status || 'Pending'}</p>
              </header>
              {selectedLc ? (
                <>
                  <div className="shipping-phase-detail-list">
                    <div className="shipping-phase-detail-row"><span>Booking</span><strong>{selectedLc.bookingId}</strong></div>
                    <div className="shipping-phase-detail-row"><span>Quote</span><strong>{selectedLc.quoteId}</strong></div>
                    <div className="shipping-phase-detail-row"><span>Customer</span><strong>{selectedLc.customerName}</strong></div>
                    <div className="shipping-phase-detail-row"><span>Bank</span><strong>{selectedLc.bankName}</strong></div>
                    <div className="shipping-phase-detail-row"><span>Issued</span><strong>{formatDate(selectedLc.issuingDate)}</strong></div>
                    <div className="shipping-phase-detail-row"><span>Expiry</span><strong>{formatDate(selectedLc.expiryDate)}</strong></div>
                    <div className="shipping-phase-detail-row"><span>Currency</span><strong>{selectedLc.currency}</strong></div>
                    <div className="shipping-phase-detail-row"><span>LC amount</span><strong>{formatMoney(selectedLc.amount, selectedLc.currency)}</strong></div>
                  </div>
                  <div className="shipping-phase-note">
                    <span>Verification note</span>
                    <p>{selectedLc.verificationNote}</p>
                  </div>
                  {!canVerifyLc || !canPayLc ? (
                    <div className="shipping-phase-note is-blocked">
                      <span>Desk ownership</span>
                      <p>LC verification and payment closure belong to {shippingActionOwner('letter_of_credit_verify')}.</p>
                    </div>
                  ) : null}
                  <div className="supplier-inline-actions">
                    <button type="button" className={`supplier-desk-button supplier-desk-button-secondary ${nextStepClass(verifyLcIsNext)}`} disabled={!lcDocsApproved || selectedLc.status !== 'pending' || !canVerifyLc} onClick={() => verifyShippingLetterOfCredit(selectedLc.bookingId)}>
                      {shippingCtaLabel('verify_lc')}
                    </button>
                    <button
                      type="button"
                      className={`supplier-desk-button supplier-desk-button-primary ${nextStepClass(markLcPaidIsNext)}`}
                      disabled={selectedLc.status !== 'verified' || !canPayLc}
                      onClick={() => {
                        markShippingLetterOfCreditPaid(selectedLc.bookingId);
                        applyLocalLcPaidState(selectedLc.bookingId);
                        reloadWorkspace();
                        window.setTimeout(reloadWorkspace, 80);
                      }}
                    >
                      {lcPaid ? 'LC Paid' : shippingCtaLabel('mark_lc_paid')}
                    </button>
                  </div>
                  {lcPaid ? (
                    <div className="shipping-phase-note console-gap-top-md">
                      <span>Finance closed</span>
                      <p>{settlementBalancesOutstanding ? 'LC is marked paid. Settlement sync is still refreshing in this view.' : 'LC is paid and the local finance closure has been recorded for this booking.'}</p>
                    </div>
                  ) : null}
                  {verifyLcDisabledReason ? (
                    <div className="shipping-phase-note is-blocked console-gap-top-md">
                      <span>Verify LC gate</span>
                      <p>{verifyLcDisabledReason}</p>
                    </div>
                  ) : null}
                  {payLcDisabledReason ? (
                    <div className="shipping-phase-note is-blocked console-gap-top-md">
                      <span>Mark LC paid gate</span>
                      <p>{payLcDisabledReason}</p>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="supplier-check-item is-pending"><strong>No finance file yet</strong><p>LC control activates once the booking exists.</p></div>
              )}
            </article>

            <article className={`supplier-panel ${activeStepPanelClass(!lcDocsApproved && canVerifyLc)}`}>
              <header className="supplier-panel-header">
                <div>
                  <span className="supplier-panel-eyebrow">Bank packet</span>
                  <h2>Trade-document verification</h2>
                </div>
                <p>{selectedLc?.documentChecks.filter((item) => item.status === 'approved').length || 0}/{selectedLc?.documentChecks.length || 0}</p>
              </header>
              <div className="supplier-readiness-list">
                {selectedLc?.documentChecks.map((item) => (
                  <div key={item.key} className={`${item.status === 'approved' ? 'supplier-check-item is-complete' : item.status === 'invalid' ? 'supplier-check-item is-blocked' : 'supplier-check-item is-pending'} ${!lcDocsApproved && item.status !== 'approved' && canVerifyLc ? 'supplier-next-step-field' : ''}`}>
                    <span>{item.label}</span>
                    <strong>{item.status}</strong>
                    <select className="supplier-desk-select" disabled={!canVerifyLc} value={item.status} onChange={(event) => updateShippingLetterOfCreditDocument(selectedLc.bookingId, item.key as ShippingTradeDocumentKey, event.target.value as ShippingDocumentStatus, item.reason)}>
                      {lcDocumentStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                    <p>{item.reason}</p>
                  </div>
                )) || <div className="supplier-check-item is-pending"><strong>No bank packet</strong><p>Choose a booking from the finance queue to review the trade documents.</p></div>}
              </div>
            </article>
          </div>

          <aside className="shipping-phase4-side">
            <article className={`supplier-panel ${activeStepPanelClass(recordUsdIsNext || recordEtbIsNext)}`}>
              <header className="supplier-panel-header">
                <div>
                  <span className="supplier-panel-eyebrow">Invoice</span>
                  <h2>Charge breakdown</h2>
                </div>
              </header>
              {selectedInvoice ? (
                <>
                  <div className="supplier-detail-summary">
                    <div className="supplier-detail-item"><span>Invoice</span><strong>{selectedInvoice.invoiceId}</strong></div>
                    <div className="supplier-detail-item"><span>Payment</span><strong>{selectedInvoice.paymentStatus}</strong></div>
                    <div className="supplier-detail-item"><span>Settlement</span><strong>{selectedInvoice.settlementStatus}</strong></div>
                  </div>
                  <div className="supplier-checklist">
                    {selectedInvoice.charges.map((charge) => (
                      <div key={charge.name} className="supplier-check-item is-pending">
                        <strong>{charge.name}</strong>
                        <span>{formatMoney(charge.amount, charge.currency)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="supplier-inline-actions">
                    <button
                      type="button"
                      className={`supplier-desk-button supplier-desk-button-secondary ${nextStepClass(recordUsdIsNext)}`}
                      disabled={!canPayLc || !lcPaid || !selectedSettlement || selectedSettlement.balanceUSD <= 0}
                      onClick={() => recordShippingPayment(selectedInvoice.invoiceId, selectedInvoice.bookingId, selectedInvoice.customerName, 'USD', Math.round(selectedSettlement?.balanceUSD || selectedInvoice.totalUSD))}
                    >
                      {shippingCtaLabel('record_usd_payment')}
                    </button>
                    <button
                      type="button"
                      className={`supplier-desk-button supplier-desk-button-primary ${nextStepClass(recordEtbIsNext)}`}
                      disabled={!canPayLc || !lcPaid || !selectedSettlement || selectedSettlement.balanceUSD > 0 || selectedSettlement.balanceETB <= 0}
                      onClick={() => recordShippingPayment(selectedInvoice.invoiceId, selectedInvoice.bookingId, selectedInvoice.customerName, 'ETB', selectedSettlement?.balanceETB || selectedInvoice.totalETB)}
                    >
                      {shippingCtaLabel('record_etb_payment')}
                    </button>
                  </div>
                </>
              ) : (
                <div className="supplier-check-item is-pending"><strong>No invoice</strong><p>Invoice records start once the booking exists.</p></div>
              )}
            </article>

            <article className="supplier-panel">
              <header className="supplier-panel-header">
                <div>
                  <span className="supplier-panel-eyebrow">Settlement</span>
                  <h2>Balance and payment log</h2>
                </div>
              </header>
              {selectedSettlement ? (
                <>
                  <div className="supplier-detail-summary">
                    <div className="supplier-detail-item"><span>Balance USD</span><strong>{formatMoney(selectedSettlement.balanceUSD, 'USD')}</strong></div>
                    <div className="supplier-detail-item"><span>Balance ETB</span><strong>{formatMoney(selectedSettlement.balanceETB, 'ETB')}</strong></div>
                    <div className="supplier-detail-item"><span>Status</span><strong>{selectedSettlement.status}</strong></div>
                  </div>
                  <div className="shipping-monitor-alerts">
                    {selectedPayments.length ? selectedPayments.slice(0, 6).map((payment) => (
                      <div key={payment.paymentId} className="shipping-monitor-alert is-info">
                        <strong>{formatMoney(payment.amount, payment.currency)}</strong>
                        <span>{payment.paymentId}</span>
                        <span>{formatDate(payment.recordedAt)} · {payment.status}</span>
                      </div>
                    )) : (
                      <div className="shipping-monitor-alert is-warning">
                        <strong>No payments recorded</strong>
                        <span>Settlement remains open until USD and ETB charges are paid.</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="supplier-check-item is-pending"><strong>No settlement state</strong><p>Select a finance file to inspect balances and payment history.</p></div>
              )}
            </article>

            <article className={`supplier-panel ${activeStepPanelClass(releaseControlIsNext)}`}>
              <header className="supplier-panel-header">
                <div>
                  <span className="supplier-panel-eyebrow">Cargo release packet</span>
                  <h2>Bank bill, receipts, and dry-port release</h2>
                </div>
                <p>{releaseAuthorized ? 'Authorized' : 'Blocked'}</p>
              </header>
              {selectedRelease ? (
                <>
                  <div className={`shipping-phase-note console-gap-bottom-md ${releaseControlIsNext ? 'supplier-next-step-button' : ''}`}>
                    <span>Next step</span>
                    <p><strong>{releaseNextActionTitle}</strong></p>
                    <p>{releaseNextActionHelper}</p>
                  </div>
                  <div className="supplier-detail-summary">
                    <div className="supplier-detail-item"><span>Bank bill</span><strong>{formatState(selectedRelease.bankBillReceivedAt)}</strong></div>
                    <div className="supplier-detail-item"><span>Customer receipts</span><strong>{formatState(selectedRelease.customerReceiptsReceivedAt)}</strong></div>
                    <div className="supplier-detail-item"><span>Dry-port release</span><strong>{formatState(selectedRelease.releaseSentToDryPortAt)}</strong></div>
                  </div>
                  <div className="supplier-checklist">
                    <div className={isComplete(selectedRelease.bankBillReceivedAt) ? 'supplier-check-item is-complete' : 'supplier-check-item is-pending'}>
                      <strong>Ethiopian bank bill</strong>
                      <span>{selectedRelease.bankBillReference || 'Pending reference'}</span>
                    </div>
                    <div className={isComplete(selectedRelease.customerBankSlipReceivedAt) ? 'supplier-check-item is-complete' : 'supplier-check-item is-pending'}>
                      <strong>Customer bank slip</strong>
                      <span>{selectedRelease.customerBankSlipReference || 'Pending reference'}</span>
                    </div>
                    <div className={isComplete(selectedRelease.cFeeInvoiceIssuedAt) ? 'supplier-check-item is-complete' : 'supplier-check-item is-pending'}>
                      <strong>Sea freight invoice</strong>
                      <span>{selectedRelease.cFeeInvoiceReference || 'Pending reference'}</span>
                    </div>
                    <div className={isComplete(selectedRelease.portClearanceInvoiceIssuedAt) ? 'supplier-check-item is-complete' : 'supplier-check-item is-pending'}>
                      <strong>Port clearance invoice</strong>
                      <span>{selectedRelease.portClearanceInvoiceReference || 'Pending reference'}</span>
                    </div>
                    <div className={isComplete(selectedRelease.transportInvoiceIssuedAt) ? 'supplier-check-item is-complete' : 'supplier-check-item is-pending'}>
                      <strong>Transport invoice</strong>
                      <span>{selectedRelease.transportInvoiceReference || 'Pending reference'}</span>
                    </div>
                    <div className={isComplete(selectedRelease.tikurFinanceReceiptIssuedAt) ? 'supplier-check-item is-complete' : 'supplier-check-item is-pending'}>
                      <strong>Tikur Abay receipt</strong>
                      <span>{selectedRelease.tikurFinanceReceiptReference || 'Pending reference'}</span>
                    </div>
                  </div>
                  <div className="supplier-inline-actions">
                    <button type="button" className={`supplier-desk-button supplier-desk-button-secondary ${nextStepClass(releaseNextActionKey === 'receive_bank_bill')}`} disabled={!selectedLc || selectedLc.status !== 'paid' || Boolean(selectedRelease.bankBillReceivedAt)} onClick={() => stampRelease({ bankBillReceivedAt: new Date().toISOString() }, { requirePaid: true })}>Receive bank bill</button>
                    <button type="button" className={`supplier-desk-button supplier-desk-button-secondary ${nextStepClass(releaseNextActionKey === 'receive_bank_slip')}`} disabled={!selectedRelease.bankBillReceivedAt || Boolean(selectedRelease.customerBankSlipReceivedAt)} onClick={() => stampRelease({ customerBankSlipReceivedAt: new Date().toISOString() }, { requirePaid: true })}>Receive bank slip</button>
                    <button type="button" className={`supplier-desk-button supplier-desk-button-secondary ${nextStepClass(releaseNextActionKey === 'issue_local_invoices')}`} disabled={!selectedRelease.customerBankSlipReceivedAt || Boolean(selectedRelease.cFeeInvoiceIssuedAt)} onClick={() => stampRelease({ cFeeInvoiceIssuedAt: new Date().toISOString(), portClearanceInvoiceIssuedAt: new Date().toISOString(), transportInvoiceIssuedAt: new Date().toISOString() }, { requirePaid: true })}>Issue local invoices</button>
                    <button type="button" className={`supplier-desk-button supplier-desk-button-secondary ${nextStepClass(releaseNextActionKey === 'receive_customer_receipts')}`} disabled={!selectedRelease.transportInvoiceIssuedAt || Boolean(selectedRelease.customerReceiptsReceivedAt)} onClick={() => stampRelease({ customerReceiptsReceivedAt: new Date().toISOString() }, { requirePaid: true })}>Receive customer receipts</button>
                    <button type="button" className={`supplier-desk-button supplier-desk-button-secondary ${nextStepClass(releaseNextActionKey === 'issue_tikur_receipt')}`} disabled={!selectedRelease.customerReceiptsReceivedAt || Boolean(selectedRelease.tikurFinanceReceiptIssuedAt)} onClick={() => stampRelease({ tikurFinanceReceiptIssuedAt: new Date().toISOString() }, { requirePaid: true })}>Issue Tikur receipt</button>
                    <button type="button" className={`supplier-desk-button supplier-desk-button-primary ${nextStepClass(releaseNextActionKey === 'authorize_cargo_release')}`} disabled={!selectedRelease.tikurFinanceReceiptIssuedAt || releaseAuthorized} onClick={() => stampRelease({ cargoReleaseAuthorizedAt: new Date().toISOString() }, { requirePaid: true })}>Authorize cargo release</button>
                  </div>
                  <div className="supplier-inline-actions console-gap-top-md">
                    <button type="button" className={`supplier-desk-button supplier-desk-button-secondary ${nextStepClass(releaseNextActionKey === 'send_release_to_dry_port')}`} disabled={!releaseAuthorized || releaseSent} onClick={() => stampRelease({ releaseSentToDryPortAt: new Date().toISOString() }, { requireAuthorized: true })}>Send release to dry port</button>
                    <button type="button" className={`supplier-desk-button supplier-desk-button-secondary ${nextStepClass(releaseNextActionKey === 'hand_over_customs_docs')}`} disabled={!releaseAuthorized || Boolean(selectedRelease.customsDocumentsHandedOverAt)} onClick={() => stampRelease({ customsDocumentsHandedOverAt: new Date().toISOString() }, { requireAuthorized: true })}>Hand over customs docs</button>
                    <button type="button" className={`supplier-desk-button supplier-desk-button-secondary ${nextStepClass(releaseNextActionKey === 'hand_over_full_in')}`} disabled={!releaseAuthorized || Boolean(selectedRelease.fullContainerInterchangeIssuedAt)} onClick={() => stampRelease({ fullContainerInterchangeIssuedAt: new Date().toISOString() }, { requireAuthorized: true })}>Hand over FULL IN</button>
                    <button type="button" className={`supplier-desk-button supplier-desk-button-secondary ${nextStepClass(releaseNextActionKey === 'record_empty_in')}`} disabled={!selectedRelease.releaseSentToDryPortAt || Boolean(selectedRelease.emptyReturnInterchangeReceivedAt)} onClick={() => stampRelease({ emptyReturnInterchangeReceivedAt: new Date().toISOString() }, { requireAuthorized: true })}>Record EMPTY IN at Djibouti</button>
                  </div>
                  <div className={`${releaseAuthorized ? 'shipping-phase-note' : 'shipping-phase-note is-blocked'} console-gap-top-md`}>
                    <span>Release note</span>
                    <p>{selectedRelease.releaseNote}</p>
                  </div>
                </>
              ) : (
                <div className="supplier-check-item is-pending"><strong>No release packet</strong><p>Select a finance file to control the bank bill, invoice, receipt, and dry-port release chain.</p></div>
              )}
            </article>

            <article className="supplier-panel">
              <header className="supplier-panel-header">
                <div>
                  <span className="supplier-panel-eyebrow">Production workflow</span>
                  <h2>Backend settlement and release control</h2>
                </div>
                <p>{backendLoading ? 'Syncing' : backendWorkspace?.shipment?.releaseStatus || 'Offline'}</p>
              </header>
              {backendError ? (
                <div className="shipping-phase-note is-blocked">
                  <span>Backend workflow</span>
                  <p>{backendError}</p>
                </div>
              ) : null}
              {backendWorkspace ? (
                <>
                  <div className="supplier-detail-summary">
                    <div className="supplier-detail-item"><span>Total invoiced</span><strong>{formatMoney(Number(backendWorkspace.shipment?.totalInvoiced || 0), 'USD')}</strong></div>
                    <div className="supplier-detail-item"><span>Total paid</span><strong>{formatMoney(Number(backendWorkspace.shipment?.totalPaid || 0), 'USD')}</strong></div>
                    <div className="supplier-detail-item"><span>Balance due</span><strong>{formatMoney(Number(backendWorkspace.shipment?.balanceDue || 0), 'USD')}</strong></div>
                  </div>
                  <div className="supplier-checklist">
                    <div className={backendWorkspace.bankDocuments?.length ? 'supplier-check-item is-complete' : 'supplier-check-item is-pending'}>
                      <strong>Bank documents</strong>
                      <span>{backendWorkspace.bankDocuments?.length || 0} uploaded</span>
                    </div>
                    <div className={backendWorkspace.invoices?.length ? 'supplier-check-item is-complete' : 'supplier-check-item is-pending'}>
                      <strong>Invoices</strong>
                      <span>{backendWorkspace.invoices?.length || 0} issued</span>
                    </div>
                    <div className={backendWorkspace.paymentReceipts?.length ? 'supplier-check-item is-complete' : 'supplier-check-item is-pending'}>
                      <strong>Customer receipts</strong>
                      <span>{backendWorkspace.paymentReceipts?.length || 0} received</span>
                    </div>
                    <div className={backendWorkspace.officialReceipts?.length ? 'supplier-check-item is-complete' : 'supplier-check-item is-pending'}>
                      <strong>Official receipts</strong>
                      <span>{backendWorkspace.officialReceipts?.length || 0} issued</span>
                    </div>
                  </div>
                  <div className="supplier-inline-actions">
                    <button
                      type="button"
                      className="supplier-desk-button supplier-desk-button-secondary"
                      onClick={() => void issueStandardInvoice()}
                    >
                      Issue standard invoice
                    </button>
                    <button
                      type="button"
                      className="supplier-desk-button supplier-desk-button-secondary"
                      disabled={!backendWorkspace.paymentReceipts?.find((item: Record<string, any>) => item.verificationStatus === 'pending_verification')}
                      onClick={() => void verifyNextReceipt()}
                    >
                      Verify next receipt
                    </button>
                    <button
                      type="button"
                      className="supplier-desk-button supplier-desk-button-secondary"
                      disabled={!backendWorkspace.paymentReceipts?.some((item: Record<string, any>) => ['verified', 'partially_verified'].includes(String(item.verificationStatus)))}
                      onClick={() => void issueOfficialReceipt()}
                    >
                      Issue official receipt
                    </button>
                    <button
                      type="button"
                      className="supplier-desk-button supplier-desk-button-primary"
                      disabled={Boolean(backendWorkspace.financialClearance?.status === 'finance_cleared')}
                      onClick={async () => {
                        await apiPost(`/import-settlement/shipments/${selectedLc?.bookingId}/financial-clearance`, {
                          note: 'All invoices are covered by verified payments and the shipment is cleared for release.',
                        });
                        await refreshBackendWorkspace();
                      }}
                    >
                      Finance clearance
                    </button>
                  </div>
                  <div className="supplier-inline-actions console-gap-top-md">
                    <button
                      type="button"
                      className="supplier-desk-button supplier-desk-button-secondary"
                      disabled={Boolean(backendWorkspace.releaseAuthorization)}
                      onClick={() => void createReleaseAuthorization('release_to_dry_port_agent')}
                    >
                      Send to dry port
                    </button>
                    <button
                      type="button"
                      className="supplier-desk-button supplier-desk-button-secondary"
                      disabled={Boolean(backendWorkspace.releaseAuthorization)}
                      onClick={() => void createReleaseAuthorization('release_to_customer')}
                    >
                      Release to customer
                    </button>
                  </div>
                  <div className="supplier-checklist console-gap-top-lg">
                    {(backendWorkspace.driverExpenseClaims || []).length ? (backendWorkspace.driverExpenseClaims || []).map((claim: Record<string, any>) => (
                      <div key={String(claim._id)} className={String(claim.status).includes('reimbursed') ? 'supplier-check-item is-complete' : 'supplier-check-item is-pending'}>
                        <strong>{claim.driverName || 'Driver claim'} · {claim.tripId || claim._id}</strong>
                        <span>Claimed ETB {Number(claim.totalClaimed || 0).toLocaleString('en-US')} · Approved ETB {Number(claim.totalApproved || 0).toLocaleString('en-US')}</span>
                        <span>Status: {claim.status}</span>
                        <div className="supplier-inline-actions console-gap-top-sm">
                          <button type="button" className="supplier-desk-button supplier-desk-button-secondary" disabled={['approved', 'reimbursed', 'closed'].includes(String(claim.status))} onClick={() => void reviewDriverClaim(claim)}>Approve claim</button>
                          <button type="button" className="supplier-desk-button supplier-desk-button-primary" disabled={!['approved', 'closed'].includes(String(claim.status)) && String(claim.status) !== 'approved'} onClick={() => void reimburseDriverClaim(claim)}>Reimburse driver</button>
                        </div>
                      </div>
                    )) : (
                      <div className="supplier-check-item is-pending">
                        <strong>No driver reimbursement pending</strong>
                        <span>Driver out-of-pocket claims will appear here for review and payment.</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="supplier-check-item is-pending"><strong>No backend workflow</strong><p>Once the shipment exists in the import-settlement service, invoices, receipts, official receipts, and release controls will appear here.</p></div>
              )}
            </article>
          </aside>
        </section>
      </section>
    </main>
  );
}
