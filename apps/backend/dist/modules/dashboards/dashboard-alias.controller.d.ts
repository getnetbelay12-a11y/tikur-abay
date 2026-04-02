import { AuthenticatedUser } from '../auth/auth.types';
import { DashboardsService } from './dashboards.service';
import { ExecutiveCommunicationsService } from './executive-communications.service';
export declare class DashboardAliasController {
    private readonly dashboardsService;
    private readonly executiveCommunicationsService;
    constructor(dashboardsService: DashboardsService, executiveCommunicationsService: ExecutiveCommunicationsService);
    executiveSummary(): Promise<unknown>;
    activityFeed(): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    incidents(): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    fuelSummary(): Promise<{
        fuelLogsToday: number;
        latestFuelLogs: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
    }>;
    documentSummary(): Promise<{
        documentsUploadedToday: number;
        latestUploadedDocuments: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
    }>;
    agreementSummary(): Promise<{
        agreementsSignedThisWeek: number;
        latestAgreements: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
    }>;
    collectionEscalations(): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
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
    headOfficeCommandCenter(): Promise<unknown>;
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
