function uniqueSuffix() {
  return `${Date.now()}`;
}

function buildShipmentFixture(overrides = {}) {
  const suffix = uniqueSuffix();
  return {
    idSuffix: suffix,
    customerName: `Test Customer PLC ${suffix}`,
    companyName: `Test Customer PLC ${suffix}`,
    phone: '0911111111',
    email: 'test@test.com',
    consigneeName: `Test Consignee ${suffix}`,
    consigneeCompany: `Test Consignee PLC ${suffix}`,
    shipmentMode: 'Ocean Freight',
    bookingType: 'FCL',
    serviceLevel: 'Door to Door',
    originCountry: 'China',
    originCityPort: 'Shenzhen / Yantian',
    originPort: 'Yantian',
    destinationCountry: 'Ethiopia',
    destinationCityPort: 'Addis Ababa',
    destinationPort: 'Djibouti',
    deliveryAddress: 'Addis Ababa, Ethiopia',
    cargoCategory: 'Electronics',
    commodityDescription: 'Electronics',
    grossWeight: '2000',
    volumeCbm: '10',
    packageCount: '100',
    packagingType: 'Cartons',
    containerType: '40FT High Cube',
    containerSize: '40FT',
    containerQuantity: '1',
    cargoReadyDate: '2026-04-01',
    ...overrides,
  };
}

module.exports = {
  buildShipmentFixture,
  uniqueSuffix,
};
