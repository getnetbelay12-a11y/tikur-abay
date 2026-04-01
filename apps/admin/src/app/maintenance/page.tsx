import { serverApiGet } from '../../lib/server-api';
import { MaintenanceRuntime } from '../../components/maintenance-runtime';

export const dynamic = 'force-dynamic';

type VehicleOption = { id?: string; _id?: string; vehicleCode: string };

type MaintenanceDashboard = {
  dueCount: number;
  tireInspectionDue: number;
  overdueCount: number;
  blockedAssignments: number;
  openRepairOrders: number;
  lowStockParts: number;
  averageFixHours: number;
  maintenanceCostSummary: number;
  recentPartUsage?: PartUsageRow[];
};

type DueVehicle = {
  id: string;
  vehicleId: string;
  vehicleLabel: string;
  vehicleCode: string;
  maintenanceType: string;
  overdue: boolean;
  blockedAssignment: boolean;
  dueDate?: string | null;
  dueKm?: number | null;
  currentOdometerKm?: number | null;
  critical?: boolean;
};

type RepairOrder = {
  _id: string;
  repairOrderCode: string;
  vehicleId?: string;
  vehicleCode: string;
  issueType: string;
  maintenanceType?: string;
  status: string;
  urgency?: string;
  priority?: string;
  technician?: string;
  workshop?: string;
  openedAt?: string | null;
  scheduledAt?: string | null;
  completedAt?: string | null;
  actualCost?: number | null;
  blockedAssignment?: boolean;
};

type PartsHistoryRow = {
  vehicleId: string;
  vehicleCode: string;
  lastTireChangeDate?: string | null;
  lastTireChangeKm?: number | null;
  nextTireDueKm?: number | null;
  lastMaintenanceDate?: string | null;
  lastMaintenanceKm?: number | null;
  lastPartReplaced?: string | null;
  partReplacementDate?: string | null;
  nextServiceDue?: string | number | null;
  overdue: boolean;
};

type PartUsageRow = {
  id: string;
  vehicleCode: string;
  partName: string;
  partCategory: string;
  replacementDate?: string | null;
  replacementKm?: number | null;
  cost?: number | null;
  vendor?: string | null;
};

type LowStockPart = Record<string, unknown>;

const emptyDashboard: MaintenanceDashboard = {
  dueCount: 0,
  tireInspectionDue: 0,
  overdueCount: 0,
  blockedAssignments: 0,
  openRepairOrders: 0,
  lowStockParts: 0,
  averageFixHours: 0,
  maintenanceCostSummary: 0,
  recentPartUsage: [],
};

export default async function MaintenancePage() {
  const [dashboard, dueVehicles, overdueVehicles, tireDueVehicles, repairOrders, partsHistory, lowStockParts, vehicles] = await Promise.all([
    serverApiGet<MaintenanceDashboard>('/maintenance/dashboard').catch(() => emptyDashboard),
    serverApiGet<DueVehicle[]>('/maintenance/due-vehicles').catch(() => []),
    serverApiGet<DueVehicle[]>('/maintenance/overdue').catch(() => []),
    serverApiGet<DueVehicle[]>('/operations/tire-due').catch(() => []),
    serverApiGet<RepairOrder[]>('/maintenance/repair-orders').catch(() => []),
    serverApiGet<PartsHistoryRow[]>('/operations/parts-history').catch(() => []),
    serverApiGet<Array<Record<string, unknown>>>('/maintenance/spare-parts/low-stock').catch(() => []),
    serverApiGet<VehicleOption[]>('/vehicles').catch(() => []),
  ]);

  const vehicleOptions = uniqueVehicleOptions([
    ...vehicles.map((item) => ({ id: String(item.id ?? item._id ?? ''), code: item.vehicleCode })),
    ...toArray<DueVehicle>(dueVehicles).map((item) => ({ id: String(item.vehicleId ?? ''), code: item.vehicleCode })),
    ...toArray<RepairOrder>(repairOrders).map((item) => ({ id: String(item.vehicleId ?? ''), code: item.vehicleCode })),
  ]);

  return (
    <MaintenanceRuntime
      dashboard={dashboard}
      dueVehicles={toArray<DueVehicle>(dueVehicles)}
      overdueVehicles={toArray<DueVehicle>(overdueVehicles)}
      tireDueVehicles={toArray<DueVehicle>(tireDueVehicles)}
      repairOrders={toArray<RepairOrder>(repairOrders)}
      partsHistory={toArray<PartsHistoryRow>(partsHistory)}
      lowStockParts={toArray<LowStockPart>(lowStockParts)}
      vehicleOptions={vehicleOptions}
    />
  );
}

function toArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function uniqueVehicleOptions(items: Array<{ id: string; code: string }>) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}
