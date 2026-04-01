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
exports.CorridorController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const public_decorator_1 = require("../auth/public.decorator");
const corridor_service_1 = require("./corridor.service");
let CorridorController = class CorridorController {
    constructor(corridorService) {
        this.corridorService = corridorService;
    }
    getAccessMatrix() {
        return this.corridorService.getRoleMatrix();
    }
    getShipments(user, query) {
        return this.corridorService.getShipments((0, corridor_service_1.corridorActorFromUser)(user, query));
    }
    getShipment(user, shipmentRef, query) {
        return this.corridorService.getShipment(shipmentRef, (0, corridor_service_1.corridorActorFromUser)(user, query));
    }
    getCustomerPortal(user, query) {
        return this.corridorService.getCustomerPortal((0, corridor_service_1.corridorActorFromUser)(user, query));
    }
    getWorkspace(user, workspace, query) {
        return this.corridorService.getWorkspace(workspace, (0, corridor_service_1.corridorActorFromUser)(user, query));
    }
    getDriverTransitPack(user, query) {
        return this.corridorService.getDriverTransitPack((0, corridor_service_1.corridorActorFromUser)(user, query));
    }
    markDocumentsReady(user, shipmentRef, body, query) {
        return this.corridorService.markDocumentsReadyForClearance((0, corridor_service_1.corridorActorFromUser)(user, query), shipmentRef, body);
    }
    acknowledgeClearance(user, shipmentRef, body, query) {
        return this.corridorService.acknowledgeClearanceDocuments((0, corridor_service_1.corridorActorFromUser)(user, query), shipmentRef, body);
    }
    requestMissingDocs(user, shipmentRef, body, query) {
        return this.corridorService.requestMissingClearanceDocuments((0, corridor_service_1.corridorActorFromUser)(user, query), shipmentRef, body);
    }
    startClearance(user, shipmentRef, body, query) {
        return this.corridorService.startClearance((0, corridor_service_1.corridorActorFromUser)(user, query), shipmentRef, body);
    }
    completeClearance(user, shipmentRef, body, query) {
        return this.corridorService.completeClearance((0, corridor_service_1.corridorActorFromUser)(user, query), shipmentRef, body);
    }
    generateClearancePack(user, shipmentRef, body, query) {
        return this.corridorService.generateClearancePack((0, corridor_service_1.corridorActorFromUser)(user, query), shipmentRef, body);
    }
    bulkDownloadDocuments(user, shipmentRef, body, query) {
        return this.corridorService.bulkDownloadDocuments((0, corridor_service_1.corridorActorFromUser)(user, query), shipmentRef, body);
    }
    logDocumentAccess(user, shipmentRef, shipmentDocumentId, body, query) {
        return this.corridorService.logDocumentAccess((0, corridor_service_1.corridorActorFromUser)(user, query), shipmentRef, shipmentDocumentId, body);
    }
    getDocumentAccessLog(user, shipmentRef, query) {
        return this.corridorService.getDocumentAccessLog((0, corridor_service_1.corridorActorFromUser)(user, query), shipmentRef);
    }
};
exports.CorridorController = CorridorController;
__decorate([
    (0, common_1.Get)('access-matrix'),
    (0, public_decorator_1.Public)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CorridorController.prototype, "getAccessMatrix", null);
__decorate([
    (0, common_1.Get)('shipments'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], CorridorController.prototype, "getShipments", null);
__decorate([
    (0, common_1.Get)('shipments/:shipmentRef'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentRef')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], CorridorController.prototype, "getShipment", null);
__decorate([
    (0, common_1.Get)('customer-portal'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], CorridorController.prototype, "getCustomerPortal", null);
__decorate([
    (0, common_1.Get)('workspaces/:workspace'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('workspace')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], CorridorController.prototype, "getWorkspace", null);
__decorate([
    (0, common_1.Get)('driver/transit-pack'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], CorridorController.prototype, "getDriverTransitPack", null);
__decorate([
    (0, common_1.Post)('shipments/:shipmentRef/clearance/documents-ready'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentRef')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Object]),
    __metadata("design:returntype", void 0)
], CorridorController.prototype, "markDocumentsReady", null);
__decorate([
    (0, common_1.Post)('shipments/:shipmentRef/clearance/acknowledge'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentRef')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Object]),
    __metadata("design:returntype", void 0)
], CorridorController.prototype, "acknowledgeClearance", null);
__decorate([
    (0, common_1.Post)('shipments/:shipmentRef/clearance/request-missing-docs'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentRef')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Object]),
    __metadata("design:returntype", void 0)
], CorridorController.prototype, "requestMissingDocs", null);
__decorate([
    (0, common_1.Post)('shipments/:shipmentRef/clearance/start'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentRef')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Object]),
    __metadata("design:returntype", void 0)
], CorridorController.prototype, "startClearance", null);
__decorate([
    (0, common_1.Post)('shipments/:shipmentRef/clearance/complete'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentRef')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Object]),
    __metadata("design:returntype", void 0)
], CorridorController.prototype, "completeClearance", null);
__decorate([
    (0, common_1.Post)('shipments/:shipmentRef/clearance-pack'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentRef')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Object]),
    __metadata("design:returntype", void 0)
], CorridorController.prototype, "generateClearancePack", null);
__decorate([
    (0, common_1.Post)('shipments/:shipmentRef/documents/bulk-download'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentRef')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Object]),
    __metadata("design:returntype", void 0)
], CorridorController.prototype, "bulkDownloadDocuments", null);
__decorate([
    (0, common_1.Post)('shipments/:shipmentRef/documents/:shipmentDocumentId/access-log'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentRef')),
    __param(2, (0, common_1.Param)('shipmentDocumentId')),
    __param(3, (0, common_1.Body)()),
    __param(4, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], CorridorController.prototype, "logDocumentAccess", null);
__decorate([
    (0, common_1.Get)('shipments/:shipmentRef/document-access-log'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentRef')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], CorridorController.prototype, "getDocumentAccessLog", null);
exports.CorridorController = CorridorController = __decorate([
    (0, swagger_1.ApiTags)('corridor'),
    (0, common_1.Controller)('corridor'),
    __metadata("design:paramtypes", [corridor_service_1.CorridorService])
], CorridorController);
//# sourceMappingURL=corridor.controller.js.map