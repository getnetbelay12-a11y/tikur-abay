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
exports.OperationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const operations_service_1 = require("./operations.service");
let OperationsController = class OperationsController {
    constructor(operationsService) {
        this.operationsService = operationsService;
    }
    async fleetSummary(user, branch) {
        return this.operationsService.getFleetSummary(user, branch);
    }
    async availableVehicles(user, branch) {
        return this.operationsService.getAvailableVehicles(user, branch);
    }
    async unavailableVehicles(user, branch) {
        return this.operationsService.getUnavailableVehicles(user, branch);
    }
    async fuelLogs(user, branch) {
        return this.operationsService.getFuelLogs(user, branch);
    }
    async maintenanceDue(user, branch) {
        return this.operationsService.getMaintenanceDue(user, branch);
    }
    async tireDue(user, branch) {
        return this.operationsService.getTireDue(user, branch);
    }
    async partsHistory(user, branch) {
        return this.operationsService.getPartsHistory(user, branch);
    }
    async vehicleStatusBoard(user, branch) {
        return this.operationsService.getVehicleStatusBoard(user, branch);
    }
    async activeTrips(user, branch) {
        return this.operationsService.getActiveTrips(user, branch);
    }
    async rentalPartnerPerformance(user, branch) {
        return this.operationsService.getRentalPartnerPerformance(user, branch);
    }
    async recommendedRentalPartners(user, branch) {
        return this.operationsService.getRecommendedRentalPartners(user, branch);
    }
    async createFuelLog(user, body) {
        return this.operationsService.createFuelLog(user, body);
    }
    async createVehicleServiceHistory(user, body) {
        return this.operationsService.createVehicleServiceHistory(user, body);
    }
    async createPartReplacement(user, body) {
        return this.operationsService.createPartReplacement(user, body);
    }
};
exports.OperationsController = OperationsController;
__decorate([
    (0, common_1.Get)('fleet-summary'),
    (0, permissions_decorator_1.Permissions)('trips:view', 'tracking:management:view', 'maintenance:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('branch')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], OperationsController.prototype, "fleetSummary", null);
__decorate([
    (0, common_1.Get)('available-vehicles'),
    (0, permissions_decorator_1.Permissions)('trips:view', 'tracking:management:view', 'maintenance:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('branch')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], OperationsController.prototype, "availableVehicles", null);
__decorate([
    (0, common_1.Get)('unavailable-vehicles'),
    (0, permissions_decorator_1.Permissions)('trips:view', 'tracking:management:view', 'maintenance:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('branch')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], OperationsController.prototype, "unavailableVehicles", null);
__decorate([
    (0, common_1.Get)('fuel-logs'),
    (0, permissions_decorator_1.Permissions)('trips:view', 'tracking:management:view', 'maintenance:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('branch')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], OperationsController.prototype, "fuelLogs", null);
__decorate([
    (0, common_1.Get)('maintenance-due'),
    (0, permissions_decorator_1.Permissions)('trips:view', 'tracking:management:view', 'maintenance:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('branch')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], OperationsController.prototype, "maintenanceDue", null);
__decorate([
    (0, common_1.Get)('tire-due'),
    (0, permissions_decorator_1.Permissions)('trips:view', 'tracking:management:view', 'maintenance:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('branch')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], OperationsController.prototype, "tireDue", null);
__decorate([
    (0, common_1.Get)('parts-history'),
    (0, permissions_decorator_1.Permissions)('trips:view', 'tracking:management:view', 'maintenance:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('branch')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], OperationsController.prototype, "partsHistory", null);
__decorate([
    (0, common_1.Get)('vehicle-status-board'),
    (0, permissions_decorator_1.Permissions)('trips:view', 'tracking:management:view', 'maintenance:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('branch')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], OperationsController.prototype, "vehicleStatusBoard", null);
__decorate([
    (0, common_1.Get)('active-trips'),
    (0, permissions_decorator_1.Permissions)('trips:view', 'tracking:management:view', 'maintenance:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('branch')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], OperationsController.prototype, "activeTrips", null);
__decorate([
    (0, common_1.Get)('rental-partners/performance'),
    (0, permissions_decorator_1.Permissions)('trips:view', 'tracking:management:view', 'maintenance:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('branch')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], OperationsController.prototype, "rentalPartnerPerformance", null);
__decorate([
    (0, common_1.Get)('rental-partners/recommended'),
    (0, permissions_decorator_1.Permissions)('trips:view', 'tracking:management:view', 'maintenance:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('branch')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], OperationsController.prototype, "recommendedRentalPartners", null);
__decorate([
    (0, common_1.Post)('fuel-logs'),
    (0, permissions_decorator_1.Permissions)('trips:view', 'tracking:management:view', 'maintenance:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OperationsController.prototype, "createFuelLog", null);
__decorate([
    (0, common_1.Post)('vehicle-service-history'),
    (0, permissions_decorator_1.Permissions)('trips:view', 'tracking:management:view', 'maintenance:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OperationsController.prototype, "createVehicleServiceHistory", null);
__decorate([
    (0, common_1.Post)('part-replacements'),
    (0, permissions_decorator_1.Permissions)('trips:view', 'tracking:management:view', 'maintenance:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OperationsController.prototype, "createPartReplacement", null);
exports.OperationsController = OperationsController = __decorate([
    (0, swagger_1.ApiTags)('operations'),
    (0, common_1.Controller)('operations'),
    __metadata("design:paramtypes", [operations_service_1.OperationsService])
], OperationsController);
//# sourceMappingURL=operations.controller.js.map