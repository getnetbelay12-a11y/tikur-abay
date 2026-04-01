import type { AuthenticatedUser } from '../auth/auth.types';
import { ImportSettlementService } from './import-settlement.service';
export declare class ImportSettlementController {
    private readonly importSettlementService;
    constructor(importSettlementService: ImportSettlementService);
    queue(user: AuthenticatedUser, query: Record<string, any>): Promise<{
        shipmentId: any;
        shipmentRef: any;
        bookingNumber: any;
        customerName: any;
        lcReference: any;
        financeStatus: any;
        releaseStatus: any;
        dryPortStatus: any;
        interchangeStatus: any;
        totalInvoiced: number;
        totalPaid: number;
        balanceDue: number;
        financialClearanceStatus: any;
        latestReleaseMode: any;
        pendingDriverClaims: number;
        updatedAt: any;
    }[]>;
    workspace(user: AuthenticatedUser, shipmentId: string): Promise<{
        shipment: {
            shipmentId: any;
            shipmentRef: any;
            bookingNumber: any;
            customerName: any;
            lcReference: any;
            status: any;
            financeStatus: any;
            releaseStatus: any;
            dryPortStatus: any;
            interchangeStatus: any;
            totalInvoiced: number;
            totalPaid: number;
            balanceDue: number;
            financialClearanceAt: any;
            releasedAt: any;
        };
        bankDocuments: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        invoices: any[];
        paymentReceipts: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        financeVerifications: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        officialReceipts: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        financialClearance: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[] | (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }) | null;
        releaseAuthorization: import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        };
        dryPortRelease: import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        };
        containerInterchanges: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        driverExpenseClaims: any[];
        documentPack: {
            id: string;
            title: any;
            fileName: any;
            category: any;
            documentType: any;
            referenceNo: any;
            createdAt: any;
            fileUrl: any;
            status: any;
            uploadedBy: any;
        }[];
        timeline: {
            type: string;
            at: any;
            title: any;
            code: any;
            note: any;
            visibilityScope: any;
        }[];
        approvals: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        readiness: {
            totalInvoiced: number;
            totalVerified: number;
            balanceDue: number;
            blockedReason: any;
            readyForRelease: boolean;
        };
    }>;
    createBankDocument(user: AuthenticatedUser, shipmentId: string, body: Record<string, any>): Promise<any>;
    reviewBankDocument(user: AuthenticatedUser, bankDocumentId: string, body: Record<string, any>): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })>;
    createInvoice(user: AuthenticatedUser, shipmentId: string, body: Record<string, any>): Promise<{
        shipment: {
            shipmentId: any;
            shipmentRef: any;
            bookingNumber: any;
            customerName: any;
            lcReference: any;
            status: any;
            financeStatus: any;
            releaseStatus: any;
            dryPortStatus: any;
            interchangeStatus: any;
            totalInvoiced: number;
            totalPaid: number;
            balanceDue: number;
            financialClearanceAt: any;
            releasedAt: any;
        };
        bankDocuments: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        invoices: any[];
        paymentReceipts: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        financeVerifications: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        officialReceipts: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        financialClearance: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[] | (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }) | null;
        releaseAuthorization: import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        };
        dryPortRelease: import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        };
        containerInterchanges: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        driverExpenseClaims: any[];
        documentPack: {
            id: string;
            title: any;
            fileName: any;
            category: any;
            documentType: any;
            referenceNo: any;
            createdAt: any;
            fileUrl: any;
            status: any;
            uploadedBy: any;
        }[];
        timeline: {
            type: string;
            at: any;
            title: any;
            code: any;
            note: any;
            visibilityScope: any;
        }[];
        approvals: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        readiness: {
            totalInvoiced: number;
            totalVerified: number;
            balanceDue: number;
            blockedReason: any;
            readyForRelease: boolean;
        };
    }>;
    updateInvoice(user: AuthenticatedUser, invoiceId: string, body: Record<string, any>): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
    createPaymentReceipt(user: AuthenticatedUser, shipmentId: string, body: Record<string, any>): Promise<any>;
    verifyPaymentReceipt(user: AuthenticatedUser, receiptId: string, body: Record<string, any>): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
    issueOfficialReceipt(user: AuthenticatedUser, shipmentId: string, body: Record<string, any>): Promise<any>;
    approveFinancialClearance(user: AuthenticatedUser, shipmentId: string, body: Record<string, any>): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
    createReleaseAuthorization(user: AuthenticatedUser, shipmentId: string, body: Record<string, any>): Promise<any>;
    confirmDryPortRelease(user: AuthenticatedUser, shipmentId: string, body: Record<string, any>): Promise<any>;
    createInterchange(user: AuthenticatedUser, shipmentId: string, body: Record<string, any>): Promise<any>;
    createDriverExpenseClaim(user: AuthenticatedUser, shipmentId: string, body: Record<string, any>): Promise<{
        shipment: {
            shipmentId: any;
            shipmentRef: any;
            bookingNumber: any;
            customerName: any;
            lcReference: any;
            status: any;
            financeStatus: any;
            releaseStatus: any;
            dryPortStatus: any;
            interchangeStatus: any;
            totalInvoiced: number;
            totalPaid: number;
            balanceDue: number;
            financialClearanceAt: any;
            releasedAt: any;
        };
        bankDocuments: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        invoices: any[];
        paymentReceipts: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        financeVerifications: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        officialReceipts: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        financialClearance: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[] | (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }) | null;
        releaseAuthorization: import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        };
        dryPortRelease: import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        };
        containerInterchanges: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        driverExpenseClaims: any[];
        documentPack: {
            id: string;
            title: any;
            fileName: any;
            category: any;
            documentType: any;
            referenceNo: any;
            createdAt: any;
            fileUrl: any;
            status: any;
            uploadedBy: any;
        }[];
        timeline: {
            type: string;
            at: any;
            title: any;
            code: any;
            note: any;
            visibilityScope: any;
        }[];
        approvals: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        readiness: {
            totalInvoiced: number;
            totalVerified: number;
            balanceDue: number;
            blockedReason: any;
            readyForRelease: boolean;
        };
    }>;
    reviewDriverExpenseClaim(user: AuthenticatedUser, claimId: string, body: Record<string, any>): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
    reimburseDriverExpenseClaim(user: AuthenticatedUser, claimId: string, body: Record<string, any>): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
    financeDashboard(user: AuthenticatedUser): Promise<{
        awaitingReceiptVerification: number;
        partiallyPaidShipments: number;
        releaseBlockedByFinance: number;
        reimbursableDriverClaimsPending: number;
        totalInvoiced: number;
        totalCollected: number;
        totalOutstanding: number;
    }>;
    operationsDashboard(user: AuthenticatedUser): Promise<{
        awaitingBankDocReview: number;
        awaitingInvoicePreparation: number;
        readyForRelease: number;
        releasedToday: number;
        pendingDryPortConfirmation: number;
        pendingInterchangeClosure: number;
    }>;
    reimbursementDashboard(user: AuthenticatedUser): Promise<{
        submittedClaims: number;
        underReview: number;
        approvedAwaitingPayment: number;
        reimbursedThisWeek: number;
    }>;
}
