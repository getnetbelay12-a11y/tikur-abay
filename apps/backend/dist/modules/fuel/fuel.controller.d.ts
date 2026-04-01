import { AuthenticatedUser } from '../auth/auth.types';
export declare class FuelController {
    create(user: AuthenticatedUser, body: Record<string, unknown>): Promise<any>;
    list(vehicleId?: string, tripId?: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
}
