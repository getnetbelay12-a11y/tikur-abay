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
exports.ActivityController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const mongo_1 = require("../../database/mongo");
const models_1 = require("../../database/models");
const current_user_decorator_1 = require("../auth/current-user.decorator");
let ActivityController = class ActivityController {
    async create(user, body) {
        await (0, mongo_1.connectToDatabase)();
        const doc = await models_1.ActivityLogModel.create({
            ...body,
            userId: body.userId || user.id,
        });
        return doc.toObject();
    }
    async list(tripId, vehicleId) {
        await (0, mongo_1.connectToDatabase)();
        const query = {};
        if (tripId)
            query.tripId = tripId;
        if (vehicleId)
            query.vehicleId = vehicleId;
        return models_1.ActivityLogModel.find(query).sort({ createdAt: -1 }).limit(200).lean();
    }
    async feed() {
        await (0, mongo_1.connectToDatabase)();
        return models_1.ActivityLogModel.find().sort({ createdAt: -1 }).limit(40).lean();
    }
    async my(user) {
        await (0, mongo_1.connectToDatabase)();
        if (user.role === 'driver') {
            return models_1.ActivityLogModel.find({ $or: [{ userId: user.id }, { driverId: user.id }] }).sort({ createdAt: -1 }).limit(100).lean();
        }
        return models_1.ActivityLogModel.find({ userId: user.id }).sort({ createdAt: -1 }).limit(100).lean();
    }
};
exports.ActivityController = ActivityController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ActivityController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('tripId')),
    __param(1, (0, common_1.Query)('vehicleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ActivityController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('feed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ActivityController.prototype, "feed", null);
__decorate([
    (0, common_1.Get)('my'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ActivityController.prototype, "my", null);
exports.ActivityController = ActivityController = __decorate([
    (0, swagger_1.ApiTags)('activity-logs'),
    (0, common_1.Controller)('activity-logs')
], ActivityController);
//# sourceMappingURL=activity.controller.js.map