#!/usr/bin/env node

const adminBaseUrl = process.env.ADMIN_BASE_URL || 'http://localhost:6010';
const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:6012/api/v1';
const adminEmail = process.env.SMOKE_EMAIL || 'superadmin@tikurabay.com';
const adminPassword = process.env.SMOKE_PASSWORD || 'ChangeMe123!';
const customerEmail = process.env.SMOKE_CUSTOMER_EMAIL || 'customer1@tikurabay.com';
const customerPassword = process.env.SMOKE_CUSTOMER_PASSWORD || 'ChangeMe123!';

async function main() {
  console.log('Running admin route checks...');

  await expectRedirect(`${adminBaseUrl}/`, '/auth/login', 'anonymous dashboard redirect');
  await expectRedirect(`${adminBaseUrl}/operations-status`, '/auth/login', 'anonymous operations status redirect');

  const adminLogin = await login(adminEmail, adminPassword);
  await expectPageWithCookies(
    `${adminBaseUrl}/`,
    buildCookies(adminLogin.accessToken, adminLogin.refreshToken, adminLogin.user.role),
    'admin dashboard route',
  );
  await expectPageWithCookies(
    `${adminBaseUrl}/operations-status`,
    buildCookies(adminLogin.accessToken, adminLogin.refreshToken, adminLogin.user.role),
    'admin operations status route',
  );
  await expectRedirectWithCookies(
    `${adminBaseUrl}/customer`,
    buildCookies(adminLogin.accessToken, adminLogin.refreshToken, adminLogin.user.role),
    '/',
    'admin blocked from customer route',
  );

  const customerLogin = await login(customerEmail, customerPassword);
  await expectRedirectWithCookies(
    `${adminBaseUrl}/operations-status`,
    buildCookies(customerLogin.accessToken, customerLogin.refreshToken, customerLogin.user.role),
    '/customer',
    'customer blocked from operations status',
  );

  console.log('\nAdmin route checks passed.');
}

async function login(email, password) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${apiBaseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
      return response.json();
    }

    if (response.status !== 429 || attempt === 3) {
      throw new Error(`login failed for ${email} with ${response.status}`);
    }

    await sleep(1500 * (attempt + 1));
  }
}

function buildCookies(accessToken, refreshToken, role) {
  return [
    `tikur_abay_token=${accessToken}`,
    `tikur_abay_refresh_token=${refreshToken}`,
    `tikur_abay_role=${role}`,
  ].join('; ');
}

async function expectRedirect(url, expectedPath, label) {
  const response = await fetch(url, { redirect: 'manual' });
  assert(response.status >= 300 && response.status < 400, `${label} expected redirect, got ${response.status}`);
  const location = response.headers.get('location') || '';
  assert(location.includes(expectedPath), `${label} redirected to unexpected location: ${location}`);
  console.log(`ok  ${label}`);
}

async function expectRedirectWithCookies(url, cookie, expectedPath, label) {
  const response = await fetch(url, {
    redirect: 'manual',
    headers: { Cookie: cookie },
  });
  assert(response.status >= 300 && response.status < 400, `${label} expected redirect, got ${response.status}`);
  const location = response.headers.get('location') || '';
  assert(location.includes(expectedPath), `${label} redirected to unexpected location: ${location}`);
  console.log(`ok  ${label}`);
}

async function expectPageWithCookies(url, cookie, label) {
  const response = await fetch(url, {
    redirect: 'manual',
    headers: { Cookie: cookie },
  });
  assert(response.ok, `${label} failed with ${response.status}`);
  const html = await response.text();
  assert(html.includes('Tikur Abay') || html.includes('_next'), `${label} did not return expected HTML`);
  console.log(`ok  ${label}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

main().catch((error) => {
  console.error(`Admin route check failed: ${error.message}`);
  process.exit(1);
});
