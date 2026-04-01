'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPatch, apiPost, hasPortalAuth } from '../lib/api';
import {
  readSharedQuote,
  readSharedQuoteRequests,
  sharedQuoteStorageUpdatedEvent,
  type SharedBookingRequest,
  upsertSharedQuote,
  writeSharedQuoteRequests,
} from '../lib/shared-quote-storage';

type BackendQuote = {
  _id?: string;
  quoteCode?: string;
  bookingId?: string;
  convertedToShipmentId?: string;
  customerName?: string;
  company?: string;
  consigneeName?: string;
  notifyPartyName?: string;
  secondNotifyParty?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  serviceType?: 'multimodal' | 'unimodal';
  shipmentMode?: 'Ocean Freight' | 'Air Freight' | 'Road' | 'Multimodal';
  bookingType?: 'FCL' | 'LCL' | 'RoRo' | 'Air Freight';
  serviceLevel?: 'Port to Port' | 'Door to Port' | 'Port to Door' | 'Door to Door';
  portOfLoading?: string;
  portOfDischarge?: string;
  placeOfReceipt?: string;
  inlandDestination?: string;
  deliveryAddress?: string;
  commoditySummary?: string;
  cargoDescription?: string;
  hsCode?: string;
  marksAndNumbers?: string;
  packageSummary?: string;
  freightPaymentTerm?: 'prepaid' | 'collect';
  prepaidAt?: string;
  collectAt?: string;
  lcNumber?: string;
  bankPermitNumber?: string;
  consigneeTinNumber?: string;
  tinAreaCode?: string;
  unNumber?: string;
  quotedAmount?: number;
  quoteAmount?: number;
  currency?: string;
  status?: string;
  approvedBy?: string;
  approvalMethod?: string;
  approvalNote?: string;
  acceptedAt?: string;
  requestedDate?: string;
  validUntil?: string;
  incoterm?: string;
  containerType?: string;
  containerQuantity?: number;
  vesselName?: string;
  voyageNumber?: string;
  etaLoadingPort?: string;
  shippingCertificateRequired?: boolean;
  totalWeight?: number;
  volumeCbm?: number;
  pricingBreakdown?: SharedBookingRequest['pricingBreakdown'];
};

function money(value: number | undefined, currency = 'USD') {
  return `${currency} ${(value || 0).toLocaleString('en-US')}`;
}

function formatDate(value?: string) {
  if (!value) return 'Pending';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function deriveBreakdown(quote: SharedBookingRequest) {
  if (quote.pricingBreakdown) {
    return {
      baseFreight: quote.pricingBreakdown.baseFreight,
      originCharges: quote.pricingBreakdown.originCharges,
      documentationFees: Math.round(quote.pricingBreakdown.handlingFees * 0.42),
      stuffingHandling: Math.round(quote.pricingBreakdown.handlingFees * 0.58),
      inlandTransport: quote.pricingBreakdown.inlandTransportEstimate,
      customsSupport: quote.pricingBreakdown.customsEstimate,
      insurance: quote.pricingBreakdown.insuranceEstimate,
      destinationCharges: quote.pricingBreakdown.destinationCharges,
      discount: quote.pricingBreakdown.discount,
      taxes: 0,
      total: quote.pricingBreakdown.total,
      currency: quote.pricingBreakdown.currency,
    };
  }
  const total = quote.quoteAmount || 0;
  return {
    baseFreight: Math.round(total * 0.44),
    originCharges: Math.round(total * 0.1),
    documentationFees: Math.round(total * 0.08),
    stuffingHandling: Math.round(total * 0.06),
    inlandTransport: Math.round(total * 0.14),
    customsSupport: Math.round(total * 0.08),
    insurance: Math.round(total * 0.04),
    destinationCharges: Math.round(total * 0.1),
    discount: Math.round(total * 0.04),
    taxes: 0,
    total,
    currency: quote.quoteCurrency || 'USD',
  };
}

function displayOrPending(value?: string | number | boolean | null) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value === null || value === undefined) return 'Pending';
  const text = String(value).trim();
  return text || 'Pending';
}

