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
exports.AgreementsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const node_crypto_1 = require("node:crypto");
const mongo_1 = require("../../database/mongo");
const models_1 = require("../../database/models");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const permissions_decorator_1 = require("../auth/permissions.decorator");
let AgreementsController = class AgreementsController {
    async list(user) {
        await (0, mongo_1.connectToDatabase)();
        if (user.role === 'customer') {
            return models_1.AgreementModel.find({ customerCode: user.customerCode }).sort({ createdAt: -1 }).lean();
        }
        return models_1.AgreementModel.find().sort({ createdAt: -1 }).limit(200).lean();
    }
    async my(user) {
        await (0, mongo_1.connectToDatabase)();
        return models_1.AgreementModel.find({ customerCode: user.customerCode }).sort({ createdAt: -1 }).lean();
    }
    async sendSignLink(id) {
        await (0, mongo_1.connectToDatabase)();
        const token = (0, node_crypto_1.randomUUID)();
        const updated = await models_1.AgreementModel.findByIdAndUpdate(id, { $set: { status: 'sent_for_signature', secureSignToken: token, sentForSignatureAt: new Date() } }, { new: true }).lean();
        return updated
            ? {
                agreementId: String(updated._id),
                signLink: `https://tikurabay.local/sign/${token}`,
                status: updated.status,
            }
            : null;
    }
    async sign(id, user, body) {
        await (0, mongo_1.connectToDatabase)();
        const agreement = await models_1.AgreementModel.findByIdAndUpdate(id, {
            $set: {
                status: 'signed',
                signedPdfUrl: `/agreements/${id}/download`,
            },
        }, { new: true }).lean();
        if (!agreement)
            return null;
        const signature = await models_1.AgreementSignatureModel.create({
            agreementId: agreement._id,
            signerName: body.signerName || user.name,
            signerEmail: body.signerEmail || user.email,
            signerPhone: body.signerPhone || user.phone,
            signedAt: new Date(),
            ipAddress: body.ipAddress || '127.0.0.1',
            deviceInfo: body.deviceInfo || 'mobile-app',
            signedPdfUrl: `/agreements/${id}/download`,
            auditTrail: ['Agreement reviewed', 'Agreement signed in mobile app'],
        });
        return {
            agreement,
            signature: signature.toObject(),
        };
    }
    async download(id) {
        await (0, mongo_1.connectToDatabase)();
        const agreement = await models_1.AgreementModel.findById(id).lean();
        return agreement
            ? {
                agreementId: String(agreement._id),
                agreementCode: agreement.agreementCode,
                downloadUrl: agreement.signedPdfUrl || `/agreements/${id}.pdf`,
                status: agreement.status,
            }
            : null;
    }
};
exports.AgreementsController = AgreementsController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('agreements:view', 'agreements:own:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AgreementsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('my'),
    (0, permissions_decorator_1.Permissions)('agreements:view', 'agreements:own:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AgreementsController.prototype, "my", null);
__decorate([
    (0, common_1.Post)(':id/send-sign-link'),
    (0, permissions_decorator_1.Permissions)('agreements:view'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AgreementsController.prototype, "sendSignLink", null);
__decorate([
    (0, common_1.Post)(':id/sign'),
    (0, permissions_decorator_1.Permissions)('agreements:view', 'agreements:own:view'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AgreementsController.prototype, "sign", null);
__decorate([
    (0, common_1.Get)(':id/download'),
    (0, permissions_decorator_1.Permissions)('agreements:view', 'agreements:own:view'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AgreementsController.prototype, "download", null);
exports.AgreementsController = AgreementsController = __decorate([
    (0, swagger_1.ApiTags)('agreements'),
    (0, common_1.Controller)('agreements')
], AgreementsController);
//# sourceMappingURL=agreements.controller.js.map