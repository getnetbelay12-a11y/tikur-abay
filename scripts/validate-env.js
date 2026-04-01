#!/usr/bin/env node

const { existsSync, readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const target = process.argv[2] || '.env.local-prod';
const envPath = resolve(process.cwd(), target);

if (!existsSync(envPath)) {
  console.error(`Missing env file: ${target}`);
  process.exit(1);
}

const parsed = parseEnv(readFileSync(envPath, 'utf8'));
const exampleProfile = /\.example$/i.test(target);
const required = [
  'NODE_ENV',
  'PORT',
  'MONGODB_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'FRONTEND_URL',
  'API_PUBLIC_URL',
  'FILE_STORAGE_MODE',
  'REDIS_URL',
  'CORS_ORIGINS',
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_API_HEALTH_URL',
];

if ((parsed.FILE_STORAGE_MODE || '').toLowerCase() === 's3') {
  required.push('S3_BUCKET', 'S3_REGION', 'S3_ACCESS_KEY', 'S3_SECRET_KEY');
}

if ((parsed.MAP_PROVIDER || '').toLowerCase() === 'mapbox') {
  required.push('MAPBOX_PUBLIC_TOKEN');
}

const missing = required.filter((key) => {
  if (!parsed[key]) {
    return true;
  }

  if (exampleProfile) {
    return false;
  }

  return isPlaceholder(parsed[key]);
});

if (missing.length > 0) {
  console.error(`Env validation failed for ${target}`);
  for (const key of missing) {
    console.error(`- Missing or placeholder value: ${key}`);
  }
  process.exit(1);
}

const productionLike = ['production', 'staging'].includes(String(parsed.NODE_ENV || '').toLowerCase());
const localProdProfile = /local-prod/.test(target);

if (productionLike) {
  const forbiddenTrueFlags = ['ALLOW_DEBUG_OTP', 'ALLOW_DEMO_SCENARIO_TOOLS'];
  const enabledUnsafeFlags = forbiddenTrueFlags.filter((key) => String(parsed[key] || '').toLowerCase() === 'true');
  if (enabledUnsafeFlags.length > 0) {
    console.error(`Env validation failed for ${target}`);
    for (const key of enabledUnsafeFlags) {
      console.error(`- Unsafe production flag enabled: ${key}`);
    }
    process.exit(1);
  }

  const urlsToCheck = ['FRONTEND_URL', 'API_PUBLIC_URL', 'NEXT_PUBLIC_API_URL', 'NEXT_PUBLIC_API_HEALTH_URL'];
  const invalidLocalUrls = localProdProfile
    ? []
    : urlsToCheck.filter((key) => isLocalUrl(parsed[key]));
  if (invalidLocalUrls.length > 0) {
    console.error(`Env validation failed for ${target}`);
    for (const key of invalidLocalUrls) {
      console.error(`- Production/stage URL points to localhost or 127.0.0.1: ${key}`);
    }
    process.exit(1);
  }

  const corsOrigins = String(parsed.CORS_ORIGINS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (!corsOrigins.includes(parsed.FRONTEND_URL)) {
    console.error(`Env validation failed for ${target}`);
    console.error('- FRONTEND_URL must be included in CORS_ORIGINS');
    process.exit(1);
  }

  if (!localProdProfile && corsOrigins.some((origin) => isLocalUrl(origin))) {
    console.error(`Env validation failed for ${target}`);
    console.error('- CORS_ORIGINS contains localhost/127.0.0.1 in a production/stage profile');
    process.exit(1);
  }
}

console.log(`Env validation passed for ${target}`);

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
      const value = line.slice(separatorIndex + 1).trim();
      accumulator[key] = value;
      return accumulator;
    }, {});
}

function isPlaceholder(value) {
  return /^replace-with/i.test(value) || /example|username:password@cluster/.test(value);
}

function isLocalUrl(value) {
  return /localhost|127\.0\.0\.1/.test(String(value || '').toLowerCase());
}
