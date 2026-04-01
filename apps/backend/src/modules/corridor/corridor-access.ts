import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import type {
  CorridorActionAuthorizationRule,
  CorridorNormalizedShipmentStage,
  CorridorRole,
  CorridorStageOwnershipRule,
  CorridorVisibilityScope,
} from './corridor.types';

export type CorridorActorContext = {
  userId?: string;
  name?: string;
  phone?: string;
  role: CorridorRole;
  customerCode?: string;
  mobileRole?: string;
  permissions: string[];
};

export const roleAliases: Record<string, CorridorRole> = {
  admin: 'super_admin',
  supervisor: 'executive_supervisor',
  executive: 'executive_supervisor',
  operations_manager: 'executive_supervisor',
  supplier_external_agent: 'supplier_external_agent',
  origin_coordinator: 'supplier_agent',
  dispatch_agent: 'corridor_dispatch_agent',
  yard_agent: 'dry_port_yard_agent',
  finance_agent: 'finance_customs_control',
  document_control_agent: 'finance_customs_control',
  customer_user: 'customer_user',
  customer: 'customer_user',
  driver: 'internal_driver',
};

export const roleScopes: Record<CorridorRole, CorridorVisibilityScope[]> = {
  super_admin: ['internal_only', 'customer_visible', 'driver_visible', 'supplier_visible', 'djibouti_visible', 'yard_visible', 'finance_visible', 'supervisor_visible'],
  executive_supervisor: ['internal_only', 'customer_visible', 'driver_visible', 'supplier_visible', 'djibouti_visible', 'yard_visible', 'finance_visible', 'supervisor_visible'],
  supplier_agent: ['supplier_visible', 'customer_visible'],
  supplier_external_agent: ['supplier_visible'],
  origin_coordinator: ['supplier_visible'],
  djibouti_release_agent: ['djibouti_visible', 'customer_visible'],
  djibouti_clearing_agent: ['djibouti_visible'],
  corridor_dispatch_agent: ['internal_only', 'driver_visible', 'customer_visible'],
  dispatch_agent: ['internal_only', 'driver_visible'],
  dry_port_yard_agent: ['yard_visible', 'customer_visible'],
  yard_agent: ['yard_visible'],
  finance_customs_control: ['finance_visible', 'customer_visible'],
  finance_agent: ['finance_visible'],
  document_control_agent: ['finance_visible'],
  customer_support_agent: ['customer_visible', 'internal_only'],
  customer_user: ['customer_visible'],
  customer_agent: ['customer_visible'],
  internal_driver: ['driver_visible'],
  external_driver: ['driver_visible'],
  driver: ['driver_visible'],
  supervisor: ['internal_only', 'customer_visible', 'driver_visible', 'supplier_visible', 'djibouti_visible', 'yard_visible', 'finance_visible', 'supervisor_visible'],
  admin: ['internal_only', 'customer_visible', 'driver_visible', 'supplier_visible', 'djibouti_visible', 'yard_visible', 'finance_visible', 'supervisor_visible'],
};

export const stageOwnership: Record<CorridorNormalizedShipmentStage, CorridorRole[]> = {
  booking_quote: ['supplier_agent', 'supplier_external_agent', 'executive_supervisor', 'super_admin'],
  origin_preparation: ['supplier_agent', 'supplier_external_agent', 'executive_supervisor', 'super_admin'],
  ocean_in_transit: ['supplier_agent', 'executive_supervisor', 'super_admin'],
  djibouti_release: ['djibouti_release_agent', 'finance_customs_control', 'executive_supervisor', 'super_admin'],
  transitor_clearance: ['djibouti_clearing_agent', 'finance_customs_control', 'executive_supervisor', 'super_admin'],
  inland_dispatch: ['corridor_dispatch_agent', 'internal_driver', 'external_driver', 'executive_supervisor', 'super_admin'],
  inland_arrival: ['dry_port_yard_agent', 'internal_driver', 'external_driver', 'executive_supervisor', 'super_admin'],
  yard_processing: ['dry_port_yard_agent', 'internal_driver', 'external_driver', 'executive_supervisor', 'super_admin'],
  delivery_pod: ['dry_port_yard_agent', 'customer_user', 'customer_agent', 'customer_support_agent', 'executive_supervisor', 'super_admin'],
  empty_return: ['dry_port_yard_agent', 'internal_driver', 'external_driver', 'customer_user', 'customer_agent', 'customer_support_agent', 'executive_supervisor', 'super_admin'],
  closed: ['dry_port_yard_agent', 'executive_supervisor', 'super_admin'],
};

