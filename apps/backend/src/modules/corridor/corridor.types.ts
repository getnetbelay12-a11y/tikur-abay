import type {
  CorridorBlStatus,
  CorridorContainerStatus,
  CorridorCustomsStatus,
  CorridorEmptyReturnStatus,
  CorridorExceptionStatus,
  CorridorExceptionType,
  CorridorInspectionStatus,
  CorridorInvoiceStatus,
  CorridorMovementStatus,
  CorridorPackingListStatus,
  CorridorPaymentStatus,
  CorridorServiceMode,
  CorridorShipmentStatus,
  CorridorSupportStatus,
  CorridorTransitDocumentStatus,
  CorridorTransitDocumentSubtype,
  CorridorTripStatus,
} from '../../common/enums';

export type CorridorRole =
  | 'super_admin'
  | 'executive_supervisor'
  | 'supplier_agent'
  | 'supplier_external_agent'
  | 'origin_coordinator'
  | 'djibouti_release_agent'
  | 'djibouti_clearing_agent'
  | 'corridor_dispatch_agent'
  | 'dispatch_agent'
  | 'dry_port_yard_agent'
  | 'yard_agent'
  | 'finance_customs_control'
  | 'finance_agent'
  | 'document_control_agent'
  | 'customer_support_agent'
  | 'customer_user'
  | 'customer_agent'
  | 'internal_driver'
  | 'external_driver'
  | 'driver'
  | 'supervisor'
  | 'admin';

export type CorridorPermission =
  | 'view_own_shipment'
  | 'view_assigned_shipment'
  | 'view_all_shipments'
  | 'create_shipment'
  | 'edit_shipment_master'
  | 'close_shipment'
  | 'create_booking'
  | 'update_supplier_readiness'
  | 'record_stuffing'
  | 'record_seal'
  | 'record_origin_gate_in'
  | 'assign_vessel'
  | 'update_etd_eta_origin'
  | 'upload_bl'
  | 'approve_bl_draft'
  | 'issue_bl_final'
  | 'upload_invoice'
  | 'upload_packing_list'
  | 'upload_transit_doc'
  | 'upload_release_note'
  | 'upload_pod'
  | 'upload_empty_return_receipt'
  | 'view_all_linked_docs'
  | 'download_docs'
  | 'validate_document_checklist'
  | 'view_cargo_items'
  | 'create_cargo_items'
  | 'edit_cargo_items'
  | 'mark_shortage_damage'
  | 'mark_inspection_result'
  | 'record_discharge'
  | 'update_line_release_status'
  | 'update_customs_status'
  | 'update_transit_status'
  | 'set_free_time_window'
  | 'mark_gate_out_ready'
  | 'record_customs_hold'
  | 'record_customs_release'
  | 'request_truck_assignment'
  | 'assign_truck'
  | 'assign_driver'
  | 'view_live_tracking'
  | 'update_eta'
  | 'record_corridor_checkpoint'
  | 'record_incident'
  | 'notify_customer'
  | 'record_dry_port_arrival'
  | 'record_unload'
  | 'assign_storage_location'
  | 'mark_delivery_complete'
  | 'record_pod'
  | 'confirm_customer_receipt'
  | 'release_empty_container'
  | 'record_empty_return'
  | 'view_invoice_status'
  | 'issue_invoice'
  | 'record_payment'
  | 'issue_receipt'
  | 'view_duty_tax_summary'
  | 'mark_duty_tax_paid'
  | 'gate_release_on_payment'
  | 'clear_finance_block'
  | 'create_ticket'
  | 'reply_ticket'
  | 'escalate_ticket'
  | 'view_support_history'
  | 'mark_ocean_handoff_ready'
  | 'push_to_dispatch'
  | 'push_to_yard'
  | 'close_shipment_cycle'
  | 'override_stage_owner'
  | 'reassign_stage_owner'
  | 'view_customer_summary'
  | 'view_internal_finance'
  | 'view_release_risk'
  | 'view_yard_closure'
  | 'view_assigned_trip'
  | 'view_transit_pack'
  | 'view_item_summary'
  | 'view_docs_for_trip'
  | 'confirm_seal_intact'
  | 'record_checkpoint_note'
  | 'upload_checkpoint_photo'
  | 'record_gate_in_out'
  | 'report_customs_hold'
  | 'report_shortage_damage'
  | 'confirm_arrival'
  | 'confirm_unload'
  | 'confirm_empty_return';

