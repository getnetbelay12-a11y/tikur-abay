'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { apiPatch, apiPost } from '../lib/api';

type VehicleOption = { id: string; code: string };

export function MaintenanceNotificationForm({
  vehicles,
  notifications,
}: {
  vehicles: VehicleOption[];
  notifications: Array<{ id: string; status: string }>;
}) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();

  async function create(formData: FormData) {
    const vehicleId = String(formData.get('vehicleId') || '');
    startTransition(async () => {
      try {
        await apiPost('/maintenance/notifications', {
          vehicleId,
          vehicleCode: vehicles.find((item) => item.id === vehicleId)?.code,
          maintenanceType: formData.get('maintenanceType'),
          dueKm: Number(formData.get('dueKm')),
          dueDate: formData.get('dueDate'),
          message: formData.get('message'),
          status: 'sent',
        });
        setMessage('Maintenance notification sent.');
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Failed to send maintenance notification.');
      }
    });
  }

  function markRead(id: string) {
    startTransition(async () => {
      try {
        await apiPatch(`/maintenance/notifications/${id}/read`, {});
        setMessage('Notification marked as read.');
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Failed to update notification.');
      }
    });
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <form action={create} className="card" style={{ padding: 18 }}>
        <div className="label">Notify Driver</div>
        <div className="grid" style={{ gap: 10, marginTop: 12 }}>
          <select className="field" name="vehicleId" required defaultValue="">
            <option value="" disabled>Select vehicle</option>
            {vehicles.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}
          </select>
          <input className="field" name="maintenanceType" defaultValue="Tire inspection" required />
          <div className="grid grid-2">
            <input className="field" name="dueKm" type="number" defaultValue={4000} required />
            <input className="field" name="dueDate" type="date" required />
          </div>
          <textarea className="field" name="message" rows={3} defaultValue="Please report to workshop for scheduled service." required />
          <button className="btn" type="submit" disabled={pending}>{pending ? 'Sending...' : 'Notify Driver'}</button>
        </div>
      </form>

      <div className="card" style={{ padding: 18 }}>
        <div className="label">Notification actions</div>
        <div className="list-stack" style={{ marginTop: 12 }}>
          {notifications.slice(0, 8).map((item) => (
            <button key={item.id} className="btn btn-secondary btn-compact" type="button" disabled={pending || item.status === 'read'} onClick={() => markRead(item.id)}>
              {item.status === 'read' ? 'Read' : 'Mark Read'}
            </button>
          ))}
        </div>
        {message ? <div className="label" style={{ marginTop: 12 }}>{message}</div> : null}
      </div>
    </div>
  );
}
