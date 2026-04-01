// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { connectToDatabase } from '../../database/mongo';
import {
  BranchModel,
  DriverModel,
  DriverProfileModel,
  DriverReportModel,
  FuelLogModel,
  MaintenancePlanModel,
  MaintenanceRecordModel,
  PartReplacementModel,
  RepairOrderModel,
  RentalPartnerModel,
  RentalPartnerTripModel,
  TripModel,
  UserModel,
  VehicleModel,
  VehicleServiceHistoryModel,
} from '../../database/models';
import { AuthenticatedUser } from '../auth/auth.types';

const ACTIVE_TRIP_STATUSES = ['assigned', 'loading', 'loaded', 'in_transit', 'at_checkpoint', 'at_border', 'offloading', 'in_djibouti', 'delayed'];
const MAINTENANCE_STATUSES = ['under_maintenance', 'breakdown'];
const OFFLINE_THRESHOLD_MS = 20 * 60 * 1000;

function startOfDay() {
  const value = new Date();
  value.setHours(0, 0, 0, 0);
  return value;
}

function startOfWeek() {
  const value = startOfDay();
  value.setDate(value.getDate() - 7);
  return value;
}

function startOfMonth() {
  const value = new Date();
  value.setDate(1);
  value.setHours(0, 0, 0, 0);
  return value;
}

function shouldUseRequestedBranch(user: AuthenticatedUser) {
  return user.permissions.includes('*') || ['super_admin', 'executive'].includes(user.role);
}

function buildBranchQuery(user: AuthenticatedUser, branch?: string) {
  const resolvedBranch = shouldUseRequestedBranch(user) ? branch : user.branch;
  return resolvedBranch ? { branchName: resolvedBranch } : {};
}

function boardStatusForVehicle(vehicle: any) {
  const lastGpsAt = vehicle?.lastGpsAt ? new Date(String(vehicle.lastGpsAt)) : null;
  const isOffline = Boolean(lastGpsAt && lastGpsAt.getTime() < Date.now() - OFFLINE_THRESHOLD_MS && vehicle.currentTripId);
  if (isOffline) return 'offline';
  if (vehicle.currentStatus === 'available') return 'available';
  if (vehicle.currentStatus === 'assigned') return 'assigned';
  if (['loading', 'loaded'].includes(String(vehicle.currentStatus))) return 'loading';
  if (['in_transit', 'at_checkpoint', 'at_border', 'delayed'].includes(String(vehicle.currentStatus))) return 'on_road';
  if (vehicle.currentStatus === 'offloading') return 'offloading';
  if (vehicle.currentStatus === 'in_djibouti') return 'in_djibouti';
  if (['blocked', 'accident'].includes(String(vehicle.currentStatus)) || vehicle.readyForAssignment === false && vehicle.safetyStatus === 'blocked') return 'blocked';
  if (MAINTENANCE_STATUSES.includes(String(vehicle.currentStatus))) return 'under_maintenance';
  return vehicle.currentStatus || 'available';
}

function severityForDue(item: any) {
  if (item.overdue) return 'critical';
  if (item.blockedAssignment) return 'high';
  return item.criticalFlag ? 'high' : 'medium';
}

function branchToCity(branchName?: string | null) {
  const value = String(branchName ?? '').toLowerCase();
  if (!value) return null;
  if (value.includes('addis')) return 'Addis Ababa';
  if (value.includes('adama')) return 'Adama';
  if (value.includes('dire dawa')) return 'Dire Dawa';
  if (value.includes('djibouti')) return 'Djibouti';
  if (value.includes('kombolcha')) return 'Kombolcha';
  if (value.includes('gondar')) return 'Gondar';
  if (value.includes('modjo')) return 'Modjo';
  return branchName ?? null;
}

function cityFromCoordinates(latitude?: number | null, longitude?: number | null) {
  if (latitude == null || longitude == null) return null;
  const points = [
    { label: 'Addis Ababa', latitude: 8.9806, longitude: 38.7578 },
    { label: 'Adama', latitude: 8.5408, longitude: 39.2716 },
    { label: 'Galafi Border', latitude: 9.5931, longitude: 41.8661 },
    { label: 'Dire Dawa', latitude: 9.6009, longitude: 41.8501 },
    { label: 'Awash', latitude: 8.987, longitude: 40.17 },
    { label: 'Djibouti', latitude: 11.5721, longitude: 43.1456 },
    { label: 'Modjo', latitude: 8.5871, longitude: 39.1219 },
    { label: 'Gondar', latitude: 11.0815, longitude: 39.7435 },
    { label: 'Kombolcha', latitude: 11.084, longitude: 39.742 },
  ];
  let best: { label: string; distance: number } | null = null;
  for (const point of points) {
    const distance = Math.abs(latitude - point.latitude) + Math.abs(longitude - point.longitude);
    if (!best || distance < best.distance) {
      best = { label: point.label, distance };
    }
  }
  return best && best.distance < 1.5 ? best.label : null;
}

