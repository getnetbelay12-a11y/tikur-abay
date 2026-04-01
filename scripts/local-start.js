#!/usr/bin/env node

const { existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } = require('node:fs');
const { spawn } = require('node:child_process');
const net = require('node:net');
const { resolve } = require('node:path');

const projectRoot = resolve(__dirname, '..');
const runDir = resolve(projectRoot, '.local/run');
const logDir = resolve(projectRoot, '.local/logs');
const rootEnvPath = resolve(projectRoot, '.env');
const backendEnvPath = resolve(projectRoot, 'apps/backend/.env');

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function run() {
  mkdirSync(runDir, { recursive: true });
  mkdirSync(logDir, { recursive: true });

  for (const command of ['pnpm', 'node', 'curl', 'lsof']) {
    if (!(await commandExists(command))) {
      throw new Error(`Missing required command: ${command}`);
    }
  }

  if (!existsSync(rootEnvPath)) {
    throw new Error('Missing .env. Copy .env.example first.');
  }

  if (!existsSync(backendEnvPath)) {
    throw new Error('Missing apps/backend/.env. Copy apps/backend/.env.example first.');
  }

  for (const port of [6010, 6011, 6012]) {
    if (await isPortListening(port)) {
      throw new Error(`Port ${port} is already in use.`);
    }
  }

  const env = {
    ...process.env,
    ...parseEnv(readFileSync(rootEnvPath, 'utf8')),
    ...parseEnv(readFileSync(backendEnvPath, 'utf8')),
  };
  const extendedHeaderNodeOptions = [env.NODE_OPTIONS, '--max-http-header-size=65536']
    .filter(Boolean)
    .join(' ')
    .trim();
  const localMongoUri = env.LOCAL_MONGODB_URI || 'mongodb://127.0.0.1:27017/tikur_abay_local';
  env.MONGODB_URI = localMongoUri;
  env.MONGO_URI = localMongoUri;

  if (await commandExists('mongod')) {
    await ensureLocalMongo(localMongoUri);
  }

  if (String(env.LOCAL_RESET_NEXT_STATE || 'false').toLowerCase() === 'true') {
    resetNextState(resolve(projectRoot, 'apps/admin'));
    resetNextState(resolve(projectRoot, 'apps/customer-portal'));
  }

  console.log('Starting backend on 127.0.0.1:6012...');
  spawnDetached('backend', ['pnpm', '--filter', '@tikur-abay/backend', 'dev'], {
    ...env,
    NODE_ENV: 'development',
    PORT: '6012',
    FILE_STORAGE_MODE: 'local',
    API_PUBLIC_URL: 'http://127.0.0.1:6012/api/v1',
    LOCAL_STORAGE_DIR: 'var/uploads',
    CORS_ORIGINS: 'http://127.0.0.1:6010,http://127.0.0.1:6011,http://localhost:6010,http://localhost:6011',
  });
  await waitForHttp('http://127.0.0.1:6012/api/v1/health', 'backend health');

  console.log('Starting admin console on 127.0.0.1:6010...');
  spawnDetached('admin', ['pnpm', '--filter', '@tikur-abay/admin', 'dev', '--port', '6010', '--hostname', '0.0.0.0'], {
    ...env,
    NODE_OPTIONS: extendedHeaderNodeOptions,
    NEXT_PUBLIC_API_URL: 'http://127.0.0.1:6012/api/v1',
    NEXT_PUBLIC_API_HEALTH_URL: 'http://127.0.0.1:6012/api/v1/health',
  });

  console.log('Starting customer portal on 127.0.0.1:6011...');
  spawnDetached('customer-portal', ['pnpm', '--filter', '@tikur-abay/customer-portal', 'dev', '--port', '6011', '--hostname', '0.0.0.0'], {
    ...env,
    NODE_OPTIONS: extendedHeaderNodeOptions,
    NEXT_PUBLIC_API_URL: 'http://127.0.0.1:6012/api/v1',
  });

  await waitForHttp('http://127.0.0.1:6010', 'admin console');
  await waitForHttp('http://127.0.0.1:6011', 'customer portal');

  console.log('Seeding local data...');
  try {
    await runForeground(['pnpm', '--filter', '@tikur-abay/backend', 'seed:local'], env);
  } catch (error) {
    console.warn(`Seed skipped: ${error.message}`);
  }

  console.log('System is up:');
  console.log('Admin:    http://127.0.0.1:6010');
  console.log('Customer: http://127.0.0.1:6011');
  console.log('API:      http://127.0.0.1:6012/docs');
  console.log('Logs:     .local/logs/');
}

function resetNextState(appRoot) {
  for (const directory of ['.next', '.next-dev']) {
    const nextDir = resolve(appRoot, directory);
    if (existsSync(nextDir)) {
      rmSync(nextDir, { recursive: true, force: true });
    }
  }
}

function spawnDetached(name, command, env) {
  const logFd = openSync(resolve(logDir, `${name}.log`), 'w');
  const child = spawn(command[0], command.slice(1), {
    cwd: projectRoot,
    env,
    detached: true,
    stdio: ['ignore', logFd, logFd],
  });
  child.unref();
  writeFileSync(resolve(runDir, `${name}.pid`), `${child.pid}\n`);
}

async function ensureLocalMongo(localMongoUri) {
  const mongoPort = Number(new URL(localMongoUri.replace('mongodb://', 'http://')).port || 27017);
  if (await isPortListening(mongoPort)) {
    return;
  }

  const mongoDataDir = resolve('/tmp', 'tikur_abay_mongo');
  mkdirSync(mongoDataDir, { recursive: true });
  console.log(`Starting local MongoDB on 127.0.0.1:${mongoPort}...`);
  spawnDetached('mongo', ['mongod', '--dbpath', mongoDataDir, '--bind_ip', '127.0.0.1', '--port', String(mongoPort)], process.env);
  console.log('Allowing local MongoDB a short warm-up window...');
  await sleep(2000);
}

function runForeground(command, env) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command[0], command.slice(1), {
      cwd: projectRoot,
      env,
      stdio: 'inherit',
    });

    child.on('error', rejectPromise);
    child.on('exit', (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      rejectPromise(new Error(`${command.join(' ')} exited with code ${code ?? 1}`));
    });
  });
}

async function waitForHttp(url, label, attempts = 90) {
  console.log(`Waiting for ${label}...`);
  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {}
    await sleep(2000);
  }

  throw new Error(`${label} did not become ready in time.`);
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
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      accumulator[key] = value;
      return accumulator;
    }, {});
}

function commandExists(command) {
  return new Promise((resolvePromise) => {
    const child = spawn('command', ['-v', command], { shell: true, stdio: 'ignore' });
    child.on('exit', (code) => resolvePromise(code === 0));
    child.on('error', () => resolvePromise(false));
  });
}

function isPortListening(port) {
  return new Promise((resolvePromise) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    socket.once('connect', () => {
      socket.destroy();
      resolvePromise(true);
    });
    socket.once('error', () => {
      resolvePromise(false);
    });
    socket.setTimeout(1000, () => {
      socket.destroy();
      resolvePromise(false);
    });
  });
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}
