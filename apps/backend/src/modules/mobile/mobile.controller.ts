import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { connectToDatabase } from '../../database/mongo';
import {
  AvailabilityReportModel,
  ActivityLogModel,
  BookingModel,
  CorridorMilestoneModel,
  CorridorPartyAccessModel,
  CorridorShipmentModel,
  CustomerModel,
  CustomerProfileModel,
  DocumentModel,
  DriverKycRequestModel,
  DriverProfileModel,
  DriverModel,
  InvoiceModel,
  LeaveRequestModel,
  PaymentModel,
  QuoteModel,
  TripEventModel,
  TripModel,
  UploadedDocumentModel,
  UserModel,
  VehicleModel,
  AgreementModel,
} from '../../database/models';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { CommunicationOrchestratorService } from '../communications/communication-orchestrator.service';
import {
  documentPolicyFor,
  documentCategoryLabel,
  documentMobileCanUpload,
  documentRequirementState,
} from '../documents/document-policy';

@ApiTags('mobile')
@Controller()
export class MobileController {
  constructor(private readonly communicationOrchestratorService: CommunicationOrchestratorService) {}

  private async recordAuditEvent(
    user: AuthenticatedUser,
    action: string,
    entityType: string,
    entityId: string,
    metadata: Record<string, unknown>,
  ) {
    await ActivityLogModel.create({
      entityType,
      entityId,
      userId: user.id,
      activityType: action,
      title: action.replace(/_/g, ' '),
      description: `${user.name} performed ${action.replace(/_/g, ' ')} on ${entityType} ${entityId}.`,
      metadata,
    }).catch(() => null);
  }

  @Post('driver-kyc')
  async createDriverKyc(@CurrentUser() user: AuthenticatedUser, @Body() body: Record<string, unknown>) {
    await connectToDatabase();
    const rawBranchId = typeof body.branchId === 'string' ? body.branchId.trim() : '';
    const normalizedBranchId = rawBranchId && Types.ObjectId.isValid(rawBranchId) ? rawBranchId : undefined;
    const normalizedBranchName = normalizedBranchId ? undefined : rawBranchId || undefined;
    const kyc = await DriverKycRequestModel.findOneAndUpdate(
      { userId: user.id },
      {
        $set: {
          ...body,
          branchId: normalizedBranchId,
          branchName: normalizedBranchName,
          userId: user.id,
          fullName: body.fullName || user.name,
          phone: body.phone || user.phone,
          status: 'submitted',
        },
      },
      { upsert: true, new: true },
    ).lean();

    await UserModel.findByIdAndUpdate(user.id, { $set: { status: 'submitted' } }).catch(() => null);
    await DriverProfileModel.findOneAndUpdate(
      { userId: user.id },
      {
        $set: {
          accountState: 'submitted',
          licenseNumber: body.licenseNumber,
          emergencyContact: body.emergencyContact,
          branchId: normalizedBranchId,
        },
      },
      { new: true },
    ).catch(() => null);

    return kyc;
  }

  @Get('driver-kyc')
  async listDriverKyc(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('branchId') branchId?: string,
    @Query('q') q?: string,
  ) {
    await connectToDatabase();
    const filter: Record<string, unknown> =
      user.permissions.includes('*') || ['super_admin', 'executive', 'hr_officer'].includes(user.role)
        ? {}
        : user.branchId
          ? { branchId: user.branchId }
          : {};

    if (status) {
      filter.status = status;
    }
    if (branchId) {
      filter.branchId = branchId;
    }
    if (q?.trim()) {
      filter.$or = [
        { fullName: { $regex: q.trim(), $options: 'i' } },
        { phone: { $regex: q.trim(), $options: 'i' } },
        { licenseNumber: { $regex: q.trim(), $options: 'i' } },
      ];
    }

    return DriverKycRequestModel.find(filter)
      .sort({ status: 1, createdAt: -1 })
      .limit(200)
      .lean();
  }

  @Get('driver-kyc/:id')
  async getDriverKyc(@Param('id') id: string) {
    await connectToDatabase();
    return DriverKycRequestModel.findOne({ $or: [{ _id: id }, { userId: id }] }).lean();
  }

