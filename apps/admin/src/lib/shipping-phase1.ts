'use client';

import { type UnifiedBookingRequest } from './booking-quote-demo-data';
import type { ConsoleRole } from './console-config';
import { type YardRecord } from './dry-port-yard-demo-data';
import {
  mergeYardRecords,
  readManualDispatchTrips,
  readManualDjiboutiReleaseRecords,
  readManualYardRecords,
} from './manual-corridor-journey';
import { readSharedQuoteRequests } from './shared-quote-storage';
import type { SupplierDeskShipment } from './supplier-agent-demo-data';

export type ShippingDocumentStatus = 'pending' | 'invalid' | 'corrected' | 'approved';
export type ShippingPaymentStatus = 'pending' | 'partial' | 'paid';
export type ShippingSettlementStatus = 'outstanding' | 'closed';
export type ShippingInstructionStatus = 'draft' | 'submitted' | 'approved';
export type ShippingBillOfLadingStatus = 'draft' | 'approved' | 'final';
export type ShippingManifestStatus = 'pending' | 'generated';
export type ShippingFleetStatus = 'available' | 'busy' | 'maintenance';
export type ShippingContainerEventType =
  | 'BOOKED'
  | 'EMPTY_RELEASED'
  | 'EMPTY_PICKUP'
  | 'LOADED_AT_SHIPPER'
  | 'GATE_IN_AT_PORT'
  | 'LOADED_ON_VESSEL'
  | 'VESSEL_DEPARTED'
  | 'TRANSSHIPMENT'
  | 'VESSEL_ARRIVED'
  | 'DISCHARGED_FROM_VESSEL'
  | 'AVAILABLE_FOR_CLEARANCE'
  | 'CUSTOMS_CLEARED'
  | 'TRUCK_ASSIGNED'
  | 'OUT_FOR_DELIVERY'
  | 'ARRIVED_INLAND'
  | 'YARD_HANDOFF'
  | 'UNLOADED_INLAND'
  | 'HANDOFF'
  | 'IN_TRANSIT'
  | 'ARRIVED'
  | 'EMPTY_RETURN_STARTED'
  | 'EMPTY_RETURNED';
export type ShippingIncidentSeverity = 'critical' | 'warning' | 'info';
export type ShippingLcStatus = 'pending' | 'verified' | 'paid';
export type ShippingTradeDocumentKey = 'billOfLading' | 'commercialInvoice' | 'packingList' | 'certificateOfOrigin' | 'insuranceCertificate' | 'lcDocument';
export type ShippingAfterSalesStatus = 'feedback_pending' | 'open' | 'resolved';
export type ShippingAfterSalesKind = 'issue' | 'complaint' | 'support_call' | 'feedback';
export type ShippingCarrierScheduleStatus = 'open' | 'closing_soon' | 'departed';
export type ShippingCarrierAlertTone = 'info' | 'warning' | 'critical';
export type ShippingNotificationSeverity = 'info' | 'high' | 'critical';

export type ShippingNotificationRecord = {
  id: string;
  title: string;
  secondaryText: string;
  category: 'shipping' | 'finance' | 'operations' | 'customer';
  severity: ShippingNotificationSeverity;
  branch: string;
  timestamp: string;
  isRead: boolean;
  actionLabel: string;
  entityType: string;
  entityId: string;
  linkedEntity: {
    label: string;
    href: string;
  };
};

export type ShippingDeskTarget = {
  href: string;
  label: string;
};

export type ShippingTrackingAlert = {
  title: string;
  tone: 'critical' | 'warning' | 'info' | 'good';
  detail: string;
};

export type ShippingContainerMasterRecord = {
  containerNo: string;
  blNo: string;
  bookingNo: string;
  carrier: string;
  vesselName: string;
  voyageNo: string;
  currentStatus: string;
  currentLocation: string;
  eta: string;
  shipper: string;
  consignee: string;
  returnStatus: 'PENDING' | 'RETURNED' | 'OVERDUE';
  demurrageDays: number;
  penaltyAmount: number;
  updatedAt: string;
};

export function shippingStageLabel(stage?: string | null): string {
  const value = String(stage || '').trim().toLowerCase();
  if (value.includes('document validation')) return 'Document validation';
  if (value.includes('carrier schedule')) return 'Carrier schedule assignment';
  if (value.includes('shipping instruction')) return 'Shipping instruction';
  if (value.includes('bill of lading')) return 'Bill of lading';
  if (value.includes('manifest')) return 'Manifest preparation';
  if (value.includes('trade finance')) return 'Trade finance verification';
  if (value.includes('settlement')) return 'Settlement closure';
  if (value.includes('cargo release')) return 'Cargo release control';
  if (value.includes('shipping packet complete')) return 'Ready for corridor execution';
  if (value.includes('booking')) return 'Booking confirmed';
  return String(stage || '').trim() || 'In progress';
}

export function shippingNextActionLabel(action?: string | null): string {
  const value = String(action || '').trim().toLowerCase();
  if (value.includes('approve remaining shipping packet documents')) return 'Approve remaining shipping packet documents';
  if (value.includes('assign vessel') || value.includes('voyage')) return 'Assign vessel and voyage';
  if (value.includes('approve shipping instruction')) return 'Approve shipping instruction';
  if (value.includes('submit shipping instruction')) return 'Submit shipping instruction';
  if (value.includes('finalize house bl') || value.includes('master bl')) return 'Finalize House BL and Master BL';
  if (value.includes('generate voyage manifest')) return 'Generate voyage manifest';
  if (value.includes('verify lc') || value.includes('bank packet')) return 'Verify LC and bank packet';
  if (value.includes('record payments') || value.includes('close settlement')) return 'Record payments and close settlement';
  if (value.includes('release packet') || value.includes('authorize cargo release')) return 'Issue release packet and authorize cargo release';
  if (value.includes('proceed to corridor')) return 'Proceed to corridor execution';
  return String(action || '').trim() || 'Review shipping gate';
}

export function shippingCtaLabel(
  action:
    | 'submit_si'
    | 'approve_si'
    | 'assign_schedule'
    | 'assign_schedule_to_booking'
    | 'approve_bl'
    | 'finalize_bl'
    | 'generate_manifest'
    | 'verify_lc'
    | 'mark_lc_paid'
    | 'record_usd_payment'
    | 'record_etb_payment',
): string {
  if (action === 'submit_si') return 'Submit shipping instruction';
  if (action === 'approve_si') return 'Approve shipping instruction';
  if (action === 'approve_bl') return 'Approve Carrier BL and House BL draft';
  if (action === 'assign_schedule') return 'Assign first open schedule';
  if (action === 'assign_schedule_to_booking') return 'Assign to selected booking';
  if (action === 'finalize_bl') return 'Finalize House BL and Master BL';
  if (action === 'generate_manifest') return 'Generate voyage manifest';
  if (action === 'verify_lc') return 'Verify LC and bank packet';
  if (action === 'mark_lc_paid') return 'Mark LC paid';
  if (action === 'record_usd_payment') return 'Record USD payment';
  return 'Record ETB payment';
}

export function shippingDeskLink(stage?: string | null): ShippingDeskTarget {
  const value = String(stage || '').trim().toLowerCase();
  if (value.includes('document validation') || value.includes('shipping instruction')) {
    return { href: '/shipping/instructions', label: 'Open shipping instructions' };
  }
  if (value.includes('carrier schedule')) {
    return { href: '/shipping/carrier-schedules', label: 'Open carrier schedules' };
  }
  if (value.includes('bill of lading')) {
    return { href: '/shipping/bills-of-lading', label: 'Open bills of lading' };
  }
  if (value.includes('manifest')) {
    return { href: '/shipping/manifest', label: 'Open manifest' };
  }
  if (value.includes('trade finance') || value.includes('settlement')) {
    return { href: '/shipping/finance', label: 'Open shipping finance' };
  }
  if (value.includes('cargo release')) {
    return { href: '/shipping/finance', label: 'Open cargo release control' };
  }
  if (value.includes('shipping packet complete')) {
    return { href: '/operations/supplier-agent', label: 'Open China Port Agent Desk' };
  }
  return { href: '/shipping', label: 'Open shipping workspace' };
}

export function shippingTrackingLookupLabel(query?: string | null) {
  const value = (query || '').trim();
  if (!value) return 'Container / BL / Booking';
  if (/^[A-Z]{4}\d{7}$/i.test(value)) return 'Container number';
  if (value.toUpperCase().includes('BL')) return 'Bill of lading';
  if (value.toUpperCase().includes('BK-') || value.toUpperCase().includes('TRP-')) return 'Booking reference';
  return 'Tracking reference';
}

export type ShippingActionKey =
  | 'shipping_instruction_edit'
  | 'shipping_instruction_approve'
  | 'bill_of_lading_approve'
  | 'bill_of_lading_finalize'
  | 'manifest_generate'
  | 'letter_of_credit_verify'
  | 'letter_of_credit_pay'
  | 'carrier_schedule_assign'
  | 'tracking_assign_truck'
  | 'tracking_add_event'
  | 'tracking_resolve_incident'
  | 'after_sales_resolve'
  | 'after_sales_rate';

export type ShippingQuoteRecord = {
  quoteId: string;
  bookingId: string;
  customerName: string;
  routeSummary: string;
  quoteStatus: UnifiedBookingRequest['quoteStatus'];
  approvalStatus: UnifiedBookingRequest['approvalStatus'];
  validityDate: string;
  pricing: {
    seaFreightUSD: number;
    djiboutiClearanceUSD: number;
    inlandTransportETB: number;
    exchangeRate: number;
    totalUSD: number;
    totalETB: number;
  };
};

export type ShippingBookingRecord = {
  bookingId: string;
  quoteId: string;
  customerName: string;
  serviceType: string;
  incoterm: string;
  currentStage: string;
  responsibleDesk: string;
  nextAction: string;
  automationNote: string;
  carrierMode: string;
  routeSummary: string;
  bookingConfirmedAt: string;
};

export type ShippingValidationItem = {
  id: string;
  label: string;
  status: ShippingDocumentStatus;
  reason: string;
  updatedAt: string;
};

export type ShippingValidationRecord = {
  bookingId: string;
  quoteId: string;
  blocking: boolean;
  items: ShippingValidationItem[];
};

export type ShippingInvoiceCharge = {
  name: string;
  currency: 'USD' | 'ETB';
  amount: number;
};

export type ShippingInvoiceRecord = {
  invoiceId: string;
  bookingId: string;
  quoteId: string;
  customerName: string;
  paymentStatus: ShippingPaymentStatus;
  settlementStatus: ShippingSettlementStatus;
  charges: ShippingInvoiceCharge[];
  totalUSD: number;
  totalETB: number;
};

export type ShippingPaymentRecord = {
  paymentId: string;
  invoiceId: string;
  bookingId: string;
  customerName: string;
  amount: number;
  currency: 'USD' | 'ETB';
  status: ShippingPaymentStatus;
  recordedAt: string;
};

export type ShippingSettlementRecord = {
  bookingId: string;
  customerName: string;
  status: ShippingSettlementStatus;
  balanceUSD: number;
  balanceETB: number;
};

export type ShippingTradeDocumentCheck = {
  key: ShippingTradeDocumentKey;
  label: string;
  status: ShippingDocumentStatus;
  reason: string;
};

export type ShippingLetterOfCreditRecord = {
  bookingId: string;
  quoteId: string;
  customerName: string;
  lcNumber: string;
  bankName: string;
  issuingDate: string;
  expiryDate: string;
  currency: 'USD' | 'ETB';
  amount: number;
  status: ShippingLcStatus;
  documentChecks: ShippingTradeDocumentCheck[];
  verificationNote: string;
};

export type ShippingFinanceReleaseRecord = {
  bookingId: string;
  quoteId: string;
  customerName: string;
  bankBillReceivedAt: string;
  bankBillReference: string;
  customerBankSlipReceivedAt: string;
  customerBankSlipReference: string;
  cFeeInvoiceIssuedAt: string;
  cFeeInvoiceReference: string;
  portClearanceInvoiceIssuedAt: string;
  portClearanceInvoiceReference: string;
  transportInvoiceIssuedAt: string;
  transportInvoiceReference: string;
  customerReceiptsReceivedAt: string;
  customerReceiptReference: string;
  tikurFinanceReceiptIssuedAt: string;
  tikurFinanceReceiptReference: string;
  cargoReleaseAuthorizedAt: string;
  cargoReleaseReference: string;
  releaseSentToDryPortAt: string;
  customsDocumentsHandedOverAt: string;
  fullContainerInterchangeIssuedAt: string;
  emptyReturnInterchangeReceivedAt: string;
  releaseNote: string;
};

export type ShippingAfterSalesRecord = {
  bookingId: string;
  tripId: string;
  customerName: string;
  inlandNode: string;
  status: ShippingAfterSalesStatus;
  kind: ShippingAfterSalesKind;
  openedAt: string;
  resolvedAt: string;
  rating: number;
  summary: string;
  nextAction: string;
};

export type ShippingCarrierScheduleRecord = {
  scheduleId: string;
  carrierName: string;
  vesselName: string;
  voyageNumber: string;
  portOfLoading: string;
  portOfDischarge: string;
  etd: string;
  etaDjibouti: string;
  capacityTeu: number;
  bookedContainers: number;
  status: ShippingCarrierScheduleStatus;
};

export type ShippingCarrierAlertRecord = {
  id: string;
  scheduleId: string;
  title: string;
  description: string;
  tone: ShippingCarrierAlertTone;
  href: string;
};

export type ShippingInstructionRecord = {
  bookingId: string;
  quoteId: string;
  customerName: string;
  shipperName: string;
  consigneeName: string;
  notifyParty: string;
  cargoDescription: string;
  hsCode: string;
  containerNumber: string;
  sealNumber: string;
  packageSummary: string;
  grossWeight: string;
  measurementCbm: string;
  marksAndNumbers: string;
  portOfLoading: string;
  portOfDischarge: string;
  placeOfReceipt: string;
  placeOfDelivery: string;
  specialInstructions: string;
  incoterm: string;
  consigneeTinNumber: string;
  tinAreaCode: string;
  letterOfCreditNumber: string;
  hazardousCargo: boolean;
  unNumber: string;
  freightTerm: 'prepaid' | 'collect';
  status: ShippingInstructionStatus;
  submittedAt: string;
  approvedAt: string;
};

export type ShippingBillOfLadingRecord = {
  bookingId: string;
  quoteId: string;
  customerName: string;
  houseBlNumber: string;
  masterBlNumber: string;
  slotCarrierBillNumber: string;
  carrierName: string;
  vesselName: string;
  voyageNumber: string;
  shipperName: string;
  consigneeName: string;
  notifyParty: string;
  cargoDescription: string;
  hsCode: string;
  containerNumber: string;
  sealNumber: string;
  packageSummary: string;
  grossWeight: string;
  measurementCbm: string;
  marksAndNumbers: string;
  portOfLoading: string;
  portOfDischarge: string;
  placeOfReceipt: string;
  placeOfDelivery: string;
  placeOfIssue: string;
  shippedOnBoardDate: string;
  consigneeTinNumber: string;
  tinAreaCode: string;
  letterOfCreditNumber: string;
  numberOfOriginalBills: number;
  freightTerm: 'prepaid' | 'collect';
  status: ShippingBillOfLadingStatus;
  approvedAt: string;
  issueDate: string;
  blockedReason: string;
};

export type ShippingManifestRecord = {
  bookingId: string;
  quoteId: string;
  manifestId: string;
  vesselName: string;
  voyageNumber: string;
  portOfLoading: string;
  portOfDischarge: string;
  placeOfDelivery: string;
  sailingDate: string;
  slotCarrierWaybillNumber: string;
  shipperName: string;
  consigneeName: string;
  notifyParty: string;
  marksAndNumbers: string;
  containerNumber: string;
  sealNumber: string;
  packageSummary: string;
  goodsDescription: string;
  cbm: number;
  hsCode: string;
  tinNo: string;
  areaCode: string;
  cargoInTransitTo: string;
  totalContainers: number;
  totalWeight: number;
  status: ShippingManifestStatus;
  generatedAt: string;
  blockedReason: string;
};

export type ShippingFleetTruckRecord = {
  truckId: string;
  plateNumber: string;
  status: ShippingFleetStatus;
  driverName: string;
  driverPhone: string;
  currentLocation: string;
  assignedBookingId: string;
};

export type ShippingContainerEventRecord = {
  id: string;
  type: ShippingContainerEventType;
  location: string;
  note: string;
  timestamp: string;
  truckId: string;
  driverName: string;
};

export type ShippingContainerHandoffRecord = {
  id: string;
  fromTruckId: string;
  fromDriverName: string;
  toTruckId: string;
  toDriverName: string;
  location: string;
  timestamp: string;
};

