// @ts-nocheck
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Types } from 'mongoose';
import { connectToDatabase } from '../../database/mongo';
import { hashPassword } from '../../database/config';
import {
  CorridorCargoItemModel,
  CorridorCheckpointEventModel,
  CorridorContainerModel,
  CorridorDocumentModel,
  CorridorDocumentAccessLogModel,
  CorridorEmptyReturnModel,
  CorridorExceptionModel,
  CorridorMilestoneModel,
  CorridorPartyAccessModel,
  CorridorShipmentModel,
  CorridorTripAssignmentModel,
  BookingModel,
  DriverExpenseClaimModel,
  DriverExpenseItemModel,
  DriverReimbursementModel,
  DriverModel,
  DriverProfileModel,
  FinancialClearanceModel,
  GpsPointModel,
  InvoiceModel,
  PaymentModel,
  QuoteModel,
  TripModel,
  UserModel,
  UserPreferenceModel,
} from '../../database/models';
import type { AuthenticatedUser } from '../auth/auth.types';
import type {
  CorridorAccessMatrixPayload,
  CorridorCustomerPortalPayload,
  CorridorDriverTransitPack,
  CorridorRoleMatrixEntry,
  CorridorWorkspaceKey,
  CorridorWorkspacePayload,
} from './corridor.types';
import { buildCorridorAccessMatrix } from './corridor-foundation';
import {
  assertCanPerformShipmentAction,
  assertCanViewShipment,
  buildActionRules,
  buildStageOwnershipRules,
  canViewScope,
  corridorActorFromRequest,
  filterScopedList,
  normalizeCorridorRole,
  normalizeShipmentStage,
  type CorridorActorContext,
} from './corridor-access';
import { CommunicationOrchestratorService } from '../communications/communication-orchestrator.service';

const CLEARANCE_REQUIRED_TAGS = ['manifest', 'bl', 'invoice', 'packing_list', 'release_note', 'customs', 'container_details'] as const;

@Injectable()
export class CorridorService {
  private readonly roleMatrix = buildRoleEntries();
  private readonly accessMatrix = buildCorridorAccessMatrix(this.roleMatrix);

  constructor(private readonly communicationOrchestratorService: CommunicationOrchestratorService) {}

  getRoleMatrix(): CorridorAccessMatrixPayload {
    return this.accessMatrix;
  }

  async listShipments(actor: CorridorActorContext, query: Record<string, unknown> = {}) {
    await connectToDatabase();
    const shipmentFilter = buildShipmentFilter(actor, query);
    const shipments = await CorridorShipmentModel.find(shipmentFilter).sort({ updatedAt: -1 }).limit(50).lean();
    if (!shipments.length) return [];
    const refs = shipments.map((item) => item.shipmentRef);
    const [containers, accessRows, exceptions] = await Promise.all([
      CorridorContainerModel.find({ shipmentRef: { $in: refs } }).lean(),
      CorridorPartyAccessModel.find({ shipmentRef: { $in: refs } }).lean(),
      CorridorExceptionModel.find({ shipmentRef: { $in: refs }, status: { $in: ['open', 'acknowledged', 'in_progress'] } }).lean(),
    ]);
    return shipments
      .filter((shipment) => assertCanViewForList(actor, shipment, accessRows))
      .map((shipment) => {
        const shipmentContainers = containers.filter((item) => item.shipmentRef === shipment.shipmentRef);
        const shipmentExceptions = exceptions.filter((item) => item.shipmentRef === shipment.shipmentRef);
        return buildShipmentListView(shipment, shipmentContainers, shipmentExceptions, actor);
      });
  }

  async getShipmentDetail(actor: CorridorActorContext, shipmentIdOrRef: string) {
    const aggregate = await this.loadShipmentAggregate(shipmentIdOrRef);
    assertCanViewShipment(actor, aggregate.shipment, aggregate.accessRows);
    assertClearanceReadinessAccess(actor, aggregate.shipment);
    return buildShipmentDetailView(aggregate, actor);
  }

  async listCargoItems(actor: CorridorActorContext, shipmentIdOrRef: string) {
    const aggregate = await this.loadShipmentAggregate(shipmentIdOrRef);
    assertCanViewShipment(actor, aggregate.shipment, aggregate.accessRows);
    return aggregate.cargoItems;
  }

  async createCargoItem(actor: CorridorActorContext, shipmentIdOrRef: string, body: Record<string, any>) {
    const aggregate = await this.loadShipmentAggregate(shipmentIdOrRef);
    assertCanViewShipment(actor, aggregate.shipment, aggregate.accessRows);
    assertCanPerformShipmentAction(actor, 'mark_stuffing_confirmed', aggregate.shipment.currentStage);
    const lineNumber = Number(body.lineNumber ?? aggregate.cargoItems.length + 1);
    const doc = await CorridorCargoItemModel.create({
      cargoItemId: body.cargoItemId || `${aggregate.shipment.shipmentId}-ITEM-${String(lineNumber).padStart(2, '0')}`,
      shipmentId: aggregate.shipment.shipmentId,
      shipmentRef: aggregate.shipment.shipmentRef,
      containerNumber: body.containerNumber || aggregate.containers[0]?.containerNumber || aggregate.shipment.container?.containerNumber,
      lineNumber,
      lineNo: String(lineNumber).padStart(2, '0'),
      description: body.description,
      hsCode: body.hsCode,
      packageType: body.packageType,
      packageQty: Number(body.packageQuantity ?? body.packageQty ?? 0),
      netWeightKg: Number(body.netWeight ?? body.netWeightKg ?? 0),
      grossWeightKg: Number(body.grossWeight ?? body.grossWeightKg ?? 0),
      cbm: Number(body.cbm ?? 0),
      marksNumbers: body.marksAndNumbers,
      invoiceRef: body.invoiceReference,
      packingListRef: body.packingListReference,
      transitDocRef: body.customsTransitReference,
      remarks: body.remarks,
      discrepancyStatus: body.discrepancyStatus || 'clear',
      inspectionStatus: body.inspectionStatus || 'pending',
    });
    await this.refreshShipmentSummary(aggregate.shipment.shipmentId);
    return doc.toObject();
  }

  async updateCargoItem(actor: CorridorActorContext, shipmentIdOrRef: string, cargoItemId: string, body: Record<string, any>) {
    const aggregate = await this.loadShipmentAggregate(shipmentIdOrRef);
    assertCanViewShipment(actor, aggregate.shipment, aggregate.accessRows);
    assertCanPerformShipmentAction(actor, 'mark_stuffing_confirmed', aggregate.shipment.currentStage);
    const updated = await CorridorCargoItemModel.findOneAndUpdate(
      { shipmentId: aggregate.shipment.shipmentId, $or: identifierOrObjectIdClauses('cargoItemId', cargoItemId) },
      { $set: normalizeCargoItemPatch(body) },
      { new: true },
    ).lean();
    await this.refreshShipmentSummary(aggregate.shipment.shipmentId);
    return updated;
  }

  async deleteCargoItem(actor: CorridorActorContext, shipmentIdOrRef: string, cargoItemId: string) {
    const aggregate = await this.loadShipmentAggregate(shipmentIdOrRef);
    assertCanViewShipment(actor, aggregate.shipment, aggregate.accessRows);
    assertCanPerformShipmentAction(actor, 'mark_stuffing_confirmed', aggregate.shipment.currentStage);
    await CorridorCargoItemModel.deleteOne({ shipmentId: aggregate.shipment.shipmentId, $or: identifierOrObjectIdClauses('cargoItemId', cargoItemId) });
    await this.refreshShipmentSummary(aggregate.shipment.shipmentId);
    return { success: true };
  }

  async listDocuments(actor: CorridorActorContext, shipmentIdOrRef: string, query: Record<string, any> = {}) {
    const aggregate = await this.loadShipmentAggregate(shipmentIdOrRef);
    assertCanViewShipment(actor, aggregate.shipment, aggregate.accessRows);
    assertClearanceReadinessAccess(actor, aggregate.shipment);
    const visibleDocuments = filterScopedList(aggregate.documents, 'visibilityScope', actor);
    const page = Math.max(Number(query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(query.limit ?? 50), 1), 100);
    const tag = String(query.tag || '').trim().toLowerCase();
    const status = String(query.status || '').trim().toLowerCase();
    const includeArchived = String(query.includeArchived || 'true') === 'true';
    const rows = visibleDocuments.filter((item) => {
      if (!includeArchived && item.isArchived) return false;
      if (tag && String(item.tag || item.documentType || '').toLowerCase() !== tag) return false;
      if (status && String(item.status || '').toLowerCase() !== status) return false;
      return true;
    });
    const paginated = rows.slice((page - 1) * limit, page * limit);
    return {
      items: paginated,
      pagination: {
        page,
        limit,
        total: rows.length,
      },
    };
  }

  async createDocument(actor: CorridorActorContext, shipmentIdOrRef: string, body: Record<string, any>) {
    const aggregate = await this.loadShipmentAggregate(shipmentIdOrRef);
    assertCanViewShipment(actor, aggregate.shipment, aggregate.accessRows);
    const normalizedDocumentType = normalizeDocumentType(body.documentType || body.tag || body.documentSubtype);
    const tag = normalizeDocumentTag(body.tag || normalizedDocumentType);
    const documentKey = body.documentKey || `${aggregate.shipment.shipmentId}:${tag}`;
    const latestVersion = await CorridorDocumentModel.findOne({
      shipmentId: aggregate.shipment.shipmentId,
      documentKey,
      isLatestVersion: true,
    }).sort({ versionNumber: -1, createdAt: -1 }).lean();
    if (latestVersion?.lockedAt) {
      throw new ForbiddenException(`${tag} is locked and cannot be edited`);
    }
    if (latestVersion?._id) {
      await CorridorDocumentModel.updateOne(
        { _id: latestVersion._id },
        { $set: { isLatestVersion: false, isArchived: true, archivedAt: new Date() } },
      );
    }
    const versionNumber = Number(latestVersion?.versionNumber || 0) + 1;
    const storagePath = body.storagePath || buildShipmentStoragePath(aggregate.shipment.shipmentId, resolveDocumentStorageFolder(tag), body.fileName || `${tag}-v${versionNumber}.pdf`);
    const referenceNo = body.referenceNumber || body.referenceNo || `${tag.toUpperCase()}-V${versionNumber}`;
    const fileName = body.fileName || `${tag}-v${versionNumber}.pdf`;
    const fileUrl = body.fileUrl || `/documents/corridor/${aggregate.shipment.shipmentId}/${tag}/v${versionNumber}`;
    const documentHash = computeDocumentHash({
      shipmentId: aggregate.shipment.shipmentId,
      shipmentRef: aggregate.shipment.shipmentRef,
      tag,
      versionNumber,
      fileName,
      referenceNo,
      fileUrl,
      metadata: body.metadata || {},
    });
    const verificationUrl = body.verificationUrl || `https://tikurabay.com/verify/${encodeURIComponent(body.shipmentDocumentId || `${aggregate.shipment.shipmentId}-DOC-${Date.now()}`)}`;
    const shipmentDocumentId = body.shipmentDocumentId || `${aggregate.shipment.shipmentId}-DOC-${Date.now()}`;
    const created = await CorridorDocumentModel.create({
      shipmentDocumentId,
      shipmentId: aggregate.shipment.shipmentId,
      shipmentRef: aggregate.shipment.shipmentRef,
      containerId: body.containerId || aggregate.containers[0]?.containerId,
      containerNumber: body.containerNumber || aggregate.containers[0]?.containerNumber,
      documentType: normalizedDocumentType,
      documentKey,
      tag,
      documentSubtype: body.documentSubtype,
      referenceNo,
      versionNumber,
      previousVersionId: latestVersion ? String(latestVersion.shipmentDocumentId || latestVersion._id) : undefined,
      issueDate: body.issueDate ? new Date(body.issueDate) : undefined,
      uploadedDate: new Date(),
      status: normalizeDocumentWorkflowStatus(body.status || 'uploaded'),
      sourceRole: actor.role,
      visibilityScope: body.visibilityScope || defaultVisibilityForDocument(normalizedDocumentType, tag),
      uploadedByUserId: actor.userId,
      uploadedByName: actor.name || actor.role,
      fileUrl,
      previewUrl: body.previewUrl || fileUrl,
      fileKey: body.fileKey || storagePath,
      fileName,
      storagePath,
      verificationStatus: 'valid',
      verificationUrl,
      documentHash,
      metadata: {
        ...(body.metadata || {}),
        uploadedByRole: actor.role,
        versionLabel: `v${versionNumber}`,
        qrValue: verificationUrl,
      },
    });
    await this.refreshShipmentSummary(aggregate.shipment.shipmentId);
    await this.ensureWorkflowNotifications(aggregate.shipment.shipmentId, actor);
    return created.toObject();
  }

  async updateDocument(actor: CorridorActorContext, shipmentIdOrRef: string, shipmentDocumentId: string, body: Record<string, any>) {
    const aggregate = await this.loadShipmentAggregate(shipmentIdOrRef);
    assertCanViewShipment(actor, aggregate.shipment, aggregate.accessRows);
    const current = await CorridorDocumentModel.findOne(
      { shipmentId: aggregate.shipment.shipmentId, $or: identifierOrObjectIdClauses('shipmentDocumentId', shipmentDocumentId) },
    ).lean();
    if (!current) throw new NotFoundException('Document not found');
    if (current.lockedAt && !['super_admin', 'executive_supervisor'].includes(actor.role)) {
      throw new ForbiddenException('Locked documents cannot be edited');
    }
    const patch = normalizeDocumentPatch(body, actor);
    if ((body.status === 'verified' || body.status === 'locked') && !patch.verifiedAt) {
      patch.verifiedAt = new Date();
      patch.verifiedBy = actor.name || actor.role;
      patch.verifiedByUserId = actor.userId;
    }
    if (body.status === 'rejected' && !patch.rejectedAt) {
      patch.rejectedAt = new Date();
      patch.rejectedBy = actor.name || actor.role;
      patch.rejectedByUserId = actor.userId;
    }
    if ((body.status === 'locked' || body.locked === true) && !patch.lockedAt) {
      patch.lockedAt = new Date();
      patch.lockedBy = actor.name || actor.role;
      patch.lockedByUserId = actor.userId;
      patch.status = 'locked';
    }
    const updated = await CorridorDocumentModel.findOneAndUpdate(
      { shipmentId: aggregate.shipment.shipmentId, $or: identifierOrObjectIdClauses('shipmentDocumentId', shipmentDocumentId) },
      { $set: patch },
      { new: true },
    ).lean();
    await this.refreshShipmentSummary(aggregate.shipment.shipmentId);
    await this.ensureWorkflowNotifications(aggregate.shipment.shipmentId, actor);
    return updated;
  }

  async getDocumentAccessLog(actor: CorridorActorContext, shipmentIdOrRef: string) {
    const aggregate = await this.loadShipmentAggregate(shipmentIdOrRef);
    assertCanViewShipment(actor, aggregate.shipment, aggregate.accessRows);
    return CorridorDocumentAccessLogModel.find({ shipmentId: aggregate.shipment.shipmentId }).sort({ createdAt: -1 }).limit(200).lean();
  }

  async logDocumentAccess(
    actor: CorridorActorContext,
    shipmentIdOrRef: string,
    shipmentDocumentId: string,
    body: Record<string, any> = {},
  ) {
    const aggregate = await this.loadShipmentAggregate(shipmentIdOrRef);
    assertCanViewShipment(actor, aggregate.shipment, aggregate.accessRows);
    const document = aggregate.documents.find((item: any) => matchIdentifier(item, 'shipmentDocumentId', shipmentDocumentId));
    if (!document) throw new NotFoundException('Document not found');
    const created = await CorridorDocumentAccessLogModel.create({
      shipmentId: aggregate.shipment.shipmentId,
      shipmentRef: aggregate.shipment.shipmentRef,
      shipmentDocumentId: document.shipmentDocumentId || String(document._id),
      fileName: document.fileName,
      action: body.action || 'view',
      role: actor.role,
      userId: actor.userId,
      actorName: actor.name || actor.role,
      ipAddress: body.ipAddress,
      deviceInfo: body.deviceInfo,
      metadata: body.metadata || {},
    });
    return created.toObject();
  }

  async bulkDownloadDocuments(actor: CorridorActorContext, shipmentIdOrRef: string, body: Record<string, any> = {}) {
    const aggregate = await this.loadShipmentAggregate(shipmentIdOrRef);
    assertCanViewShipment(actor, aggregate.shipment, aggregate.accessRows);
    assertClearanceReadinessAccess(actor, aggregate.shipment);
    if (['djibouti_release_agent', 'djibouti_clearing_agent', 'finance_customs_control'].includes(actor.role)) {
      const readiness = await this.computeClearanceReadiness(aggregate);
      if (!aggregate.shipment.documentsReadyForClearance && !readiness.ready) {
        throw new ForbiddenException('Documents are not ready for clearance yet');
      }
    }
    const requestedTags = Array.isArray(body.tags) ? body.tags.map((item) => String(item).toLowerCase()) : [];
    const documents = filterScopedList(aggregate.documents, 'visibilityScope', actor)
      .filter((item: any) => item.isLatestVersion !== false)
      .filter((item: any) => !requestedTags.length || requestedTags.includes(String(item.tag || item.documentType || '').toLowerCase()));
    const bundleName = `${aggregate.shipment.shipmentRef}-documents-${Date.now()}.zip`;
    await CorridorDocumentAccessLogModel.create({
      shipmentId: aggregate.shipment.shipmentId,
      shipmentRef: aggregate.shipment.shipmentRef,
      fileName: bundleName,
      action: 'zip',
      role: actor.role,
      userId: actor.userId,
      actorName: actor.name || actor.role,
      ipAddress: body.ipAddress,
      deviceInfo: body.deviceInfo,
      metadata: { count: documents.length, tags: requestedTags },
    });
    return {
      shipmentId: aggregate.shipment.shipmentId,
      fileName: bundleName,
      downloadUrl: `/shipments/${aggregate.shipment.shipmentId}/documents/bulk/${encodeURIComponent(bundleName)}`,
      storagePath: buildShipmentStoragePath(aggregate.shipment.shipmentId, 'documents', bundleName),
      items: documents.map((item: any) => ({
        shipmentDocumentId: item.shipmentDocumentId,
        fileName: item.fileName,
        version: item.versionNumber,
        tag: item.tag,
        fileUrl: item.fileUrl,
      })),
    };
  }

  async generateClearancePack(actor: CorridorActorContext, shipmentIdOrRef: string, body: Record<string, any> = {}) {
    const aggregate = await this.loadShipmentAggregate(shipmentIdOrRef);
    assertCanViewShipment(actor, aggregate.shipment, aggregate.accessRows);
    assertClearanceReadinessAccess(actor, aggregate.shipment, true);
    const readiness = await this.checkClearanceReadiness(actor, shipmentIdOrRef, true);
    const requiredTags = [...CLEARANCE_REQUIRED_TAGS];
    const packDocuments = aggregate.documents
      .filter((item: any) => item.isLatestVersion !== false)
      .filter((item: any) => requiredTags.includes(String(item.tag || '').toLowerCase()));
    const generatedAt = new Date();
    const zipName = `${aggregate.shipment.shipmentRef}-clearance-pack-${generatedAt.getTime()}.zip`;
    const pdfName = `${aggregate.shipment.shipmentRef}-clearance-pack-${generatedAt.getTime()}.pdf`;
    const clearancePackUrl = `/shipments/${aggregate.shipment.shipmentId}/clearance-pack/${encodeURIComponent(zipName)}`;
    const clearancePackPdfUrl = body.includeMergedPdf === false ? '' : `/shipments/${aggregate.shipment.shipmentId}/clearance-pack/${encodeURIComponent(pdfName)}`;
    await CorridorShipmentModel.updateOne(
      { shipmentId: aggregate.shipment.shipmentId },
      {
        $set: {
          clearancePackUrl,
          clearancePackPdfUrl,
          clearancePackGeneratedAt: generatedAt,
          clearancePackGeneratedBy: actor.name || actor.role,
          clearancePackGeneratedByUserId: actor.userId,
        },
      },
    );
    await CorridorDocumentAccessLogModel.create({
      shipmentId: aggregate.shipment.shipmentId,
      shipmentRef: aggregate.shipment.shipmentRef,
      fileName: zipName,
      action: 'zip',
      role: actor.role,
      userId: actor.userId,
      actorName: actor.name || actor.role,
      metadata: { kind: 'clearance_pack', ready: readiness.ready, count: packDocuments.length },
    });
    await this.refreshShipmentSummary(aggregate.shipment.shipmentId);
    return {
      shipmentId: aggregate.shipment.shipmentId,
      clearancePackUrl,
      clearancePackPdfUrl: clearancePackPdfUrl || null,
      generatedAt,
      generatedBy: actor.name || actor.role,
      readiness,
      items: packDocuments.map((item: any) => ({
        shipmentDocumentId: item.shipmentDocumentId,
        tag: item.tag,
        fileName: item.fileName,
        version: item.versionNumber,
        fileUrl: item.fileUrl,
      })),
      containerDetails: aggregate.containers.map((item: any) => ({
        containerNumber: item.containerNumber,
        sealNumber: item.sealNumber,
        containerType: item.containerType,
      })),
    };
  }

