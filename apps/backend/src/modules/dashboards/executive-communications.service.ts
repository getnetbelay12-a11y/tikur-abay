// @ts-nocheck
import { BadRequestException, Injectable } from '@nestjs/common';
import { connectToDatabase } from '../../database/mongo';
import {
  CustomerProfileModel,
  DriverKycRequestModel,
  ExecutiveCommunicationModel,
  IncidentReportModel,
  InvoiceModel,
  MaintenancePlanModel,
  PaymentModel,
  TripModel,
  UserModel,
  VehicleModel,
} from '../../database/models';

type Channel = 'email' | 'sms' | 'telegram' | 'in_app';
type ChannelSelection = Channel | 'all';
type TemplateType =
  | 'payment_reminder'
  | 'thank_you'
  | 'trip_delay_update'
  | 'dispatch_action_notice'
  | 'maintenance_escalation'
  | 'driver_document_reminder';
type ScheduleOption = 'send_now' | 'today_5pm' | 'tomorrow_morning' | 'custom_time';

@Injectable()
export class ExecutiveCommunicationsService {
  async getHistory(entityType: string, entityId: string, user: { email?: string }) {
    await connectToDatabase();
    const context = await this.resolveEntityContext(entityType, entityId);
    const history = await ExecutiveCommunicationModel.find({ entityType, entityId })
      .sort({ sentAt: -1, scheduledAt: -1, createdAt: -1 })
      .limit(40)
      .lean();

    return {
      entity: context,
      history: history.map((item: any) => this.mapRecord(item)),
    };
  }

  async sendCommunication(
    body: {
      entityType?: string;
      entityId?: string;
      channel?: ChannelSelection;
      template?: TemplateType;
      recipients?: Partial<Record<Channel, string>>;
      subject?: string;
      message?: string;
      saveAsDraft?: boolean;
      scheduleOption?: ScheduleOption;
      scheduledAt?: string;
      severity?: string;
    },
    user: { email?: string },
  ) {
    await connectToDatabase();
    const entityType = String(body.entityType || '').trim();
    const entityId = String(body.entityId || '').trim();
    if (!entityType || !entityId) {
      throw new BadRequestException('Entity reference is required');
    }

    const context = await this.resolveEntityContext(entityType, entityId);
    const channels = expandChannels(body.channel || 'email');
    const template = (body.template || context.defaultTemplate || 'dispatch_action_notice') as TemplateType;
    const scheduledAt = resolveScheduleAt(body.saveAsDraft, body.scheduleOption, body.scheduledAt);
    const status = body.saveAsDraft || scheduledAt ? 'scheduled' : 'sent';
    const records = [];

    for (const channel of channels) {
      const recipient = normalizeRecipient(body.recipients?.[channel] || context.recipients[channel]);
      if (!recipient) {
        throw new BadRequestException(`Recipient is required for ${channel}`);
      }
      const subject = body.subject || buildSubject(template, context);
      const message = body.message || buildMessage(template, context);
      const providerResponse = buildProviderResponse(status, channel, recipient, scheduledAt);
      const record = await ExecutiveCommunicationModel.create({
        entityType,
        entityId,
        entityLabel: context.title,
        customerName: context.customerName,
        branchName: context.branchName,
        channel,
        recipient,
        template,
        subject,
        message,
        status,
        sentBy: user.email || 'system@tikurabay.local',
        sentAt: status === 'sent' ? new Date() : null,
        scheduledAt: scheduledAt || null,
        providerResponse,
        severity: body.severity || context.severity || 'medium',
        metadata: {
          subtitle: context.subtitle,
          tokens: context.tokens,
        },
      });
      records.push(record);
    }

    return {
      entity: context,
      records: records.map((item) => this.mapRecord(item.toObject ? item.toObject() : item)),
    };
  }

