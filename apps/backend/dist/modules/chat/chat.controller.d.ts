import { AuthenticatedUser } from '../auth/auth.types';
import { ChatService } from './chat.service';
export declare class ChatController {
    private readonly chatService;
    constructor(chatService: ChatService);
    rooms(user: AuthenticatedUser, shipmentId?: string, roomType?: string): Promise<{
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
    resolveRoom(body: {
        shipmentId?: string;
        roomType?: string;
        roleRoute?: string;
        title?: string;
        participantRoles?: string[];
        participantIds?: string[];
    }, user: AuthenticatedUser): Promise<{
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
    messages(id: string, user: AuthenticatedUser, limit?: string, before?: string, q?: string, messageType?: string): Promise<{
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
    search(id: string, user: AuthenticatedUser, q?: string): Promise<{
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
    sendMessage(id: string, body: {
        text?: string;
        content?: string;
        messageType?: 'text' | 'file' | 'system' | 'alert';
        attachments?: any[];
        replyToMessageId?: string;
        pinned?: boolean;
    }, user: AuthenticatedUser): Promise<{
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
    markRead(id: string, user: AuthenticatedUser): Promise<{
        ok: boolean;
        readCount?: undefined;
    } | {
        ok: boolean;
        readCount: number;
    }>;
}
