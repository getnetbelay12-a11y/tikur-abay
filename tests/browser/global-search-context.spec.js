const { test, expect } = require('@playwright/test');
const { signInAdmin } = require('./helpers/auth');

const adminBase = process.env.ADMIN_BASE_URL || 'http://127.0.0.1:6010';

test.describe('Global search context', () => {
  test('dashboard global search persists selected booking context and activates origin stage', async ({ page }) => {
    await signInAdmin(page, { adminBase });

    await page.goto(`${adminBase}/dashboards/executive`, { waitUntil: 'domcontentloaded' });
    const search = page.getByPlaceholder('Find container / BL / booking from any page');
    await search.fill('BK-260330-022358878');
    await search.press('Enter');

    await expect(page).toHaveURL(/query=BK-260330-022358878/);
    await expect(page).toHaveURL(/booking=BK-260330-022358878/);
    await expect(page.locator('.console-flowbar-brief strong')).toHaveText(/Origin \/ Supplier/i);
    await expect(page.locator('.console-flow-step.is-active strong')).toHaveText(/Origin \/ Supplier/i);
  });

  test('china desk header search writes query and booking context', async ({ page }) => {
    await signInAdmin(page, { adminBase });

    await page.goto(`${adminBase}/china-desk/queue`, { waitUntil: 'domcontentloaded' });
    const search = page.getByPlaceholder('Search shipment, container, supplier');
    await search.fill('BK-260330-022358878');
    await search.press('Enter');

    await expect(page).toHaveURL(/query=BK-260330-022358878/);
    await expect(page).toHaveURL(/booking=BK-260330-022358878/);
  });
});