  @Patch('driver-kyc/:id/status')
  async updateDriverKycStatus(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { status?: string; notes?: string; reviewNotes?: string },
  ) {
    await connectToDatabase();
    const nextStatus = body.status || 'under_review';
    const reviewNotes = body.reviewNotes || body.notes;
    const kyc = (await DriverKycRequestModel.findOneAndUpdate(
      { _id: id },
      {
        $set: {
          status: nextStatus,
          notes: reviewNotes,
          reviewNotes,
          reviewedBy: user.email,
          reviewedAt: new Date(),
        },
      },
      { new: true },
    ).lean()) as Record<string, unknown> | null;

    if (!kyc) return null;

    const accountState =
      nextStatus === 'approved'
        ? 'active'
        : nextStatus === 'rejected'
          ? 'rejected'
          : nextStatus === 'suspended'
            ? 'suspended'
            : 'submitted';

    const userId = String(kyc.userId ?? '');
    await UserModel.findByIdAndUpdate(userId, {
      $set: { status: nextStatus === 'approved' ? 'active' : nextStatus },
    }).catch(() => null);
    await DriverProfileModel.findOneAndUpdate({ userId }, { $set: { accountState } }).catch(() => null);
    await DriverModel.findOneAndUpdate({ userId }, { $set: { status: nextStatus } }).catch(() => null);

    await this.communicationOrchestratorService?.triggerAutomationEvent?.(
      'kyc_status_changed',
      {
        entityType: 'driver_kyc_request',
        entityId: String(kyc._id ?? id),
        payload: {
          status: nextStatus,
          driverName: String(kyc.fullName ?? ''),
          documentType: 'KYC package',
        },
      },
      { id: user.id || user.email || 'system' },
    );

    return kyc;
  }

