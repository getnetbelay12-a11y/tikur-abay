"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportSettlementService = void 0;
const common_1 = require("@nestjs/common");
const mongo_1 = require("../../database/mongo");
const models_1 = require("../../database/models");
const corridor_shipment_materializer_1 = require("../corridor/corridor-shipment-materializer");
let ImportSettlementService = class ImportSettlementService {
    async listShipmentQueue(user, query = {}) {
        await (0, mongo_1.connectToDatabase)();
        const role = settlementRole(user);
        const filter = {};
        if (query.releaseStatus)
            filter.releaseStatus = query.releaseStatus;
        if (query.financeStatus)
            filter.financeStatus = query.financeStatus;
        if (query.customerId)
            filter.customerId = query.customerId;
        if (role === 'customer') {
            filter.$or = [{ customerCode: user.customerCode }, { customerId: user.customerCode }];
        }
        if (role === 'dry_port') {
            filter.$or = [{ releaseStatus: { $in: ['release_sent_to_dry_port_agent', 'finance_cleared', 'release_prepared'] } }, { currentOwnerRole: 'dry_port_yard_agent' }];
        }
        if (role === 'driver') {
            const assignedTrips = await models_1.CorridorTripAssignmentModel.find({
                $or: [
                    { driverId: user.id },
                    { driverName: user.name },
                    ...(user.phone ? [{ driverPhone: user.phone }] : []),
                ],
            }).select('shipmentId').lean();
            filter.shipmentId = { $in: assignedTrips.map((item) => item.shipmentId).filter(Boolean) };
        }
        const shipments = await models_1.CorridorShipmentModel.find(filter).sort({ updatedAt: -1 }).limit(80).lean();
        const ids = shipments.map((item) => item.shipmentId);
        const [clearances, releases, claims] = await Promise.all([
            models_1.FinancialClearanceModel.find({ shipmentId: { $in: ids } }).lean(),
            models_1.ReleaseAuthorizationModel.find({ shipmentId: { $in: ids } }).sort({ createdAt: -1 }).lean(),
            models_1.DriverExpenseClaimModel.find({ shipmentId: { $in: ids } }).lean(),
        ]);
        return shipments.map((shipment) => {
            const clearance = clearances.find((item) => item.shipmentId === shipment.shipmentId);
            const release = releases.find((item) => item.shipmentId === shipment.shipmentId);
            const shipmentClaims = claims.filter((item) => item.shipmentId === shipment.shipmentId);
            return {
                shipmentId: shipment.shipmentId,
                shipmentRef: shipment.shipmentRef,
                bookingNumber: shipment.bookingNumber,
                customerName: shipment.customerName,
                lcReference: shipment.lcReference || shipment.bookingNumber,
                financeStatus: shipment.financeStatus || 'awaiting_bank_document',
                releaseStatus: shipment.releaseStatus || 'not_ready_for_release',
                dryPortStatus: shipment.dryPortStatus || 'awaiting_release',
                interchangeStatus: shipment.interchangeStatus || 'full_received',
                totalInvoiced: Number(shipment.totalInvoiced || 0),
                totalPaid: Number(shipment.totalPaid || 0),
                balanceDue: Number(shipment.balanceDue || 0),
                financialClearanceStatus: clearance?.status || 'awaiting_finance_clearance',
                latestReleaseMode: release?.releaseMode || null,
                pendingDriverClaims: shipmentClaims.filter((item) => item.status !== 'closed' && item.status !== 'reimbursed').length,
                updatedAt: shipment.updatedAt,
            };
        });
    }
    async getShipmentWorkspace(user, shipmentIdOrRef) {
        await (0, mongo_1.connectToDatabase)();
        const shipment = await this.resolveShipment(shipmentIdOrRef);
        this.assertShipmentAccess(user, shipment);
        const [bankDocuments, invoices, invoiceLines, paymentReceipts, verifications, officialReceipts, financialClearance, releaseAuthorizations, dryPortReleases, interchanges, expenseClaims, expenseItems, reimbursements, milestones, approvals, activities, documents,] = await Promise.all([
            models_1.BankDocumentModel.find({ shipmentId: shipment.shipmentId }).sort({ createdAt: -1 }).lean(),
            models_1.ChargeInvoiceModel.find({ shipmentId: shipment.shipmentId }).sort({ createdAt: -1 }).lean(),
            models_1.ChargeInvoiceLineModel.find({ shipmentId: shipment.shipmentId }).sort({ createdAt: 1 }).lean(),
            models_1.CustomerPaymentReceiptModel.find({ shipmentId: shipment.shipmentId }).sort({ createdAt: -1 }).lean(),
            models_1.FinanceVerificationModel.find({ shipmentId: shipment.shipmentId }).sort({ createdAt: -1 }).lean(),
            models_1.OfficialReceiptModel.find({ shipmentId: shipment.shipmentId }).sort({ createdAt: -1 }).lean(),
            models_1.FinancialClearanceModel.findOne({ shipmentId: shipment.shipmentId }).lean(),
            models_1.ReleaseAuthorizationModel.find({ shipmentId: shipment.shipmentId }).sort({ createdAt: -1 }).lean(),
            models_1.DryPortReleaseModel.find({ shipmentId: shipment.shipmentId }).sort({ createdAt: -1 }).lean(),
            models_1.ContainerInterchangeModel.find({ shipmentId: shipment.shipmentId }).sort({ eventDate: -1, createdAt: -1 }).lean(),
            models_1.DriverExpenseClaimModel.find({ shipmentId: shipment.shipmentId }).sort({ createdAt: -1 }).lean(),
            models_1.DriverExpenseItemModel.find({ shipmentId: shipment.shipmentId }).sort({ createdAt: -1 }).lean(),
            models_1.DriverReimbursementModel.find({ shipmentId: shipment.shipmentId }).sort({ createdAt: -1 }).lean(),
            models_1.CorridorMilestoneModel.find({ shipmentId: shipment.shipmentId }).sort({ occurredAt: -1, createdAt: -1 }).lean(),
            models_1.ApprovalActionModel.find({ shipmentId: shipment.shipmentId }).sort({ actedAt: -1, createdAt: -1 }).lean(),
            models_1.ActivityLogModel.find({ entityId: shipment.shipmentId }).sort({ createdAt: -1 }).limit(80).lean(),
            models_1.UploadedDocumentModel.find({ entityType: { $in: ['shipment', 'invoice', 'payment', 'official_receipt', 'release_authorization', 'trip'] }, entityId: { $in: [shipment.shipmentId, shipment.shipmentRef] } }).sort({ createdAt: -1 }).lean(),
        ]);
        const linesByInvoice = new Map();
        for (const line of invoiceLines) {
            const key = String(line.invoiceId || '');
            if (!linesByInvoice.has(key))
                linesByInvoice.set(key, []);
            linesByInvoice.get(key).push(line);
        }
        const itemsByClaim = new Map();
        for (const item of expenseItems) {
            const key = String(item.claimId || '');
            if (!itemsByClaim.has(key))
                itemsByClaim.set(key, []);
            itemsByClaim.get(key).push(item);
        }
        const visibleDocuments = documents
            .filter((item) => this.isVisibleToUser(user, item.visibilityScope))
            .map((item) => ({
            id: String(item._id),
            title: item.title || item.fileName,
            fileName: item.fileName,
            category: item.category || item.documentType || 'document',
            documentType: item.documentType || item.category || 'document',
            referenceNo: item.referenceNo || '',
            createdAt: item.createdAt,
            fileUrl: item.fileUrl,
            status: item.status || 'uploaded',
            uploadedBy: item.uploadedBy || '',
        }));
        const visibleTimeline = [...milestones.map((item) => ({ type: 'milestone', at: item.occurredAt || item.createdAt, title: item.label, code: item.code, note: item.note, visibilityScope: item.visibilityScope })), ...activities.map((item) => ({ type: 'audit', at: item.createdAt, title: item.title, code: item.activityType, note: item.description, metadata: item.metadata, visibilityScope: item.visibilityScope || 'internal_only' }))]
            .filter((item) => this.isVisibleToUser(user, item.visibilityScope))
            .sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime());
        const release = releaseAuthorizations[0] || null;
        const dryPort = dryPortReleases[0] || null;
        const readiness = this.computeReleaseReadiness(shipment, invoices, paymentReceipts, financialClearance, release, visibleDocuments);
        return {
            shipment: {
                shipmentId: shipment.shipmentId,
                shipmentRef: shipment.shipmentRef,
                bookingNumber: shipment.bookingNumber,
                customerName: shipment.customerName,
                lcReference: shipment.lcReference || shipment.bookingNumber,
                status: shipment.status,
                financeStatus: shipment.financeStatus,
                releaseStatus: shipment.releaseStatus,
                dryPortStatus: shipment.dryPortStatus,
                interchangeStatus: shipment.interchangeStatus,
                totalInvoiced: Number(shipment.totalInvoiced || 0),
                totalPaid: Number(shipment.totalPaid || 0),
                balanceDue: Number(shipment.balanceDue || 0),
                financialClearanceAt: shipment.financialClearanceAt,
                releasedAt: shipment.releasedAt,
            },
            bankDocuments,
            invoices: invoices.map((invoice) => ({ ...invoice, lines: linesByInvoice.get(String(invoice._id)) || [] })),
            paymentReceipts,
            financeVerifications: verifications,
            officialReceipts,
            financialClearance: financialClearance || null,
            releaseAuthorization: release,
            dryPortRelease: dryPort,
            containerInterchanges: interchanges,
            driverExpenseClaims: expenseClaims.map((claim) => ({
                ...claim,
                items: itemsByClaim.get(String(claim._id)) || [],
                reimbursement: reimbursements.find((item) => String(item.claimId) === String(claim._id)) || null,
            })),
            documentPack: visibleDocuments,
            timeline: visibleTimeline,
            approvals: ['finance', 'operations', 'dry_port', 'admin'].includes(settlementRole(user)) ? approvals : [],
            readiness,
        };
    }
    async createBankDocument(user, shipmentIdOrRef, body) {
        await (0, mongo_1.connectToDatabase)();
        const shipment = await this.resolveShipment(shipmentIdOrRef);
        this.assertShipmentAccess(user, shipment, { allowCustomer: true, allowOperations: true, allowFinance: true, allowAdmin: true });
        const row = await models_1.BankDocumentModel.create({
            shipmentId: shipment.shipmentId,
            shipmentRef: shipment.shipmentRef,
            bookingNumber: shipment.bookingNumber,
            customerId: shipment.customerId,
            customerName: shipment.customerName,
            lcReference: shipment.lcReference || shipment.bookingNumber,
            documentType: body.documentType || 'ethiopian_bank_bill',
            bankName: body.bankName,
            referenceNo: body.referenceNo,
            issueDate: body.issueDate ? new Date(body.issueDate) : undefined,
            status: 'pending_review',
            fileUrl: body.fileUrl,
            fileName: body.fileName,
            notes: body.notes,
            submittedBy: user.name,
            submittedByUserId: user.id,
            uploadedDocumentId: body.uploadedDocumentId,
        });
        await this.recordWorkflowEvent(shipment, 'bank_document_submitted', 'Bank document submitted', user, {
            entityType: 'bank_document',
            entityId: String(row._id),
            note: `${row.documentType} submitted`,
            visibilityScope: isCustomerLike(user) ? 'customer_visible' : 'internal_only',
        });
        await this.syncShipmentState(shipment.shipmentId);
        return row.toObject();
    }
    async reviewBankDocument(user, bankDocumentId, body) {
        await (0, mongo_1.connectToDatabase)();
        this.assertFinanceOrOps(user);
        const row = await models_1.BankDocumentModel.findByIdAndUpdate(bankDocumentId, {
            $set: {
                status: body.status,
                reviewNote: body.reviewNote || '',
                reviewedBy: user.name,
                reviewedByUserId: user.id,
                reviewedAt: new Date(),
            },
        }, { new: true }).lean();
        if (!row)
            throw new common_1.NotFoundException('Bank document not found');
        const shipment = await this.resolveShipment(row.shipmentId);
        await this.recordApproval(row.shipmentId, 'bank_document', String(row._id), body.status, user, body.reviewNote);
        await this.recordWorkflowEvent(shipment, `bank_document_${body.status}`, `Bank document ${body.status}`, user, {
            entityType: 'bank_document',
            entityId: String(row._id),
            note: body.reviewNote || row.documentType,
            visibilityScope: 'customer_visible',
        });
        await this.syncShipmentState(row.shipmentId);
        return row;
    }
    async createChargeInvoice(user, shipmentIdOrRef, body) {
        await (0, mongo_1.connectToDatabase)();
        this.assertFinanceOrOps(user);
        const shipment = await this.resolveShipment(shipmentIdOrRef);
        const invoiceNo = await this.nextUniqueCode(models_1.ChargeInvoiceModel, 'invoiceNo', body.invoiceNo || `TAB-INV-${new Date().getUTCFullYear()}-${Date.now().toString().slice(-6)}`);
        const lines = Array.isArray(body.lines) ? body.lines : [];
        const subtotal = lines.reduce((sum, line) => sum + Number(line.amount || 0), 0);
        const tax = lines.reduce((sum, line) => sum + Number(line.taxAmount || 0), 0);
        const total = subtotal + tax;
        const invoice = await models_1.ChargeInvoiceModel.create({
            shipmentId: shipment.shipmentId,
            shipmentRef: shipment.shipmentRef,
            bookingNumber: shipment.bookingNumber,
            customerId: shipment.customerId,
            customerName: shipment.customerName,
            invoiceNo,
            invoiceType: body.invoiceType || 'final_invoice',
            currency: body.currency || 'USD',
            subtotal,
            tax,
            total,
            balanceDue: total,
            status: body.status || 'issued',
            dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
            createdBy: user.name,
            createdByUserId: user.id,
            approvedBy: body.approveNow ? user.name : undefined,
            approvedByUserId: body.approveNow ? user.id : undefined,
            approvedAt: body.approveNow ? new Date() : undefined,
            approvalStatus: body.approveNow ? 'approved' : 'pending',
            note: body.note || '',
            pdfDocumentId: body.pdfDocumentId,
        });
        if (lines.length) {
            await models_1.ChargeInvoiceLineModel.insertMany(lines.map((line, index) => ({
                invoiceId: String(invoice._id),
                shipmentId: shipment.shipmentId,
                chargeType: line.chargeType,
                amount: Number(line.amount || 0),
                currency: line.currency || body.currency || 'USD',
                taxRate: Number(line.taxRate || 0),
                taxAmount: Number(line.taxAmount || 0),
                description: line.description,
                createdBy: user.name,
                createdByUserId: user.id,
                approvalStatus: body.approveNow ? 'approved' : 'pending',
                lineOrder: index + 1,
            })));
        }
        await this.recordWorkflowEvent(shipment, 'invoice_issued', 'Customer charge invoice issued', user, {
            entityType: 'charge_invoice',
            entityId: String(invoice._id),
            note: invoiceNo,
            visibilityScope: 'customer_visible',
        });
        await this.syncShipmentState(shipment.shipmentId);
        return this.getShipmentWorkspace(user, shipment.shipmentId);
    }
    async updateChargeInvoice(user, invoiceId, body) {
        await (0, mongo_1.connectToDatabase)();
        this.assertFinanceOrOps(user);
        const invoice = await models_1.ChargeInvoiceModel.findById(invoiceId).lean();
        if (!invoice)
            throw new common_1.NotFoundException('Invoice not found');
        if (Array.isArray(body.lines)) {
            await models_1.ChargeInvoiceLineModel.deleteMany({ invoiceId: String(invoice._id) });
            await models_1.ChargeInvoiceLineModel.insertMany(body.lines.map((line, index) => ({
                invoiceId: String(invoice._id),
                shipmentId: invoice.shipmentId,
                chargeType: line.chargeType,
                amount: Number(line.amount || 0),
                currency: line.currency || invoice.currency,
                taxRate: Number(line.taxRate || 0),
                taxAmount: Number(line.taxAmount || 0),
                description: line.description,
                createdBy: user.name,
                createdByUserId: user.id,
                approvalStatus: body.approvalStatus || invoice.approvalStatus || 'pending',
                lineOrder: index + 1,
            })));
        }
        const lines = await models_1.ChargeInvoiceLineModel.find({ invoiceId: String(invoice._id) }).lean();
        const subtotal = lines.reduce((sum, line) => sum + Number(line.amount || 0), 0);
        const tax = lines.reduce((sum, line) => sum + Number(line.taxAmount || 0), 0);
        const total = subtotal + tax;
        const updated = await models_1.ChargeInvoiceModel.findByIdAndUpdate(invoiceId, {
            $set: {
                invoiceType: body.invoiceType || invoice.invoiceType,
                currency: body.currency || invoice.currency,
                subtotal,
                tax,
                total,
                balanceDue: Math.max(total - Number(invoice.total - Number(invoice.balanceDue || 0)), 0),
                status: body.status || invoice.status,
                dueDate: body.dueDate ? new Date(body.dueDate) : invoice.dueDate,
                approvalStatus: body.approvalStatus || invoice.approvalStatus,
                approvedBy: body.approvalStatus === 'approved' ? user.name : invoice.approvedBy,
                approvedByUserId: body.approvalStatus === 'approved' ? user.id : invoice.approvedByUserId,
                approvedAt: body.approvalStatus === 'approved' ? new Date() : invoice.approvedAt,
                version: Number(invoice.version || 1) + 1,
                note: body.note ?? invoice.note,
            },
        }, { new: true }).lean();
        const shipment = await this.resolveShipment(updated.shipmentId);
        if (body.approvalStatus) {
            await this.recordApproval(updated.shipmentId, 'charge_invoice', String(updated._id), body.approvalStatus, user, body.note);
        }
        await this.recordWorkflowEvent(shipment, 'invoice_updated', 'Customer charge invoice updated', user, {
            entityType: 'charge_invoice',
            entityId: String(updated._id),
            note: updated.invoiceNo,
            visibilityScope: 'customer_visible',
        });
        await this.syncShipmentState(updated.shipmentId);
        return updated;
    }
    async createCustomerPaymentReceipt(user, shipmentIdOrRef, body) {
        await (0, mongo_1.connectToDatabase)();
        const shipment = await this.resolveShipment(shipmentIdOrRef);
        this.assertShipmentAccess(user, shipment, { allowCustomer: true, allowFinance: true, allowAdmin: true });
        const receipt = await models_1.CustomerPaymentReceiptModel.create({
            shipmentId: shipment.shipmentId,
            shipmentRef: shipment.shipmentRef,
            invoiceId: body.invoiceId,
            invoiceNo: body.invoiceNo,
            customerId: shipment.customerId,
            customerName: shipment.customerName,
            amount: Number(body.amount || 0),
            currency: body.currency || 'USD',
            paymentDate: body.paymentDate ? new Date(body.paymentDate) : undefined,
            transactionRef: body.transactionRef,
            bankName: body.bankName,
            verificationStatus: 'pending_verification',
            fileUrl: body.fileUrl,
            fileName: body.fileName,
            submittedBy: user.name,
            submittedByUserId: user.id,
            remark: body.remark || '',
            uploadedDocumentId: body.uploadedDocumentId,
        });
        await this.recordWorkflowEvent(shipment, 'payment_receipt_uploaded', 'Customer payment receipt uploaded', user, {
            entityType: 'customer_payment_receipt',
            entityId: String(receipt._id),
            note: receipt.transactionRef,
            visibilityScope: 'customer_visible',
        });
        await this.syncShipmentState(shipment.shipmentId);
        return receipt.toObject();
    }
    async verifyPaymentReceipt(user, receiptId, body) {
        await (0, mongo_1.connectToDatabase)();
        this.assertFinance(user);
        const receipt = await models_1.CustomerPaymentReceiptModel.findById(receiptId).lean();
        if (!receipt)
            throw new common_1.NotFoundException('Receipt not found');
        const status = body.verificationStatus || 'verified';
        const verifiedAmount = Number(body.amountVerified ?? receipt.amount ?? 0);
        const updated = await models_1.CustomerPaymentReceiptModel.findByIdAndUpdate(receiptId, {
            $set: {
                verificationStatus: status,
                financeNote: body.financeNote || '',
                verifiedBy: user.name,
                verifiedByUserId: user.id,
                verifiedAt: new Date(),
                matchedAmount: verifiedAmount,
            },
        }, { new: true }).lean();
        await models_1.FinanceVerificationModel.create({
            shipmentId: receipt.shipmentId,
            receiptId: String(receipt._id),
            invoiceId: receipt.invoiceId,
            status,
            amountVerified: verifiedAmount,
            mismatchAmount: Math.max(Number(receipt.amount || 0) - verifiedAmount, 0),
            note: body.financeNote || '',
            verifiedBy: user.name,
            verifiedByUserId: user.id,
            verifiedAt: new Date(),
        });
        const shipment = await this.resolveShipment(receipt.shipmentId);
        await this.recordApproval(receipt.shipmentId, 'customer_payment_receipt', String(receipt._id), status, user, body.financeNote);
        await this.recordWorkflowEvent(shipment, `payment_${status}`, `Customer payment ${status}`, user, {
            entityType: 'customer_payment_receipt',
            entityId: String(receipt._id),
            note: body.financeNote || receipt.transactionRef,
            visibilityScope: 'customer_visible',
        });
        await this.syncShipmentState(receipt.shipmentId);
        return updated;
    }
    async issueOfficialReceipt(user, shipmentIdOrRef, body) {
        await (0, mongo_1.connectToDatabase)();
        this.assertFinance(user);
        const shipment = await this.resolveShipment(shipmentIdOrRef);
        const linkedPaymentReceiptIds = Array.isArray(body.linkedPaymentReceiptIds) ? body.linkedPaymentReceiptIds : [];
        const paymentReceipts = await models_1.CustomerPaymentReceiptModel.find({ _id: { $in: linkedPaymentReceiptIds } }).lean();
        if (!paymentReceipts.every((item) => item.verificationStatus === 'verified' || item.verificationStatus === 'partially_verified')) {
            throw new common_1.ForbiddenException('Official receipt can only be issued after payment verification');
        }
        const officialReceiptNo = await this.nextUniqueCode(models_1.OfficialReceiptModel, 'officialReceiptNo', body.officialReceiptNo || `TAB-RCPT-${new Date().getUTCFullYear()}-${Date.now().toString().slice(-6)}`);
        const amountReceived = paymentReceipts.reduce((sum, item) => sum + Number(item.matchedAmount || item.amount || 0), 0);
        const record = await models_1.OfficialReceiptModel.create({
            shipmentId: shipment.shipmentId,
            shipmentRef: shipment.shipmentRef,
            officialReceiptNo,
            customerId: shipment.customerId,
            customerName: shipment.customerName,
            linkedInvoiceIds: body.linkedInvoiceIds || [],
            linkedPaymentReceiptIds,
            amountReceived,
            paymentMethod: body.paymentMethod || 'bank_transfer',
            issuedAt: new Date(),
            issuedBy: user.name,
            issuedByUserId: user.id,
            status: 'issued',
            pdfDocumentId: body.pdfDocumentId,
        });
        await this.recordWorkflowEvent(shipment, 'official_receipt_issued', 'Tikur Abay official receipt issued', user, {
            entityType: 'official_receipt',
            entityId: String(record._id),
            note: officialReceiptNo,
            visibilityScope: 'customer_visible',
        });
        await this.syncShipmentState(shipment.shipmentId);
        return record.toObject();
    }
    async approveFinancialClearance(user, shipmentIdOrRef, body) {
        await (0, mongo_1.connectToDatabase)();
        this.assertFinance(user);
        const shipment = await this.resolveShipment(shipmentIdOrRef);
        const readiness = await this.ensureReadyForFinanceClearance(shipment.shipmentId);
        if (!readiness.ok) {
            throw new common_1.ForbiddenException(readiness.reason);
        }
        const clearance = await models_1.FinancialClearanceModel.findOneAndUpdate({ shipmentId: shipment.shipmentId }, {
            $set: {
                shipmentRef: shipment.shipmentRef,
                status: 'finance_cleared',
                approvedBy: user.name,
                approvedByUserId: user.id,
                approvedAt: new Date(),
                note: body.note || '',
            },
        }, { upsert: true, new: true }).lean();
        await this.recordApproval(shipment.shipmentId, 'financial_clearance', String(clearance._id), 'approved', user, body.note);
        await this.recordWorkflowEvent(shipment, 'finance_cleared', 'Finance clearance approved', user, {
            entityType: 'financial_clearance',
            entityId: String(clearance._id),
            note: body.note || 'Ready for cargo release',
            visibilityScope: 'customer_visible',
        });
        await this.syncShipmentState(shipment.shipmentId);
        return clearance;
    }
    async createReleaseAuthorization(user, shipmentIdOrRef, body) {
        await (0, mongo_1.connectToDatabase)();
        this.assertFinanceOrOps(user);
        const shipment = await this.resolveShipment(shipmentIdOrRef);
        const clearance = await models_1.FinancialClearanceModel.findOne({ shipmentId: shipment.shipmentId }).lean();
        if (!clearance || clearance.status !== 'finance_cleared') {
            throw new common_1.ForbiddenException('Cargo release is blocked until finance clearance is approved');
        }
        const releaseAuthorizationId = await this.nextUniqueCode(models_1.ReleaseAuthorizationModel, 'releaseAuthorizationId', body.releaseAuthorizationId || `REL-${Date.now().toString().slice(-8)}`);
        const documentIds = Array.isArray(body.documentIds) ? body.documentIds.filter(Boolean) : [];
        if (!documentIds.length) {
            throw new common_1.ForbiddenException('Release authorization requires the approved release document pack');
        }
        const record = await models_1.ReleaseAuthorizationModel.create({
            shipmentId: shipment.shipmentId,
            shipmentRef: shipment.shipmentRef,
            releaseAuthorizationId,
            releaseMode: body.releaseMode || 'release_to_dry_port_agent',
            status: body.releaseMode === 'release_to_dry_port_agent' ? 'release_sent_to_dry_port_agent' : 'release_prepared',
            issuedBy: user.name,
            issuedByUserId: user.id,
            issuedAt: new Date(),
            sentToAgentAt: body.releaseMode === 'release_to_dry_port_agent' ? new Date() : undefined,
            recipientDetails: body.recipientDetails || {},
            documentIds,
            note: body.note || '',
            pdfDocumentId: body.pdfDocumentId,
        });
        await this.recordWorkflowEvent(shipment, 'release_authorization_created', 'Release authorization created', user, {
            entityType: 'release_authorization',
            entityId: String(record._id),
            note: record.releaseMode,
            visibilityScope: 'customer_visible',
        });
        await this.syncShipmentState(shipment.shipmentId);
        return record.toObject();
    }
    async confirmDryPortRelease(user, shipmentIdOrRef, body) {
        await (0, mongo_1.connectToDatabase)();
        this.assertDryPort(user);
        const shipment = await this.resolveShipment(shipmentIdOrRef);
        const release = await models_1.ReleaseAuthorizationModel.findOne({ shipmentId: shipment.shipmentId }).sort({ createdAt: -1 }).lean();
        const clearance = await models_1.FinancialClearanceModel.findOne({ shipmentId: shipment.shipmentId }).lean();
        if (!clearance || clearance.status !== 'finance_cleared' || !release) {
            throw new common_1.ForbiddenException('Dry port release is blocked until finance clearance and release authorization are active');
        }
        const record = await models_1.DryPortReleaseModel.create({
            shipmentId: shipment.shipmentId,
            shipmentRef: shipment.shipmentRef,
            releaseAuthorizationId: String(release._id),
            status: 'released_by_dry_port',
            releasedBy: body.releasedBy || user.name,
            releasedByUserId: user.id,
            releasedAt: body.releasedAt ? new Date(body.releasedAt) : new Date(),
            receiverName: body.receiverName,
            receiverIdRef: body.receiverIdRef,
            remarks: body.remarks || '',
            proofFiles: body.proofFiles || [],
            proofDocumentIds: body.proofDocumentIds || [],
        });
        await this.recordWorkflowEvent(shipment, 'dry_port_released_cargo', 'Dry port released cargo', user, {
            entityType: 'dry_port_release',
            entityId: String(record._id),
            note: body.receiverName || 'Release confirmed',
            visibilityScope: 'customer_visible',
        });
        await this.syncShipmentState(shipment.shipmentId);
        return record.toObject();
    }
    async createContainerInterchange(user, shipmentIdOrRef, body) {
        await (0, mongo_1.connectToDatabase)();
        const shipment = await this.resolveShipment(shipmentIdOrRef);
        this.assertShipmentAccess(user, shipment, { allowFinance: true, allowOperations: true, allowDryPort: true, allowDriver: true, allowAdmin: true });
        const record = await models_1.ContainerInterchangeModel.create({
            shipmentId: shipment.shipmentId,
            shipmentRef: shipment.shipmentRef,
            tripId: body.tripId,
            containerNo: body.containerNo || shipment.container?.containerNumber || shipment.containerNumber,
            sealNo: body.sealNo || shipment.container?.sealNumber,
            interchangeType: body.interchangeType,
            location: body.location,
            eventDate: body.eventDate ? new Date(body.eventDate) : new Date(),
            documentUrl: body.documentUrl,
            documentId: body.documentId,
            receivedBy: body.receivedBy || user.name,
            receivedByUserId: user.id,
            conditionNotes: body.conditionNotes || '',
            status: body.status || 'recorded',
        });
        await this.recordWorkflowEvent(shipment, `interchange_${body.interchangeType}`, 'Container interchange recorded', user, {
            entityType: 'container_interchange',
            entityId: String(record._id),
            note: `${record.interchangeType} at ${record.location || 'unknown location'}`,
            visibilityScope: 'customer_visible',
        });
        await this.syncShipmentState(shipment.shipmentId);
        return record.toObject();
    }
    async submitDriverExpenseClaim(user, shipmentIdOrRef, body) {
        await (0, mongo_1.connectToDatabase)();
        this.assertDriver(user);
        const shipment = await this.resolveShipment(shipmentIdOrRef);
        const tripId = String(body.tripId || '');
        if (tripId) {
            const assignedTrip = await models_1.CorridorTripAssignmentModel.findOne({ tripId }).lean();
            if (assignedTrip && !this.driverOwnsTrip(user, assignedTrip)) {
                throw new common_1.ForbiddenException('Driver can only submit claims for assigned trips');
            }
        }
        const items = Array.isArray(body.items) ? body.items : [];
        const totalClaimed = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
        const claim = await models_1.DriverExpenseClaimModel.create({
            shipmentId: shipment.shipmentId,
            shipmentRef: shipment.shipmentRef,
            tripId,
            driverId: user.id,
            driverName: user.name,
            totalClaimed,
            totalApproved: 0,
            status: 'submitted',
            submittedAt: new Date(),
            financeNote: body.financeNote || '',
        });
        if (items.length) {
            await models_1.DriverExpenseItemModel.insertMany(items.map((item) => ({
                claimId: String(claim._id),
                shipmentId: shipment.shipmentId,
                tripId,
                category: item.category,
                amount: Number(item.amount || 0),
                currency: item.currency || 'ETB',
                paidDate: item.paidDate ? new Date(item.paidDate) : undefined,
                location: item.location,
                receiptFileUrl: item.receiptFileUrl,
                receiptDocumentId: item.receiptDocumentId,
                status: 'submitted',
                financeNote: '',
                approvedAmount: 0,
                notes: item.notes || '',
            })));
        }
        await this.recordWorkflowEvent(shipment, 'driver_expense_submitted', 'Driver expense claim submitted', user, {
            entityType: 'driver_expense_claim',
            entityId: String(claim._id),
            note: tripId || shipment.shipmentRef,
            visibilityScope: 'driver_visible',
        });
        await this.syncShipmentState(shipment.shipmentId);
        return this.getShipmentWorkspace(user, shipment.shipmentId);
    }
    async reviewDriverExpenseClaim(user, claimId, body) {
        await (0, mongo_1.connectToDatabase)();
        this.assertFinance(user);
        const claim = await models_1.DriverExpenseClaimModel.findById(claimId).lean();
        if (!claim)
            throw new common_1.NotFoundException('Driver expense claim not found');
        const items = Array.isArray(body.items) ? body.items : [];
        for (const item of items) {
            await models_1.DriverExpenseItemModel.findByIdAndUpdate(item.itemId, {
                $set: {
                    status: item.status || 'approved',
                    approvedAmount: Number(item.approvedAmount || 0),
                    financeNote: item.financeNote || '',
                },
            });
        }
        const nextItems = await models_1.DriverExpenseItemModel.find({ claimId: String(claim._id) }).lean();
        const totalApproved = nextItems.reduce((sum, item) => sum + Number(item.approvedAmount || 0), 0);
        const status = body.status || (totalApproved > 0 ? 'approved' : 'rejected');
        const updated = await models_1.DriverExpenseClaimModel.findByIdAndUpdate(claimId, {
            $set: {
                totalApproved,
                status,
                reviewedBy: user.name,
                reviewedByUserId: user.id,
                reviewedAt: new Date(),
                financeNote: body.financeNote || '',
            },
        }, { new: true }).lean();
        const shipment = await this.resolveShipment(claim.shipmentId);
        await this.recordApproval(claim.shipmentId, 'driver_expense_claim', String(claim._id), status, user, body.financeNote);
        await this.recordWorkflowEvent(shipment, 'driver_expense_reviewed', 'Driver expense claim reviewed', user, {
            entityType: 'driver_expense_claim',
            entityId: String(claim._id),
            note: body.financeNote || status,
            visibilityScope: 'driver_visible',
        });
        return updated;
    }
    async reimburseDriverExpenseClaim(user, claimId, body) {
        await (0, mongo_1.connectToDatabase)();
        this.assertFinance(user);
        const claim = await models_1.DriverExpenseClaimModel.findById(claimId).lean();
        if (!claim)
            throw new common_1.NotFoundException('Driver expense claim not found');
        if (!['approved', 'reimbursed', 'closed'].includes(String(claim.status))) {
            throw new common_1.ForbiddenException('Driver reimbursement cannot be paid before finance approval');
        }
        const reimbursement = await models_1.DriverReimbursementModel.findOneAndUpdate({ claimId: String(claim._id) }, {
            $set: {
                shipmentId: claim.shipmentId,
                amountPaid: Number(body.amountPaid || claim.totalApproved || 0),
                paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
                method: body.method || 'bank_transfer',
                referenceNo: body.referenceNo,
                status: body.status || 'reimbursed',
                paidBy: user.name,
                paidByUserId: user.id,
                pdfDocumentId: body.pdfDocumentId,
            },
        }, { upsert: true, new: true }).lean();
        await models_1.DriverExpenseClaimModel.findByIdAndUpdate(claimId, {
            $set: {
                status: reimbursement.status === 'reimbursed' ? 'reimbursed' : claim.status,
            },
        });
        const shipment = await this.resolveShipment(claim.shipmentId);
        await this.recordWorkflowEvent(shipment, 'driver_reimbursed', 'Driver reimbursement recorded', user, {
            entityType: 'driver_reimbursement',
            entityId: String(reimbursement._id),
            note: reimbursement.referenceNo || reimbursement.method,
            visibilityScope: 'driver_visible',
        });
        return reimbursement;
    }
    async financeDashboard(user) {
        await (0, mongo_1.connectToDatabase)();
        this.assertFinanceOrAdmin(user);
        const [shipments, receipts, claims] = await Promise.all([
            models_1.CorridorShipmentModel.find({}).lean(),
            models_1.CustomerPaymentReceiptModel.find({}).lean(),
            models_1.DriverExpenseClaimModel.find({}).lean(),
        ]);
        return {
            awaitingReceiptVerification: receipts.filter((item) => item.verificationStatus === 'pending_verification').length,
            partiallyPaidShipments: shipments.filter((item) => Number(item.totalPaid || 0) > 0 && Number(item.balanceDue || 0) > 0).length,
            releaseBlockedByFinance: shipments.filter((item) => String(item.releaseStatus || '').includes('not_ready') || Number(item.balanceDue || 0) > 0).length,
            reimbursableDriverClaimsPending: claims.filter((item) => ['submitted', 'under_review', 'approved'].includes(String(item.status))).length,
            totalInvoiced: shipments.reduce((sum, item) => sum + Number(item.totalInvoiced || 0), 0),
            totalCollected: shipments.reduce((sum, item) => sum + Number(item.totalPaid || 0), 0),
            totalOutstanding: shipments.reduce((sum, item) => sum + Number(item.balanceDue || 0), 0),
        };
    }
    async operationsDashboard(user) {
        await (0, mongo_1.connectToDatabase)();
        this.assertOpsOrAdmin(user);
        const [shipments, bankDocs] = await Promise.all([
            models_1.CorridorShipmentModel.find({}).lean(),
            models_1.BankDocumentModel.find({}).lean(),
        ]);
        return {
            awaitingBankDocReview: bankDocs.filter((item) => item.status === 'pending_review').length,
            awaitingInvoicePreparation: shipments.filter((item) => Number(item.totalInvoiced || 0) === 0).length,
            readyForRelease: shipments.filter((item) => item.releaseStatus === 'release_prepared' || item.releaseStatus === 'finance_cleared').length,
            releasedToday: shipments.filter((item) => item.releasedAt && isSameUtcDate(item.releasedAt, new Date())).length,
            pendingDryPortConfirmation: shipments.filter((item) => item.releaseStatus === 'release_sent_to_dry_port_agent' && item.dryPortStatus !== 'released_by_dry_port').length,
            pendingInterchangeClosure: shipments.filter((item) => item.interchangeStatus !== 'container_cycle_closed').length,
        };
    }
    async reimbursementDashboard(user) {
        await (0, mongo_1.connectToDatabase)();
        this.assertFinanceOrAdmin(user);
        const claims = await models_1.DriverExpenseClaimModel.find({}).lean();
        return {
            submittedClaims: claims.filter((item) => item.status === 'submitted').length,
            underReview: claims.filter((item) => item.status === 'under_review').length,
            approvedAwaitingPayment: claims.filter((item) => item.status === 'approved').length,
            reimbursedThisWeek: claims.filter((item) => item.status === 'reimbursed' && withinDays(item.reviewedAt || item.updatedAt, 7)).length,
        };
    }
    async resolveShipment(shipmentIdOrRef) {
        let shipment = await models_1.CorridorShipmentModel.findOne({
            $or: [
                { shipmentId: shipmentIdOrRef },
                { shipmentRef: shipmentIdOrRef },
                { bookingNumber: shipmentIdOrRef },
            ],
        }).lean();
        if (!shipment) {
            shipment = await (0, corridor_shipment_materializer_1.materializeCorridorShipmentFromBooking)(shipmentIdOrRef);
        }
        if (!shipment && String(shipmentIdOrRef || '').startsWith('SHP-')) {
            const booking = await models_1.BookingModel.findOne({ shipmentRef: shipmentIdOrRef }).lean();
            if (booking?.bookingCode) {
                shipment = await (0, corridor_shipment_materializer_1.materializeCorridorShipmentFromBooking)(String(booking.bookingCode));
            }
        }
        if (!shipment)
            throw new common_1.NotFoundException('Shipment not found');
        return shipment;
    }
    assertShipmentAccess(user, shipment, options = {}) {
        const role = settlementRole(user);
        if (role === 'admin')
            return;
        if (role === 'finance' && options.allowFinance !== false)
            return;
        if (role === 'operations' && options.allowOperations)
            return;
        if (role === 'dry_port' && options.allowDryPort)
            return;
        if (role === 'driver' && options.allowDriver)
            return;
        if (role === 'customer' && options.allowCustomer !== false) {
            const customerMatch = String(shipment.customerCode || '') === String(user.customerCode || '') ||
                String(shipment.customerId || '') === String(user.customerCode || '') ||
                String(shipment.customerName || '').toLowerCase() === String(user.name || '').toLowerCase();
            if (customerMatch)
                return;
        }
        throw new common_1.ForbiddenException('You do not have access to this shipment workflow');
    }
    assertFinance(user) {
        if (!['finance', 'admin'].includes(settlementRole(user))) {
            throw new common_1.ForbiddenException('Finance access required');
        }
    }
    assertFinanceOrOps(user) {
        if (!['finance', 'operations', 'admin'].includes(settlementRole(user))) {
            throw new common_1.ForbiddenException('Finance or operations access required');
        }
    }
    assertOpsOrAdmin(user) {
        if (!['operations', 'admin', 'finance'].includes(settlementRole(user))) {
            throw new common_1.ForbiddenException('Operations access required');
        }
    }
    assertDryPort(user) {
        if (!['dry_port', 'admin'].includes(settlementRole(user))) {
            throw new common_1.ForbiddenException('Dry-port access required');
        }
    }
    assertDriver(user) {
        if (!['driver', 'admin'].includes(settlementRole(user))) {
            throw new common_1.ForbiddenException('Driver access required');
        }
    }
    assertFinanceOrAdmin(user) {
        if (!['finance', 'admin'].includes(settlementRole(user))) {
            throw new common_1.ForbiddenException('Finance access required');
        }
    }
    async ensureReadyForFinanceClearance(shipmentId) {
        const [invoices, receipts, bankDocs] = await Promise.all([
            models_1.ChargeInvoiceModel.find({ shipmentId }).lean(),
            models_1.CustomerPaymentReceiptModel.find({ shipmentId }).lean(),
            models_1.BankDocumentModel.find({ shipmentId }).lean(),
        ]);
        if (!bankDocs.some((item) => item.status === 'accepted')) {
            return { ok: false, reason: 'Finance clearance is blocked until an accepted bank document exists' };
        }
        if (!invoices.length || invoices.some((item) => item.approvalStatus !== 'approved' && item.status !== 'issued')) {
            return { ok: false, reason: 'Finance clearance is blocked until required invoices are issued' };
        }
        const totalInvoiced = invoices.reduce((sum, item) => sum + Number(item.total || 0), 0);
        const totalVerified = receipts
            .filter((item) => ['verified', 'partially_verified'].includes(String(item.verificationStatus)))
            .reduce((sum, item) => sum + Number(item.matchedAmount || item.amount || 0), 0);
        if (totalVerified < totalInvoiced) {
            return { ok: false, reason: 'Release Blocked – Outstanding Balance' };
        }
        const officialReceiptCount = await models_1.OfficialReceiptModel.countDocuments({ shipmentId });
        if (!officialReceiptCount) {
            return { ok: false, reason: 'Finance clearance is blocked until the official Tikur Abay receipt is issued' };
        }
        return { ok: true };
    }
    computeReleaseReadiness(shipment, invoices, paymentReceipts, financialClearance, release, documents = []) {
        const totalInvoiced = invoices.reduce((sum, item) => sum + Number(item.total || 0), 0);
        const totalVerified = paymentReceipts
            .filter((item) => ['verified', 'partially_verified'].includes(String(item.verificationStatus)))
            .reduce((sum, item) => sum + Number(item.matchedAmount || item.amount || 0), 0);
        const balanceDue = Math.max(totalInvoiced - totalVerified, 0);
        const categories = documents.map((item) => String(item.category || item.documentType || '').toLowerCase());
        const hasReleasePack = categories.some((item) => ['release_authorization', 'document_handover_sheet', 'customs_pack', 'cargo_handover_note', 'delivery_note'].includes(item));
        return {
            totalInvoiced,
            totalVerified,
            balanceDue,
            blockedReason: balanceDue > 0
                ? 'Release Blocked – Outstanding Balance'
                : financialClearance?.status !== 'finance_cleared'
                    ? 'Awaiting finance clearance'
                    : !hasReleasePack && !release
                        ? 'Awaiting release document pack'
                        : release?.status || 'Ready for Release',
            readyForRelease: balanceDue === 0 && financialClearance?.status === 'finance_cleared',
        };
    }
    async syncShipmentState(shipmentId) {
        const shipment = await models_1.CorridorShipmentModel.findOne({ shipmentId }).lean();
        if (!shipment)
            return;
        const [bankDocs, invoices, receipts, officialReceipts, financialClearance, releaseAuthorization, dryPortRelease, interchanges,] = await Promise.all([
            models_1.BankDocumentModel.find({ shipmentId }).lean(),
            models_1.ChargeInvoiceModel.find({ shipmentId }).lean(),
            models_1.CustomerPaymentReceiptModel.find({ shipmentId }).lean(),
            models_1.OfficialReceiptModel.find({ shipmentId }).lean(),
            models_1.FinancialClearanceModel.findOne({ shipmentId }).lean(),
            models_1.ReleaseAuthorizationModel.findOne({ shipmentId }).sort({ createdAt: -1 }).lean(),
            models_1.DryPortReleaseModel.findOne({ shipmentId }).sort({ createdAt: -1 }).lean(),
            models_1.ContainerInterchangeModel.find({ shipmentId }).lean(),
        ]);
        const totalInvoiced = invoices.reduce((sum, item) => sum + Number(item.total || 0), 0);
        const totalPaid = receipts
            .filter((item) => ['verified', 'partially_verified'].includes(String(item.verificationStatus)))
            .reduce((sum, item) => sum + Number(item.matchedAmount || item.amount || 0), 0);
        const balanceDue = Math.max(totalInvoiced - totalPaid, 0);
        const financeStatus = !bankDocs.some((item) => item.status === 'accepted') ? 'awaiting_bank_document'
            : !invoices.length ? 'awaiting_invoice_preparation'
                : !receipts.length ? 'awaiting_customer_payment'
                    : balanceDue > 0 ? 'payment_under_review'
                        : !officialReceipts.length ? 'awaiting_official_receipt'
                            : financialClearance?.status === 'finance_cleared' ? 'finance_cleared'
                                : 'awaiting_finance_clearance';
        const releaseStatus = balanceDue > 0 || financialClearance?.status !== 'finance_cleared'
            ? 'not_ready_for_release'
            : !releaseAuthorization
                ? 'finance_cleared'
                : releaseAuthorization.releaseMode === 'release_to_customer' && dryPortRelease
                    ? 'released_to_customer'
                    : releaseAuthorization.releaseMode === 'release_to_dry_port_agent' && dryPortRelease
                        ? 'released_by_dry_port'
                        : releaseAuthorization.status || 'release_prepared';
        const dryPortStatus = !releaseAuthorization ? 'awaiting_release'
            : !dryPortRelease ? 'awaiting_dry_port_release'
                : 'released_by_dry_port';
        const hasEmptyInDjibouti = interchanges.some((item) => item.interchangeType === 'empty_in');
        const hasEmptyReturnDoc = interchanges.some((item) => item.interchangeType === 'empty_in' && item.documentId);
        const interchangeStatus = hasEmptyInDjibouti && hasEmptyReturnDoc ? 'container_cycle_closed'
            : hasEmptyInDjibouti ? 'interchange_document_received'
                : interchanges.some((item) => item.interchangeType === 'empty_out') ? 'empty_returned'
                    : interchanges.some((item) => item.interchangeType === 'cargo_unloaded') ? 'cargo_unloaded'
                        : 'full_received';
        await models_1.CorridorShipmentModel.updateOne({ shipmentId }, {
            $set: {
                financeStatus,
                releaseStatus,
                dryPortStatus,
                interchangeStatus,
                totalInvoiced,
                totalPaid,
                balanceDue,
                paymentStatus: balanceDue === 0 && totalInvoiced > 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'pending',
                financialClearanceAt: financialClearance?.approvedAt || null,
                releasedAt: dryPortRelease?.releasedAt || releaseAuthorization?.issuedAt || null,
                releaseReadiness: balanceDue > 0 ? 'Release Blocked – Outstanding Balance' : financialClearance?.status === 'finance_cleared' ? 'Ready for Release' : 'Awaiting finance clearance',
                financeBlockReason: balanceDue > 0 ? 'Release Blocked – Outstanding Balance' : '',
                lcReference: shipment.lcReference || shipment.bookingNumber,
            },
        });
    }
    async recordWorkflowEvent(shipment, code, title, user, options = {}) {
        const occurredAt = new Date();
        await models_1.CorridorMilestoneModel.create({
            milestoneId: `${shipment.shipmentId}-${code}-${Date.now()}`,
            shipmentId: shipment.shipmentId,
            shipmentRef: shipment.shipmentRef,
            stage: 'import_settlement',
            code,
            label: title,
            status: 'done',
            occurredAt,
            location: options.location || shipment.inlandDestination || shipment.portOfDischarge,
            sourceRole: user.role,
            sourceUserId: user.id,
            note: options.note || '',
            visibilityScope: options.visibilityScope || 'internal_only',
        });
        await models_1.ActivityLogModel.create({
            entityType: options.entityType || 'shipment',
            entityId: shipment.shipmentId,
            userId: user.id,
            activityType: code,
            title,
            description: options.note || title,
            metadata: {
                shipmentId: shipment.shipmentId,
                shipmentRef: shipment.shipmentRef,
                linkedEntityId: options.entityId || null,
            },
        });
        await models_1.NotificationEventModel.create({
            notificationEventId: `${shipment.shipmentId}-${code}-${Date.now()}`,
            triggerType: code,
            entityType: 'shipment',
            entityId: shipment.shipmentId,
            shipmentId: shipment.shipmentId,
            payload: {
                title,
                shipmentRef: shipment.shipmentRef,
            },
            status: 'queued',
            createdByUserId: user.id,
        });
    }
    async recordApproval(shipmentId, entityType, entityId, actionStatus, user, reason) {
        await models_1.ApprovalActionModel.create({
            entityType,
            entityId,
            shipmentId,
            actionType: `${entityType}_${actionStatus}`,
            actionStatus,
            reason: reason || '',
            comment: reason || '',
            actedBy: user.name,
            actedByUserId: user.id,
            actedAt: new Date(),
        });
    }
    async nextUniqueCode(model, field, baseCode) {
        let candidate = baseCode;
        let suffix = 1;
        while (await model.findOne({ [field]: candidate }).lean()) {
            candidate = `${baseCode}-${suffix}`;
            suffix += 1;
        }
        return candidate;
    }
    driverOwnsTrip(user, assignedTrip) {
        return String(assignedTrip.driverId || '') === String(user.id || '')
            || String(assignedTrip.driverName || '').toLowerCase() === String(user.name || '').toLowerCase()
            || String(assignedTrip.driverPhone || '') === String(user.phone || '');
    }
    isVisibleToUser(user, visibilityScope) {
        const scope = String(visibilityScope || 'internal_only');
        if (scope === 'public')
            return true;
        if (scope === 'customer_visible') {
            return ['customer', 'finance', 'operations', 'dry_port', 'admin'].includes(settlementRole(user));
        }
        if (scope === 'driver_visible') {
            return ['driver', 'finance', 'operations', 'admin'].includes(settlementRole(user));
        }
        return ['finance', 'operations', 'dry_port', 'admin'].includes(settlementRole(user));
    }
};
exports.ImportSettlementService = ImportSettlementService;
exports.ImportSettlementService = ImportSettlementService = __decorate([
    (0, common_1.Injectable)()
], ImportSettlementService);
function settlementRole(user) {
    const role = String(user.mobileRole || user.role || '').toLowerCase();
    if (['super_admin', 'executive', 'executive_supervisor'].includes(role))
        return 'admin';
    if (['finance_officer', 'finance_customs_control'].includes(role))
        return 'finance';
    if (['operations_manager', 'supplier_agent', 'djibouti_release_agent', 'djibouti_clearing_agent', 'corridor_dispatch_agent'].includes(role))
        return 'operations';
    if (['dry_port_yard_agent'].includes(role))
        return 'dry_port';
    if (['driver', 'internal_driver', 'external_driver'].includes(role))
        return 'driver';
    if (['customer', 'customer_user', 'customer_agent'].includes(role))
        return 'customer';
    return 'other';
}
function isCustomerLike(user) {
    return settlementRole(user) === 'customer';
}
function withinDays(value, days) {
    if (!value)
        return false;
    return Date.now() - new Date(String(value)).getTime() <= days * 24 * 60 * 60 * 1000;
}
function isSameUtcDate(value, now) {
    if (!value)
        return false;
    const date = new Date(String(value));
    return date.getUTCFullYear() === now.getUTCFullYear()
        && date.getUTCMonth() === now.getUTCMonth()
        && date.getUTCDate() === now.getUTCDate();
}
//# sourceMappingURL=import-settlement.service.js.map