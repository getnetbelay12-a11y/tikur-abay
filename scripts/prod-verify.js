#!/usr/bin/env node

const { spawn } = require('node:child_process');
const { existsSync, readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const projectRoot = resolve(__dirname, '..');
const envFile = resolve(projectRoot, '.env.local-prod');
const rootEnvFile = resolve(projectRoot, '.env');
const backendEnvFile = resolve(projectRoot, 'apps/backend/.env');

if (!existsSync(envFile)) {
  console.error('Missing .env.local-prod. Copy .env.local-prod.example first.');
  process.exit(1);
}

const env = {
  ...process.env,
  ...parseEnv(readFileSync(envFile, 'utf8')),
};

const localEnv = {
  ...(existsSync(rootEnvFile) ? parseEnv(readFileSync(rootEnvFile, 'utf8')) : {}),
  ...(existsSync(backendEnvFile) ? parseEnv(readFileSync(backendEnvFile, 'utf8')) : {}),
};

for (const key of ['LOCAL_MONGODB_URI', 'MONGODB_URI', 'MONGO_URI']) {
  if (localEnv[key]) {
    env[key] = localEnv[key];
  }
}

const stages = [
  { label: 'Production env validation', script: 'scripts/validate-env.js', args: ['.env.local-prod'] },
  { label: 'REST and web smoke', script: 'scripts/local-smoke.js' },
  { label: 'Seed integrity', script: 'scripts/local-seed-integrity-check.js' },
  { label: 'Admin route protection', script: 'scripts/local-admin-route-check.js' },
  { label: 'Frontend UI smoke', script: 'scripts/local-web-ui-check.js' },
  { label: 'Mobile API flows', script: 'scripts/local-mobile-api-check.js' },
  { label: 'Authenticated realtime', script: 'scripts/local-realtime-check.js' },
  { label: 'Auth refresh rotation', script: 'scripts/local-auth-refresh-check.js' },
];

if (process.env.SKIP_BROWSER_VERIFY !== '1') {
  stages.push({ label: 'Browser UI verification', script: 'scripts/browser-verify.js' });
}

runChecks().catch((error) => {
  console.error(`Verification failed: ${error.message}`);
  process.exit(1);
});

async function runChecks() {
  console.log('Running production-style verification against the local stack...');

  const results = [];

  for (const stage of stages) {
    const result = await runStage(stage);
    results.push(result);

    if (!result.ok) {
      printSummary(results);
      process.exit(result.code || 1);
    }
  }

  printSummary(results);
}

function runStage(stage) {
  return new Promise((resolvePromise) => {
    console.log(`\n==> ${stage.label}`);

    const child = spawn('node', [resolve(projectRoot, stage.script), ...(stage.args || [])], {
      cwd: projectRoot,
      env,
      stdio: 'inherit',
    });

    child.on('error', (error) => {
      resolvePromise({
        label: stage.label,
        ok: false,
        code: 1,
        reason: `failed to start: ${error.message}`,
      });
    });

    child.on('exit', (code) => {
      resolvePromise({
        label: stage.label,
        ok: code === 0,
        code: code ?? 1,
        reason: code === 0 ? 'ok' : `exited with code ${code ?? 1}`,
      });
    });
  });
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
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      accumulator[key] = value;
      return accumulator;
    }, {});
}

function printSummary(results) {
  console.log('\nVerification summary:');
  for (const result of results) {
    console.log(`- ${result.ok ? 'PASS' : 'FAIL'}: ${result.label} (${result.reason})`);
  }
}
