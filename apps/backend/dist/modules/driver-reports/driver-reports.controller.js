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
exports.DriverReportsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const mongo_1 = require("../../database/mongo");
const models_1 = require("../../database/models");
let DriverReportsController = class DriverReportsController {
    async list() {
        await (0, mongo_1.connectToDatabase)();
        const reports = await models_1.DriverReportModel.find().sort({ createdAt: -1 }).limit(100).lean();
        const driverIds = reports.map((report) => report.driverId).filter(Boolean);
        const tripIds = reports.map((report) => report.tripId).filter(Boolean);
        const vehicleIds = reports.map((report) => report.vehicleId).filter(Boolean);
        const [profiles, trips, vehicles] = await Promise.all([
            models_1.DriverProfileModel.find({ userId: { $in: driverIds } }).select('userId phone fullName').lean(),
            models_1.TripModel.find({ _id: { $in: tripIds } }).select('routeName status customerName plannedArrivalAt').lean(),
            models_1.VehicleModel.find({ _id: { $in: vehicleIds } }).select('currentStatus branchName plateNumber currentOdometerKm').lean(),
        ]);
        const profileMap = new Map(profiles.map((profile) => [String(profile.userId), profile]));
        const tripMap = new Map(trips.map((trip) => [String(trip._id), trip]));
        const vehicleMap = new Map(vehicles.map((vehicle) => [String(vehicle._id), vehicle]));
        return reports.map((report) => {
            const profile = profileMap.get(String(report.driverId));
            const trip = tripMap.get(String(report.tripId));
            const vehicle = vehicleMap.get(String(report.vehicleId));
            return {
                id: String(report._id),
                reportId: String(report._id),
                reportCode: report.reportCode || 'Report',
                type: report.type || 'general_support',
                severity: report.urgency || 'medium',
                driver: report.driverName || profile?.fullName || 'Driver pending',
                driverPhone: profile?.phone || 'Phone pending',
                vehicle: report.vehicleCode || 'Vehicle pending',
                trip: report.tripCode || 'Trip pending',
                branch: report.branchName || vehicle?.branchName || 'Unknown branch',
                submitted: report.createdAt || report.updatedAt || null,
                status: report.status || 'submitted',
                assignedTo: assignedOwner(report.status, report.type),
                description: report.description || 'Driver report submitted.',
                attachments: Array.isArray(report.attachments) ? report.attachments : [],
                location: report.location || null,
                tripDetail: trip ? {
                    route: trip.routeName || 'Route pending',
                    status: trip.status || 'assigned',
                    customer: trip.customerName || 'Customer pending',
                    eta: trip.plannedArrivalAt || null,
                } : null,
                vehicleDetail: vehicle ? {
                    currentStatus: vehicle.currentStatus || 'available',
                    plateNumber: vehicle.plateNumber || 'Plate pending',
                    currentOdometerKm: Number(vehicle.currentOdometerKm || 0),
                } : null,
            };
        });
    }
    async getOne(id) {
        await (0, mongo_1.connectToDatabase)();
        return models_1.DriverReportModel.findOne({ $or: [{ _id: id }, { reportCode: id }] }).lean();
    }
    async create(body) {
        await (0, mongo_1.connectToDatabase)();
        const count = await models_1.DriverReportModel.countDocuments({});
        const doc = await models_1.DriverReportModel.create({
            reportCode: `RPT-${String(count + 1).padStart(5, '0')}`,
            ...body,
            status: body.status ?? 'submitted',
        });
        return doc.toObject();
    }
    async updateStatus(id, body) {
        await (0, mongo_1.connectToDatabase)();
        return models_1.DriverReportModel.findOneAndUpdate({ $or: [{ _id: id }, { reportCode: id }] }, { $set: { status: body.status ?? 'under_review' } }, { new: true }).lean();
    }
};
exports.DriverReportsController = DriverReportsController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DriverReportsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DriverReportsController.prototype, "getOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DriverReportsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DriverReportsController.prototype, "updateStatus", null);
exports.DriverReportsController = DriverReportsController = __decorate([
    (0, swagger_1.ApiTags)('driver-reports'),
    (0, common_1.Controller)('driver-reports')
], DriverReportsController);
function assignedOwner(status, type) {
    if (status === 'resolved')
        return 'Closed by operations';
    if (type === 'accident_report')
        return 'Safety lead';
    if (type === 'fuel_request')
        return 'Fleet desk';
    if (type === 'maintenance_needed' || type === 'tire_issue')
        return 'Maintenance desk';
    return status === 'under_review' ? 'Operations supervisor' : 'Dispatch queue';
}
//# sourceMappingURL=driver-reports.controller.js.map