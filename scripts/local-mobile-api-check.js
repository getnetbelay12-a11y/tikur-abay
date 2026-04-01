#!/usr/bin/env node

const apiBase = process.env.API_BASE_URL || 'http://localhost:6012/api/v1';
const customerEmail = process.env.CUSTOMER_SMOKE_EMAIL || 'customer1@tikurabay.com';
const customerPassword = process.env.CUSTOMER_SMOKE_PASSWORD || 'ChangeMe123!';
const driverEmail = process.env.DRIVER_SMOKE_EMAIL || 'driver.demo@tikurabay.com';
const driverPassword = process.env.DRIVER_SMOKE_PASSWORD || 'ChangeMe123!';

run().catch((error) => {
  console.error(`Mobile API check failed: ${error.message}`);
  process.exit(1);
});

async function run() {
  console.log('Running mobile API flow checks...');

  const customerSession = await login(customerEmail, customerPassword);
  await customerFlow(customerSession);

  const driverSession = await login(driverEmail, driverPassword);
  await driverFlow(driverSession);

  console.log('Mobile API flow checks passed.');
}

async function customerFlow(session) {
  const headers = authHeaders(session.accessToken);

  await requestJson('/auth/me', { headers, label: 'customer auth/me' });
  await requestJson('/me/preferences', { headers, label: 'customer preferences' });
  await requestJson('/me/preferences/language', {
    method: 'PATCH',
    headers,
    body: { language: 'en' },
    label: 'customer language update',
  });
  await requestJson('/fleet/available', { headers, label: 'customer available fleet' });
  await requestJson('/bookings/my', { headers, label: 'customer bookings' });
  await requestJson('/quotes/my', { headers, label: 'customer quotes' });
  await requestJson('/agreements/my', { headers, label: 'customer agreements' });
  await requestJson('/payments/my', { headers, label: 'customer payments' });
}

async function driverFlow(session) {
  const headers = authHeaders(session.accessToken);
  const me = await requestJson('/auth/me', { headers, label: 'driver auth/me' });

  await requestJson('/me/preferences', { headers, label: 'driver preferences' });
  await requestJson(`/driver-kyc/${me.id}`, { headers, label: 'driver kyc' });
  await requestJson('/activity-logs/my', { headers, label: 'driver activity history' });
  await requestJson('/notifications/unread-count', { headers, label: 'driver unread notifications' });

  await requestJson('/activity-logs', {
    method: 'POST',
    headers,
    body: {
      activityType: 'support_request',
      title: 'Smoke activity check',
      description: 'Automated local verification event',
      userId: me.id,
      driverId: me.id,
      entityType: 'driver',
      entityId: me.id,
      metadata: { source: 'local-mobile-api-check' },
    },
    label: 'driver activity create',
  });

  await requestJson('/driver-reports', {
    method: 'POST',
    headers,
    body: {
      driverId: me.id,
      type: 'support_request',
      urgency: 'low',
      description: 'Automated local verification report',
      status: 'submitted',
    },
    label: 'driver report create',
  });

  await requestJson('/documents/upload', {
    method: 'POST',
    headers,
    body: {
      title: 'Smoke Check Receipt',
      entityType: 'driver',
      entityId: me.id,
      category: 'photo',
      fileName: 'smoke-check.jpg',
      mimeType: 'image/jpeg',
      fileSize: 24,
      fileContentBase64: Buffer.from('tikur-abay-smoke-check', 'utf8').toString('base64'),
    },
    label: 'driver document upload',
  });
}

async function login(email, password) {
  const response = await fetch(`${apiBase}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(`Login failed for ${email}: ${response.status}`);
  }

  return response.json();
}

function authHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
}

async function requestJson(path, options) {
  const response = await fetch(`${apiBase}${path}`, {
    method: options.method || 'GET',
    headers: options.headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`${options.label} failed with status ${response.status}`);
  }

  return response.json();
}
