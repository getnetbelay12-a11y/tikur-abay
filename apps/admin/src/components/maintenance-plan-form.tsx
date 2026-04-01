'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '../lib/api';

type VehicleOption = { id: string; code: string };

export function MaintenancePlanForm({ vehicles }: { vehicles: VehicleOption[] }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();

  async function submit(formData: FormData) {
    setMessage('');
    const body = {
      vehicleId: formData.get('vehicleId'),
      vehicleCode: vehicles.find((item) => item.id === formData.get('vehicleId'))?.code,
      serviceItemName: formData.get('serviceItemName'),
      intervalKm: Number(formData.get('intervalKm')),
      intervalDays: Number(formData.get('intervalDays')),
      nextDueKm: Number(formData.get('nextDueKm')),
      nextDueDate: formData.get('nextDueDate'),
      currentOdometerKm: Number(formData.get('currentOdometerKm')),
      criticalFlag: formData.get('criticalFlag') === 'on',
      notificationDaysBeforeDue: Number(formData.get('notificationDaysBeforeDue')),
      blockTripAssignmentIfOverdue: formData.get('blockTripAssignmentIfOverdue') === 'on',
      overdue: false,
      blockedAssignment: false,
    };
    startTransition(async () => {
      try {
        await apiPost('/maintenance/plans', body);
        setMessage('Maintenance plan created.');
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Failed to create maintenance plan.');
      }
    });
  }

  return (
    <form action={submit} className="card" style={{ padding: 18 }}>
      <div className="label">Create Maintenance Plan</div>
      <div className="grid" style={{ gap: 10, marginTop: 12 }}>
        <select className="field" name="vehicleId" required defaultValue="">
          <option value="" disabled>Select vehicle</option>
          {vehicles.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}
        </select>
        <input className="field" name="serviceItemName" placeholder="Service item name" defaultValue="Tire inspection" required />
        <div className="grid grid-3">
          <input className="field" name="intervalKm" type="number" placeholder="Interval km" defaultValue={4000} required />
          <input className="field" name="intervalDays" type="number" placeholder="Interval days" defaultValue={30} required />
          <input className="field" name="nextDueKm" type="number" placeholder="Next due km" defaultValue={4200} required />
        </div>
        <div className="grid grid-3">
          <input className="field" name="currentOdometerKm" type="number" placeholder="Current odometer" defaultValue={0} required />
          <input className="field" name="nextDueDate" type="date" required />
          <input className="field" name="notificationDaysBeforeDue" type="number" defaultValue={3} required />
        </div>
        <label className="label"><input type="checkbox" name="criticalFlag" defaultChecked /> Critical service</label>
        <label className="label"><input type="checkbox" name="blockTripAssignmentIfOverdue" defaultChecked /> Block assignment if overdue</label>
        <button className="btn" type="submit" disabled={pending}>{pending ? 'Saving...' : 'Create Maintenance Plan'}</button>
        {message ? <div className="label">{message}</div> : null}
      </div>
    </form>
  );
}
