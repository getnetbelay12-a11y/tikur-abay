const { test, expect } = require('@playwright/test');
const { adminBaseUrl } = require('../../helpers/environment');
const { buildShipmentFixture } = require('../../fixtures/shipment-fixtures');
const { createQuotedBooking, handoffBookingToChinaDesk, handoffBookingToDjiboutiRelease, handoffBookingToClearance, seedDjiboutiReleaseFromBooking, seedClearanceFromBooking, seedCorridorAndYardFromBooking } = require('../../flows/shipment-lifecycle.flow');
const { loginAsHQ } = require('../../helpers/auth');

async function clickIfEnabled(locator) {
  if (await locator.isEnabled()) {
    await locator.click();
  }
}

test.describe('Booking To Closed Cycle @critical', () => {
  test.use({ storageState: 'e2e/.auth/hq.json' });
  test.setTimeout(90_000);

  test('create intake, approve quote, confirm booking, and progress through release, clearance, dispatch, and yard closure', async ({ page }) => {
    await loginAsHQ(page);

    const fixture = buildShipmentFixture();
    const bookingRecord = await createQuotedBooking({ page, fixture });
    const chinaDesk = await handoffBookingToChinaDesk({ page, bookingId: bookingRecord.bookingId });
    await chinaDesk.fillOriginReadiness();

    await expect(page.getByTestId('china-selected-shipment')).toContainText(bookingRecord.bookingId);

    await seedDjiboutiReleaseFromBooking({ page, bookingRecord });
    const djiboutiRelease = await handoffBookingToDjiboutiRelease({ page, bookingId: bookingRecord.bookingId });
    await djiboutiRelease.processRelease();
    await expect(page.getByTestId('djibouti-selected-shipment')).toContainText('Waiting inland handoff');

    await seedClearanceFromBooking({ page, bookingRecord });
    const clearance = await handoffBookingToClearance({ page, bookingId: bookingRecord.bookingId });
    await clearance.processClearance();
    await expect(page.locator('main')).toContainText('Clearance completed');
    await seedCorridorAndYardFromBooking({ page, bookingRecord });

    await page.goto(`${adminBaseUrl}/operations/corridor-dispatch?booking=${encodeURIComponent(bookingRecord.bookingId)}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId(`dispatch-queue-row-${bookingRecord.bookingId}`)).toBeVisible();
    await page.getByTestId(`dispatch-queue-row-${bookingRecord.bookingId}`).click();
    await expect(page.getByTestId('dispatch-assign-truck')).toBeVisible();
    await expect(page.getByTestId('dispatch-assign-driver')).toBeVisible();
    await expect(page.getByTestId('dispatch-push-pack')).toBeVisible();
    await page.getByTestId('dispatch-assign-truck').click();
    await page.getByTestId('dispatch-assign-driver').click();
    await page.getByTestId('dispatch-push-pack').click();
    await page.getByTestId('dispatch-mark-goods-loaded').click();
    await expect(page.getByTestId('dispatch-confirm-departure')).toBeEnabled();
    await page.getByTestId('dispatch-confirm-departure').click();
    await expect(page.getByTestId('dispatch-confirm-arrived-inland')).toBeEnabled();
    await page.getByTestId('dispatch-confirm-arrived-inland').click();
    await expect(page.getByTestId('dispatch-send-arrival-notice')).toBeEnabled();
    await page.getByTestId('dispatch-send-arrival-notice').click();
    await expect(page.getByTestId('dispatch-confirm-unload-contact')).toBeEnabled();
    await page.getByTestId('dispatch-confirm-unload-contact').click();
    await expect(page.getByTestId('dispatch-push-yard')).toBeEnabled();
    await page.getByTestId('dispatch-push-yard').click();

    await expect(page.getByTestId(`yard-queue-row-${bookingRecord.bookingId}`).first()).toBeVisible();
    await page.getByTestId(`yard-queue-row-${bookingRecord.bookingId}`).first().click();
    await expect(page.getByTestId('yard-confirm-arrival')).toBeVisible();
    await expect(page.getByTestId('yard-close-cycle')).toBeVisible();
    await clickIfEnabled(page.getByTestId('yard-confirm-arrival'));
    await clickIfEnabled(page.getByTestId('yard-confirm-gate-in'));
    await page.getByTestId('yard-start-unload').click();
    await page.getByTestId('yard-complete-unload').click();
    await page.getByTestId('yard-mark-ready-pickup').click();
    await clickIfEnabled(page.getByTestId('yard-prepare-pod'));
    await clickIfEnabled(page.getByTestId('yard-capture-signature'));
    await clickIfEnabled(page.getByTestId('yard-upload-pod'));
    await page.getByLabel('Consignee rep').fill('Solomon Bekele');
    await page.getByLabel('Company').fill('Alem Logistics PLC');
    await page.getByLabel('Contact').fill('+251 900 000 215');
    await page.getByLabel('Receipt note').fill('Received clean with no shortage or damage.');
    await expect(page.getByTestId('yard-mark-goods-received')).toBeEnabled();
    await page.getByTestId('yard-mark-goods-received').click();
    await page.getByTestId('yard-mark-empty-released').click();
    await page.getByTestId('yard-start-empty-return').click();
    await page.getByTestId('yard-confirm-empty-returned').click();
    await page.getByTestId('yard-upload-return-receipt').click();
    await expect(page.locator('main')).toContainText('Cycle closed');
    await expect(page.locator('main')).toContainText('Send thank-you message');
    await page.getByTestId('yard-send-thank-you').click();
    await expect(page.locator('main')).toContainText('Thank-you sent');

    await page.goto(`${adminBaseUrl}/?tab=journey&q=${encodeURIComponent(bookingRecord.bookingId)}`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Shipment Journey/i }).click({ force: true }).catch(() => {});
    await expect(page.getByTestId(`executive-journey-row-${bookingRecord.bookingId}`)).toBeVisible();
    await page.getByTestId(`executive-journey-row-${bookingRecord.bookingId}`).click({ force: true });
    await expect(page.locator('main')).toContainText('Closed');

    await page.getByLabel('Universal container search').fill(bookingRecord.bookingId);
    await page.getByLabel('Universal container search').press('Enter');
    await expect(page).toHaveURL(new RegExp(`\\?tab=journey&query=${encodeURIComponent(bookingRecord.bookingId).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    await expect(page.getByTestId(`executive-journey-row-${bookingRecord.bookingId}`)).toBeVisible();
  });
});
