"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sampleSeedData = exports.seededAccounts = void 0;
exports.seededAccounts = [
    { role: 'super_admin', email: 'superadmin@tikurabay.com', password: 'ChangeMe123!' },
    { role: 'executive', email: 'executive@tikurabay.com', password: 'ChangeMe123!' },
    { role: 'operations_manager', email: 'opsmanager@tikurabay.com', password: 'ChangeMe123!' },
    { role: 'dispatcher', email: 'dispatcher@tikurabay.com', password: 'ChangeMe123!' },
    { role: 'technical_manager', email: 'technical@tikurabay.com', password: 'ChangeMe123!' },
    { role: 'finance_officer', email: 'finance@tikurabay.com', password: 'ChangeMe123!' },
    { role: 'hr_officer', email: 'hr@tikurabay.com', password: 'ChangeMe123!' },
    { role: 'marketing_officer', email: 'marketing@tikurabay.com', password: 'ChangeMe123!' },
    { role: 'driver', email: 'driver.demo@tikurabay.com', password: 'ChangeMe123!' },
    { role: 'customer', email: 'customer1@tikurabay.com', password: 'ChangeMe123!' },
];
exports.sampleSeedData = {
    branches: [
        { code: 'ADD', name: 'Addis Ababa HQ', city: 'Addis Ababa', country: 'Ethiopia' },
        { code: 'DJB', name: 'Djibouti Desk', city: 'Djibouti', country: 'Djibouti' },
    ],
    vehicles: [
        {
            plateNumber: 'ET-TR-1001',
            vin: 'TABVIN1001',
            status: 'in_transit',
            odometerKm: 245000,
            route: 'ADD-DJB',
        },
        {
            plateNumber: 'ET-TR-1002',
            vin: 'TABVIN1002',
            status: 'available',
            odometerKm: 182300,
            route: 'ADD-ADAMA',
        },
    ],
    customers: [
        { code: 'CUST-001', companyName: 'Ethio Import PLC', contactName: 'Abel Tadesse' },
        { code: 'CUST-002', companyName: 'Horn Logistics Trading', contactName: 'Selamawit Kassa' },
    ],
    trips: [
        {
            tripNumber: 'TRIP-2026-0001',
            customerCode: 'CUST-001',
            vehiclePlate: 'ET-TR-1001',
            status: 'in_djibouti',
            isDjiboutiTrip: true,
        },
        {
            tripNumber: 'TRIP-2026-0002',
            customerCode: 'CUST-002',
            vehiclePlate: 'ET-TR-1002',
            status: 'assigned',
            isDjiboutiTrip: false,
        },
    ],
    spareParts: [
        { sku: 'OIL-FLTR-001', name: 'Oil Filter - Fleet Standard', quantityOnHand: 24, reorderLevel: 8 },
        { sku: 'BRAKE-PAD-002', name: 'Brake Pad Kit', quantityOnHand: 10, reorderLevel: 6 },
    ],
};
//# sourceMappingURL=demo.seed.js.map