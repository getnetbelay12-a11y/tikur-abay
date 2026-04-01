const { test, expect } = require('@playwright/test');
const { signInAdmin } = require('./helpers/auth');

function controlForLabel(page, label) {
  return page.locator('label').filter({ hasText: label }).locator('input, textarea, select').first();
}

test('generate quote in shipment intake quote mode', async ({ page }) => {
  const consoleMessages = [];
  const pageErrors = [];

  page.on('console', (message) => {
    consoleMessages.push(`[${message.type()}] ${message.text()}`);
  });
  page.on('pageerror', (error) => {
    pageErrors.push(String(error));
  });

  await signInAdmin(page, {
    adminBase: 'http://127.0.0.1:6010',
    apiBase: 'http://127.0.0.1:6012/api/v1',
  });

  await page.goto('http://127.0.0.1:6010/shipments/intake?mode=quote', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="shipment-intake-workspace"]');

  const suffix = Date.now();
  await controlForLabel(page, 'Customer / company name').fill(`Quote Debug ${suffix}`);
  await controlForLabel(page, 'Company name').fill('Quote Debug PLC');
  await controlForLabel(page, 'Customer contact person').fill('Quote Contact');
  await controlForLabel(page, 'Phone').fill('0911111111');
  await controlForLabel(page, 'Email').fill('quote-debug@test.com');
  await controlForLabel(page, 'Origin country').fill('China');
  await controlForLabel(page, 'Origin city / port').fill('Shanghai');
  await controlForLabel(page, 'Destination country').fill('Ethiopia');
  await controlForLabel(page, 'Destination city / port').fill('Addis Ababa');
  await controlForLabel(page, 'Commodity / goods description').fill('Electronics');
  await controlForLabel(page, 'Gross weight').fill('2000');
  await controlForLabel(page, 'Volume (CBM)').fill('10');
  await controlForLabel(page, 'Number of packages').fill('100');
  await controlForLabel(page, 'Cargo ready date').fill('2026-04-01');
  await controlForLabel(page, 'Container quantity').fill('1');

  await page.getByTestId('generate-quote').click();
  await page.waitForTimeout(1500);

  const result = await page.evaluate(() => ({
    url: window.location.href,
    notice: document.querySelector('[data-testid="intake-notice"]')?.textContent || null,
    errors: Array.from(document.querySelectorAll('em')).map((node) => node.textContent),
  }));

  expect(result.url).toContain('/shipments/intake?mode=quote');
  expect(result.notice || '').toContain('Quote');
  expect(result.errors).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(consoleMessages.join('\n')).not.toContain('cannot be a descendant of <button>');
});