  private async resolveEntityContext(entityType: string, entityId: string) {
    switch (entityType) {
      case 'payment':
      case 'invoice':
        return this.resolveInvoiceContext(entityType, entityId);
      case 'trip':
        return this.resolveTripContext(entityId);
      case 'vehicle':
      case 'maintenance_plan':
        return this.resolveVehicleContext(entityType, entityId);
      case 'driver_kyc_request':
        return this.resolveDriverKycContext(entityId);
      case 'incident_report':
        return this.resolveIncidentContext(entityId);
      default:
        throw new BadRequestException(`Unsupported entity type: ${entityType}`);
    }
  }

  private async resolveInvoiceContext(entityType: string, entityId: string) {
    const payment = entityType === 'payment' ? await PaymentModel.findById(entityId).lean() : null;
    const invoiceId = entityType === 'invoice' ? entityId : String(payment?.invoiceId || '');
    const invoice = await InvoiceModel.findById(invoiceId).lean();
    if (!invoice) throw new BadRequestException('Invoice not found');
    const latestPayment = payment || await PaymentModel.findOne({ invoiceId: invoice._id }).sort({ paymentDate: -1, createdAt: -1 }).lean();
    const recipients = await resolveCustomerRecipients(invoice.customerId, invoice.customerCode, invoice.customerName);
    const amount = Math.max(0, Number(latestPayment?.amount || invoice.outstandingAmount || invoice.totalAmount || 0));
    const defaultTemplate =
      invoice.status === 'paid' || latestPayment?.status === 'paid'
        ? 'thank_you'
        : invoice.status === 'overdue'
          ? 'payment_reminder'
          : 'payment_reminder';

    return {
      entityType: 'invoice',
      entityId: String(invoice._id),
      title: invoice.customerName || invoice.invoiceCode || 'Invoice communication',
      subtitle: `${invoice.invoiceCode || 'Invoice'} · ${formatCurrency(amount)}`,
      defaultTemplate,
      customerName: invoice.customerName || 'Customer account',
      branchName: '',
      severity: invoice.status === 'overdue' ? 'high' : 'medium',
      recipients,
      fields: [
        { label: 'Customer', value: invoice.customerName || 'Customer account' },
        { label: 'Invoice', value: invoice.invoiceCode || 'Invoice unavailable' },
        { label: 'Amount', value: formatCurrency(amount) },
        { label: 'Status', value: normalizeLabel(latestPayment?.status || invoice.status || 'pending') },
      ],
      tokens: {
        customerName: invoice.customerName || 'Customer',
        invoiceCode: invoice.invoiceCode || 'Invoice',
        amountLabel: formatCurrency(amount),
        dueDateLabel: formatDate(invoice.dueDate),
        paymentCode: latestPayment?.paymentCode || 'Pending payment',
        statusLabel: normalizeLabel(latestPayment?.status || invoice.status || 'pending'),
      },
    };
  }

  private async resolveTripContext(entityId: string) {
    const trip = await TripModel.findById(entityId)
      .select('_id tripCode customerId customerCode customerName routeName status branchName plannedArrivalAt')
      .lean();
    if (!trip) throw new BadRequestException('Trip not found');
    const recipients = await resolveCustomerRecipients(trip.customerId, trip.customerCode, trip.customerName);
    const branchSlug = slugify(trip.branchName || 'dispatch');
    return {
      entityType: 'trip',
      entityId: String(trip._id),
      title: trip.tripCode || 'Trip communication',
      subtitle: `${trip.routeName || trip.branchName || 'Route'} · ${normalizeLabel(trip.status || 'active')}`,
      defaultTemplate: 'trip_delay_update',
      customerName: trip.customerName || 'Customer',
      branchName: trip.branchName || '',
      severity: String(trip.status || '').toLowerCase() === 'delayed' ? 'high' : 'medium',
      recipients: {
        email: recipients.email,
        sms: recipients.sms,
        telegram: recipients.telegram || `@dispatch_${branchSlug}`,
        in_app: recipients.in_app || `trip:${trip.tripCode || trip._id}`,
      },
      fields: [
        { label: 'Trip', value: trip.tripCode || 'Trip unavailable' },
        { label: 'Customer', value: trip.customerName || 'Customer account' },
        { label: 'Route', value: trip.routeName || 'Route unavailable' },
        { label: 'Status', value: normalizeLabel(trip.status || 'active') },
      ],
      tokens: {
        customerName: trip.customerName || 'Customer',
        tripCode: trip.tripCode || 'Trip',
        routeName: trip.routeName || trip.branchName || 'priority route',
        statusLabel: normalizeLabel(trip.status || 'active'),
      },
    };
  }