export const actionAuthorization: Record<string, CorridorRole[]> = {
  mark_stuffing_confirmed: ['supplier_agent', 'supplier_external_agent', 'executive_supervisor', 'super_admin'],
  mark_gate_in_confirmed: ['supplier_agent', 'supplier_external_agent', 'executive_supervisor', 'super_admin'],
  mark_origin_ready: ['supplier_agent', 'executive_supervisor', 'super_admin'],
  confirm_discharge: ['djibouti_release_agent', 'executive_supervisor', 'super_admin'],
  mark_line_release: ['djibouti_release_agent', 'executive_supervisor', 'super_admin'],
  mark_customs_cleared: ['djibouti_release_agent', 'finance_customs_control', 'executive_supervisor', 'super_admin'],
  mark_gate_out_ready: ['djibouti_release_agent', 'executive_supervisor', 'super_admin'],
  push_to_dispatch: ['djibouti_release_agent', 'executive_supervisor', 'super_admin'],
  create_trip: ['corridor_dispatch_agent', 'executive_supervisor', 'super_admin'],
  assign_driver: ['corridor_dispatch_agent', 'executive_supervisor', 'super_admin'],
  assign_vehicle: ['corridor_dispatch_agent', 'executive_supervisor', 'super_admin'],
  mark_departed: ['corridor_dispatch_agent', 'executive_supervisor', 'super_admin'],
  push_transit_pack: ['corridor_dispatch_agent', 'executive_supervisor', 'super_admin'],
  handoff_to_yard: ['corridor_dispatch_agent', 'executive_supervisor', 'super_admin'],
  checkpoint_update: ['internal_driver', 'external_driver', 'executive_supervisor', 'super_admin'],
  report_issue: ['internal_driver', 'external_driver', 'corridor_dispatch_agent', 'executive_supervisor', 'super_admin'],
  confirm_arrival: ['internal_driver', 'external_driver', 'dry_port_yard_agent', 'executive_supervisor', 'super_admin'],
  confirm_unload: ['internal_driver', 'dry_port_yard_agent', 'executive_supervisor', 'super_admin'],
  start_empty_return: ['internal_driver', 'external_driver', 'dry_port_yard_agent', 'executive_supervisor', 'super_admin'],
  confirm_empty_return: ['internal_driver', 'external_driver', 'dry_port_yard_agent', 'executive_supervisor', 'super_admin'],
  confirm_inland_arrival: ['internal_driver', 'external_driver', 'dry_port_yard_agent', 'executive_supervisor', 'super_admin'],
  start_unload: ['dry_port_yard_agent', 'executive_supervisor', 'super_admin'],
  complete_unload: ['internal_driver', 'external_driver', 'dry_port_yard_agent', 'executive_supervisor', 'super_admin'],
  assign_storage: ['dry_port_yard_agent', 'executive_supervisor', 'super_admin'],
  capture_pod: ['dry_port_yard_agent', 'executive_supervisor', 'super_admin'],
  confirm_customer_receipt: ['customer_user', 'customer_agent', 'customer_support_agent', 'dry_port_yard_agent', 'executive_supervisor', 'super_admin'],
  mark_empty_released: ['internal_driver', 'external_driver', 'dry_port_yard_agent', 'executive_supervisor', 'super_admin'],
  mark_empty_returned: ['internal_driver', 'external_driver', 'dry_port_yard_agent', 'executive_supervisor', 'super_admin'],
  close_cycle: ['dry_port_yard_agent', 'executive_supervisor', 'super_admin'],
  clear_finance_block: ['finance_customs_control', 'executive_supervisor', 'super_admin'],
  update_tax_duty_status: ['finance_customs_control', 'executive_supervisor', 'super_admin'],
};

export function normalizeCorridorRole(role?: string, mobileRole?: string): CorridorRole {
  const baseRole = String(mobileRole || role || 'customer_user').trim() as CorridorRole;
  return roleAliases[baseRole] ?? baseRole;
}

export function corridorActorFromRequest(user?: AuthenticatedUser, query?: Record<string, unknown>): CorridorActorContext {
  if (user) {
    return {
      userId: user.id,
      name: user.name,
      phone: user.phone,
      role: normalizeCorridorRole(user.role, user.mobileRole),
      customerCode: user.customerCode,
      mobileRole: user.mobileRole,
      permissions: user.permissions ?? [],
    };
  }

  const role = normalizeCorridorRole(
    typeof query?.role === 'string' ? query.role : undefined,
    typeof query?.mobileRole === 'string' ? query.mobileRole : undefined,
  );

  return {
    userId: typeof query?.userId === 'string' ? query.userId : undefined,
    name: typeof query?.name === 'string' ? query.name : undefined,
    phone: typeof query?.phone === 'string' ? query.phone : undefined,
    role,
    customerCode: typeof query?.customerCode === 'string' ? query.customerCode : undefined,
    mobileRole: typeof query?.mobileRole === 'string' ? query.mobileRole : undefined,
    permissions: role === 'super_admin' || role === 'executive_supervisor' ? ['*'] : [],
  };
}

export function canViewScope(actor: CorridorActorContext, scope?: string): boolean {
  if (!scope) return true;
  if (actor.permissions.includes('*')) return true;
  const allowed = roleScopes[actor.role] ?? [];
  return allowed.includes(scope as CorridorVisibilityScope);
}

