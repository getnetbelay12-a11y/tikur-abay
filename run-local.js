const { spawn } = require('child_process');
const path = require('path');

const root = __dirname;

const services = [
  {
    name: 'backend',
    cwd: path.join(root, 'apps', 'backend'),
    cmd: 'npm',
    args: ['run', 'start:dev'],
  },
  {
    name: 'admin-web',
    cwd: path.join(root, 'apps', 'admin-web'),
    cmd: 'npm',
    args: ['run', 'dev'],
  },
  {
    name: 'driver-app',
    cwd: path.join(root, 'apps', 'driver-app'),
    cmd: 'flutter',
    args: ['run'],
  },
];

const children = [];
let shuttingDown = false;

function startService(service) {
  const child = spawn(service.cmd, service.args, {
    cwd: service.cwd,
    env: process.env,
    stdio: 'inherit',
    shell: true,
  });

  children.push(child);

  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return;
    }

    const reason = signal ? `signal ${signal}` : `code ${code}`;
    console.log(`[${service.name}] exited with ${reason}`);
  });

  child.on('error', (error) => {
    console.error(`[${service.name}] failed to start: ${error.message}`);
  });
}

function shutdown() {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log('\nStopping Tikur Abay local services...');

  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGINT');
    }
  }

  setTimeout(() => process.exit(0), 500);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('Starting Tikur Abay local services...');
console.log('Backend: http://localhost:4000/api');
console.log('Admin web: http://localhost:3000');
console.log('Driver app: flutter run');

for (const service of services) {
  startService(service);
}
