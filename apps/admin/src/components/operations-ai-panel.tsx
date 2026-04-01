import { type OperationsAiBrief } from '../lib/operations-ai-assistant';
import { useConsoleI18n } from '../lib/use-console-i18n';

export function OperationsAiPanel({ brief }: { brief: OperationsAiBrief }) {
  const { t, tx } = useConsoleI18n();
  const blockerCount = brief.blockers.length;
  const validationCount = brief.validations.length;
  const urgentRiskCount = brief.risks.filter((risk) => risk.tone === 'urgent').length;
  return (
    <article className="operations-ai-panel">
      <header className="operations-ai-header">
        <div>
          <span className="operations-ai-eyebrow">{t('aiSupport', 'AI Support')}</span>
          <h3>{tx(brief.title)}</h3>
        </div>
        <span className="operations-ai-chip">{t('advisoryOnly', 'Advisory only')}</span>
      </header>
      <p className="operations-ai-summary">{tx(brief.summary)}</p>
      <div className="operations-ai-grid">
        <div className="operations-ai-card operations-ai-card-primary">
          <span className="operations-ai-label">{t('nextBestAction', 'Next best action')}</span>
          <strong>{tx(brief.nextAction)}</strong>
          <p>{blockerCount > 0 ? tx(brief.blockers[0]) : t('noBlockingIssue', 'No blocking issue is detected right now.')}</p>
        </div>
        <div className="operations-ai-card">
          <span className="operations-ai-label">{t('blockersTitle', 'Blockers')}</span>
          <strong>{String(blockerCount)}</strong>
          <p>{blockerCount > 0 ? tx(brief.blockers[0]) : t('noBlockingIssue', 'No blocking issue is detected right now.')}</p>
        </div>
        <div className="operations-ai-card">
          <span className="operations-ai-label">{t('validationChecksTitle', 'Validation checks')}</span>
          <strong>{String(validationCount)}</strong>
          <p>{validationCount > 0 ? tx(brief.validations[0]) : t('noSuspiciousData', 'No suspicious data pattern is detected.')}</p>
        </div>
        <div className="operations-ai-card">
          <span className="operations-ai-label">{t('riskSignals', 'Risk signals')}</span>
          <strong>{brief.risks.length ? `${urgentRiskCount} urgent / ${brief.risks.length} total` : '0'}</strong>
          {brief.risks.length ? <p>{tx(brief.risks[0].label)}</p> : <p>{t('noElevatedRisk', 'No elevated risk signal is active.')}</p>}
        </div>
      </div>
    </article>
  );
}
