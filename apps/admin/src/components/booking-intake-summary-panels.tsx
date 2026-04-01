'use client';

import Link from 'next/link';

type SummaryRow = {
  label: string;
  amount: number;
  currency: string;
};

type ReadinessItem = {
  label: string;
  value: string;
};

type CopilotAction = {
  id: 'customer_preset' | 'route_preset' | 'readiness_baseline' | 'commercial_baseline';
  label: string;
};

type CopilotInsight = {
  score: number;
  status: 'ready' | 'watch' | 'blocked';
  headline: string;
  blockers: string[];
  recommendations: string[];
  highlights: string[];
};

type BookingIntakeSummaryPanelsProps = {
  liveQuoteSummary: {
    title: string;
    rows: SummaryRow[];
    note: string | null;
  };
  validityDate: string;
  snapshot: {
    bookingType: string;
    route: string;
    cargo: string;
    equipment: string;
    targetDeparture: string;
    customer: string;
  };
  readinessItems: ReadinessItem[];
  copilotInsight: CopilotInsight;
  copilotActions: CopilotAction[];
  onRunCopilotAction: (actionId: CopilotAction['id']) => void;
  nextAction: {
    title: string;
    currentStepLabel: string;
    description: string;
    primaryLabel: string;
    bookingDeskHref: string;
    bookingDeskLabel: string;
    showDeskLink: boolean;
    latestRecord: string;
  };
  onPrimaryAction: () => void;
};

export function BookingIntakeSummaryPanels({
  liveQuoteSummary,
  validityDate,
  snapshot,
  readinessItems,
  copilotInsight,
  copilotActions,
  onRunCopilotAction,
  nextAction,
  onPrimaryAction,
}: BookingIntakeSummaryPanelsProps) {
  return (
    <aside className="booking-intake-summary-column">
      <article className="booking-intake-summary-card" data-testid="live-quote-summary">
        <div className="booking-intake-card-header"><span>Live Quote Summary</span><h2>{liveQuoteSummary.title}</h2></div>
        <div className="booking-summary-list">
          {liveQuoteSummary.rows.map((row) => (
            <div key={row.label}><span>{row.label}</span><strong>{row.amount < 0 ? '- ' : ''}{row.currency} {Math.abs(row.amount).toLocaleString('en-US')}</strong></div>
          ))}
          <div><span>Validity date</span><strong>{validityDate}</strong></div>
        </div>
        {liveQuoteSummary.note ? <p className="booking-adaptive-note">{liveQuoteSummary.note}</p> : null}
      </article>

      <article className="booking-intake-summary-card">
        <div className="booking-intake-card-header"><span>Shipment Snapshot</span><h2>Current shipment view</h2></div>
        <div className="booking-snapshot-grid">
          <div><span>Booking type</span><strong>{snapshot.bookingType}</strong></div>
          <div><span>Route</span><strong>{snapshot.route}</strong></div>
          <div><span>Cargo</span><strong>{snapshot.cargo}</strong></div>
          <div><span>Equipment</span><strong>{snapshot.equipment}</strong></div>
          <div><span>Target departure</span><strong>{snapshot.targetDeparture}</strong></div>
          <div><span>Customer</span><strong>{snapshot.customer}</strong></div>
        </div>
      </article>

      <article className="booking-intake-summary-card">
        <div className="booking-intake-card-header"><span>Operational Readiness</span><h2>Current flags</h2></div>
        <div className="booking-readiness-list">
          {readinessItems.map((item) => (
            <div key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>
          ))}
        </div>
      </article>

      <article className={`booking-intake-summary-card booking-copilot-card is-${copilotInsight.status}`}>
        <div className="booking-intake-card-header"><span>AI Operations Copilot</span><h2>{copilotInsight.headline}</h2></div>
        <div className="booking-copilot-scoreband">
          <div>
            <span>Readiness score</span>
            <strong>{copilotInsight.score}<small>/100</small></strong>
          </div>
          <div className={`booking-copilot-status status-${copilotInsight.status}`}>
            {copilotInsight.status === 'ready' ? 'Ready' : copilotInsight.status === 'watch' ? 'Watchlist' : 'Blocked'}
          </div>
        </div>
        {copilotInsight.blockers.length ? (
          <div className="booking-copilot-block">
            <span>Blockers</span>
            <ul>
              {copilotInsight.blockers.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        ) : null}
        <div className="booking-copilot-block">
          <span>Recommendations</span>
          <ul>
            {copilotInsight.recommendations.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
        <div className="booking-copilot-highlights">
          {copilotInsight.highlights.slice(0, 3).map((item) => <div key={item}>{item}</div>)}
        </div>
        {copilotActions.length ? (
          <div className="booking-copilot-actions">
            {copilotActions.map((action) => (
              <button key={action.id} type="button" className="btn btn-secondary btn-compact" onClick={() => onRunCopilotAction(action.id)}>
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
      </article>

      <article className="booking-intake-summary-card booking-next-action-card">
        <div className="booking-intake-card-header"><span>Next Action</span><h2>{nextAction.title}</h2></div>
        <div className="booking-next-step-state">Current step: {nextAction.currentStepLabel}</div>
        <p>{nextAction.description}</p>
        <button type="button" className="btn btn-compact next-action-pulse" onClick={onPrimaryAction}>{nextAction.primaryLabel}</button>
        {nextAction.showDeskLink ? <Link href={nextAction.bookingDeskHref} className="btn btn-secondary btn-compact">{nextAction.bookingDeskLabel}</Link> : null}
        {nextAction.latestRecord ? <div className="booking-last-record">Latest record: {nextAction.latestRecord}</div> : null}
      </article>
    </aside>
  );
}
