import { AuthenticatedUser } from '../auth/auth.types';
import { CommunicationOrchestratorService } from '../communications/communication-orchestrator.service';
type Channel = 'email' | 'sms' | 'telegram' | 'in_app';
type ChannelSelection = Channel | 'all';
type TemplateType = 'reminder' | 'thank_you' | 'receipt' | 'escalation';
type SendCommunicationBody = {
    paymentId?: string;
    invoiceId?: string;
    channel?: ChannelSelection;
    templateType?: TemplateType;
    recipients?: Partial<Record<Channel, string>>;
    message?: string;
    subject?: string;
    saveAsDraft?: boolean;
};
export declare class PaymentsController {
    private readonly communicationOrchestratorService;
    constructor(communicationOrchestratorService: CommunicationOrchestratorService);
    list(user: AuthenticatedUser): Promise<{
        id: string;
        paymentId: string | null;
        invoiceId: string;
        paymentCode: any;
        invoiceCode: any;
        customerName: any;
        amount: number;
        outstandingAmount: number;
        paymentStatus: any;
        invoiceStatus: any;
        routeName: any;
        paymentDate: any;
        dueDate: any;
        contactPerson: any;
        recipients: {
            email: string;
            sms: string;
            telegram: string;
            in_app: string;
        };
        lastContact: any;
        channel: any;
        communicationStatus: any;
        lastTemplateType: any;
        lastMessagePreview: any;
        historyCount: number;
        availableActions: {
            sendReminder: boolean;
            sendThankYou: boolean;
            sendReceipt: boolean;
        };
    }[]>;
    workspace(user: AuthenticatedUser): Promise<{
        rows: {
            id: string;
            paymentId: string | null;
            invoiceId: string;
            paymentCode: any;
            invoiceCode: any;
            customerName: any;
            amount: number;
            outstandingAmount: number;
            paymentStatus: any;
            invoiceStatus: any;
            routeName: any;
            paymentDate: any;
            dueDate: any;
            contactPerson: any;
            recipients: {
                email: string;
                sms: string;
                telegram: string;
                in_app: string;
            };
            lastContact: any;
            channel: any;
            communicationStatus: any;
            lastTemplateType: any;
            lastMessagePreview: any;
            historyCount: number;
            availableActions: {
                sendReminder: boolean;
                sendThankYou: boolean;
                sendReceipt: boolean;
            };
        }[];
        communicationSummary: {
            messagesSentToday: number;
            pendingFollowUp: number;
            overdueReminders: number;
            thankYouMessagesSent: number;
        };
    }>;
    historyByReference(user: AuthenticatedUser, paymentId?: string, invoiceId?: string): Promise<{
        id: string;
        paymentId: string | null;
        invoiceId: string | null;
        customerId: string | null;
        customerName: any;
        channel: any;
        templateType: any;
        recipient: any;
        subject: any;
        message: any;
        status: any;
        sentAt: any;
        sentBy: any;
        providerResponse: any;
        retryCount: number;
    }[]>;
    historyByPayment(user: AuthenticatedUser, paymentId: string): Promise<{
        id: string;
        paymentId: string | null;
        invoiceId: string | null;
        customerId: string | null;
        customerName: any;
        channel: any;
        templateType: any;
        recipient: any;
        subject: any;
        message: any;
        status: any;
        sentAt: any;
        sentBy: any;
        providerResponse: any;
        retryCount: number;
    }[]>;
    sendCommunication(user: AuthenticatedUser, body: SendCommunicationBody): Promise<{
        records: {
            id: string;
            paymentId: string | null;
            invoiceId: string | null;
            customerId: string | null;
            customerName: any;
            channel: any;
            templateType: any;
            recipient: any;
            subject: any;
            message: any;
            status: any;
            sentAt: any;
            sentBy: any;
            providerResponse: any;
            retryCount: number;
        }[];
        row: {
            id: string;
            paymentId: string | null;
            invoiceId: string;
            paymentCode: any;
            invoiceCode: any;
            customerName: any;
            amount: number;
            outstandingAmount: number;
            paymentStatus: any;
            invoiceStatus: any;
            routeName: any;
            paymentDate: any;
            dueDate: any;
            contactPerson: any;
            recipients: {
                email: string;
                sms: string;
                telegram: string;
                in_app: string;
            };
            lastContact: any;
            channel: any;
            communicationStatus: any;
            lastTemplateType: any;
            lastMessagePreview: any;
            historyCount: number;
            availableActions: {
                sendReminder: boolean;
                sendThankYou: boolean;
                sendReceipt: boolean;
            };
        } | null;
    }>;
    my(user: AuthenticatedUser): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    pay(user: AuthenticatedUser, body: {
        invoiceId?: string;
        amount?: number;
    }): Promise<any>;
    private buildPaymentsWorkspace;
}
export {};