export type ShippingContainerMovementRecord = {
  bookingId: string;
  quoteId: string;
  customerName: string;
  containerNumber: string;
  carrierName: string;
  bookingNumber: string;
  billOfLadingNumber: string;
  routeSummary: string;
  currentStatus: string;
  currentLocation: string;
  currentHolder: string;
  lifecycleStage: string;
  expectedReturnDate: string;
  actualReturnDate: string;
  returnDelayDays: number;
  demurragePenaltyAmount: number;
  assignedTruckId: string;
  assignedDriverName: string;
  assignedDriverPhone: string;
  currentLatitude: number;
  currentLongitude: number;
  events: ShippingContainerEventRecord[];
  handoffHistory: ShippingContainerHandoffRecord[];
};

export type ShippingIncidentRecord = {
  id: string;
  bookingId: string;
  containerNumber: string;
  customerName: string;
  title: string;
  description: string;
  severity: ShippingIncidentSeverity;
  status: 'open' | 'resolved';
  createdAt: string;
};

export type ShippingPhase1Workspace = {
  quotes: ShippingQuoteRecord[];
  bookings: ShippingBookingRecord[];
  validations: ShippingValidationRecord[];
  invoices: ShippingInvoiceRecord[];
  payments: ShippingPaymentRecord[];
  settlements: ShippingSettlementRecord[];
  lettersOfCredit: ShippingLetterOfCreditRecord[];
  financeReleaseControls: ShippingFinanceReleaseRecord[];
  afterSales: ShippingAfterSalesRecord[];
  carrierSchedules: ShippingCarrierScheduleRecord[];
  carrierAlerts: ShippingCarrierAlertRecord[];
  instructions: ShippingInstructionRecord[];
  billsOfLading: ShippingBillOfLadingRecord[];
  manifests: ShippingManifestRecord[];
  fleet: ShippingFleetTruckRecord[];
  containerMovements: ShippingContainerMovementRecord[];
  incidents: ShippingIncidentRecord[];
};

type ValidationOverrides = Record<string, ShippingValidationItem[]>;
type PaymentOverrides = Record<string, ShippingPaymentRecord[]>;
type ShippingLcOverrides = Record<string, ShippingLetterOfCreditRecord>;
type ShippingFinanceReleaseOverrides = Record<string, ShippingFinanceReleaseRecord>;
type ShippingInstructionOverrides = Record<string, ShippingInstructionRecord>;
type ShippingBillOverrides = Record<string, ShippingBillOfLadingRecord>;
type ShippingManifestOverrides = Record<string, ShippingManifestRecord>;
type ShippingFleetOverrides = Record<string, ShippingFleetTruckRecord>;
type ShippingContainerOverrides = Record<string, ShippingContainerMovementRecord>;
type ShippingIncidentOverrides = Record<string, ShippingIncidentRecord[]>;
type ShippingAfterSalesOverrides = Record<string, Partial<ShippingAfterSalesRecord>>;
type ShippingCarrierAssignmentOverrides = Record<string, string>;

const shippingValidationStorageKey = 'tikur-abay:shipping-phase1:validations';
const shippingPaymentsStorageKey = 'tikur-abay:shipping-phase1:payments';
const shippingLcStorageKey = 'tikur-abay:shipping-phase4:lcs';
const shippingFinanceReleaseStorageKey = 'tikur-abay:shipping-phase4:release-controls';
const shippingInstructionsStorageKey = 'tikur-abay:shipping-phase2:instructions';
const shippingBillsStorageKey = 'tikur-abay:shipping-phase2:bills';
const shippingManifestsStorageKey = 'tikur-abay:shipping-phase2:manifests';
const shippingFleetStorageKey = 'tikur-abay:shipping-phase3:fleet';
const shippingContainerStorageKey = 'tikur-abay:shipping-phase3:containers';
const shippingIncidentStorageKey = 'tikur-abay:shipping-phase3:incidents';
const yardPostDeliveryFollowUpStorageKey = 'tikur-abay:yard-post-delivery-follow-up';
const shippingAfterSalesStorageKey = 'tikur-abay:shipping-phase5:after-sales';
const shippingCarrierAssignmentStorageKey = 'tikur-abay:shipping-phase6:carrier-assignments';
const shippingNotificationReadStateStorageKey = 'tikur-abay:shipping-phase7:notification-read-state';
const supplierDeskStorageKey = 'tikur-abay:supplier-desk:manual-shipments';
export const shippingPhase1UpdatedEvent = 'tikur-abay:shipping-phase1:updated';

function safeDate(value?: string) {
  return value || new Date().toISOString();
}

function computeExchangeRate(request: UnifiedBookingRequest) {
  return request.quoteCurrency === 'ETB' ? 1 : 57;
}

function computePricing(request: UnifiedBookingRequest) {
  const pricing = request.pricingBreakdown;
  const seaFreightUSD = pricing ? pricing.baseFreight + pricing.originCharges : Math.round(request.quoteAmount * 0.62);
  const djiboutiClearanceUSD = pricing ? pricing.destinationCharges + pricing.customsEstimate : Math.round(request.quoteAmount * 0.22);
  const inlandTransportUsd = pricing ? pricing.inlandTransportEstimate : Math.round(request.quoteAmount * 0.11);
  const exchangeRate = computeExchangeRate(request);
  const inlandTransportETB = Math.round(inlandTransportUsd * exchangeRate);
  return {
    seaFreightUSD,
    djiboutiClearanceUSD,
    inlandTransportETB,
    exchangeRate,
    totalUSD: request.quoteAmount,
    totalETB: Math.round(request.quoteAmount * exchangeRate),
  };
}

function toQuoteRecord(request: UnifiedBookingRequest): ShippingQuoteRecord {
  return {
    quoteId: request.quoteId,
    bookingId: request.bookingId || '',
    customerName: request.customerName,
    routeSummary: `${request.portOfLoading} -> ${request.portOfDischarge} -> ${request.inlandDestination}`,
    quoteStatus: request.quoteStatus,
    approvalStatus: request.approvalStatus,
    validityDate: request.requestedArrivalWindow || request.earliestDepartureDate || request.updatedAt,
    pricing: computePricing(request),
  };
}

function defaultValidationItems(request: UnifiedBookingRequest): ShippingValidationItem[] {
  const timestamp = safeDate(request.updatedAt);
  const docsApproved = request.quoteStatus === 'assigned_to_origin' || request.quoteStatus === 'booking_created';
  const bookingReady = Boolean(request.bookingId);
  return [
    { id: `${request.quoteId}-invoice`, label: 'Commercial invoice', status: docsApproved ? 'approved' : 'pending', reason: docsApproved ? '' : 'Upload or validate invoice before clearance.', updatedAt: timestamp },
    { id: `${request.quoteId}-packing`, label: 'Packing list', status: docsApproved ? 'approved' : 'pending', reason: docsApproved ? '' : 'Packing list must be checked against cargo details.', updatedAt: timestamp },
    { id: `${request.quoteId}-si`, label: 'Shipping instruction', status: bookingReady ? 'corrected' : 'pending', reason: bookingReady ? 'Booking exists. Final SI review still required.' : 'SI starts only after booking confirmation.', updatedAt: timestamp },
    { id: `${request.quoteId}-bl`, label: 'BL draft', status: 'pending', reason: 'BL cannot be approved before SI approval.', updatedAt: timestamp },
    { id: `${request.quoteId}-manifest`, label: 'Cargo manifest', status: 'pending', reason: 'Manifest generates only from approved BL.', updatedAt: timestamp },
  ];
}

function toValidationRecord(
  request: UnifiedBookingRequest,
  overrides: ValidationOverrides,
  instruction?: ShippingInstructionRecord | null,
  bill?: ShippingBillOfLadingRecord | null,
  manifest?: ShippingManifestRecord | null,
): ShippingValidationRecord {
  const items = (overrides[request.bookingId || request.quoteId] || defaultValidationItems(request)).map((item) => {
    if (item.label === 'Shipping instruction' && instruction?.status === 'approved') {
      return { ...item, status: 'approved' as const, reason: '', updatedAt: instruction.approvedAt || item.updatedAt };
    }
    if (item.label === 'BL draft' && bill?.status === 'final') {
      return { ...item, status: 'approved' as const, reason: '', updatedAt: bill.issueDate || item.updatedAt };
    }
    if (item.label === 'Cargo manifest' && manifest?.status === 'generated') {
      return { ...item, status: 'approved' as const, reason: '', updatedAt: manifest.generatedAt || item.updatedAt };
    }
    return item;
  });
  return {
    bookingId: request.bookingId || '',
    quoteId: request.quoteId,
    blocking: items.some((item) => item.status !== 'approved'),
    items,
  };
}

function deriveBookingWorkflow(
  request: UnifiedBookingRequest,
  validation: ShippingValidationRecord | null,
  instruction: ShippingInstructionRecord | null,
  bill: ShippingBillOfLadingRecord | null,
  manifest: ShippingManifestRecord | null,
  lc: ShippingLetterOfCreditRecord | null,
  settlement: ShippingSettlementRecord | null,
  schedule: ShippingCarrierScheduleRecord | null,
  releaseControl: ShippingFinanceReleaseRecord | null,
) {
  if (validation?.blocking) {
    return {
      currentStage: 'Document validation',
      responsibleDesk: 'Commercial / origin validation',
      nextAction: 'Approve remaining shipping packet documents',
      automationNote: 'The booking stays in document validation until all required items are approved.',
    };
  }
  if (!schedule) {
    return {
      currentStage: 'Carrier schedule assignment',
      responsibleDesk: 'Carrier planning desk',
      nextAction: 'Assign vessel and voyage before BL lock',
      automationNote: 'Schedule assignment is the next gate after document validation clears.',
    };
  }
  if (!instruction || instruction.status !== 'approved') {
    return {
      currentStage: instruction?.status === 'submitted' ? 'Shipping instruction approval' : 'Shipping instruction prep',
      responsibleDesk: 'China Port Agent Desk',
      nextAction: instruction?.status === 'submitted' ? 'Approve shipping instruction' : 'Submit shipping instruction',
      automationNote: 'The booking auto-promotes to BL only after the shipping instruction is approved.',
    };
  }
  if (!bill || bill.status === 'draft') {
    return {
      currentStage: 'Bill of lading approval',
      responsibleDesk: 'Origin operations lead',
      nextAction: 'Approve Carrier BL and House BL draft',
      automationNote: 'Approved shipping instruction has cleared the BL draft gate. BL must be approved before final lock.',
    };
  }
  if (bill.status !== 'final') {
    return {
      currentStage: 'Bill of lading finalization',
      responsibleDesk: 'Origin operations lead',
      nextAction: 'Finalize House BL and Master BL',
      automationNote: 'Approved BL can now be finalized and locked for original printing.',
    };
  }
  if (!manifest || manifest.status !== 'generated') {
    return {
      currentStage: 'Manifest generation',
      responsibleDesk: 'Origin operations lead',
      nextAction: 'Generate voyage manifest',
      automationNote: 'Final BL is complete, so the booking is now waiting on manifest generation.',
    };
  }
  if (!lc || lc.status === 'pending') {
    return {
      currentStage: 'Trade finance verification',
      responsibleDesk: 'Finance / trade finance desk',
      nextAction: 'Verify LC and bank packet',
      automationNote: 'Shipping documents are complete. Finance verification is now the blocking gate.',
    };
  }
  if (lc.status === 'verified' || (lc.status !== 'paid' && settlement?.status === 'outstanding')) {
    return {
      currentStage: 'Settlement closure',
      responsibleDesk: 'Finance / trade finance desk',
      nextAction: 'Record payments and close settlement',
      automationNote: 'Verified LC automatically advances the booking into settlement closure.',
    };
  }
  if (!releaseControl?.cargoReleaseAuthorizedAt) {
    return {
      currentStage: 'Cargo release control',
      responsibleDesk: 'Finance / dry-port release desk',
      nextAction: 'Issue release packet and authorize cargo release',
      automationNote: 'Customer payment proof, Tikur Abay receipt, and dry-port release authorization are still required before cargo release.',
    };
  }
  return {
    currentStage: 'Shipping packet complete',
    responsibleDesk: 'Ready for downstream operations',
    nextAction: 'Proceed to corridor execution',
    automationNote: 'All shipping gates are satisfied. The file is ready for downstream execution.',
  };
}

function toBookingRecord(
  request: UnifiedBookingRequest,
  validation: ShippingValidationRecord | null,
  instruction: ShippingInstructionRecord | null,
  bill: ShippingBillOfLadingRecord | null,
  manifest: ShippingManifestRecord | null,
  lc: ShippingLetterOfCreditRecord | null,
  settlement: ShippingSettlementRecord | null,
  schedule: ShippingCarrierScheduleRecord | null,
  releaseControl: ShippingFinanceReleaseRecord | null,
): ShippingBookingRecord | null {
  if (!request.bookingId) return null;
  const workflow = deriveBookingWorkflow(request, validation, instruction, bill, manifest, lc, settlement, schedule, releaseControl);
  return {
    bookingId: request.bookingId,
    quoteId: request.quoteId,
    customerName: request.customerName,
    serviceType: request.serviceType,
    incoterm: request.incoterm,
    currentStage: workflow.currentStage,
    responsibleDesk: workflow.responsibleDesk,
    nextAction: workflow.nextAction,
    automationNote: workflow.automationNote,
    carrierMode: request.shipmentMode || request.serviceType,
    routeSummary: `${request.portOfLoading} -> ${request.inlandDestination}`,
    bookingConfirmedAt: request.acceptedAt || request.approvalRecordedAt || request.updatedAt,
  };
}

function toInvoiceRecord(request: UnifiedBookingRequest, payments: ShippingPaymentRecord[]): ShippingInvoiceRecord {
  const pricing = computePricing(request);
  const paidUsd = payments.filter((item) => item.currency === 'USD').reduce((sum, item) => sum + item.amount, 0);
  const paidEtb = payments.filter((item) => item.currency === 'ETB').reduce((sum, item) => sum + item.amount, 0);
  const fullyPaid = paidUsd >= pricing.totalUSD && paidEtb >= pricing.inlandTransportETB;
  const partiallyPaid = paidUsd > 0 || paidEtb > 0;
  return {
    invoiceId: `INV-${request.bookingId || request.quoteId}`,
    bookingId: request.bookingId || '',
    quoteId: request.quoteId,
    customerName: request.customerName,
    paymentStatus: fullyPaid ? 'paid' : partiallyPaid ? 'partial' : 'pending',
    settlementStatus: fullyPaid ? 'closed' : 'outstanding',
    charges: [
      { name: 'Sea freight', currency: 'USD', amount: pricing.seaFreightUSD },
      { name: 'Port clearance', currency: 'USD', amount: pricing.djiboutiClearanceUSD },
      { name: 'Inland transport', currency: 'ETB', amount: pricing.inlandTransportETB },
    ],
    totalUSD: pricing.totalUSD,
    totalETB: pricing.inlandTransportETB,
  };
}

function toSettlementRecord(invoice: ShippingInvoiceRecord, payments: ShippingPaymentRecord[]): ShippingSettlementRecord {
  const paidUsd = payments.filter((item) => item.currency === 'USD').reduce((sum, item) => sum + item.amount, 0);
  const paidEtb = payments.filter((item) => item.currency === 'ETB').reduce((sum, item) => sum + item.amount, 0);
  return {
    bookingId: invoice.bookingId,
    customerName: invoice.customerName,
    status: invoice.settlementStatus,
    balanceUSD: Math.max(invoice.totalUSD - paidUsd, 0),
    balanceETB: Math.max(invoice.totalETB - paidEtb, 0),
  };
}

function defaultTradeDocumentChecks(request: UnifiedBookingRequest): ShippingTradeDocumentCheck[] {
  const docsReady = Boolean(request.pricingBreakdown) || request.quoteStatus === 'booking_created' || request.quoteStatus === 'assigned_to_origin';
  const insuranceRequired = Boolean(request.pricingBreakdown?.insuranceEstimate && request.pricingBreakdown.insuranceEstimate > 0);
  return [
    {
      key: 'billOfLading',
      label: 'Bill of lading',
      status: request.bookingId ? 'corrected' : 'pending',
      reason: request.bookingId ? 'Booking exists. Final BL verification still pending.' : 'BL depends on booking confirmation.',
    },
    {
      key: 'commercialInvoice',
      label: 'Commercial invoice',
      status: docsReady ? 'approved' : 'pending',
      reason: docsReady ? 'Commercial invoice is present in the shipment file.' : 'Commercial invoice must be validated by finance.',
    },
    {
      key: 'packingList',
      label: 'Packing list',
      status: docsReady ? 'approved' : 'pending',
      reason: docsReady ? 'Packing list is present in the shipment file.' : 'Packing list must be validated by finance.',
    },
    {
      key: 'certificateOfOrigin',
      label: 'Certificate of origin',
      status: 'pending',
      reason: 'Origin certificate is still pending verification.',
    },
    {
      key: 'insuranceCertificate',
      label: 'Insurance certificate',
      status: insuranceRequired ? 'pending' : 'approved',
      reason: insuranceRequired ? 'Insurance certificate must be attached before bank verification.' : 'Insurance not required for this file.',
    },
    {
      key: 'lcDocument',
      label: 'LC document',
      status: request.bookingId ? 'corrected' : 'pending',
      reason: request.bookingId ? 'LC reference is ready for bank verification.' : 'LC starts only after booking confirmation.',
    },
  ];
}