  private async resolveVehicleContext(entityType: string, entityId: string) {
    const plan = entityType === 'maintenance_plan'
      ? await MaintenancePlanModel.findById(entityId).lean()
      : null;
    const vehicle = entityType === 'vehicle'
      ? await VehicleModel.findById(entityId).select('_id vehicleCode branchName currentStatus').lean()
      : plan?.vehicleId
        ? await VehicleModel.findById(plan.vehicleId).select('_id vehicleCode branchName currentStatus').lean()
        : null;
    if (!vehicle && !plan) throw new BadRequestException('Vehicle context not found');
    const branchSlug = slugify(vehicle?.branchName || 'workshop');
    return {
      entityType: 'vehicle',
      entityId: String(vehicle?._id || plan?.vehicleId || entityId),
      title: vehicle?.vehicleCode || plan?.vehicleCode || 'Vehicle communication',
      subtitle: `${vehicle?.branchName || 'Workshop'} · ${normalizeLabel(vehicle?.currentStatus || 'active')}`,
      defaultTemplate: 'maintenance_escalation',
      customerName: '',
      branchName: vehicle?.branchName || '',
      severity: plan?.overdue || plan?.blockedAssignment ? 'high' : 'medium',
      recipients: {
        email: `maintenance.${branchSlug}@tikurabay.local`,
        sms: branchPhone(branchSlug),
        telegram: `@maintenance_${branchSlug}`,
        in_app: `vehicle:${vehicle?.vehicleCode || plan?.vehicleCode || entityId}`,
      },
      fields: [
        { label: 'Vehicle', value: vehicle?.vehicleCode || plan?.vehicleCode || 'Vehicle unavailable' },
        { label: 'Branch', value: vehicle?.branchName || 'Workshop' },
        { label: 'Status', value: normalizeLabel(vehicle?.currentStatus || (plan?.overdue ? 'overdue' : 'active')) },
        { label: 'Maintenance', value: plan?.serviceItemName || 'Assignment readiness review' },
      ],
      tokens: {
        vehicleCode: vehicle?.vehicleCode || plan?.vehicleCode || 'Vehicle',
        branchName: vehicle?.branchName || 'Workshop',
        maintenanceItem: plan?.serviceItemName || 'assignment-critical maintenance',
        statusLabel: normalizeLabel(vehicle?.currentStatus || 'active'),
      },
    };
  }

  private async resolveDriverKycContext(entityId: string) {
    const request = await DriverKycRequestModel.findById(entityId)
      .select('_id fullName phone status partnerCompany partnerVehicleCode')
      .lean();
    if (!request) throw new BadRequestException('Driver KYC request not found');
    return {
      entityType: 'driver_kyc_request',
      entityId: String(request._id),
      title: request.fullName || 'Driver KYC review',
      subtitle: `${request.partnerCompany || 'Driver onboarding'} · ${normalizeLabel(request.status || 'submitted')}`,
      defaultTemplate: 'driver_document_reminder',
      customerName: '',
      branchName: '',
      severity: ['submitted', 'under_review', 'draft'].includes(String(request.status || '').toLowerCase()) ? 'high' : 'medium',
      recipients: {
        email: `${slugify(request.fullName || 'driver')}@partner.tikurabay.local`,
        sms: request.phone || branchPhone('hr'),
        telegram: `@${slugify(request.fullName || 'driver').replace(/-/g, '_')}`,
        in_app: `driver-kyc:${request._id}`,
      },
      fields: [
        { label: 'Driver', value: request.fullName || 'Driver applicant' },
        { label: 'Partner', value: request.partnerCompany || 'Partner assignment pending' },
        { label: 'Vehicle', value: request.partnerVehicleCode || 'Vehicle assignment pending' },
        { label: 'Status', value: normalizeLabel(request.status || 'submitted') },
      ],
      tokens: {
        driverName: request.fullName || 'driver applicant',
        partnerCompany: request.partnerCompany || 'the partner team',
        partnerVehicleCode: request.partnerVehicleCode || 'the assigned unit',
        statusLabel: normalizeLabel(request.status || 'submitted'),
      },
    };
  }