export type CorridorRoleMatrixEntry = {
  role: CorridorRole;
  title: string;
  scope: string;
  responsibilities: string[];
  permissions: CorridorPermission[];
};

export type CorridorVisibilityScope =
  | 'internal_only'
  | 'customer_visible'
  | 'driver_visible'
  | 'supplier_visible'
  | 'djibouti_visible'
  | 'yard_visible'
  | 'finance_visible'
  | 'supervisor_visible';

export type CorridorNormalizedShipmentStage =
  | 'booking_quote'
  | 'origin_preparation'
  | 'ocean_in_transit'
  | 'djibouti_release'
  | 'transitor_clearance'
  | 'inland_dispatch'
  | 'inland_arrival'
  | 'yard_processing'
  | 'delivery_pod'
  | 'empty_return'
  | 'closed';

export type CorridorNormalizedContainerStatus =
  | 'pending'
  | 'stuffed'
  | 'gated_in'
  | 'discharged'
  | 'release_pending'
  | 'gate_out_ready'
  | 'in_transit'
  | 'arrived'
  | 'unloaded'
  | 'empty_released'
  | 'empty_return_in_progress'
  | 'empty_returned'
  | 'closed';

export type CorridorNormalizedTripStatus =
  | 'awaiting_assignment'
  | 'assigned'
  | 'ready_to_depart'
  | 'departed'
  | 'in_transit'
  | 'checkpoint_hold'
  | 'delayed'
  | 'arrived_inland'
  | 'handed_to_yard'
  | 'closed';

export type CorridorNormalizedDocumentStatus =
  | 'missing'
  | 'uploaded'
  | 'under_review'
  | 'approved'
  | 'rejected';

export type CorridorNormalizedExceptionStatus =
  | 'open'
  | 'acknowledged'
  | 'in_progress'
  | 'resolved'
  | 'dismissed';

export type CorridorDocumentType =
  | 'commercial_invoice'
  | 'packing_list'
  | 'bl_draft'
  | 'final_bl'
  | 'export_permit'
  | 'customs_note'
  | 'transit_document'
  | 'release_note'
  | 'pod'
  | 'receipt'
  | 'stuffing_photo'
  | 'seal_photo'
  | 'unload_photo'
  | 'return_receipt'
  | 'special_handling_note';

export type CorridorWorkspaceKey = 'booking_quote' | 'supplier' | 'djibouti' | 'transitor' | 'dispatch' | 'yard' | 'finance';

export type CorridorBookingRequestSource =
  | 'customer'
  | 'supplier'
  | 'internal'
  | 'port_agent'
  | 'admin';

export type CorridorQuoteStatus =
  | 'quote_requested'
  | 'quote_under_review'
  | 'quote_sent'
  | 'quote_accepted'
  | 'quote_rejected'
  | 'quote_revision_requested'
  | 'booking_created'
  | 'assigned_to_origin';

export type CorridorContainerMovementCode =
  | 'full_out_djibouti'
  | 'full_in_dry_port'
  | 'full_out_customer'
  | 'empty_in_dry_port'
  | 'empty_out_dry_port'
  | 'empty_in_djibouti';

export type CorridorWorkspaceAction = {
  label: string;
  tone: 'primary' | 'secondary';
  href?: string;
};

export type CorridorWorkspaceSection = {
  id: string;
  title: string;
  description: string;
  rows: Array<{
    label: string;
    value: string;
    tone?: 'neutral' | 'good' | 'warning' | 'critical';
  }>;
};

export type CorridorPartyAccess = {
  role: CorridorRole;
  actorName: string;
  actorCode: string;
  shipmentRefs: string[];
  stageAccess: string[];
};