function defaultLetterOfCredit(request: UnifiedBookingRequest, invoice?: ShippingInvoiceRecord): ShippingLetterOfCreditRecord {
  return {
    bookingId: request.bookingId || '',
    quoteId: request.quoteId,
    customerName: request.customerName,
    lcNumber: request.bookingId ? `LC-${request.bookingId.replace(/^BK-/, '')}` : '',
    bankName: request.customerName.toLowerCase().includes('alem') ? 'Commercial Bank of Ethiopia' : 'Dashen Bank',
    issuingDate: safeDate(request.acceptedAt || request.approvalRecordedAt || request.updatedAt),
    expiryDate: request.requestedArrivalWindow || request.updatedAt,
    currency: 'USD',
    amount: invoice?.totalUSD || request.quoteAmount,
    status: 'pending',
    documentChecks: defaultTradeDocumentChecks(request),
    verificationNote: 'Bank verification is waiting for all mandatory trade documents.',
  };
}

function defaultFinanceReleaseControl(
  request: UnifiedBookingRequest,
  invoice?: ShippingInvoiceRecord,
): ShippingFinanceReleaseRecord {
  const bookingId = request.bookingId || '';
  const bookingSuffix = bookingId.replace(/^BK-/, '');
  return {
    bookingId,
    quoteId: request.quoteId,
    customerName: request.customerName,
    bankBillReceivedAt: '',
    bankBillReference: bookingId ? `EBILL-${bookingSuffix}` : '',
    customerBankSlipReceivedAt: '',
    customerBankSlipReference: bookingId ? `BANKSLIP-${bookingSuffix}` : '',
    cFeeInvoiceIssuedAt: '',
    cFeeInvoiceReference: invoice ? `${invoice.invoiceId}-C-FEE` : '',
    portClearanceInvoiceIssuedAt: '',
    portClearanceInvoiceReference: invoice ? `${invoice.invoiceId}-PORT` : '',
    transportInvoiceIssuedAt: '',
    transportInvoiceReference: invoice ? `${invoice.invoiceId}-TRANSPORT` : '',
    customerReceiptsReceivedAt: '',
    customerReceiptReference: bookingId ? `PAYREC-${bookingSuffix}` : '',
    tikurFinanceReceiptIssuedAt: '',
    tikurFinanceReceiptReference: bookingId ? `TABREC-${bookingSuffix}` : '',
    cargoReleaseAuthorizedAt: '',
    cargoReleaseReference: bookingId ? `REL-${bookingSuffix}` : '',
    releaseSentToDryPortAt: '',
    customsDocumentsHandedOverAt: '',
    fullContainerInterchangeIssuedAt: '',
    emptyReturnInterchangeReceivedAt: '',
    releaseNote: 'Block cargo release until Ethiopian bank bill, customer payment receipts, and Tikur Abay finance receipt are all confirmed.',
  };
}

function defaultShippingInstruction(request: UnifiedBookingRequest): ShippingInstructionRecord {
  const bookingDigits = (request.bookingId || request.quoteId).replace(/\D/g, '').slice(-7).padStart(7, '0');
  return {
    bookingId: request.bookingId || '',
    quoteId: request.quoteId,
    customerName: request.customerName,
    shipperName: request.company,
    consigneeName: request.consigneeName || request.customerName,
    notifyParty: request.notifyPartyName || request.contactPerson || request.customerName,
    cargoDescription: request.cargoDescription,
    hsCode: request.hsCode || 'Pending',
    containerNumber: `MSCU${bookingDigits}`,
    sealNumber: `SL-${bookingDigits.slice(-6)}`,
    packageSummary: request.packageSummary || `${Math.max(request.containerCount, 1) * 20} PKG`,
    grossWeight: `${request.totalWeight.toLocaleString('en-US')} KG`,
    measurementCbm: `${request.cbm.toLocaleString('en-US')} CBM`,
    marksAndNumbers: request.marksAndNumbers || `${(request.customerName || 'TAB').replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase()}/${request.quoteId.slice(-4)}`,
    portOfLoading: request.portOfLoading,
    portOfDischarge: request.portOfDischarge,
    placeOfReceipt: request.placeOfReceipt || request.originCityOrPort || request.portOfLoading,
    placeOfDelivery: request.finalDeliveryLocation || request.inlandDestination,
    specialInstructions: request.remarks || request.specialHandlingNote || 'Handle as booked cargo under Tikur Abay shipping instruction.',
    incoterm: request.incoterm,
    consigneeTinNumber: request.consigneeTinNumber || '0012345678',
    tinAreaCode: request.tinAreaCode || 'AA',
    letterOfCreditNumber: request.lcNumber || request.bankPermitNumber || (request.bookingId ? `LC-${request.bookingId.replace(/^BK-/, '')}` : ''),
    hazardousCargo: Boolean(request.hazardousFlag),
    unNumber: request.unNumber || (request.hazardousFlag ? 'UN-CLASSIFY' : ''),
    freightTerm: request.freightPaymentTerm || (request.incoterm === 'FOB' ? 'collect' : 'prepaid'),
    status: request.bookingId ? 'submitted' : 'draft',
    submittedAt: request.bookingId ? safeDate(request.acceptedAt || request.approvalRecordedAt || request.updatedAt) : '',
    approvedAt: '',
  };
}

function defaultBillOfLading(request: UnifiedBookingRequest): ShippingBillOfLadingRecord {
  const instruction = defaultShippingInstruction(request);
  return {
    bookingId: request.bookingId || '',
    quoteId: request.quoteId,
    customerName: request.customerName,
    houseBlNumber: request.bookingId ? `HBL-${request.bookingId.replace(/^BK-/, '')}` : '',
    masterBlNumber: request.bookingId ? `MBL-${request.bookingId.replace(/^BK-/, '')}` : '',
    slotCarrierBillNumber: request.bookingId ? `SCB-${request.bookingId.replace(/^BK-/, '')}` : '',
    carrierName: request.shipmentMode === 'Ocean Freight' ? 'Tikur Abay nominated carrier' : 'Tikur Abay multimodal carrier',
    vesselName: request.vesselName || (request.portOfLoading ? `${request.portOfLoading} Service` : ''),
    voyageNumber: request.voyageNumber || (request.bookingId ? `VOY-${request.bookingId.replace(/^BK-/, '')}` : ''),
    shipperName: instruction.shipperName,
    consigneeName: instruction.consigneeName,
    notifyParty: instruction.notifyParty,
    cargoDescription: instruction.cargoDescription,
    hsCode: instruction.hsCode,
    containerNumber: instruction.containerNumber,
    sealNumber: instruction.sealNumber,
    packageSummary: instruction.packageSummary,
    grossWeight: instruction.grossWeight,
    measurementCbm: instruction.measurementCbm,
    marksAndNumbers: instruction.marksAndNumbers,
    portOfLoading: instruction.portOfLoading,
    portOfDischarge: instruction.portOfDischarge,
    placeOfReceipt: instruction.placeOfReceipt,
    placeOfDelivery: instruction.placeOfDelivery,
    placeOfIssue: 'Djibouti',
    shippedOnBoardDate: request.etaLoadingPort || request.earliestDepartureDate || '',
    consigneeTinNumber: instruction.consigneeTinNumber,
    tinAreaCode: instruction.tinAreaCode,
    letterOfCreditNumber: instruction.letterOfCreditNumber,
    numberOfOriginalBills: 3,
    freightTerm: request.incoterm === 'FOB' ? 'collect' : 'prepaid',
    status: 'draft',
    approvedAt: '',
    issueDate: '',
    blockedReason: request.bookingId ? 'BL depends on approved shipping instruction.' : 'Booking must exist before BL draft.',
  };
}

function defaultManifest(request: UnifiedBookingRequest): ShippingManifestRecord {
  const instruction = defaultShippingInstruction(request);
  return {
    bookingId: request.bookingId || '',
    quoteId: request.quoteId,
    manifestId: request.bookingId ? `MAN-${request.bookingId.replace(/^BK-/, '')}` : '',
    vesselName: request.portOfLoading ? `${request.portOfLoading} Service` : '',
    voyageNumber: request.bookingId ? `VOY-${request.bookingId.replace(/^BK-/, '')}` : '',
    portOfLoading: request.portOfLoading,
    portOfDischarge: request.portOfDischarge,
    placeOfDelivery: request.finalDeliveryLocation || request.inlandDestination,
    sailingDate: request.earliestDepartureDate || '',
    slotCarrierWaybillNumber: request.bookingId ? `SCW-${request.bookingId.replace(/^BK-/, '')}` : '',
    shipperName: instruction.shipperName,
    consigneeName: instruction.consigneeName,
    notifyParty: instruction.notifyParty,
    marksAndNumbers: instruction.marksAndNumbers,
    containerNumber: instruction.containerNumber,
    sealNumber: instruction.sealNumber,
    packageSummary: instruction.packageSummary,
    goodsDescription: instruction.cargoDescription,
    cbm: request.cbm,
    hsCode: instruction.hsCode,
    tinNo: instruction.consigneeTinNumber,
    areaCode: instruction.tinAreaCode,
    cargoInTransitTo: request.inlandDestination,
    totalContainers: request.containerCount,
    totalWeight: request.totalWeight,
    status: 'pending',
    generatedAt: '',
    blockedReason: request.bookingId ? 'Manifest generates only after final BL.' : 'Booking must exist before manifest generation.',
  };
}

function defaultCarrierSchedules(): ShippingCarrierScheduleRecord[] {
  return [
    {
      scheduleId: 'sched-msc-blue-nile-v001',
      carrierName: 'MSC',
      vesselName: 'MSC Blue Nile',
      voyageNumber: 'V001',
      portOfLoading: 'Shanghai',
      portOfDischarge: 'Djibouti',
      etd: '2026-04-06T10:00:00Z',
      etaDjibouti: '2026-04-18T16:00:00Z',
      capacityTeu: 180,
      bookedContainers: 42,
      status: 'open',
    },
    {
      scheduleId: 'sched-maersk-abyssinia-v118',
      carrierName: 'Maersk',
      vesselName: 'Maersk Abyssinia',
      voyageNumber: 'V118',
      portOfLoading: 'Shanghai',
      portOfDischarge: 'Djibouti',
      etd: '2026-04-09T15:00:00Z',
      etaDjibouti: '2026-04-21T08:00:00Z',
      capacityTeu: 160,
      bookedContainers: 133,
      status: 'closing_soon',
    },
    {
      scheduleId: 'sched-cma-adda-v204',
      carrierName: 'CMA CGM',
      vesselName: 'CMA Addis',
      voyageNumber: 'V204',
      portOfLoading: 'Ningbo',
      portOfDischarge: 'Djibouti',
      etd: '2026-04-11T06:00:00Z',
      etaDjibouti: '2026-04-23T12:00:00Z',
      capacityTeu: 150,
      bookedContainers: 97,
      status: 'open',
    },
    {
      scheduleId: 'sched-one-galafi-v009',
      carrierName: 'ONE',
      vesselName: 'ONE Galafi',
      voyageNumber: 'V009',
      portOfLoading: 'Shenzhen',
      portOfDischarge: 'Djibouti',
      etd: '2026-04-08T04:00:00Z',
      etaDjibouti: '2026-04-20T11:00:00Z',
      capacityTeu: 140,
      bookedContainers: 121,
      status: 'open',
    },
  ];
}

function deriveCarrierScheduleStatus(etd: string): ShippingCarrierScheduleStatus {
  const etdMs = new Date(etd).getTime();
  if (Number.isNaN(etdMs)) return 'open';
  const deltaHours = (etdMs - Date.now()) / 36e5;
  if (deltaHours <= 0) return 'departed';
  if (deltaHours <= 48) return 'closing_soon';
  return 'open';
}

function getAssignedCarrierSchedule(
  request: UnifiedBookingRequest,
  assignments: ShippingCarrierAssignmentOverrides,
  schedules: ShippingCarrierScheduleRecord[],
) {
  const explicit = request.bookingId ? assignments[request.bookingId] : '';
  if (explicit) return schedules.find((item) => item.scheduleId === explicit) || null;
  return schedules.find((item) => item.portOfLoading === request.portOfLoading && item.portOfDischarge === request.portOfDischarge) || schedules[0] || null;
}

function toCarrierSchedules(
  schedules: ShippingCarrierScheduleRecord[],
  assignments: ShippingCarrierAssignmentOverrides,
): ShippingCarrierScheduleRecord[] {
  const counts = Object.values(assignments).reduce<Record<string, number>>((acc, scheduleId) => {
    acc[scheduleId] = (acc[scheduleId] || 0) + 1;
    return acc;
  }, {});
  return schedules.map((schedule) => ({
    ...schedule,
    bookedContainers: counts[schedule.scheduleId] ?? schedule.bookedContainers,
    status: deriveCarrierScheduleStatus(schedule.etd),
  }));
}

function toCarrierAlerts(schedules: ShippingCarrierScheduleRecord[]): ShippingCarrierAlertRecord[] {
  return schedules.flatMap<ShippingCarrierAlertRecord>((schedule) => {
    const utilization = schedule.capacityTeu ? schedule.bookedContainers / schedule.capacityTeu : 0;
    if (schedule.status === 'closing_soon') {
      return [{
        id: `carrier-alert-${schedule.scheduleId}`,
        scheduleId: schedule.scheduleId,
        title: `${schedule.vesselName} cutoff approaching`,
        description: `${schedule.carrierName} ${schedule.voyageNumber} departs ${safeDate(schedule.etd)} and should be locked for BL preparation now.`,
        tone: utilization >= 0.9 ? ('critical' as const) : ('warning' as const),
        href: '/shipping/carrier-schedules',
      }];
    }
    if (schedule.status === 'departed') {
      return [{
        id: `carrier-alert-${schedule.scheduleId}`,
        scheduleId: schedule.scheduleId,
        title: `${schedule.vesselName} departed`,
        description: `${schedule.carrierName} ${schedule.voyageNumber} has passed ETD. Unassigned bookings should move to the next sailing.`,
        tone: 'info' as const,
        href: '/shipping/carrier-schedules',
      }];
    }
    return [];
  });
}

function defaultFleetPool(): ShippingFleetTruckRecord[] {
  return [
    { truckId: 'TRK-001', plateNumber: 'ET-3-AA-4421', status: 'available', driverName: 'Abel Hailu', driverPhone: '+251900000015', currentLocation: 'Djibouti staging yard', assignedBookingId: '' },
    { truckId: 'TRK-002', plateNumber: 'ET-3-AA-4422', status: 'busy', driverName: 'Samuel Isayas', driverPhone: '+251900000015', currentLocation: 'Galafi corridor', assignedBookingId: 'BK-260326-008' },
    { truckId: 'TRK-003', plateNumber: 'ET-3-AA-4423', status: 'maintenance', driverName: 'Mekonnen Tadesse', driverPhone: '+251900000015', currentLocation: 'Adama workshop', assignedBookingId: '' },
    { truckId: 'TRK-004', plateNumber: 'ET-3-AA-4424', status: 'available', driverName: 'Hassen Nur', driverPhone: '+251900000015', currentLocation: 'Djibouti release yard', assignedBookingId: '' },
  ];
}

function generatedContainerNumber(request: UnifiedBookingRequest) {
  const digits = (request.bookingId || request.quoteId).replace(/\D/g, '').slice(-7).padStart(7, '0');
  return `MSCU${digits}`;
}

function normalizeContainerNumber(value: string | undefined) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function readSupplierDeskShipment(bookingId: string | undefined) {
  if (!bookingId) return null;
  const shipments = readStoredJson<SupplierDeskShipment[]>(supplierDeskStorageKey, []);
  return shipments.find((shipment) => shipment.bookingNumber === bookingId) || null;
}

