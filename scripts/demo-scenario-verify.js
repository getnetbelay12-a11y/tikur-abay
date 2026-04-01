#!/usr/bin/env node

const { existsSync, readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const mongoose = require(resolve(__dirname, '..', 'apps/backend/node_modules/mongoose'));

const projectRoot = resolve(__dirname, '..');

const scenarios = [
  { bookingNumber: 'TB-DEMO-0001', shipmentId: 'SHP-DEMO-0001', tripId: 'TRP-DEMO-0001', customerCode: 'CUST-0001', expectStage: 'closed' },
  { bookingNumber: 'TB-DEMO-0002', shipmentId: 'SHP-DEMO-0002', tripId: 'TRP-DEMO-0002', customerCode: 'CUST-0002', expectStage: 'empty_return' },
  { bookingNumber: 'TB-DEMO-0003', shipmentId: 'SHP-DEMO-0003', tripId: null, customerCode: 'CUST-0001', expectStage: 'transitor_clearance' },
];

run().catch((error) => {
  console.error(`Demo scenario verification failed: ${error.message}`);
  process.exit(1);
});

async function run() {
  const mongoUri = getMongoUri();
  if (!mongoUri) {
    throw new Error('Missing Mongo connection string.');
  }

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 10_000,
    maxPoolSize: 10,
  });

  try {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Mongo connection is not ready.');
    }

    for (const scenario of scenarios) {
      const shipment = await db.collection('corridor_shipments').findOne({
        shipmentId: scenario.shipmentId,
        bookingNumber: scenario.bookingNumber,
      });
      if (!shipment) {
        throw new Error(`Missing demo shipment ${scenario.shipmentId}`);
      }
      if (shipment.currentStage !== scenario.expectStage) {
        throw new Error(`${scenario.shipmentId} is ${shipment.currentStage}, expected ${scenario.expectStage}`);
      }
      if (shipment.customerCode !== scenario.customerCode && shipment.customerId !== scenario.customerCode) {
        throw new Error(`${scenario.shipmentId} is not linked to ${scenario.customerCode}`);
      }

      const cargoCount = await db.collection('corridor_cargo_items').countDocuments({ shipmentId: scenario.shipmentId });
      if (cargoCount < 4) {
        throw new Error(`${scenario.shipmentId} has ${cargoCount} cargo lines`);
      }

      const documentCount = await db.collection('corridor_documents').countDocuments({ shipmentId: scenario.shipmentId });
      if (documentCount < 6) {
        throw new Error(`${scenario.shipmentId} has ${documentCount} documents`);
      }

      const milestoneCount = await db.collection('corridor_milestones').countDocuments({ shipmentId: scenario.shipmentId });
      if (milestoneCount < 5) {
        throw new Error(`${scenario.shipmentId} has ${milestoneCount} milestones`);
      }

      if (scenario.tripId) {
        const trip = await db.collection('corridor_trip_assignments').findOne({ tripId: scenario.tripId });
        if (!trip) {
          throw new Error(`Missing demo trip ${scenario.tripId}`);
        }
      }
    }

    const requiredUsers = [
      'supplier.agent@tikurabay.com',
      'djibouti.release@tikurabay.com',
      'clearance.agent@tikurabay.com',
      'dispatch.agent@tikurabay.com',
      'yard.agent@tikurabay.com',
      'customer1@tikurabay.com',
      'customer2@tikurabay.com',
      'driver.demo@tikurabay.com',
    ];

    for (const email of requiredUsers) {
      const user = await db.collection('users').findOne({ email });
      if (!user) {
        throw new Error(`Missing demo user ${email}`);
      }
    }

    console.log('Demo scenario verification passed.');
  } finally {
    await mongoose.disconnect();
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
