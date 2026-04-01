import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { connectToDatabase } from '../../database/mongo';
import {
  AgreementModel,
  AgreementSignatureModel,
  BookingModel,
  BranchModel,
  CollectionTaskModel,
  CustomerModel,
  CustomerProfileModel,
  DocumentModel,
  InvoiceModel,
  LeadModel,
  OnboardingTaskModel,
  OutboundNotificationModel,
  PaymentModel,
  QuoteModel,
  TripEventModel,
  TripModel,
  UploadedDocumentModel,
  VehicleModel,
} from '../../database/models';
import { CurrentUser } from '../auth/current-user.decorator';
import { Permissions } from '../auth/permissions.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { NotificationJobsService } from '../notifications/notification-jobs.service';

@ApiTags('commercial')
@Controller()
export class CommercialController {
  constructor(private readonly notificationJobsService: NotificationJobsService) {}

  @Get('leads')
  async leads() {
    await connectToDatabase();
    return LeadModel.find().sort({ createdAt: -1 }).limit(100).lean();
  }

  @Post('leads')
  async createLead(@Body() body: Record<string, unknown>) {
    await connectToDatabase();
    const count = await LeadModel.countDocuments({});
    const doc = await LeadModel.create({ leadCode: `LEAD-${String(count + 1).padStart(5, '0')}`, ...body });
    return doc.toObject();
  }

  @Get('available-vehicles')
  async availableVehicles(@Query('branch') branch?: string) {
    await connectToDatabase();
    const query: Record<string, unknown> = { currentStatus: 'available' };
    if (branch) query.branchName = branch;
    return VehicleModel.find(query).sort({ lastGpsAt: -1 }).limit(100).lean();
  }

  @Get('onboarding-tasks')
  async onboardingTasks() {
    await connectToDatabase();
    return OnboardingTaskModel.find().sort({ dueAt: 1 }).limit(100).lean();
  }

  @Post('onboarding-tasks')
  async createOnboardingTask(@Body() body: Record<string, unknown>) {
    await connectToDatabase();
    const count = await OnboardingTaskModel.countDocuments({});
    const doc = await OnboardingTaskModel.create({ taskCode: `ONB-${String(count + 1).padStart(5, '0')}`, ...body });
    return doc.toObject();
  }

  @Get('outbound-notifications')
  async outboundNotifications() {
    await connectToDatabase();
    return OutboundNotificationModel.find().sort({ createdAt: -1 }).limit(100).lean();
  }

  @Post('outbound-notifications')
  async createOutbound(@Body() body: Record<string, unknown>) {
    await connectToDatabase();
    const count = await OutboundNotificationModel.countDocuments({});
    const doc = await OutboundNotificationModel.create({
      notificationCode: `OUT-${String(count + 1).padStart(5, '0')}`,
      status: 'queued',
      ...body,
    });
    await this.notificationJobsService.enqueue({ kind: 'outbound', id: String(doc._id) });
    return doc.toObject();
  }

