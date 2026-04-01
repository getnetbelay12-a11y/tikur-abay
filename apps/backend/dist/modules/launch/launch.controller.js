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
exports.LaunchController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const launch_service_1 = require("./launch.service");
let LaunchController = class LaunchController {
    constructor(launchService) {
        this.launchService = launchService;
    }
    list() {
        return this.launchService.list();
    }
    update(code, user, body) {
        return this.launchService.update(code, user, body);
    }
};
exports.LaunchController = LaunchController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('launch:view'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LaunchController.prototype, "list", null);
__decorate([
    (0, common_1.Patch)(':code'),
    (0, permissions_decorator_1.Permissions)('launch:update'),
    __param(0, (0, common_1.Param)('code')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], LaunchController.prototype, "update", null);
exports.LaunchController = LaunchController = __decorate([
    (0, swagger_1.ApiTags)('launch'),
    (0, common_1.Controller)('launch-center'),
    __metadata("design:paramtypes", [launch_service_1.LaunchService])
], LaunchController);
//# sourceMappingURL=launch.controller.js.map