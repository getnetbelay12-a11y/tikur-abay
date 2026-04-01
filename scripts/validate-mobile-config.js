#!/usr/bin/env node

const { existsSync, readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const target = process.argv[2];

if (!target) {
  console.error('Usage: node scripts/validate-mobile-config.js <config-file>');
  process.exit(1);
}

const configPath = resolve(process.cwd(), 'apps/driver', target);

if (!existsSync(configPath)) {
  console.error(`Missing mobile config file: ${configPath}`);
  console.error('Create it from the matching *.example.json template first.');
  process.exit(1);
}

let parsed;
try {
  parsed = JSON.parse(readFileSync(configPath, 'utf8'));
} catch (error) {
  console.error(`Invalid JSON in ${configPath}: ${error.message}`);
  process.exit(1);
}

const required = ['TIKUR_ABAY_APP_ENV', 'TIKUR_ABAY_API_URL'];
const missing = required.filter((key) => !parsed[key] || typeof parsed[key] !== 'string');

if (missing.length > 0) {
  console.error(`Mobile config validation failed for ${configPath}`);
  for (const key of missing) {
    console.error(`- Missing required key: ${key}`);
  }
  process.exit(1);
}

if (!['local', 'stage', 'production'].includes(parsed.TIKUR_ABAY_APP_ENV)) {
  console.error(`Invalid TIKUR_ABAY_APP_ENV in ${configPath}: ${parsed.TIKUR_ABAY_APP_ENV}`);
  process.exit(1);
}

if (!/^https?:\/\//.test(parsed.TIKUR_ABAY_API_URL)) {
  console.error(`Invalid TIKUR_ABAY_API_URL in ${configPath}: ${parsed.TIKUR_ABAY_API_URL}`);
  process.exit(1);
}

console.log(`Mobile config validation passed for ${configPath}`);
