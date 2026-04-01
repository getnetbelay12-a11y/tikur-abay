#!/usr/bin/env node

const { spawn } = require('node:child_process');
const { resolve } = require('node:path');

const projectRoot = resolve(__dirname, '..');
const driverRoot = resolve(projectRoot, 'apps/driver');

const stages = [
  { label: 'Mobile local config', command: 'node', args: ['scripts/validate-mobile-config.js', 'config/local.json'], cwd: projectRoot },
  { label: 'Flutter analyze', command: 'flutter', args: ['analyze'], cwd: driverRoot },
  { label: 'Flutter test', command: 'flutter', args: ['test'], cwd: driverRoot },
];

runChecks().catch((error) => {
  console.error(`Mobile verification failed: ${error.message}`);
  process.exit(1);
});

async function runChecks() {
  console.log('Running mobile verification...');
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
      cwd: stage.cwd,
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
  console.log('\nMobile verification summary:');
  for (const result of results) {
    console.log(`- ${result.ok ? 'PASS' : 'FAIL'}: ${result.label} (${result.reason})`);
  }
}
