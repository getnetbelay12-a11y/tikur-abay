import Link from 'next/link';
import { serverApiGet } from '../../../../lib/server-api';
import { DriverKycReviewActions } from './review-actions';

type DriverKycRequest = {
  _id: string;
  userId: string;
  fullName: string;
  phone: string;
  branchId?: string;
  status: string;
  licenseNumber?: string;
  emergencyContact?: string;
  faydaFrontDocumentId?: string;
  faydaBackDocumentId?: string;
  selfieDocumentId?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export const dynamic = 'force-dynamic';

export default async function DriverKycDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const request = await serverApiGet<DriverKycRequest>(`/driver-kyc/${id}`).catch(() => null);

  if (!request) {
    return (
      <main className="shell">
        <div className="error-state">
          <strong>Driver KYC request not found</strong>
          <p>The requested KYC record could not be loaded.</p>
          <Link className="btn" href="/hr/driver-kyc">Back to KYC queue</Link>
        </div>
      </main>
    );
  }

  const documents = [
    { label: 'Fayda Front', value: request.faydaFrontDocumentId },
    { label: 'Fayda Back', value: request.faydaBackDocumentId },
    { label: 'Selfie', value: request.selfieDocumentId },
  ];

  return (
    <main className="shell">
      <div className="panel dashboard-layout">
        <section className="section-card card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <div>
              <div className="label">Driver KYC review</div>
              <h1 style={{ margin: '4px 0 0' }}>{request.fullName}</h1>
            </div>
            <span className={`status-badge ${request.status === 'approved' ? 'good' : ['rejected', 'suspended'].includes(request.status) ? 'critical' : 'warning'}`}>
              {request.status.replace(/_/g, ' ')}
            </span>
          </div>
        </section>

        <section className="section-grid-two">
          <section className="section-card card" style={{ padding: 20 }}>
            <div className="label">Driver profile</div>
            <div className="list-stack" style={{ marginTop: 14 }}>
              <div className="list-row"><span>Phone</span><strong>{request.phone}</strong></div>
              <div className="list-row"><span>Branch</span><strong>{request.branchId ?? 'Unassigned'}</strong></div>
              <div className="list-row"><span>License</span><strong>{request.licenseNumber ?? 'Pending'}</strong></div>
              <div className="list-row"><span>Emergency Contact</span><strong>{request.emergencyContact ?? 'Not provided'}</strong></div>
              <div className="list-row"><span>Submitted</span><strong>{new Date(request.createdAt).toLocaleString()}</strong></div>
              <div className="list-row"><span>Last Reviewed</span><strong>{request.reviewedAt ? new Date(request.reviewedAt).toLocaleString() : 'Not yet reviewed'}</strong></div>
            </div>
          </section>

          <section className="section-card card" style={{ padding: 20 }}>
            <div className="label">Documents</div>
            <div className="list-stack" style={{ marginTop: 14 }}>
              {documents.map((item) => (
                <div key={item.label} className="list-row">
                  <span>{item.label}</span>
                  {item.value ? <Link href={`/documents/${item.value}`}>Preview document</Link> : <strong>Missing</strong>}
                </div>
              ))}
            </div>
          </section>
        </section>

        <section className="section-card card" style={{ padding: 20 }}>
          <div className="label">Reviewer notes</div>
          <div style={{ marginTop: 12 }}>{request.reviewNotes ?? request.notes ?? 'No review notes yet.'}</div>
        </section>

        <DriverKycReviewActions requestId={request._id} currentStatus={request.status} />
      </div>
    </main>
  );
}