  private async resolveIncidentContext(entityId: string) {
    const incident = await IncidentReportModel.findById(entityId)
      .select('_id type vehicleCode driverName severity status tripId tripCode')
      .lean();
    if (!incident) throw new BadRequestException('Incident not found');
    return {
      entityType: 'incident_report',
      entityId: String(incident._id),
      title: incident.vehicleCode || incident.tripCode || 'Incident communication',
      subtitle: `${normalizeLabel(incident.type || 'incident')} · ${normalizeLabel(incident.status || 'reported')}`,
      defaultTemplate: 'dispatch_action_notice',
      customerName: '',
      branchName: '',
      severity: String(incident.severity || 'high').toLowerCase(),
      recipients: {
        email: 'dispatch@tikurabay.local',
        sms: branchPhone('dispatch'),
        telegram: '@dispatch_watch',
        in_app: `incident:${incident._id}`,
      },
      fields: [
        { label: 'Vehicle', value: incident.vehicleCode || 'Vehicle unavailable' },
        { label: 'Driver', value: incident.driverName || 'Driver assignment unavailable' },
        { label: 'Trip', value: incident.tripCode || 'Trip assignment unavailable' },
        { label: 'Severity', value: normalizeLabel(incident.severity || 'high') },
      ],
      tokens: {
        vehicleCode: incident.vehicleCode || 'vehicle',
        driverName: incident.driverName || 'assigned driver',
        tripCode: incident.tripCode || 'trip',
        statusLabel: normalizeLabel(incident.status || 'reported'),
      },
    };
  }

  private mapRecord(item: any) {
    return {
      id: String(item._id),
      entityType: item.entityType,
      entityId: item.entityId,
      channel: item.channel,
      recipient: item.recipient,
      template: item.template,
      subject: item.subject,
      message: item.message,
      status: item.status,
      sentBy: item.sentBy,
      sentAt: item.sentAt || null,
      scheduledAt: item.scheduledAt || null,
      severity: item.severity || 'medium',
      providerResponse: item.providerResponse || '',
    };
  }
}

async function resolveCustomerRecipients(customerId: unknown, customerCode: unknown, customerName: unknown) {
  const profileQuery = [
    customerId ? { customerId } : null,
    customerName ? { companyName: customerName } : null,
  ].filter(Boolean);
  const userQuery = [
    customerCode ? { customerCode } : null,
  ].filter(Boolean);
  const [profile, user] = await Promise.all([
    profileQuery.length
      ? CustomerProfileModel.findOne({ $or: profileQuery }).select('companyName contactPerson phone email').lean()
      : null,
    userQuery.length
      ? UserModel.findOne({ $or: userQuery }).select('email phone').lean()
      : null,
  ]);

  const safeName = slugify(String(profile?.companyName || customerName || 'customer'));
  return {
    email: profile?.email || user?.email || `${safeName}@customer.tikurabay.local`,
    sms: profile?.phone || user?.phone || branchPhone(safeName),
    telegram: `@${safeName.replace(/-/g, '_')}`,
    in_app: `customer:${customerCode || customerId || safeName}`,
  };
}