  async markDocumentsReadyForClearance(actor: CorridorActorContext, shipmentIdOrRef: string, body: Record<string, any> = {}) {
    const aggregate = await this.loadShipmentAggregate(shipmentIdOrRef);
    assertCanViewShipment(actor, aggregate.shipment, aggregate.accessRows);
    if (!['djibouti_release_agent', 'finance_customs_control', 'executive_supervisor', 'super_admin'].includes(actor.role)) {
      throw new ForbiddenException('Only Djibouti release, customs finance, or admin can mark documents ready for clearance');
    }
    const readiness = await this.computeClearanceReadiness(aggregate);
    if (!readiness.ready) {
      throw new ForbiddenException(`Documents cannot be marked ready: ${readiness.blockingReasons.join(', ')}`);
    }
    const markedAt = new Date();
    await CorridorShipmentModel.updateOne(
      { shipmentId: aggregate.shipment.shipmentId },
      {
        $set: {
          documentsReadyForClearance: true,
          documentsReadyAt: markedAt,
          documentsReadyMarkedBy: actor.name || actor.role,
          documentsReadyMarkedByUserId: actor.userId,
          clearanceWorkflowStatus: 'documents_ready',
          clearanceMissingDocumentReason: '',
          clearanceMissingDocumentRequestedAt: null,
          clearanceMissingDocumentRequestedBy: '',
          clearanceMissingDocumentRequestedByUserId: '',
          currentStage: 'transitor_clearance',
          currentOwnerRole: 'djibouti_clearing_agent',
        },
      },
    );
    await CorridorDocumentAccessLogModel.create({
      shipmentId: aggregate.shipment.shipmentId,
      shipmentRef: aggregate.shipment.shipmentRef,
      fileName: 'system-clearance-readiness',
      action: 'mark_ready',
      role: actor.role,
      userId: actor.userId,
      actorName: actor.name || actor.role,
      metadata: {
        reason: body.note || 'Mandatory clearance document checklist satisfied',
        tags: readiness.requiredTags,
      },
    });
    await this.upsertMilestone({
      shipmentId: aggregate.shipment.shipmentId,
      shipmentRef: aggregate.shipment.shipmentRef,
      stage: 'transitor_clearance',
      code: 'clearance_documents_ready',
      label: 'Documents ready for clearance',
      status: 'done',
      occurredAt: markedAt,
      location: aggregate.shipment.portOfDischarge || aggregate.shipment.inlandDestination,
      note: body.note || 'System-verified clearance documents are ready.',
      sourceRole: actor.role,
      sourceUserId: actor.userId,
      visibilityScope: 'internal_only',
    });
    await this.ensureWorkflowNotifications(aggregate.shipment.shipmentId, actor);
    return { success: true };
  }

  async acknowledgeClearanceDocuments(actor: CorridorActorContext, shipmentIdOrRef: string, body: Record<string, any> = {}) {
    const aggregate = await this.loadShipmentAggregate(shipmentIdOrRef);
    assertCanViewShipment(actor, aggregate.shipment, aggregate.accessRows);
    if (!['djibouti_clearing_agent', 'finance_customs_control', 'executive_supervisor', 'super_admin'].includes(actor.role)) {
      throw new ForbiddenException('Only clearance team can acknowledge clearance documents');
    }
    if (!aggregate.shipment.documentsReadyForClearance) {
      throw new ForbiddenException('Clearance acknowledgement is blocked until documents are marked ready');
    }
    const acknowledgedAt = new Date();
    await CorridorShipmentModel.updateOne(
      { shipmentId: aggregate.shipment.shipmentId },
      {
        $set: {
          clearanceWorkflowStatus: 'clearance_acknowledged',
          clearanceAcknowledgedAt: acknowledgedAt,
          clearanceAcknowledgedBy: actor.name || actor.role,
          clearanceAcknowledgedByUserId: actor.userId,
        },
      },
    );
    await CorridorDocumentAccessLogModel.create({
      shipmentId: aggregate.shipment.shipmentId,
      shipmentRef: aggregate.shipment.shipmentRef,
      fileName: 'system-clearance-acknowledgement',
      action: 'acknowledge',
      role: actor.role,
      userId: actor.userId,
      actorName: actor.name || actor.role,
      metadata: { note: body.note || 'Clearance file received in system' },
    });
    await this.upsertMilestone({
      shipmentId: aggregate.shipment.shipmentId,
      shipmentRef: aggregate.shipment.shipmentRef,
      stage: 'transitor_clearance',
      code: 'clearance_acknowledged',
      label: 'Clearance acknowledged',
      status: 'done',
      occurredAt: acknowledgedAt,
      location: aggregate.shipment.portOfDischarge || aggregate.shipment.inlandDestination,
      note: body.note || 'Clearance desk acknowledged the document center file.',
      sourceRole: actor.role,
      sourceUserId: actor.userId,
      visibilityScope: 'internal_only',
    });
    return { success: true };
  }

  async requestMissingClearanceDocuments(actor: CorridorActorContext, shipmentIdOrRef: string, body: Record<string, any> = {}) {
    const aggregate = await this.loadShipmentAggregate(shipmentIdOrRef);
    assertCanViewShipment(actor, aggregate.shipment, aggregate.accessRows);
    if (!['djibouti_clearing_agent', 'finance_customs_control', 'executive_supervisor', 'super_admin'].includes(actor.role)) {
      throw new ForbiddenException('Only clearance team can request missing documents');
    }
    const note = String(body.note || body.reason || 'Missing document reported by clearance team').trim();
    const requestedAt = new Date();
    await CorridorShipmentModel.updateOne(
      { shipmentId: aggregate.shipment.shipmentId },
      {
        $set: {
          documentsReadyForClearance: false,
          clearanceWorkflowStatus: 'blocked_missing_document',
          clearanceMissingDocumentReason: note,
          clearanceMissingDocumentRequestedAt: requestedAt,
          clearanceMissingDocumentRequestedBy: actor.name || actor.role,
          clearanceMissingDocumentRequestedByUserId: actor.userId,
        },
      },
    );
    await CorridorDocumentAccessLogModel.create({
      shipmentId: aggregate.shipment.shipmentId,
      shipmentRef: aggregate.shipment.shipmentRef,
      fileName: 'system-clearance-missing-docs',
      action: 'request_missing',
      role: actor.role,
      userId: actor.userId,
      actorName: actor.name || actor.role,
      metadata: { note },
    });
    await this.upsertMilestone({
      shipmentId: aggregate.shipment.shipmentId,
      shipmentRef: aggregate.shipment.shipmentRef,
      stage: 'transitor_clearance',
      code: 'clearance_missing_document_requested',
      label: 'Clearance requested missing documents',
      status: 'blocked',
      occurredAt: requestedAt,
      location: aggregate.shipment.portOfDischarge || aggregate.shipment.inlandDestination,
      note,
      sourceRole: actor.role,
      sourceUserId: actor.userId,
      visibilityScope: 'internal_only',
    });
    await this.communicationOrchestratorService.triggerAutomationEvent('missing_document_alert', {
      entityType: 'shipment',
      entityId: aggregate.shipment.shipmentId,
      shipmentId: aggregate.shipment.shipmentId,
      shipmentRef: aggregate.shipment.shipmentRef,
      bookingNumber: aggregate.shipment.bookingNumber,
      customerName: aggregate.shipment.customerName,
      documentType: note,
      status: 'blocked_missing_document',
    }).catch(() => undefined);
    return { success: true };
  }

  async startClearance(actor: CorridorActorContext, shipmentIdOrRef: string, body: Record<string, any> = {}) {
    const aggregate = await this.loadShipmentAggregate(shipmentIdOrRef);
    assertCanViewShipment(actor, aggregate.shipment, aggregate.accessRows);
    if (!['djibouti_clearing_agent', 'finance_customs_control', 'executive_supervisor', 'super_admin'].includes(actor.role)) {
      throw new ForbiddenException('Only clearance team can start clearance');
    }
    const readiness = await this.computeClearanceReadiness(aggregate);
    if (!aggregate.shipment.documentsReadyForClearance || !readiness.ready) {
      throw new ForbiddenException('Clearance can only start from system-verified documents marked ready for clearance');
    }
    const startedAt = new Date();
    await CorridorShipmentModel.updateOne(
      { shipmentId: aggregate.shipment.shipmentId },
      {
        $set: {
          clearanceWorkflowStatus: 'clearance_in_progress',
          clearanceStartedAt: startedAt,
          clearanceStartedBy: actor.name || actor.role,
          clearanceStartedByUserId: actor.userId,
        },
      },
    );
    await CorridorDocumentAccessLogModel.create({
      shipmentId: aggregate.shipment.shipmentId,
      shipmentRef: aggregate.shipment.shipmentRef,
      fileName: 'system-clearance-start',
      action: 'clearance_started',
      role: actor.role,
      userId: actor.userId,
      actorName: actor.name || actor.role,
      metadata: { note: body.note || 'Clearance processing started from document center' },
    });
    await this.upsertMilestone({
      shipmentId: aggregate.shipment.shipmentId,
      shipmentRef: aggregate.shipment.shipmentRef,
      stage: 'transitor_clearance',
      code: 'clearance_started',
      label: 'Clearance started',
      status: 'done',
      occurredAt: startedAt,
      location: aggregate.shipment.portOfDischarge || aggregate.shipment.inlandDestination,
      note: body.note || 'Clearance started from the system document center.',
      sourceRole: actor.role,
      sourceUserId: actor.userId,
      visibilityScope: 'internal_only',
    });
    await this.refreshShipmentSummary(aggregate.shipment.shipmentId, {
      clearancePacketStatus: 'clearance_in_progress',
    });
    return { success: true };
  }

  async completeClearance(actor: CorridorActorContext, shipmentIdOrRef: string, body: Record<string, any> = {}) {
    const aggregate = await this.loadShipmentAggregate(shipmentIdOrRef);
    assertCanViewShipment(actor, aggregate.shipment, aggregate.accessRows);
    if (!['djibouti_clearing_agent', 'finance_customs_control', 'executive_supervisor', 'super_admin'].includes(actor.role)) {
      throw new ForbiddenException('Only clearance team can complete clearance');
    }
    if (!aggregate.shipment.documentsReadyForClearance) {
      throw new ForbiddenException('Clearance completion is blocked until documents are system-ready');
    }
    const completedAt = new Date();
    await CorridorShipmentModel.updateOne(
      { shipmentId: aggregate.shipment.shipmentId },
      {
        $set: {
          clearanceWorkflowStatus: 'clearance_completed',
          clearanceCompletedAt: completedAt,
          clearancePacketStatus: 'clearance_completed',
          transportClearanceReady: true,
          clearanceReadyAt: completedAt,
        },
      },
    );
    await CorridorDocumentAccessLogModel.create({
      shipmentId: aggregate.shipment.shipmentId,
      shipmentRef: aggregate.shipment.shipmentRef,
      fileName: 'system-clearance-complete',
      action: 'clearance_completed',
      role: actor.role,
      userId: actor.userId,
      actorName: actor.name || actor.role,
      metadata: { note: body.note || 'Clearance completed from verified system documents' },
    });
    await this.upsertMilestone({
      shipmentId: aggregate.shipment.shipmentId,
      shipmentRef: aggregate.shipment.shipmentRef,
      stage: 'transitor_clearance',
      code: 'clearance_completed',
      label: 'Clearance completed',
      status: 'done',
      occurredAt: completedAt,
      location: aggregate.shipment.portOfDischarge || aggregate.shipment.inlandDestination,
      note: body.note || 'Clearance completed from verified document center records.',
      sourceRole: actor.role,
      sourceUserId: actor.userId,
      visibilityScope: 'internal_only',
    });
    await this.refreshShipmentSummary(aggregate.shipment.shipmentId, {
      clearancePacketStatus: 'clearance_completed',
      transportClearanceReady: true,
      clearanceReadyAt: completedAt,
    });
    return { success: true };
  }

  async approveFinanceClearance(actor: CorridorActorContext, shipmentIdOrRef: string, body: Record<string, any> = {}) {
    const aggregate = await this.loadShipmentAggregate(shipmentIdOrRef);
    assertCanViewShipment(actor, aggregate.shipment, aggregate.accessRows);
    await FinancialClearanceModel.findOneAndUpdate(
      { shipmentId: aggregate.shipment.shipmentId },
      {
        $set: {
          shipmentId: aggregate.shipment.shipmentId,
          shipmentRef: aggregate.shipment.shipmentRef,
          status: body.status || 'approved',
          approvedBy: actor.name || actor.role,
          approvedByUserId: actor.userId,
          approvedAt: new Date(),
          note: body.note || 'Finance clearance approved.',
        },
      },
      { upsert: true, new: true },
    ).lean();
    await this.refreshShipmentSummary(aggregate.shipment.shipmentId, {
      financeClearanceApproved: true,
      financeClearanceApprovedAt: new Date(),
      financeClearanceApprovedBy: actor.name || actor.role,
      financeClearanceApprovedByUserId: actor.userId,
      financeStatus: 'finance_cleared',
      paymentStatus: body.paymentStatus || aggregate.shipment.paymentStatus || 'paid',
    });
    await this.ensureWorkflowNotifications(aggregate.shipment.shipmentId, actor);
    return { success: true };
  }

  async signDocument(actor: CorridorActorContext, shipmentIdOrRef: string, shipmentDocumentId: string, body: Record<string, any> = {}) {
    const aggregate = await this.loadShipmentAggregate(shipmentIdOrRef);
    assertCanViewShipment(actor, aggregate.shipment, aggregate.accessRows);
    const document = aggregate.documents.find((item: any) => matchIdentifier(item, 'shipmentDocumentId', shipmentDocumentId));
    if (!document) throw new NotFoundException('Document not found');
    const signRole = resolveSigningRole(actor.role, String(body.signAs || ''));
    const signatureHash = computeSignatureHash({
      documentHash: document.documentHash || computeDocumentHash(document),
      signRole,
      signedBy: actor.name || actor.role,
      signedAt: new Date().toISOString(),
    });
    const updated = await CorridorDocumentModel.findOneAndUpdate(
      { shipmentId: aggregate.shipment.shipmentId, $or: identifierOrObjectIdClauses('shipmentDocumentId', shipmentDocumentId) },
      {
        $set: {
          signedBy: actor.name || actor.role,
          signedByUserId: actor.userId,
          signedAt: new Date(),
          signatureHash,
          lockedAt: new Date(),
          lockedBy: actor.name || actor.role,
          lockedByUserId: actor.userId,
          status: 'locked',
          verificationStatus: 'valid',
        },
      },
      { new: true },
    ).lean();
    await this.refreshShipmentSummary(aggregate.shipment.shipmentId);
    return updated;
  }

  async verifyDocumentPublic(documentId: string, body: Record<string, any> = {}) {
    await connectToDatabase();
    const document = await CorridorDocumentModel.findOne({
      $or: [{ shipmentDocumentId: documentId }, { _id: documentId }],
    }).lean();
    if (!document) throw new NotFoundException('Document not found');
    const expectedHash = computeDocumentHash(document);
    const verificationStatus = document.revokedAt
      ? 'revoked'
      : document.expiresAt && new Date(document.expiresAt).getTime() < Date.now()
        ? 'expired'
        : document.documentHash && document.documentHash !== expectedHash
          ? 'invalid'
          : body.documentHash && body.documentHash !== expectedHash
            ? 'invalid'
            : document.verificationStatus || 'valid';
    if (verificationStatus !== document.verificationStatus) {
      await CorridorDocumentModel.updateOne({ _id: document._id }, { $set: { verificationStatus } });
    }
    return {
      valid: verificationStatus === 'valid',
      status: verificationStatus,
      shipmentNumber: document.shipmentRef || document.shipmentId,
      customerName: (await CorridorShipmentModel.findOne({ shipmentId: document.shipmentId }).select('customerName').lean())?.customerName || '',
      documentType: document.tag || document.documentType,
      issueDate: document.issueDate || document.createdAt,
      verificationUrl: document.verificationUrl || `https://tikurabay.com/verify/${encodeURIComponent(String(document.shipmentDocumentId || document._id))}`,
    };
  }

  async getShipmentTracking(actor: CorridorActorContext, shipmentIdOrRef: string) {
    const aggregate = await this.loadShipmentAggregate(shipmentIdOrRef);
    assertCanViewShipment(actor, aggregate.shipment, aggregate.accessRows);
    const trip = aggregate.trips[0];
    const tripMongo = trip?.tripId ? await TripModel.findOne({ tripCode: trip.tripId }).lean() : null;
    const gpsPoints = tripMongo?._id ? await GpsPointModel.find({ tripId: tripMongo._id }).sort({ recordedAt: 1 }).lean() : [];
    const currentPoint = gpsPoints[gpsPoints.length - 1] || null;
    const eta = computeSmartEta(gpsPoints, trip, aggregate.checkpoints);
    const status = deriveTrackingStatus(aggregate.shipment.currentStage, trip, currentPoint);
    return {
      shipmentId: aggregate.shipment.shipmentId,
      currentLocation: currentPoint ? { latitude: currentPoint.latitude, longitude: currentPoint.longitude, recordedAt: currentPoint.recordedAt } : null,
      routeLine: gpsPoints.map((item: any) => ({ latitude: item.latitude, longitude: item.longitude, recordedAt: item.recordedAt })),
      checkpoints: buildTrackingCheckpoints(aggregate),
      status,
      eta,
      risk: buildTrackingRisk(aggregate, gpsPoints, eta),
    };
  }

  async createQuote(body: Record<string, any>) {
    await connectToDatabase();
    const pricing = computeQuotePricing(body);
    const quoteCode = `QUO-${String(Date.now()).slice(-8)}`;
    const quote = await QuoteModel.create({
      quoteCode,
      customerName: body.customerName,
      customerCode: body.customerCode,
      routeName: body.route || 'China -> Djibouti -> Ethiopia',
      shipmentMode: body.containerType || '20ft',
      cargoType: body.cargoType,
      estimatedWeightKg: Number(body.weight || 0),
      amount: pricing.total,
      totalAmount: pricing.total,
      currency: body.currency || 'USD',
      pricingBreakdown: pricing,
      status: 'requested',
    });
    return {
      quoteId: String(quote._id),
      quoteCode,
      pricing,
    };
  }

