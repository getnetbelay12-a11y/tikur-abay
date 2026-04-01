import { GpsService } from '../gps/gps.service';
import { MaintenanceService } from '../maintenance/maintenance.service';
import { AiCommandCenterService } from './ai-command-center.service';
type ExecutiveWorkspaceTab = 'overview' | 'finance' | 'operations' | 'attention';
type ControlTowerStatusRow = {
    name: string;
    value: number;
};
type ControlTowerTrendRow = {
    day: string;
    shipments: number;
};
type ControlTowerPerformanceRow = {
    route: string;
    value: number;
};
type ControlTowerAlertRow = {
    id: string;
    issue: string;
};
export declare class DashboardsService {
    private readonly gpsService;
    private readonly maintenanceService;
    private readonly aiCommandCenterService;
    constructor(gpsService: GpsService, maintenanceService: MaintenanceService, aiCommandCenterService: AiCommandCenterService);
    getExecutiveSummary(): Promise<unknown>;
    getTransportControlTowerSummary(): Promise<{
        total: number;
        active: number;
        delayed: number;
        clearance: number;
        transit: number;
        release: number;
        returns: number;
        onTime: number;
    }>;
    getTransportControlTowerStatus(): Promise<ControlTowerStatusRow[]>;
    getTransportControlTowerTrend(): Promise<ControlTowerTrendRow[]>;
    getTransportControlTowerPerformance(): Promise<ControlTowerPerformanceRow[]>;
    getTransportControlTowerAlerts(): Promise<ControlTowerAlertRow[]>;
    getManagementWidgets(): Promise<any>;
    getExecutiveActivityFeed(): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    getExecutiveIncidents(): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    getExecutiveFuelSummary(): Promise<{
        fuelLogsToday: number;
        latestFuelLogs: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
    }>;
    getExecutiveDocumentSummary(): Promise<{
        documentsUploadedToday: number;
        latestUploadedDocuments: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
    }>;
    getExecutiveAgreementSummary(): Promise<{
        agreementsSignedThisWeek: number;
        latestAgreements: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
    }>;
    getExecutiveCollectionEscalations(): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    getAiCommandCenter(): Promise<{
        greeting: string;
        topRisks: {
            title: any;
            description: any;
            severity: any;
            score: any;
            actionLabel: any;
            actionRoute: any;
            entityType: any;
            entityId: any;
            category: any;
            secondaryActionLabel: any;
            secondaryActionTemplate: any;
        }[];
        topOpportunities: {
            title: any;
            description: any;
            severity: any;
            score: any;
            actionLabel: any;
            actionRoute: any;
            entityType: any;
            entityId: any;
            category: any;
            secondaryActionLabel: any;
            secondaryActionTemplate: any;
        }[];
        topActions: {
            title: any;
            description: any;
            severity: any;
            score: any;
            actionLabel: any;
            actionRoute: any;
            entityType: any;
            entityId: any;
            category: any;
            secondaryActionLabel: any;
            secondaryActionTemplate: any;
        }[];
        summaryText: any;
        stats: any;
    }>;
    getExecutiveWorkspace(tab?: ExecutiveWorkspaceTab): Promise<unknown>;
}
export {};
