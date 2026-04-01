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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriversController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const mongo_1 = require("../../database/mongo");
const models_1 = require("../../database/models");
const permissions_decorator_1 = require("../auth/permissions.decorator");
let DriversController = class DriversController {
    async list() {
        await (0, mongo_1.connectToDatabase)();
        const [drivers, latestMetrics] = await Promise.all([
            models_1.DriverModel.find({}).sort({ updatedAt: -1 }).limit(200).lean(),
            models_1.DriverPerformanceMetricModel.aggregate([
                { $sort: { periodEnd: -1 } },
                {
                    $group: {
                        _id: '$driverId',
                        performanceScore: { $first: '$performanceScore' },
                        tripsCompleted: { $first: '$tripsCompleted' },
                        delayedTrips: { $first: '$delayedTrips' },
                        accidentCount: { $first: '$accidentCount' },
                    },
                },
            ]),
        ]);
        const driverIds = drivers.map((driver) => driver._id);
        const userIds = drivers.map((driver) => driver.userId).filter(Boolean);
        const branchIds = drivers.map((driver) => driver.branchId).filter(Boolean);
        const [profiles, users, branches, activeTrips, availabilityReports, kycRequests, rentalTrips, rentalPartners] = await Promise.all([
            models_1.DriverProfileModel.find({ driverId: { $in: driverIds } }).select('driverId phone emergencyContact licenseNumber licenseExpiry').lean(),
            models_1.UserModel.find({ _id: { $in: userIds } }).select('_id phone phoneNumber').lean(),
            models_1.BranchModel.find({ _id: { $in: branchIds } }).select('_id name').lean(),
            models_1.TripModel.find({ driverId: { $in: driverIds }, status: { $in: ['assigned', 'loading', 'loaded', 'in_transit', 'at_checkpoint', 'at_border', 'offloading', 'in_djibouti', 'delayed'] } })
                .sort({ updatedAt: -1 })
                .select('driverId tripCode vehicleCode routeName destination status plannedArrivalAt')
                .lean(),
            models_1.AvailabilityReportModel.find({ driverId: { $in: driverIds } }).sort({ createdAt: -1 }).select('driverId status reason notes createdAt').lean(),
            models_1.DriverKycRequestModel.find({ userId: { $in: userIds } }).select('userId status faydaFrontDocumentId faydaBackDocumentId').lean(),
            models_1.RentalPartnerTripModel.find({ status: { $in: ['assigned', 'in_progress'] } })
                .sort({ assignedAt: -1 })
                .limit(40)
                .select('partnerId tripId tripCode vehicleCode externalDriverName externalDriverPhone currentLocationLabel branchId assignedAt status')
                .lean(),
            models_1.RentalPartnerModel.find({ status: 'active' }).select('_id partnerName phone').lean(),
        ]);
        const metricMap = new Map(latestMetrics.map((metric) => [String(metric._id), metric]));
        const profileMap = new Map(profiles.map((profile) => [String(profile.driverId), profile]));
        const userMap = new Map(users.map((user) => [String(user._id), user]));
        const branchMap = new Map(branches.map((branch) => [String(branch._id), branch.name]));
        const tripMap = new Map(activeTrips.map((trip) => [String(trip.driverId), trip]));
        const kycMap = new Map(kycRequests.map((item) => [String(item.userId), item]));
        const partnerMap = new Map(rentalPartners.map((partner) => [String(partner._id), partner]));
        const tripDetailMap = new Map((await models_1.TripModel.find({ _id: { $in: rentalTrips.map((item) => item.tripId).filter(Boolean) } })
            .select('_id destination routeName plannedArrivalAt')
            .lean()).map((trip) => [String(trip._id), trip]));
        const availabilityMap = new Map();
        for (const report of availabilityReports) {
            const key = String(report.driverId);
            if (!availabilityMap.has(key))
                availabilityMap.set(key, report);
        }
        const internalRows = drivers.map((driver) => {
            const metric = metricMap.get(String(driver._id));
            const profile = profileMap.get(String(driver._id));
            const user = userMap.get(String(driver.userId ?? ''));
            const trip = tripMap.get(String(driver._id));
            const kyc = kycMap.get(String(driver.userId ?? ''));
            const availability = availabilityMap.get(String(driver._id));
            return {
                id: String(driver._id),
                driverId: driver.driverCode,
                source: 'internal',
                name: `${driver.firstName || ''} ${driver.lastName || ''}`.trim(),
                branchId: driver.branchId ? String(driver.branchId) : null,
                branch: branchMap.get(String(driver.branchId ?? '')) ?? 'Unknown branch',
                phone: profile?.phone || user?.phone || user?.phoneNumber || 'Phone pending',
                emergencyContact: profile?.emergencyContact || 'Emergency contact pending',
                licenseNumber: profile?.licenseNumber || 'DL pending',
                faydaStatus: kyc?.status || 'draft',
                faydaFrontId: kyc?.faydaFrontDocumentId || null,
                faydaBackId: kyc?.faydaBackDocumentId || null,
                status: driver.status,
                vehicle: trip?.vehicleCode || driver.assignedVehicleCode || 'Unassigned',
                currentTrip: trip?.tripCode || 'No active trip',
                route: trip?.routeName || 'Route pending',
                destination: trip?.destination || 'Destination pending',
                eta: trip?.plannedArrivalAt || null,
                availability: availability?.status || 'available',
                availabilityReason: availability?.reason || availability?.notes || null,
                licenseExpiry: profile?.licenseExpiry || driver.licenseExpiry || null,
                performanceScore: metric?.performanceScore ?? null,
                tripsCompleted: metric?.tripsCompleted ?? 0,
                delayedTrips: metric?.delayedTrips ?? 0,
                accidentCount: metric?.accidentCount ?? 0,
            };
        });
        const externalRows = rentalTrips.map((trip, index) => {
            const partner = partnerMap.get(String(trip.partnerId));
            const tripDetail = tripDetailMap.get(String(trip.tripId));
            return {
                id: `external-${String(trip._id)}`,
                driverId: `EXT-${String(index + 1).padStart(4, '0')}`,
                source: 'external',
                name: trip.externalDriverName || 'Partner driver',
                branchId: trip.branchId ? String(trip.branchId) : null,
                branch: branchMap.get(String(trip.branchId ?? '')) ?? 'External partner',
                phone: trip.externalDriverPhone || partner?.phone || 'Phone pending',
                emergencyContact: partner?.phone || 'Partner desk',
                licenseNumber: 'Partner managed',
                faydaStatus: 'partner_managed',
                faydaFrontId: null,
                faydaBackId: null,
                status: trip.status === 'in_progress' ? 'active' : 'assigned',
                vehicle: trip.vehicleCode || 'External vehicle',
                currentTrip: trip.tripCode || 'Assigned rental trip',
                route: tripDetail?.routeName || 'Partner route',
                destination: tripDetail?.destination || 'Destination pending',
                eta: tripDetail?.plannedArrivalAt || null,
                availability: trip.status === 'in_progress' ? 'on_trip' : 'reserved',
                availabilityReason: trip.currentLocationLabel || partner?.partnerName || 'Partner dispatch',
                licenseExpiry: null,
                performanceScore: null,
                tripsCompleted: 0,
                delayedTrips: 0,
                accidentCount: 0,
            };
        });
        return [...internalRows, ...externalRows];
    }
    async getOne(id) {
        await (0, mongo_1.connectToDatabase)();
        const driver = (await models_1.DriverModel.findOne({
            $or: [{ _id: id }, { driverCode: id }],
        }).lean());
        if (!driver)
            return null;
        const [metric, profile, user, branch, trip, availability, kyc] = await Promise.all([
            models_1.DriverPerformanceMetricModel.findOne({ driverId: driver._id }).sort({ periodEnd: -1 }).lean(),
            models_1.DriverProfileModel.findOne({ driverId: driver._id }).select('phone emergencyContact licenseNumber licenseExpiry').lean(),
            driver.userId ? models_1.UserModel.findById(driver.userId).select('phone phoneNumber').lean() : null,
            driver.branchId ? models_1.BranchModel.findById(driver.branchId).select('name').lean() : null,
            models_1.TripModel.findOne({
                driverId: driver._id,
                status: { $in: ['assigned', 'loading', 'loaded', 'in_transit', 'at_checkpoint', 'at_border', 'offloading', 'in_djibouti', 'delayed'] },
            })
                .sort({ updatedAt: -1 })
                .select('tripCode vehicleCode routeName destination status plannedArrivalAt')
                .lean(),
            models_1.AvailabilityReportModel.findOne({ driverId: driver._id }).sort({ createdAt: -1 }).select('status reason notes').lean(),
            driver.userId ? models_1.DriverKycRequestModel.findOne({ userId: driver.userId }).select('status faydaFrontDocumentId faydaBackDocumentId').lean() : null,
        ]);
        return {
            id: String(driver._id),
            driverId: driver.driverCode,
            name: `${driver.firstName || ''} ${driver.lastName || ''}`.trim(),
            branchId: driver.branchId ? String(driver.branchId) : null,
            branch: branch?.name || 'Unknown branch',
            phone: profile?.phone || user?.phone || user?.phoneNumber || 'Phone pending',
            emergencyContact: profile?.emergencyContact || 'Emergency contact pending',
            licenseNumber: profile?.licenseNumber || 'DL pending',
            faydaStatus: kyc?.status || 'draft',
            faydaFrontId: kyc?.faydaFrontDocumentId || null,
            faydaBackId: kyc?.faydaBackDocumentId || null,
            licenseExpiry: profile?.licenseExpiry || driver.licenseExpiry || null,
            status: driver.status,
            assignedVehicleCode: trip?.vehicleCode || driver.assignedVehicleCode || null,
            currentTrip: trip?.tripCode || null,
            route: trip?.routeName || null,
            destination: trip?.destination || null,
            eta: trip?.plannedArrivalAt || null,
            availability: availability?.status || 'available',
            availabilityReason: availability?.reason || availability?.notes || null,
            performanceScore: metric?.performanceScore ?? null,
            tripsCompleted: metric?.tripsCompleted ?? 0,
            delayedTrips: metric?.delayedTrips ?? 0,
            accidentCount: metric?.accidentCount ?? 0,
            breakdownCount: metric?.breakdownCount ?? 0,
            podComplianceRate: metric?.podComplianceRate ?? null,
            documentComplianceRate: metric?.documentComplianceRate ?? null,
        };
    }
};
exports.DriversController = DriversController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('drivers:view'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DriversController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_decorator_1.Permissions)('drivers:view'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DriversController.prototype, "getOne", null);
exports.DriversController = DriversController = __decorate([
    (0, swagger_1.ApiTags)('drivers'),
    (0, common_1.Controller)('drivers')
], DriversController);
//# sourceMappingURL=drivers.controller.js.map