  @Get('commercial/workspace')
  @Permissions('customers:view', 'agreements:view', 'documents:view', 'payments:view', 'trips:view', 'invoices:view')
  async workspace(@CurrentUser() user: AuthenticatedUser, @Query('customerCode') customerCode?: string) {
    await connectToDatabase();

    const resolvedCustomerCode = await this.resolveCustomerCode(user, customerCode);
    if (!resolvedCustomerCode) {
      return {
        customer: null,
        overview: {
          accountStatus: 'unknown',
          activeTrips: 0,
          pendingQuote: 0,
          pendingAgreement: 0,
          unpaidInvoices: 0,
        },
        quotes: [],
        agreements: [],
        documents: [],
        invoices: [],
        recentPayments: [],
        activeTrips: [],
      };
    }

    const customer = await CustomerModel.findOne({ customerCode: resolvedCustomerCode }).lean<any>();
    const customerId = customer?._id ?? null;
    const [profile, quotes, bookings, agreements, invoices, payments, trips, collectionTasks, uploadedDocs, docs] = await Promise.all([
      customerId ? CustomerProfileModel.findOne({ customerId }).lean<any>() : null,
      QuoteModel.find({ customerCode: resolvedCustomerCode }).sort({ createdAt: -1 }).limit(12).lean(),
      BookingModel.find({ customerCode: resolvedCustomerCode }).sort({ createdAt: -1 }).limit(12).lean(),
      AgreementModel.find({ customerCode: resolvedCustomerCode }).sort({ createdAt: -1 }).limit(12).lean(),
      InvoiceModel.find({ customerCode: resolvedCustomerCode }).sort({ issueDate: -1 }).limit(12).lean(),
      PaymentModel.find({ customerCode: resolvedCustomerCode }).sort({ paymentDate: -1 }).limit(12).lean(),
      TripModel.find({ customerCode: resolvedCustomerCode }).sort({ createdAt: -1 }).limit(12).lean(),
      customerId ? CollectionTaskModel.find({ customerId }).sort({ updatedAt: -1 }).limit(12).lean() : [],
      UploadedDocumentModel.find({ entityId: resolvedCustomerCode }).sort({ createdAt: -1 }).limit(24).lean(),
      DocumentModel.find({ entityId: resolvedCustomerCode }).sort({ createdAt: -1 }).limit(24).lean(),
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

    const activeTrips = trips.filter((item) => !['completed', 'cancelled'].includes(String(item.status)));
    const pendingQuote = quotes.filter((item) => ['requested', 'pending'].includes(String(item.status))).length;
    const pendingAgreement = agreements.filter((item) => ['draft', 'sent_for_signature', 'pending_signature'].includes(String(item.status))).length;
    const unpaidInvoices = invoices.filter((item) => Number(item.outstandingAmount ?? 0) > 0 || ['pending', 'overdue', 'unpaid'].includes(String(item.status))).length;
    const mergedDocuments = [...uploadedDocs, ...docs]
      .sort((left, right) => new Date(String(right.createdAt)).getTime() - new Date(String(left.createdAt)).getTime())
      .slice(0, 16);

    return {
      customer: customer
        ? {
            customerCode: customer.customerCode,
            companyName: customer.companyName,
            status: customer.status,
            city: customer.city,
            segment: customer.segment,
            contactPerson: profile?.contactPerson ?? profile?.fullName ?? customer.companyName,
            phone: profile?.phone ?? null,
            email: profile?.email ?? null,
            tradeLicense: profile?.tradeLicense ?? null,
            tin: profile?.tin ?? null,
            vat: profile?.vat ?? null,
          }
        : null,
      overview: {
        accountStatus: profile?.accountState ?? customer?.status ?? 'active',
        activeTrips: activeTrips.length,
        pendingQuote,
        pendingAgreement,
        unpaidInvoices,
        pendingCollectionTasks: collectionTasks.filter((item) => String(item.status) !== 'closed').length,
        activeBookings: bookings.filter((item) => !['completed', 'cancelled'].includes(String(item.status))).length,
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
      agreements: agreements.map((item) => ({
        id: String(item._id),
        agreementCode: item.agreementCode,
        status: item.status,
        totalValue: Number(item.totalValue ?? 0),
        startDate: item.startDate,
        endDate: item.endDate,
        downloadUrl: item.signedPdfUrl || `/agreements/${String(item._id)}/download`,
      })),
      documents: mergedDocuments.map((item) => ({
        id: String(item._id),
        title: item.title || item.fileName,
        category: item.category || item.documentType || 'document',
        status: item.status || item.approvalStatus || 'available',
        createdAt: item.createdAt,
        downloadUrl: item.storageMode === 's3' ? '' : `/documents/${String(item._id)}`,
      })),
      invoices: invoices.map((item) => ({
        id: String(item._id),
        invoiceCode: item.invoiceCode,
        issueDate: item.issueDate,
        dueDate: item.dueDate,
        totalAmount: Number(item.totalAmount ?? 0),
        outstandingAmount: Number(item.outstandingAmount ?? 0),
        status: item.status,
        tripCode: item.tripCode,
      })),
      recentPayments: payments.map((item) => ({
        id: String(item._id),
        paymentCode: item.paymentCode,
        invoiceCode: item.invoiceCode,
        amount: Number(item.amount ?? 0),
        status: item.status,
        paymentDate: item.paymentDate,
      })),
      activeTrips: activeTrips.map((item) => {
        const events = eventsByTripId.get(String(item._id)) ?? [];
        const latestEvent = events[events.length - 1] ?? null;
        return {
          id: String(item._id),
          tripCode: item.tripCode,
          route: item.routeName || `${item.origin} - ${item.destination}`,
          origin: item.origin,
          destination: item.destination,
          status: item.status,
          eta: item.plannedArrivalAt ?? null,
          assignedVehicle: item.vehicleCode ?? 'Pending assignment',
          proofOfDeliveryUploaded: Boolean(item.proofOfDeliveryUploaded),
          milestoneTimeline: events.slice(-4).map((event) => ({
            id: String(event._id),
            title: event.title || event.eventType,
            eventAt: event.eventAt,
            location: event.location,
          })),
          routeStatus: latestEvent?.location || item.currentCheckpoint || 'En route',
          stopsAway: this.computeStopsAway(item.status),
        };
      }),
    };
  }

  private async resolveCustomerCode(user: AuthenticatedUser, requestedCustomerCode?: string) {
    if (user.role === 'customer') {
      return user.customerCode || null;
    }
    if (requestedCustomerCode) {
      return requestedCustomerCode;
    }
    const latestTrip = await TripModel.findOne({ customerCode: { $ne: null } }).sort({ createdAt: -1 }).select('customerCode').lean<any>();
    if (latestTrip?.customerCode) {
      return latestTrip.customerCode;
    }
    const latestCustomer = await CustomerModel.findOne().sort({ createdAt: -1 }).select('customerCode').lean<any>();
    return latestCustomer?.customerCode ?? null;
  }

  private computeStopsAway(status?: string) {
    const value = String(status || '');
    if (['offloading', 'completed'].includes(value)) return 0;
    if (['in_djibouti', 'at_border'].includes(value)) return 1;
    if (['at_checkpoint', 'delayed'].includes(value)) return 2;
    if (['in_transit', 'loading', 'loaded'].includes(value)) return 3;
    return 4;
  }

  @Get('commercial/customers-workspace')
  @Permissions('customers:view', 'agreements:view', 'payments:view', 'documents:view', 'trips:view')
  async customersWorkspace() {
    await connectToDatabase();
    const [customers, profiles, trips, agreements, invoices, payments, documents, branches] = await Promise.all([
      CustomerModel.find().sort({ createdAt: -1 }).limit(120).lean(),
      CustomerProfileModel.find().lean(),
      TripModel.find().sort({ createdAt: -1 }).limit(400).lean(),
      AgreementModel.find().sort({ createdAt: -1 }).limit(240).lean(),
      InvoiceModel.find().sort({ issueDate: -1 }).limit(320).lean(),
      PaymentModel.find().sort({ paymentDate: -1 }).limit(320).lean(),
      DocumentModel.find({ entityType: { $in: ['customer', 'agreement', 'invoice'] } }).sort({ createdAt: -1 }).limit(320).lean(),
      BranchModel.find().lean(),
    ]);

    const profileMap = new Map(profiles.map((profile: any) => [String(profile.customerId), profile]));
    const branchMap = new Map(branches.map((branch: any) => [String(branch._id), branch.name]));
    const rows = customers.map((customer: any) => {
      const customerKey = String(customer._id);
      const customerProfile = profileMap.get(customerKey);
      const customerTrips = trips.filter((trip: any) => String(trip.customerId) === customerKey);
      const customerAgreements = agreements.filter((agreement: any) => String(agreement.customerId) === customerKey);
      const customerInvoices = invoices.filter((invoice: any) => String(invoice.customerId) === customerKey);
      const customerPayments = payments.filter((payment: any) => String(payment.customerId) === customerKey);
      const customerDocs = documents.filter((document: any) => String(document.entityId) === customer.customerCode).slice(0, 6);
      const activeTrips = customerTrips.filter((trip: any) => !['completed', 'cancelled'].includes(String(trip.status)));
      const unpaidBalance = customerInvoices.reduce((sum: number, invoice: any) => sum + Number(invoice.outstandingAmount || 0), 0);
      const totalRevenue = customerInvoices.reduce((sum: number, invoice: any) => sum + Number(invoice.totalAmount || 0), 0);
      const pendingAgreements = customerAgreements.filter((agreement: any) => ['draft', 'under_review', 'sent_for_signature', 'pending_signature'].includes(String(agreement.status)));
      return {
        id: customerKey,
        customerCode: customer.customerCode || 'Customer',
        companyName: customer.companyName || 'Customer account',
        contactPerson: customerProfile?.contactPerson || customerProfile?.fullName || 'Contact pending',
        phone: customerProfile?.phone || 'Phone pending',
        branch: branchMap.get(String(customer.branchId)) || customer.city || 'Unknown branch',
        activeTrips: activeTrips.length,
        agreements: customerAgreements.length,
        unpaidBalance,
        status: customer.status || 'active',
        accountManager: customerProfile?.accountManager || 'Commercial desk',
        accountManagerPhone: customerProfile?.accountManagerPhone || 'Phone pending',
        hasActiveAgreement: customerAgreements.some((agreement: any) => String(agreement.status) === 'signed'),
        trips: activeTrips.slice(0, 6).map((trip: any) => ({
          tripCode: trip.tripCode || 'Trip',
          route: trip.routeName || `${trip.origin || 'Origin'} -> ${trip.destination || 'Destination'}`,
          status: trip.status || 'assigned',
          eta: trip.plannedArrivalAt || null,
          value: Number(trip.revenueAmount || 0),
        })),
        agreementsDetail: customerAgreements.slice(0, 6).map((agreement: any) => ({
          agreementCode: agreement.agreementCode || 'Agreement',
          status: agreement.status || 'draft',
          totalValue: Number(agreement.totalValue || 0),
          endDate: agreement.endDate || null,
        })),
        invoices: customerInvoices.slice(0, 8).map((invoice: any) => ({
          invoiceCode: invoice.invoiceCode || 'Invoice',
          status: invoice.status || 'pending',
          totalAmount: Number(invoice.totalAmount || 0),
          outstandingAmount: Number(invoice.outstandingAmount || 0),
          dueDate: invoice.dueDate || null,
        })),
        payments: customerPayments.slice(0, 8).map((payment: any) => ({
          paymentCode: payment.paymentCode || 'Payment',
          amount: Number(payment.amount || 0),
          status: payment.status || 'pending',
          paymentDate: payment.paymentDate || null,
        })),
        documents: customerDocs.map((document: any) => ({
          title: document.fileName || document.title || 'Document',
          category: document.category || 'document',
          status: document.approvalStatus || 'available',
        })),
        totalRevenue,
        pendingAgreements: pendingAgreements.length,
      };
    });

    const topRevenue = rows.reduce((max, row) => Math.max(max, row.totalRevenue), 0);

    return {
      kpis: {
        total: rows.length,
        active: rows.filter((row) => row.status === 'active').length,
        activeTrips: rows.reduce((sum, row) => sum + row.activeTrips, 0),
        unpaidBalance: rows.reduce((sum, row) => sum + row.unpaidBalance, 0),
        pendingAgreements: rows.reduce((sum, row) => sum + row.pendingAgreements, 0),
        topRevenue,
      },
      rows,
    };
  }

  @Get('commercial/agreements-workspace')
  @Permissions('agreements:view', 'customers:view')
  async agreementsWorkspace() {
    await connectToDatabase();
    const [agreements, signatures, customers] = await Promise.all([
      AgreementModel.find().sort({ createdAt: -1 }).limit(240).lean(),
      AgreementSignatureModel.find().sort({ signedAt: -1 }).limit(240).lean(),
      CustomerModel.find().select('customerCode companyName').lean(),
    ]);
    const customerMap = new Map(customers.map((customer: any) => [customer.customerCode, customer.companyName]));
    const signatureMap = new Map(signatures.map((signature: any) => [String(signature.agreementId), signature]));

    const rows = agreements.map((agreement: any) => {
      const signature = signatureMap.get(String(agreement._id));
      const endDate = agreement.endDate ? new Date(String(agreement.endDate)) : null;
      const expiringSoon = Boolean(endDate && endDate.getTime() < Date.now() + 21 * 24 * 60 * 60 * 1000 && endDate.getTime() > Date.now());
      const expired = Boolean(endDate && endDate.getTime() < Date.now());
      return {
        id: String(agreement._id),
        agreementCode: agreement.agreementCode || 'Agreement',
        customer: agreement.customerName || customerMap.get(agreement.customerCode) || 'Customer pending',
        status: agreement.status || 'draft',
        value: Number(agreement.totalValue || 0),
        startDate: agreement.startDate || null,
        endDate: agreement.endDate || null,
        signStatus: signature ? 'signed' : ['sent_for_signature', 'pending_signature'].includes(String(agreement.status)) ? 'awaiting_signature' : 'unsigned',
        signedAt: signature?.signedAt || null,
        pdfUrl: agreement.signedPdfUrl || `/agreements/${String(agreement._id)}/download`,
        signer: signature?.signerName || 'Pending signer',
        signerPhone: signature?.signerPhone || 'Phone pending',
        secureSignLink: agreement.secureSignToken ? `https://tikurabay.local/sign/${agreement.secureSignToken}` : null,
        expiringSoon,
        expired,
        auditTrail: signature?.auditTrail || ['Draft created', 'Commercial review in progress'],
        documents: [
          { title: 'Contract PDF', status: 'available', href: agreement.signedPdfUrl || `/agreements/${String(agreement._id)}/download` },
          { title: signature ? 'Signed PDF' : 'Signature packet', status: signature ? 'signed' : 'pending', href: agreement.signedPdfUrl || `/agreements/${String(agreement._id)}/download` },
        ],
      };
    });

    return {
      kpis: {
        total: rows.length,
        signed: rows.filter((row) => row.signStatus === 'signed').length,
        pendingSignature: rows.filter((row) => row.signStatus === 'awaiting_signature').length,
        underReview: rows.filter((row) => row.status === 'under_review').length,
        expiringSoon: rows.filter((row) => row.expiringSoon).length,
        expired: rows.filter((row) => row.expired).length,
      },
      rows,
    };
  }

  @Get('commercial/marketing-workspace')
  @Permissions('customers:view', 'agreements:view')
  async marketingWorkspace() {
    await connectToDatabase();
    const [leads, quotes, tasks, agreements, vehicles, branches] = await Promise.all([
      LeadModel.find().sort({ createdAt: -1 }).limit(180).lean(),
      QuoteModel.find().sort({ createdAt: -1 }).limit(180).lean(),
      OnboardingTaskModel.find().sort({ dueAt: 1 }).limit(120).lean(),
      AgreementModel.find().sort({ createdAt: -1 }).limit(180).lean(),
      VehicleModel.find({ currentStatus: 'available' }).select('vehicleCode branchName type readyForAssignment').lean(),
      BranchModel.find().lean(),
    ]);
    const branchMap = new Map(branches.map((branch: any) => [String(branch._id), branch.name]));
    const availableByBranch = branches.map((branch: any) => ({
      branch: branch.name,
      availableVehicles: vehicles.filter((vehicle: any) => vehicle.branchName === branch.name && vehicle.readyForAssignment).length,
      highlightedVehicle: vehicles.find((vehicle: any) => vehicle.branchName === branch.name)?.vehicleCode || 'No ready unit',
    })).filter((item) => item.availableVehicles > 0);

    const leadRows = leads.map((lead: any) => {
      const linkedQuotes = quotes.filter((quote: any) => quote.customerId && String(quote.customerId) === String(lead.customerId));
      const linkedAgreements = agreements.filter((agreement: any) => agreement.customerId && String(agreement.customerId) === String(lead.customerId));
      const linkedTasks = tasks.filter((task: any) => task.customerId && String(task.customerId) === String(lead.customerId));
      return {
        id: String(lead._id),
        leadCode: lead.leadCode || 'Lead',
        companyName: lead.companyName || 'Prospect',
        contactPerson: lead.contactPerson || 'Contact pending',
        phone: lead.phone || 'Phone pending',
        branch: branchMap.get(String(lead.branchId)) || 'Unknown branch',
        routeInterest: lead.routeInterest || 'Route pending',
        status: lead.status || 'new',
        assignedTo: lead.assignedTo || 'Marketing desk',
        notes: lead.notes || 'Follow-up required.',
        quotes: linkedQuotes.slice(0, 4).map((quote: any) => ({
          quoteCode: quote.quoteCode || 'Quote',
          status: quote.status || 'requested',
          amount: Number(quote.amount || quote.quotedAmount || 0),
        })),
        pendingAgreements: linkedAgreements.filter((agreement: any) => ['draft', 'under_review', 'sent_for_signature'].includes(String(agreement.status))).length,
        followUps: linkedTasks.slice(0, 4).map((task: any) => ({
          taskCode: task.taskCode || 'Task',
          title: task.title || 'Follow-up task',
          status: task.status || 'pending',
          dueAt: task.dueAt || null,
        })),
      };
    });

    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const closedThisMonth = leadRows.filter((lead) => ['won', 'lost'].includes(lead.status) && new Date(String((leads.find((item: any) => String(item._id) === lead.id) as any)?.updatedAt || new Date())).getTime() >= monthStart.getTime());
    const wonThisMonth = closedThisMonth.filter((lead) => lead.status === 'won').length;

    return {
      kpis: {
        newLeads: leadRows.filter((lead) => lead.status === 'new').length,
        openQuotes: quotes.filter((quote: any) => ['requested', 'sent', 'approved'].includes(String(quote.status))).length,
        pendingFollowUp: tasks.filter((task: any) => ['pending', 'in_progress'].includes(String(task.status))).length,
        pendingAgreements: agreements.filter((agreement: any) => ['draft', 'under_review', 'sent_for_signature'].includes(String(agreement.status))).length,
        availableVehiclesToOffer: vehicles.filter((vehicle: any) => vehicle.readyForAssignment).length,
        conversionThisMonth: closedThisMonth.length ? Math.round((wonThisMonth / closedThisMonth.length) * 100) : 0,
      },
      leads: leadRows,
      quoteRequests: quotes.map((quote: any) => ({
        id: String(quote._id),
        quoteCode: quote.quoteCode || 'Quote',
        customer: quote.customerName || 'Prospect',
        route: quote.route || 'Route pending',
        vehicleType: quote.requestedVehicleType || 'Open vehicle',
        amount: Number(quote.amount || quote.quotedAmount || 0),
        status: quote.status || 'requested',
        requestedDate: quote.requestedDate || null,
      })),
      availableByBranch,
      followUpTasks: tasks.map((task: any) => ({
        id: String(task._id),
        taskCode: task.taskCode || 'Task',
        customerId: task.customerId ? String(task.customerId) : null,
        title: task.title || 'Follow-up task',
        status: task.status || 'pending',
        dueAt: task.dueAt || null,
        assignedTo: task.assignedTo || 'Marketing desk',
      })),
    };
  }
}
