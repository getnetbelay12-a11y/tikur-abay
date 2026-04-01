import { AuthenticatedUser } from '../auth/auth.types';
import { CorridorService } from './corridor.service';
export declare class ShipmentsController {
    private readonly corridorService;
    constructor(corridorService: CorridorService);
    listShipments(user: AuthenticatedUser | undefined, query: Record<string, unknown>): Promise<{
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
    getShipment(user: AuthenticatedUser | undefined, shipmentId: string, query: Record<string, unknown>): Promise<Record<string, any>>;
    getShipmentAlias(user: AuthenticatedUser | undefined, shipmentId: string, query: Record<string, unknown>): Promise<Record<string, any>>;
    listCargoItems(user: AuthenticatedUser | undefined, shipmentId: string, query: Record<string, unknown>): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    createCargoItem(user: AuthenticatedUser | undefined, shipmentId: string, body: Record<string, unknown>, query: Record<string, unknown>): Promise<any>;
    updateCargoItem(user: AuthenticatedUser | undefined, shipmentId: string, cargoItemId: string, body: Record<string, unknown>, query: Record<string, unknown>): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
    deleteCargoItem(user: AuthenticatedUser | undefined, shipmentId: string, cargoItemId: string, query: Record<string, unknown>): Promise<{
        success: boolean;
    }>;
    listDocuments(user: AuthenticatedUser | undefined, shipmentId: string, query: Record<string, unknown>): Promise<{
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
    listDocumentsAlias(user: AuthenticatedUser | undefined, shipmentId: string, query: Record<string, unknown>): Promise<{
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
    createDocument(user: AuthenticatedUser | undefined, shipmentId: string, body: Record<string, unknown>, query: Record<string, unknown>): Promise<any>;
    updateDocument(user: AuthenticatedUser | undefined, shipmentId: string, shipmentDocumentId: string, body: Record<string, unknown>, query: Record<string, unknown>): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
    documentAccessLog(user: AuthenticatedUser | undefined, shipmentId: string, query: Record<string, unknown>): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    logDocumentAccess(user: AuthenticatedUser | undefined, shipmentId: string, shipmentDocumentId: string, body: Record<string, unknown>, query: Record<string, unknown>): Promise<any>;
    bulkDownloadDocuments(user: AuthenticatedUser | undefined, shipmentId: string, body: Record<string, unknown>, query: Record<string, unknown>): Promise<{
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
    checkClearanceReadiness(user: AuthenticatedUser | undefined, shipmentId: string, query: Record<string, unknown>): Promise<{
        ready: any;
        missingItems: any;
        missingFields: any;
        blockingReasons: any;
        workflowState: any;
        financeApproved: any;
        releaseReady: any;
    }>;
    getTracking(user: AuthenticatedUser | undefined, shipmentId: string, query: Record<string, unknown>): Promise<{
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
    generateClearancePack(user: AuthenticatedUser | undefined, shipmentId: string, body: Record<string, unknown>, query: Record<string, unknown>): Promise<{
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
    approveFinanceClearance(user: AuthenticatedUser | undefined, shipmentId: string, body: Record<string, unknown>, query: Record<string, unknown>): Promise<{
        success: boolean;
    }>;
    signDocument(user: AuthenticatedUser | undefined, shipmentId: string, shipmentDocumentId: string, body: Record<string, unknown>, query: Record<string, unknown>): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
    createQuote(body: Record<string, unknown>): Promise<{
        quoteId: string;
        quoteCode: string;
        pricing: {
            transportPrice: number;
            clearanceEstimate: number;
            serviceFee: number;
            total: number;
        };
    }>;
    createBooking(body: Record<string, unknown>): Promise<{
        bookingId: string;
        bookingCode: string;
        shipmentId: string;
        shipmentRef: string;
    }>;
    verifyDocument(body: Record<string, unknown>): Promise<{
        valid: boolean;
        status: any;
        shipmentNumber: any;
        customerName: any;
        documentType: any;
        issueDate: any;
        verificationUrl: any;
    }>;
    listContainers(user: AuthenticatedUser | undefined, shipmentId: string, query: Record<string, unknown>): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    updateContainer(user: AuthenticatedUser | undefined, shipmentId: string, containerId: string, body: Record<string, unknown>, query: Record<string, unknown>): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
    listTrips(user: AuthenticatedUser | undefined, shipmentId: string, query: Record<string, unknown>): Promise<({
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
    createTrip(user: AuthenticatedUser | undefined, shipmentId: string, body: Record<string, unknown>, query: Record<string, unknown>): Promise<any>;
    updateTrip(user: AuthenticatedUser | undefined, tripId: string, body: Record<string, unknown>, query: Record<string, unknown>): Promise<{
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
    syncManualDispatchTrip(user: AuthenticatedUser | undefined, body: Record<string, unknown>, query: Record<string, unknown>): Promise<{
        success: boolean;
        shipmentId: string;
        shipmentRef: string;
        tripId: string;
    }>;
    listMilestones(user: AuthenticatedUser | undefined, shipmentId: string, query: Record<string, unknown>): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    createMilestone(user: AuthenticatedUser | undefined, shipmentId: string, body: Record<string, unknown>, query: Record<string, unknown>): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
    listExceptions(user: AuthenticatedUser | undefined, shipmentId: string, query: Record<string, unknown>): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    createException(user: AuthenticatedUser | undefined, shipmentId: string, body: Record<string, unknown>, query: Record<string, unknown>): Promise<any>;
    updateException(user: AuthenticatedUser | undefined, shipmentId: string, exceptionId: string, body: Record<string, unknown>, query: Record<string, unknown>): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
    shipmentAction(user: AuthenticatedUser | undefined, shipmentId: string, action: string, body: Record<string, unknown>, query: Record<string, unknown>): Promise<any>;
    tripAction(user: AuthenticatedUser | undefined, tripId: string, action: string, body: Record<string, unknown>, query: Record<string, unknown>): Promise<any>;
}
