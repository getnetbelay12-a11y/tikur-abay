import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';

const financeTemplates = new Set([
  'payment_reminder',
  'payment_thank_you',
  'payment_receipt',
  'overdue_invoice_notice',
]);

const operationsTemplates = new Set([
  'trip_delay_update',
  'dispatch_follow_up',
  'maintenance_escalation',
  'customs_release_update',
  'release_ready_notice',
  'arrival_confirmation',
  'arrival_notice',
  'pod_uploaded_notice',
  'shipment_delivery_thank_you',
  'empty_return_overdue_alert',
  'empty_return_overdue_notice',
  'shipment_exception_alert',
  'missing_document_alert',
]);

const driverTemplates = new Set([
  'kyc_reminder',
  'kyc_approved',
  'kyc_rejected',
  'document_resubmission_notice',
  'driver_trip_assignment',
]);

const supportTemplates = new Set([
  'support_acknowledgement',
  'support_reply',
  'support_update',
  'custom_message',
]);

const financeRoles = new Set(['finance_customs_control', 'finance_officer']);
const dispatchRoles = new Set(['corridor_dispatch_agent', 'operations_manager', 'dispatcher']);
const yardRoles = new Set(['dry_port_yard_agent']);
const releaseRoles = new Set(['djibouti_release_agent']);
const clearanceRoles = new Set(['djibouti_clearing_agent']);
const supplierRoles = new Set(['supplier_agent']);
const supportRoles = new Set(['customer_support_agent']);
const commercialRoles = new Set(['marketing_officer', 'operations_manager', 'supplier_agent']);
const supervisorRoles = new Set(['super_admin', 'executive_supervisor', 'executive']);

function normalizeRole(user?: Partial<AuthenticatedUser> | null) {
  return String(user?.role || '').trim().toLowerCase();
}

export function canSendCommunication(
  user: Partial<AuthenticatedUser> | null | undefined,
  templateKey?: string,
  entityType?: string,
) {
  const role = normalizeRole(user);
  if (!role) return false;
  if (supervisorRoles.has(role) || (user?.permissions || []).includes('*')) return true;

  const cleanTemplate = String(templateKey || '').trim().toLowerCase();
  const cleanEntity = String(entityType || '').trim().toLowerCase();

  if (financeTemplates.has(cleanTemplate)) {
    return financeRoles.has(role);
  }

  if (supportTemplates.has(cleanTemplate)) {
    if (cleanTemplate === 'custom_message' && ['custom', 'quote', 'booking'].includes(cleanEntity)) {
      return supportRoles.has(role) || supplierRoles.has(role) || releaseRoles.has(role) || clearanceRoles.has(role) || commercialRoles.has(role);
    }
    return supportRoles.has(role) || supplierRoles.has(role) || releaseRoles.has(role) || clearanceRoles.has(role);
  }

  if (driverTemplates.has(cleanTemplate)) {
    return financeRoles.has(role) || supportRoles.has(role) || role === 'hr_officer' || dispatchRoles.has(role);
  }

  if (operationsTemplates.has(cleanTemplate)) {
    if (cleanTemplate === 'customs_release_update' || cleanTemplate === 'release_ready_notice') {
      return releaseRoles.has(role) || clearanceRoles.has(role) || financeRoles.has(role);
    }
    if (cleanTemplate === 'arrival_confirmation' || cleanTemplate === 'arrival_notice' || cleanTemplate === 'pod_uploaded_notice' || cleanTemplate === 'shipment_delivery_thank_you' || cleanTemplate === 'empty_return_overdue_alert' || cleanTemplate === 'empty_return_overdue_notice') {
      return yardRoles.has(role) || dispatchRoles.has(role);
    }
    if (cleanTemplate === 'trip_delay_update' || cleanTemplate === 'dispatch_follow_up' || cleanTemplate === 'maintenance_escalation') {
      return dispatchRoles.has(role);
    }
    if (cleanTemplate === 'missing_document_alert') {
      return supplierRoles.has(role) || releaseRoles.has(role) || clearanceRoles.has(role) || supportRoles.has(role);
    }
    if (cleanTemplate === 'shipment_exception_alert') {
      return dispatchRoles.has(role) || yardRoles.has(role) || releaseRoles.has(role) || clearanceRoles.has(role);
    }
  }

  if (cleanEntity === 'finance' || cleanEntity === 'invoice' || cleanEntity === 'payment') {
    return financeRoles.has(role);
  }
  if (cleanEntity === 'trip') {
    return dispatchRoles.has(role) || yardRoles.has(role);
  }
  if (cleanEntity === 'shipment') {
    return supplierRoles.has(role) || releaseRoles.has(role) || clearanceRoles.has(role) || dispatchRoles.has(role) || yardRoles.has(role) || financeRoles.has(role) || supportRoles.has(role);
  }
  if (cleanEntity === 'quote' || cleanEntity === 'booking' || cleanEntity === 'custom') {
    return commercialRoles.has(role) || supportRoles.has(role) || releaseRoles.has(role) || clearanceRoles.has(role);
  }
  if (cleanEntity === 'support') {
    return supportRoles.has(role);
  }
  if (cleanEntity === 'driver_kyc_request' || cleanEntity === 'kyc') {
    return role === 'hr_officer' || supportRoles.has(role);
  }

  return false;
}

export function assertCanSendCommunication(
  user: Partial<AuthenticatedUser> | null | undefined,
  templateKey?: string,
  entityType?: string,
) {
  if (!canSendCommunication(user, templateKey, entityType)) {
    throw new ForbiddenException('You are not allowed to send this communication');
  }
}

export function canViewCommunicationHistory(
  user: Partial<AuthenticatedUser> | null | undefined,
  entityType?: string,
) {
  const role = normalizeRole(user);
  if (!role) return false;
  if (supervisorRoles.has(role) || (user?.permissions || []).includes('*')) return true;
  if (financeRoles.has(role) && ['finance', 'invoice', 'payment'].includes(String(entityType || '').toLowerCase())) return true;
  if (dispatchRoles.has(role) && ['shipment', 'trip'].includes(String(entityType || '').toLowerCase())) return true;
  if (yardRoles.has(role) && ['shipment', 'trip'].includes(String(entityType || '').toLowerCase())) return true;
  if (releaseRoles.has(role) && ['shipment'].includes(String(entityType || '').toLowerCase())) return true;
  if (supportRoles.has(role) && ['support', 'shipment'].includes(String(entityType || '').toLowerCase())) return true;
  if (role === 'hr_officer' && ['driver_kyc_request', 'kyc'].includes(String(entityType || '').toLowerCase())) return true;
  return false;
}

export function assertCanViewCommunicationHistory(
  user: Partial<AuthenticatedUser> | null | undefined,
  entityType?: string,
) {
  if (!canViewCommunicationHistory(user, entityType)) {
    throw new ForbiddenException('You are not allowed to view this communication history');
  }
}