function mapBackendQuoteToSharedQuote(quote: BackendQuote): SharedBookingRequest {
  return {
    quoteId: String(quote.quoteCode || quote._id || ''),
    customerName: quote.customerName,
    company: quote.company,
    consigneeName: quote.consigneeName,
    notifyPartyName: quote.notifyPartyName,
    secondNotifyParty: quote.secondNotifyParty,
    contactPerson: quote.contactPerson,
    phone: quote.phone,
    email: quote.email,
    serviceType: quote.serviceType,
    shipmentMode: quote.shipmentMode,
    loadType: quote.bookingType,
    serviceLevel: quote.serviceLevel,
    portOfLoading: quote.portOfLoading,
    portOfDischarge: quote.portOfDischarge,
    placeOfReceipt: quote.placeOfReceipt,
    inlandDestination: quote.inlandDestination,
    finalDeliveryLocation: quote.deliveryAddress,
    commoditySummary: quote.commoditySummary,
    cargoDescription: quote.cargoDescription,
    hsCode: quote.hsCode,
    marksAndNumbers: quote.marksAndNumbers,
    packageSummary: quote.packageSummary,
    freightPaymentTerm: quote.freightPaymentTerm,
    prepaidAt: quote.prepaidAt,
    collectAt: quote.collectAt,
    lcNumber: quote.lcNumber,
    bankPermitNumber: quote.bankPermitNumber,
    consigneeTinNumber: quote.consigneeTinNumber,
    tinAreaCode: quote.tinAreaCode,
    unNumber: quote.unNumber,
    quoteAmount: Number(quote.quotedAmount || quote.quoteAmount || 0),
    quoteCurrency: quote.currency || 'USD',
    quoteStatus:
      String(quote.status || '').toLowerCase() === 'accepted'
        ? 'quote_accepted'
        : String(quote.status || '').toLowerCase() === 'rejected'
          ? 'quote_rejected'
          : String(quote.status || '').toLowerCase() === 'revision_requested'
            ? 'quote_revision_requested'
            : 'quote_sent',
    approvalStatus:
      String(quote.status || '').toLowerCase() === 'accepted'
        ? 'accepted'
        : String(quote.status || '').toLowerCase() === 'rejected'
          ? 'rejected'
          : String(quote.status || '').toLowerCase() === 'expired'
            ? 'expired'
            : 'waiting_approval',
    approvalMethod: quote.approvalMethod,
    approvalRecordedBy: quote.approvedBy,
    approvalRecordedAt: quote.acceptedAt,
    requestedLoadingDate: quote.requestedDate,
    requestedArrivalWindow: quote.validUntil,
    incoterm: quote.incoterm,
    containerType: quote.containerType,
    containerCount: quote.containerQuantity,
    vesselName: quote.vesselName,
    voyageNumber: quote.voyageNumber,
    etaLoadingPort: quote.etaLoadingPort,
    shippingCertificateRequired: quote.shippingCertificateRequired,
    totalWeight: quote.totalWeight,
    cbm: quote.volumeCbm,
    pricingBreakdown: quote.pricingBreakdown,
    remarks: quote.approvalNote,
  };
}

function statusLabel(quote: SharedBookingRequest) {
  if (quote.approvalStatus === 'accepted') return 'Accepted';
  if (quote.approvalStatus === 'rejected') return 'Rejected';
  if (quote.approvalStatus === 'expired') return 'Expired';
  if (quote.quoteStatus === 'quote_revision_requested') return 'Revision Requested';
  if (quote.approvalStatus === 'waiting_approval' || quote.quoteStatus === 'quote_sent') return 'Waiting for Your Approval';
  return 'Sent';
}

