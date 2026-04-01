#!/usr/bin/env node

const { existsSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');

const projectRoot = resolve(__dirname, '..');
const envFile = resolve(projectRoot, '.env');
const backendEnvFile = resolve(projectRoot, 'apps/backend/.env');
const ports = [6010, 6011, 6012];
const apiBase = process.env.API_BASE_URL || 'http://localhost:6012/api/v1';
const adminBase = process.env.ADMIN_BASE_URL || 'http://localhost:6010';
const customerBase = process.env.CUSTOMER_BASE_URL || 'http://localhost:6011';

run().catch((error) => {
  console.error(`Local doctor failed: ${error.message}`);
  process.exit(1);
});

async function run() {
  console.log('Tikur Abay local doctor\n');

  const checks = [
    checkCommand('pnpm'),
    checkCommand('node'),
    checkEnvFile(),
    checkBackendEnvFile(),
    ...ports.map((port) => checkPort(port)),
    await checkHttp(`${apiBase}/health`, 'Backend health'),
    await checkHttp(adminBase, 'Admin console'),
    await checkHttp(customerBase, 'Customer portal'),
  ];

  for (const check of checks) {
    console.log(`- ${check.ok ? 'OK' : 'FAIL'}: ${check.label}${check.detail ? ` (${check.detail})` : ''}`);
  }

  const failed = checks.filter((check) => !check.ok);
  if (failed.length > 0) {
    console.log('\nRecommended next actions:');
    console.log('- If Atlas connectivity is failing, verify the MongoDB Atlas connection string and IP access rules.');
    console.log('- If env validation is failing, review `.env` and `apps/backend/.env`.');
    console.log('- If ports are already occupied, stop conflicting services or run `pnpm local:down`.');
    console.log('- If the stack is not up yet, run `pnpm local:up`.');
  } else {
    console.log('\nLocal stack looks healthy. Use `pnpm status:local` for a quick runtime snapshot or `pnpm prod:verify` for full staged verification.');
  }
}

function checkCommand(command) {
  const result = spawnSync('command', ['-v', command], { shell: true, encoding: 'utf8' });
  return {
    ok: result.status === 0,
    label: `Command ${command}`,
    detail: result.status === 0 ? 'installed' : 'missing',
  };
}

function checkEnvFile() {
  return {
    ok: existsSync(envFile),
    label: '.env',
    detail: existsSync(envFile) ? 'present' : 'missing',
  };
}

function checkBackendEnvFile() {
  return {
    ok: existsSync(backendEnvFile),
    label: 'apps/backend/.env',
    detail: existsSync(backendEnvFile) ? 'present' : 'missing',
  };
}

function checkPort(port) {
  const result = spawnSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN'], { encoding: 'utf8' });
  if (result.status !== 0) {
    return { ok: true, label: `Port ${port}`, detail: 'free' };
  }

  const lines = (result.stdout || '').trim().split('\n').filter(Boolean);
  return {
    ok: true,
    label: `Port ${port}`,
    detail: lines.length > 1 ? 'occupied' : 'free',
  };
}

async function checkHttp(url, label) {
  try {
    const response = await fetch(url);
    return {
      ok: response.ok,
      label,
      detail: `${response.status}`,
    };
  } catch (error) {
    return {
      ok: false,
      label,
      detail: error.message,
    };
  }
}
