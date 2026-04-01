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
exports.MobileController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const mongoose_1 = require("mongoose");
const mongo_1 = require("../../database/mongo");
const models_1 = require("../../database/models");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const communication_orchestrator_service_1 = require("../communications/communication-orchestrator.service");
const document_policy_1 = require("../documents/document-policy");
let MobileController = class MobileController {
    constructor(communicationOrchestratorService) {
        this.communicationOrchestratorService = communicationOrchestratorService;
    }
    async recordAuditEvent(user, action, entityType, entityId, metadata) {
        await models_1.ActivityLogModel.create({
            entityType,
            entityId,
            userId: user.id,
            activityType: action,
            title: action.replace(/_/g, ' '),
            description: `${user.name} performed ${action.replace(/_/g, ' ')} on ${entityType} ${entityId}.`,
            metadata,
        }).catch(() => null);
    }
    async createDriverKyc(user, body) {
        await (0, mongo_1.connectToDatabase)();
        const rawBranchId = typeof body.branchId === 'string' ? body.branchId.trim() : '';
        const normalizedBranchId = rawBranchId && mongoose_1.Types.ObjectId.isValid(rawBranchId) ? rawBranchId : undefined;
        const normalizedBranchName = normalizedBranchId ? undefined : rawBranchId || undefined;
        const kyc = await models_1.DriverKycRequestModel.findOneAndUpdate({ userId: user.id }, {
            $set: {
                ...body,
                branchId: normalizedBranchId,
                branchName: normalizedBranchName,
                userId: user.id,
                fullName: body.fullName || user.name,
                phone: body.phone || user.phone,
                status: 'submitted',
            },
        }, { upsert: true, new: true }).lean();
        await models_1.UserModel.findByIdAndUpdate(user.id, { $set: { status: 'submitted' } }).catch(() => null);
        await models_1.DriverProfileModel.findOneAndUpdate({ userId: user.id }, {
            $set: {
                accountState: 'submitted',
                licenseNumber: body.licenseNumber,
                emergencyContact: body.emergencyContact,
                branchId: normalizedBranchId,
            },
        }, { new: true }).catch(() => null);
        return kyc;
    }
    async listDriverKyc(user, status, branchId, q) {
        await (0, mongo_1.connectToDatabase)();
        const filter = user.permissions.includes('*') || ['super_admin', 'executive', 'hr_officer'].includes(user.role)
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
        return models_1.DriverKycRequestModel.find(filter)
            .sort({ status: 1, createdAt: -1 })
            .limit(200)
            .lean();
    }
    async getDriverKyc(id) {
        await (0, mongo_1.connectToDatabase)();
        return models_1.DriverKycRequestModel.findOne({ $or: [{ _id: id }, { userId: id }] }).lean();
    }
    async updateDriverKycStatus(id, user, body) {
        await (0, mongo_1.connectToDatabase)();
        const nextStatus = body.status || 'under_review';
        const reviewNotes = body.reviewNotes || body.notes;
        const kyc = (await models_1.DriverKycRequestModel.findOneAndUpdate({ _id: id }, {
            $set: {
                status: nextStatus,
                notes: reviewNotes,
                reviewNotes,
                reviewedBy: user.email,
                reviewedAt: new Date(),
            },
        }, { new: true }).lean());
        if (!kyc)
            return null;
        const accountState = nextStatus === 'approved'
            ? 'active'
            : nextStatus === 'rejected'
                ? 'rejected'
                : nextStatus === 'suspended'
                    ? 'suspended'
                    : 'submitted';
        const userId = String(kyc.userId ?? '');
        await models_1.UserModel.findByIdAndUpdate(userId, {
            $set: { status: nextStatus === 'approved' ? 'active' : nextStatus },
        }).catch(() => null);
        await models_1.DriverProfileModel.findOneAndUpdate({ userId }, { $set: { accountState } }).catch(() => null);
        await models_1.DriverModel.findOneAndUpdate({ userId }, { $set: { status: nextStatus } }).catch(() => null);
        await this.communicationOrchestratorService?.triggerAutomationEvent?.('kyc_status_changed', {
            entityType: 'driver_kyc_request',
            entityId: String(kyc._id ?? id),
            payload: {
                status: nextStatus,
                driverName: String(kyc.fullName ?? ''),
                documentType: 'KYC package',
            },
        }, { id: user.id || user.email || 'system' });
        return kyc;
    }
    async createBooking(user, body) {
        await (0, mongo_1.connectToDatabase)();
        const quoteId = String(body.quoteId || '').trim();
        if (!quoteId) {
            throw new common_1.BadRequestException('Accepted quote is required before booking can be created');
        }
        const quote = await models_1.QuoteModel.findOne({
            $or: [{ _id: quoteId }, { quoteCode: quoteId }],
            customerCode: user.customerCode,
        }).lean();
        if (!quote) {
            throw new common_1.BadRequestException('Quote not found for this customer');
        }
        if (!['accepted', 'approved'].includes(String(quote.status || '').toLowerCase())) {
            throw new common_1.BadRequestException('Quote must be accepted before booking can be created');
        }
        const existingBooking = await models_1.BookingModel.findOne({
            $or: [{ quoteId: String(quote._id) }, { quoteId: quote.quoteCode }],
        }).lean();
        if (existingBooking) {
            return {
                bookingId: String(existingBooking._id),
                bookingCode: existingBooking.bookingCode,
                shipmentRef: existingBooking.bookingCode,
                status: existingBooking.status,
                alreadyExists: true,
            };
        }
        const bookingCode = nextBusinessCode('BOOK', await models_1.BookingModel.countDocuments({}));
        const shipmentRef = String(body.shipmentRef || quote.shipmentRef || bookingCode);
        const assignedOriginEmail = 'supplier.agent@tikurabay.com';
        const originDeskUser = await models_1.UserModel.findOne({ email: assignedOriginEmail }).lean();
        const booking = await models_1.BookingModel.create({
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
        });
        await models_1.CorridorShipmentModel.create({
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
        await models_1.CorridorPartyAccessModel.bulkWrite([
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
        await models_1.CorridorMilestoneModel.create([
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
        await models_1.QuoteModel.updateOne({ _id: quote._id }, {
            $set: {
                status: 'accepted',
                acceptedAt: quote.acceptedAt || new Date(),
                convertedToShipmentId: shipmentRef,
                bookingId: String(booking._id),
            },
        });
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
    async myBookings(user, limit) {
        await (0, mongo_1.connectToDatabase)();
        const max = Math.min(Math.max(Number(limit || 20), 1), 100);
        return models_1.BookingModel.find({ customerCode: user.customerCode }).sort({ createdAt: -1 }).limit(max).lean();
    }
    async availableFleet() {
        await (0, mongo_1.connectToDatabase)();
        return models_1.VehicleModel.find({ currentStatus: { $in: ['available', 'reserved'] } })
            .select('vehicleCode branchName type brand model currentStatus')
            .sort({ updatedAt: -1 })
            .limit(100)
            .lean();
    }
    async requestQuote(user, body) {
        await (0, mongo_1.connectToDatabase)();
        const validated = validateQuoteRequestBody(body);
        const quoteCode = nextBusinessCode('QUO', await models_1.QuoteModel.countDocuments({}));
        const quote = await models_1.QuoteModel.create({
            ...validated,
            quoteCode,
            customerCode: user.customerCode,
            customerName: validated.customerName || user.name,
            status: 'draft',
            quotedAmount: validated.quoteAmount,
        });
        await this.recordAuditEvent(user, 'quote_created', 'quote', String(quote._id), {
            quoteCode,
            requestSource: validated.requestSource || 'customer',
            route: buildRouteSummary(validated),
            quoteAmount: validated.quoteAmount,
            currency: validated.currency,
        });
        return quote;
    }
    async updateQuoteStatus(user, id, body) {
        await (0, mongo_1.connectToDatabase)();
        const nextStatus = String(body.status || '').trim().toLowerCase();
        if (!['sent', 'waiting_approval', 'accepted', 'rejected', 'revision_requested', 'expired'].includes(nextStatus)) {
            throw new common_1.BadRequestException('Invalid quote status transition');
        }
        const quote = await models_1.QuoteModel.findOne({
            $or: [{ _id: id }, { quoteCode: id }],
            customerCode: user.customerCode,
        }).lean();
        if (!quote) {
            throw new common_1.BadRequestException('Quote not found for this customer');
        }
        if (['accepted', 'rejected', 'expired'].includes(String(quote.status || '').toLowerCase()) && nextStatus !== String(quote.status || '').toLowerCase()) {
            throw new common_1.BadRequestException('Finalized quote cannot change state');
        }
        const patch = {
            status: nextStatus,
            approvalMethod: body.approvalMethod,
            approvalNote: body.note,
        };
        if (nextStatus === 'accepted') {
            patch.acceptedAt = new Date();
            patch.approvedBy = user.email || user.name;
        }
        const updated = await models_1.QuoteModel.findByIdAndUpdate(quote._id, { $set: patch }, { new: true }).lean();
        await this.recordAuditEvent(user, `quote_${nextStatus}`, 'quote', String(quote._id), {
            quoteCode: quote.quoteCode,
            previousStatus: quote.status,
            nextStatus,
            approvalMethod: body.approvalMethod,
            note: body.note,
        });
        return updated;
    }
    async myQuotes(user, limit) {
        await (0, mongo_1.connectToDatabase)();
        const max = Math.min(Math.max(Number(limit || 20), 1), 100);
        return models_1.QuoteModel.find({ customerCode: user.customerCode }).sort({ createdAt: -1 }).limit(max).lean();
    }
    async customerWorkspace(user) {
        await (0, mongo_1.connectToDatabase)();
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
        const customer = await models_1.CustomerModel.findOne({ customerCode }).lean();
        const customerId = customer?._id ?? null;
        const [profile, quotes, bookings, agreements, invoices, payments, trips, uploadedDocs, docs] = await Promise.all([
            customerId ? models_1.CustomerProfileModel.findOne({ customerId }).lean() : null,
            models_1.QuoteModel.find({ customerCode }).sort({ createdAt: -1 }).limit(12).lean(),
            models_1.BookingModel.find({ customerCode }).sort({ createdAt: -1 }).limit(12).lean(),
            models_1.AgreementModel.find({ customerCode }).sort({ createdAt: -1 }).limit(12).lean(),
            models_1.InvoiceModel.find({ customerCode }).sort({ issueDate: -1 }).limit(20).lean(),
            models_1.PaymentModel.find({ customerCode }).sort({ paymentDate: -1 }).limit(20).lean(),
            models_1.TripModel.find({ customerCode }).sort({ createdAt: -1 }).limit(20).lean(),
            models_1.UploadedDocumentModel.find({ entityId: customerCode }).sort({ createdAt: -1 }).limit(30).lean(),
            models_1.DocumentModel.find({ entityId: customerCode }).sort({ createdAt: -1 }).limit(30).lean(),
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
                const policy = (0, document_policy_1.documentPolicyFor)(item.entityType, category);
                return {
                    id: String(item._id),
                    title: item.title || item.fileName,
                    category,
                    categoryLabel: (0, document_policy_1.documentCategoryLabel)(item.entityType, category),
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
                    requirementState: (0, document_policy_1.documentRequirementState)(status),
                    mobileCanUpload: (0, document_policy_1.documentMobileCanUpload)(item.entityType, category, status),
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
                    milestones: events.slice(-5).map((event) => ({
                        id: String(event._id),
                        title: event.title || event.eventType,
                        eventAt: event.eventAt,
                        location: event.location,
                    })),
                };
            }),
        };
    }
    async createAvailability(user, body) {
        await (0, mongo_1.connectToDatabase)();
        return models_1.AvailabilityReportModel.create({ ...body, driverId: user.id });
    }
    async createLeave(user, body) {
        await (0, mongo_1.connectToDatabase)();
        return models_1.LeaveRequestModel.create({ ...body, driverId: user.id, status: 'submitted' });
    }
};
exports.MobileController = MobileController;
__decorate([
    (0, common_1.Post)('driver-kyc'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MobileController.prototype, "createDriverKyc", null);
__decorate([
    (0, common_1.Get)('driver-kyc'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('branchId')),
    __param(3, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], MobileController.prototype, "listDriverKyc", null);
__decorate([
    (0, common_1.Get)('driver-kyc/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MobileController.prototype, "getDriverKyc", null);
__decorate([
    (0, common_1.Patch)('driver-kyc/:id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], MobileController.prototype, "updateDriverKycStatus", null);
__decorate([
    (0, common_1.Post)('bookings'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MobileController.prototype, "createBooking", null);
__decorate([
    (0, common_1.Get)('bookings/my'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], MobileController.prototype, "myBookings", null);
__decorate([
    (0, common_1.Get)('fleet/available'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MobileController.prototype, "availableFleet", null);
__decorate([
    (0, common_1.Post)('quotes/request'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MobileController.prototype, "requestQuote", null);
__decorate([
    (0, common_1.Patch)('quotes/:id/status'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], MobileController.prototype, "updateQuoteStatus", null);
__decorate([
    (0, common_1.Get)('quotes/my'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], MobileController.prototype, "myQuotes", null);
__decorate([
    (0, common_1.Get)('customer/workspace'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MobileController.prototype, "customerWorkspace", null);
__decorate([
    (0, common_1.Post)('availability-reports'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MobileController.prototype, "createAvailability", null);
__decorate([
    (0, common_1.Post)('leave-requests'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MobileController.prototype, "createLeave", null);
exports.MobileController = MobileController = __decorate([
    (0, swagger_1.ApiTags)('mobile'),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [communication_orchestrator_service_1.CommunicationOrchestratorService])
], MobileController);
function nextBusinessCode(prefix, count) {
    return `${prefix}-${String(count + 1).padStart(6, '0')}`;
}
function requireString(value, field) {
    const normalized = String(value || '').trim();
    if (!normalized) {
        throw new common_1.BadRequestException(`${field} is required`);
    }
    return normalized;
}
function optionalString(value) {
    const normalized = String(value || '').trim();
    return normalized || undefined;
}
function optionalNumber(value) {
    if (value === null || value === undefined || value === '')
        return undefined;
    const parsed = Number(value);
    if (Number.isNaN(parsed))
        return undefined;
    return parsed;
}
function buildRouteSummary(payload) {
    return [
        optionalString(payload.originCountry),
        optionalString(payload.originPort || payload.originCity),
        optionalString(payload.destinationPort || payload.portOfDischarge),
        optionalString(payload.destinationCity || payload.inlandDestination || payload.deliveryAddress),
    ].filter(Boolean).join(' -> ');
}
function validateQuoteRequestBody(body) {
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
        throw new common_1.BadRequestException('Container type, size, and quantity are required for this load type');
    }
    const quoteAmount = (optionalNumber(body.baseFreight) ?? 0) +
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
        route: buildRouteSummary(body),
        requestedVehicleType: containerType || shipmentMode,
    };
}
function extractPricingSnapshot(quote) {
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
function extractCustomerSnapshot(quote, user) {
    return {
        customerName: quote.customerName || user.name,
        companyName: quote.companyName || '',
        phone: quote.phone || user.phone || '',
        email: quote.email || user.email || '',
        consigneeName: quote.consigneeName || '',
        consigneeCompany: quote.consigneeCompany || '',
    };
}
function extractRouteSnapshot(quote) {
    return {
        originCountry: quote.originCountry || '',
        originPort: quote.originPort || quote.originCity || '',
        destinationCountry: quote.destinationCountry || '',
        destinationPort: quote.destinationPort || quote.destinationCity || '',
        inlandDestination: quote.inlandDestination || quote.deliveryAddress || '',
        route: quote.route || buildRouteSummary(quote),
    };
}
function extractCargoSnapshot(quote) {
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
function extractOperationalReadinessSnapshot(quote) {
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
//# sourceMappingURL=mobile.controller.js.map