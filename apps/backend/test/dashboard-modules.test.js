const test = require('node:test');
const assert = require('node:assert/strict');

test('gps controller liveMap returns summary payload contract', async () => {
  const { GpsController } = require('../dist/modules/gps/gps.controller.js');
  const controller = new GpsController({
    getMapWidgetData: async (query) => ({
      totalVehicles: 3,
      activeVehicles: 2,
      delayedVehicles: query.tripStatus === 'delayed' ? 1 : 0,
      inDjiboutiVehicles: 1,
      points: [{ vehicleId: 'VEH-0001' }],
    }),
  });

  const result = await controller.liveMap({ tripStatus: 'delayed' }, { permissions: ['*'], role: 'super_admin', branch: 'HQ' });
  assert.equal(result.totalVehicles, 3);
  assert.equal(result.points.length, 1);
  assert.equal(result.delayedVehicles, 1);
});

test('dashboard alias controller returns executive routes from dashboard service', async () => {
  const { DashboardAliasController } = require('../dist/modules/dashboards/dashboard-alias.controller.js');
  const fakeService = {
    getExecutiveSummary: async () => ({ kpis: [{ title: 'Fleet Active', value: 12 }] }),
    getExecutiveActivityFeed: async () => [{ title: 'Vehicle moved', activityType: 'vehicle_status_change' }],
    getExecutiveFuelSummary: async () => ({ fuelLogsToday: 4, latestFuelLogs: [] }),
    getExecutiveDocumentSummary: async () => ({ documentsUploadedToday: 2, latestUploadedDocuments: [] }),
    getExecutiveAgreementSummary: async () => ({ agreementsAwaitingSignature: 3, latestAgreements: [] }),
    getExecutiveCollectionEscalations: async () => [],
    getExecutiveIncidents: async () => [],
  };

  const controller = new DashboardAliasController(fakeService);
  const summary = await controller.executiveSummary();
  const feed = await controller.activityFeed();
  assert.equal(summary.kpis[0].title, 'Fleet Active');
  assert.equal(feed[0].activityType, 'vehicle_status_change');
});
