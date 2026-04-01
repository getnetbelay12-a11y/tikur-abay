import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { connectToDatabase } from '../../database/mongo';
import { DriverProfileModel, DriverReportModel, FuelLogModel, RentalPartnerModel, RentalPartnerTripModel, TripModel, VehicleModel, VehicleServiceHistoryModel } from '../../database/models';
import { Permissions } from '../auth/permissions.decorator';

@ApiTags('vehicles')
@Controller('vehicles')
export class VehiclesController {
  @Get()
  @Permissions('tracking:management:view', 'vehicles:maintenance:view')
  async list() {
    await connectToDatabase();
    const vehicles = (await VehicleModel.find({}).sort({ updatedAt: -1 }).limit(200).lean()) as any[];
    const vehicleIds = vehicles.map((vehicle) => vehicle._id);
    const driverIds = vehicles.map((vehicle) => vehicle.assignedDriverId).filter(Boolean);
    const tripIds = vehicles.map((vehicle) => vehicle.currentTripId).filter(Boolean);
    const [profiles, trips, reports, fuelLogs, serviceHistory, rentalTrips, rentalPartners] = await Promise.all([
      DriverProfileModel.find({ userId: { $in: driverIds } }).select('userId fullName phone').lean(),
      TripModel.find({ _id: { $in: tripIds } }).select('tripCode routeName status').lean(),
      DriverReportModel.find({ vehicleId: { $in: vehicleIds } }).sort({ createdAt: -1 }).select('vehicleId reportCode type urgency status description createdAt').lean(),
      FuelLogModel.find({ vehicleId: { $in: vehicleIds } }).sort({ date: -1 }).select('vehicleId date station liters cost odometerKm driverName receiptUrl').lean(),
      VehicleServiceHistoryModel.find({ vehicleId: { $in: vehicleIds } }).sort({ serviceDate: -1 }).select('vehicleId serviceType serviceDate nextServiceDueDate nextServiceDueKm overdue odometerKm').lean(),
      RentalPartnerTripModel.find({ status: { $in: ['assigned', 'in_progress'] } }).sort({ assignedAt: -1 }).lean(),
      RentalPartnerModel.find({}).lean(),
    ]);

    const profileMap = new Map(profiles.map((profile: any) => [String(profile.userId), profile]));
    const tripMap = new Map(trips.map((trip: any) => [String(trip._id), trip]));
    const partnerMap = new Map(rentalPartners.map((partner: any) => [String(partner._id), partner]));
    const reportMap = newestByKey(reports, 'vehicleId');
    const fuelMap = newestByKey(fuelLogs, 'vehicleId');
    const serviceMap = newestByKey(serviceHistory, 'vehicleId');

    const internalRows = vehicles.map((vehicle) => {
      const profile = profileMap.get(String(vehicle.assignedDriverId));
      const trip = tripMap.get(String(vehicle.currentTripId));
      const latestReport = reportMap.get(String(vehicle._id));
      const latestFuel = fuelMap.get(String(vehicle._id));
      const latestService = serviceMap.get(String(vehicle._id));
      return {
        id: String(vehicle._id),
        vehicleId: vehicle.vehicleCode,
        vehicleCode: vehicle.vehicleCode,
        plateNumber: vehicle.plateNumber || 'Plate pending',
        type: vehicle.type || 'Fleet unit',
        branch: vehicle.branchName || 'Unknown branch',
        driverName: profile?.fullName || demoDriverName(vehicle.vehicleCode),
        driverPhone: profile?.phone || demoPhone(vehicle.vehicleCode),
        currentStatus: vehicle.currentStatus || 'available',
        odometerKm: Number(vehicle.currentOdometerKm || vehicle.odometerKm || 0),
        currentTrip: trip?.tripCode || 'No open trip',
        currentTripRoute: trip?.routeName || 'No active route',
        currentLocation: geoLabel(vehicle.currentLocation, vehicle.lastKnownLocation),
        lastGpsAt: vehicle.lastGpsAt || null,
        lastFuelAt: latestFuel?.date || vehicle.lastFuelAt || null,
        lastFuelStation: latestFuel?.station || 'No recent fuel log',
        lastMaintenanceAt: latestService?.serviceDate || vehicle.lastMaintenanceAt || null,
        nextMaintenanceDueKm: Number(latestService?.nextServiceDueKm || vehicle.nextMaintenanceDueKm || 0),
        nextTireDueKm: Number(vehicle.nextTireDueKm || 0),
        readiness: vehicle.readyForAssignment ? 'ready' : 'hold',
        blocked: ['blocked', 'breakdown'].includes(String(vehicle.currentStatus)),
        ownershipType: vehicle.ownershipType || 'internal',
        safetyStatus: vehicle.safetyStatus || 'ready',
        issueSummary: latestReport?.description || 'No active issue',
        issueCode: latestReport?.reportCode || null,
        issueSeverity: latestReport?.urgency || 'low',
      };
    });

    const externalRows = rentalTrips.map((trip: any) => {
      const partner = partnerMap.get(String(trip.partnerId));
      return {
        id: `rental-${String(trip._id)}`,
        vehicleId: trip.vehicleCode || 'External unit',
        vehicleCode: trip.vehicleCode || 'External unit',
        plateNumber: 'Partner fleet',
        type: partner?.fleetType || 'External rental',
        branch: 'External partner',
        driverName: trip.externalDriverName || demoDriverName(trip.vehicleCode || partner?.partnerName || trip._id),
        driverPhone: trip.externalDriverPhone || partner?.phone || demoPhone(trip.vehicleCode || partner?.partnerName || trip._id),
        currentStatus: trip.status || 'assigned',
        odometerKm: 0,
        currentTrip: trip.tripCode || 'Assigned rental trip',
        currentTripRoute: trip.currentLocationLabel || 'Partner route',
        currentLocation: trip.currentLocationLabel || 'Location pending',
        lastGpsAt: trip.assignedAt || null,
        lastFuelAt: null,
        lastFuelStation: 'Managed by partner',
        lastMaintenanceAt: null,
        nextMaintenanceDueKm: 0,
        nextTireDueKm: 0,
        readiness: trip.status === 'assigned' ? 'reserved' : 'on_road',
        blocked: false,
        ownershipType: 'external_rental',
        safetyStatus: partner?.status === 'active' ? 'partner_ready' : 'partner_watch',
        issueSummary: `${partner?.partnerName || 'Partner'} score ${Math.round(Number(partner?.responseMinutes || 0))}`,
        issueCode: null,
        issueSeverity: 'info',
        partnerName: partner?.partnerName || 'Rental partner',
      };
    });

    return [...internalRows, ...externalRows];
  }

