#!/usr/bin/env node

const adminBaseUrls = ['http://localhost:6010', 'http://127.0.0.1:6010'];
const apiBaseUrls = ['http://localhost:6012/api/v1', 'http://127.0.0.1:6012/api/v1'];

async function fetchFirst(urls, options) {
  let lastError = new Error('fetch failed');

  for (const url of urls) {
    try {
      return await fetch(url, options);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

function candidateUrls(baseUrls, path) {
  return baseUrls.map((base) => `${base}${path}`);
}

async function login(email, password) {
  const response = await fetchFirst(candidateUrls(apiBaseUrls, '/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(`login failed for ${email}: ${response.status}`);
  }

  return response.json();
}

function buildCookies(session) {
  return [
    `tikur_abay_token=${session.accessToken}`,
    `tikur_abay_refresh_token=${session.refreshToken}`,
    `tikur_abay_role=${session.user.role}`,
  ].join('; ');
}

async function expectPage(path, cookie, label) {
  const response = await fetchFirst(candidateUrls(adminBaseUrls, path), {
    redirect: 'manual',
    headers: { Cookie: cookie },
  });

  if (!response.ok) {
    throw new Error(`${label} failed with ${response.status}`);
  }

  const html = await response.text();
  if (!html.includes('Tikur Abay') && !html.includes('_next')) {
    throw new Error(`${label} did not return expected HTML`);
  }

  console.log(`ok  ${label}`);
}

async function main() {
  console.log('Running focused refactor route checks...');
  const admin = await login('superadmin@tikurabay.com', 'ChangeMe123!');
  const customer = await login('customer1@tikurabay.com', 'ChangeMe123!');
  const adminCookie = buildCookies(admin);
  const customerCookie = buildCookies(customer);

  await expectPage('/dashboards/executive', adminCookie, 'executive dashboard');
  await expectPage('/operations/booking-quote', adminCookie, 'booking quote desk');
  await expectPage('/china-desk/queue', adminCookie, 'china desk queue');
  await expectPage('/operations/djibouti-release', adminCookie, 'djibouti release desk');
  await expectPage('/operations/transitor-clearance', adminCookie, 'transitor clearance desk');
  await expectPage('/operations/corridor-dispatch', adminCookie, 'corridor dispatch desk');
  await expectPage('/operations/dry-port-yard', adminCookie, 'dry port yard desk');
  await expectPage('/customer', customerCookie, 'customer console');
  console.log('Focused refactor route checks passed.');
}

main().catch((error) => {
  console.error(`Focused refactor route check failed: ${error.message}`);
  process.exit(1);
});
