const { test, expect } = require('@playwright/test');
const { adminBaseUrl } = require('../../helpers/environment');
const { loginAsHQ, loginAsCustomer } = require('../../helpers/auth');
const { buildShipmentFixture } = require('../../fixtures/shipment-fixtures');
const { createQuotedBooking, seedCorridorAndYardFromBooking } = require('../../flows/shipment-lifecycle.flow');

test.describe('Closure @critical', () => {
  test.use({ storageState: 'e2e/.auth/hq.json' });

  test('yard closure workspace renders the active closure controls', async ({ page, browser }) => {
    await loginAsHQ(page);
    const customerContext = await browser.newContext({ storageState: 'e2e/.auth/customer.json' });
    const customerPage = await customerContext.newPage();
    await loginAsCustomer(customerPage);
    const fixture = buildShipmentFixture();
    const bookingRecord = await createQuotedBooking({ page, customerPage, fixture });
    await seedCorridorAndYardFromBooking({ page, bookingRecord });

    await page.goto(`${adminBaseUrl}/operations/dry-port-yard?booking=${encodeURIComponent(bookingRecord.bookingId)}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId(`yard-queue-row-${bookingRecord.bookingId}`)).toBeVisible();
    await expect(page.getByTestId('yard-confirm-arrival')).toBeVisible();
    await expect(page.getByTestId('yard-close-cycle')).toBeVisible();
    await customerContext.close();
  });
});
