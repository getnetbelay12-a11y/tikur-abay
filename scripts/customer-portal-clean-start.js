#!/usr/bin/env node

const { existsSync, rmSync } = require('node:fs');
const { resolve } = require('node:path');
const { spawn } = require('node:child_process');

const projectRoot = resolve(__dirname, '..');
const nextDir = resolve(projectRoot, 'apps/customer-portal/.next');

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function run() {
  if (existsSync(nextDir)) {
    rmSync(nextDir, { recursive: true, force: true });
  }

  const portPids = await findPidsOnPort(6011);
  for (const pid of portPids) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {}
  }

  if (portPids.length > 0) {
    await sleep(1200);
  }

  const child = spawn(
    'pnpm',
    ['--filter', '@tikur-abay/customer-portal', 'dev', '--port', '6011', '--hostname', '127.0.0.1'],
    {
      cwd: projectRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        HOSTNAME: '127.0.0.1',
      },
    },
  );

  child.on('exit', (code) => process.exit(code ?? 0));
  child.on('error', (error) => {
    console.error(error.message);
    process.exit(1);
  });
}

function findPidsOnPort(port) {
  return new Promise((resolvePromise) => {
    const child = spawn('lsof', ['-tiTCP:' + port, '-sTCP:LISTEN'], {
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    let stdout = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.on('exit', () => {
      const pids = stdout
        .split('\n')
        .map((line) => Number(line.trim()))
        .filter((value) => Number.isFinite(value) && value > 0);
      resolvePromise(pids);
    });

    child.on('error', () => resolvePromise([]));
  });
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}
