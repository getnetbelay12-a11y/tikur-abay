"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CommunicationOrchestratorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunicationOrchestratorService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("mongoose");
const mongo_1 = require("../../database/mongo");
const models_1 = require("../../database/models");
const corridor_shipment_materializer_1 = require("../corridor/corridor-shipment-materializer");
const email_service_1 = require("./email.service");
const in_app_notification_service_1 = require("./in-app-notification.service");
const sms_service_1 = require("./sms.service");
const telegram_service_1 = require("./telegram.service");
const AUTOMATION_INTERVAL_MS = 5 * 60_000;
const PAGE_SIZE = 20;
let CommunicationOrchestratorService = CommunicationOrchestratorService_1 = class CommunicationOrchestratorService {
    constructor(emailService, smsService, telegramService, inAppNotificationService) {
        this.emailService = emailService;
        this.smsService = smsService;
        this.telegramService = telegramService;
        this.inAppNotificationService = inAppNotificationService;
        this.logger = new common_1.Logger(CommunicationOrchestratorService_1.name);
        this.timer = null;
    }
    async onModuleInit() {
        setTimeout(() => {
            void this.initializeAutomation();
        }, 100);
        this.timer = setInterval(() => void this.runSweep(), AUTOMATION_INTERVAL_MS);
    }
    async initializeAutomation() {
        try {
            await (0, mongo_1.connectToDatabase)();
            await this.ensureTemplates();
            await this.ensureAutomationRules();
        }
        catch (error) {
            this.logger.error(`Communication automation bootstrap failed: ${error.message}`);
        }
    }
    onModuleDestroy() {
        if (this.timer)
            clearInterval(this.timer);
    }
    async send(body, user = {}) {
        const mode = normalizeSendMode(body.sendMode);
        if (mode === 'draft')
            return this.saveDraft(body, user);
        if (mode === 'scheduled')
            return this.schedule(body, user);
        const context = await this.resolveContext(body.entityType, body.entityId);
        const channels = normalizeChannels(body.channels?.length ? body.channels : context.defaultChannels);
        const language = normalizeLanguage(body.language || context.language || 'en');
        const templateKey = body.templateKey || context.defaultTemplate || 'custom_message';
        const rendered = await this.renderTemplate({
            entityType: context.templateEntityType || context.entityType,
            entityId: context.entityId,
            language,
            templateKey,
            subject: body.subject,
            body: body.messageBody,
            context,
        });
        const records = [];
        for (const channel of channels) {
            const recipient = String(body.recipientOverrides?.[channel] || context.recipients?.[channel] || '').trim();
            if (!recipient)
                continue;
            const subject = channel === 'email' ? (body.subject || rendered.subject) : '';
            const messageBody = rendered.channelBodies[channel] || rendered.body;
            const baseLog = await this.createLog({
                communicationLogId: `COM-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                entityType: context.entityType,
                entityId: context.entityId,
                shipmentId: context.shipmentId,
                tripId: context.tripId,
                customerId: context.customerId,
                driverId: context.driverId,
                recipientType: context.recipientType,
                recipientName: context.recipientName,
                recipientAddress: recipient,
                recipient,
                channel,
                templateKey,
                language,
                subject,
                messageBody,
                status: 'queued',
                sendMode: mode,
                sentByUserId: user.id || user.email || 'system',
                metadata: {
                    category: context.category,
                    simulated: true,
                    variables: rendered.tokens,
                },
            });
            const result = await this.dispatch(channel, {
                recipient,
                subject,
                body: messageBody,
                entityType: context.entityType,
                entityId: context.entityId,
                shipmentId: context.shipmentId,
                tripId: context.tripId,
                actionRoute: context.actionRoute,
                actionLabel: context.actionLabel,
                title: subject || context.title,
                category: context.category,
            });
            const updated = await models_1.CommunicationLogModel.findOneAndUpdate({ _id: baseLog._id }, {
                $set: {
                    status: result.status === 'sent' ? 'sent' : 'failed',
                    sentAt: result.status === 'sent' ? new Date() : undefined,
                    failedAt: result.status === 'failed' ? new Date() : undefined,
                    errorMessage: result.status === 'failed' ? result.providerMessage : '',
                    providerMessageId: result.providerMessageId,
                    metadata: {
                        ...(baseLog.metadata || {}),
                        simulated: Boolean(result.simulated),
                        providerMessage: result.providerMessage,
                    },
                },
            }, { new: true }).lean();
            records.push(this.mapLog(updated));
        }
        return {
            entity: this.mapContext(context),
            records,
        };
    }
    async sendDirect(body, user = {}) {
        await (0, mongo_1.connectToDatabase)();
        const channels = normalizeChannels(body.channels?.length ? body.channels : ['email']);
        const entityType = String(body.entityType || 'custom');
        const entityId = String(body.entityId || body.communicationId || `custom-${Date.now()}`);
        const subject = String(body.subject || 'Tikur Abay quote');
        const attachments = Array.isArray(body.attachments) ? body.attachments : [];
        const records = [];
        for (const channel of channels) {
            const recipient = String(body.recipientOverrides?.[channel] || '').trim();
            if (!recipient)
                continue;
            const messageBody = String(body.messageBody || '').trim();
            const channelBody = channel === 'telegram' && attachments[0]?.attachmentUrl
                ? `${messageBody}\n\nQuote PDF: ${attachments[0].attachmentUrl}`
                : messageBody;
            const baseLog = await this.createLog({
                communicationLogId: `COM-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                entityType,
                entityId,
                recipientType: body.recipientType || 'customer',
                recipientName: body.recipientName || body.customerName || 'Customer',
                recipientAddress: recipient,
                recipient,
                channel,
                templateKey: body.templateKey || 'custom_message',
                language: normalizeLanguage(body.language || 'en'),
                subject: channel === 'email' ? subject : '',
                messageBody: channelBody,
                status: 'queued',
                sendMode: 'now',
                sentByUserId: user.id || user.email || 'system',
                metadata: {
                    category: body.category || 'custom',
                    simulated: true,
                    attachments,
                },
            });
            const result = await this.dispatch(channel, {
                recipient,
                subject,
                body: channelBody,
                entityType,
                entityId,
                title: subject,
                category: body.category || 'custom',
                attachments,
            });
            const updated = await models_1.CommunicationLogModel.findOneAndUpdate({ _id: baseLog._id }, {
                $set: {
                    status: result.status === 'sent' ? 'sent' : 'failed',
                    sentAt: result.status === 'sent' ? new Date() : undefined,
                    failedAt: result.status === 'failed' ? new Date() : undefined,
                    errorMessage: result.status === 'failed' ? result.providerMessage : '',
                    providerMessageId: result.providerMessageId,
                    metadata: {
                        ...(baseLog.metadata || {}),
                        simulated: Boolean(result.simulated),
                        providerMessage: result.providerMessage,
                        attachments,
                    },
                },
            }, { new: true }).lean();
            records.push(this.mapLog(updated));
        }
        return { records };
    }
    async saveDraft(body, user = {}) {
        const context = await this.resolveContext(body.entityType, body.entityId);
        const draft = await models_1.CommunicationDraftModel.create({
            communicationDraftId: `DRAFT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            entityType: context.entityType,
            entityId: context.entityId,
            shipmentId: context.shipmentId,
            tripId: context.tripId,
            recipientDraft: body.recipientOverrides || context.recipients,
            channels: normalizeChannels(body.channels?.length ? body.channels : context.defaultChannels),
            templateKey: body.templateKey || context.defaultTemplate || 'custom_message',
            language: normalizeLanguage(body.language || context.language || 'en'),
            subject: body.subject || '',
            messageBody: body.messageBody || '',
            createdByUserId: user.id || user.email || 'system',
        });
        return draft.toObject();
    }
    async schedule(body, user = {}) {
        const draft = body.communicationDraftId
            ? await models_1.CommunicationDraftModel.findOne({ $or: [{ communicationDraftId: body.communicationDraftId }, { _id: body.communicationDraftId }] }).lean()
            : await this.saveDraft(body, user);
        const context = await this.resolveContext(draft.entityType, draft.entityId);
        const scheduleTime = body.scheduledFor ? new Date(body.scheduledFor) : new Date(Date.now() + 60 * 60_000);
        const channels = normalizeChannels(draft.channels || context.defaultChannels);
        const records = [];
        for (const channel of channels) {
            const recipient = String(draft.recipientDraft?.[channel] || context.recipients?.[channel] || '').trim();
            if (!recipient)
                continue;
            const log = await this.createLog({
                communicationLogId: `COM-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                entityType: context.entityType,
                entityId: context.entityId,
                shipmentId: context.shipmentId,
                tripId: context.tripId,
                customerId: context.customerId,
                driverId: context.driverId,
                recipientType: context.recipientType,
                recipientName: context.recipientName,
                recipientAddress: recipient,
                recipient,
                channel,
                templateKey: draft.templateKey,
                language: draft.language,
                subject: channel === 'email' ? draft.subject : '',
                messageBody: draft.messageBody,
                status: 'scheduled',
                sendMode: 'scheduled',
                scheduledFor: scheduleTime,
                sentByUserId: user.id || user.email || draft.createdByUserId || 'system',
                metadata: { category: context.category, draftId: draft.communicationDraftId },
            });
            const schedule = await models_1.CommunicationScheduleModel.create({
                communicationScheduleId: `SCH-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                communicationLogId: log.communicationLogId,
                communicationDraftId: draft.communicationDraftId,
                entityType: context.entityType,
                entityId: context.entityId,
                scheduleType: 'send',
                scheduledFor: scheduleTime,
                status: 'scheduled',
                createdByUserId: user.id || user.email || draft.createdByUserId || 'system',
            });
            records.push({ log: this.mapLog(log), schedule: schedule.toObject() });
        }
        return { draft, records };
    }
    async retry(logId, user = {}) {
        await (0, mongo_1.connectToDatabase)();
        const logClauses = [{ communicationLogId: logId }];
        if (mongoose_1.Types.ObjectId.isValid(logId)) {
            logClauses.push({ _id: new mongoose_1.Types.ObjectId(logId) });
        }
        const log = await models_1.CommunicationLogModel.findOne({ $or: logClauses }).lean();
        if (!log)
            throw new common_1.BadRequestException('Communication log not found');
        if (!['failed', 'scheduled', 'queued'].includes(String(log.status))) {
            throw new common_1.BadRequestException('Only failed, queued, or scheduled logs can be retried');
        }
        return this.send({
            entityType: log.entityType,
            entityId: log.entityId,
            channels: [log.channel],
            templateKey: log.templateKey,
            language: log.language,
            recipientOverrides: { [log.channel]: log.recipientAddress || log.recipient },
            subject: log.subject,
            messageBody: log.messageBody,
            sendMode: 'now',
        }, user);
    }
    async cancel(logId, _user = {}) {
        await (0, mongo_1.connectToDatabase)();
        const logClauses = [{ communicationLogId: logId }];
        if (mongoose_1.Types.ObjectId.isValid(logId)) {
            logClauses.push({ _id: new mongoose_1.Types.ObjectId(logId) });
        }
        const log = await models_1.CommunicationLogModel.findOneAndUpdate({ $or: logClauses, status: { $in: ['draft', 'queued', 'scheduled', 'failed'] } }, { $set: { status: 'cancelled', updatedAt: new Date() } }, { new: true }).lean();
        if (!log)
            throw new common_1.BadRequestException('Communication log not found or cannot be cancelled');
        await models_1.CommunicationScheduleModel.updateMany({ communicationLogId: log.communicationLogId, status: { $in: ['scheduled', 'processing'] } }, { $set: { status: 'cancelled', updatedAt: new Date() } });
        return this.mapLog(log);
    }
    async history(query, _user = {}) {
        await (0, mongo_1.connectToDatabase)();
        const filter = {};
        if (query.entityType)
            filter.entityType = query.entityType;
        if (query.entityId)
            filter.entityId = query.entityId;
        if (query.shipmentId)
            filter.shipmentId = query.shipmentId;
        if (query.tripId)
            filter.tripId = query.tripId;
        if (query.status && query.status !== 'all')
            filter.status = query.status;
        if (query.channel && query.channel !== 'all')
            filter.channel = query.channel;
        const page = Math.max(1, Number(query.page || 1));
        const rows = await models_1.CommunicationLogModel.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * PAGE_SIZE)
            .limit(PAGE_SIZE)
            .lean();
        const total = await models_1.CommunicationLogModel.countDocuments(filter);
        return { history: rows.map((row) => this.mapLog(row)), page, total, hasMore: page * PAGE_SIZE < total };
    }
    async listDrafts(query) {
        await (0, mongo_1.connectToDatabase)();
        const filter = {};
        if (query.entityType)
            filter.entityType = query.entityType;
        if (query.entityId)
            filter.entityId = query.entityId;
        if (query.shipmentId)
            filter.shipmentId = query.shipmentId;
        return models_1.CommunicationDraftModel.find(filter).sort({ updatedAt: -1 }).limit(100).lean();
    }
    async listSchedules(query) {
        await (0, mongo_1.connectToDatabase)();
        const filter = {};
        if (query.entityType)
            filter.entityType = query.entityType;
        if (query.entityId)
            filter.entityId = query.entityId;
        if (query.status)
            filter.status = query.status;
        return models_1.CommunicationScheduleModel.find(filter).sort({ scheduledFor: 1 }).limit(100).lean();
    }
    async templates(query) {
        await (0, mongo_1.connectToDatabase)();
        const filter = { isActive: true };
        if (query.entityType)
            filter.entityType = query.entityType;
        if (query.channel)
            filter.channel = query.channel;
        if (query.language)
            filter.language = normalizeLanguage(query.language);
        if (query.category)
            filter.category = query.category;
        return models_1.CommunicationTemplateModel.find(filter).sort({ category: 1, templateKey: 1 }).lean();
    }
    async automationRules(query = {}) {
        await (0, mongo_1.connectToDatabase)();
        const filter = {};
        if (query.entityType)
            filter.entityType = query.entityType;
        if (query.triggerType)
            filter.triggerType = query.triggerType;
        return models_1.CommunicationAutomationRuleModel.find(filter).sort({ entityType: 1, triggerType: 1 }).lean();
    }
    async preview(body) {
        const context = await this.resolveContext(body.entityType, body.entityId);
        const rendered = await this.renderTemplate({
            entityType: context.templateEntityType || context.entityType,
            entityId: context.entityId,
            language: normalizeLanguage(body.language || context.language || 'en'),
            templateKey: body.templateKey || context.defaultTemplate || 'custom_message',
            subject: body.subject,
            body: body.messageBody,
            context,
        });
        return {
            renderedSubject: rendered.subject,
            renderedBody: rendered.body,
            resolvedRecipients: context.recipients,
            missingVariableWarnings: rendered.missingVariables,
            context: rendered.context,
            channelBodies: rendered.channelBodies,
        };
    }
    async emitEvent(body, user = {}) {
        await (0, mongo_1.connectToDatabase)();
        const event = await models_1.NotificationEventModel.create({
            notificationEventId: `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            triggerType: body.triggerType,
            entityType: body.entityType,
            entityId: body.entityId,
            shipmentId: body.shipmentId,
            tripId: body.tripId,
            payload: body.payload || {},
            status: 'queued',
            createdByUserId: user.id || user.email || 'system',
        });
        await this.processEvent(event.toObject());
        return event.toObject();
    }
    async triggerAutomationEvent(triggerType, body, user = {}) {
        return this.emitEvent({ ...body, triggerType }, user);
    }
    async runSweep() {
        try {
            await (0, mongo_1.connectToDatabase)();
            await this.ensureTemplates();
            await this.ensureAutomationRules();
            await this.processScheduledCommunications();
            await this.runAutomationScans();
            await this.processQueuedEvents();
        }
        catch (error) {
            this.logger.error(`communications sweep failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async processScheduledCommunications() {
        const dueSchedules = await models_1.CommunicationScheduleModel.find({
            status: 'scheduled',
            scheduledFor: { $lte: new Date() },
        }).limit(50).lean();
        for (const schedule of dueSchedules) {
            await models_1.CommunicationScheduleModel.updateOne({ _id: schedule._id }, { $set: { status: 'processing' } });
            const log = await models_1.CommunicationLogModel.findOne({ communicationLogId: schedule.communicationLogId }).lean();
            if (!log) {
                await models_1.CommunicationScheduleModel.updateOne({ _id: schedule._id }, { $set: { status: 'failed' } });
                continue;
            }
            const result = await this.dispatch(log.channel, {
                recipient: log.recipientAddress || log.recipient,
                subject: log.subject,
                body: log.messageBody,
                entityType: log.entityType,
                entityId: log.entityId,
                shipmentId: log.shipmentId,
                tripId: log.tripId,
            });
            await models_1.CommunicationLogModel.updateOne({ _id: log._id }, {
                $set: {
                    status: result.status === 'sent' ? 'sent' : 'failed',
                    sentAt: result.status === 'sent' ? new Date() : undefined,
                    failedAt: result.status === 'failed' ? new Date() : undefined,
                    errorMessage: result.status === 'failed' ? result.providerMessage : '',
                    providerMessageId: result.providerMessageId,
                    metadata: {
                        ...(log.metadata || {}),
                        simulated: Boolean(result.simulated),
                        providerMessage: result.providerMessage,
                    },
                },
            });
            await models_1.CommunicationScheduleModel.updateOne({ _id: schedule._id }, { $set: { status: result.status === 'sent' ? 'sent' : 'failed' } });
        }
    }
    async processQueuedEvents() {
        const events = await models_1.NotificationEventModel.find({ status: 'queued' }).sort({ createdAt: 1 }).limit(50).lean();
        for (const event of events) {
            await this.processEvent(event);
        }
    }
    async processEvent(event) {
        const rules = await models_1.CommunicationAutomationRuleModel.find({
            isEnabled: true,
            triggerType: event.triggerType,
            entityType: event.entityType,
        }).lean();
        for (const rule of rules) {
            const channels = normalizeChannels(rule.channels?.length ? rule.channels : [rule.channel]);
            const templateKey = resolveRuleTemplateKey(rule, event);
            await this.send({
                entityType: event.entityType,
                entityId: event.entityId,
                shipmentId: event.shipmentId,
                tripId: event.tripId,
                channels,
                templateKey,
                language: resolveLanguageMode(rule.languageMode, rule.language, event.payload?.language),
                sendMode: 'automated',
            }, { id: event.createdByUserId || 'automation' });
        }
        await models_1.NotificationEventModel.updateOne({ _id: event._id }, { $set: { status: 'processed', processedAt: new Date() } });
    }
    async runAutomationScans() {
        const now = new Date();
        await this.scanInvoices(now);
        await this.scanPayments(now);
        await this.scanTripDelays();
        await this.scanCheckpointHolds();
        await this.scanInlandArrivals();
        await this.scanPodUploads();
        await this.scanEmptyReturnOverdue();
        await this.scanKycPending();
    }
    async scanInvoices(now) {
        const dueSoon = await models_1.InvoiceModel.find({
            status: { $in: ['pending', 'partially_paid', 'overdue'] },
            outstandingAmount: { $gt: 0 },
            dueDate: { $gte: startOfDay(now, 1), $lt: endOfDay(now, 1) },
        }).limit(20).lean();
        for (const invoice of dueSoon) {
            await this.ensureEvent('invoice_due_soon', 'invoice', String(invoice._id), { customerName: invoice.customerName, amount: invoice.outstandingAmount });
        }
        const overdue = await models_1.InvoiceModel.find({
            status: { $in: ['pending', 'partially_paid', 'overdue'] },
            outstandingAmount: { $gt: 0 },
            dueDate: { $lt: startOfDay(now, 0) },
        }).limit(20).lean();
        for (const invoice of overdue) {
            await this.ensureEvent('invoice_overdue', 'invoice', String(invoice._id), { customerName: invoice.customerName, amount: invoice.outstandingAmount });
        }
    }
    async scanPayments(now) {
        const payments = await models_1.PaymentModel.find({ status: 'paid', paymentDate: { $gte: startOfDay(now, -1) } }).limit(20).lean();
        for (const payment of payments) {
            await this.ensureEvent('payment_completed', 'payment', String(payment._id), { amount: payment.amount, customerName: payment.customerName });
        }
    }
    async scanTripDelays() {
        const trips = await models_1.CorridorTripAssignmentModel.find({ tripStatus: { $in: ['delayed', 'checkpoint_hold'] } }).limit(20).lean();
        for (const trip of trips) {
            await this.ensureEvent('trip_delayed', 'trip', trip.tripId, { route: trip.route, tripId: trip.tripId, shipmentId: trip.shipmentId });
        }
    }
    async scanCheckpointHolds() {
        const holds = await models_1.CorridorCheckpointEventModel.find({ eventType: { $in: ['hold', 'inspection'] } }).sort({ eventAt: -1 }).limit(20).lean();
        for (const hold of holds) {
            await this.ensureEvent('checkpoint_hold', 'trip', hold.tripId, {
                shipmentId: hold.shipmentId,
                tripId: hold.tripId,
                checkpoint: hold.checkpointName,
            });
        }
    }
    async scanInlandArrivals() {
        const rows = await models_1.CorridorShipmentModel.find({ currentStage: { $in: ['inland_arrival', 'yard_processing'] }, inlandArrivalReady: true }).limit(20).lean();
        for (const shipment of rows) {
            await this.ensureEvent('inland_arrival_confirmed', 'shipment', shipment.shipmentId, { shipmentId: shipment.shipmentId, bookingNumber: shipment.bookingNumber });
        }
    }
    async scanPodUploads() {
        const docs = await models_1.CorridorDocumentModel.find({ documentType: 'pod', status: { $in: ['uploaded', 'approved'] } }).limit(20).lean();
        for (const doc of docs) {
            await this.ensureEvent('pod_uploaded', 'shipment', doc.shipmentId, { shipmentId: doc.shipmentId, documentType: 'pod' });
        }
    }
    async scanEmptyReturnOverdue() {
        const returns = await models_1.CorridorEmptyReturnModel.find({
            status: { $in: ['empty_released', 'empty_return_in_progress'] },
            emptyReleaseAt: { $lte: startOfDay(new Date(), -2) },
        }).limit(20).lean();
        for (const row of returns) {
            await this.ensureEvent('empty_return_overdue', 'shipment', row.shipmentId, { shipmentId: row.shipmentId, containerNumber: row.containerNumber });
        }
    }
    async scanKycPending() {
        const requests = await models_1.DriverKycRequestModel.find({
            status: { $in: ['submitted', 'under_review', 'draft'] },
            createdAt: { $lte: startOfDay(new Date(), -2) },
        }).limit(20).lean();
        for (const request of requests) {
            await this.ensureEvent('kyc_pending', 'driver_kyc_request', String(request._id), { driverName: request.fullName, status: request.status });
        }
    }
    async ensureEvent(triggerType, entityType, entityId, payload) {
        const existing = await models_1.NotificationEventModel.findOne({
            triggerType,
            entityType,
            entityId,
            createdAt: { $gte: startOfDay(new Date(), 0) },
        }).lean();
        if (existing)
            return;
        await models_1.NotificationEventModel.create({
            notificationEventId: `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            triggerType,
            entityType,
            entityId,
            shipmentId: payload.shipmentId,
            tripId: payload.tripId,
            payload,
            status: 'queued',
            createdByUserId: 'automation',
        });
    }
    async createLog(payload) {
        await (0, mongo_1.connectToDatabase)();
        return models_1.CommunicationLogModel.create(payload);
    }
    async renderTemplate(input) {
        const language = normalizeLanguage(input.language);
        const templateEntityType = input.entityType;
        const rows = await models_1.CommunicationTemplateModel.find({
            templateKey: input.templateKey,
            entityType: templateEntityType,
            language,
            isActive: true,
        }).lean();
        const context = input.context || (await this.resolveContext(input.entityType, input.entityId));
        const tokens = { ...(context.tokens || {}), ...(input.tokens || {}) };
        const subjectTemplate = input.subject || rows.find((item) => item.channel === 'email')?.subjectTemplate || '';
        const defaultBody = input.body || rows[0]?.bodyTemplate || input.body || '';
        const channelBodies = Object.fromEntries(rows.map((row) => [row.channel, interpolateTemplate(row.bodyTemplate || '', tokens)]));
        const missingVariables = collectMissingVariables([
            subjectTemplate,
            defaultBody,
            ...rows.map((row) => row.bodyTemplate || ''),
        ], tokens);
        return {
            subject: interpolateTemplate(subjectTemplate, tokens),
            body: interpolateTemplate(defaultBody, tokens),
            channelBodies,
            tokens,
            variables: rows[0]?.variables || [],
            missingVariables,
            context: this.mapContext(context),
        };
    }
    async dispatch(channel, payload) {
        if (channel === 'email')
            return this.emailService.send({ recipient: payload.recipient, subject: payload.subject, body: payload.body, attachments: payload.attachments });
        if (channel === 'sms')
            return this.smsService.send({ recipient: payload.recipient, body: payload.body });
        if (channel === 'telegram')
            return this.telegramService.send({ recipient: payload.recipient, body: payload.body });
        return this.inAppNotificationService.send({
            recipient: payload.recipient,
            recipientName: payload.recipientName,
            body: payload.body,
            title: payload.title,
            category: payload.category,
            entityType: payload.entityType,
            entityId: payload.entityId,
            shipmentId: payload.shipmentId,
            tripId: payload.tripId,
            actionRoute: payload.actionRoute,
            actionLabel: payload.actionLabel,
        });
    }
    async ensureTemplates() {
        const writes = buildSystemTemplates().map((template) => ({
            updateOne: {
                filter: { templateKey: template.templateKey, channel: template.channel, language: template.language },
                update: { $set: { ...template, isActive: true } },
                upsert: true,
            },
        }));
        if (writes.length)
            await models_1.CommunicationTemplateModel.bulkWrite(writes);
    }
    async ensureAutomationRules() {
        const writes = buildAutomationRules().map((rule) => ({
            updateOne: {
                filter: { triggerType: rule.triggerType, entityType: rule.entityType, templateKey: rule.templateKey, channel: rule.channel },
                update: { $set: rule },
                upsert: true,
            },
        }));
        if (writes.length)
            await models_1.CommunicationAutomationRuleModel.bulkWrite(writes);
    }
    async resolveContext(entityType, entityId) {
        if (!entityType || !entityId)
            throw new common_1.BadRequestException('entityType and entityId are required');
        if (entityType === 'invoice' || entityType === 'payment')
            return resolveFinanceContext(entityType, entityId);
        if (entityType === 'shipment')
            return resolveShipmentContext(entityId);
        if (entityType === 'trip')
            return resolveTripContext(entityId);
        if (entityType === 'driver_kyc_request')
            return resolveKycContext(entityId);
        if (entityType === 'support')
            return resolveSupportContext(entityId);
        throw new common_1.BadRequestException(`Unsupported entity type: ${entityType}`);
    }
    mapContext(context) {
        return {
            entityType: context.entityType,
            entityId: context.entityId,
            shipmentId: context.shipmentId,
            tripId: context.tripId,
            title: context.title,
            subtitle: context.subtitle,
            category: context.category,
            status: context.status,
            recipients: context.recipients,
            fields: context.fields,
            defaultTemplate: context.defaultTemplate,
            defaultChannels: context.defaultChannels,
            actionRoute: context.actionRoute,
            actionLabel: context.actionLabel,
        };
    }
    mapLog(item) {
        return {
            id: String(item._id),
            communicationLogId: item.communicationLogId,
            entityType: item.entityType,
            entityId: item.entityId,
            shipmentId: item.shipmentId || null,
            tripId: item.tripId || null,
            channel: item.channel,
            templateKey: item.templateKey,
            language: item.language,
            recipientType: item.recipientType,
            recipientName: item.recipientName,
            recipientAddress: item.recipientAddress || item.recipient,
            subject: item.subject || '',
            messageBody: item.messageBody || '',
            status: item.status,
            sendMode: item.sendMode,
            scheduledFor: item.scheduledFor || null,
            sentAt: item.sentAt || null,
            failedAt: item.failedAt || null,
            errorMessage: item.errorMessage || '',
            providerMessageId: item.providerMessageId || '',
            metadata: item.metadata || {},
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
        };
    }
};
exports.CommunicationOrchestratorService = CommunicationOrchestratorService;
exports.CommunicationOrchestratorService = CommunicationOrchestratorService = CommunicationOrchestratorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [email_service_1.EmailService,
        sms_service_1.SmsService,
        telegram_service_1.TelegramService,
        in_app_notification_service_1.InAppNotificationService])
], CommunicationOrchestratorService);
async function resolveFinanceContext(entityType, entityId) {
    await (0, mongo_1.connectToDatabase)();
    const payment = entityType === 'payment' ? await models_1.PaymentModel.findById(entityId).lean() : null;
    const invoice = entityType === 'invoice'
        ? await models_1.InvoiceModel.findById(entityId).lean()
        : await models_1.InvoiceModel.findById(payment?.invoiceId).lean();
    if (!invoice)
        throw new common_1.BadRequestException('Invoice not found');
    const recipients = await resolveCustomerRecipients(invoice.customerId, invoice.customerCode, invoice.customerName);
    const amount = Number(payment?.amount || invoice.outstandingAmount || invoice.totalAmount || 0);
    return {
        entityType,
        entityId: entityType === 'payment' ? String(payment?._id || entityId) : String(invoice._id),
        templateEntityType: 'finance',
        category: 'finance',
        title: invoice.invoiceCode || payment?.paymentCode || 'Invoice',
        subtitle: `${invoice.customerName || 'Customer'} · ${formatCurrency(amount)}`,
        status: payment?.status || invoice.status || 'pending',
        customerId: String(invoice.customerCode || invoice.customerId || ''),
        recipientType: 'customer',
        recipientName: invoice.customerName,
        recipients,
        defaultTemplate: payment?.status === 'paid' ? 'payment_thank_you' : String(invoice.status).toLowerCase() === 'overdue' ? 'overdue_invoice_notice' : 'payment_reminder',
        defaultChannels: payment?.status === 'paid' ? ['email', 'in_app'] : ['email', 'sms'],
        actionRoute: '/payments',
        actionLabel: 'Open payments',
        fields: [
            { label: 'Invoice', value: invoice.invoiceCode || 'Invoice' },
            { label: 'Customer', value: invoice.customerName || 'Customer' },
            { label: 'Amount', value: formatCurrency(amount) },
            { label: 'Due', value: formatDate(invoice.dueDate) },
        ],
        tokens: {
            customerName: invoice.customerName || 'Customer',
            companyName: invoice.customerName || 'Customer',
            amount: formatCurrency(amount),
            dueDate: formatDate(invoice.dueDate),
            status: toTitle(payment?.status || invoice.status || 'pending'),
            invoiceId: invoice.invoiceCode || 'Invoice',
            paymentId: payment?.paymentCode || '',
        },
    };
}
async function resolveShipmentContext(entityId) {
    await (0, mongo_1.connectToDatabase)();
    let shipment = await models_1.CorridorShipmentModel.findOne({ $or: [{ shipmentId: entityId }, { shipmentRef: entityId }, { bookingNumber: entityId }] }).lean();
    if (!shipment) {
        shipment = await (0, corridor_shipment_materializer_1.materializeCorridorShipmentFromBooking)(entityId);
    }
    if (!shipment && String(entityId || '').startsWith('SHP-')) {
        const booking = await models_1.BookingModel.findOne({ shipmentRef: entityId }).lean();
        if (booking?.bookingCode) {
            shipment = await (0, corridor_shipment_materializer_1.materializeCorridorShipmentFromBooking)(String(booking.bookingCode));
        }
    }
    if (!shipment)
        throw new common_1.BadRequestException('Shipment not found');
    const recipients = await resolveCustomerRecipients(shipment.customerId, shipment.customerId, shipment.customerName);
    const driverAccess = await models_1.UserModel.findOne({ customerCode: shipment.customerId }).lean();
    return {
        entityType: 'shipment',
        entityId: shipment.shipmentId,
        shipmentId: shipment.shipmentId,
        templateEntityType: 'shipment',
        category: 'shipment',
        title: shipment.bookingNumber || shipment.shipmentRef,
        subtitle: `${shipment.customerName} · ${toTitle(shipment.currentStage)}`,
        status: shipment.status || shipment.shipmentStatus,
        customerId: shipment.customerId,
        recipientType: 'customer',
        recipientName: shipment.customerName,
        recipients: {
            ...recipients,
            in_app: String(driverAccess?._id || recipients.in_app),
        },
        defaultTemplate: shipment.currentStage === 'djibouti_release' ? 'release_ready_notice' : shipment.currentStage === 'delivery_pod' ? 'pod_uploaded_notice' : 'arrival_notice',
        defaultChannels: ['email', 'in_app'],
        actionRoute: '/shipments',
        actionLabel: 'Open shipment',
        fields: [
            { label: 'Booking', value: shipment.bookingNumber || shipment.shipmentRef },
            { label: 'BL', value: shipment.billOfLadingNumber || 'Pending' },
            { label: 'Container', value: shipment.container?.containerNumber || '' },
            { label: 'Stage', value: toTitle(shipment.currentStage || 'booking') },
        ],
        tokens: {
            customerName: shipment.customerName || 'Customer',
            companyName: shipment.customerName || 'Customer',
            shipmentId: shipment.shipmentId,
            bookingNumber: shipment.bookingNumber || shipment.shipmentRef,
            containerNumber: shipment.container?.containerNumber || '',
            blNumber: shipment.billOfLadingNumber || '',
            route: shipment.corridorRoute || `${shipment.portOfLoading || shipment.originPort} -> ${shipment.inlandDestination || shipment.destinationNode}`,
            eta: formatDate(shipment.container?.currentEta || shipment.etaDjibouti),
            status: toTitle(shipment.currentStage || 'booking'),
        },
    };
}
async function resolveTripContext(entityId) {
    await (0, mongo_1.connectToDatabase)();
    const trip = await models_1.CorridorTripAssignmentModel.findOne({ $or: identifierOrObjectIdClauses('tripId', entityId) }).lean();
    if (!trip)
        throw new common_1.BadRequestException('Trip not found');
    const shipment = trip.shipmentId ? await models_1.CorridorShipmentModel.findOne({ shipmentId: trip.shipmentId }).lean() : null;
    const recipients = shipment
        ? await resolveCustomerRecipients(shipment.customerId, shipment.customerId, shipment.customerName)
        : defaultRecipients('dispatch');
    const driverUser = trip.driverId ? await models_1.UserModel.findById(trip.driverId).lean() : null;
    return {
        entityType: 'trip',
        entityId: trip.tripId,
        shipmentId: trip.shipmentId,
        tripId: trip.tripId,
        templateEntityType: 'trip',
        category: 'trip',
        title: trip.tripId,
        subtitle: `${trip.route || trip.routeName} · ${toTitle(trip.tripStatus || trip.dispatchStatus || 'assigned')}`,
        status: trip.tripStatus || trip.dispatchStatus,
        customerId: shipment?.customerId,
        driverId: trip.driverId,
        recipientType: 'driver',
        recipientName: trip.driverName,
        recipients: {
            email: recipients.email,
            sms: trip.driverPhone || driverUser?.phone || recipients.sms,
            telegram: `@${slugify(trip.driverName || trip.tripId).replace(/-/g, '_')}`,
            in_app: String(driverUser?._id || trip.driverId || ''),
        },
        defaultTemplate: trip.tripStatus === 'delayed' ? 'trip_delay_update' : 'driver_trip_assignment',
        defaultChannels: trip.tripStatus === 'delayed' ? ['email', 'telegram', 'in_app'] : ['sms', 'in_app'],
        actionRoute: '/trip',
        actionLabel: 'Open trip',
        fields: [
            { label: 'Trip', value: trip.tripId },
            { label: 'Route', value: trip.route || trip.routeName || '' },
            { label: 'Driver', value: trip.driverName || '' },
            { label: 'Truck', value: trip.truckPlate || '' },
        ],
        tokens: {
            customerName: shipment?.customerName || 'Customer',
            companyName: shipment?.customerName || 'Customer',
            driverName: trip.driverName || 'Driver',
            tripId: trip.tripId,
            route: trip.route || trip.routeName || '',
            checkpoint: trip.currentCheckpoint || '',
            status: toTitle(trip.tripStatus || trip.dispatchStatus || 'assigned'),
            containerNumber: trip.containerNumber || '',
            shipmentId: trip.shipmentId || '',
            bookingNumber: shipment?.bookingNumber || shipment?.shipmentRef || '',
        },
    };
}
async function resolveKycContext(entityId) {
    await (0, mongo_1.connectToDatabase)();
    const request = await models_1.DriverKycRequestModel.findOne({ $or: identifierOrObjectIdClauses('userId', entityId) }).lean();
    if (!request)
        throw new common_1.BadRequestException('KYC request not found');
    const user = request.userId ? await models_1.UserModel.findById(request.userId).lean() : null;
    const profile = request.userId ? await models_1.DriverProfileModel.findOne({ userId: request.userId }).lean() : null;
    return {
        entityType: 'driver_kyc_request',
        entityId: String(request._id),
        templateEntityType: 'kyc',
        category: 'kyc',
        title: request.fullName || 'Driver onboarding',
        subtitle: `${request.partnerCompany || profile?.branchId || 'Driver onboarding'} · ${toTitle(request.status || 'submitted')}`,
        status: request.status || 'submitted',
        driverId: String(request.userId || ''),
        recipientType: 'driver',
        recipientName: request.fullName,
        recipients: {
            email: user?.email || `${slugify(request.fullName)}@driver.tikurabay.local`,
            sms: request.phone || user?.phone || branchPhone('driver'),
            telegram: `@${slugify(request.fullName).replace(/-/g, '_')}`,
            in_app: String(user?._id || request.userId || ''),
        },
        defaultTemplate: request.status === 'approved' ? 'kyc_approved' : request.status === 'rejected' ? 'kyc_rejected' : 'kyc_reminder',
        defaultChannels: ['sms', 'in_app'],
        actionRoute: '/profile',
        actionLabel: 'Open KYC status',
        fields: [
            { label: 'Driver', value: request.fullName || 'Driver' },
            { label: 'Status', value: toTitle(request.status || 'submitted') },
            { label: 'Phone', value: request.phone || '' },
        ],
        tokens: {
            driverName: request.fullName || 'Driver',
            companyName: request.partnerCompany || 'Partner',
            status: toTitle(request.status || 'submitted'),
            documentType: 'KYC package',
        },
    };
}
async function resolveSupportContext(entityId) {
    await (0, mongo_1.connectToDatabase)();
    const room = await models_1.ChatRoomModel.findOne({ $or: identifierOrObjectIdClauses('roomCode', entityId) }).lean();
    if (!room)
        throw new common_1.BadRequestException('Support case not found');
    return {
        entityType: 'support',
        entityId: String(room._id),
        templateEntityType: 'support',
        category: 'support',
        title: room.title || room.roomCode || 'Support request',
        subtitle: `${room.category || 'Support'} · ${toTitle(room.status || 'open')}`,
        status: room.status || 'open',
        recipientType: 'customer',
        recipientName: room.customerName || room.title,
        recipients: defaultRecipients(room.customerName || room.roomCode || 'support'),
        defaultTemplate: 'support_acknowledgement',
        defaultChannels: ['email', 'in_app'],
        actionRoute: '/support',
        actionLabel: 'Open support',
        fields: [
            { label: 'Case', value: room.roomCode || String(room._id) },
            { label: 'Status', value: toTitle(room.status || 'open') },
            { label: 'Category', value: toTitle(room.category || 'support') },
        ],
        tokens: {
            supportCaseId: room.roomCode || String(room._id),
            customerName: room.customerName || 'Customer',
            companyName: room.customerName || 'Customer',
            status: toTitle(room.status || 'open'),
        },
    };
}
async function resolveCustomerRecipients(customerId, customerCode, customerName) {
    const testRecipient = process.env.EMAIL_FORCE_TEST_RECIPIENT ||
        process.env.TEST_EMAIL_RECIPIENT ||
        process.env.DEMO_NOTIFICATION_EMAIL ||
        '';
    const normalizedCustomerId = String(customerId || '').trim();
    const normalizedCustomerCode = String(customerCode || '').trim();
    const profileQuery = [
        normalizedCustomerId && mongoose_1.Types.ObjectId.isValid(normalizedCustomerId) ? { customerId: normalizedCustomerId } : null,
        normalizedCustomerCode ? { customerCode: normalizedCustomerCode } : null,
    ].filter(Boolean);
    const userQuery = [normalizedCustomerCode ? { customerCode: normalizedCustomerCode } : null].filter(Boolean);
    const [profile, user] = await Promise.all([
        profileQuery.length ? models_1.CustomerProfileModel.findOne({ $or: profileQuery }).lean() : null,
        userQuery.length ? models_1.UserModel.findOne({ $or: userQuery }).lean() : null,
    ]);
    return {
        email: testRecipient || profile?.email || user?.email || `${slugify(String(customerName || customerCode || customerId || 'customer'))}@customer.tikurabay.local`,
        sms: profile?.phone || user?.phone || branchPhone(String(customerName || customerCode || customerId || 'customer')),
        telegram: `@${slugify(String(customerName || customerCode || customerId || 'customer')).replace(/-/g, '_')}`,
        in_app: String(user?._id || customerCode || customerId || ''),
    };
}
function defaultRecipients(seed) {
    const testRecipient = process.env.EMAIL_FORCE_TEST_RECIPIENT ||
        process.env.TEST_EMAIL_RECIPIENT ||
        process.env.DEMO_NOTIFICATION_EMAIL ||
        '';
    return {
        email: testRecipient || `${slugify(seed)}@tikurabay.local`,
        sms: branchPhone(seed),
        telegram: `@${slugify(seed).replace(/-/g, '_')}`,
        in_app: slugify(seed),
    };
}
function normalizeChannels(channels) {
    return Array.from(new Set((channels || []).filter(Boolean).map((item) => item.toLowerCase())));
}
function normalizeLanguage(language) {
    return language === 'am' ? 'am' : 'en';
}
function normalizeSendMode(mode) {
    if (mode === 'draft')
        return 'draft';
    if (mode === 'scheduled')
        return 'scheduled';
    if (mode === 'automated')
        return 'automated';
    return 'now';
}
function resolveLanguageMode(mode, fallback, preferred) {
    if (mode === 'recipient_preference')
        return normalizeLanguage(preferred || fallback || 'en');
    if (mode === 'fixed_am')
        return 'am';
    return normalizeLanguage(fallback || 'en');
}
function resolveRuleTemplateKey(rule, event) {
    if (rule.triggerType === 'kyc_status_changed') {
        if (String(event.payload?.status || '').toLowerCase() === 'rejected')
            return 'kyc_rejected';
        if (String(event.payload?.status || '').toLowerCase() === 'approved')
            return 'kyc_approved';
    }
    return rule.templateKey;
}
function interpolateTemplate(template, tokens) {
    return String(template || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => String(tokens?.[key] ?? ''));
}
function collectMissingVariables(templates, tokens) {
    const missing = new Set();
    for (const template of templates) {
        const matches = String(template || '').match(/\{\{\s*(\w+)\s*\}\}/g) || [];
        for (const match of matches) {
            const key = match.replace(/[{}]/g, '').trim();
            if (tokens?.[key] === undefined || tokens?.[key] === null || tokens?.[key] === '') {
                missing.add(key);
            }
        }
    }
    return Array.from(missing).map((key) => `Missing variable: ${key}`);
}
function formatCurrency(value) {
    return `ETB ${Number(value || 0).toLocaleString('en-US')}`;
}
function formatDate(value) {
    if (!value)
        return 'Pending';
    return new Date(String(value)).toLocaleString('en-US');
}
function toTitle(value) {
    return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}
