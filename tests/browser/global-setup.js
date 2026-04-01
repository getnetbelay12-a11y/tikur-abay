const { mkdirSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');

module.exports = async function globalSetup() {
  const authDir = resolve(__dirname, '.auth');
  mkdirSync(authDir, { recursive: true });

  await writeAdminState(resolve(authDir, 'admin.json'));
  await writeCustomerState(resolve(authDir, 'customer.json'));
};

async function writeAdminState(pathname) {
  const adminBase = process.env.ADMIN_BASE_URL || 'http://127.0.0.1:6010';
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:6012/api/v1';
  const email = process.env.SMOKE_EMAIL || 'superadmin@tikurabay.com';
  const password = process.env.SMOKE_PASSWORD || 'ChangeMe123!';
  const session = await login(apiBase, email, password);

  writeFileSync(pathname, JSON.stringify({
    cookies: buildCookies(session.user.role, session.accessToken, session.refreshToken),
    origins: [
      {
        origin: adminBase,
        localStorage: [
          { name: 'tikur-abay-admin-token', value: session.accessToken },
          { name: 'tikur-abay-admin-refresh-token', value: session.refreshToken },
          { name: 'tikur-abay-admin-user', value: JSON.stringify(session.user) },
        ],
      },
      {
        origin: 'http://127.0.0.1:6010',
        localStorage: [
          { name: 'tikur-abay-admin-token', value: session.accessToken },
          { name: 'tikur-abay-admin-refresh-token', value: session.refreshToken },
          { name: 'tikur-abay-admin-user', value: JSON.stringify(session.user) },
        ],
      },
    ],
  }, null, 2));
}

async function writeCustomerState(pathname) {
  const customerBase = process.env.CUSTOMER_BASE_URL || 'http://127.0.0.1:6011';
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:6012/api/v1';
  const email = process.env.CUSTOMER_SMOKE_EMAIL || 'customer1@tikurabay.com';
  const password = process.env.CUSTOMER_SMOKE_PASSWORD || 'ChangeMe123!';
  const session = await login(apiBase, email, password);

  writeFileSync(pathname, JSON.stringify({
    cookies: buildCookies(session.user.role, session.accessToken, session.refreshToken),
    origins: [
      {
        origin: customerBase,
        localStorage: [
          { name: 'tikur-abay-customer-token', value: session.accessToken },
          { name: 'tikur-abay-customer-refresh-token', value: session.refreshToken },
          { name: 'tikur-abay-customer-user', value: JSON.stringify(session.user) },
        ],
      },
      {
        origin: 'http://127.0.0.1:6011',
        localStorage: [
          { name: 'tikur-abay-customer-token', value: session.accessToken },
          { name: 'tikur-abay-customer-refresh-token', value: session.refreshToken },
          { name: 'tikur-abay-customer-user', value: JSON.stringify(session.user) },
        ],
      },
    ],
  }, null, 2));
}

async function login(apiBase, email, password) {
  let lastStatus = 0;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const response = await fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    lastStatus = response.status;

    if (response.ok) {
      return response.json();
    }

    // Cold restarts can briefly trigger auth throttling or transient backend warm-up responses.
    if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 9) {
      throw new Error(`Failed to create browser auth state for ${email}: ${response.status}`);
    }

    const waitMs = Math.min(500 * (attempt + 1) * (attempt + 1), 5000);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  throw new Error(`Failed to create browser auth state for ${email}: ${lastStatus}`);
}

function buildCookies(role, accessToken, refreshToken) {
  const now = Math.floor(Date.now() / 1000);
  return [
    {
      name: 'tikur_abay_token',
      value: accessToken,
      domain: 'localhost',
      path: '/',
      expires: now + 86400,
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
    {
      name: 'tikur_abay_refresh_token',
      value: refreshToken,
      domain: 'localhost',
      path: '/',
      expires: now + 2592000,
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
    {
      name: 'tikur_abay_role',
      value: role,
      domain: 'localhost',
      path: '/',
      expires: now + 86400,
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ];
}
