'use client';

import { memo } from 'react';

type RiskSnapshot = {
  detentionRiskLevel: string;
  dryPortCollectionRiskLevel: string;
  emptyReturnReceiptStatus: string;
  tariffOwner: string;
};

type DemurrageControl = {
  chargeActive: boolean;
  statusLabel: string;
  chargeStartsAt: string;
};

type NotificationState = {
  lastError: string;
};

type PostDeliveryRecipients = {
  email: string;
  sms: string;
  telegram: string;
};

type PostDeliveryFollowUpSummary = {
  recipients: PostDeliveryRecipients;
  anyChannelSent: boolean;
};

type PostDeliveryLogState = {
  lastError: string;
};

type ExceptionItem = {
  severity: string;
  issueText: string;
};

export const YardSupportPanels = memo(function YardSupportPanels({
  postDeliveryFollowUp,
  selectedPostDeliveryFollowUp,
  selectedDemurrageNotification,
  riskSnapshot,
  demurrageControl,
  displayedExceptions,
  onMarkPostDeliveryFollowUp,
  onLogPostDeliveryIssue,
  onMarkDemurrageNotification,
  nextStepClassName,
}: {
  postDeliveryFollowUp: PostDeliveryFollowUpSummary;
  selectedPostDeliveryFollowUp: PostDeliveryLogState;
  selectedDemurrageNotification: NotificationState;
  riskSnapshot: RiskSnapshot;
  demurrageControl: DemurrageControl;
  displayedExceptions: ExceptionItem[];
  onMarkPostDeliveryFollowUp: (channel: 'email' | 'sms' | 'telegram' | 'all') => void;
  onLogPostDeliveryIssue: (kind: 'issue' | 'complaint' | 'call') => void;
  onMarkDemurrageNotification: (channel: 'email' | 'sms' | 'telegram' | 'all') => void;
  nextStepClassName: string;
}) {
  return (
    <>
      <article className="yard-panel yard-communication-panel" id="yard-customer">
        <header className="yard-panel-header">
          <div>
            <span className="yard-panel-eyebrow">Customer Communication</span>
            <h2>Customer Communication</h2>
          </div>
        </header>
        <div className="yard-contact-list">
          <div className="yard-contact-row"><span>Email</span><strong title={postDeliveryFollowUp.recipients.email}>{postDeliveryFollowUp.recipients.email}</strong></div>
          <div className="yard-contact-row"><span>Phone</span><strong>{postDeliveryFollowUp.recipients.sms}</strong></div>
          <div className="yard-contact-row"><span>Telegram</span><strong>{postDeliveryFollowUp.recipients.telegram}</strong></div>
        </div>
        <div className="yard-action-grid yard-action-grid-primary">
          <button type="button" disabled={postDeliveryFollowUp.anyChannelSent} className={`yard-desk-button yard-desk-button-primary ${nextStepClassName}`} onClick={() => onMarkPostDeliveryFollowUp('email')} data-testid="yard-send-thank-you">{postDeliveryFollowUp.anyChannelSent ? 'Thank-you sent' : 'Send thank-you message'}</button>
          <button type="button" className="yard-desk-button yard-desk-button-secondary" onClick={() => onMarkPostDeliveryFollowUp('sms')}>Send SMS</button>
          <button type="button" className="yard-desk-button yard-desk-button-secondary" onClick={() => onMarkPostDeliveryFollowUp('telegram')}>Send Telegram</button>
          <button type="button" className="yard-desk-button yard-desk-button-secondary" onClick={() => onMarkPostDeliveryFollowUp('all')}>Send all channels</button>
          <button type="button" className="yard-desk-button yard-desk-button-secondary" onClick={() => onLogPostDeliveryIssue('issue')}>Customer reported issue</button>
          <button type="button" className="yard-desk-button yard-desk-button-secondary" onClick={() => onLogPostDeliveryIssue('complaint')}>Submit complaint</button>
          <button type="button" className="yard-desk-button yard-desk-button-secondary" onClick={() => onLogPostDeliveryIssue('call')}>Log support call</button>
        </div>
        {selectedPostDeliveryFollowUp.lastError ? <p className="yard-follow-up-error">{selectedPostDeliveryFollowUp.lastError}</p> : null}
      </article>

      <article className="yard-panel yard-risk-panel">
        <header className="yard-panel-header">
          <div>
            <span className="yard-panel-eyebrow">Risk Control</span>
            <h2>Risk Control</h2>
          </div>
        </header>
        <div className="yard-risk-list">
          <div className={riskSnapshot.detentionRiskLevel === 'Safe' ? 'ops-field-row yard-risk-row is-complete' : 'ops-field-row yard-risk-row is-blocked'}><span>Detention risk</span><strong>{riskSnapshot.detentionRiskLevel}</strong></div>
          <div className={riskSnapshot.dryPortCollectionRiskLevel === 'Safe' ? 'ops-field-row yard-risk-row is-complete' : 'ops-field-row yard-risk-row is-pending'}><span>Collection risk</span><strong>{riskSnapshot.dryPortCollectionRiskLevel}</strong></div>
          <div className={riskSnapshot.emptyReturnReceiptStatus === 'uploaded' ? 'ops-field-row yard-risk-row is-complete' : 'ops-field-row yard-risk-row is-pending'}><span>Return receipt</span><strong>{riskSnapshot.emptyReturnReceiptStatus}</strong></div>
          <div className="ops-field-row yard-risk-row is-pending"><span>Tariff</span><strong>{riskSnapshot.tariffOwner}</strong></div>
        </div>
        <div className="ops-issue-card yard-open-issue-card">
          <span className={`yard-chip ${displayedExceptions[0]?.severity === 'High' ? 'yard-chip-high' : displayedExceptions[0]?.severity === 'Medium' ? 'yard-chip-medium' : 'yard-chip-ready'}`}>{displayedExceptions[0]?.severity || 'Low'}</span>
          <div className="ops-issue-copy">
            <strong>Open issue</strong>
            <p>{displayedExceptions[0]?.issueText || 'No open issue'}</p>
          </div>
        </div>
      </article>

      <article className="yard-panel yard-demurrage-simple-panel">
        <header className="yard-panel-header">
          <div>
            <span className="yard-panel-eyebrow">Demurrage Control</span>
            <h2>Demurrage Control</h2>
          </div>
        </header>
        <div className="yard-risk-list">
          <div className={demurrageControl.chargeActive ? 'yard-risk-row is-blocked' : 'yard-risk-row is-complete'}>
            <span>Charge state</span>
            <strong>{demurrageControl.statusLabel}</strong>
          </div>
          <div className="yard-risk-row is-pending">
            <span>Charge starts</span>
            <strong>{demurrageControl.chargeStartsAt}</strong>
          </div>
        </div>
        <div className="yard-demurrage-mini-actions">
          <button type="button" className="yard-desk-button yard-desk-button-secondary" onClick={() => onMarkDemurrageNotification('email')}>Email</button>
          <button type="button" className="yard-desk-button yard-desk-button-secondary" onClick={() => onMarkDemurrageNotification('sms')}>SMS</button>
          <button type="button" className="yard-desk-button yard-desk-button-secondary" onClick={() => onMarkDemurrageNotification('telegram')}>Telegram</button>
          <button type="button" className="yard-desk-button yard-desk-button-primary" onClick={() => onMarkDemurrageNotification('all')}>Send all</button>
        </div>
        {selectedDemurrageNotification.lastError ? <p className="yard-follow-up-error">{selectedDemurrageNotification.lastError}</p> : null}
      </article>
    </>
  );
});
