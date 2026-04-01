"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.corridorExceptionTypes = exports.corridorTransitDocumentSubtypes = exports.corridorPaymentStatuses = exports.corridorSupportStatuses = exports.corridorEmptyReturnStatuses = exports.corridorTripStatuses = exports.corridorExceptionStatuses = exports.corridorInspectionStatuses = exports.corridorMovementStatuses = exports.corridorCustomsStatuses = exports.corridorTransitStatuses = exports.corridorInvoiceStatuses = exports.corridorPackingListStatuses = exports.corridorBlStatuses = exports.corridorContainerStatuses = exports.corridorShipmentStatuses = exports.corridorServiceModes = exports.documentCategories = exports.paymentStatuses = exports.agreementStatuses = exports.tripStatuses = exports.vehicleStatuses = void 0;
exports.vehicleStatuses = [
    'available',
    'assigned',
    'under_maintenance',
    'breakdown',
    'inactive',
];
exports.tripStatuses = [
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
];
exports.agreementStatuses = [
    'draft',
    'under_review',
    'sent_to_customer',
    'approved',
    'signed',
    'expired',
    'renewed',
];
exports.paymentStatuses = [
    'draft',
    'pending',
    'partially_paid',
    'paid',
    'overdue',
    'cancelled',
];
exports.documentCategories = [
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
];
exports.corridorServiceModes = ['multimodal', 'unimodal'];
exports.corridorShipmentStatuses = [
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
];
exports.corridorContainerStatuses = [
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
];
exports.corridorBlStatuses = ['draft', 'under_review', 'approved', 'issued', 'amended', 'cancelled'];
exports.corridorPackingListStatuses = ['draft', 'uploaded', 'validated', 'rejected'];
exports.corridorInvoiceStatuses = ['draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled'];
exports.corridorTransitStatuses = ['draft', 'submitted', 'approved', 'held', 'released', 'expired', 'closed'];
exports.corridorCustomsStatuses = ['not_started', 'pre_filed', 'submitted', 'under_review', 'inspection_required', 'hold', 'released', 'exited'];
exports.corridorMovementStatuses = ['not_ready', 'ready', 'gated_out', 'checkpoint_pending', 'in_transit', 'arrived_destination', 'closed'];
exports.corridorInspectionStatuses = ['not_selected', 'pending', 'under_inspection', 'cleared', 'exception_found'];
exports.corridorExceptionStatuses = ['open', 'in_progress', 'blocked', 'resolved', 'closed'];
exports.corridorTripStatuses = ['assigned', 'dispatched', 'at_gate', 'in_transit', 'delayed', 'arrived', 'unloading', 'completed', 'cancelled'];
exports.corridorEmptyReturnStatuses = ['not_started', 'empty_released', 'in_return_transit', 'returned', 'detention_closed', 'closed'];
exports.corridorSupportStatuses = ['open', 'waiting_customer', 'waiting_operations', 'escalated', 'resolved', 'closed'];
exports.corridorPaymentStatuses = ['pending', 'partial', 'paid', 'failed', 'reversed'];
exports.corridorTransitDocumentSubtypes = ['t1', 'tir', 'national_transit_declaration', 'customs_transit_permit', 'bond_transit_file', 'other'];
exports.corridorExceptionTypes = [
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
];
//# sourceMappingURL=enums.js.map