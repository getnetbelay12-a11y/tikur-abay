import { AuthenticatedUser } from '../auth/auth.types';
import { DashboardsService } from './dashboards.service';
import { ExecutiveCommunicationsService } from './executive-communications.service';
export declare class DashboardsController {
    private readonly dashboardsService;
    private readonly executiveCommunicationsService;
    constructor(dashboardsService: DashboardsService, executiveCommunicationsService: ExecutiveCommunicationsService);
    executiveSummary(): Promise<unknown>;
    operationsSummary(): Promise<{
        activeTrips: number;
        delayedTrips: number;
        vehiclesInDjibouti: number;
        trips: Record<string, unknown>[];
    }>;
    widgets(): Promise<any>;
    aiCommandCenter(): Promise<{
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
    executiveWorkspace(tab?: string): Promise<unknown>;
    transportControlTowerSummary(): Promise<{
        total: number;
        active: number;
        delayed: number;
        clearance: number;
        transit: number;
        release: number;
        returns: number;
        onTime: number;
    }>;
    transportControlTowerStatus(): Promise<{
        name: string;
        value: number;
    }[]>;
    transportControlTowerTrend(): Promise<{
        day: string;
        shipments: number;
    }[]>;
    transportControlTowerPerformance(): Promise<{
        route: string;
        value: number;
    }[]>;
    transportControlTowerAlerts(): Promise<{
        id: string;
        issue: string;
    }[]>;
    communicationHistory(user: AuthenticatedUser, entityType: string, entityId: string): Promise<{
        entity: {
            entityType: string;
            entityId: string;
            title: any;
            subtitle: string;
            defaultTemplate: string;
            customerName: any;
            branchName: string;
            severity: string;
            recipients: {
                email: any;
                sms: any;
                telegram: string;
                in_app: string;
            };
            fields: {
                label: string;
                value: any;
            }[];
            tokens: {
                customerName: any;
                invoiceCode: any;
                amountLabel: string;
                dueDateLabel: string;
                paymentCode: any;
                statusLabel: string;
            };
        } | {
            entityType: string;
            entityId: string;
            title: any;
            subtitle: string;
            defaultTemplate: string;
            customerName: any;
            branchName: any;
            severity: string;
            recipients: {
                email: any;
                sms: any;
                telegram: string;
                in_app: string;
            };
            fields: {
                label: string;
                value: any;
            }[];
            tokens: {
                customerName: any;
                tripCode: any;
                routeName: any;
                statusLabel: string;
            };
        } | {
            entityType: string;
            entityId: string;
            title: any;
            subtitle: string;
            defaultTemplate: string;
            customerName: string;
            branchName: any;
            severity: string;
            recipients: {
                email: string;
                sms: string;
                telegram: string;
                in_app: string;
            };
            fields: {
                label: string;
                value: any;
            }[];
            tokens: {
                vehicleCode: any;
                branchName: any;
                maintenanceItem: any;
                statusLabel: string;
            };
        } | {
            entityType: string;
            entityId: string;
            title: any;
            subtitle: string;
            defaultTemplate: string;
            customerName: string;
            branchName: string;
            severity: string;
            recipients: {
                email: string;
                sms: any;
                telegram: string;
                in_app: string;
            };
            fields: {
                label: string;
                value: any;
            }[];
            tokens: {
                driverName: any;
                partnerCompany: any;
                partnerVehicleCode: any;
                statusLabel: string;
            };
        } | {
            entityType: string;
            entityId: string;
            title: any;
            subtitle: string;
            defaultTemplate: string;
            customerName: string;
            branchName: string;
            severity: string;
            recipients: {
                email: string;
                sms: string;
                telegram: string;
                in_app: string;
            };
            fields: {
                label: string;
                value: any;
            }[];
            tokens: {
                vehicleCode: any;
                driverName: any;
                tripCode: any;
                statusLabel: string;
            };
        };
        history: {
            id: string;
            entityType: any;
            entityId: any;
            channel: any;
            recipient: any;
            template: any;
            subject: any;
            message: any;
            status: any;
            sentBy: any;
            sentAt: any;
            scheduledAt: any;
            severity: any;
            providerResponse: any;
        }[];
    }>;
    sendCommunication(user: AuthenticatedUser, body: Record<string, unknown>): Promise<{
        entity: {
            entityType: string;
            entityId: string;
            title: any;
            subtitle: string;
            defaultTemplate: string;
            customerName: any;
            branchName: string;
            severity: string;
            recipients: {
                email: any;
                sms: any;
                telegram: string;
                in_app: string;
            };
            fields: {
                label: string;
                value: any;
            }[];
            tokens: {
                customerName: any;
                invoiceCode: any;
                amountLabel: string;
                dueDateLabel: string;
                paymentCode: any;
                statusLabel: string;
            };
        } | {
            entityType: string;
            entityId: string;
            title: any;
            subtitle: string;
            defaultTemplate: string;
            customerName: any;
            branchName: any;
            severity: string;
            recipients: {
                email: any;
                sms: any;
                telegram: string;
                in_app: string;
            };
            fields: {
                label: string;
                value: any;
            }[];
            tokens: {
                customerName: any;
                tripCode: any;
                routeName: any;
                statusLabel: string;
            };
        } | {
            entityType: string;
            entityId: string;
            title: any;
            subtitle: string;
            defaultTemplate: string;
            customerName: string;
            branchName: any;
            severity: string;
            recipients: {
                email: string;
                sms: string;
                telegram: string;
                in_app: string;
            };
            fields: {
                label: string;
                value: any;
            }[];
            tokens: {
                vehicleCode: any;
                branchName: any;
                maintenanceItem: any;
                statusLabel: string;
            };
        } | {
            entityType: string;
            entityId: string;
            title: any;
            subtitle: string;
            defaultTemplate: string;
            customerName: string;
            branchName: string;
            severity: string;
            recipients: {
                email: string;
                sms: any;
                telegram: string;
                in_app: string;
            };
            fields: {
                label: string;
                value: any;
            }[];
            tokens: {
                driverName: any;
                partnerCompany: any;
                partnerVehicleCode: any;
                statusLabel: string;
            };
        } | {
            entityType: string;
            entityId: string;
            title: any;
            subtitle: string;
            defaultTemplate: string;
            customerName: string;
            branchName: string;
            severity: string;
            recipients: {
                email: string;
                sms: string;
                telegram: string;
                in_app: string;
            };
            fields: {
                label: string;
                value: any;
            }[];
            tokens: {
                vehicleCode: any;
                driverName: any;
                tripCode: any;
                statusLabel: string;
            };
        };
        records: {
            id: string;
            entityType: any;
            entityId: any;
            channel: any;
            recipient: any;
            template: any;
            subject: any;
            message: any;
            status: any;
            sentBy: any;
            sentAt: any;
            scheduledAt: any;
            severity: any;
            providerResponse: any;
        }[];
    }>;
}
