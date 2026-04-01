import { createHash } from 'node:crypto';

export type RuntimeConfig = {
  nodeEnv: string;
  port: number;
  mongoUri: string;
  frontendUrl: string;
  apiPublicUrl: string;
  localStorageDir: string;
  fileStorageMode: string;
  s3Endpoint?: string;
  s3Region?: string;
  s3Bucket?: string;
  s3AccessKey?: string;
  s3SecretKey?: string;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  jwtAccessTtlSeconds: number;
  jwtRefreshTtlSeconds: number;
  mapProvider: string;
  mapboxPublicToken?: string;
  googleMapsApiKey?: string;
};

let cachedConfig: RuntimeConfig | null = null;

export function getRuntimeConfig(): RuntimeConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('Missing MongoDB connection string. Set MONGODB_URI or MONGO_URI.');
  }

  const jwtAccessSecret = process.env.JWT_ACCESS_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
  if (!jwtAccessSecret || !jwtRefreshSecret) {
    throw new Error('Missing JWT secrets. Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET.');
  }

  cachedConfig = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT || 6012),
    mongoUri,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:6010',
    apiPublicUrl: (process.env.API_PUBLIC_URL || `http://localhost:${Number(process.env.PORT || 6012)}/api/v1`).replace(/\/$/, ''),
    localStorageDir: process.env.LOCAL_STORAGE_DIR || 'var/uploads',
    fileStorageMode: process.env.FILE_STORAGE_MODE || 'local',
    s3Endpoint: process.env.S3_ENDPOINT,
    s3Region: process.env.S3_REGION,
    s3Bucket: process.env.S3_BUCKET,
    s3AccessKey: process.env.S3_ACCESS_KEY,
    s3SecretKey: process.env.S3_SECRET_KEY,
    jwtAccessSecret,
    jwtRefreshSecret,
    jwtAccessTtlSeconds: parseDurationToSeconds(process.env.JWT_ACCESS_TTL || '8h'),
    jwtRefreshTtlSeconds: parseDurationToSeconds(process.env.JWT_REFRESH_TTL || '30d'),
    mapProvider: process.env.MAP_PROVIDER || 'leaflet',
    mapboxPublicToken: process.env.MAPBOX_PUBLIC_TOKEN,
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
  };

  return cachedConfig;
}

export function hashPassword(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function parseDurationToSeconds(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d+)([smhd])$/i);
  if (!match) {
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 3600;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
  return amount * multipliers[unit as keyof typeof multipliers];
}
