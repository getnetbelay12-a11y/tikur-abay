"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedLocalData = seedLocalData;
exports.resetLocalData = resetLocalData;
exports.resetOperationalData = resetOperationalData;
const config_1 = require("../config");
const mongo_1 = require("../mongo");
const models_1 = require("../models");
function createRandom(seed) {
    let state = seed;
    return () => {
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
    };
}
function pickWeighted(rng, items) {
    const total = items.reduce((sum, item) => sum + item.weight, 0);
    let cursor = rng() * total;
    for (const item of items) {
        cursor -= item.weight;
        if (cursor <= 0) {
            return item.value;
        }
    }
    return items[items.length - 1].value;
}
function formatNumber(value, length) {
    return String(value).padStart(length, '0');
}
function slugify(value) {
    return String(value || 'customer')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'customer';
}
function seedPhoneNumber(index) {
    return `+251900${formatNumber(index, 6)}`;
}
function buildSeedCommunicationTemplates() {
    const variables = ['customerName', 'driverName', 'tripId', 'route', 'vehicleId', 'invoiceId', 'amount', 'dueDate', 'branch', 'status', 'companyName'];
    return [
        seedTemplate('payment_reminder', 'finance', 'email', 'en', 'Payment reminder for {{invoiceId}}', 'Dear {{customerName}}, invoice {{invoiceId}} for {{amount}} is due on {{dueDate}}. Please complete payment promptly.', variables),
        seedTemplate('payment_reminder', 'finance', 'sms', 'en', '', 'Reminder: {{invoiceId}} for {{amount}} is due on {{dueDate}}.', variables),
        seedTemplate('payment_thank_you', 'finance', 'email', 'en', 'Payment received for {{invoiceId}}', 'Dear {{customerName}}, thank you for your payment of {{amount}} for invoice {{invoiceId}}.', variables),
        seedTemplate('payment_receipt', 'finance', 'email', 'en', 'Receipt for {{invoiceId}}', 'Dear {{customerName}}, your payment for {{invoiceId}} has been recorded. Amount received: {{amount}}.', variables),
        seedTemplate('overdue_invoice_notice', 'finance', 'telegram', 'en', '', 'Overdue notice: {{invoiceId}} for {{amount}} is overdue.', variables),
        seedTemplate('trip_delay_update', 'operations', 'telegram', 'en', '', 'Trip {{tripId}} on {{route}} is delayed. Dispatch recovery is underway.', variables),
        seedTemplate('dispatch_follow_up', 'operations', 'in_app', 'en', '', '{{tripId}} requires dispatch follow-up.', variables),
        seedTemplate('maintenance_escalation', 'operations', 'telegram', 'en', '', '{{vehicleId}} requires maintenance escalation.', variables),
        seedTemplate('vehicle_block_notice', 'operations', 'in_app', 'en', '', '{{vehicleId}} is blocked for assignment.', variables),
        seedTemplate('kyc_reminder', 'driver', 'sms', 'en', '', 'Your KYC remains pending. Please submit the required documents.', variables),
        seedTemplate('document_resubmission_notice', 'driver', 'in_app', 'en', '', 'Please resubmit the requested documents.', variables),
        seedTemplate('incident_acknowledgement', 'operations', 'telegram', 'en', '', '{{vehicleId}} incident acknowledged. Dispatch follow-up is required.', variables),
        seedTemplate('payment_reminder', 'finance', 'email', 'am', 'የ{{invoiceId}} ክፍያ ማስታወሻ', 'ክቡር {{customerName}}፣ {{invoiceId}} ደረሰኝ ለ{{amount}} በ{{dueDate}} ይደርሳል።', variables),
        seedTemplate('payment_reminder', 'finance', 'sms', 'am', '', '{{invoiceId}} ደረሰኝ ለ{{amount}} በ{{dueDate}} ይደርሳል።', variables),
        seedTemplate('payment_thank_you', 'finance', 'email', 'am', 'ለ{{invoiceId}} የክፍያ ምስጋና', 'ክቡር {{customerName}}፣ ለ{{invoiceId}} የ{{amount}} ክፍያዎን እናመሰግናለን።', variables),
        seedTemplate('payment_receipt', 'finance', 'email', 'am', 'የ{{invoiceId}} ደረሰኝ', 'ክቡር {{customerName}}፣ ለ{{invoiceId}} የ{{amount}} ክፍያዎ ተመዝግቧል።', variables),
        seedTemplate('overdue_invoice_notice', 'finance', 'telegram', 'am', '', '{{invoiceId}} ደረሰኝ ለ{{amount}} ዘግይቷል።', variables),
        seedTemplate('trip_delay_update', 'operations', 'telegram', 'am', '', '{{tripId}} ጉዞ በ{{route}} ላይ ዘግይቷል።', variables),
        seedTemplate('dispatch_follow_up', 'operations', 'in_app', 'am', '', '{{tripId}} የዲስፓች ክትትል ይፈልጋል።', variables),
        seedTemplate('maintenance_escalation', 'operations', 'telegram', 'am', '', '{{vehicleId}} የጥገና አስቸኳይ እርምጃ ይፈልጋል።', variables),
        seedTemplate('vehicle_block_notice', 'operations', 'in_app', 'am', '', '{{vehicleId}} ለምደባ ታግዷል።', variables),
        seedTemplate('kyc_reminder', 'driver', 'sms', 'am', '', 'የKYC ግምገማዎ በመጠባበቅ ላይ ነው። ሰነዶችን ያቅርቡ።', variables),
        seedTemplate('document_resubmission_notice', 'driver', 'in_app', 'am', '', 'የተጠየቁ ሰነዶችን እንደገና ያቅርቡ።', variables),
        seedTemplate('incident_acknowledgement', 'operations', 'telegram', 'am', '', '{{vehicleId}} ክስተት ተቀብሏል። የዲስፓች ክትትል ይፈልጋል።', variables),
    ];
}
function buildSeedAutomationRules() {
    return [
        { ruleId: 'invoice-due-soon', name: 'Invoice Due Soon', entityType: 'invoice', triggerType: 'invoice_due_soon', channels: ['email', 'sms'], channel: 'email', templateKey: 'payment_reminder', language: 'en', languageMode: 'fixed_en', enabled: true, isEnabled: true, conditions: { daysUntilDue: 1 }, scheduleOffset: 0, scheduleOffsetMinutes: 0 },
        { ruleId: 'invoice-overdue', name: 'Invoice Overdue', entityType: 'invoice', triggerType: 'invoice_overdue', channels: ['email', 'telegram'], channel: 'email', templateKey: 'overdue_invoice_notice', language: 'en', languageMode: 'fixed_en', enabled: true, isEnabled: true, conditions: { overdueDays: 3 }, scheduleOffset: 0, scheduleOffsetMinutes: 0 },
        { ruleId: 'payment-completed', name: 'Payment Completed', entityType: 'payment', triggerType: 'payment_completed', channels: ['email', 'in_app'], channel: 'email', templateKey: 'payment_thank_you', language: 'en', languageMode: 'recipient_preference', enabled: true, isEnabled: true, conditions: {}, scheduleOffset: 0, scheduleOffsetMinutes: 0 },
        { ruleId: 'trip-delayed', name: 'Trip Delayed', entityType: 'trip', triggerType: 'trip_delayed', channels: ['telegram', 'in_app'], channel: 'telegram', templateKey: 'trip_delay_update', language: 'en', languageMode: 'fixed_en', enabled: true, isEnabled: true, conditions: { delayed: true }, scheduleOffset: 0, scheduleOffsetMinutes: 0 },
        { ruleId: 'maintenance-overdue', name: 'Maintenance Overdue', entityType: 'maintenance_plan', triggerType: 'maintenance_overdue', channels: ['telegram'], channel: 'telegram', templateKey: 'maintenance_escalation', language: 'en', languageMode: 'fixed_en', enabled: true, isEnabled: true, conditions: { overdue: true }, scheduleOffset: 0, scheduleOffsetMinutes: 0 },
        { ruleId: 'kyc-pending', name: 'KYC Pending', entityType: 'driver_kyc_request', triggerType: 'kyc_pending', channels: ['sms', 'in_app'], channel: 'sms', templateKey: 'kyc_reminder', language: 'en', languageMode: 'recipient_preference', enabled: true, isEnabled: true, conditions: { pendingDays: 2 }, scheduleOffset: 0, scheduleOffsetMinutes: 0 },
    ];
}
function seedTemplate(templateKey, entityType, channel, language, subjectTemplate, bodyTemplate, variables) {
    return {
        templateId: `${templateKey}-${channel}-${language}`,
        templateKey,
        name: templateKey.replace(/_/g, ' '),
        category: entityType,
        entityType,
        channel,
        language,
        subjectTemplate,
        bodyTemplate,
        variables,
        isActive: true,
    };
}
function generatedUserRole(index) {
    if (index <= 31)
        return 'driver';
    if (index <= 32)
        return 'dispatcher';
    if (index <= 33)
        return 'operations_manager';
    if (index <= 34)
        return 'technical_manager';
    if (index <= 35)
        return 'finance_officer';
    if (index <= 36)
        return 'hr_officer';
    if (index <= 37)
        return 'marketing_officer';
    return 'customer';
}
function dateOffset(days, hours = 0) {
    const value = new Date();
    value.setUTCDate(value.getUTCDate() + days);
    value.setUTCHours(value.getUTCHours() + hours, 0, 0, 0);
    return value;
}
function safeDateFrom(value, fallback = new Date()) {
    const parsed = new Date(String(value ?? ''));
    return Number.isNaN(parsed.getTime()) ? new Date(fallback) : parsed;
}
function toGeoPoint(point) {
    return {
        type: 'Point',
        coordinates: [Number(point.longitude), Number(point.latitude)],
    };
}
function toLegacyPoint(point) {
    return {
        latitude: Number(point.latitude),
        longitude: Number(point.longitude),
    };
}
const branches = [
    { code: 'BR-HQ', name: 'Addis Ababa HQ', city: 'Addis Ababa', country: 'Ethiopia' },
    { code: 'BR-ADM', name: 'Adama', city: 'Adama', country: 'Ethiopia' },
    { code: 'BR-DDW', name: 'Dire Dawa', city: 'Dire Dawa', country: 'Ethiopia' },
    { code: 'BR-MDJ', name: 'Modjo', city: 'Modjo', country: 'Ethiopia' },
    { code: 'BR-KMB', name: 'Kombolcha', city: 'Kombolcha', country: 'Ethiopia' },
    { code: 'BR-DJB', name: 'Djibouti Operations', city: 'Djibouti', country: 'Djibouti' },
];
const ethiopianFirstNames = [
    'Abel', 'Abenezer', 'Abraham', 'Biruk', 'Dagmawi', 'Dawit', 'Elias', 'Fikadu', 'Haile', 'Henok',
    'Kaleb', 'Kenean', 'Lidetu', 'Mahder', 'Mekdes', 'Meron', 'Meseret', 'Mikias', 'Natnael', 'Rahel',
    'Ruth', 'Samrawit', 'Sara', 'Selam', 'Selamawit', 'Semhal', 'Solomon', 'Surafel', 'Tigist', 'Yared',
    'Yohannes', 'Yonas', 'Betelhem', 'Biniyam', 'Mulu', 'Kidist', 'Hana', 'Eden', 'Feven', 'Hiwot',
];
const ethiopianLastNames = [
    'Abebe', 'Alemu', 'Asfaw', 'Ayalew', 'Bekele', 'Belay', 'Demissie', 'Dereje', 'Fekadu', 'Gebremedhin',
    'Getachew', 'Getnet', 'Hailu', 'Hailemariam', 'Kassa', 'Kebede', 'Mekonnen', 'Mengistu', 'Moges', 'Negash',
    'Nega', 'Seyoum', 'Tadesse', 'Taye', 'Tekle', 'Tesfaye', 'Tesema', 'Wolde', 'Yilma', 'Zenebe',
];
const customerCompanyPrefixes = [
    'Abay', 'Alem', 'Blue Nile', 'Ethio', 'Ayer', 'Selam', 'Meskerem', 'Tibeb', 'Walia', 'Sheger',
    'Tsedey', 'Enat', 'Bole', 'Dire', 'Habesha', 'Kokeb', 'Lalibela', 'Lucy', 'Tana', 'Semien',
];
const customerCompanySuffixes = [
    'Logistics', 'Freight', 'Trading', 'Transport', 'Agro Export', 'Import Export', 'Distribution', 'Coffee Export',
    'Industrial Supply', 'Transit Services', 'Cargo Solutions', 'Manufacturing', 'Warehouse Group', 'Commercial PLC',
];
function seededPersonName(index) {
    const firstName = ethiopianFirstNames[(index - 1) % ethiopianFirstNames.length];
    const lastName = ethiopianLastNames[Math.floor((index - 1) / ethiopianFirstNames.length) % ethiopianLastNames.length];
    return { firstName, lastName };
}
function seededCustomerCompany(index) {
    const prefix = customerCompanyPrefixes[(index - 1) % customerCompanyPrefixes.length];
    const suffix = customerCompanySuffixes[Math.floor((index - 1) / customerCompanyPrefixes.length) % customerCompanySuffixes.length];
    return `${prefix} ${suffix}`;
}
const seedVolumes = {
    users: 36,
    employees: 28,
    drivers: 24,
    customers: 120,
    vehicles: 80,
    trips: 400,
    maintenancePlans: 120,
    maintenanceRecords: 70,
    repairOrders: 60,
    spareParts: 40,
    maintenanceNotifications: 90,
    driverReports: 60,
    agreements: 90,
    invoices: 120,
    payments: 100,
    paymentCommunications: 160,
    executiveCommunications: 110,
    communicationLogs: 140,
    bookings: 45,
    quotes: 60,
    communicationTemplates: 34,
    communicationAutomationRules: 10,
    employeePerformanceMetrics: 160,
    driverPerformanceMetrics: 160,
    notifications: 250,
    documents: 300,
    fuelLogs: 120,
    vehicleServiceHistory: 160,
    partReplacements: 140,
    rentalPartners: 10,
    rentalPartnerTrips: 90,
    incidentReports: 45,
    activityLogs: 260,
    uploadedDocuments: 140,
    collectionTasks: 40,
    escalationLogs: 35,
    leads: 120,
    onboardingTasks: 90,
    outboundNotifications: 80,
    jobRequisitions: 18,
    candidates: 48,
    onboardingTasksHr: 30,
    trainingRecords: 80,
    drivingSchoolStudents: 54,
    drivingSchoolPayments: 72,
    availabilityReports: 24,
    leaveRequests: 12,
    tripGpsPointsPerTrip: 20,
};
const roleMatrix = [
    { code: 'super_admin', name: 'Super Admin', permissions: ['*'] },
    { code: 'executive', name: 'Executive', permissions: ['dashboards:executive:view', 'tracking:management:view', 'performance:view'] },
    { code: 'operations_manager', name: 'Operations Manager', permissions: ['trips:view', 'tracking:management:view', 'driver-reports:view'] },
    { code: 'dispatcher', name: 'Dispatcher', permissions: ['trips:view', 'dispatch:view', 'chat:view'] },
    { code: 'technical_manager', name: 'Technical Manager', permissions: ['maintenance:view', 'repair-orders:view', 'vehicles:maintenance:view'] },
    { code: 'finance_officer', name: 'Finance Officer', permissions: ['payments:view', 'invoices:view', 'documents:view'] },
    { code: 'hr_officer', name: 'HR Officer', permissions: ['employees:view', 'drivers:view', 'performance:view'] },
    { code: 'marketing_officer', name: 'Marketing Officer', permissions: ['customers:view', 'agreements:view'] },
    {
        code: 'customer',
        name: 'Customer',
        permissions: ['dashboard:customer:view', 'trips:own:view', 'agreements:own:view', 'documents:own:view', 'documents:upload', 'payments:own:view', 'chat:own:view', 'notifications:view', 'notifications:update'],
    },
    {
        code: 'driver',
        name: 'Driver',
        permissions: ['mobile:login', 'trips:view-assigned', 'trips:update-status', 'trip-events:view', 'driver-reports:create', 'driver-reports:view', 'chat:view', 'chat:send', 'documents:view', 'documents:upload', 'notifications:view', 'notifications:update'],
    },
];
const routeCatalog = [
    {
        code: 'ADD-DJB',
        origin: 'Addis Ababa',
        destination: 'Djibouti',
        branchCode: 'BR-HQ',
        djibouti: true,
        weight: 32,
        points: [
            { latitude: 8.9806, longitude: 38.7578, geofence: 'origin' },
            { latitude: 8.5408, longitude: 39.2716, geofence: 'checkpoint' },
            { latitude: 9.5931, longitude: 41.8661, geofence: 'at_border' },
            { latitude: 11.5721, longitude: 43.1456, geofence: 'djibouti' },
        ],
    },
    {
        code: 'ADM-DJB',
        origin: 'Adama',
        destination: 'Djibouti',
        branchCode: 'BR-ADM',
        djibouti: true,
        weight: 16,
        points: [
            { latitude: 8.5408, longitude: 39.2716, geofence: 'origin' },
            { latitude: 9.5931, longitude: 41.8661, geofence: 'at_border' },
            { latitude: 11.5721, longitude: 43.1456, geofence: 'djibouti' },
        ],
    },
    {
        code: 'DDW-DJB',
        origin: 'Dire Dawa',
        destination: 'Djibouti',
        branchCode: 'BR-DDW',
        djibouti: true,
        weight: 15,
        points: [
            { latitude: 9.6009, longitude: 41.8501, geofence: 'origin' },
            { latitude: 10.3401, longitude: 42.2747, geofence: 'checkpoint' },
            { latitude: 11.5721, longitude: 43.1456, geofence: 'djibouti' },
        ],
    },
    {
        code: 'ADD-ADM',
        origin: 'Addis Ababa',
        destination: 'Adama',
        branchCode: 'BR-HQ',
        djibouti: false,
        weight: 12,
        points: [
            { latitude: 8.9806, longitude: 38.7578, geofence: 'origin' },
            { latitude: 8.5408, longitude: 39.2716, geofence: 'destination' },
        ],
    },
    {
        code: 'ADD-DDW',
        origin: 'Addis Ababa',
        destination: 'Dire Dawa',
        branchCode: 'BR-HQ',
        djibouti: false,
        weight: 11,
        points: [
            { latitude: 8.9806, longitude: 38.7578, geofence: 'origin' },
            { latitude: 9.5931, longitude: 41.8661, geofence: 'checkpoint' },
            { latitude: 9.6009, longitude: 41.8501, geofence: 'destination' },
        ],
    },
    {
        code: 'MOD-ADD',
        origin: 'Modjo',
        destination: 'Addis Ababa',
        branchCode: 'BR-MDJ',
        djibouti: false,
        weight: 7,
        points: [
            { latitude: 8.5871, longitude: 39.1219, geofence: 'origin' },
            { latitude: 8.9806, longitude: 38.7578, geofence: 'destination' },
        ],
    },
    {
        code: 'KMB-ADD',
        origin: 'Kombolcha',
        destination: 'Addis Ababa',
        branchCode: 'BR-KMB',
        djibouti: false,
        weight: 7,
        points: [
            { latitude: 11.0815, longitude: 39.7435, geofence: 'origin' },
            { latitude: 8.9806, longitude: 38.7578, geofence: 'destination' },
        ],
    },
];
function tripCheckpointForStatus(status, route) {
    if (status === 'assigned')
        return route.origin;
    if (status === 'loading' || status === 'loaded')
        return route.origin;
    if (status === 'at_border')
        return 'at_border';
    if (status === 'in_djibouti')
        return 'djibouti';
    if (status === 'offloading')
        return route.destination;
    if (status === 'delayed')
        return route.points[Math.min(1, route.points.length - 1)]?.geofence ?? 'checkpoint';
    return route.points[Math.min(1, route.points.length - 1)]?.geofence ?? 'checkpoint';
}
function routePointForStatus(status, route) {
    if (status === 'assigned' || status === 'loading' || status === 'loaded')
        return route.points[0];
    if (status === 'at_border')
        return route.points[Math.min(route.points.length - 1, Math.max(route.points.length - 2, 0))];
    if (status === 'in_djibouti' || status === 'offloading')
        return route.points[route.points.length - 1];
    return route.points[Math.min(1, route.points.length - 1)];
}
async function dropLegacyUserIndexes() {
    try {
        const indexes = await models_1.UserModel.collection.indexes();
        const legacyIndex = indexes.find((index) => index.name === 'phoneNumber_1');
        if (legacyIndex) {
            await models_1.UserModel.collection.dropIndex('phoneNumber_1');
        }
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const code = typeof error === 'object' && error && 'code' in error ? Number(error.code) : undefined;
        if (code === 26 || message.includes('ns does not exist') || message.includes('NamespaceNotFound')) {
            return;
        }
        throw error;
    }
}
async function syncSeedIndexes() {
    const models = [
        models_1.RoleModel,
        models_1.BranchModel,
        models_1.UserModel,
        models_1.EmployeeModel,
        models_1.DriverModel,
        models_1.CustomerModel,
        models_1.CustomerProfileModel,
        models_1.DriverProfileModel,
        models_1.DriverKycRequestModel,
        models_1.VehicleModel,
        models_1.FuelLogModel,
        models_1.VehicleServiceHistoryModel,
        models_1.PartReplacementModel,
        models_1.RentalPartnerModel,
        models_1.RentalPartnerTripModel,
        models_1.TripModel,
        models_1.TripEventModel,
        models_1.GpsPointModel,
        models_1.MaintenancePlanModel,
        models_1.MaintenanceRecordModel,
        models_1.MaintenanceNotificationModel,
        models_1.CommunicationDraftModel,
        models_1.CommunicationScheduleModel,
        models_1.NotificationEventModel,
        models_1.DriverReportModel,
        models_1.AgreementModel,
        models_1.AgreementSignatureModel,
        models_1.InvoiceModel,
        models_1.PaymentModel,
        models_1.RepairOrderModel,
        models_1.SparePartModel,
        models_1.NotificationModel,
        models_1.DocumentModel,
        models_1.UserPreferenceModel,
        models_1.IncidentReportModel,
        models_1.ActivityLogModel,
        models_1.UploadedDocumentModel,
        models_1.BookingModel,
        models_1.QuoteModel,
        models_1.AvailabilityReportModel,
        models_1.LeaveRequestModel,
        models_1.CollectionTaskModel,
        models_1.EscalationLogModel,
        models_1.LeadModel,
        models_1.OnboardingTaskModel,
        models_1.OutboundNotificationModel,
        models_1.JobRequisitionModel,
        models_1.CandidateModel,
        models_1.OnboardingTaskHrModel,
        models_1.TrainingRecordModel,
        models_1.DrivingSchoolStudentModel,
        models_1.DrivingSchoolPaymentModel,
        models_1.EmployeePerformanceMetricModel,
        models_1.DriverPerformanceMetricModel,
    ];
    for (const model of models) {
        await model.syncIndexes();
    }
}
async function seedBaseData() {
    await dropLegacyUserIndexes();
    await syncSeedIndexes();
    const roleWrites = roleMatrix.map((role) => ({
        updateOne: {
            filter: { code: role.code },
            update: { $set: role },
            upsert: true,
        },
    }));
    await models_1.RoleModel.bulkWrite(roleWrites);
    const branchWrites = branches.map((branch) => ({
        updateOne: {
            filter: { code: branch.code },
            update: { $set: branch },
            upsert: true,
        },
    }));
    await models_1.BranchModel.bulkWrite(branchWrites);
    const branchDocs = await models_1.BranchModel.find({ code: { $in: branches.map((item) => item.code) } }).lean();
    const branchByCode = new Map(branchDocs.map((branch) => [branch.code, branch]));
    const passwordHash = (0, config_1.hashPassword)('ChangeMe123!');
    const primaryUsers = [
        ['superadmin@tikurabay.com', 'Getnet', 'Belay', 'super_admin', 'BR-HQ'],
        ['executive@tikurabay.com', 'Selamawit', 'Kebede', 'executive', 'BR-HQ'],
        ['opsmanager@tikurabay.com', 'Dawit', 'Tadesse', 'operations_manager', 'BR-HQ'],
        ['supplier.agent@tikurabay.com', 'Liya', 'Mengistu', 'supplier_agent', 'BR-HQ'],
        ['djibouti.release@tikurabay.com', 'Kalkidan', 'Asfaw', 'djibouti_release_agent', 'BR-DJB'],
        ['clearance.agent@tikurabay.com', 'Biruk', 'Tadesse', 'djibouti_clearing_agent', 'BR-DJB'],
        ['dispatch.agent@tikurabay.com', 'Marta', 'Solomon', 'corridor_dispatch_agent', 'BR-ADM'],
        ['yard.agent@tikurabay.com', 'Yonas', 'Abebe', 'dry_port_yard_agent', 'BR-ADM'],
        ['finance.customs@tikurabay.com', 'Meseret', 'Taye', 'finance_customs_control', 'BR-HQ'],
        ['support.agent@tikurabay.com', 'Samrawit', 'Gebre', 'customer_support_agent', 'BR-HQ'],
        ['dispatcher@tikurabay.com', 'Meron', 'Alemu', 'dispatcher', 'BR-HQ'],
        ['technical@tikurabay.com', 'Henok', 'Tesfaye', 'technical_manager', 'BR-HQ'],
        ['finance@tikurabay.com', 'Rahel', 'Bekele', 'finance_officer', 'BR-HQ'],
        ['hr@tikurabay.com', 'Mekdes', 'Yilma', 'hr_officer', 'BR-HQ'],
        ['marketing@tikurabay.com', 'Abel', 'Mekonnen', 'marketing_officer', 'BR-HQ'],
        ['driver.demo@tikurabay.com', 'Biniyam', 'Haile', 'driver', 'BR-HQ'],
        ['customer1@tikurabay.com', 'Hana', 'Negash', 'customer', 'BR-HQ'],
        ['customer2@tikurabay.com', 'Rahel', 'Mekuria', 'customer', 'BR-HQ'],
    ];
    const userWrites = primaryUsers.map(([email, firstName, lastName, role, branchCode], index) => ({
        updateOne: {
            filter: { email },
            update: {
                $set: {
                    firstName,
                    lastName,
                    email,
                    phone: seedPhoneNumber(index + 1),
                    phoneNumber: seedPhoneNumber(index + 1),
                    passwordHash,
                    role,
                    permissions: roleMatrix.find((item) => item.code === role)?.permissions ?? [],
                    branchId: branchByCode.get(branchCode)?._id,
                    branchName: branchByCode.get(branchCode)?.name,
                    status: 'active',
                    employeeCode: role === 'customer' ? undefined : `EMP-${formatNumber(index + 1, 4)}`,
                    customerCode: email === 'customer1@tikurabay.com'
                        ? 'CUST-0001'
                        : email === 'customer2@tikurabay.com'
                            ? 'CUST-0002'
                            : role === 'customer'
                                ? 'CUST-0001'
                                : undefined,
                },
            },
            upsert: true,
        },
    }));
    for (let index = primaryUsers.length + 1; index <= seedVolumes.users; index += 1) {
        const role = generatedUserRole(index);
        const branch = branches[index % branches.length];
        const { firstName, lastName } = seededPersonName(index);
        userWrites.push({
            updateOne: {
                filter: { email: `user${formatNumber(index, 4)}@tikurabay.com` },
                update: {
                    $set: {
                        firstName,
                        lastName,
                        email: `user${formatNumber(index, 4)}@tikurabay.com`,
                        phone: seedPhoneNumber(index),
                        phoneNumber: seedPhoneNumber(index),
                        passwordHash,
                        role,
                        permissions: roleMatrix.find((item) => item.code === role)?.permissions ?? [],
                        branchId: branchByCode.get(branch.code)?._id,
                        branchName: branch.name,
                        status: 'active',
                        employeeCode: role === 'customer' ? undefined : `EMP-${formatNumber(index, 4)}`,
                        customerCode: role === 'customer' ? `CUST-${formatNumber(index, 4)}` : undefined,
                    },
                },
                upsert: true,
            },
        });
    }
    await models_1.UserModel.bulkWrite(userWrites);
    await models_1.UserModel.findOneAndUpdate({ email: 'driver.fixed@tikurabay.com' }, {
        $set: {
            firstName: 'Abel',
            lastName: 'Hailu',
            email: 'driver.fixed@tikurabay.com',
            phone: '+251900000015',
            phoneNumber: '+251900000015',
            passwordHash: (0, config_1.hashPassword)('2112'),
            role: 'driver',
            mobileRole: 'internal_driver',
            permissions: roleMatrix.find((item) => item.code === 'driver')?.permissions ?? [],
            branchId: branchByCode.get('BR-ADM')?._id,
            branchName: branchByCode.get('BR-ADM')?.name,
            status: 'active',
            employeeCode: 'EMP-DRIVER-FIXED',
        },
    }, { upsert: true, new: true });
    await models_1.UserModel.updateMany({
        phone: '+251900000015',
        email: { $ne: 'driver.fixed@tikurabay.com' },
    }, {
        $set: {
            phone: '+251900000115',
            phoneNumber: '+251900000115',
        },
    });
    const users = await models_1.UserModel.find().lean();
    const staffUsers = users.filter((user) => user.role !== 'customer').slice(0, seedVolumes.employees);
    const employeeWrites = staffUsers.map((user, index) => ({
        updateOne: {
            filter: { employeeCode: user.employeeCode || `EMP-${formatNumber(index + 1, 4)}` },
            update: {
                $set: {
                    employeeCode: user.employeeCode || `EMP-${formatNumber(index + 1, 4)}`,
                    userId: user._id,
                    branchId: user.branchId,
                    department: ['Operations', 'Fleet', 'Commercial', 'Finance', 'HR'][index % 5],
                    role: user.role,
                    status: 'active',
                },
            },
            upsert: true,
        },
    }));
    await models_1.EmployeeModel.bulkWrite(employeeWrites);
    const driverUsers = users.filter((user) => user.role === 'driver').slice(0, seedVolumes.drivers);
    const driverWrites = driverUsers.map((user, index) => ({
        updateOne: {
            filter: { driverCode: `DRV-${formatNumber(index + 1, 4)}` },
            update: {
                $set: {
                    driverCode: `DRV-${formatNumber(index + 1, 4)}`,
                    userId: user._id,
                    branchId: user.branchId,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    licenseExpiry: dateOffset(200 + index),
                    status: 'active',
                },
            },
            upsert: true,
        },
    }));
    await models_1.DriverModel.bulkWrite(driverWrites);
}
async function seedLocalData() {
    await (0, mongo_1.connectToDatabase)();
    await seedBaseData();
    const rng = createRandom(42);
    const users = await models_1.UserModel.find().lean();
    const branchDocs = await models_1.BranchModel.find().lean();
    const branchByCode = new Map(branchDocs.map((branch) => [branch.code, branch]));
    const customers = [];
    const customerWrites = [];
    for (let index = 1; index <= seedVolumes.customers; index += 1) {
        const branch = branches[index % branches.length];
        const tier = index <= 24 ? 'strategic' : index <= 80 ? 'growth' : 'standard';
        customerWrites.push({
            updateOne: {
                filter: { customerCode: `CUST-${formatNumber(index, 4)}` },
                update: {
                    $set: {
                        customerCode: `CUST-${formatNumber(index, 4)}`,
                        companyName: seededCustomerCompany(index),
                        branchId: branchByCode.get(branch.code)?._id,
                        status: 'active',
                        city: branch.city,
                        country: branch.country,
                        segment: tier,
                    },
                },
                upsert: true,
            },
        });
    }
    await models_1.CustomerModel.bulkWrite(customerWrites);
    customers.push(...(await models_1.CustomerModel.find().lean()));
    const customerUsers = users.filter((user) => user.role === 'customer');
    const customerProfileWrites = customerUsers.map((user, index) => ({
        updateOne: {
            filter: { userId: user._id },
            update: {
                $set: {
                    userId: user._id,
                    customerId: customers[index % customers.length]?._id,
                    customerCode: user.customerCode,
                    fullName: `${user.firstName} ${user.lastName}`.trim(),
                    phone: user.phone || `+251911${formatNumber(index + 1, 6)}`,
                    email: user.email,
                    companyName: customers[index % customers.length]?.companyName || seededCustomerCompany(index + 1),
                    contactPerson: `${seededPersonName(index + 240).firstName} ${seededPersonName(index + 240).lastName}`,
                    accountManager: `${seededPersonName(index + 320).firstName} ${seededPersonName(index + 320).lastName}`,
                    accountManagerPhone: `+251955${formatNumber(index + 1, 6)}`,
                    tradeLicense: index % 4 === 0 ? `TL-${formatNumber(index + 1, 5)}` : undefined,
                    tin: index % 3 === 0 ? `TIN-${formatNumber(index + 1, 6)}` : undefined,
                    vat: index % 5 === 0 ? `VAT-${formatNumber(index + 1, 6)}` : undefined,
                    address: `Block ${index + 1}, ${branches[index % branches.length].city}`,
                    onboardingStatus: index % 6 === 0 ? 'under_review' : 'active',
                },
            },
            upsert: true,
        },
    }));
    await models_1.CustomerProfileModel.bulkWrite(customerProfileWrites);
    const drivers = await models_1.DriverModel.find().lean();
    if (!customers.length || !drivers.length) {
        throw new Error(`Seed prerequisites missing. Customers: ${customers.length}, drivers: ${drivers.length}.`);
    }
    const driverProfileWrites = drivers.map((driver, index) => ({
        updateOne: {
            filter: { userId: driver.userId },
            update: {
                $set: {
                    userId: driver.userId,
                    driverCode: driver.driverCode,
                    branchId: driver.branchId,
                    fullName: `${driver.firstName} ${driver.lastName}`.trim(),
                    phone: `+251922${formatNumber(index + 1, 6)}`,
                    licenseNumber: `LIC-${formatNumber(index + 1, 6)}`,
                    licenseExpiry: driver.licenseExpiry,
                    emergencyContact: `+251933${formatNumber(index + 1, 6)}`,
                    vehicleTypeExperience: index % 2 === 0 ? 'Long-haul freight' : 'Regional cargo',
                    status: 'active',
                },
            },
            upsert: true,
        },
    }));
    await models_1.DriverProfileModel.bulkWrite(driverProfileWrites);
    const driverKycWrites = drivers.map((driver, index) => ({
        updateOne: {
            filter: { userId: driver.userId },
            update: {
                $set: {
                    userId: driver.userId,
                    fullName: `${driver.firstName} ${driver.lastName}`.trim(),
                    phone: `+251922${formatNumber(index + 1, 6)}`,
                    faydaFrontDocumentId: `FAYDA-F-${driver.driverCode}`,
                    faydaBackDocumentId: `FAYDA-B-${driver.driverCode}`,
                    selfieDocumentId: index % 3 === 0 ? `SELFIE-${driver.driverCode}` : undefined,
                    status: index % 8 === 0 ? 'under_review' : 'approved',
                    reviewedBy: index % 8 === 0 ? undefined : 'superadmin@tikurabay.com',
                    reviewedAt: index % 8 === 0 ? undefined : dateOffset(-(index % 30)),
                    notes: index % 8 === 0 ? 'Pending manual KYC review' : 'Verified for mobile access',
                },
            },
            upsert: true,
        },
    }));
    await models_1.DriverKycRequestModel.bulkWrite(driverKycWrites);
    const vehicleWrites = [];
    for (let index = 1; index <= seedVolumes.vehicles; index += 1) {
        const branch = branches[index % branches.length];
        const driver = drivers[index % drivers.length];
        vehicleWrites.push({
            updateOne: {
                filter: { vehicleCode: `VEH-${formatNumber(index, 4)}` },
                update: {
                    $set: {
                        vehicleCode: `VEH-${formatNumber(index, 4)}`,
                        plateNumber: `AA-${formatNumber(index, 4)}`,
                        branchId: branchByCode.get(branch.code)?._id,
                        branchName: branch.name,
                        type: index % 5 === 0 ? 'Trailer Truck' : 'Prime Mover',
                        brand: ['Volvo', 'Scania', 'MAN', 'Sinotruk'][index % 4],
                        model: ['FH', 'R450', 'TGX', 'Howo'][index % 4],
                        capacityTons: index % 5 === 0 ? 45 : 32,
                        ownershipType: 'internal',
                        readyForAssignment: index % 9 !== 0,
                        safetyStatus: index % 11 === 0 ? 'attention' : 'ready',
                        currentStatus: 'available',
                        currentOdometerKm: 38000 + index * 275,
                        assignedDriverId: driver._id,
                    },
                },
                upsert: true,
            },
        });
    }
    await models_1.VehicleModel.bulkWrite(vehicleWrites);
    const vehicles = await models_1.VehicleModel.find().lean();
    if (!vehicles.length) {
        throw new Error('Vehicle seed failed. No vehicles were created.');
    }
    const tripWrites = [];
    const delayedTripIndexes = new Set();
    const now = new Date();
    for (let index = 1; index <= seedVolumes.invoices; index += 1) {
        const route = index <= 12
            ? [routeCatalog[0], routeCatalog[3], routeCatalog[4]][(index - 1) % 3]
            : pickWeighted(rng, routeCatalog.map((item) => ({ value: item, weight: item.weight })));
        const branch = branchByCode.get(route.branchCode);
        const customer = customers[index % customers.length];
        const vehicle = vehicles[index % vehicles.length];
        const driver = drivers[index % drivers.length];
        const status = index <= 20
            ? ['assigned', 'loading', 'loaded', 'in_transit', 'delayed', 'offloading', 'in_djibouti', 'at_border'][index % 8]
            : pickWeighted(rng, [
                { value: 'completed', weight: 34 },
                { value: 'in_transit', weight: 20 },
                { value: 'in_djibouti', weight: 10 },
                { value: 'loading', weight: 7 },
                { value: 'loaded', weight: 7 },
                { value: 'delayed', weight: 9 },
                { value: 'assigned', weight: 6 },
                { value: 'offloading', weight: 4 },
                { value: 'breakdown', weight: 2 },
                { value: 'at_border', weight: 1 },
            ]);
        const isActiveSeedTrip = index <= 20;
        const plannedStartAt = isActiveSeedTrip
            ? new Date(now.getTime() - ((index % 10) + 2) * 60 * 60 * 1000)
            : new Date(now.getTime() - (index % 90) * 24 * 60 * 60 * 1000);
        const plannedArrivalAt = isActiveSeedTrip
            ? new Date(now.getTime() + ((index % 8) + 2) * 60 * 60 * 1000)
            : new Date(plannedStartAt.getTime() + (route.djibouti ? 2.5 : 1) * 24 * 60 * 60 * 1000);
        const isDelayed = status === 'delayed' || (index % 33 === 0 && status !== 'completed');
        if (isDelayed) {
            delayedTripIndexes.add(index);
        }
        const actualArrivalAt = status === 'completed'
            ? new Date(plannedArrivalAt.getTime() + (isDelayed ? 9 : -3) * 60 * 60 * 1000)
            : undefined;
        tripWrites.push({
            updateOne: {
                filter: { tripCode: `TRIP-${formatNumber(index, 5)}` },
                update: {
                    $set: {
                        tripCode: `TRIP-${formatNumber(index, 5)}`,
                        customerId: customer._id,
                        customerCode: customer.customerCode,
                        customerName: customer.companyName,
                        vehicleId: vehicle._id,
                        vehicleCode: vehicle.vehicleCode,
                        driverId: driver._id,
                        driverName: `${driver.firstName} ${driver.lastName}`,
                        branchId: branch._id,
                        branchName: branch.name,
                        origin: route.origin,
                        destination: route.destination,
                        routeName: route.code,
                        routeType: route.djibouti ? 'djibouti' : 'local',
                        status,
                        plannedStartAt,
                        actualStartAt: plannedStartAt,
                        plannedArrivalAt,
                        actualArrivalAt,
                        currentCheckpoint: tripCheckpointForStatus(String(status), route),
                        djiboutiFlag: route.djibouti,
                        proofOfDeliveryUploaded: status === 'completed' ? index % 7 !== 0 : false,
                        revenueAmount: 180000 + (customer.segment === 'strategic' ? 120000 : 0) + (route.djibouti ? 200000 : 60000),
                        delayedMinutes: isDelayed ? 240 + (index % 7) * 45 : 0,
                    },
                },
                upsert: true,
            },
        });
    }
    await models_1.TripModel.bulkWrite(tripWrites);
    const trips = await models_1.TripModel.find().lean();
    const hqTrips = trips
        .filter((trip) => String(trip.branchName) === 'Addis Ababa HQ')
        .sort((left, right) => {
        const leftPriority = (String(left.routeType) === 'djibouti' ? 20 : 0) +
            (['in_transit', 'at_border', 'in_djibouti', 'delayed', 'offloading'].includes(String(left.status)) ? 10 : 0);
        const rightPriority = (String(right.routeType) === 'djibouti' ? 20 : 0) +
            (['in_transit', 'at_border', 'in_djibouti', 'delayed', 'offloading'].includes(String(right.status)) ? 10 : 0);
        if (rightPriority !== leftPriority)
            return rightPriority - leftPriority;
        return String(left.tripCode).localeCompare(String(right.tripCode));
    })
        .slice(0, 18);
    const hqTripByVehicleId = new Map(hqTrips.map((trip) => [String(trip.vehicleId), trip]));
    const hqVehicleIds = new Set(hqTrips.map((trip) => String(trip.vehicleId)));
    const vehicleStatusWrites = vehicles.map((vehicle, index) => {
        const seededTrip = hqTripByVehicleId.get(String(vehicle._id)) ?? trips[index % trips.length];
        const route = routeCatalog.find((item) => item.code === seededTrip.routeName) ?? routeCatalog[index % routeCatalog.length];
        const currentStatus = hqVehicleIds.has(String(vehicle._id))
            ? String(seededTrip.status)
            : index % 17 === 0
                ? 'blocked'
                : index % 13 === 0
                    ? 'under_maintenance'
                    :
                        seededTrip.status === 'completed'
                            ? 'available'
                            : seededTrip.status === 'breakdown'
                                ? 'breakdown'
                                : seededTrip.status === 'delayed'
                                    ? 'delayed'
                                    : seededTrip.status === 'in_djibouti'
                                        ? 'in_djibouti'
                                        : seededTrip.status === 'loading'
                                            ? 'loading'
                                            : seededTrip.status === 'loaded'
                                                ? 'loaded'
                                                : 'in_transit';
        const currentPoint = routePointForStatus(String(currentStatus), route);
        return {
            updateOne: {
                filter: { _id: vehicle._id },
                update: {
                    $set: {
                        currentTripId: ['completed', 'cancelled'].includes(String(seededTrip.status)) ? undefined : seededTrip._id,
                        currentStatus,
                        readyForAssignment: currentStatus === 'available',
                        safetyStatus: ['blocked', 'under_maintenance', 'breakdown'].includes(currentStatus) ? 'blocked' : index % 11 === 0 ? 'attention' : 'ready',
                        lastGpsAt: hqVehicleIds.has(String(vehicle._id)) ? dateOffset(0, -((index % 4) + 1)) : dateOffset(-(index % 3), -(index % 5)),
                        currentLocation: toGeoPoint(currentPoint),
                        lastKnownLocation: toLegacyPoint(currentPoint),
                    },
                },
            },
        };
    });
    const guaranteedMaintenanceVehicles = vehicles.slice(0, 4);
    guaranteedMaintenanceVehicles.forEach((vehicle, index) => {
        const branchRoutePoint = routeCatalog.find((route) => route.origin === vehicle.branchName || route.destination === vehicle.branchName)?.points[0]
            ?? routeCatalog[index % routeCatalog.length].points[Math.min(1, routeCatalog[index % routeCatalog.length].points.length - 1)];
        vehicleStatusWrites.push({
            updateOne: {
                filter: { _id: vehicle._id },
                update: {
                    $set: {
                        currentTripId: undefined,
                        currentStatus: 'under_maintenance',
                        readyForAssignment: false,
                        safetyStatus: 'blocked',
                        lastGpsAt: dateOffset(-1, -(index + 1)),
                        currentLocation: toGeoPoint(branchRoutePoint),
                        lastKnownLocation: toLegacyPoint(branchRoutePoint),
                    },
                },
            },
        });
    });
    const hqVehicles = vehicles.filter((vehicle) => String(vehicle.branchName) === 'Addis Ababa HQ');
    hqVehicles
        .filter((vehicle) => !hqVehicleIds.has(String(vehicle._id)))
        .slice(0, 4)
        .forEach((vehicle, index) => {
        const point = routeCatalog[0].points[0];
        vehicleStatusWrites.push({
            updateOne: {
                filter: { _id: vehicle._id },
                update: {
                    $set: {
                        currentTripId: undefined,
                        currentStatus: 'available',
                        readyForAssignment: true,
                        safetyStatus: 'ready',
                        lastGpsAt: dateOffset(0, -(index + 1)),
                        currentLocation: toGeoPoint(point),
                        lastKnownLocation: toLegacyPoint(point),
                    },
                },
            },
        });
    });
    hqVehicles
        .filter((vehicle) => !hqVehicleIds.has(String(vehicle._id)))
        .slice(4, 6)
        .forEach((vehicle, index) => {
        const point = routeCatalog[0].points[1];
        vehicleStatusWrites.push({
            updateOne: {
                filter: { _id: vehicle._id },
                update: {
                    $set: {
                        currentTripId: undefined,
                        currentStatus: index === 0 ? 'blocked' : 'under_maintenance',
                        readyForAssignment: false,
                        safetyStatus: 'blocked',
                        lastGpsAt: dateOffset(0, -(index + 2)),
                        currentLocation: toGeoPoint(point),
                        lastKnownLocation: toLegacyPoint(point),
                    },
                },
            },
        });
    });
    await models_1.VehicleModel.bulkWrite(vehicleStatusWrites);
    const tripEventWrites = [];
    for (const trip of trips) {
        const eventTimeline = [
            { eventType: 'assigned', title: 'Trip assigned', source: 'Dispatch Lead', note: 'Trip assigned to the dispatch queue.', location: String(trip.origin), offset: -4 },
            { eventType: 'loading_started', title: 'Loading started', source: 'Loading Supervisor', note: 'Cargo loading started at the yard.', location: String(trip.origin), offset: -3 },
            { eventType: 'loaded', title: 'Vehicle loaded', source: 'Loading complete', note: 'Vehicle sealed and ready for departure.', location: String(trip.origin), offset: -2 },
            { eventType: String(trip.status), title: trip.status === 'completed' ? 'Trip completed' : 'Trip status updated', source: 'Operations Control', note: `Trip moved to ${String(trip.status).replace(/_/g, ' ')} state.`, location: String(trip.status === 'completed' ? trip.destination : trip.currentCheckpoint || trip.origin), offset: -1 },
            { eventType: 'checkpoint', title: 'Checkpoint update', source: 'GPS checkpoint', note: 'Vehicle reached the latest checkpoint.', location: String(trip.currentCheckpoint || 'Galafi border'), offset: 0 },
        ];
        for (const [eventIndex, event] of eventTimeline.entries()) {
            tripEventWrites.push({
                updateOne: {
                    filter: { tripCode: trip.tripCode, eventType: `${event.eventType}-${eventIndex}` },
                    update: {
                        $set: {
                            tripId: trip._id,
                            tripCode: trip.tripCode,
                            eventType: `${event.eventType}-${eventIndex}`,
                            title: event.title,
                            source: event.source,
                            description: event.note,
                            location: event.location,
                            eventAt: dateOffset(event.offset, eventIndex * 10),
                        },
                    },
                    upsert: true,
                },
            });
        }
    }
    await models_1.TripEventModel.bulkWrite(tripEventWrites);
    const gpsWrites = [];
    for (const trip of trips) {
        const route = routeCatalog.find((item) => item.code === trip.routeName) ?? routeCatalog[0];
        const tripStartAt = safeDateFrom(trip.plannedStartAt, now);
        for (let pointIndex = 0; pointIndex < seedVolumes.tripGpsPointsPerTrip; pointIndex += 1) {
            const anchor = route.points[Math.min(route.points.length - 1, Math.floor((pointIndex / seedVolumes.tripGpsPointsPerTrip) * route.points.length))];
            const recordedAt = new Date(tripStartAt.getTime() + pointIndex * 60 * 60 * 1000);
            gpsWrites.push({
                updateOne: {
                    filter: { tripCode: trip.tripCode, recordedAt },
                    update: {
                        $set: {
                            tripId: trip._id,
                            tripCode: trip.tripCode,
                            vehicleId: trip.vehicleId,
                            vehicleCode: trip.vehicleCode,
                            driverId: trip.driverId,
                            driverName: trip.driverName,
                            branchId: trip.branchId,
                            branchName: trip.branchName,
                            routeName: trip.routeName,
                            latitude: anchor.latitude + ((pointIndex % 3) - 1) * 0.05,
                            longitude: anchor.longitude + ((pointIndex % 3) - 1) * 0.05,
                            location: {
                                type: 'Point',
                                coordinates: [
                                    anchor.longitude + ((pointIndex % 3) - 1) * 0.05,
                                    anchor.latitude + ((pointIndex % 3) - 1) * 0.05,
                                ],
                            },
                            speed: trip.status === 'loading' ? 0 : 35 + (pointIndex % 6) * 8,
                            geofence: anchor.geofence,
                            recordedAt,
                        },
                    },
                    upsert: true,
                },
            });
        }
    }
    for (let index = 0; index < gpsWrites.length; index += 2000) {
        await models_1.GpsPointModel.bulkWrite(gpsWrites.slice(index, index + 2000));
    }
    const maintenancePlanWrites = [];
    for (let index = 1; index <= seedVolumes.repairOrders; index += 1) {
        const vehicle = vehicles[index % vehicles.length];
        const overdue = index % 8 === 0;
        maintenancePlanWrites.push({
            updateOne: {
                filter: { vehicleCode: vehicle.vehicleCode, serviceItemName: `Plan-${index % 3}` },
                update: {
                    $set: {
                        vehicleId: vehicle._id,
                        vehicleCode: vehicle.vehicleCode,
                        branchId: vehicle.branchId,
                        serviceItemName: index % 3 === 0 ? 'Tire inspection' : index % 3 === 1 ? 'Brake service' : 'Oil service',
                        intervalKm: index % 3 === 0 ? 4000 : 10000,
                        intervalDays: index % 3 === 0 ? 30 : 60,
                        nextDueKm: Number(vehicle.currentOdometerKm) + (overdue ? -150 : 850),
                        nextDueDate: dateOffset(overdue ? -4 : 9),
                        currentOdometerKm: vehicle.currentOdometerKm,
                        criticalFlag: index % 3 === 0,
                        notificationDaysBeforeDue: 3,
                        blockTripAssignmentIfOverdue: index % 3 === 0,
                        overdue,
                        blockedAssignment: overdue && index % 3 === 0,
                    },
                },
                upsert: true,
            },
        });
    }
    await models_1.MaintenancePlanModel.bulkWrite(maintenancePlanWrites);
    const maintenanceRecordWrites = [];
    for (let index = 1; index <= seedVolumes.maintenanceRecords; index += 1) {
        const vehicle = vehicles[index % vehicles.length];
        maintenanceRecordWrites.push({
            updateOne: {
                filter: { vehicleCode: vehicle.vehicleCode, serviceDate: dateOffset(-(index % 365)) },
                update: {
                    $set: {
                        vehicleId: vehicle._id,
                        vehicleCode: vehicle.vehicleCode,
                        branchId: vehicle.branchId,
                        serviceType: index % 4 === 0 ? 'Tire change' : index % 4 === 1 ? 'Oil service' : 'Brake service',
                        odometerKm: Number(vehicle.currentOdometerKm) - index * 14,
                        serviceDate: dateOffset(-(index % 365)),
                        totalCost: 18000 + (index % 7) * 1300,
                        vendor: ['Tikur Workshop', 'Dire Garage', 'Adama Fleet Care'][index % 3],
                    },
                },
                upsert: true,
            },
        });
    }
    await models_1.MaintenanceRecordModel.bulkWrite(maintenanceRecordWrites);
    const repairOrderWrites = [];
    for (let index = 1; index <= seedVolumes.incidentReports; index += 1) {
        const trip = trips[index % trips.length];
        const vehicle = vehicles[index % vehicles.length];
        const reportCode = `RPT-${formatNumber(index, 5)}`;
        const status = ['reported', 'under_review', 'approved', 'scheduled', 'in_service', 'completed'][index % 6];
        repairOrderWrites.push({
            updateOne: {
                filter: { repairOrderCode: `RO-${formatNumber(index, 5)}` },
                update: {
                    $set: {
                        repairOrderCode: `RO-${formatNumber(index, 5)}`,
                        vehicleId: vehicle._id,
                        vehicleCode: vehicle.vehicleCode,
                        branchId: vehicle.branchId,
                        maintenanceType: index % 3 === 0 ? 'Tire inspection' : index % 3 === 1 ? 'Brake service' : 'Breakdown repair',
                        issueType: index % 3 === 0 ? 'tire_issue' : index % 3 === 1 ? 'maintenance_needed' : 'breakdown_report',
                        urgency: ['medium', 'high', 'critical'][index % 3],
                        status,
                        workshop: ['Addis Workshop', 'Adama Workshop', 'Dire Dawa Workshop'][index % 3],
                        technician: `Technician ${formatNumber((index % 25) + 1, 2)}`,
                        description: `${vehicle.vehicleCode} service action linked to ${trip.tripCode}.`,
                        notes: status === 'completed' ? 'Service completed and vehicle returned to fleet.' : 'Awaiting next action.',
                        blockedAssignment: ['approved', 'scheduled', 'in_service'].includes(status) && index % 4 === 0,
                        estimatedCost: 12000 + (index % 9) * 2400,
                        actualCost: status === 'completed' ? 13500 + (index % 9) * 2200 : 0,
                        openedAt: dateOffset(-(index % 45)),
                        scheduledAt: ['scheduled', 'in_service', 'completed'].includes(status) ? dateOffset(-(index % 12)) : undefined,
                        completedAt: status === 'completed' ? dateOffset(-(index % 4)) : undefined,
                        performedOdometerKm: Number(vehicle.currentOdometerKm) - (index % 1500),
                        performedBy: status === 'completed' ? `Technician ${formatNumber((index % 25) + 1, 2)}` : undefined,
                    },
                },
                upsert: true,
            },
        });
    }
    const maintenanceCaseTemplates = [
        { issueType: 'brake_service', maintenanceType: 'Brake service', workshop: 'Addis Workshop', technician: 'Amanuel Tadesse', description: 'Front brake pads and air line inspection before return to dispatch.', notes: 'Workshop requested same-day brake test before release.', status: 'in_service' },
        { issueType: 'tire_issue', maintenanceType: 'Tire replacement', workshop: 'Adama Workshop', technician: 'Biniyam Kassahun', description: 'Rear left tire replacement and wheel alignment pending.', notes: 'Partner tire stock confirmed and fitting underway.', status: 'scheduled' },
        { issueType: 'engine_service', maintenanceType: 'Engine diagnostics', workshop: 'Dire Dawa Workshop', technician: 'Meklit Girma', description: 'Engine warning light and coolant pressure check in progress.', notes: 'Vehicle held in diagnostics bay pending sensor replacement.', status: 'under_review' },
        { issueType: 'suspension_repair', maintenanceType: 'Suspension repair', workshop: 'Kombolcha Workshop', technician: 'Tesfaye Alemu', description: 'Front suspension bush replacement and road test required.', notes: 'Workshop allocated slot for afternoon road test before release.', status: 'approved' },
    ];
    guaranteedMaintenanceVehicles.forEach((vehicle, index) => {
        const template = maintenanceCaseTemplates[index % maintenanceCaseTemplates.length];
        repairOrderWrites.push({
            updateOne: {
                filter: { repairOrderCode: `RO-DEMO-${formatNumber(index + 1, 3)}` },
                update: {
                    $set: {
                        repairOrderCode: `RO-DEMO-${formatNumber(index + 1, 3)}`,
                        vehicleId: vehicle._id,
                        vehicleCode: vehicle.vehicleCode,
                        branchId: vehicle.branchId,
                        maintenanceType: template.maintenanceType,
                        issueType: template.issueType,
                        urgency: index === 0 ? 'critical' : 'high',
                        status: template.status,
                        workshop: template.workshop,
                        technician: template.technician,
                        description: template.description,
                        notes: template.notes,
                        blockedAssignment: true,
                        estimatedCost: 18000 + index * 3500,
                        actualCost: 0,
                        openedAt: dateOffset(-(index + 2)),
                        scheduledAt: dateOffset(index === 0 ? 0 : 1),
                        completedAt: undefined,
                        performedOdometerKm: Number(vehicle.currentOdometerKm) - (250 + index * 70),
                    },
                },
                upsert: true,
            },
        });
    });
    await models_1.RepairOrderModel.bulkWrite(repairOrderWrites);
    const sparePartWrites = [];
    for (let index = 1; index <= seedVolumes.spareParts; index += 1) {
        const branch = branchDocs[index % branchDocs.length];
        const stockQty = 2 + (index % 18);
        const minStockQty = 4 + (index % 6);
        sparePartWrites.push({
            updateOne: {
                filter: { partCode: `PART-${formatNumber(index, 4)}` },
                update: {
                    $set: {
                        partCode: `PART-${formatNumber(index, 4)}`,
                        name: ['Tire 315', 'Brake Pad', 'Oil Filter', 'Battery 200Ah', 'Air Filter'][index % 5],
                        category: ['tire', 'brake', 'oil', 'battery', 'filter'][index % 5],
                        stockQty,
                        minStockQty,
                        unitCost: 2500 + (index % 8) * 700,
                        branchId: branch._id,
                        status: stockQty <= minStockQty ? 'low_stock' : 'active',
                    },
                },
                upsert: true,
            },
        });
    }
    await models_1.SparePartModel.bulkWrite(sparePartWrites);
    const maintenanceNotificationWrites = [];
    for (let index = 1; index <= seedVolumes.maintenanceNotifications; index += 1) {
        const vehicle = vehicles[index % vehicles.length];
        const driver = drivers[index % drivers.length];
        maintenanceNotificationWrites.push({
            updateOne: {
                filter: { vehicleCode: vehicle.vehicleCode, maintenanceType: `maintenance-${index}` },
                update: {
                    $set: {
                        vehicleId: vehicle._id,
                        vehicleCode: vehicle.vehicleCode,
                        driverId: driver._id,
                        branchId: vehicle.branchId,
                        maintenanceType: index % 2 === 0 ? 'Tire inspection' : 'Brake service',
                        dueKm: vehicle.currentOdometerKm + 400,
                        dueDate: dateOffset(index % 5 === 0 ? -1 : 4),
                        message: `${vehicle.vehicleCode} requires ${index % 2 === 0 ? 'tire inspection' : 'brake service'}.`,
                        status: index % 5 === 0 ? 'sent' : 'pending',
                        sentAt: dateOffset(-(index % 4)),
                    },
                },
                upsert: true,
            },
        });
    }
    await models_1.MaintenanceNotificationModel.bulkWrite(maintenanceNotificationWrites);
    const reportTypes = [
        'fuel_request',
        'tire_issue',
        'maintenance_needed',
        'accident_report',
        'obstacle_report',
        'breakdown_report',
        'delay_report',
        'general_support',
    ];
    const driverReportWrites = [];
    for (let index = 1; index <= seedVolumes.driverReports; index += 1) {
        const trip = trips[index % trips.length];
        const type = reportTypes[index % reportTypes.length];
        const latestPoint = routeCatalog[index % routeCatalog.length].points.slice(-1)[0];
        driverReportWrites.push({
            updateOne: {
                filter: { reportCode: `RPT-${formatNumber(index, 5)}` },
                update: {
                    $set: {
                        reportCode: `RPT-${formatNumber(index, 5)}`,
                        type,
                        tripId: trip._id,
                        tripCode: trip.tripCode,
                        vehicleId: trip.vehicleId,
                        vehicleCode: trip.vehicleCode,
                        driverId: trip.driverId,
                        driverName: trip.driverName,
                        branchId: trip.branchId,
                        branchName: trip.branchName,
                        location: { latitude: latestPoint.latitude, longitude: latestPoint.longitude },
                        odometerKm: 50000 + index * 8,
                        urgency: ['low', 'medium', 'high', 'critical'][index % 4],
                        description: `${type.replaceAll('_', ' ')} reported on ${trip.tripCode}.`,
                        attachments: index % 3 === 0 ? [`https://files.example.com/reports/${index}.jpg`] : [],
                        status: index % 5 === 0 ? 'resolved' : index % 4 === 0 ? 'under_review' : 'submitted',
                    },
                },
                upsert: true,
            },
        });
    }
    await models_1.DriverReportModel.bulkWrite(driverReportWrites);
    const agreementWrites = [];
    for (let index = 1; index <= seedVolumes.agreements; index += 1) {
        const customer = customers[index % customers.length];
        agreementWrites.push({
            updateOne: {
                filter: { agreementCode: `AGR-${formatNumber(index, 5)}` },
                update: {
                    $set: {
                        agreementCode: `AGR-${formatNumber(index, 5)}`,
                        customerId: customer._id,
                        customerCode: customer.customerCode,
                        customerName: customer.companyName,
                        branchId: customer.branchId,
                        routeName: routeCatalog[index % routeCatalog.length].code,
                        status: index % 7 === 0 ? 'under_review' : index % 6 === 0 ? 'approved' : 'signed',
                        startDate: dateOffset(-(index % 180)),
                        endDate: dateOffset(90 + (index % 180)),
                        totalValue: 1_500_000 + (index % 15) * 120_000,
                    },
                },
                upsert: true,
            },
        });
    }
    await models_1.AgreementModel.bulkWrite(agreementWrites);
    const agreements = await models_1.AgreementModel.find().lean();
    const agreementSignatureWrites = agreements
        .filter((agreement, index) => agreement.status === 'signed' && index % 3 === 0)
        .map((agreement, index) => ({
        updateOne: {
            filter: { agreementId: agreement._id },
            update: {
                $set: {
                    agreementId: agreement._id,
                    signerName: agreement.customerName,
                    signerEmail: `contracts+${agreement.customerCode?.toLowerCase()}@tikurabay.com`,
                    signerPhone: `+251944${formatNumber(index + 1, 6)}`,
                    signedAt: dateOffset(-(index % 45)),
                    ipAddress: `10.20.30.${(index % 220) + 10}`,
                    deviceInfo: index % 2 === 0 ? 'mobile-web' : 'customer-portal',
                    signedPdfUrl: `/agreements/${agreement._id}/download`,
                    auditTrail: ['Agreement opened', 'Customer reviewed agreement', 'Customer signed agreement'],
                },
            },
            upsert: true,
        },
    }));
    await models_1.AgreementSignatureModel.bulkWrite(agreementSignatureWrites);
    const invoiceWrites = [];
    for (let index = 1; index <= seedVolumes.invoices; index += 1) {
        const trip = trips[(index - 1) % trips.length];
        const totalAmount = Number(trip.revenueAmount);
        const paidAmount = index % 5 === 0 ? 0 : index % 4 === 0 ? Math.round(totalAmount * 0.5) : totalAmount;
        const outstandingAmount = Math.max(0, totalAmount - paidAmount);
        invoiceWrites.push({
            updateOne: {
                filter: { invoiceCode: `INV-${formatNumber(index, 5)}` },
                update: {
                    $set: {
                        invoiceCode: `INV-${formatNumber(index, 5)}`,
                        customerId: trip.customerId,
                        customerCode: trip.customerCode,
                        customerName: trip.customerName,
                        tripId: trip._id,
                        tripCode: trip.tripCode,
                        branchId: trip.branchId,
                        routeName: trip.routeName,
                        issueDate: trip.actualStartAt,
                        dueDate: dateOffset((index % 5) - 3),
                        totalAmount,
                        paidAmount,
                        outstandingAmount,
                        status: outstandingAmount === 0 ? 'paid' : paidAmount > 0 ? 'partially_paid' : index % 6 === 0 ? 'overdue' : 'pending',
                    },
                },
                upsert: true,
            },
        });
    }
    await models_1.InvoiceModel.bulkWrite(invoiceWrites);
    const invoices = await models_1.InvoiceModel.find().lean();
    const paymentWrites = [];
    for (let index = 1; index <= seedVolumes.payments; index += 1) {
        const invoice = invoices[index % invoices.length];
        paymentWrites.push({
            updateOne: {
                filter: { paymentCode: `PAY-${formatNumber(index, 5)}` },
                update: {
                    $set: {
                        paymentCode: `PAY-${formatNumber(index, 5)}`,
                        paymentId: `PAYID-${formatNumber(index, 6)}`,
                        invoiceId: invoice._id,
                        invoiceCode: invoice.invoiceCode,
                        customerId: invoice.customerId,
                        customerCode: invoice.customerCode,
                        customerName: invoice.customerName,
                        branchId: invoice.branchId,
                        routeName: invoice.routeName,
                        amount: index % 7 === 0 ? Math.round(Number(invoice.totalAmount) * 0.4) : Math.round(Number(invoice.totalAmount) * 0.7),
                        paymentMethod: ['bank_transfer', 'cash', 'telebirr', 'check'][index % 4],
                        collectedBy: `${seededPersonName(index + 360).firstName} ${seededPersonName(index + 360).lastName}`,
                        receiptUrl: `https://files.tikurabay.local/payments/${index}.pdf`,
                        status: index % 11 === 0 ? 'failed' : index % 8 === 0 ? 'pending' : 'paid',
                        paymentDate: dateOffset(-(index % 45)),
                    },
                },
                upsert: true,
            },
        });
    }
    await models_1.PaymentModel.bulkWrite(paymentWrites);
    const payments = await models_1.PaymentModel.find().lean();
    const paymentCommunicationWrites = [];
    for (let index = 1; index <= seedVolumes.paymentCommunications; index += 1) {
        const payment = payments[index % payments.length];
        const invoice = invoices.find((entry) => String(entry._id) === String(payment.invoiceId)) || invoices[index % invoices.length];
        const customerName = invoice.customerName || payment.customerName || `Customer ${index}`;
        const templateType = invoice.status === 'overdue'
            ? 'escalation'
            : payment.status === 'paid'
                ? index % 2 === 0 ? 'thank_you' : 'receipt'
                : 'reminder';
        const channel = ['email', 'sms', 'telegram', 'in_app'][index % 4];
        const status = index % 11 === 0 ? 'failed' : index % 7 === 0 ? 'scheduled' : 'sent';
        const amount = Math.round(Number(payment.amount || invoice.outstandingAmount || invoice.totalAmount || 0));
        const recipient = channel === 'email'
            ? `${slugify(customerName)}@customer.tikurabay.local`
            : channel === 'sms'
                ? seedPhoneNumber(index + 400)
                : channel === 'telegram'
                    ? `@${slugify(customerName).replace(/-/g, '_')}`
                    : `customer:${invoice.customerCode || invoice.customerId || index}`;
        const subject = templateType === 'thank_you'
            ? `Payment received for ${invoice.invoiceCode}`
            : templateType === 'receipt'
                ? `Receipt for ${invoice.invoiceCode}`
                : templateType === 'escalation'
                    ? `Overdue notice for ${invoice.invoiceCode}`
                    : `Payment reminder for ${invoice.invoiceCode}`;
        const message = templateType === 'thank_you'
            ? `Dear ${customerName}, thank you for your payment of ETB ${amount} for invoice ${invoice.invoiceCode}. Your payment has been received successfully. We appreciate your business.`
            : templateType === 'receipt'
                ? `Dear ${customerName}, your payment for invoice ${invoice.invoiceCode} has been recorded successfully. Amount received: ETB ${amount}. Receipt reference: ${payment.paymentCode}.`
                : templateType === 'escalation'
                    ? `Dear ${customerName}, invoice ${invoice.invoiceCode} for ETB ${amount} is now overdue. Please arrange payment as soon as possible or contact our finance team for support.`
                    : `Dear ${customerName}, this is a reminder that invoice ${invoice.invoiceCode} for ETB ${amount} is due on ${new Date(String(invoice.dueDate || Date.now())).toLocaleDateString('en-US')}. Please complete payment at your earliest convenience. Thank you.`;
        paymentCommunicationWrites.push({
            updateOne: {
                filter: { paymentId: payment._id, channel, subject, sentBy: `finance${(index % 4) + 1}@tikurabay.com` },
                update: {
                    $set: {
                        paymentId: payment._id,
                        invoiceId: invoice._id,
                        customerId: invoice.customerId,
                        customerName,
                        channel,
                        messageType: templateType,
                        recipient,
                        subject,
                        message,
                        status,
                        sentAt: dateOffset(-(index % 18), -(index % 7)),
                        sentBy: `finance${(index % 4) + 1}@tikurabay.com`,
                        providerResponse: status === 'sent'
                            ? `${channel} accepted for ${recipient}`
                            : status === 'scheduled'
                                ? `${channel} queued for ${recipient}`
                                : `${channel} delivery failed for ${recipient}`,
                        retryCount: status === 'failed' ? 2 : status === 'scheduled' ? 1 : 0,
                    },
                },
                upsert: true,
            },
        });
    }
    await models_1.PaymentCommunicationModel.bulkWrite(paymentCommunicationWrites);
    const executiveCommunicationWrites = [];
    const maintenancePlans = await models_1.MaintenancePlanModel.find().lean();
    const tripRows = await models_1.TripModel.find().lean();
    const kycRows = await models_1.DriverKycRequestModel.find().lean();
    const incidentRows = await models_1.IncidentReportModel.find().lean();
    const communicationModes = [0, 1, 2];
    if (kycRows.length)
        communicationModes.push(3);
    if (incidentRows.length)
        communicationModes.push(4);
    for (let index = 1; index <= seedVolumes.executiveCommunications; index += 1) {
        const mode = communicationModes[index % communicationModes.length];
        const channel = ['email', 'sms', 'telegram', 'in_app'][index % 4];
        const status = index % 9 === 0 ? 'failed' : index % 6 === 0 ? 'scheduled' : 'sent';
        const sentBy = `leader${(index % 4) + 1}@tikurabay.com`;
        let entityType = 'invoice';
        let entityId = '';
        let entityLabel = '';
        let template = 'payment_reminder';
        let recipient = '';
        let subject = '';
        let message = '';
        let customerName = '';
        let branchName = '';
        let severity = 'medium';
        if (mode === 0) {
            const invoice = invoices[index % invoices.length];
            entityType = 'invoice';
            entityId = String(invoice._id);
            entityLabel = invoice.invoiceCode;
            template = invoice.status === 'paid' ? 'thank_you' : 'payment_reminder';
            customerName = invoice.customerName || `Customer ${index}`;
            recipient = channel === 'email' ? `${slugify(customerName)}@customer.tikurabay.local` : channel === 'sms' ? seedPhoneNumber(index + 600) : channel === 'telegram' ? `@${slugify(customerName).replace(/-/g, '_')}` : `customer:${invoice.customerCode || index}`;
            subject = template === 'thank_you' ? `Payment received for ${invoice.invoiceCode}` : `Payment reminder for ${invoice.invoiceCode}`;
            message = template === 'thank_you'
                ? `Dear ${customerName}, thank you for your payment of ETB ${Math.round(Number(invoice.totalAmount || 0)).toLocaleString('en-US')} for invoice ${invoice.invoiceCode}. Your payment has been received successfully.`
                : `Dear ${customerName}, invoice ${invoice.invoiceCode} for ETB ${Math.round(Number(invoice.outstandingAmount || invoice.totalAmount || 0)).toLocaleString('en-US')} is still awaiting payment. Please complete settlement promptly.`;
            severity = invoice.status === 'overdue' ? 'high' : 'medium';
        }
        else if (mode === 1) {
            const trip = tripRows[index % tripRows.length];
            entityType = 'trip';
            entityId = String(trip._id);
            entityLabel = trip.tripCode;
            template = 'trip_delay_update';
            customerName = trip.customerName || `Customer ${index}`;
            branchName = trip.branchName || '';
            recipient = channel === 'email' ? `${slugify(customerName)}@customer.tikurabay.local` : channel === 'sms' ? seedPhoneNumber(index + 700) : channel === 'telegram' ? `@dispatch_${slugify(branchName || 'ops').replace(/-/g, '_')}` : `trip:${trip.tripCode}`;
            subject = `Trip delay update for ${trip.tripCode}`;
            message = `Dear ${customerName}, trip ${trip.tripCode} on ${trip.routeName || 'the active route'} has a delay that dispatch is currently managing. A revised update will follow shortly.`;
            severity = String(trip.status || '').toLowerCase() === 'delayed' ? 'high' : 'medium';
        }
        else if (mode === 2) {
            const plan = maintenancePlans[index % maintenancePlans.length];
            entityType = 'maintenance_plan';
            entityId = String(plan._id);
            entityLabel = plan.vehicleCode;
            template = 'maintenance_escalation';
            branchName = 'Workshop';
            recipient = channel === 'email' ? `maintenance.${slugify(plan.vehicleCode || 'fleet')}@tikurabay.local` : channel === 'sms' ? seedPhoneNumber(index + 800) : channel === 'telegram' ? '@maintenance_watch' : `vehicle:${plan.vehicleCode || index}`;
            subject = `Maintenance escalation for ${plan.vehicleCode}`;
            message = `Maintenance team, ${plan.vehicleCode || 'the assigned vehicle'} requires attention for ${plan.serviceItemName || 'assignment readiness work'}. Please prioritize clearance.`;
            severity = plan.overdue || plan.blockedAssignment ? 'high' : 'medium';
        }
        else if (mode === 3) {
            const request = kycRows[index % kycRows.length];
            entityType = 'driver_kyc_request';
            entityId = String(request._id);
            entityLabel = request.fullName;
            template = 'driver_document_reminder';
            recipient = channel === 'email' ? `${slugify(request.fullName || 'driver')}@partner.tikurabay.local` : channel === 'sms' ? request.phone || seedPhoneNumber(index + 900) : channel === 'telegram' ? `@${slugify(request.fullName || 'driver').replace(/-/g, '_')}` : `driver-kyc:${request._id}`;
            subject = `Driver document reminder for ${request.fullName || 'driver applicant'}`;
            message = `Dear ${request.fullName || 'driver applicant'}, please complete the required document uploads so your Tikur Abay driver activation can move forward.`;
            severity = 'high';
        }
        else {
            const incident = incidentRows[index % incidentRows.length];
            entityType = 'incident_report';
            entityId = String(incident._id);
            entityLabel = incident.vehicleCode || incident.tripCode;
            template = 'dispatch_action_notice';
            recipient = channel === 'email' ? 'dispatch@tikurabay.local' : channel === 'sms' ? seedPhoneNumber(index + 950) : channel === 'telegram' ? '@dispatch_watch' : `incident:${incident._id}`;
            subject = `Dispatch action notice for ${incident.vehicleCode || incident.tripCode}`;
            message = `Dispatch team, ${incident.vehicleCode || incident.tripCode || 'the active incident'} requires follow-up. Review the current status and coordinate the next action now.`;
            severity = String(incident.severity || 'high').toLowerCase();
        }
        executiveCommunicationWrites.push({
            updateOne: {
                filter: { entityType, entityId, channel, subject, sentBy },
                update: {
                    $set: {
                        entityType,
                        entityId,
                        entityLabel,
                        customerName,
                        branchName,
                        channel,
                        recipient,
                        template,
                        subject,
                        message,
                        status,
                        sentBy,
                        sentAt: status === 'sent' ? dateOffset(-(index % 12), -(index % 8)) : null,
                        scheduledAt: status === 'scheduled' ? dateOffset(index % 2, 17) : null,
                        providerResponse: status === 'failed' ? `${channel} delivery failed for ${recipient}` : status === 'scheduled' ? `${channel} queued for ${recipient}` : `${channel} accepted for ${recipient}`,
                        severity,
                        metadata: { seeded: true },
                    },
                },
                upsert: true,
            },
        });
    }
    await models_1.ExecutiveCommunicationModel.bulkWrite(executiveCommunicationWrites);
    const communicationTemplateWrites = [];
    for (const template of buildSeedCommunicationTemplates()) {
        communicationTemplateWrites.push({
            updateOne: {
                filter: {
                    templateKey: template.templateKey,
                    channel: template.channel,
                    language: template.language,
                },
                update: { $set: template },
                upsert: true,
            },
        });
    }
    await models_1.CommunicationTemplateModel.bulkWrite(communicationTemplateWrites);
    const automationRuleWrites = buildSeedAutomationRules().map((rule) => ({
        updateOne: {
            filter: { triggerType: rule.triggerType, entityType: rule.entityType, channel: rule.channel, templateKey: rule.templateKey },
            update: { $set: rule },
            upsert: true,
        },
    }));
    await models_1.CommunicationAutomationRuleModel.bulkWrite(automationRuleWrites);
    const communicationLogWrites = [];
    for (let index = 1; index <= seedVolumes.communicationLogs; index += 1) {
        const mode = communicationModes[index % communicationModes.length];
        const channel = ['email', 'sms', 'telegram', 'in_app'][index % 4];
        const status = index % 11 === 0 ? 'failed' : index % 7 === 0 ? 'draft' : index % 5 === 0 ? 'scheduled' : 'sent';
        const templateKey = mode === 0 ? (index % 3 === 0 ? 'payment_receipt' : index % 2 === 0 ? 'payment_thank_you' : 'payment_reminder')
            : mode === 1 ? 'trip_delay_update'
                : mode === 2 ? 'maintenance_escalation'
                    : mode === 3 ? 'kyc_reminder'
                        : 'incident_acknowledgement';
        const entity = mode === 0 ? invoices[index % invoices.length]
            : mode === 1 ? tripRows[index % tripRows.length]
                : mode === 2 ? maintenancePlans[index % maintenancePlans.length]
                    : mode === 3 ? kycRows[index % kycRows.length]
                        : incidentRows[index % incidentRows.length];
        const entityType = mode === 0 ? 'invoice'
            : mode === 1 ? 'trip'
                : mode === 2 ? 'maintenance_plan'
                    : mode === 3 ? 'driver_kyc_request'
                        : 'incident_report';
        communicationLogWrites.push({
            updateOne: {
                filter: {
                    communicationLogId: `COM-SEED-${formatNumber(index, 5)}`,
                },
                update: {
                    $set: {
                        communicationLogId: `COM-SEED-${formatNumber(index, 5)}`,
                        entityType,
                        entityId: String(entity._id),
                        recipientType: entityType === 'driver_kyc_request' ? 'driver' : 'customer',
                        recipientName: entity.customerName || entity.fullName || entity.tripCode || entity.invoiceCode || entity.maintenanceCode || 'Seeded recipient',
                        recipientAddress: channel === 'email' ? `ops${index}@tikurabay.local` : channel === 'sms' ? seedPhoneNumber(index + 980) : channel === 'telegram' ? `@ops_${index}` : `seed-user-${index}`,
                        channel,
                        templateKey,
                        recipient: channel === 'email' ? `ops${index}@tikurabay.local` : channel === 'sms' ? seedPhoneNumber(index + 980) : channel === 'telegram' ? `@ops_${index}` : `${entityType}:${entity._id}`,
                        language: index % 3 === 0 ? 'am' : 'en',
                        subject: channel === 'email' ? `${templateKey.replace(/_/g, ' ')} ${index}` : '',
                        messageBody: `Seeded ${templateKey.replace(/_/g, ' ')} message ${index}`,
                        status,
                        sendMode: status === 'draft' ? 'draft' : status === 'scheduled' ? 'scheduled' : 'now',
                        sentByUserId: `manager${(index % 4) + 1}@tikurabay.com`,
                        scheduledFor: status === 'scheduled' ? dateOffset(1, 9) : null,
                        sentAt: status === 'sent' ? dateOffset(-(index % 10), -(index % 8)) : null,
                        failedAt: status === 'failed' ? dateOffset(-(index % 3), -(index % 4)) : null,
                        errorMessage: status === 'failed' ? `${channel} delivery failed for seeded flow` : '',
                        providerMessageId: status === 'failed' ? '' : `${channel}-seed-${index}`,
                        metadata: { seeded: true, language: index % 3 === 0 ? 'am' : 'en' },
                    },
                },
                upsert: true,
            },
        });
    }
    await models_1.CommunicationLogModel.bulkWrite(communicationLogWrites);
    const corridorShipments = await models_1.CorridorShipmentModel.find().lean();
    const corridorTrips = await models_1.CorridorTripAssignmentModel.find().lean();
    const communicationDraftWrites = Array.from({ length: 8 }, (_, index) => ({
        updateOne: {
            filter: { communicationDraftId: `DRAFT-SEED-${formatNumber(index + 1, 3)}` },
            update: {
                $set: {
                    communicationDraftId: `DRAFT-SEED-${formatNumber(index + 1, 3)}`,
                    entityType: index % 2 === 0 ? 'shipment' : 'trip',
                    entityId: index % 2 === 0 ? corridorShipments[index % corridorShipments.length]?.shipmentId : corridorTrips[index % corridorTrips.length]?.tripId,
                    shipmentId: corridorShipments[index % corridorShipments.length]?.shipmentId,
                    tripId: index % 2 === 0 ? null : corridorTrips[index % corridorTrips.length]?.tripId,
                    recipientDraft: { email: `draft${index + 1}@tikurabay.local`, in_app: String(users[index % users.length]?._id || '') },
                    channels: index % 2 === 0 ? ['email', 'in_app'] : ['telegram'],
                    templateKey: index % 2 === 0 ? 'pod_uploaded_notice' : 'trip_delay_update',
                    language: index % 3 === 0 ? 'am' : 'en',
                    subject: `Seeded draft ${index + 1}`,
                    messageBody: `Seeded draft message ${index + 1}`,
                    createdByUserId: String(users[index % users.length]?._id || 'system'),
                },
            },
            upsert: true,
        },
    }));
    await models_1.CommunicationDraftModel.bulkWrite(communicationDraftWrites);
    const communicationScheduleWrites = Array.from({ length: 8 }, (_, index) => ({
        updateOne: {
            filter: { communicationScheduleId: `SCH-SEED-${formatNumber(index + 1, 3)}` },
            update: {
                $set: {
                    communicationScheduleId: `SCH-SEED-${formatNumber(index + 1, 3)}`,
                    communicationLogId: `COM-SEED-${formatNumber(index + 1, 5)}`,
                    communicationDraftId: `DRAFT-SEED-${formatNumber((index % 8) + 1, 3)}`,
                    entityType: index % 2 === 0 ? 'shipment' : 'trip',
                    entityId: index % 2 === 0 ? corridorShipments[index % corridorShipments.length]?.shipmentId : corridorTrips[index % corridorTrips.length]?.tripId,
                    scheduleType: 'send',
                    scheduledFor: dateOffset(1 + (index % 3), 10),
                    status: index % 4 === 0 ? 'failed' : 'scheduled',
                    createdByUserId: String(users[index % users.length]?._id || 'system'),
                },
            },
            upsert: true,
        },
    }));
    await models_1.CommunicationScheduleModel.bulkWrite(communicationScheduleWrites);
    const notificationEventWrites = Array.from({ length: 12 }, (_, index) => ({
        updateOne: {
            filter: { notificationEventId: `EVT-SEED-${formatNumber(index + 1, 3)}` },
            update: {
                $set: {
                    notificationEventId: `EVT-SEED-${formatNumber(index + 1, 3)}`,
                    triggerType: ['invoice_due_soon', 'trip_delayed', 'payment_completed', 'pod_uploaded'][index % 4],
                    entityType: index % 2 === 0 ? 'shipment' : 'trip',
                    entityId: index % 2 === 0 ? corridorShipments[index % corridorShipments.length]?.shipmentId : corridorTrips[index % corridorTrips.length]?.tripId,
                    shipmentId: corridorShipments[index % corridorShipments.length]?.shipmentId,
                    tripId: corridorTrips[index % corridorTrips.length]?.tripId,
                    payload: { seeded: true, bookingNumber: corridorShipments[index % corridorShipments.length]?.bookingNumber },
                    status: index % 3 === 0 ? 'processed' : 'queued',
                    processedAt: index % 3 === 0 ? dateOffset(-(index % 2), -2) : null,
                    createdByUserId: String(users[index % users.length]?._id || 'system'),
                },
            },
            upsert: true,
        },
    }));
    await models_1.NotificationEventModel.bulkWrite(notificationEventWrites);
    const bookingWrites = [];
    for (let index = 1; index <= seedVolumes.bookings; index += 1) {
        const customer = customers[index % customers.length];
        const route = routeCatalog[index % routeCatalog.length];
        const vehicle = vehicles[index % vehicles.length];
        bookingWrites.push({
            updateOne: {
                filter: { bookingCode: `BOOK-${formatNumber(index, 4)}` },
                update: {
                    $set: {
                        bookingCode: `BOOK-${formatNumber(index, 4)}`,
                        customerCode: customer.customerCode,
                        customerName: customer.companyName,
                        route: route.code,
                        cargoType: ['Dry cargo', 'Container', 'Spare parts', 'Construction materials'][index % 4],
                        requestedDate: dateOffset(index % 14),
                        requestedVehicleType: vehicle.type,
                        status: index % 5 === 0 ? 'confirmed' : index % 4 === 0 ? 'quoted' : 'requested',
                        assignedVehicleId: index % 5 === 0 ? vehicle._id : undefined,
                    },
                },
                upsert: true,
            },
        });
    }
    await models_1.BookingModel.bulkWrite(bookingWrites);
    const quoteWrites = [];
    for (let index = 1; index <= seedVolumes.quotes; index += 1) {
        const customer = customers[index % customers.length];
        const route = routeCatalog[index % routeCatalog.length];
        quoteWrites.push({
            updateOne: {
                filter: { quoteCode: `QUO-${formatNumber(index, 4)}` },
                update: {
                    $set: {
                        quoteCode: `QUO-${formatNumber(index, 4)}`,
                        customerCode: customer.customerCode,
                        customerName: customer.companyName,
                        route: route.code,
                        origin: route.origin,
                        destination: route.destination,
                        cargoType: ['Dry cargo', 'Container', 'Agriculture', 'General haulage'][index % 4],
                        requestedVehicleType: ['Prime Mover', 'Trailer Truck', 'Container Carrier'][index % 3],
                        requestedDate: dateOffset(index % 21),
                        quotedAmount: 250000 + (index % 10) * 15000,
                        status: index % 9 === 0 ? 'won' : index % 8 === 0 ? 'lost' : index % 6 === 0 ? 'approved' : index % 5 === 0 ? 'sent' : 'requested',
                    },
                },
                upsert: true,
            },
        });
    }
    await models_1.QuoteModel.bulkWrite(quoteWrites);
    const availabilityWrites = [];
    for (let index = 1; index <= seedVolumes.availabilityReports; index += 1) {
        const driver = drivers[index % drivers.length];
        availabilityWrites.push({
            updateOne: {
                filter: { driverId: driver._id, dateFrom: dateOffset(index % 10) },
                update: {
                    $set: {
                        driverId: driver._id,
                        status: index % 4 === 0 ? 'available_soon' : 'available',
                        dateFrom: dateOffset(index % 10),
                        dateTo: dateOffset((index % 10) + 2),
                        reason: index % 4 === 0 ? 'Trip finishing soon' : 'Open for dispatch',
                    },
                },
                upsert: true,
            },
        });
    }
    await models_1.AvailabilityReportModel.bulkWrite(availabilityWrites);
    const leaveWrites = [];
    for (let index = 1; index <= seedVolumes.leaveRequests; index += 1) {
        const driver = drivers[index % drivers.length];
        leaveWrites.push({
            updateOne: {
                filter: { driverId: driver._id, startDate: dateOffset(index % 18) },
                update: {
                    $set: {
                        driverId: driver._id,
                        type: index % 3 === 0 ? 'vacation' : 'leave',
                        startDate: dateOffset(index % 18),
                        endDate: dateOffset((index % 18) + 3),
                        reason: index % 3 === 0 ? 'Annual leave' : 'Personal request',
                        status: index % 5 === 0 ? 'approved' : 'submitted',
                        approvedBy: index % 5 === 0 ? 'hr@tikurabay.com' : undefined,
                    },
                },
                upsert: true,
            },
        });
    }
    await models_1.LeaveRequestModel.bulkWrite(leaveWrites);
    const employees = await models_1.EmployeeModel.find().lean();
    const employeePerfWrites = [];
    for (let index = 1; index <= seedVolumes.employeePerformanceMetrics; index += 1) {
        const employee = employees[index % employees.length];
        employeePerfWrites.push({
            updateOne: {
                filter: { employeeCode: employee.employeeCode, periodEnd: dateOffset(-(index % 360)) },
                update: {
                    $set: {
                        employeeId: employee._id,
                        employeeCode: employee.employeeCode,
                        name: `Employee ${employee.employeeCode}`,
                        role: employee.role,
                        branchId: employee.branchId,
                        branchName: branchDocs.find((item) => String(item._id) === String(employee.branchId))?.name,
                        department: employee.department,
                        periodStart: dateOffset(-(index % 360) - 30),
                        periodEnd: dateOffset(-(index % 360)),
                        loadsHandled: 40 + (index % 50),
                        tripsHandled: 18 + (index % 24),
                        customersHandled: 10 + (index % 18),
                        agreementsHandled: 4 + (index % 9),
                        paymentsHandled: 3 + (index % 12),
                        issuesResolved: 6 + (index % 10),
                        avgResponseMinutes: 18 + (index % 12),
                        performanceScore: 62 + (index % 33),
                        status: index % 9 === 0 ? 'watch' : 'good',
                    },
                },
                upsert: true,
            },
        });
    }
    await models_1.EmployeePerformanceMetricModel.bulkWrite(employeePerfWrites);
    const driverPerfWrites = [];
    for (let index = 1; index <= seedVolumes.driverPerformanceMetrics; index += 1) {
        const driver = drivers[index % drivers.length];
        const vehicle = vehicles[index % vehicles.length];
        driverPerfWrites.push({
            updateOne: {
                filter: { driverCode: driver.driverCode, periodEnd: dateOffset(-(index % 360)) },
                update: {
                    $set: {
                        driverId: driver._id,
                        driverCode: driver.driverCode,
                        name: `${driver.firstName} ${driver.lastName}`,
                        vehicleId: vehicle._id,
                        vehicleCode: vehicle.vehicleCode,
                        branchId: driver.branchId,
                        branchName: branchDocs.find((item) => String(item._id) === String(driver.branchId))?.name,
                        periodStart: dateOffset(-(index % 360) - 30),
                        periodEnd: dateOffset(-(index % 360)),
                        tripsCompleted: 8 + (index % 16),
                        loadsCompleted: 9 + (index % 15),
                        customersServed: 4 + (index % 12),
                        onTimeDeliveries: 7 + (index % 14),
                        delayedTrips: index % 5,
                        accidentCount: index % 11 === 0 ? 1 : 0,
                        breakdownCount: index % 9 === 0 ? 1 : 0,
                        fuelRequestCount: index % 7,
                        maintenanceReportCount: index % 6,
                        podComplianceRate: 82 + (index % 18),
                        documentComplianceRate: 80 + (index % 20),
                        performanceScore: 58 + (index % 38),
                        status: index % 8 === 0 ? 'watch' : 'good',
                    },
                },
                upsert: true,
            },
        });
    }
    await models_1.DriverPerformanceMetricModel.bulkWrite(driverPerfWrites);
    const notificationWrites = [];
    const notificationUsers = await models_1.UserModel.find().limit(seedVolumes.users).lean();
    for (let index = 1; index <= seedVolumes.notifications; index += 1) {
        const user = notificationUsers[index % notificationUsers.length] ?? notificationUsers[0];
        notificationWrites.push({
            updateOne: {
                filter: { entityId: `notification-${index}` },
                update: {
                    $set: {
                        userId: user?._id,
                        title: index % 5 === 0 ? 'Delayed trip alert' : index % 7 === 0 ? 'Maintenance overdue' : 'Dispatch update',
                        body: `Notification ${index} for operational follow-up.`,
                        message: `Notification ${index} for operational follow-up.`,
                        category: index % 5 === 0 ? 'trip' : index % 7 === 0 ? 'system' : 'shipment',
                        type: index % 5 === 0 ? 'trip_delayed' : index % 7 === 0 ? 'maintenance_due' : 'ops_update',
                        status: index % 4 === 0 ? 'read' : 'unread',
                        isRead: index % 4 === 0,
                        entityType: index % 5 === 0 ? 'trip' : 'shipment',
                        entityId: index % 5 === 0 ? corridorTrips[index % corridorTrips.length]?.tripId : corridorShipments[index % corridorShipments.length]?.shipmentId,
                        shipmentId: corridorShipments[index % corridorShipments.length]?.shipmentId,
                        tripId: corridorTrips[index % corridorTrips.length]?.tripId,
                        actionRoute: index % 5 === 0 ? '/trip' : '/shipments',
                        actionLabel: index % 5 === 0 ? 'Open trip' : 'Open shipment',
                        readAt: index % 4 === 0 ? dateOffset(-(index % 3), -1) : null,
                    },
                },
                upsert: true,
            },
        });
    }
    for (let index = 0; index < notificationWrites.length; index += 1000) {
        await models_1.NotificationModel.bulkWrite(notificationWrites.slice(index, index + 1000));
    }
    const documentWrites = [];
    for (let index = 1; index <= seedVolumes.documents; index += 1) {
        const entityType = ['customer', 'vehicle', 'trip', 'agreement', 'invoice'][index % 5];
        documentWrites.push({
            updateOne: {
                filter: { fileUrl: `https://files.tikurabay.local/demo/${index}.pdf` },
                update: {
                    $set: {
                        entityType,
                        entityId: `${entityType}-${index % 1200}`,
                        category: index % 5 === 0 ? 'proof_of_delivery' : index % 4 === 0 ? 'agreement' : 'trip_document',
                        fileName: `${entityType}-${formatNumber(index, 5)}.pdf`,
                        fileUrl: `https://files.tikurabay.local/demo/${index}.pdf`,
                        approvalStatus: index % 6 === 0 ? 'pending' : 'approved',
                        expiryDate: dateOffset(30 + (index % 240)),
                    },
                },
                upsert: true,
            },
        });
    }
    for (let index = 0; index < documentWrites.length; index += 1000) {
        await models_1.DocumentModel.bulkWrite(documentWrites.slice(index, index + 1000));
    }
    const preferenceWrites = notificationUsers.map((user, index) => ({
        updateOne: {
            filter: { userId: user._id },
            update: {
                $set: {
                    language: index % 5 === 0 ? 'am' : 'en',
                    timezone: 'Africa/Addis_Ababa',
                    notificationPreferences: { email: true, sms: index % 3 === 0, push: true },
                },
            },
            upsert: true,
        },
    }));
    await models_1.UserPreferenceModel.bulkWrite(preferenceWrites);
    const fuelWrites = [];
    for (let index = 1; index <= seedVolumes.uploadedDocuments; index += 1) {
        const trip = trips[index % trips.length];
        const vehicle = vehicles[index % vehicles.length];
        const driver = drivers[index % drivers.length];
        const logDate = index <= 24
            ? dateOffset(0, -((index % 10) + 1))
            : dateOffset(-(index % 90), -(index % 10));
        fuelWrites.push({
            updateOne: {
                filter: { vehicleCode: vehicle.vehicleCode, date: logDate },
                update: {
                    $set: {
                        vehicleId: vehicle._id,
                        vehicleCode: vehicle.vehicleCode,
                        driverId: driver._id,
                        driverName: `${driver.firstName} ${driver.lastName}`,
                        tripId: trip._id,
                        tripCode: trip.tripCode,
                        branchId: vehicle.branchId,
                        date: logDate,
                        odometerKm: Number(vehicle.odometerKm || vehicle.currentOdometerKm || 0) - (index % 2400),
                        liters: 120 + (index % 80),
                        cost: 11500 + (index % 50) * 120,
                        station: ['Tikur Fuel Addis', 'Tikur Fuel Adama', 'Galafi Station', 'Djibouti Depot'][index % 4],
                        receiptUrl: `https://files.tikurabay.local/fuel/${index}.pdf`,
                        notes: 'Fleet fuel log seeded for corridor operations.',
                    },
                },
                upsert: true,
            },
        });
    }
    for (let index = 0; index < fuelWrites.length; index += 400) {
        await models_1.FuelLogModel.bulkWrite(fuelWrites.slice(index, index + 400));
    }
    const serviceHistoryWrites = [];
    for (let index = 1; index <= seedVolumes.vehicleServiceHistory; index += 1) {
        const vehicle = vehicles[index % vehicles.length];
        const isTire = index % 4 === 0;
        serviceHistoryWrites.push({
            updateOne: {
                filter: { vehicleCode: vehicle.vehicleCode, serviceCategory: isTire ? 'tire' : 'service', serviceDate: dateOffset(-(index % 220)) },
                update: {
                    $set: {
                        vehicleId: vehicle._id,
                        vehicleCode: vehicle.vehicleCode,
                        branchId: vehicle.branchId,
                        serviceCategory: isTire ? 'tire' : 'service',
                        serviceType: isTire ? 'Tire change' : ['Brake service', 'Oil service', 'Suspension check'][index % 3],
                        serviceDate: dateOffset(-(index % 220)),
                        odometerKm: Number(vehicle.currentOdometerKm || vehicle.odometerKm || 0) - (index % 9000),
                        vendor: ['Tikur Workshop', 'Addis Fleet Care', 'Adama Heavy Service'][index % 3],
                        notes: isTire ? 'Tire set replaced and balanced.' : 'Preventive fleet service completed.',
                        nextServiceDueDate: dateOffset(10 + (index % 45)),
                        nextServiceDueKm: Number(vehicle.currentOdometerKm || vehicle.odometerKm || 0) + 1500 + (index % 2200),
                        overdue: index % 11 === 0,
                    },
                },
                upsert: true,
            },
        });
    }
    for (let index = 0; index < serviceHistoryWrites.length; index += 400) {
        await models_1.VehicleServiceHistoryModel.bulkWrite(serviceHistoryWrites.slice(index, index + 400));
    }
    const partReplacementWrites = [];
    const partNames = ['Tire Set', 'Brake Pad', 'Air Filter', 'Oil Filter', 'Wheel Bearing', 'Leaf Spring'];
    for (let index = 1; index <= seedVolumes.partReplacements; index += 1) {
        const vehicle = vehicles[index % vehicles.length];
        const partName = partNames[index % partNames.length];
        partReplacementWrites.push({
            updateOne: {
                filter: { vehicleCode: vehicle.vehicleCode, partName, replacementDate: dateOffset(-(index % 180)) },
                update: {
                    $set: {
                        vehicleId: vehicle._id,
                        vehicleCode: vehicle.vehicleCode,
                        branchId: vehicle.branchId,
                        partName,
                        partCategory: partName.toLowerCase().includes('tire') ? 'tire' : 'service_part',
                        replacementDate: dateOffset(-(index % 180)),
                        replacementKm: Number(vehicle.currentOdometerKm || vehicle.odometerKm || 0) - (index % 7000),
                        vendor: ['Tikur Workshop', 'Dire Parts Depot', 'Kombolcha Parts Market'][index % 3],
                        cost: 9500 + (index % 8) * 1350,
                        notes: `${partName} replaced during scheduled fleet maintenance.`,
                    },
                },
                upsert: true,
            },
        });
    }
    for (let index = 0; index < partReplacementWrites.length; index += 400) {
        await models_1.PartReplacementModel.bulkWrite(partReplacementWrites.slice(index, index + 400));
    }
    const rentalPartnerNames = [
        'Abay Rental Logistics',
        'Sheger Fleet Partners',
        'Lucy Transit Rental',
        'Tana Corridor Transport',
        'Semien Heavy Haul',
        'Dire Express Rental',
        'Meskerem Fleet Services',
        'Kokeb Transport Partners',
        'Selam Cargo Rental',
        'Walia Route Support',
    ];
    const rentalPartnerWrites = [];
    for (let index = 1; index <= seedVolumes.rentalPartners; index += 1) {
        const branch = branchDocs[index % branchDocs.length];
        const contact = seededPersonName(index + 80);
        rentalPartnerWrites.push({
            updateOne: {
                filter: { partnerName: rentalPartnerNames[index - 1] },
                update: {
                    $set: {
                        partnerName: rentalPartnerNames[index - 1],
                        contactName: `${contact.firstName} ${contact.lastName}`,
                        phone: `+251944${formatNumber(index, 6)}`,
                        branchId: branch._id,
                        status: 'active',
                        responseMinutes: 18 + (index % 6) * 8,
                        averageRentalCost: 68000 + index * 4200,
                        fleetType: index % 2 === 0 ? 'Trailer truck' : 'Prime mover',
                    },
                },
                upsert: true,
            },
        });
    }
    await models_1.RentalPartnerModel.bulkWrite(rentalPartnerWrites);
    const rentalPartners = await models_1.RentalPartnerModel.find().lean();
    const rentalPartnerTripWrites = [];
    for (let index = 1; index <= seedVolumes.rentalPartnerTrips; index += 1) {
        const partner = rentalPartners[index % rentalPartners.length];
        const trip = trips[index % trips.length];
        const driverName = `${seededPersonName(index + 140).firstName} ${seededPersonName(index + 140).lastName}`;
        const route = routeCatalog.find((item) => item.code === trip.routeName) ?? routeCatalog[0];
        const point = route.points[index % route.points.length];
        const status = index % 6 === 0 ? 'in_progress' : index % 5 === 0 ? 'assigned' : index % 4 === 0 ? 'cancelled' : 'completed';
        rentalPartnerTripWrites.push({
            updateOne: {
                filter: { partnerName: partner.partnerName, tripCode: trip.tripCode },
                update: {
                    $set: {
                        partnerId: partner._id,
                        partnerName: partner.partnerName,
                        tripId: trip._id,
                        tripCode: trip.tripCode,
                        vehicleCode: `EXT-${formatNumber(index, 4)}`,
                        externalDriverName: driverName,
                        externalDriverPhone: `+251933${formatNumber(index, 6)}`,
                        currentLocationLabel: point.geofence,
                        branchId: trip.branchId,
                        assignedAt: dateOffset(-(index % 120)),
                        completedAt: index % 4 === 0 ? null : dateOffset(-(index % 120) + 1),
                        status,
                        onTime: !['cancelled', 'in_progress'].includes(status) && index % 6 !== 0,
                        delayed: index % 6 === 0 || status === 'in_progress',
                        cancelled: index % 4 === 0,
                        incidentCount: index % 9 === 0 ? 1 : 0,
                        responseMinutes: Number(partner.responseMinutes ?? 30) + (index % 4) * 3,
                        rentalCost: Number(partner.averageRentalCost ?? 70000) + (index % 7) * 1800,
                    },
                },
                upsert: true,
            },
        });
    }
    for (let index = 0; index < rentalPartnerTripWrites.length; index += 300) {
        await models_1.RentalPartnerTripModel.bulkWrite(rentalPartnerTripWrites.slice(index, index + 300));
    }
    const incidentWrites = [];
    const incidentTypes = ['accident_report', 'breakdown_report', 'delay_report', 'obstacle_report', 'tire_issue'];
    for (let index = 1; index <= seedVolumes.incidentReports; index += 1) {
        const trip = trips[index % trips.length];
        const vehicle = vehicles[index % vehicles.length];
        const driver = drivers[index % drivers.length];
        incidentWrites.push({
            updateOne: {
                filter: { tripCode: trip.tripCode, type: `${incidentTypes[index % incidentTypes.length]}-${index}` },
                update: {
                    $set: {
                        type: incidentTypes[index % incidentTypes.length],
                        vehicleId: vehicle._id,
                        vehicleCode: vehicle.vehicleCode,
                        driverId: driver._id,
                        driverName: `${driver.firstName} ${driver.lastName}`,
                        tripId: trip._id,
                        tripCode: trip.tripCode,
                        severity: ['low', 'medium', 'high', 'critical'][index % 4],
                        location: routeCatalog[index % routeCatalog.length].points[index % routeCatalog[index % routeCatalog.length].points.length],
                        description: `${vehicle.vehicleCode} incident reported during ${trip.tripCode}.`,
                        attachments: [`https://files.tikurabay.local/incidents/${index}.jpg`],
                        status: index % 5 === 0 ? 'under_review' : 'reported',
                    },
                },
                upsert: true,
            },
        });
    }
    for (let index = 0; index < incidentWrites.length; index += 300) {
        await models_1.IncidentReportModel.bulkWrite(incidentWrites.slice(index, index + 300));
    }
    const activityWrites = [];
    const activityTypes = ['loading_started', 'loading_completed', 'checkpoint_update', 'border_crossed', 'fuel_log', 'accident_report', 'pod_uploaded', 'document_uploaded'];
    for (let index = 1; index <= seedVolumes.activityLogs; index += 1) {
        const trip = trips[index % trips.length];
        const vehicle = vehicles[index % vehicles.length];
        const driver = drivers[index % drivers.length];
        activityWrites.push({
            updateOne: {
                filter: { entityId: `activity-${index}` },
                update: {
                    $set: {
                        entityType: 'trip',
                        entityId: `activity-${index}`,
                        tripId: trip._id,
                        vehicleId: vehicle._id,
                        driverId: driver._id,
                        userId: driver.userId,
                        activityType: activityTypes[index % activityTypes.length],
                        title: `${driver.driverCode} ${activityTypes[index % activityTypes.length].replace(/_/g, ' ')}`,
                        description: `${vehicle.vehicleCode} updated activity on ${trip.tripCode}.`,
                        metadata: { tripCode: trip.tripCode, vehicleCode: vehicle.vehicleCode },
                        createdAt: dateOffset(-(index % 60), -(index % 10)),
                    },
                },
                upsert: true,
            },
        });
    }
    for (let index = 0; index < activityWrites.length; index += 500) {
        await models_1.ActivityLogModel.bulkWrite(activityWrites.slice(index, index + 500));
    }
    const uploadedDocumentWrites = [];
    for (let index = 1; index <= seedVolumes.uploadedDocuments; index += 1) {
        const trip = trips[index % trips.length];
        uploadedDocumentWrites.push({
            updateOne: {
                filter: { fileUrl: `https://files.tikurabay.local/uploaded/${index}.pdf` },
                update: {
                    $set: {
                        entityType: 'trip',
                        entityId: String(trip._id),
                        tripId: trip._id,
                        vehicleId: trip.vehicleId,
                        driverId: trip.driverId,
                        documentType: ['fuel_receipt', 'loading_photo', 'offloading_photo', 'proof_of_delivery', 'trip_manifest'][index % 5],
                        fileName: `uploaded-${formatNumber(index, 5)}.pdf`,
                        fileUrl: `https://files.tikurabay.local/uploaded/${index}.pdf`,
                        uploadedBy: trip.driverName,
                        status: 'uploaded',
                    },
                },
                upsert: true,
            },
        });
    }
    for (let index = 0; index < uploadedDocumentWrites.length; index += 400) {
        await models_1.UploadedDocumentModel.bulkWrite(uploadedDocumentWrites.slice(index, index + 400));
    }
    const collectionTaskWrites = [];
    for (let index = 1; index <= seedVolumes.collectionTasks; index += 1) {
        const invoice = invoices[index % invoices.length];
        collectionTaskWrites.push({
            updateOne: {
                filter: { taskCode: `COL-${formatNumber(index, 5)}` },
                update: {
                    $set: {
                        taskCode: `COL-${formatNumber(index, 5)}`,
                        invoiceId: invoice._id,
                        customerId: invoice.customerId,
                        customerName: invoice.customerName,
                        assignedOwner: ['finance_officer', 'finance_manager', 'director', 'ceo'][index % 4],
                        escalationLevel: ['finance_officer', 'manager', 'director', 'ceo'][index % 4],
                        reminderCount: index % 6,
                        lastFollowUpAt: dateOffset(-(index % 18)),
                        balance: invoice.outstandingAmount,
                        status: index % 5 === 0 ? 'escalated' : 'open',
                        dueDate: invoice.dueDate,
                    },
                },
                upsert: true,
            },
        });
    }
    await models_1.CollectionTaskModel.bulkWrite(collectionTaskWrites);
    const collectionTasks = await models_1.CollectionTaskModel.find().lean();
    const escalationWrites = [];
    for (let index = 1; index <= seedVolumes.escalationLogs; index += 1) {
        const task = collectionTasks[index % collectionTasks.length];
        escalationWrites.push({
            updateOne: {
                filter: { collectionTaskId: task._id, actedAt: dateOffset(-(index % 30)) },
                update: {
                    $set: {
                        invoiceId: task.invoiceId,
                        collectionTaskId: task._id,
                        fromLevel: ['finance_officer', 'manager', 'director'][index % 3],
                        toLevel: ['manager', 'director', 'ceo'][index % 3],
                        action: 'escalated',
                        note: 'Automatic escalation for overdue balance.',
                        actedBy: ['finance_officer', 'finance_manager', 'director'][index % 3],
                        actedAt: dateOffset(-(index % 30)),
                    },
                },
                upsert: true,
            },
        });
    }
    await models_1.EscalationLogModel.bulkWrite(escalationWrites);
    const leadWrites = [];
    for (let index = 1; index <= seedVolumes.leads; index += 1) {
        const customer = customers[index % customers.length];
        leadWrites.push({
            updateOne: {
                filter: { leadCode: `LEAD-${formatNumber(index, 5)}` },
                update: {
                    $set: {
                        leadCode: `LEAD-${formatNumber(index, 5)}`,
                        customerId: customer._id,
                        companyName: customer.companyName,
                        contactPerson: `Contact ${index}`,
                        phone: `+251900${formatNumber(index, 6)}`,
                        branchId: customer.branchId,
                        routeInterest: routeCatalog[index % routeCatalog.length].code,
                        source: 'marketing',
                        status: ['new', 'qualified', 'quoted', 'onboarding', 'won', 'lost'][index % 6],
                        assignedTo: 'marketing_officer',
                        notes: index % 4 === 0 ? 'Needs price refresh before final follow-up.' : 'Commercial lead seeded for workspace pipeline.',
                    },
                },
                upsert: true,
            },
        });
    }
    await models_1.LeadModel.bulkWrite(leadWrites);
    const onboardingWrites = [];
    for (let index = 1; index <= seedVolumes.onboardingTasks; index += 1) {
        const customer = customers[index % customers.length];
        onboardingWrites.push({
            updateOne: {
                filter: { taskCode: `ONB-${formatNumber(index, 5)}` },
                update: {
                    $set: {
                        taskCode: `ONB-${formatNumber(index, 5)}`,
                        customerId: customer._id,
                        branchId: customer.branchId,
                        title: ['TIN verification', 'Trade license upload', 'Agreement review', 'VAT validation'][index % 4],
                        category: 'customer_onboarding',
                        status: ['pending', 'in_progress', 'completed'][index % 3],
                        dueAt: dateOffset(index % 7),
                        assignedTo: 'marketing_officer',
                    },
                },
                upsert: true,
            },
        });
    }
    await models_1.OnboardingTaskModel.bulkWrite(onboardingWrites);
    const outboundWrites = [];
    for (let index = 1; index <= seedVolumes.outboundNotifications; index += 1) {
        const customer = customers[index % customers.length];
        outboundWrites.push({
            updateOne: {
                filter: { notificationCode: `OUT-${formatNumber(index, 5)}` },
                update: {
                    $set: {
                        notificationCode: `OUT-${formatNumber(index, 5)}`,
                        customerId: customer._id,
                        branchId: customer.branchId,
                        channel: ['sms', 'email', 'in_app'][index % 3],
                        type: ['vehicle_available', 'quote_ready', 'document_missing', 'agreement_update'][index % 4],
                        message: `Commercial update ${index} for ${customer.companyName}.`,
                        status: index % 5 === 0 ? 'sent' : 'queued',
                        sentAt: dateOffset(-(index % 10)),
                    },
                },
                upsert: true,
            },
        });
    }
    await models_1.OutboundNotificationModel.bulkWrite(outboundWrites);
    const requisitionWrites = [];
    for (let index = 1; index <= seedVolumes.jobRequisitions; index += 1) {
        requisitionWrites.push({
            updateOne: {
                filter: { requisitionCode: `REQ-${formatNumber(index, 4)}` },
                update: {
                    $set: {
                        requisitionCode: `REQ-${formatNumber(index, 4)}`,
                        department: ['Operations', 'Maintenance', 'Finance', 'HR', 'Marketing'][index % 5],
                        role: ['Driver', 'Dispatcher', 'Mechanic', 'Collector', 'HR Officer'][index % 5],
                        branchId: branchDocs[index % branchDocs.length]._id,
                        requestedBy: 'branch_manager',
                        status: ['open', 'approved', 'in_progress'][index % 3],
                        openings: 1 + (index % 4),
                        targetHireDate: dateOffset(15 + (index % 30)),
                    },
                },
                upsert: true,
            },
        });
    }
    await models_1.JobRequisitionModel.bulkWrite(requisitionWrites);
    const requisitions = await models_1.JobRequisitionModel.find().lean();
    const candidateWrites = [];
    for (let index = 1; index <= seedVolumes.candidates; index += 1) {
        const requisition = requisitions[index % requisitions.length];
        candidateWrites.push({
            updateOne: {
                filter: { candidateCode: `CAN-${formatNumber(index, 5)}` },
                update: {
                    $set: {
                        candidateCode: `CAN-${formatNumber(index, 5)}`,
                        requisitionId: requisition._id,
                        firstName: `Candidate${index}`,
                        lastName: 'Demo',
                        phone: `+251933${formatNumber(index, 6)}`,
                        branchId: requisition.branchId,
                        appliedRole: requisition.role,
                        stage: ['applied', 'screening', 'interview', 'offer', 'hired'][index % 5],
                        status: 'active',
                        score: 60 + (index % 35),
                    },
                },
                upsert: true,
            },
        });
    }
    await models_1.CandidateModel.bulkWrite(candidateWrites);
    const onboardingHrWrites = [];
    for (let index = 1; index <= seedVolumes.onboardingTasksHr; index += 1) {
        const employee = employees[index % employees.length];
        onboardingHrWrites.push({
            updateOne: {
                filter: { taskCode: `HRO-${formatNumber(index, 5)}` },
                update: {
                    $set: {
                        taskCode: `HRO-${formatNumber(index, 5)}`,
                        employeeId: employee._id,
                        title: ['Badge issued', 'Contract signed', 'Policy briefing', 'System access'][index % 4],
                        status: ['pending', 'completed'][index % 2],
                        dueAt: dateOffset(index % 12),
                        assignedTo: 'hr_officer',
                    },
                },
                upsert: true,
            },
        });
    }
    await models_1.OnboardingTaskHrModel.bulkWrite(onboardingHrWrites);
    const trainingWrites = [];
    for (let index = 1; index <= seedVolumes.trainingRecords; index += 1) {
        const driver = drivers[index % drivers.length];
        trainingWrites.push({
            updateOne: {
                filter: { driverId: driver._id, trainingTitle: `Training-${index}` },
                update: {
                    $set: {
                        driverId: driver._id,
                        trainingTitle: ['Driver Safety', 'Border Clearance Basics', 'Fuel Discipline', 'Incident Response'][index % 4],
                        provider: 'Tikur Abay Academy',
                        completedAt: dateOffset(-(index % 180)),
                        expiryDate: dateOffset(180 + (index % 180)),
                        status: 'completed',
                    },
                },
                upsert: true,
            },
        });
    }
    await models_1.TrainingRecordModel.bulkWrite(trainingWrites);
    const drivingSchoolStudentWrites = [];
    const schoolStatuses = [
        'registered',
        'documents_pending',
        'enrolled',
        'training_in_progress',
        'exam_pending',
        'exam_passed',
        'exam_failed',
        'dl_processing',
        'dl_obtained',
        'inactive',
    ];
    for (let index = 1; index <= seedVolumes.drivingSchoolStudents; index += 1) {
        const name = seededPersonName(index + 200);
        const branch = branchDocs[index % branchDocs.length];
        const status = schoolStatuses[index % schoolStatuses.length];
        const totalFee = 18000 + (index % 8) * 1500;
        const paidAmount = status === 'registered' ? 3000 : status === 'documents_pending' ? 5000 : totalFee - ((index % 3) * 1500);
        drivingSchoolStudentWrites.push({
            updateOne: {
                filter: { studentCode: `DS-${formatNumber(index, 5)}` },
                update: {
                    $set: {
                        studentCode: `DS-${formatNumber(index, 5)}`,
                        fullName: `${name.firstName} ${name.lastName}`,
                        phone: seedPhoneNumber(index + 400),
                        branchId: branch._id,
                        status,
                        registrationDate: dateOffset(-(index % 90)),
                        enrolledAt: dateOffset(-(index % 75)),
                        trainingProgressPercent: status === 'registered' ? 0 : Math.min(100, 20 + (index % 9) * 10),
                        completedTheoryLessons: index % 14,
                        completedPracticalLessons: index % 18,
                        nextLessonAt: status === 'dl_obtained' || status === 'inactive' ? null : dateOffset(index % 6),
                        theoryExamStatus: ['pending', 'passed', 'failed'][index % 3],
                        roadExamStatus: ['pending', 'passed', 'failed'][index % 3],
                        examScheduledAt: ['exam_pending', 'training_in_progress'].includes(status) ? dateOffset(index % 10) : null,
                        dlFollowUpStatus: status === 'dl_processing' ? 'processing' : status === 'dl_obtained' ? 'obtained' : 'pending',
                        dlIssuedAt: status === 'dl_obtained' ? dateOffset(-(index % 20)) : null,
                        totalFee,
                        paidAmount,
                        documentsPending: ['documents_pending', 'registered'].includes(status),
                    },
                },
                upsert: true,
            },
        });
    }
    await models_1.DrivingSchoolStudentModel.bulkWrite(drivingSchoolStudentWrites);
    const drivingSchoolStudents = await models_1.DrivingSchoolStudentModel.find().lean();
    const drivingSchoolPaymentWrites = [];
    for (let index = 1; index <= seedVolumes.drivingSchoolPayments; index += 1) {
        const student = drivingSchoolStudents[index % drivingSchoolStudents.length];
        drivingSchoolPaymentWrites.push({
            updateOne: {
                filter: { paymentCode: `DSP-${formatNumber(index, 5)}` },
                update: {
                    $set: {
                        paymentCode: `DSP-${formatNumber(index, 5)}`,
                        studentId: student._id,
                        studentCode: student.studentCode,
                        branchId: student.branchId,
                        amount: 2500 + (index % 5) * 1000,
                        status: index % 6 === 0 ? 'pending' : 'paid',
                        paidAt: dateOffset(-(index % 45)),
                        method: ['cash', 'bank_transfer', 'telebirr'][index % 3],
                        note: 'Driving school installment payment',
                    },
                },
                upsert: true,
            },
        });
    }
    await models_1.DrivingSchoolPaymentModel.bulkWrite(drivingSchoolPaymentWrites);
    const corridorSeedSummary = await seedCorridorData();
    return {
        branches: 6,
        roles: 10,
        users: seedVolumes.users,
        employees: seedVolumes.employees,
        drivers: seedVolumes.drivers,
        vehicles: seedVolumes.vehicles,
        customers: seedVolumes.customers,
        trips: seedVolumes.trips,
        tripEvents: trips.length * 5,
        gpsPoints: trips.length * seedVolumes.tripGpsPointsPerTrip,
        maintenancePlans: seedVolumes.maintenancePlans,
        maintenanceRecords: seedVolumes.maintenanceRecords,
        driverReports: seedVolumes.driverReports,
        agreements: seedVolumes.agreements,
        invoices: seedVolumes.invoices,
        payments: seedVolumes.payments,
        paymentCommunications: seedVolumes.paymentCommunications,
        executiveCommunications: seedVolumes.executiveCommunications,
        communicationLogs: seedVolumes.communicationLogs,
        communicationDrafts: communicationDraftWrites.length,
        communicationSchedules: communicationScheduleWrites.length,
        communicationTemplates: seedVolumes.communicationTemplates,
        communicationAutomationRules: seedVolumes.communicationAutomationRules,
        notificationEvents: notificationEventWrites.length,
        notifications: seedVolumes.notifications,
        documents: seedVolumes.documents,
        userPreferences: notificationUsers.length,
        fuelLogs: seedVolumes.fuelLogs,
        vehicleServiceHistory: seedVolumes.vehicleServiceHistory,
        partReplacements: seedVolumes.partReplacements,
        rentalPartners: seedVolumes.rentalPartners,
        rentalPartnerTrips: seedVolumes.rentalPartnerTrips,
        incidentReports: seedVolumes.incidentReports,
        activityLogs: seedVolumes.activityLogs,
        uploadedDocuments: seedVolumes.uploadedDocuments,
        customerProfiles: customerUsers.length,
        driverProfiles: drivers.length,
        driverKycRequests: drivers.length,
        bookings: seedVolumes.bookings,
        quotes: seedVolumes.quotes,
        agreementSignatures: agreementSignatureWrites.length,
        availabilityReports: seedVolumes.availabilityReports,
        leaveRequests: seedVolumes.leaveRequests,
        collectionTasks: seedVolumes.collectionTasks,
        escalationLogs: seedVolumes.escalationLogs,
        leads: seedVolumes.leads,
        onboardingTasks: seedVolumes.onboardingTasks,
        outboundNotifications: seedVolumes.outboundNotifications,
        jobRequisitions: seedVolumes.jobRequisitions,
        candidates: seedVolumes.candidates,
        onboardingTasksHr: seedVolumes.onboardingTasksHr,
        trainingRecords: seedVolumes.trainingRecords,
        drivingSchoolStudents: seedVolumes.drivingSchoolStudents,
        drivingSchoolPayments: seedVolumes.drivingSchoolPayments,
        employeePerformanceMetrics: seedVolumes.employeePerformanceMetrics,
        driverPerformanceMetrics: seedVolumes.driverPerformanceMetrics,
        aiInsightTriggers: 8,
        corridorShipments: corridorSeedSummary.shipments,
        corridorCargoItems: corridorSeedSummary.cargoItems,
        corridorDocuments: corridorSeedSummary.documents,
        corridorContainers: corridorSeedSummary.containers,
        corridorTrips: corridorSeedSummary.trips,
        corridorMilestones: corridorSeedSummary.milestones,
        corridorExceptions: corridorSeedSummary.exceptions,
        corridorEmptyReturns: corridorSeedSummary.emptyReturns,
    };
}
async function seedCorridorData() {
    const [customers, customerProfiles, drivers, driverProfiles, vehicles, invoices, payments, supportRooms] = await Promise.all([
        models_1.CustomerModel.find().sort({ createdAt: 1 }).limit(12).lean(),
        models_1.CustomerProfileModel.find().sort({ createdAt: 1 }).limit(12).lean(),
        models_1.DriverModel.find().sort({ createdAt: 1 }).limit(16).lean(),
        models_1.DriverProfileModel.find().sort({ createdAt: 1 }).limit(16).lean(),
        models_1.VehicleModel.find().sort({ createdAt: 1 }).limit(16).lean(),
        models_1.InvoiceModel.find().sort({ createdAt: -1 }).limit(24).lean(),
        models_1.PaymentModel.find().sort({ createdAt: -1 }).limit(24).lean(),
        models_1.ChatRoomModel.find().sort({ createdAt: -1 }).limit(12).lean(),
    ]);
    const destinations = ['Adama Dry Port', 'Combolcha Dry Port'];
    const dryPorts = ['Adama', 'Combolcha'];
    const routes = [
        'Shenzhen -> Dubai Port -> Djibouti -> Adama Dry Port',
        'Ningbo -> Dubai Port -> Djibouti -> Combolcha Dry Port',
        'Shanghai -> Dubai Port -> Djibouti -> Adama Dry Port',
        'Guangzhou -> Dubai Port -> Djibouti -> Combolcha Dry Port',
    ];
    const vessels = ['MV Red Sea Bridge', 'MV Djibouti Corridor', 'MV Blue Nile Express', 'MV Horn Gateway'];
    const serviceTypes = ['multimodal', 'unimodal'];
    const priorities = ['normal', 'high', 'urgent'];
    const shipmentStages = ['origin_preparation', 'ocean_in_transit', 'djibouti_release', 'inland_dispatch', 'yard_processing', 'empty_return'];
    const shipmentWrites = [];
    const accessWrites = [];
    const cargoItemWrites = [];
    const documentWrites = [];
    const containerWrites = [];
    const tripWrites = [];
    const milestoneWrites = [];
    const exceptionWrites = [];
    const emptyReturnWrites = [];
    const checkpointWrites = [];
    for (let index = 0; index < 10; index += 1) {
        const customer = customers[index % customers.length];
        const profile = customerProfiles.find((item) => String(item.customerId) === String(customer._id)) ?? customerProfiles[index % customerProfiles.length];
        const driver = drivers[index % drivers.length];
        const driverProfile = driverProfiles.find((item) => String(item.userId) === String(driver.userId)) ?? driverProfiles[index % driverProfiles.length];
        const vehicle = vehicles[index % vehicles.length];
        const invoice = invoices[index % invoices.length];
        const payment = payments[index % payments.length];
        const shipmentId = `SHP-2603-${formatNumber(index + 1, 4)}`;
        const bookingNumber = `TAB-IMP-2603-${formatNumber(index + 1, 3)}`;
        const shipmentRef = bookingNumber;
        const containerId = `${shipmentId}-CONT-01`;
        const containerNumber = `MSKU${formatNumber(482100 + index * 37, 6)}${(index % 9) + 1}`;
        const sealNumber = `SEAL-${formatNumber(610200 + index * 14, 6)}`;
        const tripId = `${shipmentId}-TRIP-01`;
        const transitRef = `TRN-DJB-${formatNumber(index + 1, 5)}`;
        const releaseRef = `REL-DJB-${formatNumber(index + 1, 5)}`;
        const stage = shipmentStages[index % shipmentStages.length];
        const currentOwnerRole = stage === 'origin_preparation'
            ? 'supplier_agent'
            : stage === 'ocean_in_transit'
                ? 'supplier_agent'
                : stage === 'djibouti_release'
                    ? 'djibouti_release_agent'
                    : stage === 'inland_dispatch'
                        ? 'corridor_dispatch_agent'
                        : 'dry_port_yard_agent';
        const supplierName = ['Shenzhen East Port Trading Co.', 'Ningbo Horizon Industrial Supply Ltd.', 'Shanghai Atlas Manufacturing', 'Guangzhou Trans-Asia Exporters'][index % 4];
        const destination = destinations[index % destinations.length];
        const dryPortNode = dryPorts[index % dryPorts.length];
        const customerCity = String(profile?.city || customer?.city || dryPortNode);
        const finalDeliveryLocation = `${customerCity} Customer Delivery`;
        const route = routes[index % routes.length];
        const etd = dateOffset(-(12 - index), 3);
        const etaDjibouti = dateOffset(-(4 - (index % 3)), 8);
        const currentStatus = stage === 'empty_return' ? 'closing' : stage === 'yard_processing' ? 'processing' : 'active';
        shipmentWrites.push({
            updateOne: {
                filter: { shipmentId },
                update: {
                    $set: {
                        shipmentId,
                        bookingNumber,
                        shipmentRef,
                        customerId: customer.customerCode,
                        customerName: customer.companyName,
                        consigneeName: profile.contactPerson || `${customer.companyName} Import Desk`,
                        supplierName,
                        supplierAgentId: `SUP-AG-${formatNumber((index % 4) + 1, 3)}`,
                        serviceMode: serviceTypes[index % serviceTypes.length],
                        serviceType: serviceTypes[index % serviceTypes.length],
                        incoterm: ['CIF', 'FOB', 'DAP'][index % 3],
                        commoditySummary: ['Industrial chemicals', 'Consumer electronics', 'Solar equipment', 'Spare parts'][index % 4],
                        currentStage: stage,
                        currentOwnerRole,
                        currentOwnerUserId: String(driver.userId),
                        shipmentStatus: currentStatus,
                        status: currentStatus,
                        priority: priorities[index % priorities.length],
                        supplierLocation: ['Shenzhen', 'Ningbo', 'Shanghai', 'Guangzhou'][index % 4],
                        shippingLine: ['Maersk', 'CMA CGM', 'MSC', 'PIL'][index % 4],
                        carrierName: ['Maersk', 'CMA CGM', 'MSC', 'PIL'][index % 4],
                        originCountry: 'China',
                        originPort: ['Yantian', 'Ningbo', 'Shanghai', 'Nansha'][index % 4],
                        portOfLoading: ['Yantian', 'Ningbo', 'Shanghai', 'Nansha'][index % 4],
                        dischargePort: 'Djibouti',
                        portOfDischarge: 'Djibouti',
                        destinationCountry: 'Ethiopia',
                        destinationNode: destination,
                        inlandDestination: destination,
                        dryPortNode,
                        finalDeliveryLocation,
                        corridorRoute: route,
                        vesselName: vessels[index % vessels.length],
                        voyageNumber: `VY${260 + index}`,
                        etd,
                        etaDjibouti,
                        billOfLadingNumber: `BLDJB${formatNumber(92000 + index, 6)}`,
                        masterBillOfLadingNumber: `MBL${formatNumber(85000 + index, 6)}`,
                        houseBillOfLadingNumber: `HBL${formatNumber(87000 + index, 6)}`,
                        containerIds: [containerId],
                        activeContainerCount: 1,
                        sealNumbers: [sealNumber],
                        containerTypeSummary: index % 3 === 0 ? '40HC' : '20GP',
                        invoiceStatus: 'approved',
                        packingListStatus: 'approved',
                        blStatus: 'approved',
                        customsDocStatus: stage === 'origin_preparation' ? 'missing' : 'approved',
                        transitDocStatus: ['djibouti_release', 'inland_dispatch', 'yard_processing', 'empty_return'].includes(stage) ? 'approved' : 'missing',
                        releaseNoteStatus: ['inland_dispatch', 'yard_processing', 'empty_return'].includes(stage) ? 'approved' : 'uploaded',
                        podStatus: ['yard_processing', 'empty_return'].includes(stage) ? 'uploaded' : 'missing',
                        customerConfirmationStatus: stage === 'empty_return' ? (index % 2 === 0 ? 'confirmed' : 'pending') : stage === 'yard_processing' ? 'awaiting_customer' : 'pending',
                        customerConfirmedAt: stage === 'empty_return' && index % 2 === 0 ? dateOffset(0, 9) : undefined,
                        customerConfirmedBy: stage === 'empty_return' && index % 2 === 0 ? (profile.contactPerson || `${customer.companyName} Receiving`) : undefined,
                        customerConfirmationNote: stage === 'empty_return' && index % 2 === 0 ? 'Goods received and accepted by customer contact.' : stage === 'yard_processing' ? 'Awaiting customer receipt confirmation after unload.' : '',
                        shortageStatus: stage === 'empty_return' && index % 4 === 1 ? 'reported' : 'clear',
                        damageStatus: stage === 'empty_return' && index % 5 === 2 ? 'reported' : 'clear',
                        closureBlockedReason: stage === 'empty_return' && index % 4 === 1
                            ? 'Shortage review still open before shipment closure.'
                            : stage === 'empty_return' && index % 5 === 2
                                ? 'Damage review still open before shipment closure.'
                                : '',
                        emptyReturnOpen: !(stage === 'empty_return' && index % 2 === 0),
                        returnReceiptStatus: stage === 'empty_return' && index % 2 === 0 ? 'approved' : 'missing',
                        originReady: stage !== 'origin_preparation',
                        djiboutiReleaseReady: ['inland_dispatch', 'yard_processing', 'empty_return'].includes(stage),
                        dispatchReady: ['inland_dispatch', 'yard_processing', 'empty_return'].includes(stage),
                        inlandArrivalReady: ['yard_processing', 'empty_return'].includes(stage),
                        yardClosureReady: stage === 'empty_return',
                        emptyReturnClosed: stage === 'empty_return' && index % 2 === 0,
                        invoiceIds: invoice ? [invoice.invoiceCode] : [],
                        totalChargeAmount: Number(invoice?.totalAmount || 1450000 + index * 25000),
                        paymentStatus: payment?.status === 'paid' ? 'paid' : index % 4 === 0 ? 'overdue' : 'pending',
                        taxDutyStatus: ['djibouti_release', 'inland_dispatch', 'yard_processing', 'empty_return'].includes(stage) ? 'cleared' : 'pending',
                        financeBlockReason: index % 4 === 0 ? 'Outstanding customs handling balance' : '',
                        hasExceptions: index % 3 === 0,
                        activeExceptionCount: index % 3 === 0 ? 1 : 0,
                        latestExceptionSummary: index % 3 === 0 ? 'Transit packet follow-up required' : '',
                        riskLevel: index % 4 === 0 ? 'high' : index % 3 === 0 ? 'medium' : 'normal',
                        container: {
                            containerId,
                            containerNumber,
                            sealNumber,
                            containerType: index % 3 === 0 ? '40HC' : '20GP',
                            currentLocation: stage === 'inland_dispatch' ? 'Galafi corridor checkpoint' : stage === 'yard_processing' ? destination : 'Djibouti Port',
                            currentEta: dateOffset(index % 3, 6).toISOString(),
                            releaseStatus: ['djibouti_release', 'inland_dispatch', 'yard_processing', 'empty_return'].includes(stage) ? 'Ready' : 'Pending',
                            djiboutiStatus: ['djibouti_release', 'inland_dispatch', 'yard_processing', 'empty_return'].includes(stage) ? 'Discharged' : 'Awaiting discharge',
                            corridorStatus: stage === 'inland_dispatch' ? 'In transit' : stage === 'yard_processing' ? 'Arrived inland' : 'Pending dispatch',
                            dryPortStatus: ['yard_processing', 'empty_return'].includes(stage) ? 'Gate-in confirmed' : 'Awaiting arrival',
                            emptyReturnStatus: stage === 'empty_return' ? 'Open' : 'Pending',
                            freeTimeStartAt: dateOffset(-2).toISOString(),
                            freeTimeEndAt: dateOffset(2).toISOString(),
                            detentionRiskLevel: index % 4 === 0 ? 'high' : 'low',
                            demurrageRiskLevel: index % 3 === 0 ? 'medium' : 'low',
                        },
                        taxDutySummary: ['Cleared for transit', 'Under customs review', 'Duty note acknowledged'][index % 3],
                        releaseReadiness: ['djibouti_release', 'inland_dispatch', 'yard_processing', 'empty_return'].includes(stage) ? 'Ready for dispatch' : 'Origin preparation',
                        emptyReturnSummary: stage === 'empty_return' ? (index % 2 === 0 ? 'Returned to designated depot' : 'Return transit still open') : 'Not yet released',
                    },
                },
                upsert: true,
            },
        });
        containerWrites.push({
            updateOne: {
                filter: { containerId },
                update: {
                    $set: {
                        containerId,
                        shipmentId,
                        shipmentRef,
                        containerNumber,
                        containerType: index % 3 === 0 ? '40HC' : '20GP',
                        sealNumber,
                        status: stage === 'origin_preparation' ? 'stuffed' : stage === 'ocean_in_transit' ? 'gated_in' : stage === 'djibouti_release' ? 'discharged' : stage === 'inland_dispatch' ? 'in_transit' : stage === 'yard_processing' ? 'unloaded' : 'empty_return_in_progress',
                        stuffingStatus: 'confirmed',
                        dischargeStatus: ['djibouti_release', 'inland_dispatch', 'yard_processing', 'empty_return'].includes(stage) ? 'confirmed' : 'pending',
                        releaseStatus: ['djibouti_release', 'inland_dispatch', 'yard_processing', 'empty_return'].includes(stage) ? 'gate_out_ready' : 'release_pending',
                        inlandTripStatus: ['inland_dispatch', 'yard_processing', 'empty_return'].includes(stage) ? 'departed' : 'awaiting_assignment',
                        unloadStatus: ['yard_processing', 'empty_return'].includes(stage) ? 'completed' : 'pending',
                        emptyReturnStatus: stage === 'empty_return' ? (index % 2 === 0 ? 'empty_returned' : 'empty_return_in_progress') : 'not_released',
                        freeTimeStart: dateOffset(-2),
                        freeTimeEnd: dateOffset(2),
                        storageRiskLevel: index % 4 === 0 ? 'high' : 'normal',
                    },
                },
                upsert: true,
            },
        });
        accessWrites.push({
            updateOne: {
                filter: { shipmentRef, role: 'supplier_agent', actorCode: `SUP-AG-${formatNumber((index % 4) + 1, 3)}` },
                update: { $set: { shipmentId, shipmentRef, role: 'supplier_agent', actorCode: `SUP-AG-${formatNumber((index % 4) + 1, 3)}`, actorName: supplierName, stageAccess: ['booking', 'origin_preparation', 'ocean_in_transit'], visibilityScopes: ['supplier_visible'] } },
                upsert: true,
            },
        }, {
            updateOne: {
                filter: { shipmentRef, role: 'customer_user', actorCode: customer.customerCode },
                update: { $set: { shipmentId, shipmentRef, role: 'customer_user', actorCode: customer.customerCode, actorName: customer.companyName, stageAccess: shipmentStages, visibilityScopes: ['customer_visible'] } },
                upsert: true,
            },
        }, {
            updateOne: {
                filter: { shipmentRef, role: 'internal_driver', actorCode: String(driver.userId) },
                update: { $set: { shipmentId, shipmentRef, role: 'internal_driver', actorCode: String(driver.userId), actorUserId: String(driver.userId), actorName: `${driver.firstName} ${driver.lastName}`, stageAccess: ['inland_dispatch', 'inland_arrival', 'yard_processing', 'empty_return'], visibilityScopes: ['driver_visible'] } },
                upsert: true,
            },
        });
        for (let itemIndex = 0; itemIndex < 3; itemIndex += 1) {
            const lineNumber = itemIndex + 1;
            cargoItemWrites.push({
                updateOne: {
                    filter: { shipmentId, cargoItemId: `${shipmentId}-ITEM-${formatNumber(lineNumber, 2)}` },
                    update: {
                        $set: {
                            cargoItemId: `${shipmentId}-ITEM-${formatNumber(lineNumber, 2)}`,
                            shipmentId,
                            shipmentRef,
                            containerNumber,
                            lineNumber,
                            lineNo: formatNumber(lineNumber, 2),
                            description: [
                                'Industrial solvent drums',
                                'Solar inverter modules',
                                'HDPE packaging resin',
                                'Agricultural pump assemblies',
                            ][(index + itemIndex) % 4],
                            hsCode: ['381400', '850440', '390120', '841370'][(index + itemIndex) % 4],
                            packageType: ['Drum', 'Crate', 'Bag', 'Pallet'][(index + itemIndex) % 4],
                            packageQty: 8 + itemIndex * 4,
                            netWeightKg: 8200 + itemIndex * 450,
                            grossWeightKg: 8540 + itemIndex * 480,
                            cbm: 10.4 + itemIndex * 1.8,
                            marksNumbers: `${bookingNumber}/L${lineNumber}`,
                            invoiceRef: invoice?.invoiceCode || `INV-${formatNumber(index + 1, 5)}`,
                            packingListRef: `PL-${formatNumber(index + 1, 5)}`,
                            transitDocRef: transitRef,
                            remark: itemIndex === 0 && index % 3 === 0 ? 'Inspection follow-up at Djibouti' : '',
                            remarks: itemIndex === 0 && index % 3 === 0 ? 'Inspection follow-up at Djibouti' : '',
                            discrepancyStatus: itemIndex === 0 && index % 5 === 0 ? 'variance_flagged' : 'clear',
                            inspectionStatus: itemIndex === 0 && index % 3 === 0 ? 'under_review' : 'cleared',
                        },
                    },
                    upsert: true,
                },
            });
        }
        [
            ['commercial_invoice', invoice?.invoiceCode || `INV-${formatNumber(index + 1, 5)}`, 'approved', 'customer_visible'],
            ['packing_list', `PL-${formatNumber(index + 1, 5)}`, 'approved', 'customer_visible'],
            ['final_bl', `BLDJB${formatNumber(92000 + index, 6)}`, 'approved', 'customer_visible'],
            ['transit_document', transitRef, ['djibouti_release', 'inland_dispatch', 'yard_processing', 'empty_return'].includes(stage) ? 'approved' : 'missing', 'driver_visible'],
            ['release_note', releaseRef, ['inland_dispatch', 'yard_processing', 'empty_return'].includes(stage) ? 'approved' : 'uploaded', 'customer_visible'],
            ['pod', `POD-${formatNumber(index + 1, 5)}`, ['yard_processing', 'empty_return'].includes(stage) ? 'uploaded' : 'missing', 'customer_visible'],
            ['return_receipt', `RET-${formatNumber(index + 1, 5)}`, stage === 'empty_return' && index % 2 === 0 ? 'approved' : 'missing', 'yard_visible'],
        ].forEach(([documentType, referenceNo, status, visibilityScope], docIndex) => {
            documentWrites.push({
                updateOne: {
                    filter: { shipmentId, shipmentDocumentId: `${shipmentId}-DOC-${docIndex + 1}` },
                    update: {
                        $set: {
                            shipmentDocumentId: `${shipmentId}-DOC-${docIndex + 1}`,
                            shipmentId,
                            shipmentRef,
                            containerId,
                            containerNumber,
                            documentType,
                            referenceNo,
                            issueDate: dateOffset(-(9 - docIndex)),
                            uploadedDate: dateOffset(-(8 - docIndex)),
                            status,
                            sourceRole: docIndex < 3 ? 'supplier_agent' : docIndex < 5 ? 'djibouti_release_agent' : 'dry_port_yard_agent',
                            visibilityScope,
                            uploadedByUserId: String(driver.userId),
                            fileUrl: `/files/${shipmentId}/${documentType}.pdf`,
                            fileKey: `${shipmentId}/${documentType}.pdf`,
                            fileName: `${documentType}-${bookingNumber}.pdf`,
                        },
                    },
                    upsert: true,
                },
            });
        });
        if (['inland_dispatch', 'yard_processing', 'empty_return'].includes(stage)) {
            tripWrites.push({
                updateOne: {
                    filter: { tripId },
                    update: {
                        $set: {
                            tripId,
                            shipmentId,
                            shipmentRef,
                            containerId,
                            containerNumber,
                            driverId: String(driver.userId),
                            vehicleId: String(vehicle._id),
                            driverType: index % 3 === 0 ? 'external_driver' : 'internal_driver',
                            partnerId: index % 3 === 0 ? `PARTNER-${formatNumber(index + 1, 3)}` : undefined,
                            driverName: `${driver.firstName} ${driver.lastName}`,
                            driverPhone: driverProfile.phone,
                            truckPlate: vehicle.plateNumber || `ET-3-${formatNumber(index + 1, 5)}`,
                            trailerPlate: `TRL-${formatNumber(index + 1, 4)}`,
                            route: `Djibouti Port -> ${destination} -> ${finalDeliveryLocation}`,
                            routeName: `Djibouti Port -> ${destination} -> ${finalDeliveryLocation}`,
                            originPoint: 'Djibouti Port',
                            destinationPoint: finalDeliveryLocation,
                            dispatchStatus: stage === 'inland_dispatch' ? 'in_transit' : 'arrived_inland',
                            tripStatus: stage === 'inland_dispatch' ? 'in_transit' : stage === 'yard_processing' ? 'arrived_inland' : 'handed_to_yard',
                            eta: dateOffset(index % 2, 5),
                            actualDeparture: dateOffset(-1, 4),
                            actualArrival: ['yard_processing', 'empty_return'].includes(stage) ? dateOffset(0, 2) : undefined,
                            currentCheckpoint: ['yard_processing', 'empty_return'].includes(stage) ? destination : 'Galafi Corridor Gate',
                            gpsStatus: 'synced',
                            issueStatus: index % 3 === 0 ? 'active' : 'clear',
                            dispatchAt: dateOffset(-1, 4),
                            gateOutAt: dateOffset(-1, 4),
                            arrivalAt: ['yard_processing', 'empty_return'].includes(stage) ? dateOffset(0, 2) : undefined,
                            podStatus: ['yard_processing', 'empty_return'].includes(stage) ? 'pending' : 'not_ready',
                        },
                    },
                    upsert: true,
                },
            });
            checkpointWrites.push({
                updateOne: {
                    filter: { tripId, checkpointName: 'Galafi Corridor Gate' },
                    update: {
                        $set: {
                            tripId,
                            shipmentId,
                            shipmentRef,
                            containerNumber,
                            checkpointName: 'Galafi Corridor Gate',
                            eventType: index % 3 === 0 ? 'inspection' : 'passed',
                            sealVerified: true,
                            officerName: 'Officer Tesfaye',
                            note: index % 3 === 0 ? 'Transit file checked' : 'Seal and packet verified',
                            eventAt: dateOffset(-1, 8),
                            latitude: 11.1002,
                            longitude: 42.3411,
                        },
                    },
                    upsert: true,
                },
            });
        }
        const milestoneSpecs = [
            ['booking_created', 'Booking created', 'booking', dateOffset(-16, 2), 'China origin desk'],
            ['cargo_items_completed', 'Cargo items completed', 'origin_preparation', dateOffset(-15, 4), 'China origin desk'],
            ['documents_completed', 'Documents completed', 'origin_preparation', dateOffset(-15, 8), 'China origin desk'],
            ['stuffing_confirmed', 'Stuffing confirmed', 'origin_preparation', dateOffset(-14, 3), 'China origin warehouse'],
            ['gate_in_confirmed', 'Gate-in confirmed', 'origin_preparation', dateOffset(-13, 6), 'Yantian Terminal'],
            ['vessel_departed', 'Vessel departed', 'ocean_in_transit', dateOffset(-12, 6), 'Dubai Port transshipment lane'],
            ['vessel_arrived_djibouti', 'Vessel arrived Djibouti', 'djibouti_release', dateOffset(-4, 7), 'Djibouti'],
            ['discharge_confirmed', 'Discharge confirmed', 'djibouti_release', dateOffset(-4, 10), 'Djibouti Port'],
            ['release_received', 'Release received', 'djibouti_release', dateOffset(-3, 8), 'Djibouti Port'],
            ['customs_cleared', 'Customs cleared', 'djibouti_release', dateOffset(-3, 11), 'Djibouti Customs'],
            ['gate_out_confirmed', 'Gate-out confirmed', 'inland_dispatch', dateOffset(-2, 4), 'Djibouti Port'],
            ['inland_trip_created', 'Inland trip created', 'inland_dispatch', dateOffset(-2, 5), 'Djibouti Port'],
            ['checkpoint_update', 'Checkpoint update', 'inland_dispatch', dateOffset(-1, 8), 'Galafi Corridor Gate'],
            ['inland_arrival_confirmed', 'Inland arrival confirmed', 'inland_arrival', dateOffset(0, 2), destination],
            ['unload_completed', 'Unload completed', 'yard_processing', dateOffset(0, 6), destination],
            ['pod_completed', 'POD completed', 'delivery_pod', dateOffset(0, 8), finalDeliveryLocation],
            ['empty_return_completed', 'Empty returned', 'empty_return', dateOffset(1, 3), 'Djibouti Empty Depot'],
            ['shipment_cycle_closed', 'Shipment cycle closed', 'closed', dateOffset(1, 6), finalDeliveryLocation],
        ];
        milestoneSpecs
            .filter(([, , milestoneStage]) => shipmentStages.indexOf(milestoneStage) <= shipmentStages.indexOf(stage) || stage === 'empty_return')
            .forEach(([code, label, milestoneStage, occurredAt, location], milestoneIndex) => {
            milestoneWrites.push({
                updateOne: {
                    filter: { shipmentId, code, tripId: code === 'checkpoint_update' || code === 'inland_trip_created' ? tripId : undefined },
                    update: {
                        $set: {
                            milestoneId: `${shipmentId}-MS-${formatNumber(milestoneIndex + 1, 2)}`,
                            shipmentId,
                            shipmentRef,
                            containerId,
                            containerNumber,
                            tripId: code === 'checkpoint_update' || code === 'inland_trip_created' ? tripId : undefined,
                            stage: milestoneStage,
                            code,
                            label,
                            status: 'done',
                            occurredAt,
                            location,
                            sourceRole: milestoneStage === 'origin_preparation' || milestoneStage === 'ocean_in_transit' ? 'supplier_agent' : milestoneStage === 'djibouti_release' ? 'djibouti_release_agent' : milestoneStage === 'inland_dispatch' ? 'corridor_dispatch_agent' : 'dry_port_yard_agent',
                            sourceUserId: String(driver.userId),
                            note: code === 'pod_completed'
                                ? 'POD uploaded and customer receipt confirmation requested.'
                                : code === 'shipment_cycle_closed'
                                    ? 'Customer receipt and empty return closure recorded during seed build.'
                                    : `${label} recorded during seed build.`,
                            visibilityScope: ['inland_dispatch', 'inland_arrival'].includes(milestoneStage) ? 'driver_visible' : milestoneStage === 'delivery_pod' || milestoneStage === 'closed' ? 'customer_visible' : 'internal_only',
                        },
                    },
                    upsert: true,
                },
            });
        });
        if (index % 3 === 0) {
            exceptionWrites.push({
                updateOne: {
                    filter: { shipmentId, exceptionId: `${shipmentId}-EX-01` },
                    update: {
                        $set: {
                            exceptionId: `${shipmentId}-EX-01`,
                            shipmentId,
                            shipmentRef,
                            containerId,
                            containerNumber,
                            tripId: ['inland_dispatch', 'yard_processing', 'empty_return'].includes(stage) ? tripId : undefined,
                            category: stage === 'djibouti_release' ? 'customs_hold' : 'checkpoint_delay',
                            type: stage === 'djibouti_release' ? 'customs_hold' : 'delay',
                            severity: index % 4 === 0 ? 'high' : 'medium',
                            title: stage === 'djibouti_release' ? 'Customs note follow-up required' : 'Checkpoint packet recheck',
                            description: stage === 'djibouti_release' ? 'Customs inspection note still needs attachment before gate-out approval.' : 'Checkpoint requested packet review before onward movement.',
                            summary: stage === 'djibouti_release' ? 'Customs note pending' : 'Checkpoint packet follow-up required',
                            details: stage === 'djibouti_release' ? 'Transit packet can move once customs note is linked to the shipment file.' : 'Dispatch should confirm seal note and packet acknowledgement.',
                            ownerRole: stage === 'djibouti_release' ? 'djibouti_release_agent' : 'corridor_dispatch_agent',
                            ownerUserId: String(driver.userId),
                            status: index % 2 === 0 ? 'open' : 'acknowledged',
                            detectedAt: dateOffset(-1, 6),
                            visibilityScope: stage === 'djibouti_release' ? 'djibouti_visible' : 'internal_only',
                            reportedBy: 'seed-local',
                        },
                    },
                    upsert: true,
                },
            });
        }
        if (stage === 'empty_return') {
            emptyReturnWrites.push({
                updateOne: {
                    filter: { shipmentId, containerId },
                    update: {
                        $set: {
                            shipmentId,
                            containerId,
                            shipmentRef,
                            containerNumber,
                            returnDepot: 'Djibouti Empty Depot',
                            emptyReleaseAt: dateOffset(0, 10),
                            returnedAt: index % 2 === 0 ? dateOffset(1, 3) : undefined,
                            receiptNumber: index % 2 === 0 ? `RET-${formatNumber(index + 1, 5)}` : undefined,
                            detentionClosed: index % 2 === 0,
                            status: index % 2 === 0 ? 'empty_returned' : 'empty_return_in_progress',
                        },
                    },
                    upsert: true,
                },
            });
        }
    }
    await models_1.CorridorShipmentModel.bulkWrite(shipmentWrites);
    await models_1.CorridorPartyAccessModel.bulkWrite(accessWrites);
    await models_1.CorridorCargoItemModel.bulkWrite(cargoItemWrites);
    await models_1.CorridorDocumentModel.bulkWrite(documentWrites);
    await models_1.CorridorContainerModel.bulkWrite(containerWrites);
    if (tripWrites.length)
        await models_1.CorridorTripAssignmentModel.bulkWrite(tripWrites);
    if (milestoneWrites.length)
        await models_1.CorridorMilestoneModel.bulkWrite(milestoneWrites);
    if (exceptionWrites.length)
        await models_1.CorridorExceptionModel.bulkWrite(exceptionWrites);
    if (emptyReturnWrites.length)
        await models_1.CorridorEmptyReturnModel.bulkWrite(emptyReturnWrites);
    if (checkpointWrites.length)
        await models_1.CorridorCheckpointEventModel.bulkWrite(checkpointWrites);
    return {
        shipments: shipmentWrites.length,
        cargoItems: cargoItemWrites.length,
        documents: documentWrites.length,
        containers: containerWrites.length,
        trips: tripWrites.length,
        milestones: milestoneWrites.length,
        exceptions: exceptionWrites.length,
        emptyReturns: emptyReturnWrites.length,
    };
}
async function resetLocalData() {
    await (0, mongo_1.connectToDatabase)();
    await dropLegacyUserIndexes();
    await syncSeedIndexes();
    await Promise.all([
        models_1.RoleModel.deleteMany({}),
        models_1.AiInsightModel.deleteMany({}),
        models_1.AiSnapshotModel.deleteMany({}),
        models_1.UserModel.deleteMany({}),
        models_1.BranchModel.deleteMany({}),
        models_1.EmployeeModel.deleteMany({}),
        models_1.DriverModel.deleteMany({}),
        models_1.CustomerModel.deleteMany({}),
        models_1.VehicleModel.deleteMany({}),
        models_1.TripModel.deleteMany({}),
        models_1.TripEventModel.deleteMany({}),
        models_1.GpsPointModel.deleteMany({}),
        models_1.MaintenancePlanModel.deleteMany({}),
        models_1.MaintenanceRecordModel.deleteMany({}),
        models_1.MaintenanceNotificationModel.deleteMany({}),
        models_1.DriverReportModel.deleteMany({}),
        models_1.AgreementModel.deleteMany({}),
        models_1.InvoiceModel.deleteMany({}),
        models_1.PaymentModel.deleteMany({}),
        models_1.PaymentCommunicationModel.deleteMany({}),
        models_1.ExecutiveCommunicationModel.deleteMany({}),
        models_1.CommunicationDraftModel.deleteMany({}),
        models_1.CommunicationLogModel.deleteMany({}),
        models_1.CommunicationScheduleModel.deleteMany({}),
        models_1.CommunicationTemplateModel.deleteMany({}),
        models_1.CommunicationAutomationRuleModel.deleteMany({}),
        models_1.NotificationEventModel.deleteMany({}),
        models_1.CorridorShipmentModel.deleteMany({}),
        models_1.CorridorPartyAccessModel.deleteMany({}),
        models_1.CorridorCargoItemModel.deleteMany({}),
        models_1.CorridorDocumentModel.deleteMany({}),
        models_1.CorridorContainerModel.deleteMany({}),
        models_1.CorridorTripAssignmentModel.deleteMany({}),
        models_1.CorridorMilestoneModel.deleteMany({}),
        models_1.CorridorExceptionModel.deleteMany({}),
        models_1.CorridorCheckpointEventModel.deleteMany({}),
        models_1.CorridorEmptyReturnModel.deleteMany({}),
        models_1.RepairOrderModel.deleteMany({}),
        models_1.SparePartModel.deleteMany({}),
        models_1.NotificationModel.deleteMany({}),
        models_1.DocumentModel.deleteMany({}),
        models_1.UserPreferenceModel.deleteMany({}),
        models_1.FuelLogModel.deleteMany({}),
        models_1.VehicleServiceHistoryModel.deleteMany({}),
        models_1.PartReplacementModel.deleteMany({}),
        models_1.RentalPartnerModel.deleteMany({}),
        models_1.RentalPartnerTripModel.deleteMany({}),
        models_1.IncidentReportModel.deleteMany({}),
        models_1.ActivityLogModel.deleteMany({}),
        models_1.UploadedDocumentModel.deleteMany({}),
        models_1.CustomerProfileModel.deleteMany({}),
        models_1.DriverProfileModel.deleteMany({}),
        models_1.DriverKycRequestModel.deleteMany({}),
        models_1.AgreementSignatureModel.deleteMany({}),
        models_1.BookingModel.deleteMany({}),
        models_1.QuoteModel.deleteMany({}),
        models_1.AvailabilityReportModel.deleteMany({}),
        models_1.LeaveRequestModel.deleteMany({}),
        models_1.CollectionTaskModel.deleteMany({}),
        models_1.EscalationLogModel.deleteMany({}),
        models_1.LeadModel.deleteMany({}),
        models_1.OnboardingTaskModel.deleteMany({}),
        models_1.OutboundNotificationModel.deleteMany({}),
        models_1.JobRequisitionModel.deleteMany({}),
        models_1.CandidateModel.deleteMany({}),
        models_1.OnboardingTaskHrModel.deleteMany({}),
        models_1.TrainingRecordModel.deleteMany({}),
        models_1.DrivingSchoolStudentModel.deleteMany({}),
        models_1.DrivingSchoolPaymentModel.deleteMany({}),
        models_1.EmployeePerformanceMetricModel.deleteMany({}),
        models_1.DriverPerformanceMetricModel.deleteMany({}),
    ]);
}
async function resetOperationalData() {
    await (0, mongo_1.connectToDatabase)();
    await dropLegacyUserIndexes();
    await syncSeedIndexes();
    await Promise.all([
        models_1.AiInsightModel.deleteMany({}),
        models_1.AiSnapshotModel.deleteMany({}),
        models_1.TripModel.deleteMany({}),
        models_1.TripEventModel.deleteMany({}),
        models_1.GpsPointModel.deleteMany({}),
        models_1.DriverReportModel.deleteMany({}),
        models_1.AgreementModel.deleteMany({}),
        models_1.InvoiceModel.deleteMany({}),
        models_1.PaymentModel.deleteMany({}),
        models_1.PaymentCommunicationModel.deleteMany({}),
        models_1.ExecutiveCommunicationModel.deleteMany({}),
        models_1.CommunicationDraftModel.deleteMany({}),
        models_1.CommunicationLogModel.deleteMany({}),
        models_1.CommunicationScheduleModel.deleteMany({}),
        models_1.NotificationEventModel.deleteMany({}),
        models_1.CorridorShipmentModel.deleteMany({}),
        models_1.CorridorPartyAccessModel.deleteMany({}),
        models_1.CorridorCargoItemModel.deleteMany({}),
        models_1.CorridorDocumentModel.deleteMany({}),
        models_1.CorridorContainerModel.deleteMany({}),
        models_1.CorridorTripAssignmentModel.deleteMany({}),
        models_1.CorridorMilestoneModel.deleteMany({}),
        models_1.CorridorExceptionModel.deleteMany({}),
        models_1.CorridorCheckpointEventModel.deleteMany({}),
        models_1.CorridorEmptyReturnModel.deleteMany({}),
        models_1.NotificationModel.deleteMany({}),
        models_1.DocumentModel.deleteMany({}),
        models_1.FuelLogModel.deleteMany({}),
        models_1.VehicleServiceHistoryModel.deleteMany({}),
        models_1.PartReplacementModel.deleteMany({}),
        models_1.RentalPartnerTripModel.deleteMany({}),
        models_1.IncidentReportModel.deleteMany({}),
        models_1.ActivityLogModel.deleteMany({}),
        models_1.UploadedDocumentModel.deleteMany({}),
        models_1.AgreementSignatureModel.deleteMany({}),
        models_1.BookingModel.deleteMany({}),
        models_1.QuoteModel.deleteMany({}),
        models_1.AvailabilityReportModel.deleteMany({}),
        models_1.LeaveRequestModel.deleteMany({}),
        models_1.CollectionTaskModel.deleteMany({}),
        models_1.EscalationLogModel.deleteMany({}),
        models_1.LeadModel.deleteMany({}),
        models_1.OnboardingTaskModel.deleteMany({}),
        models_1.OutboundNotificationModel.deleteMany({}),
        models_1.JobRequisitionModel.deleteMany({}),
        models_1.CandidateModel.deleteMany({}),
        models_1.OnboardingTaskHrModel.deleteMany({}),
        models_1.TrainingRecordModel.deleteMany({}),
        models_1.DrivingSchoolStudentModel.deleteMany({}),
        models_1.DrivingSchoolPaymentModel.deleteMany({}),
        models_1.EmployeePerformanceMetricModel.deleteMany({}),
        models_1.DriverPerformanceMetricModel.deleteMany({}),
    ]);
}
//# sourceMappingURL=local-seed.service.js.map