import { AuthenticatedUser } from '../auth/auth.types';
import { LaunchService } from './launch.service';
export declare class LaunchController {
    private readonly launchService;
    constructor(launchService: LaunchService);
    list(): Promise<{
        items: {
            id: string;
            code: string;
            title: string;
            track: string;
            owner: string;
            audience: string;
            branch: string;
            dueDate: string;
            status: string;
            actionLabel: string;
            summary: string;
            checklist: any;
            notes: string;
            lastUpdatedBy: string;
            lastUpdatedByRole: string;
            updatedAt: string | null;
        }[];
        history: {
            id: string;
            title: string;
            description: string;
            userName: string;
            action: string;
            createdAt: string | null;
        }[];
    }>;
    update(code: string, user: AuthenticatedUser, body: {
        status?: 'ready' | 'scheduled' | 'in_progress' | 'watch' | 'blocked';
        notes?: string;
    }): Promise<{
        id: string;
        code: string;
        title: string;
        track: string;
        owner: string;
        audience: string;
        branch: string;
        dueDate: string;
        status: string;
        actionLabel: string;
        summary: string;
        checklist: any;
        notes: string;
        lastUpdatedBy: string;
        lastUpdatedByRole: string;
        updatedAt: string | null;
    }>;
}