function deriveBookingIdFromQuote(quoteId?: string) {
  const safeQuoteId = String(quoteId || '');
  if (!safeQuoteId) return `BK-260326-${String(Date.now()).slice(-5)}`;
  return safeQuoteId.startsWith('QT-') ? `BK-${safeQuoteId.slice(3)}` : `BK-${safeQuoteId}`;
}

function deriveShipmentIdFromQuote(quoteId?: string) {
  const safeQuoteId = String(quoteId || '');
  if (!safeQuoteId) return `SHP-260326-${String(Date.now()).slice(-5)}`;
  return safeQuoteId.startsWith('QT-') ? `SHP-${safeQuoteId.slice(3)}` : `SHP-${safeQuoteId}`;
}

export function QuoteReviewWorkspace({
  quoteId,
  initialQuote = null,
  pdfMode = false,
}: {
  quoteId: string;
  initialQuote?: SharedBookingRequest | null;
  pdfMode?: boolean;
}) {
  const [quotes, setQuotes] = useState<SharedBookingRequest[]>(initialQuote ? [initialQuote] : []);
  const [action, setAction] = useState<'approve' | 'revision' | 'reject' | null>(null);
  const [approvedBy, setApprovedBy] = useState('');
  const [approvalNote, setApprovalNote] = useState('');
  const [revisionReason, setRevisionReason] = useState('shipment details incorrect');
  const [revisionComment, setRevisionComment] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [confirmDetails, setConfirmDetails] = useState(false);
  const [confirmProceed, setConfirmProceed] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'info'; text: string } | null>(null);
  const [quoteSource, setQuoteSource] = useState<'live' | 'local'>(initialQuote ? 'local' : 'live');

  useEffect(() => {
    const hydrate = async () => {
      const localQuotes = readSharedQuoteRequests();
      const cookieQuote = readSharedQuote(quoteId);
      const hasLocalQuote = Boolean(initialQuote || cookieQuote || localQuotes.some((item) => item.quoteId === quoteId));

      if (hasPortalAuth() && !hasLocalQuote) {
        try {
          const liveQuotes = await apiGet<BackendQuote[]>('/quotes/my');
          const liveQuote = liveQuotes.find((item) => String(item.quoteCode || item._id) === quoteId);
          if (liveQuote) {
            setQuotes([mapBackendQuoteToSharedQuote(liveQuote)]);
            setQuoteSource('live');
            return;
          }
        } catch {
          // fall back to shared local state if live fetch is unavailable
        }
      }
      const merged = cookieQuote
        ? [cookieQuote, ...localQuotes.filter((item) => item.quoteId !== quoteId)]
        : localQuotes;
      setQuotes(merged);
      setQuoteSource('local');
    };
    void hydrate();
    const interval = window.setInterval(() => {
      void hydrate();
    }, 1500);
    window.addEventListener('storage', hydrate);
    window.addEventListener(sharedQuoteStorageUpdatedEvent, hydrate as EventListener);
    window.addEventListener('focus', hydrate);
    document.addEventListener('visibilitychange', hydrate);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('storage', hydrate);
      window.removeEventListener(sharedQuoteStorageUpdatedEvent, hydrate as EventListener);
      window.removeEventListener('focus', hydrate);
      document.removeEventListener('visibilitychange', hydrate);
    };
  }, [quoteId]);

  const quote = useMemo(() => quotes.find((item) => item.quoteId === quoteId) || null, [quoteId, quotes]);
  const breakdown = useMemo(() => deriveBreakdown(quote || {}), [quote]);

  function updateQuote(updater: (quote: SharedBookingRequest) => SharedBookingRequest) {
    if (!quote) return;
    const next = quotes.map((item) => item.quoteId === quote.quoteId ? updater(item) : item);
    setQuotes(next);
    writeSharedQuoteRequests(next);
    const updated = next.find((item) => item.quoteId === quote.quoteId);
    if (updated) {
      upsertSharedQuote(updated);
    }
  }

  async function performLiveQuoteUpdate(
    status: 'accepted' | 'revision_requested' | 'rejected',
    successText: string,
    infoTone: 'success' | 'info',
    note?: string,
  ) {
    if (!quote?.quoteId) return;
    if (quoteSource === 'live' && hasPortalAuth()) {
      try {
        const updated = await apiPatch<BackendQuote>(`/quotes/${encodeURIComponent(quote.quoteId)}/status`, {
          status,
          approvalMethod: status === 'accepted' ? 'Customer approved digitally' : undefined,
          note,
        });
        let nextQuote = updated;
        if (status === 'accepted') {
          const booking = await apiPost<{ bookingId?: string; bookingCode?: string; shipmentRef?: string }>('/bookings', {
            quoteId: quote.quoteId,
          });
          nextQuote = {
            ...updated,
            bookingId: booking.bookingCode || booking.bookingId,
            convertedToShipmentId: booking.shipmentRef,
          };
        }
        setQuotes([mapBackendQuoteToSharedQuote(nextQuote)]);
        setAction(null);
        setNotice({ tone: infoTone, text: successText });
        return;
      } catch {
        // Fall through to local storage updates when the live API is unavailable.
      }
    }

    updateQuote((current) => {
      if (status === 'accepted') {
        const bookingId = current.bookingId || deriveBookingIdFromQuote(current.quoteId);
        return {
          ...current,
          bookingId,
          convertedToShipmentId: current.convertedToShipmentId || deriveShipmentIdFromQuote(current.quoteId),
          quoteStatus: 'quote_accepted',
          bookingStatus: current.bookingStatus || 'draft',
          approvalStatus: 'accepted',
          approvalMethod: 'Customer approved digitally',
          approvalRecordedBy: approvedBy || current.customerName,
          approvalRecordedAt: new Date().toISOString(),
          remarks: `${current.remarks || ''}\nCustomer approval note: ${note || ''}`.trim(),
        };
      }
      if (status === 'revision_requested') {
        return {
          ...current,
          quoteStatus: 'quote_revision_requested',
          approvalStatus: 'draft',
          remarks: `${current.remarks || ''}\nRevision request: ${note || ''}`.trim(),
        };
      }
      return {
        ...current,
        quoteStatus: 'quote_rejected',
        approvalStatus: 'rejected',
        approvalRecordedAt: new Date().toISOString(),
        remarks: `${current.remarks || ''}\nRejected by customer: ${note || ''}`.trim(),
      };
    });
    setAction(null);
    setNotice({ tone: infoTone, text: successText });
  }

  if (!quote) {
    return (
      <section className="portal-grid">
        <article className="portal-card">
          <div className="portal-section-header">
            <div>
              <div className="portal-section-eyebrow">Quote access</div>
              <h2>Quote not available</h2>
            </div>
          </div>
          <p>This quote link is unavailable or you do not have access to this record.</p>
          <div className="portal-actions" style={{ marginTop: 16 }}>
            <Link href="/bookings" className="portal-btn">Back to Booking / Quote</Link>
          </div>
        </article>
      </section>
    );
  }

  const approvalLocked = quote.approvalStatus === 'accepted' || quote.approvalStatus === 'rejected' || quote.approvalStatus === 'expired';
  const routeParts = [quote.portOfLoading, quote.portOfDischarge, quote.inlandDestination].filter(Boolean);
  const routeSummary = routeParts.filter((part, index) => index === 0 || part !== routeParts[index - 1]).join(' -> ');

  return (
    <section className="portal-grid" data-testid="customer-quote-review">
      {!pdfMode && notice ? <div className={`portal-quote-notice ${notice.tone}`}>{notice.text}</div> : null}

      <div className="portal-quote-review-layout portal-quote-pdf-layout">
        <div className="portal-grid">
          <article className="portal-card portal-quote-pdf-card">
            <div className="portal-quote-brand-header">
              <div className="portal-quote-brand-block">
                <img src="/branding/tikur-abay-logo.png" alt="Tikur Abay" className="portal-quote-brand-logo" />
                <div className="portal-quote-brand-copy">
                  <div className="portal-section-eyebrow">Commercial Quote</div>
                  <h2>Tikur Abay multimodal shipment quotation</h2>
                  <p>Issued for customer review and booking approval.</p>
                </div>
              </div>
              <div className="portal-quote-pdf-stamp">
                <span>Quote reference</span>
                <strong>{quote.quoteId}</strong>
              </div>
            </div>
            <div className="portal-quote-hero-grid">
              <div className="portal-quote-hero-main">
                <span>Quoted total</span>
                <strong>{money(breakdown.total, breakdown.currency)}</strong>
                <p>{quote.shipmentMode || (quote.serviceType === 'unimodal' ? 'Ocean Freight' : 'Multimodal')} · {quote.loadType || 'FCL'} · {quote.serviceLevel || 'Door to Door'}</p>
              </div>
              <div className="portal-quote-hero-meta">
                <div><span>Customer</span><strong>{quote.customerName}</strong></div>
                <div><span>Company</span><strong>{quote.company || 'Not provided'}</strong></div>
                <div><span>Issued</span><strong>{formatDate(quote.approvalRecordedAt || quote.requestedLoadingDate)}</strong></div>
                <div><span>Status</span><strong>{statusLabel(quote)}</strong></div>
              </div>
            </div>
            <div className="portal-quote-summary-grid">
              <div><span>Customer name</span><strong>{quote.customerName}</strong></div>
              <div><span>Company</span><strong>{quote.company || 'Not provided'}</strong></div>
              <div><span>Notify party</span><strong>{displayOrPending(quote.notifyPartyName || quote.contactPerson)}</strong></div>
              <div><span>2nd notify party</span><strong>{displayOrPending(quote.secondNotifyParty)}</strong></div>
              <div><span>Quote reference</span><strong>{quote.quoteId}</strong></div>
              <div><span>Valid until</span><strong>{formatDate(quote.requestedArrivalWindow)}</strong></div>
              <div><span>Quote owner</span><strong>{quote.priceOwner || 'Tikur Abay Commercial Desk'}</strong></div>
              <div><span>Portal recipient</span><strong>{quote.email || 'Pending customer email'}</strong></div>
            </div>
          </article>

          <article className="portal-card portal-quote-pdf-card">
            <div className="portal-section-header">
              <div>
                <div className="portal-section-eyebrow">Shipment Summary</div>
                <h2>Shipment details</h2>
              </div>
            </div>
            <div className="portal-quote-summary-grid">
              <div><span>Shipment mode</span><strong>{quote.shipmentMode || (quote.serviceType === 'unimodal' ? 'Ocean Freight' : 'Multimodal')}</strong></div>
              <div><span>Load type</span><strong>{quote.loadType || (quote.containerCount && quote.containerCount > 1 ? 'FCL' : 'FCL')}</strong></div>
              <div><span>Service level</span><strong>{quote.serviceLevel || 'Door to Door'}</strong></div>
              <div><span>Route</span><strong>{routeSummary || 'Pending route'}</strong></div>
              <div><span>Place of receipt</span><strong>{displayOrPending(quote.placeOfReceipt || quote.portOfLoading)}</strong></div>
              <div><span>Final delivery</span><strong>{quote.finalDeliveryLocation || quote.inlandDestination || 'Pending'}</strong></div>
              <div><span>Preferred departure</span><strong>{formatDate(quote.earliestDepartureDate)}</strong></div>
              <div><span>Preferred arrival</span><strong>{formatDate(quote.requestedArrivalWindow)}</strong></div>
              <div><span>Incoterm</span><strong>{quote.incoterm || 'CIF'}</strong></div>
              <div><span>Freight term</span><strong>{displayOrPending((quote.freightPaymentTerm || (quote.incoterm === 'FOB' ? 'collect' : 'prepaid')).toUpperCase())}</strong></div>
              <div><span>Cargo description</span><strong>{quote.cargoDescription || quote.commoditySummary}</strong></div>
              <div><span>HS code</span><strong>{displayOrPending(quote.hsCode)}</strong></div>
              <div><span>Marks &amp; numbers</span><strong>{displayOrPending(quote.marksAndNumbers)}</strong></div>
              <div><span>Packages</span><strong>{displayOrPending(quote.packageSummary || `${quote.containerCount || 1} shipment unit(s)`)}</strong></div>
              <div><span>Gross weight</span><strong>{quote.totalWeight?.toLocaleString('en-US') || '0'} kg</strong></div>
              <div><span>Volume</span><strong>{quote.cbm || 0} CBM</strong></div>
              <div><span>Container type</span><strong>{quote.containerType || 'Pending'}</strong></div>
              <div><span>Container size</span><strong>{String(quote.containerType || '').includes('20') ? '20FT' : '40FT'}</strong></div>
              <div><span>Container quantity</span><strong>{quote.containerCount || 1}</strong></div>
              <div><span>LC number</span><strong>{displayOrPending(quote.lcNumber || quote.bankPermitNumber)}</strong></div>
              <div><span>Consignee TIN</span><strong>{displayOrPending(quote.consigneeTinNumber)}</strong></div>
              <div><span>TIN area code</span><strong>{displayOrPending(quote.tinAreaCode)}</strong></div>
              <div><span>Vessel</span><strong>{displayOrPending(quote.vesselName)}</strong></div>
              <div><span>Voyage</span><strong>{displayOrPending(quote.voyageNumber)}</strong></div>
              <div><span>ETA loading port</span><strong>{formatDate(quote.etaLoadingPort)}</strong></div>
              <div><span>Shipping certificate</span><strong>{displayOrPending(quote.shippingCertificateRequired)}</strong></div>
              {quote.hazardousFlag ? <div><span>UN number</span><strong>{displayOrPending(quote.unNumber)}</strong></div> : null}
              <div><span>Special handling</span><strong>{quote.specialHandlingNote || 'Standard handling'}</strong></div>
            </div>
            <p style={{ marginTop: 12 }}>If any shipment detail is incorrect, request a revision before approving.</p>
          </article>

          <article className="portal-card portal-quote-pdf-card">
            <div className="portal-section-header">
              <div>
                <div className="portal-section-eyebrow">Included Services</div>
                <h2>What is included in this quote</h2>
              </div>
            </div>
            <div className="portal-service-chip-list">
              {['Freight', 'Origin handling', 'Documentation', 'Inland transport', 'Customs support', 'Insurance', 'Destination handling'].map((item) => (
                <span key={item} className="portal-service-chip">{item}</span>
              ))}
            </div>
          </article>

          <article className="portal-card portal-quote-pdf-card">
            <div className="portal-section-header">
              <div>
                <div className="portal-section-eyebrow">Commercial Notes</div>
                <h2>Important notes</h2>
              </div>
            </div>
            <div className="portal-list">
              <div className="portal-list-row"><div><strong>Validity</strong><p>This quote remains valid until {quote.requestedArrivalWindow || 'the stated validity date'}.</p></div></div>
              <div className="portal-list-row"><div><strong>Assumptions</strong><p>Pricing assumes the shipment details above remain unchanged and documents are provided on time.</p></div></div>
              <div className="portal-list-row"><div><strong>Booking trigger</strong><p>Booking proceeds only after quote approval has been recorded.</p></div></div>
              <div className="portal-list-row"><div><strong>Trade reference</strong><p>LC / Bank: {displayOrPending(quote.lcNumber || quote.bankPermitNumber)} · TIN: {displayOrPending(quote.consigneeTinNumber)} / {displayOrPending(quote.tinAreaCode)}</p></div></div>
            </div>
          </article>
        </div>

        <aside className="portal-grid">
          <article className="portal-card portal-quote-total-card portal-quote-pdf-card">
            <div className="portal-section-header">
              <div>
                <div className="portal-section-eyebrow">Pricing Breakdown</div>
                <h2>{money(breakdown.total, breakdown.currency)}</h2>
              </div>
            </div>
            <div className="portal-list">
              <div className="portal-list-row"><div><strong>Base freight</strong></div><div>{money(breakdown.baseFreight, breakdown.currency)}</div></div>
              <div className="portal-list-row"><div><strong>Origin charges</strong></div><div>{money(breakdown.originCharges, breakdown.currency)}</div></div>
              <div className="portal-list-row"><div><strong>Documentation fees</strong></div><div>{money(breakdown.documentationFees, breakdown.currency)}</div></div>
              <div className="portal-list-row"><div><strong>Stuffing / handling</strong></div><div>{money(breakdown.stuffingHandling, breakdown.currency)}</div></div>
              <div className="portal-list-row"><div><strong>Inland transport</strong></div><div>{money(breakdown.inlandTransport, breakdown.currency)}</div></div>
              <div className="portal-list-row"><div><strong>Customs support</strong></div><div>{money(breakdown.customsSupport, breakdown.currency)}</div></div>
              <div className="portal-list-row"><div><strong>Insurance</strong></div><div>{money(breakdown.insurance, breakdown.currency)}</div></div>
              <div className="portal-list-row"><div><strong>Destination charges</strong></div><div>{money(breakdown.destinationCharges, breakdown.currency)}</div></div>
              <div className="portal-list-row"><div><strong>Discount</strong></div><div>- {money(breakdown.discount, breakdown.currency)}</div></div>
              <div className="portal-list-row"><div><strong>Taxes</strong></div><div>{money(breakdown.taxes, breakdown.currency)}</div></div>
            </div>
            <p style={{ marginTop: 12 }}>Prices may need revision after expiry if the quote validity date has passed.</p>
          </article>

          {pdfMode ? (
            <article className="portal-card portal-quote-pdf-card">
              <div className="portal-section-header">
                <div>
                  <div className="portal-section-eyebrow">Commercial Approval Note</div>
                  <h2>Customer review copy</h2>
                </div>
              </div>
              <div className="portal-list">
                <div className="portal-list-row"><div><strong>Recipient</strong><p>{quote.email || 'Pending customer email'}</p></div></div>
                <div className="portal-list-row"><div><strong>Approval status</strong><p>{statusLabel(quote)}</p></div></div>
                <div className="portal-list-row"><div><strong>Booking rule</strong><p>Booking proceeds only after this commercial quote is approved by the customer.</p></div></div>
                <div className="portal-list-row"><div><strong>Commercial references</strong><p>HS {displayOrPending(quote.hsCode)} · LC {displayOrPending(quote.lcNumber || quote.bankPermitNumber)} · Vessel {displayOrPending(quote.vesselName)} / {displayOrPending(quote.voyageNumber)}</p></div></div>
              </div>
              <div className="portal-quote-pdf-footer">
                <div>
                  <span>Tikur Abay Transport</span>
                  <strong>Commercial quote PDF</strong>
                </div>
                <div>
                  <span>Prepared for</span>
                  <strong>{quote.customerName || 'Customer'}</strong>
                </div>
              </div>
            </article>
          ) : (
            <article className="portal-card portal-quote-pdf-card">
              <div className="portal-section-header">
                <div>
                  <div className="portal-section-eyebrow">Approval Actions</div>
                  <h2>What would you like to do?</h2>
                </div>
              </div>
              <div className="portal-actions" style={{ marginTop: 8 }}>
                <button type="button" className="portal-btn" disabled={approvalLocked} onClick={() => setAction('approve')} data-testid="customer-approve-quote">Approve Quote</button>
                <button type="button" className="portal-btn secondary" disabled={approvalLocked} onClick={() => setAction('revision')} data-testid="customer-request-revision">Request Revision</button>
                <button type="button" className="portal-btn secondary" disabled={approvalLocked} onClick={() => setAction('reject')} data-testid="customer-reject-quote">Reject Quote</button>
                <button type="button" className="portal-btn secondary" onClick={() => window.print()}>Download Quote PDF</button>
                <Link href="/support" className="portal-btn secondary">Contact Support</Link>
              </div>

              {action === 'approve' ? (
                <div className="portal-approval-panel">
                  <label className="portal-check-row"><input type="checkbox" checked={confirmDetails} onChange={(event) => setConfirmDetails(event.target.checked)} /><span>I confirm that the shipment details and quoted services are correct.</span></label>
                  <label className="portal-check-row"><input type="checkbox" checked={confirmProceed} onChange={(event) => setConfirmProceed(event.target.checked)} /><span>I agree to proceed with booking based on this quote.</span></label>
                  <label className="portal-data-item"><span>Approved by</span><input className="portal-input" value={approvedBy} onChange={(event) => setApprovedBy(event.target.value)} /></label>
                  <label className="portal-data-item"><span>Approval note</span><textarea className="portal-input" value={approvalNote} onChange={(event) => setApprovalNote(event.target.value)} /></label>
                  <div className="portal-actions">
                    <button
                      type="button"
                      className="portal-btn"
                      data-testid="customer-confirm-approval"
                      disabled={!confirmDetails || !confirmProceed}
                      onClick={() => void performLiveQuoteUpdate(
                        'accepted',
                        'Thank you. Your quote has been approved and our team can now continue to booking.',
                        'success',
                        approvalNote,
                      )}
                    >
                      Confirm Approval
                    </button>
                  </div>
                </div>
              ) : null}

              {action === 'revision' ? (
                <div className="portal-approval-panel">
                  <label className="portal-data-item"><span>Reason</span><select className="portal-select" value={revisionReason} onChange={(event) => setRevisionReason(event.target.value)}><option>shipment details incorrect</option><option>price needs review</option><option>service scope needs change</option><option>destination/origin changed</option><option>other</option></select></label>
                  <label className="portal-data-item"><span>Comments</span><textarea className="portal-input" value={revisionComment} onChange={(event) => setRevisionComment(event.target.value)} /></label>
                  <div className="portal-actions">
                    <button
                      type="button"
                      className="portal-btn"
                      data-testid="customer-submit-revision"
                      onClick={() => void performLiveQuoteUpdate(
                        'revision_requested',
                        'Your revision request has been sent. Our team will review and update the quote.',
                        'success',
                        `${revisionReason}. ${revisionComment}`.trim(),
                      )}
                    >
                      Submit Revision Request
                    </button>
                  </div>
                </div>
              ) : null}

              {action === 'reject' ? (
                <div className="portal-approval-panel">
                  <label className="portal-data-item"><span>Reason</span><textarea className="portal-input" value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} /></label>
                  <div className="portal-actions">
                    <button
                      type="button"
                      className="portal-btn"
                      data-testid="customer-submit-rejection"
                      disabled={!rejectReason.trim()}
                      onClick={() => void performLiveQuoteUpdate(
                        'rejected',
                        'This quote has been declined. If you need a revised shipment plan, please contact our team.',
                        'info',
                        rejectReason,
                      )}
                    >
                      Confirm Rejection
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="portal-quote-pdf-footer">
                <div>
                  <span>Tikur Abay Customer Workspace</span>
                  <strong>Quote review copy</strong>
                </div>
                <div>
                  <span>Customer portal recipient</span>
                  <strong>{quote.email || 'Pending customer email'}</strong>
                </div>
              </div>
            </article>
          )}
        </aside>
      </div>
    </section>
  );
}
