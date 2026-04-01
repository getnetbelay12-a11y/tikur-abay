#!/usr/bin/env node

const { existsSync, readdirSync, rmSync, statSync } = require('node:fs');
const { resolve, join } = require('node:path');

const projectRoot = resolve(__dirname, '..');
const supportRoot = resolve(projectRoot, 'deploy', 'support');
const keep = Number(process.env.SUPPORT_BUNDLE_KEEP || '10');

if (!existsSync(supportRoot)) {
  console.log('No support bundle directory found. Nothing to clean.');
  process.exit(0);
}

const entries = readdirSync(supportRoot)
  .map((name) => {
    const path = join(supportRoot, name);
    return { name, path, mtime: statSync(path).mtimeMs };
  })
  .filter((entry) => statSync(entry.path).isDirectory())
  .sort((left, right) => right.mtime - left.mtime);

if (entries.length <= keep) {
  console.log(`Support bundle cleanup skipped. Found ${entries.length}, keeping ${keep}.`);
  process.exit(0);
}

const toRemove = entries.slice(keep);
for (const entry of toRemove) {
  rmSync(entry.path, { recursive: true, force: true });
  console.log(`Removed old support bundle: ${entry.name}`);
}

console.log(`Support bundle cleanup complete. Kept ${keep}, removed ${toRemove.length}.`);