  @Post('bookings')
  async createBooking(@CurrentUser() user: AuthenticatedUser, @Body() body: Record<string, unknown>) {
    await connectToDatabase();
    const quoteId = String(body.quoteId || '').trim();
    if (!quoteId) {
      throw new BadRequestException('Accepted quote is required before booking can be created');
    }

    const quote = await QuoteModel.findOne({
      $or: [{ _id: quoteId }, { quoteCode: quoteId }],
      customerCode: user.customerCode,
    }).lean<any>();

    if (!quote) {
      throw new BadRequestException('Quote not found for this customer');
    }

    if (!['accepted', 'approved'].includes(String(quote.status || '').toLowerCase())) {
      throw new BadRequestException('Quote must be accepted before booking can be created');
    }

    const existingBooking = await BookingModel.findOne({
      $or: [{ quoteId: String(quote._id) }, { quoteId: quote.quoteCode }],
    }).lean<any>();
    if (existingBooking) {
      return {
        bookingId: String(existingBooking._id),
        bookingCode: existingBooking.bookingCode,
        shipmentRef: existingBooking.bookingCode,
        status: existingBooking.status,
        alreadyExists: true,
      };
    }

    const bookingCode = nextBusinessCode('BOOK', await BookingModel.countDocuments({}));
    const shipmentRef = String(body.shipmentRef || quote.shipmentRef || bookingCode);
    const assignedOriginEmail = 'supplier.agent@tikurabay.com';
    const originDeskUser = await UserModel.findOne({ email: assignedOriginEmail }).lean<any>();

    const booking = await BookingModel.create({
      bookingCode,
      customerCode: user.customerCode,
      customerId: quote.customerId,
      route: String(body.route || quote.route || buildRouteSummary(quote)),
      cargoType: String(body.cargoType || quote.cargoType || quote.commoditySummary || 'Cargo'),
      requestedDate: body.requestedDate || quote.requestedDate || new Date(),
      requestedVehicleType: String(body.requestedVehicleType || quote.requestedVehicleType || quote.containerType || ''),
      quoteId: String(quote._id),
      status: 'confirmed',
      assignedOriginAgentId: String(originDeskUser?._id || ''),
      assignedOriginAgentEmail: assignedOriginEmail,
      customerName: quote.customerName || user.name,
      requestSource: quote.requestSource || body.requestSource || 'customer',
      quoteStatus: 'accepted',
      acceptedAt: quote.acceptedAt || new Date(),
      pricingSnapshot: extractPricingSnapshot(quote),
      customerSnapshot: extractCustomerSnapshot(quote, user),
      routeSnapshot: extractRouteSnapshot(quote),
      cargoSnapshot: extractCargoSnapshot(quote),
      operationalReadinessSnapshot: extractOperationalReadinessSnapshot(quote),
    } as any);

    await CorridorShipmentModel.create({
      shipmentId: shipmentRef,
      shipmentRef,
      bookingNumber: bookingCode,
      bookingId: String(booking._id),
      quoteId: quote.quoteCode || String(quote._id),
      bookingStatus: 'confirmed',
      quoteStatus: 'accepted',
      acceptedAt: quote.acceptedAt || new Date(),
      assignedOriginAgentId: String(originDeskUser?._id || ''),
      assignedOriginAgentEmail: assignedOriginEmail,
      customerId: String(quote.customerId || ''),
      customerCode: user.customerCode,
      customerName: quote.customerName || user.name,
      consigneeName: String(quote.consigneeName || quote.customerName || user.name),
      requestSource: quote.requestSource || body.requestSource || 'customer',
      serviceType: String(quote.serviceLevel || quote.serviceType || 'door_to_door'),
      serviceMode: String(quote.shipmentMode || quote.bookingType || 'ocean_freight'),
      incoterm: String(quote.incoterm || body.incoterm || 'FOB'),
      commoditySummary: String(quote.commoditySummary || quote.cargoType || 'Cargo'),
      quoteAmount: Number(quote.quotedAmount || quote.quoteAmount || 0),
      quoteCurrency: String(quote.currency || 'USD'),
      originCountry: String(quote.originCountry || ''),
      originPort: String(quote.originPort || quote.originCity || ''),
      portOfLoading: String(quote.portOfLoading || quote.originPort || ''),
      dischargePort: String(quote.portOfDischarge || quote.destinationPort || 'Djibouti'),
      portOfDischarge: String(quote.portOfDischarge || quote.destinationPort || 'Djibouti'),
      destinationCountry: String(quote.destinationCountry || ''),
      destinationNode: String(quote.destinationCity || 'Addis Ababa'),
      inlandDestination: String(quote.inlandDestination || quote.deliveryAddress || 'Addis Ababa'),
      finalDeliveryLocation: String(quote.deliveryAddress || quote.finalDeliveryLocation || 'Addis Ababa'),
      currentStage: 'origin_preparation',
      currentOwnerRole: 'supplier_agent',
      currentStatus: 'booking_confirmed',
      status: 'active',
      originReady: false,
      djiboutiReleaseReady: false,
      dispatchReady: false,
      inlandArrivalReady: false,
      yardClosureReady: false,
      emptyReturnOpen: true,
      returnReceiptStatus: 'missing',
      customerConfirmationStatus: 'pending',
      closureBlockedReason: 'Origin processing pending',
      containerTypeSummary: String(quote.containerType || quote.requestedVehicleType || ''),
      container: {
        containerType: String(quote.containerType || ''),
        containerSize: String(quote.containerSize || ''),
        containerQuantity: Number(quote.containerQuantity || 0),
        grossWeightKg: Number(quote.grossWeight || 0),
        cbm: Number(quote.volumeCbm || 0),
      },
    });

    await CorridorPartyAccessModel.bulkWrite([
      {
        updateOne: {
          filter: { shipmentRef, role: 'customer_user', actorCode: user.customerCode || user.email },
          update: {
            $set: {
              shipmentId: shipmentRef,
              shipmentRef,
              role: 'customer_user',
              actorUserId: user.id,
              actorCode: user.customerCode || user.email,
              actorName: quote.customerName || user.name,
              visibilityScopes: ['customer_visible'],
              stageAccess: ['booking', 'origin_preparation', 'ocean_transit', 'djibouti_release', 'clearance', 'dispatch', 'inland_transit', 'dry_port', 'customer_confirmation', 'empty_return', 'closed'],
            },
          },
          upsert: true,
        },
      },
      {
        updateOne: {
          filter: { shipmentRef, role: 'supplier_agent', actorCode: assignedOriginEmail },
          update: {
            $set: {
              shipmentId: shipmentRef,
              shipmentRef,
              role: 'supplier_agent',
              actorUserId: String(originDeskUser?._id || ''),
              actorCode: assignedOriginEmail,
              actorName: 'China Port Agent Desk',
              visibilityScopes: ['supplier_visible', 'internal_only'],
              stageAccess: ['booking', 'origin_preparation', 'ocean_transit'],
            },
          },
          upsert: true,
        },
      },
    ]);

    await CorridorMilestoneModel.create([
      {
        shipmentId: shipmentRef,
        shipmentRef,
        stage: 'booking',
        code: 'quote_accepted',
        label: 'Quote accepted',
        status: 'done',
        occurredAt: quote.acceptedAt || new Date(),
        sourceRole: user.role,
        sourceUserId: user.id,
        visibilityScope: 'customer_visible',
        note: 'Customer approved the shipment quote.',
      },
      {
        shipmentId: shipmentRef,
        shipmentRef,
        stage: 'booking',
        code: 'booking_created',
        label: 'Booking created',
        status: 'done',
        occurredAt: new Date(),
        sourceRole: user.role,
        sourceUserId: user.id,
        visibilityScope: 'customer_visible',
        note: `Booking ${bookingCode} created from accepted quote ${quote.quoteCode || quoteId}.`,
      },
      {
        shipmentId: shipmentRef,
        shipmentRef,
        stage: 'origin_preparation',
        code: 'assigned_to_origin',
        label: 'Assigned to China Port Agent',
        status: 'done',
        occurredAt: new Date(),
        sourceRole: user.role,
        sourceUserId: user.id,
        visibilityScope: 'internal_only',
        note: `Shipment routed to ${assignedOriginEmail}.`,
      },
    ]);

    await QuoteModel.updateOne(
      { _id: quote._id },
      {
        $set: {
          status: 'accepted',
          acceptedAt: quote.acceptedAt || new Date(),
          convertedToShipmentId: shipmentRef,
          bookingId: String(booking._id),
        },
      },
    );

    await this.recordAuditEvent(user, 'booking_created', 'booking', String(booking._id), {
      bookingCode,
      quoteCode: quote.quoteCode || String(quote._id),
      shipmentRef,
      previousStatus: quote.status,
      nextStatus: 'confirmed',
    });

    return {
      bookingId: String(booking._id),
      bookingCode,
      shipmentRef,
      status: 'confirmed',
      assignedOriginAgentEmail: assignedOriginEmail,
    };
  }

