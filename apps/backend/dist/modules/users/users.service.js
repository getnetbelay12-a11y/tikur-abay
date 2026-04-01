"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const mongo_1 = require("../../database/mongo");
const models_1 = require("../../database/models");
let UsersService = class UsersService {
    async list() {
        await (0, mongo_1.connectToDatabase)();
        const users = (await models_1.UserModel.find({}).sort({ updatedAt: -1 }).limit(250).lean());
        return users.map((user) => ({
            id: String(user._id),
            firstName: user.firstName,
            lastName: user.lastName,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            email: user.email,
            phone: user.phone || null,
            role: user.role,
            permissions: user.permissions || [],
            branch: user.branchName || 'Unassigned',
            branchId: user.branchId ? String(user.branchId) : null,
            status: user.status,
            employeeCode: user.employeeCode || null,
            customerCode: user.customerCode || null,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        }));
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)()
], UsersService);
//# sourceMappingURL=users.service.js.map