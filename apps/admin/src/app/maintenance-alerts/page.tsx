import { MaintenanceAlertsRuntime } from '../../components/maintenance-alerts-runtime';
import { serverApiGet } from '../../lib/server-api';

export const dynamic = 'force-dynamic';

async function loadSection<T>(path: string): Promise<T | null> {
  try {
    return await serverApiGet<T>(path);
  } catch {
    return null;
  }
}

export default async function MaintenanceAlertsPage() {
  const [dashboard, dueVehicles, repairOrders] = await Promise.all([
    loadSection<any>('/maintenance/dashboard'),
    loadSection<any[]>('/maintenance/due-vehicles'),
    loadSection<any[]>('/maintenance/repair-orders'),
  ]);

  return <MaintenanceAlertsRuntime workspace={{ dashboard, dueVehicles: dueVehicles ?? [], repairOrders: repairOrders ?? [] }} />;
}
