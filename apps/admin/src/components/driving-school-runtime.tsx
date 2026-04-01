'use client';

import { useConsoleI18n } from '../lib/use-console-i18n';

type DrivingSchoolDashboard = {
  kpis: {
    totalStudents: number;
    documentsPending: number;
    trainingInProgress: number;
    examPending: number;
    dlProcessing: number;
    unpaidBalances: number;
  };
  students: Array<{
    id: string;
    studentCode: string;
    fullName: string;
    phone: string;
    status: string;
    progressPercent: number;
    theoryExamStatus: string;
    roadExamStatus: string;
    dlFollowUpStatus: string;
    totalFee: number;
    paidAmount: number;
    nextLessonAt?: string | null;
    examScheduledAt?: string | null;
  }>;
  registrationQueue: Array<Record<string, unknown>>;
  trainingProgress: Array<Record<string, unknown>>;
  exams: Array<Record<string, unknown>>;
  dlFollowUp: Array<Record<string, unknown>>;
  payments: {
    recentPayments: Array<{ id: string; paymentCode: string; studentCode: string; amount: number; status: string; paidAt?: string | null; method?: string | null }>;
    dueSoon: Array<{ id: string; studentCode: string; fullName: string; balance: number; status: string }>;
  };
  documents: Array<{ id: string; studentCode: string; fullName: string; documentCount: number; latestDocumentAt?: string | null; documentsPending: boolean }>;
};

