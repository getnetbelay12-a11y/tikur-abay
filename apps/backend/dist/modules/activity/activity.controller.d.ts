import { AuthenticatedUser } from '../auth/auth.types';
export declare class ActivityController {
    create(user: AuthenticatedUser, body: Record<string, unknown>): Promise<any>;
    list(tripId?: string, vehicleId?: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    feed(): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    my(user: AuthenticatedUser): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
}