  async createBooking(body: Record<string, any>) {
    await connectToDatabase();
    const quoteLookup = [] as Record<string, any>[];
    if (body.quoteId) {
      quoteLookup.push({ quoteCode: body.quoteId });
      if (Types.ObjectId.isValid(String(body.quoteId))) {
        quoteLookup.push({ _id: body.quoteId });
      }
    }
    const quoteResult = quoteLookup.length
      ? await QuoteModel.findOne({ $or: quoteLookup }).lean()
      : null;
    const bookingCode = String(body.bookingCode || body.bookingId || `BOOK-${String(Date.now()).slice(-8)}`);
    const shipmentRef = String(body.shipmentRef || body.shipmentId || `TAB-${String(Date.now()).slice(-6)}`);
    const existingBooking = await BookingModel.findOne({
      $or: [
        { bookingCode },
        { shipmentRef },
        ...(body.quoteId ? [{ quoteId: quoteResult ? String(quoteResult._id) : String(body.quoteId) }] : []),
      ],
    }).lean();
    const booking = await BookingModel.findOneAndUpdate(
      { _id: existingBooking?._id || new Types.ObjectId() },
      {
        $set: {
          bookingCode,
          quoteId: quoteResult ? String(quoteResult._id) : body.quoteId,
          customerName: body.customerName || quoteResult?.customerName,
          customerCode: body.customerCode || quoteResult?.customerCode,
          shipmentMode: body.containerType || quoteResult?.shipmentMode || '20ft',
          routeName: body.route || quoteResult?.routeName || 'China -> Djibouti -> Ethiopia',
          status: 'confirmed',
          shipmentRef,
          quoteStatus: body.quoteStatus || 'booking_created',
          acceptedAt: body.acceptedAt ? new Date(body.acceptedAt) : new Date(),
          assignedOriginAgentId: body.assignedOriginAgentId || '',
          assignedOriginAgentEmail: body.assignedOriginAgentEmail || '',
          customerSnapshot: {
            customerName: body.customerName || quoteResult?.customerName,
            consigneeName: body.consigneeName || '',
            phone: body.phone || '',
            email: body.email || '',
            company: body.company || '',
          },
          routeSnapshot: {
            originCityOrPort: body.originCityOrPort || body.portOfLoading || '',
            portOfLoading: body.portOfLoading || '',
            portOfDischarge: body.portOfDischarge || '',
            inlandDestination: body.inlandDestination || '',
            finalDeliveryLocation: body.finalDeliveryLocation || '',
            placeOfReceipt: body.placeOfReceipt || '',
            incoterm: body.incoterm || '',
          },
          cargoSnapshot: {
            commoditySummary: body.commoditySummary || body.cargoDescription || '',
            cargoDescription: body.cargoDescription || '',
            containerType: body.containerType || quoteResult?.shipmentMode || '20ft',
          },
          pricingSnapshot: {
            total: Number(body.quoteAmount || body.amount || quoteResult?.totalAmount || quoteResult?.amount || 0),
            totalAmount: Number(body.quoteAmount || body.amount || quoteResult?.totalAmount || quoteResult?.amount || 0),
            currency: body.quoteCurrency || body.currency || quoteResult?.currency || 'USD',
          },
        },
      },
      { upsert: true, new: true },
    ).lean();
    await CorridorShipmentModel.findOneAndUpdate(
      { shipmentRef },
      {
        $set: {
          shipmentId: shipmentRef,
          shipmentRef,
          bookingNumber: bookingCode,
          customerId: body.customerCode || quoteResult?.customerCode,
          customerCode: body.customerCode || quoteResult?.customerCode,
          customerName: body.customerName || quoteResult?.customerName,
          consigneeName: body.consigneeName,
          serviceMode: body.containerType || quoteResult?.shipmentMode || '20ft',
          serviceType: 'multimodal',
          currentStage: 'booking_quote',
          status: 'active',
          shipmentStatus: 'active',
          financeStatus: 'awaiting_bank_document',
          releaseStatus: 'not_ready_for_release',
          dryPortStatus: 'awaiting_release',
          interchangeStatus: 'full_received',
          workflowState: 'waiting_for_documents',
          readinessStatus: 'blocked',
          blockedReasons: ['Missing Manifest', 'Missing BL', 'Missing Invoice', 'Missing Packing List'],
          quoteId: quoteResult ? String(quoteResult._id) : body.quoteId,
          bookingId: bookingCode,
          quoteStatus: body.quoteStatus || 'booking_created',
          bookingStatus: 'confirmed',
          acceptedAt: body.acceptedAt ? new Date(body.acceptedAt) : new Date(),
          assignedOriginAgentId: body.assignedOriginAgentId || '',
          assignedOriginAgentEmail: body.assignedOriginAgentEmail || '',
          portOfLoading: body.portOfLoading || '',
          portOfDischarge: body.portOfDischarge || '',
          inlandDestination: body.inlandDestination || '',
          finalDeliveryLocation: body.finalDeliveryLocation || '',
          originPort: body.originCityOrPort || body.portOfLoading || '',
          corridorRoute: body.route || [body.portOfLoading || body.originCityOrPort, body.inlandDestination || body.finalDeliveryLocation].filter(Boolean).join(' -> '),
          commoditySummary: body.commoditySummary || body.cargoDescription || '',
          incoterm: body.incoterm || '',
          quoteAmount: Number(body.quoteAmount || body.amount || quoteResult?.totalAmount || quoteResult?.amount || 0),
          quoteCurrency: body.quoteCurrency || body.currency || quoteResult?.currency || 'USD',
        },
      },
      { upsert: true, new: true },
    ).lean();
    await CorridorDocumentModel.bulkWrite(
      ['manifest', 'bl', 'invoice', 'packing_list', 'release_note'].map((tag) => ({
        updateOne: {
          filter: { shipmentDocumentId: `${shipmentRef}-${tag}-placeholder` },
          update: {
            $setOnInsert: {
              shipmentDocumentId: `${shipmentRef}-${tag}-placeholder`,
              shipmentId: shipmentRef,
              shipmentRef,
              documentType: normalizeDocumentType(tag),
              documentKey: `${shipmentRef}:${tag}`,
              tag,
              referenceNo: `${tag.toUpperCase()}-PENDING`,
              versionNumber: 1,
              isLatestVersion: true,
              status: 'draft',
              verificationStatus: 'valid',
              verificationUrl: `https://tikurabay.com/verify/${encodeURIComponent(`${shipmentRef}-${tag}-placeholder`)}`,
              documentHash: computeDocumentHash({ shipmentId: shipmentRef, tag, referenceNo: `${tag.toUpperCase()}-PENDING`, versionNumber: 1 }),
              visibilityScope: defaultVisibilityForDocument(tag, tag),
              fileName: `${tag}-placeholder.pdf`,
              fileUrl: '',
              previewUrl: '',
              fileKey: buildShipmentStoragePath(shipmentRef, 'documents', `${tag}-placeholder.pdf`),
              storagePath: buildShipmentStoragePath(shipmentRef, 'documents', `${tag}-placeholder.pdf`),
              metadata: { placeholder: true },
            },
          },
          upsert: true,
        },
      })),
    );
    return {
      bookingId: String(booking?._id || ''),
      bookingCode,
      shipmentId: shipmentRef,
      shipmentRef,
    };
  }

  async checkClearanceReadiness(actor: CorridorActorContext, shipmentIdOrRef: string, includeAggregate = false) {
    const aggregate = await this.loadShipmentAggregate(shipmentIdOrRef);
    assertCanViewShipment(actor, aggregate.shipment, aggregate.accessRows);
    assertClearanceReadinessAccess(actor, aggregate.shipment, true);
    const readiness = await this.computeClearanceReadiness(aggregate);
    return includeAggregate ? readiness : sanitizeReadiness(readiness);
  }

  async listContainers(actor: CorridorActorContext, shipmentIdOrRef: string) {
    const aggregate = await this.loadShipmentAggregate(shipmentIdOrRef);
    assertCanViewShipment(actor, aggregate.shipment, aggregate.accessRows);
    return aggregate.containers;
  }

  async updateContainer(actor: CorridorActorContext, shipmentIdOrRef: string, containerId: string, body: Record<string, any>) {
    const aggregate = await this.loadShipmentAggregate(shipmentIdOrRef);
    assertCanViewShipment(actor, aggregate.shipment, aggregate.accessRows);
    const updated = await CorridorContainerModel.findOneAndUpdate(
      { shipmentId: aggregate.shipment.shipmentId, $or: identifierOrObjectIdClauses('containerId', containerId) },
      { $set: normalizeContainerPatch(body) },
      { new: true },
    ).lean();
    await this.refreshShipmentSummary(aggregate.shipment.shipmentId);
    return updated;
  }

  async listTrips(actor: CorridorActorContext, shipmentIdOrRef: string) {
    const aggregate = await this.loadShipmentAggregate(shipmentIdOrRef);
    assertCanViewShipment(actor, aggregate.shipment, aggregate.accessRows);
    return aggregate.trips.map((trip) => buildTripView(trip, actor));
  }

  async createTrip(actor: CorridorActorContext, shipmentIdOrRef: string, body: Record<string, any>) {
    const aggregate = await this.loadShipmentAggregate(shipmentIdOrRef);
    assertCanPerformShipmentAction(actor, 'create_trip', aggregate.shipment.currentStage);
    if (!aggregate.shipment.transportClearanceReady || !aggregate.shipment.clearanceReadyAt) {
      throw new ForbiddenException('Dispatch is blocked until transport clearance is ready');
    }
    const hasTransitDocument =
      aggregate.shipment.transitDocumentRef ||
      aggregate.documents.some((item) => String(item.documentType || '').toLowerCase() === 'transit_document' && ['uploaded', 'approved'].includes(String(item.status || '').toLowerCase()));
    if (!hasTransitDocument) {
      throw new ForbiddenException('Dispatch is blocked until the transit document / T1 is uploaded');
    }
    if (!['paid', 'cleared', 'waived'].includes(String(aggregate.shipment.chargesPaymentStatus || '').toLowerCase())) {
      throw new ForbiddenException('Dispatch is blocked until required charges are cleared');
    }
    const tripId = body.tripId || `${aggregate.shipment.shipmentId}-TRIP-${String(aggregate.trips.length + 1).padStart(2, '0')}`;
    const created = await CorridorTripAssignmentModel.create({
      tripId,
      shipmentId: aggregate.shipment.shipmentId,
      shipmentRef: aggregate.shipment.shipmentRef,
      containerId: body.containerId || aggregate.containers[0]?.containerId,
      containerNumber: body.containerNumber || aggregate.containers[0]?.containerNumber,
      driverId: body.driverId,
      vehicleId: body.vehicleId,
      partnerId: body.partnerId,
      driverType: body.driverType || 'internal_driver',
      driverName: body.driverName,
      driverPhone: body.driverPhone,
      truckPlate: body.truckPlate,
      trailerPlate: body.trailerPlate,
      route: body.route || aggregate.shipment.corridorRoute,
      routeName: body.routeName || aggregate.shipment.corridorRoute,
      originPoint: body.originPoint || 'Djibouti Port',
      destinationPoint: body.destinationPoint || aggregate.shipment.inlandDestination,
      dispatchStatus: body.dispatchStatus || 'assigned',
      tripStatus: body.tripStatus || 'assigned',
      eta: body.eta ? new Date(body.eta) : undefined,
      currentCheckpoint: body.currentCheckpoint || 'Djibouti Port',
      gpsStatus: body.gpsStatus || 'synced',
      issueStatus: body.issueStatus || 'clear',
    });
    await this.upsertMilestone({
      shipmentId: aggregate.shipment.shipmentId,
      shipmentRef: aggregate.shipment.shipmentRef,
      tripId,
      stage: 'inland_dispatch',
      code: 'inland_trip_created',
      label: 'Inland trip created',
      status: 'done',
      occurredAt: new Date(),
      location: created.originPoint,
      sourceRole: actor.role,
      sourceUserId: actor.userId,
      visibilityScope: 'internal_only',
      note: `Trip ${tripId} created for ${created.containerNumber}`,
    });
    await this.refreshShipmentSummary(aggregate.shipment.shipmentId, {
      currentStage: 'inland_dispatch',
      currentOwnerRole: 'corridor_dispatch_agent',
      dispatchReady: true,
    });
    return created.toObject();
  }

  async updateTrip(actor: CorridorActorContext, tripId: string, body: Record<string, any>) {
    await connectToDatabase();
    const trip = await CorridorTripAssignmentModel.findOne({ $or: identifierOrObjectIdClauses('tripId', tripId) }).lean();
    if (!trip) throw new NotFoundException('Trip not found');
    const aggregate = await this.loadShipmentAggregate(String(trip.shipmentId || trip.shipmentRef));
    assertCanViewShipment(actor, aggregate.shipment, aggregate.accessRows);
    const updated = await CorridorTripAssignmentModel.findOneAndUpdate(
      { $or: identifierOrObjectIdClauses('tripId', tripId) },
      { $set: normalizeTripPatch(body) },
      { new: true },
    ).lean();
    await this.refreshShipmentSummary(aggregate.shipment.shipmentId);
    return buildTripView(updated, actor);
  }

  async listMilestones(actor: CorridorActorContext, shipmentIdOrRef: string) {
    const aggregate = await this.loadShipmentAggregate(shipmentIdOrRef);
    assertCanViewShipment(actor, aggregate.shipment, aggregate.accessRows);
    return filterScopedList(aggregate.milestones, 'visibilityScope', actor);
  }

  async createMilestone(actor: CorridorActorContext, shipmentIdOrRef: string, body: Record<string, any>) {
    const aggregate = await this.loadShipmentAggregate(shipmentIdOrRef);
    assertCanViewShipment(actor, aggregate.shipment, aggregate.accessRows);
    const created = await this.upsertMilestone({
      milestoneId: body.milestoneId || `${aggregate.shipment.shipmentId}-${body.code || 'milestone'}-${Date.now()}`,
      shipmentId: aggregate.shipment.shipmentId,
      shipmentRef: aggregate.shipment.shipmentRef,
      containerId: body.containerId || aggregate.containers[0]?.containerId,
      containerNumber: body.containerNumber || aggregate.containers[0]?.containerNumber,
      tripId: body.tripId,
      stage: body.stage || aggregate.shipment.currentStage,
      code: body.code,
      label: body.label,
      status: body.status || 'done',
      occurredAt: body.timestamp ? new Date(body.timestamp) : new Date(),
      location: body.location,
      sourceRole: actor.role,
      sourceUserId: actor.userId,
      note: body.note,
      visibilityScope: body.visibilityScope || 'internal_only',
    });
    return created;
  }

  async listExceptions(actor: CorridorActorContext, shipmentIdOrRef: string) {
    const aggregate = await this.loadShipmentAggregate(shipmentIdOrRef);
    assertCanViewShipment(actor, aggregate.shipment, aggregate.accessRows);
    return filterScopedList(aggregate.exceptions, 'visibilityScope', actor);
  }

  async createException(actor: CorridorActorContext, shipmentIdOrRef: string, body: Record<string, any>) {
    const aggregate = await this.loadShipmentAggregate(shipmentIdOrRef);
    assertCanViewShipment(actor, aggregate.shipment, aggregate.accessRows);
    const created = await CorridorExceptionModel.create({
      exceptionId: body.exceptionId || `${aggregate.shipment.shipmentId}-EX-${Date.now()}`,
      shipmentId: aggregate.shipment.shipmentId,
      shipmentRef: aggregate.shipment.shipmentRef,
      containerId: body.containerId || aggregate.containers[0]?.containerId,
      containerNumber: body.containerNumber || aggregate.containers[0]?.containerNumber,
      tripId: body.tripId,
      category: body.category || body.type,
      type: body.type || body.category || 'other',
      severity: body.severity || 'medium',
      title: body.title || body.summary,
      description: body.description || body.details,
      summary: body.summary || body.title,
      details: body.details || body.description,
      ownerRole: body.ownerRole || actor.role,
      ownerUserId: body.ownerUserId || actor.userId,
      status: body.status || 'open',
      detectedAt: new Date(),
      visibilityScope: body.visibilityScope || defaultVisibilityForException(actor.role),
      reportedBy: actor.userId || actor.role,
    });
    await this.refreshShipmentSummary(aggregate.shipment.shipmentId);
    return created.toObject();
  }

  async updateException(actor: CorridorActorContext, shipmentIdOrRef: string, exceptionId: string, body: Record<string, any>) {
    const aggregate = await this.loadShipmentAggregate(shipmentIdOrRef);
    assertCanViewShipment(actor, aggregate.shipment, aggregate.accessRows);
    const updated = await CorridorExceptionModel.findOneAndUpdate(
      { shipmentId: aggregate.shipment.shipmentId, $or: identifierOrObjectIdClauses('exceptionId', exceptionId) },
      {
        $set: {
          ...body,
          updatedAt: new Date(),
          ...(body.status === 'resolved' ? { resolvedAt: new Date() } : {}),
        },
      },
      { new: true },
    ).lean();
    await this.refreshShipmentSummary(aggregate.shipment.shipmentId);
    return updated;
  }

