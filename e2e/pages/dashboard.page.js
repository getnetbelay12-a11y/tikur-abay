const { expect } = require('@playwright/test');
const { adminBaseUrl } = require('../helpers/environment');
const { testIds } = require('../selectors/test-ids');

class DashboardPage {
  constructor(page) {
    this.page = page;
  }

  async open() {
    await this.page.goto(`${adminBaseUrl}/dashboards/executive`, { waitUntil: 'commit' });
    await expect(this.page.getByRole('heading', { name: 'Executive Dashboard' })).toBeVisible();
  }

  async startBooking() {
    const bookingTrigger =
      this.page.getByTestId(testIds.commandBookShipment).or(this.page.getByTestId('executive-tab-book-shipment'));
    await bookingTrigger.click();
  }

  async startQuote() {
    const quoteTrigger =
      this.page.getByTestId(testIds.commandGetQuote).or(this.page.getByTestId('executive-tab-get-quote'));
    await quoteTrigger.click();
  }
}

module.exports = { DashboardPage };
