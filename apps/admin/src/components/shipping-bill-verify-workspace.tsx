'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { readShippingPhase1Workspace } from '../lib/shipping-phase1';

function normalize(value: string | null) {
  return String(value || '').trim();
}

export function ShippingBillVerifyWorkspace() {
  const searchParams = useSearchParams();
  const workspace = useMemo(() => readShippingPhase1Workspace(), []);

  const blNumber = normalize(searchParams.get('blNumber'));
  const carrierBl = normalize(searchParams.get('carrierBl'));
  const bookingId = normalize(searchParams.get('shipmentId'));
  const bill = workspace.billsOfLading.find((item) => item.houseBlNumber === blNumber || item.masterBlNumber === carrierBl || item.bookingId === bookingId) || null;

  const valid = Boolean(
    bill &&
    bill.status === 'final' &&
    (!blNumber || bill.houseBlNumber === blNumber) &&
    (!carrierBl || bill.masterBlNumber === carrierBl) &&
    (!bookingId || bill.bookingId === bookingId),
  );

  return (
    <main className="shell">
      <section className="supplier-desk-shell">
        <header className="supplier-desk-header">
          <div className="supplier-desk-title">
            <span className="supplier-desk-eyebrow">BL Verification</span>
            <h1>Local bill of lading verification</h1>
            <p>Verify the Tikur Abay House BL against the current local shipping workspace.</p>
          </div>
          <div className="supplier-desk-toolbar">
            <Link className="supplier-jump-link is-active" href="/shipping/bills-of-lading">Back to BL desk</Link>
          </div>
        </header>

        <section className="shipping-phase4-layout">
          <article className="supplier-panel">
            <header className="supplier-panel-header">
              <div>
                <span className="supplier-panel-eyebrow">Verification result</span>
                <h2>{valid ? 'Valid final BL' : 'BL not verified'}</h2>
              </div>
              <span className={`status-badge ${valid ? 'good' : 'warning'}`}>{valid ? 'valid' : 'invalid'}</span>
            </header>
            <div className="shipping-phase-detail-list">
              <div className="shipping-phase-detail-row"><span>House BL</span><strong>{blNumber || bill?.houseBlNumber || 'Missing'}</strong></div>
              <div className="shipping-phase-detail-row"><span>Carrier BL</span><strong>{carrierBl || bill?.masterBlNumber || 'Missing'}</strong></div>
              <div className="shipping-phase-detail-row"><span>Booking / Shipment</span><strong>{bookingId || bill?.bookingId || 'Missing'}</strong></div>
              <div className="shipping-phase-detail-row"><span>Status</span><strong>{bill?.status || 'Not found'}</strong></div>
              <div className="shipping-phase-detail-row"><span>Customer</span><strong>{bill?.customerName || 'Not found'}</strong></div>
              <div className="shipping-phase-detail-row"><span>Verified at</span><strong>{new Date().toLocaleString('en-US')}</strong></div>
            </div>
            <div className={valid ? 'shipping-phase-note' : 'shipping-phase-note is-blocked'}>
              <span>Decision</span>
              <p>
                {valid
                  ? 'The BL matches a finalized persisted shipping record for this local environment.'
                  : 'The BL reference does not match a finalized local shipping record. Recheck the BL number, carrier BL number, or booking reference.'}
              </p>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
