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
exports.ShipmentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const public_decorator_1 = require("../auth/public.decorator");
const corridor_service_1 = require("./corridor.service");
let ShipmentsController = class ShipmentsController {
    constructor(corridorService) {
        this.corridorService = corridorService;
    }
    async listShipments(user, query) {
        return this.corridorService.listShipments((0, corridor_service_1.corridorActorFromUser)(user, query), query);
    }
    async getShipment(user, shipmentId, query) {
        return this.corridorService.getShipmentDetail((0, corridor_service_1.corridorActorFromUser)(user, query), shipmentId);
    }
    async getShipmentAlias(user, shipmentId, query) {
        return this.corridorService.getShipmentDetail((0, corridor_service_1.corridorActorFromUser)(user, query), shipmentId);
    }
    async listCargoItems(user, shipmentId, query) {
        return this.corridorService.listCargoItems((0, corridor_service_1.corridorActorFromUser)(user, query), shipmentId);
    }
    async createCargoItem(user, shipmentId, body, query) {
        return this.corridorService.createCargoItem((0, corridor_service_1.corridorActorFromUser)(user, query), shipmentId, body);
    }
    async updateCargoItem(user, shipmentId, cargoItemId, body, query) {
        return this.corridorService.updateCargoItem((0, corridor_service_1.corridorActorFromUser)(user, query), shipmentId, cargoItemId, body);
    }
    async deleteCargoItem(user, shipmentId, cargoItemId, query) {
        return this.corridorService.deleteCargoItem((0, corridor_service_1.corridorActorFromUser)(user, query), shipmentId, cargoItemId);
    }
    async listDocuments(user, shipmentId, query) {
        return this.corridorService.listDocuments((0, corridor_service_1.corridorActorFromUser)(user, query), shipmentId, query);
    }
    async listDocumentsAlias(user, shipmentId, query) {
        return this.corridorService.listDocuments((0, corridor_service_1.corridorActorFromUser)(user, query), shipmentId, query);
    }
    async createDocument(user, shipmentId, body, query) {
        return this.corridorService.createDocument((0, corridor_service_1.corridorActorFromUser)(user, query), shipmentId, body);
    }
    async updateDocument(user, shipmentId, shipmentDocumentId, body, query) {
        return this.corridorService.updateDocument((0, corridor_service_1.corridorActorFromUser)(user, query), shipmentId, shipmentDocumentId, body);
    }
    async documentAccessLog(user, shipmentId, query) {
        return this.corridorService.getDocumentAccessLog((0, corridor_service_1.corridorActorFromUser)(user, query), shipmentId);
    }
    async logDocumentAccess(user, shipmentId, shipmentDocumentId, body, query) {
        return this.corridorService.logDocumentAccess((0, corridor_service_1.corridorActorFromUser)(user, query), shipmentId, shipmentDocumentId, body);
    }
    async bulkDownloadDocuments(user, shipmentId, body, query) {
        return this.corridorService.bulkDownloadDocuments((0, corridor_service_1.corridorActorFromUser)(user, query), shipmentId, body);
    }
    async checkClearanceReadiness(user, shipmentId, query) {
        return this.corridorService.checkClearanceReadiness((0, corridor_service_1.corridorActorFromUser)(user, query), shipmentId);
    }
    async getTracking(user, shipmentId, query) {
        return this.corridorService.getShipmentTracking((0, corridor_service_1.corridorActorFromUser)(user, query), shipmentId);
    }
    async generateClearancePack(user, shipmentId, body, query) {
        return this.corridorService.generateClearancePack((0, corridor_service_1.corridorActorFromUser)(user, query), shipmentId, body);
    }
    async approveFinanceClearance(user, shipmentId, body, query) {
        return this.corridorService.approveFinanceClearance((0, corridor_service_1.corridorActorFromUser)(user, query), shipmentId, body);
    }
    async signDocument(user, shipmentId, shipmentDocumentId, body, query) {
        return this.corridorService.signDocument((0, corridor_service_1.corridorActorFromUser)(user, query), shipmentId, shipmentDocumentId, body);
    }
    async createQuote(body) {
        return this.corridorService.createQuote(body);
    }
    async createBooking(body) {
        return this.corridorService.createBooking(body);
    }
    async verifyDocument(body) {
        return this.corridorService.verifyDocumentPublic(String(body.documentId || body.shipmentDocumentId || ''), body);
    }
    async listContainers(user, shipmentId, query) {
        return this.corridorService.listContainers((0, corridor_service_1.corridorActorFromUser)(user, query), shipmentId);
    }
    async updateContainer(user, shipmentId, containerId, body, query) {
        return this.corridorService.updateContainer((0, corridor_service_1.corridorActorFromUser)(user, query), shipmentId, containerId, body);
    }
    async listTrips(user, shipmentId, query) {
        return this.corridorService.listTrips((0, corridor_service_1.corridorActorFromUser)(user, query), shipmentId);
    }
    async createTrip(user, shipmentId, body, query) {
        return this.corridorService.createTrip((0, corridor_service_1.corridorActorFromUser)(user, query), shipmentId, body);
    }
    async updateTrip(user, tripId, body, query) {
        return this.corridorService.updateTrip((0, corridor_service_1.corridorActorFromUser)(user, query), tripId, body);
    }
    async syncManualDispatchTrip(user, body, query) {
        return this.corridorService.syncManualDispatchTrip((0, corridor_service_1.corridorActorFromUser)(user, query), body);
    }
    async listMilestones(user, shipmentId, query) {
        return this.corridorService.listMilestones((0, corridor_service_1.corridorActorFromUser)(user, query), shipmentId);
    }
    async createMilestone(user, shipmentId, body, query) {
        return this.corridorService.createMilestone((0, corridor_service_1.corridorActorFromUser)(user, query), shipmentId, body);
    }
    async listExceptions(user, shipmentId, query) {
        return this.corridorService.listExceptions((0, corridor_service_1.corridorActorFromUser)(user, query), shipmentId);
    }
    async createException(user, shipmentId, body, query) {
        return this.corridorService.createException((0, corridor_service_1.corridorActorFromUser)(user, query), shipmentId, body);
    }
    async updateException(user, shipmentId, exceptionId, body, query) {
        return this.corridorService.updateException((0, corridor_service_1.corridorActorFromUser)(user, query), shipmentId, exceptionId, body);
    }
    async shipmentAction(user, shipmentId, action, body, query) {
        return this.corridorService.performShipmentAction((0, corridor_service_1.corridorActorFromUser)(user, query), shipmentId, action.replace(/-/g, '_'), body);
    }
    async tripAction(user, tripId, action, body, query) {
        return this.corridorService.performTripAction((0, corridor_service_1.corridorActorFromUser)(user, query), tripId, action.replace(/-/g, '_'), body);
    }
};
exports.ShipmentsController = ShipmentsController;
__decorate([
    (0, common_1.Get)('shipments'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ShipmentsController.prototype, "listShipments", null);
__decorate([
    (0, common_1.Get)('shipments/:shipmentId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentId')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ShipmentsController.prototype, "getShipment", null);
__decorate([
    (0, common_1.Get)('shipment/:shipmentId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentId')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ShipmentsController.prototype, "getShipmentAlias", null);
__decorate([
    (0, common_1.Get)('shipments/:shipmentId/cargo-items'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentId')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ShipmentsController.prototype, "listCargoItems", null);
__decorate([
    (0, common_1.Post)('shipments/:shipmentId/cargo-items'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Object]),
    __metadata("design:returntype", Promise)
], ShipmentsController.prototype, "createCargoItem", null);
__decorate([
    (0, common_1.Patch)('shipments/:shipmentId/cargo-items/:cargoItemId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentId')),
    __param(2, (0, common_1.Param)('cargoItemId')),
    __param(3, (0, common_1.Body)()),
    __param(4, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], ShipmentsController.prototype, "updateCargoItem", null);
__decorate([
    (0, common_1.Delete)('shipments/:shipmentId/cargo-items/:cargoItemId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentId')),
    __param(2, (0, common_1.Param)('cargoItemId')),
    __param(3, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], ShipmentsController.prototype, "deleteCargoItem", null);
__decorate([
    (0, common_1.Get)('shipments/:shipmentId/documents'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentId')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ShipmentsController.prototype, "listDocuments", null);
__decorate([
    (0, common_1.Get)('shipment/:shipmentId/documents'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentId')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ShipmentsController.prototype, "listDocumentsAlias", null);
__decorate([
    (0, common_1.Post)('shipments/:shipmentId/documents'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Object]),
    __metadata("design:returntype", Promise)
], ShipmentsController.prototype, "createDocument", null);
__decorate([
    (0, common_1.Patch)('shipments/:shipmentId/documents/:shipmentDocumentId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentId')),
    __param(2, (0, common_1.Param)('shipmentDocumentId')),
    __param(3, (0, common_1.Body)()),
    __param(4, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], ShipmentsController.prototype, "updateDocument", null);
__decorate([
    (0, common_1.Get)('shipments/:shipmentId/documents/access-log'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentId')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ShipmentsController.prototype, "documentAccessLog", null);
__decorate([
    (0, common_1.Post)('shipments/:shipmentId/documents/:shipmentDocumentId/log'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentId')),
    __param(2, (0, common_1.Param)('shipmentDocumentId')),
    __param(3, (0, common_1.Body)()),
    __param(4, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], ShipmentsController.prototype, "logDocumentAccess", null);
__decorate([
    (0, common_1.Post)('shipments/:shipmentId/documents/bulk-download'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Object]),
    __metadata("design:returntype", Promise)
], ShipmentsController.prototype, "bulkDownloadDocuments", null);
__decorate([
    (0, common_1.Get)('shipments/:shipmentId/clearance-readiness'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentId')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ShipmentsController.prototype, "checkClearanceReadiness", null);
__decorate([
    (0, common_1.Get)('shipment/:shipmentId/tracking'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentId')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ShipmentsController.prototype, "getTracking", null);
__decorate([
    (0, common_1.Post)('shipments/:shipmentId/clearance-pack/generate'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Object]),
    __metadata("design:returntype", Promise)
], ShipmentsController.prototype, "generateClearancePack", null);
__decorate([
    (0, common_1.Post)('shipments/:shipmentId/finance-clearance'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Object]),
    __metadata("design:returntype", Promise)
], ShipmentsController.prototype, "approveFinanceClearance", null);
__decorate([
    (0, common_1.Post)('shipments/:shipmentId/documents/:shipmentDocumentId/sign'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentId')),
    __param(2, (0, common_1.Param)('shipmentDocumentId')),
    __param(3, (0, common_1.Body)()),
    __param(4, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], ShipmentsController.prototype, "signDocument", null);
__decorate([
    (0, common_1.Post)('shipment/quote'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ShipmentsController.prototype, "createQuote", null);
__decorate([
    (0, common_1.Post)('shipment/book'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ShipmentsController.prototype, "createBooking", null);
__decorate([
    (0, common_1.Post)('document/verify'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ShipmentsController.prototype, "verifyDocument", null);
__decorate([
    (0, common_1.Get)('shipments/:shipmentId/containers'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentId')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ShipmentsController.prototype, "listContainers", null);
__decorate([
    (0, common_1.Patch)('shipments/:shipmentId/containers/:containerId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentId')),
    __param(2, (0, common_1.Param)('containerId')),
    __param(3, (0, common_1.Body)()),
    __param(4, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], ShipmentsController.prototype, "updateContainer", null);
__decorate([
    (0, common_1.Get)('shipments/:shipmentId/trips'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentId')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ShipmentsController.prototype, "listTrips", null);
__decorate([
    (0, common_1.Post)('shipments/:shipmentId/trips'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Object]),
    __metadata("design:returntype", Promise)
], ShipmentsController.prototype, "createTrip", null);
__decorate([
    (0, common_1.Patch)('trips/:tripId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('tripId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Object]),
    __metadata("design:returntype", Promise)
], ShipmentsController.prototype, "updateTrip", null);
__decorate([
    (0, common_1.Post)('corridor/manual-sync/dispatch-trip'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ShipmentsController.prototype, "syncManualDispatchTrip", null);
__decorate([
    (0, common_1.Get)('shipments/:shipmentId/milestones'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentId')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ShipmentsController.prototype, "listMilestones", null);
__decorate([
    (0, common_1.Post)('shipments/:shipmentId/milestones'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Object]),
    __metadata("design:returntype", Promise)
], ShipmentsController.prototype, "createMilestone", null);
__decorate([
    (0, common_1.Get)('shipments/:shipmentId/exceptions'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentId')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ShipmentsController.prototype, "listExceptions", null);
__decorate([
    (0, common_1.Post)('shipments/:shipmentId/exceptions'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Object]),
    __metadata("design:returntype", Promise)
], ShipmentsController.prototype, "createException", null);
__decorate([
    (0, common_1.Patch)('shipments/:shipmentId/exceptions/:exceptionId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentId')),
    __param(2, (0, common_1.Param)('exceptionId')),
    __param(3, (0, common_1.Body)()),
    __param(4, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], ShipmentsController.prototype, "updateException", null);
__decorate([
    (0, common_1.Post)('shipments/:shipmentId/actions/:action'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentId')),
    __param(2, (0, common_1.Param)('action')),
    __param(3, (0, common_1.Body)()),
    __param(4, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], ShipmentsController.prototype, "shipmentAction", null);
__decorate([
    (0, common_1.Post)('trips/:tripId/actions/:action'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('tripId')),
    __param(2, (0, common_1.Param)('action')),
    __param(3, (0, common_1.Body)()),
    __param(4, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], ShipmentsController.prototype, "tripAction", null);
exports.ShipmentsController = ShipmentsController = __decorate([
    (0, swagger_1.ApiTags)('shipments'),
    (0, public_decorator_1.Public)(),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [corridor_service_1.CorridorService])
], ShipmentsController);
//# sourceMappingURL=shipments.controller.js.map