import Link from 'next/link';
import { serverApiGet } from '../../../lib/server-api';

type DriverKycRequest = {
  _id: string;
  userId: string;
  fullName: string;
  phone: string;
  branchId?: string;
  status: string;
  licenseNumber?: string;
  faydaFrontDocumentId?: string;
  faydaBackDocumentId?: string;
  selfieDocumentId?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  createdAt: string;
};

export const dynamic = 'force-dynamic';

export default async function DriverKycPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const query = new URLSearchParams();
  for (const key of ['status', 'branchId', 'q']) {
    const value = params[key];
    if (typeof value === 'string' && value) query.set(key, value);
  }

  const requests = await serverApiGet<DriverKycRequest[]>(`/driver-kyc${query.size ? `?${query.toString()}` : ''}`).catch(() => []);

  const grouped = {
    pending: requests.filter((item) => ['submitted', 'under_review'].includes(item.status)),
    approved: requests.filter((item) => item.status === 'approved'),
    flagged: requests.filter((item) => ['rejected', 'suspended'].includes(item.status)),
  };

  return (
    <main className="shell">
      <div className="panel dashboard-layout">
        <section className="section-grid-four">
          <MetricCard label="Pending Review" value={grouped.pending.length} secondary="Submitted or under review" />
          <MetricCard label="Approved" value={grouped.approved.length} secondary="Ready for trip operations" />
          <MetricCard label="Flagged" value={grouped.flagged.length} secondary="Rejected or suspended" />
          <MetricCard label="Total Requests" value={requests.length} secondary="Driver onboarding queue" />
        </section>

        <section className="section-card card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <div>
              <div className="label">HR review workflow</div>
              <h1 style={{ margin: '4px 0 0' }}>Driver KYC Approval Queue</h1>
            </div>
            <div className="label">{grouped.pending.length} waiting for action</div>
          </div>

          <form className="grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginTop: 16 }}>
            <input className="field" name="q" defaultValue={query.get('q') ?? ''} placeholder="Search driver, phone, or license" />
            <input className="field" name="branchId" defaultValue={query.get('branchId') ?? ''} placeholder="Branch ID" />
            <select className="field" name="status" defaultValue={query.get('status') ?? ''}>
              <option value="">All statuses</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="suspended">Suspended</option>
            </select>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-compact" type="submit">Apply Filters</button>
              <Link className="btn btn-secondary btn-compact" href="/hr/driver-kyc">Reset</Link>
            </div>
          </form>

          {requests.length ? (
            <div className="table-wrap" style={{ marginTop: 16 }}>
              <table>
                <thead>
                  <tr>
                    <th>Driver</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Branch</th>
                    <th>License</th>
                    <th>Submitted</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((row) => (
                    <tr key={row._id}>
                      <td>{row.fullName}</td>
                      <td>{row.phone}</td>
                      <td>
                        <span className={`status-badge ${row.status === 'approved' ? 'good' : ['rejected', 'suspended'].includes(row.status) ? 'critical' : 'warning'}`}>
                          {row.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>{row.branchId ?? 'Unassigned'}</td>
                      <td>{row.licenseNumber ?? 'Pending'}</td>
                      <td>{new Date(row.createdAt).toLocaleDateString()}</td>
                      <td><Link className="btn btn-secondary btn-compact" href={`/hr/driver-kyc/${row._id}`}>Review</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">No driver KYC requests are waiting for review.</div>
          )}
        </section>
      </div>
    </main>
  );
}

function MetricCard({ label, value, secondary }: { label: string; value: number; secondary: string }) {
  return (
    <section className="card kpi-card">
      <div className="label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className="label">{secondary}</div>
    </section>
  );
}
