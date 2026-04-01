#!/usr/bin/env node

const { spawn } = require('node:child_process');
const { resolve } = require('node:path');

const projectRoot = resolve(__dirname, '..');

const stages = [
  {
    label: 'Local shutdown',
    command: './stop-local.sh',
    args: [],
  },
  {
    label: 'Local startup',
    command: './start-local.sh',
    args: [],
  },
  {
    label: 'Local status snapshot',
    command: 'node',
    args: ['scripts/local-stack-status.js'],
  },
];

runChecks().catch((error) => {
  console.error(`Local restart failed: ${error.message}`);
  process.exit(1);
});

async function runChecks() {
  console.log('Running Tikur Abay local restart...');
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
  console.log('\nLocal restart summary:');
  for (const result of results) {
    console.log(`- ${result.ok ? 'PASS' : 'FAIL'}: ${result.label} (${result.reason})`);
  }
}
