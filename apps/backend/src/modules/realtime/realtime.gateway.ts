// @ts-nocheck
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import type { Server, Socket } from 'socket.io';
import { connectToDatabase } from '../../database/mongo';
import { CorridorContainerModel, CorridorShipmentModel } from '../../database/models';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuthService } from '../auth/auth.service';

@WebSocketGateway({
  cors: {
    origin: (process.env.CORS_ORIGINS || 'http://localhost:6010,http://localhost:6011,http://localhost:6080')
      .split(',')
      .map((item) => item.trim()),
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(private readonly authService: AuthService) {}

  async handleConnection(client: Socket) {
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
    } catch (error) {
      this.logger.warn(`Socket auth failed: ${(error as Error).message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data?.user?.id) {
      this.logger.debug(`Socket disconnected for user ${client.data.user.id}`);
    }
  }

  @SubscribeMessage('chat:join')
  joinChatRoom(@ConnectedSocket() client: Socket, @MessageBody() body: { roomId?: string; roomKey?: string; shipmentId?: string; roleRoute?: string }) {
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

  @SubscribeMessage('chat:leave')
  leaveChatRoom(@ConnectedSocket() client: Socket, @MessageBody() body: { roomId?: string; roomKey?: string; shipmentId?: string; roleRoute?: string }) {
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

  @SubscribeMessage('rooms:join')
  async joinRooms(@ConnectedSocket() client: Socket, @MessageBody() body: { rooms?: string[] }) {
    const rooms = Array.isArray(body?.rooms) ? body.rooms.filter((room) => typeof room === 'string' && room.trim()) : [];
    const joined: string[] = [];
    const rejected: string[] = [];

    for (const room of rooms) {
      if (await this.canJoinRoom(client.data?.user, room)) {
        client.join(room);
        joined.push(room);
      } else {
        rejected.push(room);
      }
    }

    return { ok: true, joined, rejected };
  }

  @SubscribeMessage('rooms:leave')
  leaveRooms(@ConnectedSocket() client: Socket, @MessageBody() body: { rooms?: string[] }) {
    const rooms = Array.isArray(body?.rooms) ? body.rooms.filter((room) => typeof room === 'string' && room.trim()) : [];
    rooms.forEach((room) => client.leave(room));
    return { ok: true, left: rooms };
  }

  emitChatMessage(roomId: string, payload: unknown) {
    this.server.to(`chat:${roomId}`).emit('chat:message', payload);
  }

  emitChatRead(roomId: string, payload: unknown) {
    this.server.to(`chat:${roomId}`).emit('chat:read', payload);
  }

  emitRoomUpdate(payload: unknown, roomId?: string, shipmentId?: string) {
    if (roomId) {
      this.server.to(`chat:${roomId}`).emit('chat:room-update', payload);
    }
    if (shipmentId) {
      this.server.to(`shipment:${shipmentId}`).emit('chat:shipment-update', payload);
    }
  }

  emitNotification(userId: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit('notifications:new', payload);
  }

  emitMaintenanceNotification(driverId: string, payload: unknown) {
    this.server.to(`user:${driverId}`).emit('maintenance:new', payload);
  }

  emitFleetUpdate(payload: unknown, branchId?: string) {
    this.server.emit('fleet:update', payload);
    if (branchId) {
      this.server.to(`branch:${branchId}`).emit('fleet:branch-update', payload);
    }
  }

  emitDashboardKpis(payload: unknown) {
    this.server.to('dashboard').emit('dashboard:kpis', payload);
  }

  emitDashboardStatus(payload: unknown) {
    this.server.to('dashboard').emit('dashboard:status', payload);
  }

  emitDashboardTrend(payload: unknown) {
    this.server.to('dashboard').emit('dashboard:trend', payload);
  }

  emitDashboardPerformance(payload: unknown) {
    this.server.to('dashboard').emit('dashboard:performance', payload);
  }

  emitShipmentUpdated(payload: unknown, shipmentId?: string, customerCode?: string) {
    this.server.to('shipping').emit('shipment:updated', payload);
    if (shipmentId) {
      this.server.to(`shipment:${shipmentId}`).emit('shipment:updated', payload);
    }
    if (customerCode) {
      this.server.to(`customer:${customerCode}`).emit('shipment:updated', payload);
    }
  }

  emitTrackingEvent(payload: unknown, shipmentId?: string, containerNo?: string, customerCode?: string) {
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

  emitFinanceUpdated(payload: unknown, shipmentId?: string, customerCode?: string) {
    this.server.to('finance').emit('finance:updated', payload);
    if (shipmentId) {
      this.server.to(`shipment:${shipmentId}`).emit('finance:updated', payload);
    }
    if (customerCode) {
      this.server.to(`customer:${customerCode}`).emit('finance:updated', payload);
    }
  }

  emitDispatchUpdate(payload: unknown, shipmentId?: string, customerCode?: string) {
    this.server.to('dispatch').emit('shipment:updated', payload);
    if (shipmentId) {
      this.server.to(`shipment:${shipmentId}`).emit('shipment:updated', payload);
    }
    if (customerCode) {
      this.server.to(`customer:${customerCode}`).emit('shipment:updated', payload);
    }
  }

  emitAlert(payload: unknown, shipmentId?: string, containerNo?: string, customerCode?: string) {
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

  private extractToken(client: Socket) {
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

  private async canJoinRoom(user: AuthenticatedUser | undefined, room: string) {
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

  private hasAnyPermission(user: AuthenticatedUser, permissions: string[]) {
    return permissions.some((permission) => user.permissions.includes(permission));
  }

  private isCustomerScopedUser(user: AuthenticatedUser) {
    return ['customer', 'customer_user', 'customer_agent'].includes(user.role);
  }

  private async canAccessShipmentRoom(user: AuthenticatedUser, shipmentId: string) {
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

    await connectToDatabase();
    const shipment = await CorridorShipmentModel.findOne({ shipmentId }).select('customerId customerCode').lean();
    if (!shipment) {
      return false;
    }

    return [shipment.customerId, shipment.customerCode].filter(Boolean).some((value) => String(value) === String(user.customerCode));
  }

  private async canAccessContainerRoom(user: AuthenticatedUser, containerNo: string) {
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

    await connectToDatabase();
    const container = await CorridorContainerModel.findOne({
      $or: [{ containerNumber: containerNo }, { containerId: containerNo }],
    }).select('shipmentId').lean();
    if (!container?.shipmentId) {
      return false;
    }

    const shipment = await CorridorShipmentModel.findOne({ shipmentId: container.shipmentId }).select('customerId customerCode').lean();
    if (!shipment) {
      return false;
    }

    return [shipment.customerId, shipment.customerCode].filter(Boolean).some((value) => String(value) === String(user.customerCode));
  }
}
