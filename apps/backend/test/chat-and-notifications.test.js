const test = require('node:test');
const assert = require('node:assert/strict');

test('chat service sends a persisted message and emits realtime event', async () => {
  const mongo = require('../dist/database/mongo.js');
  const models = require('../dist/database/models.js');
  const { ChatService } = require('../dist/modules/chat/chat.service.js');

  const originalConnect = mongo.connectToDatabase;
  const originals = {
    roomCount: models.ChatRoomModel.countDocuments,
    roomCreate: models.ChatRoomModel.create,
    roomFindById: models.ChatRoomModel.findById,
    messageCreate: models.ChatMessageModel.create,
  };

  const emitted = [];
  const savedRooms = [];
  let messageCreatePayload = null;

  mongo.connectToDatabase = async () => undefined;
  models.ChatRoomModel.countDocuments = async () => 1;
  models.ChatRoomModel.create = async (body) => body;
  models.ChatRoomModel.findById = async (id) => {
    const room = {
      _id: id,
      unreadCount: 0,
      saveCalled: false,
      async save() {
        this.saveCalled = true;
      },
    };
    savedRooms.push(room);
    return room;
  };
  models.ChatMessageModel.create = async (body) => {
    messageCreatePayload = body;
    return {
      _id: 'msg-db-1',
      text: body.text,
      createdAt: '2026-03-12T12:00:00.000Z',
    };
  };

  try {
    const service = new ChatService({
      emitChatMessage(roomId, payload) {
        emitted.push({ roomId, payload });
      },
    });

    const result = await service.sendMessage(
      'room-db-1',
      { text: 'Realtime dispatch update' },
      { id: 'user-1', firstName: 'Dispatch', permissions: [] },
    );

    assert.equal(messageCreatePayload.roomId, 'room-db-1');
    assert.equal(messageCreatePayload.senderUserId, 'user-1');
    assert.equal(messageCreatePayload.text, 'Realtime dispatch update');
    assert.equal(savedRooms[0].unreadCount, 1);
    assert.equal(savedRooms[0].saveCalled, true);
    assert.equal(emitted.length, 1);
    assert.equal(emitted[0].roomId, 'room-db-1');
    assert.equal(result.id, 'msg-db-1');
    assert.equal(result.ownMessage, true);
  } finally {
    mongo.connectToDatabase = originalConnect;
    models.ChatRoomModel.countDocuments = originals.roomCount;
    models.ChatRoomModel.create = originals.roomCreate;
    models.ChatRoomModel.findById = originals.roomFindById;
    models.ChatMessageModel.create = originals.messageCreate;
  }
});

test('notification jobs service falls back to inline processing when redis queue add fails', async () => {
  const mongo = require('../dist/database/mongo.js');
  const models = require('../dist/database/models.js');
  const { NotificationJobsService } = require('../dist/modules/notifications/notification-jobs.service.js');

  const originalConnect = mongo.connectToDatabase;
  const originalUpdate = models.MaintenanceNotificationModel.findByIdAndUpdate;

  const updates = [];
  mongo.connectToDatabase = async () => undefined;
  models.MaintenanceNotificationModel.findByIdAndUpdate = async (id, update) => {
    updates.push({ id, update });
    return null;
  };

  const service = new NotificationJobsService();
  service.ready = true;
  service.queue = {
    add: async () => {
      throw new Error('queue down');
    },
    close: async () => undefined,
  };

  try {
    process.env.REDIS_URL = 'redis://localhost:6379';
    await service.enqueue({ kind: 'maintenance', id: 'maint-1' });
    assert.equal(updates.length, 1);
    assert.equal(updates[0].id, 'maint-1');
    assert.equal(updates[0].update.$set.status, 'sent');
  } finally {
    mongo.connectToDatabase = originalConnect;
    models.MaintenanceNotificationModel.findByIdAndUpdate = originalUpdate;
    delete process.env.REDIS_URL;
  }
});

test('notifications service creates maintenance notifications and enqueues delivery', async () => {
  const mongo = require('../dist/database/mongo.js');
  const models = require('../dist/database/models.js');
  const { NotificationsService } = require('../dist/modules/notifications/notifications.service.js');

  const originalConnect = mongo.connectToDatabase;
  const originals = {
    create: models.MaintenanceNotificationModel.create,
    findById: models.MaintenanceNotificationModel.findById,
  };

  const enqueued = [];
  mongo.connectToDatabase = async () => undefined;
  models.MaintenanceNotificationModel.create = async (body) => ({
    _id: 'mn-db-1',
    ...body,
  });
  models.MaintenanceNotificationModel.findById = () => ({
    lean: async () => ({ _id: 'mn-db-1', status: 'queued', message: 'Tire service due' }),
  });

  try {
    const service = new NotificationsService({
      enqueue: async (job) => {
        enqueued.push(job);
      },
    });

    const result = await service.createMaintenance({ message: 'Tire service due', vehicleId: 'veh-1' });
    assert.equal(enqueued.length, 1);
    assert.deepEqual(enqueued[0], { kind: 'maintenance', id: 'mn-db-1' });
    assert.equal(result.status, 'queued');
  } finally {
    mongo.connectToDatabase = originalConnect;
    models.MaintenanceNotificationModel.create = originals.create;
    models.MaintenanceNotificationModel.findById = originals.findById;
  }
});
