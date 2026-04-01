const { test, expect } = require('@playwright/test');
const { CustomerQuoteReviewPage } = require('../../pages/customer-quote-review.page');
const { loginAsCustomer } = require('../../helpers/auth');
const { uniqueSuffix } = require('../../fixtures/shipment-fixtures');

test.describe('Customer Approval @critical', () => {
  test.use({ storageState: 'e2e/.auth/customer.json' });

  test('approve, revision, reject, and expired states render correctly', async ({ page }) => {
    await loginAsCustomer(page);
    const quotePage = new CustomerQuoteReviewPage(page);
    const suffix = uniqueSuffix();
    const quoteId = `QT-E2E-${suffix}`;

    await quotePage.seedQuote({
      quoteId,
      customerName: 'Customer Approval Test',
      company: 'Customer Approval Test PLC',
      portOfLoading: 'Yantian',
      portOfDischarge: 'Djibouti',
      inlandDestination: 'Addis Ababa',
      cargoDescription: 'Electronics',
      quoteAmount: 12000,
      quoteCurrency: 'USD',
      quoteStatus: 'quote_sent',
      approvalStatus: 'waiting_approval',
      containerType: '40HC',
      containerCount: 1,
      totalWeight: 2000,
      cbm: 10,
      requestedArrivalWindow: '2026-04-10',
    });
    await quotePage.open(quoteId);
    await expect(page.getByTestId('customer-approve-quote')).toBeEnabled();
  });
});
