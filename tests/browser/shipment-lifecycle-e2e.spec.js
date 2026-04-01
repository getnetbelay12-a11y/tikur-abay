const { test, expect } = require('@playwright/test');
const { signInAdmin, signInCustomer } = require('./helpers/auth');

const adminBase = process.env.ADMIN_BASE_URL || 'http://127.0.0.1:6010';
const portalBase = process.env.CUSTOMER_BASE_URL || 'http://127.0.0.1:6011';
const bookingStorageKey = 'tikur-abay:booking-quote-desk:requests';
const supplierDeskStorageKey = 'tikur-abay:supplier-desk:manual-shipments';

function controlForLabel(page, label) {
  return page.locator('label').filter({ hasText: label }).locator('input, textarea, select').first();
}

function progressStep(page, label) {
  return page.locator('.booking-section-progress span', { hasText: label }).first();
}

function filePayload(name) {
  return {
    name,
    mimeType: 'application/pdf',
    buffer: Buffer.from(`Tikur Abay E2E document payload: ${name}`, 'utf8'),
  };
}

function captureConsoleErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror:${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      const text = message.text();
      if (text.includes('/_next/webpack-hmr')) return;
      if (text.includes('Failed to load resource: the server responded with a status of 404')) return;
      errors.push(`console:${text}`);
    }
  });
  return errors;
}

async function seedPortalQuote(page, quoteRecord) {
  await page.goto(`${portalBase}/bookings`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ key, record }) => {
    const existing = JSON.parse(window.localStorage.getItem(key) || '[]');
    const next = [record, ...existing.filter((item) => item.quoteId !== record.quoteId)];
    window.localStorage.setItem(key, JSON.stringify(next));
  }, { key: bookingStorageKey, record: quoteRecord });
}

