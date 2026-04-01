const { test, expect } = require('@playwright/test');
const { signInAdmin } = require('./helpers/auth');

const adminBase = process.env.ADMIN_BASE_URL || 'http://127.0.0.1:6010';
const adminEmail = process.env.SMOKE_EMAIL || 'superadmin@tikurabay.com';
const adminPassword = process.env.SMOKE_PASSWORD || 'ChangeMe123!';

test.describe('Admin console unauthenticated flows', () => {
  test('redirects unauthenticated protected route to login', async ({ page }) => {
    await page.goto(`${adminBase}/operations-status`);
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.getByRole('heading', { name: /Tikur Abay Manager Console/i })).toBeVisible();
  });
});

test.describe('Admin console browser flows', () => {
  test.use({ storageState: 'tests/browser/.auth/admin.json' });

  test('admin can sign in and reach executive dashboard', async ({ page }) => {
    await signInAdmin(page, { adminBase, adminEmail, adminPassword });
    await expect(page.getByRole('heading', { name: /Executive Dashboard/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'What is urgent?' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'What is blocked?' })).toBeVisible();
  });

  test('sidebar resize handle updates width and persists after reload', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1024 });
    await signInAdmin(page, { adminBase, adminEmail, adminPassword });
    await page.evaluate(() => {
      const rawUser = window.localStorage.getItem('tikur-abay-admin-user');
      const user = rawUser ? JSON.parse(rawUser) : null;
      const userId = user?.id;
      window.localStorage.removeItem('tikur-abay-sidebar-width');
      window.localStorage.removeItem('tikur-abay-sidebar-collapsed');
      if (userId) {
        window.localStorage.removeItem(`tikur-abay-sidebar-width:${userId}`);
        window.localStorage.removeItem(`tikur-abay-sidebar-collapsed:${userId}`);
      }
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('.console-shell')).toBeVisible();

    const sidebar = page.locator('.sidebar');
    const handle = page.getByRole('button', { name: /Resize navigation/i });

    const initialWidth = await sidebar.evaluate((element) => Math.round(element.getBoundingClientRect().width));
    expect(initialWidth).toBeGreaterThanOrEqual(240);

    const handleBox = await handle.boundingBox();
    expect(handleBox).not.toBeNull();

    const pointerStart = {
      x: Math.round(handleBox.x + handleBox.width / 2),
      y: Math.round(handleBox.y + 120),
    };
    const pointerEnd = {
      x: pointerStart.x + 48,
      y: pointerStart.y,
    };

    await handle.dispatchEvent('pointerdown', {
      button: 0,
      buttons: 1,
      clientX: pointerStart.x,
      clientY: pointerStart.y,
      pointerId: 1,
    });
    await page.evaluate(({ x, y }) => {
      window.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true,
        button: 0,
        buttons: 1,
        clientX: x,
        clientY: y,
        pointerId: 1,
      }));
    }, pointerEnd);
    await page.evaluate(({ x, y }) => {
      window.dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true,
        button: 0,
        buttons: 0,
        clientX: x,
        clientY: y,
        pointerId: 1,
      }));
    }, pointerEnd);

    await expect.poll(async () => (
      await sidebar.evaluate((element) => Math.round(element.getBoundingClientRect().width))
    )).toBeGreaterThan(initialWidth + 20);

    const resizedWidth = await sidebar.evaluate((element) => Math.round(element.getBoundingClientRect().width));
    expect(resizedWidth).toBeLessThanOrEqual(320);
    const sidebarWidthStorageKey = await page.evaluate(() => {
      const rawUser = window.localStorage.getItem('tikur-abay-admin-user');
      const user = rawUser ? JSON.parse(rawUser) : null;
      return user?.id ? `tikur-abay-sidebar-width:${user.id}` : 'tikur-abay-sidebar-width';
    });
    await expect.poll(async () => (
      Number(await page.evaluate((storageKey) => window.localStorage.getItem(storageKey), sidebarWidthStorageKey))
    )).toBeGreaterThan(initialWidth + 20);
    const persistedWidth = await page.evaluate((storageKey) => Number(window.localStorage.getItem(storageKey)), sidebarWidthStorageKey);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('.console-shell')).toBeVisible();
    await expect.poll(async () => (
      await sidebar.evaluate((element) => Math.round(element.getBoundingClientRect().width))
    )).toBe(persistedWidth);
  });

  test('executive dashboard preserves the five-question layout and drill-down actions', async ({ page }) => {
    await signInAdmin(page, { adminBase, adminEmail, adminPassword });

    await expect(page.getByRole('heading', { name: 'What is urgent?' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'What is moving?' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'What is blocked?' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'What is making money?' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'What needs attention today?' })).toBeVisible();

    await page.getByRole('link', { name: /Open live tracking/i }).click();
    await expect(page).toHaveURL(/\/tracking$/);
    await expect(page.getByRole('heading', { name: /Real-time corridor and vehicle visibility/i })).toBeVisible();

    await page.goto(`${adminBase}/`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('link', { name: /Open operations hub/i }).first().click();
    await expect(page).toHaveURL(/\/operations$/);
    await expect(page.locator('main')).toContainText(/Production fleet board/i, { timeout: 20000 });
  });

  test('maintenance workspace renders', async ({ page }) => {
    await signInAdmin(page, { adminBase, adminEmail, adminPassword });
    await page.goto(`${adminBase}/maintenance`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /Maintenance control board/i })).toBeVisible();
    await expect(page.getByText(/Critical maintenance attention/i)).toBeVisible();
  });

  test('document center renders', async ({ page }) => {
    await signInAdmin(page, { adminBase, adminEmail, adminPassword });
    await page.goto(`${adminBase}/documents`);

    await expect(page.getByRole('heading', { name: /^Documents$/i })).toBeVisible();
  });

  test('documents workspace opens detail drawer', async ({ page }) => {
    await signInAdmin(page, { adminBase, adminEmail, adminPassword });
    await page.goto(`${adminBase}/documents`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /^Documents$/i })).toBeVisible();
    await page.locator('tbody tr').first().click();
    await expect(page.getByText(/Version history/i).last()).toBeVisible();
  });

  test('maintenance alerts workspace renders alert table', async ({ page }) => {
    await signInAdmin(page, { adminBase, adminEmail, adminPassword });
    await page.goto(`${adminBase}/maintenance-alerts`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /Maintenance Alerts/i })).toBeVisible();
    await expect(page.getByText(/Maintenance alert table/i)).toBeVisible();
  });

  test('customers workspace renders commercial account table and drawer', async ({ page }) => {
    await signInAdmin(page, { adminBase, adminEmail, adminPassword });
    await page.goto(`${adminBase}/customers`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /^Customers$/i })).toBeVisible();
    await expect(page.getByText(/Commercial accounts table/i)).toBeVisible();
    await page.locator('tbody tr').first().click();
    await expect(page.getByText(/Active trips/i).last()).toBeVisible();
    await expect(page.getByText(/Documents/i).last()).toBeVisible();
  });

  test('agreements workspace renders contract lifecycle table and drawer', async ({ page }) => {
    await signInAdmin(page, { adminBase, adminEmail, adminPassword });
    await page.goto(`${adminBase}/agreements`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /^Agreements$/i })).toBeVisible();
    await expect(page.getByText(/Agreement lifecycle table/i)).toBeVisible();
    await page.locator('tbody tr').first().click();
    await expect(page.getByText(/Audit trail/i).last()).toBeVisible();
    await expect(page.getByText(/Documents/i).last()).toBeVisible();
  });

  test('marketing workspace renders pipeline and quote tables', async ({ page }) => {
    await signInAdmin(page, { adminBase, adminEmail, adminPassword });
    await page.goto(`${adminBase}/marketing`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /^Marketing$/i })).toBeVisible();
    await expect(page.getByText(/Pipeline accounts/i)).toBeVisible();
    await expect(page.getByText(/Open and recent quote requests/i)).toBeVisible();
    await page.locator('tbody tr').first().click();
    await expect(page.getByText(/Quote history/i).last()).toBeVisible();
  });

  test('finance workspace renders receivables and payout summaries', async ({ page }) => {
    await signInAdmin(page, { adminBase, adminEmail, adminPassword });
    await page.goto(`${adminBase}/finance`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /^Finance$/i })).toBeVisible();
    await expect(page.getByText(/Receivables queue/i)).toBeVisible();
    await expect(page.getByText(/Payout summary/i)).toBeVisible();
    await page.locator('tbody tr').first().click();
    await expect(page.getByText(/Recent payments/i).last()).toBeVisible();
    await expect(page.getByText(/Collections/i).last()).toBeVisible();
  });

  test('driver kyc review queue renders', async ({ page }) => {
    await signInAdmin(page, { adminBase, adminEmail, adminPassword });
    await page.goto(`${adminBase}/hr/driver-kyc`);

    await expect(page.getByRole('heading', { name: /Driver KYC Approval Queue/i })).toBeVisible();
    await expect(page.getByText(/HR review workflow/i)).toBeVisible();
  });

  test('operations status page renders', async ({ page }) => {
    await signInAdmin(page, { adminBase, adminEmail, adminPassword });
    await page.goto(`${adminBase}/operations-status`);

    await expect(page.getByRole('heading', { name: /Operations status/i }).last()).toBeVisible();
    await expect(page.getByText(/Platform health/i)).toBeVisible();
  });

  test('operations hub renders fleet decisions workspace', async ({ page }) => {
    await signInAdmin(page, { adminBase, adminEmail, adminPassword });
    await page.goto(`${adminBase}/operations`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByText(/Can I assign a vehicle now/i)).toBeVisible({ timeout: 20000 });
    await expect(page.locator('main')).toContainText(/Production fleet board/i, { timeout: 20000 });
    await page.getByRole('button', { name: /Available Cars/i }).click();
    await expect(page.getByRole('heading', { name: /Available Cars/i })).toBeVisible();
    await page.getByRole('button', { name: /Close/i }).click();
    await page.getByText(/Production fleet board/i).scrollIntoViewIfNeeded();
    const boardSection = page.locator('section').filter({ hasText: /Production fleet board/i }).last();
    await boardSection.locator('tbody tr').first().getByRole('button', { name: /Open/i }).click();
    const drawer = page.locator('aside').filter({ hasText: /Operations Detail/i });
    await expect(drawer.getByText(/Operations Detail/i)).toBeVisible();
    await expect(drawer.getByText(/Current location/i)).toBeVisible();
  });

  test('driving school dashboard renders', async ({ page }) => {
    await signInAdmin(page, { adminBase, adminEmail, adminPassword });
    await page.goto(`${adminBase}/driving-school`);

    await expect(page.getByRole('heading', { name: /Driving school dashboard/i })).toBeVisible();
    await expect(page.getByText(/Registration, training, exams, DL, payments, documents/i)).toBeVisible();
  });

  test('live tracking page renders', async ({ page }) => {
    await signInAdmin(page, { adminBase, adminEmail, adminPassword });
    await page.goto(`${adminBase}/tracking`);

    await expect(page.getByRole('heading', { name: /Live Fleet Map/i }).first()).toBeVisible();
  });

  test('live tracking opens trip and vehicle history drill-downs from the selected vehicle panel', async ({ page }) => {
    await signInAdmin(page, { adminBase, adminEmail, adminPassword });
    await page.goto(`${adminBase}/tracking`);

    await expect(page.getByRole('heading', { name: /Quick detail/i })).toBeVisible();
    await expect(page.getByText(/Current odometer/i)).toBeVisible();
    await expect(page.getByText(/Last fuel/i)).toBeVisible();
    await expect(page.getByText(/Last maintenance/i)).toBeVisible();

    await page.getByRole('button', { name: /Route history/i }).click();
    await expect(page.getByRole('button', { name: /Route history/i })).toHaveClass(/btn(?!.*btn-secondary)/);

    await page.getByRole('link', { name: /Open trip/i }).click();
    await expect(page).toHaveURL(/\/trips\/.+/);
    await expect(page.getByRole('heading', { level: 2, name: /Timeline/i })).toBeVisible();

    await page.goto(`${adminBase}/tracking`);
    await page.getByRole('link', { name: /Open vehicle history/i }).click();
    await expect(page).toHaveURL(/\/maintenance\/vehicles\/.+\/history$/);
    await expect(page.getByText(/Vehicle maintenance timeline/i)).toBeVisible();
  });

  test('admin chat page renders', async ({ page }) => {
    await signInAdmin(page, { adminBase, adminEmail, adminPassword });
    await page.goto(`${adminBase}/chat`);

    await expect(page.getByRole('heading', { name: /^Chat$/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Chat Rooms/i })).toBeVisible();
  });

  test('maintenance notifications page renders', async ({ page }) => {
    await signInAdmin(page, { adminBase, adminEmail, adminPassword });
    await page.goto(`${adminBase}/maintenance/notifications`);

    await expect(page.getByRole('heading', { name: /Driver instructions and service alerts/i })).toBeVisible();
    await expect(page.getByText(/Maintenance notifications/i)).toBeVisible();
  });

  test('payments workspace opens detail drawer', async ({ page }) => {
    await signInAdmin(page, { adminBase, adminEmail, adminPassword });
    await page.goto(`${adminBase}/payments`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /^Payments$/i })).toBeVisible();
    await page.locator('tbody tr').first().click();
    await expect(page.getByText(/Linked invoice context/i).last()).toBeVisible();
  });

  test('maintenance due page renders', async ({ page }) => {
    await signInAdmin(page, { adminBase, adminEmail, adminPassword });
    await page.goto(`${adminBase}/maintenance/due`);

    await expect(page.getByRole('heading', { name: /Due Soon Maintenance/i })).toBeVisible();
  });

  test('maintenance overdue page renders', async ({ page }) => {
    await signInAdmin(page, { adminBase, adminEmail, adminPassword });
    await page.goto(`${adminBase}/maintenance/overdue`);

    await expect(page.getByRole('heading', { name: /Overdue Maintenance/i })).toBeVisible();
  });

  test('maintenance blocked page renders', async ({ page }) => {
    await signInAdmin(page, { adminBase, adminEmail, adminPassword });
    await page.goto(`${adminBase}/maintenance/blocked`);

    await expect(page.getByRole('heading', { name: /Blocked Vehicles/i })).toBeVisible();
  });

  test('document detail opens from document center', async ({ page }) => {
    await signInAdmin(page, { adminBase, adminEmail, adminPassword });
    await page.goto(`${adminBase}/documents`);

    await Promise.all([
      page.waitForURL(/\/documents\/[^/]+$/),
      page.getByRole('link', { name: /View detail/i }).first().click(),
    ]);
    await expect(page.getByRole('link', { name: /Back to Document Center/i })).toBeVisible();
  });

  test('driver kyc detail opens from queue and supports review update', async ({ page }) => {
    await signInAdmin(page, { adminBase, adminEmail, adminPassword });
    await page.goto(`${adminBase}/hr/driver-kyc`);

    const actionableRow = page.locator('tbody tr').filter({ hasText: /submitted|under review/i }).first();
    await actionableRow.getByRole('link', { name: /Review/i }).click();
    await expect(page.getByText(/Driver KYC review/i)).toBeVisible();
    await page.getByPlaceholder(/Add review notes for HR and the driver/i).fill('Playwright status check');
    await page.getByRole('button', { name: /Request Resubmission/i }).click();
    await expect(page.getByText(/Current status: under review/i)).toBeVisible();
  });

  test('repair order detail opens from maintenance workspace', async ({ page }) => {
    await signInAdmin(page, { adminBase, adminEmail, adminPassword });
    await page.goto(`${adminBase}/maintenance`);

    await page.locator('a.table-primary-link[href*="/maintenance/repair-orders/"]').first().click();
    await expect(page.getByText(/Repair order detail/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /View Vehicle History/i })).toBeVisible();
  });

  test('maintenance notification can be created', async ({ page }) => {
    await signInAdmin(page, { adminBase, adminEmail, adminPassword });
    await page.goto(`${adminBase}/maintenance/notifications`);

    const form = page.locator('form').filter({ hasText: /Notify Driver/i });
    const vehicleValue = await form.locator('select[name="vehicleId"] option').nth(1).getAttribute('value');
    await form.locator('select[name="vehicleId"]').selectOption(String(vehicleValue));
    await form.locator('input[name="maintenanceType"]').fill('Brake inspection');
    await form.locator('input[name="dueKm"]').fill('4500');
    await form.locator('input[name="dueDate"]').fill('2026-03-20');
    await form.locator('textarea[name="message"]').fill('Please report for brake inspection.');
    await form.getByRole('button', { name: /Notify Driver/i }).click();

    await expect(page.getByText(/Maintenance notification sent\./i)).toBeVisible();
  });

  test('repair order can be created from maintenance workspace', async ({ page }) => {
    await signInAdmin(page, { adminBase, adminEmail, adminPassword });
    await page.goto(`${adminBase}/maintenance`);

    const form = page.locator('form').filter({ hasText: /Create Repair Order/i });
    const vehicleValue = await form.locator('select[name="vehicleId"] option').nth(1).getAttribute('value');
    await form.locator('select[name="vehicleId"]').selectOption(String(vehicleValue));
    await form.locator('input[name="maintenanceType"]').fill('Oil service');
    await form.locator('input[name="issueType"]').fill('scheduled_service');
    await form.locator('select[name="urgency"]').selectOption('medium');
    await form.locator('input[name="workshop"]').fill('Adama Workshop');
    await form.locator('input[name="technician"]').fill('Tech One');
    await form.locator('textarea[name="description"]').fill('Playwright repair order creation check');
    await form.getByRole('button', { name: /Create Repair Order/i }).click();

    await expect(page.getByText(/Repair order created\./i)).toBeVisible();
  });

  test('repair order status can be updated from detail page', async ({ page }) => {
    await signInAdmin(page, { adminBase, adminEmail, adminPassword });
    await page.goto(`${adminBase}/maintenance`);

    await page.locator('a.table-primary-link[href*="/maintenance/repair-orders/"]').first().click();
    await page.getByRole('button', { name: /Schedule Service/i }).click();

    await expect(page.getByText(/Repair order moved to scheduled\./i)).toBeVisible();
  });
  test('commercial workspace opens shipment and document drill-downs', async ({ page }) => {
    await signInAdmin(page, { adminBase, adminEmail, adminPassword });
    await page.goto(`${adminBase}/customer`);

    await expect(page.getByText(/Customer overview/i).first()).toBeVisible();
    await expect(page.getByText(/Milestones, ETA, route status, POD/i)).toBeVisible();

    await page.getByRole('link', { name: /Open documents/i }).click();
    await expect(page).toHaveURL(/\/documents$/);
    await page.getByRole('link', { name: /View detail/i }).first().click();
    await expect(page).toHaveURL(/\/documents\/.+/);
    await expect(page.getByText(/Document detail/i)).toBeVisible();

    await page.goto(`${adminBase}/customer`);
    await page.getByRole('link', { name: /Open agreements/i }).click();
    await page.locator('a.table-primary-link[href*="/agreements/"]').first().click();
    await expect(page).toHaveURL(/\/agreements\/.+/);
  });
});
