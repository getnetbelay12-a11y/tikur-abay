'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { readSession } from '../lib/auth-session';
import {
  assignShippingCarrierSchedule,
  canOperateShippingAction,
  readShippingPhase1Workspace,
  shippingActionOwner,
  shippingCtaLabel,
  shippingStageLabel,
  shippingPhase1UpdatedEvent,
} from '../lib/shipping-phase1';
import { sharedQuoteStorageUpdatedEvent } from '../lib/shared-quote-storage';

function formatDate(value: string) {
  if (!value) return 'Pending';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function ShippingPhase6CarrierWorkspace() {
  const [workspace, setWorkspace] = useState(() => readShippingPhase1Workspace());
  const [sessionRole, setSessionRole] = useState(() => readSession()?.role ?? null);
  const [search, setSearch] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [selectedScheduleId, setSelectedScheduleId] = useState('');

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

  const bookings = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return workspace.bookings.filter((booking) => {
      if (!needle) return true;
      return [booking.bookingId, booking.customerName, booking.routeSummary].join(' ').toLowerCase().includes(needle);
    });
  }, [search, workspace.bookings]);

  const schedules = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return workspace.carrierSchedules.filter((schedule) => {
      if (!needle) return true;
      return [schedule.carrierName, schedule.vesselName, schedule.voyageNumber, schedule.portOfLoading, schedule.portOfDischarge].join(' ').toLowerCase().includes(needle);
    });
  }, [search, workspace.carrierSchedules]);

  const selectedBooking = bookings.find((item) => item.bookingId === selectedBookingId) || bookings[0] || null;
  const selectedSchedule = schedules.find((item) => item.scheduleId === selectedScheduleId) || schedules[0] || null;
  const selectedBill = workspace.billsOfLading.find((item) => item.bookingId === selectedBooking?.bookingId) || null;
  const selectedManifest = workspace.manifests.find((item) => item.bookingId === selectedBooking?.bookingId) || null;

  useEffect(() => {
    if (!selectedBookingId && bookings[0]?.bookingId) setSelectedBookingId(bookings[0].bookingId);
  }, [bookings, selectedBookingId]);

  useEffect(() => {
    if (!selectedScheduleId && schedules[0]?.scheduleId) setSelectedScheduleId(schedules[0].scheduleId);
  }, [schedules, selectedScheduleId]);

  const kpis = {
    openSchedules: workspace.carrierSchedules.filter((item) => item.status === 'open').length,
    closingSoon: workspace.carrierSchedules.filter((item) => item.status === 'closing_soon').length,
    departed: workspace.carrierSchedules.filter((item) => item.status === 'departed').length,
    scheduledBookings: workspace.billsOfLading.filter((item) => item.vesselName && item.voyageNumber).length,
  };
  const canAssignSchedule = canOperateShippingAction(sessionRole, 'carrier_schedule_assign');

  return (
    <main className="shell">
      <section className="supplier-desk-shell">
        <header className="supplier-desk-header">
          <div className="supplier-desk-title">
            <span className="supplier-desk-eyebrow">Shipping Phase 6</span>
            <h1>Carrier Schedules</h1>
            <p>Assign bookings to a real vessel schedule so BL and manifest use one consistent carrier, vessel, and voyage source.</p>
          </div>
          <div className="supplier-desk-toolbar">
            <input className="supplier-desk-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search booking, vessel, voyage, route" />
          </div>
        </header>

        <nav className="supplier-jump-links">
          <Link className="supplier-jump-link is-active" href="/shipping/carrier-schedules">Carrier Schedules</Link>
          <Link className="supplier-jump-link" href="/shipping/instructions">Shipping Instructions</Link>
          <Link className="supplier-jump-link" href="/shipping/bills-of-lading">Bills of Lading</Link>
          <Link className="supplier-jump-link" href="/shipping/manifest">Manifest</Link>
          <Link className="supplier-jump-link" href="/shipping">Full workspace</Link>
        </nav>

        <section className="supplier-summary-grid">
          <article className="supplier-summary-card"><span>Open sailings</span><strong>{kpis.openSchedules}</strong><p>Carrier schedules still available for assignment.</p></article>
          <article className="supplier-summary-card"><span>Closing soon</span><strong>{kpis.closingSoon}</strong><p>Sailings near cutoff and needing booking commitment.</p></article>
          <article className="supplier-summary-card"><span>Departed</span><strong>{kpis.departed}</strong><p>Schedules already past departure and locked.</p></article>
          <article className="supplier-summary-card"><span>Scheduled bookings</span><strong>{kpis.scheduledBookings}</strong><p>BL files already tied to a vessel and voyage.</p></article>
        </section>

        <section className="shipping-phase4-layout">
          <article className="supplier-panel">
            <header className="supplier-panel-header">
              <div>
                <span className="supplier-panel-eyebrow">Bookings</span>
                <h2>Schedule assignment queue</h2>
              </div>
              <p>{bookings.length} files</p>
            </header>
            <div className="supplier-queue-list shipping-phase2-queue">
              {bookings.map((booking) => (
                <button key={booking.bookingId} type="button" className={booking.bookingId === selectedBooking?.bookingId ? 'supplier-queue-row active' : 'supplier-queue-row'} onClick={() => setSelectedBookingId(booking.bookingId)}>
                  <div className="supplier-queue-topline">
                    <strong>{booking.bookingId}</strong>
                    <span className="status-badge info">{shippingStageLabel(booking.currentStage)}</span>
                  </div>
                  <span>{booking.customerName}</span>
                  <span>{booking.routeSummary}</span>
                </button>
              ))}
            </div>
          </article>

          <div className="shipping-phase4-main">
            <article className="supplier-panel">
              <header className="supplier-panel-header">
                <div>
                  <span className="supplier-panel-eyebrow">Carrier schedule</span>
                  <h2>{selectedSchedule?.vesselName || 'Vessel schedule'}</h2>
                </div>
                <p>{selectedSchedule?.status || 'Pending'}</p>
              </header>
              {selectedSchedule ? (
                <>
                  <div className="shipping-phase-detail-list">
                    <div className="shipping-phase-detail-row"><span>Carrier</span><strong>{selectedSchedule.carrierName}</strong></div>
                    <div className="shipping-phase-detail-row"><span>Vessel</span><strong>{selectedSchedule.vesselName}</strong></div>
                    <div className="shipping-phase-detail-row"><span>Voyage</span><strong>{selectedSchedule.voyageNumber}</strong></div>
                    <div className="shipping-phase-detail-row"><span>Origin</span><strong>{selectedSchedule.portOfLoading}</strong></div>
                    <div className="shipping-phase-detail-row"><span>Discharge</span><strong>{selectedSchedule.portOfDischarge}</strong></div>
                    <div className="shipping-phase-detail-row"><span>ETD</span><strong>{formatDate(selectedSchedule.etd)}</strong></div>
                    <div className="shipping-phase-detail-row"><span>ETA Djibouti</span><strong>{formatDate(selectedSchedule.etaDjibouti)}</strong></div>
                    <div className="shipping-phase-detail-row"><span>Capacity</span><strong>{selectedSchedule.bookedContainers}/{selectedSchedule.capacityTeu} TEU</strong></div>
                  </div>
                  <div className="supplier-inline-actions">
                    <button type="button" className="supplier-desk-button supplier-desk-button-primary" disabled={!selectedBooking || selectedSchedule.status === 'departed' || !canAssignSchedule} onClick={() => selectedBooking && assignShippingCarrierSchedule(selectedBooking.bookingId, selectedSchedule.scheduleId)}>
                      {shippingCtaLabel('assign_schedule_to_booking')}
                    </button>
                  </div>
                  {!canAssignSchedule ? (
                    <div className="shipping-phase-note is-blocked">
                      <span>Desk ownership</span>
                      <p>Carrier schedule assignment belongs to {shippingActionOwner('carrier_schedule_assign')}.</p>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="supplier-check-item is-pending"><strong>No schedule selected</strong><p>Select a carrier schedule to assign it to the booking queue.</p></div>
              )}
            </article>

            <article className="supplier-panel">
              <header className="supplier-panel-header">
                <div>
                  <span className="supplier-panel-eyebrow">Document sync</span>
                  <h2>Booking schedule result</h2>
                </div>
                <p>{selectedBooking?.bookingId || 'Pending'}</p>
              </header>
              {selectedBooking ? (
                <>
                  <div className="shipping-phase-detail-list">
                    <div className="shipping-phase-detail-row"><span>Booking</span><strong>{selectedBooking.bookingId}</strong></div>
                    <div className="shipping-phase-detail-row"><span>Customer</span><strong>{selectedBooking.customerName}</strong></div>
                    <div className="shipping-phase-detail-row"><span>BL carrier</span><strong>{selectedBill?.carrierName || 'Pending'}</strong></div>
                    <div className="shipping-phase-detail-row"><span>BL vessel</span><strong>{selectedBill?.vesselName || 'Pending'}</strong></div>
                    <div className="shipping-phase-detail-row"><span>BL voyage</span><strong>{selectedBill?.voyageNumber || 'Pending'}</strong></div>
                    <div className="shipping-phase-detail-row"><span>Manifest vessel</span><strong>{selectedManifest?.vesselName || 'Pending'}</strong></div>
                    <div className="shipping-phase-detail-row"><span>Manifest voyage</span><strong>{selectedManifest?.voyageNumber || 'Pending'}</strong></div>
                  </div>
                  <div className="shipping-phase-note">
                    <span>Operational rule</span>
                    <p>Carrier schedule assignment should happen before BL finalization so the vessel and voyage stay aligned through manifest generation.</p>
                  </div>
                </>
              ) : (
                <div className="supplier-check-item is-pending"><strong>No booking selected</strong><p>Choose a booking to see how carrier schedule assignment will feed BL and manifest.</p></div>
              )}
            </article>
          </div>

          <aside className="shipping-phase4-side">
            <article className="supplier-panel">
              <header className="supplier-panel-header">
                <div>
                  <span className="supplier-panel-eyebrow">Schedule alerts</span>
                  <h2>Cutoff and departure monitor</h2>
                </div>
              </header>
              <div className="shipping-monitor-alerts">
                {workspace.carrierAlerts.length ? workspace.carrierAlerts.map((alert) => (
                  <div key={alert.id} className={`shipping-monitor-alert is-${alert.tone}`}>
                    <strong>{alert.title}</strong>
                    <span>{alert.description}</span>
                  </div>
                )) : (
                  <div className="shipping-monitor-alert is-good">
                    <strong>No active carrier alert</strong>
                    <span>Current sailings are outside the cutoff and departure risk window.</span>
                  </div>
                )}
              </div>
            </article>

            <article className="supplier-panel">
              <header className="supplier-panel-header">
                <div>
                  <span className="supplier-panel-eyebrow">Sailing board</span>
                  <h2>Available schedules</h2>
                </div>
              </header>
              <div className="shipping-monitor-alerts">
                {schedules.map((schedule) => (
                  <button key={schedule.scheduleId} type="button" className={`shipping-monitor-alert is-${schedule.status === 'closing_soon' ? 'warning' : schedule.status === 'departed' ? 'info' : 'good'}`} onClick={() => setSelectedScheduleId(schedule.scheduleId)}>
                    <strong>{schedule.carrierName} · {schedule.vesselName}</strong>
                    <span>{schedule.voyageNumber} · {schedule.portOfLoading} to {schedule.portOfDischarge}</span>
                    <span>ETD {formatDate(schedule.etd)} · ETA {formatDate(schedule.etaDjibouti)}</span>
                  </button>
                ))}
              </div>
            </article>
          </aside>
        </section>
      </section>
    </main>
  );
}
