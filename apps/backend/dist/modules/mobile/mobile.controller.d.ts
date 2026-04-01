import { AuthenticatedUser } from '../auth/auth.types';
import { CommunicationOrchestratorService } from '../communications/communication-orchestrator.service';
export declare class MobileController {
    private readonly communicationOrchestratorService;
    constructor(communicationOrchestratorService: CommunicationOrchestratorService);
    private recordAuditEvent;
    createDriverKyc(user: AuthenticatedUser, body: Record<string, unknown>): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
    listDriverKyc(user: AuthenticatedUser, status?: string, branchId?: string, q?: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    getDriverKyc(id: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
    updateDriverKycStatus(id: string, user: AuthenticatedUser, body: {
        status?: string;
        notes?: string;
        reviewNotes?: string;
    }): Promise<Record<string, unknown> | null>;
    createBooking(user: AuthenticatedUser, body: Record<string, unknown>): Promise<{
        bookingId: string;
        bookingCode: any;
        shipmentRef: any;
        status: any;
        alreadyExists: boolean;
        assignedOriginAgentEmail?: undefined;
    } | {
        bookingId: string;
        bookingCode: string;
        shipmentRef: string;
        status: string;
        assignedOriginAgentEmail: string;
        alreadyExists?: undefined;
    }>;
    myBookings(user: AuthenticatedUser, limit?: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    availableFleet(): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    requestQuote(user: AuthenticatedUser, body: Record<string, unknown>): Promise<any>;
    updateQuoteStatus(user: AuthenticatedUser, id: string, body: {
        status?: string;
        approvalMethod?: string;
        note?: string;
    }): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
    myQuotes(user: AuthenticatedUser, limit?: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    customerWorkspace(user: AuthenticatedUser): Promise<{
        overview: {
            activeBooking: null;
            assignedVehicle: null;
            quoteStatus: string;
            agreementStatus: string;
            paymentDue: number;
            supportShortcut: string;
        };
        quotes: never[];
        bookings: never[];
        agreements: never[];
        documents: never[];
        invoices: never[];
        payments: never[];
        trips: never[];
        customer?: undefined;
    } | {
        customer: {
            companyName: any;
            accountStatus: any;
            contactPerson: any;
        };
        overview: {
            activeBooking: {
                bookingCode: any;
                route: any;
                cargoType: any;
                requestedDate: any;
                status: any;
            } | null;
            assignedVehicle: any;
            quoteStatus: any;
            agreementStatus: any;
            paymentDue: number;
            supportShortcut: string;
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
        bookings: {
            id: string;
            bookingCode: any;
            route: any;
            cargoType: any;
            requestedDate: any;
            requestedVehicleType: any;
            status: any;
        }[];
        agreements: {
            id: string;
            agreementCode: any;
            status: any;
            totalValue: number;
            signedPdfUrl: any;
        }[];
        documents: {
            id: string;
            title: any;
            category: any;
            categoryLabel: string;
            categoryGroup: string;
            categoryGroupOrder: number;
            categoryOrder: number;
            categoryPriority: "high" | "medium" | "low";
            status: string;
            fileName: any;
            entityType: any;
            entityId: any;
            mimeType: any;
            createdAt: any;
            requirementState: string;
            mobileCanUpload: boolean;
        }[];
        invoices: {
            id: string;
            invoiceCode: any;
            tripCode: any;
            totalAmount: number;
            outstandingAmount: number;
            status: any;
            dueDate: any;
        }[];
        payments: {
            id: string;
            paymentCode: any;
            invoiceCode: any;
            amount: number;
            status: any;
            paymentDate: any;
        }[];
        trips: {
            id: string;
            tripCode: any;
            assignedVehicle: any;
            status: any;
            eta: any;
            routeStatus: any;
            proofOfDeliveryUploaded: boolean;
            origin: any;
            destination: any;
            milestones: {
                id: string;
                title: any;
                eventAt: any;
                location: any;
            }[];
        }[];
    }>;
    createAvailability(user: AuthenticatedUser, body: Record<string, unknown>): Promise<any>;
    createLeave(user: AuthenticatedUser, body: Record<string, unknown>): Promise<any>;
}
