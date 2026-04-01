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
exports.DashboardAliasController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const dashboards_service_1 = require("./dashboards.service");
const executive_communications_service_1 = require("./executive-communications.service");
let DashboardAliasController = class DashboardAliasController {
    constructor(dashboardsService, executiveCommunicationsService) {
        this.dashboardsService = dashboardsService;
        this.executiveCommunicationsService = executiveCommunicationsService;
    }
    async executiveSummary() {
        return this.dashboardsService.getExecutiveSummary();
    }
    async activityFeed() {
        return this.dashboardsService.getExecutiveActivityFeed();
    }
    async incidents() {
        return this.dashboardsService.getExecutiveIncidents();
    }
    async fuelSummary() {
        return this.dashboardsService.getExecutiveFuelSummary();
    }
    async documentSummary() {
        return this.dashboardsService.getExecutiveDocumentSummary();
    }
    async agreementSummary() {
        return this.dashboardsService.getExecutiveAgreementSummary();
    }
    async collectionEscalations() {
        return this.dashboardsService.getExecutiveCollectionEscalations();
    }
    async aiCommandCenter() {
        return this.dashboardsService.getAiCommandCenter();
    }
    async executiveWorkspace(tab) {
        return this.dashboardsService.getExecutiveWorkspace(tab);
    }
    async communicationHistory(user, entityType, entityId) {
        return this.executiveCommunicationsService.getHistory(entityType, entityId, user);
    }
    async sendCommunication(user, body) {
        return this.executiveCommunicationsService.sendCommunication(body, user);
    }
};
exports.DashboardAliasController = DashboardAliasController;
__decorate([
    (0, common_1.Get)('executive-summary'),
    (0, permissions_decorator_1.Permissions)('dashboards:executive:view'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DashboardAliasController.prototype, "executiveSummary", null);
__decorate([
    (0, common_1.Get)('executive/activity-feed'),
    (0, permissions_decorator_1.Permissions)('dashboards:executive:view'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DashboardAliasController.prototype, "activityFeed", null);
__decorate([
    (0, common_1.Get)('executive/incidents'),
    (0, permissions_decorator_1.Permissions)('dashboards:executive:view'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DashboardAliasController.prototype, "incidents", null);
__decorate([
    (0, common_1.Get)('executive/fuel-summary'),
    (0, permissions_decorator_1.Permissions)('dashboards:executive:view'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DashboardAliasController.prototype, "fuelSummary", null);
__decorate([
    (0, common_1.Get)('executive/document-summary'),
    (0, permissions_decorator_1.Permissions)('dashboards:executive:view'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DashboardAliasController.prototype, "documentSummary", null);
__decorate([
    (0, common_1.Get)('executive/agreement-summary'),
    (0, permissions_decorator_1.Permissions)('dashboards:executive:view'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DashboardAliasController.prototype, "agreementSummary", null);
__decorate([
    (0, common_1.Get)('executive/collection-escalations'),
    (0, permissions_decorator_1.Permissions)('dashboards:executive:view'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DashboardAliasController.prototype, "collectionEscalations", null);
__decorate([
    (0, common_1.Get)('ai-command-center'),
    (0, permissions_decorator_1.Permissions)('dashboards:executive:view'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DashboardAliasController.prototype, "aiCommandCenter", null);
__decorate([
    (0, common_1.Get)('executive-workspace'),
    (0, permissions_decorator_1.Permissions)('dashboards:executive:view'),
    __param(0, (0, common_1.Query)('tab')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DashboardAliasController.prototype, "executiveWorkspace", null);
__decorate([
    (0, common_1.Get)('communications/history'),
    (0, permissions_decorator_1.Permissions)('dashboards:executive:view', 'payments:view', 'trips:view', 'drivers:view', 'maintenance:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('entityType')),
    __param(2, (0, common_1.Query)('entityId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], DashboardAliasController.prototype, "communicationHistory", null);
__decorate([
    (0, common_1.Post)('communications/send'),
    (0, permissions_decorator_1.Permissions)('dashboards:executive:view', 'payments:view', 'trips:view', 'drivers:view', 'maintenance:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DashboardAliasController.prototype, "sendCommunication", null);
exports.DashboardAliasController = DashboardAliasController = __decorate([
    (0, swagger_1.ApiTags)('dashboard'),
    (0, common_1.Controller)('dashboard'),
    __metadata("design:paramtypes", [dashboards_service_1.DashboardsService,
        executive_communications_service_1.ExecutiveCommunicationsService])
], DashboardAliasController);
//# sourceMappingURL=dashboard-alias.controller.js.map