function mergeInstructionWithSupplierShipment(
  instruction: ShippingInstructionRecord,
  request: UnifiedBookingRequest,
  shipment: SupplierDeskShipment | null,
): ShippingInstructionRecord {
  if (!shipment) return instruction;
  const firstCargo = shipment.cargoItems[0];
  const cargoDescription = shipment.cargoItems
    .map((item) => String(item.description || '').trim())
    .filter(Boolean)
    .join(', ');
  const totalGrossWeight = shipment.cargoItems.reduce((sum, item) => sum + (item.grossWeightKg || 0), 0);
  const totalCbm = shipment.cargoItems.reduce((sum, item) => sum + (item.cbm || 0), 0);
  const containerNumber = normalizeContainerNumber(shipment.container.containerNumber);
  const sealNumber = String(shipment.container.sealNumber || '').trim();

  return {
    ...instruction,
    shipperName: shipment.supplierName || instruction.shipperName,
    consigneeName: request.consigneeName || instruction.consigneeName,
    notifyParty: shipment.tradeReferences?.notifyPartyName || instruction.notifyParty,
    cargoDescription: cargoDescription || instruction.cargoDescription,
    hsCode: firstCargo?.hsCode || instruction.hsCode,
    containerNumber: containerNumber || instruction.containerNumber,
    sealNumber: sealNumber || instruction.sealNumber,
    packageSummary: shipment.tradeReferences?.packageSummary || instruction.packageSummary,
    grossWeight: totalGrossWeight > 0 ? `${totalGrossWeight.toLocaleString('en-US')} KG` : instruction.grossWeight,
    measurementCbm: totalCbm > 0 ? `${totalCbm.toLocaleString('en-US')} CBM` : instruction.measurementCbm,
    marksAndNumbers: shipment.tradeReferences?.marksAndNumbers || firstCargo?.marksNumbers || instruction.marksAndNumbers,
    portOfLoading: shipment.originPort || instruction.portOfLoading,
    portOfDischarge: shipment.dischargePort || instruction.portOfDischarge,
    placeOfReceipt: shipment.placeOfReceipt || instruction.placeOfReceipt,
    placeOfDelivery: shipment.finalDestination || instruction.placeOfDelivery,
    consigneeTinNumber: shipment.tradeReferences?.consigneeTinNumber || instruction.consigneeTinNumber,
    tinAreaCode: shipment.tradeReferences?.tinAreaCode || instruction.tinAreaCode,
    letterOfCreditNumber: shipment.tradeReferences?.lcNumber || instruction.letterOfCreditNumber,
    freightTerm: shipment.freightPaymentTerm || instruction.freightTerm,
  };
}

function mergeBillWithSupplierShipment(
  bill: ShippingBillOfLadingRecord,
  shipment: SupplierDeskShipment | null,
): ShippingBillOfLadingRecord {
  if (!shipment) return bill;
  const finalBl = shipment.documents.find((document) => document.type === 'Final BL');
  const containerNumber = normalizeContainerNumber(shipment.container.containerNumber);
  const finalBlReference =
    finalBl?.referenceNumber &&
    finalBl.referenceNumber !== '-' &&
    !/\.[a-z0-9]{2,8}$/i.test(finalBl.referenceNumber)
      ? finalBl.referenceNumber
      : '';

  return {
    ...bill,
    carrierName: shipment.handoff.carrier || bill.carrierName,
    vesselName: shipment.handoff.vesselName || bill.vesselName,
    voyageNumber: shipment.handoff.voyageNumber || bill.voyageNumber,
    houseBlNumber: shipment.handoff.houseBlNumber || finalBlReference || bill.houseBlNumber,
    slotCarrierBillNumber: shipment.handoff.carrierBlNumber || bill.slotCarrierBillNumber,
    containerNumber: containerNumber || bill.containerNumber,
    sealNumber: String(shipment.container.sealNumber || '').trim() || bill.sealNumber,
    portOfLoading: shipment.originPort || bill.portOfLoading,
    portOfDischarge: shipment.dischargePort || bill.portOfDischarge,
    placeOfReceipt: shipment.placeOfReceipt || bill.placeOfReceipt,
    placeOfDelivery: shipment.finalDestination || bill.placeOfDelivery,
  };
}

function defaultContainerMovement(request: UnifiedBookingRequest): ShippingContainerMovementRecord {
  const timestamp = safeDate(request.acceptedAt || request.approvalRecordedAt || request.updatedAt);
  const returnDate = request.requestedArrivalWindow || '';
  return {
    bookingId: request.bookingId || '',
    quoteId: request.quoteId,
    customerName: request.customerName,
    containerNumber: generatedContainerNumber(request),
    carrierName: request.vesselName || 'Tikur Abay nominated carrier',
    bookingNumber: request.bookingId || '',
    billOfLadingNumber: request.bookingId ? `HBL-${request.bookingId.replace(/^BK-/, '')}` : '',
    routeSummary: `${request.portOfDischarge} -> ${request.inlandDestination}`,
    currentStatus: 'Booked',
    currentLocation: request.portOfLoading,
    currentHolder: 'Origin shipping desk',
    lifecycleStage: 'Booking confirmed',
    expectedReturnDate: returnDate,
    actualReturnDate: '',
    returnDelayDays: 0,
    demurragePenaltyAmount: 0,
    assignedTruckId: '',
    assignedDriverName: '',
    assignedDriverPhone: '',
    currentLatitude: 31.2156,
    currentLongitude: 121.491,
    events: [
      {
        id: `${request.bookingId}-evt-1`,
        type: 'BOOKED',
        location: request.portOfLoading,
        note: 'Container registered into shipping movement control.',
        timestamp,
        truckId: '',
        driverName: '',
      },
    ],
    handoffHistory: [],
  };
}

function toInstructionRecord(request: UnifiedBookingRequest, overrides: ShippingInstructionOverrides): ShippingInstructionRecord | null {
  if (!request.bookingId) return null;
  return mergeInstructionWithSupplierShipment(
    overrides[request.bookingId] || defaultShippingInstruction(request),
    request,
    readSupplierDeskShipment(request.bookingId),
  );
}

function deriveLcDocumentChecks(
  request: UnifiedBookingRequest,
  baseChecks: ShippingTradeDocumentCheck[],
  bill?: ShippingBillOfLadingRecord | null,
  instruction?: ShippingInstructionRecord | null,
  manifest?: ShippingManifestRecord | null,
): ShippingTradeDocumentCheck[] {
  const originPacketReady = Boolean(
    instruction ||
    manifest ||
    request.bookingStatus === 'in_origin' ||
    request.bookingStatus === 'assigned_to_origin' ||
    request.quoteStatus === 'assigned_to_origin',
  );
  const billFinal = bill?.status === 'final';
  const lcReferenceReady = Boolean(request.lcNumber || instruction?.letterOfCreditNumber || bill?.letterOfCreditNumber);
  const certificateReady = request.shippingCertificateRequired === false || originPacketReady;
  const insuranceRequired = Boolean(request.pricingBreakdown?.insuranceEstimate && request.pricingBreakdown.insuranceEstimate > 0);
  const insuranceReady = !insuranceRequired || request.incoterm.toUpperCase() === 'CIF' || originPacketReady;

  return baseChecks.map((check) => {
    if (check.status === 'invalid') return check;

    if (check.key === 'billOfLading') {
      return billFinal
        ? { ...check, status: 'approved', reason: 'Final BL is completed and verified in shipping documents.' }
        : {
            ...check,
            status: check.status === 'pending' ? 'corrected' : check.status,
            reason: check.reason || 'BL reference exists and is waiting for final bank review.',
          };
    }

    if (check.key === 'commercialInvoice') {
      return originPacketReady
        ? { ...check, status: 'approved', reason: 'Commercial invoice is present in the origin shipment packet.' }
        : check;
    }

    if (check.key === 'packingList') {
      return originPacketReady
        ? { ...check, status: 'approved', reason: 'Packing list is present in the origin shipment packet.' }
        : check;
    }

    if (check.key === 'certificateOfOrigin') {
      return certificateReady
        ? {
            ...check,
            status: 'approved',
            reason: request.shippingCertificateRequired === false
              ? 'Certificate of origin is not required for this file.'
              : 'Origin certificate is included in the shipment packet.',
          }
        : check;
    }

    if (check.key === 'insuranceCertificate') {
      return insuranceReady
        ? {
            ...check,
            status: 'approved',
            reason: insuranceRequired
              ? 'Insurance evidence is satisfied in the shipment trade packet.'
              : 'Insurance not required for this file.',
          }
        : check;
    }

    if (check.key === 'lcDocument') {
      return lcReferenceReady
        ? { ...check, status: 'approved', reason: 'LC reference is attached and ready for bank verification.' }
        : check;
    }

    return check;
  });
}

function toLetterOfCreditRecord(
  request: UnifiedBookingRequest,
  overrides: ShippingLcOverrides,
  instruction?: ShippingInstructionRecord | null,
  bill?: ShippingBillOfLadingRecord | null,
  manifest?: ShippingManifestRecord | null,
  invoice?: ShippingInvoiceRecord | null,
): ShippingLetterOfCreditRecord | null {
  if (!request.bookingId) return null;
  const base = overrides[request.bookingId] || defaultLetterOfCredit(request, invoice || undefined);
  const documentChecks = deriveLcDocumentChecks(request, base.documentChecks, bill, instruction, manifest);
  const verified = documentChecks.every((check) => check.status === 'approved');
  return {
    ...base,
    amount: invoice?.totalUSD || base.amount,
    status: base.status === 'paid' ? 'paid' : verified ? 'verified' : 'pending',
    documentChecks,
    verificationNote:
      base.status === 'paid'
        ? 'Trade finance packet is paid and closed.'
        : verified
          ? 'All mandatory trade documents are verified with the issuing bank.'
          : base.verificationNote,
  };
}

function toFinanceReleaseRecord(
  request: UnifiedBookingRequest,
  overrides: ShippingFinanceReleaseOverrides,
  invoice?: ShippingInvoiceRecord | null,
): ShippingFinanceReleaseRecord | null {
  if (!request.bookingId) return null;
  return overrides[request.bookingId] || defaultFinanceReleaseControl(request, invoice || undefined);
}

function toBillOfLadingRecord(
  request: UnifiedBookingRequest,
  overrides: ShippingBillOverrides,
  instruction?: ShippingInstructionRecord | null,
  schedule?: ShippingCarrierScheduleRecord | null,
): ShippingBillOfLadingRecord | null {
  if (!request.bookingId) return null;
  const base = overrides[request.bookingId] || defaultBillOfLading(request);
  const blockedReason =
    instruction?.status === 'approved' ? '' : 'BL depends on approved shipping instruction.';
  return mergeBillWithSupplierShipment({
    ...base,
    carrierName: base.carrierName || schedule?.carrierName || defaultBillOfLading(request).carrierName,
    vesselName: base.vesselName || schedule?.vesselName || defaultBillOfLading(request).vesselName,
    voyageNumber: base.voyageNumber || schedule?.voyageNumber || defaultBillOfLading(request).voyageNumber,
    shipperName: instruction?.shipperName || base.shipperName,
    consigneeName: instruction?.consigneeName || base.consigneeName,
    notifyParty: instruction?.notifyParty || base.notifyParty,
    cargoDescription: instruction?.cargoDescription || base.cargoDescription,
    hsCode: instruction?.hsCode || base.hsCode,
    containerNumber: instruction?.containerNumber || base.containerNumber,
    sealNumber: instruction?.sealNumber || base.sealNumber,
    packageSummary: instruction?.packageSummary || base.packageSummary,
    grossWeight: instruction?.grossWeight || base.grossWeight,
    measurementCbm: instruction?.measurementCbm || base.measurementCbm,
    marksAndNumbers: instruction?.marksAndNumbers || base.marksAndNumbers,
    portOfLoading: instruction?.portOfLoading || base.portOfLoading,
    portOfDischarge: instruction?.portOfDischarge || base.portOfDischarge,
    placeOfReceipt: instruction?.placeOfReceipt || base.placeOfReceipt,
    placeOfDelivery: instruction?.placeOfDelivery || base.placeOfDelivery,
    consigneeTinNumber: instruction?.consigneeTinNumber || base.consigneeTinNumber,
    tinAreaCode: instruction?.tinAreaCode || base.tinAreaCode,
    letterOfCreditNumber: instruction?.letterOfCreditNumber || base.letterOfCreditNumber,
    freightTerm: instruction?.freightTerm || base.freightTerm,
    blockedReason,
    status: blockedReason ? 'draft' : base.status,
    approvedAt: blockedReason ? '' : base.approvedAt,
    issueDate: blockedReason ? '' : base.issueDate,
  }, readSupplierDeskShipment(request.bookingId));
}

function toManifestRecord(
  request: UnifiedBookingRequest,
  overrides: ShippingManifestOverrides,
  bill?: ShippingBillOfLadingRecord | null,
  schedule?: ShippingCarrierScheduleRecord | null,
): ShippingManifestRecord | null {
  if (!request.bookingId) return null;
  const base = overrides[request.bookingId] || defaultManifest(request);
  const blockedReason = bill?.status === 'final' ? '' : 'Manifest generates only after final BL.';
  return {
    ...base,
    vesselName: base.vesselName || schedule?.vesselName || defaultManifest(request).vesselName,
    voyageNumber: base.voyageNumber || schedule?.voyageNumber || defaultManifest(request).voyageNumber,
    portOfLoading: bill?.portOfLoading || base.portOfLoading,
    portOfDischarge: bill?.portOfDischarge || base.portOfDischarge,
    placeOfDelivery: bill?.placeOfDelivery || base.placeOfDelivery,
    sailingDate: schedule?.etd || base.sailingDate,
    slotCarrierWaybillNumber: bill?.slotCarrierBillNumber || base.slotCarrierWaybillNumber,
    shipperName: bill?.shipperName || base.shipperName,
    consigneeName: bill?.consigneeName || base.consigneeName,
    notifyParty: bill?.notifyParty || base.notifyParty,
    marksAndNumbers: bill?.marksAndNumbers || base.marksAndNumbers,
    containerNumber: bill?.containerNumber || base.containerNumber,
    sealNumber: bill?.sealNumber || base.sealNumber,
    packageSummary: bill?.packageSummary || base.packageSummary,
    goodsDescription: bill?.cargoDescription || base.goodsDescription,
    hsCode: bill?.hsCode || base.hsCode,
    tinNo: bill?.consigneeTinNumber || base.tinNo,
    areaCode: bill?.tinAreaCode || base.areaCode,
    cargoInTransitTo: bill?.placeOfDelivery || base.cargoInTransitTo,
    blockedReason,
    status: blockedReason && base.status === 'generated' ? 'pending' : base.status,
    generatedAt: blockedReason ? '' : base.generatedAt,
  };
}

function toFleetRecords(overrides: ShippingFleetOverrides): ShippingFleetTruckRecord[] {
  const defaults = defaultFleetPool();
  return defaults.map((truck) => overrides[truck.truckId] || truck);
}

function toContainerMovementRecord(
  request: UnifiedBookingRequest,
  overrides: ShippingContainerOverrides,
  bills: ShippingBillOfLadingRecord[],
): ShippingContainerMovementRecord | null {
  if (!request.bookingId) return null;
  const bill = bills.find((item) => item.bookingId === request.bookingId);
  const defaultBase = defaultContainerMovement(request);
  const base = overrides[request.bookingId] || defaultBase;
  const supplierShipment = readSupplierDeskShipment(request.bookingId);
  const supplierContainerNumber = normalizeContainerNumber(supplierShipment?.container.containerNumber);
  const canonicalContainerNumber = supplierContainerNumber || bill?.containerNumber || generatedContainerNumber(request);
  const baseMatchesCanonical =
    !canonicalContainerNumber ||
    !base.containerNumber ||
    normalizeContainerNumber(base.containerNumber) === normalizeContainerNumber(canonicalContainerNumber);
  const movementBase = baseMatchesCanonical ? base : defaultBase;
  return {
    ...movementBase,
    routeSummary: `${request.portOfDischarge} -> ${request.inlandDestination}`,
    containerNumber: canonicalContainerNumber,
    carrierName: supplierShipment?.handoff.carrier || bill?.carrierName || movementBase.carrierName || request.vesselName || 'Tikur Abay nominated carrier',
    bookingNumber: request.bookingId || movementBase.bookingNumber,
    billOfLadingNumber: bill?.houseBlNumber || movementBase.billOfLadingNumber || (request.bookingId ? `HBL-${request.bookingId.replace(/^BK-/, '')}` : ''),
    currentStatus: movementBase.currentStatus,
    currentLocation: movementBase.currentLocation || supplierShipment?.originPort || request.portOfLoading,
    currentHolder: movementBase.currentHolder || 'Origin shipping desk',
    lifecycleStage: movementBase.lifecycleStage || 'Booking confirmed',
    expectedReturnDate: movementBase.expectedReturnDate || request.requestedArrivalWindow || '',
    actualReturnDate: movementBase.actualReturnDate || '',
    returnDelayDays: movementBase.returnDelayDays || 0,
    demurragePenaltyAmount: movementBase.demurragePenaltyAmount || 0,
    assignedDriverName: movementBase.assignedDriverName,
    assignedDriverPhone: movementBase.assignedDriverPhone,
    currentLatitude: movementBase.currentLatitude,
    currentLongitude: movementBase.currentLongitude,
    events: movementBase.events,
    handoffHistory: movementBase.handoffHistory || [],
    quoteId: request.quoteId,
    customerName: bill?.customerName || request.customerName,
  };
}

function corridorLocationPoint(location: string) {
  const value = location.toLowerCase();
  if (value.includes('shanghai')) return { lat: 31.2156, lng: 121.491 };
  if (value.includes('galafi')) return { lat: 11.716, lng: 41.84 };
  if (value.includes('djibouti')) return { lat: 11.595, lng: 43.148 };
  if (value.includes('combolcha')) return { lat: 11.082, lng: 39.738 };
  if (value.includes('adama') || value.includes('modjo')) return { lat: 8.54, lng: 39.27 };
  return { lat: 10.902, lng: 41.899 };
}

