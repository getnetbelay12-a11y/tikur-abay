const { expect } = require('@playwright/test');
const { adminBaseUrl } = require('../helpers/environment');
const { testIds } = require('../selectors/test-ids');

class DjiboutiReleasePage {
  constructor(page) {
    this.page = page;
  }

  async open(bookingId) {
    await this.page.goto(`${adminBaseUrl}/operations/djibouti-release?booking=${encodeURIComponent(bookingId)}`, { waitUntil: 'domcontentloaded' });
    await expect(this.page.getByTestId(testIds.djiboutiQueue)).toBeVisible();
  }

  async selectShipment(bookingId) {
    await this.page.getByTestId(`djibouti-queue-row-${bookingId}`).click({ force: true });
    await expect(this.page.getByTestId(testIds.djiboutiSelectedShipment)).toContainText(bookingId);
  }

  async processRelease() {
    await this.page.getByTestId(testIds.djiboutiConfirmVesselArrived).click({ force: true });
    await this.page.getByTestId(testIds.djiboutiConfirmDischarge).click({ force: true });
    await this.page.getByTestId(testIds.djiboutiConfirmLineRelease).click({ force: true });
    await this.page.getByTestId(testIds.djiboutiMarkCustomsCleared).click({ force: true });
    await this.page.getByTestId(testIds.djiboutiMarkTransitPacketComplete).click({ force: true });
    await this.page.getByTestId(testIds.djiboutiMarkGateOutReady).click({ force: true });
    const documentsReadyButton = this.page.getByRole('button', { name: /Mark documents ready for clearance/i });
    if (await documentsReadyButton.isVisible().catch(() => false)) {
      await documentsReadyButton.click({ force: true });
    }
    await this.page.getByTestId(testIds.djiboutiSendToClearance).click({ force: true });
  }
}

module.exports = { DjiboutiReleasePage };
