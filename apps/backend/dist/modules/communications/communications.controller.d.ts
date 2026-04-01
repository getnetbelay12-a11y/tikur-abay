import { AuthenticatedUser } from '../auth/auth.types';
import { CommunicationOrchestratorService } from './communication-orchestrator.service';
export declare class CommunicationsController {
    private readonly communicationOrchestratorService;
    constructor(communicationOrchestratorService: CommunicationOrchestratorService);
    send(user: AuthenticatedUser, body: Record<string, unknown>): Promise<any>;
    directSend(user: AuthenticatedUser, body: Record<string, unknown>): Promise<{
        records: {
            id: string;
            communicationLogId: any;
            entityType: any;
            entityId: any;
            shipmentId: any;
            tripId: any;
            channel: any;
            templateKey: any;
            language: any;
            recipientType: any;
            recipientName: any;
            recipientAddress: any;
            subject: any;
            messageBody: any;
            status: any;
            sendMode: any;
            scheduledFor: any;
            sentAt: any;
            failedAt: any;
            errorMessage: any;
            providerMessageId: any;
            metadata: any;
            createdAt: any;
            updatedAt: any;
        }[];
    }>;
    saveDraft(user: AuthenticatedUser, body: Record<string, unknown>): Promise<any>;
    schedule(user: AuthenticatedUser, body: Record<string, unknown>): Promise<{
        draft: any;
        records: {
            log: {
                id: string;
                communicationLogId: any;
                entityType: any;
                entityId: any;
                shipmentId: any;
                tripId: any;
                channel: any;
                templateKey: any;
                language: any;
                recipientType: any;
                recipientName: any;
                recipientAddress: any;
                subject: any;
                messageBody: any;
                status: any;
                sendMode: any;
                scheduledFor: any;
                sentAt: any;
                failedAt: any;
                errorMessage: any;
                providerMessageId: any;
                metadata: any;
                createdAt: any;
                updatedAt: any;
            };
            schedule: any;
        }[];
    }>;
    history(user: AuthenticatedUser, entityType: string, entityId: string, shipmentId?: string, tripId?: string, status?: string, channel?: string, page?: string, pageSize?: string): Promise<{
        history: {
            id: string;
            communicationLogId: any;
            entityType: any;
            entityId: any;
            shipmentId: any;
            tripId: any;
            channel: any;
            templateKey: any;
            language: any;
            recipientType: any;
            recipientName: any;
            recipientAddress: any;
            subject: any;
            messageBody: any;
            status: any;
            sendMode: any;
            scheduledFor: any;
            sentAt: any;
            failedAt: any;
            errorMessage: any;
            providerMessageId: any;
            metadata: any;
            createdAt: any;
            updatedAt: any;
        }[];
        page: number;
        total: number;
        hasMore: boolean;
    }>;
    templates(entityType?: string, channel?: string, language?: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    drafts(user: AuthenticatedUser, entityType?: string, entityId?: string, shipmentId?: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    schedules(user: AuthenticatedUser, entityType?: string, entityId?: string, status?: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    automationRules(entityType?: string, triggerType?: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    preview(user: AuthenticatedUser, body: Record<string, unknown>): Promise<{
        renderedSubject: string;
        renderedBody: string;
        resolvedRecipients: {
            email: any;
            sms: any;
            telegram: string;
            in_app: string;
        } | {
            in_app: string;
            email: any;
            sms: any;
            telegram: string;
        } | {
            email: string;
            sms: string;
            telegram: string;
            in_app: string;
        } | {
            email: any;
            sms: any;
            telegram: string;
            in_app: string;
        } | {
            email: any;
            sms: any;
            telegram: string;
            in_app: string;
        };
        missingVariableWarnings: string[];
        context: {
            entityType: any;
            entityId: any;
            shipmentId: any;
            tripId: any;
            title: any;
            subtitle: any;
            category: any;
            status: any;
            recipients: any;
            fields: any;
            defaultTemplate: any;
            defaultChannels: any;
            actionRoute: any;
            actionLabel: any;
        };
        channelBodies: any;
    }>;
    retry(user: AuthenticatedUser, communicationLogId: string): Promise<any>;
    cancel(user: AuthenticatedUser, communicationLogId: string): Promise<{
        id: string;
        communicationLogId: any;
        entityType: any;
        entityId: any;
        shipmentId: any;
        tripId: any;
        channel: any;
        templateKey: any;
        language: any;
        recipientType: any;
        recipientName: any;
        recipientAddress: any;
        subject: any;
        messageBody: any;
        status: any;
        sendMode: any;
        scheduledFor: any;
        sentAt: any;
        failedAt: any;
        errorMessage: any;
        providerMessageId: any;
        metadata: any;
        createdAt: any;
        updatedAt: any;
    }>;
    emitEvent(user: AuthenticatedUser, body: Record<string, unknown>): Promise<any>;
}
