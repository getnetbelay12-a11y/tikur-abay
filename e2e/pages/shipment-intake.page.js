const { expect } = require('@playwright/test');
const { adminBaseUrl } = require('../helpers/environment');
const { testIds } = require('../selectors/test-ids');

const bookingStorageKey = 'tikur-abay:booking-quote-desk:requests';

function controlForLabel(page, label) {
  return page.locator('label').filter({ hasText: label }).locator('input, textarea, select').first();
}

class ShipmentIntakePage {
  constructor(page) {
    this.page = page;
  }

  async open(mode = 'booking') {
    await this.page.goto(`${adminBaseUrl}/shipments/intake?mode=${mode}`, { waitUntil: 'domcontentloaded' });
    await expect(this.page.getByTestId(testIds.shipmentIntakeWorkspace)).toBeVisible();
  }

  async fillShipmentDetails(fixture) {
    await this.page.getByTestId(testIds.fieldShipmentMode).selectOption(fixture.shipmentMode);
    await this.page.getByTestId(testIds.fieldBookingType).selectOption(fixture.bookingType);
    await this.page.getByTestId(testIds.fieldServiceLevel).selectOption(fixture.serviceLevel);
    await this.page.getByTestId(testIds.fieldCustomerName).fill(fixture.customerName);
    await this.page.getByTestId(testIds.fieldCompanyName).fill(fixture.companyName);
    await this.page.getByTestId(testIds.fieldPhone).fill(fixture.phone);
    await this.page.getByTestId(testIds.fieldEmail).fill(fixture.email);
    await this.page.getByTestId(testIds.fieldConsigneeName).fill(fixture.consigneeName);
    await controlForLabel(this.page, 'Consignee company').fill(fixture.consigneeCompany);
    await this.page.getByTestId(testIds.fieldOriginCountry).fill(fixture.originCountry);
    await this.page.getByTestId(testIds.fieldOriginCityPort).fill(fixture.originCityPort);
    await this.page.getByTestId(testIds.fieldOriginPort).fill(fixture.originPort);
    await this.page.getByTestId(testIds.fieldDestinationCountry).fill(fixture.destinationCountry);
    await this.page.getByTestId(testIds.fieldDestinationCityPort).fill(fixture.destinationCityPort);
    await this.page.getByTestId(testIds.fieldDestinationPort).fill(fixture.destinationPort);
    await this.page.getByTestId(testIds.fieldDeliveryAddress).fill(fixture.deliveryAddress);
    await this.page.getByTestId(testIds.fieldCargoCategory).fill(fixture.cargoCategory);
    await this.page.getByTestId(testIds.fieldCommodityDescription).fill(fixture.commodityDescription);
    await this.page.getByTestId(testIds.fieldGrossWeight).fill(fixture.grossWeight);
    await this.page.getByTestId(testIds.fieldVolumeCbm).fill(fixture.volumeCbm);
    await this.page.getByTestId(testIds.fieldPackageCount).fill(fixture.packageCount);
    await this.page.getByTestId(testIds.fieldPackagingType).fill(fixture.packagingType);
    await this.page.getByTestId(testIds.fieldContainerType).selectOption(fixture.containerType);
    await this.page.getByTestId(testIds.fieldContainerSize).selectOption(fixture.containerSize);
    await this.page.getByTestId(testIds.fieldContainerQuantity).fill(fixture.containerQuantity);
    await this.page.getByTestId(testIds.fieldCargoReadyDate).fill(fixture.cargoReadyDate);
  }

  async generateQuote() {
    await this.page.getByTestId(testIds.generateQuote).click();
    await expect(this.page.getByTestId(testIds.intakeNotice)).toContainText('Quote');
  }

  async approveQuoteByEmail() {
    await this.page.getByTestId(testIds.approveQuoteEmail).click();
    await Promise.race([
      expect(this.page.getByTestId(testIds.intakeNotice)).toContainText('Booking number'),
      expect(this.page.getByTestId(testIds.confirmBooking)).toBeEnabled(),
      expect(this.page.getByText(/Latest record:\s*BK-/i)).toBeVisible(),
    ]);
  }

  async confirmBooking() {
    await this.page.getByTestId(testIds.confirmBooking).click();
    await Promise.race([
      expect(this.page.getByTestId(testIds.intakeNotice)).toContainText('Booking'),
      expect(this.page.getByText(/Latest record:\s*BK-/i)).toBeVisible(),
      expect(this.page.getByRole('button', { name: /Open in China Desk/i })).toBeVisible(),
    ]);
  }

  async latestRequestForCustomer(customerName) {
    return this.page.evaluate(({ key, customer }) => {
      const requests = JSON.parse(window.localStorage.getItem(key) || '[]');
      return requests.find((item) => item.customerName === customer) || null;
    }, { key: bookingStorageKey, customer: customerName });
  }
}

module.exports = { ShipmentIntakePage, bookingStorageKey };
