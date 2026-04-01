'use client';

import { useMemo, useState } from 'react';
import { formatDateTime, formatPerson, formatPhone, formatText } from '../lib/formatters';
import { WorkspaceFilterBar } from './workspace-filter-bar';

type DriverRow = Record<string, unknown>;

export function DriversRuntime({ drivers }: { drivers: DriverRow[] }) {
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('all');

  const filteredDrivers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return drivers.filter((driver) => {
      const driverSource = formatText(driver.source, 'internal');
      if (source !== 'all' && driverSource !== source) return false;
      if (!query) return true;
      return [
        formatPerson(driver.name),
        formatText(driver.driverId),
        formatPhone(driver.phone),
        formatText(driver.vehicle),
        formatText(driver.currentTrip),
        formatText(driver.branch),
        formatText(driver.source),
      ].join(' ').toLowerCase().includes(query);
    });
  }, [drivers, search, source]);

  return (
    <main className="shell">
      <div className="panel workspace-shell">
        <section className="workspace-header">
          <div className="workspace-header-copy">
            <div className="eyebrow">Driver Roster</div>
            <h1>Drivers</h1>
            <p>Review internal fleet drivers and external partner drivers with contact, DL, Fayda, and assignment context.</p>
          </div>
        </section>

        <WorkspaceFilterBar
          fields={[
            { key: 'search', label: 'Search', type: 'search', value: search, placeholder: 'Driver, phone, vehicle, trip', onChange: setSearch },
            {
              key: 'source',
              label: 'Type',
              type: 'select',
              value: source,
              onChange: setSource,
              options: [
                { value: 'all', label: 'Internal and external' },
                { value: 'internal', label: 'Internal' },
                { value: 'external', label: 'External' },
              ],
            },
          ]}
        />

        <section className="card workspace-table-card">
          <div className="workspace-section-header">
            <div>
              <div className="eyebrow">Driver Register</div>
              <h3>{filteredDrivers.length} drivers</h3>
            </div>
          </div>
          {!filteredDrivers.length ? (
            <div className="empty-state inline-state-card"><p>No drivers match the current filters.</p></div>
          ) : (
            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Driver</th>
                    <th>Type</th>
                    <th>Phone</th>
                    <th>Emergency</th>
                    <th>DL</th>
                    <th>Fayda</th>
                    <th>Branch</th>
                    <th>Vehicle</th>
                    <th>Current trip</th>
                    <th>Availability</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDrivers.map((driver) => (
                    <tr key={formatText(driver.id, formatText(driver.driverId, formatPerson(driver.name)))}>
                      <td>
                        <strong>{formatPerson(driver.name)}</strong>
                        <div className="label">{formatText(driver.driverId, 'Driver')}</div>
                      </td>
                      <td>{formatText(driver.source, 'internal').replace(/_/g, ' ')}</td>
                      <td>{formatPhone(driver.phone)}</td>
                      <td>{formatPhone(driver.emergencyContact)}</td>
                      <td>
                        <div className="workspace-cell-stack">
                          <strong>{formatText(driver.licenseNumber, 'DL pending')}</strong>
                          <span>{formatDateTime(driver.licenseExpiry, 'Expiry not recorded')}</span>
                        </div>
                      </td>
                      <td>
                        <div className="workspace-cell-stack">
                          <strong>{formatText(driver.faydaStatus, 'draft').replace(/_/g, ' ')}</strong>
                          <span>{driver.faydaFrontId && driver.faydaBackId ? 'Front and back on file' : formatText(driver.source, 'internal') === 'external' ? 'Partner managed' : 'Document pending'}</span>
                        </div>
                      </td>
                      <td>{formatText(driver.branch, 'Unknown branch')}</td>
                      <td>{formatText(driver.vehicle, 'Unassigned')}</td>
                      <td>
                        <div className="workspace-cell-stack">
                          <strong>{formatText(driver.currentTrip, 'No active trip')}</strong>
                          <span>{formatText(driver.destination, 'Destination pending')}</span>
                        </div>
                      </td>
                      <td>{formatText(driver.availability, 'available').replace(/_/g, ' ')}</td>
                      <td>{formatText(driver.status, 'active').replace(/_/g, ' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
