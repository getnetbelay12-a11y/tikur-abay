#!/usr/bin/env node

const adminBaseUrl = process.env.ADMIN_BASE_URL || 'http://localhost:6010';
const customerBaseUrl = process.env.CUSTOMER_BASE_URL || 'http://localhost:6011';
const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:6012/api/v1';
const socketBaseUrl = process.env.SOCKET_BASE_URL || 'http://localhost:6012';
const email = process.env.SMOKE_EMAIL || 'superadmin@tikurabay.com';
const password = process.env.SMOKE_PASSWORD || 'ChangeMe123!';

async function main() {
  console.log('Running local smoke checks...');
  await checkReachable(`${apiBaseUrl}/health`, 'backend API');
  await checkReachable(adminBaseUrl, 'admin console');
  await checkReachable(customerBaseUrl, 'customer portal');
  await checkReachable(`${socketBaseUrl}/socket.io/?EIO=4&transport=polling`, 'socket.io endpoint');

  await checkJson(`${apiBaseUrl}/health`, (payload) => {
    assert(payload.status === 'ok', 'health status must be ok');
    assert(payload.database?.connected === true, 'database must be connected');
  }, 'health');

  const login = await postJson(
    `${apiBaseUrl}/auth/login`,
    { email, password },
    (payload) => {
      assert(typeof payload.accessToken === 'string' && payload.accessToken.length > 20, 'access token missing');
      assert(typeof payload.refreshToken === 'string' && payload.refreshToken.length > 20, 'refresh token missing');
      assert(payload.user?.role, 'user role missing');
    },
    'auth login',
  );

  const token = login.accessToken;
  await checkAuthorizedJson(`${apiBaseUrl}/auth/me`, token, (payload) => {
    assert(payload.email === email, 'me endpoint returned unexpected user');
  }, 'auth me');

  await checkAuthorizedJson(`${apiBaseUrl}/dashboard/executive-summary`, token, (payload) => {
    assert(Array.isArray(payload.kpis), 'executive summary kpis missing');
  }, 'executive summary');

  await checkAuthorizedJson(`${apiBaseUrl}/tracking/live-map`, token, (payload) => {
    assert(Array.isArray(payload.points), 'live map points missing');
  }, 'live tracking');

  await checkAuthorizedJson(`${apiBaseUrl}/chat/rooms`, token, (payload) => {
    assert(Array.isArray(payload), 'chat rooms payload must be an array');
  }, 'chat rooms');

  await checkAuthorizedJson(`${apiBaseUrl}/notifications/unread-count`, token, (payload) => {
    assert(typeof payload.count === 'number', 'unread count must be numeric');
  }, 'notifications');

  await checkSocketHandshake(socketBaseUrl, 'socket.io handshake');
  await checkPage(adminBaseUrl, 'admin console');
  await checkPage(customerBaseUrl, 'customer portal');

  console.log('\nSmoke checks passed.');
}

async function checkReachable(url, label) {
  try {
    const response = await fetch(url, { redirect: 'manual' });
    assert(response.status < 500, `${label} responded with ${response.status}`);
  } catch (error) {
    throw new Error(`${label} is not reachable at ${url}: ${error.message}`);
  }
}

async function checkJson(url, validate, label) {
  const response = await fetch(url);
  assert(response.ok, `${label} failed with ${response.status}`);
  const payload = await response.json();
  validate(payload);
  console.log(`ok  ${label}`);
  return payload;
}

async function checkAuthorizedJson(url, token, validate, label) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(response.ok, `${label} failed with ${response.status}`);
  const payload = await response.json();
  validate(payload);
  console.log(`ok  ${label}`);
  return payload;
}

async function postJson(url, body, validate, label) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  assert(response.ok, `${label} failed with ${response.status}`);
  const payload = await response.json();
  validate(payload);
  console.log(`ok  ${label}`);
  return payload;
}

async function checkPage(url, label) {
  const response = await fetch(url, { redirect: 'manual' });
  assert(response.status < 500, `${label} failed with ${response.status}`);
  console.log(`ok  ${label}`);
}

async function checkSocketHandshake(baseUrl, label) {
  const origin = new URL(baseUrl);
  const socketUrl = new URL('/socket.io/', origin);
  socketUrl.searchParams.set('EIO', '4');
  socketUrl.searchParams.set('transport', 'polling');

  const response = await fetch(socketUrl, { redirect: 'manual' });
  assert(response.ok, `${label} failed with ${response.status}`);

  const body = await response.text();
  assert(body.includes('"sid"'), `${label} did not return a socket session id`);
  console.log(`ok  ${label}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

main().catch((error) => {
  console.error(`Smoke check failed: ${error.message}`);
  process.exit(1);
});
