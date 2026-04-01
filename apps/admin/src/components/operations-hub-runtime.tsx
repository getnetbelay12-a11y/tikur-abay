'use client';

import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { useDeferredValue, useMemo, useState } from 'react';
import { useConsoleI18n } from '../lib/use-console-i18n';
import { RotatingWorkspaceBanner, operationsBannerSlides } from './rotating-workspace-banner';

export type FleetSummary = {
  kpis: {
    totalFleet: number;
    availableCars: number;
    onRoad: number;
    underMaintenance: number;
    blockedVehicles: number;
    rentedExternalCars: number;
    fuelLogsToday: number;
    serviceDueSoon: number;
  };
  alerts: Array<{ key: string; label: string; count: number; tone: string }>;
};

type VehicleBoardRow = {
  id: string;
  vehicleCode: string;
  type: string;
  capacityTons: number;
  branch: string;
  currentStatus: string;
  boardStatus: string;
  currentKm: number;
  driver: string;
  driverPhone: string;
  currentLocation: string;
  currentTrip: string;
  tripStatus: string;
  lastGpsAt: string | null;
  availability: string;
  readyForAssignment: boolean;
  blocked: boolean;
  maintenanceOverdue: boolean;
  tireDue: boolean;
  activeIssue: boolean;
  lastServiceDate: string | null;
  safetyBadge: string;
  action: string;
  lastFuelAt: string | null;
  lastTireChangeDate: string | null;
  nextDueService: string | number | null;
  activeIssueCount: number;
  activeRepairOrder: {
    code: string;
    issue: string;
    technician: string;
    workshop: string;
    openedAt: string | null;
    estimatedCompletion: string | null;
    blocked: boolean;
  } | null;
  lastPartReplaced: string | null;
};

export type VehicleBoard = {
  counts: Record<string, number>;
  rows: VehicleBoardRow[];
};

export type AvailableVehicle = {
  id: string;
  vehicleCode: string;
  type: string;
  branch: string;
  capacity: string;
  currentLocation: string;
  driverName: string;
  driverPhone: string;
  currentKm: number;
  lastGpsAt: string | null;
  readyStatus: string;
  readyForAssignment: boolean;
  blocked: boolean;
  action: string;
};

export type UnavailableVehicle = {
  id: string;
  vehicleCode: string;
  branch: string;
  currentStatus: string;
  currentKm: number;
  reason: string;
  safetyBadge: string;
  currentLocation: string;
  driverName: string;
  driverPhone: string;
  issue: string;
  assignedMaintenancePerson: string;
  assignedWorkshop: string;
  openedDate: string | null;
  estimatedCompletion: string | null;
  blocked: boolean;
  requiredAction: string;
  repairOrderCode: string | null;
};

export type FuelPayload = {
  summary: {
    fuelLogsToday: number;
    totalLitersThisWeek: number;
    totalFuelCostThisMonth: number;
    averageFuelPerActiveVehicle: number;
  };
  logs: Array<{
    id: string;
    vehicle: string;
    driver: string;
    phone: string;
    date: string;
    station: string;
    liters: number;
    cost: number;
    odometerKm: number;
    receipt: string | null;
  }>;
};

export type ActiveTrip = {
  id: string;
  tripCode: string;
  customer: string;
  vehicleCode: string;
  route: string;
  currentLocation: string;
  destination: string;
  eta: string | null;
  status: string;
  driverName: string;
  driverPhone: string;
};

export type DueItem = {
  id: string;
  vehicleId: string;
  vehicleCode: string;
  branch: string;
  currentLocation: string;
  serviceLocation: string;
  assignedTechnician: string;
  scheduledServiceAt: string | null;
  repairOrderCode: string | null;
  maintenanceType: string;
  nextMaintenanceDueKm: number | null;
  nextMaintenanceDueDate: string | null;
  nextTireDueKm: number | null;
  priority: string;
  overdue: boolean;
  blocked: boolean;
  currentKm: number | null;
  quickLink: string;
};

export type PartsHistory = {
  vehicleId: string;
  vehicleCode: string;
  lastTireChangeDate: string | null;
  lastTireChangeKm: number | null;
  nextTireDueKm: number | null;
  lastMaintenanceDate: string | null;
  lastMaintenanceKm: number | null;
  lastPartReplaced: string | null;
  partReplacementDate: string | null;
  nextServiceDue: string | number | null;
  overdue: boolean;
};

export type RentalPartner = {
  partnerId: string;
  partnerName: string;
  contactName: string;
  phone: string;
  fleetType: string;
  tripsHandled: number;
  onTimeRate: number;
  delayRate: number;
  delayCount: number;
  cancellationCount: number;
  incidentCount: number;
  averageRentalCost: number;
  totalSpend: number;
  responseMinutes: number;
  performanceScore: number;
  recommended: boolean;
  activeTrips: Array<{
    tripCode: string;
    vehicleCode: string;
    externalDriverName: string;
    externalDriverPhone: string;
    currentLocation: string;
    status: string;
    rentalCost: number;
  }>;
};

export type LaunchWorkspace = {
  items: Array<{
    id: string;
    code: string;
    title: string;
    owner: string;
    branch: string;
    dueDate: string;
    status: string;
  }>;
};

type Props = {
  fleetSummary: FleetSummary | null;
  vehicleBoard: VehicleBoard | null;
  availableVehicles: AvailableVehicle[];
  unavailableVehicles: UnavailableVehicle[];
  activeTrips: ActiveTrip[];
  fuelPayload: FuelPayload | null;
  maintenanceDue: DueItem[];
  tireDue: DueItem[];
  partsHistory: PartsHistory[];
  rentalPartners: RentalPartner[];
  launchWorkspace: LaunchWorkspace | null;
};

type KpiDetail =
  | { kind: 'available' }
  | { kind: 'rented' }
  | { kind: 'maintenance' }
  | { kind: 'blocked' }
  | { kind: 'fuel' }
  | { kind: 'service' };

type BoardTab = 'all' | 'available' | 'on_road' | 'under_maintenance' | 'blocked' | 'rented';

function toneClass(value: string) {
  if (['critical', 'blocked', 'overdue'].includes(value)) return 'critical';
  if (['warning', 'attention', 'high', 'maintenance', 'under_maintenance'].includes(value)) return 'warning';
  if (['safe', 'available', 'recommended', 'good', 'ready'].includes(value)) return 'good';
  return 'info';
}

function humanize(value: string) {
  return value.replace(/_/g, ' ');
}

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(value ?? 0));
}

function sanitizeAbsoluteMetric(value: number | null | undefined) {
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Number(value));
}

function formatKpiDisplay(value: number | null | undefined, fallback: string) {
  const safeValue = sanitizeAbsoluteMetric(value);
  if (safeValue === null) return fallback;
  return formatNumber(safeValue);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'No update';
  return new Date(value).toLocaleString();
}

