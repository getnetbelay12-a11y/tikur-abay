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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const mongo_1 = require("../../database/mongo");
const models_1 = require("../../database/models");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const communication_orchestrator_service_1 = require("../communications/communication-orchestrator.service");
let PaymentsController = class PaymentsController {
    constructor(communicationOrchestratorService) {
        this.communicationOrchestratorService = communicationOrchestratorService;
    }
    async list(user) {
        return (await this.buildPaymentsWorkspace(user)).rows;
    }
    async workspace(user) {
        return this.buildPaymentsWorkspace(user);
    }
    async historyByReference(user, paymentId, invoiceId) {
        await (0, mongo_1.connectToDatabase)();
        const communications = await listPaymentCommunications({ paymentId, invoiceId }, user);
        return communications.map(mapCommunicationRecord);
    }
    async historyByPayment(user, paymentId) {
        await (0, mongo_1.connectToDatabase)();
        const communications = await listPaymentCommunications({ paymentId }, user);
        return communications.map(mapCommunicationRecord);
    }
    async sendCommunication(user, body) {
        await (0, mongo_1.connectToDatabase)();
        const context = await resolvePaymentContext(body, user);
        const defaultTemplate = selectTemplateForStatus(context.invoice.status);
        const templateType = body.templateType || defaultTemplate;
        const targets = expandChannels(body.channel || 'email');
        const contacts = await resolveRecipientBook(context.invoice, context.payment);
        const createdRecords = [];
        for (const targetChannel of targets) {
            const recipient = normalizeRecipient(body.recipients?.[targetChannel] || contacts[targetChannel]);
            if (!recipient) {
                throw new common_1.BadRequestException(`Recipient is required for ${targetChannel}`);
            }
            const effectiveTemplate = templateType === 'reminder' && isOverdue(context.invoice) ? 'escalation' : templateType;
            const message = body.message || buildCommunicationMessage(effectiveTemplate, context, targetChannel);
            const subject = body.subject || buildCommunicationSubject(effectiveTemplate, context);
            let status = 'scheduled';
            let providerResponse = buildProviderResponse('scheduled', targetChannel, recipient);
            let retryCount = 0;
            if (!body.saveAsDraft) {
                try {
                    const sendResult = await this.communicationOrchestratorService.sendDirect({
                        entityType: 'invoice',
                        entityId: String(context.invoice._id),
                        channels: [targetChannel],
                        templateKey: 'custom_message',
                        language: 'en',
                        subject,
                        messageBody: message,
                        recipientName: context.invoice.customerName || context.payment?.customerName || 'Customer',
                        recipientType: 'customer',
                        recipientOverrides: {
                            [targetChannel]: recipient,
                        },
                        category: 'payment',
                    }, user);
                    const channelRecord = Array.isArray(sendResult.records)
                        ? sendResult.records.find((item) => item.channel === targetChannel)
                        : null;
                    status = channelRecord?.status === 'sent' ? 'sent' : 'failed';
                    providerResponse = String(channelRecord?.metadata?.providerMessage || channelRecord?.errorMessage || buildProviderResponse(status, targetChannel, recipient));
                    retryCount = status === 'failed' ? 1 : 0;
                }
                catch (error) {
                    status = 'failed';
                    providerResponse = error instanceof Error
                        ? error.message
                        : buildProviderResponse('failed', targetChannel, recipient);
                    retryCount = 1;
                }
            }
            const record = await models_1.PaymentCommunicationModel.create({
                paymentId: context.payment?._id ?? undefined,
                invoiceId: context.invoice._id,
                customerId: context.invoice.customerId,
                customerName: context.invoice.customerName,
                channel: targetChannel,
                messageType: effectiveTemplate,
                recipient,
                subject,
                message,
                status,
                sentAt: new Date(),
                sentBy: user.email,
                providerResponse,
                retryCount,
            });
            await syncCollectionTask(context, effectiveTemplate, status, user.email);
            createdRecords.push(record);
        }
        const workspace = await this.buildPaymentsWorkspace(user);
        const refreshedRow = workspace.rows.find((row) => row.invoiceId === String(context.invoice._id) || row.paymentId === String(context.payment?._id || ''));
        return {
            records: createdRecords.map(mapCommunicationRecord),
            row: refreshedRow || null,
        };
    }
    async my(user) {
        await (0, mongo_1.connectToDatabase)();
        return models_1.PaymentModel.find({ customerCode: user.customerCode }).sort({ paymentDate: -1 }).limit(100).lean();
    }
    async pay(user, body) {
        await (0, mongo_1.connectToDatabase)();
        const count = await models_1.PaymentModel.countDocuments({});
        const payment = await models_1.PaymentModel.create({
            paymentCode: `PAY-MOB-${String(count + 1).padStart(4, '0')}`,
            invoiceId: body.invoiceId,
            customerCode: user.customerCode,
            customerName: user.name,
            amount: body.amount || 0,
            status: 'paid',
            paymentDate: new Date(),
        });
        await this.communicationOrchestratorService.triggerAutomationEvent('payment_completed', {
            entityType: 'payment',
            entityId: String(payment._id),
            payload: {
                amount: payment.amount,
                customerName: payment.customerName,
            },
        }, { id: user.id || user.email || 'system' });
        return payment.toObject();
    }
    async buildPaymentsWorkspace(user) {
        await (0, mongo_1.connectToDatabase)();
        const scope = buildScope(user);
        const [payments, invoices, customerProfiles, users] = await Promise.all([
            models_1.PaymentModel.find(scope.payment).sort({ paymentDate: -1 }).limit(220).lean(),
            models_1.InvoiceModel.find(scope.invoice).sort({ dueDate: 1, updatedAt: -1 }).limit(220).lean(),
            models_1.CustomerProfileModel.find({}).select('customerId companyName contactPerson phone email').limit(320).lean(),
            models_1.UserModel.find({ role: 'customer' }).select('customerCode email phone').limit(320).lean(),
        ]);
        const invoiceIds = invoices.map((invoice) => invoice._id);
        const paymentIds = payments.map((payment) => payment._id);
        const communications = await models_1.PaymentCommunicationModel.find({
            $or: [
                { invoiceId: { $in: invoiceIds } },
                { paymentId: { $in: paymentIds } },
            ],
        }).sort({ sentAt: -1, createdAt: -1 }).limit(800).lean();
        const latestPaymentByInvoice = new Map();
        for (const payment of payments) {
            const key = String(payment.invoiceId || '');
            if (!key || latestPaymentByInvoice.has(key))
                continue;
            latestPaymentByInvoice.set(key, payment);
        }
        const communicationsByInvoice = new Map();
        const communicationsByPayment = new Map();
        for (const communication of communications) {
            const invoiceKey = String(communication.invoiceId || '');
            const paymentKey = String(communication.paymentId || '');
            if (invoiceKey) {
                if (!communicationsByInvoice.has(invoiceKey))
                    communicationsByInvoice.set(invoiceKey, []);
                communicationsByInvoice.get(invoiceKey).push(communication);
            }
            if (paymentKey) {
                if (!communicationsByPayment.has(paymentKey))
                    communicationsByPayment.set(paymentKey, []);
                communicationsByPayment.get(paymentKey).push(communication);
            }
        }
        const profileMap = new Map(customerProfiles.flatMap((profile) => {
            const entries = [];
            if (profile.customerId)
                entries.push([String(profile.customerId), profile]);
            if (profile.companyName)
                entries.push([String(profile.companyName), profile]);
            return entries;
        }));
        const userMap = new Map(users.map((entry) => [String(entry.customerCode || ''), entry]));
        const rows = invoices
            .map((invoice) => {
            const payment = latestPaymentByInvoice.get(String(invoice._id)) || null;
            const invoiceHistory = communicationsByInvoice.get(String(invoice._id)) || [];
            const paymentHistory = payment ? communicationsByPayment.get(String(payment._id)) || [] : [];
            const history = [...paymentHistory, ...invoiceHistory].sort(sortCommunicationDesc);
            const latestCommunication = history[0] || null;
            const recipients = buildRecipientBook(invoice, payment, profileMap, userMap);
            const paymentStatus = payment?.status || (invoice.status === 'paid' ? 'paid' : invoice.status || 'pending');
            return {
                id: payment ? String(payment._id) : String(invoice._id),
                paymentId: payment ? String(payment._id) : null,
                invoiceId: String(invoice._id),
                paymentCode: payment?.paymentCode || 'Payment pending',
                invoiceCode: invoice.invoiceCode || 'Invoice pending',
                customerName: invoice.customerName || payment?.customerName || 'Customer pending',
                amount: Number(payment?.amount || invoice.totalAmount || 0),
                outstandingAmount: Number(invoice.outstandingAmount || 0),
                paymentStatus,
                invoiceStatus: invoice.status || 'pending',
                routeName: payment?.routeName || invoice.routeName || 'Route pending',
                paymentDate: payment?.paymentDate || null,
                dueDate: invoice.dueDate || null,
                contactPerson: recipients.contactPerson,
                recipients: recipients.channels,
                lastContact: latestCommunication?.sentAt || latestCommunication?.createdAt || null,
                channel: latestCommunication?.channel || 'not_sent',
                communicationStatus: latestCommunication?.status || 'not_sent',
                lastTemplateType: latestCommunication?.messageType || null,
                lastMessagePreview: latestCommunication?.message || null,
                historyCount: history.length,
                availableActions: {
                    sendReminder: paymentStatus !== 'paid',
                    sendThankYou: paymentStatus === 'paid',
                    sendReceipt: paymentStatus === 'paid',
                },
            };
        })
            .sort((left, right) => rankPaymentRow(right) - rankPaymentRow(left));
        return {
            rows,
            communicationSummary: {
                messagesSentToday: communications.filter((item) => item.status === 'sent' && sameDay(item.sentAt)).length,
                pendingFollowUp: rows.filter((row) => row.paymentStatus !== 'paid' && ['not_sent', 'failed', 'scheduled'].includes(row.communicationStatus)).length,
                overdueReminders: communications.filter((item) => item.messageType === 'escalation').length,
                thankYouMessagesSent: communications.filter((item) => item.messageType === 'thank_you' && item.status === 'sent').length,
            },
        };
    }
};
exports.PaymentsController = PaymentsController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('payments:view', 'payments:own:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('workspace'),
    (0, permissions_decorator_1.Permissions)('payments:view', 'payments:own:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "workspace", null);
__decorate([
    (0, common_1.Get)('communications/history'),
    (0, permissions_decorator_1.Permissions)('payments:view', 'payments:own:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('paymentId')),
    __param(2, (0, common_1.Query)('invoiceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "historyByReference", null);
__decorate([
    (0, common_1.Get)(':paymentId/communications'),
    (0, permissions_decorator_1.Permissions)('payments:view', 'payments:own:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('paymentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "historyByPayment", null);
__decorate([
    (0, common_1.Post)('communications/send'),
    (0, permissions_decorator_1.Permissions)('payments:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "sendCommunication", null);
__decorate([
    (0, common_1.Get)('my'),
    (0, permissions_decorator_1.Permissions)('payments:view', 'payments:own:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "my", null);
__decorate([
    (0, common_1.Post)('pay'),
    (0, permissions_decorator_1.Permissions)('payments:own:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "pay", null);
exports.PaymentsController = PaymentsController = __decorate([
    (0, swagger_1.ApiTags)('payments'),
    (0, common_1.Controller)('payments'),
    __metadata("design:paramtypes", [communication_orchestrator_service_1.CommunicationOrchestratorService])
], PaymentsController);
function buildScope(user) {
    if (user.permissions.includes('*') || ['executive', 'super_admin', 'finance_officer'].includes(user.role)) {
        return { payment: {}, invoice: {} };
    }
    if (user.role === 'customer') {
        return {
            payment: { customerCode: user.customerCode },
            invoice: { customerCode: user.customerCode },
        };
    }
    return {
        payment: user.branchId ? { branchId: user.branchId } : {},
        invoice: user.branchId ? { branchId: user.branchId } : {},
    };
}
async function resolvePaymentContext(body, user) {
    const payment = body.paymentId ? await models_1.PaymentModel.findById(body.paymentId).lean() : null;
    const invoiceId = body.invoiceId || (payment?.invoiceId ? String(payment.invoiceId) : '');
    if (!invoiceId) {
        throw new common_1.BadRequestException('Invoice is required');
    }
    const invoice = await models_1.InvoiceModel.findById(invoiceId).lean();
    if (!invoice) {
        throw new common_1.BadRequestException('Invoice not found');
    }
    const scope = buildScope(user);
    if (Object.keys(scope.invoice).length > 0) {
        const allowed = await models_1.InvoiceModel.findOne({ _id: invoice._id, ...scope.invoice }).select('_id').lean();
        if (!allowed) {
            throw new common_1.BadRequestException('Invoice is outside your access scope');
        }
    }
    if (!payment && ['thank_you', 'receipt'].includes(String(body.templateType || ''))) {
        throw new common_1.BadRequestException('A recorded payment is required for thank you or receipt messages');
    }
    return { payment, invoice };
}
async function listPaymentCommunications(identifiers, user) {
    const query = [];
    if (identifiers.paymentId)
        query.push({ paymentId: identifiers.paymentId });
    if (identifiers.invoiceId)
        query.push({ invoiceId: identifiers.invoiceId });
    if (!query.length) {
        throw new common_1.BadRequestException('paymentId or invoiceId is required');
    }
    const communications = await models_1.PaymentCommunicationModel.find({ $or: query }).sort({ sentAt: -1, createdAt: -1 }).lean();
    if (user.permissions.includes('*') || ['executive', 'super_admin', 'finance_officer'].includes(user.role)) {
        return communications;
    }
    if (user.role === 'customer') {
        return communications.filter((item) => String(item.customerName || '') === user.name || String(item.customerId || '') === user.id);
    }
    return communications;
}
async function resolveRecipientBook(invoice, payment) {
    const profile = (await models_1.CustomerProfileModel.findOne({ customerId: invoice.customerId }).select('contactPerson phone email').lean().catch(() => null)) ||
        (await models_1.CustomerProfileModel.findOne({ companyName: invoice.customerName }).select('contactPerson phone email').lean().catch(() => null));
    const customerUser = (invoice.customerCode
        ? await models_1.UserModel.findOne({ customerCode: invoice.customerCode }).select('email phone').lean().catch(() => null)
        : null);
    return {
        contactPerson: profile?.contactPerson || invoice.customerName || payment?.customerName || 'Finance contact',
        email: normalizeRecipient(profile?.email || customerUser?.email || `${slugify(invoice.customerName || 'customer')}@customer.tikurabay.local`),
        sms: normalizeRecipient(profile?.phone || customerUser?.phone || '+251900000000'),
        telegram: `@${slugify(invoice.customerName || 'customer').replace(/-/g, '_')}`,
        in_app: `customer:${invoice.customerCode || invoice.customerId || payment?.customerCode || 'unknown'}`,
    };
}
function buildRecipientBook(invoice, payment, profileMap, userMap) {
    const profile = profileMap.get(String(invoice.customerId || '')) || profileMap.get(String(invoice.customerName || '')) || null;
    const customerUser = userMap.get(String(invoice.customerCode || '')) || null;
    const customerName = invoice.customerName || payment?.customerName || 'Customer pending';
    return {
        contactPerson: profile?.contactPerson || customerName,
        channels: {
            email: normalizeRecipient(profile?.email || customerUser?.email || `${slugify(customerName)}@customer.tikurabay.local`),
            sms: normalizeRecipient(profile?.phone || customerUser?.phone || '+251900000000'),
            telegram: `@${slugify(customerName).replace(/-/g, '_')}`,
            in_app: `customer:${invoice.customerCode || invoice.customerId || 'unknown'}`,
        },
    };
}
function expandChannels(channel) {
    if (channel === 'all') {
        return ['email', 'sms', 'telegram', 'in_app'];
    }
    return [channel];
}
function selectTemplateForStatus(status) {
    if (status === 'paid')
        return 'thank_you';
    if (status === 'overdue')
        return 'escalation';
    return 'reminder';
}
function buildCommunicationSubject(templateType, context) {
    if (templateType === 'thank_you')
        return `Payment received for ${context.invoice.invoiceCode}`;
    if (templateType === 'receipt')
        return `Receipt for ${context.invoice.invoiceCode}`;
    if (templateType === 'escalation')
        return `Overdue notice for ${context.invoice.invoiceCode}`;
    return `Payment reminder for ${context.invoice.invoiceCode}`;
}
function buildCommunicationMessage(templateType, context, channel) {
    const customerName = context.invoice.customerName || context.payment?.customerName || 'Customer';
    const amount = formatCurrency(context.payment?.amount || context.invoice.outstandingAmount || context.invoice.totalAmount || 0);
    const invoiceNumber = context.invoice.invoiceCode || 'Invoice pending';
    const dueDate = formatDate(context.invoice.dueDate);
    const paymentId = context.payment?.paymentCode || context.payment?.paymentId || 'Payment pending';
    if (templateType === 'thank_you') {
        return `Dear ${customerName}, thank you for your payment of ETB ${amount} for invoice ${invoiceNumber}. Your payment has been received successfully. We appreciate your business.`;
    }
    if (templateType === 'receipt') {
        return `Dear ${customerName}, your payment for invoice ${invoiceNumber} has been recorded successfully. Amount received: ETB ${amount}. Receipt reference: ${paymentId}.`;
    }
    if (templateType === 'escalation') {
        return `Dear ${customerName}, invoice ${invoiceNumber} for ETB ${amount} is now overdue. Please arrange payment as soon as possible or contact our finance team for support.`;
    }
    return `Dear ${customerName}, this is a reminder that invoice ${invoiceNumber} for ETB ${amount} is due on ${dueDate}. Please complete payment at your earliest convenience. Thank you.`;
}
function inferDeliveryStatus(recipient, channel) {
    if (!recipient || recipient.includes('pending') || recipient.endsWith('@customer.tikurabay.local')) {
        return channel === 'email' ? 'scheduled' : 'failed';
    }
    return 'sent';
}
function buildProviderResponse(status, channel, recipient) {
    if (status === 'sent')
        return `${channel} accepted for ${recipient}`;
    if (status === 'scheduled')
        return `${channel} queued for ${recipient}`;
    return `${channel} delivery failed for ${recipient}`;
}
async function syncCollectionTask(context, templateType, status, sentBy) {
    if (!['reminder', 'escalation'].includes(templateType))
        return;
    const taskCode = `COLL-${String(context.invoice.invoiceCode || context.invoice._id)}`;
    const balance = Number(context.invoice.outstandingAmount || 0);
    await models_1.CollectionTaskModel.findOneAndUpdate({ invoiceId: context.invoice._id }, {
        $set: {
            taskCode,
            customerId: context.invoice.customerId,
            customerName: context.invoice.customerName,
            assignedOwner: sentBy,
            escalationLevel: templateType === 'escalation' ? 'executive' : 'finance_officer',
            balance,
            status: status === 'failed' ? 'escalated' : 'open',
            dueDate: context.invoice.dueDate || null,
            lastFollowUpAt: new Date(),
        },
        $inc: { reminderCount: 1 },
    }, { upsert: true, new: true }).catch(() => null);
}
function mapCommunicationRecord(record) {
    return {
        id: String(record._id),
        paymentId: record.paymentId ? String(record.paymentId) : null,
        invoiceId: record.invoiceId ? String(record.invoiceId) : null,
        customerId: record.customerId ? String(record.customerId) : null,
        customerName: record.customerName || 'Customer pending',
        channel: record.channel || 'email',
        templateType: record.messageType || 'reminder',
        recipient: record.recipient || 'Recipient pending',
        subject: record.subject || '',
        message: record.message || '',
        status: record.status || 'scheduled',
        sentAt: record.sentAt || record.createdAt || null,
        sentBy: record.sentBy || 'Finance desk',
        providerResponse: record.providerResponse || '',
        retryCount: Number(record.retryCount || 0),
    };
}
function sortCommunicationDesc(left, right) {
    return new Date(String(right.sentAt || right.createdAt || 0)).getTime() - new Date(String(left.sentAt || left.createdAt || 0)).getTime();
}
function rankPaymentRow(row) {
    const dueWeight = row.invoiceStatus === 'overdue' ? 1000 : row.paymentStatus === 'pending' ? 500 : row.paymentStatus === 'failed' ? 400 : 0;
    const timeWeight = new Date(String(row.lastContact || row.dueDate || row.paymentDate || 0)).getTime();
    return dueWeight + timeWeight;
}
function slugify(value) {
    return String(value || 'customer')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'customer';
}
function formatDate(value) {
    if (!value)
        return 'Not set';
    return new Date(String(value)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(value || 0));
}
function sameDay(value) {
    if (!value)
        return false;
    const date = new Date(String(value));
    const now = new Date();
    return date.getUTCFullYear() === now.getUTCFullYear() &&
        date.getUTCMonth() === now.getUTCMonth() &&
        date.getUTCDate() === now.getUTCDate();
}
function isOverdue(invoice) {
    if (String(invoice.status) === 'overdue')
        return true;
    if (!invoice.dueDate)
        return false;
    return new Date(String(invoice.dueDate)).getTime() < Date.now();
}
function normalizeRecipient(value) {
    return String(value || '').trim();
}
//# sourceMappingURL=payments.controller.js.map