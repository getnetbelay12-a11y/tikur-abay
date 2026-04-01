import { MaintenanceAlertQueryDto } from './dto/maintenance-alert-query.dto';
export declare class MaintenanceService {
    getDashboard(): Promise<unknown>;
    getDue(): Promise<{
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
    getDueVehicles(filters?: MaintenanceAlertQueryDto): Promise<{
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
    getTireInspectionDue(): Promise<{
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
    getNotifications(): Promise<{
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
    getRules(): {
        key: string;
        serviceItemName: string;
        intervalKm: number;
        intervalDays: number;
        criticalFlag: boolean;
        notificationDaysBeforeDue: number;
        blockTripAssignmentIfOverdue: boolean;
    }[];
    getOverdueVehicles(): Promise<{
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
    getBlockedVehicles(): Promise<{
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
    getVehicleHistory(vehicleId: string): Promise<{
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
    listRepairOrders(status?: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    getRepairOrder(id: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
    createRepairOrder(body: Record<string, unknown>): Promise<any>;
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
    listPlans(): Promise<(import("mongoose").FlattenMaps<any> & Required<{
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
    listLowStockParts(): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    private buildPlanQuery;
}
