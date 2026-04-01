import { AuthenticatedUser } from '../auth/auth.types';
export declare class IncidentsController {
    open(user: AuthenticatedUser): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
}