function prependSyntheticEvent(
  movement: ShippingContainerMovementRecord,
  type: ShippingContainerEventType,
  location: string,
  note: string,
  timestamp: string,
  driverName = movement.assignedDriverName,
): ShippingContainerEventRecord[] {
  const existing = movement.events[0];
  if (existing && existing.type === type && existing.location === location) {
    return movement.events;
  }
  return [
    {
      id: `${movement.bookingId}-evt-${type}-${timestamp}`,
      type,
      location,
      note,
      timestamp,
      truckId: movement.assignedTruckId,
      driverName,
    },
    ...movement.events,
  ];
}

function withManualCorridorOverlay(movement: ShippingContainerMovementRecord): ShippingContainerMovementRecord {
  const yard = mergeYardRecords([]).find((record) => record.bookingNumber === movement.bookingId);
  if (yard) {
    const inlandLocation = yard.inlandNode || movement.currentLocation;
    const locationPoint = corridorLocationPoint(inlandLocation);
    if (yard.emptyReturn.emptyReturned || yard.emptyReturn.status === 'Cycle closed' || yard.yardStage === 'Cycle closed') {
      const actualReturnDate = yard.emptyReturn.returnTimestamp || yard.lastUpdated || movement.actualReturnDate || new Date().toISOString();
      const expectedReturnTime = movement.expectedReturnDate ? new Date(movement.expectedReturnDate).getTime() : NaN;
      const actualReturnTime = new Date(actualReturnDate).getTime();
      const returnDelayDays =
        !Number.isNaN(expectedReturnTime) && !Number.isNaN(actualReturnTime)
          ? Math.max(Math.ceil((actualReturnTime - expectedReturnTime) / 86400000), 0)
          : movement.returnDelayDays || 0;
      return {
        ...movement,
        currentStatus: 'Empty returned',
        currentLocation: yard.emptyReturn.designatedDepot || 'Djibouti Empty Depot',
        currentHolder: yard.emptyReturn.returnOwner || 'Yard control',
        lifecycleStage: 'Empty return complete',
        actualReturnDate,
        returnDelayDays,
        demurragePenaltyAmount: returnDelayDays * 45,
        currentLatitude: corridorLocationPoint(yard.emptyReturn.designatedDepot || 'Djibouti Empty Depot').lat,
        currentLongitude: corridorLocationPoint(yard.emptyReturn.designatedDepot || 'Djibouti Empty Depot').lng,
        events: prependSyntheticEvent(
          movement,
          'EMPTY_RETURNED',
          yard.emptyReturn.designatedDepot || 'Djibouti Empty Depot',
          'Yard confirmed empty return and closed the shipment cycle.',
          actualReturnDate,
        ),
      };
    }
    if (yard.arrivalControl.actualArrivalTime || yard.arrivalControl.gateInConfirmed || yard.unloadStatus.unloadCompleted) {
      const arrivedAt = yard.arrivalControl.actualArrivalTime || yard.lastUpdated || new Date().toISOString();
      return {
        ...movement,
        currentStatus: 'Arrived inland',
        currentLocation: inlandLocation,
        currentHolder:
          yard.consigneeHandoff.handoffStatus === 'Completed'
            ? yard.consigneeName || 'Consignee'
            : yard.assignedYardAgent || 'Dry port yard',
        lifecycleStage:
          yard.consigneeHandoff.handoffStatus === 'Completed'
            ? 'Customer handoff complete'
            : yard.unloadStatus.unloadCompleted
              ? 'Delivered inland'
              : 'Arrived inland',
        currentLatitude: locationPoint.lat,
        currentLongitude: locationPoint.lng,
        events: prependSyntheticEvent(
          movement,
          'ARRIVED',
          inlandLocation,
          'Yard recorded inland arrival and gate-in progression.',
          arrivedAt,
        ),
      };
    }
  }

  const dispatch = readManualDispatchTrips().find((record) => record.bookingNumber === movement.bookingId);
  if (dispatch) {
    const dispatchLocation = dispatch.liveMovement.currentLocation || dispatch.originHandoffPoint || movement.currentLocation;
    const locationPoint = corridorLocationPoint(dispatchLocation);
    const dispatchDriver = dispatch.assignedDriver === 'Not assigned' || dispatch.assignedDriver === 'Pending driver' ? '' : dispatch.assignedDriver;
    const dispatchTruck = dispatch.assignedTruck === 'Not assigned' ? '' : dispatch.assignedTruck;
    if (dispatch.currentTripStatus === 'Arrived inland' || dispatch.currentTripStatus === 'Awaiting unload handoff') {
      const arrivedAt =
        dispatch.checkpoints.find((event) => event.location === dispatch.inlandDestination)?.timestamp ||
        dispatch.lastUpdated ||
        new Date().toISOString();
      return {
        ...movement,
        assignedTruckId: dispatchTruck || movement.assignedTruckId,
        assignedDriverName: dispatchDriver || movement.assignedDriverName,
        currentStatus: 'Arrived inland',
        currentLocation: dispatch.inlandDestination,
        currentHolder: dispatchDriver || 'Yard handoff',
        lifecycleStage: 'Delivered inland',
        currentLatitude: corridorLocationPoint(dispatch.inlandDestination).lat,
        currentLongitude: corridorLocationPoint(dispatch.inlandDestination).lng,
        events: prependSyntheticEvent(
          movement,
          'ARRIVED',
          dispatch.inlandDestination,
          'Dispatch completed inland movement and handed over at destination.',
          arrivedAt,
          dispatchDriver || movement.assignedDriverName,
        ),
      };
    }
    if (['In transit', 'Checkpoint hold', 'Delayed'].includes(dispatch.currentTripStatus)) {
      return {
        ...movement,
        assignedTruckId: dispatchTruck || movement.assignedTruckId,
        assignedDriverName: dispatchDriver || movement.assignedDriverName,
        currentStatus: dispatch.currentTripStatus,
        currentLocation: dispatchLocation,
        currentHolder: dispatchDriver || 'Transit driver',
        lifecycleStage: 'In transit',
        currentLatitude: locationPoint.lat,
        currentLongitude: locationPoint.lng,
        events: prependSyntheticEvent(
          movement,
          'IN_TRANSIT',
          dispatchLocation,
          'Dispatch recorded live inland corridor movement.',
          dispatch.lastGpsTimestamp || dispatch.lastUpdated || new Date().toISOString(),
          dispatchDriver || movement.assignedDriverName,
        ),
      };
    }
    return {
      ...movement,
      assignedTruckId: dispatchTruck || movement.assignedTruckId,
      assignedDriverName: dispatchDriver || movement.assignedDriverName,
      currentStatus: 'Truck assigned',
      currentLocation: dispatch.originHandoffPoint || dispatchLocation,
      currentHolder: dispatchDriver || 'Dispatch control',
      lifecycleStage: 'Truck assigned',
      currentLatitude: corridorLocationPoint(dispatch.originHandoffPoint || dispatchLocation).lat,
      currentLongitude: corridorLocationPoint(dispatch.originHandoffPoint || dispatchLocation).lng,
      events: prependSyntheticEvent(
        movement,
        'TRUCK_ASSIGNED',
        dispatch.originHandoffPoint || dispatchLocation,
        'Dispatch assigned truck and driver for inland movement.',
        dispatch.lastUpdated || new Date().toISOString(),
        dispatchDriver || movement.assignedDriverName,
      ),
    };
  }

  const release = readManualDjiboutiReleaseRecords().find((record) => record.bookingNumber === movement.bookingId);
  if (release) {
    const releaseLocation = release.dischargePort || 'Djibouti Port';
    const locationPoint = corridorLocationPoint(releaseLocation);
    if (release.customsTransit.customsCleared || release.gateOutReady || release.releaseStatus === 'Gate-out ready' || release.releaseStatus === 'Handed to dispatch') {
      return {
        ...movement,
        currentStatus: 'Customs cleared',
        currentLocation: releaseLocation,
        currentHolder: release.releaseOwner || 'Djibouti release desk',
        lifecycleStage: 'Customs cleared',
        currentLatitude: locationPoint.lat,
        currentLongitude: locationPoint.lng,
        events: prependSyntheticEvent(
          movement,
          'CUSTOMS_CLEARED',
          releaseLocation,
          'Djibouti release desk cleared customs and completed gate-out controls.',
          release.lastUpdated || new Date().toISOString(),
        ),
      };
    }
    if (release.dischargeTime) {
      return {
        ...movement,
        currentStatus: 'Discharged from vessel',
        currentLocation: releaseLocation,
        currentHolder: 'Djibouti terminal',
        lifecycleStage: 'Discharged from vessel',
        currentLatitude: locationPoint.lat,
        currentLongitude: locationPoint.lng,
        events: prependSyntheticEvent(
          movement,
          'DISCHARGED_FROM_VESSEL',
          releaseLocation,
          'Djibouti terminal recorded vessel discharge.',
          release.dischargeTime,
        ),
      };
    }
    if (release.vesselArrival) {
      return {
        ...movement,
        currentStatus: 'Vessel arrived',
        currentLocation: releaseLocation,
        currentHolder: 'Djibouti terminal',
        lifecycleStage: 'Vessel arrived',
        currentLatitude: locationPoint.lat,
        currentLongitude: locationPoint.lng,
        events: prependSyntheticEvent(
          movement,
          'VESSEL_ARRIVED',
          releaseLocation,
          'Djibouti release desk recorded vessel arrival.',
          release.vesselArrival,
        ),
      };
    }
  }

  return movement;
}

function deriveAfterSalesBaseRecord(record: YardRecord, followUp: Record<string, string | undefined>): ShippingAfterSalesRecord {
  const complaintAt = String(followUp.complaintSubmittedAt || '');
  const issueAt = String(followUp.issueReportedAt || '');
  const supportCallAt = String(followUp.supportCallLoggedAt || '');
  const anyFollowUpSent = Boolean(followUp.emailSentAt || followUp.smsSentAt || followUp.telegramSentAt);
  const isClosed = record.yardStage === 'Cycle closed' || record.emptyReturn.status === 'Cycle closed';

  if (complaintAt) {
    return {
      bookingId: record.bookingNumber,
      tripId: record.tripId,
      customerName: record.customerName,
      inlandNode: record.inlandNode,
      status: 'open',
      kind: 'complaint',
      openedAt: complaintAt,
      resolvedAt: '',
      rating: 0,
      summary: 'Customer complaint submitted after delivery.',
      nextAction: 'Resolve complaint and confirm customer closure.',
    };
  }

  if (issueAt) {
    return {
      bookingId: record.bookingNumber,
      tripId: record.tripId,
      customerName: record.customerName,
      inlandNode: record.inlandNode,
      status: 'open',
      kind: 'issue',
      openedAt: issueAt,
      resolvedAt: '',
      rating: 0,
      summary: 'Customer reported a post-delivery issue.',
      nextAction: 'Review issue, contact customer, and close the service case.',
    };
  }

  if (supportCallAt) {
    return {
      bookingId: record.bookingNumber,
      tripId: record.tripId,
      customerName: record.customerName,
      inlandNode: record.inlandNode,
      status: 'open',
      kind: 'support_call',
      openedAt: supportCallAt,
      resolvedAt: '',
      rating: 0,
      summary: 'Support call logged after delivery.',
      nextAction: 'Confirm call outcome and close after-sales follow-up.',
    };
  }

  return {
    bookingId: record.bookingNumber,
    tripId: record.tripId,
    customerName: record.customerName,
    inlandNode: record.inlandNode,
    status: isClosed && anyFollowUpSent ? 'feedback_pending' : 'resolved',
    kind: 'feedback',
    openedAt: String(followUp.emailSentAt || followUp.smsSentAt || followUp.telegramSentAt || record.lastUpdated || ''),
    resolvedAt: '',
    rating: 0,
    summary: anyFollowUpSent ? 'Delivery is complete and waiting for customer feedback.' : 'No active after-sales follow-up.',
    nextAction: anyFollowUpSent ? 'Capture customer rating or close the feedback loop.' : 'No after-sales action required.',
  };
}

function toAfterSalesRecords(overrides: ShippingAfterSalesOverrides): ShippingAfterSalesRecord[] {
  if (typeof window === 'undefined') return [];
  const followUps = readStoredJson<Record<string, Record<string, string>>>(yardPostDeliveryFollowUpStorageKey, {});
  const yardRecords = mergeYardRecords([]);
  return yardRecords
    .map((record) => {
      const base = deriveAfterSalesBaseRecord(record, followUps[record.id] || {});
      const override = overrides[record.bookingNumber] || {};
      return {
        ...base,
        ...override,
        bookingId: record.bookingNumber,
        tripId: record.tripId,
        customerName: record.customerName,
        inlandNode: record.inlandNode,
      };
    })
    .filter((record) => record.status !== 'resolved' || record.kind === 'feedback' || record.rating > 0)
    .sort((a, b) => String(b.openedAt).localeCompare(String(a.openedAt)));
}

function readStoredJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStoredJson<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(shippingPhase1UpdatedEvent, { detail: { key } }));
}

function buildWorkspaceFromRequests(requests: UnifiedBookingRequest[]): ShippingPhase1Workspace {
  const validationOverrides = readStoredJson<ValidationOverrides>(shippingValidationStorageKey, {});
  const paymentOverrides = readStoredJson<PaymentOverrides>(shippingPaymentsStorageKey, {});
  const lcOverrides = readStoredJson<ShippingLcOverrides>(shippingLcStorageKey, {});
  const financeReleaseOverrides = readStoredJson<ShippingFinanceReleaseOverrides>(shippingFinanceReleaseStorageKey, {});
  const instructionOverrides = readStoredJson<ShippingInstructionOverrides>(shippingInstructionsStorageKey, {});
  const billOverrides = readStoredJson<ShippingBillOverrides>(shippingBillsStorageKey, {});
  const manifestOverrides = readStoredJson<ShippingManifestOverrides>(shippingManifestsStorageKey, {});
  const fleetOverrides = readStoredJson<ShippingFleetOverrides>(shippingFleetStorageKey, {});
  const containerOverrides = readStoredJson<ShippingContainerOverrides>(shippingContainerStorageKey, {});
  const incidentOverrides = readStoredJson<ShippingIncidentOverrides>(shippingIncidentStorageKey, {});
  const afterSalesOverrides = readStoredJson<ShippingAfterSalesOverrides>(shippingAfterSalesStorageKey, {});
  const carrierAssignments = readStoredJson<ShippingCarrierAssignmentOverrides>(shippingCarrierAssignmentStorageKey, {});
  const carrierSchedules = toCarrierSchedules(defaultCarrierSchedules(), carrierAssignments);
  const quotes = requests.map(toQuoteRecord).sort((a, b) => String(b.quoteId).localeCompare(String(a.quoteId)));
  const payments = Object.values(paymentOverrides).flat().sort((a, b) => String(b.recordedAt).localeCompare(String(a.recordedAt)));
  const invoices = requests
    .filter((request) => Boolean(request.bookingId))
    .map((request) => toInvoiceRecord(request, paymentOverrides[request.bookingId] || []));
  const settlements = invoices.map((invoice) => toSettlementRecord(invoice, paymentOverrides[invoice.bookingId] || []));
  const instructions = requests.map((request) => toInstructionRecord(request, instructionOverrides)).filter(Boolean) as ShippingInstructionRecord[];
  const bookingSchedules = new Map(
    requests
      .filter((request) => Boolean(request.bookingId))
      .map((request) => [request.bookingId, getAssignedCarrierSchedule(request, carrierAssignments, carrierSchedules)]),
  );
  const billsOfLading = requests
    .map((request) => toBillOfLadingRecord(request, billOverrides, instructions.find((item) => item.bookingId === request.bookingId), bookingSchedules.get(request.bookingId) || null))
    .filter(Boolean) as ShippingBillOfLadingRecord[];
  const manifests = requests
    .map((request) => toManifestRecord(request, manifestOverrides, billsOfLading.find((item) => item.bookingId === request.bookingId), bookingSchedules.get(request.bookingId) || null))
    .filter(Boolean) as ShippingManifestRecord[];
  const validations = requests
    .map((request) => toValidationRecord(
      request,
      validationOverrides,
      instructions.find((item) => item.bookingId === request.bookingId),
      billsOfLading.find((item) => item.bookingId === request.bookingId),
      manifests.find((item) => item.bookingId === request.bookingId),
    ))
    .filter((record) => record.bookingId || record.quoteId);
  const lettersOfCredit = requests
    .map((request) => toLetterOfCreditRecord(
      request,
      lcOverrides,
      instructions.find((item) => item.bookingId === request.bookingId) || null,
      billsOfLading.find((item) => item.bookingId === request.bookingId) || null,
      manifests.find((item) => item.bookingId === request.bookingId) || null,
      invoices.find((item) => item.bookingId === request.bookingId),
    ))
    .filter(Boolean) as ShippingLetterOfCreditRecord[];
  const financeReleaseControls = requests
    .map((request) => toFinanceReleaseRecord(request, financeReleaseOverrides, invoices.find((item) => item.bookingId === request.bookingId) || null))
    .filter(Boolean) as ShippingFinanceReleaseRecord[];
  const bookings = requests
    .map((request) => toBookingRecord(
      request,
      validations.find((item) => item.bookingId === request.bookingId) || null,
      instructions.find((item) => item.bookingId === request.bookingId) || null,
      billsOfLading.find((item) => item.bookingId === request.bookingId) || null,
      manifests.find((item) => item.bookingId === request.bookingId) || null,
      lettersOfCredit.find((item) => item.bookingId === request.bookingId) || null,
      settlements.find((item) => item.bookingId === request.bookingId) || null,
      bookingSchedules.get(request.bookingId) || null,
      financeReleaseControls.find((item) => item.bookingId === request.bookingId) || null,
    ))
    .filter(Boolean) as ShippingBookingRecord[];
  const fleet = toFleetRecords(fleetOverrides);
  const containerMovements = requests
    .map((request) => toContainerMovementRecord(request, containerOverrides, billsOfLading))
    .filter(Boolean)
    .map((movement) => withManualCorridorOverlay(movement as ShippingContainerMovementRecord)) as ShippingContainerMovementRecord[];
  const incidents = Object.values(incidentOverrides).flat().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const afterSales = toAfterSalesRecords(afterSalesOverrides);
  const carrierAlerts = toCarrierAlerts(carrierSchedules);
  return { quotes, bookings, validations, invoices, payments, settlements, lettersOfCredit, financeReleaseControls, afterSales, carrierSchedules, carrierAlerts, instructions, billsOfLading, manifests, fleet, containerMovements, incidents };
}