  async performShipmentAction(actor: CorridorActorContext, shipmentIdOrRef: string, action: string, body: Record<string, any> = {}) {
    const aggregate = await this.loadShipmentAggregate(shipmentIdOrRef);
    assertCanPerformShipmentAction(actor, action, aggregate.shipment.currentStage);
    const shipmentId = aggregate.shipment.shipmentId;
    const container = aggregate.containers[0];

    switch (action) {
      case 'create_trip':
        return this.createTrip(actor, shipmentIdOrRef, body);
      case 'mark_stuffing_confirmed':
        if (container) {
          await CorridorContainerModel.updateOne({ containerId: container.containerId }, { $set: { stuffingStatus: 'confirmed', status: 'stuffed' } });
        }
        await this.upsertMilestone(buildActionMilestone(aggregate, action, actor, 'stuffing_confirmed', 'Stuffing confirmed', 'origin_preparation'));
        await this.refreshShipmentSummary(shipmentId, { currentStage: 'origin_preparation', originReady: false });
        return { success: true };
      case 'mark_gate_in_confirmed':
        if (container) {
          await CorridorContainerModel.updateOne({ containerId: container.containerId }, { $set: { status: 'gated_in' } });
        }
        await this.upsertMilestone(buildActionMilestone(aggregate, action, actor, 'gate_in_confirmed', 'Gate-in confirmed', 'origin_preparation'));
        await this.refreshShipmentSummary(shipmentId, { currentStage: 'origin_preparation' });
        return { success: true };
      case 'mark_origin_ready':
        await this.refreshShipmentSummary(shipmentId, {
          currentStage: 'ocean_in_transit',
          currentOwnerRole: 'supplier_agent',
          originReady: true,
          status: 'in_progress',
        });
        await this.upsertMilestone(buildActionMilestone(aggregate, action, actor, 'documents_completed', 'Origin file ready', 'origin_preparation'));
        await this.emitShipmentCommunicationEvent('missing_document_alert', aggregate.shipment, actor, {
          documentType: 'Origin file completed',
          status: 'ready',
        });
        return { success: true };
      case 'confirm_discharge':
        if (container) {
          await CorridorContainerModel.updateOne({ containerId: container.containerId }, { $set: { dischargeStatus: 'confirmed', status: 'discharged' } });
        }
        await this.refreshShipmentSummary(shipmentId, { currentStage: 'djibouti_release', currentOwnerRole: 'djibouti_release_agent' });
        await this.upsertMilestone(buildActionMilestone(aggregate, action, actor, 'discharge_confirmed', 'Discharge confirmed', 'djibouti_release'));
        return { success: true };
      case 'mark_line_release':
        if (container) {
          await CorridorContainerModel.updateOne({ containerId: container.containerId }, { $set: { releaseStatus: 'line_release_received' } });
        }
        await this.upsertMilestone(buildActionMilestone(aggregate, action, actor, 'release_received', 'Shipping line release received', 'djibouti_release'));
        await this.refreshShipmentSummary(shipmentId);
        return { success: true };
      case 'mark_customs_cleared':
        await this.upsertMilestone(buildActionMilestone(aggregate, action, actor, 'customs_cleared', 'Customs cleared', 'djibouti_release'));
        await this.refreshShipmentSummary(shipmentId, { djiboutiReleaseReady: true, taxDutyStatus: body.taxDutyStatus || 'cleared' });
        await this.emitShipmentCommunicationEvent('customs_release_update', aggregate.shipment, actor, {
          status: 'customs_cleared',
        });
        return { success: true };
      case 'mark_gate_out_ready':
        if (container) {
          await CorridorContainerModel.updateOne({ containerId: container.containerId }, { $set: { status: 'gate_out_ready', releaseStatus: 'gate_out_ready' } });
        }
        await this.upsertMilestone(buildActionMilestone(aggregate, action, actor, 'gate_out_confirmed', 'Gate-out ready', 'djibouti_release'));
        await this.refreshShipmentSummary(shipmentId, { djiboutiReleaseReady: true, dispatchReady: true });
        await this.communicationOrchestratorService.triggerAutomationEvent('release_ready', {
          entityType: 'shipment',
          entityId: aggregate.shipment.shipmentId,
          shipmentId: aggregate.shipment.shipmentId,
          payload: {
            shipmentId: aggregate.shipment.shipmentId,
            bookingNumber: aggregate.shipment.bookingNumber,
            status: 'gate_out_ready',
          },
        }, { id: actor.userId || actor.role });
        return { success: true };
      case 'push_to_dispatch':
        await this.refreshShipmentSummary(shipmentId, { currentStage: 'inland_dispatch', currentOwnerRole: 'corridor_dispatch_agent', dispatchReady: true });
        await this.communicationOrchestratorService.triggerAutomationEvent('release_ready', {
          entityType: 'shipment',
          entityId: aggregate.shipment.shipmentId,
          shipmentId: aggregate.shipment.shipmentId,
          payload: {
            shipmentId: aggregate.shipment.shipmentId,
            bookingNumber: aggregate.shipment.bookingNumber,
            status: 'pushed_to_dispatch',
          },
        }, { id: actor.userId || actor.role });
        return { success: true };
      case 'confirm_inland_arrival':
        await this.upsertMilestone(buildActionMilestone(aggregate, action, actor, 'inland_arrival_confirmed', 'Inland arrival confirmed', 'inland_arrival'));
        await this.refreshShipmentSummary(shipmentId, { currentStage: 'yard_processing', currentOwnerRole: 'dry_port_yard_agent', inlandArrivalReady: true });
        if (container) {
          await CorridorContainerModel.updateOne({ containerId: container.containerId }, { $set: { status: 'arrived' } });
        }
        await this.communicationOrchestratorService.triggerAutomationEvent('inland_arrival_confirmed', {
          entityType: 'shipment',
          entityId: aggregate.shipment.shipmentId,
          shipmentId: aggregate.shipment.shipmentId,
          payload: {
            shipmentId: aggregate.shipment.shipmentId,
            bookingNumber: aggregate.shipment.bookingNumber,
            status: 'arrived_inland',
          },
        }, { id: actor.userId || actor.role });
        return { success: true };
      case 'start_unload':
        if (container) {
          await CorridorContainerModel.updateOne({ containerId: container.containerId }, { $set: { unloadStatus: 'in_progress' } });
        }
        await this.upsertMilestone(buildActionMilestone(aggregate, action, actor, 'unload_started', 'Unload started', 'yard_processing'));
        return { success: true };
      case 'complete_unload':
        if (container) {
          await CorridorContainerModel.updateOne({ containerId: container.containerId }, { $set: { unloadStatus: 'completed', status: 'unloaded' } });
        }
        await this.upsertMilestone(buildActionMilestone(aggregate, action, actor, 'unload_completed', 'Unload completed', 'yard_processing'));
        await this.refreshShipmentSummary(shipmentId, { yardClosureReady: true });
        return { success: true };
      case 'assign_storage':
        await this.upsertMilestone(buildActionMilestone(aggregate, action, actor, 'storage_assigned', 'Storage assigned', 'yard_processing', body.location || aggregate.shipment.dryPortNode));
        return { success: true };
      case 'capture_pod':
        await this.upsertMilestone(buildActionMilestone(aggregate, action, actor, 'pod_completed', 'POD captured', 'delivery_pod'));
        await this.refreshShipmentSummary(shipmentId, { currentStage: 'delivery_pod', podStatus: 'approved' });
        await this.communicationOrchestratorService.triggerAutomationEvent('pod_uploaded', {
          entityType: 'shipment',
          entityId: aggregate.shipment.shipmentId,
          shipmentId: aggregate.shipment.shipmentId,
          payload: {
            shipmentId: aggregate.shipment.shipmentId,
            bookingNumber: aggregate.shipment.bookingNumber,
            documentType: 'pod',
          },
        }, { id: actor.userId || actor.role });
        return { success: true };
      case 'confirm_customer_receipt':
        {
        const confirmationStatus = String(body.confirmationStatus || 'customer_confirmed');
        const shortageStatus = confirmationStatus.includes('shortage') ? 'reported' : 'clear';
        const damageStatus = confirmationStatus.includes('damage') ? 'reported' : 'clear';
        const isBlocked = ['received_with_shortage', 'received_with_damage', 'received_with_shortage_and_damage', 'under_review', 'customer_rejected'].includes(confirmationStatus);
        await this.upsertMilestone({
          ...buildActionMilestone(aggregate, action, actor, 'customer_receipt_confirmed', 'Customer receipt confirmed', 'delivery_pod', aggregate.shipment.finalDeliveryLocation || aggregate.shipment.inlandDestination),
          visibilityScope: 'customer_visible',
          note: body.note || confirmationStatus.replace(/_/g, ' '),
        });
        await this.refreshShipmentSummary(shipmentId, {
          currentStage: 'empty_return',
          customerConfirmationStatus: confirmationStatus,
          customerConfirmedAt: new Date(),
          customerConfirmedBy: body.receivedBy || actor.userId || actor.role,
          customerConfirmationNote: body.note || 'Customer receipt confirmation recorded.',
          shortageStatus,
          damageStatus,
          closureBlockedReason: isBlocked ? (body.note || 'Customer reported receipt issue requiring review before closure.') : '',
          yardClosureReady: true,
          emptyReturnOpen: true,
        });
        await this.emitShipmentCommunicationEvent('arrival_confirmation', aggregate.shipment, actor, {
          status: confirmationStatus,
        });
        return { success: true };
        }
      case 'mark_empty_released':
        if (container) {
          await CorridorContainerModel.updateOne({ containerId: container.containerId }, { $set: { status: 'empty_released', emptyReturnStatus: 'empty_released' } });
          await CorridorEmptyReturnModel.updateOne(
            { shipmentId, containerId: container.containerId },
            {
              $set: {
                shipmentId,
                shipmentRef: aggregate.shipment.shipmentRef,
                containerId: container.containerId,
                containerNumber: container.containerNumber,
                emptyReleaseAt: new Date(),
                status: 'empty_released',
              },
            },
            { upsert: true },
          );
        }
        await this.upsertMilestone(buildActionMilestone(aggregate, action, actor, 'empty_released', 'Empty released', 'empty_return'));
        await this.refreshShipmentSummary(shipmentId, { currentStage: 'empty_return' });
        return { success: true };
      case 'mark_empty_returned':
        if (container) {
          await CorridorContainerModel.updateOne({ containerId: container.containerId }, { $set: { status: 'empty_returned', emptyReturnStatus: 'empty_returned' } });
          await CorridorEmptyReturnModel.updateOne(
            { shipmentId, containerId: container.containerId },
            {
              $set: {
                returnedAt: new Date(),
                receiptNumber: body.receiptNumber || `${aggregate.shipment.shipmentId}-ERR`,
                detentionClosed: true,
                status: 'empty_returned',
              },
            },
            { upsert: true },
          );
        }
        await this.upsertMilestone(buildActionMilestone(aggregate, action, actor, 'empty_return_completed', 'Empty returned', 'empty_return'));
        await this.refreshShipmentSummary(shipmentId, { emptyReturnClosed: true, emptyReturnOpen: false, returnReceiptStatus: body.receiptNumber ? 'approved' : aggregate.shipment.returnReceiptStatus });
        return { success: true };
      case 'close_cycle':
        if (!['customer_confirmed', 'received_clean', 'resolved', 'confirmed'].includes(String(aggregate.shipment.customerConfirmationStatus || 'pending'))) {
          throw new ForbiddenException('Customer receipt confirmation must be completed before shipment closure');
        }
        if (aggregate.shipment.closureBlockedReason || aggregate.exceptions.some((item: any) => ['open', 'acknowledged', 'in_progress'].includes(String(item.status)))) {
          throw new ForbiddenException('Shipment closure is blocked by an open delivery or exception issue');
        }
        await this.upsertMilestone(buildActionMilestone(aggregate, action, actor, 'shipment_cycle_closed', 'Shipment cycle closed', 'closed'));
        await this.refreshShipmentSummary(shipmentId, { currentStage: 'closed', currentOwnerRole: 'dry_port_yard_agent', status: 'closed', emptyReturnClosed: true, emptyReturnOpen: false, closureBlockedReason: '' });
        if (container) {
          await CorridorContainerModel.updateOne({ containerId: container.containerId }, { $set: { status: 'closed' } });
        }
        await this.emitShipmentCommunicationEvent('arrival_confirmation', aggregate.shipment, actor, {
          status: 'shipment_cycle_closed',
        });
        return { success: true };
      case 'clear_finance_block':
        await this.refreshShipmentSummary(shipmentId, { financeBlockReason: '', paymentStatus: body.paymentStatus || 'paid' });
        return { success: true };
      case 'update_tax_duty_status':
        await this.refreshShipmentSummary(shipmentId, { taxDutyStatus: body.taxDutyStatus || 'under_review' });
        return { success: true };
      default:
        throw new NotFoundException(`Unsupported action ${action}`);
    }
  }

  async performTripAction(actor: CorridorActorContext, tripId: string, action: string, body: Record<string, any> = {}) {
    await connectToDatabase();
    const trip = await CorridorTripAssignmentModel.findOne({ $or: identifierOrObjectIdClauses('tripId', tripId) }).lean();
    if (!trip) throw new NotFoundException('Trip not found');
    const aggregate = await this.loadShipmentAggregate(String(trip.shipmentId || trip.shipmentRef));
    assertCanViewShipment(actor, aggregate.shipment, aggregate.accessRows);
    assertCanPerformShipmentAction(actor, action, aggregate.shipment.currentStage);

    switch (action) {
      case 'assign_driver':
        const assignedDriver = await this.updateTrip(actor, tripId, { driverId: body.driverId, driverName: body.driverName, driverPhone: body.driverPhone, driverType: body.driverType || 'internal_driver', tripStatus: 'assigned', dispatchStatus: 'assigned' });
        await this.communicationOrchestratorService.send({
          entityType: 'trip',
          entityId: trip.tripId,
          tripId: trip.tripId,
          shipmentId: aggregate.shipment.shipmentId,
          channels: ['sms', 'in_app'],
          templateKey: 'driver_trip_assignment',
          sendMode: 'automated',
        }, { id: actor.userId || actor.role });
        return assignedDriver;
      case 'assign_vehicle':
        return this.updateTrip(actor, tripId, { vehicleId: body.vehicleId, truckPlate: body.truckPlate, trailerPlate: body.trailerPlate, tripStatus: 'assigned', dispatchStatus: 'assigned' });
      case 'mark_departed':
        await CorridorTripAssignmentModel.updateOne({ $or: identifierOrObjectIdClauses('tripId', tripId) }, { $set: { tripStatus: 'departed', dispatchStatus: 'departed', actualDeparture: new Date(), gateOutAt: new Date() } });
        await this.upsertMilestone(buildActionMilestone(aggregate, 'mark_departed', actor, 'gate_out_confirmed', 'Trip departed Djibouti gate', 'inland_dispatch'));
        await this.refreshShipmentSummary(aggregate.shipment.shipmentId, { currentStage: 'inland_dispatch', dispatchReady: true });
        return { success: true };
      case 'push_transit_pack':
        await CorridorTripAssignmentModel.updateOne({ $or: identifierOrObjectIdClauses('tripId', tripId) }, { $set: { dispatchStatus: 'ready_to_depart' } });
        return { success: true, mobileSyncStatus: 'synced' };
      case 'handoff_to_yard':
        await CorridorTripAssignmentModel.updateOne({ $or: identifierOrObjectIdClauses('tripId', tripId) }, { $set: { tripStatus: 'handed_to_yard', dispatchStatus: 'handed_to_yard' } });
        await this.refreshShipmentSummary(aggregate.shipment.shipmentId, { currentStage: 'inland_arrival', currentOwnerRole: 'dry_port_yard_agent' });
        return { success: true };
      case 'checkpoint_update':
        await CorridorCheckpointEventModel.create({
          tripId: trip.tripId,
          shipmentId: aggregate.shipment.shipmentId,
          shipmentRef: aggregate.shipment.shipmentRef,
          containerNumber: trip.containerNumber,
          checkpointName: body.location || trip.currentCheckpoint || 'Checkpoint',
          eventType: body.status || 'passed',
          sealVerified: body.sealIntact !== false,
          officerName: body.officerName,
          note: body.note,
          eventAt: new Date(),
        });
        await CorridorTripAssignmentModel.updateOne({ tripId: trip.tripId }, { $set: { currentCheckpoint: body.location || trip.currentCheckpoint, tripStatus: mapCheckpointStatus(body.status), issueStatus: body.status === 'hold' ? 'active' : 'clear' } });
        await this.upsertMilestone({
          shipmentId: aggregate.shipment.shipmentId,
          shipmentRef: aggregate.shipment.shipmentRef,
          tripId: trip.tripId,
          containerId: trip.containerId,
          containerNumber: trip.containerNumber,
          stage: 'inland_dispatch',
          code: 'checkpoint_update',
          label: 'Checkpoint update',
          status: body.status || 'done',
          occurredAt: new Date(),
          location: body.location || trip.currentCheckpoint,
          sourceRole: actor.role,
          sourceUserId: actor.userId,
          note: body.note || 'Checkpoint update submitted',
          visibilityScope: 'driver_visible',
        });
        if (String(body.status || '').toLowerCase() === 'hold' || String(body.status || '').toLowerCase() === 'inspection') {
          await this.communicationOrchestratorService.triggerAutomationEvent('checkpoint_hold', {
            entityType: 'trip',
            entityId: trip.tripId,
            shipmentId: aggregate.shipment.shipmentId,
            tripId: trip.tripId,
            payload: {
              shipmentId: aggregate.shipment.shipmentId,
              tripId: trip.tripId,
              checkpoint: body.location || trip.currentCheckpoint,
              status: body.status,
            },
          }, { id: actor.userId || actor.role });
        }
        return { success: true };
      case 'report_issue':
        await this.createException(actor, aggregate.shipment.shipmentId, {
          tripId: trip.tripId,
          containerNumber: trip.containerNumber,
          type: body.type || 'delay',
          category: body.type || 'delay',
          severity: body.severity || 'medium',
          title: body.title || body.type || 'Trip issue reported',
          description: body.note || body.description || 'Driver issue reported from mobile',
          summary: body.title || body.type || 'Trip issue',
          visibilityScope: 'internal_only',
        });
        await CorridorTripAssignmentModel.updateOne({ tripId: trip.tripId }, { $set: { issueStatus: 'active', tripStatus: body.type === 'customs_hold' ? 'checkpoint_hold' : 'delayed' } });
        await this.communicationOrchestratorService.triggerAutomationEvent('trip_delayed', {
          entityType: 'trip',
          entityId: trip.tripId,
          shipmentId: aggregate.shipment.shipmentId,
          tripId: trip.tripId,
          payload: {
            shipmentId: aggregate.shipment.shipmentId,
            tripId: trip.tripId,
            route: trip.route || trip.routeName,
            status: body.type || 'delay',
          },
        }, { id: actor.userId || actor.role });
        return { success: true };
      case 'confirm_arrival':
        await CorridorTripAssignmentModel.updateOne({ tripId: trip.tripId }, { $set: { tripStatus: 'arrived_inland', dispatchStatus: 'arrived_inland', actualArrival: new Date() } });
        await this.performShipmentAction(actor, aggregate.shipment.shipmentId, 'confirm_inland_arrival', body);
        return { success: true };
      case 'confirm_unload':
        return this.performShipmentAction(actor, aggregate.shipment.shipmentId, 'complete_unload', body);
      case 'mark_empty_released':
        return this.performShipmentAction(actor, aggregate.shipment.shipmentId, 'mark_empty_released', body);
      case 'start_empty_return':
        if (aggregate.containers[0]) {
          await CorridorContainerModel.updateOne({ containerId: aggregate.containers[0].containerId }, { $set: { emptyReturnStatus: 'empty_return_in_progress', status: 'empty_return_in_progress' } });
        }
        await CorridorEmptyReturnModel.updateOne(
          { shipmentId: aggregate.shipment.shipmentId, containerNumber: trip.containerNumber },
          { $set: { status: 'empty_return_in_progress', emptyReleaseAt: new Date() } },
          { upsert: true },
        );
        await this.upsertMilestone(buildActionMilestone(aggregate, 'start_empty_return', actor, 'empty_return_started', 'Empty return started', 'empty_return'));
        return { success: true };
      case 'confirm_empty_return':
        return this.performShipmentAction(actor, aggregate.shipment.shipmentId, 'mark_empty_returned', body);
      default:
        throw new NotFoundException(`Unsupported trip action ${action}`);
    }
  }

  async getShipments(actor?: CorridorActorContext) {
    return this.listShipments(actor ?? corridorActorFromRequest(undefined, { role: 'executive_supervisor' }));
  }

  async getShipment(shipmentRef: string, actor?: CorridorActorContext) {
    return this.getShipmentDetail(actor ?? corridorActorFromRequest(undefined, { role: 'executive_supervisor' }), shipmentRef);
  }

  async getCustomerPortal(actor?: CorridorActorContext): Promise<CorridorCustomerPortalPayload> {
    const effectiveActor = actor ?? corridorActorFromRequest(undefined, { role: 'customer_user', customerCode: 'CUST-0001' });
    const shipments = await this.listShipments(effectiveActor, {});
    const activeShipment = shipments[0] ?? null;
    return {
      portalTitle: 'Tikur Abay Customer Corridor Portal',
      customerName: activeShipment?.customerName ?? effectiveActor.customerCode ?? 'Customer',
      activeShipmentRef: activeShipment?.shipmentRef ?? '',
      kpis: [
        { key: 'active_shipments', label: 'Active shipments', value: String(shipments.length), helper: 'Visible to this customer account' },
        { key: 'documents_ready', label: 'Documents ready', value: String(shipments.reduce((sum, item: any) => sum + (item.documentCounts?.ready ?? 0), 0)), helper: 'Customer-visible linked docs' },
        { key: 'finance_events', label: 'Finance events', value: String(shipments.reduce((sum, item: any) => sum + (item.paymentSummary ? 1 : 0), 0)), helper: 'Invoices and receipts linked to shipments' },
        { key: 'support_threads', label: 'Support threads', value: String(shipments.reduce((sum, item: any) => sum + (item.supportThreadCount ?? 0), 0)), helper: 'Shipment-linked support activity' },
      ],
      shipments,
    } as unknown as CorridorCustomerPortalPayload;
  }

