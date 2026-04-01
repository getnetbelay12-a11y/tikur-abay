'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { apiPatch } from '../lib/api';

const transitions = [
  { status: 'approved', label: 'Approve Maintenance' },
  { status: 'scheduled', label: 'Schedule Service' },
  { status: 'in_service', label: 'Mark In Service' },
  { status: 'completed', label: 'Mark Completed' },
  { status: 'rejected', label: 'Reject' },
  { status: 'reported', label: 'Reopen' },
];

export function RepairOrderStatusActions({ repairOrderId }: { repairOrderId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();

  function submit(status: string) {
    startTransition(async () => {
      try {
        await apiPatch(`/maintenance/repair-orders/${repairOrderId}/status`, {
          status,
          notes: `${status} via admin workflow`,
        });
        setMessage(`Repair order moved to ${status}.`);
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Failed to update repair order.');
      }
    });
  }

  return (
    <div className="grid" style={{ gap: 10 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {transitions.map((item) => (
          <button key={item.status} className="btn btn-secondary btn-compact" type="button" disabled={pending} onClick={() => submit(item.status)}>
            {pending ? 'Updating...' : item.label}
          </button>
        ))}
      </div>
      {message ? <div className="label">{message}</div> : null}
    </div>
  );
}