function formatLocationLabel(vehicle: any, trip: any) {
  const checkpoint = String(trip?.currentCheckpoint ?? '').toLowerCase().trim();
  if (checkpoint === 'djibouti' || trip?.djiboutiFlag) return 'Djibouti';
  if (checkpoint === 'at_border') return 'Galafi Border';
  if (checkpoint === 'origin') return trip?.origin || branchToCity(vehicle?.branchName) || 'Origin';
  if (checkpoint === 'destination') return trip?.destination || branchToCity(vehicle?.branchName) || 'Destination';
  if (checkpoint === 'checkpoint') {
    return cityFromCoordinates(
      vehicle?.currentLocation?.coordinates?.[1] ?? vehicle?.lastKnownLocation?.latitude,
      vehicle?.currentLocation?.coordinates?.[0] ?? vehicle?.lastKnownLocation?.longitude,
    ) || 'En route';
  }
  if (checkpoint) return checkpoint.replace(/_/g, ' ');
  const coordinates = vehicle?.currentLocation?.coordinates;
  if (Array.isArray(coordinates) && coordinates.length === 2) {
    return cityFromCoordinates(Number(coordinates[1]), Number(coordinates[0])) || branchToCity(vehicle?.branchName) || 'Location pending';
  }
  const lastKnown = vehicle?.lastKnownLocation;
  if (lastKnown?.latitude != null && lastKnown?.longitude != null) {
    return cityFromCoordinates(Number(lastKnown.latitude), Number(lastKnown.longitude)) || branchToCity(vehicle?.branchName) || 'Location pending';
  }
  return branchToCity(vehicle?.branchName) || 'Location pending';
}

@Injectable()
export class OperationsService {
  async resolveBranchScope(user: AuthenticatedUser, branch?: string) {
    const branchName = shouldUseRequestedBranch(user) ? branch : user.branch;
    if (!branchName) {
      return {};
    }
    const branchDoc = await BranchModel.findOne({ name: branchName }).select('_id name').lean();
    return {
      branchName,
      branchId: branchDoc?._id ? String(branchDoc._id) : user.branchId,
    };
  }

