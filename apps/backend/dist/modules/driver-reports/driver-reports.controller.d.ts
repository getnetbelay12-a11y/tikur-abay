export declare class DriverReportsController {
    list(): Promise<{
        id: string;
        reportId: string;
        reportCode: any;
        type: any;
        severity: any;
        driver: any;
        driverPhone: any;
        vehicle: any;
        trip: any;
        branch: any;
        submitted: any;
        status: any;
        assignedTo: string;
        description: any;
        attachments: any;
        location: any;
        tripDetail: {
            route: any;
            status: any;
            customer: any;
            eta: any;
        } | null;
        vehicleDetail: {
            currentStatus: any;
            plateNumber: any;
            currentOdometerKm: number;
        } | null;
    }[]>;
    getOne(id: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
    create(body: Record<string, unknown>): Promise<any>;
    updateStatus(id: string, body: {
        status?: string;
    }): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
}
