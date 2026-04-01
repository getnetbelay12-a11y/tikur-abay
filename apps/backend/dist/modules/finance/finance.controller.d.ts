import { AuthenticatedUser } from '../auth/auth.types';
export declare class FinanceController {
    unpaidInvoices(user: AuthenticatedUser): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    workspace(user: AuthenticatedUser): Promise<{
        kpis: {
            revenueMtd: number;
            outstandingInvoices: number;
            overdueInvoices: number;
            paymentsToday: number;
            collectionsRequiringFollowUp: number;
            payoutsDue: number;
        };
        outstandingInvoices: {
            id: string;
            invoiceCode: any;
            customerName: any;
            routeName: any;
            outstandingAmount: number;
            totalAmount: number;
            status: any;
            dueDate: any;
            tripCode: any;
            contactPerson: any;
            contactPhone: any;
        }[];
        recentPayments: {
            id: string;
            paymentCode: any;
            customerCode: any;
            amount: number;
            status: any;
            routeName: any;
            paymentDate: any;
        }[];
        collectionsQueue: {
            id: string;
            taskCode: any;
            customerName: any;
            assignedOwner: any;
            escalationLevel: any;
            balance: number;
            reminderCount: number;
            status: any;
            dueDate: any;
            lastFollowUpAt: any;
        }[];
        routeProfitability: {
            route: string;
            revenue: number;
            directCost: number;
            margin: number;
            invoiceCount: number;
        }[];
        salarySummary: {
            role: string;
            headcount: number;
            payoutDue: number;
            commissionDue: number;
        }[];
    }>;
}
