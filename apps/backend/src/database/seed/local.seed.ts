export const seededAccounts = [
  { role: 'super_admin', email: 'superadmin@tikurabay.com', password: 'ChangeMe123!' },
  { role: 'executive', email: 'executive@tikurabay.com', password: 'ChangeMe123!' },
  { role: 'operations_manager', email: 'opsmanager@tikurabay.com', password: 'ChangeMe123!' },
  { role: 'supplier_agent', email: 'supplier.agent@tikurabay.com', password: 'ChangeMe123!' },
  { role: 'djibouti_release_agent', email: 'djibouti.release@tikurabay.com', password: 'ChangeMe123!' },
  { role: 'djibouti_clearing_agent', email: 'clearance.agent@tikurabay.com', password: 'ChangeMe123!' },
  { role: 'corridor_dispatch_agent', email: 'dispatch.agent@tikurabay.com', password: 'ChangeMe123!' },
  { role: 'dry_port_yard_agent', email: 'yard.agent@tikurabay.com', password: 'ChangeMe123!' },
  { role: 'finance_customs_control', email: 'finance.customs@tikurabay.com', password: 'ChangeMe123!' },
  { role: 'customer_support_agent', email: 'support.agent@tikurabay.com', password: 'ChangeMe123!' },
  { role: 'dispatcher', email: 'dispatcher@tikurabay.com', password: 'ChangeMe123!' },
  { role: 'technical_manager', email: 'technical@tikurabay.com', password: 'ChangeMe123!' },
  { role: 'finance_officer', email: 'finance@tikurabay.com', password: 'ChangeMe123!' },
  { role: 'hr_officer', email: 'hr@tikurabay.com', password: 'ChangeMe123!' },
  { role: 'marketing_officer', email: 'marketing@tikurabay.com', password: 'ChangeMe123!' },
  { role: 'driver', email: 'driver.demo@tikurabay.com', password: 'ChangeMe123!' },
  { role: 'customer', email: 'customer1@tikurabay.com', password: 'ChangeMe123!' },
  { role: 'customer', email: 'customer2@tikurabay.com', password: 'ChangeMe123!' },
];

export const sampleSeedData = {
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
    { code: 'CUST-001', companyName: 'Abay Logistics PLC', contactName: 'Abel Tadesse' },
    { code: 'CUST-002', companyName: 'Selam Freight Trading', contactName: 'Selamawit Kassa' },
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