  @Get('bookings/my')
  async myBookings(@CurrentUser() user: AuthenticatedUser, @Query('limit') limit?: string) {
    await connectToDatabase();
    const max = Math.min(Math.max(Number(limit || 20), 1), 100);
    return BookingModel.find({ customerCode: user.customerCode }).sort({ createdAt: -1 }).limit(max).lean();
  }

  @Get('fleet/available')
  async availableFleet() {
    await connectToDatabase();
    return VehicleModel.find({ currentStatus: { $in: ['available', 'reserved'] } })
      .select('vehicleCode branchName type brand model currentStatus')
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean();
  }

  @Post('quotes/request')
  async requestQuote(@CurrentUser() user: AuthenticatedUser, @Body() body: Record<string, unknown>) {
    await connectToDatabase();
    const validated = validateQuoteRequestBody(body);
    const quoteCode = nextBusinessCode('QUO', await QuoteModel.countDocuments({}));
    const quote = await QuoteModel.create({
      ...validated,
      quoteCode,
      customerCode: user.customerCode,
      customerName: validated.customerName || user.name,
      status: 'draft',
      quotedAmount: validated.quoteAmount,
    } as any);

    await this.recordAuditEvent(user, 'quote_created', 'quote', String(quote._id), {
      quoteCode,
      requestSource: validated.requestSource || 'customer',
      route: buildRouteSummary(validated),
      quoteAmount: validated.quoteAmount,
      currency: validated.currency,
    });

    return quote;
  }

