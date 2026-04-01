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
exports.ChatController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const chat_service_1 = require("./chat.service");
let ChatController = class ChatController {
    constructor(chatService) {
        this.chatService = chatService;
    }
    rooms(user, shipmentId, roomType) {
        return this.chatService.rooms(user, { shipmentId, roomType });
    }
    resolveRoom(body, user) {
        return this.chatService.resolveRoom(body, user);
    }
    messages(id, user, limit, before, q, messageType) {
        return this.chatService.messages(id, user, { limit, before, q, messageType });
    }
    search(id, user, q) {
        return this.chatService.search(id, user, q);
    }
    sendMessage(id, body, user) {
        return this.chatService.sendMessage(id, body, user);
    }
    markRead(id, user) {
        return this.chatService.markRead(id, user);
    }
};
exports.ChatController = ChatController;
__decorate([
    (0, common_1.Get)('rooms'),
    (0, permissions_decorator_1.Permissions)('chat:view', 'chat:own:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('shipmentId')),
    __param(2, (0, common_1.Query)('roomType')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "rooms", null);
__decorate([
    (0, common_1.Post)('rooms/resolve'),
    (0, permissions_decorator_1.Permissions)('chat:view', 'chat:send', 'chat:own:view'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "resolveRoom", null);
__decorate([
    (0, common_1.Get)('rooms/:id/messages'),
    (0, permissions_decorator_1.Permissions)('chat:view', 'chat:own:view'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('before')),
    __param(4, (0, common_1.Query)('q')),
    __param(5, (0, common_1.Query)('messageType')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String, String, String]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "messages", null);
__decorate([
    (0, common_1.Get)('rooms/:id/search'),
    (0, permissions_decorator_1.Permissions)('chat:view', 'chat:own:view'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "search", null);
__decorate([
    (0, common_1.Post)('rooms/:id/messages'),
    (0, permissions_decorator_1.Permissions)('chat:send', 'chat:own:view'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Post)('rooms/:id/read'),
    (0, permissions_decorator_1.Permissions)('chat:view', 'chat:own:view'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "markRead", null);
exports.ChatController = ChatController = __decorate([
    (0, swagger_1.ApiTags)('chat'),
    (0, common_1.Controller)('chat'),
    __metadata("design:paramtypes", [chat_service_1.ChatService])
], ChatController);
//# sourceMappingURL=chat.controller.js.map