export type CorridorUnifiedShipmentIdentity = {
  shipmentId: string;
  quoteId?: string;
  bookingNumber: string;
  bookingId?: string;
  customerId: string;
  customerName: string;
  consigneeName: string;
  supplierName: string;
  supplierAgentId: string;
  requestSource?: CorridorBookingRequestSource;
  quoteStatus?: CorridorQuoteStatus;
  serviceType: CorridorServiceMode;
  incoterm: string;
  commoditySummary: string;
  currentStage: CorridorNormalizedShipmentStage;
  currentOwnerRole: CorridorRole;
  currentOwnerUserId: string;
  status: CorridorShipmentStatus | CorridorNormalizedShipmentStage;
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  updatedAt: string;
};

export type CorridorUnifiedShipmentRoute = {
  portOfLoading: string;
  portOfDischarge: string;
  inlandDestination: string;
  dryPortNode: string;
  finalDeliveryLocation: string;
  corridorRoute: string;
};

export type CorridorUnifiedOceanReference = {
  carrierName: string;
  vesselName: string;
  voyageNumber: string;
  etd: string;
  etaDjibouti: string;
  billOfLadingNumber: string;
  masterBillOfLadingNumber: string;
  houseBillOfLadingNumber: string;
};

export type CorridorQuoteBookingSnapshot = {
  quoteId: string;
  bookingId: string;
  requestSource: CorridorBookingRequestSource;
  quoteStatus: CorridorQuoteStatus;
  bookingStatus: string;
  quoteAmount: number;
  quoteCurrency: string;
  acceptedAt?: string;
  convertedToShipmentId?: string;
  assignedOriginAgentId?: string;
  assignedOriginAgentEmail?: string;
};

export type CorridorTransitorClearanceState = {
  transitorAssignedTo?: string;
  transitorAssignedAt?: string;
  transitDocumentRef?: string;
  transitDocumentStatus?: string;
  chargesPaymentStatus?: string;
  clearancePacketStatus?: string;
  transportClearanceReady?: boolean;
  clearanceReadyAt?: string;
  clearanceCompletedAt?: string;
};

export type CorridorContainerMovementTimestamps = {
  fullOutDjiboutiAt?: string;
  fullInDryPortAt?: string;
  fullOutCustomerAt?: string;
  emptyInDryPortAt?: string;
  emptyOutDryPortAt?: string;
  emptyInDjiboutiAt?: string;
};

export type CorridorUnifiedContainerLinkage = {
  containerIds: string[];
  activeContainerCount: number;
  sealNumbers: string[];
  containerTypeSummary: string;
};

export type CorridorUnifiedDocumentReadiness = {
  invoiceStatus: CorridorNormalizedDocumentStatus;
  packingListStatus: CorridorNormalizedDocumentStatus;
  blStatus: CorridorNormalizedDocumentStatus;
  customsDocStatus: CorridorNormalizedDocumentStatus;
  transitDocStatus: CorridorNormalizedDocumentStatus;
  releaseNoteStatus: CorridorNormalizedDocumentStatus;
  podStatus: CorridorNormalizedDocumentStatus;
  returnReceiptStatus: CorridorNormalizedDocumentStatus;
};

export type CorridorUnifiedOperationalReadiness = {
  originReady: boolean;
  djiboutiReleaseReady: boolean;
  dispatchReady: boolean;
  inlandArrivalReady: boolean;
  yardClosureReady: boolean;
  emptyReturnClosed: boolean;
};

export type CorridorUnifiedFinancialReadiness = {
  invoiceIds: string[];
  totalChargeAmount: number;
  paymentStatus: CorridorPaymentStatus | CorridorInvoiceStatus;
  taxDutyStatus: CorridorCustomsStatus | string;
  financeBlockReason: string | null;
};

export type CorridorUnifiedExceptionState = {
  hasExceptions: boolean;
  activeExceptionCount: number;
  latestExceptionSummary: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
};

