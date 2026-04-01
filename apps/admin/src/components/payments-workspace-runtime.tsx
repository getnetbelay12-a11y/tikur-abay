'use client';

import Link from 'next/link';
import { startTransition, useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost } from '../lib/api';
import { readShippingPhase1Workspace, shippingPhase1UpdatedEvent } from '../lib/shipping-phase1';
import { useConsoleI18n } from '../lib/use-console-i18n';
import { CommunicationCenterDrawer, type CommunicationDrawerTarget } from './communication-center-drawer';
import { WorkspaceDetailDrawer } from './workspace-detail-drawer';
import { WorkspaceFilterBar } from './workspace-filter-bar';
import { toArray, toNumberValue, toObject, toStringValue } from '../lib/normalize';

type Channel = 'email' | 'sms' | 'telegram' | 'in_app';
type ChannelSelection = Channel | 'all';
type TemplateType = 'reminder' | 'thank_you' | 'receipt' | 'escalation';
type CommunicationStatus = 'sent' | 'failed' | 'scheduled' | 'not_sent';

type PaymentRow = {
  id: string;
  paymentId: string | null;
  invoiceId: string;
  paymentCode: string;
  invoiceCode: string;
  customerName: string;
  amount: number;
  outstandingAmount: number;
  paymentStatus: string;
  invoiceStatus: string;
  routeName: string;
  paymentDate: string | null;
  dueDate: string | null;
  contactPerson: string;
  recipients: Record<Channel, string>;
  lastContact: string | null;
  channel: string;
  communicationStatus: CommunicationStatus;
  lastTemplateType: string | null;
  lastMessagePreview: string | null;
  historyCount: number;
  availableActions: {
    sendReminder: boolean;
    sendThankYou: boolean;
    sendReceipt: boolean;
  };
};

type CommunicationSummary = {
  messagesSentToday: number;
  pendingFollowUp: number;
  overdueReminders: number;
  thankYouMessagesSent: number;
};

type Workspace = {
  rows: PaymentRow[];
  communicationSummary: CommunicationSummary;
};

type CommunicationRecord = {
  id: string;
  paymentId: string | null;
  invoiceId: string | null;
  channel: Channel;
  templateType: TemplateType;
  recipient: string;
  subject: string;
  message: string;
  status: CommunicationStatus;
  sentAt: string | null;
  sentBy: string;
  providerResponse: string;
};

type Toast = {
  id: number;
  tone: 'success' | 'error';
  message: string;
};

type ComposerState = {
  row: PaymentRow;
  channel: ChannelSelection;
  templateType: TemplateType;
  recipients: Record<Channel, string>;
  message: string;
  subject: string;
};

const emptyWorkspace: Workspace = {
  rows: [],
  communicationSummary: {
    messagesSentToday: 0,
    pendingFollowUp: 0,
    overdueReminders: 0,
    thankYouMessagesSent: 0,
  },
};

