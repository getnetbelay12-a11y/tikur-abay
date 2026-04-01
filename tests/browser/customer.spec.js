const { test, expect } = require('@playwright/test');
const { signInCustomer } = require('./helpers/auth');

const customerBase = process.env.CUSTOMER_BASE_URL || 'http://127.0.0.1:6011';
const customerEmail = process.env.CUSTOMER_SMOKE_EMAIL || 'customer.demo@tikurabay.com';
const customerPassword = process.env.CUSTOMER_SMOKE_PASSWORD || 'ChangeMe123!';
const bookingStorageKey = 'tikur-abay:booking-quote-desk:requests';
const releaseStorageKey = 'tikur-abay:manual-corridor:djibouti-release';
const dispatchStorageKey = 'tikur-abay:manual-corridor:dispatch-trips';
const yardStorageKey = 'tikur-abay:manual-corridor:yard-records';

function captureConsoleErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror:${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      const text = message.text();
      if (text.includes('/_next/webpack-hmr')) return;
      errors.push(`console:${text}`);
    }
  });
  return errors;
}

test.describe('Customer portal unauthenticated flows', () => {
  test('customer shipments route is publicly reachable', async ({ page }) => {
    await page.goto(`${customerBase}/shipments`);
    await expect(page).toHaveURL(/\/shipments$/);
    await expect(page.getByText(/Customer shipment list and current trip status\./i)).toBeVisible();
  });

  test('customer portal home renders', async ({ page }) => {
    await page.goto(`${customerBase}/`);
    await expect(page.getByRole('heading', { name: /Customer Portal/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Customer Login/i })).toBeVisible();
  });
});

