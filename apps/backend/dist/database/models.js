"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationEventModel = exports.CommunicationScheduleModel = exports.CommunicationDraftModel = exports.CommunicationAutomationRuleModel = exports.CommunicationTemplateModel = exports.CommunicationLogModel = exports.AiSnapshotModel = exports.AiInsightModel = exports.IncidentReportModel = exports.FuelLogModel = exports.ActivityLogModel = exports.RefreshSessionModel = exports.LaunchChecklistItemModel = exports.UserPreferenceModel = exports.UploadedDocumentModel = exports.DocumentModel = exports.NotificationModel = exports.ChatMessageReadModel = exports.ChatMessageModel = exports.ChatRoomModel = exports.DriverPerformanceMetricModel = exports.EmployeePerformanceMetricModel = exports.LeaveRequestModel = exports.AvailabilityReportModel = exports.BookingModel = exports.ExecutiveCommunicationModel = exports.PaymentCommunicationModel = exports.PaymentModel = exports.InvoiceModel = exports.AgreementSignatureModel = exports.AgreementModel = exports.DriverReportModel = exports.MaintenanceNotificationModel = exports.SparePartModel = exports.RepairOrderModel = exports.MaintenanceRecordModel = exports.MaintenancePlanModel = exports.GpsPointModel = exports.TripEventModel = exports.TripModel = exports.VehicleModel = exports.DriverKycRequestModel = exports.DriverProfileModel = exports.CustomerProfileModel = exports.CustomerModel = exports.DriverModel = exports.EmployeeModel = exports.UserModel = exports.BranchModel = exports.RoleModel = void 0;
exports.DrivingSchoolPaymentModel = exports.DrivingSchoolStudentModel = exports.TrainingRecordModel = exports.OnboardingTaskHrModel = exports.InterviewStageModel = exports.CandidateModel = exports.JobRequisitionModel = exports.EscalationLogModel = exports.CollectionTaskModel = exports.OutboundNotificationModel = exports.OnboardingTaskModel = exports.QuoteModel = exports.LeadModel = exports.RentalPartnerTripModel = exports.RentalPartnerModel = exports.PartReplacementModel = exports.VehicleServiceHistoryModel = exports.SparePartUsageModel = exports.ApprovalActionModel = exports.DriverReimbursementModel = exports.DriverExpenseItemModel = exports.DriverExpenseClaimModel = exports.ContainerInterchangeModel = exports.DryPortReleaseModel = exports.ReleaseAuthorizationModel = exports.FinancialClearanceModel = exports.OfficialReceiptModel = exports.FinanceVerificationModel = exports.CustomerPaymentReceiptModel = exports.ChargeInvoiceLineModel = exports.ChargeInvoiceModel = exports.BankDocumentModel = exports.CorridorEmptyReturnModel = exports.CorridorCheckpointEventModel = exports.CorridorTripAssignmentModel = exports.CorridorExceptionModel = exports.CorridorMilestoneModel = exports.CorridorContainerModel = exports.CorridorDocumentAccessLogModel = exports.CorridorDocumentModel = exports.CorridorCargoItemModel = exports.CorridorPartyAccessModel = exports.CorridorShipmentModel = void 0;
const mongoose_1 = require("mongoose");
const pointSchema = new mongoose_1.Schema({
    latitude: Number,
    longitude: Number,
}, { _id: false });
const geoPointSchema = new mongoose_1.Schema({
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: undefined },
}, { _id: false });
const roleSchema = new mongoose_1.Schema({
    code: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    permissions: { type: [String], default: [] },
}, { timestamps: true, collection: 'roles' });
const branchSchema = new mongoose_1.Schema({
    code: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    city: String,
    country: String,
    status: { type: String, default: 'active' },
}, { timestamps: true, collection: 'branches' });
const userSchema = new mongoose_1.Schema({
    employeeCode: String,
    customerCode: String,
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    phone: { type: String, index: true },
    phoneNumber: { type: String, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, index: true },
    mobileRole: { type: String, index: true },
    permissions: { type: [String], default: [] },
    branchId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Branch', index: true },
    branchName: String,
    status: { type: String, default: 'active', index: true },
}, { timestamps: true, collection: 'users' });
userSchema.index({ role: 1, branchId: 1 });
const employeeSchema = new mongoose_1.Schema({
    employeeCode: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', index: true },
    branchId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Branch', index: true },
    department: { type: String, index: true },
    role: String,
    status: { type: String, default: 'active' },
}, { timestamps: true, collection: 'employees' });
const driverSchema = new mongoose_1.Schema({
    driverCode: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', index: true },
    branchId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Branch', index: true },
    firstName: String,
    lastName: String,
    licenseExpiry: Date,
    status: { type: String, default: 'active', index: true },
    assignedVehicleCode: String,
}, { timestamps: true, collection: 'drivers' });
const customerSchema = new mongoose_1.Schema({
    customerCode: { type: String, required: true, unique: true, index: true },
    companyName: { type: String, required: true, index: true },
    branchId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Branch', index: true },
    status: { type: String, default: 'active', index: true },
    city: String,
    country: String,
    segment: String,
}, { timestamps: true, collection: 'customers' });
customerSchema.index({ status: 1, companyName: 1 });
const customerProfileSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    customerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Customer', index: true },
    fullName: String,
    companyName: String,
    phone: String,
    email: String,
    tradeLicense: String,
    tin: String,
    vat: String,
    address: String,
    contactPerson: String,
    accountManager: String,
    accountManagerPhone: String,
    accountState: { type: String, default: 'active', index: true },
}, { timestamps: true, collection: 'customer_profiles' });
const driverProfileSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    driverId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Driver', index: true },
    fullName: String,
    phone: String,
    licenseNumber: String,
    licenseExpiry: Date,
    emergencyContact: String,
    branchId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Branch', index: true },
    vehicleTypeExperience: String,
    partnerCompany: String,
    partnerVehicleCode: String,
    accountState: { type: String, default: 'draft', index: true },
}, { timestamps: true, collection: 'driver_profiles' });
const driverKycRequestSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    fullName: String,
    phone: String,
    faydaFrontDocumentId: String,
    faydaBackDocumentId: String,
    selfieDocumentId: String,
    licenseDocumentId: String,
    licenseNumber: String,
    emergencyContact: String,
    branchId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Branch', index: true },
    partnerCompany: String,
    partnerVehicleCode: String,
    status: { type: String, default: 'draft', index: true },
    reviewedBy: String,
    reviewedAt: Date,
    notes: String,
    reviewNotes: String,
}, { timestamps: true, collection: 'driver_kyc_requests' });
driverKycRequestSchema.index({ status: 1, createdAt: -1 });
driverKycRequestSchema.index({ branchId: 1, status: 1, createdAt: -1 });
const vehicleSchema = new mongoose_1.Schema({
    vehicleCode: { type: String, required: true, unique: true, index: true },
    plateNumber: { type: String, required: true, unique: true, index: true },
    branchId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Branch', index: true },
    branchName: String,
    type: String,
    brand: String,
    model: String,
    capacityTons: Number,
    ownershipType: { type: String, default: 'internal', index: true },
    readyForAssignment: { type: Boolean, default: true, index: true },
    safetyStatus: { type: String, default: 'ready', index: true },
    currentStatus: { type: String, index: true },
    odometerKm: { type: Number, default: 0 },
    totalKmDriven: { type: Number, default: 0 },
    lastFuelAt: Date,
    lastFuelKm: Number,
    lastMaintenanceAt: Date,
    lastMaintenanceKm: Number,
    lastTireChangeAt: Date,
    lastTireChangeKm: Number,
    nextMaintenanceDueKm: Number,
    nextTireDueKm: Number,
    currentOdometerKm: Number,
    currentTripId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Trip', index: true },
    assignedDriverId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Driver', index: true },
    currentLocation: { type: geoPointSchema, index: '2dsphere' },
    lastKnownLocation: pointSchema,
    lastGpsAt: Date,
    downtimeHours: { type: Number, default: 0 },
}, { timestamps: true, collection: 'vehicles' });
vehicleSchema.index({ branchId: 1, currentStatus: 1, lastGpsAt: -1 });
const fuelLogSchema = new mongoose_1.Schema({
    vehicleId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Vehicle', index: true },
    vehicleCode: { type: String, index: true },
    driverId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Driver', index: true },
    driverName: String,
    tripId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Trip', index: true },
    tripCode: { type: String, index: true },
    branchId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Branch', index: true },
    date: { type: Date, index: true },
    odometerKm: Number,
    liters: Number,
    cost: Number,
    station: String,
    receiptUrl: String,
    notes: String,
}, { timestamps: true, collection: 'fuel_logs' });
fuelLogSchema.index({ vehicleId: 1, date: -1 });
fuelLogSchema.index({ driverId: 1, date: -1 });
fuelLogSchema.index({ tripId: 1, date: -1 });
const tripSchema = new mongoose_1.Schema({
    tripCode: { type: String, required: true, unique: true, index: true },
    customerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Customer', index: true },
    customerCode: String,
    customerName: String,
    vehicleId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Vehicle', index: true },
    vehicleCode: String,
    driverId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Driver', index: true },
    driverName: String,
    branchId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Branch', index: true },
    branchName: String,
    origin: String,
    destination: String,
    routeName: { type: String, index: true },
    routeType: { type: String, index: true },
    status: { type: String, index: true },
    plannedStartAt: Date,
    actualStartAt: Date,
    plannedArrivalAt: Date,
    actualArrivalAt: Date,
    currentCheckpoint: String,
    djiboutiFlag: { type: Boolean, default: false, index: true },
    proofOfDeliveryUploaded: { type: Boolean, default: false },
    revenueAmount: { type: Number, default: 0 },
    delayedMinutes: { type: Number, default: 0 },
}, { timestamps: true, collection: 'trips' });
tripSchema.index({ status: 1, branchId: 1, updatedAt: -1 });
tripSchema.index({ vehicleId: 1, status: 1, updatedAt: -1 });
tripSchema.index({ driverId: 1, status: 1, updatedAt: -1 });
tripSchema.index({ customerId: 1, createdAt: -1 });
tripSchema.index({ djiboutiFlag: 1, status: 1, updatedAt: -1 });
tripSchema.index({ createdAt: -1 });
tripSchema.index({ routeName: 1, status: 1 });
const tripEventSchema = new mongoose_1.Schema({
    tripId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Trip', index: true },
    tripCode: { type: String, index: true },
    eventType: String,
    title: String,
    source: String,
    description: String,
    location: String,
    eventAt: { type: Date, index: true },
}, { timestamps: true, collection: 'trip_events' });
tripEventSchema.index({ tripId: 1, eventAt: -1 });
const gpsPointSchema = new mongoose_1.Schema({
    tripId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Trip', index: true },
    tripCode: { type: String, index: true },
    vehicleId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Vehicle', index: true },
    vehicleCode: { type: String, index: true },
    driverId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Driver', index: true },
    driverName: String,
    branchId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Branch', index: true },
    branchName: String,
    routeName: { type: String, index: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    location: { type: geoPointSchema, index: '2dsphere' },
    speed: { type: Number, default: 0 },
    geofence: String,
    recordedAt: { type: Date, index: true },
}, { timestamps: true, collection: 'gps_points' });
gpsPointSchema.index({ vehicleId: 1, recordedAt: -1 });
gpsPointSchema.index({ tripId: 1, recordedAt: -1 });
const maintenancePlanSchema = new mongoose_1.Schema({
    vehicleId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Vehicle', index: true },
    vehicleCode: { type: String, index: true },
    branchId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Branch', index: true },
    serviceItemName: { type: String, index: true },
    intervalKm: Number,
    intervalDays: Number,
    nextDueKm: Number,
    nextDueDate: Date,
    currentOdometerKm: Number,
    criticalFlag: Boolean,
    status: { type: String, default: 'active', index: true },
    notificationDaysBeforeDue: Number,
    blockTripAssignmentIfOverdue: Boolean,
    overdue: { type: Boolean, index: true },
    blockedAssignment: { type: Boolean, index: true },
}, { timestamps: true, collection: 'maintenance_plans' });
maintenancePlanSchema.index({ status: 1, nextDueDate: 1 });
maintenancePlanSchema.index({ status: 1, nextDueKm: 1 });
maintenancePlanSchema.index({ vehicleId: 1, criticalFlag: 1, nextDueDate: 1 });
maintenancePlanSchema.index({ vehicleId: 1, serviceItemName: 1 });
maintenancePlanSchema.index({ overdue: 1, criticalFlag: 1, branchId: 1 });
const maintenanceRecordSchema = new mongoose_1.Schema({
    vehicleId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Vehicle', index: true },
    vehicleCode: String,
    branchId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Branch', index: true },
    issueSource: { type: String, index: true },
    issueType: { type: String, index: true },
    reportedBy: String,
    assignedTo: String,
    openedAt: Date,
    startedAt: Date,
    completedAt: Date,
    totalFixHours: Number,
    kmAtService: Number,
    serviceType: String,
    odometerKm: Number,
    serviceDate: Date,
    partsUsed: { type: [String], default: [] },
    laborCost: Number,
    totalCost: Number,
    vendor: String,
    result: String,
    status: { type: String, default: 'completed', index: true },
}, { timestamps: true, collection: 'maintenance_records' });
maintenanceRecordSchema.index({ vehicleId: 1, status: 1, openedAt: -1 });
maintenanceRecordSchema.index({ assignedTo: 1, status: 1, openedAt: -1 });
const repairOrderSchema = new mongoose_1.Schema({
    repairOrderCode: { type: String, required: true, unique: true, index: true },
    vehicleId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Vehicle', index: true },
    vehicleCode: { type: String, index: true },
    driverReportId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'DriverReport', index: true },
    branchId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Branch', index: true },
    maintenanceType: { type: String, index: true },
    issueType: { type: String, index: true },
    urgency: { type: String, index: true },
    priority: { type: String, index: true },
    status: { type: String, index: true },
    assignedWorkshopId: { type: mongoose_1.Schema.Types.ObjectId, index: true },
    workshop: String,
    technician: String,
    description: String,
    notes: String,
    blockedAssignment: { type: Boolean, default: false, index: true },
    estimatedCost: Number,
    actualCost: Number,
    openedAt: Date,
    scheduledAt: Date,
    completedAt: Date,
    performedOdometerKm: Number,
    performedBy: String,
    attachments: { type: [String], default: [] },
}, { timestamps: true, collection: 'repair_orders' });
repairOrderSchema.index({ status: 1, priority: 1, openedAt: -1 });
repairOrderSchema.index({ vehicleId: 1, status: 1, updatedAt: -1 });
repairOrderSchema.index({ assignedWorkshopId: 1, status: 1 });
repairOrderSchema.index({ status: 1, branchId: 1, urgency: 1 });
repairOrderSchema.index({ vehicleId: 1, createdAt: -1 });
const sparePartSchema = new mongoose_1.Schema({
    partCode: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    category: { type: String, index: true },
    stockQty: Number,
    minStockQty: Number,
    unitCost: Number,
    branchId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Branch', index: true },
    status: { type: String, default: 'active', index: true },
}, { timestamps: true, collection: 'spare_parts' });
sparePartSchema.index({ stockQty: 1, minStockQty: 1, branchId: 1 });
const sparePartUsageSchema = new mongoose_1.Schema({
    partId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'SparePart', index: true },
    partCode: { type: String, index: true },
    vehicleId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Vehicle', index: true },
    maintenanceRecordId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'MaintenanceRecord', index: true },
    repairOrderId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'RepairOrder', index: true },
    qtyUsed: Number,
    usedAt: { type: Date, index: true },
    usedBy: String,
    notes: String,
}, { timestamps: true, collection: 'spare_part_usage' });
sparePartUsageSchema.index({ maintenanceRecordId: 1, usedAt: -1 });
const vehicleServiceHistorySchema = new mongoose_1.Schema({
    vehicleId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Vehicle', index: true },
    vehicleCode: { type: String, index: true },
    branchId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Branch', index: true },
    serviceCategory: { type: String, index: true },
    serviceType: { type: String, index: true },
    serviceDate: { type: Date, index: true },
    odometerKm: Number,
    vendor: String,
    notes: String,
    nextServiceDueDate: Date,
    nextServiceDueKm: Number,
    overdue: { type: Boolean, default: false, index: true },
}, { timestamps: true, collection: 'vehicle_service_history' });
vehicleServiceHistorySchema.index({ vehicleId: 1, serviceDate: -1 });
vehicleServiceHistorySchema.index({ overdue: 1, nextServiceDueDate: 1, branchId: 1 });
const partReplacementSchema = new mongoose_1.Schema({
    vehicleId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Vehicle', index: true },
    vehicleCode: { type: String, index: true },
    branchId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Branch', index: true },
    partName: { type: String, index: true },
    partCategory: { type: String, index: true },
    replacementDate: { type: Date, index: true },
    replacementKm: Number,
    vendor: String,
    cost: Number,
    notes: String,
}, { timestamps: true, collection: 'part_replacements' });
partReplacementSchema.index({ vehicleId: 1, replacementDate: -1 });
partReplacementSchema.index({ partCategory: 1, replacementDate: -1, branchId: 1 });
const rentalPartnerSchema = new mongoose_1.Schema({
    partnerName: { type: String, required: true, unique: true, index: true },
    contactName: String,
    phone: String,
    branchId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Branch', index: true },
    status: { type: String, default: 'active', index: true },
    responseMinutes: Number,
    averageRentalCost: Number,
    fleetType: String,
}, { timestamps: true, collection: 'rental_partners' });
rentalPartnerSchema.index({ status: 1, branchId: 1, updatedAt: -1 });
const rentalPartnerTripSchema = new mongoose_1.Schema({
    partnerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'RentalPartner', index: true },
    partnerName: { type: String, index: true },
    tripId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Trip', index: true },
    tripCode: { type: String, index: true },
    vehicleCode: { type: String, index: true },
    externalDriverName: String,
    externalDriverPhone: String,
    currentLocationLabel: String,
    branchId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Branch', index: true },
    assignedAt: Date,
    completedAt: Date,
    status: { type: String, default: 'assigned', index: true },
    onTime: Boolean,
    delayed: Boolean,
    cancelled: Boolean,
    incidentCount: Number,
    responseMinutes: Number,
    rentalCost: Number,
}, { timestamps: true, collection: 'rental_partner_trips' });
rentalPartnerTripSchema.index({ partnerId: 1, assignedAt: -1 });
rentalPartnerTripSchema.index({ branchId: 1, status: 1, assignedAt: -1 });
const maintenanceNotificationSchema = new mongoose_1.Schema({
    vehicleId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Vehicle', index: true },
    vehicleCode: { type: String, index: true },
    driverId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Driver', index: true },
    branchId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Branch', index: true },
    maintenanceType: String,
    dueKm: Number,
    dueDate: Date,
    message: String,
    status: { type: String, index: true },
    sentAt: Date,
    readAt: Date,
}, { timestamps: true, collection: 'maintenance_notifications' });
maintenanceNotificationSchema.index({ status: 1, dueDate: 1, vehicleId: 1 });
maintenanceNotificationSchema.index({ driverId: 1, readAt: 1, createdAt: -1 });
const driverReportSchema = new mongoose_1.Schema({
    reportCode: { type: String, required: true, unique: true, index: true },
    type: { type: String, index: true },
    tripId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Trip', index: true },
    tripCode: { type: String, index: true },
    vehicleId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Vehicle', index: true },
    vehicleCode: String,
    driverId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Driver', index: true },
    driverName: String,
    branchId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Branch', index: true },
    branchName: String,
    location: pointSchema,
    odometerKm: Number,
    urgency: String,
    description: String,
    attachments: { type: [String], default: [] },
    status: { type: String, index: true },
}, { timestamps: true, collection: 'driver_reports' });
driverReportSchema.index({ status: 1, type: 1, branchId: 1, createdAt: -1 });
driverReportSchema.index({ status: 1, urgency: 1, createdAt: -1 });
driverReportSchema.index({ vehicleId: 1, status: 1, createdAt: -1 });
driverReportSchema.index({ tripId: 1, createdAt: -1 });
const agreementSchema = new mongoose_1.Schema({
    agreementCode: { type: String, required: true, unique: true, index: true },
    customerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Customer', index: true },
    customerCode: String,
    customerName: String,
    branchId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Branch', index: true },
    routeName: { type: String, index: true },
    status: { type: String, index: true },
    startDate: Date,
    endDate: Date,
    totalValue: Number,
    secureSignToken: { type: String, index: true },
    sentForSignatureAt: Date,
    signedPdfUrl: String,
}, { timestamps: true, collection: 'agreements' });
agreementSchema.index({ status: 1, endDate: 1 });
const agreementSignatureSchema = new mongoose_1.Schema({
    agreementId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Agreement', required: true, index: true },
    signerName: String,
    signerEmail: String,
    signerPhone: String,
    signedAt: Date,
    ipAddress: String,
    deviceInfo: String,
    signedPdfUrl: String,
    auditTrail: { type: [String], default: [] },
}, { timestamps: true, collection: 'agreement_signatures' });
const leadSchema = new mongoose_1.Schema({
    leadCode: { type: String, required: true, unique: true, index: true },
    customerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Customer', index: true },
    companyName: String,
    contactPerson: String,
    phone: String,
    branchId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Branch', index: true },
    routeInterest: String,
    source: String,
    status: { type: String, default: 'new', index: true },
    assignedTo: String,
    notes: String,
}, { timestamps: true, collection: 'leads' });
leadSchema.index({ branchId: 1, status: 1, createdAt: -1 });
const quoteSchema = new mongoose_1.Schema({
    quoteCode: { type: String, required: true, unique: true, index: true },
    customerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Customer', index: true },
    customerCode: String,
    customerName: String,
    companyName: String,
    phone: String,
    email: String,
    consigneeName: String,
    consigneeCompany: String,
    requestSource: { type: String, default: 'customer', index: true },
    shipmentMode: String,
    loadType: String,
    serviceLevel: String,
    direction: String,
    route: String,
    originCountry: String,
    originCity: String,
    originPort: String,
    pickupAddress: String,
    destinationCountry: String,
    destinationCity: String,
    destinationPort: String,
    deliveryAddress: String,
    inlandDestination: String,
    incoterm: String,
    preferredDepartureDate: Date,
    preferredArrivalTarget: Date,
    cargoType: String,
    commoditySummary: String,
    packageCount: Number,
    packagingType: String,
    grossWeight: Number,
    netWeight: Number,
    volumeCbm: Number,
    dangerousGoods: Boolean,
    temperatureControlled: Boolean,
    customsDocsReady: Boolean,
    insuranceRequired: Boolean,
    specialHandlingNotes: String,
    containerType: String,
    containerSize: String,
    containerQuantity: Number,
    emptyPickupLocation: String,
    emptyReturnDepotPreference: String,
    sealRequired: Boolean,
    truckingRequired: Boolean,
    warehousingRequired: Boolean,
    customsClearanceSupportRequired: Boolean,
    originHandlingNeeded: Boolean,
    destinationHandlingNeeded: Boolean,
    requestedVehicleType: String,
    requestedDate: Date,
    baseFreight: Number,
    originCharges: Number,
    destinationCharges: Number,
    customsEstimate: Number,
    inlandTransportEstimate: Number,
    insuranceEstimate: Number,
    handlingFees: Number,
    discount: Number,
    quotedAmount: Number,
    quoteAmount: Number,
    currency: { type: String, default: 'USD' },
    validityUntil: Date,
    status: { type: String, default: 'requested', index: true },
    approvalMethod: String,
    approvalNote: String,
    approvedBy: String,
    acceptedAt: Date,
    bookingId: String,
    convertedToShipmentId: String,
}, { timestamps: true, collection: 'quotes' });
quoteSchema.index({ customerId: 1, createdAt: -1 });
quoteSchema.index({ customerCode: 1, status: 1, createdAt: -1 });
quoteSchema.index({ requestSource: 1, status: 1, createdAt: -1 });
const onboardingTaskSchema = new mongoose_1.Schema({
    taskCode: { type: String, required: true, unique: true, index: true },
    customerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Customer', index: true },
    leadId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Lead', index: true },
    branchId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Branch', index: true },
    title: String,
    category: String,
    status: { type: String, default: 'pending', index: true },
    dueAt: Date,
    completedAt: Date,
    assignedTo: String,
}, { timestamps: true, collection: 'onboarding_tasks' });
onboardingTaskSchema.index({ customerId: 1, status: 1, dueAt: 1 });
const outboundNotificationSchema = new mongoose_1.Schema({
    notificationCode: { type: String, required: true, unique: true, index: true },
    customerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Customer', index: true },
    branchId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Branch', index: true },
    channel: { type: String, index: true },
    type: { type: String, index: true },
    message: String,
    status: { type: String, default: 'queued', index: true },
    sentAt: Date,
}, { timestamps: true, collection: 'outbound_notifications' });
outboundNotificationSchema.index({ status: 1, createdAt: -1 });
const invoiceSchema = new mongoose_1.Schema({
    invoiceCode: { type: String, required: true, unique: true, index: true },
    customerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Customer', index: true },
    customerCode: String,
    customerName: String,
    tripId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Trip', index: true },
    tripCode: String,
    branchId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Branch', index: true },
    routeName: { type: String, index: true },
    issueDate: Date,
    dueDate: { type: Date, index: true },
    totalAmount: Number,
    paidAmount: Number,
    outstandingAmount: Number,
    status: { type: String, index: true },
}, { timestamps: true, collection: 'invoices' });
invoiceSchema.index({ status: 1, dueDate: 1, branchId: 1 });
invoiceSchema.index({ status: 1, dueDate: 1, customerId: 1 });
invoiceSchema.index({ customerId: 1, issueDate: -1 });
const paymentSchema = new mongoose_1.Schema({
    paymentCode: { type: String, required: true, unique: true, index: true },
    paymentId: { type: String, index: true },
    invoiceId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Invoice', index: true },
    invoiceCode: String,
    customerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Customer', index: true },
    customerCode: String,
    customerName: String,
    branchId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Branch', index: true },
    routeName: String,
    amount: Number,
    paymentMethod: String,
    collectedBy: String,
    receiptUrl: String,
    status: { type: String, index: true },
    paymentDate: { type: Date, index: true },
}, { timestamps: true, collection: 'payments' });
paymentSchema.index({ paymentDate: -1, branchId: 1 });
paymentSchema.index({ paymentDate: -1, status: 1 });
paymentSchema.index({ invoiceId: 1, paymentDate: -1 });
paymentSchema.index({ customerId: 1, paymentDate: -1 });
const paymentCommunicationSchema = new mongoose_1.Schema({
    paymentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Payment', index: true },
    invoiceId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Invoice', index: true },
    customerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Customer', index: true },
    customerName: String,
    channel: { type: String, index: true },
    messageType: { type: String, index: true },
    recipient: String,
    subject: String,
    message: String,
    status: { type: String, index: true },
    sentAt: { type: Date, index: true },
    sentBy: String,
    providerResponse: String,
    retryCount: { type: Number, default: 0 },
}, { timestamps: true, collection: 'payment_communications' });
paymentCommunicationSchema.index({ paymentId: 1, sentAt: -1 });
paymentCommunicationSchema.index({ invoiceId: 1, sentAt: -1 });
paymentCommunicationSchema.index({ channel: 1, status: 1, sentAt: -1 });
paymentCommunicationSchema.index({ messageType: 1, status: 1, sentAt: -1 });
const executiveCommunicationSchema = new mongoose_1.Schema({
    entityType: { type: String, required: true, index: true },
    entityId: { type: String, required: true, index: true },
    entityLabel: String,
    customerName: String,
    branchName: String,
    channel: { type: String, index: true },
    recipient: String,
    template: { type: String, index: true },
    subject: String,
    message: String,
    status: { type: String, index: true },
    sentBy: String,
    sentAt: { type: Date, index: true },
    scheduledAt: { type: Date, index: true },
    providerResponse: String,
    severity: { type: String, index: true },
    metadata: { type: mongoose_1.Schema.Types.Mixed, default: {} },
}, { timestamps: true, collection: 'executive_communications' });
executiveCommunicationSchema.index({ entityType: 1, entityId: 1, sentAt: -1 });
executiveCommunicationSchema.index({ template: 1, status: 1, sentAt: -1 });
executiveCommunicationSchema.index({ channel: 1, status: 1, sentAt: -1 });
const collectionTaskSchema = new mongoose_1.Schema({
    taskCode: { type: String, required: true, unique: true, index: true },
    invoiceId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Invoice', index: true },
    customerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Customer', index: true },
    customerName: String,
    assignedOwner: String,
    escalationLevel: { type: String, default: 'finance_officer', index: true },
    reminderCount: { type: Number, default: 0 },
    lastFollowUpAt: Date,
    balance: Number,
    status: { type: String, default: 'open', index: true },
    dueDate: Date,
}, { timestamps: true, collection: 'collection_tasks' });
collectionTaskSchema.index({ status: 1, escalationLevel: 1, dueDate: 1 });
collectionTaskSchema.index({ customerId: 1, status: 1, updatedAt: -1 });
const bookingSchema = new mongoose_1.Schema({
    bookingCode: { type: String, required: true, unique: true, index: true },
    customerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Customer', index: true },
    customerCode: String,
    customerName: String,
    route: String,
    cargoType: String,
    requestedDate: Date,
    requestedVehicleType: String,
    status: { type: String, default: 'requested', index: true },
    assignedVehicleId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Vehicle', index: true },
    quoteId: String,
    agreementId: String,
    requestSource: { type: String, default: 'customer', index: true },
    quoteStatus: String,
    acceptedAt: Date,
    assignedOriginAgentId: String,
    assignedOriginAgentEmail: String,
    shipmentRef: String,
    customerSnapshot: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    routeSnapshot: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    cargoSnapshot: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    pricingSnapshot: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    operationalReadinessSnapshot: { type: mongoose_1.Schema.Types.Mixed, default: {} },
}, { timestamps: true, collection: 'bookings' });
bookingSchema.index({ customerId: 1, createdAt: -1 });
bookingSchema.index({ customerCode: 1, status: 1, createdAt: -1 });
bookingSchema.index({ quoteId: 1 }, { unique: true, sparse: true });
const availabilityReportSchema = new mongoose_1.Schema({
    driverId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Driver', required: true, index: true },
    status: { type: String, default: 'available', index: true },
    dateFrom: Date,
    dateTo: Date,
    reason: String,
}, { timestamps: true, collection: 'availability_reports' });
const leaveRequestSchema = new mongoose_1.Schema({
    driverId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Driver', required: true, index: true },
    type: String,
    startDate: Date,
    endDate: Date,
    reason: String,
    status: { type: String, default: 'submitted', index: true },
    approvedBy: String,
}, { timestamps: true, collection: 'leave_requests' });
const escalationLogSchema = new mongoose_1.Schema({
    invoiceId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Invoice', index: true },
    collectionTaskId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'CollectionTask', index: true },
    fromLevel: String,
    toLevel: String,
    action: String,
    note: String,
    actedBy: String,
    actedAt: { type: Date, index: true },
}, { timestamps: true, collection: 'escalation_logs' });
escalationLogSchema.index({ collectionTaskId: 1, actedAt: -1 });
const employeePerformanceMetricSchema = new mongoose_1.Schema({
    employeeId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', index: true },
    employeeCode: String,
    name: String,
    role: String,
    branchId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Branch', index: true },
    branchName: String,
    department: { type: String, index: true },
    periodStart: { type: Date, index: true },
    periodEnd: { type: Date, index: true },
    loadsHandled: Number,
    tripsHandled: Number,
    customersHandled: Number,
    agreementsHandled: Number,
    paymentsHandled: Number,
    issuesResolved: Number,
    avgResponseMinutes: Number,
    performanceScore: { type: Number, index: true },
    status: String,
}, { timestamps: true, collection: 'employee_performance_metrics' });
employeePerformanceMetricSchema.index({ branchId: 1, department: 1, periodEnd: -1 });
employeePerformanceMetricSchema.index({ performanceScore: -1, periodEnd: -1 });
employeePerformanceMetricSchema.index({ branchId: 1, periodEnd: -1, performanceScore: -1 });
employeePerformanceMetricSchema.index({ employeeId: 1, periodEnd: -1 });
employeePerformanceMetricSchema.index({ department: 1, periodEnd: -1 });
const driverPerformanceMetricSchema = new mongoose_1.Schema({
    driverId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Driver', index: true },
    driverCode: String,
    name: String,
    vehicleId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Vehicle', index: true },
    vehicleCode: String,
    branchId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Branch', index: true },
    branchName: String,
    periodStart: { type: Date, index: true },
    periodEnd: { type: Date, index: true },
    tripsCompleted: Number,
    loadsCompleted: Number,
    customersServed: Number,
    onTimeDeliveries: Number,
    delayedTrips: Number,
    accidentCount: Number,
    breakdownCount: Number,
    fuelRequestCount: Number,
    maintenanceReportCount: Number,
    podComplianceRate: Number,
    documentComplianceRate: Number,
    performanceScore: { type: Number, index: true },
    status: String,
}, { timestamps: true, collection: 'driver_performance_metrics' });
driverPerformanceMetricSchema.index({ branchId: 1, periodEnd: -1 });
driverPerformanceMetricSchema.index({ performanceScore: -1, periodEnd: -1 });
driverPerformanceMetricSchema.index({ branchId: 1, periodEnd: -1, performanceScore: -1 });
driverPerformanceMetricSchema.index({ driverId: 1, periodEnd: -1 });
driverPerformanceMetricSchema.index({ vehicleId: 1, periodEnd: -1 });
const chatRoomSchema = new mongoose_1.Schema({
    roomKey: String,
    roomType: { type: String, index: true },
    shipmentId: { type: String, index: true },
    tripId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Trip', index: true },
    customerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Customer', index: true },
    title: String,
    description: String,
    roleRoute: { type: String, index: true },
    participantIds: [{ type: String, index: true }],
    participantRoles: [{ type: String, index: true }],
    visibilityRoles: [{ type: String, index: true }],
    customerSafe: { type: Boolean, default: false, index: true },
    driverVisible: { type: Boolean, default: false, index: true },
    supportLinked: { type: Boolean, default: false, index: true },
    pinnedMessageId: { type: String, index: true },
    lastMessageAt: { type: Date, index: true },
    status: { type: String, default: 'active', index: true },
    unreadCount: { type: Number, default: 0 },
}, { timestamps: true, collection: 'chat_rooms' });
chatRoomSchema.index({ roomType: 1, createdAt: -1 });
chatRoomSchema.index({ shipmentId: 1, roomType: 1, createdAt: -1 });
chatRoomSchema.index({ roomKey: 1 }, { unique: true, sparse: true });
const chatMessageSchema = new mongoose_1.Schema({
    roomId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'ChatRoom', index: true },
    shipmentId: { type: String, index: true },
    senderUserId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', index: true },
    senderName: String,
    senderRole: { type: String, index: true },
    senderEmail: String,
    content: String,
    text: String,
    messageType: { type: String, default: 'text', index: true },
    attachments: [{
            fileName: String,
            fileUrl: String,
            mimeType: String,
            size: Number,
            documentId: String,
            shipmentId: String,
        }],
    replyToMessageId: { type: String, index: true },
    pinned: { type: Boolean, default: false, index: true },
    systemEventKey: { type: String, index: true },
    visibilityRoles: [{ type: String, index: true }],
    visibilityScope: { type: String, index: true },
    seenBy: [{ type: String }],
    readBy: [{
            userId: String,
            role: String,
            readAt: Date,
        }],
    deliveredTo: [{
            userId: String,
            role: String,
            deliveredAt: Date,
        }],
}, { timestamps: true, collection: 'chat_messages' });
chatMessageSchema.index({ roomId: 1, createdAt: -1 });
chatMessageSchema.index({ shipmentId: 1, createdAt: -1 });
chatMessageSchema.index({ roomId: 1, messageType: 1, createdAt: -1 });
chatMessageSchema.index({ roomId: 1, systemEventKey: 1 }, { sparse: true });
const chatMessageReadSchema = new mongoose_1.Schema({
    roomId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'ChatRoom', index: true },
    messageId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'ChatMessage', index: true },
    shipmentId: { type: String, index: true },
    userId: { type: String, index: true },
    role: { type: String, index: true },
    readAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true, collection: 'chat_message_reads' });
