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
exports.AppNotificationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const notifications_service_1 = require("./notifications.service");
let AppNotificationsController = class AppNotificationsController {
    constructor(notificationsService) {
        this.notificationsService = notificationsService;
    }
    list(user) {
        return this.notificationsService.listApp(user);
    }
    read(id) {
        return this.notificationsService.readApp(id);
    }
    readAll(user) {
        return this.notificationsService.readAllApp(user);
    }
    unreadCount(user) {
        return this.notificationsService.unreadCount(user);
    }
};
exports.AppNotificationsController = AppNotificationsController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('notifications:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AppNotificationsController.prototype, "list", null);
__decorate([
    (0, common_1.Patch)(':id/read'),
    (0, permissions_decorator_1.Permissions)('notifications:update'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AppNotificationsController.prototype, "read", null);
__decorate([
    (0, common_1.Patch)('read-all'),
    (0, permissions_decorator_1.Permissions)('notifications:update'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AppNotificationsController.prototype, "readAll", null);
__decorate([
    (0, common_1.Get)('unread-count'),
    (0, permissions_decorator_1.Permissions)('notifications:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AppNotificationsController.prototype, "unreadCount", null);
exports.AppNotificationsController = AppNotificationsController = __decorate([
    (0, swagger_1.ApiTags)('notifications'),
    (0, common_1.Controller)('notifications'),
    __metadata("design:paramtypes", [notifications_service_1.NotificationsService])
], AppNotificationsController);
//# sourceMappingURL=app-notifications.controller.js.map