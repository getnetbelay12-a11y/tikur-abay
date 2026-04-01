const test = require('node:test');
const assert = require('node:assert/strict');

test('maintenance controller delegates dashboard and vehicle history calls', async () => {
  const { MaintenanceController } = require('../dist/modules/maintenance/maintenance.controller.js');
  const fakeService = {
    getDashboard: async () => ({ dueCount: 5, tireInspectionDue: 2, overdueCount: 1 }),
    getDue: async () => [],
    getOverdueVehicles: async () => [],
    getBlockedVehicles: async () => [],
    getVehicleHistory: async (vehicleId) => ({ vehicle: { vehicleCode: vehicleId }, timeline: [] }),
    listRepairOrders: async () => [],
    createRepairOrder: async () => ({}),
    getRepairOrder: async () => ({}),
    updateRepairOrderStatus: async () => ({}),
    createPlan: async () => ({}),
    listPlans: async () => [],
    updatePlan: async () => ({}),
    getNotifications: async () => [],
    createNotification: async () => ({}),
    markNotificationRead: async () => ({}),
    getLowStockParts: async () => [],
    getDueVehicles: async () => [],
    getRules: () => [],
  };

  const controller = new MaintenanceController(fakeService);
  const dashboard = await controller.dashboard();
  const history = await controller.vehicleHistory('VEH-0001');
  assert.equal(dashboard.dueCount, 5);
  assert.equal(history.vehicle.vehicleCode, 'VEH-0001');
});

test('performance controller returns employee and driver summary payloads', async () => {
  const { PerformanceController } = require('../dist/modules/hr/performance.controller.js');
  const fakeService = {
    getEmployeeSummary: async () => ({ averageEmployeePerformanceScore: 84, topPerformers: [] }),
    getEmployeePerformance: async () => ({ items: [], total: 0, page: 1, pageSize: 10 }),
    getEmployeeById: async () => ({ employeeCode: 'EMP-001' }),
    getEmployeeActivity: async () => [],
    getEmployeeCustomers: async () => [],
    getEmployeeLoads: async () => [],
    getDriverSummary: async () => ({ averageDriverPerformanceScore: 81, topDrivers: [] }),
    getDriverPerformance: async () => ({ items: [], total: 0, page: 1, pageSize: 10 }),
    getDriverById: async () => ({ driverCode: 'DRV-001' }),
    getDriverTrips: async () => [],
    getDriverCustomers: async () => [],
    getDriverIncidents: async () => [],
    exportCsv: () => '',
  };

  const controller = new PerformanceController(fakeService);
  const employeeSummary = await controller.employeeSummary({});
  const driverSummary = await controller.driverSummary({});
  assert.equal(employeeSummary.averageEmployeePerformanceScore, 84);
  assert.equal(driverSummary.averageDriverPerformanceScore, 81);
});