  async getDriverTransitPack(actor?: CorridorActorContext): Promise<CorridorDriverTransitPack | null> {
    const effectiveActor = actor ?? corridorActorFromRequest(undefined, { role: 'internal_driver', userId: 'DRV-0001' });
    await connectToDatabase();

    const tripClauses: Array<Record<string, unknown>> = [];
    if (effectiveActor.userId) {
      tripClauses.push({ driverId: effectiveActor.userId });
    }
    if (effectiveActor.phone) {
      tripClauses.push({ driverPhone: effectiveActor.phone });
    }
    if (effectiveActor.name) {
      tripClauses.push({ driverName: effectiveActor.name });
    }

    const candidateTrips = tripClauses.length
      ? await CorridorTripAssignmentModel.find({
          $or: tripClauses,
          tripStatus: {
            $in: [
              'awaiting_truck_assignment',
              'awaiting_driver_assignment',
              'assigned',
              'ready_to_depart',
              'departed',
              'in_transit',
              'checkpoint_hold',
              'delayed',
              'arrived_inland',
              'handed_to_yard',
              'awaiting_unload_handoff',
            ],
          },
        }).lean()
      : [];

    const normalizedTripCodeScore = (value: unknown) => {
      const digits = String(value || '').replace(/\D/g, '');
      return digits ? Number(digits) : -1;
    };

    const tripOperationalWeight = (trip: any) => {
      const tripCode = String(trip?.tripId || '');
      const shipmentCode = String(trip?.shipmentId || trip?.shipmentRef || '');
      const combined = `${tripCode} ${shipmentCode}`.toUpperCase();
      if (combined.includes('TRP-BK-') || combined.includes('ERT-BK-') || combined.includes(' BK-')) {
        return 100;
      }
      if (combined.includes('TRP-MANUAL') || combined.includes('TB-MANUAL')) {
        return 10;
      }
      if (tripCode.startsWith('TRP-') || tripCode.startsWith('ERT-')) {
        return 70;
      }
      return 40;
    };

    const tripStatusWeight = (value: unknown) => {
      switch (String(value || '').toLowerCase()) {
        case 'awaiting_unload_handoff':
          return 7;
        case 'handed_to_yard':
        case 'arrived_inland':
          return 6;
        case 'ready_to_depart':
          return 5;
        case 'in_transit':
        case 'departed':
        case 'checkpoint_hold':
        case 'delayed':
          return 4;
        case 'assigned':
          return 3;
        case 'awaiting_driver_assignment':
        case 'awaiting_truck_assignment':
          return 2;
        default:
          return 0;
      }
    };

    const assignedTrip = candidateTrips.sort((left: any, right: any) => {
      const rightOperationalWeight = tripOperationalWeight(right);
      const leftOperationalWeight = tripOperationalWeight(left);
      if (rightOperationalWeight !== leftOperationalWeight) {
        return rightOperationalWeight - leftOperationalWeight;
      }

      const rightStatusWeight = tripStatusWeight(right?.tripStatus);
      const leftStatusWeight = tripStatusWeight(left?.tripStatus);
      if (rightStatusWeight !== leftStatusWeight) return rightStatusWeight - leftStatusWeight;

      const leftUpdated = new Date(left?.updatedAt || left?.createdAt || 0).getTime();
      const rightUpdated = new Date(right?.updatedAt || right?.createdAt || 0).getTime();
      if (rightUpdated !== leftUpdated) return rightUpdated - leftUpdated;

      const leftScore = Math.max(
        normalizedTripCodeScore(left?.tripId),
        normalizedTripCodeScore(left?.shipmentRef),
        normalizedTripCodeScore(left?.shipmentId),
      );
      const rightScore = Math.max(
        normalizedTripCodeScore(right?.tripId),
        normalizedTripCodeScore(right?.shipmentRef),
        normalizedTripCodeScore(right?.shipmentId),
      );
      if (rightScore !== leftScore) return rightScore - leftScore;
      const leftTripId = String(left?.tripId || '');
      const rightTripId = String(right?.tripId || '');
      return rightTripId.localeCompare(leftTripId);
    })[0] ?? null;

    if (!assignedTrip?.shipmentId && !assignedTrip?.shipmentRef) {
      return null;
    }

    const detail = await this.getShipmentDetail(effectiveActor, assignedTrip.shipmentId || assignedTrip.shipmentRef);
    const trip = detail.trips?.find((item: any) => item.tripId === assignedTrip.tripId) ?? detail.trips?.[0];
    const container = detail.containers?.[0];
    const emptyReturnStatus = String(container?.emptyReturnStatus || '').toLowerCase();
    const inlandArrivalConfirmed = ['inland_arrival', 'yard_processing', 'delivery_pod', 'empty_return', 'closed'].includes(String(detail.currentStage || ''));
    const unloadCompleted =
      String(container?.unloadStatus || '').toLowerCase() === 'completed'
      || String(container?.status || '').toLowerCase() === 'unloaded'
      || ['delivery_pod', 'empty_return', 'closed'].includes(String(detail.currentStage || ''));
    const emptyReleased = ['empty_released', 'empty_return_in_progress', 'empty_returned', 'closed'].includes(emptyReturnStatus);
    const emptyReturnStarted = ['empty_return_in_progress', 'empty_returned', 'closed'].includes(emptyReturnStatus) || String(detail.currentStage || '') === 'empty_return';
    const emptyReturned = ['empty_returned', 'closed'].includes(emptyReturnStatus) || Boolean(detail.emptyReturnClosed);
    return {
      tripId: trip?.tripId ?? '',
      tripStatus: trip?.tripStatus ?? 'assigned',
      shipmentStage: detail.currentStage,
      bookingNumber: detail.bookingNumber,
      containerNumber: container?.containerNumber ?? detail.container?.containerNumber ?? '',
      sealNumber: container?.sealNumber ?? detail.container?.sealNumber ?? '',
      truckPlate: trip?.truckPlate ?? '',
      trailerPlate: trip?.trailerPlate ?? '',
      driverName: trip?.driverName ?? '',
      driverId: trip?.driverId ?? '',
      licenseNumber: trip?.driverLicenseNumber ?? '',
      customerName: detail.customerName,
      consignee: detail.consigneeName,
      route: trip?.route ?? detail.route?.corridorRoute ?? '',
      origin: trip?.originPoint ?? 'Djibouti Port',
      destination: trip?.destinationPoint ?? detail.route?.inlandDestination ?? '',
      blNumber: detail.ocean?.billOfLadingNumber ?? '',
      packingListNumber: detail.documents.find((item: any) => item.documentType === 'packing_list')?.referenceNo ?? '',
      invoiceNumber: detail.documents.find((item: any) => item.documentType === 'commercial_invoice')?.referenceNo ?? '',
      transitDocumentNumber: detail.documents.find((item: any) => item.documentType === 'transit_document')?.referenceNo ?? '',
      transitDocumentSubtype: detail.documents.find((item: any) => item.documentType === 'transit_document')?.documentSubtype ?? 'other',
      customsStatus: detail.documentsSummary?.customsDocStatus ?? 'pending',
      transitStatus: trip?.dispatchStatus ?? 'not_ready',
      officeOfDeparture: 'Djibouti Customs',
      officeOfDestination: detail.route?.inlandDestination ?? '',
      bondGuaranteeStatus: 'Active',
      itemCount: detail.cargoItems.length,
      totalPackages: detail.cargoItems.reduce((sum: number, item: any) => sum + Number(item.packageQty || 0), 0),
      totalGrossWeightKg: detail.cargoItems.reduce((sum: number, item: any) => sum + Number(item.grossWeightKg || 0), 0),
      commoditySummary: detail.commoditySummary ?? '',
      inlandArrivalConfirmed,
      unloadCompleted,
      emptyReleased,
      emptyReturnStarted,
      emptyReturned,
      qrValue: `shipment:${detail.shipmentId};trip:${trip?.tripId ?? ''};container:${container?.containerNumber ?? ''}`,
      itemDetails: detail.cargoItems.map((item: any) => ({
        lineNo: item.lineNo ?? String(item.lineNumber ?? ''),
        description: item.description,
        packageCount: item.packageQty ?? item.packageQuantity ?? 0,
        packageType: item.packageType,
        weightKg: item.grossWeightKg ?? item.grossWeight ?? 0,
        marksNumbers: item.marksNumbers ?? item.marksAndNumbers ?? '',
        consigneeReference: detail.consigneeName,
        remarks: item.remarks ?? item.remark ?? '',
      })),
      checkpointActions: ['Submit checkpoint update', 'Report hold', 'Report route issue'],
    } as CorridorDriverTransitPack;
  }

  async syncManualDispatchTrip(actor: CorridorActorContext, body: Record<string, any>) {
    await connectToDatabase();

    const bookingNumber = String(body.bookingNumber || '').trim();
    const tripId = String(body.tripId || '').trim();
    const customerName = String(body.customerName || '').trim();
    if (!bookingNumber || !tripId || !customerName) {
      throw new NotFoundException('bookingNumber, tripId, and customerName are required');
    }

    const requestedShipmentId = String(body.shipmentId || body.shipmentRef || bookingNumber).trim();
    const existingShipment = await CorridorShipmentModel.findOne({
      $or: [
        { bookingNumber },
        { shipmentId: requestedShipmentId },
        { shipmentRef: requestedShipmentId },
      ],
    }).lean();
    const shipmentId = String(existingShipment?.shipmentId || requestedShipmentId || bookingNumber).trim();
    const shipmentRef = String(existingShipment?.shipmentRef || requestedShipmentId || bookingNumber).trim();
    const containerNumber = String(body.containerNumber || '').trim();
    const sealNumber = String(body.sealNumber || '').trim();
    const tripRoute = String(body.route || body.corridorRoute || '').trim();
    const destination = String(body.destination || body.inlandDestination || 'Adama Dry Port').trim();
    const origin = String(body.origin || 'Djibouti Port Gate').trim();
    const requestedDriverName = String(body.driverName || '').trim();
    const requestedDriverPhone = String(body.driverPhone || '').trim();
    const hasAssignedDriver = Boolean(requestedDriverName && requestedDriverPhone);
    const driverName = requestedDriverName;
    const driverPhone = requestedDriverPhone;
    const driverType = hasAssignedDriver
      ? String(body.driverType || 'internal_driver').trim() || 'internal_driver'
      : '';
    const serviceType = String(body.serviceType || 'multimodal').trim();
    const blNumber = String(body.blNumber || `BL-${bookingNumber}`).trim();
    const vesselName = String(body.vesselName || 'Manual corridor vessel').trim();
    const voyageNumber = String(body.voyageNumber || `VOY-${bookingNumber}`).trim();
    const etd = body.etd ? new Date(body.etd) : undefined;
    const eta = body.eta || body.expectedArrivalTime ? new Date(body.eta || body.expectedArrivalTime) : undefined;
    const tripStatus = String(body.tripStatus || 'assigned').trim();
    const dispatchStatus = String(body.dispatchStatus || 'assigned').trim();

    await CorridorShipmentModel.findOneAndUpdate(
      existingShipment?._id ? { _id: existingShipment._id } : { shipmentId },
      {
        $set: {
          shipmentId,
          bookingNumber,
          shipmentRef,
          serviceType,
          serviceMode: serviceType,
          shipmentStatus: 'active',
          status: 'active',
          customerName,
          consigneeName: customerName,
          supplierName: String(body.supplierName || 'Pending supplier'),
          shippingLine: String(body.shippingLine || 'MSC'),
          carrierName: String(body.shippingLine || 'MSC'),
          incoterm: String(body.incoterm || 'CFR'),
          originPort: String(body.originPort || 'Shanghai'),
          portOfLoading: String(body.originPort || 'Shanghai'),
          dischargePort: 'Djibouti Port',
          portOfDischarge: 'Djibouti Port',
          inlandDestination: destination,
          dryPortNode: destination,
          finalDeliveryLocation: String(body.finalDeliveryLocation || destination),
          corridorRoute: tripRoute,
          currentStage: 'inland_dispatch',
          currentOwnerRole: 'corridor_dispatch_agent',
          vesselName,
          voyageNumber,
          etd,
          etaDjibouti: eta,
          billOfLadingNumber: blNumber,
          container: {
            containerNumber,
            sealNumber,
          },
          customerConfirmationStatus: 'pending',
          returnReceiptStatus: 'missing',
          dispatchReady: true,
          djiboutiReleaseReady: true,
          emptyReturnOpen: true,
        },
      },
      { upsert: true, new: true },
    ).lean();

    const containerId = `${shipmentId}-CONT-01`;

    await CorridorContainerModel.findOneAndUpdate(
      { containerId },
      {
        $set: {
          containerId,
          shipmentId,
          shipmentRef,
          containerNumber,
          containerType: String(body.containerType || '40FT'),
          sealNumber,
          status: tripStatus === 'arrived_inland' || tripStatus === 'handed_to_yard' ? 'arrived' : 'in_transit',
          stuffingStatus: 'completed',
          dischargeStatus: 'completed',
          releaseStatus: 'approved',
          inlandTripStatus: dispatchStatus,
          unloadStatus: 'pending',
          emptyReturnStatus: 'not_released',
        },
      },
      { upsert: true, new: true },
    ).lean();

    const documentRows = [
      { documentType: 'final_bl', referenceNo: blNumber },
      { documentType: 'packing_list', referenceNo: String(body.packingListNumber || `PL-${bookingNumber}`) },
      { documentType: 'commercial_invoice', referenceNo: String(body.invoiceNumber || `INV-${bookingNumber}`) },
      { documentType: 'transit_document', referenceNo: String(body.transitDocumentNumber || `T1-${bookingNumber}`) },
      { documentType: 'release_note', referenceNo: String(body.releaseNoteNumber || `REL-${bookingNumber}`) },
    ];
    for (const row of documentRows) {
      await CorridorDocumentModel.findOneAndUpdate(
        { shipmentRef, documentType: row.documentType, referenceNo: row.referenceNo },
        {
          $set: {
            shipmentDocumentId: `${shipmentId}-${row.documentType}`,
            shipmentId,
            shipmentRef,
            containerId,
            containerNumber,
            documentType: row.documentType,
            referenceNo: row.referenceNo,
            uploadedDate: new Date(),
            status: 'approved',
            sourceRole: 'corridor_dispatch_agent',
            visibilityScope: row.documentType === 'release_note' ? 'internal_only' : 'driver_visible',
            fileName: `${row.referenceNo}.pdf`,
            fileUrl: '#',
          },
        },
        { upsert: true, new: true },
      ).lean();
    }

    const tripUpdate: Record<string, any> = {
      shipmentId,
      shipmentRef,
      containerId,
      containerNumber,
      tripId,
      driverType,
      truckPlate: String(body.truckPlate || ''),
      trailerPlate: String(body.trailerPlate || ''),
      routeName: tripRoute,
      route: tripRoute,
      originPoint: origin,
      destinationPoint: destination,
      dispatchStatus,
      eta,
      actualDeparture: body.actualDeparture ? new Date(body.actualDeparture) : undefined,
      actualArrival: body.actualArrival ? new Date(body.actualArrival) : undefined,
      currentCheckpoint: String(body.currentCheckpoint || origin),
      gpsStatus: 'synced',
      issueStatus: 'clear',
      tripStatus,
    };
    const tripUnset: Record<string, 1> = {};
    if (hasAssignedDriver) {
      tripUpdate.driverId = String(body.driverId || '');
      tripUpdate.driverName = driverName;
      tripUpdate.driverPhone = driverPhone;
    } else {
      tripUnset.driverId = 1;
      tripUnset.driverName = 1;
      tripUnset.driverPhone = 1;
      tripUnset.driverType = 1;
    }

    await CorridorTripAssignmentModel.findOneAndUpdate(
      { tripId },
      {
        $set: tripUpdate,
        ...(Object.keys(tripUnset).length ? { $unset: tripUnset } : {}),
      },
      { upsert: true, new: true },
    ).lean();

    let fixedDriverUser: any = null;
    if (hasAssignedDriver) {
      const [firstName, ...lastNameParts] = driverName.split(/\s+/);
      const driverEmail = 'driver.fixed@tikurabay.com';
      const driverUserFilter = {
        $or: [{ phone: driverPhone }, { phoneNumber: driverPhone }, { email: driverEmail }],
      };
      fixedDriverUser = await UserModel.findOneAndUpdate(
        driverUserFilter,
        {
          $set: {
            firstName: firstName || 'Abel',
            lastName: lastNameParts.join(' ') || 'Hailu',
            phone: driverPhone,
            phoneNumber: driverPhone,
            role: 'driver',
            mobileRole: driverType,
            passwordHash: hashPassword('2112'),
            permissions: ['mobile:login', 'trips:view-assigned', 'trips:update-status', 'trip-events:view', 'driver-reports:create', 'driver-reports:view', 'chat:view', 'chat:send', 'documents:view', 'documents:upload', 'notifications:view', 'notifications:update'],
            branchName: 'Adama',
            status: 'active',
          },
          $setOnInsert: {
            email: driverEmail,
          },
        },
        { upsert: true, new: true },
      ).lean();

      await DriverModel.findOneAndUpdate(
        { userId: fixedDriverUser?._id },
        {
          $set: {
            driverCode: 'DRV-FIXED-001',
            userId: fixedDriverUser?._id,
            firstName: firstName || 'Abel',
            lastName: lastNameParts.join(' ') || 'Hailu',
            status: 'active',
          },
        },
        { upsert: true, new: true },
      ).lean();

      await DriverProfileModel.findOneAndUpdate(
        { userId: fixedDriverUser?._id },
        {
          $set: {
            userId: fixedDriverUser?._id,
            fullName: driverName,
            phone: driverPhone,
            branchId: fixedDriverUser?.branchId,
            accountState: 'active',
          },
        },
        { upsert: true, new: true },
      ).lean();

      await UserPreferenceModel.findOneAndUpdate(
        { userId: fixedDriverUser?._id },
        { $set: { language: 'en', timezone: 'Africa/Addis_Ababa', notificationPreferences: {} } },
        { upsert: true, new: true },
      ).lean();
    }

    const genericTripSet: Record<string, any> = {
      tripCode: tripId,
      customerName,
      vehicleCode: String(body.truckPlate || ''),
      origin,
      destination,
      routeName: tripRoute,
      routeType: destination.includes('Combolcha') ? 'Djibouti to Combolcha corridor' : 'Djibouti to Adama corridor',
      status: tripStatus,
      plannedStartAt: etd,
      actualStartAt: body.actualDeparture ? new Date(body.actualDeparture) : undefined,
      plannedArrivalAt: eta,
      actualArrivalAt: body.actualArrival ? new Date(body.actualArrival) : undefined,
      currentCheckpoint: String(body.currentCheckpoint || origin),
      djiboutiFlag: true,
    };
    const genericTripUnset: Record<string, 1> = {};
    if (hasAssignedDriver) {
      genericTripSet.driverId = fixedDriverUser?._id;
      genericTripSet.driverName = driverName;
    } else {
      genericTripUnset.driverId = 1;
      genericTripUnset.driverName = 1;
    }

    await TripModel.findOneAndUpdate(
      { tripCode: tripId },
      {
        $set: genericTripSet,
        ...(Object.keys(genericTripUnset).length ? { $unset: genericTripUnset } : {}),
      },
      { upsert: true, new: true },
    ).lean();

    if (hasAssignedDriver) {
      await CorridorPartyAccessModel.findOneAndUpdate(
        {
          shipmentRef,
          role: 'internal_driver',
          $or: [
            { actorCode: driverPhone },
            { actorName: driverName || 'Assigned driver' },
          ],
        },
        {
          $set: {
            shipmentId,
            shipmentRef,
            role: 'internal_driver',
            actorName: driverName || 'Assigned driver',
            actorCode: driverPhone,
            visibilityScopes: ['driver_visible'],
            stageAccess: ['inland_dispatch', 'inland_arrival', 'yard_processing', 'empty_return'],
          },
        },
        { upsert: true, new: true },
      ).lean();
    } else {
      await CorridorPartyAccessModel.deleteMany({
        shipmentRef,
        role: 'internal_driver',
      });
    }

    await this.refreshShipmentSummary(shipmentId, {
      currentStage:
        tripStatus === 'handed_to_yard' || tripStatus === 'arrived_inland' || tripStatus === 'awaiting_unload_handoff'
          ? 'inland_arrival'
          : 'inland_dispatch',
      currentOwnerRole:
        tripStatus === 'handed_to_yard' || tripStatus === 'arrived_inland' || tripStatus === 'awaiting_unload_handoff'
          ? 'dry_port_yard_agent'
          : 'corridor_dispatch_agent',
      dispatchReady: true,
      djiboutiReleaseReady: true,
      inlandArrivalReady: ['arrived_inland', 'handed_to_yard', 'awaiting_unload_handoff'].includes(tripStatus),
    });

    return {
      success: true,
      shipmentId,
      shipmentRef,
      tripId,
    };
  }

  async getWorkspace(workspace: CorridorWorkspaceKey, actor?: CorridorActorContext): Promise<CorridorWorkspacePayload | null> {
    const effectiveActor = actor ?? corridorActorFromRequest(undefined, { role: 'executive_supervisor' });
    const shipments = await this.listShipments(effectiveActor, {});
    const shipment = shipments[0];
    if (!shipment) return null;
    const detail = await this.getShipmentDetail(effectiveActor, shipment.shipmentId || shipment.shipmentRef);
    return buildWorkspacePayload(workspace, detail);
  }

  private async emitShipmentCommunicationEvent(triggerType: string, shipment: Record<string, any>, actor: CorridorActorContext, payload: Record<string, any> = {}) {
    await this.communicationOrchestratorService.send({
      entityType: 'shipment',
      entityId: shipment.shipmentId,
      shipmentId: shipment.shipmentId,
      channels: ['email', 'in_app'],
      templateKey: triggerType,
      sendMode: 'automated',
      metadata: payload,
    }, { id: actor.userId || actor.role });
  }

  private async loadShipmentAggregate(shipmentIdOrRef: string) {
    await connectToDatabase();
    const shipment = await CorridorShipmentModel.findOne({
      $or: [{ shipmentId: shipmentIdOrRef }, { shipmentRef: shipmentIdOrRef }, { bookingNumber: shipmentIdOrRef }],
    }).lean();
    if (!shipment) throw new NotFoundException('Shipment not found');
    const shipmentId = String(shipment.shipmentId || shipment.shipmentRef);
    const [cargoItems, documents, containers, trips, milestones, exceptions, accessRows, emptyReturns, checkpoints, invoices, payments, financialClearance, expenseClaims, reimbursements] =
      await Promise.all([
        CorridorCargoItemModel.find({ shipmentId }).sort({ lineNumber: 1, createdAt: 1 }).lean(),
        CorridorDocumentModel.find({ shipmentId }).sort({ createdAt: -1 }).lean(),
        CorridorContainerModel.find({ shipmentId }).sort({ createdAt: 1 }).lean(),
        CorridorTripAssignmentModel.find({ shipmentId }).sort({ createdAt: -1 }).lean(),
        CorridorMilestoneModel.find({ shipmentId }).sort({ occurredAt: 1, createdAt: 1 }).lean(),
        CorridorExceptionModel.find({ shipmentId }).sort({ createdAt: -1 }).lean(),
        CorridorPartyAccessModel.find({ shipmentId }).lean(),
        CorridorEmptyReturnModel.find({ shipmentId }).lean(),
        CorridorCheckpointEventModel.find({ shipmentId }).sort({ eventAt: -1 }).lean(),
        shipment.invoiceIds?.length ? InvoiceModel.find({ invoiceCode: { $in: shipment.invoiceIds } }).lean() : [],
        shipment.invoiceIds?.length ? PaymentModel.find({ invoiceId: { $in: shipment.invoiceIds } }).lean() : [],
        FinancialClearanceModel.findOne({ shipmentId }).lean(),
        DriverExpenseClaimModel.find({ shipmentId }).sort({ createdAt: -1 }).lean(),
        DriverReimbursementModel.find({ shipmentId }).sort({ createdAt: -1 }).lean(),
      ]);
    return { shipment, cargoItems, documents, containers, trips, milestones, exceptions, accessRows, emptyReturns, checkpoints, invoices, payments, financialClearance, expenseClaims, reimbursements };
  }

