'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  approveShippingInstruction,
  finalizeShippingBillOfLading,
  generateShippingManifest,
  readShippingPhase1Workspace,
  recordShippingPayment,
  shippingCtaLabel,
  submitShippingInstruction,
  shippingNextActionLabel,
  shippingPhase1UpdatedEvent,
  shippingStageLabel,
  type ShippingDocumentStatus,
  updateShippingValidation,
} from '../lib/shipping-phase1';
import { sharedQuoteStorageUpdatedEvent } from '../lib/shared-quote-storage';

const validationStatusOptions: ShippingDocumentStatus[] = ['pending', 'invalid', 'corrected', 'approved'];

function formatMoney(value: number, currency: string) {
  return `${currency} ${value.toLocaleString('en-US')}`;
}

function formatDate(value: string) {
  if (!value) return 'Pending';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function nextWorkspaceHrefForBooking(booking: { currentStage: string; nextAction: string } | null): string | null {
  if (!booking) return null;
  const stage = booking.currentStage.toLowerCase();
  const nextAction = booking.nextAction.toLowerCase();
  if (stage.includes('complete') || nextAction.includes('proceed to corridor execution')) return null;
  if (stage.includes('document validation')) return '/shipping/instructions';
  if (stage.includes('carrier schedule')) return '/shipping/carrier-schedules';
  if (stage.includes('shipping instruction')) return '/shipping/instructions';
  if (stage.includes('bill of lading')) return '/shipping/bills-of-lading';
  if (stage.includes('manifest')) return '/shipping/manifest';
  if (stage.includes('trade finance') || stage.includes('settlement') || stage.includes('cargo release')) return '/shipping/finance';
  if (stage.includes('after-sales')) return '/shipping/after-sales';
  return '/shipping/instructions';
}

export function ShippingPhase1Workspace() {
  const searchParams = useSearchParams();
  const [workspace, setWorkspace] = useState(() => readShippingPhase1Workspace());
  const [search, setSearch] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState('');

  useEffect(() => {
    const reload = () => setWorkspace(readShippingPhase1Workspace());
    reload();
    window.addEventListener(sharedQuoteStorageUpdatedEvent, reload as EventListener);
    window.addEventListener(shippingPhase1UpdatedEvent, reload as EventListener);
    return () => {
      window.removeEventListener(sharedQuoteStorageUpdatedEvent, reload as EventListener);
      window.removeEventListener(shippingPhase1UpdatedEvent, reload as EventListener);
    };
  }, []);

  const filteredQuotes = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return workspace.quotes.filter((quote) => {
      if (!needle) return true;
      return [quote.quoteId, quote.bookingId, quote.customerName, quote.routeSummary].join(' ').toLowerCase().includes(needle);
    });
  }, [search, workspace.quotes]);

  const bookings = workspace.bookings.filter((booking) => !search.trim() || [booking.bookingId, booking.quoteId, booking.customerName, booking.routeSummary].join(' ').toLowerCase().includes(search.trim().toLowerCase()));
  const selectedBooking = bookings.find((item) => item.bookingId === selectedBookingId) || bookings[0] || null;
  const selectedValidation = workspace.validations.find((item) => item.bookingId === selectedBooking?.bookingId || item.quoteId === selectedBooking?.quoteId) || null;
  const selectedInvoice = workspace.invoices.find((item) => item.bookingId === selectedBooking?.bookingId) || null;
  const selectedSettlement = workspace.settlements.find((item) => item.bookingId === selectedBooking?.bookingId) || null;
  const selectedInstruction = workspace.instructions.find((item) => item.bookingId === selectedBooking?.bookingId) || null;
  const selectedBill = workspace.billsOfLading.find((item) => item.bookingId === selectedBooking?.bookingId) || null;
  const selectedManifest = workspace.manifests.find((item) => item.bookingId === selectedBooking?.bookingId) || null;
  const siSubmitIsNext = selectedInstruction?.status === 'draft';
  const siApproveIsNext = selectedInstruction?.status === 'submitted';
  const blFinalizeIsNext = Boolean(selectedBill && !selectedBill.blockedReason && selectedBill.status === 'approved');
  const manifestGenerateIsNext = Boolean(selectedManifest && !selectedManifest.blockedReason && selectedManifest.status !== 'generated');

  useEffect(() => {
    const requestedBooking = String(searchParams.get('booking') || '').trim();
    if (requestedBooking) {
      const requestedMatch = bookings.find((item) => item.bookingId === requestedBooking);
      if (requestedMatch && requestedMatch.bookingId !== selectedBookingId) {
        setSelectedBookingId(requestedMatch.bookingId);
        return;
      }
    }
    if (!selectedBookingId && bookings[0]?.bookingId) {
      setSelectedBookingId(bookings[0].bookingId);
    }
  }, [bookings, searchParams, selectedBookingId]);

  const kpis = {
    quotes: workspace.quotes.length,
    bookings: workspace.bookings.length,
    validationBlocked: workspace.validations.filter((item) => item.blocking).length,
    outstandingSettlements: workspace.settlements.filter((item) => item.status === 'outstanding').length,
  };
  const nextWorkspaceHref = nextWorkspaceHrefForBooking(selectedBooking);
  const workspaceTabs = [
    { label: 'Carrier Schedules', href: '/shipping/carrier-schedules', isNext: nextWorkspaceHref === '/shipping/carrier-schedules' },
    { label: 'Shipping Instructions', href: '/shipping/instructions', isNext: nextWorkspaceHref === '/shipping/instructions' },
    { label: 'Bills of Lading', href: '/shipping/bills-of-lading', isNext: nextWorkspaceHref === '/shipping/bills-of-lading' },
    { label: 'Manifest', href: '/shipping/manifest', isNext: nextWorkspaceHref === '/shipping/manifest' },
    { label: 'Tracking', href: '/shipping/tracking', isNext: nextWorkspaceHref === '/shipping/tracking' },
    { label: 'Finance', href: '/shipping/finance', isNext: nextWorkspaceHref === '/shipping/finance' },
    { label: 'After-Sales', href: '/shipping/after-sales', isNext: nextWorkspaceHref === '/shipping/after-sales' },
  ];
  const nextWorkspaceTab = workspaceTabs.find((tab) => tab.isNext) || null;

  return (
    <main className="shell">
      <section className="supplier-desk-shell">
        <header className="supplier-desk-header">
          <div className="supplier-desk-title">
            <span className="supplier-desk-eyebrow">Phase 1 Build</span>
            <h1>Shipping Workspace</h1>
            <p>Quotes, bookings, document validation, and finance settlement in one operational view.</p>
          </div>
          <div className="supplier-desk-toolbar">
            <input className="supplier-desk-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search quote, booking, customer, route" />
          </div>
        </header>

        <nav className="supplier-jump-links">
          {workspaceTabs.map((tab) => (
            <Link
              key={tab.label}
              className={tab.isNext ? 'supplier-jump-link supplier-next-step-button' : 'supplier-jump-link'}
              href={`${tab.href}${selectedBooking?.bookingId ? `?booking=${encodeURIComponent(selectedBooking.bookingId)}` : ''}`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        {selectedBooking ? (
          <section className="supplier-panel supplier-work-panel-wide shipping-workspace-next-panel">
            <header className="supplier-panel-header">
              <div>
                <span className="supplier-panel-eyebrow">Next system step</span>
                <h2>Continue from origin into Shipping Workspace</h2>
              </div>
              <p>{selectedBooking.bookingId}</p>
            </header>
            <div className="shipping-workspace-next-grid">
              <div className="shipping-workspace-next-copy">
                <strong>{shippingStageLabel(selectedBooking.currentStage)}</strong>
                <p>{selectedBooking.automationNote}</p>
              </div>
              {nextWorkspaceTab ? (
                <Link
                  href={`${nextWorkspaceTab.href}${selectedBooking.bookingId ? `?booking=${encodeURIComponent(selectedBooking.bookingId)}` : ''}`}
                  className="supplier-desk-button supplier-desk-button-primary supplier-next-step-button"
                >
                  Open {nextWorkspaceTab.label}
                </Link>
              ) : (
                <span className="supplier-desk-button supplier-desk-button-secondary">Shipping Workspace complete</span>
              )}
            </div>
          </section>
        ) : null}

        <section className="supplier-summary-grid">
          <article className="supplier-summary-card"><span>Quotes</span><strong>{kpis.quotes}</strong><p>Commercial records across request and approval.</p></article>
          <article className="supplier-summary-card"><span>Bookings</span><strong>{kpis.bookings}</strong><p>Operational booking references already created.</p></article>
          <article className="supplier-summary-card"><span>Validation blocked</span><strong>{kpis.validationBlocked}</strong><p>Files still blocked before document approval.</p></article>
          <article className="supplier-summary-card"><span>Outstanding settlement</span><strong>{kpis.outstandingSettlements}</strong><p>Invoices still waiting on payment or closure.</p></article>
        </section>

        <section className="supplier-main-grid">
          <article className="supplier-panel">
            <header className="supplier-panel-header">
              <div>
                <span className="supplier-panel-eyebrow">Quotes</span>
                <h2>Commercial queue</h2>
              </div>
              <p>{filteredQuotes.length} records</p>
            </header>
            <div className="supplier-queue-list">
              {filteredQuotes.map((quote) => (
                <button key={quote.quoteId} type="button" className={quote.bookingId && quote.bookingId === selectedBookingId ? 'supplier-queue-row active' : 'supplier-queue-row'} onClick={() => quote.bookingId && setSelectedBookingId(quote.bookingId)}>
                  <div className="supplier-queue-topline">
                    <strong>{quote.bookingId || quote.quoteId}</strong>
                    <span className={`status-badge ${quote.approvalStatus === 'accepted' ? 'good' : quote.quoteStatus === 'quote_sent' ? 'warning' : 'info'}`}>{quote.bookingId ? 'booking ready' : quote.quoteStatus.replace(/_/g, ' ')}</span>
                  </div>
                  <span>{quote.customerName}</span>
                  <span>{quote.routeSummary}</span>
                  <div className="supplier-queue-meta">
                    <span>{formatMoney(quote.pricing.totalUSD, 'USD')}</span>
                    <span>{formatMoney(quote.pricing.inlandTransportETB, 'ETB')}</span>
                  </div>
                </button>
              ))}
            </div>
          </article>

          <div className="supplier-detail-column">
            <article className="supplier-panel">
              <header className="supplier-panel-header">
                <div>
                  <span className="supplier-panel-eyebrow">Bookings</span>
                  <h2>Operational booking list</h2>
                </div>
              </header>
              <div className="supplier-checklist console-scroll-panel">
                {bookings.length ? bookings.map((booking) => (
                  <button key={booking.bookingId} type="button" className={booking.bookingId === selectedBooking?.bookingId ? 'supplier-queue-row active' : 'supplier-queue-row'} onClick={() => setSelectedBookingId(booking.bookingId)}>
                    <div className="supplier-queue-topline">
                      <strong>{booking.bookingId}</strong>
                      <span className="status-badge info">{shippingStageLabel(booking.currentStage)}</span>
                    </div>
                    <span>{booking.customerName}</span>
                    <span>{booking.routeSummary}</span>
                  </button>
                )) : <div className="supplier-check-item is-pending"><strong>No bookings yet</strong><p>Approving a quote will create and reserve the booking number.</p></div>}
              </div>
            </article>

            {selectedBooking ? (
              <article className="supplier-panel">
                <header className="supplier-panel-header">
                  <div>
                    <span className="supplier-panel-eyebrow">Selected booking</span>
                    <h2>{selectedBooking.bookingId}</h2>
                  </div>
                  <p>{shippingStageLabel(selectedBooking.currentStage)}</p>
                </header>
                <div className="supplier-detail-summary">
                  <div className="supplier-detail-item"><span>Quote reference</span><strong>{selectedBooking.quoteId}</strong></div>
                  <div className="supplier-detail-item"><span>Customer</span><strong>{selectedBooking.customerName}</strong></div>
                  <div className="supplier-detail-item"><span>Service</span><strong>{selectedBooking.serviceType}</strong></div>
                  <div className="supplier-detail-item"><span>Incoterm</span><strong>{selectedBooking.incoterm}</strong></div>
                  <div className="supplier-detail-item"><span>Route</span><strong>{selectedBooking.routeSummary}</strong></div>
                  <div className="supplier-detail-item"><span>Responsible desk</span><strong>{selectedBooking.responsibleDesk}</strong></div>
                  <div className="supplier-detail-item"><span>Next action</span><strong>{shippingNextActionLabel(selectedBooking.nextAction)}</strong></div>
                </div>
                <div className="shipping-phase-note console-gap-top-md">
                  <span>Automation</span>
                  <p>{selectedBooking.automationNote}</p>
                </div>
              </article>
            ) : null}
          </div>

          <aside className="supplier-support-column">
            <article className="supplier-panel">
              <header className="supplier-panel-header">
                <div>
                  <span className="supplier-panel-eyebrow">Validation</span>
                  <h2>Document control loop</h2>
                </div>
                <p>{selectedValidation?.blocking ? 'Blocking' : 'Approved'}</p>
              </header>
              <div className="supplier-readiness-list">
                {selectedValidation?.items.map((item) => (
                  <div key={item.id} className={item.status === 'approved' ? 'supplier-check-item is-complete' : item.status === 'invalid' ? 'supplier-check-item is-blocked' : 'supplier-check-item is-pending'}>
                    <span>{item.label}</span>
                    <strong>{item.status}</strong>
                    <select className="supplier-desk-select" value={item.status} onChange={(event) => updateShippingValidation(selectedValidation.bookingId || selectedValidation.quoteId, item.id, event.target.value as ShippingDocumentStatus, item.reason)}>
                      {validationStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                    <p>{item.reason || 'No validation note'}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="supplier-panel">
              <header className="supplier-panel-header">
                <div>
                  <span className="supplier-panel-eyebrow">Finance</span>
                  <h2>Invoice and settlement</h2>
                </div>
              </header>
              {selectedInvoice ? (
                <>
                  <div className="supplier-detail-summary">
                    <div className="supplier-detail-item"><span>Invoice</span><strong>{selectedInvoice.invoiceId}</strong></div>
                    <div className="supplier-detail-item"><span>Payment</span><strong>{selectedInvoice.paymentStatus}</strong></div>
                    <div className="supplier-detail-item"><span>Settlement</span><strong>{selectedInvoice.settlementStatus}</strong></div>
                    <div className="supplier-detail-item"><span>Total USD</span><strong>{formatMoney(selectedInvoice.totalUSD, 'USD')}</strong></div>
                    <div className="supplier-detail-item"><span>Total ETB</span><strong>{formatMoney(selectedInvoice.totalETB, 'ETB')}</strong></div>
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
                    <button type="button" className="supplier-desk-button supplier-desk-button-secondary" onClick={() => recordShippingPayment(selectedInvoice.invoiceId, selectedInvoice.bookingId, selectedInvoice.customerName, 'USD', Math.round(selectedInvoice.totalUSD / 2))}>{shippingCtaLabel('record_usd_payment')}</button>
                    <button type="button" className="supplier-desk-button supplier-desk-button-primary" onClick={() => recordShippingPayment(selectedInvoice.invoiceId, selectedInvoice.bookingId, selectedInvoice.customerName, 'ETB', selectedInvoice.totalETB)}>{shippingCtaLabel('record_etb_payment')}</button>
                  </div>
                  {selectedSettlement ? (
                    <div className="supplier-detail-summary console-gap-top-md">
                      <div className="supplier-detail-item"><span>Balance USD</span><strong>{formatMoney(selectedSettlement.balanceUSD, 'USD')}</strong></div>
                      <div className="supplier-detail-item"><span>Balance ETB</span><strong>{formatMoney(selectedSettlement.balanceETB, 'ETB')}</strong></div>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="supplier-check-item is-pending"><strong>No invoice yet</strong><p>Finance starts once the booking exists.</p></div>
              )}
            </article>
          </aside>
        </section>

        {selectedBooking ? (
          <section className="shipping-phase-grid">
            <article className="supplier-panel">
              <header className="supplier-panel-header">
                <div>
                  <span className="supplier-panel-eyebrow">Phase 2</span>
                  <h2>Shipping instruction</h2>
                </div>
                <p>{selectedInstruction?.status || 'draft'}</p>
              </header>
              {selectedInstruction ? (
                <>
                  <div className="shipping-phase-detail-list">
                    <div className="shipping-phase-detail-row"><span>Booking</span><strong>{selectedInstruction.bookingId}</strong></div>
                    <div className="shipping-phase-detail-row"><span>Shipper</span><strong>{selectedInstruction.shipperName}</strong></div>
                    <div className="shipping-phase-detail-row"><span>Consignee</span><strong>{selectedInstruction.consigneeName}</strong></div>
                    <div className="shipping-phase-detail-row"><span>Notify party</span><strong>{selectedInstruction.notifyParty}</strong></div>
                    <div className="shipping-phase-detail-row"><span>Freight term</span><strong>{selectedInstruction.freightTerm}</strong></div>
                  </div>
                  <div className="shipping-phase-note">
                    <span>Cargo description</span>
                    <p>{selectedInstruction.cargoDescription}</p>
                  </div>
                  <div className="supplier-inline-actions">
                    <button type="button" className={`supplier-desk-button supplier-desk-button-secondary ${siSubmitIsNext ? 'supplier-next-step-button' : ''}`} disabled={selectedInstruction.status !== 'draft'} onClick={() => submitShippingInstruction(selectedInstruction.bookingId)}>{shippingCtaLabel('submit_si')}</button>
                    <button type="button" className={`supplier-desk-button supplier-desk-button-primary ${siApproveIsNext ? 'supplier-next-step-button' : ''}`} disabled={selectedInstruction.status !== 'submitted'} onClick={() => approveShippingInstruction(selectedInstruction.bookingId)}>{shippingCtaLabel('approve_si')}</button>
                  </div>
                </>
              ) : (
                <div className="supplier-check-item is-pending"><strong>No SI yet</strong><p>Shipping instruction starts once booking is confirmed.</p></div>
              )}
            </article>

            <article className="supplier-panel">
              <header className="supplier-panel-header">
                <div>
                  <span className="supplier-panel-eyebrow">Phase 2</span>
                  <h2>Bill of lading</h2>
                </div>
                <p>{selectedBill?.status || 'draft'}</p>
              </header>
              {selectedBill ? (
                <>
                  <div className="shipping-phase-detail-list">
                    <div className="shipping-phase-detail-row"><span>House BL</span><strong>{selectedBill.houseBlNumber || 'Pending'}</strong></div>
                    <div className="shipping-phase-detail-row"><span>Master BL</span><strong>{selectedBill.masterBlNumber || 'Pending'}</strong></div>
                    <div className="shipping-phase-detail-row"><span>Carrier</span><strong>{selectedBill.carrierName}</strong></div>
                    <div className="shipping-phase-detail-row"><span>Vessel</span><strong>{selectedBill.vesselName}</strong></div>
                    <div className="shipping-phase-detail-row"><span>Voyage</span><strong>{selectedBill.voyageNumber}</strong></div>
                  </div>
                  <div className={selectedBill.blockedReason ? 'shipping-phase-note is-blocked' : 'shipping-phase-note'}>
                    <span>BL gate</span>
                    <p>{selectedBill.blockedReason || `Final BL issued ${formatDate(selectedBill.issueDate)}.`}</p>
                  </div>
                  <div className="supplier-inline-actions">
                    <button type="button" className={`supplier-desk-button supplier-desk-button-primary ${blFinalizeIsNext ? 'supplier-next-step-button' : ''}`} disabled={Boolean(selectedBill.blockedReason) || selectedBill.status !== 'approved'} onClick={() => finalizeShippingBillOfLading(selectedBill.bookingId)}>{shippingCtaLabel('finalize_bl')}</button>
                  </div>
                </>
              ) : (
                <div className="supplier-check-item is-pending"><strong>No BL yet</strong><p>BL drafting opens after booking confirmation.</p></div>
              )}
            </article>

            <article className="supplier-panel">
              <header className="supplier-panel-header">
                <div>
                  <span className="supplier-panel-eyebrow">Phase 2</span>
                  <h2>Manifest</h2>
                </div>
                <p>{selectedManifest?.status || 'pending'}</p>
              </header>
              {selectedManifest ? (
                <>
                  <div className="shipping-phase-detail-list">
                    <div className="shipping-phase-detail-row"><span>Manifest</span><strong>{selectedManifest.manifestId || 'Pending'}</strong></div>
                    <div className="shipping-phase-detail-row"><span>Vessel</span><strong>{selectedManifest.vesselName}</strong></div>
                    <div className="shipping-phase-detail-row"><span>Voyage</span><strong>{selectedManifest.voyageNumber}</strong></div>
                    <div className="shipping-phase-detail-row"><span>Containers</span><strong>{selectedManifest.totalContainers}</strong></div>
                    <div className="shipping-phase-detail-row"><span>Total weight</span><strong>{selectedManifest.totalWeight.toLocaleString('en-US')} kg</strong></div>
                  </div>
                  <div className={selectedManifest.blockedReason ? 'shipping-phase-note is-blocked' : 'shipping-phase-note'}>
                    <span>Manifest gate</span>
                    <p>{selectedManifest.blockedReason || `Generated ${formatDate(selectedManifest.generatedAt)}.`}</p>
                  </div>
                  <div className="supplier-inline-actions">
                    <button type="button" className={`supplier-desk-button supplier-desk-button-primary ${manifestGenerateIsNext ? 'supplier-next-step-button' : ''}`} disabled={Boolean(selectedManifest.blockedReason) || selectedManifest.status === 'generated'} onClick={() => generateShippingManifest(selectedManifest.bookingId)}>{shippingCtaLabel('generate_manifest')}</button>
                  </div>
                </>
              ) : (
                <div className="supplier-check-item is-pending"><strong>No manifest yet</strong><p>Manifest generation opens after BL finalization.</p></div>
              )}
            </article>
          </section>
        ) : null}
      </section>
    </main>
  );
}