export function readShippingPhase1Workspace() {
  const requests = readSharedQuoteRequests([]);
  return buildWorkspaceFromRequests(requests);
}

export function predictShippingEta(movement?: ShippingContainerMovementRecord | null) {
  if (!movement) return '';
  const latestTimestamp = movement.events[0]?.timestamp ? new Date(movement.events[0].timestamp).getTime() : Date.now();
  const status = movement.currentStatus.toLowerCase();
  const stage = movement.lifecycleStage.toLowerCase();
  let hours = 96;
  if (status.includes('empty returned')) hours = 0;
  else if (status.includes('arrived inland') || stage.includes('delivered')) hours = 36;
  else if (status.includes('in transit') || status.includes('out for delivery')) hours = 12;
  else if (status.includes('customs cleared')) hours = 18;
  else if (status.includes('available for clearance')) hours = 28;
  else if (status.includes('vessel arrived') || status.includes('discharged')) hours = 40;
  else if (status.includes('vessel departed') || stage.includes('transshipment')) hours = 168;
  else if (status.includes('loaded on vessel')) hours = 180;
  return new Date(latestTimestamp + hours * 3600000).toISOString();
}

export function deriveShippingTrackingAlerts(movement?: ShippingContainerMovementRecord | null): ShippingTrackingAlert[] {
  if (!movement) return [];
  const latestEvent = movement.events[0];
  const hoursSinceUpdate = latestEvent ? Math.max((Date.now() - new Date(latestEvent.timestamp).getTime()) / 36e5, 0) : 0;
  const predictedEta = predictShippingEta(movement);
  const alerts: ShippingTrackingAlert[] = [];

  if (predictedEta && new Date(predictedEta).getTime() < Date.now() && !movement.actualReturnDate && !movement.currentStatus.toLowerCase().includes('arrived')) {
    alerts.push({
      title: 'Delay detected',
      tone: 'critical',
      detail: `Predicted ETA ${predictedEta} is already behind the current time.`,
    });
  }

  if (hoursSinceUpdate >= 12) {
    alerts.push({
      title: 'No update risk',
      tone: 'critical',
      detail: `No new container event for ${Math.floor(hoursSinceUpdate)} hours.`,
    });
  }

  if (movement.currentStatus === 'Truck assigned' && hoursSinceUpdate >= 6) {
    alerts.push({
      title: 'Stuck before inland movement',
      tone: 'warning',
      detail: 'Truck assignment is recorded, but corridor movement has not started on time.',
    });
  }

  if (!movement.actualReturnDate && movement.expectedReturnDate) {
    const delayDays = Math.max(Math.ceil((Date.now() - new Date(movement.expectedReturnDate).getTime()) / 86400000), 0);
    if (delayDays > 0) {
      alerts.push({
        title: 'Container not returned',
        tone: 'warning',
        detail: `${delayDays} return delay day(s) · penalty exposure USD ${(delayDays * 45).toLocaleString('en-US')}.`,
      });
    }
  }

  return alerts.length
    ? alerts
    : [{
        title: 'Tracking healthy',
        tone: 'good',
        detail: 'Container updates are flowing inside the expected lifecycle.',
      }];
}

export function toShippingContainerMasterRecord(movement: ShippingContainerMovementRecord): ShippingContainerMasterRecord {
  const latestTimestamp = movement.events[0]?.timestamp || '';
  const returnStatus =
    movement.actualReturnDate
      ? 'RETURNED'
      : movement.expectedReturnDate && new Date(movement.expectedReturnDate).getTime() < Date.now()
        ? 'OVERDUE'
        : 'PENDING';
  return {
    containerNo: movement.containerNumber,
    blNo: movement.billOfLadingNumber,
    bookingNo: movement.bookingNumber,
    carrier: movement.carrierName,
    vesselName: movement.currentStatus.toLowerCase().includes('vessel') ? movement.currentLocation : '',
    voyageNo: '',
    currentStatus: movement.currentStatus,
    currentLocation: movement.currentLocation,
    eta: predictShippingEta(movement),
    shipper: 'Tikur Abay managed shipper',
    consignee: movement.customerName,
    returnStatus,
    demurrageDays: movement.returnDelayDays,
    penaltyAmount: movement.demurragePenaltyAmount,
    updatedAt: latestTimestamp,
  };
}

export function findShippingTrackingMatches(query: string) {
  const needle = query.trim().toLowerCase();
  const workspace = readShippingPhase1Workspace();
  if (!needle) {
    return {
      query: '',
      type: 'all' as const,
      movements: workspace.containerMovements,
      matchedBookingIds: workspace.containerMovements.map((movement) => movement.bookingId),
      matchedBy: 'Container / BL / Booking',
    };
  }
  const movements = workspace.containerMovements.filter((movement) =>
    [
      movement.containerNumber,
      movement.billOfLadingNumber,
      movement.bookingNumber,
      movement.bookingId,
      movement.quoteId,
      movement.customerName,
      movement.carrierName,
    ]
      .join(' ')
      .toLowerCase()
      .includes(needle),
  );
  const exactContainer = workspace.containerMovements.find((movement) => movement.containerNumber.toLowerCase() === needle);
  const type = exactContainer
    ? 'container'
    : movements.some((movement) => movement.billOfLadingNumber.toLowerCase().includes(needle))
      ? 'bl'
      : movements.some((movement) => movement.bookingId.toLowerCase().includes(needle) || movement.bookingNumber.toLowerCase().includes(needle))
        ? 'booking'
        : 'search';
  return {
    query,
    type,
    movements,
    matchedBookingIds: movements.map((movement) => movement.bookingId),
    matchedBy: shippingTrackingLookupLabel(query),
  };
}

export function readShippingTrackingResponse(query: string) {
  const result = findShippingTrackingMatches(query);
  const primary = result.movements[0] || null;
  return {
    query,
    matchedBy: result.matchedBy,
    type: result.type,
    container: primary ? toShippingContainerMasterRecord(primary) : null,
    movement: primary,
    events: primary?.events || [],
    relatedContainers: result.movements,
    eta: predictShippingEta(primary),
    alerts: deriveShippingTrackingAlerts(primary),
  };
}

export function readShippingTrackingByBl(blNo: string) {
  const workspace = readShippingPhase1Workspace();
  const normalized = blNo.trim().toLowerCase();
  const containers = workspace.containerMovements.filter((movement) => movement.billOfLadingNumber.toLowerCase() === normalized);
  const primary = containers[0] || null;
  return {
    blNo,
    carrier: primary?.carrierName || '',
    vesselName: primary?.events.find((event) => event.type === 'LOADED_ON_VESSEL')?.location || '',
    containers: containers.map(toShippingContainerMasterRecord),
  };
}

export function readShippingContainerMasterRecords() {
  return readShippingPhase1Workspace().containerMovements.map(toShippingContainerMasterRecord);
}

const shippingActionRoles: Record<ShippingActionKey, ConsoleRole[]> = {
  shipping_instruction_edit: ['super_admin', 'executive', 'operations_manager', 'marketing_officer', 'supplier_agent'],
  shipping_instruction_approve: ['super_admin', 'executive', 'operations_manager', 'marketing_officer'],
  bill_of_lading_approve: ['super_admin', 'executive', 'operations_manager', 'marketing_officer'],
  bill_of_lading_finalize: ['super_admin', 'executive', 'operations_manager', 'marketing_officer'],
  manifest_generate: ['super_admin', 'executive', 'operations_manager', 'marketing_officer'],
  letter_of_credit_verify: ['super_admin', 'executive', 'finance_officer'],
  letter_of_credit_pay: ['super_admin', 'executive', 'finance_officer'],
  carrier_schedule_assign: ['super_admin', 'executive', 'operations_manager', 'marketing_officer'],
  tracking_assign_truck: ['super_admin', 'executive', 'operations_manager', 'dispatcher', 'corridor_dispatch_agent'],
  tracking_add_event: ['super_admin', 'executive', 'operations_manager', 'dispatcher', 'corridor_dispatch_agent'],
  tracking_resolve_incident: ['super_admin', 'executive', 'operations_manager', 'dispatcher', 'technical_manager'],
  after_sales_resolve: ['super_admin', 'executive', 'operations_manager', 'technical_manager', 'customer_support_agent'],
  after_sales_rate: ['super_admin', 'executive', 'operations_manager', 'technical_manager', 'customer_support_agent'],
};

const shippingActionOwnerLabel: Record<ShippingActionKey, string> = {
  shipping_instruction_edit: 'China Port Agent Desk',
  shipping_instruction_approve: 'Origin operations lead',
  bill_of_lading_approve: 'Origin operations lead',
  bill_of_lading_finalize: 'Origin operations lead',
  manifest_generate: 'Origin operations lead',
  letter_of_credit_verify: 'Finance / trade finance desk',
  letter_of_credit_pay: 'Finance / trade finance desk',
  carrier_schedule_assign: 'Carrier planning desk',
  tracking_assign_truck: 'Corridor Dispatch',
  tracking_add_event: 'Corridor Dispatch',
  tracking_resolve_incident: 'Operations / Dispatch control',
  after_sales_resolve: 'After-sales / support desk',
  after_sales_rate: 'After-sales / support desk',
};

export function canOperateShippingAction(role: ConsoleRole | null | undefined, action: ShippingActionKey) {
  if (!role) return false;
  return shippingActionRoles[action].includes(role);
}

export function shippingActionOwner(action: ShippingActionKey) {
  return shippingActionOwnerLabel[action];
}

function notificationSeverityFromTone(tone: ShippingCarrierAlertTone): ShippingNotificationSeverity {
  if (tone === 'critical') return 'critical';
  if (tone === 'warning') return 'high';
  return 'info';
}

function toShippingNotifications(
  workspace: ShippingPhase1Workspace,
  readState: Record<string, boolean>,
): ShippingNotificationRecord[] {
  const now = Date.now();
  const carrierNotifications = workspace.carrierAlerts.map<ShippingNotificationRecord>((alert) => ({
    id: `shipping-carrier-${alert.id}`,
    title: alert.title,
    secondaryText: alert.description,
    category: 'shipping',
    severity: notificationSeverityFromTone(alert.tone),
    branch: 'Shipping',
    timestamp: workspace.carrierSchedules.find((item) => item.scheduleId === alert.scheduleId)?.etd || new Date().toISOString(),
    isRead: readState[`shipping-carrier-${alert.id}`] === true,
    actionLabel: 'Open carrier schedule',
    entityType: 'carrier_schedule',
    entityId: alert.scheduleId,
    linkedEntity: {
      label: alert.title,
      href: alert.href,
    },
  }));

  const lcNotifications = workspace.lettersOfCredit.flatMap<ShippingNotificationRecord>((lc) => {
    if (lc.status === 'paid') {
      return [{
        id: `shipping-lc-paid-${lc.bookingId}`,
        title: `${lc.customerName} LC settled`,
        secondaryText: `Trade finance is fully paid for ${lc.bookingId}. Settlement can close in finance.`,
        category: 'finance',
        severity: 'info',
        branch: 'Shipping Finance',
        timestamp: lc.issuingDate,
        isRead: readState[`shipping-lc-paid-${lc.bookingId}`] === true,
        actionLabel: 'Open shipping finance',
        entityType: 'letter_of_credit',
        entityId: lc.bookingId,
        linkedEntity: {
          label: `${lc.bookingId} · ${lc.lcNumber}`,
          href: '/shipping/finance',
        },
      }];
    }
    if (lc.status === 'verified') {
      return [{
        id: `shipping-lc-verified-${lc.bookingId}`,
        title: `${lc.customerName} LC verified`,
        secondaryText: `Bank verification is complete for ${lc.bookingId}. Payment release should be recorded next.`,
        category: 'finance',
        severity: 'high',
        branch: 'Shipping Finance',
        timestamp: lc.issuingDate,
        isRead: readState[`shipping-lc-verified-${lc.bookingId}`] === true,
        actionLabel: 'Open shipping finance',
        entityType: 'letter_of_credit',
        entityId: lc.bookingId,
        linkedEntity: {
          label: `${lc.bookingId} · ${lc.lcNumber}`,
          href: '/shipping/finance',
        },
      }];
    }
    return [];
  });

  const incidentNotifications = workspace.incidents
    .filter((incident) => incident.status === 'open')
    .map<ShippingNotificationRecord>((incident) => ({
      id: `shipping-incident-${incident.id}`,
      title: incident.title,
      secondaryText: incident.description,
      category: 'operations',
      severity: incident.severity === 'critical' ? 'critical' : incident.severity === 'warning' ? 'high' : 'info',
      branch: 'Shipping Tracking',
      timestamp: incident.createdAt,
      isRead: readState[`shipping-incident-${incident.id}`] === true,
      actionLabel: 'Open tracking incident',
      entityType: 'shipping_incident',
      entityId: incident.id,
      linkedEntity: {
        label: `${incident.bookingId} · ${incident.containerNumber}`,
        href: '/shipping/tracking',
      },
    }));

  const overdueInstructionNotifications = workspace.instructions.flatMap<ShippingNotificationRecord>((instruction) => {
    const referenceTime = new Date(instruction.submittedAt || workspace.bookings.find((item) => item.bookingId === instruction.bookingId)?.bookingConfirmedAt || '').getTime();
    if (instruction.status === 'approved' || Number.isNaN(referenceTime)) return [];
    const hours = (now - referenceTime) / 36e5;
    if (hours < 12) return [];
    return [{
      id: `shipping-overdue-si-${instruction.bookingId}`,
      title: `${instruction.bookingId} shipping instruction overdue`,
      secondaryText: `Shipping instruction has remained ${instruction.status.replace(/_/g, ' ')} for ${Math.floor(hours)} hours and is now blocking BL preparation.`,
      category: 'shipping',
      severity: hours >= 24 ? 'critical' : 'high',
      branch: 'Shipping Documents',
      timestamp: instruction.submittedAt || workspace.bookings.find((item) => item.bookingId === instruction.bookingId)?.bookingConfirmedAt || new Date().toISOString(),
      isRead: readState[`shipping-overdue-si-${instruction.bookingId}`] === true,
      actionLabel: 'Open shipping instructions',
      entityType: 'shipping_instruction',
      entityId: instruction.bookingId,
      linkedEntity: {
        label: `${instruction.bookingId} · ${instruction.customerName}`,
        href: '/shipping/instructions',
      },
    }];
  });

  const overdueBlNotifications = workspace.billsOfLading.flatMap<ShippingNotificationRecord>((bill) => {
    if (bill.status === 'final') return [];
    const instruction = workspace.instructions.find((item) => item.bookingId === bill.bookingId);
    const referenceTime = new Date(instruction?.approvedAt || instruction?.submittedAt || '').getTime();
    if (Number.isNaN(referenceTime)) return [];
    const hours = (now - referenceTime) / 36e5;
    if (hours < 12) return [];
    return [{
      id: `shipping-overdue-bl-${bill.bookingId}`,
      title: `${bill.bookingId} BL draft overdue`,
      secondaryText: `Shipping instruction is already approved, but BL finalization is still open after ${Math.floor(hours)} hours.`,
      category: 'shipping',
      severity: hours >= 24 ? 'critical' : 'high',
      branch: 'Shipping Documents',
      timestamp: instruction?.approvedAt || instruction?.submittedAt || new Date().toISOString(),
      isRead: readState[`shipping-overdue-bl-${bill.bookingId}`] === true,
      actionLabel: 'Open bills of lading',
      entityType: 'bill_of_lading',
      entityId: bill.bookingId,
      linkedEntity: {
        label: `${bill.bookingId} · ${bill.houseBlNumber || bill.masterBlNumber || bill.customerName}`,
        href: '/shipping/bills-of-lading',
      },
    }];
  });

  const overdueLcNotifications = workspace.lettersOfCredit.flatMap<ShippingNotificationRecord>((lc) => {
    if (lc.status !== 'pending' || !lc.documentChecks.every((item) => item.status === 'approved')) return [];
    const referenceTime = new Date(lc.issuingDate).getTime();
    if (Number.isNaN(referenceTime)) return [];
    const hours = (now - referenceTime) / 36e5;
    if (hours < 12) return [];
    return [{
      id: `shipping-overdue-lc-${lc.bookingId}`,
      title: `${lc.bookingId} LC verification overdue`,
      secondaryText: `All trade documents are approved, but bank verification is still pending after ${Math.floor(hours)} hours.`,
      category: 'finance',
      severity: hours >= 24 ? 'critical' : 'high',
      branch: 'Shipping Finance',
      timestamp: lc.issuingDate,
      isRead: readState[`shipping-overdue-lc-${lc.bookingId}`] === true,
      actionLabel: 'Open shipping finance',
      entityType: 'letter_of_credit',
      entityId: lc.bookingId,
      linkedEntity: {
        label: `${lc.bookingId} · ${lc.lcNumber}`,
        href: '/shipping/finance',
      },
    }];
  });

  const overdueIncidentNotifications = workspace.incidents.flatMap<ShippingNotificationRecord>((incident) => {
    if (incident.status !== 'open') return [];
    const referenceTime = new Date(incident.createdAt).getTime();
    if (Number.isNaN(referenceTime)) return [];
    const hours = (now - referenceTime) / 36e5;
    if (hours < 8) return [];
    return [{
      id: `shipping-overdue-incident-${incident.id}`,
      title: `${incident.bookingId} incident escalation`,
      secondaryText: `Tracking incident "${incident.title}" is still open after ${Math.floor(hours)} hours.`,
      category: 'operations',
      severity: hours >= 24 ? 'critical' : 'high',
      branch: 'Shipping Tracking',
      timestamp: incident.createdAt,
      isRead: readState[`shipping-overdue-incident-${incident.id}`] === true,
      actionLabel: 'Open tracking incident',
      entityType: 'shipping_incident',
      entityId: incident.id,
      linkedEntity: {
        label: `${incident.bookingId} · ${incident.containerNumber}`,
        href: '/shipping/tracking',
      },
    }];
  });

  const afterSalesNotifications = workspace.afterSales.flatMap<ShippingNotificationRecord>((record) => {
    if (record.status === 'open') {
      return [{
        id: `shipping-after-sales-open-${record.bookingId}`,
        title: `${record.customerName} after-sales case open`,
        secondaryText: record.summary,
        category: 'customer',
        severity: 'high',
        branch: 'After Sales',
        timestamp: record.openedAt,
        isRead: readState[`shipping-after-sales-open-${record.bookingId}`] === true,
        actionLabel: 'Open after-sales',
        entityType: 'after_sales',
        entityId: record.bookingId,
        linkedEntity: {
          label: `${record.bookingId} · ${record.customerName}`,
          href: '/shipping/after-sales',
        },
      }];
    }
    if (record.status === 'feedback_pending') {
      return [{
        id: `shipping-after-sales-feedback-${record.bookingId}`,
        title: `${record.customerName} feedback pending`,
        secondaryText: record.summary,
        category: 'customer',
        severity: 'info',
        branch: 'After Sales',
        timestamp: record.openedAt,
        isRead: readState[`shipping-after-sales-feedback-${record.bookingId}`] === true,
        actionLabel: 'Open after-sales',
        entityType: 'after_sales',
        entityId: record.bookingId,
        linkedEntity: {
          label: `${record.bookingId} · ${record.customerName}`,
          href: '/shipping/after-sales',
        },
      }];
    }
    return [];
  });

  return [
    ...carrierNotifications,
    ...lcNotifications,
    ...incidentNotifications,
    ...afterSalesNotifications,
    ...overdueInstructionNotifications,
    ...overdueBlNotifications,
    ...overdueLcNotifications,
    ...overdueIncidentNotifications,
  ]
    .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
}

