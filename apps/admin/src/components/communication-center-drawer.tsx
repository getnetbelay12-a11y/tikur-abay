'use client';

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { apiGet, apiPost } from '../lib/api';
import { useConsoleI18n } from '../lib/use-console-i18n';
import { WorkspaceDetailDrawer } from './workspace-detail-drawer';

export type CommunicationChannel = 'email' | 'sms' | 'telegram' | 'in_app';
export type CommunicationChannelSelection = CommunicationChannel | 'all';
export type CommunicationTemplate =
  | 'payment_reminder'
  | 'payment_thank_you'
  | 'payment_receipt'
  | 'overdue_invoice_notice'
  | 'trip_delay_update'
  | 'dispatch_follow_up'
  | 'maintenance_escalation'
  | 'vehicle_block_notice'
  | 'kyc_reminder'
  | 'kyc_approval_update'
  | 'document_resubmission_notice'
  | 'incident_acknowledgement'
  | 'custom_message';

type CommunicationStatus = 'sent' | 'pending' | 'failed' | 'scheduled' | 'draft';
type HistoryFilter = 'all' | CommunicationStatus;
type ScheduleOption = 'send_now' | 'today_5pm' | 'tomorrow_morning' | 'custom_time';

export type CommunicationDrawerTarget = {
  entityType: string;
  entityId: string;
  title: string;
  subtitle: string;
  defaultTemplate?: CommunicationTemplate;
  severity?: string;
  fields?: Array<{ label: string; value: string }>;
  recipients?: Partial<Record<CommunicationChannel, string>>;
};

type HistoryRecord = {
  id: string;
  channel: CommunicationChannel;
  recipient: string;
  templateKey: CommunicationTemplate;
  subject: string;
  messageBody: string;
  status: CommunicationStatus;
  sentBy: string;
  sentAt: string | null;
  scheduledFor: string | null;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
};

type ContextResponse = {
  entity: CommunicationDrawerTarget & {
    entityTypeLabel?: string;
    status?: string;
    recipients: Record<CommunicationChannel, string>;
    fields: Array<{ label: string; value: string }>;
    defaultTemplate: CommunicationTemplate;
    defaultChannels?: CommunicationChannel[];
  };
  history: HistoryRecord[];
  hasMore?: boolean;
};

type TemplateRecord = {
  templateKey: CommunicationTemplate;
  entityType: string;
  channel: CommunicationChannel;
  language: 'en' | 'am';
  subjectTemplate: string;
  bodyTemplate: string;
  variables: string[];
};

type PreviewResponse = {
  subject: string;
  messageBody: string;
  channelBodies: Partial<Record<CommunicationChannel, string>>;
};

type Toast = {
  id: number;
  tone: 'success' | 'error';
  message: string;
};