  @Patch('quotes/:id/status')
  async updateQuoteStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { status?: string; approvalMethod?: string; note?: string },
  ) {
    await connectToDatabase();
    const nextStatus = String(body.status || '').trim().toLowerCase();
    if (!['sent', 'waiting_approval', 'accepted', 'rejected', 'revision_requested', 'expired'].includes(nextStatus)) {
      throw new BadRequestException('Invalid quote status transition');
    }

    const quote = await QuoteModel.findOne({
      $or: [{ _id: id }, { quoteCode: id }],
      customerCode: user.customerCode,
    }).lean<any>();
    if (!quote) {
      throw new BadRequestException('Quote not found for this customer');
    }

    if (['accepted', 'rejected', 'expired'].includes(String(quote.status || '').toLowerCase()) && nextStatus !== String(quote.status || '').toLowerCase()) {
      throw new BadRequestException('Finalized quote cannot change state');
    }

    const patch: Record<string, unknown> = {
      status: nextStatus,
      approvalMethod: body.approvalMethod,
      approvalNote: body.note,
    };
    if (nextStatus === 'accepted') {
      patch.acceptedAt = new Date();
      patch.approvedBy = user.email || user.name;
    }

    const updated = await QuoteModel.findByIdAndUpdate(quote._id, { $set: patch }, { new: true }).lean();

    await this.recordAuditEvent(user, `quote_${nextStatus}`, 'quote', String(quote._id), {
      quoteCode: quote.quoteCode,
      previousStatus: quote.status,
      nextStatus,
      approvalMethod: body.approvalMethod,
      note: body.note,
    });

    return updated;
  }

  @Get('quotes/my')
  async myQuotes(@CurrentUser() user: AuthenticatedUser, @Query('limit') limit?: string) {
    await connectToDatabase();
    const max = Math.min(Math.max(Number(limit || 20), 1), 100);
    return QuoteModel.find({ customerCode: user.customerCode }).sort({ createdAt: -1 }).limit(max).lean();
  }

  @Get('customer/workspace')
  async customerWorkspace(@CurrentUser() user: AuthenticatedUser) {
    await connectToDatabase();
    const customerCode = user.customerCode;
    if (!customerCode) {
      return {
        overview: {
          activeBooking: null,
          assignedVehicle: null,
          quoteStatus: 'none',
          agreementStatus: 'none',
          paymentDue: 0,
          supportShortcut: 'Chat support',
        },
        quotes: [],
        bookings: [],
        agreements: [],
        documents: [],
        invoices: [],
        payments: [],
        trips: [],
      };
    }

    const customer = await CustomerModel.findOne({ customerCode }).lean<any>();
    const customerId = customer?._id ?? null;
    const [profile, quotes, bookings, agreements, invoices, payments, trips, uploadedDocs, docs] = await Promise.all([
      customerId ? CustomerProfileModel.findOne({ customerId }).lean<any>() : null,
      QuoteModel.find({ customerCode }).sort({ createdAt: -1 }).limit(12).lean(),
      BookingModel.find({ customerCode }).sort({ createdAt: -1 }).limit(12).lean(),
      AgreementModel.find({ customerCode }).sort({ createdAt: -1 }).limit(12).lean(),
      InvoiceModel.find({ customerCode }).sort({ issueDate: -1 }).limit(20).lean(),
      PaymentModel.find({ customerCode }).sort({ paymentDate: -1 }).limit(20).lean(),
      TripModel.find({ customerCode }).sort({ createdAt: -1 }).limit(20).lean(),
      UploadedDocumentModel.find({ entityId: customerCode }).sort({ createdAt: -1 }).limit(30).lean(),
      DocumentModel.find({ entityId: customerCode }).sort({ createdAt: -1 }).limit(30).lean(),
    ]);

    const tripIds = trips.map((item) => item._id);
    const tripEvents = tripIds.length
      ? await TripEventModel.find({ tripId: { $in: tripIds } }).sort({ eventAt: 1 }).lean()
      : [];
    const eventsByTripId = new Map<string, any[]>();
    for (const event of tripEvents) {
      const key = String(event.tripId);
      if (!eventsByTripId.has(key)) eventsByTripId.set(key, []);
      eventsByTripId.get(key)!.push(event);
    }

    const activeBooking = bookings.find((item) => !['completed', 'cancelled'].includes(String(item.status))) ?? null;
    const latestTrip = trips.find((item) => !['completed', 'cancelled'].includes(String(item.status))) ?? trips[0] ?? null;
    const outstandingInvoices = invoices.filter((item) => Number(item.outstandingAmount ?? 0) > 0);
    const mergedDocuments = [...uploadedDocs, ...docs]
      .sort((left, right) => new Date(String(right.createdAt)).getTime() - new Date(String(left.createdAt)).getTime());

    return {
      customer: {
        companyName: customer?.companyName ?? user.name,
        accountStatus: profile?.accountState ?? customer?.status ?? 'active',
        contactPerson: profile?.contactPerson ?? profile?.fullName ?? user.name,
      },
      overview: {
        activeBooking: activeBooking
          ? {
              bookingCode: activeBooking.bookingCode,
              route: activeBooking.route,
              cargoType: activeBooking.cargoType,
              requestedDate: activeBooking.requestedDate,
              status: activeBooking.status,
            }
          : null,
        assignedVehicle: latestTrip?.vehicleCode ?? activeBooking?.assignedVehicleId ?? null,
        quoteStatus: quotes[0]?.status ?? 'none',
        agreementStatus: agreements[0]?.status ?? 'none',
        paymentDue: outstandingInvoices.reduce((sum, item) => sum + Number(item.outstandingAmount ?? 0), 0),
        supportShortcut: 'Chat support',
      },
      quotes: quotes.map((item) => ({
        id: String(item._id),
        quoteCode: item.quoteCode,
        route: item.route,
        cargoType: item.cargoType,
        requestedDate: item.requestedDate,
        requestedVehicleType: item.requestedVehicleType,
        quotedAmount: Number(item.quotedAmount ?? 0),
        status: item.status,
      })),
      bookings: bookings.map((item) => ({
        id: String(item._id),
        bookingCode: item.bookingCode,
        route: item.route,
        cargoType: item.cargoType,
        requestedDate: item.requestedDate,
        requestedVehicleType: item.requestedVehicleType,
        status: item.status,
      })),
      agreements: agreements.map((item) => ({
        id: String(item._id),
        agreementCode: item.agreementCode,
        status: item.status,
        totalValue: Number(item.totalValue ?? 0),
        signedPdfUrl: item.signedPdfUrl ?? null,
      })),
      documents: mergedDocuments.slice(0, 20).map((item) => {
        const status = String(item.status || item.approvalStatus || 'available');
        const category = item.category || item.documentType || 'document';
        const policy = documentPolicyFor(item.entityType, category);
        return {
          id: String(item._id),
          title: item.title || item.fileName,
          category,
          categoryLabel: documentCategoryLabel(item.entityType, category),
          categoryGroup: policy.group,
          categoryGroupOrder: policy.groupOrder,
          categoryOrder: policy.displayOrder,
          categoryPriority: policy.priority,
          status,
          fileName: item.fileName,
          entityType: item.entityType,
          entityId: item.entityId,
          mimeType: item.mimeType || null,
          createdAt: item.createdAt,
          requirementState: documentRequirementState(status),
          mobileCanUpload: documentMobileCanUpload(item.entityType, category, status),
        };
      }),
      invoices: invoices.map((item) => ({
        id: String(item._id),
        invoiceCode: item.invoiceCode,
        tripCode: item.tripCode,
        totalAmount: Number(item.totalAmount ?? 0),
        outstandingAmount: Number(item.outstandingAmount ?? 0),
        status: item.status,
        dueDate: item.dueDate,
      })),
      payments: payments.map((item) => ({
        id: String(item._id),
        paymentCode: item.paymentCode,
        invoiceCode: item.invoiceCode,
        amount: Number(item.amount ?? 0),
        status: item.status,
        paymentDate: item.paymentDate,
      })),
      trips: trips.map((item) => {
        const events = eventsByTripId.get(String(item._id)) ?? [];
        return {
          id: String(item._id),
          tripCode: item.tripCode,
          assignedVehicle: item.vehicleCode ?? 'Pending assignment',
          status: item.status,
          eta: item.plannedArrivalAt ?? null,
          routeStatus: item.currentCheckpoint ?? item.routeName ?? 'In progress',
          proofOfDeliveryUploaded: Boolean(item.proofOfDeliveryUploaded),
          origin: item.origin,
          destination: item.destination,
          milestones: events.slice(-5).map((event: any) => ({
            id: String(event._id),
            title: event.title || event.eventType,
            eventAt: event.eventAt,
            location: event.location,
          })),
        };
      }),
    };
  }

  @Post('availability-reports')
  async createAvailability(@CurrentUser() user: AuthenticatedUser, @Body() body: Record<string, unknown>) {
    await connectToDatabase();
    return AvailabilityReportModel.create({ ...body, driverId: user.id });
  }

  @Post('leave-requests')
  async createLeave(@CurrentUser() user: AuthenticatedUser, @Body() body: Record<string, unknown>) {
    await connectToDatabase();
    return LeaveRequestModel.create({ ...body, driverId: user.id, status: 'submitted' });
  }
}

