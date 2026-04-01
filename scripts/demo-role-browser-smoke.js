#!/usr/bin/env node

const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const { resolve } = require('node:path');
const { chromium } = require('@playwright/test');

const adminBase = process.env.ADMIN_BASE_URL || 'http://127.0.0.1:6010';
const portalBase = process.env.PORTAL_BASE_URL || 'http://127.0.0.1:6011';
const apiBase = process.env.API_BASE_URL || 'http://127.0.0.1:6012/api/v1';
const manifestPath = resolve(__dirname, '..', 'reports', 'demo-scenario-manifest.json');

run().catch((error) => {
  console.error(`Demo browser smoke failed: ${error.message}`);
  process.exit(1);
});

async function run() {
  assert.ok(existsSync(manifestPath), 'reports/demo-scenario-manifest.json is required. Run pnpm demo:load first.');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const scenarioByBooking = new Map(manifest.manifest.scenarios.map((item) => [item.bookingNumber, item]));

  const browser = await chromium.launch({ headless: true });
  try {
    await verifyAdminRole(browser, {
      email: 'superadmin@tikurabay.com',
      password: 'ChangeMe123!',
      route: '/',
      role: 'super_admin',
      expectedText: 'Corridor command summary',
      headingText: 'Executive Dashboard',
    });
    await verifyAdminRole(browser, {
      email: 'supplier.agent@tikurabay.com',
      password: 'ChangeMe123!',
      route: '/operations/supplier-agent',
      role: 'supplier_agent',
    });
    await verifyAdminRole(browser, {
      email: 'djibouti.release@tikurabay.com',
      password: 'ChangeMe123!',
      route: '/operations/djibouti-release',
      role: 'djibouti_release_agent',
    });
    await verifyAdminRole(browser, {
      email: 'clearance.agent@tikurabay.com',
      password: 'ChangeMe123!',
      route: '/operations/transitor-clearance',
      role: 'djibouti_clearing_agent',
    });
    await verifyAdminRole(browser, {
      email: 'dispatch.agent@tikurabay.com',
      password: 'ChangeMe123!',
      route: '/operations/corridor-dispatch',
      role: 'corridor_dispatch_agent',
    });
    await verifyAdminRole(browser, {
      email: 'yard.agent@tikurabay.com',
      password: 'ChangeMe123!',
      route: '/operations/dry-port-yard',
      role: 'dry_port_yard_agent',
    });

    await verifyCustomer(browser, {
      email: 'customer1@tikurabay.com',
      password: 'ChangeMe123!',
      route: '/',
      expectedTexts: ['TIKUR ABAY CUSTOMER PORTAL', 'Shipment Visibility Dashboard', 'Customer1'],
    });
    await verifyCustomer(browser, {
      email: 'customer2@tikurabay.com',
      password: 'ChangeMe123!',
      route: '/',
      expectedTexts: ['TIKUR ABAY CUSTOMER PORTAL', 'Shipment Visibility Dashboard', 'Customer2'],
    });

    console.log('Demo browser smoke passed.');
  } finally {
    await browser.close();
  }
}

async function verifyAdminRole(browser, { email, password, route, role, expectedText, headingText }) {
  const login = await fetch(`${apiBase}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(login.ok, true, `Admin login failed for ${email}`);
  const session = await login.json();

  const context = await browser.newContext();
  await context.addCookies([
    { name: 'tikur_abay_token', value: session.accessToken, url: adminBase },
    { name: 'tikur_abay_refresh_token', value: session.refreshToken, url: adminBase },
    { name: 'tikur_abay_role', value: role, url: adminBase },
  ]);
  await context.addInitScript(({ token, refreshToken, user }) => {
    window.localStorage.setItem('tikur-abay-admin-token', token);
    window.localStorage.setItem('tikur-abay-admin-refresh-token', refreshToken);
    window.localStorage.setItem('tikur-abay-admin-user', JSON.stringify(user));
  }, { token: session.accessToken, refreshToken: session.refreshToken, user: session.user });

  const page = await context.newPage();
  await page.goto(`${adminBase}${route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  assert.ok(page.url().includes(route), `${email} did not stay on ${route}`);
  const content = await page.locator('body').innerText();
  assert.equal(content.includes('Sign in to access your workspace.'), false, `${email} was redirected back to login for ${route}`);
  if (headingText) {
    assert.ok(content.includes(headingText), `${route} does not include ${headingText} for ${email}`);
  }
  if (expectedText) {
    assert.ok(content.includes(expectedText), `${route} does not include ${expectedText} for ${email}`);
  }
  await context.close();
}

async function verifyCustomer(browser, { email, password, route, expectedTexts }) {
  const login = await fetch(`${apiBase}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(login.ok, true, `Customer login failed for ${email}`);

  const context = await browser.newContext();
  await context.addInitScript(({ session }) => {
    window.localStorage.setItem('tikur-abay:customer-portal:session', JSON.stringify(session));
    window.sessionStorage.setItem('tikur-abay:customer-portal:session', JSON.stringify(session));
  }, { session: { email, loggedInAt: new Date().toISOString() } });

  const page = await context.newPage();
  await page.goto(`${portalBase}${route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const content = await page.locator('body').innerText();
  for (const expectedText of expectedTexts) {
    assert.ok(content.includes(expectedText), `${route} does not include ${expectedText} for ${email}`);
  }
  await context.close();
}
