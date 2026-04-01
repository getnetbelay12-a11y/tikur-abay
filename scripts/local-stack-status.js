#!/usr/bin/env node

const apiBase = process.env.API_BASE_URL || 'http://127.0.0.1:6012/api/v1';
const adminBase = process.env.ADMIN_BASE_URL || 'http://127.0.0.1:6010';
const customerBase = process.env.CUSTOMER_BASE_URL || 'http://127.0.0.1:6011';
const socketBase = process.env.SOCKET_BASE_URL || 'http://127.0.0.1:6012';
const smokeEmail = process.env.SMOKE_EMAIL || 'superadmin@tikurabay.com';
const smokePassword = process.env.SMOKE_PASSWORD || 'ChangeMe123!';

run().catch((error) => {
  console.error(`Local stack status failed: ${error.message}`);
  process.exit(1);
});

async function run() {
  console.log('Tikur Abay local stack status\n');

  const checks = await Promise.all([
    checkJson(candidateUrls(apiBase, 'http://localhost:6012/api/v1').map((url) => `${url}/health`), 'Backend health'),
    checkHttp(candidateUrls(adminBase, 'http://localhost:6010'), 'Admin console'),
    checkHttp(candidateUrls(customerBase, 'http://localhost:6011'), 'Customer portal'),
    checkHttp(candidateUrls(socketBase, 'http://localhost:6012').map((url) => `${url}/socket.io/?EIO=4&transport=polling`), 'Socket.IO endpoint'),
    checkAuthenticatedMetrics(),
  ]);

  for (const check of checks) {
    console.log(`- ${check.ok ? 'OK' : 'FAIL'}: ${check.label}${check.detail ? ` (${check.detail})` : ''}`);
  }
}

async function checkAuthenticatedMetrics() {
  try {
    const loginResponse = await fetchFirstJson(candidateUrls(apiBase, 'http://localhost:6012/api/v1').map((url) => `${url}/auth/login`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: smokeEmail, password: smokePassword }),
    });
    const metricsResponse = await fetchFirstJson(candidateUrls(apiBase, 'http://localhost:6012/api/v1').map((url) => `${url}/metrics`), {
      headers: { Authorization: `Bearer ${loginResponse.payload.accessToken}` },
    });
    return {
      ok: true,
      label: 'Authenticated metrics',
      detail: `generated ${metricsResponse.payload.generatedAt || 'n/a'}`,
    };
  } catch (error) {
    return { ok: false, label: 'Authenticated metrics', detail: error.message };
  }
}

async function checkJson(urls, label) {
  try {
    const response = await fetchFirstJson(urls);
    return {
      ok: true,
      label,
      detail: response.payload.status || response.payload.service || 'reachable',
    };
  } catch (error) {
    return { ok: false, label, detail: error.message };
  }
}

async function checkHttp(urls, label) {
  try {
    const response = await fetchFirst(urls);
    return {
      ok: response.ok,
      label,
      detail: `${response.status}`,
    };
  } catch (error) {
    return { ok: false, label, detail: error.message };
  }
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

async function fetchFirstJson(urls, options) {
  let lastDetail = 'fetch failed';

  for (const url of urls) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        lastDetail = `${response.status}`;
        continue;
      }

      return {
        ok: true,
        status: response.status,
        payload: await response.json(),
      };
    } catch (error) {
      lastDetail = error.message;
    }
  }

  throw new Error(lastDetail);
}
