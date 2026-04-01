import { AuthenticatedUser } from '../auth/auth.types';
import { NotificationJobsService } from '../notifications/notification-jobs.service';
export declare class CommercialController {
    private readonly notificationJobsService;
    constructor(notificationJobsService: NotificationJobsService);
    leads(): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    createLead(body: Record<string, unknown>): Promise<any>;
    availableVehicles(branch?: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    onboardingTasks(): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    createOnboardingTask(body: Record<string, unknown>): Promise<any>;
    outboundNotifications(): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    createOutbound(body: Record<string, unknown>): Promise<any>;
    workspace(user: AuthenticatedUser, customerCode?: string): Promise<{
        customer: null;
        overview: {
            accountStatus: string;
            activeTrips: number;
            pendingQuote: number;
            pendingAgreement: number;
            unpaidInvoices: number;
            pendingCollectionTasks?: undefined;
            activeBookings?: undefined;
        };
        quotes: never[];
        agreements: never[];
        documents: never[];
        invoices: never[];
        recentPayments: never[];
        activeTrips: never[];
    } | {
        customer: {
            customerCode: any;
            companyName: any;
            status: any;
            city: any;
            segment: any;
            contactPerson: any;
            phone: any;
            email: any;
            tradeLicense: any;
            tin: any;
            vat: any;
        } | null;
        overview: {
            accountStatus: any;
            activeTrips: number;
            pendingQuote: number;
            pendingAgreement: number;
            unpaidInvoices: number;
            pendingCollectionTasks: number;
            activeBookings: number;
        };
        quotes: {
            id: string;
            quoteCode: any;
            route: any;
            cargoType: any;
            requestedDate: any;
            requestedVehicleType: any;
            quotedAmount: number;
            status: any;
        }[];
        agreements: {
            id: string;
            agreementCode: any;
            status: any;
            totalValue: number;
            startDate: any;
            endDate: any;
            downloadUrl: any;
        }[];
        documents: {
            id: string;
            title: any;
            category: any;
            status: any;
            createdAt: any;
            downloadUrl: string;
        }[];
        invoices: {
            id: string;
            invoiceCode: any;
            issueDate: any;
            dueDate: any;
            totalAmount: number;
            outstandingAmount: number;
            status: any;
            tripCode: any;
        }[];
        recentPayments: {
            id: string;
            paymentCode: any;
            invoiceCode: any;
            amount: number;
            status: any;
            paymentDate: any;
        }[];
        activeTrips: {
            id: string;
            tripCode: any;
            route: any;
            origin: any;
            destination: any;
            status: any;
            eta: any;
            assignedVehicle: any;
            proofOfDeliveryUploaded: boolean;
            milestoneTimeline: {
                id: string;
                title: any;
                eventAt: any;
                location: any;
            }[];
            routeStatus: any;
            stopsAway: number;
        }[];
    }>;
    private resolveCustomerCode;
    private computeStopsAway;
    customersWorkspace(): Promise<{
        kpis: {
            total: number;
            active: number;
            activeTrips: number;
            unpaidBalance: number;
            pendingAgreements: number;
            topRevenue: number;
        };
        rows: {
            id: string;
            customerCode: any;
            companyName: any;
            contactPerson: any;
            phone: any;
            branch: any;
            activeTrips: number;
            agreements: number;
            unpaidBalance: number;
            status: any;
            accountManager: any;
            accountManagerPhone: any;
            hasActiveAgreement: boolean;
            trips: {
                tripCode: any;
                route: any;
                status: any;
                eta: any;
                value: number;
            }[];
            agreementsDetail: {
                agreementCode: any;
                status: any;
                totalValue: number;
                endDate: any;
            }[];
            invoices: {
                invoiceCode: any;
                status: any;
                totalAmount: number;
                outstandingAmount: number;
                dueDate: any;
            }[];
            payments: {
                paymentCode: any;
                amount: number;
                status: any;
                paymentDate: any;
            }[];
            documents: {
                title: any;
                category: any;
                status: any;
            }[];
            totalRevenue: number;
            pendingAgreements: number;
        }[];
    }>;
    agreementsWorkspace(): Promise<{
        kpis: {
            total: number;
            signed: number;
            pendingSignature: number;
            underReview: number;
            expiringSoon: number;
            expired: number;
        };
        rows: {
            id: string;
            agreementCode: any;
            customer: any;
            status: any;
            value: number;
            startDate: any;
            endDate: any;
            signStatus: string;
            signedAt: any;
            pdfUrl: any;
            signer: any;
            signerPhone: any;
            secureSignLink: string | null;
            expiringSoon: boolean;
            expired: boolean;
            auditTrail: any;
            documents: {
                title: string;
                status: string;
                href: any;
            }[];
        }[];
    }>;
    marketingWorkspace(): Promise<{
        kpis: {
            newLeads: number;
            openQuotes: number;
            pendingFollowUp: number;
            pendingAgreements: number;
            availableVehiclesToOffer: number;
            conversionThisMonth: number;
        };
        leads: {
            id: string;
            leadCode: any;
            companyName: any;
            contactPerson: any;
            phone: any;
            branch: any;
            routeInterest: any;
            status: any;
            assignedTo: any;
            notes: any;
            quotes: {
                quoteCode: any;
                status: any;
                amount: number;
            }[];
            pendingAgreements: number;
            followUps: {
                taskCode: any;
                title: any;
                status: any;
                dueAt: any;
            }[];
        }[];
        quoteRequests: {
            id: string;
            quoteCode: any;
            customer: any;
            route: any;
            vehicleType: any;
            amount: number;
            status: any;
            requestedDate: any;
        }[];
        availableByBranch: {
            branch: any;
            availableVehicles: number;
            highlightedVehicle: any;
        }[];
        followUpTasks: {
            id: string;
            taskCode: any;
            customerId: string | null;
            title: any;
            status: any;
            dueAt: any;
            assignedTo: any;
        }[];
    }>;
}