function nextBusinessCode(prefix: string, count: number) {
  return `${prefix}-${String(count + 1).padStart(6, '0')}`;
}

function requireString(value: unknown, field: string) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    throw new BadRequestException(`${field} is required`);
  }
  return normalized;
}

function optionalString(value: unknown) {
  const normalized = String(value || '').trim();
  return normalized || undefined;
}

function optionalNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return undefined;
  return parsed;
}

function buildRouteSummary(payload: Record<string, any>) {
  return [
    optionalString(payload.originCountry),
    optionalString(payload.originPort || payload.originCity),
    optionalString(payload.destinationPort || payload.portOfDischarge),
    optionalString(payload.destinationCity || payload.inlandDestination || payload.deliveryAddress),
  ].filter(Boolean).join(' -> ');
}

function validateQuoteRequestBody(body: Record<string, unknown>) {
  const shipmentMode = requireString(body.shipmentMode, 'shipmentMode');
  const loadType = requireString(body.loadType, 'loadType');
  const serviceLevel = requireString(body.serviceLevel, 'serviceLevel');
  const customerName = requireString(body.customerName, 'customerName');
  const companyName = requireString(body.companyName, 'companyName');
  const phone = requireString(body.phone, 'phone');
  const email = requireString(body.email, 'email');
  const originCountry = requireString(body.originCountry, 'originCountry');
  const originPort = requireString(body.originPort || body.originCity, 'originPort');
  const destinationCountry = requireString(body.destinationCountry, 'destinationCountry');
  const destinationPort = requireString(body.destinationPort || body.destinationCity, 'destinationPort');
  const commoditySummary = requireString(body.commoditySummary || body.cargoType, 'commoditySummary');

  const containerType = optionalString(body.containerType);
  const containerSize = optionalString(body.containerSize);
  const containerQuantity = optionalNumber(body.containerQuantity) ?? 0;

  if (!['lcl', 'air_freight'].includes(loadType.toLowerCase()) && (!containerType || !containerSize || containerQuantity <= 0)) {
    throw new BadRequestException('Container type, size, and quantity are required for this load type');
  }

  const quoteAmount =
    (optionalNumber(body.baseFreight) ?? 0) +
    (optionalNumber(body.originCharges) ?? 0) +
    (optionalNumber(body.destinationCharges) ?? 0) +
    (optionalNumber(body.customsEstimate) ?? 0) +
    (optionalNumber(body.inlandTransportEstimate) ?? 0) +
    (optionalNumber(body.insuranceEstimate) ?? 0) +
    (optionalNumber(body.handlingFees) ?? 0) -
    (optionalNumber(body.discount) ?? 0);

  return {
    requestSource: optionalString(body.requestSource) || 'customer',
    customerName,
    companyName,
    phone,
    email,
    consigneeName: optionalString(body.consigneeName),
    consigneeCompany: optionalString(body.consigneeCompany),
    shipmentMode,
    loadType,
    serviceLevel,
    direction: optionalString(body.direction),
    originCountry,
    originCity: optionalString(body.originCity),
    originPort,
    pickupAddress: optionalString(body.pickupAddress),
    destinationCountry,
    destinationCity: optionalString(body.destinationCity),
    destinationPort,
    deliveryAddress: optionalString(body.deliveryAddress),
    incoterm: optionalString(body.incoterm),
    preferredDepartureDate: optionalString(body.preferredDepartureDate),
    preferredArrivalTarget: optionalString(body.preferredArrivalTarget),
    commoditySummary,
    cargoType: commoditySummary,
    packageCount: optionalNumber(body.packageCount),
    packagingType: optionalString(body.packagingType),
    grossWeight: optionalNumber(body.grossWeight),
    netWeight: optionalNumber(body.netWeight),
    volumeCbm: optionalNumber(body.volumeCbm),
    dangerousGoods: Boolean(body.dangerousGoods),
    temperatureControlled: Boolean(body.temperatureControlled),
    customsDocsReady: Boolean(body.customsDocsReady),
    insuranceRequired: Boolean(body.insuranceRequired),
    specialHandlingNotes: optionalString(body.specialHandlingNotes),
    containerType,
    containerSize,
    containerQuantity,
    emptyPickupLocation: optionalString(body.emptyPickupLocation),
    emptyReturnDepotPreference: optionalString(body.emptyReturnDepotPreference),
    sealRequired: Boolean(body.sealRequired),
    truckingRequired: Boolean(body.truckingRequired),
    warehousingRequired: Boolean(body.warehousingRequired),
    customsClearanceSupportRequired: Boolean(body.customsClearanceSupportRequired),
    originHandlingNeeded: Boolean(body.originHandlingNeeded),
    destinationHandlingNeeded: Boolean(body.destinationHandlingNeeded),
    quoteAmount,
    currency: optionalString(body.currency) || 'USD',
    validityUntil: body.validityUntil || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    route: buildRouteSummary(body as Record<string, any>),
    requestedVehicleType: containerType || shipmentMode,
  };
}

