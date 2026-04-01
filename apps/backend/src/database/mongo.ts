import mongoose from 'mongoose';
import { getRuntimeConfig } from './config';

let connectionPromise: Promise<typeof mongoose> | null = null;

export async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (!connectionPromise) {
    const { mongoUri } = getRuntimeConfig();
    connectionPromise = mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10_000,
      maxPoolSize: 20,
    });
  }

  try {
    return await connectionPromise;
  } catch (error) {
    connectionPromise = null;
    throw error;
  }
}

export async function disconnectFromDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  connectionPromise = null;
}

export function databaseHealth() {
  return {
    state: mongoose.connection.readyState,
    connected: mongoose.connection.readyState === 1,
    name: mongoose.connection.db?.databaseName ?? null,
  };
}

