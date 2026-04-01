import Link from 'next/link';
import { PortalFrame } from '../components/portal-frame';

export default async function CustomerPortalHomePage() {
  return (
    <PortalFrame
      currentPath="/"
      title="Shipment Visibility Dashboard"
      subtitle="Track shipment progress, documents, support, and customer confirmation in one stable workspace."
    >
      <section className="portal-card">
        <div className="portal-section-header">
          <div>
            <div className="portal-section-eyebrow">Workspace</div>
            <h2>Start from your live customer workflows</h2>
          </div>
        </div>
        <p style={{ marginTop: 0 }}>Use booking, shipment, documents, and support views to work from real customer-linked records only.</p>
        <div className="portal-actions">
          <Link className="portal-btn" href="/bookings">Open Booking / Quote</Link>
          <Link className="portal-btn secondary" href="/shipments">Open shipment tracking</Link>
        </div>
      </section>
      <section className="portal-grid two">
        <article className="portal-card">
          <div className="portal-section-header">
            <div>
              <div className="portal-section-eyebrow">Tracking</div>
              <h2>Shipment visibility</h2>
            </div>
          </div>
          <div className="portal-list">
            <div className="portal-list-row">
              <div>
                <strong>Live shipment timeline</strong>
                <p>Open the shipment workspace to see current stage, inland progress, and customer confirmation state.</p>
              </div>
              <span className="portal-status-chip info">Tracking</span>
            </div>
            <div className="portal-list-row">
              <div>
                <strong>Documents and receipts</strong>
                <p>Review shared customer-visible documents without exposing internal desk-only workflow notes.</p>
              </div>
              <span className="portal-status-chip">Documents</span>
            </div>
          </div>
        </article>
        <article className="portal-card">
          <div className="portal-section-header">
            <div>
              <div className="portal-section-eyebrow">Next action</div>
              <h2>Where to work next</h2>
            </div>
          </div>
          <div className="portal-list">
            <div className="portal-list-row">
              <div>
                <strong>Review quote or booking status</strong>
                <p>Start with Booking / Quote for approvals, revisions, and new requests.</p>
              </div>
              <span className="portal-status-chip info">Commercial</span>
            </div>
            <div className="portal-list-row">
              <div>
                <strong>Confirm receipt or raise an issue</strong>
                <p>Use Shipments and Support once inland arrival and POD updates are visible.</p>
              </div>
              <span className="portal-status-chip warning">Action</span>
            </div>
          </div>
        </article>
      </section>
    </PortalFrame>
  );
}