function asCsvValue(value: unknown) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function boardTabMeta(tab: BoardTab, counts: Record<string, number>) {
  const rentedCount = counts.rented ?? 0;
  switch (tab) {
    case 'available':
      return {
        title: 'Available vehicles ready for dispatch',
        description: 'Scan assignment-ready units by branch, driver, location, and readiness.',
        count: counts.available ?? 0,
      };
    case 'on_road':
      return {
        title: 'Vehicles currently executing trips',
        description: 'Track moving units with active trip, GPS freshness, and field context.',
        count: counts.on_road ?? 0,
      };
    case 'under_maintenance':
      return {
        title: 'Workshop and maintenance queue',
        description: 'Focus on units out of service, repair ownership, and return-to-road timing.',
        count: counts.under_maintenance ?? 0,
      };
    case 'blocked':
      return {
        title: 'Blocked vehicles requiring unblock action',
        description: 'Review block reason, current location, and next owner action before assignment.',
        count: counts.blocked ?? 0,
      };
    case 'rented':
      return {
        title: 'External capacity in use',
        description: 'Review partner-supported trips, external drivers, and rented vehicle coverage.',
        count: rentedCount,
      };
    default:
      return {
        title: 'Full fleet availability board',
        description: 'Search and filter the full operating fleet by readiness, location, branch, and status.',
        count: Object.values(counts).reduce((sum, value) => sum + Number(value || 0), 0),
      };
  }
}

