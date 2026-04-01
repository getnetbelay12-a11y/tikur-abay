import { AuthenticatedUser } from '../auth/auth.types';
import { NotificationJobsService } from './notification-jobs.service';
export declare class NotificationsService {
    private readonly jobs;
    constructor(jobs: NotificationJobsService);
    listApp(user: AuthenticatedUser): Promise<{
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
    readApp(id: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
    readAllApp(user: AuthenticatedUser): Promise<{
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
    listMaintenance(user?: AuthenticatedUser): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    createMaintenance(body: Record<string, unknown>): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
    markMaintenanceRead(id: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
}
