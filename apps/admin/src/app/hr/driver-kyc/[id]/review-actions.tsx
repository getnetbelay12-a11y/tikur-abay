'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPatch } from '../../../../lib/api';

export function DriverKycReviewActions({
  requestId,
  currentStatus,
}: {
  requestId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [reviewNotes, setReviewNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit(nextStatus: string) {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await apiPatch(`/driver-kyc/${requestId}/status`, { status: nextStatus, reviewNotes });
      setStatus(nextStatus);
      setSuccess(`Request updated to ${nextStatus.replace(/_/g, ' ')}.`);
      router.refresh();
    } catch (cause) {
      console.error('Driver KYC update failed', cause);
      setError(cause instanceof Error ? cause.message : 'Unable to update driver KYC status right now.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section-card card" style={{ padding: 20 }}>
      <div className="label">Review action</div>
      <h3 style={{ marginTop: 4 }}>Approve, reject, or request resubmission</h3>
      <textarea
        className="field"
        rows={4}
        placeholder="Add review notes for HR and the driver"
        value={reviewNotes}
        onChange={(event) => setReviewNotes(event.target.value)}
        style={{ marginTop: 16, width: '100%' }}
      />
      {error ? <div className="error-inline" style={{ marginTop: 12 }}>{error}</div> : null}
      {success ? <div className="success-inline" style={{ marginTop: 12 }}>{success}</div> : null}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
        <button className="btn" type="button" disabled={loading} onClick={() => submit('approved')}>Approve</button>
        <button className="btn btn-secondary" type="button" disabled={loading} onClick={() => submit('under_review')}>Request Resubmission</button>
        <button className="btn btn-secondary" type="button" disabled={loading} onClick={() => submit('rejected')}>Reject</button>
        <button className="btn btn-secondary" type="button" disabled={loading} onClick={() => submit('suspended')}>Suspend</button>
      </div>
      <div className="label" style={{ marginTop: 12 }}>Current status: {status.replace(/_/g, ' ')}</div>
    </section>
  );
}
