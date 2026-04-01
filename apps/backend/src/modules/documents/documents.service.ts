import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { getRuntimeConfig } from '../../database/config';
import { connectToDatabase } from '../../database/mongo';
import {
  CorridorShipmentModel,
  CorridorTripAssignmentModel,
  DocumentModel,
  DriverExpenseClaimModel,
  DriverExpenseItemModel,
  UploadedDocumentModel,
} from '../../database/models';
import { AuthenticatedUser } from '../auth/auth.types';
import {
  documentPolicyFor,
  documentCategoryLabel,
  documentMobileCanUpload,
  documentRequirementState,
  listDocumentPolicies,
} from './document-policy';
import { StorageService } from './storage.service';

type StoredDocument = Record<string, any>;

@Injectable()
export class DocumentsService {
  constructor(private readonly storageService: StorageService) {}

  async list(user: AuthenticatedUser) {
    await connectToDatabase();
    const rows = await this.findDocumentsForUser(user);
    return rows.map((row) => this.toView(row));
  }

  listPolicy(filters?: { entityType?: string; mobileUploadOnly?: boolean }) {
    return listDocumentPolicies(filters);
  }

  async upload(
    user: AuthenticatedUser,
    body: {
      title?: string;
      entityType?: string;
      entityId?: string;
      category?: string;
      documentType?: string;
      referenceNo?: string;
      visibilityScope?: string;
      status?: string;
      fileName?: string;
      mimeType?: string;
      fileSize?: number;
      fileUrl?: string;
      fileContentBase64?: string;
    },
  ) {
    await connectToDatabase();
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
    const uploaded = await UploadedDocumentModel.create({
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

  async getOne(user: AuthenticatedUser, id: string) {
    await connectToDatabase();
    const doc = await this.findById(id);
    this.assertAccess(user, doc);
    return this.toView(doc);
  }

  async download(user: AuthenticatedUser, id: string) {
    await connectToDatabase();
    const doc = await this.findById(id);
    this.assertAccess(user, doc);
    const remoteDownload = await this.storageService.buildDownloadUrl(
      doc.storageKey || '',
      doc.fileName,
      doc.mimeType || this.inferMimeType(doc.fileName),
    );
    return {
      id: String(doc._id),
      fileName: doc.fileName,
      mimeType: doc.mimeType || this.inferMimeType(doc.fileName),
      fileSize: doc.fileSize || null,
      downloadUrl: remoteDownload.storageMode === 's3' ? remoteDownload.url : this.buildSignedDownloadUrl(String(doc._id)),
      storageMode: doc.storageMode || remoteDownload.storageMode || 'local',
    };
  }

  async createUploadUrl(
    user: AuthenticatedUser,
    body: {
      title?: string;
      entityType?: string;
      entityId?: string;
      category?: string;
      documentType?: string;
      referenceNo?: string;
      visibilityScope?: string;
      status?: string;
      fileName?: string;
      mimeType?: string;
      fileSize?: number;
    },
  ) {
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

  async finalizeUpload(
    user: AuthenticatedUser,
    body: {
      title?: string;
      entityType?: string;
      entityId?: string;
      category?: string;
      documentType?: string;
      referenceNo?: string;
      visibilityScope?: string;
      status?: string;
      fileName?: string;
      mimeType?: string;
      fileSize?: number;
      storageKey?: string;
      fileUrl?: string;
    },
  ) {
    const fileName = body.fileName || `upload-${Date.now()}.bin`;
    const mimeType = body.mimeType || this.inferMimeType(fileName);
    const fileSize = Number(body.fileSize ?? 512_000);
    this.validateUpload(fileName, mimeType, fileSize);

    const entityType = body.entityType || (user.role === 'customer' ? 'customer' : 'trip');
    const entityId = body.entityId || user.customerCode || user.id;
    const storageKey = body.storageKey || `${entityType}/${entityId}/${Date.now()}-${fileName}`;
    const storageMode = getRuntimeConfig().fileStorageMode;

    const uploaded = await UploadedDocumentModel.create({
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

  async resolveSignedDownload(id: string, token: string) {
    await connectToDatabase();
    const doc = await this.findById(id);
    if (!this.verifyDownloadToken(id, token)) {
      throw new ForbiddenException('Invalid or expired document download token');
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

  async resolveSignedDownloadFile(id: string, token: string) {
    await connectToDatabase();
    const doc = await this.findById(id);
    if (!this.verifyDownloadToken(id, token)) {
      throw new ForbiddenException('Invalid or expired document download token');
    }
    if ((doc.storageMode || 'local') !== 'local') {
      throw new ForbiddenException('Direct file streaming is only available for local storage mode');
    }

    const absolutePath = await this.storageService.resolveLocalFile(doc.storageKey || '');

    return {
      absolutePath,
      fileName: doc.fileName,
      mimeType: doc.mimeType || this.inferMimeType(doc.fileName),
    };
  }

  async byEntity(user: AuthenticatedUser, entityType: string, entityId: string) {
    await connectToDatabase();
    const [uploaded, documents] = await Promise.all([
      UploadedDocumentModel.find({ entityType, entityId }).sort({ createdAt: -1 }).lean(),
      DocumentModel.find({ entityType, entityId }).sort({ createdAt: -1 }).lean(),
    ]);
    return [...uploaded, ...documents]
      .filter((row) => this.canAccess(user, row))
      .map((row) => this.toView(row));
  }

  private async findDocumentsForUser(user: AuthenticatedUser) {
    if (user.role === 'customer') {
      return DocumentModel.find({ entityId: user.customerCode }).sort({ createdAt: -1 }).limit(100).lean();
    }
    if (user.role === 'driver') {
      return UploadedDocumentModel.find({ $or: [{ uploadedById: user.id }, { uploadedBy: user.name }] })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
    }
    const [uploaded, documents] = await Promise.all([
      UploadedDocumentModel.find().sort({ createdAt: -1 }).limit(100).lean(),
      DocumentModel.find().sort({ createdAt: -1 }).limit(100).lean(),
    ]);
    return [...uploaded, ...documents].sort((a, b) => new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime());
  }

  private async findById(id: string): Promise<StoredDocument> {
    const doc =
      (await UploadedDocumentModel.findById(id).lean<StoredDocument | null>()) ||
      (await DocumentModel.findById(id).lean<StoredDocument | null>());
    if (!doc) {
      throw new NotFoundException('Document not found');
    }
    return doc;
  }

  private toView(doc: StoredDocument) {
    const status = doc.status || doc.approvalStatus || 'available';
    const category = doc.category || doc.documentType || 'document';
    const policy = documentPolicyFor(doc.entityType, category);
    return {
      id: String(doc._id),
      title: doc.title || doc.fileName,
      fileName: doc.fileName,
      category,
      categoryLabel: documentCategoryLabel(doc.entityType, category),
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
      requirementState: documentRequirementState(status),
      mobileCanUpload: documentMobileCanUpload(doc.entityType, category, status),
    };
  }

  private canAccess(user: AuthenticatedUser, doc: StoredDocument) {
    if (user.permissions.includes('*')) return true;
    if (user.role === 'customer') return doc.entityId === user.customerCode;
    if (user.role === 'driver') return doc.uploadedById === user.id || doc.uploadedBy === user.name;
    return true;
  }

  private assertAccess(user: AuthenticatedUser, doc: StoredDocument) {
    if (!this.canAccess(user, doc)) {
      throw new ForbiddenException('You do not have access to this document');
    }
  }

  private buildSignedDownloadUrl(id: string) {
    const base = getRuntimeConfig().apiPublicUrl;
    const expiresAt = Date.now() + 10 * 60_000;
    const payload = `${id}:${expiresAt}`;
    const signature = createHmac('sha256', getRuntimeConfig().jwtAccessSecret).update(payload).digest('hex');
    return `${base}/documents/${id}/download/file?token=${expiresAt}.${signature}`;
  }

  private verifyDownloadToken(id: string, token: string) {
    const [expiresAtRaw, signature] = token.split('.');
    const expiresAt = Number(expiresAtRaw);
    if (!expiresAt || !signature || expiresAt < Date.now()) {
      return false;
    }
    const expected = createHmac('sha256', getRuntimeConfig().jwtAccessSecret).update(`${id}:${expiresAt}`).digest('hex');
    return expected === signature;
  }

  private validateUpload(fileName: string, mimeType: string, fileSize: number) {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf', 'image/webp'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf', '.webp'];
    const extensionOk = allowedExtensions.some((suffix) => fileName.toLowerCase().endsWith(suffix));
    if (!allowedMimeTypes.includes(mimeType) && !extensionOk) {
      throw new ForbiddenException('Unsupported file type');
    }
    if (fileSize > 10 * 1024 * 1024) {
      throw new ForbiddenException('File too large');
    }
  }

  private inferMimeType(fileName?: string) {
    const lower = String(fileName || '').toLowerCase();
    if (lower.endsWith('.pdf')) return 'application/pdf';
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    return 'image/jpeg';
  }

  private async autoLinkDriverExpense(user: AuthenticatedUser, doc: StoredDocument) {
    const mobileRole = String(user.mobileRole || user.role || '').toLowerCase();
    const category = String(doc.category || doc.documentType || '').toLowerCase();
    if (!['driver', 'internal_driver', 'external_driver'].includes(mobileRole)) return;
    if (!['expense_receipt', 'fuel_receipt', 'expense', 'receipt'].includes(category)) return;
    const trip: any = await CorridorTripAssignmentModel.findOne({ tripId: String(doc.entityId || '') }).lean();
    if (!trip?.shipmentId) return;
    const shipment: any = await CorridorShipmentModel.findOne({ shipmentId: trip.shipmentId }).lean();
    const claim: any = await DriverExpenseClaimModel.findOneAndUpdate(
      {
        shipmentId: trip.shipmentId,
        tripId: trip.tripId,
        driverId: user.id,
        status: { $in: ['submitted', 'under_review'] },
      },
      {
        $setOnInsert: {
          shipmentId: trip.shipmentId,
          shipmentRef: trip.shipmentRef,
          tripId: trip.tripId,
          driverId: user.id,
          driverName: user.name,
          submittedAt: new Date(),
          status: 'submitted',
        },
      },
      { upsert: true, new: true },
    ).lean();
    await DriverExpenseItemModel.create({
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
    const totals = await DriverExpenseItemModel.aggregate([
      { $match: { claimId: String(claim?._id) } },
      { $group: { _id: null, totalClaimed: { $sum: '$amount' } } },
    ]);
    await DriverExpenseClaimModel.updateOne(
      { _id: claim?._id },
      {
        $set: {
          totalClaimed: Number(totals[0]?.totalClaimed ?? 0),
          financeNote: 'Auto-linked from driver upload.',
        },
      },
    );
  }
}

function defaultDocumentVisibility(role: string, category?: string) {
  const normalized = String(category || '').toLowerCase();
  if (['pod', 'return_receipt', 'release_note', 'commercial_invoice', 'packing_list', 'final_bl'].includes(normalized)) {
    return role === 'customer' ? 'customer_visible' : 'internal_only';
  }
  if (['transit_document', 't1', 'bl_draft'].includes(normalized)) {
    return 'internal_only';
  }
  return role === 'customer' ? 'customer_visible' : 'internal_only';
}

function inferExpenseCategory(value: string) {
  const clean = value.toLowerCase();
  if (clean.includes('fuel')) return 'fuel';
  if (clean.includes('customs')) return 'customs';
  if (clean.includes('escort')) return 'escort';
  if (clean.includes('depot')) return 'depot';
  return 'trip_expense';
}

function extractExpenseAmount(value: string) {
  const match = value.match(/(?:amount|amt)\s*[:\-]?\s*(\d+(?:\.\d+)?)/i);
  return match ? Number(match[1]) : 0;
}
