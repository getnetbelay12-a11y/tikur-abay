'use client';

import {
  downloadBookingRequestFormPdf,
  downloadLogisticsQuoteRequestFormPdf,
  downloadQuoteAcceptanceFormPdf,
} from '../lib/shipping-pdf';

const formKitCards = [
  {
    id: 'quote-request',
    eyebrow: 'Commercial intake',
    title: 'Quotation Request Form',
    description: 'Customer-facing request form for cargo, lane, timing, and service scope before pricing.',
    actionLabel: 'Download PDF',
    handler: () =>
      downloadLogisticsQuoteRequestFormPdf({
        fileName: 'tikur-abay-logistics-quotation-request-form.pdf',
      }),
  },
  {
    id: 'quote-acceptance',
    eyebrow: 'Commercial approval',
    title: 'Quotation Acceptance Form',
    description: 'Formal approval form that links the quotation reference to operations and finance execution.',
    actionLabel: 'Download PDF',
    handler: () =>
      downloadQuoteAcceptanceFormPdf({
        fileName: 'tikur-abay-quotation-acceptance-form.pdf',
      }),
  },
  {
    id: 'booking-request',
    eyebrow: 'Shipment booking',
    title: 'Booking Request Form',
    description: 'Structured booking instruction for shipper, consignee, routing, cargo, and container controls.',
    actionLabel: 'Download PDF',
    handler: () =>
      downloadBookingRequestFormPdf({
        fileName: 'tikur-abay-booking-request-form.pdf',
      }),
  },
];

export function DocumentFormKitPanel() {
  return (
    <section className="document-form-kit">
      <div className="document-form-kit-header">
        <div>
          <div className="eyebrow">Branded form kit</div>
          <h3>Controlled customer templates</h3>
          <p>Download the approved Tikur Abay commercial and booking forms as branded PDFs from the console.</p>
        </div>
        <div className="document-form-kit-badge">AI-ready workflow pack</div>
      </div>

      <div className="document-form-kit-grid">
        {formKitCards.map((card) => (
          <article key={card.id} className="document-form-kit-card">
            <div className="document-form-kit-copy">
              <span>{card.eyebrow}</span>
              <strong>{card.title}</strong>
              <p>{card.description}</p>
            </div>
            <button type="button" className="btn console-download-button" onClick={() => void card.handler()}>
              {card.actionLabel}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