function expandChannels(channel: ChannelSelection): Channel[] {
  if (channel === 'all') return ['email', 'sms', 'telegram', 'in_app'];
  return [channel];
}

function resolveScheduleAt(saveAsDraft?: boolean, scheduleOption?: ScheduleOption, scheduledAt?: string) {
  if (saveAsDraft) return scheduledAt ? new Date(scheduledAt) : null;
  if (scheduleOption === 'custom_time' && scheduledAt) return new Date(scheduledAt);
  const now = new Date();
  if (scheduleOption === 'today_5pm') {
    const next = new Date(now);
    next.setHours(17, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next;
  }
  if (scheduleOption === 'tomorrow_morning') {
    const next = new Date(now);
    next.setDate(next.getDate() + 1);
    next.setHours(9, 0, 0, 0);
    return next;
  }
  return null;
}

function normalizeRecipient(value?: string) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function buildSubject(template: TemplateType, context: any) {
  switch (template) {
    case 'thank_you':
      return `Payment received for ${context.tokens.invoiceCode}`;
    case 'trip_delay_update':
      return `Trip delay update for ${context.tokens.tripCode}`;
    case 'dispatch_action_notice':
      return `Dispatch action notice for ${context.title}`;
    case 'maintenance_escalation':
      return `Maintenance escalation for ${context.tokens.vehicleCode}`;
    case 'driver_document_reminder':
      return `Driver document reminder for ${context.tokens.driverName}`;
    default:
      return `Payment reminder for ${context.tokens.invoiceCode}`;
  }
}

function buildMessage(template: TemplateType, context: any) {
  switch (template) {
    case 'thank_you':
      return `Dear ${context.tokens.customerName}, thank you for your payment of ${context.tokens.amountLabel} for invoice ${context.tokens.invoiceCode}. Your payment has been received successfully. We appreciate your business.`;
    case 'trip_delay_update':
      return `Dear ${context.tokens.customerName}, trip ${context.tokens.tripCode} on ${context.tokens.routeName} is delayed. Our dispatch team is actively stabilizing the movement and will share the next update shortly.`;
    case 'dispatch_action_notice':
      return `Dispatch team, ${context.title} requires immediate follow-up. Please review the current status and coordinate the next action without delay.`;
    case 'maintenance_escalation':
      return `Maintenance team, ${context.tokens.vehicleCode} requires attention for ${context.tokens.maintenanceItem}. Please clear the unit for assignment readiness as soon as possible.`;
    case 'driver_document_reminder':
      return `Dear ${context.tokens.driverName}, your Tikur Abay onboarding remains incomplete. Please submit the required driver documents so the review team can complete activation.`;
    default:
      return `Dear ${context.tokens.customerName}, this is a reminder that invoice ${context.tokens.invoiceCode} for ${context.tokens.amountLabel} is due on ${context.tokens.dueDateLabel}. Please complete payment at your earliest convenience. Thank you.`;
  }
}

function buildProviderResponse(status: string, channel: string, recipient: string, scheduledAt?: Date | null) {
  if (status === 'scheduled') {
    return `${channel} scheduled for ${recipient}${scheduledAt ? ` at ${scheduledAt.toISOString()}` : ''}`;
  }
  return `${channel} accepted for ${recipient}`;
}

function formatCurrency(value: number) {
  return `ETB ${Math.max(0, Number(value || 0)).toLocaleString('en-US')}`;
}

function formatDate(value: unknown) {
  if (!value) return 'the scheduled due date';
  return new Date(String(value)).toLocaleDateString('en-US');
}

function normalizeLabel(value: string) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function slugify(value: string) {
  return String(value || 'contact')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'contact';
}

function branchPhone(seed: string) {
  const normalized = slugify(seed).slice(0, 6).padEnd(6, '0');
  return `+251900${normalized.replace(/[^0-9]/g, '0').padEnd(6, '0').slice(0, 6)}`;
}
