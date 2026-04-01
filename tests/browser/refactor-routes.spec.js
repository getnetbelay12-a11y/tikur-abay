const { test, expect } = require('@playwright/test');
const { signInAdmin } = require('./helpers/auth');

const adminBase = process.env.ADMIN_BASE_URL || 'http://127.0.0.1:6010';

test.describe('Refactored admin route smoke', () => {
  test('major refactored routes render in browser', async ({ page }) => {
    test.setTimeout(60_000);
    await signInAdmin(page, { adminBase });

    const routes = [
      { path: '/dashboards/executive', text: /Executive Dashboard/i },
      { path: '/operations/booking-quote', text: /Booking \/ Quote Desk/i },
      { path: '/china-desk/queue', text: /China Port Agent Desk/i },
      { path: '/operations/djibouti-release', text: /Djibouti Release/i },
      { path: '/operations/transitor-clearance', text: /Transitor \/ Clearance/i },
      { path: '/operations/corridor-dispatch', text: /Corridor Dispatch/i },
      { path: '/operations/dry-port-yard', text: /Yard \/ Delivery Desk|Dry Port \/ Yard/i },
      { path: '/customer', text: /Customer/i },
    ];

    for (const route of routes) {
      try {
        await page.goto(`${adminBase}${route.path}`, { waitUntil: 'commit' });
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes('ERR_ABORTED')) {
          throw error;
        }
        await page.goto(`${adminBase}${route.path}`, { waitUntil: 'commit' });
      }
      await expect(page.locator('body')).toContainText(route.text, { timeout: 20000 });
    }
  });
});
