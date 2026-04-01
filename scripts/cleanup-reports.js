#!/usr/bin/env node

const { existsSync, readdirSync, rmSync, statSync } = require('node:fs');
const { resolve, join } = require('node:path');

const projectRoot = resolve(__dirname, '..');
const reportsRoot = resolve(projectRoot, 'deploy', 'reports');
const keep = Number(process.env.REPORT_KEEP || '20');

if (!existsSync(reportsRoot)) {
  console.log('No report directory found. Nothing to clean.');
  process.exit(0);
}

const entries = readdirSync(reportsRoot)
  .map((name) => {
    const path = join(reportsRoot, name);
    return { name, path, mtime: statSync(path).mtimeMs };
  })
  .filter((entry) => statSync(entry.path).isFile())
  .sort((left, right) => right.mtime - left.mtime);

if (entries.length <= keep) {
  console.log(`Report cleanup skipped. Found ${entries.length}, keeping ${keep}.`);
  process.exit(0);
}

const toRemove = entries.slice(keep);
for (const entry of toRemove) {
  rmSync(entry.path, { force: true });
  console.log(`Removed old report: ${entry.name}`);
}

console.log(`Report cleanup complete. Kept ${keep}, removed ${toRemove.length}.`);