export function DrivingSchoolRuntime({ dashboard }: { dashboard: DrivingSchoolDashboard }) {
  const { language, tx } = useConsoleI18n();

  return (
    <main className="shell">
      <div className="panel workspace-shell">
        <section className="workspace-header">
          <div className="workspace-header-copy">
            <div className="eyebrow">{tx('Driving School')}</div>
            <h1>{tx('Driving school')}</h1>
            <p>{tx('Student registration, training progress, exam readiness, document follow-up, and payment control.')}</p>
          </div>
        </section>

        <section className="workspace-kpi-grid">
          <MetricCard label={tx('Students')} value={dashboard.kpis.totalStudents} helper={tx('Registered and active learners')} />
          <MetricCard label={tx('Documents Pending')} value={dashboard.kpis.documentsPending} helper={tx('Need registration follow-up')} tone="warning" />
          <MetricCard label={tx('Training In Progress')} value={dashboard.kpis.trainingInProgress} helper={tx('Currently in lessons')} />
          <MetricCard label={tx('Exam Pending')} value={dashboard.kpis.examPending} helper={tx('Theory or road exam next')} tone="warning" />
          <MetricCard label={tx('DL Processing')} value={dashboard.kpis.dlProcessing} helper={tx('License follow-up queue')} />
          <MetricCard label={tx('Unpaid Balances')} value={dashboard.kpis.unpaidBalances} helper={tx('Student payments to follow up')} tone="warning" />
        </section>

        <section className="card workspace-table-card">
          <div className="workspace-section-header">
            <div>
              <div className="eyebrow">{tx('Students')}</div>
                <h3>{tx('Driving school dashboard')}</h3>
              </div>
            <span className="label">{tx('Registration, training, exams, DL, payments, documents')}</span>
          </div>
          <div className="table-shell">
            <table className="data-table workspace-data-table">
              <thead>
                <tr>
                  <th>{tx('Student')}</th>
                  <th>{tx('Status')}</th>
                  <th>{tx('Progress')}</th>
                  <th>{tx('Theory exam')}</th>
                  <th>{tx('Road exam')}</th>
                  <th>{tx('DL follow-up')}</th>
                  <th>{tx('Balance')}</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.students.slice(0, 12).map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="workspace-cell-stack">
                        <strong>{item.fullName}</strong>
                      <span>{item.studentCode} · {item.phone}</span>
                      </div>
                    </td>
                    <td><span className={`status-badge ${statusTone(item.status)}`}>{tx(labelize(item.status))}</span></td>
                    <td>{item.progressPercent}%</td>
                    <td>{tx(labelize(item.theoryExamStatus))}</td>
                    <td>{tx(labelize(item.roadExamStatus))}</td>
                    <td>{tx(labelize(item.dlFollowUpStatus))}</td>
                      <td>ETB {formatNumber(item.totalFee - item.paidAmount, language)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="section-grid-two">
          <ListSection title={tx('Registration')} subtitle={tx('Students waiting for enrollment or documents')} rows={dashboard.registrationQueue} tx={tx} />
          <ListSection title={tx('Training Progress')} subtitle={tx('Active students in lessons')} rows={dashboard.trainingProgress} tx={tx} />
        </section>

        <section className="section-grid-two">
          <ListSection title={tx('Exams')} subtitle={tx('Theory and road exam queue')} rows={dashboard.exams} tx={tx} />
          <ListSection title={tx('DL Follow-Up')} subtitle={tx('License processing and obtained queue')} rows={dashboard.dlFollowUp} tx={tx} />
        </section>

        <section className="section-grid-two">
          <section className="card workspace-table-card">
            <div className="workspace-section-header">
              <div>
                <div className="eyebrow">{tx('Payments')}</div>
              <h3>{tx('Student payments')}</h3>
              </div>
            </div>
            <div className="table-shell">
              <table className="data-table workspace-data-table">
                <thead>
                  <tr>
                    <th>{tx('Payment')}</th>
                    <th>{tx('Student')}</th>
                    <th>{tx('Amount')}</th>
                    <th>{tx('Status')}</th>
                    <th>{tx('Method')}</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.payments.recentPayments.map((item) => (
                    <tr key={item.id}>
                      <td>{item.paymentCode}</td>
                      <td>{item.studentCode}</td>
                      <td>ETB {formatNumber(item.amount, language)}</td>
                      <td><span className={`status-badge ${statusTone(item.status)}`}>{tx(labelize(item.status))}</span></td>
                      <td>{tx(item.method || 'cash')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!dashboard.payments.recentPayments.length ? <InlineEmpty message={tx('No payment records are available.')} /> : null}
          </section>

          <section className="card workspace-table-card">
            <div className="workspace-section-header">
              <div>
                <div className="eyebrow">{tx('Documents')}</div>
              <h3>{tx('Student document follow-up')}</h3>
              </div>
            </div>
            <div className="table-shell">
              <table className="data-table workspace-data-table">
                <thead>
                  <tr>
                    <th>{tx('Student')}</th>
                    <th>{tx('Document count')}</th>
                    <th>{tx('Latest document')}</th>
                    <th>{tx('Status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.documents.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="workspace-cell-stack">
                          <strong>{item.fullName}</strong>
                          <span>{item.studentCode}</span>
                        </div>
                      </td>
                      <td>{item.documentCount}</td>
                      <td>{formatDate(item.latestDocumentAt, language, tx)}</td>
                      <td><span className={`status-badge ${item.documentsPending ? 'warning' : 'good'}`}>{item.documentsPending ? tx('Pending') : tx('Complete')}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!dashboard.documents.length ? <InlineEmpty message={tx('No student document data is available.')} /> : null}
          </section>
        </section>
      </div>
    </main>
  );
}

function MetricCard({ label, value, helper, tone = 'info' }: { label: string; value: number; helper: string; tone?: string }) {
  return (
    <section className="card compact-kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className={`status-badge ${tone}`}>{helper}</div>
    </section>
  );
}

function ListSection({
  title,
  subtitle,
  rows,
  tx,
}: {
  title: string;
  subtitle: string;
  rows: Array<Record<string, unknown>>;
  tx: (text: string) => string;
}) {
  return (
    <section className="card workspace-table-card">
      <div className="workspace-section-header">
        <div>
          <div className="eyebrow">{title}</div>
          <h3>{subtitle}</h3>
        </div>
      </div>
      <div className="workspace-detail-list">
        {rows.slice(0, 8).map((row, index) => (
          <div key={`${title}-${index}`} className="workspace-detail-row">
            <div className="workspace-cell-stack">
              <strong>{String(row.fullName ?? row.studentCode ?? tx('Student'))}</strong>
              <span>{String(row.studentCode ?? '')} · {tx(labelize(row.status))}</span>
            </div>
            <span className={`status-badge ${statusTone(String(row.status ?? 'pending'))}`}>{tx(labelize(row.status))}</span>
          </div>
        ))}
      </div>
      {!rows.length ? <InlineEmpty message={tx('No records are available.')} /> : null}
    </section>
  );
}

function InlineEmpty({ message }: { message: string }) {
  return (
    <div className="empty-state inline-state-card">
      <p>{message}</p>
    </div>
  );
}

function labelize(value: unknown) {
  return String(value ?? 'pending').replace(/_/g, ' ');
}

function statusTone(value: string) {
  if (['approved', 'exam_passed', 'dl_obtained', 'paid', 'complete', 'completed'].includes(value)) return 'good';
  if (['rejected', 'exam_failed', 'inactive'].includes(value)) return 'critical';
  return 'warning';
}

function formatDate(value: string | null | undefined, language: string, tx: (text: string) => string) {
  if (!value) return tx('Pending');
  return new Intl.DateTimeFormat(language === 'am' ? 'am-ET' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function formatNumber(value: number, language: string) {
  return new Intl.NumberFormat(language === 'am' ? 'am-ET' : 'en-US', { maximumFractionDigits: 0 }).format(Number(value ?? 0));
}
