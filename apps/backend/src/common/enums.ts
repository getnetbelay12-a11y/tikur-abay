export const vehicleStatuses = [
  'available',
  'assigned',
  'under_maintenance',
  'breakdown',
  'inactive',
] as const;

export const tripStatuses = [
  'available',
  'assigned',
  'loading',
  'loaded',
  'in_transit',
  'at_border',
  'in_djibouti',
  'offloading',
  'completed',
  'delayed',
  'breakdown',
  'under_maintenance',
] as const;

export const agreementStatuses = [
  'draft',
  'under_review',
  'sent_to_customer',
  'approved',
  'signed',
  'expired',
  'renewed',
] as const;

export const paymentStatuses = [
  'draft',
  'pending',
  'partially_paid',
  'paid',
  'overdue',
  'cancelled',
] as const;

export const documentCategories = [
  'customer_legal',
  'customer_identity',
  'driver_license',
  'driver_identity',
  'vehicle_registration',
  'vehicle_insurance',
  'inspection',
  'maintenance',
  'trip_document',
  'invoice',
  'proof_of_delivery',
  'agreement',
  'photo',
] as const;

export type VehicleStatus = (typeof vehicleStatuses)[number];
export type TripStatus = (typeof tripStatuses)[number];
export type AgreementStatus = (typeof agreementStatuses)[number];
export type PaymentStatus = (typeof paymentStatuses)[number];
export type DocumentCategory = (typeof documentCategories)[number];

export const corridorServiceModes = ['multimodal', 'unimodal'] as const;

export const corridorShipmentStatuses = [
  'draft',
  'booked',
  'origin_ready',
  'export_handoff',
  'at_sea',
  'arrived_djibouti',
  'under_clearance',
  'released_for_transit',
  'inland_in_transit',
  'at_dry_port',
  'under_delivery',
  'delivered',
  'empty_return_pending',
  'closed',
] as const;

export const corridorContainerStatuses = [
  'not_assigned',
  'assigned',
  'stuffed',
  'gated_in_origin',
  'loaded_on_vessel',
  'discharged',
  'held',
  'released',
  'gated_out',
  'in_corridor',
  'arrived_inland',
  'unloaded',
  'empty_released',
  'empty_returned',
  'cycle_closed',
] as const;

export const corridorBlStatuses = ['draft', 'under_review', 'approved', 'issued', 'amended', 'cancelled'] as const;
export const corridorPackingListStatuses = ['draft', 'uploaded', 'validated', 'rejected'] as const;
export const corridorInvoiceStatuses = ['draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled'] as const;
export const corridorTransitStatuses = ['draft', 'submitted', 'approved', 'held', 'released', 'expired', 'closed'] as const;
export const corridorCustomsStatuses = ['not_started', 'pre_filed', 'submitted', 'under_review', 'inspection_required', 'hold', 'released', 'exited'] as const;
export const corridorMovementStatuses = ['not_ready', 'ready', 'gated_out', 'checkpoint_pending', 'in_transit', 'arrived_destination', 'closed'] as const;
export const corridorInspectionStatuses = ['not_selected', 'pending', 'under_inspection', 'cleared', 'exception_found'] as const;
export const corridorExceptionStatuses = ['open', 'in_progress', 'blocked', 'resolved', 'closed'] as const;
export const corridorTripStatuses = ['assigned', 'dispatched', 'at_gate', 'in_transit', 'delayed', 'arrived', 'unloading', 'completed', 'cancelled'] as const;
export const corridorEmptyReturnStatuses = ['not_started', 'empty_released', 'in_return_transit', 'returned', 'detention_closed', 'closed'] as const;
export const corridorSupportStatuses = ['open', 'waiting_customer', 'waiting_operations', 'escalated', 'resolved', 'closed'] as const;
export const corridorPaymentStatuses = ['pending', 'partial', 'paid', 'failed', 'reversed'] as const;
export const corridorTransitDocumentSubtypes = ['t1', 'tir', 'national_transit_declaration', 'customs_transit_permit', 'bond_transit_file', 'other'] as const;
export const corridorExceptionTypes = [
  'missing_document',
  'customs_hold',
  'line_release_pending',
  'storage_risk',
  'detention_risk',
  'seal_mismatch',
  'package_shortage',
  'package_damage',
  'route_delay',
  'inspection_delay',
  'unloading_variance',
  'empty_return_overdue',
  'accident',
  'fuel_issue',
  'tire_issue',
] as const;

export type CorridorServiceMode = (typeof corridorServiceModes)[number];
export type CorridorShipmentStatus = (typeof corridorShipmentStatuses)[number];
export type CorridorContainerStatus = (typeof corridorContainerStatuses)[number];
export type CorridorBlStatus = (typeof corridorBlStatuses)[number];
export type CorridorPackingListStatus = (typeof corridorPackingListStatuses)[number];
export type CorridorInvoiceStatus = (typeof corridorInvoiceStatuses)[number];
export type CorridorTransitDocumentStatus = (typeof corridorTransitStatuses)[number];
export type CorridorCustomsStatus = (typeof corridorCustomsStatuses)[number];
export type CorridorMovementStatus = (typeof corridorMovementStatuses)[number];
export type CorridorInspectionStatus = (typeof corridorInspectionStatuses)[number];
export type CorridorExceptionStatus = (typeof corridorExceptionStatuses)[number];
export type CorridorTripStatus = (typeof corridorTripStatuses)[number];
export type CorridorEmptyReturnStatus = (typeof corridorEmptyReturnStatuses)[number];
export type CorridorSupportStatus = (typeof corridorSupportStatuses)[number];
export type CorridorPaymentStatus = (typeof corridorPaymentStatuses)[number];
export type CorridorTransitDocumentSubtype = (typeof corridorTransitDocumentSubtypes)[number];
export type CorridorExceptionType = (typeof corridorExceptionTypes)[number];
