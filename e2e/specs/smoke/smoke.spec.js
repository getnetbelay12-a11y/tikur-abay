const { test, expect } = require('@playwright/test');
const { adminBaseUrl, customerBaseUrl } = require('../../helpers/environment');
const { DashboardPage } = require('../../pages/dashboard.page');
const { ShipmentIntakePage } = require('../../pages/shipment-intake.page');
const { CustomerQuoteReviewPage } = require('../../pages/customer-quote-review.page');
const { loginAsHQ, loginAsCustomer } = require('../../helpers/auth');

test.describe('Smoke Suite @smoke', () => {
  test.use({ storageState: 'e2e/.auth/hq.json' });

  test('dashboard and intake routes render', async ({ page }) => {
    await loginAsHQ(page);
    const dashboard = new DashboardPage(page);
    await dashboard.open();
    await dashboard.startBooking();
    await expect(page).toHaveURL(/\/shipments\/intake\?mode=booking/);
    const intake = new ShipmentIntakePage(page);
    await expect(page.getByTestId('shipment-intake-workspace')).toBeVisible();
    await intake.open('quote');
    await expect(page).toHaveURL(/mode=quote/);
  });

  test('customer quote review route renders', async ({ browser }) => {
    const context = await browser.newContext({ storageState: 'e2e/.auth/customer.json' });
    const page = await context.newPage();
    await loginAsCustomer(page);
    const quoteReview = new CustomerQuoteReviewPage(page);
    await quoteReview.seedQuote({
      quoteId: 'QT-260325-001',
      customerName: 'Smoke Customer',
      company: 'Smoke Customer PLC',
      consigneeName: 'Smoke Consignee',
      phone: '+251911000001',
      email: 'smoke@test.com',
      serviceType: 'multimodal',
      portOfLoading: 'Shanghai',
      portOfDischarge: 'Djibouti',
      inlandDestination: 'Adama Dry Port',
      finalDeliveryLocation: 'Addis Ababa',
      cargoDescription: 'Smoke test cargo',
      commoditySummary: 'Electronics',
      quoteAmount: 42000,
      quoteCurrency: 'USD',
      quoteStatus: 'quote_sent',
      approvalStatus: 'waiting_approval',
      containerType: '40HC',
      containerCount: 1,
      totalWeight: 2000,
      cbm: 10,
      requestedArrivalWindow: '2026-04-02',
      earliestDepartureDate: '2026-03-30',
      incoterm: 'CIF',
      specialHandlingNote: '',
    });
    await quoteReview.openWithSnapshot({
      quoteId: 'QT-260325-001',
      customerName: 'Smoke Customer',
      company: 'Smoke Customer PLC',
      consigneeName: 'Smoke Consignee',
      phone: '+251911000001',
      email: 'smoke@test.com',
      serviceType: 'multimodal',
      portOfLoading: 'Shanghai',
      portOfDischarge: 'Djibouti',
      inlandDestination: 'Adama Dry Port',
      finalDeliveryLocation: 'Addis Ababa',
      cargoDescription: 'Smoke test cargo',
      commoditySummary: 'Electronics',
      quoteAmount: 42000,
      quoteCurrency: 'USD',
      quoteStatus: 'quote_sent',
      approvalStatus: 'waiting_approval',
      containerType: '40HC',
      containerCount: 1,
      totalWeight: 2000,
      cbm: 10,
      requestedArrivalWindow: '2026-04-02',
      earliestDepartureDate: '2026-03-30',
      incoterm: 'CIF',
      specialHandlingNote: '',
    });
    await context.close();
  });

  test('china desk route renders', async ({ page }) => {
    await loginAsHQ(page);
    await page.goto(`${adminBaseUrl}/china-desk/queue`, { waitUntil: 'commit' });
    await expect(page.getByTestId('china-desk-queue')).toBeVisible();
  });
});