  private async upsertMilestone(payload: Record<string, any>) {
    await connectToDatabase();
    const updated = await CorridorMilestoneModel.findOneAndUpdate(
      { shipmentId: payload.shipmentId, code: payload.code, ...(payload.tripId ? { tripId: payload.tripId } : {}) },
      {
        $set: {
          milestoneId: payload.milestoneId || `${payload.shipmentId}-${payload.code}`,
          shipmentId: payload.shipmentId,
          shipmentRef: payload.shipmentRef,
          tripId: payload.tripId,
          containerId: payload.containerId,
          containerNumber: payload.containerNumber,
          stage: payload.stage,
          code: payload.code,
          label: payload.label,
          status: payload.status,
          occurredAt: payload.occurredAt,
          location: payload.location,
          sourceRole: payload.sourceRole,
          sourceUserId: payload.sourceUserId,
          note: payload.note,
          visibilityScope: payload.visibilityScope || 'internal_only',
        },
      },
      { new: true, upsert: true },
    ).lean();
    return updated;
  }

  private async refreshShipmentSummary(shipmentId: string, overrides: Record<string, any> = {}) {
    await connectToDatabase();
    const [shipment, items, documents, containers, trips, exceptions, emptyReturns, milestones, financialClearance] = await Promise.all([
      CorridorShipmentModel.findOne({ shipmentId }).lean(),
      CorridorCargoItemModel.find({ shipmentId }).lean(),
      CorridorDocumentModel.find({ shipmentId }).lean(),
      CorridorContainerModel.find({ shipmentId }).lean(),
      CorridorTripAssignmentModel.find({ shipmentId }).lean(),
      CorridorExceptionModel.find({ shipmentId, status: { $in: ['open', 'acknowledged', 'in_progress'] } }).sort({ createdAt: -1 }).lean(),
      CorridorEmptyReturnModel.find({ shipmentId }).lean(),
      CorridorMilestoneModel.find({ shipmentId, code: 'customer_receipt_confirmed' }).sort({ occurredAt: -1, createdAt: -1 }).lean(),
      FinancialClearanceModel.findOne({ shipmentId }).lean(),
    ]);
    if (!shipment) return null;
    const latestDocuments = documents.filter((item: any) => item.isLatestVersion !== false);
    const invoiceStatus = deriveDocumentStatus(latestDocuments, ['commercial_invoice', 'invoice']);
    const packingListStatus = deriveDocumentStatus(latestDocuments, ['packing_list']);
    const blStatus = deriveDocumentStatus(latestDocuments, ['bl_draft', 'final_bl', 'bill_of_lading', 'bl']);
    const customsDocStatus = deriveDocumentStatus(latestDocuments, ['customs_note', 'export_permit', 'customs']);
    const transitDocStatus = deriveDocumentStatus(latestDocuments, ['transit_document', 'interchange']);
    const releaseNoteStatus = deriveDocumentStatus(latestDocuments, ['release_note']);
    const podStatus = deriveDocumentStatus(documents, ['pod']);
    const readiness = await this.computeClearanceReadiness({
      shipment,
      cargoItems: items,
      documents,
      containers,
      trips,
      milestones,
      exceptions,
      accessRows: [],
      emptyReturns,
      checkpoints: [],
      invoices: [],
      payments: [],
      financialClearance,
      expenseClaims: [],
      reimbursements: [],
    });
    const customerReceiptMilestone = milestones[0];
    const customerConfirmationStatus = overrides.customerConfirmationStatus
      ?? shipment.customerConfirmationStatus
      ?? (customerReceiptMilestone ? 'confirmed' : podStatus === 'approved' || podStatus === 'uploaded' ? 'awaiting_customer' : 'pending');
    const returnReceiptStatus = deriveDocumentStatus(documents, ['return_receipt']);
    const activeExceptionCount = exceptions.length;
    const latestException = exceptions[0];
    const riskLevel = activeExceptionCount > 2 ? 'high' : activeExceptionCount > 0 ? 'medium' : 'normal';
    const containerIds = containers.map((item) => item.containerId);
    const sealNumbers = containers.map((item) => item.sealNumber).filter(Boolean);
    const serviceType = shipment.serviceType || shipment.serviceMode;
    const currentStage = overrides.currentStage || normalizeShipmentStage(shipment.currentStage);
    const emptyReturnClosed = overrides.emptyReturnClosed ?? emptyReturns.some((item) => item.status === 'empty_returned' || item.status === 'closed');
    const shortageStatus = overrides.shortageStatus ?? shipment.shortageStatus ?? 'clear';
    const damageStatus = overrides.damageStatus ?? shipment.damageStatus ?? 'clear';
    const update = {
      shipmentId,
      bookingNumber: shipment.bookingNumber || shipment.shipmentRef,
      serviceType,
      status: overrides.status || shipment.status || shipment.shipmentStatus || 'active',
      currentStage,
      currentOwnerRole: overrides.currentOwnerRole || shipment.currentOwnerRole || inferOwnerFromStage(currentStage),
      activeContainerCount: containers.length,
      containerIds,
      sealNumbers,
      containerTypeSummary: containers.map((item) => item.containerType).filter(Boolean).join(', '),
      commoditySummary: shipment.commoditySummary || summarizeItems(items),
      invoiceStatus,
      packingListStatus,
      blStatus,
      customsDocStatus,
      transitDocStatus,
      releaseNoteStatus,
      podStatus,
      customerConfirmationStatus,
      customerConfirmedAt: overrides.customerConfirmedAt ?? shipment.customerConfirmedAt ?? customerReceiptMilestone?.occurredAt,
      customerConfirmedBy: overrides.customerConfirmedBy ?? shipment.customerConfirmedBy,
      customerConfirmationNote: overrides.customerConfirmationNote ?? shipment.customerConfirmationNote ?? customerReceiptMilestone?.note,
      shortageStatus,
      damageStatus,
      closureBlockedReason:
        overrides.closureBlockedReason
        ?? shipment.closureBlockedReason
        ?? (shortageStatus === 'reported' ? 'Shortage claim is still open.' : damageStatus === 'reported' ? 'Damage claim is still open.' : ''),
      returnReceiptStatus,
      originReady: overrides.originReady ?? Boolean(items.length && invoiceStatus !== 'missing' && packingListStatus !== 'missing' && blStatus !== 'missing'),
      djiboutiReleaseReady: overrides.djiboutiReleaseReady ?? Boolean(transitDocStatus !== 'missing' && releaseNoteStatus !== 'missing'),
      dispatchReady: overrides.dispatchReady ?? trips.length > 0,
      inlandArrivalReady: overrides.inlandArrivalReady ?? containers.some((item) => item.status === 'arrived' || item.status === 'unloaded'),
      yardClosureReady: overrides.yardClosureReady ?? (podStatus === 'approved' || podStatus === 'uploaded'),
      emptyReturnOpen: overrides.emptyReturnOpen ?? !emptyReturnClosed,
      emptyReturnClosed,
      hasExceptions: activeExceptionCount > 0,
      activeExceptionCount,
      latestExceptionSummary: latestException?.summary || latestException?.title || '',
      riskLevel,
      emptyReturnSummary: emptyReturnClosed ? 'Returned and receipt captured' : 'Open empty return cycle',
      releaseReadiness: transitDocStatus !== 'missing' && releaseNoteStatus !== 'missing' ? 'Ready' : 'Pending',
      workflowState: readiness.workflowState,
      readinessStatus: readiness.ready ? 'ready' : 'blocked',
      blockedReasons: readiness.blockingReasons,
      missingFields: readiness.missingFields,
      missingDocumentTags: readiness.missingItems,
      documentsReadyForClearance: overrides.documentsReadyForClearance ?? shipment.documentsReadyForClearance ?? readiness.ready,
      documentsReadyAt: overrides.documentsReadyAt ?? shipment.documentsReadyAt,
      documentsReadyMarkedBy: overrides.documentsReadyMarkedBy ?? shipment.documentsReadyMarkedBy,
      documentsReadyMarkedByUserId: overrides.documentsReadyMarkedByUserId ?? shipment.documentsReadyMarkedByUserId,
      clearanceWorkflowStatus: overrides.clearanceWorkflowStatus ?? shipment.clearanceWorkflowStatus ?? readiness.workflowState,
      clearanceAcknowledgedAt: overrides.clearanceAcknowledgedAt ?? shipment.clearanceAcknowledgedAt,
      clearanceAcknowledgedBy: overrides.clearanceAcknowledgedBy ?? shipment.clearanceAcknowledgedBy,
      clearanceAcknowledgedByUserId: overrides.clearanceAcknowledgedByUserId ?? shipment.clearanceAcknowledgedByUserId,
      clearanceStartedAt: overrides.clearanceStartedAt ?? shipment.clearanceStartedAt,
      clearanceStartedBy: overrides.clearanceStartedBy ?? shipment.clearanceStartedBy,
      clearanceStartedByUserId: overrides.clearanceStartedByUserId ?? shipment.clearanceStartedByUserId,
      clearanceMissingDocumentReason: overrides.clearanceMissingDocumentReason ?? shipment.clearanceMissingDocumentReason,
      clearanceMissingDocumentRequestedAt: overrides.clearanceMissingDocumentRequestedAt ?? shipment.clearanceMissingDocumentRequestedAt,
      clearanceMissingDocumentRequestedBy: overrides.clearanceMissingDocumentRequestedBy ?? shipment.clearanceMissingDocumentRequestedBy,
      clearanceMissingDocumentRequestedByUserId: overrides.clearanceMissingDocumentRequestedByUserId ?? shipment.clearanceMissingDocumentRequestedByUserId,
      financeClearanceApproved: readiness.financeApproved,
      financeClearanceApprovedAt: shipment.financeClearanceApprovedAt ?? financialClearance?.approvedAt,
      financeClearanceApprovedBy: shipment.financeClearanceApprovedBy ?? financialClearance?.approvedBy,
      financeClearanceApprovedByUserId: shipment.financeClearanceApprovedByUserId ?? financialClearance?.approvedByUserId,
      releaseStatus: readiness.releaseReady ? 'release_ready' : overrides.releaseStatus ?? shipment.releaseStatus,
      documentHubUpdatedAt: new Date(),
      ...overrides,
    };
    return CorridorShipmentModel.findOneAndUpdate({ shipmentId }, { $set: update }, { new: true }).lean();
  }

  private async computeClearanceReadiness(aggregate: Record<string, any>) {
    const shipment = aggregate.shipment;
    const documents = aggregate.documents.filter((item: any) => item.isLatestVersion !== false);
    const grouped = groupDocumentsByTag(documents);
    const requiredTags = [...CLEARANCE_REQUIRED_TAGS];
    const missingItems: string[] = [];
    const blockingReasons: string[] = [];
    const missingFields: string[] = [];

    for (const tag of requiredTags) {
      const latest = grouped[tag]?.[0];
      if (!latest) {
        missingItems.push(tag);
        blockingReasons.push(renderBlockedReasonForTag(tag, 'missing'));
        continue;
      }
      if (!['verified', 'locked'].includes(String(latest.status || '').toLowerCase())) {
        blockingReasons.push(renderBlockedReasonForTag(tag, latest.status || 'uploaded'));
      }
    }

    const primaryContainer = aggregate.containers[0];
    if (!primaryContainer?.containerNumber) missingFields.push('container');
    if (!primaryContainer?.sealNumber) missingFields.push('seal');
    if (!shipment.consigneeName) missingFields.push('consignee');
    if (missingFields.includes('container')) blockingReasons.push('Container details missing');
    if (missingFields.includes('seal')) blockingReasons.push('Container seal missing');
    if (missingFields.includes('consignee')) blockingReasons.push('Consignee missing');

    const docsUploaded = requiredTags.every((tag) => grouped[tag]?.[0]);
    const docsVerified = requiredTags.every((tag) => ['verified', 'locked'].includes(String(grouped[tag]?.[0]?.status || '').toLowerCase()));
    const ready = docsVerified && missingFields.length === 0;
    const clearanceCompleted = Boolean(
      shipment.clearanceCompletedAt ||
      ['cleared', 'completed'].includes(String(shipment.clearancePacketStatus || '').toLowerCase()) ||
      ['cleared', 'completed'].includes(String(shipment.taxDutyStatus || '').toLowerCase()),
    );
    const workflowState = deriveWorkflowState({
      docsUploaded,
      ready,
      clearanceCompleted,
      documentsReadyForClearance: Boolean(shipment.documentsReadyForClearance),
      acknowledged: Boolean(shipment.clearanceAcknowledgedAt),
      inProgress: String(shipment.clearanceWorkflowStatus || '').toLowerCase() === 'clearance_in_progress',
      blockedMissingDocument: String(shipment.clearanceWorkflowStatus || '').toLowerCase() === 'blocked_missing_document',
    });
    const releaseReady = workflowState === 'clearance_completed';

    return {
      ready,
      requiredTags,
      missingItems,
      missingFields,
      blockingReasons: Array.from(new Set(blockingReasons)),
      financeApproved: Boolean(
        shipment.financeClearanceApproved ||
        aggregate.financialClearance?.status === 'approved' ||
        ['finance_cleared', 'approved'].includes(String(shipment.financeStatus || '').toLowerCase()),
      ),
      workflowState,
      releaseReady,
      grouped,
    };
  }

  private async ensureWorkflowNotifications(shipmentId: string, actor: CorridorActorContext) {
    const aggregate = await this.loadShipmentAggregate(shipmentId);
    const readiness = await this.computeClearanceReadiness(aggregate);
    if (readiness.workflowState === 'documents_ready') {
      await this.communicationOrchestratorService.triggerAutomationEvent('documents_ready', {
        entityType: 'shipment',
        entityId: aggregate.shipment.shipmentId,
        shipmentId: aggregate.shipment.shipmentId,
        payload: { shipmentId: aggregate.shipment.shipmentId, bookingNumber: aggregate.shipment.bookingNumber },
      }, { id: actor.userId || actor.role });
    }
    if (readiness.blockingReasons.some((item) => item.toLowerCase().includes('missing'))) {
      await this.communicationOrchestratorService.triggerAutomationEvent('missing_document', {
        entityType: 'shipment',
        entityId: aggregate.shipment.shipmentId,
        shipmentId: aggregate.shipment.shipmentId,
        payload: { shipmentId: aggregate.shipment.shipmentId, reasons: readiness.blockingReasons },
      }, { id: actor.userId || actor.role });
    }
    if (readiness.workflowState === 'release_ready') {
      await this.communicationOrchestratorService.triggerAutomationEvent('release_ready', {
        entityType: 'shipment',
        entityId: aggregate.shipment.shipmentId,
        shipmentId: aggregate.shipment.shipmentId,
        payload: { shipmentId: aggregate.shipment.shipmentId, bookingNumber: aggregate.shipment.bookingNumber },
      }, { id: actor.userId || actor.role });
    }
  }
}

function buildRoleEntries(): CorridorRoleMatrixEntry[] {
  return [
    { role: 'super_admin', title: 'Super Admin', scope: 'All shipments', responsibilities: ['Full corridor oversight'], permissions: ['view_all_shipments', 'override_stage_owner', 'reassign_stage_owner', 'close_shipment'] as any },
    { role: 'executive_supervisor', title: 'Executive / Supervisor', scope: 'Cross-stage view', responsibilities: ['Escalation and oversight'], permissions: ['view_all_shipments', 'edit_shipment_master', 'notify_customer'] as any },
    { role: 'supplier_agent', title: 'China Port Agent', scope: 'Origin preparation', responsibilities: ['Cargo items and origin docs'], permissions: ['view_assigned_shipment', 'create_cargo_items', 'edit_cargo_items', 'upload_invoice', 'upload_packing_list'] as any },
    { role: 'djibouti_release_agent', title: 'Djibouti Release Agent', scope: 'Release to multimodal handoff', responsibilities: ['Release and customs readiness'], permissions: ['view_assigned_shipment', 'record_discharge', 'mark_gate_out_ready', 'push_to_dispatch'] as any },
    { role: 'djibouti_clearing_agent', title: 'Transitor / Clearance Agent', scope: 'Transit document and clearance', responsibilities: ['T1, charges, and clearance readiness'], permissions: ['view_assigned_shipment', 'update_transit_status', 'mark_duty_tax_paid', 'push_to_dispatch'] as any },
    { role: 'corridor_dispatch_agent', title: 'Corridor Dispatch Agent', scope: 'Inland dispatch', responsibilities: ['Trip creation and checkpoint visibility'], permissions: ['view_assigned_shipment', 'assign_truck', 'assign_driver', 'record_corridor_checkpoint'] as any },
    { role: 'dry_port_yard_agent', title: 'Dry-Port / Yard Agent', scope: 'Arrival to empty return', responsibilities: ['Unload, POD, empty closure'], permissions: ['view_assigned_shipment', 'record_dry_port_arrival', 'record_unload', 'record_empty_return', 'close_shipment_cycle'] as any },
    { role: 'finance_customs_control', title: 'Finance / Customs Control', scope: 'Finance and customs blockers', responsibilities: ['Tax, duty, payment state'], permissions: ['view_invoice_status', 'mark_duty_tax_paid', 'clear_finance_block'] as any },
    { role: 'customer_support_agent', title: 'Customer Support Agent', scope: 'Customer-visible shipment support', responsibilities: ['Support and updates'], permissions: ['view_customer_summary', 'reply_ticket', 'notify_customer'] as any },
    { role: 'customer_user', title: 'Customer / Consignee User', scope: 'Own shipments', responsibilities: ['Track and review shipment'], permissions: ['view_own_shipment', 'download_docs', 'create_ticket'] as any },
    { role: 'customer_agent', title: 'Customer Agent', scope: 'Customer-owned shipments', responsibilities: ['Track and support shipments'], permissions: ['view_own_shipment', 'download_docs', 'create_ticket', 'reply_ticket'] as any },
    { role: 'internal_driver', title: 'Internal Driver', scope: 'Assigned trip only', responsibilities: ['Transit pack and checkpoints'], permissions: ['view_assigned_trip', 'record_checkpoint_note', 'confirm_arrival', 'confirm_empty_return'] as any },
    { role: 'external_driver', title: 'External Driver', scope: 'Assigned trip only', responsibilities: ['Restricted transit pack access'], permissions: ['view_assigned_trip', 'record_checkpoint_note', 'confirm_arrival'] as any },
  ];
}

function buildShipmentFilter(actor: CorridorActorContext, query: Record<string, unknown>) {
  const filter: Record<string, any> = {};
  if (typeof query.currentStage === 'string') filter.currentStage = normalizeShipmentStage(query.currentStage);
  if (typeof query.status === 'string') filter.status = query.status;
  if (typeof query.documentsReadyForClearance === 'string') filter.documentsReadyForClearance = query.documentsReadyForClearance === 'true';
  if (typeof query.clearanceWorkflowStatus === 'string') filter.clearanceWorkflowStatus = query.clearanceWorkflowStatus;
  if (typeof query.readyForClearance === 'string' && query.readyForClearance === 'true') {
    filter.documentsReadyForClearance = true;
  }
  if (typeof query.serviceType === 'string') filter.serviceType = query.serviceType;
  if (typeof query.riskLevel === 'string') filter.riskLevel = query.riskLevel;
  if (typeof query.customerId === 'string') filter.customerId = query.customerId;
  if (typeof query.supplierAgentId === 'string') filter.supplierAgentId = query.supplierAgentId;
  if (typeof query.dateFrom === 'string' || typeof query.dateTo === 'string') {
    filter.updatedAt = {};
    if (typeof query.dateFrom === 'string') filter.updatedAt.$gte = new Date(query.dateFrom);
    if (typeof query.dateTo === 'string') filter.updatedAt.$lte = new Date(query.dateTo);
  }
  if (typeof query.search === 'string' && query.search.trim()) {
    const regex = { $regex: query.search.trim(), $options: 'i' };
    filter.$or = [
      { bookingNumber: regex },
      { shipmentRef: regex },
      { billOfLadingNumber: regex },
      { customerName: regex },
      { consigneeName: regex },
    ];
  }
  if (['customer_user', 'customer_agent'].includes(actor.role) && actor.customerCode) {
    filter.$and = [
      ...(Array.isArray(filter.$and) ? filter.$and : []),
      {
        $or: [
          { customerId: actor.customerCode },
          { customerCode: actor.customerCode },
        ],
      },
    ];
  }
  if (actor.role === 'djibouti_clearing_agent') {
    filter.documentsReadyForClearance = true;
  }
  return filter;
}