export type CorridorUnifiedCargoItem = {
  cargoItemId: string;
  shipmentId: string;
  lineNumber: string;
  description: string;
  hsCode: string;
  packageType: string;
  packageQuantity: number;
  netWeight: number;
  grossWeight: number;
  cbm: number;
  marksAndNumbers: string;
  invoiceReference: string;
  packingListReference: string;
  customsTransitReference: string;
  remarks: string;
  discrepancyStatus: string;
};

export type CorridorUnifiedShipmentDocument = {
  shipmentDocumentId: string;
  shipmentId: string;
  documentType: CorridorDocumentType;
  referenceNumber: string;
  issueDate: string;
  uploadedDate: string;
  status: CorridorNormalizedDocumentStatus;
  sourceRole: CorridorRole;
  fileUrl: string;
  visibilityScope: CorridorVisibilityScope[];
  uploadedByUserId: string;
};

export type CorridorUnifiedContainer = {
  containerId: string;
  shipmentId: string;
  containerNumber: string;
  containerType: string;
  sealNumber: string;
  status: CorridorNormalizedContainerStatus;
  stuffingStatus: string;
  dischargeStatus: string;
  releaseStatus: string;
  inlandTripStatus: string;
  unloadStatus: string;
  emptyReturnStatus: string;
  freeTimeStart: string;
  freeTimeEnd: string;
  storageRiskLevel: 'low' | 'medium' | 'high' | 'critical';
};

export type CorridorUnifiedInlandTrip = {
  tripId: string;
  shipmentId: string;
  containerId: string;
  driverId: string;
  vehicleId: string;
  partnerId?: string;
  route: string;
  originPoint: string;
  destinationPoint: string;
  dispatchStatus: CorridorNormalizedTripStatus;
  eta: string;
  actualDeparture: string | null;
  actualArrival: string | null;
  currentCheckpoint: string;
  gpsStatus: string;
  issueStatus: string;
};

export type CorridorUnifiedMilestone = {
  milestoneId: string;
  shipmentId: string;
  containerId?: string;
  tripId?: string;
  stage: string;
  status: 'done' | 'active' | 'next' | 'blocked';
  timestamp: string;
  location: string;
  sourceRole: CorridorRole;
  sourceUserId: string;
  note: string;
  visibilityScope: CorridorVisibilityScope[];
};

export type CorridorUnifiedException = {
  exceptionId: string;
  shipmentId: string;
  containerId?: string;
  tripId?: string;
  category: CorridorExceptionType | string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  ownerRole: CorridorRole;
  ownerUserId: string;
  status: CorridorNormalizedExceptionStatus;
  createdAt: string;
  resolvedAt?: string | null;
  visibilityScope: CorridorVisibilityScope[];
};

export type CorridorUnifiedShipmentRecord = {
  identity: CorridorUnifiedShipmentIdentity;
  route: CorridorUnifiedShipmentRoute;
  oceanReferences: CorridorUnifiedOceanReference;
  containerLinkage: CorridorUnifiedContainerLinkage;
  documentReadiness: CorridorUnifiedDocumentReadiness;
  operationalReadiness: CorridorUnifiedOperationalReadiness;
  financialReadiness: CorridorUnifiedFinancialReadiness;
  exceptionState: CorridorUnifiedExceptionState;
  cargoItems: CorridorUnifiedCargoItem[];
  shipmentDocuments: CorridorUnifiedShipmentDocument[];
  containers: CorridorUnifiedContainer[];
  inlandTrips: CorridorUnifiedInlandTrip[];
  milestones: CorridorUnifiedMilestone[];
  exceptions: CorridorUnifiedException[];
};

export type CorridorFieldVisibilityRule = {
  field: string;
  scopes: CorridorVisibilityScope[];
};

export type CorridorStageOwnershipRule = {
  stage: string;
  ownerRoles: CorridorRole[];
  handoffSummary: string;
};

export type CorridorActionAuthorizationRule = {
  action: CorridorPermission;
  allowedRoles: CorridorRole[];
  allowedStages: string[];
  scopeSummary: string;
};

export type CorridorRoleAccessRule = {
  role: CorridorRole;
  title: string;
  allowedScreens: string[];
  allowedRoutes: string[];
  allowedShipmentStages: string[];
  allowedFields: string[];
  allowedActions: CorridorPermission[];
  allowedDocumentTypes: CorridorDocumentType[];
  communicationChannels: Array<'Email' | 'SMS' | 'Telegram' | 'In-app'>;
};

