import Link from 'next/link';
import { demoScenarioToolsEnabled } from '../../lib/runtime-flags';

export const dynamic = 'force-dynamic';

const localAccounts = [
  ['Executive', 'executive@tikurabay.com'],
  ['Operations Manager', 'opsmanager@tikurabay.com'],
  ['Dispatcher', 'dispatcher@tikurabay.com'],
  ['Technical Manager', 'technical@tikurabay.com'],
  ['Finance', 'finance@tikurabay.com'],
  ['HR', 'hr@tikurabay.com'],
  ['Marketing', 'marketing@tikurabay.com'],
  ['Driver', 'driver.fixed@tikurabay.com'],
  ['Customer', 'customer1@tikurabay.com'],
];

const rehearsal = [
  ['Executive', 'Open dashboard, scan the five questions, drill to operations and finance, confirm no duplicate summaries.'],
  ['Operations Manager', 'Assign a vehicle, review blocked units, inspect fleet board, open detail drawer, confirm dispatch flow.'],
  ['Dispatcher', 'Track open trips, review driver reports, open live map, send follow-up in chat.'],
  ['Marketing', 'Review lead pipeline, open quote table, validate pending agreements and available vehicles by branch.'],
  ['Finance', 'Review outstanding invoices, open collections queue, inspect payment drawer, confirm payout summary.'],
  ['HR', 'Review onboarding, KYC queue, driving school dashboard, expiry alerts, and people actions.'],
  ['Driver', 'Log in on mobile, open assigned trip, submit a report, upload a document, confirm alerts.'],
  ['Customer', 'Open customer desk, review trips, documents, payments, and agreement state.'],
];

const rolloutPhases = [
  ['Phase 1', 'Executive, operations, fleet, and maintenance'],
  ['Phase 2', 'Customers, agreements, payments, and notifications'],
  ['Phase 3', 'HR, KYC, driving school, chat, and settings'],
];

const training = [
  ['Executive', 'Login, dashboard scan, drill-downs, decision pages, refresh cadence'],
  ['Operations', 'Operations Hub, live map, trips, vehicle assignment, escalation handling'],
  ['Marketing', 'Leads, quotes, agreements, customer accounts, available fleet view'],
  ['Finance', 'Payments, invoices, collections, route margin, payout summary'],
  ['HR', 'HR console, driver KYC, expiry alerts, driving school workflow'],
  ['Driver', 'Trip tab, report actions, docs upload, alerts review'],
  ['Customer', 'Bookings, trips, documents, invoices, payments'],
];

const readiness = [
  'Rotate local and production secrets before pilot.',
  'Verify Atlas connectivity and backup/restore procedures.',
  'Run permission audit for all seeded roles.',
  'Reconfirm mobile document upload and local file serving.',
  'Verify agreement signing flow end to end.',
  'Verify payment posting and receipt visibility.',
  'Run browser route smoke across all sidebar items before pilot kickoff.',
];

