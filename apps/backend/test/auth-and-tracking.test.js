const test = require('node:test');
const assert = require('node:assert/strict');

test('auth service returns a token for valid demo credentials', async () => {
  process.env.MONGODB_URI = 'mongodb://localhost:27017/tikur_abay_test';
  process.env.JWT_ACCESS_SECRET = 'test-access-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  const mongo = require('../dist/database/mongo.js');
  const models = require('../dist/database/models.js');
  const { AuthService } = require('../dist/modules/auth/auth.service.js');
  const originalConnect = mongo.connectToDatabase;
  const originalCreate = models.RefreshSessionModel.create;
  const originalFindUser = models.UserModel.findOne;
  mongo.connectToDatabase = async () => undefined;
  models.RefreshSessionModel.create = async () => ({});
  models.UserModel.findOne = () => ({
    lean: async () => ({
      _id: 'user-1',
      firstName: 'Super',
      lastName: 'Admin',
      email: 'superadmin@tikurabay.com',
      passwordHash: require('../dist/database/config.js').hashPassword('ChangeMe123!'),
      role: 'super_admin',
      permissions: ['*'],
      branchName: 'Addis Ababa HQ',
      branchId: 'branch-1',
      status: 'active',
    }),
  });
  const service = new AuthService();
  try {
    const result = await service.login({ email: 'superadmin@tikurabay.com', password: 'ChangeMe123!' });
    assert.equal(result.user.role, 'super_admin');
    assert.ok(result.accessToken.split('.').length === 3);
    assert.ok(result.refreshToken.split('.').length === 3);
    assert.ok(result.user.permissions.includes('*'));
  } finally {
    mongo.connectToDatabase = originalConnect;
    models.RefreshSessionModel.create = originalCreate;
    models.UserModel.findOne = originalFindUser;
  }
});

test('gps controller vehicle live endpoint returns service payload', async () => {
  const { GpsController } = require('../dist/modules/gps/gps.controller.js');
  const controller = new GpsController({
    getMapWidgetData: async () => ({ totalVehicles: 0, activeVehicles: 0, delayedVehicles: 0, inDjiboutiVehicles: 0, points: [] }),
    getVehicleLive: async (vehicleId) => ({ vehicleId, status: 'on_road' }),
    getTripHistory: async () => [],
    getOfflineVehicles: async () => [],
  });

  const result = await controller.vehicleLive('VEH-0001');
  assert.equal(result.vehicleId, 'VEH-0001');
  assert.equal(result.status, 'on_road');
});
