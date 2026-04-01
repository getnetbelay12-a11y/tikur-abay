"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedLocalData = seedLocalData;
exports.resetLocalData = resetLocalData;
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
function generatedUserRole(index) {
    if (index <= 24)
        return 'driver';
    if (index <= 28)
        return 'dispatcher';
    if (index <= 30)
        return 'operations_manager';
    if (index <= 32)
        return 'technical_manager';
    if (index <= 33)
        return 'finance_officer';
    if (index <= 34)
        return 'hr_officer';
    if (index <= 35)
        return 'marketing_officer';
    return 'customer';
}
function dateOffset(days, hours = 0) {
    const value = new Date();
    value.setUTCDate(value.getUTCDate() + days);
    value.setUTCHours(value.getUTCHours() + hours, 0, 0, 0);
    return value;
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
    bookings: 45,
    quotes: 60,
    employeePerformanceMetrics: 160,
    driverPerformanceMetrics: 160,
    notifications: 250,
    documents: 300,
    fuelLogs: 120,
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
    { code: 'finance_officer', name: 'Finance Officer', permissions: ['payments:view', 'invoices:view'] },
    { code: 'hr_officer', name: 'HR Officer', permissions: ['employees:view', 'drivers:view', 'performance:view'] },
    { code: 'marketing_officer', name: 'Marketing Officer', permissions: ['customers:view', 'agreements:view'] },
    { code: 'customer', name: 'Customer', permissions: ['dashboard:customer:view', 'trips:own:view', 'payments:own:view'] },
    { code: 'driver', name: 'Driver', permissions: ['mobile:login', 'trips:view-assigned'] },
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
async function seedBaseData() {
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
        ['superadmin@tikurabay.com', 'Super', 'Admin', 'super_admin', 'BR-HQ'],
        ['executive@tikurabay.com', 'Executive', 'Board', 'executive', 'BR-HQ'],
        ['opsmanager@tikurabay.com', 'Operations', 'Manager', 'operations_manager', 'BR-HQ'],
        ['dispatcher@tikurabay.com', 'Dispatch', 'Lead', 'dispatcher', 'BR-HQ'],
        ['technical@tikurabay.com', 'Technical', 'Manager', 'technical_manager', 'BR-HQ'],
        ['finance@tikurabay.com', 'Finance', 'Officer', 'finance_officer', 'BR-HQ'],
        ['hr@tikurabay.com', 'HR', 'Officer', 'hr_officer', 'BR-HQ'],
        ['marketing@tikurabay.com', 'Marketing', 'Officer', 'marketing_officer', 'BR-HQ'],
        ['customer1@tikurabay.com', 'Customer', 'One', 'customer', 'BR-HQ'],
    ];
    const userWrites = primaryUsers.map(([email, firstName, lastName, role, branchCode], index) => ({
        updateOne: {
            filter: { email },
            update: {
                $set: {
                    firstName,
                    lastName,
                    email,
                    passwordHash,
                    role,
                    permissions: roleMatrix.find((item) => item.code === role)?.permissions ?? [],
                    branchId: branchByCode.get(branchCode)?._id,
                    branchName: branchByCode.get(branchCode)?.name,
                    status: 'active',
                    employeeCode: role === 'customer' ? undefined : `EMP-${formatNumber(index + 1, 4)}`,
                    customerCode: role === 'customer' ? 'CUST-0001' : undefined,
                },
            },
            upsert: true,
        },
    }));
    for (let index = 10; index <= seedVolumes.users; index += 1) {
        const role = generatedUserRole(index);
        const branch = branches[index % branches.length];
        userWrites.push({
            updateOne: {
                filter: { email: `user${formatNumber(index, 4)}@tikurabay.com` },
                update: {
                    $set: {
                        firstName: `User${index}`,
                        lastName: role === 'customer' ? 'Customer' : 'Staff',
                        email: `user${formatNumber(index, 4)}@tikurabay.com`,
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
                        companyName: `Tikur Client ${formatNumber(index, 4)}`,
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
                    customerCode: user.customerCode,
                    fullName: `${user.firstName} ${user.lastName}`.trim(),
                    phone: user.phone || `+251911${formatNumber(index + 1, 6)}`,
                    email: user.email,
                    companyName: customers[index % customers.length]?.companyName || `Tikur Client ${formatNumber(index + 1, 4)}`,
                    tradeLicense: index % 4 === 0 ? `TL-${formatNumber(index + 1, 5)}` : undefined,
                    tinNumber: index % 3 === 0 ? `TIN-${formatNumber(index + 1, 6)}` : undefined,
                    vatNumber: index % 5 === 0 ? `VAT-${formatNumber(index + 1, 6)}` : undefined,
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
        const route = pickWeighted(rng, routeCatalog.map((item) => ({ value: item, weight: item.weight })));
        const branch = branchByCode.get(route.branchCode);
        const customer = customers[index % customers.length];
        const vehicle = vehicles[index % vehicles.length];
        const driver = drivers[index % drivers.length];
        const status = pickWeighted(rng, [
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
        const plannedStartAt = new Date(now.getTime() - (index % 90) * 24 * 60 * 60 * 1000);
        const plannedArrivalAt = new Date(plannedStartAt.getTime() + (route.djibouti ? 2.5 : 1) * 24 * 60 * 60 * 1000);
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
                        currentCheckpoint: route.points[Math.min(route.points.length - 1, index % route.points.length)]?.geofence ?? 'origin',
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
    const vehicleStatusWrites = vehicles.map((vehicle, index) => {
        const trip = trips[index % trips.length];
        const currentStatus = trip.status === 'completed'
            ? 'available'
            : trip.status === 'breakdown'
                ? 'breakdown'
                : trip.status === 'delayed'
                    ? 'delayed'
                    : trip.status === 'in_djibouti'
                        ? 'in_djibouti'
                        : trip.status === 'loading'
                            ? 'loading'
                            : trip.status === 'loaded'
                                ? 'loaded'
                                : 'in_transit';
        const lastPoint = routeCatalog[index % routeCatalog.length].points.slice(-1)[0];
        return {
            updateOne: {
                filter: { _id: vehicle._id },
                update: {
                    $set: {
                        currentTripId: ['completed', 'cancelled'].includes(String(trip.status)) ? undefined : trip._id,
                        currentStatus,
                        lastGpsAt: dateOffset(-(index % 3), -(index % 5)),
                        currentLocation: toGeoPoint(lastPoint),
                        lastKnownLocation: toLegacyPoint(lastPoint),
                    },
                },
            },
        };
    });
    await models_1.VehicleModel.bulkWrite(vehicleStatusWrites);
    const tripEventWrites = [];
    for (const trip of trips) {
        const eventTimeline = [
            { eventType: 'assigned', title: 'Trip assigned', offset: -4 },
            { eventType: 'loading_started', title: 'Loading started', offset: -3 },
            { eventType: 'loaded', title: 'Vehicle loaded', offset: -2 },
            { eventType: String(trip.status), title: `Trip status ${trip.status}`, offset: -1 },
            { eventType: 'checkpoint', title: 'Checkpoint update', offset: 0 },
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
                            description: `${trip.tripCode} ${event.title.toLowerCase()}.`,
                            location: event.eventType === 'checkpoint' ? String(trip.currentCheckpoint) : String(trip.origin),
                            eventAt: dateOffset(-Math.max(1, eventIndex)),
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
        for (let pointIndex = 0; pointIndex < seedVolumes.tripGpsPointsPerTrip; pointIndex += 1) {
            const anchor = route.points[Math.min(route.points.length - 1, Math.floor((pointIndex / seedVolumes.tripGpsPointsPerTrip) * route.points.length))];
            gpsWrites.push({
                updateOne: {
                    filter: { tripCode: trip.tripCode, recordedAt: new Date(new Date(String(trip.plannedStartAt)).getTime() + pointIndex * 60 * 60 * 1000) },
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
                            recordedAt: new Date(new Date(String(trip.plannedStartAt)).getTime() + pointIndex * 60 * 60 * 1000),
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
                        invoiceId: invoice._id,
                        invoiceCode: invoice.invoiceCode,
                        customerId: invoice.customerId,
                        customerCode: invoice.customerCode,
                        branchId: invoice.branchId,
                        routeName: invoice.routeName,
                        amount: index % 7 === 0 ? Math.round(Number(invoice.totalAmount) * 0.4) : Math.round(Number(invoice.totalAmount) * 0.7),
                        status: index % 8 === 0 ? 'pending' : 'paid',
                        paymentDate: dateOffset(-(index % 45)),
                    },
                },
                upsert: true,
            },
        });
    }
    await models_1.PaymentModel.bulkWrite(paymentWrites);
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
                        requestedDate: dateOffset(index % 21),
                        amount: 250000 + (index % 10) * 15000,
                        status: index % 6 === 0 ? 'approved' : index % 5 === 0 ? 'sent' : 'requested',
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
                        message: `Notification ${index} for operational follow-up.`,
                        type: index % 5 === 0 ? 'trip_delayed' : index % 7 === 0 ? 'maintenance_due' : 'ops_update',
                        isRead: index % 4 === 0,
                        entityType: 'system',
                        entityId: `notification-${index}`,
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
        fuelWrites.push({
            updateOne: {
                filter: { vehicleCode: vehicle.vehicleCode, date: dateOffset(-(index % 90), -(index % 10)) },
                update: {
                    $set: {
                        vehicleId: vehicle._id,
                        vehicleCode: vehicle.vehicleCode,
                        driverId: driver._id,
                        driverName: `${driver.firstName} ${driver.lastName}`,
                        tripId: trip._id,
                        tripCode: trip.tripCode,
                        branchId: vehicle.branchId,
                        date: dateOffset(-(index % 90), -(index % 10)),
                        odometerKm: Number(vehicle.odometerKm || vehicle.currentOdometerKm || 0) - (index % 2400),
                        liters: 120 + (index % 80),
                        cost: 11500 + (index % 50) * 120,
                        station: ['Tikur Fuel Addis', 'Tikur Fuel Adama', 'Galafi Station', 'Djibouti Depot'][index % 4],
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
                        status: ['new', 'qualified', 'quoted', 'onboarding'][index % 4],
                        assignedTo: 'marketing_officer',
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
        notifications: seedVolumes.notifications,
        documents: seedVolumes.documents,
        userPreferences: notificationUsers.length,
        fuelLogs: seedVolumes.fuelLogs,
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
        employeePerformanceMetrics: seedVolumes.employeePerformanceMetrics,
        driverPerformanceMetrics: seedVolumes.driverPerformanceMetrics,
    };
}
async function resetLocalData() {
    await (0, mongo_1.connectToDatabase)();
    await Promise.all([
        models_1.RoleModel.deleteMany({}),
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
        models_1.RepairOrderModel.deleteMany({}),
        models_1.SparePartModel.deleteMany({}),
        models_1.NotificationModel.deleteMany({}),
        models_1.DocumentModel.deleteMany({}),
        models_1.UserPreferenceModel.deleteMany({}),
        models_1.FuelLogModel.deleteMany({}),
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
        models_1.EmployeePerformanceMetricModel.deleteMany({}),
        models_1.DriverPerformanceMetricModel.deleteMany({}),
    ]);
}
//# sourceMappingURL=demo-seed.service.js.map