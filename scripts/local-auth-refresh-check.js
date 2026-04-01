#!/usr/bin/env node

const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:6012/api/v1';
const email = process.env.SMOKE_EMAIL || 'superadmin@tikurabay.com';
const password = process.env.SMOKE_PASSWORD || 'ChangeMe123!';

async function main() {
  console.log('Running auth refresh verification...');
  await checkReachable(`${apiBaseUrl}/health`, 'backend API');

  const login = await postJson(`${apiBaseUrl}/auth/login`, { email, password }, 'auth login');
  assert(typeof login.accessToken === 'string' && login.accessToken.length > 20, 'Missing access token');
  assert(typeof login.refreshToken === 'string' && login.refreshToken.length > 20, 'Missing refresh token');

  const unauthorized = await fetch(`${apiBaseUrl}/auth/me`, {
    headers: { Authorization: 'Bearer invalid-access-token' },
  });
  assert(unauthorized.status === 401, `Expected 401 for invalid access token, got ${unauthorized.status}`);
  console.log('ok  access token rejection');

  const refreshed = await postJson(
    `${apiBaseUrl}/auth/refresh-token`,
    { refreshToken: login.refreshToken },
    'auth refresh',
  );
  assert(typeof refreshed.accessToken === 'string' && refreshed.accessToken.length > 20, 'Missing refreshed access token');
  assert(typeof refreshed.refreshToken === 'string' && refreshed.refreshToken.length > 20, 'Missing rotated refresh token');
  assert(refreshed.refreshToken !== login.refreshToken, 'Refresh token was not rotated');
  console.log('ok  refresh token rotation');

  const me = await getAuthorizedJson(`${apiBaseUrl}/auth/me`, refreshed.accessToken, 'auth me after refresh');
  assert(me.email === email, 'Refreshed session returned unexpected user');
  console.log('ok  refreshed session access');
}

async function checkReachable(url, label) {
  try {
    const response = await fetch(url, { redirect: 'manual' });
    assert(response.status < 500, `${label} responded with ${response.status}`);
  } catch (error) {
    throw new Error(`${label} is not reachable at ${url}: ${error.message}`);
  }
}

async function postJson(url, body, label) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  assert(response.ok, `${label} failed with ${response.status}`);
  return response.json();
}

async function getAuthorizedJson(url, token, label) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  assert(response.ok, `${label} failed with ${response.status}`);
  return response.json();
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

main().catch((error) => {
  console.error(`Auth refresh check failed: ${error.message}`);
  process.exit(1);
});
