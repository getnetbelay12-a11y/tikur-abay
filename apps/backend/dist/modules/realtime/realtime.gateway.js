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
var RealtimeGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const mongo_1 = require("../../database/mongo");
const models_1 = require("../../database/models");
const auth_service_1 = require("../auth/auth.service");
let RealtimeGateway = RealtimeGateway_1 = class RealtimeGateway {
    constructor(authService) {
        this.authService = authService;
        this.logger = new common_1.Logger(RealtimeGateway_1.name);
    }
    async handleConnection(client) {
        try {
            const raw = this.extractToken(client);
            if (!raw) {
                client.disconnect();
                return;
            }
            const user = await this.authService.authenticate(raw);
            client.data.user = user;
            client.join(`user:${user.id}`);
            client.join(`role:${user.role}`);
            if (user.branchId) {
                client.join(`branch:${user.branchId}`);
            }
            if (user.customerCode) {
                client.join(`customer:${user.customerCode}`);
            }
        }
        catch (error) {
            this.logger.warn(`Socket auth failed: ${error.message}`);
            client.disconnect();
        }
    }
    handleDisconnect(client) {
        void client;
    }
    joinChatRoom(client, body) {
        if (body?.roomId) {
            client.join(`chat:${body.roomId}`);
        }
        if (body?.roomKey) {
            client.join(`room:${body.roomKey}`);
        }
        if (body?.shipmentId) {
            client.join(`shipment:${body.shipmentId}`);
        }
        if (body?.roleRoute) {
            client.join(`role-route:${body.roleRoute}`);
        }
        return { ok: true };
    }
    leaveChatRoom(client, body) {
        if (body?.roomId) {
            client.leave(`chat:${body.roomId}`);
        }
        if (body?.roomKey) {
            client.leave(`room:${body.roomKey}`);
        }
        if (body?.shipmentId) {
            client.leave(`shipment:${body.shipmentId}`);
        }
        if (body?.roleRoute) {
            client.leave(`role-route:${body.roleRoute}`);
        }
        return { ok: true };
    }
    async joinRooms(client, body) {
        const rooms = Array.isArray(body?.rooms) ? body.rooms.filter((room) => typeof room === 'string' && room.trim()) : [];
        const joined = [];
        const rejected = [];
        for (const room of rooms) {
            if (await this.canJoinRoom(client.data?.user, room)) {
                client.join(room);
                joined.push(room);
            }
            else {
                rejected.push(room);
            }
        }
        return { ok: true, joined, rejected };
    }
    leaveRooms(client, body) {
        const rooms = Array.isArray(body?.rooms) ? body.rooms.filter((room) => typeof room === 'string' && room.trim()) : [];
        rooms.forEach((room) => client.leave(room));
        return { ok: true, left: rooms };
    }
    emitChatMessage(roomId, payload) {
        this.server.to(`chat:${roomId}`).emit('chat:message', payload);
    }
    emitChatRead(roomId, payload) {
        this.server.to(`chat:${roomId}`).emit('chat:read', payload);
    }
    emitRoomUpdate(payload, roomId, shipmentId) {
        if (roomId) {
            this.server.to(`chat:${roomId}`).emit('chat:room-update', payload);
        }
        if (shipmentId) {
            this.server.to(`shipment:${shipmentId}`).emit('chat:shipment-update', payload);
        }
    }
    emitNotification(userId, payload) {
        this.server.to(`user:${userId}`).emit('notifications:new', payload);
    }
    emitMaintenanceNotification(driverId, payload) {
        this.server.to(`user:${driverId}`).emit('maintenance:new', payload);
    }
    emitFleetUpdate(payload, branchId) {
        this.server.emit('fleet:update', payload);
        if (branchId) {
            this.server.to(`branch:${branchId}`).emit('fleet:branch-update', payload);
        }
    }
    emitDashboardKpis(payload) {
        this.server.to('dashboard').emit('dashboard:kpis', payload);
    }
    emitDashboardStatus(payload) {
        this.server.to('dashboard').emit('dashboard:status', payload);
    }
    emitDashboardTrend(payload) {
        this.server.to('dashboard').emit('dashboard:trend', payload);
    }
    emitDashboardPerformance(payload) {
        this.server.to('dashboard').emit('dashboard:performance', payload);
    }
    emitShipmentUpdated(payload, shipmentId, customerCode) {
        this.server.to('shipping').emit('shipment:updated', payload);
        if (shipmentId) {
            this.server.to(`shipment:${shipmentId}`).emit('shipment:updated', payload);
        }
        if (customerCode) {
            this.server.to(`customer:${customerCode}`).emit('shipment:updated', payload);
        }
    }
    emitTrackingEvent(payload, shipmentId, containerNo, customerCode) {
        this.server.to('tracking').emit('tracking:event', payload);
        if (shipmentId) {
            this.server.to(`shipment:${shipmentId}`).emit('tracking:event', payload);
        }
        if (containerNo) {
            this.server.to(`container:${containerNo}`).emit('tracking:event', payload);
        }
        if (customerCode) {
            this.server.to(`customer:${customerCode}`).emit('tracking:event', payload);
        }
    }
    emitFinanceUpdated(payload, shipmentId, customerCode) {
        this.server.to('finance').emit('finance:updated', payload);
        if (shipmentId) {
            this.server.to(`shipment:${shipmentId}`).emit('finance:updated', payload);
        }
        if (customerCode) {
            this.server.to(`customer:${customerCode}`).emit('finance:updated', payload);
        }
    }
    emitDispatchUpdate(payload, shipmentId, customerCode) {
        this.server.to('dispatch').emit('shipment:updated', payload);
        if (shipmentId) {
            this.server.to(`shipment:${shipmentId}`).emit('shipment:updated', payload);
        }
        if (customerCode) {
            this.server.to(`customer:${customerCode}`).emit('shipment:updated', payload);
        }
    }
    emitAlert(payload, shipmentId, containerNo, customerCode) {
        this.server.to('dashboard').emit('alert:new', payload);
        this.server.to('shipping').emit('alert:new', payload);
        if (shipmentId) {
            this.server.to(`shipment:${shipmentId}`).emit('alert:new', payload);
        }
        if (containerNo) {
            this.server.to(`container:${containerNo}`).emit('alert:new', payload);
        }
        if (customerCode) {
            this.server.to(`customer:${customerCode}`).emit('alert:new', payload);
        }
    }
    extractToken(client) {
        const authToken = typeof client.handshake.auth?.token === 'string' ? client.handshake.auth.token : undefined;
        if (authToken) {
            return authToken.startsWith('Bearer ') ? authToken.slice(7) : authToken;
        }
        const header = client.handshake.headers.authorization;
        if (typeof header === 'string' && header.startsWith('Bearer ')) {
            return header.slice(7);
        }
        const queryToken = typeof client.handshake.query?.token === 'string' ? client.handshake.query.token : undefined;
        return queryToken?.startsWith('Bearer ') ? queryToken.slice(7) : queryToken;
    }
    async canJoinRoom(user, room) {
        if (!user) {
            return false;
        }
        if (room === 'dashboard') {
            return user.permissions.includes('dashboards:executive:view');
        }
        if (room === 'tracking') {
            return this.hasAnyPermission(user, ['tracking:management:view', 'dashboards:executive:view', 'corridor:dispatch:view', 'corridor:djibouti:view', 'corridor:yard:view']);
        }
        if (room === 'shipping') {
            return this.hasAnyPermission(user, ['dashboards:executive:view', 'corridor:supplier:view', 'corridor:djibouti:view', 'corridor:dispatch:view', 'corridor:yard:view']);
        }
        if (room === 'finance') {
            return this.hasAnyPermission(user, ['dashboards:executive:view', 'payments:view', 'corridor:finance:view']);
        }
        if (room === 'dispatch') {
            return this.hasAnyPermission(user, ['dashboards:executive:view', 'corridor:dispatch:view']);
        }
        if (room.startsWith('shipment:')) {
            return this.canAccessShipmentRoom(user, room.slice('shipment:'.length));
        }
        if (room.startsWith('container:')) {
            return this.canAccessContainerRoom(user, room.slice('container:'.length));
        }
        return false;
    }
    hasAnyPermission(user, permissions) {
        return permissions.some((permission) => user.permissions.includes(permission));
    }
    isCustomerScopedUser(user) {
        return ['customer', 'customer_user', 'customer_agent'].includes(user.role);
    }
    async canAccessShipmentRoom(user, shipmentId) {
        if (!shipmentId) {
            return false;
        }
        if (!this.isCustomerScopedUser(user)) {
            return this.hasAnyPermission(user, [
                'dashboards:executive:view',
                'tracking:management:view',
                'corridor:supplier:view',
                'corridor:djibouti:view',
                'corridor:dispatch:view',
                'corridor:finance:view',
                'corridor:yard:view',
            ]);
        }
        if (!user.customerCode) {
            return false;
        }
        await (0, mongo_1.connectToDatabase)();
        const shipment = await models_1.CorridorShipmentModel.findOne({ shipmentId }).select('customerId customerCode').lean();
        if (!shipment) {
            return false;
        }
        return [shipment.customerId, shipment.customerCode].filter(Boolean).some((value) => String(value) === String(user.customerCode));
    }
    async canAccessContainerRoom(user, containerNo) {
        if (!containerNo) {
            return false;
        }
        if (!this.isCustomerScopedUser(user)) {
            return this.hasAnyPermission(user, [
                'dashboards:executive:view',
                'tracking:management:view',
                'corridor:supplier:view',
                'corridor:djibouti:view',
                'corridor:dispatch:view',
                'corridor:finance:view',
                'corridor:yard:view',
            ]);
        }
        if (!user.customerCode) {
            return false;
        }
        await (0, mongo_1.connectToDatabase)();
        const container = await models_1.CorridorContainerModel.findOne({
            $or: [{ containerNumber: containerNo }, { containerId: containerNo }],
        }).select('shipmentId').lean();
        if (!container?.shipmentId) {
            return false;
        }
        const shipment = await models_1.CorridorShipmentModel.findOne({ shipmentId: container.shipmentId }).select('customerId customerCode').lean();
        if (!shipment) {
            return false;
        }
        return [shipment.customerId, shipment.customerCode].filter(Boolean).some((value) => String(value) === String(user.customerCode));
    }
};
exports.RealtimeGateway = RealtimeGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", Function)
], RealtimeGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('chat:join'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function, Object]),
    __metadata("design:returntype", void 0)
], RealtimeGateway.prototype, "joinChatRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('chat:leave'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function, Object]),
    __metadata("design:returntype", void 0)
], RealtimeGateway.prototype, "leaveChatRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('rooms:join'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function, Object]),
    __metadata("design:returntype", Promise)
], RealtimeGateway.prototype, "joinRooms", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('rooms:leave'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function, Object]),
    __metadata("design:returntype", void 0)
], RealtimeGateway.prototype, "leaveRooms", null);
exports.RealtimeGateway = RealtimeGateway = RealtimeGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: (process.env.CORS_ORIGINS || 'http://localhost:6010,http://localhost:6011,http://localhost:6080')
                .split(',')
                .map((item) => item.trim()),
            credentials: true,
        },
    }),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], RealtimeGateway);
//# sourceMappingURL=realtime.gateway.js.map