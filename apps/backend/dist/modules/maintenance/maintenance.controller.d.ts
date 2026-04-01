import { MaintenanceService } from './maintenance.service';
import { MaintenanceAlertQueryDto } from './dto/maintenance-alert-query.dto';
export declare class MaintenanceController {
    private readonly maintenanceService;
    constructor(maintenanceService: MaintenanceService);
    alerts(): Promise<unknown>;
    dashboard(): Promise<unknown>;
    due(): Promise<{
        id: string;
        vehicleId: string;
        vehicleLabel: any;
        vehicleCode: any;
        maintenanceType: any;
        branchId: string;
        overdue: boolean;
        blockedForAssignment: boolean;
        blockedAssignment: boolean;
        dueDate: any;
        dueKm: any;
        currentOdometerKm: any;
        critical: boolean;
    }[]>;
    dueVehicles(query: MaintenanceAlertQueryDto): Promise<{
        id: string;
        vehicleId: string;
        vehicleLabel: any;
        vehicleCode: any;
        maintenanceType: any;
        branchId: string;
        overdue: boolean;
        blockedForAssignment: boolean;
        blockedAssignment: boolean;
        dueDate: any;
        dueKm: any;
        currentOdometerKm: any;
        critical: boolean;
    }[]>;
    tireInspectionDue(): Promise<{
        id: string;
        vehicleId: string;
        vehicleLabel: any;
        vehicleCode: any;
        maintenanceType: any;
        branchId: string;
        overdue: boolean;
        blockedForAssignment: boolean;
        blockedAssignment: boolean;
        dueDate: any;
        dueKm: any;
        currentOdometerKm: any;
        critical: boolean;
    }[]>;
    rules(): {
        key: string;
        serviceItemName: string;
        intervalKm: number;
        intervalDays: number;
        criticalFlag: boolean;
        notificationDaysBeforeDue: number;
        blockTripAssignmentIfOverdue: boolean;
    }[];
    overdue(): Promise<{
        id: string;
        vehicleId: string;
        vehicleLabel: any;
        vehicleCode: any;
        maintenanceType: any;
        branchId: string;
        overdue: boolean;
        blockedForAssignment: boolean;
        blockedAssignment: boolean;
        dueDate: any;
        dueKm: any;
        currentOdometerKm: any;
        critical: boolean;
    }[]>;
    blocked(): Promise<{
        id: string;
        vehicleId: string;
        vehicleLabel: any;
        vehicleCode: any;
        maintenanceType: any;
        branchId: string;
        overdue: boolean;
        blockedForAssignment: boolean;
        blockedAssignment: boolean;
        dueDate: any;
        dueKm: any;
        currentOdometerKm: any;
        critical: boolean;
    }[]>;
    vehicleHistory(id: string): Promise<{
        vehicle: {
            id: string;
            vehicleCode: any;
            branchName: any;
            currentStatus: any;
            currentOdometerKm: any;
        };
        plans: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        records: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        repairOrders: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        notifications: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        timeline: {
            id: string;
            type: string;
            title: any;
            at: any;
            detail: any;
        }[];
    } | null>;
    repairOrders(status?: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    createRepairOrder(body: Record<string, unknown>): Promise<any>;
    repairOrder(id: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
    updateRepairOrderStatus(id: string, body: Record<string, unknown>): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
    createPlan(body: Record<string, unknown>): Promise<any>;
    plans(): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    updatePlan(id: string, body: Record<string, unknown>): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
    notifications(): Promise<{
        id: string;
        vehicleId: string;
        vehicleCode: any;
        driverId: string;
        maintenanceType: any;
        dueKm: any;
        dueDate: any;
        message: any;
        status: any;
        sentAt: any;
    }[]>;
    lowStockParts(): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    createNotification(body: Record<string, unknown>): Promise<any>;
    markNotificationRead(id: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
}
