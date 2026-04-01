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
exports.IncidentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const mongo_1 = require("../../database/mongo");
const models_1 = require("../../database/models");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const permissions_decorator_1 = require("../auth/permissions.decorator");
let IncidentsController = class IncidentsController {
    async open(user) {
        await (0, mongo_1.connectToDatabase)();
        const query = {
            status: { $in: ['submitted', 'under_review'] },
        };
        if (!user.permissions.includes('*') && !['executive', 'super_admin', 'operations_manager', 'dispatcher'].includes(user.role)) {
            query.branchId = user.branchId;
        }
        return models_1.DriverReportModel.find(query)
            .sort({ createdAt: -1 })
            .limit(25)
            .select('reportCode type vehicleCode driverName urgency status createdAt')
            .lean();
    }
};
exports.IncidentsController = IncidentsController;
__decorate([
    (0, common_1.Get)('open'),
    (0, permissions_decorator_1.Permissions)('driver-reports:view', 'dashboards:executive:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], IncidentsController.prototype, "open", null);
exports.IncidentsController = IncidentsController = __decorate([
    (0, swagger_1.ApiTags)('incidents'),
    (0, common_1.Controller)('incidents')
], IncidentsController);
//# sourceMappingURL=incidents.controller.js.map