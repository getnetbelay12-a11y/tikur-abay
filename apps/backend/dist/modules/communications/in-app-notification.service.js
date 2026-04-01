"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InAppNotificationService = void 0;
const common_1 = require("@nestjs/common");
const models_1 = require("../../database/models");
const mongo_1 = require("../../database/mongo");
let InAppNotificationService = class InAppNotificationService {
    async send(payload) {
        await (0, mongo_1.connectToDatabase)();
        const notification = await models_1.NotificationModel.create({
            notificationId: `INAPP-${Date.now()}`,
            userId: payload.recipient,
            shipmentId: payload.shipmentId,
            tripId: payload.tripId,
            title: payload.title || 'Tikur Abay update',
            body: payload.body,
            message: payload.body,
            category: payload.category || 'general',
            type: payload.category || payload.entityType,
            status: 'unread',
            isRead: false,
            actionRoute: payload.actionRoute,
            actionLabel: payload.actionLabel,
            entityType: payload.entityType,
            entityId: payload.entityId,
        });
        return {
            status: 'sent',
            providerMessage: `in-app notification created for ${payload.recipient}`,
            providerMessageId: String(notification._id),
            simulated: false,
            notification: notification.toObject(),
        };
    }
};
exports.InAppNotificationService = InAppNotificationService;
exports.InAppNotificationService = InAppNotificationService = __decorate([
    (0, common_1.Injectable)()
], InAppNotificationService);
//# sourceMappingURL=in-app-notification.service.js.map