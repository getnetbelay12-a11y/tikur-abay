#!/usr/bin/env node

const { spawn } = require('node:child_process');
const { resolve } = require('node:path');

const projectRoot = resolve(__dirname, '..');

const stages = [
  {
    label: 'Local production env validation',
    command: 'node',
    args: ['scripts/validate-env.js', '.env.local-prod'],
  },
  {
    label: 'Production example env validation',
    command: 'node',
    args: ['scripts/validate-env.js', '.env.production.example'],
  },
  {
    label: 'Stage example env validation',
    command: 'node',
    args: ['scripts/validate-env.js', '.env.stage.example'],
  },
  {
    label: 'Backend test suite',
    command: 'pnpm',
    args: ['--filter', '@tikur-abay/backend', 'test'],
  },
  {
    label: 'Web verification',
    command: 'node',
    args: ['scripts/web-verify.js'],
  },
  {
    label: 'Critical corridor lifecycle E2E',
    command: 'pnpm',
    args: ['e2e:critical'],
  },
  {
    label: 'Mobile verification',
    command: 'node',
    args: ['scripts/mobile-verify.js'],
  },
  {
    label: 'Local production image build',
    command: './scripts/prod-build.sh',
    args: [],
  },
];

runChecks().catch((error) => {
  console.error(`Release checklist failed: ${error.message}`);
  process.exit(1);
});

async function runChecks() {
  console.log('Running Tikur Abay local release checklist...');
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
    const child = spawn(stage.command, stage.args, {
      cwd: projectRoot,
      env: process.env,
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

function printSummary(results) {
  console.log('\nRelease checklist summary:');
  for (const result of results) {
    console.log(`- ${result.ok ? 'PASS' : 'FAIL'}: ${result.label} (${result.reason})`);
  }
}
