const { test, expect } = require('@playwright/test');
const { ShipmentIntakePage } = require('../../pages/shipment-intake.page');
const { loginAsHQ } = require('../../helpers/auth');

test.describe('Guardrails @critical', () => {
  test.use({ storageState: 'e2e/.auth/hq.json' });

  test('booking stays blocked before quote acceptance', async ({ page }) => {
    await loginAsHQ(page);
    const intake = new ShipmentIntakePage(page);
    await intake.open('booking');
    await expect(page.getByTestId('confirm-booking')).toBeDisabled();
    await expect(page.getByTestId('convert-to-booking')).toBeDisabled();
  });
});