function extractPricingSnapshot(quote: Record<string, any>) {
  return {
    quotedAmount: Number(quote.quotedAmount || quote.quoteAmount || 0),
    currency: String(quote.currency || 'USD'),
    baseFreight: Number(quote.baseFreight || 0),
    originCharges: Number(quote.originCharges || 0),
    destinationCharges: Number(quote.destinationCharges || 0),
    customsEstimate: Number(quote.customsEstimate || 0),
    inlandTransportEstimate: Number(quote.inlandTransportEstimate || 0),
    insuranceEstimate: Number(quote.insuranceEstimate || 0),
    handlingFees: Number(quote.handlingFees || 0),
    discount: Number(quote.discount || 0),
  };
}

function extractCustomerSnapshot(quote: Record<string, any>, user: AuthenticatedUser) {
  return {
    customerName: quote.customerName || user.name,
    companyName: quote.companyName || '',
    phone: quote.phone || user.phone || '',
    email: quote.email || user.email || '',
    consigneeName: quote.consigneeName || '',
    consigneeCompany: quote.consigneeCompany || '',
  };
}

function extractRouteSnapshot(quote: Record<string, any>) {
  return {
    originCountry: quote.originCountry || '',
    originPort: quote.originPort || quote.originCity || '',
    destinationCountry: quote.destinationCountry || '',
    destinationPort: quote.destinationPort || quote.destinationCity || '',
    inlandDestination: quote.inlandDestination || quote.deliveryAddress || '',
    route: quote.route || buildRouteSummary(quote),
  };
}

function extractCargoSnapshot(quote: Record<string, any>) {
  return {
    commoditySummary: quote.commoditySummary || quote.cargoType || '',
    grossWeight: Number(quote.grossWeight || 0),
    volumeCbm: Number(quote.volumeCbm || 0),
    packageCount: Number(quote.packageCount || 0),
    packagingType: quote.packagingType || '',
    containerType: quote.containerType || '',
    containerSize: quote.containerSize || '',
    containerQuantity: Number(quote.containerQuantity || 0),
  };
}

function extractOperationalReadinessSnapshot(quote: Record<string, any>) {
  return {
    customsDocsReady: Boolean(quote.customsDocsReady),
    customsClearanceSupportRequired: Boolean(quote.customsClearanceSupportRequired),
    truckingRequired: Boolean(quote.truckingRequired),
    warehousingRequired: Boolean(quote.warehousingRequired),
    insuranceRequired: Boolean(quote.insuranceRequired),
    originHandlingNeeded: Boolean(quote.originHandlingNeeded),
    destinationHandlingNeeded: Boolean(quote.destinationHandlingNeeded),
  };
}
