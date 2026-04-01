const { test, expect } = require('@playwright/test');
const { adminBaseUrl } = require('../../helpers/environment');
const { loginAsHQ } = require('../../helpers/auth');

test.describe('Refactor route smoke @smoke', () => {
  test.use({ storageState: 'e2e/.auth/hq.json' });

  test('major refactored admin routes render', async ({ page }) => {
    await loginAsHQ(page);

    const routes = [
      { path: '/dashboards/executive', text: /Executive Dashboard/i },
      { path: '/operations/booking-quote', text: /Booking \/ Quote Desk/i },
      { path: '/china-desk/queue', text: /China Port Agent Desk/i },
      { path: '/operations/djibouti-release', text: /Djibouti Release/i },
      { path: '/operations/transitor-clearance', text: /Transitor \/ Clearance/i },
      { path: '/operations/corridor-dispatch', text: /Corridor Dispatch/i },
      { path: '/operations/dry-port-yard', text: /Dry Port \/ Yard/i },
    ];

    for (const route of routes) {
      await page.goto(`${adminBaseUrl}${route.path}`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('body')).toContainText(route.text);
    }
  });
});