function identifierOrObjectIdClauses(field: string, value: string) {
  const clauses: Array<Record<string, unknown>> = [{ [field]: value }];
  if (Types.ObjectId.isValid(value)) {
    clauses.push({ _id: new Types.ObjectId(value) });
  }
  return clauses;
}

function assertCanViewForList(actor: CorridorActorContext, shipment: Record<string, any>, accessRows: Record<string, any>[]) {
  try {
    assertCanViewShipment(actor, shipment, accessRows.filter((row) => row.shipmentRef === shipment.shipmentRef));
    assertClearanceReadinessAccess(actor, shipment);
    return true;
  } catch {
    return false;
  }
}

function assertClearanceReadinessAccess(actor: CorridorActorContext, shipment: Record<string, any>, allowDjiboutiRelease = false) {
  if (actor.role === 'djibouti_clearing_agent' && !shipment.documentsReadyForClearance) {
    throw new ForbiddenException('Clearance team can only access shipments marked ready for clearance');
  }
  if (!allowDjiboutiRelease && actor.role === 'djibouti_release_agent' && normalizeShipmentStage(shipment.currentStage) === 'transitor_clearance' && !shipment.documentsReadyForClearance) {
    throw new ForbiddenException('This clearance file is not ready in the system yet');
  }
}

function buildShipmentListView(
  shipment: Record<string, any>,
  containers: Record<string, any>[],
  exceptions: Record<string, any>[],
  actor: CorridorActorContext,
) {
  const container = containers[0];
  return {
    shipmentId: shipment.shipmentId,
    shipmentRef: shipment.shipmentRef,
    bookingNumber: shipment.bookingNumber || shipment.shipmentRef,
    customerId: shipment.customerId,
    customerName: shipment.customerName,
    consigneeName: shipment.consigneeName,
    supplierName: canViewScope(actor, 'supplier_visible') || canViewScope(actor, 'customer_visible') ? shipment.supplierName : undefined,
    serviceType: shipment.serviceType || shipment.serviceMode,
    currentStage: normalizeShipmentStage(shipment.currentStage),
    currentOwnerRole: shipment.currentOwnerRole,
    status: shipment.status || shipment.shipmentStatus,
    riskLevel: shipment.riskLevel,
    route: `${shipment.portOfLoading || shipment.originPort} -> ${shipment.portOfDischarge || shipment.dischargePort} -> ${shipment.inlandDestination || shipment.destinationNode}`,
    billOfLadingNumber: shipment.billOfLadingNumber,
    container: container ? {
      containerId: container.containerId,
      containerNumber: container.containerNumber,
      sealNumber: canViewScope(actor, 'driver_visible') || canViewScope(actor, 'customer_visible') ? container.sealNumber : undefined,
      status: container.status,
      releaseStatus: container.releaseStatus,
      emptyReturnStatus: container.emptyReturnStatus,
    } : shipment.container,
    exceptionChip: exceptions[0] ? { severity: exceptions[0].severity, title: exceptions[0].title || exceptions[0].summary } : null,
    documentCounts: {
      ready: [
        shipment.invoiceStatus,
        shipment.packingListStatus,
        shipment.blStatus,
        shipment.customsDocStatus,
        shipment.transitDocStatus,
        shipment.releaseNoteStatus,
        shipment.podStatus,
        shipment.customerConfirmationStatus === 'confirmed' ? 'approved' : 'missing',
        shipment.returnReceiptStatus,
      ].filter((item) => ['uploaded', 'approved'].includes(String(item))).length,
    },
    customerConfirmation: {
      status: shipment.customerConfirmationStatus || 'pending',
      confirmedAt: shipment.customerConfirmedAt,
      confirmedBy: shipment.customerConfirmedBy,
      note: shipment.customerConfirmationNote,
      shortageStatus: shipment.shortageStatus || 'clear',
      damageStatus: shipment.damageStatus || 'clear',
      closureBlockedReason: shipment.closureBlockedReason || '',
    },
    quoteBooking: {
      quoteId: shipment.quoteId,
      bookingId: shipment.bookingId,
      requestSource: shipment.requestSource,
      quoteStatus: shipment.quoteStatus,
      bookingStatus: shipment.bookingStatus,
      quoteAmount: shipment.quoteAmount,
      quoteCurrency: shipment.quoteCurrency,
      acceptedAt: shipment.acceptedAt,
      convertedToShipmentId: shipment.convertedToShipmentId,
      assignedOriginAgentId: shipment.assignedOriginAgentId,
      assignedOriginAgentEmail: shipment.assignedOriginAgentEmail,
    },
    clearance: {
      originFileSentAt: shipment.originFileSentAt,
      originFileSentBy: shipment.originFileSentBy,
      multimodalReceivedAt: shipment.multimodalReceivedAt,
      transitorAssignedTo: shipment.transitorAssignedTo,
      transitorAssignedAt: shipment.transitorAssignedAt,
      transitDocumentRef: shipment.transitDocumentRef,
      transitDocumentStatus: shipment.transitDocumentStatus,
      chargesPaymentStatus: shipment.chargesPaymentStatus,
      clearancePacketStatus: shipment.clearancePacketStatus,
      transportClearanceReady: shipment.transportClearanceReady,
      clearanceReadyAt: shipment.clearanceReadyAt,
      clearanceCompletedAt: shipment.clearanceCompletedAt,
      workflowState: shipment.workflowState || 'waiting_for_documents',
      readinessStatus: shipment.readinessStatus || 'blocked',
      blockedReasons: shipment.blockedReasons || [],
      missingFields: shipment.missingFields || [],
      documentsReadyForClearance: shipment.documentsReadyForClearance || false,
      documentsReadyAt: shipment.documentsReadyAt,
      documentsReadyMarkedBy: shipment.documentsReadyMarkedBy,
      clearanceWorkflowStatus: shipment.clearanceWorkflowStatus || 'waiting_for_documents',
      clearanceAcknowledgedAt: shipment.clearanceAcknowledgedAt,
      clearanceStartedAt: shipment.clearanceStartedAt,
      clearanceMissingDocumentReason: shipment.clearanceMissingDocumentReason || '',
    },
    containerLifecycle: {
      fullOutDjiboutiAt: shipment.fullOutDjiboutiAt,
      fullInDryPortAt: shipment.fullInDryPortAt,
      fullOutCustomerAt: shipment.fullOutCustomerAt,
      emptyInDryPortAt: shipment.emptyInDryPortAt,
      emptyOutDryPortAt: shipment.emptyOutDryPortAt,
      emptyInDjiboutiAt: shipment.emptyInDjiboutiAt,
    },
    paymentSummary: canViewScope(actor, 'finance_visible') || canViewScope(actor, 'customer_visible')
      ? { totalChargeAmount: shipment.totalChargeAmount, paymentStatus: shipment.paymentStatus, taxDutyStatus: shipment.taxDutyStatus }
      : undefined,
    blockedReasons: shipment.blockedReasons || [],
    workflowState: shipment.workflowState || 'waiting_for_documents',
    readinessStatus: shipment.readinessStatus || 'blocked',
    supportThreadCount: 1,
    activeTrip: null,
    updatedAt: shipment.updatedAt,
  };
}

function buildTripView(trip: Record<string, any>, actor: CorridorActorContext) {
  const base = {
    tripId: trip.tripId,
    containerId: trip.containerId,
    containerNumber: trip.containerNumber,
    route: trip.route || trip.routeName,
    originPoint: trip.originPoint,
    destinationPoint: trip.destinationPoint,
    tripStatus: trip.tripStatus || trip.dispatchStatus,
    dispatchStatus: trip.dispatchStatus,
    eta: trip.eta,
    actualDeparture: trip.actualDeparture || trip.dispatchAt,
    actualArrival: trip.actualArrival || trip.arrivalAt,
    currentCheckpoint: trip.currentCheckpoint,
    gpsStatus: trip.gpsStatus,
    issueStatus: trip.issueStatus,
    truckPlate: trip.truckPlate,
    trailerPlate: trip.trailerPlate,
  };
  if (['customer_user', 'customer_agent'].includes(actor.role)) {
    return base;
  }
  return {
    ...base,
    driverId: canViewScope(actor, 'internal_only') ? trip.driverId : undefined,
    driverName: trip.driverName,
    driverPhone: ['internal_driver', 'external_driver', 'corridor_dispatch_agent', 'executive_supervisor', 'super_admin'].includes(actor.role) ? trip.driverPhone : undefined,
    driverType: trip.driverType,
    vehicleId: canViewScope(actor, 'internal_only') ? trip.vehicleId : undefined,
    partnerId: trip.partnerId,
  };
}

function buildShipmentDetailView(aggregate: Record<string, any>, actor: CorridorActorContext) {
  const { shipment, cargoItems, documents, containers, trips, milestones, exceptions, emptyReturns, checkpoints, invoices, payments, expenseClaims, reimbursements } = aggregate;
  const detail: Record<string, any> = {
    shipmentId: shipment.shipmentId,
    shipmentRef: shipment.shipmentRef,
    bookingNumber: shipment.bookingNumber || shipment.shipmentRef,
    customerId: shipment.customerId,
    customerName: shipment.customerName,
    consigneeName: shipment.consigneeName,
    supplierName: canViewScope(actor, 'supplier_visible') || canViewScope(actor, 'customer_visible') ? shipment.supplierName : undefined,
    serviceType: shipment.serviceType || shipment.serviceMode,
    incoterm: shipment.incoterm,
    commoditySummary: shipment.commoditySummary,
    currentStage: normalizeShipmentStage(shipment.currentStage),
    currentOwnerRole: shipment.currentOwnerRole,
    currentOwnerUserId: canViewScope(actor, 'internal_only') ? shipment.currentOwnerUserId : undefined,
    status: shipment.status || shipment.shipmentStatus,
    priority: shipment.priority,
    route: {
      portOfLoading: shipment.portOfLoading || shipment.originPort,
      portOfDischarge: shipment.portOfDischarge || shipment.dischargePort,
      inlandDestination: shipment.inlandDestination || shipment.destinationNode,
      dryPortNode: shipment.dryPortNode || shipment.destinationNode,
      finalDeliveryLocation: shipment.finalDeliveryLocation,
      corridorRoute: shipment.corridorRoute,
    },
    ocean: {
      carrierName: shipment.carrierName || shipment.shippingLine,
      vesselName: shipment.vesselName,
      voyageNumber: shipment.voyageNumber,
      etd: shipment.etd,
      etaDjibouti: shipment.etaDjibouti,
      billOfLadingNumber: shipment.billOfLadingNumber,
      masterBillOfLadingNumber: shipment.masterBillOfLadingNumber,
      houseBillOfLadingNumber: shipment.houseBillOfLadingNumber,
    },
    readiness: {
      originReady: shipment.originReady,
      djiboutiReleaseReady: shipment.djiboutiReleaseReady,
      dispatchReady: shipment.dispatchReady,
      inlandArrivalReady: shipment.inlandArrivalReady,
      yardClosureReady: shipment.yardClosureReady,
      emptyReturnClosed: shipment.emptyReturnClosed,
      clearanceReady: shipment.readinessStatus === 'ready',
      workflowState: shipment.workflowState || 'waiting_for_documents',
      blockedReasons: shipment.blockedReasons || [],
      missingFields: shipment.missingFields || [],
      missingItems: shipment.missingDocumentTags || [],
    },
    documentsSummary: {
      invoiceStatus: shipment.invoiceStatus,
      packingListStatus: shipment.packingListStatus,
      blStatus: shipment.blStatus,
      customsDocStatus: shipment.customsDocStatus,
      transitDocStatus: shipment.transitDocStatus,
      releaseNoteStatus: shipment.releaseNoteStatus,
      podStatus: shipment.podStatus,
      customerConfirmationStatus: shipment.customerConfirmationStatus || 'pending',
      shortageStatus: shipment.shortageStatus || 'clear',
      damageStatus: shipment.damageStatus || 'clear',
      returnReceiptStatus: shipment.returnReceiptStatus,
    },
    customerConfirmation: {
      status: shipment.customerConfirmationStatus || 'pending',
      confirmedAt: shipment.customerConfirmedAt,
      confirmedBy: shipment.customerConfirmedBy,
      note: shipment.customerConfirmationNote,
      shortageStatus: shipment.shortageStatus || 'clear',
      damageStatus: shipment.damageStatus || 'clear',
      closureBlockedReason: shipment.closureBlockedReason || '',
    },
    closureBlockedReason: shipment.closureBlockedReason || '',
    clearanceBlockedReasons: shipment.blockedReasons || [],
    exceptionSummary: {
      hasExceptions: shipment.hasExceptions,
      activeExceptionCount: shipment.activeExceptionCount,
      latestExceptionSummary: shipment.latestExceptionSummary,
      riskLevel: shipment.riskLevel,
    },
    quoteBooking: {
      quoteId: shipment.quoteId,
      bookingId: shipment.bookingId,
      requestSource: shipment.requestSource,
      quoteStatus: shipment.quoteStatus,
      bookingStatus: shipment.bookingStatus,
      quoteAmount: shipment.quoteAmount,
      quoteCurrency: shipment.quoteCurrency,
      acceptedAt: shipment.acceptedAt,
      convertedToShipmentId: shipment.convertedToShipmentId,
      assignedOriginAgentId: shipment.assignedOriginAgentId,
      assignedOriginAgentEmail: shipment.assignedOriginAgentEmail,
    },
    clearance: {
      originFileSentAt: shipment.originFileSentAt,
      originFileSentBy: shipment.originFileSentBy,
      multimodalReceivedAt: shipment.multimodalReceivedAt,
      transitorAssignedTo: shipment.transitorAssignedTo,
      transitorAssignedAt: shipment.transitorAssignedAt,
      transitDocumentRef: shipment.transitDocumentRef,
      transitDocumentStatus: shipment.transitDocumentStatus,
      chargesPaymentStatus: shipment.chargesPaymentStatus,
      clearancePacketStatus: shipment.clearancePacketStatus,
      transportClearanceReady: shipment.transportClearanceReady,
      clearanceReadyAt: shipment.clearanceReadyAt,
      clearanceCompletedAt: shipment.clearanceCompletedAt,
      readinessStatus: shipment.readinessStatus || 'blocked',
      workflowState: shipment.workflowState || 'waiting_for_documents',
      documentsReadyForClearance: shipment.documentsReadyForClearance || false,
      documentsReadyAt: shipment.documentsReadyAt,
      documentsReadyMarkedBy: shipment.documentsReadyMarkedBy,
      clearanceWorkflowStatus: shipment.clearanceWorkflowStatus || 'waiting_for_documents',
      clearanceAcknowledgedAt: shipment.clearanceAcknowledgedAt,
      clearanceAcknowledgedBy: shipment.clearanceAcknowledgedBy,
      clearanceStartedAt: shipment.clearanceStartedAt,
      clearanceStartedBy: shipment.clearanceStartedBy,
      clearanceMissingDocumentReason: shipment.clearanceMissingDocumentReason || '',
      clearanceMissingDocumentRequestedAt: shipment.clearanceMissingDocumentRequestedAt,
      clearanceMissingDocumentRequestedBy: shipment.clearanceMissingDocumentRequestedBy,
      clearancePackUrl: shipment.clearancePackUrl || '',
      clearancePackPdfUrl: shipment.clearancePackPdfUrl || '',
      generatedAt: shipment.clearancePackGeneratedAt,
      generatedBy: shipment.clearancePackGeneratedBy,
    },
    containerLifecycle: {
      fullOutDjiboutiAt: shipment.fullOutDjiboutiAt,
      fullInDryPortAt: shipment.fullInDryPortAt,
      fullOutCustomerAt: shipment.fullOutCustomerAt,
      emptyInDryPortAt: shipment.emptyInDryPortAt,
      emptyOutDryPortAt: shipment.emptyOutDryPortAt,
      emptyInDjiboutiAt: shipment.emptyInDjiboutiAt,
    },
    cargoItems,
    documents: filterScopedList(documents, 'visibilityScope', actor),
    documentHub: {
      summary: buildDocumentHubSummary(filterScopedList(documents, 'visibilityScope', actor)),
      groups: buildDocumentHubGroups(filterScopedList(documents, 'visibilityScope', actor)),
    },
    containers,
    trips: trips.map((trip: any) => buildTripView(trip, actor)),
    milestones: filterScopedList(milestones, 'visibilityScope', actor).map((item: any) => ({
      milestoneId: item.milestoneId,
      code: item.code,
      label: item.label,
      stage: item.stage,
      status: item.status,
      timestamp: item.occurredAt,
      location: item.location,
      note: canViewScope(actor, item.visibilityScope) ? item.note : undefined,
    })),
    exceptions: filterScopedList(exceptions, 'visibilityScope', actor).map((item: any) => ({
      exceptionId: item.exceptionId,
      category: item.category || item.type,
      severity: item.severity,
      title: item.title || item.summary,
      description: canViewScope(actor, 'internal_only') || ['customer_user', 'customer_agent'].includes(actor.role)
        ? item.description || item.details
        : undefined,
      status: item.status,
      ownerRole: canViewScope(actor, 'internal_only') ? item.ownerRole : undefined,
      createdAt: item.createdAt,
      resolvedAt: item.resolvedAt,
    })),
    emptyReturns,
    checkpoints: ['internal_driver', 'external_driver', 'corridor_dispatch_agent', 'executive_supervisor', 'super_admin', 'dry_port_yard_agent'].includes(actor.role)
      ? checkpoints
      : [],
    finance: canViewScope(actor, 'finance_visible') || canViewScope(actor, 'customer_visible')
      ? {
          invoiceIds: shipment.invoiceIds,
          totalChargeAmount: shipment.totalChargeAmount,
          paymentStatus: shipment.paymentStatus,
          taxDutyStatus: shipment.taxDutyStatus,
          financeBlockReason: canViewScope(actor, 'finance_visible') ? shipment.financeBlockReason : undefined,
          invoices,
          payments,
          pendingDriverReimbursement: summarizePendingDriverReimbursement(expenseClaims, reimbursements),
        }
      : undefined,
  };
  return detail;
}

function buildWorkspacePayload(workspace: CorridorWorkspaceKey, detail: Record<string, any>): CorridorWorkspacePayload {
  const shared = {
    shipmentRef: detail.shipmentRef,
    serviceMode: detail.serviceType,
    containerNumber: detail.containers[0]?.containerNumber ?? '',
    sealNumber: detail.containers[0]?.sealNumber ?? '',
    exceptions: detail.exceptions ?? [],
    milestones: detail.milestones ?? [],
  };
  const workspaceTitle: Record<CorridorWorkspaceKey, string> = {
    booking_quote: 'Booking / Quote Desk',
    supplier: 'China Port Agent Desk',
    djibouti: 'Multimodal / Djibouti Release Desk',
    transitor: 'Transitor / Clearance Desk',
    dispatch: 'Corridor Dispatch',
    yard: 'Dry-Port Yard Desk',
    finance: 'Finance / Customs Control',
  };
  return {
    workspace,
    title: workspaceTitle[workspace],
    subtitle: 'Unified backend-backed shipment workspace',
    ownerLabel: detail.currentOwnerRole,
    stageLabel: detail.currentStage,
    summaryBullets: [
      `${detail.bookingNumber} is in ${detail.currentStage.replace(/_/g, ' ')} stage.`,
      `${detail.cargoItems.length} cargo lines and ${detail.documents.length} linked documents are attached.`,
      `${detail.exceptions.length} active visible exception(s).`,
    ],
    actions: [],
    sections: [
      {
        id: 'summary',
        title: 'Shipment Summary',
        description: 'Role-filtered unified shipment detail.',
        rows: [
          { label: 'Booking', value: detail.bookingNumber },
          { label: 'Customer', value: detail.customerName },
          { label: 'Route', value: `${detail.route.portOfLoading} -> ${detail.route.portOfDischarge} -> ${detail.route.inlandDestination}` },
          { label: 'Current stage', value: detail.currentStage },
        ],
      },
    ],
    ...shared,
  };
}

