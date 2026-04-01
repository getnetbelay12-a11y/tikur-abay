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
exports.MaintenanceController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const maintenance_service_1 = require("./maintenance.service");
const maintenance_alert_query_dto_1 = require("./dto/maintenance-alert-query.dto");
let MaintenanceController = class MaintenanceController {
    constructor(maintenanceService) {
        this.maintenanceService = maintenanceService;
    }
    async alerts() {
        return this.maintenanceService.getDashboard();
    }
    async dashboard() {
        return this.maintenanceService.getDashboard();
    }
    async due() {
        return this.maintenanceService.getDue();
    }
    async dueVehicles(query) {
        return this.maintenanceService.getDueVehicles(query);
    }
    async tireInspectionDue() {
        return this.maintenanceService.getTireInspectionDue();
    }
    rules() {
        return this.maintenanceService.getRules();
    }
    async overdue() {
        return this.maintenanceService.getOverdueVehicles();
    }
    async blocked() {
        return this.maintenanceService.getBlockedVehicles();
    }
    async vehicleHistory(id) {
        return this.maintenanceService.getVehicleHistory(id);
    }
    async repairOrders(status) {
        return this.maintenanceService.listRepairOrders(status);
    }
    async createRepairOrder(body) {
        return this.maintenanceService.createRepairOrder(body);
    }
    async repairOrder(id) {
        return this.maintenanceService.getRepairOrder(id);
    }
    async updateRepairOrderStatus(id, body) {
        return this.maintenanceService.updateRepairOrderStatus(id, body);
    }
    async createPlan(body) {
        return this.maintenanceService.createPlan(body);
    }
    async plans() {
        return this.maintenanceService.listPlans();
    }
    async updatePlan(id, body) {
        return this.maintenanceService.updatePlan(id, body);
    }
    async notifications() {
        return this.maintenanceService.getNotifications();
    }
    async lowStockParts() {
        return this.maintenanceService.listLowStockParts();
    }
    async createNotification(body) {
        return this.maintenanceService.createNotification(body);
    }
    async markNotificationRead(id) {
        return this.maintenanceService.markNotificationRead(id);
    }
};
exports.MaintenanceController = MaintenanceController;
__decorate([
    (0, common_1.Get)('alerts'),
    (0, permissions_decorator_1.Permissions)('maintenance:view'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MaintenanceController.prototype, "alerts", null);
__decorate([
    (0, common_1.Get)('dashboard'),
    (0, permissions_decorator_1.Permissions)('maintenance:view'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MaintenanceController.prototype, "dashboard", null);
__decorate([
    (0, common_1.Get)('due'),
    (0, permissions_decorator_1.Permissions)('maintenance:view'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MaintenanceController.prototype, "due", null);
__decorate([
    (0, common_1.Get)('due-vehicles'),
    (0, permissions_decorator_1.Permissions)('maintenance:view'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [maintenance_alert_query_dto_1.MaintenanceAlertQueryDto]),
    __metadata("design:returntype", Promise)
], MaintenanceController.prototype, "dueVehicles", null);
__decorate([
    (0, common_1.Get)('tire-inspection-due'),
    (0, permissions_decorator_1.Permissions)('maintenance:view'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MaintenanceController.prototype, "tireInspectionDue", null);
__decorate([
    (0, common_1.Get)('rules'),
    (0, permissions_decorator_1.Permissions)('maintenance:view'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MaintenanceController.prototype, "rules", null);
__decorate([
    (0, common_1.Get)('overdue'),
    (0, permissions_decorator_1.Permissions)('maintenance:view'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MaintenanceController.prototype, "overdue", null);
__decorate([
    (0, common_1.Get)('blocked'),
    (0, permissions_decorator_1.Permissions)('maintenance:view'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MaintenanceController.prototype, "blocked", null);
__decorate([
    (0, common_1.Get)('vehicles/:id/history'),
    (0, permissions_decorator_1.Permissions)('maintenance:view'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MaintenanceController.prototype, "vehicleHistory", null);
__decorate([
    (0, common_1.Get)('repair-orders'),
    (0, permissions_decorator_1.Permissions)('maintenance:view', 'repair-orders:view'),
    __param(0, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MaintenanceController.prototype, "repairOrders", null);
__decorate([
    (0, common_1.Post)('repair-orders'),
    (0, permissions_decorator_1.Permissions)('maintenance:view', 'repair-orders:view'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MaintenanceController.prototype, "createRepairOrder", null);
__decorate([
    (0, common_1.Get)('repair-orders/:id'),
    (0, permissions_decorator_1.Permissions)('maintenance:view', 'repair-orders:view'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MaintenanceController.prototype, "repairOrder", null);
__decorate([
    (0, common_1.Patch)('repair-orders/:id/status'),
    (0, permissions_decorator_1.Permissions)('maintenance:view', 'repair-orders:view'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MaintenanceController.prototype, "updateRepairOrderStatus", null);
__decorate([
    (0, common_1.Post)('plans'),
    (0, permissions_decorator_1.Permissions)('maintenance:view'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MaintenanceController.prototype, "createPlan", null);
__decorate([
    (0, common_1.Get)('plans'),
    (0, permissions_decorator_1.Permissions)('maintenance:view'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MaintenanceController.prototype, "plans", null);
__decorate([
    (0, common_1.Patch)('plans/:id'),
    (0, permissions_decorator_1.Permissions)('maintenance:view'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MaintenanceController.prototype, "updatePlan", null);
__decorate([
    (0, common_1.Get)('notifications'),
    (0, permissions_decorator_1.Permissions)('maintenance:view'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MaintenanceController.prototype, "notifications", null);
__decorate([
    (0, common_1.Get)('spare-parts/low-stock'),
    (0, permissions_decorator_1.Permissions)('maintenance:view'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MaintenanceController.prototype, "lowStockParts", null);
__decorate([
    (0, common_1.Post)('notifications'),
    (0, permissions_decorator_1.Permissions)('maintenance:view'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MaintenanceController.prototype, "createNotification", null);
__decorate([
    (0, common_1.Patch)('notifications/:id/read'),
    (0, permissions_decorator_1.Permissions)('maintenance:view'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MaintenanceController.prototype, "markNotificationRead", null);
exports.MaintenanceController = MaintenanceController = __decorate([
    (0, swagger_1.ApiTags)('maintenance'),
    (0, common_1.Controller)('maintenance'),
    __metadata("design:paramtypes", [maintenance_service_1.MaintenanceService])
], MaintenanceController);
//# sourceMappingURL=maintenance.controller.js.map