import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service';
export declare class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly authService;
    server: Server;
    private readonly logger;
    constructor(authService: AuthService);
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): void;
    joinChatRoom(client: Socket, body: {
        roomId?: string;
        roomKey?: string;
        shipmentId?: string;
        roleRoute?: string;
    }): {
        ok: boolean;
    };
    leaveChatRoom(client: Socket, body: {
        roomId?: string;
        roomKey?: string;
        shipmentId?: string;
        roleRoute?: string;
    }): {
        ok: boolean;
    };
    joinRooms(client: Socket, body: {
        rooms?: string[];
    }): Promise<{
        ok: boolean;
        joined: string[];
        rejected: string[];
    }>;
    leaveRooms(client: Socket, body: {
        rooms?: string[];
    }): {
        ok: boolean;
        left: string[];
    };
    emitChatMessage(roomId: string, payload: unknown): void;
    emitChatRead(roomId: string, payload: unknown): void;
    emitRoomUpdate(payload: unknown, roomId?: string, shipmentId?: string): void;
    emitNotification(userId: string, payload: unknown): void;
    emitMaintenanceNotification(driverId: string, payload: unknown): void;
    emitFleetUpdate(payload: unknown, branchId?: string): void;
    emitDashboardKpis(payload: unknown): void;
    emitDashboardStatus(payload: unknown): void;
    emitDashboardTrend(payload: unknown): void;
    emitDashboardPerformance(payload: unknown): void;
    emitShipmentUpdated(payload: unknown, shipmentId?: string, customerCode?: string): void;
    emitTrackingEvent(payload: unknown, shipmentId?: string, containerNo?: string, customerCode?: string): void;
    emitFinanceUpdated(payload: unknown, shipmentId?: string, customerCode?: string): void;
    emitDispatchUpdate(payload: unknown, shipmentId?: string, customerCode?: string): void;
    emitAlert(payload: unknown, shipmentId?: string, containerNo?: string, customerCode?: string): void;
    private extractToken;
    private canJoinRoom;
    private hasAnyPermission;
    private isCustomerScopedUser;
    private canAccessShipmentRoom;
    private canAccessContainerRoom;
}
