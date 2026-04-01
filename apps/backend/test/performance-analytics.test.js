const test = require('node:test');
const assert = require('node:assert/strict');

test('me controller returns dashboard route for authenticated user', async () => {
  const { MeController } = require('../dist/modules/auth/me.controller.js');
  const controller = new MeController({
    dashboardRouteForRole: (role) => (role === 'executive' ? '/dashboards/executive' : '/'),
  });

  const payload = controller.me({
    id: 'user-1',
    firstName: 'Exec',
    lastName: 'User',
    name: 'Exec User',
    email: 'executive@tikurabay.com',
    role: 'executive',
    permissions: [],
    branch: 'HQ',
    branchId: 'branch-1',
    status: 'active',
  });

  assert.equal(payload.dashboardRoute, '/dashboards/executive');
});

test('preferences controller updates language preference', async () => {
  const mongo = require('../dist/database/mongo.js');
  const models = require('../dist/database/models.js');
  const { PreferencesController } = require('../dist/modules/preferences/preferences.controller.js');

  const originalConnect = mongo.connectToDatabase;
  const originalUpdate = models.UserPreferenceModel.findOneAndUpdate;
  mongo.connectToDatabase = async () => undefined;
  models.UserPreferenceModel.findOneAndUpdate = (_filter, update) => ({
    lean: async () => ({ language: update.$set.language }),
  });

  try {
    const controller = new PreferencesController();
    const result = await controller.updateLanguage({ id: 'user-1' }, { language: 'am' });
    assert.equal(result.language, 'am');
  } finally {
    mongo.connectToDatabase = originalConnect;
    models.UserPreferenceModel.findOneAndUpdate = originalUpdate;
  }
});
