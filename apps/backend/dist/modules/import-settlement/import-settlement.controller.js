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
exports.ImportSettlementController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const import_settlement_service_1 = require("./import-settlement.service");
let ImportSettlementController = class ImportSettlementController {
    constructor(importSettlementService) {
        this.importSettlementService = importSettlementService;
    }
    async queue(user, query) {
        return this.importSettlementService.listShipmentQueue(user, query);
    }
    async workspace(user, shipmentId) {
        return this.importSettlementService.getShipmentWorkspace(user, shipmentId);
    }
    async createBankDocument(user, shipmentId, body) {
        return this.importSettlementService.createBankDocument(user, shipmentId, body);
    }
    async reviewBankDocument(user, bankDocumentId, body) {
        return this.importSettlementService.reviewBankDocument(user, bankDocumentId, body);
    }
    async createInvoice(user, shipmentId, body) {
        return this.importSettlementService.createChargeInvoice(user, shipmentId, body);
    }
    async updateInvoice(user, invoiceId, body) {
        return this.importSettlementService.updateChargeInvoice(user, invoiceId, body);
    }
    async createPaymentReceipt(user, shipmentId, body) {
        return this.importSettlementService.createCustomerPaymentReceipt(user, shipmentId, body);
    }
    async verifyPaymentReceipt(user, receiptId, body) {
        return this.importSettlementService.verifyPaymentReceipt(user, receiptId, body);
    }
    async issueOfficialReceipt(user, shipmentId, body) {
        return this.importSettlementService.issueOfficialReceipt(user, shipmentId, body);
    }
    async approveFinancialClearance(user, shipmentId, body) {
        return this.importSettlementService.approveFinancialClearance(user, shipmentId, body);
    }
    async createReleaseAuthorization(user, shipmentId, body) {
        return this.importSettlementService.createReleaseAuthorization(user, shipmentId, body);
    }
    async confirmDryPortRelease(user, shipmentId, body) {
        return this.importSettlementService.confirmDryPortRelease(user, shipmentId, body);
    }
    async createInterchange(user, shipmentId, body) {
        return this.importSettlementService.createContainerInterchange(user, shipmentId, body);
    }
    async createDriverExpenseClaim(user, shipmentId, body) {
        return this.importSettlementService.submitDriverExpenseClaim(user, shipmentId, body);
    }
    async reviewDriverExpenseClaim(user, claimId, body) {
        return this.importSettlementService.reviewDriverExpenseClaim(user, claimId, body);
    }
    async reimburseDriverExpenseClaim(user, claimId, body) {
        return this.importSettlementService.reimburseDriverExpenseClaim(user, claimId, body);
    }
    async financeDashboard(user) {
        return this.importSettlementService.financeDashboard(user);
    }
    async operationsDashboard(user) {
        return this.importSettlementService.operationsDashboard(user);
    }
    async reimbursementDashboard(user) {
        return this.importSettlementService.reimbursementDashboard(user);
    }
};
exports.ImportSettlementController = ImportSettlementController;
__decorate([
    (0, common_1.Get)('shipments/queue'),
    (0, permissions_decorator_1.Permissions)('payments:view', 'payments:own:view', 'corridor:finance:view', 'corridor:yard:view', 'dashboard:customer:view', 'trips:view-assigned'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ImportSettlementController.prototype, "queue", null);
__decorate([
    (0, common_1.Get)('shipments/:shipmentId/workspace'),
    (0, permissions_decorator_1.Permissions)('payments:view', 'payments:own:view', 'documents:own:view', 'documents:view', 'corridor:finance:view', 'corridor:yard:view', 'dashboard:customer:view', 'trips:view-assigned'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ImportSettlementController.prototype, "workspace", null);
__decorate([
    (0, common_1.Post)('shipments/:shipmentId/bank-documents'),
    (0, permissions_decorator_1.Permissions)('payments:view', 'payments:own:view', 'documents:own:view', 'documents:upload', 'corridor:finance:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ImportSettlementController.prototype, "createBankDocument", null);
__decorate([
    (0, common_1.Patch)('bank-documents/:bankDocumentId'),
    (0, permissions_decorator_1.Permissions)('payments:view', 'corridor:finance:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('bankDocumentId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ImportSettlementController.prototype, "reviewBankDocument", null);
__decorate([
    (0, common_1.Post)('shipments/:shipmentId/invoices'),
    (0, permissions_decorator_1.Permissions)('payments:view', 'invoices:view', 'corridor:finance:view', 'customers:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ImportSettlementController.prototype, "createInvoice", null);
__decorate([
    (0, common_1.Patch)('invoices/:invoiceId'),
    (0, permissions_decorator_1.Permissions)('payments:view', 'invoices:view', 'corridor:finance:view', 'customers:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('invoiceId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ImportSettlementController.prototype, "updateInvoice", null);
__decorate([
    (0, common_1.Post)('shipments/:shipmentId/payment-receipts'),
    (0, permissions_decorator_1.Permissions)('payments:view', 'payments:own:view', 'documents:own:view', 'documents:upload'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ImportSettlementController.prototype, "createPaymentReceipt", null);
__decorate([
    (0, common_1.Patch)('payment-receipts/:receiptId/verify'),
    (0, permissions_decorator_1.Permissions)('payments:view', 'corridor:finance:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('receiptId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ImportSettlementController.prototype, "verifyPaymentReceipt", null);
__decorate([
    (0, common_1.Post)('shipments/:shipmentId/official-receipts'),
    (0, permissions_decorator_1.Permissions)('payments:view', 'corridor:finance:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ImportSettlementController.prototype, "issueOfficialReceipt", null);
__decorate([
    (0, common_1.Post)('shipments/:shipmentId/financial-clearance'),
    (0, permissions_decorator_1.Permissions)('payments:view', 'corridor:finance:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ImportSettlementController.prototype, "approveFinancialClearance", null);
__decorate([
    (0, common_1.Post)('shipments/:shipmentId/release-authorizations'),
    (0, permissions_decorator_1.Permissions)('payments:view', 'corridor:finance:view', 'corridor:yard:view', 'customers:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ImportSettlementController.prototype, "createReleaseAuthorization", null);
__decorate([
    (0, common_1.Post)('shipments/:shipmentId/dry-port-release'),
    (0, permissions_decorator_1.Permissions)('corridor:yard:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ImportSettlementController.prototype, "confirmDryPortRelease", null);
__decorate([
    (0, common_1.Post)('shipments/:shipmentId/container-interchanges'),
    (0, permissions_decorator_1.Permissions)('corridor:yard:view', 'corridor:finance:view', 'documents:upload', 'trips:view-assigned'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ImportSettlementController.prototype, "createInterchange", null);
__decorate([
    (0, common_1.Post)('shipments/:shipmentId/driver-expense-claims'),
    (0, permissions_decorator_1.Permissions)('documents:upload', 'trips:view-assigned'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shipmentId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ImportSettlementController.prototype, "createDriverExpenseClaim", null);
__decorate([
    (0, common_1.Patch)('driver-expense-claims/:claimId/review'),
    (0, permissions_decorator_1.Permissions)('payments:view', 'corridor:finance:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('claimId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ImportSettlementController.prototype, "reviewDriverExpenseClaim", null);
__decorate([
    (0, common_1.Post)('driver-expense-claims/:claimId/reimburse'),
    (0, permissions_decorator_1.Permissions)('payments:view', 'corridor:finance:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('claimId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ImportSettlementController.prototype, "reimburseDriverExpenseClaim", null);
__decorate([
    (0, common_1.Get)('dashboards/finance'),
    (0, permissions_decorator_1.Permissions)('payments:view', 'corridor:finance:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ImportSettlementController.prototype, "financeDashboard", null);
__decorate([
    (0, common_1.Get)('dashboards/operations'),
    (0, permissions_decorator_1.Permissions)('payments:view', 'corridor:finance:view', 'corridor:yard:view', 'customers:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ImportSettlementController.prototype, "operationsDashboard", null);
__decorate([
    (0, common_1.Get)('dashboards/reimbursements'),
    (0, permissions_decorator_1.Permissions)('payments:view', 'corridor:finance:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ImportSettlementController.prototype, "reimbursementDashboard", null);
exports.ImportSettlementController = ImportSettlementController = __decorate([
    (0, swagger_1.ApiTags)('import-settlement'),
    (0, common_1.Controller)('import-settlement'),
    __metadata("design:paramtypes", [import_settlement_service_1.ImportSettlementService])
], ImportSettlementController);
//# sourceMappingURL=import-settlement.controller.js.map