#!/usr/bin/env node

const { io } = require('../apps/admin/node_modules/socket.io-client');

const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:6012/api/v1';
const socketBaseUrl = process.env.SOCKET_BASE_URL || 'http://localhost:6012';
const email = process.env.SMOKE_EMAIL || 'superadmin@tikurabay.com';
const password = process.env.SMOKE_PASSWORD || 'ChangeMe123!';

async function main() {
  console.log('Running authenticated realtime verification...');
  await checkReachable(`${apiBaseUrl}/health`, 'backend API');
  await checkReachable(`${socketBaseUrl}/socket.io/?EIO=4&transport=polling`, 'socket.io endpoint');

  const login = await postJson(`${apiBaseUrl}/auth/login`, { email, password });
  assert(typeof login.accessToken === 'string' && login.accessToken.length > 20, 'Missing access token for realtime check');

  await checkSocketConnection(login.accessToken);
  console.log('ok  authenticated realtime');
}

async function checkReachable(url, label) {
  try {
    const response = await fetch(url, { redirect: 'manual' });
    assert(response.status < 500, `${label} responded with ${response.status}`);
  } catch (error) {
    throw new Error(`${label} is not reachable at ${url}: ${error.message}`);
  }
}

async function checkSocketConnection(token) {
  await new Promise((resolvePromise, rejectPromise) => {
    const socket = io(socketBaseUrl, {
      transports: ['websocket', 'polling'],
      auth: { token },
      timeout: 5000,
      reconnection: false,
    });

    const timeout = setTimeout(() => {
      socket.disconnect();
      rejectPromise(new Error('Socket connection timed out'));
    }, 7000);

    socket.on('connect', () => {
      socket.emit('chat:join', { roomId: 'smoke-room' });
      clearTimeout(timeout);
      socket.disconnect();
      resolvePromise(undefined);
    });

    socket.on('connect_error', (error) => {
      clearTimeout(timeout);
      socket.disconnect();
      rejectPromise(new Error(`Socket auth failed: ${error.message}`));
    });
  });
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  assert(response.ok, `POST ${url} failed with ${response.status}`);
  return response.json();
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

main().catch((error) => {
  console.error(`Realtime check failed: ${error.message}`);
  process.exit(1);
});
