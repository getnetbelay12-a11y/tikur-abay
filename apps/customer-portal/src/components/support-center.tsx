'use client';

import { useMemo, useState } from 'react';
import { allSupportThreads, customerShipments } from '../lib/demo-logistics';

export function SupportCenter() {
  const [shipmentFilter, setShipmentFilter] = useState<'all' | string>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all');

  const rows = useMemo(() => {
    return allSupportThreads.filter((thread) => {
      const matchesShipment = shipmentFilter === 'all' || thread.shipmentRef === shipmentFilter;
      const matchesCategory = categoryFilter === 'all' || thread.category === categoryFilter;
      return matchesShipment && matchesCategory;
    });
  }, [categoryFilter, shipmentFilter]);

  return (
    <section className="portal-grid">
      <article className="portal-card">
        <div className="portal-section-header">
          <div>
            <div className="portal-section-eyebrow">Support center</div>
            <h2>Active cases and shipment-linked messages</h2>
          </div>
          <button type="button" className="portal-btn">New support request</button>
        </div>
        <div className="portal-toolbar">
          <select className="portal-select" value={shipmentFilter} onChange={(event) => setShipmentFilter(event.target.value)}>
            <option value="all">All shipments</option>
            {customerShipments.map((shipment) => (
              <option key={shipment.shipmentRef} value={shipment.shipmentRef}>{shipment.bookingNumber}</option>
            ))}
          </select>
          <select className="portal-select" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="all">All categories</option>
            <option value="document">documents</option>
            <option value="customs">customs / release</option>
            <option value="delay">delay / issue</option>
            <option value="invoice">invoice / payment</option>
            <option value="delivery">POD / delivery</option>
            <option value="empty return">empty return</option>
            <option value="other">other</option>
          </select>
        </div>
        <div className="portal-support-list">
          {rows.length ? rows.map((thread) => (
            <div key={thread.id} className="portal-support-row">
              <div>
                <strong>{thread.title}</strong>
                <p>{thread.preview}</p>
                <p>{thread.shipmentRef} · {thread.timestamp}</p>
              </div>
              <div className="portal-actions">
                <span className="portal-status-chip info">{thread.channel}</span>
                <span className={`portal-status-chip ${thread.status === 'Resolved' ? 'success' : thread.status === 'Escalated' ? 'danger' : 'warning'}`}>{thread.status}</span>
              </div>
            </div>
          )) : (
            <div className="portal-support-row">
              <div>
                <strong>No support thread matches this filter</strong>
                <p>There is no shipment-linked support update for the current filter state.</p>
              </div>
              <div className="portal-actions">
                <span className="portal-status-chip">No support thread yet</span>
              </div>
            </div>
          )}
        </div>
      </article>
    </section>
  );
}
