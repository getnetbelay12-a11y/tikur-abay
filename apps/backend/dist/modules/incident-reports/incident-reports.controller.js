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
exports.IncidentReportsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const mongo_1 = require("../../database/mongo");
const models_1 = require("../../database/models");
const current_user_decorator_1 = require("../auth/current-user.decorator");
let IncidentReportsController = class IncidentReportsController {
    async create(user, body) {
        await (0, mongo_1.connectToDatabase)();
        const doc = await models_1.IncidentReportModel.create({
            ...body,
            createdAt: new Date(),
        });
        await models_1.ActivityLogModel.create({
            entityType: 'incident_report',
            entityId: String(doc._id),
            tripId: doc.tripId,
            vehicleId: doc.vehicleId,
            driverId: doc.driverId,
            userId: user.id,
            activityType: doc.type,
            title: `${doc.vehicleCode || 'Vehicle'} ${doc.type}`,
            description: doc.description,
            metadata: { severity: doc.severity, status: doc.status },
        });
        return doc.toObject();
    }
    async list() {
        await (0, mongo_1.connectToDatabase)();
        return models_1.IncidentReportModel.find().sort({ createdAt: -1 }).limit(100).lean();
    }
    async getOne(id) {
        await (0, mongo_1.connectToDatabase)();
        return models_1.IncidentReportModel.findOne({ $or: [{ _id: id }, { tripCode: id }] }).lean();
    }
};
exports.IncidentReportsController = IncidentReportsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], IncidentReportsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], IncidentReportsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], IncidentReportsController.prototype, "getOne", null);
exports.IncidentReportsController = IncidentReportsController = __decorate([
    (0, swagger_1.ApiTags)('incident-reports'),
    (0, common_1.Controller)('incident-reports')
], IncidentReportsController);
//# sourceMappingURL=incident-reports.controller.js.map