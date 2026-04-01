const { test, expect } = require('@playwright/test');
const { signInAdmin, signInCustomer } = require('./helpers/auth');

const adminBase = process.env.ADMIN_BASE_URL || 'http://127.0.0.1:6010';
const customerBase = process.env.CUSTOMER_BASE_URL || 'http://127.0.0.1:6011';
const adminEmail = process.env.SMOKE_EMAIL || 'superadmin@tikurabay.com';
const adminPassword = process.env.SMOKE_PASSWORD || 'ChangeMe123!';
const customerEmail = process.env.CUSTOMER_SMOKE_EMAIL || 'customer1@tikurabay.com';
const customerPassword = process.env.CUSTOMER_SMOKE_PASSWORD || 'ChangeMe123!';

test.describe('Production browser smoke', () => {
  test('admin unauthenticated route redirects to login', async ({ page }) => {
    await page.goto(`${adminBase}/operations-status`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('admin can reach executive dashboard and operations status', async ({ page }) => {
    await signInAdmin(page, { adminBase, adminEmail, adminPassword });
    await expect(page.getByRole('heading', { name: /Executive Dashboard/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Multimodal operating path/i })).toBeVisible();

    await page.goto(`${adminBase}/operations-status`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Operations status/i }).last()).toBeVisible();
    await expect(page.getByText(/System readiness/i)).toBeVisible();
  });

  test('corridor desks render their primary workflow headings', async ({ page }) => {
    await signInAdmin(page, { adminBase, adminEmail, adminPassword });

    await page.goto(`${adminBase}/operations/supplier-agent`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Supplier Agent Desk/i }).last()).toBeVisible();
    await expect(page.getByRole('link', { name: /Book Shipment/i })).toBeVisible();

    await page.goto(`${adminBase}/operations/djibouti-release`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Djibouti Release Desk/i }).last()).toBeVisible();
    await expect(page.getByText(/Release Readiness/i)).toBeVisible();

    await page.goto(`${adminBase}/operations/transitor-clearance`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Transitor \/ Clearance Desk/i }).last()).toBeVisible();
    await expect(page.getByText(/Selected Clearance File/i)).toBeVisible();

    await page.goto(`${adminBase}/operations/corridor-dispatch`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Corridor Dispatch/i }).last()).toBeVisible();
    await expect(page.getByText(/Awaiting trip creation/i)).toBeVisible();

    await page.goto(`${adminBase}/operations/dry-port-yard`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Yard \/ Delivery Desk/i }).last()).toBeVisible();
    await expect(page.getByRole('heading', { name: /Arrival & Unloading/i }).last()).toBeVisible();

    await page.goto(`${adminBase}/tracking`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Real-time corridor and vehicle visibility/i }).last()).toBeVisible();
    await expect(page.getByPlaceholder(/Search container number/i)).toBeVisible();
  });

  test('transitor clearance actions lock after completion', async ({ page }) => {
    await signInAdmin(page, { adminBase, adminEmail, adminPassword });

    await page.goto(`${adminBase}/operations/transitor-clearance`, { waitUntil: 'domcontentloaded' });

    const assignButton = page.getByTestId('clearance-assign-transitor');
    await expect(assignButton).toHaveText(/Transitor assigned|Assign transitor/i);

    const prepareButton = page.getByTestId('clearance-prepare-t1');
    const chargesButton = page.getByTestId('clearance-mark-charges-paid');
    const releaseButton = page.getByTestId('clearance-release-to-dispatch');

    if (await prepareButton.isEnabled()) {
      await prepareButton.click({ force: true });
    }
    await expect(prepareButton).toHaveText(/T1 prepared/i);
    await expect(prepareButton).toBeDisabled();

    if (await chargesButton.isEnabled()) {
      await chargesButton.click({ force: true });
    }
    await expect(chargesButton).toHaveText(/Charges paid/i);
    await expect(chargesButton).toBeDisabled();

    if (!(await releaseButton.isEnabled())) {
      const blockerSelect = page.locator('label:has-text("Common blocker issue") select').first();
      const blockerNote = page.getByPlaceholder(/seal broken, seal number on the document does not match/i).first();
      const submitBlocker = page.getByRole('button', { name: /Submit blocker/i });

      if (await submitBlocker.isVisible()) {
        await blockerSelect.selectOption({ index: 1 });
        await blockerNote.fill('Manual smoke blocker submitted so overdue clearance can continue through the release gate.');
        await submitBlocker.click({ force: true });
      }
    }

    if (await releaseButton.isEnabled()) {
      await releaseButton.click({ force: true });
    }
    await expect(releaseButton).toHaveText(/Release(?:d)? to dispatch/i);
    await expect(releaseButton).toBeDisabled();
  });

  test('customer portal home and dashboard render current shipment workspace', async ({ page }) => {
    await page.goto(`${customerBase}/`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Shipment Visibility Dashboard/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Start from your live customer workflows/i })).toBeVisible();

    await signInCustomer(page, { customerBase, customerEmail, customerPassword });
    await expect(page.getByRole('heading', { name: /Shipment Visibility Dashboard/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Shipment visibility', exact: true })).toBeVisible();

    await page.goto(`${customerBase}/shipments`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Shipment list/i)).toBeVisible();
    await expect(page.getByText(/My Shipments/i)).toBeVisible();
  });
});
