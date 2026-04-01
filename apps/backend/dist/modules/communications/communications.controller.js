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
exports.CommunicationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const communication_access_1 = require("./communication-access");
const communication_orchestrator_service_1 = require("./communication-orchestrator.service");
let CommunicationsController = class CommunicationsController {
    constructor(communicationOrchestratorService) {
        this.communicationOrchestratorService = communicationOrchestratorService;
    }
    async send(user, body) {
        (0, communication_access_1.assertCanSendCommunication)(user, String(body.templateKey || ''), String(body.entityType || ''));
        return this.communicationOrchestratorService.send(body, user);
    }
    async directSend(user, body) {
        (0, communication_access_1.assertCanSendCommunication)(user, String(body.templateKey || 'custom_message'), 'custom');
        return this.communicationOrchestratorService.sendDirect(body, user);
    }
    async saveDraft(user, body) {
        (0, communication_access_1.assertCanSendCommunication)(user, String(body.templateKey || ''), String(body.entityType || ''));
        return this.communicationOrchestratorService.saveDraft(body, user);
    }
    async schedule(user, body) {
        (0, communication_access_1.assertCanSendCommunication)(user, String(body.templateKey || ''), String(body.entityType || ''));
        return this.communicationOrchestratorService.schedule(body, user);
    }
    async history(user, entityType, entityId, shipmentId, tripId, status, channel, page, pageSize) {
        (0, communication_access_1.assertCanViewCommunicationHistory)(user, entityType);
        return this.communicationOrchestratorService.history({
            entityType,
            entityId,
            shipmentId,
            tripId,
            status,
            channel,
            page: Number(page || 1),
            pageSize: Number(pageSize || 20),
        }, user);
    }
    async templates(entityType, channel, language) {
        return this.communicationOrchestratorService.templates({ entityType, channel, language });
    }
    async drafts(user, entityType, entityId, shipmentId) {
        (0, communication_access_1.assertCanViewCommunicationHistory)(user, entityType);
        return this.communicationOrchestratorService.listDrafts({ entityType, entityId, shipmentId });
    }
    async schedules(user, entityType, entityId, status) {
        (0, communication_access_1.assertCanViewCommunicationHistory)(user, entityType);
        return this.communicationOrchestratorService.listSchedules({ entityType, entityId, status });
    }
    async automationRules(entityType, triggerType) {
        return this.communicationOrchestratorService.automationRules({ entityType, triggerType });
    }
    async preview(user, body) {
        (0, communication_access_1.assertCanSendCommunication)(user, String(body.templateKey || ''), String(body.entityType || ''));
        return this.communicationOrchestratorService.preview(body);
    }
    async retry(user, communicationLogId) {
        return this.communicationOrchestratorService.retry(communicationLogId, user);
    }
    async cancel(user, communicationLogId) {
        return this.communicationOrchestratorService.cancel(communicationLogId, user);
    }
    async emitEvent(user, body) {
        (0, communication_access_1.assertCanSendCommunication)(user, String(body.templateKey || body.triggerType || ''), String(body.entityType || ''));
        return this.communicationOrchestratorService.emitEvent(body, user);
    }
};
exports.CommunicationsController = CommunicationsController;
__decorate([
    (0, common_1.Post)('send'),
    (0, permissions_decorator_1.Permissions)('dashboards:executive:view', 'payments:view', 'trips:view', 'drivers:view', 'maintenance:view', 'corridor:yard:view', 'corridor:dispatch:view', 'corridor:djibouti:view', 'corridor:supplier:view', 'corridor:finance:view', 'quotes:view', 'customers:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CommunicationsController.prototype, "send", null);
__decorate([
    (0, common_1.Post)('direct-send'),
    (0, permissions_decorator_1.Permissions)('dashboards:executive:view', 'payments:view', 'trips:view', 'drivers:view', 'maintenance:view', 'corridor:yard:view', 'corridor:dispatch:view', 'corridor:djibouti:view', 'corridor:supplier:view', 'corridor:finance:view', 'quotes:view', 'customers:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CommunicationsController.prototype, "directSend", null);
__decorate([
    (0, common_1.Post)('draft'),
    (0, permissions_decorator_1.Permissions)('dashboards:executive:view', 'payments:view', 'trips:view', 'drivers:view', 'maintenance:view', 'corridor:yard:view', 'corridor:dispatch:view', 'corridor:djibouti:view', 'corridor:supplier:view', 'corridor:finance:view', 'quotes:view', 'customers:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CommunicationsController.prototype, "saveDraft", null);
__decorate([
    (0, common_1.Post)('schedule'),
    (0, permissions_decorator_1.Permissions)('dashboards:executive:view', 'payments:view', 'trips:view', 'drivers:view', 'maintenance:view', 'corridor:yard:view', 'corridor:dispatch:view', 'corridor:djibouti:view', 'corridor:supplier:view', 'corridor:finance:view', 'quotes:view', 'customers:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CommunicationsController.prototype, "schedule", null);
__decorate([
    (0, common_1.Get)('history'),
    (0, permissions_decorator_1.Permissions)('dashboards:executive:view', 'payments:view', 'trips:view', 'drivers:view', 'maintenance:view', 'corridor:yard:view', 'corridor:dispatch:view', 'corridor:djibouti:view', 'corridor:supplier:view', 'corridor:finance:view', 'quotes:view', 'customers:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('entityType')),
    __param(2, (0, common_1.Query)('entityId')),
    __param(3, (0, common_1.Query)('shipmentId')),
    __param(4, (0, common_1.Query)('tripId')),
    __param(5, (0, common_1.Query)('status')),
    __param(6, (0, common_1.Query)('channel')),
    __param(7, (0, common_1.Query)('page')),
    __param(8, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], CommunicationsController.prototype, "history", null);
__decorate([
    (0, common_1.Get)('templates'),
    (0, permissions_decorator_1.Permissions)('dashboards:executive:view', 'payments:view', 'trips:view', 'drivers:view', 'maintenance:view', 'corridor:yard:view', 'corridor:dispatch:view', 'corridor:djibouti:view', 'corridor:supplier:view', 'corridor:finance:view', 'quotes:view', 'customers:view'),
    __param(0, (0, common_1.Query)('entityType')),
    __param(1, (0, common_1.Query)('channel')),
    __param(2, (0, common_1.Query)('language')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], CommunicationsController.prototype, "templates", null);
__decorate([
    (0, common_1.Get)('drafts'),
    (0, permissions_decorator_1.Permissions)('dashboards:executive:view', 'payments:view', 'trips:view', 'drivers:view', 'maintenance:view', 'corridor:yard:view', 'corridor:dispatch:view', 'corridor:djibouti:view', 'corridor:supplier:view', 'corridor:finance:view', 'quotes:view', 'customers:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('entityType')),
    __param(2, (0, common_1.Query)('entityId')),
    __param(3, (0, common_1.Query)('shipmentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], CommunicationsController.prototype, "drafts", null);
__decorate([
    (0, common_1.Get)('schedules'),
    (0, permissions_decorator_1.Permissions)('dashboards:executive:view', 'payments:view', 'trips:view', 'drivers:view', 'maintenance:view', 'corridor:yard:view', 'corridor:dispatch:view', 'corridor:djibouti:view', 'corridor:supplier:view', 'corridor:finance:view', 'quotes:view', 'customers:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('entityType')),
    __param(2, (0, common_1.Query)('entityId')),
    __param(3, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], CommunicationsController.prototype, "schedules", null);
__decorate([
    (0, common_1.Get)('automation-rules'),
    (0, permissions_decorator_1.Permissions)('dashboards:executive:view', 'payments:view', 'trips:view', 'drivers:view', 'maintenance:view', 'corridor:yard:view', 'corridor:dispatch:view', 'corridor:djibouti:view', 'corridor:supplier:view', 'corridor:finance:view', 'quotes:view', 'customers:view'),
    __param(0, (0, common_1.Query)('entityType')),
    __param(1, (0, common_1.Query)('triggerType')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CommunicationsController.prototype, "automationRules", null);
__decorate([
    (0, common_1.Post)('preview'),
    (0, permissions_decorator_1.Permissions)('dashboards:executive:view', 'payments:view', 'trips:view', 'drivers:view', 'maintenance:view', 'corridor:yard:view', 'corridor:dispatch:view', 'corridor:djibouti:view', 'corridor:supplier:view', 'corridor:finance:view', 'quotes:view', 'customers:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CommunicationsController.prototype, "preview", null);
__decorate([
    (0, common_1.Post)(':communicationLogId/retry'),
    (0, permissions_decorator_1.Permissions)('dashboards:executive:view', 'payments:view', 'trips:view', 'drivers:view', 'maintenance:view', 'corridor:yard:view', 'corridor:dispatch:view', 'corridor:djibouti:view', 'corridor:supplier:view', 'corridor:finance:view', 'quotes:view', 'customers:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('communicationLogId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CommunicationsController.prototype, "retry", null);
__decorate([
    (0, common_1.Post)(':communicationLogId/cancel'),
    (0, permissions_decorator_1.Permissions)('dashboards:executive:view', 'payments:view', 'trips:view', 'drivers:view', 'maintenance:view', 'corridor:yard:view', 'corridor:dispatch:view', 'corridor:djibouti:view', 'corridor:supplier:view', 'corridor:finance:view', 'quotes:view', 'customers:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('communicationLogId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CommunicationsController.prototype, "cancel", null);
__decorate([
    (0, common_1.Post)('events'),
    (0, permissions_decorator_1.Permissions)('dashboards:executive:view', 'payments:view', 'trips:view', 'drivers:view', 'maintenance:view', 'corridor:yard:view', 'corridor:dispatch:view', 'corridor:djibouti:view', 'corridor:supplier:view', 'corridor:finance:view', 'quotes:view', 'customers:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CommunicationsController.prototype, "emitEvent", null);
exports.CommunicationsController = CommunicationsController = __decorate([
    (0, swagger_1.ApiTags)('communications'),
    (0, common_1.Controller)('communications'),
    __metadata("design:paramtypes", [communication_orchestrator_service_1.CommunicationOrchestratorService])
], CommunicationsController);
//# sourceMappingURL=communications.controller.js.map