export function OperationsHubRuntime({
  fleetSummary,
  vehicleBoard,
  availableVehicles,
  unavailableVehicles,
  activeTrips,
  fuelPayload,
  maintenanceDue,
  tireDue,
  partsHistory,
  rentalPartners,
  launchWorkspace,
}: Props) {
  const { tx } = useConsoleI18n();
  const boardRows = vehicleBoard?.rows ?? [];
  const alerts = fleetSummary?.alerts ?? [];
  const launchRisks = useMemo(
    () => (launchWorkspace?.items ?? []).filter((item) => ['blocked', 'watch'].includes(String(item.status).toLowerCase())).slice(0, 4),
    [launchWorkspace],
  );
  const fuelLogs = fuelPayload?.logs ?? [];
  const fuelSummary = fuelPayload?.summary;
  const dueSoonRows = useMemo(() => {
    const tireOnlyRows = tireDue.filter((item) => !maintenanceDue.some((due) => due.id === item.id));
    return [...maintenanceDue, ...tireOnlyRows].sort((left, right) => {
      if (left.overdue !== right.overdue) return left.overdue ? -1 : 1;
      return String(left.priority).localeCompare(String(right.priority));
    });
  }, [maintenanceDue, tireDue]);
  const [boardSearch, setBoardSearch] = useState('');
  const deferredBoardSearch = useDeferredValue(boardSearch);
  const [activeTab, setActiveTab] = useState<BoardTab>('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [availableLocationFilter, setAvailableLocationFilter] = useState('all');
  const [readinessFilter, setReadinessFilter] = useState('all');
  const [sortKey, setSortKey] = useState<'vehicleCode' | 'branch' | 'currentKm' | 'driver' | 'lastGpsAt'>('vehicleCode');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [selectedDueId, setSelectedDueId] = useState<string | null>(null);
  const [kpiDetail, setKpiDetail] = useState<KpiDetail | null>(null);

  const vehicleById = useMemo(() => new Map(boardRows.map((item) => [item.id, item])), [boardRows]);
  const selectedVehicle = selectedVehicleId ? vehicleById.get(selectedVehicleId) ?? null : null;
  const selectedPartner = selectedPartnerId ? rentalPartners.find((item) => item.partnerId === selectedPartnerId) ?? null : null;

  const branchOptions = useMemo(
    () => ['all', ...Array.from(new Set(boardRows.map((item) => item.branch).filter(Boolean))).sort()],
    [boardRows],
  );
  const typeOptions = useMemo(
    () => ['all', ...Array.from(new Set(boardRows.map((item) => item.type).filter(Boolean))).sort()],
    [boardRows],
  );
  const locationOptions = useMemo(
    () => ['all', ...Array.from(new Set(boardRows.map((item) => item.currentLocation).filter(Boolean))).sort()],
    [boardRows],
  );
  const availableLocationOptions = useMemo(
    () => ['all', ...Array.from(new Set(availableVehicles.map((item) => item.currentLocation).filter(Boolean))).sort()],
    [availableVehicles],
  );

  const filteredAvailableVehicles = useMemo(
    () => availableVehicles.filter((item) => availableLocationFilter === 'all' || item.currentLocation === availableLocationFilter),
    [availableLocationFilter, availableVehicles],
  );

  const filteredBoardRows = useMemo(() => {
    const query = deferredBoardSearch.trim().toLowerCase();
    const rows = boardRows.filter((item) => {
      if (activeTab !== 'all' && activeTab !== item.boardStatus) return false;
      if (branchFilter !== 'all' && item.branch !== branchFilter) return false;
      if (statusFilter !== 'all' && item.boardStatus !== statusFilter) return false;
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      if (locationFilter !== 'all' && item.currentLocation !== locationFilter) return false;
      if (readinessFilter === 'ready' && item.safetyBadge !== 'safe') return false;
      if (readinessFilter === 'attention' && item.safetyBadge !== 'attention') return false;
      if (readinessFilter === 'blocked' && item.safetyBadge !== 'blocked') return false;
      if (!query) return true;
      return [
        item.vehicleCode,
        item.branch,
        item.driver,
        item.driverPhone,
        item.currentLocation,
        item.currentTrip,
        item.type,
      ].join(' ').toLowerCase().includes(query);
    });

    return [...rows].sort((left, right) => {
      const leftValue = left[sortKey] ?? '';
      const rightValue = right[sortKey] ?? '';
      if (sortKey === 'currentKm') {
        return sortDirection === 'asc' ? Number(leftValue) - Number(rightValue) : Number(rightValue) - Number(leftValue);
      }
      if (sortKey === 'lastGpsAt') {
        return sortDirection === 'asc'
          ? new Date(String(leftValue || 0)).getTime() - new Date(String(rightValue || 0)).getTime()
          : new Date(String(rightValue || 0)).getTime() - new Date(String(leftValue || 0)).getTime();
      }
      return sortDirection === 'asc'
        ? String(leftValue).localeCompare(String(rightValue))
        : String(rightValue).localeCompare(String(leftValue));
    });
  }, [activeTab, boardRows, branchFilter, deferredBoardSearch, locationFilter, readinessFilter, sortDirection, sortKey, statusFilter, typeFilter]);

  const rentedActiveTrips = useMemo(
    () => rentalPartners.flatMap((partner) =>
      partner.activeTrips.map((trip) => ({ ...trip, partnerId: partner.partnerId, partnerName: partner.partnerName, performanceScore: partner.performanceScore, partnerPhone: partner.phone })),
    ),
    [rentalPartners],
  );
  const dueById = useMemo(() => new Map(dueSoonRows.map((item) => [item.id, item])), [dueSoonRows]);
  const selectedDueItem = selectedDueId ? dueById.get(selectedDueId) ?? null : null;
  const boardCounts = vehicleBoard?.counts ?? {};
  const activeBoardMeta = boardTabMeta(activeTab, boardCounts);
  const maintenanceFallbackItems = useMemo(
    () =>
      boardRows
        .filter((item) => item.boardStatus === 'under_maintenance')
        .map((item) => ({
          id: item.id,
          vehicleCode: item.vehicleCode,
          issue: item.activeRepairOrder?.issue || item.lastPartReplaced || 'Workshop inspection in progress',
          assignedMaintenancePerson: item.activeRepairOrder?.technician || 'Workshop queue',
          assignedWorkshop: item.activeRepairOrder?.workshop || `${item.branch} Workshop`,
          openedDate: item.activeRepairOrder?.openedAt || item.lastServiceDate || null,
          estimatedCompletion: item.activeRepairOrder?.estimatedCompletion || null,
          blocked: item.activeRepairOrder?.blocked ?? item.blocked,
          repairOrderCode: item.activeRepairOrder?.code || null,
          reason: 'under_maintenance',
        })),
    [boardRows],
  );
  const blockedFallbackItems = useMemo(
    () =>
      boardRows
        .filter((item) => item.boardStatus === 'blocked')
        .map((item) => ({
          id: item.id,
          vehicleCode: item.vehicleCode,
          issue: item.activeRepairOrder?.issue || 'Assignment blocked pending dispatch and technical review',
          assignedMaintenancePerson: item.activeRepairOrder?.technician || 'Operations control',
          assignedWorkshop: item.activeRepairOrder?.workshop || `${item.branch} Workshop`,
          currentLocation: item.currentLocation,
          openedDate: item.activeRepairOrder?.openedAt || item.lastServiceDate || null,
          estimatedCompletion: item.activeRepairOrder?.estimatedCompletion || null,
          blocked: true,
          repairOrderCode: item.activeRepairOrder?.code || null,
          reason: 'blocked',
          requiredAction: 'Review block reason',
        })),
    [boardRows],
  );

  const detailItems = useMemo(() => {
    if (!kpiDetail) return [];
    if (kpiDetail.kind === 'available') return availableVehicles;
    if (kpiDetail.kind === 'rented') return rentedActiveTrips;
    if (kpiDetail.kind === 'maintenance') {
      const items = unavailableVehicles.filter((item) => item.reason === 'under_maintenance');
      return items.length ? items : maintenanceFallbackItems;
    }
    if (kpiDetail.kind === 'blocked') {
      const items = unavailableVehicles.filter((item) => item.reason === 'blocked');
      return items.length ? items : blockedFallbackItems;
    }
    if (kpiDetail.kind === 'fuel') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      return fuelLogs.filter((item) => new Date(item.date).getTime() >= todayStart.getTime());
    }
    return dueSoonRows.slice(0, 18);
  }, [availableVehicles, blockedFallbackItems, dueSoonRows, fuelLogs, kpiDetail, maintenanceFallbackItems, rentedActiveTrips, unavailableVehicles]);

  function toggleSort(nextKey: typeof sortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(nextKey);
    setSortDirection('asc');
  }

  function exportBoardCsv() {
    const headers = ['Vehicle', 'Branch', 'Status', 'Current KM', 'Driver', 'Driver Phone', 'Current Location', 'Current Trip', 'Last GPS', 'Readiness'];
    const rows = filteredBoardRows.map((item) => [
      item.vehicleCode,
      item.branch,
      humanize(item.boardStatus),
      item.currentKm,
      item.driver,
      item.driverPhone,
      item.currentLocation,
      item.currentTrip,
      formatDateTime(item.lastGpsAt),
      item.safetyBadge,
    ]);
    const csv = [headers, ...rows].map((row) => row.map(asCsvValue).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'operations-fleet-board.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="shell">
      <div className="panel dashboard-console simplified-dashboard operations-dense-dashboard">
        <RotatingWorkspaceBanner slides={operationsBannerSlides} className="workspace-rotating-banner-compact" />
        <section className="dashboard-question-row card operations-panel">
          <div className="dashboard-question-header">
            <div>
              <div className="eyebrow">{tx('Operations Summary')}</div>
              <h3>{tx('Operations Hub')}</h3>
            </div>
            <div className="label">{tx('Dispatch, fuel, service, and fleet state.')}</div>
          </div>
          <div className="critical-alerts-grid compact-alert-grid operations-kpi-grid">
            <KpiCard label={tx('Total Fleet')} value={fleetSummary?.kpis.totalFleet} helper={tx('Internal fleet units')} fallback={tx('Awaiting update')} />
            <KpiCard label={tx('Available Cars')} value={fleetSummary?.kpis.availableCars} helper={tx('Ready to assign')} tone="good" onClick={() => setKpiDetail({ kind: 'available' })} fallback={tx('Awaiting update')} />
            <KpiCard label={tx('On Road')} value={fleetSummary?.kpis.onRoad} helper={tx('Active trip execution')} tone="info" onClick={() => setActiveTab('on_road')} fallback={tx('Awaiting update')} />
            <KpiCard label={tx('Under Maintenance')} value={fleetSummary?.kpis.underMaintenance} helper={tx('Workshop queue')} tone="warning" onClick={() => setKpiDetail({ kind: 'maintenance' })} fallback={tx('Awaiting update')} />
            <KpiCard label={tx('Blocked Vehicles')} value={fleetSummary?.kpis.blockedVehicles} helper={tx('Needs unblock action')} tone="critical" onClick={() => setKpiDetail({ kind: 'blocked' })} fallback={tx('Awaiting update')} />
            <KpiCard label={tx('Rented External Cars')} value={fleetSummary?.kpis.rentedExternalCars} helper={tx('Partner capacity in use')} onClick={() => setKpiDetail({ kind: 'rented' })} fallback={tx('Awaiting update')} />
            <KpiCard label={tx('Fuel Logs Today')} value={fleetSummary?.kpis.fuelLogsToday} helper={tx('Driver fuel activity')} onClick={() => setKpiDetail({ kind: 'fuel' })} fallback={tx('Awaiting update')} />
            <KpiCard label={tx('Service Due Soon')} value={fleetSummary?.kpis.serviceDueSoon} helper={tx('Near due threshold')} tone="warning" onClick={() => setKpiDetail({ kind: 'service' })} fallback={tx('Awaiting update')} />
          </div>
        </section>

        <section className="dashboard-question-row card operations-panel">
          <div className="dashboard-question-header">
            <div>
              <div className="eyebrow">{tx('Available Cars Panel')}</div>
              <h3>{tx('Can I assign a vehicle now?')}</h3>
            </div>
            <Link href="/trips" className="inline-action">{tx('Open trip board')}</Link>
          </div>
          <div className="grid grid-2 operations-inline-filters console-gap-bottom-sm">
            <select className="field" value={availableLocationFilter} onChange={(event) => setAvailableLocationFilter(event.target.value)}>
              {availableLocationOptions.map((item) => <option key={item} value={item}>{item === 'all' ? tx('All available car locations') : item}</option>)}
            </select>
            <div className="label console-self-center">{formatNumber(filteredAvailableVehicles.length)} {tx('Shown')}</div>
          </div>
          <DetailStrip
            emptyMessage={tx('No available vehicles are ready right now.')}
            rows={filteredAvailableVehicles.slice(0, 8).map((item) => ({
              key: item.id,
              title: item.vehicleCode,
              subtitle: `${item.type} · ${item.branch} · ${item.currentLocation}`,
              meta: `${item.driverName} · ${item.driverPhone} · ${formatNumber(item.currentKm)} km · GPS ${formatDateTime(item.lastGpsAt)}`,
              badge: item.readyStatus,
              tone: toneClass(item.readyStatus),
              actionLabel: tx('Assign trip'),
              actionHref: '/trips',
              onClick: () => setSelectedVehicleId(item.id),
            }))}
          />
        </section>

        <section className="dashboard-question-row card operations-panel">
          <div className="dashboard-question-header">
            <div>
              <div className="eyebrow">{tx('Rented External Cars')}</div>
              <h3>{tx('If internal fleet is full, who is helping right now?')}</h3>
            </div>
            <div className="label">{tx('Partner, driver, location, trip, and cost in one strip.')}</div>
          </div>
          <DetailStrip
            emptyMessage={tx('No rental partner vehicles are currently assigned.')}
            rows={rentedActiveTrips.slice(0, 8).map((item) => ({
              key: `${item.partnerId}-${item.tripCode}`,
              title: `${item.vehicleCode} · ${item.partnerName}`,
              subtitle: `${item.externalDriverName} · ${item.externalDriverPhone} · ${item.currentLocation}`,
              meta: `${item.tripCode} · ${humanize(item.status)} · ETB ${formatNumber(item.rentalCost)} · Score ${formatNumber(item.performanceScore)}`,
              badge: humanize(item.status),
              tone: toneClass(item.status),
              actionLabel: tx('Partner detail'),
              onClick: () => setSelectedPartnerId(item.partnerId),
            }))}
          />
        </section>

        <section className="dashboard-question-row card operations-panel">
          <div className="dashboard-question-header">
            <div>
              <div className="eyebrow">{tx('Active Trips')}</div>
              <h3>{tx('Where are active trips now and when will they arrive?')}</h3>
            </div>
            <Link href="/trips" className="inline-action">{tx('Open trip operations')}</Link>
          </div>
          <SimpleTable
            title={tx('Trips currently on the road')}
            emptyMessage={tx('No active trips are available right now.')}
            headers={[tx('Trip'), tx('Customer'), tx('Vehicle'), tx('Current location'), tx('Destination'), tx('ETA'), tx('Driver'), tx('Phone'), tx('Status')]}
            rows={activeTrips.slice(0, 12).map((item) => [
              <Link key={`${item.id}-trip`} href={`/trips/${item.id}`} className="inline-action">{item.tripCode}</Link>,
              item.customer,
              item.vehicleCode,
              item.currentLocation,
              item.destination,
              formatDateTime(item.eta),
              item.driverName,
              item.driverPhone,
              <span key={`${item.id}-status`} className={`status-badge ${toneClass(item.status)}`}>{humanize(item.status)}</span>,
            ])}
          />
        </section>

        <section className="dashboard-question-row card operations-panel">
          <div className="dashboard-question-header">
            <div>
              <div className="eyebrow">{tx('Fuel & Odometer')}</div>
              <h3>{tx('Which vehicle took fuel and what was the odometer?')}</h3>
            </div>
            <Link href="/fuel-requests" className="inline-action">{tx('Open fuel workflows')}</Link>
          </div>
          <div className="grid grid-3 operations-stat-grid">
            <StatCard label={tx('Total liters this week')} value={fuelSummary?.totalLitersThisWeek} suffix="L" fallback={tx('Awaiting update')} />
            <StatCard label={tx('Fuel cost this month')} value={fuelSummary?.totalFuelCostThisMonth} prefix="ETB " fallback={tx('Awaiting update')} />
            <StatCard label={tx('Average fuel per active vehicle')} value={fuelSummary?.averageFuelPerActiveVehicle} suffix="L" fallback={tx('Awaiting update')} />
          </div>
          <SimpleTable
            title={tx('Latest fuel logs')}
            emptyMessage={tx('No fuel logs are available.')}
            headers={[tx('Vehicle'), tx('Driver'), tx('Phone'), tx('Date'), tx('Station'), tx('Liters'), tx('Cost'), tx('Odometer'), tx('Receipt')]}
            rows={fuelLogs.slice(0, 12).map((item) => [
              item.vehicle,
              item.driver,
              item.phone,
              formatDateTime(item.date),
              item.station,
              `${formatNumber(item.liters)} L`,
              `ETB ${formatNumber(item.cost)}`,
              `${formatNumber(item.odometerKm)} km`,
              item.receipt ? <a key={item.id} href={item.receipt} className="inline-action">{tx('Receipt')}</a> : tx('No receipt'),
            ])}
          />
        </section>

        <section className="dashboard-question-row card operations-panel">
          <div className="dashboard-question-header">
            <div>
              <div className="eyebrow">{tx('Tire / Service Due')}</div>
              <h3>{tx('Which vehicles need attention soon?')}</h3>
            </div>
            <Link href="/maintenance" className="inline-action">{tx('Open maintenance workspace')}</Link>
          </div>
          {!dueSoonRows.length ? (
            <div className="empty-state inline-state-card"><p>{tx('No service or tire records are due soon.')}</p></div>
          ) : (
            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{tx('Vehicle')}</th>
                    <th>{tx('Current location')}</th>
                    <th>{tx('Service location')}</th>
                    <th>{tx('Current KM')}</th>
                    <th>{tx('Next tire due')}</th>
                    <th>{tx('Next maintenance due')}</th>
                    <th>{tx('Assigned tech')}</th>
                    <th>{tx('Overdue')}</th>
                    <th>{tx('Urgency')}</th>
                    <th>{tx('Action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {dueSoonRows.slice(0, 14).map((item) => (
                    <tr key={item.id} onClick={() => setSelectedDueId(item.id)} className="console-click-row">
                      <td>
                        <strong>{item.vehicleCode}</strong>
                        <div className="label">{item.branch}</div>
                      </td>
                      <td>{item.currentLocation}</td>
                      <td>{item.serviceLocation}</td>
                      <td>{formatNumber(item.currentKm)} km</td>
                      <td>{item.nextTireDueKm ? `${formatNumber(item.nextTireDueKm)} km` : tx('N/A')}</td>
                      <td>{item.nextMaintenanceDueDate ? formatDateTime(item.nextMaintenanceDueDate) : item.nextMaintenanceDueKm ? `${formatNumber(item.nextMaintenanceDueKm)} km` : tx('N/A')}</td>
                      <td>{item.assignedTechnician}</td>
                      <td><span className={`status-badge ${item.overdue ? 'critical' : 'good'}`}>{item.overdue ? tx('Yes') : tx('No')}</span></td>
                      <td><span className={`status-badge ${toneClass(item.priority)}`}>{tx(item.priority)}</span></td>
                      <td>
                        <div className="console-wrap-actions">
                          <button
                            type="button"
                            className="inline-action"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedDueId(item.id);
                            }}
                          >
                            {tx('Details')}
                          </button>
                          <Link href={item.quickLink} className="inline-action" onClick={(event) => event.stopPropagation()}>
                            {tx('History')}
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <SimpleTable
            title={tx('Service history and parts')}
            emptyMessage={tx('No service history is available.')}
            headers={[tx('Vehicle'), tx('Last tire change'), tx('Last maintenance'), tx('Last part'), tx('Next due'), tx('Overdue')]}
            rows={partsHistory.slice(0, 10).map((item) => [
              item.vehicleCode,
              item.lastTireChangeDate ? `${formatDateTime(item.lastTireChangeDate)} · ${formatNumber(item.lastTireChangeKm)} km` : tx('No tire history'),
              item.lastMaintenanceDate ? `${formatDateTime(item.lastMaintenanceDate)} · ${formatNumber(item.lastMaintenanceKm)} km` : tx('No maintenance history'),
              item.lastPartReplaced ? `${item.lastPartReplaced} · ${formatDateTime(item.partReplacementDate)}` : tx('No part history'),
              typeof item.nextServiceDue === 'number' ? `${formatNumber(item.nextServiceDue)} km` : item.nextServiceDue ? formatDateTime(String(item.nextServiceDue)) : tx('N/A'),
              <span key={`${item.vehicleId}-overdue`} className={`status-badge ${item.overdue ? 'critical' : 'good'}`}>{item.overdue ? tx('Yes') : tx('No')}</span>,
            ])}
          />
        </section>

        <section className="dashboard-question-row card operations-panel">
          <div className="dashboard-question-header">
            <div>
              <div className="eyebrow">{tx('Operational Alerts')}</div>
              <h3>{tx('Exceptions and follow-up')}</h3>
            </div>
          </div>
          <div className="workspace-split-grid">
            {!alerts.length ? (
              <div className="empty-state inline-state-card"><p>{tx('No operational alerts are active.')}</p></div>
            ) : (
              <div className="compact-list-stack">
                {alerts.map((item) => (
                  <div key={item.key} className="compact-list-row">
                    <div>
                      <strong>{item.label}</strong>
                      <p>{alertDetail(item.key)}</p>
                    </div>
                    <span className={`status-badge ${toneClass(item.tone)}`}>{formatNumber(item.count)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="card workspace-detail-card console-card-pad-sm">
              <div className="workspace-section-header">
                <div>
                  <div className="eyebrow">{tx('Launch Risks')}</div>
                  <h3>{tx('Go-live blockers')}</h3>
                </div>
                <Link href="/settings/launch/report" className="inline-action">{tx('Open report')}</Link>
              </div>
              {!launchRisks.length ? (
                <div className="empty-state inline-state-card"><p>{tx('No launch blockers are active.')}</p></div>
              ) : (
                <div className="workspace-detail-list">
                  {launchRisks.map((item) => (
                    <div key={item.id || item.code} className="workspace-detail-row">
                      <div className="workspace-cell-stack">
                        <strong>{item.title}</strong>
                        <span>{item.owner} · {item.branch}</span>
                      </div>
                      <div className="workspace-cell-stack console-items-end">
                        <span className={`status-badge ${toneClass(item.status)}`}>{tx(humanize(item.status))}</span>
                        <span className="label">{item.dueDate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="dashboard-question-row card operations-panel">
          <div className="dashboard-question-header">
            <div>
              <div className="eyebrow">{tx('Fleet Availability Board')}</div>
              <h3>{tx(activeBoardMeta.title)}</h3>
            </div>
            <button className="btn btn-secondary btn-compact" type="button" onClick={exportBoardCsv}>{tx('Export')}</button>
          </div>
          <div className="operations-board-meta">
            <p>{tx(activeBoardMeta.description)}</p>
            <span className="status-badge info">{formatNumber(activeBoardMeta.count)} {tx('units in this view')}</span>
          </div>
          <div className="operations-tab-row console-gap-bottom-md">
            {[
              ['all', tx('All'), Object.values(boardCounts).reduce((sum, value) => sum + Number(value || 0), 0)],
              ['available', tx('Available'), boardCounts.available ?? 0],
              ['on_road', tx('On Road'), boardCounts.on_road ?? 0],
              ['under_maintenance', tx('Maintenance'), boardCounts.under_maintenance ?? 0],
              ['blocked', tx('Blocked'), boardCounts.blocked ?? 0],
              ['rented', tx('Rented'), boardCounts.rented ?? 0],
            ].map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                className={activeTab === value ? 'btn btn-compact operations-tab-button active' : 'btn btn-secondary btn-compact operations-tab-button'}
                onClick={() => setActiveTab(value as BoardTab)}
              >
                <span>{label}</span>
                <strong>{formatNumber(Number(count || 0))}</strong>
              </button>
            ))}
          </div>
          <div className="grid grid-4 operations-filter-grid console-gap-bottom-md">
            <input className="field" value={boardSearch} onChange={(event) => setBoardSearch(event.target.value)} placeholder={tx('Search vehicle, driver, phone, location')} />
            <select className="field" value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}>
              {branchOptions.map((item) => <option key={item} value={item}>{item === 'all' ? tx('All branches') : item}</option>)}
            </select>
            <select className="field" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              {['all', 'available', 'assigned', 'loading', 'on_road', 'offloading', 'in_djibouti', 'under_maintenance', 'blocked', 'offline'].map((item) => (
                <option key={item} value={item}>{item === 'all' ? tx('All statuses') : tx(humanize(item))}</option>
              ))}
            </select>
            <select className="field" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              {typeOptions.map((item) => <option key={item} value={item}>{item === 'all' ? tx('All vehicle types') : item}</option>)}
            </select>
            <select className="field" value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)}>
              {locationOptions.map((item) => <option key={item} value={item}>{item === 'all' ? tx('All locations') : item}</option>)}
            </select>
          </div>
          <div className="grid grid-2 operations-inline-filters console-gap-bottom-md">
            <select className="field" value={readinessFilter} onChange={(event) => setReadinessFilter(event.target.value)}>
              <option value="all">{tx('All readiness states')}</option>
              <option value="ready">{tx('Safe / ready')}</option>
              <option value="attention">{tx('Needs attention')}</option>
              <option value="blocked">{tx('Blocked')}</option>
            </select>
            <div className="label console-self-center">{formatNumber(filteredBoardRows.length)} {tx('vehicles shown')}</div>
          </div>
          <div className="table-shell operations-board-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <StickyHeader label={tx('Vehicle')} onClick={() => toggleSort('vehicleCode')} />
                  <StickyHeader label={tx('Branch')} onClick={() => toggleSort('branch')} />
                  <th style={stickyHeaderStyle}>{tx('Status')}</th>
                  <StickyHeader label={tx('Current KM')} onClick={() => toggleSort('currentKm')} />
                  <StickyHeader label={tx('Driver')} onClick={() => toggleSort('driver')} />
                  <th style={stickyHeaderStyle}>{tx('Driver Phone')}</th>
                  <th style={stickyHeaderStyle}>{tx('Current Location')}</th>
                  <th style={stickyHeaderStyle}>{tx('Current Trip')}</th>
                  <StickyHeader label={tx('Last GPS')} onClick={() => toggleSort('lastGpsAt')} />
                  <th style={stickyHeaderStyle}>{tx('Readiness')}</th>
                  <th style={stickyHeaderStyle}>{tx('Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {!filteredBoardRows.length ? (
                  <tr><td colSpan={11}><div className="empty-state inline-state-card"><p>{activeTab === 'all' ? tx('No vehicles match the current filters.') : `${tx('No')} ${tx(humanize(activeTab))} ${tx('vehicles match the current filters.')}`}</p></div></td></tr>
                ) : filteredBoardRows.map((item, index) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedVehicleId(item.id)}
                    className={index % 2 === 0 ? 'operations-board-row is-even' : 'operations-board-row'}
                  >
                    <td><strong>{item.vehicleCode}</strong><div className="label">{item.type}</div></td>
                    <td>{item.branch}</td>
                    <td><span className={`status-badge ${toneClass(item.boardStatus)}`}>{tx(humanize(item.boardStatus))}</span></td>
                    <td>{formatNumber(item.currentKm)}</td>
                    <td>{item.driver}</td>
                    <td>{item.driverPhone}</td>
                    <td>{item.currentLocation}</td>
                    <td>{item.currentTrip}</td>
                    <td>{formatDateTime(item.lastGpsAt)}</td>
                    <td><span className={`status-badge ${toneClass(item.safetyBadge)}`}>{tx(item.safetyBadge)}</span></td>
                    <td>
                      <div className="console-wrap-actions">
                        <button type="button" className="inline-action" onClick={(event) => { event.stopPropagation(); setSelectedVehicleId(item.id); }}>{tx('Open')}</button>
                        {item.readyForAssignment ? <Link href="/trips" className="inline-action" onClick={(event) => event.stopPropagation()}>{tx('Assign')}</Link> : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {kpiDetail ? (
        <Drawer title={tx(kpiTitle(kpiDetail))} onClose={() => setKpiDetail(null)}>
          <KpiDetailBody detail={kpiDetail} items={detailItems} onOpenDueDetail={(id) => setSelectedDueId(id)} tx={tx} />
        </Drawer>
      ) : null}

      {selectedVehicle ? (
        <Drawer title={`${selectedVehicle.vehicleCode} ${tx('vehicle detail')}`} onClose={() => setSelectedVehicleId(null)}>
          <div className="compact-list-stack operations-drawer-stack">
            <MetricTileGrid
              items={[
                { label: tx('Status'), value: tx(humanize(selectedVehicle.boardStatus)), tone: toneClass(selectedVehicle.boardStatus) },
                { label: tx('Branch'), value: selectedVehicle.branch },
                { label: tx('Current KM'), value: `${formatNumber(selectedVehicle.currentKm)} km` },
                { label: tx('Readiness'), value: tx(selectedVehicle.safetyBadge), tone: toneClass(selectedVehicle.safetyBadge) },
              ]}
            />
            <DrawerSectionCard title={tx('Assignment and field context')}>
              <InfoRow label={tx('Vehicle profile')} value={`${selectedVehicle.type} · ${selectedVehicle.capacityTons || tx('N/A')} tons`} />
              <InfoRow label={tx('Current location')} value={selectedVehicle.currentLocation} />
              <InfoRow label={tx('Assigned driver')} value={selectedVehicle.driver} />
              <InfoRow label={tx('Driver phone')} value={selectedVehicle.driverPhone} />
              <InfoRow label={tx('Current trip')} value={selectedVehicle.currentTrip} />
              <InfoRow label={tx('Last GPS')} value={formatDateTime(selectedVehicle.lastGpsAt)} />
            </DrawerSectionCard>
            <DrawerSectionCard title={tx('Service and safety')}>
              <InfoRow label={tx('Last fuel')} value={formatDateTime(selectedVehicle.lastFuelAt)} />
              <InfoRow label={tx('Last tire change')} value={formatDateTime(selectedVehicle.lastTireChangeDate)} />
              <InfoRow label={tx('Last maintenance')} value={formatDateTime(selectedVehicle.lastServiceDate)} />
              <InfoRow
                label={tx('Next due service')}
                value={typeof selectedVehicle.nextDueService === 'number' ? `${formatNumber(selectedVehicle.nextDueService)} km` : formatDateTime(selectedVehicle.nextDueService as string | null)}
              />
              <InfoRow label={tx('Active issues / reports')} value={String(selectedVehicle.activeIssueCount)} tone={selectedVehicle.activeIssueCount ? 'warning' : 'good'} />
            </DrawerSectionCard>
            {selectedVehicle.activeRepairOrder ? (
              <DrawerSectionCard title={tx('Open repair order')}>
                <div className="operations-drawer-highlight">
                  <strong>{selectedVehicle.activeRepairOrder.code}</strong>
                  <p>{selectedVehicle.activeRepairOrder.issue}</p>
                  <span className="label">{selectedVehicle.activeRepairOrder.technician} · {selectedVehicle.activeRepairOrder.workshop}</span>
                  <span className="label">{tx('Opened')} {formatDateTime(selectedVehicle.activeRepairOrder.openedAt)} · ETA {formatDateTime(selectedVehicle.activeRepairOrder.estimatedCompletion)}</span>
                </div>
                <ActionRow
                  links={[
                    { href: '/maintenance/repair-orders', label: tx('Open repair order') },
                    { href: `/maintenance/vehicles/${selectedVehicle.id}/history`, label: tx('Vehicle history') },
                    ...(selectedVehicle.readyForAssignment ? [{ href: '/trips', label: tx('Assign trip') }] : []),
                  ]}
                />
              </DrawerSectionCard>
            ) : (
              <ActionRow
                links={[
                  { href: `/maintenance/vehicles/${selectedVehicle.id}/history`, label: tx('Open vehicle history') },
                  ...(selectedVehicle.readyForAssignment ? [{ href: '/trips', label: tx('Assign trip') }] : []),
                ]}
              />
            )}
          </div>
        </Drawer>
      ) : null}

      {selectedPartner ? (
        <Drawer title={`${selectedPartner.partnerName} ${tx('detail')}`} onClose={() => setSelectedPartnerId(null)}>
          <div className="compact-list-stack operations-drawer-stack">
            <MetricTileGrid
              items={[
                { label: tx('Performance'), value: formatNumber(selectedPartner.performanceScore), tone: selectedPartner.recommended ? 'good' : 'warning' },
                { label: tx('On-time rate'), value: `${selectedPartner.onTimeRate}%` },
                { label: tx('Response speed'), value: `${formatNumber(selectedPartner.responseMinutes)} min` },
                { label: tx('Recommended'), value: selectedPartner.recommended ? tx('Yes') : tx('No'), tone: selectedPartner.recommended ? 'good' : 'info' },
              ]}
            />
            <DrawerSectionCard title={tx('Partner profile')}>
              <InfoRow label={tx('Partner company')} value={selectedPartner.partnerName} />
              <InfoRow label={tx('Primary contact')} value={selectedPartner.contactName} />
              <InfoRow label={tx('Phone')} value={selectedPartner.phone} />
              <InfoRow label={tx('Fleet type')} value={selectedPartner.fleetType} />
            </DrawerSectionCard>
            <DrawerSectionCard title={tx('Performance and cost')}>
              <InfoRow label={tx('Trips handled')} value={formatNumber(selectedPartner.tripsHandled)} />
              <InfoRow label={tx('Incident count')} value={formatNumber(selectedPartner.incidentCount)} />
              <InfoRow label={tx('Average cost')} value={`ETB ${formatNumber(selectedPartner.averageRentalCost)}`} />
              <InfoRow label={tx('Total spend')} value={`ETB ${formatNumber(selectedPartner.totalSpend)}`} />
            </DrawerSectionCard>
            <DrawerSectionCard title={tx('Active external vehicles')}>
              {!selectedPartner.activeTrips.length ? <p className="console-message">{tx('No active rental trips.')}</p> : selectedPartner.activeTrips.map((trip) => (
                <div key={trip.tripCode} className="operations-drawer-list-row">
                  <strong>{trip.vehicleCode}</strong>
                  <p>{trip.externalDriverName} · {trip.externalDriverPhone}</p>
                  <p className="label">{trip.tripCode} · {trip.currentLocation} · ETB {formatNumber(trip.rentalCost)}</p>
                </div>
              ))}
            </DrawerSectionCard>
          </div>
        </Drawer>
      ) : null}

      {selectedDueItem ? (
        <Drawer title={`${selectedDueItem.vehicleCode} ${tx('service detail')}`} onClose={() => setSelectedDueId(null)}>
          <div className="compact-list-stack operations-drawer-stack">
            <MetricTileGrid
              items={[
                { label: tx('Urgency'), value: tx(selectedDueItem.priority), tone: toneClass(selectedDueItem.priority) },
                { label: tx('Overdue'), value: selectedDueItem.overdue ? tx('Yes') : tx('No'), tone: selectedDueItem.overdue ? 'critical' : 'good' },
                { label: tx('Current KM'), value: `${formatNumber(selectedDueItem.currentKm)} km` },
                { label: tx('Branch'), value: selectedDueItem.branch },
              ]}
            />
            <DrawerSectionCard title={tx('Service planning')}>
              <InfoRow label={tx('Vehicle')} value={selectedDueItem.vehicleCode} />
              <InfoRow label={tx('Current location')} value={selectedDueItem.currentLocation} />
              <InfoRow label={tx('Service type')} value={selectedDueItem.maintenanceType} />
              <InfoRow label={tx('Service location')} value={selectedDueItem.serviceLocation} />
              <InfoRow label={tx('Assigned technician')} value={selectedDueItem.assignedTechnician} />
              <InfoRow label={tx('Scheduled service')} value={formatDateTime(selectedDueItem.scheduledServiceAt)} />
            </DrawerSectionCard>
            <DrawerSectionCard title={tx('Due thresholds')}>
              <InfoRow label={tx('Next tire due')} value={selectedDueItem.nextTireDueKm ? `${formatNumber(selectedDueItem.nextTireDueKm)} km` : tx('N/A')} />
              <InfoRow
                label={tx('Next maintenance due')}
                value={selectedDueItem.nextMaintenanceDueDate ? formatDateTime(selectedDueItem.nextMaintenanceDueDate) : selectedDueItem.nextMaintenanceDueKm ? `${formatNumber(selectedDueItem.nextMaintenanceDueKm)} km` : tx('N/A')}
              />
              {selectedDueItem.repairOrderCode ? <InfoRow label={tx('Repair order')} value={selectedDueItem.repairOrderCode} /> : null}
            </DrawerSectionCard>
            <ActionRow
              links={[
                { href: selectedDueItem.quickLink, label: tx('Maintenance history') },
                { href: '/maintenance/repair-orders', label: tx('Repair orders') },
              ]}
            />
          </div>
        </Drawer>
      ) : null}
    </main>
  );
}

function alertDetail(key: string) {
  switch (key) {
    case 'tire_due':
      return 'Check tire inspection queue and dispatch workshop follow-up.';
    case 'maintenance_overdue':
      return 'Push these vehicles into repair or block assignment immediately.';
    case 'blocked_vehicles':
      return 'Review block reason, owner, and next action before dispatching.';
    case 'missing_fuel_log':
      return 'Active trip moved without a same-day fuel or odometer entry.';
    case 'stale_odometer':
      return 'Vehicle has not reported a recent odometer update.';
    case 'no_available_vehicle':
      return 'Selected branch cannot assign an internal vehicle right now.';
    case 'rental_partner_required':
      return 'Internal capacity is full. Review partner recommendations.';
    default:
      return 'Operational exception requiring follow-up.';
  }
}

function kpiTitle(detail: KpiDetail) {
  switch (detail.kind) {
    case 'available':
      return 'Available Cars';
    case 'rented':
      return 'Rented External Cars';
    case 'maintenance':
      return 'Under Maintenance';
    case 'blocked':
      return 'Blocked Vehicles';
    case 'fuel':
      return 'Fuel Logs Today';
    case 'service':
      return 'Service Due Soon';
  }
}

function KpiDetailBody({
  detail,
  items,
  onOpenDueDetail,
  tx,
}: {
  detail: KpiDetail;
  items: any[];
  onOpenDueDetail?: (id: string) => void;
  tx: (text: string) => string;
}) {
  if (!items.length) {
    return <div className="empty-state inline-state-card"><p>{tx('No matching records are available for this view right now.')}</p></div>;
  }

  return (
    <div className="compact-list-stack">
      {items.map((item, index) => {
        if (detail.kind === 'available') {
          return (
            <div key={item.id} className="compact-list-row">
              <div>
                <strong>{item.vehicleCode}</strong>
                <p>{item.type} · {item.branch} · {item.currentLocation}</p>
                <p className="label">{item.driverName} · {item.driverPhone} · {formatNumber(item.currentKm)} km · {formatDateTime(item.lastGpsAt)}</p>
              </div>
              <div className="console-text-right">
                <span className={`status-badge ${toneClass(item.readyStatus)}`}>{tx(item.readyStatus)}</span>
                <div className="console-gap-top-sm"><Link href="/trips" className="inline-action">{tx('Assign trip')}</Link></div>
              </div>
            </div>
          );
        }
        if (detail.kind === 'rented') {
          return (
            <div key={`${item.partnerId}-${item.tripCode}-${index}`} className="compact-list-row">
              <div>
                <strong>{item.vehicleCode} · {item.partnerName}</strong>
                <p>{item.externalDriverName} · {item.externalDriverPhone}</p>
                <p className="label">{item.currentLocation} · {item.tripCode} · ETB {formatNumber(item.rentalCost)}</p>
              </div>
              <div className="console-text-right">
                <span className={`status-badge ${toneClass(item.status)}`}>{tx(humanize(item.status))}</span>
                <div className="label console-gap-top-sm">{tx('Score')} {formatNumber(item.performanceScore)}</div>
              </div>
            </div>
          );
        }
        if (detail.kind === 'maintenance') {
          return (
            <div key={item.id} className="compact-list-row">
              <div>
                <strong>{item.vehicleCode}</strong>
                <p>{item.issue}</p>
                <p className="label">{item.assignedMaintenancePerson} · {item.assignedWorkshop} · {formatDateTime(item.openedDate)}</p>
              </div>
              <div className="console-text-right">
                <span className={`status-badge ${item.blocked ? 'critical' : 'warning'}`}>{item.blocked ? tx('Blocked') : tx('Open')}</span>
                <div className="console-gap-top-sm">{item.repairOrderCode ? <Link href="/maintenance/repair-orders" className="inline-action">{tx('Open repair order')}</Link> : null}</div>
              </div>
            </div>
          );
        }
        if (detail.kind === 'blocked') {
          return (
            <div key={item.id} className="compact-list-row">
              <div>
                <strong>{item.vehicleCode}</strong>
                <p>{item.issue || tx(humanize(item.reason))}</p>
                <p className="label">{item.currentLocation || tx('Location not recorded')} · {item.assignedWorkshop || tx('Workshop not assigned')}</p>
                <p className="label">{item.openedDate ? formatDateTime(item.openedDate) : tx('Opened during the current operations cycle')} · {item.assignedMaintenancePerson || tx('Operations control')}</p>
              </div>
              <div className="console-text-right">
                <span className="status-badge critical">{tx(item.requiredAction)}</span>
                {item.repairOrderCode ? <div className="label console-gap-top-sm">{item.repairOrderCode}</div> : null}
              </div>
            </div>
          );
        }
        if (detail.kind === 'fuel') {
          return (
            <div key={item.id} className="compact-list-row">
              <div>
                <strong>{item.vehicle} · {item.driver}</strong>
                <p>{item.phone} · {item.station}</p>
                <p className="label">{formatNumber(item.liters)} L · ETB {formatNumber(item.cost)} · {formatNumber(item.odometerKm)} km</p>
              </div>
              <div className="console-text-right">
                <div className="label">{formatDateTime(item.date)}</div>
                {item.receipt ? <a href={item.receipt} className="inline-action">{tx('Receipt')}</a> : null}
              </div>
            </div>
          );
        }
        return (
          <div key={item.id} className="compact-list-row">
            <div>
              <strong>{item.vehicleCode}</strong>
              <p>{item.branch} · {item.currentLocation}</p>
              <p className="label">{tx('Service at')} {item.serviceLocation} · {item.assignedTechnician}</p>
              <p className="label">
                {formatNumber(item.currentKm)} km
                {' · '}
                {tx('Next tire')} {item.nextTireDueKm ? `${formatNumber(item.nextTireDueKm)} km` : tx('N/A')}
                {' · '}
                {tx('Next service')} {item.nextMaintenanceDueDate ? formatDateTime(item.nextMaintenanceDueDate) : item.nextMaintenanceDueKm ? `${formatNumber(item.nextMaintenanceDueKm)} km` : tx('N/A')}
              </p>
              {item.scheduledServiceAt ? <p className="label">{tx('Scheduled')} {formatDateTime(item.scheduledServiceAt)}</p> : null}
              {item.repairOrderCode ? <p className="label">{tx('Repair order')} {item.repairOrderCode}</p> : null}
            </div>
            <div className="console-text-right">
              <span className={`status-badge ${item.overdue ? 'critical' : toneClass(item.priority)}`}>{item.overdue ? tx('Overdue') : tx(item.priority)}</span>
              <div className="console-gap-top-sm console-wrap-actions console-justify-end">
                {onOpenDueDetail ? (
                  <button type="button" className="inline-action" onClick={() => onOpenDueDetail(item.id)}>
                    {tx('Details')}
                  </button>
                ) : null}
                <Link href={item.quickLink} className="inline-action">{tx('Maintenance history')}</Link>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KpiCard({
  label,
  value,
  helper,
  tone = 'info',
  onClick,
  fallback,
}: {
  label: string;
  value: number | null | undefined;
  helper: string;
  tone?: string;
  onClick?: () => void;
  fallback: string;
}) {
  return (
    <button
      type="button"
      className={`critical-alert-card operations-kpi-card ${tone} ${onClick ? 'console-click-row' : 'console-cursor-default'}`}
      onClick={onClick}
    >
      <div className="critical-alert-label">{label}</div>
      <div className="critical-alert-value">{formatKpiDisplay(value, fallback)}</div>
      <div className="label">{helper}</div>
    </button>
  );
}

function StatCard({
  label,
  value,
  prefix = '',
  suffix = '',
  fallback,
}: {
  label: string;
  value: number | null | undefined;
  prefix?: string;
  suffix?: string;
  fallback: string;
}) {
  const display = formatKpiDisplay(value, fallback);
  return (
    <section className="card operations-stat-card">
      <div className="eyebrow">{label}</div>
      <div className="kpi-value console-gap-top-sm">{display === fallback ? display : `${prefix}${display}${suffix}`}</div>
    </section>
  );
}

function DetailStrip({
  emptyMessage,
  rows,
}: {
  emptyMessage: string;
  rows: Array<{ key: string; title: string; subtitle: string; meta: string; badge: string; tone: string; actionLabel?: string; actionHref?: string; onClick?: () => void }>;
}) {
  if (!rows.length) {
    return <div className="empty-state inline-state-card"><p>{emptyMessage}</p></div>;
  }

  return (
    <div className="compact-list-stack operations-strip-list">
      {rows.map((row) => (
        <button
          key={row.key}
          type="button"
          className={`compact-list-row operations-strip-row ${row.onClick ? 'console-click-row' : 'console-cursor-default'}`}
          onClick={row.onClick}
        >
          <div>
            <strong>{row.title}</strong>
            <p>{row.subtitle}</p>
            <p className="label">{row.meta}</p>
          </div>
          <div className="console-text-right">
            <span className={`status-badge ${row.tone}`}>{row.badge}</span>
            {row.actionLabel ? (
              <div className="console-gap-top-sm">
                {row.actionHref ? <Link href={row.actionHref} className="inline-action" onClick={(event) => event.stopPropagation()}>{row.actionLabel}</Link> : <span className="inline-action">{row.actionLabel}</span>}
              </div>
            ) : null}
          </div>
        </button>
      ))}
    </div>
  );
}

function SimpleTable({
  title,
  emptyMessage,
  headers,
  rows,
}: {
  title: string;
  emptyMessage: string;
  headers: string[];
  rows: Array<Array<ReactNode>>;
}) {
  return (
    <section className="card operations-table-card">
      <div className="compact-card-header console-gap-bottom-md">
        <div>
          <div className="eyebrow">Operations</div>
          <h3>{title}</h3>
        </div>
      </div>
      {!rows.length ? (
        <div className="empty-state inline-state-card"><p>{emptyMessage}</p></div>
      ) : (
        <div className="table-shell operations-table-shell">
          <table className="data-table operations-data-table">
            <thead>
              <tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`${title}-${rowIndex}`}>
                  {row.map((cell, cellIndex) => <td key={`${title}-${rowIndex}-${cellIndex}`}>{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const { tx } = useConsoleI18n();
  return (
    <div className="operations-drawer-backdrop" onClick={onClose}>
      <aside
        className="card operations-drawer"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="operations-drawer-header">
          <div>
            <div className="eyebrow">{tx('Operations Detail')}</div>
            <h3>{title}</h3>
          </div>
          <button type="button" className="btn btn-secondary btn-compact" onClick={onClose}>{tx('Close')}</button>
        </div>
        {children}
      </aside>
    </div>
  );
}

function MetricTileGrid({ items }: { items: Array<{ label: string; value: string; tone?: string }> }) {
  return (
    <div className="operations-metric-grid">
      {items.map((item) => (
        <div key={`${item.label}-${item.value}`} className="operations-metric-tile">
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          {item.tone ? <em className={`status-badge ${item.tone}`}>{item.value}</em> : null}
        </div>
      ))}
    </div>
  );
}

function DrawerSectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card operations-drawer-section">
      <div className="eyebrow">{title}</div>
      <div className="compact-list-stack">{children}</div>
    </section>
  );
}

function ActionRow({ links }: { links: Array<{ href: string; label: string }> }) {
  return (
    <div className="operations-action-row">
      {links.map((link) => <Link key={`${link.href}-${link.label}`} className="inline-action" href={link.href}>{link.label}</Link>)}
    </div>
  );
}

function InfoRow({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="compact-list-row">
      <div>
        <strong>{label}</strong>
        <p>{value}</p>
      </div>
      {tone ? <span className={`status-badge ${tone}`}>{value}</span> : null}
    </div>
  );
}

const stickyHeaderStyle: CSSProperties = {
  position: 'sticky',
  top: 0,
  background: '#f8fafc',
  zIndex: 1,
};

function StickyHeader({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <th style={stickyHeaderStyle}>
      <button type="button" onClick={onClick} className="console-header-button">
        {label}
      </button>
    </th>
  );
}
