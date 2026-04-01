const { mkdirSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { apiBaseUrl, adminBaseUrl, customerBaseUrl } = require('./environment');

module.exports = async function globalSetup() {
  const authDir = resolve(__dirname, '..', '.auth');
  mkdirSync(authDir, { recursive: true });

  await writeSessionState(resolve(authDir, 'hq.json'), {
    origin: adminBaseUrl,
    email: process.env.SMOKE_EMAIL || 'superadmin@tikurabay.com',
    password: process.env.SMOKE_PASSWORD || 'ChangeMe123!',
    tokenKey: 'tikur-abay-admin-token',
    refreshKey: 'tikur-abay-admin-refresh-token',
    userKey: 'tikur-abay-admin-user',
  });

  await writeSessionState(resolve(authDir, 'customer.json'), {
    origin: customerBaseUrl,
    email: process.env.CUSTOMER_SMOKE_EMAIL || 'customer1@tikurabay.com',
    password: process.env.CUSTOMER_SMOKE_PASSWORD || 'ChangeMe123!',
    tokenKey: 'tikur-abay-customer-token',
    refreshKey: 'tikur-abay-customer-refresh-token',
    userKey: 'tikur-abay-customer-user',
  });
};

async function writeSessionState(pathname, options) {
  const session = await login(options.email, options.password);
  writeFileSync(pathname, JSON.stringify({
    cookies: buildCookies(session.user.role, session.accessToken, session.refreshToken),
    origins: [
      {
        origin: options.origin,
        localStorage: [
          { name: options.tokenKey, value: session.accessToken },
          { name: options.refreshKey, value: session.refreshToken },
          { name: options.userKey, value: JSON.stringify(session.user) },
        ],
      },
    ],
  }, null, 2));
}

async function login(email, password) {
  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create E2E auth state for ${email}: ${response.status}`);
  }

  return response.json();
}

function buildCookies(role, accessToken, refreshToken) {
  const now = Math.floor(Date.now() / 1000);
  return [
    { name: 'tikur_abay_token', value: accessToken, domain: '127.0.0.1', path: '/', expires: now + 86400, httpOnly: false, secure: false, sameSite: 'Lax' },
    { name: 'tikur_abay_refresh_token', value: refreshToken, domain: '127.0.0.1', path: '/', expires: now + 2592000, httpOnly: false, secure: false, sameSite: 'Lax' },
    { name: 'tikur_abay_role', value: role, domain: '127.0.0.1', path: '/', expires: now + 86400, httpOnly: false, secure: false, sameSite: 'Lax' },
  ];
}