export type CorridorAccessMatrixPayload = {
  roles: CorridorRoleMatrixEntry[];
  roleAccess: CorridorRoleAccessRule[];
  stageOwnership: CorridorStageOwnershipRule[];
  actionAuthorization: CorridorActionAuthorizationRule[];
  fieldVisibility: CorridorFieldVisibilityRule[];
  statusModel: {
    shipmentStages: CorridorNormalizedShipmentStage[];
    containerStatuses: CorridorNormalizedContainerStatus[];
    tripStatuses: CorridorNormalizedTripStatus[];
    documentStatuses: CorridorNormalizedDocumentStatus[];
    exceptionStatuses: CorridorNormalizedExceptionStatus[];
  };
};

export type CorridorCargoItem = {
  id: string;
  lineNo: string;
  skuCode: string;
  marksNumbers: string;
  description: string;
  hsCode: string;
  commodityCode: string;
  packageType: string;
  packageQty: number;
  grossWeightKg: number;
  netWeightKg: number;
  cbm: number;
  invoiceRef: string;
  packingListRef: string;
  transitDocRef: string;
  inspectionStatus: CorridorInspectionStatus;
  shortageFlag: boolean;
  damageFlag: boolean;
  exceptionFlag: boolean;
  remark: string;
};

export type CorridorLinkedDocument = {
  id: string;
  type: string;
  subtype: string;
  referenceNo: string;
  issueDate: string;
  status: string;
  actionLabel: string;
  fileName: string;
};

export type CorridorBl = {
  id: string;
  blNumber: string;
  blType: 'bl' | 'hbl' | 'mbl';
  status: CorridorBlStatus;
  carrierBookingNumber: string;
  shipperName: string;
  consigneeName: string;
  notifyParty: string;
  vesselName: string;
  voyageNumber: string;
  portOfLoading: string;
  portOfDischarge: string;
  placeOfReceipt: string;
  placeOfDelivery: string;
  cargoDescription: string;
  grossWeightKg: number;
  packageCount: number;
  issueDate: string;
};

export type CorridorPackingList = {
  id: string;
  packingListNumber: string;
  status: CorridorPackingListStatus;
  invoiceReference: string;
  shipperName: string;
  consigneeName: string;
  issueDate: string;
  totalPackages: number;
  totalGrossWeightKg: number;
  totalNetWeightKg: number;
  totalCbm: number;
};

export type CorridorCommercialInvoice = {
  id: string;
  invoiceNumber: string;
  status: CorridorInvoiceStatus;
  sellerName: string;
  buyerName: string;
  currency: string;
  invoiceAmount: number;
  incoterm: string;
  issueDate: string;
};

export type CorridorTransitDocument = {
  id: string;
  documentNumber: string;
  subtype: CorridorTransitDocumentSubtype;
  status: CorridorTransitDocumentStatus;
  declarationNumber: string;
  customsRegime: string;
  officeOfDeparture: string;
  officeOfDestination: string;
  bondReference: string;
  bondStatus: string;
  guaranteeReference: string;
  guaranteeStatus: string;
  customsStatus: CorridorCustomsStatus;
  transitStatus: CorridorMovementStatus;
  issueDate: string;
  expiryDate: string;
  releaseDate: string;
};

export type CorridorMilestone = {
  id: string;
  code: string;
  label: string;
  status: 'done' | 'active' | 'next';
  occurredAt: string;
  location: string;
  note: string;
};

export type CorridorException = {
  id: string;
  type: CorridorExceptionType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: CorridorExceptionStatus;
  detectedAt: string;
  summary: string;
  details: string;
  reportedBy: string;
};

export type CorridorSupportThread = {
  id: string;
  channel: 'Chat' | 'Telegram' | 'Email' | 'SMS';
  shipmentRef: string;
  preview: string;
  status: CorridorSupportStatus;
  timestamp: string;
};

