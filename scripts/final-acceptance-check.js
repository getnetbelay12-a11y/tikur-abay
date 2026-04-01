#!/usr/bin/env node

const { spawnSync } = require('node:child_process');

const requiredSteps = [
  ['pnpm', ['--filter', '@tikur-abay/backend', 'build']],
  ['pnpm', ['--filter', '@tikur-abay/admin', 'build']],
  ['pnpm', ['--filter', '@tikur-abay/customer-portal', 'build']],
  ['flutter', ['analyze'], { cwd: 'apps/driver' }],
  ['pnpm', ['e2e:critical']],
];

let failed = false;

for (const [command, args, extra] of requiredSteps) {
  const label = [command, ...args].join(' ');
  console.log(`\n> ${label}`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    cwd: extra?.cwd || process.cwd(),
    shell: false,
    env: process.env,
  });
  if (result.status !== 0) {
    failed = true;
    console.error(`\nFAILED: ${label}`);
    break;
  }
}

if (failed) {
  process.exit(1);
}

runOptional('pnpm', ['seed:local']);
runOptional('pnpm', ['smoke:seed-integrity']);

console.log('\nFinal acceptance verification completed successfully.');

function runOptional(command, args) {
  const label = [command, ...args].join(' ');
  console.log(`\n> ${label} (optional DB-backed check)`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    cwd: process.cwd(),
    shell: false,
    env: process.env,
  });
  if (result.status !== 0) {
    console.warn(`\nSKIPPED/FAILED OPTIONAL CHECK: ${label}`);
  }
}
