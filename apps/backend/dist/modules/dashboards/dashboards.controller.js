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
exports.DashboardsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const dashboards_service_1 = require("./dashboards.service");
const executive_communications_service_1 = require("./executive-communications.service");
let DashboardsController = class DashboardsController {
    constructor(dashboardsService, executiveCommunicationsService) {
        this.dashboardsService = dashboardsService;
        this.executiveCommunicationsService = executiveCommunicationsService;
    }
    async executiveSummary() {
        return this.dashboardsService.getExecutiveSummary();
    }
    async operationsSummary() {
        const summary = await this.dashboardsService.getExecutiveSummary();
        return {
            activeTrips: summary.latestTrips.length,
            delayedTrips: summary.urgentActions.find((item) => item.key === 'delayed_trips')?.value ?? 0,
            vehiclesInDjibouti: summary.kpis.find((item) => item.title === 'Vehicles In Djibouti')?.value ?? 0,
            trips: summary.latestTrips,
        };
    }
    async widgets() {
        return this.dashboardsService.getManagementWidgets();
    }
    async aiCommandCenter() {
        return this.dashboardsService.getAiCommandCenter();
    }
    async executiveWorkspace(tab) {
        return this.dashboardsService.getExecutiveWorkspace(tab);
    }
    async transportControlTowerSummary() {
        return this.dashboardsService.getTransportControlTowerSummary();
    }
    async transportControlTowerStatus() {
        return this.dashboardsService.getTransportControlTowerStatus();
    }
    async transportControlTowerTrend() {
        return this.dashboardsService.getTransportControlTowerTrend();
    }
    async transportControlTowerPerformance() {
        return this.dashboardsService.getTransportControlTowerPerformance();
    }
    async transportControlTowerAlerts() {
        return this.dashboardsService.getTransportControlTowerAlerts();
    }
    async communicationHistory(user, entityType, entityId) {
        return this.executiveCommunicationsService.getHistory(entityType, entityId, user);
    }
    async sendCommunication(user, body) {
        return this.executiveCommunicationsService.sendCommunication(body, user);
    }
};
exports.DashboardsController = DashboardsController;
__decorate([
    (0, common_1.Get)('management/executive-summary'),
    (0, permissions_decorator_1.Permissions)('dashboards:executive:view'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DashboardsController.prototype, "executiveSummary", null);
__decorate([
    (0, common_1.Get)('operations/summary'),
    (0, permissions_decorator_1.Permissions)('trips:view'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DashboardsController.prototype, "operationsSummary", null);
__decorate([
    (0, common_1.Get)('management/widgets'),
    (0, permissions_decorator_1.Permissions)('dashboards:executive:view'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DashboardsController.prototype, "widgets", null);
__decorate([
    (0, common_1.Get)('management/ai-command-center'),
    (0, permissions_decorator_1.Permissions)('dashboards:executive:view'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DashboardsController.prototype, "aiCommandCenter", null);
__decorate([
    (0, common_1.Get)('management/executive-workspace'),
    (0, permissions_decorator_1.Permissions)('dashboards:executive:view'),
    __param(0, (0, common_1.Query)('tab')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DashboardsController.prototype, "executiveWorkspace", null);
__decorate([
    (0, common_1.Get)('transport-control-tower/summary'),
    (0, permissions_decorator_1.Permissions)('dashboards:executive:view'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DashboardsController.prototype, "transportControlTowerSummary", null);
__decorate([
    (0, common_1.Get)('transport-control-tower/status'),
    (0, permissions_decorator_1.Permissions)('dashboards:executive:view'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DashboardsController.prototype, "transportControlTowerStatus", null);
__decorate([
    (0, common_1.Get)('transport-control-tower/trend'),
    (0, permissions_decorator_1.Permissions)('dashboards:executive:view'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DashboardsController.prototype, "transportControlTowerTrend", null);
__decorate([
    (0, common_1.Get)('transport-control-tower/performance'),
    (0, permissions_decorator_1.Permissions)('dashboards:executive:view'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DashboardsController.prototype, "transportControlTowerPerformance", null);
__decorate([
    (0, common_1.Get)('transport-control-tower/alerts'),
    (0, permissions_decorator_1.Permissions)('dashboards:executive:view'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DashboardsController.prototype, "transportControlTowerAlerts", null);
__decorate([
    (0, common_1.Get)('communications/history'),
    (0, permissions_decorator_1.Permissions)('dashboards:executive:view', 'payments:view', 'trips:view', 'drivers:view', 'maintenance:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('entityType')),
    __param(2, (0, common_1.Query)('entityId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], DashboardsController.prototype, "communicationHistory", null);
__decorate([
    (0, common_1.Post)('communications/send'),
    (0, permissions_decorator_1.Permissions)('dashboards:executive:view', 'payments:view', 'trips:view', 'drivers:view', 'maintenance:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DashboardsController.prototype, "sendCommunication", null);
exports.DashboardsController = DashboardsController = __decorate([
    (0, swagger_1.ApiTags)('dashboards'),
    (0, common_1.Controller)('dashboards'),
    __metadata("design:paramtypes", [dashboards_service_1.DashboardsService,
        executive_communications_service_1.ExecutiveCommunicationsService])
], DashboardsController);
//# sourceMappingURL=dashboards.controller.js.map