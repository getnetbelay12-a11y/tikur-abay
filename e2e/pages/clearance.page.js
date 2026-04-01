const { expect } = require('@playwright/test');
const { adminBaseUrl } = require('../helpers/environment');
const { testIds } = require('../selectors/test-ids');

class ClearancePage {
  constructor(page) {
    this.page = page;
  }

  async open(bookingId) {
    const encodedBookingId = encodeURIComponent(bookingId);
    const candidateUrls = [
      `${adminBaseUrl}/operations/transitor-clearance?booking=${encodedBookingId}`,
      `${adminBaseUrl}/operations/clearance?booking=${encodedBookingId}`,
    ];

    for (const url of candidateUrls) {
      await this.page.goto(url, { waitUntil: 'domcontentloaded' });
      const queueVisible = await this.page.getByTestId(testIds.clearanceQueue).isVisible().catch(() => false);
      if (queueVisible) {
        await expect(this.page).toHaveURL(/\/operations\/(transitor-clearance|clearance)/);
        return;
      }
    }

    await this.page.goto(`${adminBaseUrl}/`, { waitUntil: 'domcontentloaded' });
    const fallbackLink = this.page
      .locator('a[href="/operations/transitor-clearance"], a[href="/operations/clearance"]')
      .filter({ hasText: /Clearance/i })
      .first();
    await fallbackLink.scrollIntoViewIfNeeded().catch(() => {});
    await Promise.all([
      this.page.waitForURL(/\/operations\/(transitor-clearance|clearance)/, { timeout: 10000 }),
      fallbackLink.click({ force: true }),
    ]);
    await expect(this.page).toHaveURL(/\/operations\/(transitor-clearance|clearance)/);
    await expect(this.page.getByTestId(testIds.clearanceQueue)).toBeVisible();
  }

  async selectShipment(bookingId) {
    const liveQueueRow = this.page.getByTestId(`clearance-live-queue-row-${bookingId}`);
    if (await liveQueueRow.isVisible().catch(() => false)) {
      await liveQueueRow.click({ force: true });
    } else {
      const legacyQueueRow = this.page.getByTestId(`clearance-queue-row-${bookingId}`);
      if (await legacyQueueRow.isVisible().catch(() => false)) {
        await legacyQueueRow.click({ force: true });
      } else {
        const queueByText = this.page.locator('[data-testid="transitor-clearance-queue"] button').filter({ hasText: bookingId }).first();
        if (await queueByText.isVisible().catch(() => false)) {
          await queueByText.click({ force: true });
        }
      }
    }

    await expect(this.page.getByRole('heading', { name: bookingId }).first()).toBeVisible();
  }

  async processClearance() {
    await this.page.getByRole('button', { name: /Acknowledge receipt/i }).click({ force: true });
    await this.page.getByRole('button', { name: /Start clearance/i }).click({ force: true });
    await this.page.getByRole('button', { name: /Complete clearance/i }).click({ force: true });
  }
}

module.exports = { ClearancePage };
