#!/usr/bin/env node

const apiBase = process.env.API_BASE_URL || 'http://127.0.0.1:6012/api/v1';
const adminBase = process.env.ADMIN_BASE_URL || 'http://127.0.0.1:6010';
const customerBase = process.env.CUSTOMER_BASE_URL || 'http://127.0.0.1:6011';
const adminEmail = process.env.SMOKE_EMAIL || 'superadmin@tikurabay.com';
const adminPassword = process.env.SMOKE_PASSWORD || 'ChangeMe123!';
const customerEmail = process.env.CUSTOMER_SMOKE_EMAIL || 'customer1@tikurabay.com';
const customerPassword = process.env.CUSTOMER_SMOKE_PASSWORD || 'ChangeMe123!';

run().catch((error) => {
  console.error(`Web UI check failed: ${error.message}`);
  process.exit(1);
});

async function run() {
  console.log('Running frontend UI smoke checks...');

  await assertHtml(candidateUrls(`${adminBase}/auth/login`, 'http://localhost:6010/auth/login'), ['Tikur Abay', 'Manager Console'], 'admin login page');

  const adminSession = await login(adminEmail, adminPassword);
  const adminCookie = buildAdminCookie(adminSession);

  await assertHtml(candidateUrls(`${adminBase}/`, 'http://localhost:6010/'), ['Loading console...'], 'admin dashboard', adminCookie);
  await assertHtml(candidateUrls(`${adminBase}/operations-status`, 'http://localhost:6010/operations-status'), ['Loading console...'], 'operations status page', adminCookie);

  await assertHtml(candidateUrls(`${customerBase}/`, 'http://localhost:6011/'), ['Tikur Abay Customer Portal', 'Shipment Visibility Dashboard'], 'customer home page');
  await assertHtml(candidateUrls(`${customerBase}/auth/login`, 'http://localhost:6011/auth/login'), ['Customer Portal', 'Sign in'], 'customer login page');

  await login(customerEmail, customerPassword);
  await assertHtml(
    candidateUrls(`${customerBase}/dashboard`, 'http://localhost:6011/dashboard'),
    ['Shipment Visibility Dashboard', 'Start from your live customer workflows'],
    'customer dashboard',
  );

  console.log('Frontend UI smoke checks passed.');
}

async function login(email, password) {
  const response = await fetchFirst(candidateUrls(`${apiBase}/auth/login`, 'http://localhost:6012/api/v1/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(`Login failed for ${email}: ${response.status}`);
  }

  return response.json();
}

function buildAdminCookie(session) {
  return [
    `tikur_abay_token=${session.accessToken}`,
    `tikur_abay_refresh_token=${session.refreshToken}`,
    `tikur_abay_role=${session.user.role}`,
  ].join('; ');
}

async function assertHtml(urls, expectedSnippets, label, cookie) {
  let lastError = `${label} fetch failed`;

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: cookie ? { Cookie: cookie } : undefined,
        redirect: 'follow',
      });

      if (!response.ok) {
        lastError = `${label} returned ${response.status}`;
        continue;
      }

      const html = await response.text();
      const missing = expectedSnippets.filter((snippet) => !html.includes(snippet));
      if (missing.length === 0) {
        return;
      }

      lastError = `${label} did not contain expected content: ${missing.join(', ')}`;
    } catch (error) {
      lastError = error.message;
    }
  }

  throw new Error(lastError);
}

function candidateUrls(primary, secondary) {
  return Array.from(new Set([primary, secondary].filter(Boolean)));
}

async function fetchFirst(urls, options) {
  let lastError = null;

  for (const url of urls) {
    try {
      return await fetch(url, options);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('fetch failed');
}