function slugify(value) {
    return String(value || 'contact').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'contact';
}
function branchPhone(seed) {
    const digits = slugify(seed).replace(/[a-z-]/g, '0').slice(0, 6).padEnd(6, '0');
    return `+251900${digits}`;
}
function startOfDay(base, offsetDays) {
    const date = new Date(base);
    date.setDate(date.getDate() + offsetDays);
    date.setHours(0, 0, 0, 0);
    return date;
}
function endOfDay(base, offsetDays) {
    const date = startOfDay(base, offsetDays);
    date.setHours(23, 59, 59, 999);
    return date;
}
function templateRow(templateKey, name, category, entityType, channel, language, subjectTemplate, bodyTemplate, variables) {
    return {
        templateId: `${templateKey}-${channel}-${language}`,
        templateKey,
        name,
        category,
        entityType,
        channel,
        language,
        subjectTemplate,
        bodyTemplate,
        variables,
        isActive: true,
    };
}
function buildSystemTemplates() {
    const vars = ['customerName', 'companyName', 'driverName', 'shipmentId', 'bookingNumber', 'tripId', 'containerNumber', 'blNumber', 'route', 'amount', 'dueDate', 'eta', 'status', 'branch', 'supportCaseId', 'checkpoint', 'documentType'];
    return [
        templateRow('payment_reminder', 'Payment Reminder', 'finance', 'finance', 'email', 'en', 'Payment reminder for {{bookingNumber}}{{shipmentId}}', 'Dear {{customerName}}, payment of {{amount}} is due on {{dueDate}}. Please review your finance status.', vars),
        templateRow('payment_reminder', 'Payment Reminder', 'finance', 'finance', 'sms', 'en', '', 'Reminder: payment of {{amount}} is due on {{dueDate}}.', vars),
        templateRow('overdue_invoice_notice', 'Overdue Invoice Notice', 'finance', 'finance', 'email', 'en', 'Overdue invoice notice', 'Dear {{customerName}}, your invoice is overdue. Outstanding amount: {{amount}}.', vars),
        templateRow('payment_thank_you', 'Payment Thank You', 'finance', 'finance', 'email', 'en', 'Payment received', 'Dear {{customerName}}, thank you. We received {{amount}} successfully.', vars),
        templateRow('payment_receipt', 'Payment Receipt', 'finance', 'finance', 'email', 'en', 'Payment receipt', 'Receipt confirmed for payment {{amount}}.', vars),
        templateRow('release_ready_notice', 'Release Ready Notice', 'shipment', 'shipment', 'email', 'en', 'Shipment release ready', 'Shipment {{bookingNumber}} is now ready for inland release from Djibouti.', vars),
        templateRow('customs_release_update', 'Customs Release Update', 'shipment', 'shipment', 'email', 'en', 'Customs release update', 'Shipment {{bookingNumber}} customs/release status is now {{status}}.', vars),
        templateRow('trip_delay_update', 'Trip Delay Update', 'trip', 'trip', 'email', 'en', 'Trip delay update', 'Trip {{tripId}} on {{route}} is delayed. Updated ETA: {{eta}}.', vars),
        templateRow('trip_delay_update', 'Trip Delay Update', 'trip', 'trip', 'telegram', 'en', '', 'Trip {{tripId}} is delayed on {{route}}. Updated ETA {{eta}}.', vars),
        templateRow('dispatch_follow_up', 'Dispatch Follow Up', 'dispatch', 'trip', 'telegram', 'en', '', 'Dispatch follow-up is required for trip {{tripId}} on {{route}}.', vars),
        templateRow('maintenance_escalation', 'Maintenance Escalation', 'dispatch', 'trip', 'telegram', 'en', '', 'Maintenance escalation has been opened for trip {{tripId}}.', vars),
        templateRow('checkpoint_hold_alert', 'Checkpoint Hold Alert', 'dispatch', 'trip', 'telegram', 'en', '', 'Checkpoint hold at {{checkpoint}} for trip {{tripId}}.', vars),
        templateRow('arrival_notice', 'Arrival Notice', 'shipment', 'shipment', 'email', 'en', 'Shipment arrival notice', 'Shipment {{bookingNumber}} has arrived at {{route}}.', vars),
        templateRow('arrival_confirmation', 'Arrival Confirmation', 'shipment', 'shipment', 'email', 'en', 'Arrival confirmed', 'Shipment {{bookingNumber}} arrived inland and is ready for handoff.', vars),
        templateRow('pod_uploaded_notice', 'POD Uploaded Notice', 'shipment', 'shipment', 'email', 'en', 'POD available', 'Proof of delivery for shipment {{bookingNumber}} is now available.', vars),
        templateRow('shipment_delivery_thank_you', 'Shipment Delivery Thank You', 'shipment', 'shipment', 'email', 'en', 'Thank You for Choosing Tikur Abay 🚛', `Dear Valued Customer,

Thank you for choosing Tikur Abay Transportation Services.

We are pleased to inform you that your shipment has been successfully delivered. We truly appreciate your trust in us and your continued support.

If you have any questions, feedback, or if anything did not meet your expectations, please do not hesitate to reach out to us:

📞 Phone: +251-XXX-XXX-XXX
📧 Email: support@tikurabay.com

Your feedback helps us improve and serve you better.

We look forward to serving you again.

Warm regards,
Tikur Abay Team
Transportation You Can Trust`, vars),
        templateRow('empty_return_overdue_notice', 'Empty Return Overdue', 'shipment', 'shipment', 'email', 'en', 'Empty return overdue', 'Empty return for container {{containerNumber}} remains open beyond the expected window.', vars),
        templateRow('empty_return_overdue_alert', 'Empty Return Overdue Alert', 'shipment', 'shipment', 'telegram', 'en', '', 'Empty return remains overdue for container {{containerNumber}}.', vars),
        templateRow('driver_trip_assignment', 'Driver Trip Assignment', 'trip', 'trip', 'sms', 'en', '', 'You are assigned to trip {{tripId}} on route {{route}}.', vars),
        templateRow('driver_trip_assignment', 'Driver Trip Assignment', 'trip', 'trip', 'in_app', 'en', '', 'Trip {{tripId}} has been assigned to you.', vars),
        templateRow('kyc_reminder', 'KYC Reminder', 'kyc', 'kyc', 'sms', 'en', '', 'Your KYC review is pending. Please complete the requested documents.', vars),
        templateRow('kyc_approved', 'KYC Approved', 'kyc', 'kyc', 'in_app', 'en', '', 'Your KYC is approved. Trip access is now enabled.', vars),
        templateRow('kyc_rejected', 'KYC Rejected', 'kyc', 'kyc', 'in_app', 'en', '', 'Your KYC was rejected. Please review the missing items and resubmit.', vars),
        templateRow('document_resubmission_notice', 'Document Resubmission', 'kyc', 'kyc', 'sms', 'en', '', 'Please resubmit your {{documentType}} to continue the review.', vars),
        templateRow('support_acknowledgement', 'Support Acknowledgement', 'support', 'support', 'email', 'en', 'Support request received', 'We received support case {{supportCaseId}} and the team is reviewing it.', vars),
        templateRow('support_reply', 'Support Reply', 'support', 'support', 'email', 'en', 'Support reply', 'There is a new reply on support case {{supportCaseId}}.', vars),
        templateRow('support_update', 'Support Update', 'support', 'support', 'email', 'en', 'Support update', 'There is a new update on support case {{supportCaseId}}.', vars),
        templateRow('missing_document_alert', 'Missing Document Alert', 'shipment', 'shipment', 'email', 'en', 'Document action needed', 'Shipment {{bookingNumber}} is missing {{documentType}}.', vars),
        templateRow('shipment_exception_alert', 'Shipment Exception Alert', 'shipment', 'shipment', 'email', 'en', 'Shipment exception alert', 'Shipment {{bookingNumber}} has an exception: {{status}}.', vars),
        templateRow('custom_message', 'Custom Message', 'custom', 'shipment', 'email', 'en', 'Custom message', '{{status}}', vars),
        templateRow('payment_reminder', 'Payment Reminder', 'finance', 'finance', 'email', 'am', 'የክፍያ ማስታወሻ', 'ክቡር {{customerName}}፣ የ{{amount}} ክፍያ በ{{dueDate}} ይደርሳል።', vars),
        templateRow('payment_reminder', 'Payment Reminder', 'finance', 'finance', 'sms', 'am', '', 'ማስታወሻ፡ የ{{amount}} ክፍያ በ{{dueDate}} ይደርሳል።', vars),
        templateRow('overdue_invoice_notice', 'Overdue Invoice Notice', 'finance', 'finance', 'email', 'am', 'የዘገየ ደረሰኝ', 'ክቡር {{customerName}}፣ የ{{amount}} ደረሰኝ ዘግይቷል።', vars),
        templateRow('payment_thank_you', 'Payment Thank You', 'finance', 'finance', 'email', 'am', 'ክፍያ ተቀብሏል', 'እናመሰግናለን፣ {{amount}} ተቀብሏል።', vars),
        templateRow('payment_receipt', 'Payment Receipt', 'finance', 'finance', 'email', 'am', 'የክፍያ ደረሰኝ', 'የክፍያ ደረሰኝ ተዘጋጅቷል።', vars),
        templateRow('release_ready_notice', 'Release Ready Notice', 'shipment', 'shipment', 'email', 'am', 'ልቀት ዝግጁ ነው', 'ሸክም {{bookingNumber}} ከጅቡቲ ለመንቀሳቀስ ዝግጁ ነው።', vars),
        templateRow('customs_release_update', 'Customs Release Update', 'shipment', 'shipment', 'email', 'am', 'የጉምሩክ ልቀት ማሻሻያ', 'ሸክም {{bookingNumber}} የጉምሩክ ሁኔታ {{status}} ላይ ነው።', vars),
        templateRow('trip_delay_update', 'Trip Delay Update', 'trip', 'trip', 'telegram', 'am', '', 'ጉዞ {{tripId}} በ{{route}} ላይ ዘግይቷል።', vars),
        templateRow('dispatch_follow_up', 'Dispatch Follow Up', 'dispatch', 'trip', 'telegram', 'am', '', 'ለጉዞ {{tripId}} የዲስፓች ክትትል ያስፈልጋል።', vars),
        templateRow('maintenance_escalation', 'Maintenance Escalation', 'dispatch', 'trip', 'telegram', 'am', '', 'ለጉዞ {{tripId}} የጥገና አስቸኳይ እርምጃ ተከፍቷል።', vars),
        templateRow('checkpoint_hold_alert', 'Checkpoint Hold Alert', 'dispatch', 'trip', 'telegram', 'am', '', 'በ{{checkpoint}} ላይ የጉዞ {{tripId}} መያዣ አለ።', vars),
        templateRow('arrival_notice', 'Arrival Notice', 'shipment', 'shipment', 'email', 'am', 'መድረሻ ማሳወቂያ', 'ሸክም {{bookingNumber}} ደርሷል።', vars),
        templateRow('arrival_confirmation', 'Arrival Confirmation', 'shipment', 'shipment', 'email', 'am', 'መድረሻ ተረጋግጧል', 'ሸክም {{bookingNumber}} ወደ ውስጥ መድረሻ ደርሷል።', vars),
        templateRow('pod_uploaded_notice', 'POD Uploaded Notice', 'shipment', 'shipment', 'email', 'am', 'POD ተጭኗል', 'ለ{{bookingNumber}} የPOD ሰነድ አሁን ይገኛል።', vars),
        templateRow('shipment_delivery_thank_you', 'Shipment Delivery Thank You', 'shipment', 'shipment', 'email', 'am', 'ለቲኩር አባይ ምርጫዎ እናመሰግናለን 🚛', 'ለቲኩር አባይ የመጓጓዣ አገልግሎት ምርጫዎ እናመሰግናለን። ሸክምዎ በተሳካ ሁኔታ መድረሱን እናሳውቃለን። ጥያቄ፣ አስተያየት ወይም ቅሬታ ካለዎት በ support@tikurabay.com ወይም +251-XXX-XXX-XXX ያግኙን።', vars),
        templateRow('empty_return_overdue_notice', 'Empty Return Overdue', 'shipment', 'shipment', 'email', 'am', 'የባዶ ኮንቴነር መመለሻ ዘግይቷል', 'ኮንቴነር {{containerNumber}} መመለሻ ከተጠበቀው ጊዜ በላይ ክፍት ነው።', vars),
        templateRow('empty_return_overdue_alert', 'Empty Return Overdue Alert', 'shipment', 'shipment', 'telegram', 'am', '', 'ለኮንቴነር {{containerNumber}} የባዶ መመለሻ ዘግይቷል።', vars),
        templateRow('driver_trip_assignment', 'Driver Trip Assignment', 'trip', 'trip', 'sms', 'am', '', 'ጉዞ {{tripId}} በ{{route}} ላይ ተመድቦልዎታል።', vars),
        templateRow('kyc_reminder', 'KYC Reminder', 'kyc', 'kyc', 'sms', 'am', '', 'የKYC ግምገማዎ በመጠባበቅ ላይ ነው።', vars),
        templateRow('kyc_approved', 'KYC Approved', 'kyc', 'kyc', 'in_app', 'am', '', 'የKYC ግምገማዎ ጸድቋል።', vars),
        templateRow('kyc_rejected', 'KYC Rejected', 'kyc', 'kyc', 'in_app', 'am', '', 'የKYC ግምገማዎ ተቀባይነት አላገኘም።', vars),
        templateRow('document_resubmission_notice', 'Document Resubmission', 'kyc', 'kyc', 'sms', 'am', '', '{{documentType}} እንደገና ያቅርቡ።', vars),
        templateRow('support_acknowledgement', 'Support Acknowledgement', 'support', 'support', 'email', 'am', 'የድጋፍ ማረጋገጫ', 'የድጋፍ ጥያቄዎ {{supportCaseId}} ደርሷል።', vars),
        templateRow('support_reply', 'Support Reply', 'support', 'support', 'email', 'am', 'የድጋፍ ምላሽ', 'በ{{supportCaseId}} ላይ አዲስ ምላሽ አለ።', vars),
        templateRow('support_update', 'Support Update', 'support', 'support', 'email', 'am', 'የድጋፍ ማሻሻያ', 'በ{{supportCaseId}} ላይ አዲስ ማሻሻያ አለ።', vars),
        templateRow('missing_document_alert', 'Missing Document Alert', 'shipment', 'shipment', 'email', 'am', 'ሰነድ ያስፈልጋል', 'ለሸክም {{bookingNumber}} {{documentType}} አልተገኘም።', vars),
        templateRow('shipment_exception_alert', 'Shipment Exception Alert', 'shipment', 'shipment', 'email', 'am', 'የሸክም ችግኝ ማሳወቂያ', 'ሸክም {{bookingNumber}} ችግኝ አለው፡ {{status}}.', vars),
        templateRow('custom_message', 'Custom Message', 'custom', 'shipment', 'email', 'am', 'ብጁ መልእክት', '{{status}}', vars),
    ];
}
function buildAutomationRules() {
    return [
        ruleRow('invoice_due_soon', 'Invoice Due Soon', 'invoice', ['email', 'sms'], 'payment_reminder', 'fixed_en', { daysUntilDue: 1 }, 0),
        ruleRow('invoice_overdue', 'Invoice Overdue', 'invoice', ['email', 'telegram'], 'overdue_invoice_notice', 'fixed_en', { overdueDays: 1 }, 0),
        ruleRow('payment_completed', 'Payment Completed', 'payment', ['email', 'in_app'], 'payment_thank_you', 'recipient_preference', {}, 0),
        ruleRow('release_ready', 'Release Ready', 'shipment', ['email', 'in_app'], 'release_ready_notice', 'recipient_preference', {}, 0),
        ruleRow('trip_delayed', 'Trip Delayed', 'trip', ['telegram', 'in_app'], 'trip_delay_update', 'fixed_en', {}, 0),
        ruleRow('checkpoint_hold', 'Checkpoint Hold', 'trip', ['telegram', 'in_app'], 'checkpoint_hold_alert', 'fixed_en', {}, 0),
        ruleRow('inland_arrival_confirmed', 'Inland Arrival Confirmed', 'shipment', ['email', 'in_app'], 'arrival_confirmation', 'recipient_preference', {}, 0),
        ruleRow('pod_uploaded', 'POD Uploaded', 'shipment', ['email', 'in_app'], 'pod_uploaded_notice', 'recipient_preference', {}, 0),
        ruleRow('empty_return_overdue', 'Empty Return Overdue', 'shipment', ['telegram', 'in_app'], 'empty_return_overdue_alert', 'fixed_en', {}, 0),
        ruleRow('kyc_pending', 'KYC Pending', 'driver_kyc_request', ['sms', 'in_app'], 'kyc_reminder', 'recipient_preference', {}, 0),
        ruleRow('kyc_status_changed', 'KYC Status Changed', 'driver_kyc_request', ['in_app'], 'kyc_approved', 'recipient_preference', {}, 0),
    ];
}
function ruleRow(triggerType, name, entityType, channels, templateKey, languageMode, conditions, scheduleOffsetMinutes) {
    return {
        ruleId: `${entityType}-${triggerType}-${templateKey}`,
        name,
        isEnabled: true,
        enabled: true,
        triggerType,
        entityType,
        channels,
        channel: channels[0],
        templateKey,
        languageMode,
        language: languageMode === 'fixed_am' ? 'am' : 'en',
        conditions,
        scheduleOffsetMinutes,
        scheduleOffset: scheduleOffsetMinutes,
    };
}
function identifierOrObjectIdClauses(field, value) {
    const clauses = [{ [field]: value }];
    if (mongoose_1.Types.ObjectId.isValid(value)) {
        clauses.push({ _id: new mongoose_1.Types.ObjectId(value) });
    }
    return clauses;
}
//# sourceMappingURL=communication-orchestrator.service.js.map