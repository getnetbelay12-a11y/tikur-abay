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
exports.FuelController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const mongo_1 = require("../../database/mongo");
const models_1 = require("../../database/models");
const current_user_decorator_1 = require("../auth/current-user.decorator");
let FuelController = class FuelController {
    async create(user, body) {
        await (0, mongo_1.connectToDatabase)();
        const doc = await models_1.FuelLogModel.create({
            ...body,
            driverId: body.driverId || user.id,
            date: body.date || new Date(),
        });
        if (doc.vehicleId) {
            await models_1.VehicleModel.updateOne({ _id: doc.vehicleId }, {
                $set: {
                    lastFuelAt: doc.date,
                    lastFuelKm: doc.odometerKm,
                    odometerKm: doc.odometerKm,
                },
                $max: { totalKmDriven: doc.odometerKm || 0 },
            });
        }
        return doc.toObject();
    }
    async list(vehicleId, tripId) {
        await (0, mongo_1.connectToDatabase)();
        const query = {};
        if (vehicleId)
            query.vehicleId = vehicleId;
        if (tripId)
            query.tripId = tripId;
        return models_1.FuelLogModel.find(query).sort({ date: -1 }).limit(200).lean();
    }
};
exports.FuelController = FuelController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FuelController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('vehicleId')),
    __param(1, (0, common_1.Query)('tripId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], FuelController.prototype, "list", null);
exports.FuelController = FuelController = __decorate([
    (0, swagger_1.ApiTags)('fuel-logs'),
    (0, common_1.Controller)('fuel-logs')
], FuelController);
//# sourceMappingURL=fuel.controller.js.map