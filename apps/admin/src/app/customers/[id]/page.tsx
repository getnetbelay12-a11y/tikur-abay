import Link from 'next/link';
import { formatText } from '../../../lib/formatters';
import { serverApiGet } from '../../../lib/server-api';

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [customer, trips, agreements, payments] = await Promise.all([
    serverApiGet<Record<string, unknown>>(`/customers/${id}`).catch(() => null),
    serverApiGet<Array<Record<string, unknown>>>('/trips').catch(() => []),
    serverApiGet<Array<Record<string, unknown>>>('/agreements').catch(() => []),
    serverApiGet<Array<Record<string, unknown>>>('/payments').catch(() => []),
  ]);
  const customerName = formatText(customer?.['companyName'], 'Customer Detail');
  const customerCode = formatText(customer?.['customerCode'], 'Customer code not recorded');
  const customerCity = formatText(customer?.['city'], 'City not recorded');
  const customerStatus = formatText(customer?.['status'], 'Status not recorded').replace(/_/g, ' ');
  const customerPhone = formatText(customer?.['phone'], 'Phone not recorded');
  const customerContact = formatText(customer?.['contactPerson'], 'Contact not assigned');

  return (
    <main className="shell">
      <div className="panel">
        <section className="card console-card-pad">
          <h1 className="console-title-reset">{customerName}</h1>
          <div className="label">{customerCode} · {customerCity} · {customerStatus}</div>
          <div className="list-stack console-gap-top-lg">
            <div className="list-row"><span>Contact</span><strong>{customerContact}</strong></div>
            <div className="list-row"><span>Phone</span><strong>{customerPhone}</strong></div>
          </div>
        </section>
        <div className="console-detail-grid console-gap-top-xl">
          <section className="card console-card-pad">
            <h2 className="console-title-reset">Trips</h2>
            {trips.filter((trip) => trip['customerCode'] == customerCode).map((trip) => (
              <Link key={formatText(trip['id'], formatText(trip['tripCode'], 'trip-row'))} href={`/trips/${trip['id']}`} className="label">{formatText(trip['tripCode'])}</Link>
            ))}
            {!trips.filter((trip) => trip['customerCode'] == customerCode).length ? <div className="label">No trips are linked to this customer.</div> : null}
          </section>
          <section className="card console-card-pad">
            <h2 className="console-title-reset">Agreements</h2>
            {agreements.filter((agreement) => agreement['customerCode'] == customerCode).map((agreement) => (
              <div key={formatText(agreement['id'], formatText(agreement['agreementCode'], 'agreement-row'))} className="label">{formatText(agreement['agreementCode'])} · {formatText(agreement['status']).replace(/_/g, ' ')}</div>
            ))}
            {!agreements.filter((agreement) => agreement['customerCode'] == customerCode).length ? <div className="label">No agreements are linked to this customer.</div> : null}
          </section>
          <section className="card console-card-pad">
            <h2 className="console-title-reset">Payments</h2>
            {payments.filter((payment) => payment['customerCode'] == customerCode).map((payment) => (
              <div key={formatText(payment['id'], formatText(payment['invoiceCode'], 'payment-row'))} className="label">{formatText(payment['invoiceCode'])} · ETB {formatText(payment['amount'], '0')}</div>
            ))}
            {!payments.filter((payment) => payment['customerCode'] == customerCode).length ? <div className="label">No payments are linked to this customer.</div> : null}
          </section>
        </div>
      </div>
    </main>
  );
}