export function readShippingNotifications(): ShippingNotificationRecord[] {
  const workspace = readShippingPhase1Workspace();
  const readState = readStoredJson<Record<string, boolean>>(shippingNotificationReadStateStorageKey, {});
  return toShippingNotifications(workspace, readState);
}

export function markShippingNotificationRead(notificationId: string) {
  const current = readStoredJson<Record<string, boolean>>(shippingNotificationReadStateStorageKey, {});
  current[notificationId] = true;
  writeStoredJson(shippingNotificationReadStateStorageKey, current);
}

export function markAllShippingNotificationsRead() {
  const notifications = readShippingNotifications();
  const next = notifications.reduce<Record<string, boolean>>((acc, notification) => {
    acc[notification.id] = true;
    return acc;
  }, {});
  writeStoredJson(shippingNotificationReadStateStorageKey, next);
}

export function updateShippingValidation(bookingOrQuoteId: string, itemId: string, status: ShippingDocumentStatus, reason: string) {
  const current = readStoredJson<ValidationOverrides>(shippingValidationStorageKey, {});
  const requests = readSharedQuoteRequests([]);
  const request = requests.find((entry) => entry.bookingId === bookingOrQuoteId || entry.quoteId === bookingOrQuoteId);
  if (!request) return;
  const key = request.bookingId || request.quoteId;
  const existing = current[key] || defaultValidationItems(request);
  const updatedAt = new Date().toISOString();
  current[key] = existing.map((item) => (item.id === itemId ? { ...item, status, reason, updatedAt } : item));
  writeStoredJson(shippingValidationStorageKey, current);
}

export function recordShippingPayment(invoiceId: string, bookingId: string, customerName: string, currency: 'USD' | 'ETB', amount: number) {
  const current = readStoredJson<PaymentOverrides>(shippingPaymentsStorageKey, {});
  const nextPayment: ShippingPaymentRecord = {
    paymentId: `PAY-${Date.now()}`,
    invoiceId,
    bookingId,
    customerName,
    amount,
    currency,
    status: 'paid',
    recordedAt: new Date().toISOString(),
  };
  current[bookingId] = [nextPayment, ...(current[bookingId] || [])];
  writeStoredJson(shippingPaymentsStorageKey, current);
}

export function updateShippingLetterOfCreditDocument(
  bookingId: string,
  documentKey: ShippingTradeDocumentKey,
  status: ShippingDocumentStatus,
  reason: string,
) {
  const requests = readSharedQuoteRequests([]);
  const request = requests.find((entry) => entry.bookingId === bookingId);
  if (!request?.bookingId) return;
  const invoices = buildWorkspaceFromRequests(requests).invoices;
  const current = readStoredJson<ShippingLcOverrides>(shippingLcStorageKey, {});
  const next = current[bookingId] || defaultLetterOfCredit(request, invoices.find((item) => item.bookingId === bookingId));
  current[bookingId] = {
    ...next,
    documentChecks: next.documentChecks.map((check) => (
      check.key === documentKey ? { ...check, status, reason } : check
    )),
    status: 'pending',
  };
  writeStoredJson(shippingLcStorageKey, current);
}

export function verifyShippingLetterOfCredit(bookingId: string) {
  const requests = readSharedQuoteRequests([]);
  const request = requests.find((entry) => entry.bookingId === bookingId);
  if (!request?.bookingId) return;
  const workspace = buildWorkspaceFromRequests(requests);
  const invoices = workspace.invoices;
  const effectiveLc = workspace.lettersOfCredit.find((item) => item.bookingId === bookingId);
  const current = readStoredJson<ShippingLcOverrides>(shippingLcStorageKey, {});
  const next = current[bookingId] || defaultLetterOfCredit(request, invoices.find((item) => item.bookingId === bookingId));
  if (!effectiveLc?.documentChecks.every((check) => check.status === 'approved')) return;
  current[bookingId] = {
    ...next,
    documentChecks: effectiveLc.documentChecks,
    status: 'verified',
    verificationNote: 'Issuing bank verified the trade-document packet and released it for payment.',
  };
  writeStoredJson(shippingLcStorageKey, current);
}

export function markShippingLetterOfCreditPaid(bookingId: string) {
  const requests = readSharedQuoteRequests([]);
  const request = requests.find((entry) => entry.bookingId === bookingId);
  if (!request?.bookingId) return;
  const workspace = buildWorkspaceFromRequests(requests);
  const invoices = workspace.invoices;
  const effectiveLc = workspace.lettersOfCredit.find((item) => item.bookingId === bookingId);
  const current = readStoredJson<ShippingLcOverrides>(shippingLcStorageKey, {});
  const next = current[bookingId] || defaultLetterOfCredit(request, invoices.find((item) => item.bookingId === bookingId));
  if (effectiveLc?.status !== 'verified') return;

  current[bookingId] = {
    ...next,
    documentChecks: effectiveLc?.documentChecks || next.documentChecks,
    status: 'paid',
    verificationNote: 'Trade finance packet is verified and marked paid. Record the settlement payments to close the finance file.',
  };
  writeStoredJson(shippingLcStorageKey, current);
}

export function updateShippingFinanceReleaseControl(
  bookingId: string,
  patch: Partial<ShippingFinanceReleaseRecord>,
) {
  const requests = readSharedQuoteRequests([]);
  const request = requests.find((entry) => entry.bookingId === bookingId);
  if (!request?.bookingId) return;
  const workspace = buildWorkspaceFromRequests(requests);
  const current = readStoredJson<ShippingFinanceReleaseOverrides>(shippingFinanceReleaseStorageKey, {});
  const base =
    current[bookingId] ||
    defaultFinanceReleaseControl(
      request,
      workspace.invoices.find((item) => item.bookingId === bookingId),
    );
  current[bookingId] = {
    ...base,
    ...patch,
    bookingId: base.bookingId,
    quoteId: base.quoteId,
    customerName: base.customerName,
  };
  writeStoredJson(shippingFinanceReleaseStorageKey, current);
}

export function submitShippingInstruction(bookingId: string) {
  const requests = readSharedQuoteRequests([]);
  const request = requests.find((entry) => entry.bookingId === bookingId);
  if (!request?.bookingId) return;
  const current = readStoredJson<ShippingInstructionOverrides>(shippingInstructionsStorageKey, {});
  const next = current[bookingId] || defaultShippingInstruction(request);
  current[bookingId] = {
    ...next,
    status: 'submitted',
    submittedAt: new Date().toISOString(),
    approvedAt: '',
  };
  writeStoredJson(shippingInstructionsStorageKey, current);
}

export function updateShippingInstructionDraft(
  bookingId: string,
  patch: Partial<
    Pick<
      ShippingInstructionRecord,
      | 'shipperName'
      | 'consigneeName'
      | 'notifyParty'
      | 'cargoDescription'
      | 'hsCode'
      | 'containerNumber'
      | 'sealNumber'
      | 'packageSummary'
      | 'grossWeight'
      | 'measurementCbm'
      | 'marksAndNumbers'
      | 'portOfLoading'
      | 'portOfDischarge'
      | 'placeOfReceipt'
      | 'placeOfDelivery'
      | 'specialInstructions'
      | 'incoterm'
      | 'consigneeTinNumber'
      | 'tinAreaCode'
      | 'letterOfCreditNumber'
      | 'hazardousCargo'
      | 'unNumber'
      | 'freightTerm'
    >
  >,
) {
  const requests = readSharedQuoteRequests([]);
  const request = requests.find((entry) => entry.bookingId === bookingId);
  if (!request?.bookingId) return;
  const current = readStoredJson<ShippingInstructionOverrides>(shippingInstructionsStorageKey, {});
  const next = current[bookingId] || defaultShippingInstruction(request);
  current[bookingId] = {
    ...next,
    ...patch,
    status: 'draft',
    approvedAt: '',
  };
  writeStoredJson(shippingInstructionsStorageKey, current);
}

export function approveShippingInstruction(bookingId: string) {
  const requests = readSharedQuoteRequests([]);
  const request = requests.find((entry) => entry.bookingId === bookingId);
  if (!request?.bookingId) return;
  const current = readStoredJson<ShippingInstructionOverrides>(shippingInstructionsStorageKey, {});
  const next = current[bookingId] || defaultShippingInstruction(request);
  current[bookingId] = {
    ...next,
    status: 'approved',
    submittedAt: next.submittedAt || new Date().toISOString(),
    approvedAt: new Date().toISOString(),
  };
  writeStoredJson(shippingInstructionsStorageKey, current);
}

export function updateShippingBillDraft(
  bookingId: string,
  patch: Partial<
    Pick<
      ShippingBillOfLadingRecord,
      | 'houseBlNumber'
      | 'masterBlNumber'
      | 'slotCarrierBillNumber'
      | 'carrierName'
      | 'vesselName'
      | 'voyageNumber'
      | 'shipperName'
      | 'consigneeName'
      | 'notifyParty'
      | 'cargoDescription'
      | 'hsCode'
      | 'containerNumber'
      | 'sealNumber'
      | 'packageSummary'
      | 'grossWeight'
      | 'measurementCbm'
      | 'marksAndNumbers'
      | 'portOfLoading'
      | 'portOfDischarge'
      | 'placeOfReceipt'
      | 'placeOfDelivery'
      | 'placeOfIssue'
      | 'shippedOnBoardDate'
      | 'consigneeTinNumber'
      | 'tinAreaCode'
      | 'letterOfCreditNumber'
      | 'numberOfOriginalBills'
      | 'freightTerm'
    >
  >,
) {
  const requests = readSharedQuoteRequests([]);
  const request = requests.find((entry) => entry.bookingId === bookingId);
  if (!request?.bookingId) return;
  const current = readStoredJson<ShippingBillOverrides>(shippingBillsStorageKey, {});
  const next = current[bookingId] || defaultBillOfLading(request);
  if (next.status === 'final') return;
  current[bookingId] = {
    ...next,
    ...patch,
    status: 'draft',
  };
  writeStoredJson(shippingBillsStorageKey, current);
}

export function approveShippingBillOfLading(bookingId: string) {
  const instructions = readStoredJson<ShippingInstructionOverrides>(shippingInstructionsStorageKey, {});
  if (instructions[bookingId]?.status !== 'approved') return;
  const requests = readSharedQuoteRequests([]);
  const request = requests.find((entry) => entry.bookingId === bookingId);
  if (!request?.bookingId) return;
  const current = readStoredJson<ShippingBillOverrides>(shippingBillsStorageKey, {});
  const next = current[bookingId] || defaultBillOfLading(request);
  if (next.status === 'final') return;
  current[bookingId] = {
    ...next,
    status: 'approved',
    approvedAt: new Date().toISOString(),
    blockedReason: '',
  };
  writeStoredJson(shippingBillsStorageKey, current);
}

export function finalizeShippingBillOfLading(bookingId: string) {
  const instructions = readStoredJson<ShippingInstructionOverrides>(shippingInstructionsStorageKey, {});
  if (instructions[bookingId]?.status !== 'approved') return;
  const requests = readSharedQuoteRequests([]);
  const request = requests.find((entry) => entry.bookingId === bookingId);
  if (!request?.bookingId) return;
  const current = readStoredJson<ShippingBillOverrides>(shippingBillsStorageKey, {});
  const next = current[bookingId] || defaultBillOfLading(request);
  if (next.status !== 'approved') return;
  current[bookingId] = {
    ...next,
    status: 'final',
    approvedAt: next.approvedAt || new Date().toISOString(),
    issueDate: new Date().toISOString(),
    blockedReason: '',
  };
  writeStoredJson(shippingBillsStorageKey, current);
}

export function generateShippingManifest(bookingId: string) {
  const bills = readStoredJson<ShippingBillOverrides>(shippingBillsStorageKey, {});
  if (bills[bookingId]?.status !== 'final') return;
  const requests = readSharedQuoteRequests([]);
  const request = requests.find((entry) => entry.bookingId === bookingId);
  if (!request?.bookingId) return;
  const current = readStoredJson<ShippingManifestOverrides>(shippingManifestsStorageKey, {});
  const next = current[bookingId] || defaultManifest(request);
  current[bookingId] = {
    ...next,
    status: 'generated',
    generatedAt: new Date().toISOString(),
    blockedReason: '',
  };
  writeStoredJson(shippingManifestsStorageKey, current);
}

