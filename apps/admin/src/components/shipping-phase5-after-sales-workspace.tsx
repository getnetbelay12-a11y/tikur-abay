'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { readSession } from '../lib/auth-session';
import {
  canOperateShippingAction,
  rateShippingAfterSalesCase,
  readShippingPhase1Workspace,
  resolveShippingAfterSalesCase,
  shippingActionOwner,
  shippingPhase1UpdatedEvent,
} from '../lib/shipping-phase1';
import { manualCorridorStorageUpdatedEvent } from '../lib/manual-corridor-journey';

function formatDate(value: string) {
  if (!value) return 'Pending';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function ShippingPhase5AfterSalesWorkspace() {
  const [workspace, setWorkspace] = useState(() => readShippingPhase1Workspace());
  const [sessionRole, setSessionRole] = useState(() => readSession()?.role ?? null);
  const [search, setSearch] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState('');

  useEffect(() => {
    const reload = () => setWorkspace(readShippingPhase1Workspace());
    reload();
    setSessionRole(readSession()?.role ?? null);
    window.addEventListener(shippingPhase1UpdatedEvent, reload as EventListener);
    window.addEventListener(manualCorridorStorageUpdatedEvent, reload as EventListener);
    return () => {
      window.removeEventListener(shippingPhase1UpdatedEvent, reload as EventListener);
      window.removeEventListener(manualCorridorStorageUpdatedEvent, reload as EventListener);
    };
  }, []);

  const cases = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return workspace.afterSales.filter((item) => {
      if (!needle) return true;
      return [item.bookingId, item.tripId, item.customerName, item.summary, item.inlandNode].join(' ').toLowerCase().includes(needle);
    });
  }, [search, workspace.afterSales]);

  const selectedCase = cases.find((item) => item.bookingId === selectedBookingId) || cases[0] || null;

  useEffect(() => {
    if (!selectedBookingId && cases[0]?.bookingId) {
      setSelectedBookingId(cases[0].bookingId);
    }
  }, [cases, selectedBookingId]);

  const kpis = {
    openCases: workspace.afterSales.filter((item) => item.status === 'open').length,
    feedbackPending: workspace.afterSales.filter((item) => item.status === 'feedback_pending').length,
    resolved: workspace.afterSales.filter((item) => item.status === 'resolved').length,
    rated: workspace.afterSales.filter((item) => item.rating > 0).length,
  };
  const canResolve = canOperateShippingAction(sessionRole, 'after_sales_resolve');
  const canRate = canOperateShippingAction(sessionRole, 'after_sales_rate');

  return (
    <main className="shell">
      <section className="supplier-desk-shell">
        <header className="supplier-desk-header">
          <div className="supplier-desk-title">
            <span className="supplier-desk-eyebrow">Shipping Phase 5</span>
            <h1>After-Sales and Feedback</h1>
            <p>Post-delivery issues, complaints, support calls, and customer feedback in one shared after-sales queue.</p>
          </div>
          <div className="supplier-desk-toolbar">
            <input className="supplier-desk-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search booking, customer, issue, node" />
          </div>
        </header>

        <nav className="supplier-jump-links">
          <Link className="supplier-jump-link" href="/shipping/carrier-schedules">Carrier Schedules</Link>
          <Link className="supplier-jump-link is-active" href="/shipping/after-sales">After-Sales</Link>
          <Link className="supplier-jump-link" href="/shipping/finance">Finance</Link>
          <Link className="supplier-jump-link" href="/shipping/tracking">Tracking</Link>
          <Link className="supplier-jump-link" href="/shipping">Full workspace</Link>
        </nav>

        <section className="supplier-summary-grid">
          <article className="supplier-summary-card"><span>Open cases</span><strong>{kpis.openCases}</strong><p>Customer issues and complaints still active.</p></article>
          <article className="supplier-summary-card"><span>Feedback pending</span><strong>{kpis.feedbackPending}</strong><p>Closed deliveries still waiting for a customer rating.</p></article>
          <article className="supplier-summary-card"><span>Resolved</span><strong>{kpis.resolved}</strong><p>After-sales items already closed.</p></article>
          <article className="supplier-summary-card"><span>Rated shipments</span><strong>{kpis.rated}</strong><p>Files that already captured customer feedback.</p></article>
        </section>

        <section className="shipping-phase4-layout">
          <article className="supplier-panel">
            <header className="supplier-panel-header">
              <div>
                <span className="supplier-panel-eyebrow">After-sales queue</span>
                <h2>Post-delivery cases</h2>
              </div>
              <p>{cases.length} files</p>
            </header>
            <div className="supplier-queue-list shipping-phase2-queue">
              {cases.map((item) => (
                <button key={item.bookingId} type="button" className={item.bookingId === selectedCase?.bookingId ? 'supplier-queue-row active' : 'supplier-queue-row'} onClick={() => setSelectedBookingId(item.bookingId)}>
                  <div className="supplier-queue-topline">
                    <strong>{item.bookingId}</strong>
                    <span className={`status-badge ${item.status === 'resolved' ? 'good' : item.status === 'feedback_pending' ? 'warning' : 'critical'}`}>{item.status.replace(/_/g, ' ')}</span>
                  </div>
                  <span>{item.customerName}</span>
                  <span>{item.summary}</span>
                </button>
              ))}
            </div>
          </article>

          <div className="shipping-phase4-main">
            <article className="supplier-panel">
              <header className="supplier-panel-header">
                <div>
                  <span className="supplier-panel-eyebrow">Case detail</span>
                  <h2>{selectedCase?.bookingId || 'After-sales case'}</h2>
                </div>
                <p>{selectedCase?.status || 'Pending'}</p>
              </header>
              {selectedCase ? (
                <>
                  <div className="shipping-phase-detail-list">
                    <div className="shipping-phase-detail-row"><span>Trip</span><strong>{selectedCase.tripId}</strong></div>
                    <div className="shipping-phase-detail-row"><span>Customer</span><strong>{selectedCase.customerName}</strong></div>
                    <div className="shipping-phase-detail-row"><span>Node</span><strong>{selectedCase.inlandNode}</strong></div>
                    <div className="shipping-phase-detail-row"><span>Kind</span><strong>{selectedCase.kind.replace(/_/g, ' ')}</strong></div>
                    <div className="shipping-phase-detail-row"><span>Opened</span><strong>{formatDate(selectedCase.openedAt)}</strong></div>
                    <div className="shipping-phase-detail-row"><span>Resolved</span><strong>{formatDate(selectedCase.resolvedAt)}</strong></div>
                    <div className="shipping-phase-detail-row"><span>Rating</span><strong>{selectedCase.rating ? `${selectedCase.rating}/5` : 'Pending'}</strong></div>
                  </div>
                  <div className="shipping-phase-note">
                    <span>Summary</span>
                    <p>{selectedCase.summary}</p>
                  </div>
                  <div className="shipping-phase-note">
                    <span>Next action</span>
                    <p>{selectedCase.nextAction}</p>
                  </div>
                  {!canResolve || !canRate ? (
                    <div className="shipping-phase-note is-blocked">
                      <span>Desk ownership</span>
                      <p>After-sales resolution belongs to {shippingActionOwner('after_sales_resolve')}.</p>
                    </div>
                  ) : null}
                  <div className="supplier-inline-actions">
                    <button type="button" className="supplier-desk-button supplier-desk-button-secondary" disabled={selectedCase.status === 'resolved' || !canResolve} onClick={() => resolveShippingAfterSalesCase(selectedCase.bookingId)}>
                      Resolve case
                    </button>
                    <button type="button" className="supplier-desk-button supplier-desk-button-secondary" disabled={!canRate} onClick={() => rateShippingAfterSalesCase(selectedCase.bookingId, 4)}>
                      Rate 4/5
                    </button>
                    <button type="button" className="supplier-desk-button supplier-desk-button-primary" disabled={!canRate} onClick={() => rateShippingAfterSalesCase(selectedCase.bookingId, 5)}>
                      Rate 5/5
                    </button>
                  </div>
                </>
              ) : (
                <div className="supplier-check-item is-pending"><strong>No after-sales case</strong><p>Closed shipments and post-delivery issues will appear here.</p></div>
              )}
            </article>
          </div>

          <aside className="shipping-phase4-side">
            <article className="supplier-panel">
              <header className="supplier-panel-header">
                <div>
                  <span className="supplier-panel-eyebrow">Customer loop</span>
                  <h2>After-sales status guide</h2>
                </div>
              </header>
              <div className="shipping-monitor-alerts">
                <div className="shipping-monitor-alert is-info">
                  <strong>Feedback pending</strong>
                  <span>Closed delivery with thank-you follow-up sent, but rating not captured yet.</span>
                </div>
                <div className="shipping-monitor-alert is-warning">
                  <strong>Open issue / complaint</strong>
                  <span>Customer reported a post-delivery service issue that still needs resolution.</span>
                </div>
                <div className="shipping-monitor-alert is-good">
                  <strong>Resolved</strong>
                  <span>Case is closed and the customer feedback loop is complete.</span>
                </div>
              </div>
            </article>
          </aside>
        </section>
      </section>
    </main>
  );
}
