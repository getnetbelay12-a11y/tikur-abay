const { test, expect } = require('@playwright/test');
const { adminBaseUrl, customerBaseUrl } = require('../../helpers/environment');
const { loginAsHQ } = require('../../helpers/auth');

test.describe('Language consistency @smoke', () => {
  test.use({ storageState: 'e2e/.auth/hq.json' });

  test('admin defaults to English and switches cleanly between English and Amharic', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.removeItem('tikur-abay-console-language');
      window.localStorage.removeItem('tikur-abay-console-language-explicit');
    });

    await loginAsHQ(page);
    await page.goto(`${adminBaseUrl}/dashboards/executive`, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('body')).toContainText(/Executive Dashboard/i);
    await expect(page.locator('body')).not.toContainText('አጠቃላይ እይታ');
    await expect(page.locator('body')).not.toContainText('አማርኛ');

    await page.evaluate(() => {
      window.localStorage.setItem('tikur-abay-console-language', 'am');
      window.localStorage.setItem('tikur-abay-console-language-explicit', 'true');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });

    await expect(page.locator('body')).toContainText('አጠቃላይ እይታ');

    await page.evaluate(() => {
      window.localStorage.setItem('tikur-abay-console-language', 'en');
      window.localStorage.setItem('tikur-abay-console-language-explicit', 'true');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });

    await expect(page.locator('body')).toContainText(/Executive Dashboard/i);
    await expect(page.locator('body')).not.toContainText('አጠቃላይ እይታ');
  });

  test('customer portal stays English by default', async ({ page }) => {
    await page.goto(`${customerBaseUrl}/`, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('body')).toContainText(/Shipment Visibility Dashboard/i);
    await expect(page.locator('body')).not.toContainText('አማርኛ');
    await expect(page.locator('body')).not.toContainText('የ');
  });
});
