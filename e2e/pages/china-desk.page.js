const { expect } = require('@playwright/test');
const { adminBaseUrl } = require('../helpers/environment');
const { testIds } = require('../selectors/test-ids');

class ChinaDeskPage {
  constructor(page) {
    this.page = page;
  }

  async open(bookingId) {
    await this.page.goto(`${adminBaseUrl}/china-desk/queue?booking=${encodeURIComponent(bookingId)}`, { waitUntil: 'domcontentloaded' });
    await expect(this.page.getByTestId(testIds.chinaDeskQueue)).toBeVisible();
  }

  async selectShipment(bookingId) {
    await this.page.getByTestId(testIds.chinaQueueSearch).fill(bookingId);
    await this.page.getByTestId(testIds.queueRow(bookingId)).click();
    await expect(this.page.getByTestId(testIds.chinaSelectedShipment)).toBeVisible();
  }

  async fillOriginReadiness(details = {}) {
    await this.page.getByTestId(testIds.chinaFieldContainerNumber).fill(details.containerNumber || 'MSCU4444444');
    await this.page.getByTestId(testIds.chinaFieldSealNumber).fill(details.sealNumber || 'SL-444444');
    await this.page.getByTestId(testIds.chinaFieldStuffingDatetime).fill(details.stuffingDateTime || '2026-03-28 08:00');
    await this.page.getByTestId(testIds.chinaFieldStuffingLocation).fill(details.stuffingLocation || 'Yantian stuffing yard');
    await this.page.getByTestId(testIds.chinaFieldLoadedBy).fill(details.loadedBy || 'Origin Team A');
    await this.page.getByTestId(testIds.chinaSaveContainerDetails).click({ force: true });
    await this.page.getByTestId(testIds.chinaConfirmStuffing).click({ force: true });
    await this.page.getByTestId(testIds.chinaConfirmGateIn).click({ force: true });
    await this.page.getByTestId(testIds.chinaFieldVesselName).fill(details.vesselName || 'MV Test Horizon');
    await this.page.getByTestId(testIds.chinaFieldVoyageNumber).fill(details.voyageNumber || 'VH-100');
    await this.page.getByTestId(testIds.chinaFieldCarrier).fill(details.carrier || 'MSC');
    await this.page.getByTestId(testIds.chinaFieldEtd).fill(details.etd || '2026-03-29 10:00');
    await this.page.getByTestId(testIds.chinaFieldEtaDjibouti).fill(details.etaDjibouti || '2026-04-04 16:00');
    await this.page.getByTestId(testIds.chinaSaveVesselHandoff).click({ force: true });
    const handoffButton = this.page.getByTestId(testIds.chinaHandoffToDjibouti);
    const isEnabled = await handoffButton.isEnabled().catch(() => false);
    if (isEnabled) {
      await handoffButton.click({ force: true });
    }
  }
}

module.exports = { ChinaDeskPage };
