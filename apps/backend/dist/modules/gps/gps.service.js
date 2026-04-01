"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GpsService = void 0;
const common_1 = require("@nestjs/common");
const mongo_1 = require("../../database/mongo");
const models_1 = require("../../database/models");
const realtime_gateway_1 = require("../realtime/realtime.gateway");
function markerColor(status, offline) {
    if (offline)
        return '#6b7280';
    if (status === 'delayed')
        return '#dc2626';
    if (status === 'in_djibouti')
        return '#0f766e';
    if (status === 'loading' || status === 'loaded')
        return '#d97706';
    if (status === 'under_maintenance' || status === 'breakdown')
        return '#7c3aed';
    return '#2563eb';
}
let GpsService = class GpsService {
    constructor(realtimeGateway) {
        this.realtimeGateway = realtimeGateway;
    }
    async getLiveFleet(filters = {}) {
        await (0, mongo_1.connectToDatabase)();
        const vehicleQuery = {
            currentStatus: { $in: ['assigned', 'loading', 'loaded', 'in_transit', 'at_checkpoint', 'at_border', 'in_djibouti', 'offloading', 'delayed', 'breakdown', 'under_maintenance'] },
            currentTripId: { $ne: null },
        };
        if (filters.branch)
            vehicleQuery.branchName = filters.branch;
        if (filters.vehicleStatus)
            vehicleQuery.currentStatus = filters.vehicleStatus;
        const vehicles = await models_1.VehicleModel.find(vehicleQuery)
            .select('_id vehicleCode branchId branchName currentStatus currentTripId assignedDriverId lastGpsAt lastKnownLocation currentLocation')
            .sort({ lastGpsAt: -1 })
            .lean();
        if (!vehicles.length) {
            return [];
        }
        const tripIds = vehicles.map((vehicle) => vehicle.currentTripId).filter(Boolean);
        const driverIds = vehicles.map((vehicle) => vehicle.assignedDriverId).filter(Boolean);
        const tripQuery = { _id: { $in: tripIds } };
        if (filters.route)
            tripQuery.routeName = filters.route;
        if (filters.tripStatus)
            tripQuery.status = filters.tripStatus;
        if (filters.geofence === 'djibouti')
            tripQuery.djiboutiFlag = true;
        const [trips, drivers, driverProfiles, latestGpsPoints, latestFuelLogs] = await Promise.all([
            models_1.TripModel.find(tripQuery)
                .select('_id tripCode routeName status currentCheckpoint djiboutiFlag driverId driverName branchName vehicleCode destination plannedArrivalAt delayedMinutes')
                .lean(),
            models_1.DriverModel.find({ _id: { $in: driverIds } }).select('_id firstName lastName').lean(),
            models_1.DriverProfileModel.find({ driverId: { $in: driverIds } }).select('driverId phone').lean(),
            models_1.GpsPointModel.find({ vehicleId: { $in: vehicles.map((vehicle) => vehicle._id) } })
                .sort({ recordedAt: -1 })
                .select('vehicleId speed recordedAt latitude longitude geofence')
                .lean(),
            models_1.FuelLogModel.find({ vehicleId: { $in: vehicles.map((vehicle) => vehicle._id) } })
                .sort({ date: -1 })
                .select('vehicleId station date')
                .lean(),
        ]);
        const tripById = new Map(trips.map((trip) => [String(trip._id), trip]));
        const driverById = new Map(drivers.map((driver) => [String(driver._id), driver]));
        const driverProfileByDriverId = new Map(driverProfiles.map((profile) => [String(profile.driverId), profile]));
        const latestGpsByVehicleId = newestByKey(latestGpsPoints, 'vehicleId');
        const latestFuelByVehicleId = newestByKey(latestFuelLogs, 'vehicleId');
        const offlineThreshold = Date.now() - 20 * 60_000;
        const fleet = vehicles.map((vehicle) => {
            const trip = tripById.get(String(vehicle.currentTripId));
            if (!trip) {
                return null;
            }
            const driver = driverById.get(String(vehicle.assignedDriverId || trip.driverId));
            const driverProfile = driverProfileByDriverId.get(String(vehicle.assignedDriverId || trip.driverId));
            const latestPoint = latestGpsByVehicleId.get(String(vehicle._id));
            const latestFuel = latestFuelByVehicleId.get(String(vehicle._id));
            const latestGpsAt = vehicle?.lastGpsAt ? new Date(String(vehicle.lastGpsAt)) : null;
            const offline = !latestGpsAt || latestGpsAt.getTime() < offlineThreshold;
            const coordinates = Array.isArray(vehicle?.currentLocation?.coordinates) ? vehicle.currentLocation.coordinates : null;
            const latitude = coordinates?.[1] ?? vehicle?.lastKnownLocation?.latitude ?? 9.145;
            const longitude = coordinates?.[0] ?? vehicle?.lastKnownLocation?.longitude ?? 40.4897;
            const locationLabel = formatLocationLabel({
                latitude: Number(latitude),
                longitude: Number(longitude),
                geofence: String(trip.currentCheckpoint || latestPoint?.geofence || ''),
                branch: String(vehicle.branchName || trip.branchName || 'Unknown branch'),
                routeName: String(trip.routeName || 'Priority route'),
            });
            return {
                tripId: String(trip._id),
                tripCode: trip.tripCode,
                vehicleDbId: String(vehicle._id),
                vehicleId: String(vehicle.vehicleCode || trip.vehicleCode),
                plateNumber: String(vehicle.plateNumber || ''),
                driverId: String(driver?._id || vehicle.assignedDriverId || trip.driverId || ''),
                driverName: driver ? `${driver.firstName} ${driver.lastName}` : String(trip.driverName || 'Unassigned'),
                driverPhone: driverProfile?.phone || demoPhone(vehicle.vehicleCode || trip.vehicleCode || trip._id),
                branch: String(vehicle.branchName || trip.branchName),
                routeName: String(trip.routeName),
                destination: String(trip.destination || 'Destination pending'),
                tripStatus: String(trip.status),
                vehicleStatus: String(vehicle.currentStatus || trip.status),
                geofence: String(trip.currentCheckpoint || (trip.djiboutiFlag ? 'djibouti' : 'en_route')),
                locationLabel,
                currentOdometerKm: Number(vehicle.currentOdometerKm ?? vehicle.odometerKm ?? 0),
                lastFuelAt: vehicle.lastFuelAt ? new Date(String(vehicle.lastFuelAt)).toISOString() : latestFuel?.date ? new Date(String(latestFuel.date)).toISOString() : null,
                fuelStation: latestFuel?.station || null,
                lastMaintenanceAt: vehicle.lastMaintenanceAt ? new Date(String(vehicle.lastMaintenanceAt)).toISOString() : null,
                latestGpsAt: latestGpsAt?.toISOString() ?? null,
                lastSeenMinutes: latestGpsAt ? Math.round((Date.now() - latestGpsAt.getTime()) / 60000) : null,
                offline,
                latitude: Number(latitude),
                longitude: Number(longitude),
                speed: Number(latestPoint?.speed ?? 0),
                djiboutiFlag: Boolean(trip.djiboutiFlag),
                delayed: String(trip.status) === 'delayed',
                markerColor: markerColor(String(vehicle.currentStatus || trip.status), offline),
            };
        }).filter(Boolean).filter((item) => {
            if (filters.vehicleStatus && item.vehicleStatus !== filters.vehicleStatus)
                return false;
            if (filters.geofence && item.geofence !== filters.geofence)
                return false;
            if (filters.djiboutiOnly === 'true' && !item.djiboutiFlag)
                return false;
            if (filters.delayedOnly === 'true' && !item.delayed)
                return false;
            if (filters.offlineOnly === 'true' && !item.offline)
                return false;
            return true;
        });
        return fleet;
    }
    async getVehicleLive(vehicleId) {
        await (0, mongo_1.connectToDatabase)();
        const vehicle = await models_1.VehicleModel.findOne({
            $or: [{ _id: vehicleId }, { vehicleCode: vehicleId }, { plateNumber: vehicleId }],
        }).lean();
        if (!vehicle) {
            return null;
        }
        const [latestPoint, activeTrip, driver, driverProfile, latestFuel] = await Promise.all([
            models_1.GpsPointModel.findOne({ vehicleId: vehicle._id }).sort({ recordedAt: -1 }).lean(),
            vehicle.currentTripId ? models_1.TripModel.findById(vehicle.currentTripId).lean() : null,
            vehicle.assignedDriverId ? models_1.DriverModel.findById(vehicle.assignedDriverId).lean() : null,
            vehicle.assignedDriverId ? models_1.DriverProfileModel.findOne({ driverId: vehicle.assignedDriverId }).select('phone emergencyContact').lean() : null,
            models_1.FuelLogModel.findOne({ vehicleId: vehicle._id }).sort({ date: -1 }).select('date station').lean(),
        ]);
        const latitude = vehicle.currentLocation?.coordinates?.[1] ?? latestPoint?.latitude ?? vehicle.lastKnownLocation?.latitude ?? null;
        const longitude = vehicle.currentLocation?.coordinates?.[0] ?? latestPoint?.longitude ?? vehicle.lastKnownLocation?.longitude ?? null;
        return {
            vehicleDbId: String(vehicle._id),
            vehicleId: vehicle.vehicleCode,
            plateNumber: vehicle.plateNumber,
            branch: vehicle.branchName,
            status: vehicle.currentStatus,
            currentOdometerKm: Number(vehicle.currentOdometerKm ?? vehicle.odometerKm ?? 0),
            lastFuelAt: vehicle.lastFuelAt ?? latestFuel?.date ?? null,
            fuelStation: latestFuel?.station ?? null,
            lastFuelKm: vehicle.lastFuelKm ?? null,
            lastMaintenanceAt: vehicle.lastMaintenanceAt ?? null,
            lastMaintenanceKm: vehicle.lastMaintenanceKm ?? null,
            driverName: driver ? `${driver.firstName} ${driver.lastName}` : null,
            driverPhone: driverProfile?.phone ?? null,
            emergencyContact: driverProfile?.emergencyContact ?? null,
            tripCode: activeTrip?.tripCode ?? null,
            routeName: activeTrip?.routeName ?? null,
            destination: activeTrip?.destination ?? null,
            geofence: activeTrip?.currentCheckpoint ?? null,
            latestGpsAt: vehicle.lastGpsAt ?? latestPoint?.recordedAt ?? null,
            speed: latestPoint?.speed ?? 0,
            latitude,
            longitude,
            locationLabel: formatLocationLabel({
                latitude: typeof latitude === 'number' ? latitude : null,
                longitude: typeof longitude === 'number' ? longitude : null,
                geofence: activeTrip?.currentCheckpoint ?? latestPoint?.geofence ?? null,
                branch: vehicle.branchName ?? 'Unknown branch',
                routeName: activeTrip?.routeName ?? null,
            }),
        };
    }
    async getTripHistory(tripId) {
        await (0, mongo_1.connectToDatabase)();
        const trip = await models_1.TripModel.findOne({ $or: [{ _id: tripId }, { tripCode: tripId }] }).lean();
        if (!trip) {
            return [];
        }
        const points = await models_1.GpsPointModel.find({ tripId: trip._id }).sort({ recordedAt: 1 }).lean();
        return points.map((point) => ({
            latitude: point.latitude,
            longitude: point.longitude,
            speed: point.speed,
            geofence: point.geofence,
            recordedAt: point.recordedAt,
        }));
    }
    async getOfflineVehicles(minutes = 20) {
        const fleet = await this.getLiveFleet({});
        return fleet.filter((point) => (point.lastSeenMinutes ?? 0) >= minutes);
    }
    async recordGpsPoint(body, user) {
        await (0, mongo_1.connectToDatabase)();
        const vehicle = await models_1.VehicleModel.findOne({
            $or: [{ _id: body.vehicleId }, { vehicleCode: body.vehicleId }, { plateNumber: body.vehicleId }],
        });
        if (!vehicle) {
            return null;
        }
        const trip = body.tripId
            ? await models_1.TripModel.findOne({ $or: [{ _id: body.tripId }, { tripCode: body.tripId }] }).lean()
            : vehicle.currentTripId
                ? await models_1.TripModel.findById(vehicle.currentTripId).lean()
                : null;
        const point = await models_1.GpsPointModel.create({
            tripId: trip?._id || vehicle.currentTripId || undefined,
            vehicleId: vehicle._id,
            driverId: vehicle.assignedDriverId || undefined,
            latitude: Number(body.latitude ?? vehicle.lastKnownLocation?.latitude ?? 9.145),
            longitude: Number(body.longitude ?? vehicle.lastKnownLocation?.longitude ?? 40.4897),
            speed: Number(body.speed ?? 0),
            heading: Number(body.heading ?? 0),
            accuracy: Number(body.accuracy ?? 0),
            source: body.source || user.role,
            recordedAt: new Date(),
            location: {
                type: 'Point',
                coordinates: [
                    Number(body.longitude ?? vehicle.lastKnownLocation?.longitude ?? 40.4897),
                    Number(body.latitude ?? vehicle.lastKnownLocation?.latitude ?? 9.145),
                ],
            },
        });
        vehicle.lastGpsAt = point.recordedAt;
        vehicle.lastKnownLocation = { latitude: point.latitude, longitude: point.longitude };
        vehicle.currentLocation = point.location;
        await vehicle.save();
        const payload = {
            vehicleDbId: String(vehicle._id),
            vehicleId: vehicle.vehicleCode,
            latitude: point.latitude,
            longitude: point.longitude,
            speed: point.speed,
            latestGpsAt: point.recordedAt,
            branchId: vehicle.branchId ? String(vehicle.branchId) : undefined,
            status: vehicle.currentStatus,
            tripId: trip?._id ? String(trip._id) : null,
        };
        this.realtimeGateway.emitFleetUpdate(payload, vehicle.branchId ? String(vehicle.branchId) : undefined);
        return payload;
    }
    async getMapWidgetData(filters = {}) {
        const fleet = await this.getLiveFleet(filters);
        return {
            center: { latitude: 9.145, longitude: 40.4897 },
            totalVehicles: fleet.length,
            activeVehicles: fleet.filter((item) => !item.offline).length,
            delayedVehicles: fleet.filter((item) => item.tripStatus === 'delayed').length,
            inDjiboutiVehicles: fleet.filter((item) => item.djiboutiFlag).length,
            points: fleet,
        };
    }
};
exports.GpsService = GpsService;
exports.GpsService = GpsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [realtime_gateway_1.RealtimeGateway])
], GpsService);
function newestByKey(items, key) {
    const map = new Map();
    for (const item of items) {
        const value = item?.[key];
        if (!value)
            continue;
        const normalizedKey = String(value);
        if (!map.has(normalizedKey)) {
            map.set(normalizedKey, item);
        }
    }
    return map;
}
function formatLocationLabel({ latitude, longitude, geofence, branch, routeName, }) {
    const city = cityFromCoordinates(latitude, longitude);
    if (city && geofence)
        return `${city} · ${humanizeGeofence(geofence)}`;
    if (city)
        return city;
    if (geofence)
        return `${humanizeGeofence(geofence)} · ${routeName || branch || 'Active route'}`;
    return branch || routeName || 'Location update pending';
}
function humanizeGeofence(value) {
    const normalized = String(value || '').trim();
    if (!normalized)
        return 'On corridor';
    return normalized.replace(/_/g, ' ').replace(/\bat border\b/i, 'Border');
}
function cityFromCoordinates(latitude, longitude) {
    if (latitude == null || longitude == null)
        return null;
    const points = [
        { label: 'Addis Ababa', latitude: 8.9806, longitude: 38.7578 },
        { label: 'Adama', latitude: 8.5408, longitude: 39.2716 },
        { label: 'Awash', latitude: 8.983, longitude: 40.17 },
        { label: 'Dire Dawa', latitude: 9.6009, longitude: 41.8501 },
        { label: 'Galafi Border', latitude: 9.5931, longitude: 41.8661 },
        { label: 'Djibouti', latitude: 11.5721, longitude: 43.1456 },
        { label: 'Modjo', latitude: 8.5871, longitude: 39.1219 },
        { label: 'Kombolcha', latitude: 11.084, longitude: 39.742 },
    ];
    let best = null;
    for (const point of points) {
        const distance = Math.abs(latitude - point.latitude) + Math.abs(longitude - point.longitude);
        if (!best || distance < best.distance) {
            best = { label: point.label, distance };
        }
    }
    return best && best.distance < 1.6 ? best.label : null;
}
function demoPhone(seed) {
    const base = String(seed || 'tikur-abay')
        .split('')
        .reduce((total, character, index) => total + (character.charCodeAt(0) * (index + 1)), 0);
    const value = 10000000 + (base % 90000000);
    return `+2519${String(value).padStart(8, '0')}`;
}
//# sourceMappingURL=gps.service.js.map