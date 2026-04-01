const { existsSync, readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { expect } = require('@playwright/test');

async function signInAdmin(page, options = {}) {
  const adminBase = options.adminBase || process.env.ADMIN_BASE_URL || 'http://127.0.0.1:6010';
  const apiBase = options.apiBase || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:6012/api/v1';
  const adminEmail = options.adminEmail || process.env.SMOKE_EMAIL || 'superadmin@tikurabay.com';
  const adminPassword = options.adminPassword || process.env.SMOKE_PASSWORD || 'ChangeMe123!';
  const seededSession = readSeededBrowserSession('admin', adminBase);

  const session = seededSession || (await loginWithRetry(apiBase, adminEmail, adminPassword, 'Admin login bootstrap'));

  await page.goto(`${adminBase}/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((loginSession) => {
    window.localStorage.setItem('tikur-abay-admin-token', loginSession.accessToken);
    window.localStorage.setItem('tikur-abay-admin-refresh-token', loginSession.refreshToken);
    window.localStorage.setItem('tikur-abay-admin-user', JSON.stringify(loginSession.user));
    document.cookie = `tikur_abay_token=${loginSession.accessToken}; path=/; samesite=lax`;
    document.cookie = `tikur_abay_refresh_token=${loginSession.refreshToken}; path=/; samesite=lax`;
    document.cookie = `tikur_abay_role=${loginSession.user.role}; path=/; samesite=lax`;
  }, session);

  await page.goto(`${adminBase}/`, { waitUntil: 'domcontentloaded' });
  await expect(page).not.toHaveURL(/\/auth\/login/);
}

async function signInCustomer(page, options = {}) {
  const customerBase = options.customerBase || process.env.CUSTOMER_BASE_URL || 'http://127.0.0.1:6011';
  await page.goto(`${customerBase}/dashboard`, { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/dashboard$/);
}

function readSeededBrowserSession(kind, origin) {
  const authPath = resolve(__dirname, '..', '.auth', `${kind}.json`);
  if (!existsSync(authPath)) {
    return null;
  }

  const state = JSON.parse(readFileSync(authPath, 'utf8'));
  const localStorage = state.origins?.find((entry) => entry.origin === origin)?.localStorage || state.origins?.[0]?.localStorage || [];
  const accessToken = localStorage.find((entry) => /-token$/.test(entry.name))?.value;
  const refreshToken = localStorage.find((entry) => /-refresh-token$/.test(entry.name))?.value;
  const userValue = localStorage.find((entry) => /-user$/.test(entry.name))?.value;

  if (!accessToken || !refreshToken || !userValue) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
    user: JSON.parse(userValue),
  };
}

async function loginWithRetry(apiBase, email, password, label) {
  let lastStatus = 0;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
      return response.json();
    }

    lastStatus = response.status;
    if (response.status !== 429 || attempt === 2) {
      break;
    }

    await new Promise((resolvePromise) => setTimeout(resolvePromise, 1500 * (attempt + 1)));
  }

  throw new Error(`${label} failed with ${lastStatus}`);
}

module.exports = {
  signInAdmin,
  signInCustomer,
};
