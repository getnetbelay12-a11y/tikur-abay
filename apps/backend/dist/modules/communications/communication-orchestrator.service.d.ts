import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EmailService } from './email.service';
import { InAppNotificationService } from './in-app-notification.service';
import { SmsService } from './sms.service';
import { TelegramService } from './telegram.service';
export declare class CommunicationOrchestratorService implements OnModuleInit, OnModuleDestroy {
    private readonly emailService;
    private readonly smsService;
    private readonly telegramService;
    private readonly inAppNotificationService;
    private readonly logger;
    private timer;
    constructor(emailService: EmailService, smsService: SmsService, telegramService: TelegramService, inAppNotificationService: InAppNotificationService);
    onModuleInit(): Promise<void>;
    private initializeAutomation;
    onModuleDestroy(): void;
    send(body: Record<string, any>, user?: Record<string, any>): Promise<any>;
    sendDirect(body: Record<string, any>, user?: Record<string, any>): Promise<{
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
    saveDraft(body: Record<string, any>, user?: Record<string, any>): Promise<any>;
    schedule(body: Record<string, any>, user?: Record<string, any>): Promise<{
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
    retry(logId: string, user?: Record<string, any>): Promise<any>;
    cancel(logId: string, _user?: Record<string, any>): Promise<{
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
    history(query: Record<string, any>, _user?: Record<string, any>): Promise<{
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
    listDrafts(query: Record<string, any>): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    listSchedules(query: Record<string, any>): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    templates(query: Record<string, any>): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    automationRules(query?: Record<string, any>): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    preview(body: Record<string, any>): Promise<{
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
    emitEvent(body: Record<string, any>, user?: Record<string, any>): Promise<any>;
    triggerAutomationEvent(triggerType: string, body: Record<string, any>, user?: Record<string, any>): Promise<any>;
    private runSweep;
    private processScheduledCommunications;
    private processQueuedEvents;
    private processEvent;
    private runAutomationScans;
    private scanInvoices;
    private scanPayments;
    private scanTripDelays;
    private scanCheckpointHolds;
    private scanInlandArrivals;
    private scanPodUploads;
    private scanEmptyReturnOverdue;
    private scanKycPending;
    private ensureEvent;
    private createLog;
    private renderTemplate;
    private dispatch;
    private ensureTemplates;
    private ensureAutomationRules;
    private resolveContext;
    private mapContext;
    private mapLog;
}
