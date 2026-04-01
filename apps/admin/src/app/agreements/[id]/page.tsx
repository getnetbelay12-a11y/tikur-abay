import { formatText } from '../../../lib/formatters';
import { serverApiGet } from '../../../lib/server-api';

export default async function AgreementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agreements = await serverApiGet<Array<Record<string, unknown>>>('/agreements').catch(() => []);
  const agreement = agreements.find((item) => String(item['id']) == id) ?? null;
  const agreementCode = formatText(agreement?.['agreementCode'], 'Agreement Detail');
  const customer = formatText(agreement?.['customer']);
  const status = formatText(agreement?.['status']).replace(/_/g, ' ');
  const version = formatText(agreement?.['version']);

  return (
    <main className="shell">
      <div className="panel">
        <section className="card console-card-pad">
          <h1 className="console-title-reset">{agreementCode}</h1>
          <div className="label">{customer} · {status} · version {version}</div>
          <div className="list-stack console-gap-top-lg">
            <div className="list-row"><span>Customer</span><strong>{customer}</strong></div>
            <div className="list-row"><span>Status</span><strong>{status}</strong></div>
            <div className="list-row"><span>Version</span><strong>{version}</strong></div>
            <div className="list-row"><span>Agreement value</span><strong>{formatText(agreement?.['totalValue'], 'Value not recorded')}</strong></div>
            <div className="list-row"><span>Start date</span><strong>{formatText(agreement?.['startDate'], 'Start date not recorded')}</strong></div>
            <div className="list-row"><span>End date</span><strong>{formatText(agreement?.['endDate'], 'End date not recorded')}</strong></div>
          </div>
        </section>
      </div>
    </main>
  );
}