export function assignShippingCarrierSchedule(bookingId: string, scheduleId: string) {
  const requests = readSharedQuoteRequests([]);
  const request = requests.find((entry) => entry.bookingId === bookingId);
  if (!request?.bookingId) return;
  const schedule = defaultCarrierSchedules().find((item) => item.scheduleId === scheduleId);
  if (!schedule) return;
  const assignments = readStoredJson<ShippingCarrierAssignmentOverrides>(shippingCarrierAssignmentStorageKey, {});
  assignments[bookingId] = scheduleId;
  writeStoredJson(shippingCarrierAssignmentStorageKey, assignments);

  const billOverrides = readStoredJson<ShippingBillOverrides>(shippingBillsStorageKey, {});
  const existingBill = billOverrides[bookingId] || defaultBillOfLading(request);
  if (existingBill.status !== 'final') {
    billOverrides[bookingId] = {
      ...existingBill,
      carrierName: schedule.carrierName,
      vesselName: schedule.vesselName,
      voyageNumber: schedule.voyageNumber,
    };
    writeStoredJson(shippingBillsStorageKey, billOverrides);
  }

  const manifestOverrides = readStoredJson<ShippingManifestOverrides>(shippingManifestsStorageKey, {});
  const existingManifest = manifestOverrides[bookingId] || defaultManifest(request);
  if (existingManifest.status !== 'generated') {
    manifestOverrides[bookingId] = {
      ...existingManifest,
      vesselName: schedule.vesselName,
      voyageNumber: schedule.voyageNumber,
    };
    writeStoredJson(shippingManifestsStorageKey, manifestOverrides);
  }
}

export function assignShippingTruck(bookingId: string, truckId: string) {
  const fleet = readStoredJson<ShippingFleetOverrides>(shippingFleetStorageKey, {});
  const containers = readStoredJson<ShippingContainerOverrides>(shippingContainerStorageKey, {});
  const currentFleet = toFleetRecords(fleet);
  const truck = currentFleet.find((item) => item.truckId === truckId);
  if (!truck) return;
  currentFleet.forEach((item) => {
    fleet[item.truckId] =
      item.truckId === truckId
        ? { ...item, status: 'busy', assignedBookingId: bookingId }
        : item.assignedBookingId === bookingId
          ? { ...item, status: 'available', assignedBookingId: '', currentLocation: item.currentLocation || 'Dispatch pool' }
          : item;
  });
  const requests = readSharedQuoteRequests([]);
  const request = requests.find((entry) => entry.bookingId === bookingId);
  if (!request?.bookingId) return;
  const existing = containers[bookingId] || defaultContainerMovement(request);
  const previousTruck = currentFleet.find((item) => item.truckId === existing.assignedTruckId);
  containers[bookingId] = {
    ...existing,
    assignedTruckId: truck.truckId,
    assignedDriverName: truck.driverName,
    assignedDriverPhone: truck.driverPhone,
    currentStatus: 'Truck assigned',
    currentLocation: truck.currentLocation,
    currentHolder: truck.driverName,
    lifecycleStage: 'Truck assigned',
    currentLatitude:
      truck.currentLocation.toLowerCase().includes('galafi') ? 11.716 :
      truck.currentLocation.toLowerCase().includes('adama') ? 8.54 :
      11.595,
    currentLongitude:
      truck.currentLocation.toLowerCase().includes('galafi') ? 41.84 :
      truck.currentLocation.toLowerCase().includes('adama') ? 39.27 :
      43.148,
    events: [
      {
        id: `${bookingId}-evt-${Date.now()}`,
        type: 'TRUCK_ASSIGNED',
        location: truck.currentLocation,
        note: `Assigned truck ${truck.plateNumber} to container movement.`,
        timestamp: new Date().toISOString(),
        truckId: truck.truckId,
        driverName: truck.driverName,
      },
      ...existing.events,
    ],
    handoffHistory:
      existing.assignedTruckId && existing.assignedTruckId !== truck.truckId
        ? [
            {
              id: `${bookingId}-handoff-${Date.now()}`,
              fromTruckId: existing.assignedTruckId,
              fromDriverName: existing.assignedDriverName,
              toTruckId: truck.truckId,
              toDriverName: truck.driverName,
              location: truck.currentLocation,
              timestamp: new Date().toISOString(),
            },
            ...(existing.handoffHistory || []),
          ]
        : existing.handoffHistory || [],
  };
  writeStoredJson(shippingFleetStorageKey, fleet);
  writeStoredJson(shippingContainerStorageKey, containers);
}

export function addShippingContainerEvent(
  bookingId: string,
  type: ShippingContainerEventType,
  location: string,
  note: string,
) {
  const requests = readSharedQuoteRequests([]);
  const request = requests.find((entry) => entry.bookingId === bookingId);
  if (!request?.bookingId) return;
  const containers = readStoredJson<ShippingContainerOverrides>(shippingContainerStorageKey, {});
  const existing = containers[bookingId] || defaultContainerMovement(request);
  const statusMap: Record<ShippingContainerEventType, string> = {
    BOOKED: 'Booked',
    EMPTY_RELEASED: 'Empty released',
    EMPTY_PICKUP: 'Empty picked up',
    LOADED_AT_SHIPPER: 'Loaded at shipper',
    GATE_IN_AT_PORT: 'Gate-in at port',
    LOADED_ON_VESSEL: 'Loaded on vessel',
    VESSEL_DEPARTED: 'Vessel departed',
    TRANSSHIPMENT: 'Transshipment',
    VESSEL_ARRIVED: 'Vessel arrived',
    DISCHARGED_FROM_VESSEL: 'Discharged from vessel',
    AVAILABLE_FOR_CLEARANCE: 'Available for clearance',
    CUSTOMS_CLEARED: 'Customs cleared',
    TRUCK_ASSIGNED: 'Truck assigned',
    OUT_FOR_DELIVERY: 'Out for delivery',
    ARRIVED_INLAND: 'Arrived inland',
    YARD_HANDOFF: 'Awaiting unload handoff',
    UNLOADED_INLAND: 'Awaiting consignee handoff',
    HANDOFF: 'Handoff recorded',
    IN_TRANSIT: 'In transit',
    ARRIVED: 'Arrived inland',
    EMPTY_RETURN_STARTED: 'Empty return in progress',
    EMPTY_RETURNED: 'Empty returned',
  };
  const stageMap: Record<ShippingContainerEventType, string> = {
    BOOKED: 'Booking confirmed',
    EMPTY_RELEASED: 'Empty release',
    EMPTY_PICKUP: 'Container pickup',
    LOADED_AT_SHIPPER: 'Loaded at shipper',
    GATE_IN_AT_PORT: 'Gate-in at port',
    LOADED_ON_VESSEL: 'Loaded on vessel',
    VESSEL_DEPARTED: 'Vessel departed',
    TRANSSHIPMENT: 'Transshipment',
    VESSEL_ARRIVED: 'Vessel arrived',
    DISCHARGED_FROM_VESSEL: 'Discharged from vessel',
    AVAILABLE_FOR_CLEARANCE: 'Available for clearance',
    CUSTOMS_CLEARED: 'Customs cleared',
    TRUCK_ASSIGNED: 'Truck assigned',
    OUT_FOR_DELIVERY: 'Out for delivery',
    ARRIVED_INLAND: 'Arrived inland',
    YARD_HANDOFF: 'Yard handoff',
    UNLOADED_INLAND: 'Unloaded inland',
    HANDOFF: 'Handoff recorded',
    IN_TRANSIT: 'In transit',
    ARRIVED: 'Delivered inland',
    EMPTY_RETURN_STARTED: 'Empty return in progress',
    EMPTY_RETURNED: 'Empty return complete',
  };
  const holderMap: Record<ShippingContainerEventType, string> = {
    BOOKED: 'Origin shipping desk',
    EMPTY_RELEASED: 'Depot control',
    EMPTY_PICKUP: existing.assignedDriverName || 'Pickup driver',
    LOADED_AT_SHIPPER: 'Shipper warehouse',
    GATE_IN_AT_PORT: 'Origin terminal',
    LOADED_ON_VESSEL: existing.carrierName || 'Carrier vessel',
    VESSEL_DEPARTED: existing.carrierName || 'Carrier vessel',
    TRANSSHIPMENT: 'Transshipment terminal',
    VESSEL_ARRIVED: 'Djibouti terminal',
    DISCHARGED_FROM_VESSEL: 'Djibouti terminal',
    AVAILABLE_FOR_CLEARANCE: 'Clearance desk',
    CUSTOMS_CLEARED: 'Dispatch control',
    TRUCK_ASSIGNED: existing.assignedDriverName || 'Assigned driver',
    OUT_FOR_DELIVERY: existing.assignedDriverName || 'Delivery driver',
    ARRIVED_INLAND: existing.assignedDriverName || 'Dry-port gate',
    YARD_HANDOFF: 'Dry-port yard',
    UNLOADED_INLAND: 'Dry-port yard',
    HANDOFF: 'Operations handoff',
    IN_TRANSIT: existing.assignedDriverName || 'Transit driver',
    ARRIVED: 'Customer / inland yard',
    EMPTY_RETURN_STARTED: 'Return driver',
    EMPTY_RETURNED: 'Djibouti empty depot',
  };
  const locationMap: Record<ShippingContainerEventType, { lat: number; lng: number }> = {
    BOOKED: { lat: 31.2156, lng: 121.491 },
    EMPTY_RELEASED: { lat: 31.2156, lng: 121.491 },
    EMPTY_PICKUP: { lat: 31.208, lng: 121.478 },
    LOADED_AT_SHIPPER: { lat: 31.189, lng: 121.455 },
    GATE_IN_AT_PORT: { lat: 31.24, lng: 121.505 },
    LOADED_ON_VESSEL: { lat: 31.26, lng: 121.56 },
    VESSEL_DEPARTED: { lat: 23.4, lng: 60.5 },
    TRANSSHIPMENT: { lat: 12.1, lng: 43.1 },
    VESSEL_ARRIVED: { lat: 11.595, lng: 43.148 },
    DISCHARGED_FROM_VESSEL: { lat: 11.595, lng: 43.148 },
    AVAILABLE_FOR_CLEARANCE: { lat: 11.595, lng: 43.148 },
    CUSTOMS_CLEARED: { lat: 11.595, lng: 43.148 },
    TRUCK_ASSIGNED: { lat: 11.595, lng: 43.148 },
    OUT_FOR_DELIVERY: { lat: 10.902, lng: 41.899 },
    ARRIVED_INLAND: { lat: 8.54, lng: 39.27 },
    YARD_HANDOFF: { lat: 8.54, lng: 39.27 },
    UNLOADED_INLAND: { lat: 8.54, lng: 39.27 },
    HANDOFF: { lat: 11.595, lng: 43.148 },
    IN_TRANSIT: { lat: 11.716, lng: 41.84 },
    ARRIVED: { lat: 8.54, lng: 39.27 },
    EMPTY_RETURN_STARTED: { lat: 10.902, lng: 41.899 },
    EMPTY_RETURNED: { lat: 11.595, lng: 43.148 },
  };
  const actualReturnDate = type === 'EMPTY_RETURNED' ? new Date().toISOString() : existing.actualReturnDate;
  const expectedReturnTime = existing.expectedReturnDate ? new Date(existing.expectedReturnDate).getTime() : NaN;
  const actualReturnTime = actualReturnDate ? new Date(actualReturnDate).getTime() : NaN;
  const returnDelayDays =
    type === 'EMPTY_RETURNED' && !Number.isNaN(expectedReturnTime) && !Number.isNaN(actualReturnTime)
      ? Math.max(Math.ceil((actualReturnTime - expectedReturnTime) / 86400000), 0)
      : existing.returnDelayDays || 0;
  containers[bookingId] = {
    ...existing,
    currentStatus: statusMap[type],
    currentLocation: location,
    currentHolder: holderMap[type],
    lifecycleStage: stageMap[type],
    actualReturnDate,
    returnDelayDays,
    demurragePenaltyAmount: returnDelayDays * 45,
    currentLatitude: locationMap[type].lat,
    currentLongitude: locationMap[type].lng,
    events: [
      {
        id: `${bookingId}-evt-${Date.now()}`,
        type,
        location,
        note,
        timestamp: new Date().toISOString(),
        truckId: existing.assignedTruckId,
        driverName: existing.assignedDriverName,
      },
      ...existing.events,
    ],
    handoffHistory: existing.handoffHistory || [],
  };
  writeStoredJson(shippingContainerStorageKey, containers);
}

export function createShippingIncident(
  bookingId: string,
  title: string,
  description: string,
  severity: ShippingIncidentSeverity,
) {
  const requests = readSharedQuoteRequests([]);
  const request = requests.find((entry) => entry.bookingId === bookingId);
  if (!request?.bookingId) return;
  const containers = readStoredJson<ShippingContainerOverrides>(shippingContainerStorageKey, {});
  const incidents = readStoredJson<ShippingIncidentOverrides>(shippingIncidentStorageKey, {});
  const movement = containers[bookingId] || defaultContainerMovement(request);
  const nextIncident: ShippingIncidentRecord = {
    id: `incident-${bookingId}-${Date.now()}`,
    bookingId,
    containerNumber: movement.containerNumber,
    customerName: request.customerName,
    title,
    description,
    severity,
    status: 'open',
    createdAt: new Date().toISOString(),
  };
  incidents[bookingId] = [nextIncident, ...(incidents[bookingId] || [])];
  writeStoredJson(shippingIncidentStorageKey, incidents);
}

export function resolveShippingIncident(incidentId: string) {
  const current = readStoredJson<ShippingIncidentOverrides>(shippingIncidentStorageKey, {});
  let changed = false;
  Object.keys(current).forEach((bookingId) => {
    current[bookingId] = (current[bookingId] || []).map((incident) => {
      if (incident.id !== incidentId) return incident;
      changed = true;
      return { ...incident, status: 'resolved' };
    });
  });
  if (changed) writeStoredJson(shippingIncidentStorageKey, current);
}

export function resolveShippingAfterSalesCase(bookingId: string) {
  const current = readStoredJson<ShippingAfterSalesOverrides>(shippingAfterSalesStorageKey, {});
  current[bookingId] = {
    ...(current[bookingId] || {}),
    status: 'resolved',
    resolvedAt: new Date().toISOString(),
    nextAction: 'After-sales case resolved and archived.',
  };
  writeStoredJson(shippingAfterSalesStorageKey, current);
}

export function rateShippingAfterSalesCase(bookingId: string, rating: number) {
  const current = readStoredJson<ShippingAfterSalesOverrides>(shippingAfterSalesStorageKey, {});
  current[bookingId] = {
    ...(current[bookingId] || {}),
    rating,
    status: 'resolved',
    resolvedAt: new Date().toISOString(),
    nextAction: 'Customer feedback captured and after-sales loop is closed.',
  };
  writeStoredJson(shippingAfterSalesStorageKey, current);
}

export function formatCorridorMilestoneLabel(value: string) {
  const normalized = String(value || '').trim();
  if (!normalized) return 'Pending';
  const lower = normalized.toLowerCase();
  if (lower === 'booked') return 'Booked (BOOKING)';
  if (lower === 'empty release' || lower === 'empty released') return 'Empty release (EMPTY_OUT)';
  if (lower === 'empty pickup' || lower === 'container pickup') return 'Container pickup (EMPTY_OUT)';
  if (lower === 'loaded at shipper') return 'Loaded at shipper (FULL_OUT)';
  if (lower === 'gate-in at port') return 'Gate-in at port (FULL_OUT)';
  if (lower === 'loaded on vessel') return 'Loaded on vessel (FULL_OUT)';
  if (lower === 'vessel departed') return 'Vessel departed (FULL_OUT)';
  if (lower === 'transshipment') return 'Transshipment (FULL_OUT)';
  if (lower === 'vessel arrived') return 'Vessel arrived (FULL_OUT)';
  if (lower === 'discharged' || lower === 'discharged from vessel') return 'Discharged (FULL_OUT)';
  if (lower === 'available for clearance') return 'Available for clearance (FULL_OUT)';
  if (lower === 'customs cleared') return 'Customs cleared (FULL_OUT)';
  if (lower === 'truck assigned') return 'Truck assigned (FULL_OUT)';
  if (lower === 'out for delivery' || lower === 'in transit') return 'Out for delivery (FULL_OUT)';
  if (lower === 'handoff' || lower === 'record handoff') return 'Handoff (FULL_OUT)';
  if (lower === 'arrived inland') return 'Arrived inland (FULL_IN)';
  if (lower === 'arrived at gate') return 'Arrived at gate (FULL_IN)';
  if (lower === 'awaiting unload') return 'Awaiting unload (FULL_IN)';
  if (lower === 'awaiting unload handoff') return 'Awaiting unload handoff (FULL_IN)';
  if (lower === 'yard handoff') return 'Yard handoff (FULL_IN)';
  if (lower === 'unloaded inland') return 'Unloaded inland (FULL_IN)';
  if (lower === 'pod complete') return 'POD complete (FULL_OUT)';
  if (lower === 'ready for pickup') return 'Ready for pickup (FULL_OUT)';
  if (lower === 'awaiting consignee handoff') return 'Awaiting consignee handoff (FULL_OUT)';
  if (lower === 'ready for empty release') return 'Ready for empty release (EMPTY_IN)';
  if (lower === 'empty in return transit') return 'Empty in return transit (EMPTY_OUT)';
  if (lower === 'empty return in progress') return 'Empty return in progress (EMPTY_OUT)';
  if (lower === 'empty returned') return 'Empty returned (EMPTY_RETURNED)';
  if (lower === 'closure pending') return 'Closure pending (EMPTY_RETURNED)';
  if (lower === 'cycle closed') return 'Cycle closed (EMPTY_RETURNED)';
  return normalized.replace(/_/g, ' ');
}
