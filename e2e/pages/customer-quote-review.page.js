const { expect } = require('@playwright/test');
const { customerBaseUrl } = require('../helpers/environment');
const { testIds } = require('../selectors/test-ids');
const bookingStorageKey = 'tikur-abay:booking-quote-desk:requests';
const sharedQuoteReviewCollectionCookieKey = 'tikur_abay_quote_reviews';

class CustomerQuoteReviewPage {
  constructor(page) {
    this.page = page;
  }

  async seedQuote(record) {
    await this.page.goto(`${customerBaseUrl}/bookings`, { waitUntil: 'domcontentloaded' });
    await this.page.evaluate(({ collectionKey, key, quote }) => {
      const existing = JSON.parse(window.localStorage.getItem(key) || '[]');
      const next = [quote, ...existing.filter((item) => item.quoteId !== quote.quoteId)];
      window.localStorage.setItem(key, JSON.stringify(next));
      document.cookie = `${collectionKey}=${encodeURIComponent(JSON.stringify(next.slice(0, 40)))}; path=/; max-age=2592000; samesite=lax`;
    }, { collectionKey: sharedQuoteReviewCollectionCookieKey, key: bookingStorageKey, quote: record });
  }

  async open(quoteId) {
    await this.page.goto(`${customerBaseUrl}/quotes/${quoteId}/review`, { waitUntil: 'domcontentloaded' });
    await expect(this.page.getByTestId(testIds.customerQuoteReview)).toBeVisible();
  }

  async openWithSnapshot(record) {
    await this.seedQuote(record);
    await this.page.goto(`${customerBaseUrl}/quotes/${record.quoteId}/review`, { waitUntil: 'domcontentloaded' });
    await expect(this.page.getByTestId(testIds.customerQuoteReview)).toBeVisible();
  }

  async approve(approvedBy = 'E2E Customer') {
    const approveButton = this.page.getByTestId(testIds.customerApproveQuote);
    if (await approveButton.isDisabled().catch(() => false)) {
      return;
    }
    await approveButton.click();
    const detailsCheckbox = this.page.getByRole('checkbox', { name: /shipment details and quoted services are correct/i });
    const proceedCheckbox = this.page.getByRole('checkbox', { name: /agree to proceed with booking/i });
    if (await detailsCheckbox.isVisible().catch(() => false)) {
      await detailsCheckbox.check();
      await proceedCheckbox.check();
      await this.page.locator('label').filter({ hasText: 'Approved by' }).locator('input').fill(approvedBy);
      await this.page.getByTestId(testIds.customerConfirmApproval).click();
      await expect(this.page.getByText(/quote has been approved/i)).toBeVisible();
    }
  }

  async requestRevision(comment = 'Please revise the quote.') {
    await this.page.getByTestId(testIds.customerRequestRevision).click();
    await this.page.getByRole('textbox').last().fill(comment);
    await this.page.getByTestId(testIds.customerSubmitRevision).click();
  }
}

module.exports = { CustomerQuoteReviewPage };
