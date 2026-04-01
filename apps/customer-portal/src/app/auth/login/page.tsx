import { CustomerLoginForm } from './login-form';
import { demoScenarioToolsEnabled } from '../../../lib/runtime-flags';

export default function CustomerLoginPage() {
  return (
    <main className="portal-auth-shell">
      <section className="portal-auth-layout">
        <article className="portal-auth-hero">
          <div className="portal-auth-brand">
            <div className="portal-brand-mark">TA</div>
            <div className="portal-auth-brand-copy">
              <span>Tikur Abay Customer Portal</span>
              <h1>Follow the shipment from origin to receipt confirmation.</h1>
            </div>
          </div>
          <p className="portal-auth-lead">
            Customer access is focused on shipment visibility, document review,
            receipt confirmation, support, and empty-return follow-up across the
            full Tikur Abay cargo journey.
          </p>
          <div className="portal-auth-feature-list">
            <div className="portal-auth-feature">
              <strong>Shipment visibility that matches operations</strong>
              <span>See origin, vessel, Djibouti release, inland transit, delivery, and empty return in one customer-facing flow.</span>
            </div>
            <div className="portal-auth-feature">
              <strong>Documents stay linked to the shipment</strong>
              <span>BL, invoice, packing list, customs packet, POD, and return receipt remain visible in the same record.</span>
            </div>
            <div className="portal-auth-feature">
              <strong>Receipt confirmation is part of closure</strong>
              <span>Customers confirm clean delivery or raise shortage and damage before the shipment can fully close.</span>
            </div>
          </div>
        </article>

        <article className="portal-auth-card">
          <div className="portal-auth-card-head">
            <span className="portal-section-eyebrow">Customer Sign In</span>
            <h2>Open your shipment workspace</h2>
            <p>{demoScenarioToolsEnabled ? 'Use the current prepared customer access below for local validation.' : 'Sign in with your assigned customer access credentials.'}</p>
          </div>
          {demoScenarioToolsEnabled ? (
            <div className="portal-auth-demo-note">
              <strong>Local access</strong>
              <span>`customer1@tikurabay.com` / `ChangeMe123!`</span>
            </div>
          ) : null}
          <CustomerLoginForm />
        </article>
      </section>
    </main>
  );
}