export default function SettingsPage() {
  return (
    <main className="shell">
      <div className="panel workspace-shell">
        <section className="workspace-header">
          <div className="workspace-header-copy">
            <h1>Settings</h1>
          </div>
        </section>

        <section className="workspace-split-grid">
          <section className="card workspace-detail-card">
            <div className="workspace-section-header">
              <div>
                <div className="eyebrow">Configuration</div>
                <h3>System defaults</h3>
              </div>
              <Link className="btn btn-secondary btn-compact" href="/settings/launch">Open launch center</Link>
            </div>
            <div className="workspace-detail-list">
              <Row title="Organization settings" subtitle="Tikur Abay HQ, Africa/Addis_Ababa, ETB currency, English and Amharic enabled." />
              <Row title="Notification rules" subtitle="Email and push on by default, SMS for urgent operational alerts only." />
              <Row title="Maintenance rules" subtitle="Tire inspection at 4000 km, brake and oil service at 10000 km, overdue blocks assignment when flagged." />
              <Row title="Agreement settings" subtitle="Signature link flow enabled with downloadable signed PDF and audit trail." />
              <Row title="Driving school settings" subtitle="DL follow-up enabled with payment and document visibility." />
              <Row title="Finance settings" subtitle="Collections escalation levels active, route profitability and payout summary enabled." />
            </div>
          </section>

          <section className="card workspace-detail-card">
            <div className="workspace-section-header">
              <div>
                <div className="eyebrow">Admin Tools</div>
                <h3>{demoScenarioToolsEnabled ? 'Local operations tools' : 'Production safeguards'}</h3>
              </div>
            </div>
            <div className="workspace-detail-list">
              {demoScenarioToolsEnabled ? (
                <>
                  <Row title="Reset local operational data" subtitle="Run `pnpm reset:local && pnpm seed:local` to rebuild the local operational dataset." />
                  <Row title="Seed operational data" subtitle="Run `pnpm seed:local` for the latest linked workflow dataset." />
                </>
              ) : (
                <>
                  <Row title="Scenario loader disabled" subtitle="Local scenario loading is disabled in production builds unless `ALLOW_DEMO_SCENARIO_TOOLS=true` is explicitly enabled." />
                  <Row title="Debug OTP disabled" subtitle="Production should keep `ALLOW_DEBUG_OTP=false` so mobile login never returns OTP codes in API responses." />
                </>
              )}
              <Row title="Export feedback logs" subtitle="Run `node scripts/export-feedback-template.js` to generate the pilot feedback CSV template." />
              <Row title="Launch docs" subtitle="See [pilot-rollout-checklist.md](/Users/getnetbelay/Documents/Tikur_Abay/docs/pilot-rollout-checklist.md) and [production-readiness-checklist.md](/Users/getnetbelay/Documents/Tikur_Abay/docs/production-readiness-checklist.md)." />
            </div>
          </section>
        </section>

        {demoScenarioToolsEnabled ? (
          <section className="card workspace-detail-card">
            <div className="workspace-section-header">
              <div>
                <div className="eyebrow">Local Accounts</div>
                <h3>Role-based operational access</h3>
              </div>
            </div>
            <div className="table-shell">
              <table className="data-table workspace-data-table">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Email</th>
                    <th>Password</th>
                  </tr>
                </thead>
                <tbody>
                  {localAccounts.map(([role, email]) => (
                    <tr key={role}>
                      <td>{role}</td>
                      <td>{email}</td>
                      <td>ChangeMe123!</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <section className="workspace-split-grid">
          <SectionTable title="Operational Rehearsal Checklist" rows={rehearsal} />
          <SectionTable title="Pilot Rollout Phases" rows={rolloutPhases} />
        </section>

        <section className="workspace-split-grid">
          <SectionTable title="Role-Based Training Outline" rows={training} />
          <section className="card workspace-detail-card">
            <div className="workspace-section-header">
              <div>
                <div className="eyebrow">Production Readiness</div>
                <h3>Pre-pilot checklist</h3>
              </div>
            </div>
            <div className="workspace-detail-list">
              {readiness.map((item) => <Row key={item} title={item} subtitle="Track completion in the production readiness checklist document." />)}
            </div>
          </section>
        </section>

        <section className="card workspace-detail-card">
          <div className="workspace-section-header">
            <div>
              <div className="eyebrow">UAT and Feedback</div>
              <h3>Checklist package</h3>
            </div>
            <Link className="btn btn-secondary btn-compact" href="/settings/launch">Run in app</Link>
          </div>
          <div className="workspace-detail-list">
            <Row title="UAT checklist" subtitle="Use [uat-role-checklists.md](/Users/getnetbelay/Documents/Tikur_Abay/docs/uat-role-checklists.md) for role-by-role page clarity, workflow, and defect capture." />
            <Row title="Pilot rollout plan" subtitle="Use [pilot-rollout-checklist.md](/Users/getnetbelay/Documents/Tikur_Abay/docs/pilot-rollout-checklist.md) for phase rollout and operational rehearsal." />
            <Row title="Production readiness" subtitle="Use [production-readiness-checklist.md](/Users/getnetbelay/Documents/Tikur_Abay/docs/production-readiness-checklist.md) before enabling pilot access." />
            <Row title="Go-live checklist" subtitle="Use [go-live-readiness-checklist.md](/Users/getnetbelay/Documents/Tikur_Abay/docs/go-live-readiness-checklist.md) for final production readiness review." />
            <Row title="Soft launch plan" subtitle="Use [soft-launch-plan.md](/Users/getnetbelay/Documents/Tikur_Abay/docs/soft-launch-plan.md) for limited-branch rollout planning." />
            <Row title="Daily operations review" subtitle="Use [daily-operations-review-checklist.md](/Users/getnetbelay/Documents/Tikur_Abay/docs/daily-operations-review-checklist.md) for launch monitoring." />
            <Row title="Weekly improvement workflow" subtitle="Use [weekly-improvement-workflow.md](/Users/getnetbelay/Documents/Tikur_Abay/docs/weekly-improvement-workflow.md) for issue triage and release planning." />
            <Row title="Full rollout checklist" subtitle="Use [full-rollout-checklist.md](/Users/getnetbelay/Documents/Tikur_Abay/docs/full-rollout-checklist.md) before enabling all branches." />
            <Row title="Pilot handoff summary" subtitle="Use [pilot-handoff-summary.md](/Users/getnetbelay/Documents/Tikur_Abay/docs/pilot-handoff-summary.md) for the short stakeholder briefing." />
            <Row title="Production go / no-go" subtitle="Use [production-go-no-go-checklist.md](/Users/getnetbelay/Documents/Tikur_Abay/docs/production-go-no-go-checklist.md) for the final launch decision." />
          </div>
          <div className="workspace-filter-actions">
            <Link className="btn btn-secondary btn-compact" href="/profile">Open profile</Link>
            <Link className="btn btn-secondary btn-compact" href="/users">Open user access</Link>
            <Link className="btn btn-secondary btn-compact" href="/settings/launch/report">Open launch report</Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function SectionTable({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <section className="card workspace-detail-card">
      <div className="workspace-section-header">
        <div>
          <div className="eyebrow">Launch Package</div>
          <h3>{title}</h3>
        </div>
      </div>
      <div className="workspace-detail-list">
        {rows.map(([left, right]) => <Row key={`${title}-${left}`} title={left} subtitle={right} />)}
      </div>
    </section>
  );
}

function Row({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="workspace-detail-row">
      <div className="workspace-cell-stack">
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
    </div>
  );
}
