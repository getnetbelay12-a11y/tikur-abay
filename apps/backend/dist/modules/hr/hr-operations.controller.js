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
exports.HrOperationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const mongo_1 = require("../../database/mongo");
const models_1 = require("../../database/models");
let HrOperationsController = class HrOperationsController {
    async requisitions() {
        await (0, mongo_1.connectToDatabase)();
        return models_1.JobRequisitionModel.find().sort({ createdAt: -1 }).limit(100).lean();
    }
    async createRequisition(body) {
        await (0, mongo_1.connectToDatabase)();
        const count = await models_1.JobRequisitionModel.countDocuments({});
        const doc = await models_1.JobRequisitionModel.create({ requisitionCode: `REQ-${String(count + 1).padStart(5, '0')}`, ...body });
        return doc.toObject();
    }
    async candidates() {
        await (0, mongo_1.connectToDatabase)();
        return models_1.CandidateModel.find().sort({ createdAt: -1 }).limit(100).lean();
    }
    async createCandidate(body) {
        await (0, mongo_1.connectToDatabase)();
        const count = await models_1.CandidateModel.countDocuments({});
        const doc = await models_1.CandidateModel.create({ candidateCode: `CAN-${String(count + 1).padStart(5, '0')}`, ...body });
        return doc.toObject();
    }
    async trainingRecords() {
        await (0, mongo_1.connectToDatabase)();
        return models_1.TrainingRecordModel.find().sort({ completedAt: -1 }).limit(100).lean();
    }
    async onboardingTasks() {
        await (0, mongo_1.connectToDatabase)();
        return models_1.OnboardingTaskHrModel.find().sort({ dueAt: 1 }).limit(100).lean();
    }
};
exports.HrOperationsController = HrOperationsController;
__decorate([
    (0, common_1.Get)('job-requisitions'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HrOperationsController.prototype, "requisitions", null);
__decorate([
    (0, common_1.Post)('job-requisitions'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], HrOperationsController.prototype, "createRequisition", null);
__decorate([
    (0, common_1.Get)('candidates'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HrOperationsController.prototype, "candidates", null);
__decorate([
    (0, common_1.Post)('candidates'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], HrOperationsController.prototype, "createCandidate", null);
__decorate([
    (0, common_1.Get)('training-records'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HrOperationsController.prototype, "trainingRecords", null);
__decorate([
    (0, common_1.Get)('onboarding-tasks'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HrOperationsController.prototype, "onboardingTasks", null);
exports.HrOperationsController = HrOperationsController = __decorate([
    (0, swagger_1.ApiTags)('hr'),
    (0, common_1.Controller)('hr')
], HrOperationsController);
//# sourceMappingURL=hr-operations.controller.js.map