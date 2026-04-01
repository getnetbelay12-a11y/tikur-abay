'use client';

import { useState, useTransition } from 'react';
import { apiPost } from '../lib/api';

type VehicleOption = { id: string; code: string };

export function RepairOrderForm({ vehicles }: { vehicles: VehicleOption[] }) {
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();

  async function submit(formData: FormData) {
    const vehicleId = String(formData.get('vehicleId') || '');
    const body = {
      vehicleId,
      vehicleCode: vehicles.find((item) => item.id === vehicleId)?.code,
      maintenanceType: formData.get('maintenanceType'),
      issueType: formData.get('issueType'),
      urgency: formData.get('urgency'),
      status: 'reported',
      workshop: formData.get('workshop'),
      technician: formData.get('technician'),
      description: formData.get('description'),
      blockedAssignment: formData.get('blockedAssignment') === 'on',
    };
    startTransition(async () => {
      try {
        await apiPost('/maintenance/repair-orders', body);
        setMessage('Repair order created.');
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Failed to create repair order.');
      }
    });
  }

  return (
    <form action={submit} className="card" style={{ padding: 18 }}>
      <div className="label">Create Repair Order</div>
      <div className="grid" style={{ gap: 10, marginTop: 12 }}>
        <select className="field" name="vehicleId" required defaultValue="">
          <option value="" disabled>Select vehicle</option>
          {vehicles.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}
        </select>
        <div className="grid grid-3">
          <input className="field" name="maintenanceType" defaultValue="Tire inspection" required />
          <input className="field" name="issueType" defaultValue="maintenance_needed" required />
          <select className="field" name="urgency" defaultValue="high">
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div className="grid grid-2">
          <input className="field" name="workshop" placeholder="Workshop" defaultValue="Addis Workshop" required />
          <input className="field" name="technician" placeholder="Technician" />
        </div>
        <textarea className="field" name="description" placeholder="Issue description" rows={4} required />
        <label className="label"><input type="checkbox" name="blockedAssignment" defaultChecked /> Block assignment until cleared</label>
        <button className="btn" type="submit" disabled={pending}>{pending ? 'Creating...' : 'Create Repair Order'}</button>
        {message ? <div className="label">{message}</div> : null}
      </div>
    </form>
  );
}
