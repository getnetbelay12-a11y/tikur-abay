import type { AuthenticatedUser } from '../auth/auth.types';
import type { CorridorAccessMatrixPayload, CorridorCustomerPortalPayload, CorridorDriverTransitPack, CorridorWorkspaceKey, CorridorWorkspacePayload } from './corridor.types';
import { type CorridorActorContext } from './corridor-access';
import { CommunicationOrchestratorService } from '../communications/communication-orchestrator.service';
export declare class CorridorService {
    private readonly communicationOrchestratorService;
    private readonly roleMatrix;
    private readonly accessMatrix;
    constructor(communicationOrchestratorService: CommunicationOrchestratorService);
    getRoleMatrix(): CorridorAccessMatrixPayload;
    listShipments(actor: CorridorActorContext, query?: Record<string, unknown>): Promise<{
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
    getShipmentDetail(actor: CorridorActorContext, shipmentIdOrRef: string): Promise<Record<string, any>>;
    listCargoItems(actor: CorridorActorContext, shipmentIdOrRef: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    createCargoItem(actor: CorridorActorContext, shipmentIdOrRef: string, body: Record<string, any>): Promise<any>;
    updateCargoItem(actor: CorridorActorContext, shipmentIdOrRef: string, cargoItemId: string, body: Record<string, any>): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
    deleteCargoItem(actor: CorridorActorContext, shipmentIdOrRef: string, cargoItemId: string): Promise<{
        success: boolean;
    }>;
    listDocuments(actor: CorridorActorContext, shipmentIdOrRef: string, query?: Record<string, any>): Promise<{
        items: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
        };
    }>;
    createDocument(actor: CorridorActorContext, shipmentIdOrRef: string, body: Record<string, any>): Promise<any>;
    updateDocument(actor: CorridorActorContext, shipmentIdOrRef: string, shipmentDocumentId: string, body: Record<string, any>): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
    getDocumentAccessLog(actor: CorridorActorContext, shipmentIdOrRef: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    logDocumentAccess(actor: CorridorActorContext, shipmentIdOrRef: string, shipmentDocumentId: string, body?: Record<string, any>): Promise<any>;
    bulkDownloadDocuments(actor: CorridorActorContext, shipmentIdOrRef: string, body?: Record<string, any>): Promise<{
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
    generateClearancePack(actor: CorridorActorContext, shipmentIdOrRef: string, body?: Record<string, any>): Promise<{
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
    markDocumentsReadyForClearance(actor: CorridorActorContext, shipmentIdOrRef: string, body?: Record<string, any>): Promise<{
        success: boolean;
    }>;
    acknowledgeClearanceDocuments(actor: CorridorActorContext, shipmentIdOrRef: string, body?: Record<string, any>): Promise<{
        success: boolean;
    }>;
    requestMissingClearanceDocuments(actor: CorridorActorContext, shipmentIdOrRef: string, body?: Record<string, any>): Promise<{
        success: boolean;
    }>;
    startClearance(actor: CorridorActorContext, shipmentIdOrRef: string, body?: Record<string, any>): Promise<{
        success: boolean;
    }>;
    completeClearance(actor: CorridorActorContext, shipmentIdOrRef: string, body?: Record<string, any>): Promise<{
        success: boolean;
    }>;
    approveFinanceClearance(actor: CorridorActorContext, shipmentIdOrRef: string, body?: Record<string, any>): Promise<{
        success: boolean;
    }>;
    signDocument(actor: CorridorActorContext, shipmentIdOrRef: string, shipmentDocumentId: string, body?: Record<string, any>): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
    verifyDocumentPublic(documentId: string, body?: Record<string, any>): Promise<{
        valid: boolean;
        status: any;
        shipmentNumber: any;
        customerName: any;
        documentType: any;
        issueDate: any;
        verificationUrl: any;
    }>;
    getShipmentTracking(actor: CorridorActorContext, shipmentIdOrRef: string): Promise<{
        shipmentId: any;
        currentLocation: {
            latitude: any;
            longitude: any;
            recordedAt: any;
        } | null;
        routeLine: {
            latitude: any;
            longitude: any;
            recordedAt: any;
        }[];
        checkpoints: {
            label: string;
            location: any;
            status: string;
        }[];
        status: string;
        eta: {
            estimatedArrivalAt: string;
            drivingHoursRemaining: number;
            roadCondition: string;
            stopCount: number;
        };
        risk: {
            status: string;
            delayed: boolean;
            alerts: string[];
            eta: Record<string, any>;
        };
    }>;
    createQuote(body: Record<string, any>): Promise<{
        quoteId: string;
        quoteCode: string;
        pricing: {
            transportPrice: number;
            clearanceEstimate: number;
            serviceFee: number;
            total: number;
        };
    }>;
    createBooking(body: Record<string, any>): Promise<{
        bookingId: string;
        bookingCode: string;
        shipmentId: string;
        shipmentRef: string;
        duplicateShipmentPrevented: boolean;
    }>;
    checkClearanceReadiness(actor: CorridorActorContext, shipmentIdOrRef: string, includeAggregate?: boolean): Promise<{
        ready: any;
        missingItems: any;
        missingFields: any;
        blockingReasons: any;
        workflowState: any;
        financeApproved: any;
        releaseReady: any;
    }>;
    listContainers(actor: CorridorActorContext, shipmentIdOrRef: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    updateContainer(actor: CorridorActorContext, shipmentIdOrRef: string, containerId: string, body: Record<string, any>): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
    listTrips(actor: CorridorActorContext, shipmentIdOrRef: string): Promise<({
        tripId: any;
        containerId: any;
        containerNumber: any;
        route: any;
        originPoint: any;
        destinationPoint: any;
        tripStatus: any;
        dispatchStatus: any;
        eta: any;
        actualDeparture: any;
        actualArrival: any;
        currentCheckpoint: any;
        gpsStatus: any;
        issueStatus: any;
        truckPlate: any;
        trailerPlate: any;
    } | {
        driverId: any;
        driverName: any;
        driverPhone: any;
        driverType: any;
        vehicleId: any;
        partnerId: any;
        tripId: any;
        containerId: any;
        containerNumber: any;
        route: any;
        originPoint: any;
        destinationPoint: any;
        tripStatus: any;
        dispatchStatus: any;
        eta: any;
        actualDeparture: any;
        actualArrival: any;
        currentCheckpoint: any;
        gpsStatus: any;
        issueStatus: any;
        truckPlate: any;
        trailerPlate: any;
    })[]>;
    createTrip(actor: CorridorActorContext, shipmentIdOrRef: string, body: Record<string, any>): Promise<any>;
    updateTrip(actor: CorridorActorContext, tripId: string, body: Record<string, any>): Promise<{
        tripId: any;
        containerId: any;
        containerNumber: any;
        route: any;
        originPoint: any;
        destinationPoint: any;
        tripStatus: any;
        dispatchStatus: any;
        eta: any;
        actualDeparture: any;
        actualArrival: any;
        currentCheckpoint: any;
        gpsStatus: any;
        issueStatus: any;
        truckPlate: any;
        trailerPlate: any;
    } | {
        driverId: any;
        driverName: any;
        driverPhone: any;
        driverType: any;
        vehicleId: any;
        partnerId: any;
        tripId: any;
        containerId: any;
        containerNumber: any;
        route: any;
        originPoint: any;
        destinationPoint: any;
        tripStatus: any;
        dispatchStatus: any;
        eta: any;
        actualDeparture: any;
        actualArrival: any;
        currentCheckpoint: any;
        gpsStatus: any;
        issueStatus: any;
        truckPlate: any;
        trailerPlate: any;
    }>;
    listMilestones(actor: CorridorActorContext, shipmentIdOrRef: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    createMilestone(actor: CorridorActorContext, shipmentIdOrRef: string, body: Record<string, any>): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
    listExceptions(actor: CorridorActorContext, shipmentIdOrRef: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    createException(actor: CorridorActorContext, shipmentIdOrRef: string, body: Record<string, any>): Promise<any>;
    updateException(actor: CorridorActorContext, shipmentIdOrRef: string, exceptionId: string, body: Record<string, any>): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
    performShipmentAction(actor: CorridorActorContext, shipmentIdOrRef: string, action: string, body?: Record<string, any>): Promise<any>;
    performTripAction(actor: CorridorActorContext, tripId: string, action: string, body?: Record<string, any>): Promise<any>;
    getShipments(actor?: CorridorActorContext): Promise<{
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
    getShipment(shipmentRef: string, actor?: CorridorActorContext): Promise<Record<string, any>>;
    getCustomerPortal(actor?: CorridorActorContext): Promise<CorridorCustomerPortalPayload>;
    getDriverTransitPack(actor?: CorridorActorContext): Promise<CorridorDriverTransitPack | null>;
    syncManualDispatchTrip(actor: CorridorActorContext, body: Record<string, any>): Promise<{
        success: boolean;
        shipmentId: string;
        shipmentRef: string;
        tripId: string;
    }>;
    getWorkspace(workspace: CorridorWorkspaceKey, actor?: CorridorActorContext): Promise<CorridorWorkspacePayload | null>;
    private emitShipmentCommunicationEvent;
    private loadShipmentAggregate;
    private upsertMilestone;
    private refreshShipmentSummary;
    private computeClearanceReadiness;
    private ensureWorkflowNotifications;
}
export declare function corridorActorFromUser(user?: AuthenticatedUser, query?: Record<string, unknown>): CorridorActorContext;
export declare const corridorStageOwnershipRules: import("./corridor.types").CorridorStageOwnershipRule[];
export declare const corridorActionAuthorizationRules: import("./corridor.types").CorridorActionAuthorizationRule[];