export function canViewShipment(actor: CorridorActorContext, shipment: Record<string, any>, accessRows: Array<Record<string, any>> = []): boolean {
  if (actor.permissions.includes('*')) return true;
  if (['super_admin', 'executive_supervisor'].includes(actor.role)) return true;
  if (['customer_user', 'customer_agent'].includes(actor.role)) {
    return Boolean(
      actor.customerCode &&
      [shipment.customerId, shipment.customerCode]
        .filter((value) => value !== undefined && value !== null && value !== '')
        .some((value) => String(value) === String(actor.customerCode)),
    );
  }
  if (['internal_driver', 'external_driver'].includes(actor.role)) {
    return accessRows.some(
      (row) =>
        row.role === actor.role &&
        (
          row.actorUserId === actor.userId ||
          row.actorCode === actor.userId ||
          (actor.phone && row.actorCode === actor.phone) ||
          (actor.name && row.actorName === actor.name)
        ),
    );
  }
  if (accessRows.some((row) => row.role === actor.role && (row.actorUserId === actor.userId || !row.actorUserId))) {
    return true;
  }
  const normalizedStage = normalizeShipmentStage(
    shipment.currentStage || shipment.clearanceWorkflowStatus || shipment.workflowState || shipment.status,
  );
  const allowedStageOwners = stageOwnership[normalizedStage] ?? [];
  return allowedStageOwners.includes(actor.role);
}

export function assertCanViewShipment(actor: CorridorActorContext, shipment: Record<string, any>, accessRows: Array<Record<string, any>> = []) {
  if (!canViewShipment(actor, shipment, accessRows)) {
    throw new ForbiddenException('You do not have access to this shipment');
  }
}

export function canPerformShipmentAction(actor: CorridorActorContext, action: string, shipmentStage?: string): boolean {
  if (actor.permissions.includes('*')) return true;
  const allowedRoles = actionAuthorization[action] ?? [];
  if (!allowedRoles.includes(actor.role)) return false;
  if (!shipmentStage) return true;
  const allowedStageOwners = stageOwnership[shipmentStage as CorridorNormalizedShipmentStage] ?? [];
  return allowedStageOwners.includes(actor.role) || ['executive_supervisor', 'super_admin'].includes(actor.role);
}

export function assertCanPerformShipmentAction(actor: CorridorActorContext, action: string, shipmentStage?: string) {
  if (!canPerformShipmentAction(actor, action, shipmentStage)) {
    throw new ForbiddenException(`Role ${actor.role} cannot perform action ${action}`);
  }
}

export function filterScopedList<T extends Record<string, any>>(items: T[], scopeField = 'visibilityScope', actor?: CorridorActorContext): T[] {
  if (!actor) return items;
  return items.filter((item) => canViewScope(actor, item[scopeField]));
}

export function filterInternalFields<T extends Record<string, any>>(payload: T, actor: CorridorActorContext): T {
  if (actor.permissions.includes('*')) return payload;
  const clone = { ...payload };
  if (!canViewScope(actor, 'finance_visible')) {
    delete clone.finance;
  }
  if (!canViewScope(actor, 'internal_only')) {
    delete clone.internalNotes;
  }
  return clone;
}

export function normalizeShipmentStage(value?: string): CorridorNormalizedShipmentStage {
  switch (value) {
    case 'booking_quote':
    case 'origin_preparation':
    case 'ocean_in_transit':
    case 'djibouti_release':
    case 'transitor_clearance':
    case 'inland_dispatch':
    case 'inland_arrival':
    case 'yard_processing':
    case 'delivery_pod':
    case 'empty_return':
    case 'closed':
      return value;
    case 'booking':
    default:
      return value === 'quote_requested'
        || value === 'quote_under_review'
        || value === 'quote_sent'
        || value === 'quote_accepted'
        || value === 'booking_created'
        || value === 'assigned_to_origin'
        || value === 'booking / quote'
        ? 'booking_quote'
        : value === 'at_sea'
          || value === 'ocean transit'
          ? 'ocean_in_transit'
          : value === 'under_clearance'
            || value === 'djibouti release'
            ? 'djibouti_release'
            : value === 'clearance_ready'
              || value === 'transitor clearance'
              ? 'transitor_clearance'
              : value === 'at_dry_port'
                ? 'yard_processing'
                : value === 'delivered'
                  ? 'delivery_pod'
                  : value === 'empty_return_pending'
                    ? 'empty_return'
                    : 'booking_quote';
  }
}

export function buildStageOwnershipRules(): CorridorStageOwnershipRule[] {
  return Object.entries(stageOwnership).map(([stage, roles]) => ({
    stage: stage as CorridorNormalizedShipmentStage,
    ownerRoles: roles,
    handoffSummary: `Stage ${stage.replace(/_/g, ' ')} is owned by ${roles.join(', ')}.`,
  }));
}

export function buildActionRules(): CorridorActionAuthorizationRule[] {
  return Object.entries(actionAuthorization).map(([action, roles]) => ({
    action: action as any,
    allowedRoles: roles,
    allowedStages: [],
    scopeSummary: `Allowed for ${roles.join(', ')}.`,
  }));
}
