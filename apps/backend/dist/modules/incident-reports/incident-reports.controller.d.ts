import { AuthenticatedUser } from '../auth/auth.types';
export declare class IncidentReportsController {
    create(user: AuthenticatedUser, body: Record<string, unknown>): Promise<any>;
    list(): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    getOne(id: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
}