test.describe('Shipment Lifecycle E2E', () => {
  test.use({ storageState: 'tests/browser/.auth/admin.json' });
  test.setTimeout(90000);

  test('completes shipment lifecycle from booking intake to cycle closure', async ({ page, context }) => {
    const consoleErrors = captureConsoleErrors(page);
    await signInAdmin(page, { adminBase });

    const suffix = Date.now();
    const customerName = `Test Customer ${suffix}`;
    const companyName = `Test PLC ${suffix}`;
    const customerPhone = '0911111111';
    const customerEmail = 'test@test.com';
    let quoteId = '';
    let bookingId = '';
    let shipmentId = '';
    let quoteRecord = null;
    let approvedPortalRecord = null;

    await test.step('Test 1 - Start booking flow', async () => {
      const startedAt = Date.now();
      await page.goto(`${adminBase}/dashboards/executive`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('link', { name: 'New Booking' }).click();
      await expect(page).toHaveURL(/\/shipments\/intake\?mode=booking/);
      await expect(page.getByRole('heading', { name: 'Book Shipment' })).toBeVisible();
      await expect(progressStep(page, 'Shipment Details')).toBeVisible();
      await expect(progressStep(page, 'Quote Review')).toBeVisible();
      await expect(progressStep(page, 'Approval')).toBeVisible();
      await expect(progressStep(page, 'Booking')).toBeVisible();
      await expect(progressStep(page, 'Origin Handoff')).toBeVisible();
    });

    await test.step('Test 2 - Enter full shipment details', async () => {
      await controlForLabel(page, 'Shipment mode').selectOption('Ocean Freight');
      await controlForLabel(page, 'Booking Type').selectOption('FCL');
      await controlForLabel(page, 'Service Level').selectOption('Door to Door');

      await controlForLabel(page, 'Customer / company name').fill(customerName);
      await controlForLabel(page, 'Company name').fill(companyName);
      await controlForLabel(page, 'Phone').fill(customerPhone);
      await controlForLabel(page, 'Email').fill(customerEmail);
      await controlForLabel(page, 'Consignee name').fill(customerName);
      await controlForLabel(page, 'Consignee company').fill(companyName);

      await controlForLabel(page, 'Origin country').fill('China');
      await controlForLabel(page, 'Origin city / port').fill('Shenzhen / Yantian');
      await controlForLabel(page, 'Origin port').fill('Yantian');
      await controlForLabel(page, 'Destination country').fill('Ethiopia');
      await controlForLabel(page, 'Destination city / port').fill('Addis Ababa');
      await controlForLabel(page, 'Destination port').fill('Djibouti');
      await controlForLabel(page, 'Delivery address').fill('Addis Ababa, Ethiopia');

      await controlForLabel(page, 'Cargo category').fill('Electronics');
      await controlForLabel(page, 'Commodity / goods description').fill('Electronics');
      await controlForLabel(page, 'Gross weight').fill('2000');
      await controlForLabel(page, 'Volume (CBM)').fill('10');
      await controlForLabel(page, 'Number of packages').fill('100');
      await controlForLabel(page, 'Packaging type').fill('Cartons');

      await controlForLabel(page, 'Container type').selectOption('40FT High Cube');
      await controlForLabel(page, 'Container size').selectOption('40FT');
      await controlForLabel(page, 'Container quantity').fill('1');

      await expect(page.getByText('required.', { exact: false })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Generate Final Quote' })).toBeEnabled();
    });

    await test.step('Test 3 - Generate quote', async () => {
      const startedAt = Date.now();
      await page.getByRole('button', { name: 'Generate Final Quote' }).click();
      await expect(page.getByRole('heading', { name: 'Quote Review' })).toBeVisible();
      await expect(page.locator('.booking-review-grid').filter({ hasText: 'Quote reference' }).first()).toBeVisible();
      await expect(page.locator('.booking-review-grid').filter({ hasText: 'Quote status' }).getByText(/sent|accepted|waiting_approval/i).first()).toBeVisible();
      const liveQuoteSummary = page.locator('.booking-intake-summary-card').filter({ hasText: 'Live Quote Summary' }).first();
      await expect(liveQuoteSummary).toBeVisible();
      await expect(liveQuoteSummary.getByText('Freight', { exact: true })).toBeVisible();
      await expect(liveQuoteSummary.getByText('Origin', { exact: true })).toBeVisible();
      await expect(liveQuoteSummary.getByText('Destination', { exact: true })).toBeVisible();
      await expect(page.getByText('Quote status')).toBeVisible();

      quoteRecord = await page.evaluate(({ key, customer }) => {
        const requests = JSON.parse(window.localStorage.getItem(key) || '[]');
        return requests.find((item) => item.customerName === customer) || requests[0] || null;
      }, { key: bookingStorageKey, customer: customerName });

      expect(quoteRecord).not.toBeNull();
      quoteId = quoteRecord.quoteId;
      expect(quoteRecord.quoteAmount).toBeGreaterThan(0);
      expect(['quote_sent', 'quote_requested', 'quote_under_review']).toContain(quoteRecord.quoteStatus);
    });

    await test.step('Test 4 - Customer approval', async () => {
      const portalPage = await context.newPage();
      const portalErrors = captureConsoleErrors(portalPage);
      await signInCustomer(portalPage, { customerBase: portalBase });

      await seedPortalQuote(portalPage, {
        ...quoteRecord,
        quoteStatus: 'quote_sent',
        approvalStatus: 'waiting_approval',
      });

      await portalPage.goto(`${portalBase}/quotes/${quoteId}/review`, { waitUntil: 'domcontentloaded' });
      await expect(portalPage.getByRole('heading', { name: /Quote Review/i })).toBeVisible();
      await expect(portalPage.getByText(quoteId).first()).toBeVisible();
      await expect(portalPage.getByText('40FT').first()).toBeVisible();
      await expect(portalPage.getByText('40HC').first()).toBeVisible();
      await expect(portalPage.getByText(/Pricing Breakdown/i).first()).toBeVisible();
      await portalPage.waitForTimeout(1500);

      await portalPage.getByTestId('customer-approve-quote').click({ force: true });
      await expect(portalPage.getByTestId('customer-confirm-approval')).toBeVisible();
      await portalPage.locator('label').filter({ hasText: /shipment details and quoted services are correct/i }).locator('input[type="checkbox"]').check();
      await portalPage.locator('label').filter({ hasText: /agree to proceed with booking based on this quote/i }).locator('input[type="checkbox"]').check();
      await portalPage.locator('label').filter({ hasText: 'Approved by' }).locator('input').fill('Test Customer');
      await portalPage.locator('label').filter({ hasText: 'Approval note' }).locator('textarea').fill('Approved for booking.');
      await portalPage.getByTestId('customer-confirm-approval').click();

      await expect(portalPage.getByText(/quote has been approved/i)).toBeVisible();
      approvedPortalRecord = await portalPage.evaluate(({ key, qid }) => {
        const requests = JSON.parse(window.localStorage.getItem(key) || '[]');
        return requests.find((item) => item.quoteId === qid) || null;
      }, { key: bookingStorageKey, qid: quoteId });

      expect(approvedPortalRecord.approvalStatus).toBe('accepted');
      expect(approvedPortalRecord.approvalRecordedAt).toBeTruthy();
      expect(portalErrors).toEqual([]);
      await portalPage.close();

      await page.getByRole('button', { name: 'Customer agreed by email' }).click();
      await expect(page.locator('.booking-review-grid').filter({ hasText: 'Approval state' }).getByText(/Booking confirmed|Customer approved/i).first()).toBeVisible();
      await expect(page.getByTestId('confirm-booking')).toBeEnabled();
    });

    await test.step('Test 5 - Convert to booking', async () => {
      await page.getByRole('button', { name: 'Confirm Booking' }).first().click();
      await expect.poll(async () => page.evaluate(({ key, qid }) => {
        const requests = JSON.parse(window.localStorage.getItem(key) || '[]');
        const record = requests.find((item) => item.quoteId === qid) || null;
        return record?.bookingId || null;
      }, { key: bookingStorageKey, qid: quoteId })).toMatch(/^BK-/);

      const bookingRecord = await page.evaluate(({ key, qid }) => {
        const requests = JSON.parse(window.localStorage.getItem(key) || '[]');
        return requests.find((item) => item.quoteId === qid) || null;
      }, { key: bookingStorageKey, qid: quoteId });

      bookingId = bookingRecord.bookingId;
      shipmentId = bookingRecord.convertedToShipmentId;
      expect(bookingId).toMatch(/^BK-/);
      expect(shipmentId).toMatch(/^SHP-/);
      expect(bookingRecord.bookingStatus).toBe('assigned_to_origin');
      expect(bookingRecord.assignedOriginAgentEmail).toBe('supplier.agent@tikurabay.com');
    });

    await test.step('Test 6 - Handoff to China Port Agent Desk', async () => {
      await page.goto(`${adminBase}/china-desk/queue?booking=${encodeURIComponent(bookingId)}`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: 'China Port Agent Desk' }).first()).toBeVisible();
      await page.getByPlaceholder('Search shipment').fill(bookingId);
      const queueRow = page.locator('.supplier-queue-row').filter({ hasText: bookingId }).first();
      await expect(queueRow).toBeVisible();
      await queueRow.click();
      const selectedShipmentPanel = page.locator('.supplier-selected-header-panel').first();
      await expect(selectedShipmentPanel.getByText(/Selected file|Selected Shipment/i).first()).toBeVisible();
      await expect(selectedShipmentPanel.getByRole('heading', { name: bookingId })).toBeVisible();
      await expect(selectedShipmentPanel.getByText(/Booking created|Quote Accepted/i).first()).toBeVisible();
      await expect(page.getByText('40HC', { exact: true })).toBeVisible();
    });

    await test.step('Test 7 - Origin processing', async () => {
      const clickDeskAction = async (name) => {
        await page.getByRole('button', { name }).first().click({ force: true });
      };

      const fileInputs = page.locator('#supplier-documents input[type="file"]');
      const uploadCount = await fileInputs.count();
      for (let index = 0; index < uploadCount; index += 1) {
        await fileInputs.nth(index).setInputFiles(filePayload(`origin-doc-${index + 1}.pdf`));
      }

      await page.getByLabel(/Container number/i).fill('MSCU4444444');
      await page.getByLabel(/Seal number/i).fill('SL-444444');
      await page.getByLabel(/Stuffing date \/ time/i).fill('2026-03-28 08:00');
      await page.getByLabel(/Stuffing location/i).fill('Yantian stuffing yard');
      await page.getByLabel(/Loaded by/i).fill('Origin Team A');
      await clickDeskAction('Save container details');
      await clickDeskAction('Confirm stuffing');
      await clickDeskAction('Confirm gate-in');

      await page.getByLabel(/Vessel name/i).fill('MV Test Horizon');
      await page.getByLabel(/Voyage number/i).fill('VH-100');
      await page.getByLabel(/Carrier \/ shipping line/i).fill('MSC');
      await page.getByLabel(/^ETD/i).fill('2026-03-29 10:00');
      await page.getByLabel(/ETA Djibouti/i).fill('2026-04-04 16:00');
      await clickDeskAction('Save vessel handoff details');
      await clickDeskAction('Mark ready for vessel handoff');

      await expect(page.getByText('Handed off to Djibouti release').first()).toBeVisible();
      await expect(page.getByText('MSCU4444444').first()).toBeVisible();
    });

    await test.step('Test 8 - Corridor operations', async () => {
      const clickCorridorAction = async (name) => {
        await page.getByRole('button', { name }).first().click({ force: true });
      };

      await page.goto(`${adminBase}/operations/djibouti-release?booking=${encodeURIComponent(bookingId)}`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByText(bookingId).first()).toBeVisible();
      await clickCorridorAction('Confirm vessel arrived');
      await clickCorridorAction('Confirm discharge');
      await clickCorridorAction('Confirm line release');
      await clickCorridorAction('Mark customs cleared');
      await page.getByRole('button', { name: /Approve gate-out|Mark gate-out ready/i }).first().click({ force: true });
      await page.getByRole('button', { name: /Send to transitor \/ clearance|Release to system clearance queue/i }).first().click({ force: true });

      await page.goto(`${adminBase}/operations/transitor-clearance?booking=${encodeURIComponent(bookingId)}`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByText(bookingId).first()).toBeVisible();
      await page.getByLabel('Transitor name').selectOption({ index: 1 });
      await expect(page.getByTestId('clearance-assign-transitor')).toBeEnabled();
      await page.getByTestId('clearance-assign-transitor').click({ force: true });

      const clearancePanel = page.getByTestId('transitor-clearance-selected-shipment');
      const t1Status = await clearancePanel.locator('.djibouti-detail-item').filter({ hasText: 'Transit document status' }).locator('strong').textContent();
      if (!/prepared|approved/i.test(t1Status || '')) {
        await page.getByTestId('clearance-prepare-t1').click({ force: true });
      }

      const chargesStatus = await clearancePanel.locator('.djibouti-detail-item').filter({ hasText: 'Charges' }).locator('strong').textContent();
      if (!/paid/i.test(chargesStatus || '')) {
        await page.getByTestId('clearance-mark-charges-paid').click({ force: true });
      }

      await expect(page.getByTestId('clearance-release-to-dispatch')).toBeEnabled();
      await page.getByTestId('clearance-release-to-dispatch').click({ force: true });

      await page.goto(`${adminBase}/operations/corridor-dispatch?booking=${encodeURIComponent(bookingId)}`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByText(bookingId).first()).toBeVisible();
      await clickCorridorAction('Assign truck');
      await clickCorridorAction('Assign driver');
      await clickCorridorAction('Push pack to driver mobile');
      await clickCorridorAction('Confirm departure');
      await clickCorridorAction('Confirm arrived inland');
      await clickCorridorAction('Send arrival notice');
      await clickCorridorAction('Confirm unload contact');
      await clickCorridorAction('Push to Dry-Port / Yard Desk');
      await expect(page.getByText(bookingId).first()).toBeVisible();
    });

    await test.step('Test 9 - Final delivery and cycle close', async () => {
      const clickYardAction = async (name) => {
        await page.getByRole('button', { name }).first().click({ force: true });
      };

      await page.goto(`${adminBase}/operations/dry-port-yard?booking=${encodeURIComponent(bookingId)}`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByText(bookingId).first()).toBeVisible();
      await clickYardAction('Confirm inland arrival');
      await clickYardAction('Confirm gate-in');
      await clickYardAction('Start unload');
      await clickYardAction('Complete unload');
      await clickYardAction('Upload unload photo');
      await clickYardAction('Confirm dry-port release');
      await clickYardAction('Record cargo handover');
      await clickYardAction('Mark ready for pickup');
      await clickYardAction('Prepare POD');
      await clickYardAction('Capture signature');
      await clickYardAction('Upload POD');
      await clickYardAction('Mark goods received');
      await clickYardAction('Mark empty released');
      await clickYardAction('Start empty return');
      await clickYardAction('Confirm empty returned');
      await clickYardAction('Upload return receipt');
      await clickYardAction('Close shipment cycle');

      await expect(page.getByText(/Closed|Cycle closed/i).first()).toBeVisible();
    });

    await test.step('Test 10 - Data integrity validation', async () => {
      const dataIntegrity = await page.evaluate(({ bookingKey, supplierKey, qid, expectedCustomer }) => {
        const requests = JSON.parse(window.localStorage.getItem(bookingKey) || '[]');
        const supplierShipments = JSON.parse(window.localStorage.getItem(supplierKey) || '[]');
        const matchingRequest = requests.filter((item) => item.quoteId === qid);
        const matchingSupplier = supplierShipments.filter((item) => item.bookingNumber === matchingRequest[0]?.bookingId);
        return {
          requestCount: matchingRequest.length,
          supplierCount: matchingSupplier.length,
          request: matchingRequest[0] || null,
          supplier: matchingSupplier[0] || null,
          expectedCustomer,
        };
      }, { bookingKey: bookingStorageKey, supplierKey: supplierDeskStorageKey, qid: quoteId, expectedCustomer: customerName });

      expect(dataIntegrity.requestCount).toBe(1);
      expect(dataIntegrity.supplierCount).toBe(1);
      expect(dataIntegrity.request.customerName).toContain(String(suffix));
      expect(dataIntegrity.request.company).toBeTruthy();
      expect(dataIntegrity.request.containerType).toBe('40HC');
      expect(dataIntegrity.request.bookingId).toBe(bookingId);
      expect(dataIntegrity.supplier.customerName).toContain(String(suffix));
      expect(dataIntegrity.supplier.container.containerNumber).toBe('MSCU4444444');
      expect(dataIntegrity.supplier.container.sealNumber).toBe('SL-444444');
    });

    expect(consoleErrors).toEqual([]);
  });

  test('negative cases block invalid lifecycle actions', async ({ page, context }) => {
    await signInAdmin(page, { adminBase });

    const suffix = Date.now();
    const customerName = `Negative Test ${suffix}`;

    await page.goto(`${adminBase}/shipments/intake?mode=booking`, { waitUntil: 'domcontentloaded' });

    await test.step('booking without quote should fail', async () => {
      await expect(page.getByRole('button', { name: 'Confirm Booking' })).toBeDisabled();
      await expect(page.getByRole('button', { name: 'Convert to Booking' })).toBeDisabled();
    });

    await test.step('missing container details should block quote generation', async () => {
      await controlForLabel(page, 'Customer / company name').fill(customerName);
      await controlForLabel(page, 'Company name').fill('Negative PLC');
      await controlForLabel(page, 'Phone').fill('0911111111');
      await controlForLabel(page, 'Email').fill('negative@test.com');
      await controlForLabel(page, 'Consignee name').fill(customerName);
      await controlForLabel(page, 'Origin country').fill('China');
      await controlForLabel(page, 'Origin city / port').fill('Shenzhen / Yantian');
      await controlForLabel(page, 'Destination country').fill('Ethiopia');
      await controlForLabel(page, 'Destination city / port').fill('Addis Ababa');
      await controlForLabel(page, 'Commodity / goods description').fill('Electronics');
      await controlForLabel(page, 'Gross weight').fill('2000');
      await controlForLabel(page, 'Volume (CBM)').fill('10');
      await controlForLabel(page, 'Number of packages').fill('100');
      await controlForLabel(page, 'Container quantity').fill('0');
      await controlForLabel(page, 'Cargo ready date').fill('2026-04-01');
      await page.getByRole('button', { name: 'Generate Final Quote' }).click();
      await expect(page.locator('em').filter({ hasText: /Container quantity must be at least 1/i })).toBeVisible();
    });

    await test.step('approval after expiry should block', async () => {
      const portalPage = await context.newPage();
      const expiredQuote = {
        quoteId: `QT-EXPIRED-${suffix}`,
        customerName: 'Expired Customer',
        company: 'Expired PLC',
        serviceType: 'multimodal',
        portOfLoading: 'Yantian',
        portOfDischarge: 'Djibouti',
        inlandDestination: 'Addis Ababa',
        cargoDescription: 'Expired quote cargo',
        quoteAmount: 12000,
        quoteCurrency: 'USD',
        quoteStatus: 'quote_sent',
        approvalStatus: 'expired',
        containerType: '40HC',
        containerCount: 1,
        requestedArrivalWindow: '2026-03-20',
      };
      await seedPortalQuote(portalPage, expiredQuote);
      await portalPage.goto(`${portalBase}/quotes/${expiredQuote.quoteId}/review`, { waitUntil: 'domcontentloaded' });
      await expect(portalPage.getByText('Expired', { exact: true })).toBeVisible();
      await expect(portalPage.getByRole('button', { name: 'Approve Quote' })).toBeDisabled();
      await portalPage.close();
    });

    await test.step('duplicate booking should not create duplicate records', async () => {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await controlForLabel(page, 'Customer / company name').fill(`Duplicate Test ${suffix}`);
      await controlForLabel(page, 'Company name').fill('Duplicate PLC');
      await controlForLabel(page, 'Phone').fill('0911111111');
      await controlForLabel(page, 'Email').fill('duplicate@test.com');
      await controlForLabel(page, 'Consignee name').fill(`Duplicate Test ${suffix}`);
      await controlForLabel(page, 'Origin country').fill('China');
      await controlForLabel(page, 'Origin city / port').fill('Shenzhen / Yantian');
      await controlForLabel(page, 'Destination country').fill('Ethiopia');
      await controlForLabel(page, 'Destination city / port').fill('Addis Ababa');
      await controlForLabel(page, 'Commodity / goods description').fill('Electronics');
      await controlForLabel(page, 'Gross weight').fill('2000');
      await controlForLabel(page, 'Volume (CBM)').fill('10');
      await controlForLabel(page, 'Number of packages').fill('100');
      await controlForLabel(page, 'Container quantity').fill('1');
      await controlForLabel(page, 'Cargo ready date').fill('2026-04-01');
      await page.getByRole('button', { name: 'Generate Final Quote' }).click();
      const duplicateQuote = await page.evaluate((key) => {
        const requests = JSON.parse(window.localStorage.getItem(key) || '[]');
        return requests[0];
      }, bookingStorageKey);
      await page.getByRole('button', { name: 'Customer agreed by phone' }).click();
      await page.getByRole('button', { name: 'Confirm Booking' }).first().click();
      await page.getByRole('button', { name: 'Convert to Booking' }).first().click();
      const duplicateCount = await page.evaluate(({ key, qid }) => {
        const requests = JSON.parse(window.localStorage.getItem(key) || '[]');
        return requests.filter((item) => item.quoteId === qid).length;
      }, { key: bookingStorageKey, qid: duplicateQuote.quoteId });
      expect(duplicateCount).toBe(1);
    });
  });

  test('performance thresholds stay within local E2E targets', async ({ page }) => {
    await signInAdmin(page, { adminBase });

    const dashboardStart = Date.now();
    await page.goto(`${adminBase}/dashboards/executive`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Executive Dashboard' })).toBeVisible();
    const dashboardLoad = Date.now() - dashboardStart;

    const bookingStart = Date.now();
    await page.goto(`${adminBase}/shipments/intake?mode=booking`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Book Shipment' })).toBeVisible();
    const bookingLoad = Date.now() - bookingStart;

    await controlForLabel(page, 'Customer / company name').fill(`Perf Test ${Date.now()}`);
    await controlForLabel(page, 'Company name').fill('Perf PLC');
    await controlForLabel(page, 'Phone').fill('0911111111');
    await controlForLabel(page, 'Email').fill('perf@test.com');
    await controlForLabel(page, 'Consignee name').fill('Perf Test');
    await controlForLabel(page, 'Origin country').fill('China');
    await controlForLabel(page, 'Origin city / port').fill('Shenzhen / Yantian');
    await controlForLabel(page, 'Destination country').fill('Ethiopia');
    await controlForLabel(page, 'Destination city / port').fill('Addis Ababa');
    await controlForLabel(page, 'Commodity / goods description').fill('Electronics');
    await controlForLabel(page, 'Gross weight').fill('2000');
    await controlForLabel(page, 'Volume (CBM)').fill('10');
    await controlForLabel(page, 'Number of packages').fill('100');
    await controlForLabel(page, 'Container quantity').fill('1');
    await controlForLabel(page, 'Cargo ready date').fill('2026-04-01');

    const quoteStart = Date.now();
    await page.getByRole('button', { name: 'Generate Final Quote' }).click();
    await expect(page.getByText(/Quote .* generated/i)).toBeVisible();
    const quoteLoad = Date.now() - quoteStart;

    expect(dashboardLoad).toBeLessThan(3000);
    expect(bookingLoad).toBeLessThan(3000);
    expect(quoteLoad).toBeLessThan(3000);
  });
});
