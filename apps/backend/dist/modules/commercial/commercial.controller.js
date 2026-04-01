"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommercialController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const mongo_1 = require("../../database/mongo");
const models_1 = require("../../database/models");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const notification_jobs_service_1 = require("../notifications/notification-jobs.service");
let CommercialController = class CommercialController {
    constructor(notificationJobsService) {
        this.notificationJobsService = notificationJobsService;
    }
    async leads() {
        await (0, mongo_1.connectToDatabase)();
        return models_1.LeadModel.find().sort({ createdAt: -1 }).limit(100).lean();
    }
    async createLead(body) {
        await (0, mongo_1.connectToDatabase)();
        const count = await models_1.LeadModel.countDocuments({});
        const doc = await models_1.LeadModel.create({ leadCode: `LEAD-${String(count + 1).padStart(5, '0')}`, ...body });
        return doc.toObject();
    }
    async availableVehicles(branch) {
        await (0, mongo_1.connectToDatabase)();
        const query = { currentStatus: 'available' };
        if (branch)
            query.branchName = branch;
        return models_1.VehicleModel.find(query).sort({ lastGpsAt: -1 }).limit(100).lean();
    }
    async onboardingTasks() {
        await (0, mongo_1.connectToDatabase)();
        return models_1.OnboardingTaskModel.find().sort({ dueAt: 1 }).limit(100).lean();
    }
    async createOnboardingTask(body) {
        await (0, mongo_1.connectToDatabase)();
        const count = await models_1.OnboardingTaskModel.countDocuments({});
        const doc = await models_1.OnboardingTaskModel.create({ taskCode: `ONB-${String(count + 1).padStart(5, '0')}`, ...body });
        return doc.toObject();
    }
    async outboundNotifications() {
        await (0, mongo_1.connectToDatabase)();
        return models_1.OutboundNotificationModel.find().sort({ createdAt: -1 }).limit(100).lean();
    }
    async createOutbound(body) {
        await (0, mongo_1.connectToDatabase)();
        const count = await models_1.OutboundNotificationModel.countDocuments({});
        const doc = await models_1.OutboundNotificationModel.create({
            notificationCode: `OUT-${String(count + 1).padStart(5, '0')}`,
            status: 'queued',
            ...body,
        });
        await this.notificationJobsService.enqueue({ kind: 'outbound', id: String(doc._id) });
        return doc.toObject();
    }
    async workspace(user, customerCode) {
        await (0, mongo_1.connectToDatabase)();
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
        const customer = await models_1.CustomerModel.findOne({ customerCode: resolvedCustomerCode }).lean();
        const customerId = customer?._id ?? null;
        const [profile, quotes, bookings, agreements, invoices, payments, trips, collectionTasks, uploadedDocs, docs] = await Promise.all([
            customerId ? models_1.CustomerProfileModel.findOne({ customerId }).lean() : null,
            models_1.QuoteModel.find({ customerCode: resolvedCustomerCode }).sort({ createdAt: -1 }).limit(12).lean(),
            models_1.BookingModel.find({ customerCode: resolvedCustomerCode }).sort({ createdAt: -1 }).limit(12).lean(),
            models_1.AgreementModel.find({ customerCode: resolvedCustomerCode }).sort({ createdAt: -1 }).limit(12).lean(),
            models_1.InvoiceModel.find({ customerCode: resolvedCustomerCode }).sort({ issueDate: -1 }).limit(12).lean(),
            models_1.PaymentModel.find({ customerCode: resolvedCustomerCode }).sort({ paymentDate: -1 }).limit(12).lean(),
            models_1.TripModel.find({ customerCode: resolvedCustomerCode }).sort({ createdAt: -1 }).limit(12).lean(),
            customerId ? models_1.CollectionTaskModel.find({ customerId }).sort({ updatedAt: -1 }).limit(12).lean() : [],
            models_1.UploadedDocumentModel.find({ entityId: resolvedCustomerCode }).sort({ createdAt: -1 }).limit(24).lean(),
            models_1.DocumentModel.find({ entityId: resolvedCustomerCode }).sort({ createdAt: -1 }).limit(24).lean(),
        ]);
        const tripIds = trips.map((item) => item._id);
        const tripEvents = tripIds.length
            ? await models_1.TripEventModel.find({ tripId: { $in: tripIds } }).sort({ eventAt: 1 }).lean()
            : [];
        const eventsByTripId = new Map();
        for (const event of tripEvents) {
            const key = String(event.tripId);
            if (!eventsByTripId.has(key))
                eventsByTripId.set(key, []);
            eventsByTripId.get(key).push(event);
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
    async resolveCustomerCode(user, requestedCustomerCode) {
        if (user.role === 'customer') {
            return user.customerCode || null;
        }
        if (requestedCustomerCode) {
            return requestedCustomerCode;
        }
        const latestTrip = await models_1.TripModel.findOne({ customerCode: { $ne: null } }).sort({ createdAt: -1 }).select('customerCode').lean();
        if (latestTrip?.customerCode) {
            return latestTrip.customerCode;
        }
        const latestCustomer = await models_1.CustomerModel.findOne().sort({ createdAt: -1 }).select('customerCode').lean();
        return latestCustomer?.customerCode ?? null;
    }
    computeStopsAway(status) {
        const value = String(status || '');
        if (['offloading', 'completed'].includes(value))
            return 0;
        if (['in_djibouti', 'at_border'].includes(value))
            return 1;
        if (['at_checkpoint', 'delayed'].includes(value))
            return 2;
        if (['in_transit', 'loading', 'loaded'].includes(value))
            return 3;
        return 4;
    }
    async customersWorkspace() {
        await (0, mongo_1.connectToDatabase)();
        const [customers, profiles, trips, agreements, invoices, payments, documents, branches] = await Promise.all([
            models_1.CustomerModel.find().sort({ createdAt: -1 }).limit(120).lean(),
            models_1.CustomerProfileModel.find().lean(),
            models_1.TripModel.find().sort({ createdAt: -1 }).limit(400).lean(),
            models_1.AgreementModel.find().sort({ createdAt: -1 }).limit(240).lean(),
            models_1.InvoiceModel.find().sort({ issueDate: -1 }).limit(320).lean(),
            models_1.PaymentModel.find().sort({ paymentDate: -1 }).limit(320).lean(),
            models_1.DocumentModel.find({ entityType: { $in: ['customer', 'agreement', 'invoice'] } }).sort({ createdAt: -1 }).limit(320).lean(),
            models_1.BranchModel.find().lean(),
        ]);
        const profileMap = new Map(profiles.map((profile) => [String(profile.customerId), profile]));
        const branchMap = new Map(branches.map((branch) => [String(branch._id), branch.name]));
        const rows = customers.map((customer) => {
            const customerKey = String(customer._id);
            const customerProfile = profileMap.get(customerKey);
            const customerTrips = trips.filter((trip) => String(trip.customerId) === customerKey);
            const customerAgreements = agreements.filter((agreement) => String(agreement.customerId) === customerKey);
            const customerInvoices = invoices.filter((invoice) => String(invoice.customerId) === customerKey);
            const customerPayments = payments.filter((payment) => String(payment.customerId) === customerKey);
            const customerDocs = documents.filter((document) => String(document.entityId) === customer.customerCode).slice(0, 6);
            const activeTrips = customerTrips.filter((trip) => !['completed', 'cancelled'].includes(String(trip.status)));
            const unpaidBalance = customerInvoices.reduce((sum, invoice) => sum + Number(invoice.outstandingAmount || 0), 0);
            const totalRevenue = customerInvoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0);
            const pendingAgreements = customerAgreements.filter((agreement) => ['draft', 'under_review', 'sent_for_signature', 'pending_signature'].includes(String(agreement.status)));
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
                hasActiveAgreement: customerAgreements.some((agreement) => String(agreement.status) === 'signed'),
                trips: activeTrips.slice(0, 6).map((trip) => ({
                    tripCode: trip.tripCode || 'Trip',
                    route: trip.routeName || `${trip.origin || 'Origin'} -> ${trip.destination || 'Destination'}`,
                    status: trip.status || 'assigned',
                    eta: trip.plannedArrivalAt || null,
                    value: Number(trip.revenueAmount || 0),
                })),
                agreementsDetail: customerAgreements.slice(0, 6).map((agreement) => ({
                    agreementCode: agreement.agreementCode || 'Agreement',
                    status: agreement.status || 'draft',
                    totalValue: Number(agreement.totalValue || 0),
                    endDate: agreement.endDate || null,
                })),
                invoices: customerInvoices.slice(0, 8).map((invoice) => ({
                    invoiceCode: invoice.invoiceCode || 'Invoice',
                    status: invoice.status || 'pending',
                    totalAmount: Number(invoice.totalAmount || 0),
                    outstandingAmount: Number(invoice.outstandingAmount || 0),
                    dueDate: invoice.dueDate || null,
                })),
                payments: customerPayments.slice(0, 8).map((payment) => ({
                    paymentCode: payment.paymentCode || 'Payment',
                    amount: Number(payment.amount || 0),
                    status: payment.status || 'pending',
                    paymentDate: payment.paymentDate || null,
                })),
                documents: customerDocs.map((document) => ({
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
    async agreementsWorkspace() {
        await (0, mongo_1.connectToDatabase)();
        const [agreements, signatures, customers] = await Promise.all([
            models_1.AgreementModel.find().sort({ createdAt: -1 }).limit(240).lean(),
            models_1.AgreementSignatureModel.find().sort({ signedAt: -1 }).limit(240).lean(),
            models_1.CustomerModel.find().select('customerCode companyName').lean(),
        ]);
        const customerMap = new Map(customers.map((customer) => [customer.customerCode, customer.companyName]));
        const signatureMap = new Map(signatures.map((signature) => [String(signature.agreementId), signature]));
        const rows = agreements.map((agreement) => {
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
    async marketingWorkspace() {
        await (0, mongo_1.connectToDatabase)();
        const [leads, quotes, tasks, agreements, vehicles, branches] = await Promise.all([
            models_1.LeadModel.find().sort({ createdAt: -1 }).limit(180).lean(),
            models_1.QuoteModel.find().sort({ createdAt: -1 }).limit(180).lean(),
            models_1.OnboardingTaskModel.find().sort({ dueAt: 1 }).limit(120).lean(),
            models_1.AgreementModel.find().sort({ createdAt: -1 }).limit(180).lean(),
            models_1.VehicleModel.find({ currentStatus: 'available' }).select('vehicleCode branchName type readyForAssignment').lean(),
            models_1.BranchModel.find().lean(),
        ]);
        const branchMap = new Map(branches.map((branch) => [String(branch._id), branch.name]));
        const availableByBranch = branches.map((branch) => ({
            branch: branch.name,
            availableVehicles: vehicles.filter((vehicle) => vehicle.branchName === branch.name && vehicle.readyForAssignment).length,
            highlightedVehicle: vehicles.find((vehicle) => vehicle.branchName === branch.name)?.vehicleCode || 'No ready unit',
        })).filter((item) => item.availableVehicles > 0);
        const leadRows = leads.map((lead) => {
            const linkedQuotes = quotes.filter((quote) => quote.customerId && String(quote.customerId) === String(lead.customerId));
            const linkedAgreements = agreements.filter((agreement) => agreement.customerId && String(agreement.customerId) === String(lead.customerId));
            const linkedTasks = tasks.filter((task) => task.customerId && String(task.customerId) === String(lead.customerId));
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
                quotes: linkedQuotes.slice(0, 4).map((quote) => ({
                    quoteCode: quote.quoteCode || 'Quote',
                    status: quote.status || 'requested',
                    amount: Number(quote.amount || quote.quotedAmount || 0),
                })),
                pendingAgreements: linkedAgreements.filter((agreement) => ['draft', 'under_review', 'sent_for_signature'].includes(String(agreement.status))).length,
                followUps: linkedTasks.slice(0, 4).map((task) => ({
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
        const closedThisMonth = leadRows.filter((lead) => ['won', 'lost'].includes(lead.status) && new Date(String(leads.find((item) => String(item._id) === lead.id)?.updatedAt || new Date())).getTime() >= monthStart.getTime());
        const wonThisMonth = closedThisMonth.filter((lead) => lead.status === 'won').length;
        return {
            kpis: {
                newLeads: leadRows.filter((lead) => lead.status === 'new').length,
                openQuotes: quotes.filter((quote) => ['requested', 'sent', 'approved'].includes(String(quote.status))).length,
                pendingFollowUp: tasks.filter((task) => ['pending', 'in_progress'].includes(String(task.status))).length,
                pendingAgreements: agreements.filter((agreement) => ['draft', 'under_review', 'sent_for_signature'].includes(String(agreement.status))).length,
                availableVehiclesToOffer: vehicles.filter((vehicle) => vehicle.readyForAssignment).length,
                conversionThisMonth: closedThisMonth.length ? Math.round((wonThisMonth / closedThisMonth.length) * 100) : 0,
            },
            leads: leadRows,
            quoteRequests: quotes.map((quote) => ({
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
            followUpTasks: tasks.map((task) => ({
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
};
exports.CommercialController = CommercialController;
__decorate([
    (0, common_1.Get)('leads'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CommercialController.prototype, "leads", null);
__decorate([
    (0, common_1.Post)('leads'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CommercialController.prototype, "createLead", null);
__decorate([
    (0, common_1.Get)('available-vehicles'),
    __param(0, (0, common_1.Query)('branch')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CommercialController.prototype, "availableVehicles", null);
__decorate([
    (0, common_1.Get)('onboarding-tasks'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CommercialController.prototype, "onboardingTasks", null);
__decorate([
    (0, common_1.Post)('onboarding-tasks'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CommercialController.prototype, "createOnboardingTask", null);
__decorate([
    (0, common_1.Get)('outbound-notifications'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CommercialController.prototype, "outboundNotifications", null);
__decorate([
    (0, common_1.Post)('outbound-notifications'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CommercialController.prototype, "createOutbound", null);
__decorate([
    (0, common_1.Get)('commercial/workspace'),
    (0, permissions_decorator_1.Permissions)('customers:view', 'agreements:view', 'documents:view', 'payments:view', 'trips:view', 'invoices:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('customerCode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CommercialController.prototype, "workspace", null);
__decorate([
    (0, common_1.Get)('commercial/customers-workspace'),
    (0, permissions_decorator_1.Permissions)('customers:view', 'agreements:view', 'payments:view', 'documents:view', 'trips:view'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CommercialController.prototype, "customersWorkspace", null);
__decorate([
    (0, common_1.Get)('commercial/agreements-workspace'),
    (0, permissions_decorator_1.Permissions)('agreements:view', 'customers:view'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CommercialController.prototype, "agreementsWorkspace", null);
__decorate([
    (0, common_1.Get)('commercial/marketing-workspace'),
    (0, permissions_decorator_1.Permissions)('customers:view', 'agreements:view'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CommercialController.prototype, "marketingWorkspace", null);
exports.CommercialController = CommercialController = __decorate([
    (0, swagger_1.ApiTags)('commercial'),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [notification_jobs_service_1.NotificationJobsService])
], CommercialController);
//# sourceMappingURL=commercial.controller.js.map