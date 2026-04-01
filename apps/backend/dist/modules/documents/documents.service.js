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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentsService = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const config_1 = require("../../database/config");
const mongo_1 = require("../../database/mongo");
const models_1 = require("../../database/models");
const document_policy_1 = require("./document-policy");
const storage_service_1 = require("./storage.service");
let DocumentsService = class DocumentsService {
    constructor(storageService) {
        this.storageService = storageService;
    }
    async list(user) {
        await (0, mongo_1.connectToDatabase)();
        const rows = await this.findDocumentsForUser(user);
        return rows.map((row) => this.toView(row));
    }
    listPolicy(filters) {
        return (0, document_policy_1.listDocumentPolicies)(filters);
    }
    async upload(user, body) {
        await (0, mongo_1.connectToDatabase)();
        const fileName = body.fileName || `upload-${Date.now()}.bin`;
        const mimeType = body.mimeType || this.inferMimeType(fileName);
        const fileSize = Number(body.fileSize ?? 512_000);
        this.validateUpload(fileName, mimeType, fileSize);
        const storageKey = `${body.entityType || (user.role === 'customer' ? 'customer' : 'trip')}/${body.entityId || user.customerCode || user.id}/${Date.now()}-${fileName}`;
        const stored = await this.storageService.persistDocument(storageKey, {
            fileName,
            mimeType,
            fileContentBase64: body.fileContentBase64,
            title: body.title,
            category: body.documentType || body.category,
            entityType: body.entityType,
            entityId: body.entityId,
            fileUrl: body.fileUrl,
            actor: user.name,
        });
        const uploaded = await models_1.UploadedDocumentModel.create({
            entityType: body.entityType || (user.role === 'customer' ? 'customer' : 'trip'),
            entityId: body.entityId || user.customerCode || user.id,
            title: body.title || fileName,
            documentType: body.documentType || body.category || 'document',
            category: body.documentType || body.category || 'document',
            fileName,
            fileUrl: stored.fileUrl,
            storageKey,
            storageMode: stored.storageMode,
            mimeType,
            fileSize,
            uploadedBy: user.name,
            uploadedById: user.id,
            status: body.status || 'uploaded',
            referenceNo: body.referenceNo || '',
            visibilityScope: body.visibilityScope || defaultDocumentVisibility(user.role, body.documentType || body.category),
        });
        await this.autoLinkDriverExpense(user, uploaded.toObject());
        return this.toView(uploaded.toObject());
    }
    async getOne(user, id) {
        await (0, mongo_1.connectToDatabase)();
        const doc = await this.findById(id);
        this.assertAccess(user, doc);
        return this.toView(doc);
    }
    async download(user, id) {
        await (0, mongo_1.connectToDatabase)();
        const doc = await this.findById(id);
        this.assertAccess(user, doc);
        const remoteDownload = await this.storageService.buildDownloadUrl(doc.storageKey || '', doc.fileName, doc.mimeType || this.inferMimeType(doc.fileName));
        return {
            id: String(doc._id),
            fileName: doc.fileName,
            mimeType: doc.mimeType || this.inferMimeType(doc.fileName),
            fileSize: doc.fileSize || null,
            downloadUrl: remoteDownload.storageMode === 's3' ? remoteDownload.url : this.buildSignedDownloadUrl(String(doc._id)),
            storageMode: doc.storageMode || remoteDownload.storageMode || 'local',
        };
    }
    async createUploadUrl(user, body) {
        const fileName = body.fileName || `upload-${Date.now()}.bin`;
        const mimeType = body.mimeType || this.inferMimeType(fileName);
        const fileSize = Number(body.fileSize ?? 512_000);
        this.validateUpload(fileName, mimeType, fileSize);
        const entityType = body.entityType || (user.role === 'customer' ? 'customer' : 'trip');
        const entityId = body.entityId || user.customerCode || user.id;
        const storageKey = `${entityType}/${entityId}/${Date.now()}-${fileName}`;
        const upload = await this.storageService.createPresignedUpload(storageKey, { mimeType, fileSize, fileName });
        return {
            ...upload,
            fileName,
            mimeType,
            fileSize,
            finalize: {
                title: body.title || fileName,
                entityType,
                entityId,
                category: body.documentType || body.category || 'document',
                documentType: body.documentType || body.category || 'document',
                referenceNo: body.referenceNo || '',
                visibilityScope: body.visibilityScope || defaultDocumentVisibility(user.role, body.documentType || body.category),
                status: body.status || 'uploaded',
                fileName,
                mimeType,
                fileSize,
                storageKey,
            },
        };
    }
    async finalizeUpload(user, body) {
        const fileName = body.fileName || `upload-${Date.now()}.bin`;
        const mimeType = body.mimeType || this.inferMimeType(fileName);
        const fileSize = Number(body.fileSize ?? 512_000);
        this.validateUpload(fileName, mimeType, fileSize);
        const entityType = body.entityType || (user.role === 'customer' ? 'customer' : 'trip');
        const entityId = body.entityId || user.customerCode || user.id;
        const storageKey = body.storageKey || `${entityType}/${entityId}/${Date.now()}-${fileName}`;
        const storageMode = (0, config_1.getRuntimeConfig)().fileStorageMode;
        const uploaded = await models_1.UploadedDocumentModel.create({
            entityType,
            entityId,
            title: body.title || fileName,
            documentType: body.documentType || body.category || 'document',
            category: body.documentType || body.category || 'document',
            fileName,
            fileUrl: body.fileUrl || `${storageMode}://${storageKey}`,
            storageKey,
            storageMode,
            mimeType,
            fileSize,
            uploadedBy: user.name,
            uploadedById: user.id,
            status: body.status || 'uploaded',
            referenceNo: body.referenceNo || '',
            visibilityScope: body.visibilityScope || defaultDocumentVisibility(user.role, body.documentType || body.category),
        });
        await this.autoLinkDriverExpense(user, uploaded.toObject());
        return this.toView(uploaded.toObject());
    }
    async resolveSignedDownload(id, token) {
        await (0, mongo_1.connectToDatabase)();
        const doc = await this.findById(id);
        if (!this.verifyDownloadToken(id, token)) {
            throw new common_1.ForbiddenException('Invalid or expired document download token');
        }
        return {
            id: String(doc._id),
            fileName: doc.fileName,
            mimeType: doc.mimeType || this.inferMimeType(doc.fileName),
            fileSize: doc.fileSize || null,
            fileUrl: doc.fileUrl,
            storageKey: doc.storageKey || null,
            storageMode: doc.storageMode || 'local',
            message: doc.fileUrl?.startsWith('local://')
                ? 'Local storage placeholder. Replace with S3 or file-serving middleware for binary download.'
                : 'Signed document metadata resolved successfully.',
        };
    }
    async resolveSignedDownloadFile(id, token) {
        await (0, mongo_1.connectToDatabase)();
        const doc = await this.findById(id);
        if (!this.verifyDownloadToken(id, token)) {
            throw new common_1.ForbiddenException('Invalid or expired document download token');
        }
        if ((doc.storageMode || 'local') !== 'local') {
            throw new common_1.ForbiddenException('Direct file streaming is only available for local storage mode');
        }
        const absolutePath = await this.storageService.resolveLocalFile(doc.storageKey || '');
        return {
            absolutePath,
            fileName: doc.fileName,
            mimeType: doc.mimeType || this.inferMimeType(doc.fileName),
        };
    }
    async byEntity(user, entityType, entityId) {
        await (0, mongo_1.connectToDatabase)();
        const [uploaded, documents] = await Promise.all([
            models_1.UploadedDocumentModel.find({ entityType, entityId }).sort({ createdAt: -1 }).lean(),
            models_1.DocumentModel.find({ entityType, entityId }).sort({ createdAt: -1 }).lean(),
        ]);
        return [...uploaded, ...documents]
            .filter((row) => this.canAccess(user, row))
            .map((row) => this.toView(row));
    }
    async findDocumentsForUser(user) {
        if (user.role === 'customer') {
            return models_1.DocumentModel.find({ entityId: user.customerCode }).sort({ createdAt: -1 }).limit(100).lean();
        }
        if (user.role === 'driver') {
            return models_1.UploadedDocumentModel.find({ $or: [{ uploadedById: user.id }, { uploadedBy: user.name }] })
                .sort({ createdAt: -1 })
                .limit(100)
                .lean();
        }
        const [uploaded, documents] = await Promise.all([
            models_1.UploadedDocumentModel.find().sort({ createdAt: -1 }).limit(100).lean(),
            models_1.DocumentModel.find().sort({ createdAt: -1 }).limit(100).lean(),
        ]);
        return [...uploaded, ...documents].sort((a, b) => new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime());
    }
    async findById(id) {
        const doc = (await models_1.UploadedDocumentModel.findById(id).lean()) ||
            (await models_1.DocumentModel.findById(id).lean());
        if (!doc) {
            throw new common_1.NotFoundException('Document not found');
        }
        return doc;
    }
    toView(doc) {
        const status = doc.status || doc.approvalStatus || 'available';
        const category = doc.category || doc.documentType || 'document';
        const policy = (0, document_policy_1.documentPolicyFor)(doc.entityType, category);
        return {
            id: String(doc._id),
            title: doc.title || doc.fileName,
            fileName: doc.fileName,
            category,
            categoryLabel: (0, document_policy_1.documentCategoryLabel)(doc.entityType, category),
            categoryGroup: policy.group,
            categoryGroupOrder: policy.groupOrder,
            categoryOrder: policy.displayOrder,
            categoryPriority: policy.priority,
            entityType: doc.entityType,
            entityId: doc.entityId,
            status,
            mimeType: doc.mimeType || this.inferMimeType(doc.fileName),
            fileSize: doc.fileSize || null,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
            referenceNo: doc.referenceNo || '',
            visibilityScope: doc.visibilityScope || defaultDocumentVisibility('internal', category),
            uploadedBy: doc.uploadedBy || '',
            uploadedById: doc.uploadedById || '',
            downloadUrl: doc.storageMode === 's3' ? '' : this.buildSignedDownloadUrl(String(doc._id)),
            requirementState: (0, document_policy_1.documentRequirementState)(status),
            mobileCanUpload: (0, document_policy_1.documentMobileCanUpload)(doc.entityType, category, status),
        };
    }
    canAccess(user, doc) {
        if (user.permissions.includes('*'))
            return true;
        if (user.role === 'customer')
            return doc.entityId === user.customerCode;
        if (user.role === 'driver')
            return doc.uploadedById === user.id || doc.uploadedBy === user.name;
        return true;
    }
    assertAccess(user, doc) {
        if (!this.canAccess(user, doc)) {
            throw new common_1.ForbiddenException('You do not have access to this document');
        }
    }
    buildSignedDownloadUrl(id) {
        const base = (0, config_1.getRuntimeConfig)().apiPublicUrl;
        const expiresAt = Date.now() + 10 * 60_000;
        const payload = `${id}:${expiresAt}`;
        const signature = (0, node_crypto_1.createHmac)('sha256', (0, config_1.getRuntimeConfig)().jwtAccessSecret).update(payload).digest('hex');
        return `${base}/documents/${id}/download/file?token=${expiresAt}.${signature}`;
    }
    verifyDownloadToken(id, token) {
        const [expiresAtRaw, signature] = token.split('.');
        const expiresAt = Number(expiresAtRaw);
        if (!expiresAt || !signature || expiresAt < Date.now()) {
            return false;
        }
        const expected = (0, node_crypto_1.createHmac)('sha256', (0, config_1.getRuntimeConfig)().jwtAccessSecret).update(`${id}:${expiresAt}`).digest('hex');
        return expected === signature;
    }
    validateUpload(fileName, mimeType, fileSize) {
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf', 'image/webp'];
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf', '.webp'];
        const extensionOk = allowedExtensions.some((suffix) => fileName.toLowerCase().endsWith(suffix));
        if (!allowedMimeTypes.includes(mimeType) && !extensionOk) {
            throw new common_1.ForbiddenException('Unsupported file type');
        }
        if (fileSize > 10 * 1024 * 1024) {
            throw new common_1.ForbiddenException('File too large');
        }
    }
    inferMimeType(fileName) {
        const lower = String(fileName || '').toLowerCase();
        if (lower.endsWith('.pdf'))
            return 'application/pdf';
        if (lower.endsWith('.png'))
            return 'image/png';
        if (lower.endsWith('.webp'))
            return 'image/webp';
        return 'image/jpeg';
    }
    async autoLinkDriverExpense(user, doc) {
        const mobileRole = String(user.mobileRole || user.role || '').toLowerCase();
        const category = String(doc.category || doc.documentType || '').toLowerCase();
        if (!['driver', 'internal_driver', 'external_driver'].includes(mobileRole))
            return;
        if (!['expense_receipt', 'fuel_receipt', 'expense', 'receipt'].includes(category))
            return;
        const trip = await models_1.CorridorTripAssignmentModel.findOne({ tripId: String(doc.entityId || '') }).lean();
        if (!trip?.shipmentId)
            return;
        const shipment = await models_1.CorridorShipmentModel.findOne({ shipmentId: trip.shipmentId }).lean();
        const claim = await models_1.DriverExpenseClaimModel.findOneAndUpdate({
            shipmentId: trip.shipmentId,
            tripId: trip.tripId,
            driverId: user.id,
            status: { $in: ['submitted', 'under_review'] },
        }, {
            $setOnInsert: {
                shipmentId: trip.shipmentId,
                shipmentRef: trip.shipmentRef,
                tripId: trip.tripId,
                driverId: user.id,
                driverName: user.name,
                submittedAt: new Date(),
                status: 'submitted',
            },
        }, { upsert: true, new: true }).lean();
        await models_1.DriverExpenseItemModel.create({
            claimId: String(claim?._id),
            shipmentId: trip.shipmentId,
            tripId: trip.tripId,
            category: inferExpenseCategory(String(doc.fileName || doc.title || category)),
            amount: extractExpenseAmount(String(doc.title || '')),
            currency: shipment?.quoteCurrency || 'ETB',
            paidDate: new Date(),
            receiptFileUrl: doc.fileUrl,
            receiptDocumentId: String(doc._id),
            status: 'submitted',
            notes: doc.title || doc.fileName,
        });
        const totals = await models_1.DriverExpenseItemModel.aggregate([
            { $match: { claimId: String(claim?._id) } },
            { $group: { _id: null, totalClaimed: { $sum: '$amount' } } },
        ]);
        await models_1.DriverExpenseClaimModel.updateOne({ _id: claim?._id }, {
            $set: {
                totalClaimed: Number(totals[0]?.totalClaimed ?? 0),
                financeNote: 'Auto-linked from driver upload.',
            },
        });
    }
};
exports.DocumentsService = DocumentsService;
exports.DocumentsService = DocumentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [storage_service_1.StorageService])
], DocumentsService);
function defaultDocumentVisibility(role, category) {
    const normalized = String(category || '').toLowerCase();
    if (['pod', 'return_receipt', 'release_note', 'commercial_invoice', 'packing_list', 'final_bl'].includes(normalized)) {
        return role === 'customer' ? 'customer_visible' : 'internal_only';
    }
    if (['transit_document', 't1', 'bl_draft'].includes(normalized)) {
        return 'internal_only';
    }
    return role === 'customer' ? 'customer_visible' : 'internal_only';
}
function inferExpenseCategory(value) {
    const clean = value.toLowerCase();
    if (clean.includes('fuel'))
        return 'fuel';
    if (clean.includes('customs'))
        return 'customs';
    if (clean.includes('escort'))
        return 'escort';
    if (clean.includes('depot'))
        return 'depot';
    return 'trip_expense';
}
function extractExpenseAmount(value) {
    const match = value.match(/(?:amount|amt)\s*[:\-]?\s*(\d+(?:\.\d+)?)/i);
    return match ? Number(match[1]) : 0;
}
//# sourceMappingURL=documents.service.js.map