  async getFleetSummary(user: AuthenticatedUser, branch?: string) {
    await connectToDatabase();
    const branchScope = await this.resolveBranchScope(user, branch);
    const today = startOfDay();
    const dueSoonDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const [vehicles, activeTrips, maintenanceDueSoon, overduePlans, blockedPlans, fuelLogsToday, rentalTrips, activeFuelTrips] = await Promise.all([
      VehicleModel.find(branchScope.branchName ? { branchName: branchScope.branchName } : {}).lean(),
      TripModel.find({ ...(branchScope.branchName ? { branchName: branchScope.branchName } : {}), status: { $in: ACTIVE_TRIP_STATUSES } }).select('_id vehicleId vehicleCode branchName status').lean(),
      MaintenancePlanModel.countDocuments({
        ...(branchScope.branchId ? { branchId: branchScope.branchId } : {}),
        status: { $in: ['active', 'due', 'overdue'] },
        $or: [{ nextDueDate: { $lte: dueSoonDate } }, { nextDueKm: { $lte: 1000 } }],
      }),
      MaintenancePlanModel.find({
        ...(branchScope.branchId ? { branchId: branchScope.branchId } : {}),
        status: { $in: ['active', 'due', 'overdue'] },
        overdue: true,
      }).limit(40).lean(),
      MaintenancePlanModel.find({
        ...(branchScope.branchId ? { branchId: branchScope.branchId } : {}),
        status: { $in: ['active', 'due', 'overdue'] },
        blockedAssignment: true,
      }).limit(40).lean(),
      FuelLogModel.countDocuments({ ...(branchScope.branchId ? { branchId: branchScope.branchId } : {}), date: { $gte: today } }),
      RentalPartnerTripModel.find({ ...(branchScope.branchId ? { branchId: branchScope.branchId } : {}), status: { $in: ['assigned', 'in_progress'] } }).lean(),
      FuelLogModel.find({ ...(branchScope.branchId ? { branchId: branchScope.branchId } : {}), date: { $gte: today } }).select('tripId').lean(),
    ]);

    const vehiclesByBoardStatus = vehicles.reduce((acc, vehicle) => {
      const key = boardStatusForVehicle(vehicle);
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const activeTripIdsWithFuel = new Set(activeFuelTrips.map((item) => String(item.tripId ?? '')));
    const missingFuelLogCount = activeTrips.filter((trip) => !activeTripIdsWithFuel.has(String(trip._id))).length;
    const noAvailableVehicle = (vehiclesByBoardStatus.available ?? 0) === 0;
    const rentalPartnerRequired = noAvailableVehicle && activeTrips.length > 0;
    const staleOdometerCount = vehicles.filter((vehicle) => {
      if (!vehicle.lastFuelAt) return true;
      return new Date(String(vehicle.lastFuelAt)).getTime() < Date.now() - 14 * 24 * 60 * 60 * 1000;
    }).length;

    return {
      kpis: {
        totalFleet: vehicles.length,
        availableCars: vehiclesByBoardStatus.available ?? 0,
        onRoad: vehiclesByBoardStatus.on_road ?? 0,
        underMaintenance: vehiclesByBoardStatus.under_maintenance ?? 0,
        blockedVehicles: vehiclesByBoardStatus.blocked ?? 0,
        rentedExternalCars: rentalTrips.length,
        fuelLogsToday,
        serviceDueSoon: maintenanceDueSoon,
      },
      alerts: [
        { key: 'tire_due', label: 'Tire due', count: overduePlans.filter((item) => String(item.serviceItemName).toLowerCase().includes('tire')).length, tone: 'warning' },
        { key: 'maintenance_overdue', label: 'Maintenance overdue', count: overduePlans.length, tone: 'critical' },
        { key: 'blocked_vehicles', label: 'Blocked vehicles', count: blockedPlans.length, tone: 'critical' },
        { key: 'missing_fuel_log', label: 'Missing fuel log for active trip', count: missingFuelLogCount, tone: missingFuelLogCount ? 'warning' : 'good' },
        { key: 'stale_odometer', label: 'Stale odometer update', count: staleOdometerCount, tone: staleOdometerCount ? 'warning' : 'good' },
        { key: 'no_available_vehicle', label: 'No available vehicle in selected branch', count: noAvailableVehicle ? 1 : 0, tone: noAvailableVehicle ? 'critical' : 'good' },
        { key: 'rental_partner_required', label: 'Rental partner required', count: rentalPartnerRequired ? 1 : 0, tone: rentalPartnerRequired ? 'warning' : 'good' },
      ],
    };
  }

  async getVehicleStatusBoard(user: AuthenticatedUser, branch?: string) {
    await connectToDatabase();
    const branchScope = await this.resolveBranchScope(user, branch);
    const vehicles = await VehicleModel.find(branchScope.branchName ? { branchName: branchScope.branchName } : {}).sort({ updatedAt: -1 }).limit(200).lean();
    const driverIds = vehicles.map((item) => item.assignedDriverId).filter(Boolean);
    const tripIds = vehicles.map((item) => item.currentTripId).filter(Boolean);
    const [drivers, driverProfiles, trips, overduePlans, activeIssues, fuelLogs, serviceHistory, partReplacements, repairOrders] = await Promise.all([
      DriverModel.find({ _id: { $in: driverIds } }).select('_id firstName lastName driverCode userId').lean(),
      DriverProfileModel.find({ driverId: { $in: driverIds } }).select('driverId phone').lean(),
      TripModel.find({ _id: { $in: tripIds } }).select('_id tripCode status origin destination currentCheckpoint djiboutiFlag branchName').lean(),
      MaintenancePlanModel.find({ vehicleId: { $in: vehicles.map((item) => item._id) }, status: { $in: ['active', 'due', 'overdue'] } })
        .select('vehicleId serviceItemName overdue blockedAssignment nextDueDate nextDueKm criticalFlag').lean(),
      DriverReportModel.find({ vehicleId: { $in: vehicles.map((item) => item._id) }, status: { $in: ['submitted', 'under_review'] } })
        .select('vehicleId').lean(),
      FuelLogModel.find({ vehicleId: { $in: vehicles.map((item) => item._id) } }).sort({ date: -1 }).select('vehicleId date').lean(),
      VehicleServiceHistoryModel.find({ vehicleId: { $in: vehicles.map((item) => item._id) } }).sort({ serviceDate: -1 }).select('vehicleId serviceCategory serviceDate nextServiceDueDate nextServiceDueKm').lean(),
      PartReplacementModel.find({ vehicleId: { $in: vehicles.map((item) => item._id) } }).sort({ replacementDate: -1 }).select('vehicleId partName replacementDate').lean(),
      RepairOrderModel.find({ vehicleId: { $in: vehicles.map((item) => item._id) }, status: { $in: ['reported', 'under_review', 'approved', 'scheduled', 'in_service'] } })
        .sort({ openedAt: -1 }).select('vehicleId repairOrderCode issueType description technician workshop openedAt scheduledAt blockedAssignment').lean(),
    ]);

    const driverById = new Map(drivers.map((item) => [String(item._id), item]));
    const driverUsers = await UserModel.find({ _id: { $in: drivers.map((item) => item.userId).filter(Boolean) } }).select('_id phone').lean();
    const userPhoneById = new Map(driverUsers.map((item) => [String(item._id), item.phone]));
    const driverProfileByDriverId = new Map(driverProfiles.map((item) => [String(item.driverId), item]));
    const tripById = new Map(trips.map((item) => [String(item._id), item]));
    const planByVehicle = new Map<string, any[]>();
    for (const plan of overduePlans) {
      const key = String(plan.vehicleId);
      if (!planByVehicle.has(key)) planByVehicle.set(key, []);
      planByVehicle.get(key)!.push(plan);
    }
    const latestFuelByVehicle = new Map<string, any>();
    for (const item of fuelLogs) {
      const key = String(item.vehicleId);
      if (!latestFuelByVehicle.has(key)) latestFuelByVehicle.set(key, item);
    }
    const latestServiceByVehicle = new Map<string, any>();
    const latestTireByVehicle = new Map<string, any>();
    for (const item of serviceHistory) {
      const key = String(item.vehicleId);
      if (String(item.serviceCategory).toLowerCase() === 'tire') {
        if (!latestTireByVehicle.has(key)) latestTireByVehicle.set(key, item);
      } else if (!latestServiceByVehicle.has(key)) {
        latestServiceByVehicle.set(key, item);
      }
    }
    const latestPartByVehicle = new Map<string, any>();
    for (const item of partReplacements) {
      const key = String(item.vehicleId);
      if (!latestPartByVehicle.has(key)) latestPartByVehicle.set(key, item);
    }
    const repairOrderByVehicle = new Map<string, any>();
    for (const order of repairOrders) {
      const key = String(order.vehicleId);
      if (!repairOrderByVehicle.has(key)) repairOrderByVehicle.set(key, order);
    }
    const issueCountByVehicle = activeIssues.reduce((acc, item) => {
      const key = String(item.vehicleId);
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const counts = {
      available: 0,
      assigned: 0,
      loading: 0,
      on_road: 0,
      offloading: 0,
      in_djibouti: 0,
      under_maintenance: 0,
      blocked: 0,
      offline: 0,
    };

    const rows = vehicles.map((vehicle) => {
      const boardStatus = boardStatusForVehicle(vehicle);
      counts[boardStatus] = (counts[boardStatus] ?? 0) + 1;
      const driver = driverById.get(String(vehicle.assignedDriverId ?? ''));
      const driverProfile = driverProfileByDriverId.get(String(vehicle.assignedDriverId ?? ''));
      const trip = tripById.get(String(vehicle.currentTripId ?? ''));
      const plans = planByVehicle.get(String(vehicle._id)) ?? [];
      const latestFuel = latestFuelByVehicle.get(String(vehicle._id)) ?? null;
      const latestService = latestServiceByVehicle.get(String(vehicle._id)) ?? null;
      const latestTire = latestTireByVehicle.get(String(vehicle._id)) ?? null;
      const latestPart = latestPartByVehicle.get(String(vehicle._id)) ?? null;
      const repairOrder = repairOrderByVehicle.get(String(vehicle._id)) ?? null;
      const maintenanceOverdue = plans.some((item) => item.overdue);
      const tireDue = plans.some((item) => String(item.serviceItemName).toLowerCase().includes('tire') && (item.overdue || item.nextDueKm <= (vehicle.currentOdometerKm ?? vehicle.odometerKm ?? 0) + 500));
      const activeIssue = (issueCountByVehicle[String(vehicle._id)] ?? 0) > 0;
      const safe = vehicle.readyForAssignment !== false && !maintenanceOverdue && !tireDue && !activeIssue && !['blocked', 'under_maintenance', 'breakdown'].includes(boardStatus);
      return {
        id: String(vehicle._id),
        vehicleCode: vehicle.vehicleCode,
        type: vehicle.type || 'Vehicle',
        capacityTons: Number(vehicle.capacityTons ?? 0),
        branch: vehicle.branchName,
        currentStatus: vehicle.currentStatus,
        boardStatus,
        currentKm: Number(vehicle.currentOdometerKm ?? vehicle.odometerKm ?? 0),
        driver: driver ? `${driver.firstName} ${driver.lastName}` : 'Unassigned',
        driverPhone: driverProfile?.phone ?? userPhoneById.get(String(driver?.userId ?? '')) ?? 'No phone',
        currentLocation: formatLocationLabel(vehicle, trip),
        currentTrip: trip?.tripCode ?? 'Ready',
        tripStatus: trip?.status ?? 'ready',
        lastGpsAt: vehicle.lastGpsAt ?? null,
        availability: boardStatus === 'available' ? 'available' : 'unavailable',
        readyForAssignment: Boolean(vehicle.readyForAssignment !== false && boardStatus === 'available'),
        blocked: Boolean(plans.some((item) => item.blockedAssignment) || boardStatus === 'blocked'),
        maintenanceOverdue,
        tireDue,
        activeIssue,
        lastServiceDate: vehicle.lastMaintenanceAt ?? null,
        safetyBadge: safe ? 'safe' : maintenanceOverdue || tireDue || activeIssue ? 'attention' : 'blocked',
        action: boardStatus === 'available' ? 'Assign trip' : 'View status',
        lastFuelAt: latestFuel?.date ?? vehicle.lastFuelAt ?? null,
        lastTireChangeDate: latestTire?.serviceDate ?? vehicle.lastTireChangeAt ?? null,
        nextDueService: latestService?.nextServiceDueDate ?? vehicle.nextMaintenanceDueKm ?? null,
        activeIssueCount: issueCountByVehicle[String(vehicle._id)] ?? 0,
        activeRepairOrder: repairOrder
          ? {
              code: repairOrder.repairOrderCode,
              issue: repairOrder.issueType || repairOrder.description,
              technician: repairOrder.technician || 'Unassigned',
              workshop: repairOrder.workshop || 'Unassigned',
              openedAt: repairOrder.openedAt ?? null,
              estimatedCompletion: repairOrder.scheduledAt ?? null,
              blocked: Boolean(repairOrder.blockedAssignment),
            }
          : null,
        lastPartReplaced: latestPart?.partName ?? null,
      };
    });

    return { counts, rows };
  }

  async getActiveTrips(user: AuthenticatedUser, branch?: string) {
    await connectToDatabase();
    const branchScope = await this.resolveBranchScope(user, branch);
    const trips = await TripModel.find({
      ...(branchScope.branchName ? { branchName: branchScope.branchName } : {}),
      status: { $in: ACTIVE_TRIP_STATUSES },
    })
      .sort({ plannedArrivalAt: 1, updatedAt: -1 })
      .limit(24)
      .select('_id tripCode customerName origin destination routeName status plannedArrivalAt delayedMinutes driverId driverName vehicleCode currentCheckpoint djiboutiFlag branchName')
      .lean();
    const driverIds = trips.map((item) => item.driverId).filter(Boolean);
    const [drivers, profiles] = await Promise.all([
      DriverModel.find({ _id: { $in: driverIds } }).select('_id userId firstName lastName').lean(),
      DriverProfileModel.find({ driverId: { $in: driverIds } }).select('driverId phone').lean(),
    ]);
    const users = await UserModel.find({ _id: { $in: drivers.map((item) => item.userId).filter(Boolean) } }).select('_id phone phoneNumber').lean();
    const driverById = new Map(drivers.map((item) => [String(item._id), item]));
    const profileByDriverId = new Map(profiles.map((item) => [String(item.driverId), item]));
    const userById = new Map(users.map((item) => [String(item._id), item]));

    return trips.map((trip) => {
      const driver = driverById.get(String(trip.driverId ?? ''));
      const driverUser = driver?.userId ? userById.get(String(driver.userId)) : null;
      return {
        id: String(trip._id),
        tripCode: trip.tripCode,
        customer: trip.customerName || 'Customer pending',
        vehicleCode: trip.vehicleCode || 'Vehicle pending',
        route: trip.routeName || `${trip.origin || 'Origin'} -> ${trip.destination || 'Destination'}`,
        currentLocation: formatLocationLabel(
          { branchName: trip.branchName },
          {
            currentCheckpoint: trip.currentCheckpoint,
            origin: trip.origin,
            destination: trip.destination,
            djiboutiFlag: trip.djiboutiFlag,
          },
        ),
        destination: trip.destination || 'Destination pending',
        eta: trip.plannedArrivalAt ?? null,
        status: trip.status || 'assigned',
        driverName: trip.driverName || [driver?.firstName, driver?.lastName].filter(Boolean).join(' ') || 'Driver pending',
        driverPhone: profileByDriverId.get(String(trip.driverId ?? ''))?.phone || driverUser?.phone || driverUser?.phoneNumber || 'Phone pending',
      };
    });
  }

  async getAvailableVehicles(user: AuthenticatedUser, branch?: string) {
    const board = await this.getVehicleStatusBoard(user, branch);
    return board.rows.filter((item) => item.availability === 'available').map((item) => ({
      id: item.id,
      vehicleCode: item.vehicleCode,
      type: item.type,
      branch: item.branch,
      capacity: item.capacityTons ? `${item.capacityTons} tons` : 'Unknown',
      currentLocation: item.currentLocation,
      driverName: item.driver,
      driverPhone: item.driverPhone,
      currentKm: item.currentKm,
      lastGpsAt: item.lastGpsAt,
      readyStatus: item.safetyBadge,
      readyForAssignment: item.readyForAssignment,
      blocked: item.blocked,
      action: item.action,
    }));
  }

  async getUnavailableVehicles(user: AuthenticatedUser, branch?: string) {
    const board = await this.getVehicleStatusBoard(user, branch);
    const repairOrders = await RepairOrderModel.find({
      vehicleId: { $in: board.rows.map((item) => item.id) },
      status: { $in: ['reported', 'under_review', 'approved', 'scheduled', 'in_service'] },
    }).sort({ openedAt: -1 }).lean();
    const repairOrderByVehicle = new Map(repairOrders.map((item) => [String(item.vehicleId), item]));
    return board.rows.filter((item) => item.availability !== 'available').map((item) => {
      const repairOrder = repairOrderByVehicle.get(String(item.id));
      return {
      id: item.id,
      vehicleCode: item.vehicleCode,
      branch: item.branch,
      currentStatus: item.currentStatus,
      currentKm: item.currentKm,
      reason: item.boardStatus,
      safetyBadge: item.safetyBadge,
      currentLocation: item.currentLocation,
      driverName: item.driver,
      driverPhone: item.driverPhone,
      issue: repairOrder?.description ?? repairOrder?.issueType ?? item.currentStatus,
      assignedMaintenancePerson: repairOrder?.technician ?? 'Unassigned',
      assignedWorkshop: repairOrder?.workshop ?? 'Unassigned',
      openedDate: repairOrder?.openedAt ?? null,
      estimatedCompletion: repairOrder?.scheduledAt ?? null,
      blocked: Boolean(repairOrder?.blockedAssignment ?? item.blocked),
      requiredAction: item.boardStatus === 'blocked' ? 'Clear block reason' : 'Monitor status',
      repairOrderCode: repairOrder?.repairOrderCode ?? null,
    };
    });
  }

  async getFuelLogs(user: AuthenticatedUser, branch?: string) {
    await connectToDatabase();
    const branchScope = await this.resolveBranchScope(user, branch);
    const today = startOfDay();
    const week = startOfWeek();
    const month = startOfMonth();
    const activeVehicles = await VehicleModel.countDocuments({ ...(branchScope.branchName ? { branchName: branchScope.branchName } : {}), currentStatus: { $in: ACTIVE_TRIP_STATUSES } });
    const branchFilter = branchScope.branchId ? { branchId: branchScope.branchId } : {};
    const logs = await FuelLogModel.find(branchFilter)
      .sort({ date: -1 }).limit(40).lean();
    const [driverProfiles, drivers] = await Promise.all([
      DriverProfileModel.find({ driverId: { $in: logs.map((item) => item.driverId).filter(Boolean) } }).select('driverId phone').lean(),
      DriverModel.find({ _id: { $in: logs.map((item) => item.driverId).filter(Boolean) } }).select('_id userId').lean(),
    ]);
    const users = await UserModel.find({ _id: { $in: drivers.map((item) => item.userId).filter(Boolean) } }).select('_id phone').lean();
    const driverProfileByDriverId = new Map(driverProfiles.map((item) => [String(item.driverId), item]));
    const driverById = new Map(drivers.map((item) => [String(item._id), item]));
    const userPhoneById = new Map(users.map((item) => [String(item._id), item.phone]));
    const [todayLogs, weekLiters, monthCost] = await Promise.all([
      FuelLogModel.countDocuments({ date: { $gte: today }, ...branchFilter }),
      FuelLogModel.aggregate([{ $match: { date: { $gte: week }, ...branchFilter } }, { $group: { _id: null, total: { $sum: '$liters' } } }]),
      FuelLogModel.aggregate([{ $match: { date: { $gte: month }, ...branchFilter } }, { $group: { _id: null, total: { $sum: '$cost' } } }]),
    ]);
    const totalLitersThisWeek = Number(weekLiters[0]?.total ?? 0);
    return {
      summary: {
        fuelLogsToday: todayLogs,
        totalLitersThisWeek,
        totalFuelCostThisMonth: Number(monthCost[0]?.total ?? 0),
        averageFuelPerActiveVehicle: activeVehicles ? Number((totalLitersThisWeek / activeVehicles).toFixed(1)) : 0,
      },
      logs: logs.map((item) => ({
        id: String(item._id),
        vehicle: item.vehicleCode,
        driver: item.driverName || 'Unknown',
        phone: driverProfileByDriverId.get(String(item.driverId))?.phone ?? userPhoneById.get(String(driverById.get(String(item.driverId))?.userId ?? '')) ?? 'No phone',
        date: item.date,
        station: item.station || 'Unknown station',
        liters: Number(item.liters ?? 0),
        cost: Number(item.cost ?? 0),
        odometerKm: Number(item.odometerKm ?? 0),
        receipt: item.receiptUrl || null,
      })),
    };
  }

  async getMaintenanceDue(user: AuthenticatedUser, branch?: string) {
    await connectToDatabase();
    const branchScope = await this.resolveBranchScope(user, branch);
    const rows = await MaintenancePlanModel.find({
      ...(branchScope.branchId ? { branchId: branchScope.branchId } : {}),
      status: { $in: ['active', 'due', 'overdue'] },
    }).sort({ overdue: -1, nextDueDate: 1, nextDueKm: 1 }).limit(60).lean();
    const vehicleIds = rows.map((item) => item.vehicleId);
    const [vehicles, repairOrders] = await Promise.all([
      VehicleModel.find({ _id: { $in: vehicleIds } })
        .select('_id branchName currentOdometerKm odometerKm currentLocation lastKnownLocation')
        .lean(),
      RepairOrderModel.find({
        vehicleId: { $in: vehicleIds },
        status: { $in: ['reported', 'under_review', 'approved', 'scheduled', 'in_service'] },
      })
        .sort({ openedAt: -1 })
        .select('vehicleId repairOrderCode technician workshop scheduledAt')
        .lean(),
    ]);
    const vehicleById = new Map(vehicles.map((item) => [String(item._id), item]));
    const repairOrderByVehicleId = new Map<string, any>();
    for (const order of repairOrders) {
      const key = String(order.vehicleId);
      if (!repairOrderByVehicleId.has(key)) {
        repairOrderByVehicleId.set(key, order);
      }
    }
    return rows.map((item) => {
      const vehicle = vehicleById.get(String(item.vehicleId));
      const repairOrder = repairOrderByVehicleId.get(String(item.vehicleId));
      const branchName = vehicle?.branchName || item.branchName || 'Main';
      const serviceLocation = repairOrder?.workshop || `${branchName} Workshop`;
      return {
        id: String(item._id),
        vehicleId: String(item.vehicleId),
        vehicleCode: item.vehicleCode,
        branch: branchName,
        currentLocation: formatLocationLabel(vehicle, null),
        serviceLocation,
        assignedTechnician: repairOrder?.technician || 'Workshop queue',
        scheduledServiceAt: repairOrder?.scheduledAt ?? null,
        repairOrderCode: repairOrder?.repairOrderCode ?? null,
        maintenanceType: item.serviceItemName,
        nextMaintenanceDueKm: item.nextDueKm,
        nextMaintenanceDueDate: item.nextDueDate,
        nextTireDueKm: String(item.serviceItemName).toLowerCase().includes('tire') ? item.nextDueKm : null,
        priority: severityForDue(item),
        overdue: Boolean(item.overdue),
        blocked: Boolean(item.blockedAssignment),
        currentKm: Number(vehicle?.currentOdometerKm ?? vehicle?.odometerKm ?? 0),
        quickLink: `/maintenance/vehicles/${String(item.vehicleId)}/history`,
      };
    });
  }

  async getTireDue(user: AuthenticatedUser, branch?: string) {
    const rows = await this.getMaintenanceDue(user, branch);
    return rows.filter((item) => String(item.maintenanceType).toLowerCase().includes('tire'));
  }

  async getPartsHistory(user: AuthenticatedUser, branch?: string) {
    await connectToDatabase();
    const branchScope = await this.resolveBranchScope(user, branch);
    const vehicles = await VehicleModel.find(branchScope.branchName ? { branchName: branchScope.branchName } : {}).sort({ updatedAt: -1 }).limit(120).lean();
    const vehicleIds = vehicles.map((item) => item._id);
    const [serviceHistory, partReplacements] = await Promise.all([
      VehicleServiceHistoryModel.find({ vehicleId: { $in: vehicleIds } }).sort({ serviceDate: -1 }).lean(),
      PartReplacementModel.find({ vehicleId: { $in: vehicleIds } }).sort({ replacementDate: -1 }).lean(),
    ]);
    return vehicles.map((vehicle) => {
      const services = serviceHistory.filter((item) => String(item.vehicleId) === String(vehicle._id));
      const parts = partReplacements.filter((item) => String(item.vehicleId) === String(vehicle._id));
      const tire = services.find((item) => String(item.serviceCategory).toLowerCase() === 'tire');
      const maintenance = services.find((item) => String(item.serviceCategory).toLowerCase() !== 'tire') ?? services[0] ?? null;
      const lastPart = parts[0] ?? null;
      return {
        vehicleId: String(vehicle._id),
        vehicleCode: vehicle.vehicleCode,
        lastTireChangeDate: tire?.serviceDate ?? vehicle.lastTireChangeAt ?? null,
        lastTireChangeKm: tire?.odometerKm ?? vehicle.lastTireChangeKm ?? null,
        nextTireDueKm: vehicle.nextTireDueKm ?? tire?.nextServiceDueKm ?? null,
        lastMaintenanceDate: maintenance?.serviceDate ?? vehicle.lastMaintenanceAt ?? null,
        lastMaintenanceKm: maintenance?.odometerKm ?? vehicle.lastMaintenanceKm ?? null,
        lastPartReplaced: lastPart?.partName ?? null,
        partReplacementDate: lastPart?.replacementDate ?? null,
        nextServiceDue: maintenance?.nextServiceDueDate ?? vehicle.nextMaintenanceDueKm ?? null,
        overdue: Boolean(services.some((item) => item.overdue)),
      };
    });
  }

  async getRentalPartnerPerformance(user: AuthenticatedUser, branch?: string) {
    await connectToDatabase();
    const branchScope = await this.resolveBranchScope(user, branch);
    const [partners, trips] = await Promise.all([
      RentalPartnerModel.find({ status: 'active' }).sort({ partnerName: 1 }).lean(),
      RentalPartnerTripModel.find({ ...(branchScope.branchId ? { branchId: branchScope.branchId } : {}) }).lean(),
    ]);
    return partners.map((partner) => {
      const rows = trips.filter((item) => String(item.partnerId) === String(partner._id));
      const tripsHandled = rows.length;
      const onTimeTrips = rows.filter((item) => item.onTime).length;
      const delayCount = rows.filter((item) => item.delayed).length;
      const cancellationCount = rows.filter((item) => item.cancelled).length;
      const incidentCount = rows.reduce((sum, item) => sum + Number(item.incidentCount ?? 0), 0);
      const totalSpend = rows.reduce((sum, item) => sum + Number(item.rentalCost ?? 0), 0);
      const totalResponse = rows.reduce((sum, item) => sum + Number(item.responseMinutes ?? partner.responseMinutes ?? 0), 0);
      const averageRentalCost = tripsHandled ? Number((totalSpend / tripsHandled).toFixed(0)) : Number(partner.averageRentalCost ?? 0);
      const responseMinutes = tripsHandled ? Number((totalResponse / tripsHandled).toFixed(0)) : Number(partner.responseMinutes ?? 0);
      const onTimeRate = tripsHandled ? Number(((onTimeTrips / tripsHandled) * 100).toFixed(1)) : 0;
      const delayRate = tripsHandled ? Number(((delayCount / tripsHandled) * 100).toFixed(1)) : 0;
      const performanceScore = Math.max(0, Math.round(onTimeRate - delayRate - incidentCount * 4 - cancellationCount * 6 - Math.max(responseMinutes - 45, 0) * 0.1));
      const activeTrips = rows.filter((item) => ['assigned', 'in_progress'].includes(String(item.status))).slice(0, 8).map((item) => ({
        tripCode: item.tripCode,
        vehicleCode: item.vehicleCode || 'External vehicle',
        externalDriverName: item.externalDriverName || partner.contactName,
        externalDriverPhone: item.externalDriverPhone || partner.phone,
        currentLocation: item.currentLocationLabel || 'No live location',
        status: item.status,
        rentalCost: Number(item.rentalCost ?? 0),
      }));
      return {
        partnerId: String(partner._id),
        partnerName: partner.partnerName,
        contactName: partner.contactName,
        phone: partner.phone,
        fleetType: partner.fleetType,
        tripsHandled,
        onTimeRate,
        delayRate,
        delayCount,
        cancellationCount,
        incidentCount,
        averageRentalCost,
        totalSpend,
        responseMinutes,
        performanceScore,
        recommended: performanceScore >= 70 && cancellationCount < 3,
        activeTrips,
      };
    }).sort((left, right) => right.performanceScore - left.performanceScore);
  }

  async getRecommendedRentalPartners(user: AuthenticatedUser, branch?: string) {
    const performance = await this.getRentalPartnerPerformance(user, branch);
    return performance.filter((item) => item.recommended).slice(0, 5);
  }

  async createFuelLog(user: AuthenticatedUser, body: Record<string, unknown>) {
    await connectToDatabase();
    const doc = await FuelLogModel.create({
      ...body,
      driverName: body.driverName || user.name,
      date: body.date || new Date(),
    });
    if (doc.vehicleId) {
      await VehicleModel.updateOne(
        { _id: doc.vehicleId },
        {
          $set: {
            lastFuelAt: doc.date,
            lastFuelKm: doc.odometerKm,
            odometerKm: doc.odometerKm,
            currentOdometerKm: doc.odometerKm,
          },
          $max: { totalKmDriven: doc.odometerKm || 0 },
        },
      );
    }
    return doc.toObject();
  }

  async createVehicleServiceHistory(user: AuthenticatedUser, body: Record<string, unknown>) {
    await connectToDatabase();
    const doc = await VehicleServiceHistoryModel.create({
      ...body,
      serviceDate: body.serviceDate || new Date(),
    });
    if (doc.vehicleId) {
      const update: Record<string, unknown> = {
        lastMaintenanceAt: doc.serviceDate,
        lastMaintenanceKm: doc.odometerKm,
      };
      if (String(doc.serviceCategory).toLowerCase() === 'tire') {
        update.lastTireChangeAt = doc.serviceDate;
        update.lastTireChangeKm = doc.odometerKm;
        update.nextTireDueKm = doc.nextServiceDueKm;
      } else {
        update.nextMaintenanceDueKm = doc.nextServiceDueKm;
      }
      await VehicleModel.updateOne({ _id: doc.vehicleId }, { $set: update });
    }
    return doc.toObject();
  }

  async createPartReplacement(user: AuthenticatedUser, body: Record<string, unknown>) {
    await connectToDatabase();
    const doc = await PartReplacementModel.create({
      ...body,
      replacementDate: body.replacementDate || new Date(),
      notes: body.notes || `Updated by ${user.name}`,
    });
    if (doc.vehicleId && String(doc.partCategory).toLowerCase() === 'tire') {
      await VehicleModel.updateOne(
        { _id: doc.vehicleId },
        { $set: { lastTireChangeAt: doc.replacementDate, lastTireChangeKm: doc.replacementKm } },
      );
    }
    return doc.toObject();
  }
}
