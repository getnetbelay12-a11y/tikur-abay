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
exports.CustomersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const mongo_1 = require("../../database/mongo");
const models_1 = require("../../database/models");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const permissions_decorator_1 = require("../auth/permissions.decorator");
let CustomersController = class CustomersController {
    async list(user) {
        await (0, mongo_1.connectToDatabase)();
        if (user.permissions.includes('*') || ['executive', 'marketing_officer'].includes(user.role)) {
            return models_1.CustomerModel.find().sort({ createdAt: -1 }).limit(100).lean();
        }
        return models_1.CustomerModel.find({ branchId: user.branchId }).sort({ createdAt: -1 }).limit(100).lean();
    }
    async top(user) {
        await (0, mongo_1.connectToDatabase)();
        const invoiceMatch = !user.permissions.includes('*') && !['executive', 'super_admin', 'marketing_officer'].includes(user.role)
            ? [{ $match: { branchId: user.branchId } }]
            : [];
        return models_1.InvoiceModel.aggregate([
            ...invoiceMatch,
            { $match: { customerId: { $ne: null } } },
            {
                $group: {
                    _id: '$customerId',
                    tripVolume: { $sum: 1 },
                    invoiceTotal: { $sum: '$totalAmount' },
                    outstandingAmount: { $sum: '$outstandingAmount' },
                },
            },
            { $sort: { invoiceTotal: -1 } },
            { $limit: 12 },
            {
                $lookup: {
                    from: 'customers',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'customer',
                },
            },
            { $unwind: '$customer' },
            {
                $project: {
                    companyName: '$customer.companyName',
                    customerCode: '$customer.customerCode',
                    status: '$customer.status',
                    tripVolume: 1,
                    invoiceTotal: 1,
                    outstandingAmount: 1,
                },
            },
        ]);
    }
    async getOne(id, user) {
        await (0, mongo_1.connectToDatabase)();
        const customer = await models_1.CustomerModel.findOne({ $or: [{ _id: id }, { customerCode: id }] }).lean();
        if (!customer)
            return null;
        if (user.permissions.includes('*') || ['executive', 'marketing_officer'].includes(user.role)) {
            return customer;
        }
        return String(customer.branchId) === user.branchId ? customer : null;
    }
};
exports.CustomersController = CustomersController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('customers:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('top'),
    (0, permissions_decorator_1.Permissions)('customers:view', 'dashboards:executive:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "top", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_decorator_1.Permissions)('customers:view'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "getOne", null);
exports.CustomersController = CustomersController = __decorate([
    (0, swagger_1.ApiTags)('customers'),
    (0, common_1.Controller)('customers')
], CustomersController);
//# sourceMappingURL=customers.controller.js.map