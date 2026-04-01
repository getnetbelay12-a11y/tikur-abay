import { AuthenticatedUser } from '../auth/auth.types';
import { CorridorService } from './corridor.service';
export declare class CorridorController {
    private readonly corridorService;
    constructor(corridorService: CorridorService);
    getAccessMatrix(): import("./corridor.types").CorridorAccessMatrixPayload;
    getShipments(user: AuthenticatedUser | undefined, query: Record<string, unknown>): Promise<{
        shipmentId: any;
        shipmentRef: any;
        bookingNumber: any;
        customerId: any;
        customerName: any;
        consigneeName: any;
        supplierName: any;
        serviceType: any;
        currentStage: import("./corridor.types").CorridorNormalizedShipmentStage;
        currentOwnerRole: any;
        status: any;
        riskLevel: any;
        route: string;
        billOfLadingNumber: any;
        container: any;
        exceptionChip: {
            severity: any;
            title: any;
        } | null;
        documentCounts: {
            ready: number;
        };
        customerConfirmation: {
            status: any;
            confirmedAt: any;
            confirmedBy: any;
            note: any;
            shortageStatus: any;
            damageStatus: any;
            closureBlockedReason: any;
        };
        quoteBooking: {
            quoteId: any;
            bookingId: any;
            requestSource: any;
            quoteStatus: any;
            bookingStatus: any;
            quoteAmount: any;
            quoteCurrency: any;
            acceptedAt: any;
            convertedToShipmentId: any;
            assignedOriginAgentId: any;
            assignedOriginAgentEmail: any;
        };
        clearance: {
            originFileSentAt: any;
            originFileSentBy: any;
            multimodalReceivedAt: any;
            transitorAssignedTo: any;
            transitorAssignedAt: any;
            transitDocumentRef: any;
            transitDocumentStatus: any;
            chargesPaymentStatus: any;
            clearancePacketStatus: any;
            transportClearanceReady: any;
            clearanceReadyAt: any;
            clearanceCompletedAt: any;
            workflowState: any;
            readinessStatus: any;
            blockedReasons: any;
            missingFields: any;
            documentsReadyForClearance: any;
            documentsReadyAt: any;
            documentsReadyMarkedBy: any;
            clearanceWorkflowStatus: any;
            clearanceAcknowledgedAt: any;
            clearanceStartedAt: any;
            clearanceMissingDocumentReason: any;
        };
        containerLifecycle: {
            fullOutDjiboutiAt: any;
            fullInDryPortAt: any;
            fullOutCustomerAt: any;
            emptyInDryPortAt: any;
            emptyOutDryPortAt: any;
            emptyInDjiboutiAt: any;
        };
        paymentSummary: {
            totalChargeAmount: any;
            paymentStatus: any;
            taxDutyStatus: any;
        } | undefined;
        blockedReasons: any;
        workflowState: any;
        readinessStatus: any;
        supportThreadCount: number;
        activeTrip: null;
        updatedAt: any;
    }[]>;
    getShipment(user: AuthenticatedUser | undefined, shipmentRef: string, query: Record<string, unknown>): Promise<Record<string, any>>;
    getCustomerPortal(user: AuthenticatedUser | undefined, query: Record<string, unknown>): Promise<import("./corridor.types").CorridorCustomerPortalPayload>;
    getWorkspace(user: AuthenticatedUser | undefined, workspace: string, query: Record<string, unknown>): Promise<import("./corridor.types").CorridorWorkspacePayload | null>;
    getDriverTransitPack(user: AuthenticatedUser | undefined, query: Record<string, unknown>): Promise<import("./corridor.types").CorridorDriverTransitPack | null>;
    markDocumentsReady(user: AuthenticatedUser | undefined, shipmentRef: string, body: Record<string, unknown>, query: Record<string, unknown>): Promise<{
        success: boolean;
    }>;
    acknowledgeClearance(user: AuthenticatedUser | undefined, shipmentRef: string, body: Record<string, unknown>, query: Record<string, unknown>): Promise<{
        success: boolean;
    }>;
    requestMissingDocs(user: AuthenticatedUser | undefined, shipmentRef: string, body: Record<string, unknown>, query: Record<string, unknown>): Promise<{
        success: boolean;
    }>;
    startClearance(user: AuthenticatedUser | undefined, shipmentRef: string, body: Record<string, unknown>, query: Record<string, unknown>): Promise<{
        success: boolean;
    }>;
    completeClearance(user: AuthenticatedUser | undefined, shipmentRef: string, body: Record<string, unknown>, query: Record<string, unknown>): Promise<{
        success: boolean;
    }>;
    generateClearancePack(user: AuthenticatedUser | undefined, shipmentRef: string, body: Record<string, unknown>, query: Record<string, unknown>): Promise<{
        shipmentId: any;
        clearancePackUrl: string;
        clearancePackPdfUrl: string | null;
        generatedAt: Date;
        generatedBy: string;
        readiness: {
            ready: any;
            missingItems: any;
            missingFields: any;
            blockingReasons: any;
            workflowState: any;
            financeApproved: any;
            releaseReady: any;
        };
        items: {
            shipmentDocumentId: any;
            tag: any;
            fileName: any;
            version: any;
            fileUrl: any;
        }[];
        containerDetails: {
            containerNumber: any;
            sealNumber: any;
            containerType: any;
        }[];
    }>;
    bulkDownloadDocuments(user: AuthenticatedUser | undefined, shipmentRef: string, body: Record<string, unknown>, query: Record<string, unknown>): Promise<{
        shipmentId: any;
        fileName: string;
        downloadUrl: string;
        storagePath: string;
        items: {
            shipmentDocumentId: any;
            fileName: any;
            version: any;
            tag: any;
            fileUrl: any;
        }[];
    }>;
    logDocumentAccess(user: AuthenticatedUser | undefined, shipmentRef: string, shipmentDocumentId: string, body: Record<string, unknown>, query: Record<string, unknown>): Promise<any>;
    getDocumentAccessLog(user: AuthenticatedUser | undefined, shipmentRef: string, query: Record<string, unknown>): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
}