chatMessageReadSchema.index({ messageId: 1, userId: 1 }, { unique: true });
chatMessageReadSchema.index({ roomId: 1, readAt: -1 });
const notificationSchema = new mongoose_1.Schema({
    notificationId: { type: String, index: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', index: true },
    shipmentId: { type: String, index: true },
    tripId: { type: String, index: true },
    title: String,
    body: String,
    message: String,
    category: { type: String, index: true },
    type: String,
    status: { type: String, default: 'unread', index: true },
    actionRoute: String,
    actionLabel: String,
    isRead: { type: Boolean, default: false, index: true },
    readAt: Date,
    entityType: String,
    entityId: String,
}, { timestamps: true, collection: 'notifications' });
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, status: 1, createdAt: -1 });
const jobRequisitionSchema = new mongoose_1.Schema({
    requisitionCode: { type: String, required: true, unique: true, index: true },
    department: { type: String, index: true },
    role: String,
    branchId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Branch', index: true },
    requestedBy: String,
    status: { type: String, default: 'open', index: true },
    openings: Number,
    targetHireDate: Date,
}, { timestamps: true, collection: 'job_requisitions' });
jobRequisitionSchema.index({ status: 1, department: 1, createdAt: -1 });
const candidateSchema = new mongoose_1.Schema({
    candidateCode: { type: String, required: true, unique: true, index: true },
    requisitionId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'JobRequisition', index: true },
    firstName: String,
    lastName: String,
    phone: String,
    branchId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Branch', index: true },
    appliedRole: String,
    stage: { type: String, default: 'applied', index: true },
    status: { type: String, default: 'active', index: true },
    score: Number,
}, { timestamps: true, collection: 'candidates' });
candidateSchema.index({ requisitionId: 1, stage: 1, createdAt: -1 });
const interviewStageSchema = new mongoose_1.Schema({
    candidateId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Candidate', index: true },
    stageName: String,
    scheduledAt: Date,
    result: String,
    interviewer: String,
    note: String,
}, { timestamps: true, collection: 'interview_stages' });
interviewStageSchema.index({ candidateId: 1, scheduledAt: -1 });
const onboardingTaskHrSchema = new mongoose_1.Schema({
    taskCode: { type: String, required: true, unique: true, index: true },
    employeeId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', index: true },
    candidateId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Candidate', index: true },
    title: String,
    status: { type: String, default: 'pending', index: true },
    dueAt: Date,
    completedAt: Date,
    assignedTo: String,
}, { timestamps: true, collection: 'onboarding_tasks_hr' });
onboardingTaskHrSchema.index({ employeeId: 1, status: 1, dueAt: 1 });
const trainingRecordSchema = new mongoose_1.Schema({
    employeeId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', index: true },
    driverId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Driver', index: true },
    trainingTitle: String,
    provider: String,
    completedAt: Date,
    expiryDate: Date,
    status: { type: String, default: 'completed', index: true },
}, { timestamps: true, collection: 'training_records' });
trainingRecordSchema.index({ employeeId: 1, completedAt: -1 });
const drivingSchoolStudentSchema = new mongoose_1.Schema({
    studentCode: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true, index: true },
    phone: { type: String, index: true },
    branchId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Branch', index: true },
    status: { type: String, default: 'registered', index: true },
    registrationDate: Date,
    enrolledAt: Date,
    trainingProgressPercent: Number,
    completedTheoryLessons: Number,
    completedPracticalLessons: Number,
    nextLessonAt: Date,
    theoryExamStatus: String,
    roadExamStatus: String,
    examScheduledAt: Date,
    dlFollowUpStatus: String,
    dlIssuedAt: Date,
    totalFee: Number,
    paidAmount: Number,
    documentsPending: { type: Boolean, default: false, index: true },
}, { timestamps: true, collection: 'driving_school_students' });
drivingSchoolStudentSchema.index({ branchId: 1, status: 1, createdAt: -1 });
const drivingSchoolPaymentSchema = new mongoose_1.Schema({
    paymentCode: { type: String, required: true, unique: true, index: true },
    studentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'DrivingSchoolStudent', index: true },
    studentCode: { type: String, index: true },
    branchId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Branch', index: true },
    amount: Number,
    status: { type: String, default: 'paid', index: true },
    paidAt: Date,
    method: String,
    note: String,
}, { timestamps: true, collection: 'driving_school_payments' });
drivingSchoolPaymentSchema.index({ studentId: 1, paidAt: -1 });
drivingSchoolPaymentSchema.index({ branchId: 1, status: 1, paidAt: -1 });
const documentSchema = new mongoose_1.Schema({
    entityType: { type: String, index: true },
    entityId: { type: String, index: true },
    title: String,
    category: String,
    documentType: { type: String, index: true },
    referenceNo: { type: String, index: true },
    fileName: String,
    fileUrl: String,
    storageKey: String,
    storageMode: { type: String, default: 'local' },
    mimeType: String,
    fileSize: Number,
    uploadedBy: String,
    uploadedById: String,
    visibilityScope: { type: String, default: 'internal_only', index: true },
    approvalStatus: String,
    status: { type: String, default: 'available', index: true },
    expiryDate: Date,
}, { timestamps: true, collection: 'documents' });
documentSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
documentSchema.index({ entityType: 1, entityId: 1, documentType: 1, referenceNo: 1 });
const uploadedDocumentSchema = new mongoose_1.Schema({
    entityType: { type: String, index: true },
    entityId: { type: String, index: true },
    tripId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Trip', index: true },
    vehicleId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Vehicle', index: true },
    driverId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Driver', index: true },
    documentType: { type: String, index: true },
    category: String,
    referenceNo: { type: String, index: true },
    title: String,
    fileName: String,
    fileUrl: String,
    storageKey: String,
    storageMode: { type: String, default: 'local' },
    mimeType: String,
    fileSize: Number,
    uploadedBy: String,
    uploadedById: String,
    visibilityScope: { type: String, default: 'internal_only', index: true },
    status: { type: String, default: 'uploaded', index: true },
}, { timestamps: true, collection: 'uploaded_documents' });
uploadedDocumentSchema.index({ createdAt: -1, documentType: 1 });
uploadedDocumentSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
uploadedDocumentSchema.index({ entityType: 1, entityId: 1, documentType: 1, referenceNo: 1 });
const userPreferenceSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    language: { type: String, default: 'en', index: true },
    timezone: { type: String, default: 'Africa/Addis_Ababa' },
    notificationPreferences: { type: mongoose_1.Schema.Types.Mixed, default: {} },
}, { timestamps: true, collection: 'user_preferences' });
const launchChecklistItemSchema = new mongoose_1.Schema({
    code: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    track: { type: String, required: true, index: true },
    owner: String,
    audience: String,
    branch: String,
    dueDate: String,
    status: { type: String, default: 'scheduled', index: true },
    actionLabel: String,
    summary: String,
    checklist: { type: [String], default: [] },
    notes: { type: String, default: '' },
    lastUpdatedBy: String,
    lastUpdatedByRole: String,
}, { timestamps: true, collection: 'launch_checklist_items' });
launchChecklistItemSchema.index({ track: 1, status: 1, updatedAt: -1 });
const refreshSessionSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenId: { type: String, required: true, unique: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date, default: null, index: true },
    lastUsedAt: { type: Date, default: null },
    replacedByTokenId: { type: String, default: null },
    userAgent: String,
    ipAddress: String,
}, { timestamps: true, collection: 'refresh_sessions' });
refreshSessionSchema.index({ userId: 1, revokedAt: 1, expiresAt: 1 });
const activityLogSchema = new mongoose_1.Schema({
    entityType: { type: String, index: true },
    entityId: { type: String, index: true },
    tripId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Trip', index: true },
    vehicleId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Vehicle', index: true },
    driverId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Driver', index: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', index: true },
    activityType: { type: String, index: true },
    title: String,
    description: String,
    metadata: { type: mongoose_1.Schema.Types.Mixed, default: {} },
}, { timestamps: { createdAt: true, updatedAt: false }, collection: 'activity_logs' });
activityLogSchema.index({ createdAt: -1, activityType: 1 });
activityLogSchema.index({ tripId: 1, createdAt: -1 });
activityLogSchema.index({ vehicleId: 1, createdAt: -1 });
activityLogSchema.index({ entityId: 1, createdAt: -1 });
const incidentReportSchema = new mongoose_1.Schema({
    type: { type: String, index: true },
    vehicleId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Vehicle', index: true },
    vehicleCode: String,
    driverId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Driver', index: true },
    driverName: String,
    tripId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Trip', index: true },
    tripCode: String,
    severity: { type: String, index: true },
    location: pointSchema,
    description: String,
    attachments: { type: [String], default: [] },
    status: { type: String, default: 'reported', index: true },
}, { timestamps: true, collection: 'incident_reports' });
incidentReportSchema.index({ status: 1, severity: 1, createdAt: -1 });
const aiInsightSchema = new mongoose_1.Schema({
    type: { type: String, enum: ['risk', 'opportunity', 'action'], index: true },
    category: { type: String, index: true },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], index: true },
    title: String,
    description: String,
    score: { type: Number, index: true },
    entityType: { type: String, index: true },
    entityId: { type: String, index: true },
    actionLabel: String,
    actionRoute: String,
    status: { type: String, default: 'active', index: true },
}, { timestamps: true, collection: 'ai_insights' });
aiInsightSchema.index({ type: 1, status: 1, score: -1, updatedAt: -1 });
aiInsightSchema.index({ category: 1, severity: 1, status: 1, updatedAt: -1 });
aiInsightSchema.index({ entityType: 1, entityId: 1, type: 1, status: 1 });
const aiSnapshotSchema = new mongoose_1.Schema({
    generatedAt: { type: Date, index: true },
    topRisks: { type: [mongoose_1.Schema.Types.Mixed], default: [] },
    topOpportunities: { type: [mongoose_1.Schema.Types.Mixed], default: [] },
    topActions: { type: [mongoose_1.Schema.Types.Mixed], default: [] },
    summaryText: String,
    stats: { type: mongoose_1.Schema.Types.Mixed, default: {} },
}, { timestamps: true, collection: 'ai_snapshots' });
aiSnapshotSchema.index({ generatedAt: -1 });
const communicationLogSchema = new mongoose_1.Schema({
    communicationLogId: { type: String },
    entityType: { type: String, required: true, index: true },
    entityId: { type: String, required: true, index: true },
    shipmentId: { type: String, index: true },
    tripId: { type: String, index: true },
    customerId: { type: String, index: true },
    driverId: { type: String, index: true },
    recipientType: { type: String, index: true },
    recipientName: String,
    recipientAddress: String,
    channel: { type: String, required: true, index: true },
    templateKey: { type: String, required: true, index: true },
    language: { type: String, default: 'en', index: true },
    recipient: { type: String, required: true },
    subject: String,
    messageBody: String,
    sendMode: { type: String, default: 'now', index: true },
    status: { type: String, default: 'pending', index: true },
    sentByUserId: { type: String, index: true },
    scheduledFor: { type: Date, index: true },
    sentAt: { type: Date, index: true },
    failedAt: { type: Date, index: true },
    errorMessage: String,
    providerMessageId: String,
    metadata: { type: mongoose_1.Schema.Types.Mixed, default: {} },
}, { timestamps: true, collection: 'communication_logs' });
communicationLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
communicationLogSchema.index({ status: 1, channel: 1, createdAt: -1 });
communicationLogSchema.index({ shipmentId: 1, tripId: 1, createdAt: -1 });
communicationLogSchema.index({ communicationLogId: 1 }, { unique: true, sparse: true });
const communicationTemplateSchema = new mongoose_1.Schema({
    templateId: { type: String, index: true },
    templateKey: { type: String, required: true, index: true },
    name: String,
    category: { type: String, index: true },
    entityType: { type: String, required: true, index: true },
    channel: { type: String, required: true, index: true },
    language: { type: String, required: true, index: true },
    subjectTemplate: String,
    bodyTemplate: String,
    variables: { type: [String], default: [] },
    isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true, collection: 'communication_templates' });
