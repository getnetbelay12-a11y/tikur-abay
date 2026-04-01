const test = require('node:test');
const assert = require('node:assert/strict');

test('operations controller exposes fleet decision endpoints', async () => {
  const { OperationsController } = require('../dist/modules/operations/operations.controller.js');

  const fakeService = {
    getFleetSummary: async (_user, branch) => ({ branch, kpis: { totalFleet: 80, availableCars: 14, rentedExternalCars: 6 }, alerts: [{ key: 'blocked_vehicles', count: 3 }] }),
    getAvailableVehicles: async () => [{ vehicleCode: 'VEH-0001', driverPhone: '+251911000001', currentLocation: 'Galafi border', readyForAssignment: true }],
    getUnavailableVehicles: async () => [{ vehicleCode: 'VEH-0002', reason: 'under_maintenance', assignedWorkshop: 'Addis Workshop' }],
    getFuelLogs: async () => ({ summary: { fuelLogsToday: 8 }, logs: [{ vehicle: 'VEH-0001', phone: '+251911000001' }] }),
    getMaintenanceDue: async () => [{ vehicleCode: 'VEH-0003', priority: 'high', currentKm: 48120 }],
    getTireDue: async () => [{ vehicleCode: 'VEH-0004', priority: 'critical' }],
    getPartsHistory: async () => [{ vehicleCode: 'VEH-0005', lastPartReplaced: 'Brake Pad' }],
    getVehicleStatusBoard: async () => ({ counts: { available: 5 }, rows: [{ vehicleCode: 'VEH-0001', driverPhone: '+251911000001', currentLocation: 'Adama yard' }] }),
    getRentalPartnerPerformance: async () => [{ partnerName: 'Abay Rental Logistics', performanceScore: 84, activeTrips: [{ vehicleCode: 'EXT-0001' }] }],
    getRecommendedRentalPartners: async () => [{ partnerName: 'Abay Rental Logistics', recommended: true }],
    createFuelLog: async (_user, body) => ({ ...body, id: 'fuel-1' }),
    createVehicleServiceHistory: async (_user, body) => ({ ...body, id: 'service-1' }),
    createPartReplacement: async (_user, body) => ({ ...body, id: 'part-1' }),
  };

  const controller = new OperationsController(fakeService);
  const user = { role: 'operations_manager', permissions: ['trips:view'], branch: 'Adama' };

  const summary = await controller.fleetSummary(user, 'Dire Dawa');
  const board = await controller.vehicleStatusBoard(user, undefined);
  const recommended = await controller.recommendedRentalPartners(user, undefined);
  const fuelLog = await controller.createFuelLog(user, { vehicleCode: 'VEH-0001', liters: 180 });

  assert.equal(summary.branch, 'Dire Dawa');
  assert.equal(summary.kpis.totalFleet, 80);
  assert.equal(summary.kpis.availableCars, 14);
  assert.equal(board.counts.available, 5);
  assert.equal(board.rows[0].driverPhone, '+251911000001');
  assert.equal(recommended[0].partnerName, 'Abay Rental Logistics');
  assert.equal(fuelLog.id, 'fuel-1');
  assert.equal(fuelLog.liters, 180);
});