export type CorridorPaymentRecord = {
  id: string;
  invoiceRef: string;
  description: string;
  amount: number;
  status: CorridorPaymentStatus;
  receiptNumber: string;
  timestamp: string;
};

export type CorridorShipmentRecord = {
  shipmentRef: string;
  serviceMode: CorridorServiceMode;
  shipmentStatus: CorridorShipmentStatus;
  customerName: string;
  supplierName: string;
  supplierLocation: string;
  consigneeName: string;
  shippingLine: string;
  carrierName: string;
  originCountry: string;
  originPort: string;
  dischargePort: string;
  destinationCountry: string;
  destinationNode: string;
  currentStage: string;
  currentStatus: string;
  exceptionStatus: string;
  container: {
    containerNumber: string;
    containerType: string;
    containerSize: string;
    sealNumber: string;
    status: CorridorContainerStatus;
    releaseStatus: string;
    djiboutiStatus: string;
    corridorStatus: string;
    dryPortStatus: string;
    emptyReturnStatus: CorridorEmptyReturnStatus;
    freeTimeStartAt: string;
    freeTimeEndAt: string;
    detentionRiskLevel: 'low' | 'medium' | 'high';
    demurrageRiskLevel: 'low' | 'medium' | 'high';
    currentLocation: string;
    currentEta: string;
  };
  blDocuments: CorridorBl[];
  packingLists: CorridorPackingList[];
  invoices: CorridorCommercialInvoice[];
  transitDocuments: CorridorTransitDocument[];
  cargoItems: CorridorCargoItem[];
  linkedDocuments: CorridorLinkedDocument[];
  milestones: CorridorMilestone[];
  exceptions: CorridorException[];
  payments: CorridorPaymentRecord[];
  supportThreads: CorridorSupportThread[];
  taxDutySummary: string;
  releaseReadiness: string;
  emptyReturnSummary: string;
  backbone: CorridorUnifiedShipmentRecord;
};

export type CorridorCustomerPortalPayload = {
  portalTitle: string;
  customerName: string;
  activeShipmentRef: string;
  kpis: Array<{ key: string; label: string; value: string; helper: string }>;
  shipments: CorridorShipmentRecord[];
};

export type CorridorWorkspacePayload = {
  workspace: CorridorWorkspaceKey;
  title: string;
  subtitle: string;
  ownerLabel: string;
  stageLabel: string;
  shipmentRef: string;
  serviceMode: CorridorServiceMode;
  containerNumber: string;
  sealNumber: string;
  summaryBullets: string[];
  actions: CorridorWorkspaceAction[];
  sections: CorridorWorkspaceSection[];
  exceptions: CorridorException[];
  milestones: CorridorMilestone[];
};

export type CorridorDriverTransitPack = {
  tripId: string;
  tripStatus: CorridorTripStatus;
  shipmentStage: CorridorNormalizedShipmentStage;
  driverName: string;
  driverId: string;
  licenseNumber: string;
  truckPlate: string;
  trailerPlate: string;
  consignee: string;
  route: string;
  origin: string;
  destination: string;
  containerNumber: string;
  sealNumber: string;
  blNumber: string;
  packingListNumber: string;
  invoiceNumber: string;
  transitDocumentNumber: string;
  transitDocumentSubtype: CorridorTransitDocumentSubtype;
  customsStatus: CorridorCustomsStatus;
  transitStatus: CorridorMovementStatus;
  officeOfDeparture: string;
  officeOfDestination: string;
  bondGuaranteeStatus: string;
  qrValue: string;
  itemCount: number;
  totalPackages: number;
  totalGrossWeightKg: number;
  commoditySummary: string;
  inlandArrivalConfirmed: boolean;
  unloadCompleted: boolean;
  emptyReleased: boolean;
  emptyReturnStarted: boolean;
  emptyReturned: boolean;
  itemDetails: Array<{
    lineNo: string;
    description: string;
    packageCount: number;
    packageType: string;
    weightKg: number;
    marksNumbers: string;
    consigneeReference: string;
    remarks: string;
  }>;
  checkpointActions: string[];
};