communicationTemplateSchema.index({ templateKey: 1, channel: 1, language: 1 }, { unique: true });
const communicationAutomationRuleSchema = new mongoose_1.Schema({
    ruleId: { type: String, index: true },
    name: String,
    entityType: { type: String, required: true, index: true },
    triggerType: { type: String, required: true, index: true },
    channels: { type: [String], default: [] },
    channel: { type: String, required: true, index: true },
    templateKey: { type: String, required: true, index: true },
    language: { type: String, default: 'en', index: true },
    languageMode: { type: String, default: 'fixed_en', index: true },
    enabled: { type: Boolean, default: true, index: true },
    isEnabled: { type: Boolean, default: true, index: true },
    conditions: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    scheduleOffset: { type: Number, default: 0 },
    scheduleOffsetMinutes: { type: Number, default: 0 },
}, { timestamps: true, collection: 'communication_automation_rules' });
communicationAutomationRuleSchema.index({ triggerType: 1, enabled: 1, entityType: 1 });
const communicationDraftSchema = new mongoose_1.Schema({
    communicationDraftId: { type: String, required: true, unique: true, index: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: String, required: true, index: true },
    shipmentId: { type: String, index: true },
    tripId: { type: String, index: true },
    recipientDraft: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    channels: { type: [String], default: [] },
    templateKey: { type: String, index: true },
    language: { type: String, default: 'en', index: true },
    subject: String,
    messageBody: String,
    createdByUserId: { type: String, index: true },
}, { timestamps: true, collection: 'communication_drafts' });
communicationDraftSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
const communicationScheduleSchema = new mongoose_1.Schema({
    communicationScheduleId: { type: String, required: true, unique: true, index: true },
    communicationLogId: { type: String, index: true },
    communicationDraftId: { type: String, index: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: String, required: true, index: true },
    scheduleType: { type: String, default: 'send', index: true },
    scheduledFor: { type: Date, required: true, index: true },
    status: { type: String, default: 'scheduled', index: true },
    createdByUserId: { type: String, index: true },
}, { timestamps: true, collection: 'communication_schedules' });
communicationScheduleSchema.index({ status: 1, scheduledFor: 1 });
const notificationEventSchema = new mongoose_1.Schema({
    notificationEventId: { type: String, required: true, unique: true, index: true },
    triggerType: { type: String, required: true, index: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: String, required: true, index: true },
    shipmentId: { type: String, index: true },
    tripId: { type: String, index: true },
    payload: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    status: { type: String, default: 'queued', index: true },
    processedAt: { type: Date, index: true },
    createdByUserId: { type: String, index: true },
    errorMessage: String,
}, { timestamps: true, collection: 'notification_events' });
notificationEventSchema.index({ triggerType: 1, status: 1, createdAt: -1 });
notificationEventSchema.index({ entityType: 1, entityId: 1, triggerType: 1, status: 1, createdAt: -1 });
const corridorShipmentSchema = new mongoose_1.Schema({
    shipmentId: { type: String, index: true },
    bookingNumber: String,
    shipmentRef: { type: String, required: true, unique: true, index: true },
    customerId: { type: String, index: true },
    customerCode: { type: String, index: true },
    serviceMode: { type: String, index: true },
    serviceType: { type: String, index: true },
    shipmentStatus: { type: String, index: true },
    status: { type: String, index: true },
    customerName: String,
    supplierName: String,
    supplierAgentId: { type: String, index: true },
    supplierLocation: String,
    consigneeName: String,
    shippingLine: String,
    carrierName: String,
    incoterm: String,
    commoditySummary: String,
    quoteId: String,
    bookingId: String,
    requestSource: String,
    quoteStatus: String,
    bookingStatus: String,
    quoteAmount: Number,
    quoteCurrency: String,
    acceptedAt: Date,
    convertedToShipmentId: String,
    assignedOriginAgentId: String,
    assignedOriginAgentEmail: String,
    originCountry: String,
    originPort: String,
    portOfLoading: String,
    dischargePort: String,
    portOfDischarge: String,
    destinationCountry: String,
    destinationNode: String,
    inlandDestination: String,
    dryPortNode: String,
    finalDeliveryLocation: String,
    corridorRoute: String,
    currentStage: String,
    currentOwnerRole: { type: String, index: true },
    currentOwnerUserId: { type: String, index: true },
    currentStatus: String,
    exceptionStatus: String,
    priority: { type: String, default: 'normal', index: true },
    vesselName: String,
    voyageNumber: String,
    etd: Date,
    etaDjibouti: Date,
    billOfLadingNumber: String,
    masterBillOfLadingNumber: String,
    houseBillOfLadingNumber: String,
    containerIds: { type: [String], default: [] },
    activeContainerCount: { type: Number, default: 0 },
    sealNumbers: { type: [String], default: [] },
    containerTypeSummary: String,
    invoiceStatus: { type: String, default: 'missing', index: true },
    packingListStatus: { type: String, default: 'missing', index: true },
    blStatus: { type: String, default: 'missing', index: true },
    customsDocStatus: { type: String, default: 'missing', index: true },
    transitDocStatus: { type: String, default: 'missing', index: true },
    releaseNoteStatus: { type: String, default: 'missing', index: true },
    podStatus: { type: String, default: 'missing', index: true },
    customerConfirmationStatus: { type: String, default: 'pending', index: true },
    customerConfirmedAt: Date,
    customerConfirmedBy: String,
    customerConfirmationNote: String,
    shortageStatus: { type: String, default: 'clear', index: true },
    damageStatus: { type: String, default: 'clear', index: true },
    closureBlockedReason: String,
    emptyReturnOpen: { type: Boolean, default: true, index: true },
    returnReceiptStatus: { type: String, default: 'missing', index: true },
    originReady: { type: Boolean, default: false, index: true },
    djiboutiReleaseReady: { type: Boolean, default: false, index: true },
    dispatchReady: { type: Boolean, default: false, index: true },
    inlandArrivalReady: { type: Boolean, default: false, index: true },
    yardClosureReady: { type: Boolean, default: false, index: true },
    emptyReturnClosed: { type: Boolean, default: false, index: true },
    invoiceIds: { type: [String], default: [] },
    totalChargeAmount: { type: Number, default: 0 },
    paymentStatus: { type: String, default: 'pending', index: true },
    lcReference: { type: String, index: true },
    financeStatus: { type: String, default: 'awaiting_bank_document', index: true },
    workflowState: { type: String, default: 'waiting_for_documents', index: true },
    readinessStatus: { type: String, default: 'blocked', index: true },
    blockedReasons: { type: [String], default: [] },
    missingFields: { type: [String], default: [] },
    missingDocumentTags: { type: [String], default: [] },
    clearancePackUrl: String,
    clearancePackPdfUrl: String,
    clearancePackGeneratedAt: Date,
    clearancePackGeneratedBy: String,
    clearancePackGeneratedByUserId: { type: String, index: true },
    documentsReadyForClearance: { type: Boolean, default: false, index: true },
    documentsReadyAt: Date,
    documentsReadyMarkedBy: String,
    documentsReadyMarkedByUserId: { type: String, index: true },
    clearanceWorkflowStatus: { type: String, default: 'waiting_for_documents', index: true },
    clearanceAcknowledgedAt: Date,
    clearanceAcknowledgedBy: String,
    clearanceAcknowledgedByUserId: { type: String, index: true },
    clearanceStartedAt: Date,
    clearanceStartedBy: String,
    clearanceStartedByUserId: { type: String, index: true },
    clearanceMissingDocumentReason: String,
    clearanceMissingDocumentRequestedAt: Date,
    clearanceMissingDocumentRequestedBy: String,
    clearanceMissingDocumentRequestedByUserId: { type: String, index: true },
    financeClearanceApproved: { type: Boolean, default: false, index: true },
    financeClearanceApprovedAt: Date,
    financeClearanceApprovedBy: String,
    financeClearanceApprovedByUserId: { type: String, index: true },
    documentHubUpdatedAt: Date,
    releaseStatus: { type: String, default: 'not_ready_for_release', index: true },
    dryPortStatus: { type: String, default: 'awaiting_release', index: true },
    interchangeStatus: { type: String, default: 'full_received', index: true },
    totalInvoiced: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    balanceDue: { type: Number, default: 0 },
    financialClearanceAt: Date,
    releasedAt: Date,
    taxDutyStatus: { type: String, default: 'pending', index: true },
    financeBlockReason: String,
    hasExceptions: { type: Boolean, default: false, index: true },
    activeExceptionCount: { type: Number, default: 0 },
    latestExceptionSummary: String,
    riskLevel: { type: String, default: 'normal', index: true },
    originFileSentAt: Date,
    originFileSentBy: String,
    multimodalReceivedAt: Date,
    transitorAssignedTo: String,
    transitorAssignedAt: Date,
    transitDocumentRef: String,
    transitDocumentStatus: String,
    chargesPaymentStatus: String,
    clearancePacketStatus: String,
    transportClearanceReady: { type: Boolean, default: false, index: true },
    clearanceReadyAt: Date,
    clearanceCompletedAt: Date,
    fullOutDjiboutiAt: Date,
    fullInDryPortAt: Date,
    fullOutCustomerAt: Date,
    emptyInDryPortAt: Date,
    emptyOutDryPortAt: Date,
    emptyInDjiboutiAt: Date,
    container: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    taxDutySummary: String,
    releaseReadiness: String,
    emptyReturnSummary: String,
}, { timestamps: true, collection: 'corridor_shipments' });
corridorShipmentSchema.index({ shipmentStatus: 1, updatedAt: -1 });
corridorShipmentSchema.index({ bookingNumber: 1 }, { unique: true, sparse: true });
corridorShipmentSchema.index({ customerId: 1, currentStage: 1, updatedAt: -1 });
corridorShipmentSchema.index({ currentOwnerRole: 1, status: 1, updatedAt: -1 });
corridorShipmentSchema.index({ releaseStatus: 1, financeStatus: 1, updatedAt: -1 });
corridorShipmentSchema.index({ shipmentId: 1, status: 1, financeStatus: 1, releaseStatus: 1, createdAt: -1 });
corridorShipmentSchema.index({ workflowState: 1, readinessStatus: 1, updatedAt: -1 });
corridorShipmentSchema.index({ documentsReadyForClearance: 1, clearanceWorkflowStatus: 1, currentStage: 1, updatedAt: -1 });
const corridorPartyAccessSchema = new mongoose_1.Schema({
    shipmentId: { type: String, index: true },
    shipmentRef: { type: String, required: true, index: true },
    role: { type: String, required: true, index: true },
    actorUserId: { type: String, index: true },
    actorName: String,
    actorCode: String,
    visibilityScopes: { type: [String], default: [] },
    stageAccess: { type: [String], default: [] },
}, { timestamps: true, collection: 'corridor_party_access' });
corridorPartyAccessSchema.index({ actorCode: 1, role: 1, shipmentRef: 1 }, { unique: true });
const corridorCargoItemSchema = new mongoose_1.Schema({
    cargoItemId: { type: String, index: true },
    shipmentId: { type: String, required: true, index: true },
    shipmentRef: { type: String, required: true, index: true },
    lineNumber: Number,
    containerNumber: { type: String, required: true, index: true },
    packingListRef: String,
    invoiceRef: String,
    transitDocRef: String,
    lineNo: String,
    skuCode: String,
    marksNumbers: String,
    description: String,
    hsCode: String,
    commodityCode: String,
    packageType: String,
    packageQty: Number,
    grossWeightKg: Number,
    netWeightKg: Number,
    cbm: Number,
    inspectionStatus: String,
    shortageFlag: Boolean,
    damageFlag: Boolean,
    exceptionFlag: Boolean,
    remark: String,
    remarks: String,
    discrepancyStatus: { type: String, default: 'clear', index: true },
}, { timestamps: true, collection: 'corridor_cargo_items' });
corridorCargoItemSchema.index({ shipmentRef: 1, containerNumber: 1, lineNo: 1 }, { unique: true });
corridorCargoItemSchema.index({ shipmentId: 1, lineNumber: 1 });
const corridorDocumentSchema = new mongoose_1.Schema({
    shipmentDocumentId: { type: String, index: true },
    shipmentId: { type: String, required: true, index: true },
    shipmentRef: { type: String, required: true, index: true },
    containerId: { type: String, index: true },
    containerNumber: { type: String, index: true },
    documentType: { type: String, required: true, index: true },
    documentKey: { type: String, index: true },
    tag: { type: String, index: true },
    documentSubtype: { type: String, index: true },
    referenceNo: { type: String, required: true, index: true },
    versionNumber: { type: Number, default: 1, index: true },
    isLatestVersion: { type: Boolean, default: true, index: true },
    isArchived: { type: Boolean, default: false, index: true },
    archivedAt: Date,
    previousVersionId: { type: String, index: true },
    issueDate: Date,
    uploadedDate: Date,
    status: { type: String, default: 'uploaded', index: true },
    sourceRole: { type: String, index: true },
    visibilityScope: { type: String, default: 'internal_only', index: true },
    uploadedByUserId: { type: String, index: true },
    uploadedByName: String,
    verifiedAt: Date,
    verifiedBy: String,
    verifiedByUserId: { type: String, index: true },
    verificationStatus: { type: String, default: 'valid', index: true },
    verificationUrl: String,
    documentHash: { type: String, index: true },
    expiresAt: Date,
    revokedAt: Date,
    revokedBy: String,
    revokedByUserId: { type: String, index: true },
    rejectedAt: Date,
    rejectedBy: String,
    rejectedByUserId: { type: String, index: true },
    lockedAt: Date,
    lockedBy: String,
    lockedByUserId: { type: String, index: true },
    signedBy: String,
    signedByUserId: { type: String, index: true },
    signedAt: Date,
    signatureHash: String,
    fileName: String,
    fileUrl: String,
    previewUrl: String,
    fileKey: String,
    storagePath: String,
    metadata: { type: mongoose_1.Schema.Types.Mixed, default: {} },
}, { timestamps: true, collection: 'corridor_documents' });
corridorDocumentSchema.index({ shipmentRef: 1, documentType: 1, referenceNo: 1 }, { unique: true });
corridorDocumentSchema.index({ shipmentId: 1, documentType: 1, status: 1, visibilityScope: 1 });
corridorDocumentSchema.index({ shipmentId: 1, documentKey: 1, versionNumber: -1 });
corridorDocumentSchema.index({ shipmentId: 1, tag: 1, isLatestVersion: 1 });
corridorDocumentSchema.index({ shipmentId: 1, documentType: 1, createdAt: -1 });
const corridorDocumentAccessLogSchema = new mongoose_1.Schema({
    shipmentId: { type: String, required: true, index: true },
    shipmentRef: { type: String, required: true, index: true },
    shipmentDocumentId: { type: String, index: true },
    fileName: String,
    action: { type: String, required: true, index: true },
    role: { type: String, index: true },
    userId: { type: String, index: true },
    actorName: String,
    ipAddress: String,
    deviceInfo: String,
    metadata: { type: mongoose_1.Schema.Types.Mixed, default: {} },
}, { timestamps: { createdAt: true, updatedAt: false }, collection: 'corridor_document_access_logs' });
corridorDocumentAccessLogSchema.index({ shipmentId: 1, createdAt: -1 });
corridorDocumentAccessLogSchema.index({ shipmentDocumentId: 1, createdAt: -1 });
corridorDocumentAccessLogSchema.index({ userId: 1, action: 1, createdAt: -1 });
const corridorContainerSchema = new mongoose_1.Schema({
    containerId: { type: String, required: true, unique: true, index: true },
    shipmentId: { type: String, required: true, index: true },
    shipmentRef: { type: String, required: true, index: true },
    containerNumber: { type: String, required: true, index: true },
    containerType: String,
    sealNumber: String,
    status: { type: String, default: 'pending', index: true },
    stuffingStatus: { type: String, default: 'pending', index: true },
    dischargeStatus: { type: String, default: 'pending', index: true },
    releaseStatus: { type: String, default: 'pending', index: true },
    inlandTripStatus: { type: String, default: 'awaiting_assignment', index: true },
    unloadStatus: { type: String, default: 'pending', index: true },
    emptyReturnStatus: { type: String, default: 'not_released', index: true },
    freeTimeStart: Date,
    freeTimeEnd: Date,
    storageRiskLevel: { type: String, default: 'normal', index: true },
    fullOutDjiboutiAt: Date,
    fullInDryPortAt: Date,
    fullOutCustomerAt: Date,
    emptyInDryPortAt: Date,
    emptyOutDryPortAt: Date,
    emptyInDjiboutiAt: Date,
    emptyReturnDeadline: Date,
    demurrageRiskLevel: String,
}, { timestamps: true, collection: 'corridor_containers' });
corridorContainerSchema.index({ shipmentId: 1, containerNumber: 1 }, { unique: true });
corridorContainerSchema.index({ status: 1, releaseStatus: 1, emptyReturnStatus: 1 });
const corridorMilestoneSchema = new mongoose_1.Schema({
    milestoneId: { type: String, index: true },
    shipmentId: { type: String, required: true, index: true },
    shipmentRef: { type: String, required: true, index: true },
    tripId: { type: String, index: true },
    stage: { type: String, index: true },
    containerNumber: { type: String, index: true },
    code: { type: String, required: true, index: true },
    label: String,
    status: String,
    occurredAt: Date,
    location: String,
    sourceRole: { type: String, index: true },
    sourceUserId: { type: String, index: true },
    note: String,
    visibilityScope: { type: String, default: 'internal_only', index: true },
}, { timestamps: true, collection: 'corridor_milestones' });
corridorMilestoneSchema.index({ shipmentRef: 1, code: 1 }, { unique: true });
corridorMilestoneSchema.index({ shipmentId: 1, stage: 1, occurredAt: -1 });
const corridorExceptionSchema = new mongoose_1.Schema({
    exceptionId: { type: String, index: true },
    shipmentId: { type: String, required: true, index: true },
    shipmentRef: { type: String, required: true, index: true },
    containerNumber: { type: String, index: true },
    tripId: { type: String, index: true },
    category: { type: String, index: true },
    type: { type: String, required: true, index: true },
    severity: { type: String, index: true },
    title: String,
    status: { type: String, index: true },
    detectedAt: Date,
    resolvedAt: Date,
    summary: String,
    details: String,
    ownerRole: { type: String, index: true },
    ownerUserId: { type: String, index: true },
    visibilityScope: { type: String, default: 'internal_only', index: true },
    reportedBy: String,
}, { timestamps: true, collection: 'corridor_exceptions' });
corridorExceptionSchema.index({ shipmentRef: 1, status: 1, severity: 1, detectedAt: -1 });
corridorExceptionSchema.index({ shipmentId: 1, ownerRole: 1, status: 1 });
const corridorTripAssignmentSchema = new mongoose_1.Schema({
    shipmentId: { type: String, required: true, index: true },
    shipmentRef: { type: String, required: true, index: true },
    containerId: { type: String, index: true },
    containerNumber: { type: String, required: true, index: true },
    tripId: { type: String, required: true, unique: true, index: true },
    vehicleId: { type: String, index: true },
    partnerId: { type: String, index: true },
    driverType: { type: String, index: true },
    truckPlate: String,
    trailerPlate: String,
    driverId: String,
    driverName: String,
    driverPhone: String,
    driverLicenseNumber: String,
    routeName: String,
    route: String,
    originPoint: String,
    destinationPoint: String,
    dispatchStatus: { type: String, index: true },
    eta: Date,
    actualDeparture: Date,
    actualArrival: Date,
    currentCheckpoint: String,
    gpsStatus: String,
    issueStatus: String,
    dispatchAt: Date,
    gateOutAt: Date,
    arrivalAt: Date,
    tripStatus: String,
    podStatus: String,
}, { timestamps: true, collection: 'corridor_trip_assignments' });
corridorTripAssignmentSchema.index({ shipmentId: 1, driverId: 1, vehicleId: 1, dispatchStatus: 1 });
corridorTripAssignmentSchema.index({ currentCheckpoint: 1, updatedAt: -1 });
corridorTripAssignmentSchema.index({ driverPhone: 1, updatedAt: -1 });
corridorTripAssignmentSchema.index({ shipmentId: 1, createdAt: -1 });
const corridorCheckpointEventSchema = new mongoose_1.Schema({
    tripId: { type: String, required: true, index: true },
    shipmentId: { type: String, index: true },
    shipmentRef: { type: String, required: true, index: true },
    containerNumber: { type: String, index: true },
    checkpointName: String,
    eventType: String,
    sealVerified: Boolean,
    officerName: String,
    officerBadge: String,
    note: String,
    eventAt: Date,
    latitude: Number,
    longitude: Number,
}, { timestamps: true, collection: 'corridor_checkpoint_events' });
corridorCheckpointEventSchema.index({ tripId: 1, eventAt: -1 });
const corridorEmptyReturnSchema = new mongoose_1.Schema({
    shipmentId: { type: String, required: true, index: true },
    containerId: { type: String, index: true },
    shipmentRef: { type: String, required: true, index: true },
    containerNumber: { type: String, required: true, index: true },
    returnDepot: String,
    emptyReleaseAt: Date,
    returnedAt: Date,
    receiptNumber: String,
    detentionClosed: Boolean,
    status: String,
}, { timestamps: true, collection: 'corridor_empty_returns' });
corridorEmptyReturnSchema.index({ shipmentRef: 1, containerNumber: 1 }, { unique: true });
const bankDocumentSchema = new mongoose_1.Schema({
    shipmentId: { type: String, required: true, index: true },
    shipmentRef: { type: String, required: true, index: true },
    bookingNumber: { type: String, index: true },
    customerId: { type: String, index: true },
    customerName: String,
    lcReference: { type: String, index: true },
    documentType: { type: String, required: true, index: true },
    bankName: { type: String, index: true },
    referenceNo: { type: String, required: true, index: true },
    issueDate: Date,
    status: { type: String, default: 'pending_review', index: true },
    fileUrl: String,
    fileName: String,
    notes: String,
    submittedBy: String,
    submittedByUserId: { type: String, index: true },
    reviewNote: String,
    reviewedBy: String,
    reviewedByUserId: { type: String, index: true },
    reviewedAt: Date,
    uploadedDocumentId: { type: String, index: true },
}, { timestamps: true, collection: 'bank_documents' });
bankDocumentSchema.index({ shipmentId: 1, documentType: 1, createdAt: -1 });
bankDocumentSchema.index({ customerId: 1, createdAt: -1 });
bankDocumentSchema.index({ shipmentId: 1, status: 1, createdAt: -1 });
const chargeInvoiceSchema = new mongoose_1.Schema({
    shipmentId: { type: String, required: true, index: true },
    shipmentRef: { type: String, required: true, index: true },
    bookingNumber: { type: String, index: true },
    customerId: { type: String, index: true },
    customerName: String,
    invoiceNo: { type: String, required: true, unique: true, index: true },
    invoiceType: { type: String, required: true, index: true },
    currency: { type: String, required: true, index: true },
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    balanceDue: { type: Number, default: 0 },
    status: { type: String, default: 'draft', index: true },
    dueDate: Date,
    createdBy: String,
    createdByUserId: { type: String, index: true },
    approvedBy: String,
    approvedByUserId: { type: String, index: true },
    approvedAt: Date,
    approvalStatus: { type: String, default: 'pending', index: true },
    version: { type: Number, default: 1 },
    pdfDocumentId: { type: String, index: true },
    note: String,
}, { timestamps: true, collection: 'charge_invoices' });
chargeInvoiceSchema.index({ shipmentId: 1, createdAt: -1 });
chargeInvoiceSchema.index({ customerId: 1, createdAt: -1 });
chargeInvoiceSchema.index({ shipmentId: 1, status: 1, createdAt: -1 });
const chargeInvoiceLineSchema = new mongoose_1.Schema({
    invoiceId: { type: String, required: true, index: true },
    shipmentId: { type: String, required: true, index: true },
    chargeType: { type: String, required: true, index: true },
    amount: { type: Number, default: 0 },
    currency: { type: String, required: true, index: true },
    taxRate: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    description: String,
    createdBy: String,
    createdByUserId: { type: String, index: true },
    approvalStatus: { type: String, default: 'pending', index: true },
    lineOrder: { type: Number, default: 1 },
}, { timestamps: true, collection: 'charge_invoice_lines' });
chargeInvoiceLineSchema.index({ invoiceId: 1, lineOrder: 1 });
chargeInvoiceLineSchema.index({ shipmentId: 1, createdAt: 1 });
const customerPaymentReceiptSchema = new mongoose_1.Schema({
    shipmentId: { type: String, required: true, index: true },
    shipmentRef: { type: String, required: true, index: true },
    invoiceId: { type: String, index: true },
    invoiceNo: { type: String, index: true },
    customerId: { type: String, index: true },
    customerName: String,
    amount: { type: Number, required: true },
    currency: { type: String, required: true, index: true },
    paymentDate: Date,
    transactionRef: { type: String, required: true, index: true },
    bankName: { type: String, index: true },
    verificationStatus: { type: String, default: 'pending_verification', index: true },
    fileUrl: String,
    fileName: String,
    submittedBy: String,
    submittedByUserId: { type: String, index: true },
    remark: String,
    financeNote: String,
    verifiedBy: String,
    verifiedByUserId: { type: String, index: true },
    verifiedAt: Date,
    matchedAmount: { type: Number, default: 0 },
    uploadedDocumentId: { type: String, index: true },
}, { timestamps: true, collection: 'customer_payment_receipts' });
customerPaymentReceiptSchema.index({ shipmentId: 1, createdAt: -1 });
customerPaymentReceiptSchema.index({ shipmentId: 1, verificationStatus: 1, createdAt: -1 });
const financeVerificationSchema = new mongoose_1.Schema({
    shipmentId: { type: String, required: true, index: true },
    receiptId: { type: String, index: true },
    invoiceId: { type: String, index: true },
    status: { type: String, required: true, index: true },
    amountVerified: { type: Number, default: 0 },
    mismatchAmount: { type: Number, default: 0 },
    note: String,
    verifiedBy: String,
    verifiedByUserId: { type: String, index: true },
    verifiedAt: Date,
}, { timestamps: true, collection: 'finance_verifications' });
financeVerificationSchema.index({ shipmentId: 1, createdAt: -1 });
financeVerificationSchema.index({ shipmentId: 1, status: 1, createdAt: -1 });
const officialReceiptSchema = new mongoose_1.Schema({
    shipmentId: { type: String, required: true, index: true },
    shipmentRef: { type: String, required: true, index: true },
    officialReceiptNo: { type: String, required: true, unique: true, index: true },
    customerId: { type: String, index: true },
    customerName: String,
    linkedInvoiceIds: { type: [String], default: [] },
    linkedPaymentReceiptIds: { type: [String], default: [] },
    amountReceived: { type: Number, default: 0 },
    paymentMethod: String,
    issuedAt: Date,
    issuedBy: String,
    issuedByUserId: { type: String, index: true },
    status: { type: String, default: 'issued', index: true },
    pdfDocumentId: { type: String, index: true },
}, { timestamps: true, collection: 'official_receipts' });
officialReceiptSchema.index({ shipmentId: 1, issuedAt: -1 });
officialReceiptSchema.index({ shipmentId: 1, createdAt: -1 });
const financialClearanceSchema = new mongoose_1.Schema({
    shipmentId: { type: String, required: true, unique: true, index: true },
    shipmentRef: { type: String, required: true, index: true },
    status: { type: String, default: 'awaiting_finance_clearance', index: true },
    approvedBy: String,
    approvedByUserId: { type: String, index: true },
    approvedAt: Date,
    note: String,
}, { timestamps: true, collection: 'financial_clearances' });
financialClearanceSchema.index({ status: 1, updatedAt: -1 });
const releaseAuthorizationSchema = new mongoose_1.Schema({
    shipmentId: { type: String, required: true, index: true },
    shipmentRef: { type: String, required: true, index: true },
    releaseAuthorizationId: { type: String, required: true, unique: true, index: true },
    releaseMode: { type: String, required: true, index: true },
    status: { type: String, default: 'not_ready_for_release', index: true },
    issuedBy: String,
    issuedByUserId: { type: String, index: true },
    issuedAt: Date,
    sentToAgentAt: Date,
    recipientDetails: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    documentIds: { type: [String], default: [] },
    note: String,
    pdfDocumentId: { type: String, index: true },
}, { timestamps: true, collection: 'release_authorizations' });
releaseAuthorizationSchema.index({ shipmentId: 1, status: 1, updatedAt: -1 });
releaseAuthorizationSchema.index({ shipmentId: 1, createdAt: -1 });
const dryPortReleaseSchema = new mongoose_1.Schema({
    shipmentId: { type: String, required: true, index: true },
    shipmentRef: { type: String, required: true, index: true },
    releaseAuthorizationId: { type: String, required: true, index: true },
    status: { type: String, default: 'pending_release', index: true },
    releasedBy: String,
    releasedByUserId: { type: String, index: true },
    releasedAt: Date,
    receiverName: String,
    receiverIdRef: String,
    remarks: String,
    proofFiles: { type: [String], default: [] },
    proofDocumentIds: { type: [String], default: [] },
}, { timestamps: true, collection: 'dry_port_releases' });
dryPortReleaseSchema.index({ shipmentId: 1, releasedAt: -1 });
dryPortReleaseSchema.index({ shipmentId: 1, createdAt: -1 });
const containerInterchangeSchema = new mongoose_1.Schema({
    shipmentId: { type: String, required: true, index: true },
    shipmentRef: { type: String, required: true, index: true },
    tripId: { type: String, index: true },
    containerNo: { type: String, required: true, index: true },
    sealNo: { type: String, index: true },
    interchangeType: { type: String, required: true, index: true },
    location: String,
    eventDate: Date,
    documentUrl: String,
    documentId: { type: String, index: true },
    receivedBy: String,
    receivedByUserId: { type: String, index: true },
    conditionNotes: String,
    status: { type: String, default: 'recorded', index: true },
}, { timestamps: true, collection: 'container_interchanges' });
containerInterchangeSchema.index({ containerNo: 1, eventDate: -1 });
containerInterchangeSchema.index({ shipmentId: 1, interchangeType: 1, eventDate: -1 });
const driverExpenseClaimSchema = new mongoose_1.Schema({
    shipmentId: { type: String, required: true, index: true },
    shipmentRef: { type: String, required: true, index: true },
    tripId: { type: String, index: true },
    driverId: { type: String, required: true, index: true },
    driverName: String,
    totalClaimed: { type: Number, default: 0 },
    totalApproved: { type: Number, default: 0 },
    status: { type: String, default: 'submitted', index: true },
    submittedAt: Date,
    reviewedBy: String,
    reviewedByUserId: { type: String, index: true },
    reviewedAt: Date,
    financeNote: String,
}, { timestamps: true, collection: 'driver_expense_claims' });
driverExpenseClaimSchema.index({ driverId: 1, status: 1, updatedAt: -1 });
driverExpenseClaimSchema.index({ shipmentId: 1, createdAt: -1 });
const driverExpenseItemSchema = new mongoose_1.Schema({
    claimId: { type: String, required: true, index: true },
    shipmentId: { type: String, required: true, index: true },
    tripId: { type: String, index: true },
    category: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, index: true },
    paidDate: Date,
    location: String,
    receiptFileUrl: String,
    receiptDocumentId: { type: String, index: true },
    status: { type: String, default: 'submitted', index: true },
    financeNote: String,
    approvedAmount: { type: Number, default: 0 },
    notes: String,
}, { timestamps: true, collection: 'driver_expense_items' });
driverExpenseItemSchema.index({ claimId: 1, createdAt: -1 });
const driverReimbursementSchema = new mongoose_1.Schema({
    claimId: { type: String, required: true, unique: true, index: true },
    shipmentId: { type: String, required: true, index: true },
    amountPaid: { type: Number, default: 0 },
    paidAt: Date,
    method: String,
    referenceNo: { type: String, index: true },
    status: { type: String, default: 'submitted', index: true },
    paidBy: String,
    paidByUserId: { type: String, index: true },
    pdfDocumentId: { type: String, index: true },
}, { timestamps: true, collection: 'driver_reimbursements' });
driverReimbursementSchema.index({ status: 1, updatedAt: -1 });
const approvalActionSchema = new mongoose_1.Schema({
    entityType: { type: String, required: true, index: true },
    entityId: { type: String, required: true, index: true },
    shipmentId: { type: String, index: true },
    actionType: { type: String, required: true, index: true },
    actionStatus: { type: String, required: true, index: true },
    reason: String,
    comment: String,
    actedBy: String,
    actedByUserId: { type: String, index: true },
    actedAt: Date,
}, { timestamps: true, collection: 'approval_actions' });
approvalActionSchema.index({ shipmentId: 1, createdAt: -1 });
approvalActionSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
exports.RoleModel = mongoose_1.models.Role || (0, mongoose_1.model)('Role', roleSchema);
exports.BranchModel = mongoose_1.models.Branch || (0, mongoose_1.model)('Branch', branchSchema);
exports.UserModel = mongoose_1.models.User || (0, mongoose_1.model)('User', userSchema);
exports.EmployeeModel = mongoose_1.models.Employee || (0, mongoose_1.model)('Employee', employeeSchema);
exports.DriverModel = mongoose_1.models.Driver || (0, mongoose_1.model)('Driver', driverSchema);
exports.CustomerModel = mongoose_1.models.Customer || (0, mongoose_1.model)('Customer', customerSchema);
exports.CustomerProfileModel = mongoose_1.models.CustomerProfile || (0, mongoose_1.model)('CustomerProfile', customerProfileSchema);
exports.DriverProfileModel = mongoose_1.models.DriverProfile || (0, mongoose_1.model)('DriverProfile', driverProfileSchema);
exports.DriverKycRequestModel = mongoose_1.models.DriverKycRequest || (0, mongoose_1.model)('DriverKycRequest', driverKycRequestSchema);
exports.VehicleModel = mongoose_1.models.Vehicle || (0, mongoose_1.model)('Vehicle', vehicleSchema);
exports.TripModel = mongoose_1.models.Trip || (0, mongoose_1.model)('Trip', tripSchema);
exports.TripEventModel = mongoose_1.models.TripEvent || (0, mongoose_1.model)('TripEvent', tripEventSchema);
exports.GpsPointModel = mongoose_1.models.GpsPoint || (0, mongoose_1.model)('GpsPoint', gpsPointSchema);
exports.MaintenancePlanModel = mongoose_1.models.MaintenancePlan || (0, mongoose_1.model)('MaintenancePlan', maintenancePlanSchema);
exports.MaintenanceRecordModel = mongoose_1.models.MaintenanceRecord || (0, mongoose_1.model)('MaintenanceRecord', maintenanceRecordSchema);
exports.RepairOrderModel = mongoose_1.models.RepairOrder || (0, mongoose_1.model)('RepairOrder', repairOrderSchema);
exports.SparePartModel = mongoose_1.models.SparePart || (0, mongoose_1.model)('SparePart', sparePartSchema);
exports.MaintenanceNotificationModel = mongoose_1.models.MaintenanceNotification || (0, mongoose_1.model)('MaintenanceNotification', maintenanceNotificationSchema);
exports.DriverReportModel = mongoose_1.models.DriverReport || (0, mongoose_1.model)('DriverReport', driverReportSchema);
exports.AgreementModel = mongoose_1.models.Agreement || (0, mongoose_1.model)('Agreement', agreementSchema);
exports.AgreementSignatureModel = mongoose_1.models.AgreementSignature || (0, mongoose_1.model)('AgreementSignature', agreementSignatureSchema);
exports.InvoiceModel = mongoose_1.models.Invoice || (0, mongoose_1.model)('Invoice', invoiceSchema);
exports.PaymentModel = mongoose_1.models.Payment || (0, mongoose_1.model)('Payment', paymentSchema);
exports.PaymentCommunicationModel = mongoose_1.models.PaymentCommunication || (0, mongoose_1.model)('PaymentCommunication', paymentCommunicationSchema);
exports.ExecutiveCommunicationModel = mongoose_1.models.ExecutiveCommunication || (0, mongoose_1.model)('ExecutiveCommunication', executiveCommunicationSchema);
exports.BookingModel = mongoose_1.models.Booking || (0, mongoose_1.model)('Booking', bookingSchema);
exports.AvailabilityReportModel = mongoose_1.models.AvailabilityReport || (0, mongoose_1.model)('AvailabilityReport', availabilityReportSchema);
exports.LeaveRequestModel = mongoose_1.models.LeaveRequest || (0, mongoose_1.model)('LeaveRequest', leaveRequestSchema);
exports.EmployeePerformanceMetricModel = mongoose_1.models.EmployeePerformanceMetric || (0, mongoose_1.model)('EmployeePerformanceMetric', employeePerformanceMetricSchema);
exports.DriverPerformanceMetricModel = mongoose_1.models.DriverPerformanceMetric || (0, mongoose_1.model)('DriverPerformanceMetric', driverPerformanceMetricSchema);
exports.ChatRoomModel = mongoose_1.models.ChatRoom || (0, mongoose_1.model)('ChatRoom', chatRoomSchema);
exports.ChatMessageModel = mongoose_1.models.ChatMessage || (0, mongoose_1.model)('ChatMessage', chatMessageSchema);
exports.ChatMessageReadModel = mongoose_1.models.ChatMessageRead || (0, mongoose_1.model)('ChatMessageRead', chatMessageReadSchema);
exports.NotificationModel = mongoose_1.models.Notification || (0, mongoose_1.model)('Notification', notificationSchema);
exports.DocumentModel = mongoose_1.models.Document || (0, mongoose_1.model)('Document', documentSchema);
exports.UploadedDocumentModel = mongoose_1.models.UploadedDocument || (0, mongoose_1.model)('UploadedDocument', uploadedDocumentSchema);
exports.UserPreferenceModel = mongoose_1.models.UserPreference || (0, mongoose_1.model)('UserPreference', userPreferenceSchema);
exports.LaunchChecklistItemModel = mongoose_1.models.LaunchChecklistItem || (0, mongoose_1.model)('LaunchChecklistItem', launchChecklistItemSchema);
exports.RefreshSessionModel = mongoose_1.models.RefreshSession || (0, mongoose_1.model)('RefreshSession', refreshSessionSchema);
exports.ActivityLogModel = mongoose_1.models.ActivityLog || (0, mongoose_1.model)('ActivityLog', activityLogSchema);
exports.FuelLogModel = mongoose_1.models.FuelLog || (0, mongoose_1.model)('FuelLog', fuelLogSchema);
exports.IncidentReportModel = mongoose_1.models.IncidentReport || (0, mongoose_1.model)('IncidentReport', incidentReportSchema);
exports.AiInsightModel = mongoose_1.models.AiInsight || (0, mongoose_1.model)('AiInsight', aiInsightSchema);
exports.AiSnapshotModel = mongoose_1.models.AiSnapshot || (0, mongoose_1.model)('AiSnapshot', aiSnapshotSchema);
exports.CommunicationLogModel = mongoose_1.models.CommunicationLog || (0, mongoose_1.model)('CommunicationLog', communicationLogSchema);
exports.CommunicationTemplateModel = mongoose_1.models.CommunicationTemplate || (0, mongoose_1.model)('CommunicationTemplate', communicationTemplateSchema);
exports.CommunicationAutomationRuleModel = mongoose_1.models.CommunicationAutomationRule || (0, mongoose_1.model)('CommunicationAutomationRule', communicationAutomationRuleSchema);
exports.CommunicationDraftModel = mongoose_1.models.CommunicationDraft || (0, mongoose_1.model)('CommunicationDraft', communicationDraftSchema);
exports.CommunicationScheduleModel = mongoose_1.models.CommunicationSchedule || (0, mongoose_1.model)('CommunicationSchedule', communicationScheduleSchema);
exports.NotificationEventModel = mongoose_1.models.NotificationEvent || (0, mongoose_1.model)('NotificationEvent', notificationEventSchema);
exports.CorridorShipmentModel = mongoose_1.models.CorridorShipment || (0, mongoose_1.model)('CorridorShipment', corridorShipmentSchema);
exports.CorridorPartyAccessModel = mongoose_1.models.CorridorPartyAccess || (0, mongoose_1.model)('CorridorPartyAccess', corridorPartyAccessSchema);
exports.CorridorCargoItemModel = mongoose_1.models.CorridorCargoItem || (0, mongoose_1.model)('CorridorCargoItem', corridorCargoItemSchema);
exports.CorridorDocumentModel = mongoose_1.models.CorridorDocument || (0, mongoose_1.model)('CorridorDocument', corridorDocumentSchema);
exports.CorridorDocumentAccessLogModel = mongoose_1.models.CorridorDocumentAccessLog || (0, mongoose_1.model)('CorridorDocumentAccessLog', corridorDocumentAccessLogSchema);
exports.CorridorContainerModel = mongoose_1.models.CorridorContainer || (0, mongoose_1.model)('CorridorContainer', corridorContainerSchema);
exports.CorridorMilestoneModel = mongoose_1.models.CorridorMilestone || (0, mongoose_1.model)('CorridorMilestone', corridorMilestoneSchema);
exports.CorridorExceptionModel = mongoose_1.models.CorridorException || (0, mongoose_1.model)('CorridorException', corridorExceptionSchema);
exports.CorridorTripAssignmentModel = mongoose_1.models.CorridorTripAssignment || (0, mongoose_1.model)('CorridorTripAssignment', corridorTripAssignmentSchema);
exports.CorridorCheckpointEventModel = mongoose_1.models.CorridorCheckpointEvent || (0, mongoose_1.model)('CorridorCheckpointEvent', corridorCheckpointEventSchema);
exports.CorridorEmptyReturnModel = mongoose_1.models.CorridorEmptyReturn || (0, mongoose_1.model)('CorridorEmptyReturn', corridorEmptyReturnSchema);
exports.BankDocumentModel = mongoose_1.models.BankDocument || (0, mongoose_1.model)('BankDocument', bankDocumentSchema);
exports.ChargeInvoiceModel = mongoose_1.models.ChargeInvoice || (0, mongoose_1.model)('ChargeInvoice', chargeInvoiceSchema);
exports.ChargeInvoiceLineModel = mongoose_1.models.ChargeInvoiceLine || (0, mongoose_1.model)('ChargeInvoiceLine', chargeInvoiceLineSchema);
exports.CustomerPaymentReceiptModel = mongoose_1.models.CustomerPaymentReceipt || (0, mongoose_1.model)('CustomerPaymentReceipt', customerPaymentReceiptSchema);
exports.FinanceVerificationModel = mongoose_1.models.FinanceVerification || (0, mongoose_1.model)('FinanceVerification', financeVerificationSchema);
exports.OfficialReceiptModel = mongoose_1.models.OfficialReceipt || (0, mongoose_1.model)('OfficialReceipt', officialReceiptSchema);
exports.FinancialClearanceModel = mongoose_1.models.FinancialClearance || (0, mongoose_1.model)('FinancialClearance', financialClearanceSchema);
exports.ReleaseAuthorizationModel = mongoose_1.models.ReleaseAuthorization || (0, mongoose_1.model)('ReleaseAuthorization', releaseAuthorizationSchema);
exports.DryPortReleaseModel = mongoose_1.models.DryPortRelease || (0, mongoose_1.model)('DryPortRelease', dryPortReleaseSchema);
exports.ContainerInterchangeModel = mongoose_1.models.ContainerInterchange || (0, mongoose_1.model)('ContainerInterchange', containerInterchangeSchema);
exports.DriverExpenseClaimModel = mongoose_1.models.DriverExpenseClaim || (0, mongoose_1.model)('DriverExpenseClaim', driverExpenseClaimSchema);
exports.DriverExpenseItemModel = mongoose_1.models.DriverExpenseItem || (0, mongoose_1.model)('DriverExpenseItem', driverExpenseItemSchema);
exports.DriverReimbursementModel = mongoose_1.models.DriverReimbursement || (0, mongoose_1.model)('DriverReimbursement', driverReimbursementSchema);
exports.ApprovalActionModel = mongoose_1.models.ApprovalAction || (0, mongoose_1.model)('ApprovalAction', approvalActionSchema);
exports.SparePartUsageModel = mongoose_1.models.SparePartUsage || (0, mongoose_1.model)('SparePartUsage', sparePartUsageSchema);
exports.VehicleServiceHistoryModel = mongoose_1.models.VehicleServiceHistory || (0, mongoose_1.model)('VehicleServiceHistory', vehicleServiceHistorySchema);
exports.PartReplacementModel = mongoose_1.models.PartReplacement || (0, mongoose_1.model)('PartReplacement', partReplacementSchema);
exports.RentalPartnerModel = mongoose_1.models.RentalPartner || (0, mongoose_1.model)('RentalPartner', rentalPartnerSchema);
exports.RentalPartnerTripModel = mongoose_1.models.RentalPartnerTrip || (0, mongoose_1.model)('RentalPartnerTrip', rentalPartnerTripSchema);
exports.LeadModel = mongoose_1.models.Lead || (0, mongoose_1.model)('Lead', leadSchema);
exports.QuoteModel = mongoose_1.models.Quote || (0, mongoose_1.model)('Quote', quoteSchema);
exports.OnboardingTaskModel = mongoose_1.models.OnboardingTask || (0, mongoose_1.model)('OnboardingTask', onboardingTaskSchema);
exports.OutboundNotificationModel = mongoose_1.models.OutboundNotification || (0, mongoose_1.model)('OutboundNotification', outboundNotificationSchema);
exports.CollectionTaskModel = mongoose_1.models.CollectionTask || (0, mongoose_1.model)('CollectionTask', collectionTaskSchema);
exports.EscalationLogModel = mongoose_1.models.EscalationLog || (0, mongoose_1.model)('EscalationLog', escalationLogSchema);
exports.JobRequisitionModel = mongoose_1.models.JobRequisition || (0, mongoose_1.model)('JobRequisition', jobRequisitionSchema);
exports.CandidateModel = mongoose_1.models.Candidate || (0, mongoose_1.model)('Candidate', candidateSchema);
exports.InterviewStageModel = mongoose_1.models.InterviewStage || (0, mongoose_1.model)('InterviewStage', interviewStageSchema);
exports.OnboardingTaskHrModel = mongoose_1.models.OnboardingTaskHr || (0, mongoose_1.model)('OnboardingTaskHr', onboardingTaskHrSchema);
exports.TrainingRecordModel = mongoose_1.models.TrainingRecord || (0, mongoose_1.model)('TrainingRecord', trainingRecordSchema);
exports.DrivingSchoolStudentModel = mongoose_1.models.DrivingSchoolStudent || (0, mongoose_1.model)('DrivingSchoolStudent', drivingSchoolStudentSchema);
exports.DrivingSchoolPaymentModel = mongoose_1.models.DrivingSchoolPayment || (0, mongoose_1.model)('DrivingSchoolPayment', drivingSchoolPaymentSchema);
//# sourceMappingURL=models.js.map