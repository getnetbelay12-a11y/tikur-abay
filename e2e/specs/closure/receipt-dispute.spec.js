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

test.describe('Closure Receipt Dispute @critical', () => {
  test.use({ storageState: 'e2e/.auth/hq.json' });

  test('damage or shortage at handoff blocks clean receipt and opens review flow', async ({ page }) => {
    await loginAsHQ(page);
    const fixture = buildShipmentFixture();
    const bookingRecord = await createQuotedBooking({ page, fixture });
    await seedCorridorAndYardFromBooking({ page, bookingRecord });

    await page.goto(`${adminBaseUrl}/operations/dry-port-yard?booking=${encodeURIComponent(bookingRecord.bookingId)}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId(`yard-queue-row-${bookingRecord.bookingId}`)).toBeVisible();
    await page.getByTestId(`yard-queue-row-${bookingRecord.bookingId}`).click();

    await clickIfEnabled(page.getByTestId('yard-confirm-arrival'));
    await clickIfEnabled(page.getByTestId('yard-confirm-gate-in'));
    await clickIfEnabled(page.getByTestId('yard-start-unload'));
    await clickIfEnabled(page.getByTestId('yard-complete-unload'));
    await page.getByTestId('yard-record-damage-shortage').click();
    await clickIfEnabled(page.getByTestId('yard-mark-ready-pickup'));
    await clickIfEnabled(page.getByTestId('yard-prepare-pod'));
    await clickIfEnabled(page.getByTestId('yard-capture-signature'));
    await clickIfEnabled(page.getByTestId('yard-upload-pod'));

    await page.getByLabel('Consignee rep').fill('Solomon Bekele');
    await page.getByLabel('Company').fill('Alem Logistics PLC');
    await page.getByLabel('Contact').fill('+251 900 000 215');
    await page.getByLabel('Receipt note').fill('Damage and shortage reported at handoff.');

    await expect(page.getByTestId('yard-mark-goods-received')).toBeDisabled();
    await expect(page.getByTestId('yard-mark-receipt-under-review')).toBeEnabled();
    await page.getByTestId('yard-mark-receipt-under-review').click();

    await expect(page.locator('main')).toContainText('Damage or shortage reported at customer handoff. Claim review is required.');
    await expect(page.locator('main')).toContainText('under review');
    await expect(page.getByTestId('yard-close-cycle')).toBeDisabled();
  });
});