export function CommunicationCenterDrawer({
  target,
  onClose,
  onSent,
}: {
  target: CommunicationDrawerTarget | null;
  onClose: () => void;
  onSent?: () => void;
}) {
  const { tx, language } = useConsoleI18n();
  const [context, setContext] = useState<ContextResponse['entity'] | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [channel, setChannel] = useState<CommunicationChannelSelection>('email');
  const [template, setTemplate] = useState<CommunicationTemplate>('dispatch_follow_up');
  const [scheduleOption, setScheduleOption] = useState<ScheduleOption>('send_now');
  const [customTime, setCustomTime] = useState('');
  const [recipients, setRecipients] = useState<Record<CommunicationChannel, string>>({ email: '', sms: '', telegram: '', in_app: '' });
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [channelPreviews, setChannelPreviews] = useState<Partial<Record<CommunicationChannel, string>>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    if (!target) return;
    let active = true;
    setLoading(true);
    setHistory([]);
    apiGet<ContextResponse>(`/communications/history?entityType=${encodeURIComponent(target.entityType)}&entityId=${encodeURIComponent(target.entityId)}`)
      .then((response) => {
        if (!active) return;
        setContext(response.entity);
        setHistory(response.history);
        setRecipients({ ...response.entity.recipients, ...target.recipients });
        setTemplate(target.defaultTemplate || response.entity.defaultTemplate || 'dispatch_follow_up');
        if (response.entity.defaultChannels?.length) {
          setChannel(response.entity.defaultChannels.length > 1 ? 'all' : response.entity.defaultChannels[0]);
        } else {
          setChannel('email');
        }
      })
      .catch((error) => {
        if (active) {
          pushToast(setToasts, 'error', error instanceof Error ? error.message : tx('Unable to load communication history.'));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [target, tx]);

  useEffect(() => {
    if (!target) return;
    let active = true;
    apiGet<TemplateRecord[]>(`/communications/templates?entityType=${encodeURIComponent(templateEntityType(target.entityType))}&language=${language}`)
      .then((response) => {
        if (active) setTemplates(response);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [target, language]);

  useEffect(() => {
    if (!target || !template) return;
    let active = true;
    setPreviewLoading(true);
    apiPost<PreviewResponse>('/communications/preview', {
      entityType: target.entityType,
      entityId: target.entityId,
      templateKey: template,
      channel: channel === 'all' ? 'email' : channel,
      language,
    })
      .then((response) => {
        if (!active) return;
        setSubject(response.subject || '');
        setMessage(response.messageBody || '');
        setChannelPreviews(response.channelBodies || {});
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setPreviewLoading(false);
      });
    return () => {
      active = false;
    };
  }, [target, template, channel, language]);

  const filteredHistory = useMemo(
    () => history.filter((item) => historyFilter === 'all' || item.status === historyFilter),
    [history, historyFilter],
  );

  if (!target) return null;

  const entity = context || {
    ...target,
    entityTypeLabel: target.entityType,
    status: target.severity || 'pending',
    defaultTemplate: target.defaultTemplate || 'dispatch_follow_up',
    recipients: {
      email: target.recipients?.email || '',
      sms: target.recipients?.sms || '',
      telegram: target.recipients?.telegram || '',
      in_app: target.recipients?.in_app || '',
    },
    fields: target.fields || [],
  };

  async function handleSubmit(mode: 'send' | 'draft' | 'schedule') {
    if (!target) return;
    const activeChannels = channel === 'all' ? ['email', 'sms', 'telegram', 'in_app'] as CommunicationChannel[] : [channel];
    for (const activeChannel of activeChannels) {
      if (!String(recipients[activeChannel] || '').trim()) {
        pushToast(setToasts, 'error', tx('Recipient is required before sending.'));
        return;
      }
    }

    setSubmitting(true);
    try {
      const result = await apiPost<{ records: HistoryRecord[] }>('/communications/send', {
        entityType: target.entityType,
        entityId: target.entityId,
        channels: activeChannels,
        templateKey: template,
        language,
        recipientOverrides: recipients,
        subject,
        messageBody: message,
        sendMode: mode === 'draft' ? 'draft' : mode === 'schedule' ? 'scheduled' : 'now',
        scheduledFor: mode === 'schedule' ? resolveScheduleValue(scheduleOption, customTime) : undefined,
      });
      setHistory((current) => [...result.records, ...current]);
      pushToast(setToasts, 'success', mode === 'draft' ? tx('Message draft saved.') : mode === 'schedule' ? tx('Message scheduled successfully.') : tx('Message sent successfully.'));
      onSent?.();
      if (mode !== 'draft') onClose();
    } catch (error) {
      pushToast(setToasts, 'error', error instanceof Error ? error.message : tx('Unable to send communication.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <WorkspaceDetailDrawer title={target.title} subtitle={target.subtitle} onClose={onClose}>
        <section className="workspace-metric-pair-grid">
          {entity.fields.slice(0, 4).map((field) => (
            <div className="workspace-metric-pair" key={`${field.label}-${field.value}`}>
              <span>{tx(field.label)}</span>
              <strong>{field.value}</strong>
            </div>
          ))}
        </section>

        <section className="workspace-detail-card payment-comm-panel communication-automation-panel">
          <div className="workspace-section-header">
            <div>
              <div className="eyebrow">{tx('Communication Center')}</div>
              <h3>{target.title}</h3>
              <p>{tx(entity.entityTypeLabel || target.entityType)} · {tx(historyLabel(entity.status || target.severity || 'pending'))}</p>
            </div>
          </div>

          <div className="payment-history-filters">
            {(['email', 'sms', 'telegram', 'in_app', 'all'] as CommunicationChannelSelection[]).map((item) => (
              <button key={item} type="button" className={channel === item ? 'payment-history-filter active' : 'payment-history-filter'} onClick={() => setChannel(item)}>
                {tx(historyLabel(item))}
              </button>
            ))}
          </div>

          <label className="payment-comm-field">
            <span>{tx('Template')}</span>
            <select value={template} onChange={(event) => setTemplate(event.target.value as CommunicationTemplate)}>
              {templateOptions(templates).map((item) => (
                <option key={item} value={item}>{tx(historyLabel(item))}</option>
              ))}
            </select>
          </label>

          {visibleChannels(channel).map((activeChannel) => (
            <label className="payment-comm-field" key={activeChannel}>
              <span>{recipientLabel(activeChannel, tx)}</span>
              <input value={recipients[activeChannel]} onChange={(event) => setRecipients((current) => ({ ...current, [activeChannel]: event.target.value }))} />
            </label>
          ))}

          <div className="payment-comm-grid">
            <label className="payment-comm-field">
              <span>{tx('Schedule')}</span>
              <select value={scheduleOption} onChange={(event) => setScheduleOption(event.target.value as ScheduleOption)}>
                <option value="send_now">{tx('Send now')}</option>
                <option value="today_5pm">{tx('Today at 5 PM')}</option>
                <option value="tomorrow_morning">{tx('Tomorrow morning')}</option>
                <option value="custom_time">{tx('Custom time')}</option>
              </select>
            </label>
            {scheduleOption === 'custom_time' ? (
              <label className="payment-comm-field">
                <span>{tx('Custom time')}</span>
                <input type="datetime-local" value={customTime} onChange={(event) => setCustomTime(event.target.value)} />
              </label>
            ) : null}
          </div>

          {visibleChannels(channel).includes('email') ? (
            <label className="payment-comm-field">
              <span>{tx('Subject')}</span>
              <input value={subject} onChange={(event) => setSubject(event.target.value)} />
            </label>
          ) : null}

          <label className="payment-comm-field">
            <span>{tx('Message preview')}</span>
            <textarea rows={8} value={message} onChange={(event) => setMessage(event.target.value)} />
            <small>{previewLoading ? tx('Loading message preview...') : channel === 'sms' ? `${tx('SMS')} ${tx('characters')}: ${message.length}` : `${message.length} ${tx('characters')}`}</small>
          </label>

          {channel === 'all' ? (
            <div className="communication-channel-preview-list">
              {(['email', 'sms', 'telegram', 'in_app'] as CommunicationChannel[]).map((activeChannel) => (
                <div key={activeChannel} className="communication-channel-preview-item">
                  <strong>{tx(historyLabel(activeChannel))}</strong>
                  <p>{channelPreviews[activeChannel] || message}</p>
                </div>
              ))}
            </div>
          ) : null}

          <div className="payment-comm-footer">
            <button type="button" className="btn" disabled={submitting || loading} onClick={() => handleSubmit('send')}>
              {tx('Send now')}
            </button>
            <button type="button" className="btn btn-secondary" disabled={submitting || loading} onClick={() => handleSubmit('draft')}>
              {tx('Save draft')}
            </button>
            <button type="button" className="btn btn-secondary" disabled={submitting || loading || scheduleOption === 'custom_time' && !customTime} onClick={() => handleSubmit('schedule')}>
              {tx('Schedule send')}
            </button>
          </div>
        </section>

        <section className="workspace-detail-card payment-comm-panel communication-history-panel">
          <div className="workspace-section-header">
            <div>
              <div className="eyebrow">{tx('History')}</div>
              <h3>{tx('Message timeline')}</h3>
            </div>
            <div className="payment-history-filters">
              {(['all', 'sent', 'failed', 'scheduled', 'draft'] as HistoryFilter[]).map((item) => (
                <button key={item} type="button" className={historyFilter === item ? 'payment-history-filter active' : 'payment-history-filter'} onClick={() => setHistoryFilter(item)}>
                  {tx(historyLabel(item))}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="empty-state inline-state-card"><p>{tx('Loading communication history...')}</p></div>
          ) : !filteredHistory.length ? (
            <div className="empty-state inline-state-card"><p>{tx('No communication history found for this entity.')}</p></div>
          ) : (
            <div className="payment-history-list">
              {filteredHistory.map((record) => (
                <article className="payment-history-item" key={record.id}>
                  <div className="payment-history-head">
                    <div className="workspace-cell-stack">
                      <strong>{tx(historyLabel(record.templateKey))}</strong>
                      <span>{tx(historyLabel(record.channel))} · {record.recipient}</span>
                    </div>
                    <span className={`comm-status-chip ${toneForCommStatus(record.status)}`}>{tx(historyLabel(record.status))}</span>
                  </div>
                  <div className="payment-history-meta">
                    <span>{formatDateTime(record.sentAt || record.scheduledFor)}</span>
                    <span>{record.sentBy}</span>
                  </div>
                  <p>{record.messageBody}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </WorkspaceDetailDrawer>

      {toasts.length ? (
        <div className="payment-toast-stack" aria-live="polite">
          {toasts.map((toast) => (
            <div key={toast.id} className={`payment-toast ${toast.tone}`}>
              {toast.message}
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}

function visibleChannels(channel: CommunicationChannelSelection): CommunicationChannel[] {
  if (channel === 'all') return ['email', 'sms', 'telegram', 'in_app'];
  return [channel];
}

function templateOptions(templates: TemplateRecord[]) {
  const defaults: CommunicationTemplate[] = [
    'payment_reminder',
    'payment_thank_you',
    'payment_receipt',
    'overdue_invoice_notice',
    'trip_delay_update',
    'dispatch_follow_up',
    'maintenance_escalation',
    'vehicle_block_notice',
    'kyc_reminder',
    'kyc_approval_update',
    'document_resubmission_notice',
    'incident_acknowledgement',
    'custom_message',
  ];
  if (!templates.length) return defaults;
  return Array.from(new Set(templates.map((item) => item.templateKey)));
}

function recipientLabel(channel: CommunicationChannel, tx: (text: string) => string) {
  if (channel === 'email') return tx('Email recipient');
  if (channel === 'sms') return tx('SMS recipient');
  if (channel === 'telegram') return tx('Telegram recipient');
  return tx('In-app recipient');
}

function toneForCommStatus(value: CommunicationStatus) {
  if (value === 'failed') return 'critical';
  if (value === 'scheduled') return 'info';
  if (value === 'draft') return 'muted';
  if (value === 'pending') return 'warning';
  return 'good';
}

function labelize(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function historyLabel(value: string) {
  if (value === 'payment_reminder') return 'Payment reminder';
  if (value === 'payment_thank_you') return 'Thank-you for payment';
  if (value === 'payment_receipt') return 'Receipt';
  if (value === 'overdue_invoice_notice') return 'Overdue notice';
  if (value === 'trip_delay_update') return 'Trip delay update';
  if (value === 'dispatch_follow_up') return 'Dispatch action notice';
  if (value === 'maintenance_escalation') return 'Maintenance escalation';
  if (value === 'vehicle_block_notice') return 'Vehicle block notice';
  if (value === 'kyc_reminder') return 'KYC reminder';
  if (value === 'kyc_approval_update') return 'KYC approval update';
  if (value === 'document_resubmission_notice') return 'Document resubmission notice';
  if (value === 'incident_acknowledgement') return 'Incident acknowledgement';
  if (value === 'custom_message') return 'Custom';
  if (value === 'in_app') return 'In-app';
  return labelize(value);
}

function formatDateTime(value: string | null) {
  if (!value) return 'Not sent';
  return new Date(value).toLocaleString();
}

function resolveScheduleValue(option: ScheduleOption, customTime: string) {
  const now = new Date();
  if (option === 'today_5pm') {
    const next = new Date(now);
    next.setHours(17, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next.toISOString();
  }
  if (option === 'tomorrow_morning') {
    const next = new Date(now);
    next.setDate(next.getDate() + 1);
    next.setHours(9, 0, 0, 0);
    return next.toISOString();
  }
  if (option === 'custom_time' && customTime) {
    return new Date(customTime).toISOString();
  }
  return undefined;
}

function templateEntityType(entityType: string) {
  if (entityType === 'invoice' || entityType === 'payment') return 'finance';
  if (entityType === 'trip' || entityType === 'vehicle' || entityType === 'maintenance_plan' || entityType === 'incident_report') return 'operations';
  if (entityType === 'driver_kyc_request') return 'driver';
  return 'general';
}

function pushToast(setToasts: Dispatch<SetStateAction<Toast[]>>, tone: Toast['tone'], message: string) {
  const id = Date.now() + Math.floor(Math.random() * 1000);
  setToasts((current) => [...current, { id, tone, message }]);
  window.setTimeout(() => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, 3200);
}
