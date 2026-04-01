import { AuthenticatedUser } from '../auth/auth.types';
import { NotificationsService } from './notifications.service';
export declare class AppNotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    list(user: AuthenticatedUser): Promise<{
        id: string;
        title: any;
        secondaryText: any;
        timestamp: any;
        isRead: boolean;
        category: string;
        severity: string;
        branch: any;
        linkedEntity: {
            label: string;
            href: string;
        };
        actionLabel: any;
        actionRoute: any;
        entityId: any;
        entityType: any;
    }[]>;
    read(id: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
    readAll(user: AuthenticatedUser): Promise<{
        id: string;
        title: any;
        secondaryText: any;
        timestamp: any;
        isRead: boolean;
        category: string;
        severity: string;
        branch: any;
        linkedEntity: {
            label: string;
            href: string;
        };
        actionLabel: any;
        actionRoute: any;
        entityId: any;
        entityType: any;
    }[]>;
    unreadCount(user: AuthenticatedUser): Promise<{
        count: number;
    }>;
}
