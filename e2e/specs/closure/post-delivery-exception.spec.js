const { test, expect } = require('@playwright/test');
const { adminBaseUrl } = require('../../helpers/environment');
const { loginAsHQ } = require('../../helpers/auth');
const { buildShipmentFixture } = require('../../fixtures/shipment-fixtures');
const { createQuotedBooking, seedCorridorAndYardFromBooking } = require('../../flows/shipment-lifecycle.flow');

async function clickIfEnabled(locator) {
  if (await locator.isEnabled()) {
    await locator.click();
  }
}

async function completeYardClosure(page, bookingId) {
  await page.goto(`${adminBaseUrl}/operations/dry-port-yard?booking=${encodeURIComponent(bookingId)}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId(`yard-queue-row-${bookingId}`)).toBeVisible();
  await page.getByTestId(`yard-queue-row-${bookingId}`).click();

  await clickIfEnabled(page.getByTestId('yard-confirm-arrival'));
  await clickIfEnabled(page.getByTestId('yard-confirm-gate-in'));
  await clickIfEnabled(page.getByTestId('yard-start-unload'));
  await clickIfEnabled(page.getByTestId('yard-complete-unload'));
  await clickIfEnabled(page.getByTestId('yard-mark-ready-pickup'));
  await clickIfEnabled(page.getByTestId('yard-prepare-pod'));
  await clickIfEnabled(page.getByTestId('yard-capture-signature'));
  await clickIfEnabled(page.getByTestId('yard-upload-pod'));

  await page.getByLabel('Consignee rep').fill('Solomon Bekele');
  await page.getByLabel('Company').fill('Alem Logistics PLC');
  await page.getByLabel('Contact').fill('+251 900 000 215');
  await page.getByLabel('Receipt note').fill('Received clean with no shortage or damage.');
  await expect(page.getByTestId('yard-mark-goods-received')).toBeEnabled();
  await page.getByTestId('yard-mark-goods-received').click();

  await clickIfEnabled(page.getByTestId('yard-mark-empty-released'));
  await clickIfEnabled(page.getByTestId('yard-start-empty-return'));
  await clickIfEnabled(page.getByTestId('yard-confirm-empty-returned'));
  await clickIfEnabled(page.getByTestId('yard-upload-return-receipt'));

  await clickIfEnabled(page.getByTestId('yard-close-cycle'));
  await expect(page.locator('main')).toContainText('Cycle closed');
}

test.describe('Closure Exceptions @critical', () => {
  test.use({ storageState: 'e2e/.auth/hq.json' });

  test('post-delivery customer issue returns the receipt to review', async ({ page }) => {
    await loginAsHQ(page);
    const fixture = buildShipmentFixture();
    const bookingRecord = await createQuotedBooking({ page, fixture });
    await seedCorridorAndYardFromBooking({ page, bookingRecord });

    await completeYardClosure(page, bookingRecord.bookingId);

    await expect(page.getByTestId('yard-send-thank-you')).toBeEnabled();
    await page.getByTestId('yard-send-thank-you').click();
    await expect(page.locator('main')).toContainText('Thank-you sent');

    await page.getByRole('button', { name: 'Customer reported issue', exact: true }).click();

    await expect(page.locator('main')).toContainText('Post-delivery issue reported after receipt confirmation. Customer support review is required.');
    await expect(page.locator('main')).toContainText('under review');
  });
});