test.describe('Customer portal browser flows', () => {
  test.use({ storageState: 'tests/browser/.auth/customer.json' });

  test('customer can sign in and reach dashboard', async ({ page }) => {
    await signInCustomer(page, { customerBase, customerEmail, customerPassword });
    await expect(page.getByRole('heading', { name: /Customer Dashboard/i })).toBeVisible();
    await expect(page.getByText(/Shipments/i)).toBeVisible();
  });

  test('customer agreements page renders', async ({ page }) => {
    await signInCustomer(page, { customerBase, customerEmail, customerPassword });
    await page.goto(`${customerBase}/agreements`);

    await expect(page.getByText(/Agreement list, status, versions, and downloads\./i)).toBeVisible();
  });

  test('customer payments page renders', async ({ page }) => {
    await signInCustomer(page, { customerBase, customerEmail, customerPassword });
    await page.goto(`${customerBase}/payments`);

    await expect(page.getByText(/Customer invoices and payment history\./i)).toBeVisible();
  });

  test('customer documents page renders', async ({ page }) => {
    await signInCustomer(page, { customerBase, customerEmail, customerPassword });
    await page.goto(`${customerBase}/documents`);

    await expect(page.getByText(/Customer document uploads and approval history\./i)).toBeVisible();
  });

  test('customer shipments page renders', async ({ page }) => {
    await signInCustomer(page, { customerBase, customerEmail, customerPassword });
    await page.goto(`${customerBase}/shipments`);

    await expect(page.getByText(/Customer shipment list and current trip status\./i)).toBeVisible();
  });

  test('customer bookings page renders', async ({ page }) => {
    await signInCustomer(page, { customerBase, customerEmail, customerPassword });
    await page.goto(`${customerBase}/bookings`);

    await expect(page.getByText(/Booking and inquiry requests\./i)).toBeVisible();
  });

  test('customer invoices page renders', async ({ page }) => {
    await signInCustomer(page, { customerBase, customerEmail, customerPassword });
    await page.goto(`${customerBase}/invoices`);

    await expect(page.getByText(/Invoices, balances, and payment history\./i)).toBeVisible();
  });

  test('customer support page renders', async ({ page }) => {
    await signInCustomer(page, { customerBase, customerEmail, customerPassword });
    await page.goto(`${customerBase}/support`);

    await expect(page.getByText(/Customer support chat and case history\./i)).toBeVisible();
  });

  test('customer sync path reflects booking, quote review, visibility, and closure state', async ({ page }) => {
    const consoleErrors = captureConsoleErrors(page);
    const suffix = Date.now();
    const quoteId = `QT-SYNC-${suffix}`;
    const bookingId = `BK-SYNC-${suffix}`;
    const shipmentId = `SHP-SYNC-${suffix}`;

    await signInCustomer(page, { customerBase, customerEmail, customerPassword });
    await page.goto(`${customerBase}/bookings`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(({ bookingKey, quoteId, bookingId, shipmentId, customerEmail }) => {
      const bookingRecord = {
        id: `sync-${quoteId}`,
        quoteId,
        bookingId,
        convertedToShipmentId: shipmentId,
        requestSource: 'customer',
        quoteStatus: 'assigned_to_origin',
        bookingStatus: 'assigned_to_origin',
        quoteAmount: 22150,
        quoteCurrency: 'USD',
        acceptedAt: '',
        assignedOriginAgentEmail: 'supplier.agent@tikurabay.com',
        approvalStatus: 'waiting_approval',
        customerName: 'Customer Sync Test PLC',
        company: 'Customer Sync Test PLC',
        consigneeName: 'Customer Sync Test PLC',
        contactPerson: 'Portal Sync User',
        phone: '+251911000000',
        email: customerEmail,
        localPortalRecipientEmail: customerEmail,
        serviceType: 'multimodal',
        shipmentMode: 'Multimodal',
        bookingType: 'FCL',
        serviceLevel: 'Door to Door',
        portOfLoading: 'Shanghai',
        portOfDischarge: 'Djibouti',
        inlandDestination: 'Adama Dry Port',
        finalDeliveryLocation: 'Adama customer warehouse',
        commoditySummary: 'Industrial motors',
        cargoDescription: 'Industrial motors and control accessories',
        containerType: '40HC',
        containerCount: 1,
        totalWeight: 2200,
        cbm: 12,
        requestedArrivalWindow: '2026-04-12',
        updatedAt: new Date().toISOString(),
      };
      window.localStorage.setItem(bookingKey, JSON.stringify([bookingRecord]));
      window.dispatchEvent(new StorageEvent('storage', { key: bookingKey, newValue: JSON.stringify([bookingRecord]) }));
    }, { bookingKey: bookingStorageKey, quoteId, bookingId, shipmentId, customerEmail });

    await expect(page.getByText(quoteId)).toBeVisible();
    await expect(page.getByText(bookingId)).toBeVisible();

    await page.goto(`${customerBase}/quotes/${quoteId}/review`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Review your shipment quote/i })).toBeVisible();
    await page.getByRole('button', { name: 'Approve Quote' }).click();
    await page.getByRole('checkbox', { name: /shipment details and quoted services are correct/i }).check();
    await page.getByRole('checkbox', { name: /agree to proceed with booking/i }).check();
    await page.locator('label').filter({ hasText: 'Approved by' }).locator('input').fill('Portal Sync User');
    await page.getByRole('button', { name: 'Confirm Approval' }).click();
    await expect(page.getByText(/quote has been approved/i)).toBeVisible();

    await page.goto(`${customerBase}/shipments`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(({ releaseKey, dispatchKey, yardKey, bookingId }) => {
      const now = new Date().toISOString();
      const releaseRecord = {
        bookingNumber: bookingId,
        blNumber: `BL-${bookingId}`,
        containerNumber: 'MSCU4444444',
        sealNumber: 'SL-444444',
        customerName: 'Customer Sync Test PLC',
        vesselName: 'MV Sync Horizon',
        finalDestination: 'Adama Dry Port',
        currentStage: 'Waiting inland handoff',
        lastUpdated: now,
        expectedGateOutTime: now,
        releaseStatus: 'Handed to dispatch',
        customsStatus: 'Cleared',
        storageRisk: 'Safe',
        customsTransit: {
          declarationReference: `DEC-${bookingId}`,
          transitType: 'T1',
          transitNumber: `T1-${bookingId}`,
          customsCleared: true,
          dutyTaxNote: 'Transit release completed.',
        },
      };
      const dispatchRecord = {
        bookingNumber: bookingId,
        containerNumber: 'MSCU4444444',
        sealNumber: 'SL-444444',
        customerName: 'Customer Sync Test PLC',
        currentTripStatus: 'Awaiting unload handoff',
        inlandDestination: 'Adama Dry Port',
        expectedArrivalTime: now,
        lastUpdated: now,
        liveMovement: {
          currentLocation: 'Adama Dry Port',
          eta: now,
        },
      };
      const yardRecord = {
        bookingNumber: bookingId,
        blNumber: `BL-${bookingId}`,
        containerNumber: 'MSCU4444444',
        sealNumber: 'SL-444444',
        customerName: 'Customer Sync Test PLC',
        consigneeName: 'Customer Sync Test PLC',
        inlandNode: 'Adama Dry Port',
        yardStage: 'Cycle closed',
        lastUpdated: now,
        arrivalControl: {
          actualArrivalTime: now,
          gateInConfirmed: true,
        },
        unloadStatus: {
          unloadCompleted: true,
          unloadEndTime: now,
          varianceNote: 'No variance at unload.',
        },
        podReadiness: {
          deliveryNoteStatus: 'Uploaded',
        },
        consigneeHandoff: {
          handoffStatus: 'Completed',
          handoffTime: now,
          signedBy: 'Portal Sync User',
          photoProofUploaded: true,
          issueAtHandoff: false,
          finalCargoConditionNote: 'Customer received goods cleanly.',
        },
        emptyReturn: {
          status: 'Cycle closed',
          emptyReturned: true,
          returnTimestamp: now,
          returnReceiptAvailable: true,
          returnReceiptRef: `ERR-${bookingId}`,
          detentionRiskOpen: false,
        },
      };
      window.localStorage.setItem(releaseKey, JSON.stringify([releaseRecord]));
      window.localStorage.setItem(dispatchKey, JSON.stringify([dispatchRecord]));
      window.localStorage.setItem(yardKey, JSON.stringify([yardRecord]));
      window.dispatchEvent(new StorageEvent('storage', { key: yardKey, newValue: JSON.stringify([yardRecord]) }));
    }, { releaseKey: releaseStorageKey, dispatchKey: dispatchStorageKey, yardKey: yardStorageKey, bookingId });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByText(bookingId)).toBeVisible();
    await expect(page.locator('.portal-data-item').filter({ hasText: 'Current stage' }).getByText('Closed')).toBeVisible();
    await expect(page.locator('.portal-data-item').filter({ hasText: 'Empty return status' }).getByText('Cycle Closed')).toBeVisible();
    await expect(page.locator('.portal-data-item').filter({ hasText: 'Customer confirmation' }).getByText('resolved')).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });
});
