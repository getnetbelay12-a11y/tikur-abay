#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const projectRoot = path.join(__dirname, '..');

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: false,
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log('Loading Tikur Abay demo scenarios...');
run('./scripts/run-with-local-env.sh', ['pnpm', '--filter', '@tikur-abay/backend', 'seed:local']);
run('./scripts/run-with-local-env.sh', ['node', 'scripts/e2e-cargo-journey.js', '--prepare-only']);
run('./scripts/run-with-local-env.sh', ['node', 'scripts/demo-scenario-verify.js']);
console.log('\nDemo scenarios loaded.');
console.log('Runbook: docs/demo-scenario-runbook.md');
console.log('Manifest: reports/demo-scenario-manifest.json');
