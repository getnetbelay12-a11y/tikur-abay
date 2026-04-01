#!/usr/bin/env node

const { spawn } = require('node:child_process');
const { resolve } = require('node:path');

const projectRoot = resolve(__dirname, '..');

const stages = [
  {
    label: 'Local doctor',
    command: 'node',
    args: ['scripts/local-doctor.js'],
  },
  {
    label: 'Local status',
    command: 'node',
    args: ['scripts/local-stack-status.js'],
  },
  {
    label: 'Production-style verification',
    command: 'node',
    args: ['scripts/prod-verify.js'],
    captureBundleOnFailure: true,
  },
];

runChecks().catch((error) => {
  console.error(`Local diagnose failed: ${error.message}`);
  process.exit(1);
});

async function runChecks() {
  console.log('Running Tikur Abay local diagnostics...');
  const results = [];

  for (const stage of stages) {
    const result = await runStage(stage);
    results.push(result);

    if (!result.ok) {
      if (stage.captureBundleOnFailure) {
        const bundleResult = await runSupportBundle();
        results.push(bundleResult);
      }

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

function runSupportBundle() {
  return new Promise((resolvePromise) => {
    console.log('\n==> Support bundle capture');
    const child = spawn('./scripts/local-support-bundle.sh', [], {
      cwd: projectRoot,
      env: process.env,
      stdio: 'inherit',
    });

    child.on('error', (error) => {
      resolvePromise({
        label: 'Support bundle capture',
        ok: false,
        code: 1,
        reason: `failed to start: ${error.message}`,
      });
    });

    child.on('exit', (code) => {
      resolvePromise({
        label: 'Support bundle capture',
        ok: code === 0,
        code: code ?? 1,
        reason: code === 0 ? 'captured' : `exited with code ${code ?? 1}`,
      });
    });
  });
}

function printSummary(results) {
  console.log('\nLocal diagnose summary:');
  for (const result of results) {
    console.log(`- ${result.ok ? 'PASS' : 'FAIL'}: ${result.label} (${result.reason})`);
  }
}
