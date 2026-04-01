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
exports.GpsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const gps_service_1 = require("./gps.service");
const live_fleet_query_dto_1 = require("./dto/live-fleet-query.dto");
let GpsController = class GpsController {
    constructor(gpsService) {
        this.gpsService = gpsService;
    }
    async liveMap(query, user) {
        const scopedQuery = {
            ...query,
            branch: user.permissions.includes('*') || ['super_admin', 'executive'].includes(user.role) ? query.branch : user.branch,
        };
        return this.gpsService.getMapWidgetData({
            ...scopedQuery,
        });
    }
    async vehicleLive(vehicleId) {
        return this.gpsService.getVehicleLive(vehicleId);
    }
    async tripHistory(tripId) {
        return this.gpsService.getTripHistory(tripId);
    }
    async offlineVehicles(minutes) {
        return this.gpsService.getOfflineVehicles(minutes ? Number(minutes) : 20);
    }
    async createGpsPoint(body, user) {
        return this.gpsService.recordGpsPoint(body, user);
    }
};
exports.GpsController = GpsController;
__decorate([
    (0, common_1.Get)('live-map'),
    (0, permissions_decorator_1.Permissions)('tracking:management:view'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [live_fleet_query_dto_1.LiveFleetQueryDto, Object]),
    __metadata("design:returntype", Promise)
], GpsController.prototype, "liveMap", null);
__decorate([
    (0, common_1.Get)('vehicles/:vehicleId/live'),
    (0, permissions_decorator_1.Permissions)('tracking:management:view'),
    __param(0, (0, common_1.Param)('vehicleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GpsController.prototype, "vehicleLive", null);
__decorate([
    (0, common_1.Get)('trips/:tripId/history'),
    (0, permissions_decorator_1.Permissions)('tracking:management:view'),
    __param(0, (0, common_1.Param)('tripId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GpsController.prototype, "tripHistory", null);
__decorate([
    (0, common_1.Get)('vehicles/offline'),
    (0, permissions_decorator_1.Permissions)('tracking:management:view'),
    __param(0, (0, common_1.Query)('minutes')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GpsController.prototype, "offlineVehicles", null);
__decorate([
    (0, common_1.Post)('gps-points'),
    (0, permissions_decorator_1.Permissions)('trips:update-status', 'tracking:management:view'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GpsController.prototype, "createGpsPoint", null);
exports.GpsController = GpsController = __decorate([
    (0, swagger_1.ApiTags)('tracking'),
    (0, common_1.Controller)('tracking'),
    __metadata("design:paramtypes", [gps_service_1.GpsService])
], GpsController);
//# sourceMappingURL=gps.controller.js.map