function defaultVisibilityForDocument(documentType?: string, tag?: string) {
  switch (tag || documentType) {
    case 'manifest':
    case 'bl':
    case 'commercial_invoice':
    case 'invoice':
    case 'packing_list':
    case 'final_bl':
    case 'transit_document':
    case 'release_note':
    case 'pod':
    case 'receipt':
      return 'customer_visible';
    case 'stuffing_photo':
    case 'seal_photo':
      return 'supplier_visible';
    case 'unload_photo':
    case 'return_receipt':
      return 'yard_visible';
    case 'customs_note':
      return 'djibouti_visible';
    default:
      return 'internal_only';
  }
}

function defaultVisibilityForException(role: string) {
  if (role === 'customer_support_agent') return 'customer_visible';
  if (role === 'djibouti_release_agent') return 'djibouti_visible';
  if (role === 'dry_port_yard_agent') return 'yard_visible';
  return 'internal_only';
}

function deriveDocumentStatus(documents: any[], types: string[]) {
  const relevant = documents.filter((item) => types.includes(item.documentType));
  if (!relevant.length) return 'missing';
  if (relevant.some((item) => ['locked', 'verified'].includes(item.status))) return 'verified';
  if (relevant.some((item) => item.status === 'approved')) return 'approved';
  if (relevant.some((item) => item.status === 'under_review')) return 'under_review';
  if (relevant.some((item) => item.status === 'uploaded')) return 'uploaded';
  if (relevant.some((item) => item.status === 'rejected')) return 'rejected';
  return 'missing';
}

function inferOwnerFromStage(stage: string) {
  switch (normalizeShipmentStage(stage)) {
    case 'booking':
    case 'origin_preparation':
    case 'ocean_in_transit':
      return 'supplier_agent';
    case 'djibouti_release':
      return 'djibouti_release_agent';
    case 'inland_dispatch':
      return 'corridor_dispatch_agent';
    case 'inland_arrival':
    case 'yard_processing':
    case 'delivery_pod':
    case 'empty_return':
    case 'closed':
      return 'dry_port_yard_agent';
    default:
      return 'executive_supervisor';
  }
}

function summarizeItems(items: any[]) {
  const descriptions = items.slice(0, 3).map((item) => item.description).filter(Boolean);
  return descriptions.join(', ');
}

function normalizeCargoItemPatch(body: Record<string, any>) {
  return {
    ...(body.description !== undefined ? { description: body.description } : {}),
    ...(body.hsCode !== undefined ? { hsCode: body.hsCode } : {}),
    ...(body.packageType !== undefined ? { packageType: body.packageType } : {}),
    ...(body.packageQuantity !== undefined ? { packageQty: Number(body.packageQuantity) } : {}),
    ...(body.packageQty !== undefined ? { packageQty: Number(body.packageQty) } : {}),
    ...(body.netWeight !== undefined ? { netWeightKg: Number(body.netWeight) } : {}),
    ...(body.netWeightKg !== undefined ? { netWeightKg: Number(body.netWeightKg) } : {}),
    ...(body.grossWeight !== undefined ? { grossWeightKg: Number(body.grossWeight) } : {}),
    ...(body.grossWeightKg !== undefined ? { grossWeightKg: Number(body.grossWeightKg) } : {}),
    ...(body.cbm !== undefined ? { cbm: Number(body.cbm) } : {}),
    ...(body.marksAndNumbers !== undefined ? { marksNumbers: body.marksAndNumbers } : {}),
    ...(body.invoiceReference !== undefined ? { invoiceRef: body.invoiceReference } : {}),
    ...(body.packingListReference !== undefined ? { packingListRef: body.packingListReference } : {}),
    ...(body.customsTransitReference !== undefined ? { transitDocRef: body.customsTransitReference } : {}),
    ...(body.remarks !== undefined ? { remarks: body.remarks } : {}),
    ...(body.discrepancyStatus !== undefined ? { discrepancyStatus: body.discrepancyStatus } : {}),
  };
}

function normalizeDocumentPatch(body: Record<string, any>, actor?: CorridorActorContext) {
  return {
    ...(body.referenceNumber !== undefined ? { referenceNo: body.referenceNumber } : {}),
    ...(body.issueDate !== undefined ? { issueDate: new Date(body.issueDate) } : {}),
    ...(body.status !== undefined ? { status: normalizeDocumentWorkflowStatus(body.status) } : {}),
    ...(body.visibilityScope !== undefined ? { visibilityScope: body.visibilityScope } : {}),
    ...(body.fileUrl !== undefined ? { fileUrl: body.fileUrl } : {}),
    ...(body.fileKey !== undefined ? { fileKey: body.fileKey } : {}),
    ...(body.fileName !== undefined ? { fileName: body.fileName } : {}),
    ...(body.previewUrl !== undefined ? { previewUrl: body.previewUrl } : {}),
    ...(body.tag !== undefined ? { tag: normalizeDocumentTag(body.tag) } : {}),
    ...(body.documentSubtype !== undefined ? { documentSubtype: body.documentSubtype } : {}),
    ...(body.locked === true ? { lockedAt: new Date(), lockedBy: actor?.name || actor?.role, lockedByUserId: actor?.userId, status: 'locked' } : {}),
    ...(body.metadata !== undefined ? { metadata: body.metadata } : {}),
  };
}

function normalizeDocumentType(value?: string) {
  const clean = String(value || 'document').trim().toLowerCase();
  if (['invoice', 'commercial_invoice'].includes(clean)) return 'commercial_invoice';
  if (['bl', 'bill_of_lading', 'final_bl', 'bl_draft'].includes(clean)) return clean === 'bl' ? 'final_bl' : clean;
  if (clean === 'manifest') return 'manifest';
  if (clean === 'customs') return 'customs_note';
  if (['container_details', 'container_detail', 'container'].includes(clean)) return 'container_details';
  return clean;
}

function normalizeDocumentTag(value?: string) {
  const clean = String(value || '').trim().toLowerCase();
  if (['commercial_invoice', 'invoice'].includes(clean)) return 'invoice';
  if (['bl', 'bill_of_lading', 'final_bl', 'bl_draft'].includes(clean)) return 'bl';
  if (['customs', 'customs_note', 'export_permit'].includes(clean)) return 'customs';
  if (['container_details', 'container_detail', 'container'].includes(clean)) return 'container_details';
  if (['transit_document', 'interchange'].includes(clean)) return 'interchange';
  return clean || 'general';
}

function normalizeDocumentWorkflowStatus(value?: string) {
  const clean = String(value || 'uploaded').trim().toLowerCase();
  if (['approved', 'verified'].includes(clean)) return 'verified';
  if (['locked'].includes(clean)) return 'locked';
  if (['draft', 'uploaded', 'rejected'].includes(clean)) return clean;
  return 'uploaded';
}

function renderBlockedReasonForTag(tag: string, status: string) {
  const label = toTitle(tag.replace(/_/g, ' '));
  if (status === 'missing') return `Missing ${label}`;
  if (status === 'rejected') return `${label} rejected`;
  if (status === 'uploaded' || status === 'draft') return `${label} not verified`;
  return `${label} ${status.replace(/_/g, ' ')}`;
}

function deriveWorkflowState(input: {
  docsUploaded: boolean;
  ready: boolean;
  clearanceCompleted: boolean;
  documentsReadyForClearance: boolean;
  acknowledged: boolean;
  inProgress: boolean;
  blockedMissingDocument: boolean;
}) {
  if (input.blockedMissingDocument) return 'blocked_missing_document';
  if (!input.docsUploaded) return 'waiting_for_documents';
  if (!input.ready) return 'blocked_missing_document';
  if (input.clearanceCompleted) return 'clearance_completed';
  if (input.inProgress) return 'clearance_in_progress';
  if (input.acknowledged) return 'clearance_acknowledged';
  if (input.documentsReadyForClearance) return 'documents_ready';
  return 'waiting_for_documents';
}

function buildShipmentStoragePath(shipmentId: string, folder: string, fileName: string) {
  return `/shipments/${shipmentId}/${folder}/${fileName}`;
}

function resolveDocumentStorageFolder(tag: string) {
  if (tag === 'invoice' || tag === 'receipt') return 'receipts';
  return 'documents';
}

function buildDocumentHubSummary(documents: any[]) {
  const latestDocuments = documents.filter((item) => item.isLatestVersion !== false);
  return {
    total: latestDocuments.length,
    locked: latestDocuments.filter((item) => item.status === 'locked').length,
    verified: latestDocuments.filter((item) => item.status === 'verified').length,
    rejected: latestDocuments.filter((item) => item.status === 'rejected').length,
    draft: latestDocuments.filter((item) => item.status === 'draft').length,
  };
}

function buildDocumentHubGroups(documents: any[]) {
  const grouped = groupDocumentsByTag(documents);
  return Object.entries(grouped).map(([tag, versions]) => ({
    tag,
    latest: versions[0],
    versions,
  })).sort((a, b) => a.tag.localeCompare(b.tag));
}

function groupDocumentsByTag(documents: any[]) {
  return documents.reduce((acc: Record<string, any[]>, item: any) => {
    const key = String(item.tag || item.documentType || 'general').toLowerCase();
    acc[key] = acc[key] || [];
    acc[key].push(item);
    acc[key].sort((a, b) => Number(b.versionNumber || 0) - Number(a.versionNumber || 0));
    return acc;
  }, {});
}

function summarizePendingDriverReimbursement(expenseClaims: any[], reimbursements: any[]) {
  const pendingClaims = expenseClaims.filter((item) => ['submitted', 'under_review', 'approved'].includes(String(item.status || '').toLowerCase()));
  const pendingAmount = pendingClaims.reduce((sum, item) => sum + Number(item.totalApproved || item.totalClaimed || 0), 0);
  const settledAmount = reimbursements.reduce((sum, item) => sum + Number(item.amountPaid || 0), 0);
  return {
    count: pendingClaims.length,
    amount: pendingAmount,
    settledAmount,
  };
}

function sanitizeReadiness(readiness: Record<string, any>) {
  return {
    ready: readiness.ready,
    missingItems: readiness.missingItems,
    missingFields: readiness.missingFields,
    blockingReasons: readiness.blockingReasons,
    workflowState: readiness.workflowState,
    financeApproved: readiness.financeApproved,
    releaseReady: readiness.releaseReady,
  };
}

function matchIdentifier(row: Record<string, any>, field: string, value: string) {
  return String(row[field] || '') === String(value) || String(row._id || '') === String(value);
}

function toTitle(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(' ');
}

function computeDocumentHash(payload: Record<string, any>) {
  return createHash('sha256').update(JSON.stringify({
    shipmentId: payload.shipmentId,
    shipmentRef: payload.shipmentRef,
    tag: payload.tag,
    versionNumber: payload.versionNumber,
    fileName: payload.fileName,
    referenceNo: payload.referenceNo,
    fileUrl: payload.fileUrl,
    metadata: payload.metadata || {},
  })).digest('hex');
}

function computeSignatureHash(payload: Record<string, any>) {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function resolveSigningRole(role: string, preferred?: string) {
  if (preferred) return preferred;
  if (role.includes('finance')) return 'finance_sign';
  if (role.includes('admin') || role.includes('supervisor')) return 'admin_override_sign';
  return 'ops_sign';
}

function computeSmartEta(points: any[], trip?: Record<string, any>, checkpoints: any[] = []) {
  const lastPoint = points[points.length - 1];
  const checkpointDelayHours = checkpoints.filter((item) => ['hold', 'inspection'].includes(String(item.eventType || ''))).length * 0.75;
  const baseHours = trip?.eta ? Math.max((new Date(trip.eta).getTime() - Date.now()) / 3_600_000, 0) : 10;
  const distanceFactor = points.length > 1 ? Math.max(2, 12 - Math.min(points.length / 5, 8)) : 8;
  const roadConditionFactor = 1.15;
  const totalHours = Math.max(1, baseHours + checkpointDelayHours + distanceFactor * roadConditionFactor);
  return {
    estimatedArrivalAt: new Date(Date.now() + totalHours * 3_600_000).toISOString(),
    drivingHoursRemaining: Number(totalHours.toFixed(1)),
    roadCondition: 'mock_moderate_traffic',
    stopCount: checkpoints.length,
  };
}

function deriveTrackingStatus(stage?: string, trip?: Record<string, any>, point?: Record<string, any>) {
  const normalized = String(stage || '').toLowerCase();
  if (normalized.includes('delivery') || normalized === 'closed') return 'delivered';
  if (normalized.includes('yard')) return 'at dry port';
  if (normalized.includes('dispatch') || trip?.tripStatus === 'in_transit') return 'in transit';
  if (normalized.includes('djibouti')) return 'at port';
  return point ? 'in transit' : 'at port';
}

function buildTrackingCheckpoints(aggregate: Record<string, any>) {
  return [
    { label: 'Port', location: aggregate.shipment.portOfDischarge || 'Djibouti Port', status: 'done' },
    { label: 'Dry Port', location: aggregate.shipment.dryPortNode || aggregate.shipment.inlandDestination || 'Dry Port', status: aggregate.shipment.inlandArrivalReady ? 'done' : 'next' },
    { label: 'Delivery', location: aggregate.shipment.finalDeliveryLocation || aggregate.shipment.inlandDestination || 'Customer Site', status: aggregate.shipment.currentStage === 'delivery_pod' ? 'active' : aggregate.shipment.currentStage === 'closed' ? 'done' : 'next' },
  ];
}

function buildTrackingRisk(aggregate: Record<string, any>, gpsPoints: any[], eta: Record<string, any>) {
  const lastPoint = gpsPoints[gpsPoints.length - 1];
  const lastSeenHours = lastPoint?.recordedAt ? (Date.now() - new Date(lastPoint.recordedAt).getTime()) / 3_600_000 : null;
  const alerts: string[] = [];
  if (lastSeenHours !== null && lastSeenHours > 6) alerts.push(`Driver stopped for ${Math.floor(lastSeenHours)} hours`);
  if (aggregate.shipment.readinessStatus === 'blocked') alerts.push(...(aggregate.shipment.blockedReasons || []));
  if (aggregate.shipment.emptyReturnClosed === false && aggregate.shipment.currentStage === 'empty_return') alerts.push('Container not returned after 5 days');
  return {
    status: alerts.length ? 'At Risk' : 'On Track',
    delayed: alerts.some((item) => item.toLowerCase().includes('delayed') || item.toLowerCase().includes('stopped')),
    alerts,
    eta,
  };
}

function computeQuotePricing(body: Record<string, any>) {
  const containerType = String(body.containerType || '20ft').toLowerCase();
  const weight = Number(body.weight || 0);
  const fuelRate = Number(body.fuelRate || 1.1);
  const customsCost = Number(body.customsCost || 850);
  const containerBase = containerType.includes('40') ? 5200 : 3200;
  const routeFactor = String(body.route || '').toLowerCase().includes('china') ? 1.35 : 1.05;
  const cargoFactor = String(body.cargoType || '').toLowerCase().includes('haz') ? 1.25 : 1;
  const weightFee = weight * 0.08;
  const transportPrice = Math.round(containerBase * routeFactor * cargoFactor + weightFee);
  const clearanceEstimate = Math.round(customsCost * routeFactor);
  const serviceFee = Math.round((transportPrice + clearanceEstimate) * 0.08 * fuelRate);
  return {
    transportPrice,
    clearanceEstimate,
    serviceFee,
    total: transportPrice + clearanceEstimate + serviceFee,
  };
}

function normalizeContainerPatch(body: Record<string, any>) {
  return {
    ...(body.containerType !== undefined ? { containerType: body.containerType } : {}),
    ...(body.sealNumber !== undefined ? { sealNumber: body.sealNumber } : {}),
    ...(body.status !== undefined ? { status: body.status } : {}),
    ...(body.stuffingStatus !== undefined ? { stuffingStatus: body.stuffingStatus } : {}),
    ...(body.dischargeStatus !== undefined ? { dischargeStatus: body.dischargeStatus } : {}),
    ...(body.releaseStatus !== undefined ? { releaseStatus: body.releaseStatus } : {}),
    ...(body.inlandTripStatus !== undefined ? { inlandTripStatus: body.inlandTripStatus } : {}),
    ...(body.unloadStatus !== undefined ? { unloadStatus: body.unloadStatus } : {}),
    ...(body.emptyReturnStatus !== undefined ? { emptyReturnStatus: body.emptyReturnStatus } : {}),
    ...(body.freeTimeStart !== undefined ? { freeTimeStart: new Date(body.freeTimeStart) } : {}),
    ...(body.freeTimeEnd !== undefined ? { freeTimeEnd: new Date(body.freeTimeEnd) } : {}),
    ...(body.storageRiskLevel !== undefined ? { storageRiskLevel: body.storageRiskLevel } : {}),
  };
}

function normalizeTripPatch(body: Record<string, any>) {
  return {
    ...(body.driverId !== undefined ? { driverId: body.driverId } : {}),
    ...(body.driverName !== undefined ? { driverName: body.driverName } : {}),
    ...(body.driverPhone !== undefined ? { driverPhone: body.driverPhone } : {}),
    ...(body.driverType !== undefined ? { driverType: body.driverType } : {}),
    ...(body.vehicleId !== undefined ? { vehicleId: body.vehicleId } : {}),
    ...(body.truckPlate !== undefined ? { truckPlate: body.truckPlate } : {}),
    ...(body.trailerPlate !== undefined ? { trailerPlate: body.trailerPlate } : {}),
    ...(body.route !== undefined ? { route: body.route } : {}),
    ...(body.routeName !== undefined ? { routeName: body.routeName } : {}),
    ...(body.originPoint !== undefined ? { originPoint: body.originPoint } : {}),
    ...(body.destinationPoint !== undefined ? { destinationPoint: body.destinationPoint } : {}),
    ...(body.dispatchStatus !== undefined ? { dispatchStatus: body.dispatchStatus } : {}),
    ...(body.tripStatus !== undefined ? { tripStatus: body.tripStatus } : {}),
    ...(body.eta !== undefined ? { eta: new Date(body.eta) } : {}),
    ...(body.actualDeparture !== undefined ? { actualDeparture: new Date(body.actualDeparture) } : {}),
    ...(body.actualArrival !== undefined ? { actualArrival: new Date(body.actualArrival) } : {}),
    ...(body.currentCheckpoint !== undefined ? { currentCheckpoint: body.currentCheckpoint } : {}),
    ...(body.gpsStatus !== undefined ? { gpsStatus: body.gpsStatus } : {}),
    ...(body.issueStatus !== undefined ? { issueStatus: body.issueStatus } : {}),
    ...(body.partnerId !== undefined ? { partnerId: body.partnerId } : {}),
  };
}

function buildActionMilestone(aggregate: any, action: string, actor: CorridorActorContext, code: string, label: string, stage: string, location?: string) {
  return {
    milestoneId: `${aggregate.shipment.shipmentId}-${code}`,
    shipmentId: aggregate.shipment.shipmentId,
    shipmentRef: aggregate.shipment.shipmentRef,
    containerId: aggregate.containers[0]?.containerId,
    containerNumber: aggregate.containers[0]?.containerNumber,
    stage,
    code,
    label,
    status: 'done',
    occurredAt: new Date(),
    location: location || aggregate.shipment.inlandDestination || aggregate.shipment.portOfDischarge,
    sourceRole: actor.role,
    sourceUserId: actor.userId,
    note: action.replace(/_/g, ' '),
    visibilityScope: ['internal_driver', 'external_driver'].includes(actor.role) ? 'driver_visible' : 'internal_only',
  };
}

function mapCheckpointStatus(status?: string) {
  switch (status) {
    case 'hold':
      return 'checkpoint_hold';
    case 'inspection':
      return 'checkpoint_hold';
    case 'delayed':
      return 'delayed';
    case 'passed':
    default:
      return 'in_transit';
  }
}

export function corridorActorFromUser(user?: AuthenticatedUser, query?: Record<string, unknown>) {
  return corridorActorFromRequest(user, query);
}

export const corridorStageOwnershipRules = buildStageOwnershipRules();
export const corridorActionAuthorizationRules = buildActionRules();
