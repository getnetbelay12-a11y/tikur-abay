import { serverApiGet } from '../../../lib/server-api';

export default async function PaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payments = await serverApiGet<Array<Record<string, unknown>>>('/payments').catch(() => []);
  const payment = payments.find((item) => String(item['id']) == id) ?? null;
  const invoiceCode = payment ? String(payment['invoiceCode']) : 'Payment Detail';
  const customer = payment ? String(payment['customer']) : '';
  const amount = payment ? String(payment['amount']) : '';
  const status = payment ? String(payment['status']) : '';

  return (
    <main className="shell">
      <div className="panel">
        <section className="card" style={{ padding: 20 }}>
          <h1 style={{ marginTop: 0 }}>{invoiceCode}</h1>
          <div className="label">{customer} · ETB {amount} · {status}</div>
        </section>
      </div>
    </main>
  );
}
