import { AuthenticatedUser } from '../auth/auth.types';
import { CommunicationOrchestratorService } from '../communications/communication-orchestrator.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
type ResolveRoomBody = {
    shipmentId?: string;
    roomType?: string;
    roleRoute?: string;
    title?: string;
    participantRoles?: string[];
    participantIds?: string[];
};
type SendMessageBody = {
    content?: string;
    text?: string;
    messageType?: 'text' | 'file' | 'system' | 'alert';
    attachments?: Array<{
        fileName?: string;
        fileUrl?: string;
        mimeType?: string;
        size?: number;
        documentId?: string;
        shipmentId?: string;
    }>;
    replyToMessageId?: string;
    pinned?: boolean;
};
export declare class ChatService {
    private readonly realtimeGateway;
    private readonly communicationOrchestratorService;
    constructor(realtimeGateway: RealtimeGateway, communicationOrchestratorService: CommunicationOrchestratorService);
    private asPlain;
    rooms(user: AuthenticatedUser, query?: {
        shipmentId?: string;
        roomType?: string;
    }): Promise<{
        id: string;
        roomKey: any;
        roomType: any;
        shipmentId: any;
        title: any;
        description: any;
        roleRoute: any;
        participantRoles: any;
        unreadCount: any;
        status: any;
        customerSafe: boolean;
        driverVisible: boolean;
        ownRoom: any;
        lastMessageAt: any;
    }[]>;
    resolveRoom(body: ResolveRoomBody, user: AuthenticatedUser): Promise<{
        id: string;
        roomKey: any;
        roomType: any;
        shipmentId: any;
        title: any;
        description: any;
        roleRoute: any;
        participantRoles: any;
        unreadCount: any;
        status: any;
        customerSafe: boolean;
        driverVisible: boolean;
        ownRoom: any;
        lastMessageAt: any;
    }>;
    messages(roomId: string, user: AuthenticatedUser, query?: {
        limit?: string;
        before?: string;
        q?: string;
        messageType?: string;
    }): Promise<{
        room: null;
        items: never[];
        nextCursor: null;
    } | {
        room: {
            id: string;
            roomKey: any;
            roomType: any;
            shipmentId: any;
            title: any;
            description: any;
            roleRoute: any;
            participantRoles: any;
            unreadCount: any;
            status: any;
            customerSafe: boolean;
            driverVisible: boolean;
            ownRoom: any;
            lastMessageAt: any;
        };
        items: {
            id: string;
            roomId: string;
            shipmentId: any;
            senderName: any;
            senderUserId: string;
            senderRole: any;
            messageType: any;
            text: any;
            content: any;
            attachments: any;
            replyToMessageId: any;
            pinned: boolean;
            createdAt: any;
            ownMessage: boolean;
            readBy: any;
            deliveredTo: any;
        }[];
        nextCursor: any;
    }>;
    search(roomId: string, user: AuthenticatedUser, q?: string): Promise<{
        room: null;
        items: never[];
        nextCursor: null;
    } | {
        room: {
            id: string;
            roomKey: any;
            roomType: any;
            shipmentId: any;
            title: any;
            description: any;
            roleRoute: any;
            participantRoles: any;
            unreadCount: any;
            status: any;
            customerSafe: boolean;
            driverVisible: boolean;
            ownRoom: any;
            lastMessageAt: any;
        };
        items: {
            id: string;
            roomId: string;
            shipmentId: any;
            senderName: any;
            senderUserId: string;
            senderRole: any;
            messageType: any;
            text: any;
            content: any;
            attachments: any;
            replyToMessageId: any;
            pinned: boolean;
            createdAt: any;
            ownMessage: boolean;
            readBy: any;
            deliveredTo: any;
        }[];
        nextCursor: any;
    }>;
    markRead(roomId: string, user: AuthenticatedUser): Promise<{
        ok: boolean;
        readCount?: undefined;
    } | {
        ok: boolean;
        readCount: number;
    }>;
    sendMessage(roomId: string, body: SendMessageBody, user: AuthenticatedUser): Promise<{
        id: string;
        roomId: string;
        shipmentId: any;
        senderName: any;
        senderUserId: string;
        senderRole: any;
        messageType: any;
        text: any;
        content: any;
        attachments: any;
        replyToMessageId: any;
        pinned: boolean;
        createdAt: any;
        ownMessage: boolean;
        readBy: any;
        deliveredTo: any;
    } | null>;
    injectSystemMessage(input: {
        shipmentId?: string;
        roomId?: string;
        content: string;
        systemEventKey: string;
        visibilityRoles?: string[];
    }): Promise<any>;
    private ensureDefaultRoomsForUser;
    private ensureShipmentSystemMessages;
    private notifyOfflineParticipants;
    private serializeRoom;
    private serializeMessage;
    private canAccessRoom;
    private canViewMessage;
}
export {};
