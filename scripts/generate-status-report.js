#!/usr/bin/env node

const { existsSync, mkdirSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');

const projectRoot = resolve(__dirname, '..');
const reportsDir = resolve(projectRoot, 'deploy', 'reports');
const timestamp = new Date().toISOString().replace(/[:]/g, '-');
const outputPath = resolve(reportsDir, `status-${timestamp}.md`);

const apiBase = process.env.API_BASE_URL || 'http://localhost:6012/api/v1';
const adminBase = process.env.ADMIN_BASE_URL || 'http://localhost:6010';
const customerBase = process.env.CUSTOMER_BASE_URL || 'http://localhost:6011';
const socketBase = process.env.SOCKET_BASE_URL || 'http://localhost:6012';
const smokeEmail = process.env.SMOKE_EMAIL || 'superadmin@tikurabay.com';
const smokePassword = process.env.SMOKE_PASSWORD || 'ChangeMe123!';

run().catch((error) => {
  console.error(`Status report generation failed: ${error.message}`);
  process.exit(1);
});

async function run() {
  if (!existsSync(reportsDir)) {
    mkdirSync(reportsDir, { recursive: true });
  }

  const checks = await Promise.all([
    checkJson(`${apiBase}/health`, 'Backend health'),
    checkHttp(adminBase, 'Admin console'),
    checkHttp(customerBase, 'Customer portal'),
    checkHttp(`${socketBase}/socket.io/?EIO=4&transport=polling`, 'Socket.IO endpoint'),
    checkAuthenticatedMetrics(),
  ]);

  const contents = `# Tikur Abay Local Status Report

- Generated At: ${new Date().toISOString()}

## Checks

${checks.map((check) => `- ${check.ok ? 'OK' : 'FAIL'}: ${check.label}${check.detail ? ` (${check.detail})` : ''}`).join('\n')}
`;

  writeFileSync(outputPath, contents, 'utf8');
  console.log(`Status report created: ${outputPath}`);
}

async function checkAuthenticatedMetrics() {
  try {
    const loginResponse = await fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: smokeEmail, password: smokePassword }),
    });

    if (!loginResponse.ok) {
      return { ok: false, label: 'Authenticated metrics', detail: `login ${loginResponse.status}` };
    }

    const session = await loginResponse.json();
    const metricsResponse = await fetch(`${apiBase}/metrics`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });

    if (!metricsResponse.ok) {
      return { ok: false, label: 'Authenticated metrics', detail: `metrics ${metricsResponse.status}` };
    }

    const metrics = await metricsResponse.json();
    return {
      ok: true,
      label: 'Authenticated metrics',
      detail: `generated ${metrics.generatedAt || 'n/a'}`,
    };
  } catch (error) {
    return { ok: false, label: 'Authenticated metrics', detail: error.message };
  }
}

async function checkJson(url, label) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { ok: false, label, detail: `${response.status}` };
    }
    const payload = await response.json();
    return {
      ok: true,
      label,
      detail: payload.status || payload.service || 'reachable',
    };
  } catch (error) {
    return { ok: false, label, detail: error.message };
  }
}

async function checkHttp(url, label) {
  try {
    const response = await fetch(url);
    return {
      ok: response.ok,
      label,
      detail: `${response.status}`,
    };
  } catch (error) {
    return { ok: false, label, detail: error.message };
  }
}