export function PaymentsWorkspaceRuntime({ workspace }: { workspace: Workspace | null }) {
  const { tx } = useConsoleI18n();
  const initialWorkspace = toObject(workspace, emptyWorkspace);
  const [shippingWorkspace, setShippingWorkspace] = useState(() => readShippingPhase1Workspace());
  const [workspaceState, setWorkspaceState] = useState<Workspace>({
    rows: toArray<PaymentRow>(initialWorkspace.rows).map(normalizeRow),
    communicationSummary: initialWorkspace.communicationSummary || emptyWorkspace.communicationSummary,
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [composer, setComposer] = useState<ComposerState | null>(null);
  const [communicationTarget, setCommunicationTarget] = useState<CommunicationDrawerTarget | null>(null);
  const [historyRow, setHistoryRow] = useState<PaymentRow | null>(null);
  const [historyRows, setHistoryRows] = useState<CommunicationRecord[]>([]);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'sent' | 'failed' | 'scheduled'>('all');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const reload = () => setShippingWorkspace(readShippingPhase1Workspace());
    reload();
    window.addEventListener(shippingPhase1UpdatedEvent, reload as EventListener);
    return () => {
      window.removeEventListener(shippingPhase1UpdatedEvent, reload as EventListener);
    };
  }, []);

  const rows = workspaceState.rows;
  const filteredRows = rows.filter((row) => {
    const haystack = `${row.paymentCode} ${row.customerName} ${row.invoiceCode} ${row.contactPerson}`.toLowerCase();
    if (search && !haystack.includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && row.paymentStatus !== statusFilter) return false;
    if (customerFilter !== 'all' && row.customerName !== customerFilter) return false;
    return true;
  });

  const filteredHistory = historyRows.filter((item) => historyFilter === 'all' || item.status === historyFilter);
  const communicationSummary = workspaceState.communicationSummary;
  const shippingFinanceMessages = useMemo(() => (
    shippingWorkspace.lettersOfCredit.map((lc) => {
      const settlement = shippingWorkspace.settlements.find((item) => item.bookingId === lc.bookingId);
      const hasInvalidDoc = lc.documentChecks.some((item) => item.status === 'invalid');
      const messageType = lc.status === 'paid' ? 'thank_you' : hasInvalidDoc ? 'reminder' : lc.status === 'verified' ? 'receipt' : 'escalation';
      const title =
        lc.status === 'paid'
          ? 'Send trade-finance closure note'
          : hasInvalidDoc
            ? 'Send missing document reminder'
            : lc.status === 'verified'
              ? 'Send bank verification notice'
              : 'Send LC follow-up';
      const detail =
        lc.status === 'paid'
          ? 'Bank settlement is complete. Customer should receive finance closure confirmation.'
          : hasInvalidDoc
            ? 'One or more LC documents are invalid and need customer correction.'
            : lc.status === 'verified'
              ? 'Trade documents are verified and ready for payment release communication.'
              : 'LC packet is still pending. Customer follow-up may be needed.';
      return {
        bookingId: lc.bookingId,
        customerName: lc.customerName,
        lcNumber: lc.lcNumber,
        bankName: lc.bankName,
        status: lc.status,
        messageType,
        title,
        detail,
        balanceUSD: settlement?.balanceUSD ?? 0,
        balanceETB: settlement?.balanceETB ?? 0,
      };
    })
  ), [shippingWorkspace.lettersOfCredit, shippingWorkspace.settlements]);

  async function refreshWorkspace() {
    const next = await apiGet<Workspace>('/payments/workspace');
    startTransition(() => {
      setWorkspaceState({
        rows: toArray<PaymentRow>(next.rows).map(normalizeRow),
        communicationSummary: next.communicationSummary || emptyWorkspace.communicationSummary,
      });
    });
  }

  function pushToast(tone: Toast['tone'], message: string) {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current, { id, tone, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3200);
  }

  function openComposer(row: PaymentRow) {
    const templateType = defaultTemplateType(row);
    setCommunicationTarget({
      entityType: 'invoice',
      entityId: row.invoiceId,
      title: tx('Send Message'),
      subtitle: `${row.customerName} · ${row.invoiceCode} · ETB ${formatNumber(row.amount)}`,
      defaultTemplate: mapTemplateType(templateType),
      severity: row.paymentStatus === 'overdue' || row.invoiceStatus === 'overdue' ? 'high' : 'medium',
      recipients: row.recipients,
      fields: [
        { label: 'Customer', value: row.customerName },
        { label: 'Invoice', value: row.invoiceCode },
        { label: 'Amount', value: `ETB ${formatNumber(row.amount)}` },
        { label: 'Payment Status', value: labelize(row.paymentStatus) },
      ],
    });
  }

  async function openHistory(row: PaymentRow) {
    setHistoryRow(row);
    setHistoryLoading(true);
    try {
      const query = new URLSearchParams({ invoiceId: row.invoiceId });
      if (row.paymentId) {
        query.set('paymentId', row.paymentId);
      }
      const result = await apiGet<CommunicationRecord[]>(`/payments/communications/history?${query.toString()}`);
      setHistoryRows(result);
    } catch (error) {
      pushToast('error', error instanceof Error ? error.message : tx('Unable to load communication history.'));
    } finally {
      setHistoryLoading(false);
    }
  }

  function updateComposer<K extends keyof ComposerState>(key: K, value: ComposerState[K]) {
    setComposer((current) => current ? { ...current, [key]: value } : current);
  }

  function updateRecipient(channel: Channel, value: string) {
    setComposer((current) => current ? { ...current, recipients: { ...current.recipients, [channel]: value } } : current);
  }

  function updateTemplate(templateType: TemplateType) {
    setComposer((current) => current ? {
      ...current,
      templateType,
      subject: buildSubject(templateType, current.row),
      message: buildMessage(templateType, current.row),
    } : current);
  }

  async function submitCommunication(saveAsDraft: boolean) {
    if (!composer) return;
    const channels = composer.channel === 'all' ? ['email', 'sms', 'telegram', 'in_app'] as Channel[] : [composer.channel];
    for (const channel of channels) {
      if (!composer.recipients[channel]?.trim()) {
        pushToast('error', tx('Recipient is required before sending.'));
        return;
      }
    }

    setSubmitting(true);
    try {
      await apiPost('/payments/communications/send', {
        paymentId: composer.row.paymentId || undefined,
        invoiceId: composer.row.invoiceId,
        channel: composer.channel,
        templateType: composer.templateType,
        recipients: composer.recipients,
        subject: composer.subject,
        message: composer.message,
        saveAsDraft,
      });
      await refreshWorkspace();
      setComposer(null);
      pushToast('success', saveAsDraft ? tx('Message draft saved.') : tx('Message sent successfully.'));
    } catch (error) {
      pushToast('error', error instanceof Error ? error.message : tx('Unable to send communication.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="shell">
      <div className="panel workspace-shell">
        <section className="workspace-header">
          <div className="workspace-header-copy">
            <div className="eyebrow">{tx('Payments Desk')}</div>
            <h1>{tx('Payments')}</h1>
            <p>{tx('Payment communication center for reminders, receipts, thank-you messages, and escalation follow-up.')}</p>
          </div>
        </section>

        <section className="workspace-kpi-grid">
          <KpiCard label={tx('Messages Sent Today')} value={communicationSummary.messagesSentToday} helper={tx('Delivered and scheduled payment messages')} tone="good" />
          <KpiCard label={tx('Pending Follow-Up')} value={communicationSummary.pendingFollowUp} helper={tx('Payments still needing outreach')} tone="warning" />
          <KpiCard label={tx('Overdue Reminders')} value={communicationSummary.overdueReminders} helper={tx('Escalation notices in history')} tone="critical" />
          <KpiCard label={tx('Thank-You Messages Sent')} value={communicationSummary.thankYouMessagesSent} helper={tx('Paid payment acknowledgements')} tone="info" />
        </section>

        <section className="card workspace-table-card">
          <div className="workspace-section-header">
            <div>
              <div className="eyebrow">Shipping Finance Follow-Up</div>
              <h3>Customer messages from LC and settlement events</h3>
            </div>
            <Link className="btn btn-secondary btn-compact" href="/shipping/finance">Open shipping finance</Link>
          </div>
          {!shippingFinanceMessages.length ? (
            <div className="empty-state inline-state-card"><p>No shipping finance follow-up is active yet.</p></div>
          ) : (
            <div className="workspace-detail-list">
              {shippingFinanceMessages.slice(0, 8).map((row) => (
                <div className="workspace-detail-row" key={`${row.bookingId}-finance-message`}>
                  <div className="workspace-cell-stack">
                    <strong>{row.title}</strong>
                    <span>{row.bookingId} · {row.customerName} · {row.lcNumber}</span>
                  </div>
                  <div className="workspace-cell-stack">
                    <strong>{row.detail}</strong>
                    <span>{row.bankName} · USD {formatNumber(row.balanceUSD)} · ETB {formatNumber(row.balanceETB)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <WorkspaceFilterBar
          fields={[
            { key: 'search', label: 'Search', type: 'search', value: search, placeholder: 'Payment, invoice, customer, contact', onChange: setSearch },
            { key: 'status', label: 'Status', type: 'select', value: statusFilter, onChange: setStatusFilter, options: [{ value: 'all', label: 'All statuses' }, ...uniqueOptions(rows.map((row) => row.paymentStatus))] },
            { key: 'customer', label: 'Customer', type: 'select', value: customerFilter, onChange: setCustomerFilter, options: [{ value: 'all', label: 'All customers' }, ...uniqueOptions(rows.map((row) => row.customerName))] },
          ]}
        />

        <section className="card workspace-table-card">
          <div className="workspace-section-header">
            <div>
              <div className="eyebrow">{tx('Communication Center')}</div>
              <h3>{tx('Payment communications table')}</h3>
            </div>
          </div>
          {!filteredRows.length ? (
            <div className="empty-state inline-state-card"><p>{tx('No payments match the current filters.')}</p></div>
          ) : (
            <div className="table-shell">
              <table className="data-table workspace-data-table">
                <thead>
                  <tr>
                    <th>{tx('Payment ID')}</th>
                    <th>{tx('Customer')}</th>
                    <th>{tx('Invoice')}</th>
                    <th>{tx('Amount')}</th>
                    <th>{tx('Status')}</th>
                    <th>{tx('Last contact')}</th>
                    <th>{tx('Channel')}</th>
                    <th>{tx('Comm status')}</th>
                    <th>{tx('Action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.paymentCode}</td>
                      <td>
                        <div className="workspace-cell-stack">
                          <strong>{row.customerName}</strong>
                          <span>{row.contactPerson}</span>
                        </div>
                      </td>
                      <td>{row.invoiceCode}</td>
                      <td>
                        <div className="workspace-cell-stack">
                          <strong>ETB {formatNumber(row.amount)}</strong>
                          <span>{row.paymentStatus === 'paid' ? tx('Received') : `${tx('Outstanding')} ETB ${formatNumber(row.outstandingAmount)}`}</span>
                        </div>
                      </td>
                      <td><span className={`status-badge ${toneForStatus(row.paymentStatus)}`}>{labelize(row.paymentStatus)}</span></td>
                      <td>{formatDateTime(row.lastContact)}</td>
                      <td>{row.channel === 'not_sent' ? tx('Not sent') : labelize(row.channel)}</td>
                      <td><span className={`comm-status-chip ${toneForCommStatus(row.communicationStatus)}`}>{labelize(row.communicationStatus)}</span></td>
                      <td>
                        <div className="payment-comm-actions">
                          <button type="button" className="btn btn-secondary btn-compact" onClick={() => openComposer(row)}>
                            {tx('Send Message')}
                          </button>
                          <button type="button" className="payment-comm-link" onClick={() => openHistory(row)}>
                            {tx('History')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {communicationTarget ? (
        <CommunicationCenterDrawer
          target={communicationTarget}
          onClose={() => {
            setComposer(null);
            setCommunicationTarget(null);
          }}
          onSent={() => void refreshWorkspace()}
        />
      ) : null}

      {historyRow ? (
        <WorkspaceDetailDrawer
          title={tx('Communication History')}
          subtitle={`${historyRow.customerName} · ${historyRow.invoiceCode}`}
          onClose={() => {
            setHistoryRow(null);
            setHistoryRows([]);
            setHistoryFilter('all');
          }}
        >
          <section className="workspace-metric-pair-grid">
            <MetricPair label={tx('Customer')} value={historyRow.customerName} />
            <MetricPair label={tx('Invoice')} value={historyRow.invoiceCode} />
            <MetricPair label={tx('Amount')} value={`ETB ${formatNumber(historyRow.amount)}`} />
            <MetricPair label={tx('Payment Status')} value={labelize(historyRow.paymentStatus)} />
          </section>

          <section className="workspace-detail-card payment-comm-panel">
            <div className="workspace-section-header">
              <div>
                <div className="eyebrow">{tx('History')}</div>
                <h3>{tx('Message timeline')}</h3>
              </div>
              <div className="payment-history-filters">
                {['all', 'sent', 'failed', 'scheduled'].map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={historyFilter === item ? 'payment-history-filter active' : 'payment-history-filter'}
                    onClick={() => setHistoryFilter(item as typeof historyFilter)}
                  >
                    {tx(labelize(item))}
                  </button>
                ))}
              </div>
            </div>

            {historyLoading ? (
              <div className="empty-state inline-state-card"><p>{tx('Loading communication history...')}</p></div>
            ) : !filteredHistory.length ? (
              <div className="empty-state inline-state-card"><p>{tx('No communication history found for this payment.')}</p></div>
            ) : (
              <div className="payment-history-list">
                {filteredHistory.map((record) => (
                  <article className="payment-history-item" key={record.id}>
                    <div className="payment-history-head">
                      <div className="workspace-cell-stack">
                        <strong>{labelize(record.templateType)}</strong>
                        <span>{labelize(record.channel)} · {record.recipient}</span>
                      </div>
                      <span className={`comm-status-chip ${toneForCommStatus(record.status)}`}>{labelize(record.status)}</span>
                    </div>
                    <div className="payment-history-meta">
                      <span>{formatDateTime(record.sentAt)}</span>
                      <span>{record.sentBy}</span>
                    </div>
                    <p>{record.message}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </WorkspaceDetailDrawer>
      ) : null}

      {toasts.length ? (
        <div className="payment-toast-stack" aria-live="polite">
          {toasts.map((toast) => (
            <div key={toast.id} className={`payment-toast ${toast.tone}`}>
              {toast.message}
            </div>
          ))}
        </div>
      ) : null}
    </main>
  );
}

function normalizeRow(row: PaymentRow): PaymentRow {
  return {
    id: toStringValue(row.id, 'payment-row'),
    paymentId: row.paymentId || null,
    invoiceId: toStringValue(row.invoiceId, 'invoice-row'),
    paymentCode: toStringValue(row.paymentCode, 'Payment pending'),
    invoiceCode: toStringValue(row.invoiceCode, 'Invoice pending'),
    customerName: toStringValue(row.customerName, 'Customer pending'),
    amount: toNumberValue(row.amount),
    outstandingAmount: toNumberValue(row.outstandingAmount),
    paymentStatus: toStringValue(row.paymentStatus, 'pending'),
    invoiceStatus: toStringValue(row.invoiceStatus, 'pending'),
    routeName: toStringValue(row.routeName, 'Route pending'),
    paymentDate: row.paymentDate || null,
    dueDate: row.dueDate || null,
    contactPerson: toStringValue(row.contactPerson, 'Finance contact'),
    recipients: {
      email: toStringValue(row.recipients?.email, ''),
      sms: toStringValue(row.recipients?.sms, ''),
      telegram: toStringValue(row.recipients?.telegram, ''),
      in_app: toStringValue(row.recipients?.in_app, ''),
    },
    lastContact: row.lastContact || null,
    channel: toStringValue(row.channel, 'not_sent'),
    communicationStatus: toStringValue(row.communicationStatus, 'not_sent') as CommunicationStatus,
    lastTemplateType: row.lastTemplateType || null,
    lastMessagePreview: row.lastMessagePreview || null,
    historyCount: toNumberValue(row.historyCount),
    availableActions: row.availableActions || { sendReminder: true, sendThankYou: false, sendReceipt: false },
  };
}

function KpiCard({ label, value, helper, tone = 'info' }: { label: string; value: number; helper: string; tone?: string }) {
  return (
    <section className="card workspace-kpi-card">
      <div className="eyebrow">{label}</div>
      <div className={`kpi-value ${tone}`}>{formatNumber(value)}</div>
      <div className="label">{helper}</div>
    </section>
  );
}

function MetricPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="workspace-metric-pair">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function uniqueOptions(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort().map((value) => ({ value, label: labelize(value) }));
}

function toneForStatus(value: string) {
  if (value === 'failed' || value === 'overdue') return 'critical';
  if (value === 'pending' || value === 'partially_paid') return 'warning';
  if (value === 'paid') return 'good';
  return 'info';
}

function toneForCommStatus(value: CommunicationStatus) {
  if (value === 'failed') return 'critical';
  if (value === 'scheduled') return 'info';
  if (value === 'sent') return 'good';
  return 'warning';
}

function labelize(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function defaultTemplateType(row: PaymentRow): TemplateType {
  if (row.paymentStatus === 'paid') return 'thank_you';
  if (row.paymentStatus === 'overdue' || row.invoiceStatus === 'overdue') return 'escalation';
  return 'reminder';
}

function mapTemplateType(templateType: TemplateType) {
  if (templateType === 'thank_you') return 'payment_thank_you' as const;
  if (templateType === 'receipt') return 'payment_receipt' as const;
  if (templateType === 'escalation') return 'overdue_invoice_notice' as const;
  return 'payment_reminder' as const;
}

function buildSubject(templateType: TemplateType, row: PaymentRow) {
  if (templateType === 'thank_you') return `Payment received for ${row.invoiceCode}`;
  if (templateType === 'receipt') return `Receipt for ${row.invoiceCode}`;
  if (templateType === 'escalation') return `Overdue notice for ${row.invoiceCode}`;
  return `Payment reminder for ${row.invoiceCode}`;
}

function buildMessage(templateType: TemplateType, row: PaymentRow) {
  const amount = formatNumber(row.paymentStatus === 'paid' ? row.amount : row.outstandingAmount || row.amount);
  const dueDate = formatDate(row.dueDate);
  if (templateType === 'thank_you') {
    return `Dear ${row.customerName}, thank you for your payment of ETB ${amount} for invoice ${row.invoiceCode}. Your payment has been received successfully. We appreciate your business.`;
  }
  if (templateType === 'receipt') {
    return `Dear ${row.customerName}, your payment for invoice ${row.invoiceCode} has been recorded successfully. Amount received: ETB ${amount}. Receipt reference: ${row.paymentCode}.`;
  }
  if (templateType === 'escalation') {
    return `Dear ${row.customerName}, invoice ${row.invoiceCode} for ETB ${amount} is now overdue. Please arrange payment as soon as possible or contact our finance team for support.`;
  }
  return `Dear ${row.customerName}, this is a reminder that invoice ${row.invoiceCode} for ETB ${amount} is due on ${dueDate}. Please complete payment at your earliest convenience. Thank you.`;
}

function visibleChannels(channel: ChannelSelection): Channel[] {
  if (channel === 'all') return ['email', 'sms', 'telegram', 'in_app'];
  return [channel];
}

function recipientLabel(channel: Channel, tx: (text: string) => string) {
  if (channel === 'email') return tx('Email recipient');
  if (channel === 'sms') return tx('SMS recipient');
  if (channel === 'telegram') return tx('Telegram recipient');
  return tx('In-app recipient');
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : 'Not set';
}

function formatDateTime(value: string | null) {
  if (!value) return 'Not sent';
  return new Date(value).toLocaleString();
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}
