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
exports.DocumentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const public_decorator_1 = require("../auth/public.decorator");
const rate_limit_decorator_1 = require("../auth/rate-limit.decorator");
const documents_service_1 = require("./documents.service");
let DocumentsController = class DocumentsController {
    constructor(documentsService) {
        this.documentsService = documentsService;
    }
    async list(user) {
        return this.documentsService.list(user);
    }
    async policy(entityType, mobileUploadOnly) {
        return this.documentsService.listPolicy({
            entityType,
            mobileUploadOnly: mobileUploadOnly === 'true',
        });
    }
    async upload(user, body) {
        return this.documentsService.upload(user, body);
    }
    async createUploadUrl(user, body) {
        return this.documentsService.createUploadUrl(user, body);
    }
    async finalizeUpload(user, body) {
        return this.documentsService.finalizeUpload(user, body);
    }
    async getOne(user, id) {
        return this.documentsService.getOne(user, id);
    }
    async download(user, id) {
        return this.documentsService.download(user, id);
    }
    async resolveDownload(id, token) {
        return this.documentsService.resolveSignedDownload(id, token || '');
    }
    async downloadFile(id, token, response) {
        const file = await this.documentsService.resolveSignedDownloadFile(id, token || '');
        response.setHeader('Content-Type', file.mimeType);
        response.setHeader('Content-Disposition', `inline; filename="${file.fileName}"`);
        return response.sendFile(file.absolutePath);
    }
    async byEntity(user, entityType, entityId) {
        return this.documentsService.byEntity(user, entityType, entityId);
    }
};
exports.DocumentsController = DocumentsController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('documents:view', 'documents:own:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('policy'),
    (0, permissions_decorator_1.Permissions)('documents:view', 'documents:own:view'),
    __param(0, (0, common_1.Query)('entityType')),
    __param(1, (0, common_1.Query)('mobileUploadOnly')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "policy", null);
__decorate([
    (0, common_1.Post)('upload'),
    (0, permissions_decorator_1.Permissions)('documents:upload', 'documents:own:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "upload", null);
__decorate([
    (0, common_1.Post)('upload-url'),
    (0, permissions_decorator_1.Permissions)('documents:upload', 'documents:own:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "createUploadUrl", null);
__decorate([
    (0, common_1.Post)('finalize-upload'),
    (0, permissions_decorator_1.Permissions)('documents:upload', 'documents:own:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "finalizeUpload", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_decorator_1.Permissions)('documents:view', 'documents:own:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "getOne", null);
__decorate([
    (0, common_1.Get)(':id/download'),
    (0, permissions_decorator_1.Permissions)('documents:view', 'documents:own:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "download", null);
__decorate([
    (0, common_1.Get)(':id/download/resolve'),
    (0, public_decorator_1.Public)(),
    (0, rate_limit_decorator_1.RateLimit)({ windowMs: 5 * 60_000, max: 60, scope: 'documents:resolve' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "resolveDownload", null);
__decorate([
    (0, common_1.Get)(':id/download/file'),
    (0, public_decorator_1.Public)(),
    (0, rate_limit_decorator_1.RateLimit)({ windowMs: 5 * 60_000, max: 60, scope: 'documents:file' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('token')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "downloadFile", null);
__decorate([
    (0, common_1.Get)('by-entity/:entityType/:entityId'),
    (0, permissions_decorator_1.Permissions)('documents:view', 'documents:own:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('entityType')),
    __param(2, (0, common_1.Param)('entityId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "byEntity", null);
exports.DocumentsController = DocumentsController = __decorate([
    (0, swagger_1.ApiTags)('documents'),
    (0, common_1.Controller)('documents'),
    __metadata("design:paramtypes", [documents_service_1.DocumentsService])
], DocumentsController);
//# sourceMappingURL=documents.controller.js.map