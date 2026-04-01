const test = require('node:test');
const assert = require('node:assert/strict');

test('gps controller liveMap returns map widget summary with scoped branch', async () => {
  const { GpsController } = require('../dist/modules/gps/gps.controller.js');

  let capturedQuery = null;
  const controller = new GpsController({
    getMapWidgetData: async (query) => {
      capturedQuery = query;
      return { totalVehicles: 1, activeVehicles: 1, delayedVehicles: 0, inDjiboutiVehicles: 0, points: [] };
    },
  });

  const result = await controller.liveMap({ vehicleStatus: 'on_road' }, { permissions: [], role: 'operations_manager', branch: 'Adama' });
  assert.equal(capturedQuery.branch, 'Adama');
  assert.equal(result.totalVehicles, 1);
  assert.deepEqual(result.points, []);
});

test('mobile controller KYC status update cascades to user and driver records', async () => {
  const mongo = require('../dist/database/mongo.js');
  const models = require('../dist/database/models.js');
  const { MobileController } = require('../dist/modules/mobile/mobile.controller.js');

  const originalConnect = mongo.connectToDatabase;
  const originals = {
    findOneAndUpdate: models.DriverKycRequestModel.findOneAndUpdate,
    userUpdate: models.UserModel.findByIdAndUpdate,
    profileUpdate: models.DriverProfileModel.findOneAndUpdate,
    driverUpdate: models.DriverModel.findOneAndUpdate,
  };

  const updates = [];

  mongo.connectToDatabase = async () => undefined;
  models.DriverKycRequestModel.findOneAndUpdate = () => ({
    lean: async () => ({ _id: 'kyc-1', userId: 'user-1', status: 'approved' }),
  });
  models.UserModel.findByIdAndUpdate = async (id, update) => {
    updates.push(['user', id, update]);
    return null;
  };
  models.DriverProfileModel.findOneAndUpdate = async (filter, update) => {
    updates.push(['profile', filter, update]);
    return null;
  };
  models.DriverModel.findOneAndUpdate = async (filter, update) => {
    updates.push(['driver', filter, update]);
    return null;
  };

  try {
    const controller = new MobileController();
    const result = await controller.updateDriverKycStatus(
      'kyc-1',
      { email: 'hr@tikurabay.com' },
      { status: 'approved', reviewNotes: 'Verified and activated' },
    );

    assert.equal(result.status, 'approved');
    assert.deepEqual(updates[0], ['user', 'user-1', { $set: { status: 'active' } }]);
    assert.deepEqual(updates[1], ['profile', { userId: 'user-1' }, { $set: { accountState: 'active' } }]);
    assert.deepEqual(updates[2], ['driver', { userId: 'user-1' }, { $set: { status: 'approved' } }]);
  } finally {
    mongo.connectToDatabase = originalConnect;
    models.DriverKycRequestModel.findOneAndUpdate = originals.findOneAndUpdate;
    models.UserModel.findByIdAndUpdate = originals.userUpdate;
    models.DriverProfileModel.findOneAndUpdate = originals.profileUpdate;
    models.DriverModel.findOneAndUpdate = originals.driverUpdate;
  }
});
