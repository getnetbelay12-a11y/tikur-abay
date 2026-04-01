const { test, expect } = require('@playwright/test');
const { buildShipmentFixture } = require('../../fixtures/shipment-fixtures');
const { createQuotedBooking, handoffBookingToChinaDesk } = require('../../flows/shipment-lifecycle.flow');
const { loginAsHQ, loginAsCustomer } = require('../../helpers/auth');

test.describe('China Desk Origin @critical', () => {
  test.use({ storageState: 'e2e/.auth/hq.json' });

  test('confirmed booking lands in China queue and can be opened', async ({ page, browser }) => {
    await loginAsHQ(page);
    const customerContext = await browser.newContext({ storageState: 'e2e/.auth/customer.json' });
    const customerPage = await customerContext.newPage();
    await loginAsCustomer(customerPage);

    const fixture = buildShipmentFixture();
    const bookingRecord = await createQuotedBooking({ page, customerPage, fixture });
    const chinaDesk = await handoffBookingToChinaDesk({ page, bookingId: bookingRecord.bookingId });

    await expect(page.getByTestId('china-selected-shipment')).toContainText(bookingRecord.bookingId);
    await customerContext.close();
  });
});
