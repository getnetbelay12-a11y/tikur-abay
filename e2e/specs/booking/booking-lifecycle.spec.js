const { test, expect } = require('@playwright/test');
const { buildShipmentFixture } = require('../../fixtures/shipment-fixtures');
const { createQuotedBooking } = require('../../flows/shipment-lifecycle.flow');
const { attachRuntimeMonitor } = require('../../helpers/runtime-monitor');
const { loginAsHQ, loginAsCustomer } = require('../../helpers/auth');

test.describe('Booking Lifecycle @critical', () => {
  test.use({ storageState: 'e2e/.auth/hq.json' });

  test('quote to confirmed booking', async ({ page, browser }) => {
    const runtime = attachRuntimeMonitor(page);
    await loginAsHQ(page);
    const customerContext = await browser.newContext({ storageState: 'e2e/.auth/customer.json' });
    const customerPage = await customerContext.newPage();
    await loginAsCustomer(customerPage);

    const fixture = buildShipmentFixture();
    const bookingRecord = await createQuotedBooking({ page, customerPage, fixture });

    expect(bookingRecord.quoteStatus).toBe('assigned_to_origin');
    expect(bookingRecord.bookingId).toMatch(/^BK-/);
    expect(bookingRecord.convertedToShipmentId).toMatch(/^SHP-/);
    expect(runtime.consoleErrors).toEqual([]);
    expect(runtime.pageErrors).toEqual([]);

    await customerContext.close();
  });
});
