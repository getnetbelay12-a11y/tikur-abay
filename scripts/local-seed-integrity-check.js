#!/usr/bin/env node

const { existsSync, readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const mongoose = require(resolve(__dirname, '..', 'apps/backend/node_modules/mongoose'));

const projectRoot = resolve(__dirname, '..');

const minimums = {
  branches: 4,
  users: 20,
  employees: 20,
  drivers: 15,
  vehicles: 40,
  customers: 50,
  trips: 100,
  trip_events: 300,
  gps_points: 1000,
  agreements: 40,
  invoices: 50,
  payments: 40,
  maintenance_records: 20,
  driver_reports: 20,
  fuel_logs: 40,
  activity_logs: 100,
  documents: 50,
  customer_profiles: 1,
  driver_profiles: 5,
  driver_kyc_requests: 5,
  candidates: 10,
  communication_logs: 50,
  communication_templates: 20,
  communication_automation_rules: 6,
  communication_drafts: 4,
  communication_schedules: 4,
  notification_events: 4,
  corridor_shipments: 8,
  corridor_cargo_items: 20,
  corridor_documents: 40,
  corridor_containers: 8,
  corridor_trip_assignments: 3,
  corridor_milestones: 40,
};

run().catch((error) => {
  console.error(`Seed integrity check failed: ${error.message}`);
  process.exit(1);
});

async function run() {
  const mongoUri = getMongoUri();
  if (!mongoUri) {
    throw new Error('Missing Mongo connection string. Set MONGODB_URI, MONGO_URI, or create .env / apps/backend/.env.');
  }

  console.log('Running local seed integrity checks...');

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 10_000,
    maxPoolSize: 10,
  });

  try {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Mongo connection is not ready.');
    }

    for (const [collectionName, minimum] of Object.entries(minimums)) {
      const count = await db.collection(collectionName).countDocuments();
      if (count < minimum) {
        throw new Error(`${collectionName} has ${count} rows, expected at least ${minimum}`);
      }
    }

    await assertCount(db, 'users', { email: 'superadmin@tikurabay.com' }, 'seeded super admin');
    await assertCount(db, 'users', { email: 'customer1@tikurabay.com' }, 'seeded customer');
    await assertCount(db, 'users', { email: 'customer2@tikurabay.com' }, 'seeded secondary customer');
    await assertCount(db, 'users', { email: 'driver.demo@tikurabay.com' }, 'seeded driver');
    await assertCount(db, 'users', { email: 'clearance.agent@tikurabay.com' }, 'seeded clearance agent');

    await assertCount(db, 'trips', {
      vehicleId: { $exists: true, $ne: null },
      driverId: { $exists: true, $ne: null },
      customerId: { $exists: true, $ne: null },
    }, 'linked trips');

    await assertCount(db, 'vehicles', {
      currentLocation: { $exists: true },
      currentStatus: { $in: ['available', 'assigned', 'loading', 'on_road', 'offloading', 'in_djibouti', 'under_maintenance', 'blocked', 'offline'] },
    }, 'fleet current-state vehicles');

    await assertCount(db, 'agreements', { status: { $in: ['draft', 'under_review', 'sent_for_signature', 'signed'] } }, 'agreements with active workflow states');
    await assertCount(db, 'invoices', { status: { $in: ['pending', 'partially_paid', 'paid', 'overdue'] } }, 'invoices in finance workflow');
    await assertCount(db, 'activity_logs', { activityType: { $exists: true, $ne: null } }, 'activity feed rows');
    await assertCount(db, 'fuel_logs', { vehicleId: { $exists: true, $ne: null } }, 'fuel logs linked to vehicles');
    await assertCount(db, 'driver_kyc_requests', { status: { $in: ['submitted', 'under_review', 'approved', 'rejected', 'suspended'] } }, 'driver kyc workflow rows');
    await assertCount(db, 'corridor_shipments', { bookingNumber: { $exists: true, $ne: null } }, 'corridor shipments with booking numbers');
    await assertCount(db, 'corridor_shipments', { serviceType: { $in: ['multimodal', 'unimodal'] } }, 'corridor multimodal and unimodal examples');
    await assertCount(db, 'corridor_documents', { documentType: { $exists: true, $ne: null } }, 'corridor documents with types');
    await assertCount(db, 'corridor_trip_assignments', { containerNumber: { $exists: true, $ne: null }, route: { $exists: true, $ne: null } }, 'corridor trips linked to containers and routes');
    await assertCount(db, 'communication_logs', { templateKey: { $exists: true, $ne: null }, recipient: { $exists: true, $ne: null } }, 'communication logs with template and recipient');
    await assertCount(db, 'notifications', { title: { $exists: true, $ne: null }, $or: [{ body: { $exists: true, $ne: null } }, { message: { $exists: true, $ne: null } }] }, 'notifications with title and body');

    console.log('Local seed integrity checks passed.');
  } finally {
    await mongoose.disconnect();
  }
}

async function assertCount(db, collectionName, query, label) {
  const count = await db.collection(collectionName).countDocuments(query);
  if (count === 0) {
    throw new Error(`Missing ${label} in ${collectionName}`);
  }
}

function getMongoUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  if (process.env.MONGO_URI) return process.env.MONGO_URI;

  const envPaths = [resolve(projectRoot, '.env'), resolve(projectRoot, 'apps/backend/.env')];
  for (const envPath of envPaths) {
    if (!existsSync(envPath)) {
      continue;
    }

    const parsed = parseEnv(readFileSync(envPath, 'utf8'));
    if (parsed.MONGODB_URI || parsed.MONGO_URI) {
      return parsed.MONGODB_URI || parsed.MONGO_URI;
    }
  }
  return null;
}

function parseEnv(contents) {
  return contents
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .reduce((accumulator, line) => {
      const separatorIndex = line.indexOf('=');
      if (separatorIndex === -1) {
        return accumulator;
      }

      const key = line.slice(0, separatorIndex).trim();
      let value = line.slice(separatorIndex + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      accumulator[key] = value;
      return accumulator;
    }, {});
}