  @Get(':id')
  @Permissions('tracking:management:view', 'vehicles:maintenance:view')
  async getOne(@Param('id') id: string) {
    await connectToDatabase();
    const vehicle = (await VehicleModel.findOne({
      $or: [{ _id: id }, { vehicleCode: id }],
    }).lean()) as any;

    if (!vehicle) return null;

    return {
      id: String(vehicle._id),
      vehicleId: vehicle.vehicleCode,
      vehicleCode: vehicle.vehicleCode,
      plateNumber: vehicle.plateNumber,
      branch: vehicle.branchName,
      currentStatus: vehicle.currentStatus,
      odometerKm: vehicle.odometerKm,
      totalKmDriven: vehicle.totalKmDriven,
      assignedDriverId: vehicle.assignedDriverId ? String(vehicle.assignedDriverId) : null,
      currentTripId: vehicle.currentTripId ? String(vehicle.currentTripId) : null,
      currentLocation: vehicle.currentLocation,
      lastGpsAt: vehicle.lastGpsAt,
      nextMaintenanceDueKm: vehicle.nextMaintenanceDueKm,
      nextTireDueKm: vehicle.nextTireDueKm,
      lastMaintenanceAt: vehicle.lastMaintenanceAt,
      lastFuelAt: vehicle.lastFuelAt,
    };
  }
}

function newestByKey(items: any[], key: string) {
  const map = new Map<string, any>();
  for (const item of items) {
    const value = item?.[key];
    if (!value) continue;
    const normalizedKey = String(value);
    if (!map.has(normalizedKey)) {
      map.set(normalizedKey, item);
    }
  }
  return map;
}

function geoLabel(currentLocation: any, lastKnownLocation: any) {
  const source = currentLocation?.coordinates
    ? { latitude: currentLocation.coordinates[1], longitude: currentLocation.coordinates[0] }
    : lastKnownLocation;
  if (!source || source.latitude == null || source.longitude == null) {
    return 'Location pending';
  }
  return cityFromCoordinates(Number(source.latitude), Number(source.longitude)) || 'Location pending';
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

function demoPhone(seed: unknown) {
  const base = normalizeSeed(seed);
  const value = 10000000 + (base % 90000000);
  return `+2519${String(value).padStart(8, '0')}`;
}

function demoDriverName(seed: unknown) {
  const firstNames = ['Abel', 'Dawit', 'Eden', 'Henok', 'Kaleb', 'Meron', 'Rahel', 'Selam', 'Tigist', 'Yared'];
  const lastNames = ['Abebe', 'Alemu', 'Bekele', 'Belay', 'Demissie', 'Kebede', 'Mekonnen', 'Tadesse', 'Tesfaye', 'Wolde'];
  const base = normalizeSeed(seed);
  return `${firstNames[base % firstNames.length]} ${lastNames[Math.floor(base / firstNames.length) % lastNames.length]}`;
}

function normalizeSeed(seed: unknown) {
  return String(seed || 'tikur-abay')
    .split('')
    .reduce((total, character, index) => total + (character.charCodeAt(0) * (index + 1)), 0);
}
