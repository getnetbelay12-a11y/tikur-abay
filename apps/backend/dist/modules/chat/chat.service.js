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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const mongo_1 = require("../../database/mongo");
const models_1 = require("../../database/models");
const communication_orchestrator_service_1 = require("../communications/communication-orchestrator.service");
const realtime_gateway_1 = require("../realtime/realtime.gateway");
let ChatService = class ChatService {
    constructor(realtimeGateway, communicationOrchestratorService) {
        this.realtimeGateway = realtimeGateway;
        this.communicationOrchestratorService = communicationOrchestratorService;
    }
    asPlain(value) {
        if (value && typeof value.toObject === 'function') {
            return value.toObject();
        }
        return value;
    }
    async rooms(user, query) {
        await (0, mongo_1.connectToDatabase)();
        await this.ensureDefaultRoomsForUser(user);
        if (query?.shipmentId) {
            await this.resolveRoom({ shipmentId: query.shipmentId, roomType: 'shipment' }, user);
            await this.resolveRoom({ shipmentId: query.shipmentId, roomType: 'clearance' }, user);
        }
        const rooms = await models_1.ChatRoomModel.find({})
            .sort({ lastMessageAt: -1, updatedAt: -1, createdAt: -1 })
            .lean();
        return rooms
            .filter((room) => this.canAccessRoom(room, user))
            .filter((room) => !query?.shipmentId || String(room.shipmentId || '') === query.shipmentId)
            .filter((room) => !query?.roomType || String(room.roomType || '') === query.roomType)
            .map((room) => this.serializeRoom(room, user));
    }
    async resolveRoom(body, user) {
        await (0, mongo_1.connectToDatabase)();
        const roomType = String(body.roomType || (body.shipmentId ? 'shipment' : 'role')).trim().toLowerCase();
        const shipmentId = String(body.shipmentId || '').trim();
        const roleRoute = String(body.roleRoute || '').trim().toLowerCase();
        const participantRoles = normalizeUnique([...(body.participantRoles || []), user.role]);
        const participantIds = normalizeUnique([...(body.participantIds || []), user.id]);
        const roomKey = shipmentId && roomType === 'clearance'
            ? `shipment:${shipmentId}:clearance`
            : shipmentId
                ? `shipment:${shipmentId}`
                : roleRoute
                    ? `role:${roleRoute}`
                    : `global:${roomType}`;
        const defaults = buildRoomDefaults({
            shipmentId,
            roomType,
            roleRoute,
            title: body.title,
            participantRoles,
            participantIds,
            user,
        });
        const room = await models_1.ChatRoomModel.findOneAndUpdate({ roomKey }, {
            $setOnInsert: {
                roomKey,
                roomType: defaults.roomType,
                shipmentId: defaults.shipmentId,
                title: defaults.title,
                description: defaults.description,
                participantRoles: defaults.participantRoles,
                participantIds: defaults.participantIds,
                visibilityRoles: defaults.visibilityRoles,
                roleRoute: defaults.roleRoute,
                customerSafe: defaults.customerSafe,
                driverVisible: defaults.driverVisible,
                supportLinked: defaults.supportLinked,
                status: 'active',
                unreadCount: 0,
                lastMessageAt: new Date(),
            },
        }, { upsert: true, new: true }).lean();
        await this.ensureShipmentSystemMessages(room);
        return this.serializeRoom(room, user);
    }
    async messages(roomId, user, query) {
        await (0, mongo_1.connectToDatabase)();
        const room = await models_1.ChatRoomModel.findById(roomId).lean();
        if (!room || !this.canAccessRoom(room, user))
            return { room: null, items: [], nextCursor: null };
        await this.ensureShipmentSystemMessages(room);
        const limit = Math.min(Math.max(Number(query?.limit || 40), 1), 100);
        const findQuery = { roomId: room._id };
        if (query?.before) {
            findQuery.createdAt = { $lt: new Date(query.before) };
        }
        if (query?.messageType) {
            findQuery.messageType = query.messageType;
        }
        if (query?.q) {
            findQuery.$or = [
                { text: { $regex: escapeRegex(query.q), $options: 'i' } },
                { content: { $regex: escapeRegex(query.q), $options: 'i' } },
                { senderName: { $regex: escapeRegex(query.q), $options: 'i' } },
            ];
        }
        const rows = await models_1.ChatMessageModel.find(findQuery)
            .sort({ createdAt: -1 })
            .limit(limit + 1)
            .lean();
        const hasNext = rows.length > limit;
        const sliced = rows.slice(0, limit).reverse();
        return {
            room: this.serializeRoom(room, user),
            items: sliced
                .filter((message) => this.canViewMessage(message, room, user))
                .map((message) => this.serializeMessage(message, room, user)),
            nextCursor: hasNext ? sliced[0]?.createdAt || null : null,
        };
    }
    async search(roomId, user, q) {
        return this.messages(roomId, user, { q, limit: '50' });
    }
    async markRead(roomId, user) {
        await (0, mongo_1.connectToDatabase)();
        const room = await models_1.ChatRoomModel.findById(roomId);
        if (!room || !this.canAccessRoom(this.asPlain(room), user))
            return { ok: false };
        const unreadMessages = await models_1.ChatMessageModel.find({
            roomId: room._id,
            'readBy.userId': { $ne: user.id },
        }).lean();
        for (const message of unreadMessages) {
            await models_1.ChatMessageReadModel.updateOne({ messageId: message._id, userId: user.id }, {
                $setOnInsert: {
                    roomId: room._id,
                    messageId: message._id,
                    shipmentId: room.shipmentId || message.shipmentId || '',
                    userId: user.id,
                    role: user.role,
                    readAt: new Date(),
                },
            }, { upsert: true });
            await models_1.ChatMessageModel.updateOne({ _id: message._id, 'readBy.userId': { $ne: user.id } }, {
                $addToSet: {
                    seenBy: user.id,
                    readBy: { userId: user.id, role: user.role, readAt: new Date() },
                },
            });
        }
        room.unreadCount = 0;
        await room.save();
        this.realtimeGateway.emitChatRead?.(roomId, { roomId, userId: user.id, role: user.role });
        return { ok: true, readCount: unreadMessages.length };
    }
    async sendMessage(roomId, body, user) {
        await (0, mongo_1.connectToDatabase)();
        const room = await models_1.ChatRoomModel.findById(roomId);
        if (!room || !this.canAccessRoom(this.asPlain(room), user)) {
            return null;
        }
        const content = String(body.content || body.text || '').trim();
        const attachments = (body.attachments || []).map((item) => ({
            fileName: String(item.fileName || '').trim(),
            fileUrl: String(item.fileUrl || '').trim(),
            mimeType: String(item.mimeType || '').trim(),
            size: Number(item.size || 0),
            documentId: String(item.documentId || '').trim(),
            shipmentId: String(item.shipmentId || room.shipmentId || '').trim(),
        }));
        if (!content && attachments.length === 0) {
            return null;
        }
        const now = new Date();
        const messagePayload = {
            roomId: room._id,
            shipmentId: room.shipmentId || '',
            senderUserId: user.id,
            senderName: buildSenderName(user),
            senderRole: user.role,
            senderEmail: user.email,
            text: content,
            content,
            messageType: body.messageType || (attachments.length ? 'file' : 'text'),
            attachments,
            replyToMessageId: body.replyToMessageId || '',
            pinned: Boolean(body.pinned),
            visibilityRoles: room.visibilityRoles || [],
            visibilityScope: room.customerSafe ? 'customer_safe' : room.driverVisible ? 'driver_ops' : 'internal',
            seenBy: [user.id],
            readBy: [{ userId: user.id, role: user.role, readAt: now }],
            deliveredTo: [{ userId: user.id, role: user.role, deliveredAt: now }],
        };
        const message = await models_1.ChatMessageModel.create(messagePayload);
        room.lastMessageAt = now;
        room.updatedAt = now;
        room.unreadCount = Number(room.unreadCount || 0) + 1;
        if (body.pinned) {
            room.pinnedMessageId = String(message._id);
        }
        await room.save();
        const payload = this.serializeMessage({ ...messagePayload, ...this.asPlain(message) }, this.asPlain(room), user);
        this.realtimeGateway.emitChatMessage?.(roomId, payload);
        this.realtimeGateway.emitRoomUpdate?.(this.serializeRoom(this.asPlain(room), user), roomId, room.shipmentId || undefined);
        await this.notifyOfflineParticipants(this.asPlain(room), payload, user);
        return payload;
    }
    async injectSystemMessage(input) {
        await (0, mongo_1.connectToDatabase)();
        const room = input.roomId
            ? await models_1.ChatRoomModel.findById(input.roomId)
            : input.shipmentId
                ? await models_1.ChatRoomModel.findOne({ roomKey: `shipment:${input.shipmentId}` })
                : null;
        if (!room)
            return null;
        const existing = await models_1.ChatMessageModel.findOne({
            roomId: room._id,
            systemEventKey: input.systemEventKey,
        }).lean();
        if (existing)
            return existing;
        const message = await models_1.ChatMessageModel.create({
            roomId: room._id,
            shipmentId: room.shipmentId || input.shipmentId || '',
            senderName: 'System',
            senderRole: 'system',
            text: input.content,
            content: input.content,
            messageType: 'system',
            systemEventKey: input.systemEventKey,
            visibilityRoles: input.visibilityRoles || room.visibilityRoles || [],
            visibilityScope: room.customerSafe ? 'customer_safe' : room.driverVisible ? 'driver_ops' : 'internal',
            seenBy: [],
            readBy: [],
            deliveredTo: [],
        });
        room.lastMessageAt = new Date();
        await room.save();
        this.realtimeGateway.emitChatMessage?.(String(room._id), this.serializeMessage(this.asPlain(message), this.asPlain(room), systemUser()));
        return message;
    }
    async ensureDefaultRoomsForUser(user) {
        await this.resolveRoom({ roomType: 'global', title: 'Global operations channel', participantRoles: [user.role] }, user);
        await this.resolveRoom({ roomType: 'role', roleRoute: user.role, title: `${user.role.replace(/_/g, ' ')} room`, participantRoles: [user.role] }, user);
    }
    async ensureShipmentSystemMessages(room) {
        if (!room?.shipmentId)
            return;
        const shipment = await models_1.CorridorShipmentModel.findOne({
            $or: [{ shipmentId: room.shipmentId }, { shipmentRef: room.shipmentId }, { bookingNumber: room.shipmentId }],
        }).lean();
        if (!shipment)
            return;
        const invoice = await models_1.InvoiceModel.findOne({ shipmentCode: shipment.shipmentId || shipment.shipmentRef || shipment.bookingNumber })
            .sort({ createdAt: -1 })
            .lean();
        const financeClearance = await models_1.FinancialClearanceModel.findOne({ shipmentId: shipment.shipmentId }).lean();
        const expenseClaim = await models_1.DriverExpenseClaimModel.findOne({ shipmentId: shipment.shipmentId }).sort({ createdAt: -1 }).lean();
        if (invoice?.invoiceCode) {
            await this.injectSystemMessage({
                roomId: String(room._id),
                shipmentId: shipment.shipmentId,
                content: `Invoice generated: ${invoice.invoiceCode}`,
                systemEventKey: `invoice:${invoice.invoiceCode}`,
            });
        }
        if (shipment.documentsReadyForClearance) {
            await this.injectSystemMessage({
                roomId: String(room._id),
                shipmentId: shipment.shipmentId,
                content: 'Documents ready for clearance',
                systemEventKey: `documents_ready:${shipment.shipmentId}`,
            });
        }
        if (financeClearance?.approvalStatus === 'approved' || shipment.financeClearanceApproved) {
            await this.injectSystemMessage({
                roomId: String(room._id),
                shipmentId: shipment.shipmentId,
                content: 'Finance verified payment',
                systemEventKey: `finance_verified:${shipment.shipmentId}`,
            });
        }
        if (String(shipment.workflowState || '').includes('clearance_in_progress')) {
            await this.injectSystemMessage({
                roomId: String(room._id),
                shipmentId: shipment.shipmentId,
                content: 'Clearance started',
                systemEventKey: `clearance_started:${shipment.shipmentId}`,
            });
        }
        if (String(shipment.workflowState || '') === 'release_ready') {
            await this.injectSystemMessage({
                roomId: String(room._id),
                shipmentId: shipment.shipmentId,
                content: 'Cargo released',
                systemEventKey: `cargo_released:${shipment.shipmentId}`,
            });
        }
        if (expenseClaim?.claimNumber) {
            await this.injectSystemMessage({
                roomId: String(room._id),
                shipmentId: shipment.shipmentId,
                content: 'Driver uploaded expense',
                systemEventKey: `driver_expense:${expenseClaim.claimNumber}`,
            });
        }
    }
    async notifyOfflineParticipants(room, payload, sender) {
        const participantIds = normalizeUnique(room.participantIds || []).filter((userId) => userId && userId !== sender.id);
        for (const participantId of participantIds) {
            await models_1.NotificationModel.create({
                notificationId: `chat-${room._id}-${Date.now()}-${participantId}`,
                userId: participantId,
                shipmentId: room.shipmentId || '',
                title: room.title || 'New chat message',
                body: payload.content || payload.text || 'Chat update',
                message: payload.content || payload.text || 'Chat update',
                category: 'chat_unread',
                type: 'chat_unread',
                status: 'unread',
                isRead: false,
                entityType: 'chat_room',
                entityId: String(room._id),
                actionRoute: room.shipmentId ? `/shipments/${room.shipmentId}` : '/chat',
            });
            this.realtimeGateway.emitNotification?.(participantId, {
                title: room.title || 'New chat message',
                body: payload.content || payload.text || 'Chat update',
                roomId: String(room._id),
            });
        }
        if (participantIds.length || room.shipmentId) {
            await this.communicationOrchestratorService.send({
                entityType: 'shipment',
                entityId: room.shipmentId || String(room._id),
                channels: ['in_app'],
                templateKey: 'custom_message',
                sendMode: 'automated',
                messageBody: payload.content || payload.text || 'Chat update',
            }, { id: sender.id || sender.email || 'system' }).catch(() => null);
        }
    }
    serializeRoom(room, user) {
        return {
            id: String(room._id),
            roomKey: room.roomKey || '',
            roomType: room.roomType || 'shipment',
            shipmentId: room.shipmentId || null,
            title: room.title || 'Chat room',
            description: room.description || '',
            roleRoute: room.roleRoute || null,
            participantRoles: room.participantRoles || [],
            unreadCount: room.unreadCount || 0,
            status: room.status || 'active',
            customerSafe: Boolean(room.customerSafe),
            driverVisible: Boolean(room.driverVisible),
            ownRoom: (room.participantIds || []).includes(user.id),
            lastMessageAt: room.lastMessageAt || room.updatedAt || room.createdAt,
        };
    }
    serializeMessage(message, room, user) {
        return {
            id: String(message._id),
            roomId: String(message.roomId || room._id),
            shipmentId: message.shipmentId || room.shipmentId || null,
            senderName: message.senderName || 'System',
            senderUserId: String(message.senderUserId || ''),
            senderRole: message.senderRole || 'system',
            messageType: message.messageType || 'text',
            text: message.text || message.content || '',
            content: message.content || message.text || '',
            attachments: message.attachments || [],
            replyToMessageId: message.replyToMessageId || null,
            pinned: Boolean(message.pinned),
            createdAt: message.createdAt,
            ownMessage: String(message.senderUserId || '') === user.id,
            readBy: message.readBy || [],
            deliveredTo: message.deliveredTo || [],
        };
    }
    canAccessRoom(room, user) {
        if (!room)
            return false;
        if (user.permissions.includes('*') || ['super_admin', 'executive', 'admin'].includes(user.role))
            return true;
        if ((room.participantIds || []).includes(user.id))
            return true;
        if ((room.participantRoles || []).includes(user.role))
            return true;
        if ((room.visibilityRoles || []).includes(user.role))
            return true;
        if (!(room.participantIds || []).length &&
            !(room.participantRoles || []).length &&
            !(room.visibilityRoles || []).length &&
            !room.roomType) {
            return true;
        }
        if (user.role === 'customer_user')
            return Boolean(room.customerSafe);
        if (user.role === 'external_driver' || user.role === 'internal_driver')
            return Boolean(room.driverVisible);
        return room.roomType === 'global';
    }
    canViewMessage(message, room, user) {
        const roles = message.visibilityRoles || room.visibilityRoles || [];
        if (!roles.length)
            return this.canAccessRoom(room, user);
        if (user.permissions.includes('*') || ['super_admin', 'executive', 'admin'].includes(user.role))
            return true;
        return roles.includes(user.role);
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [realtime_gateway_1.RealtimeGateway,
        communication_orchestrator_service_1.CommunicationOrchestratorService])
], ChatService);
function buildRoomDefaults(input) {
    if (input.shipmentId && input.roomType === 'clearance') {
        return {
            roomType: 'clearance',
            shipmentId: input.shipmentId,
            title: input.title || `Shipment ${input.shipmentId} clearance room`,
            description: 'Clearance and Djibouti coordination room',
            participantRoles: normalizeUnique([...input.participantRoles, 'clearance_agent', 'djibouti_release_agent', 'operations_manager', 'super_admin']),
            participantIds: input.participantIds,
            visibilityRoles: ['clearance_agent', 'djibouti_release_agent', 'operations_manager', 'super_admin', 'executive'],
            roleRoute: 'clearance_coordination',
            customerSafe: false,
            driverVisible: false,
            supportLinked: false,
        };
    }
    if (input.shipmentId) {
        return {
            roomType: 'shipment',
            shipmentId: input.shipmentId,
            title: input.title || `Shipment ${input.shipmentId} chat`,
            description: 'Primary shipment-based coordination room',
            participantRoles: normalizeUnique([
                ...input.participantRoles,
                'operations_manager',
                'finance_officer',
                'clearance_agent',
                'djibouti_release_agent',
                'customer_user',
                'internal_driver',
                'external_driver',
            ]),
            participantIds: input.participantIds,
            visibilityRoles: ['operations_manager', 'finance_officer', 'clearance_agent', 'djibouti_release_agent', 'customer_user', 'internal_driver', 'external_driver', 'super_admin', 'executive'],
            roleRoute: 'shipment',
            customerSafe: true,
            driverVisible: true,
            supportLinked: true,
        };
    }
    if (input.roleRoute) {
        return {
            roomType: 'role',
            shipmentId: '',
            title: input.title || `${input.roleRoute.replace(/_/g, ' ')} room`,
            description: 'Role-based operational room',
            participantRoles: input.participantRoles,
            participantIds: input.participantIds,
            visibilityRoles: input.participantRoles,
            roleRoute: input.roleRoute,
            customerSafe: false,
            driverVisible: input.roleRoute.includes('driver'),
            supportLinked: false,
        };
    }
    return {
        roomType: input.roomType || 'global',
        shipmentId: '',
        title: input.title || 'Global operations chat',
        description: 'Global coordination room',
        participantRoles: input.participantRoles,
        participantIds: input.participantIds,
        visibilityRoles: input.participantRoles,
        roleRoute: 'global',
        customerSafe: false,
        driverVisible: false,
        supportLinked: false,
    };
}
function buildSenderName(user) {
    return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || user.role;
}
function normalizeUnique(values) {
    return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
}
function escapeRegex(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function systemUser() {
    return {
        id: 'system',
        email: 'system@tikurabay.com',
        role: 'system',
        permissions: ['*'],
        firstName: 'System',
        lastName: 'Bot',
    };
}
//# sourceMappingURL=chat.service.js.map