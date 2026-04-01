'use client';

import { useMemo, useState } from 'react';
import { allPayments, customerShipments } from '../lib/demo-logistics';

export function PaymentsCenter() {
  const [shipmentFilter, setShipmentFilter] = useState<'all' | string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');

  const rows = useMemo(() => {
    return allPayments.filter((payment) => {
      const matchesShipment = shipmentFilter === 'all' || payment.shipmentRef === shipmentFilter;
      const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
      return matchesShipment && matchesStatus;
    });
  }, [shipmentFilter, statusFilter]);

  return (
    <section className="portal-grid">
      <article className="portal-card">
        <div className="portal-section-header">
          <div>
            <div className="portal-section-eyebrow">Payments</div>
            <h2>Invoices, receipts, and customer actions</h2>
          </div>
        </div>
        <div className="portal-toolbar">
          <select className="portal-select" value={shipmentFilter} onChange={(event) => setShipmentFilter(event.target.value)}>
            <option value="all">All shipments</option>
            {customerShipments.map((shipment) => (
              <option key={shipment.shipmentRef} value={shipment.shipmentRef}>{shipment.bookingNumber}</option>
            ))}
          </select>
          <select className="portal-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All status</option>
            <option value="Unpaid">Unpaid</option>
            <option value="Paid">Paid</option>
            <option value="Overdue">Overdue</option>
            <option value="Under review">Under review</option>
          </select>
        </div>
        <div className="portal-payment-list">
          {rows.length ? rows.map((payment) => (
            <div key={payment.id} className="portal-payment-row">
              <div>
                <strong>{payment.invoiceNumber} · {payment.shipmentRef}</strong>
                <p>{payment.description}</p>
                <p>Due {payment.dueDate}</p>
              </div>
              <div className="portal-actions">
                <span className="portal-status-chip">{payment.amount}</span>
                <span className={`portal-status-chip ${payment.status === 'Paid' ? 'success' : payment.status === 'Overdue' ? 'danger' : payment.status === 'Under review' ? 'warning' : ''}`}>{payment.status}</span>
                <button type="button" className="portal-btn secondary">View invoice</button>
                <button type="button" className="portal-btn secondary">View receipt</button>
                <button type="button" className="portal-btn secondary">Contact finance</button>
              </div>
            </div>
          )) : (
            <div className="portal-payment-row">
              <div>
                <strong>No payment record matches this filter</strong>
                <p>Try a different shipment or payment status.</p>
              </div>
              <div className="portal-actions">
                <span className="portal-status-chip">No finance event</span>
              </div>
            </div>
          )}
        </div>
      </article>
    </section>
  );
}
