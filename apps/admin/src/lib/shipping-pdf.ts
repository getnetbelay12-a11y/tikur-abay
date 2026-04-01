'use client';

import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';

type PdfLogoImage = {
  binary: string;
  width: number;
  height: number;
};

type OperationsPdfPalette = {
  brand: ReturnType<typeof rgb>;
  brandDark: ReturnType<typeof rgb>;
  ink: ReturnType<typeof rgb>;
  muted: ReturnType<typeof rgb>;
  line: ReturnType<typeof rgb>;
  panel: ReturnType<typeof rgb>;
  panelStrong: ReturnType<typeof rgb>;
  surface: ReturnType<typeof rgb>;
};

type ShippingBillPdfPayload = {
  fileName: string;
  title: string;
  subtitle: string;
  lines: string[];
};

type BlankFormPdfPayload = {
  fileName: string;
};

export type LogisticsQuoteRequestFormPdfPayload = BlankFormPdfPayload & {
  quoteReference?: string;
  companyName?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  tinVatNumber?: string;
  address?: string;
  consignee?: string;
  notifyParty?: string;
  serviceLevel?: string;
  bookingType?: string;
  incoterm?: string;
  placeOfReceipt?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  finalDestination?: string;
  shipmentDate?: string;
  deliveryDate?: string;
  preferredMode?: string;
  hsCode?: string;
  grossWeight?: string;
  volumeCbm?: string;
  packageSummary?: string;
  marksAndNumbers?: string;
  containerType?: string;
  freightTerm?: string;
  prepaidAt?: string;
  lcNumber?: string;
  bankPermitNumber?: string;
  consigneeTinNumber?: string;
  tinAreaCode?: string;
  vesselName?: string;
  voyageNumber?: string;
  etaLoadingPort?: string;
  quotedAmount?: string;
  seaFreight?: string;
  clearance?: string;
  inlandTransport?: string;
  validityDate?: string;
  paymentTerm?: string;
  goodsDescription?: string;
};

export type QuoteAcceptanceFormPdfPayload = BlankFormPdfPayload & {
  quotationReference?: string;
  customerRequestNo?: string;
  quotationDate?: string;
  companyName?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  country?: string;
  address?: string;
  serviceDescription?: string;
  acceptedAmount?: string;
  seaFreight?: string;
  clearance?: string;
  inlandTransport?: string;
  validityPeriod?: string;
  serviceStartDate?: string;
  paymentTerms?: string;
};

export type BookingRequestFormPdfPayload = BlankFormPdfPayload & {
  shipper?: string;
  consignee?: string;
  notifyParty?: string;
  secondNotifyParty?: string;
  primaryContact?: string;
  phone?: string;
  email?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  placeOfDelivery?: string;
  serviceContractNumber?: string;
  vesselName?: string;
  shippingDate?: string;
  routingRemarks?: string;
  cargoType?: string;
  containerTypeQuantity?: string;
  paymentTerms?: string;
  packageUnits?: string;
  descriptionOfGoods?: string;
  measurementDimensions?: string;
  goodsType?: string;
  grossWeight?: string;
  reeferTemperature?: string;
  humidity?: string;
  otherRequirement?: string;
};

export type ChargeInvoicePdfPayload = {
  fileName: string;
  invoiceNo: string;
  shipmentReference: string;
  customerName: string;
  lcReference?: string;
  invoiceType: string;
  dueDate?: string;
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  createdBy: string;
  notes?: string;
  lines: Array<{
    chargeType: string;
    description: string;
    amount: number;
    currency: string;
    taxAmount?: number;
  }>;
};

export type OfficialReceiptPdfPayload = {
  fileName: string;
  officialReceiptNo: string;
  shipmentReference: string;
  customerName: string;
  issuedAt: string;
  issuedBy: string;
  paymentMethod: string;
  amountReceived: number;
  currency: string;
  invoiceReferences: string[];
  paymentReferences: string[];
  note?: string;
};

export type ReleaseAuthorizationPdfPayload = {
  fileName: string;
  releaseAuthorizationId: string;
  shipmentReference: string;
  customerName: string;
  releaseMode: string;
  recipientName: string;
  issuedAt: string;
  issuedBy: string;
  financeStatus: string;
  note?: string;
  documents: string[];
};

export type DocumentHandoverSheetPdfPayload = {
  fileName: string;
  shipmentReference: string;
  customerName: string;
  issuedAt: string;
  issuedBy: string;
  handoverTo: string;
  purpose: string;
  documentRows: Array<{
    name: string;
    reference?: string;
    status?: string;
  }>;
};

export type DriverReimbursementStatementPdfPayload = {
  fileName: string;
  shipmentReference: string;
  tripId?: string;
  driverName: string;
  claimReference: string;
  paidAt: string;
  paidBy: string;
  method: string;
  referenceNo?: string;
  amountPaid: number;
  currency: string;
  items: Array<{
    category: string;
    location?: string;
    amount: number;
    approvedAmount: number;
    note?: string;
  }>;
};

export type DriverTransitPacketPdfPayload = {
  fileName: string;
  tripId: string;
  bookingNumber: string;
  customerName: string;
  route: string;
  truckPlate: string;
  trailerPlate: string;
  driverName: string;
  containerNumber: string;
  sealNumber: string;
  departureTime?: string;
  documents: string[];
  notes?: string;
};

async function buildLogisticsQuoteRequestFormPdfBytes(payload: LogisticsQuoteRequestFormPdfPayload) {
  const { pdf, page, font, bold, blue, dark, pale } = await createOperationsPdfShell(
    'LOGISTICS SERVICE QUOTATION REQUEST FORM',
    'Customer intake form for quotation, lane design, customs scope, and multimodal planning.',
  );

  page.drawRectangle({ x: 40, y: 648, width: 532, height: 28, color: pale, borderColor: blue, borderWidth: 1 });
  page.drawText('Use this form before pricing. Complete customer, cargo, lane, timing, and additional service requirements.', {
    x: 48,
    y: 659,
    size: 8,
    font: bold,
    color: blue,
  });

  drawFieldRow(page, font, bold, blue, dark, 596, [
    { label: 'Quote Reference', value: payload.quoteReference || ' ', x: 40, width: 160 },
    { label: 'Company Name', value: payload.companyName || ' ', x: 200, width: 184 },
    { label: 'Contact Person', value: payload.contactPerson || ' ', x: 384, width: 188 },
  ], { height: 46, labelBandHeight: 20, valueFontSize: 7.8, valueLineGap: 10 });
  drawFieldRow(page, font, bold, blue, dark, 546, [
    { label: 'Telephone', value: payload.phone || ' ', x: 40, width: 170 },
    { label: 'Email Address', value: payload.email || ' ', x: 210, width: 210 },
    { label: 'TIN / VAT Number', value: payload.tinVatNumber || ' ', x: 420, width: 152 },
  ], { height: 46, labelBandHeight: 20, valueFontSize: 7.8, valueLineGap: 9 });
  drawBlankEntryBox(page, font, bold, blue, dark, 40, 486, 532, 48, 'Full Address', payload.address || '', { labelBandHeight: 20, valueFontSize: 7.5, valueLineGap: 9 });
  drawFieldRow(page, font, bold, blue, dark, 436, [
    { label: 'Consignee', value: payload.consignee || ' ', x: 40, width: 260 },
    { label: 'Notify Party', value: payload.notifyParty || ' ', x: 300, width: 272 },
  ], { height: 42, labelBandHeight: 18, valueFontSize: 7.2, valueLineGap: 9 });
  drawFieldRow(page, font, bold, blue, dark, 390, [
    { label: 'Port of Loading', value: payload.portOfLoading || ' ', x: 40, width: 176 },
    { label: 'Port of Discharge', value: payload.portOfDischarge || ' ', x: 216, width: 176 },
    { label: 'Final Destination', value: payload.finalDestination || ' ', x: 392, width: 180 },
  ], { height: 46, labelBandHeight: 20, valueFontSize: 7.5, valueLineGap: 9 });
  drawFieldRow(page, font, bold, blue, dark, 340, [
    { label: 'Place of Receipt', value: payload.placeOfReceipt || ' ', x: 40, width: 176 },
    { label: 'Shipment Date', value: payload.shipmentDate || ' ', x: 216, width: 176 },
    { label: 'Delivery Date', value: payload.deliveryDate || ' ', x: 392, width: 180 },
  ], { height: 42, labelBandHeight: 18, valueFontSize: 7.2, valueLineGap: 9 });
  drawFieldRow(page, font, bold, blue, dark, 292, [
    { label: 'Shipment Mode', value: payload.preferredMode || ' ', x: 40, width: 130 },
    { label: 'Service Level', value: payload.serviceLevel || ' ', x: 170, width: 130 },
    { label: 'Booking Type', value: payload.bookingType || ' ', x: 300, width: 126 },
    { label: 'Incoterm', value: payload.incoterm || ' ', x: 426, width: 146 },
  ], { height: 42, labelBandHeight: 18, valueFontSize: 7.1, valueLineGap: 9 });
  drawFieldRow(page, font, bold, blue, dark, 244, [
    { label: 'HS Code', value: payload.hsCode || ' ', x: 40, width: 126 },
    { label: 'Gross Weight', value: payload.grossWeight || ' ', x: 166, width: 126 },
    { label: 'Volume (CBM)', value: payload.volumeCbm || ' ', x: 292, width: 126 },
    { label: 'Package Summary', value: payload.packageSummary || ' ', x: 418, width: 154 },
  ], { height: 42, labelBandHeight: 18, valueFontSize: 7.1, valueLineGap: 9 });
  drawFieldRow(page, font, bold, blue, dark, 196, [
    { label: 'Container Type / Qty', value: payload.containerType || ' ', x: 40, width: 176 },
    { label: 'Freight Term', value: payload.freightTerm || ' ', x: 216, width: 176 },
    { label: 'Prepaid At', value: payload.prepaidAt || ' ', x: 392, width: 180 },
  ], { height: 42, labelBandHeight: 18, valueFontSize: 7.1, valueLineGap: 9 });
  drawBlankEntryBox(page, font, bold, blue, dark, 40, 126, 532, 58, 'Goods Description', payload.goodsDescription || '', { labelBandHeight: 20, valueFontSize: 7.5, valueLineGap: 9 });
  drawBlankEntryBox(page, font, bold, blue, dark, 40, 64, 532, 52, 'Marks & Numbers', payload.marksAndNumbers || '', { labelBandHeight: 20, valueFontSize: 7.5, valueLineGap: 9 });

  drawSignaturePanel(page, font, bold, blue, dark, 40, 8, 252, 'Customer Authorization', ['Name / Position', 'Signature / Seal', 'Date']);
  drawSignaturePanel(page, font, bold, blue, dark, 320, 8, 252, 'TATL Intake Control', ['Received by', 'Commercial notes', 'Date']);

  const continuation = await drawOperationsPdfShellPage(
    pdf,
    'LOGISTICS SERVICE QUOTATION REQUEST FORM',
    'Commercial, customs, vessel, and customer-control details for quotation review.',
  );
  const continuationPage = continuation.page;
  const continuationFont = continuation.font;
  const continuationBold = continuation.bold;
  const continuationBlue = continuation.blue;
  const continuationDark = continuation.dark;
  const continuationPale = continuation.pale;

  continuationPage.drawRectangle({ x: 40, y: 646, width: 532, height: 28, color: continuationPale, borderColor: continuationBlue, borderWidth: 1 });
  continuationPage.drawText('Attach this page to the quote email so customer, finance, and origin operations review the same shipment details.', {
    x: 48,
    y: 657,
    size: 8,
    font: continuationBold,
    color: continuationBlue,
  });
  drawFieldRow(continuationPage, continuationFont, continuationBold, continuationBlue, continuationDark, 592, [
    { label: 'LC Number', value: payload.lcNumber || ' ', x: 40, width: 170 },
    { label: 'Bank Permit Number', value: payload.bankPermitNumber || ' ', x: 210, width: 182 },
    { label: 'Validity Date', value: payload.validityDate || ' ', x: 392, width: 180 },
  ], { height: 44, labelBandHeight: 18, valueFontSize: 7.6, valueLineGap: 9 });
  drawFieldRow(continuationPage, continuationFont, continuationBold, continuationBlue, continuationDark, 544, [
    { label: 'Consignee TIN', value: payload.consigneeTinNumber || ' ', x: 40, width: 170 },
    { label: 'TIN Area Code', value: payload.tinAreaCode || ' ', x: 210, width: 182 },
    { label: 'Payment Term', value: payload.paymentTerm || ' ', x: 392, width: 180 },
  ], { height: 44, labelBandHeight: 18, valueFontSize: 7.6, valueLineGap: 9 });
  drawFieldRow(continuationPage, continuationFont, continuationBold, continuationBlue, continuationDark, 496, [
    { label: 'Vessel', value: payload.vesselName || ' ', x: 40, width: 176 },
    { label: 'Voyage', value: payload.voyageNumber || ' ', x: 216, width: 176 },
    { label: 'ETA Loading Port', value: payload.etaLoadingPort || ' ', x: 392, width: 180 },
  ], { height: 44, labelBandHeight: 18, valueFontSize: 7.6, valueLineGap: 9 });
  drawFieldRow(continuationPage, continuationFont, continuationBold, continuationBlue, continuationDark, 448, [
    { label: 'Quoted Amount', value: payload.quotedAmount || ' ', x: 40, width: 170 },
    { label: 'Sea Freight', value: payload.seaFreight || ' ', x: 210, width: 182 },
    { label: 'Djibouti Clearance', value: payload.clearance || ' ', x: 392, width: 180 },
  ], { height: 44, labelBandHeight: 18, valueFontSize: 7.6, valueLineGap: 9 });
  drawFieldRow(continuationPage, continuationFont, continuationBold, continuationBlue, continuationDark, 400, [
    { label: 'Inland Truck / Road', value: payload.inlandTransport || ' ', x: 40, width: 532 },
  ], { height: 44, labelBandHeight: 18, valueFontSize: 7.6, valueLineGap: 9 });
  drawBlankEntryBox(continuationPage, continuationFont, continuationBold, continuationBlue, continuationDark, 40, 292, 532, 96, 'Operational Summary', [
    payload.placeOfReceipt ? `Place of receipt: ${payload.placeOfReceipt}` : '',
    payload.portOfLoading ? `Port of loading: ${payload.portOfLoading}` : '',
    payload.portOfDischarge ? `Port of discharge: ${payload.portOfDischarge}` : '',
    payload.finalDestination ? `Final delivery: ${payload.finalDestination}` : '',
    payload.containerType ? `Container setup: ${payload.containerType}` : '',
  ].filter(Boolean).join('\n'), { labelBandHeight: 20, valueFontSize: 7.6, valueLineGap: 10 });
  drawBlankEntryBox(continuationPage, continuationFont, continuationBold, continuationBlue, continuationDark, 40, 182, 532, 100, 'Commercial Review Notes', [
    payload.goodsDescription ? `Cargo: ${payload.goodsDescription}` : '',
    payload.marksAndNumbers ? `Marks & numbers: ${payload.marksAndNumbers}` : '',
    payload.packageSummary ? `Packages: ${payload.packageSummary}` : '',
    payload.hsCode ? `HS code: ${payload.hsCode}` : '',
  ].filter(Boolean).join('\n'), { labelBandHeight: 20, valueFontSize: 7.6, valueLineGap: 10 });
  drawSignaturePanel(continuationPage, continuationFont, continuationBold, continuationBlue, continuationDark, 40, 40, 252, 'Commercial Review', ['Reviewed by', 'Quote reference', 'Date']);
  drawSignaturePanel(continuationPage, continuationFont, continuationBold, continuationBlue, continuationDark, 320, 40, 252, 'Customer Confirmation', ['Reviewed by customer', 'Comments / stamp', 'Date']);

  return pdf.save();
}

async function buildQuoteAcceptanceFormPdfBytes(payload: QuoteAcceptanceFormPdfPayload) {
  const { pdf, page, font, bold, blue, dark, pale } = await createOperationsPdfShell(
    'QUOTATION ACCEPTANCE FORM',
    'Customer confirmation form for accepted quotation, rate structure, and service start.',
  );

  page.drawRectangle({ x: 40, y: 650, width: 532, height: 26, color: pale, borderColor: blue, borderWidth: 1 });
  page.drawText('Attach the approved quotation reference and use the same booking reference across finance and operations.', {
    x: 48,
    y: 660,
    size: 8,
    font: bold,
    color: blue,
  });

  drawFieldRow(page, font, bold, blue, dark, 596, [
    { label: 'Quotation Reference No.', value: payload.quotationReference || ' ', x: 40, width: 176 },
    { label: 'Customer Request No.', value: payload.customerRequestNo || ' ', x: 216, width: 176 },
    { label: 'Date of Quotation', value: payload.quotationDate || ' ', x: 392, width: 180 },
  ]);
  drawFieldRow(page, font, bold, blue, dark, 546, [
    { label: 'Company Name', value: payload.companyName || ' ', x: 40, width: 260 },
    { label: 'Contact Person', value: payload.contactPerson || ' ', x: 300, width: 272 },
  ]);
  drawFieldRow(page, font, bold, blue, dark, 496, [
    { label: 'Telephone', value: payload.phone || ' ', x: 40, width: 170 },
    { label: 'Email Address', value: payload.email || ' ', x: 210, width: 210 },
    { label: 'Country', value: payload.country || ' ', x: 420, width: 152 },
  ]);
  drawBlankEntryBox(page, font, bold, blue, dark, 40, 430, 532, 50, 'Customer Address', payload.address || '');
  drawBlankEntryBox(page, font, bold, blue, dark, 40, 332, 256, 84, 'Service Description', payload.serviceDescription || '');
  drawBlankEntryBox(page, font, bold, blue, dark, 316, 332, 256, 84, 'Accepted Amount / Rate', payload.acceptedAmount || '');
  drawFieldRow(page, font, bold, blue, dark, 276, [
    { label: 'Sea Freight', value: payload.seaFreight || ' ', x: 40, width: 126 },
    { label: 'Clearance', value: payload.clearance || ' ', x: 166, width: 126 },
    { label: 'Inland Transport', value: payload.inlandTransport || ' ', x: 292, width: 140 },
    { label: 'Validity Period', value: payload.validityPeriod || ' ', x: 432, width: 140 },
  ]);
  drawFieldRow(page, font, bold, blue, dark, 226, [
    { label: 'Expected Service Start Date', value: payload.serviceStartDate || ' ', x: 40, width: 266 },
    { label: 'Payment Terms', value: payload.paymentTerms || ' ', x: 306, width: 266 },
  ]);

  page.drawRectangle({ x: 40, y: 132, width: 532, height: 76, borderColor: blue, borderWidth: 1 });
  drawWrappedManifestText(
    page,
    'By signing below, the customer confirms full acceptance of the approved Tikur Abay quotation and acknowledges that shipment execution, customs handling, and inland transport will proceed according to the agreed commercial terms.',
    48,
    186,
    516,
    font,
    8,
    dark,
    13,
  );

  drawSignaturePanel(page, font, bold, blue, dark, 40, 20, 252, 'Customer Signature', ['Name / Title', 'Signature / Seal', 'Date']);
  drawSignaturePanel(page, font, bold, blue, dark, 320, 20, 252, 'TATL Acknowledgment', ['Received and confirmed by', 'Position', 'Date']);

  return pdf.save();
}

async function buildBookingRequestFormPdfBytes(payload: BookingRequestFormPdfPayload) {
  const { pdf, page, font, bold, blue, dark, pale } = await createOperationsPdfShell(
    'BOOKING REQUEST FORM',
    'Shipment booking instruction for shipper, routing, container, and cargo execution details.',
  );

  page.drawRectangle({ x: 40, y: 648, width: 532, height: 28, color: pale, borderColor: blue, borderWidth: 1 });
  page.drawText('Use this form after quotation approval or for direct booking instructions from the customer / shipper.', {
    x: 48,
    y: 659,
    size: 8,
    font: bold,
    color: blue,
  });

  drawBlankEntryBox(page, font, bold, blue, dark, 40, 566, 256, 66, 'Shipper / Exporter', payload.shipper || '');
  drawBlankEntryBox(page, font, bold, blue, dark, 316, 566, 256, 66, 'Consignee', payload.consignee || '', { labelBandHeight: 20, valueFontSize: 7.4, valueLineGap: 9 });
  drawBlankEntryBox(page, font, bold, blue, dark, 40, 486, 256, 66, 'Notify Party', payload.notifyParty || '', { labelBandHeight: 20, valueFontSize: 7.4, valueLineGap: 9 });
  drawBlankEntryBox(page, font, bold, blue, dark, 316, 486, 256, 66, 'Second Notify Party', payload.secondNotifyParty || '', { labelBandHeight: 20, valueFontSize: 7.4, valueLineGap: 9 });
  drawFieldRow(page, font, bold, blue, dark, 432, [
    { label: 'Primary Contact', value: payload.primaryContact || ' ', x: 40, width: 176 },
    { label: 'Telephone', value: payload.phone || ' ', x: 216, width: 176 },
    { label: 'Email', value: payload.email || ' ', x: 392, width: 180 },
  ], { height: 46, labelBandHeight: 20, valueFontSize: 7.5, valueLineGap: 9 });
  drawFieldRow(page, font, bold, blue, dark, 382, [
    { label: 'Port of Loading', value: payload.portOfLoading || ' ', x: 40, width: 176 },
    { label: 'Port of Discharge', value: payload.portOfDischarge || ' ', x: 216, width: 176 },
    { label: 'Place of Delivery', value: payload.placeOfDelivery || ' ', x: 392, width: 180 },
  ], { height: 46, labelBandHeight: 20, valueFontSize: 7.5, valueLineGap: 9 });
  drawFieldRow(page, font, bold, blue, dark, 332, [
    { label: 'Service Contract Number', value: payload.serviceContractNumber || ' ', x: 40, width: 176 },
    { label: 'Feeder / Vessel Name', value: payload.vesselName || ' ', x: 216, width: 176 },
    { label: 'Shipping Date / Schedule', value: payload.shippingDate || ' ', x: 392, width: 180 },
  ], { height: 46, labelBandHeight: 20, valueFontSize: 7.5, valueLineGap: 9 });
  drawBlankEntryBox(page, font, bold, blue, dark, 40, 270, 532, 48, 'Special Routing Remarks', payload.routingRemarks || '', { labelBandHeight: 20, valueFontSize: 7.3, valueLineGap: 9 });
  drawFieldRow(page, font, bold, blue, dark, 216, [
    { label: 'Cargo Type', value: payload.cargoType || ' ', x: 40, width: 126 },
    { label: 'Container Type / Qty', value: payload.containerTypeQuantity || ' ', x: 166, width: 126 },
    { label: 'Payment Terms', value: payload.paymentTerms || ' ', x: 292, width: 140 },
    { label: 'Packages / Units', value: payload.packageUnits || ' ', x: 432, width: 140 },
  ], { height: 46, labelBandHeight: 20, valueFontSize: 7.3, valueLineGap: 9 });
  page.drawRectangle({ x: 40, y: 154, width: 532, height: 48, color: pale, borderColor: blue, borderWidth: 1 });
  page.drawText('CARGO PARTICULAR FURNISHED BY SHIPPER', {
    x: 40 + (532 - bold.widthOfTextAtSize('CARGO PARTICULAR FURNISHED BY SHIPPER', 8.5)) / 2,
    y: 183,
    size: 8.5,
    font: bold,
    color: blue,
  });
  drawWrappedManifestText(
    page,
    'See continuation cargo-particular page for detailed goods description and additional shipper-furnished cargo details.',
    52,
    166,
    508,
    font,
    7.2,
    dark,
    9,
  );
  drawFieldRow(page, font, bold, blue, dark, 100, [
    { label: 'Gross Weight', value: payload.grossWeight || ' ', x: 40, width: 126 },
    { label: 'Reefer Temperature', value: payload.reeferTemperature || ' ', x: 166, width: 126 },
    { label: 'Humidity', value: payload.humidity || ' ', x: 292, width: 140 },
    { label: 'Other Requirement', value: payload.otherRequirement || ' ', x: 432, width: 140 },
  ], { height: 46, labelBandHeight: 20, valueFontSize: 7.2, valueLineGap: 9 });

  drawSignaturePanel(page, font, bold, blue, dark, 40, 8, 252, 'Customer / Shipper Approval', ['Name / Title', 'Signature / Seal', 'Date']);
  drawSignaturePanel(page, font, bold, blue, dark, 320, 8, 252, 'TATL Booking Control', ['Accepted by', 'Booking reference', 'Operations notes']);

  const continuation = await drawOperationsPdfShellPage(
    pdf,
    'BOOKING REQUEST FORM',
    'Cargo particulars continuation sheet for shipper-furnished goods description and handling detail.',
  );
  const continuationPage = continuation.page;
  const goodsSectionTitle = 'CARGO PARTICULAR FURNISHED BY SHIPPER';

  continuationPage.drawRectangle({ x: 40, y: 644, width: 532, height: 28, color: pale, borderColor: blue, borderWidth: 1 });
  continuationPage.drawText(goodsSectionTitle, {
    x: 40 + (532 - bold.widthOfTextAtSize(goodsSectionTitle, 9)) / 2,
    y: 654,
    size: 9,
    font: bold,
    color: blue,
  });

  drawFieldRow(continuationPage, font, bold, blue, dark, 590, [
    { label: 'Booking / Contract Ref.', value: payload.serviceContractNumber || ' ', x: 40, width: 176 },
    { label: 'Cargo Type', value: payload.cargoType || ' ', x: 216, width: 176 },
    { label: 'Container Type / Qty', value: payload.containerTypeQuantity || ' ', x: 392, width: 180 },
  ], { height: 42, labelBandHeight: 18, valueFontSize: 7.5, valueLineGap: 9 });

  drawBlankEntryBox(
    continuationPage,
    font,
    bold,
    blue,
    dark,
    40,
    300,
    360,
    270,
    'Description of Goods',
    payload.descriptionOfGoods || '',
    { labelBandHeight: 22, valueFontSize: 8, valueLineGap: 11 },
  );

  drawBlankEntryBox(
    continuationPage,
    font,
    bold,
    blue,
    dark,
    412,
    454,
    160,
    116,
    'Measurement / Dimensions',
    payload.measurementDimensions || '',
    { labelBandHeight: 22, valueFontSize: 7.6, valueLineGap: 10 },
  );

  drawFieldRow(continuationPage, font, bold, blue, dark, 408, [
    { label: 'Type', value: payload.goodsType || ' ', x: 412, width: 72 },
    { label: 'Gw Weight', value: payload.grossWeight || ' ', x: 484, width: 88 },
  ], { height: 42, labelBandHeight: 18, valueFontSize: 7.3, valueLineGap: 9 });

  drawBlankEntryBox(
    continuationPage,
    font,
    bold,
    blue,
    dark,
    40,
    188,
    532,
    94,
    'Additional Cargo / Handling Requirements',
    [
      payload.reeferTemperature ? `Reefer: ${payload.reeferTemperature}` : '',
      payload.humidity ? `Humidity: ${payload.humidity}` : '',
      payload.otherRequirement ? `Other requirement: ${payload.otherRequirement}` : '',
      payload.routingRemarks ? `Routing / handling note: ${payload.routingRemarks}` : '',
    ].filter(Boolean).join('\n') || ' ',
    { labelBandHeight: 20, valueFontSize: 7.5, valueLineGap: 10 },
  );

  drawSignaturePanel(continuationPage, font, bold, blue, dark, 40, 40, 252, 'Shipper Cargo Declaration', ['Name / Title', 'Signature / Seal', 'Date']);
  drawSignaturePanel(continuationPage, font, bold, blue, dark, 320, 40, 252, 'TATL Cargo Review', ['Reviewed by', 'Booking reference', 'Remarks']);

  return pdf.save();
}

export async function buildLogisticsQuoteRequestFormPdfBase64(payload: LogisticsQuoteRequestFormPdfPayload) {
  const bytes = await buildLogisticsQuoteRequestFormPdfBytes(payload);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

export async function buildQuoteAcceptanceFormPdfBase64(payload: QuoteAcceptanceFormPdfPayload) {
  const bytes = await buildQuoteAcceptanceFormPdfBytes(payload);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

export async function buildBookingRequestFormPdfBase64(payload: BookingRequestFormPdfPayload) {
  const bytes = await buildBookingRequestFormPdfBytes(payload);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

export type ShippingManifestPdfPayload = {
  fileName: string;
  manifestType: 'freight' | 'cargo';
  vesselName: string;
  voyageNumber: string;
  portOfLoading: string;
  portOfDischarge: string;
  placeOfDelivery: string;
  sailingDate: string;
  pageLabel?: string;
  rows: Array<{
    billOfLadingNo: string;
    slotCarrierWaybillNo: string;
    shipper: string;
    consignee: string;
    notifyParty: string;
    marksAndNumbers: string;
    containerNumber: string;
    sealNumber: string;
    packageSummary: string;
    descriptionOfGoods: string;
    grossWeight: string;
    cbm: string;
    hsCode: string;
    tinNo: string;
    areaCode: string;
    cargoInTransitTo: string;
  }>;
};

export type DjiboutiGatePassPdfPayload = {
  fileName: string;
  bookingNumber: string;
  blNumber: string;
  containerNumber: string;
  sealNumber: string;
  customerName: string;
  vesselName: string;
  voyageNumber: string;
  dischargePort: string;
  terminalDepot: string;
  finalDestination: string;
  releaseOwner: string;
  expectedGateOutTime: string;
  gatePassStatus: string;
  pickupStatus: string;
};

export type DjiboutiHandoffPdfPayload = {
  fileName: string;
  bookingNumber: string;
  blNumber: string;
  containerNumber: string;
  customerName: string;
  destinationCorridor: string;
  inlandDestination: string;
  dispatchOwner: string;
  tripCreationStatus: string;
  packetItems: Array<{
    label: string;
    complete: boolean;
  }>;
};

export type TransitorClearancePdfPayload = {
  fileName: string;
  bookingNumber: string;
  blNumber: string;
  containerNumber: string;
  customerName: string;
  inlandDestination: string;
  transitorAssignedTo: string;
  transitorCompany: string;
  transitorPhone: string;
  transitorEmail: string;
  transitorClearanceNote: string;
  transitDocumentRef: string;
  transitDocumentStatus: string;
  chargesPaymentStatus: string;
  clearancePacketStatus: string;
  clearanceCompletedAt: string;
};

export type DispatchLoadingReportPdfPayload = {
  fileName: string;
  tripId: string;
  bookingNumber: string;
  blNumber: string;
  containerNumber: string;
  sealNumber: string;
  customerName: string;
  assignedTruck: string;
  assignedTrailer: string;
  assignedDriver: string;
  driverPhone: string;
  corridorRoute: string;
  originHandoffPoint: string;
  inlandDestination: string;
  plannedDepartureTime: string;
  expectedArrivalTime: string;
  dispatchOwner: string;
  dispatchNote: string;
};

export type YardReceiptPdfPayload = {
  fileName: string;
  title: string;
  bookingNumber: string;
  containerNumber: string;
  customerName: string;
  consigneeName: string;
  storageLocation: string;
  actualArrivalTime: string;
  receivedBy: string;
  receivingCompany: string;
  receivingContact: string;
  receivedAt: string;
  receiptStatus: string;
  podStatus: string;
  remarks: string;
  shortageStatus: string;
  damageStatus: string;
  issueDate: string;
};

export type TransitorBatchSheetPdfPayload = {
  fileName: string;
  batchNumber: string;
  bookingNumber: string;
  blNumber: string;
  containerNumber: string;
  customerName: string;
  inlandDestination: string;
  transitorAssignedTo: string;
  transitorCompany: string;
  transitorPhone: string;
  transitDocumentRef: string;
  transitDocumentStatus: string;
  chargesPaymentStatus: string;
  clearancePacketStatus: string;
  multimodalReceivedAt: string;
};

export type ShippingBillOfLadingPdfPayload = {
  fileName: string;
  bookingReference?: string;
  printVariant?: 'original' | 'copy';
  verifyUrl?: string;
  signatureHash?: string;
  signedBy?: string;
  documentTitle: string;
  blNumber: string;
  masterBlNumber: string;
  slotCarrierBillNumber: string;
  issueDate: string;
  placeOfIssue: string;
  shipper: string;
  consignee: string;
  notifyParty: string;
  portOfLoading: string;
  portOfDischarge: string;
  placeOfReceipt: string;
  placeOfDelivery: string;
  vessel: string;
  voyage: string;
  shippedOnBoardDate: string;
  incoterm: string;
  freightTerm: string;
  containerNumber: string;
  sealNumber: string;
  containerType: string;
  packages: string;
  weight: string;
  measurementCbm: string;
  marksAndNumbers: string;
  cargoDescription: string;
  hsCode: string;
  tinNumber: string;
  tinAreaCode: string;
  lcNumber: string;
  numberOfOriginalBills: number;
  seaFreight: string;
  clearanceFreight: string;
  inlandFreight: string;
  outputLabel: string;
};

function pdfEscape(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function htmlEscape(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const BL_PREVIEW_WIDTH = 794;
const BL_PREVIEW_HEIGHT = 1123;
const BL_PDF_WIDTH = 595.2;
const BL_PDF_HEIGHT = 841.92;

function scaleX(value: number) {
  return (value / BL_PREVIEW_WIDTH) * BL_PDF_WIDTH;
}

function scaleYFromTop(value: number) {
  return BL_PDF_HEIGHT - (value / BL_PREVIEW_HEIGHT) * BL_PDF_HEIGHT;
}

function bytesToBlob(bytes: Uint8Array) {
  const safeBytes = new Uint8Array(bytes.byteLength);
  safeBytes.set(bytes);
  return new Blob([safeBytes], { type: 'application/pdf' });
}

function normalizePdfReference(value: string, fallback = '-') {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  const leaf = raw.split('/').pop() || raw;
  const withoutExtension = leaf.replace(/\.(pdf|docx?|xlsx?|png|jpe?g|svg)$/i, '');
  const compact = withoutExtension.toLowerCase();
  if (compact.includes('final-bl-sample')) return 'Final Bill of Lading';
  if (compact.includes('bl-draft-sample')) return 'Bill of Lading Draft';
  if (compact.includes('commercial-invoice-sample')) return 'Commercial Invoice';
  if (compact.includes('packing-list-sample')) return 'Packing List';
  if (compact.includes('transit-customs-doc-sample')) return 'Transit / Customs Document';
  return withoutExtension.replace(/[_]+/g, ' ').trim();
}

type PdfBlField = {
  x: number;
  yTop: number;
  size: number;
  text: string;
  width?: number;
  lineGap?: number;
  align?: 'left' | 'center' | 'right';
  font?: 'regular' | 'bold';
};

function fitVerticalSideNote(note: string) {
  const length = note.length;
  if (length > 540) return { fontSize: 7, lineHeight: 1.02 };
  if (length > 420) return { fontSize: 8, lineHeight: 1.08 };
  return { fontSize: 9, lineHeight: 1.15 };
}

function drawWhitePanel(page: any, x: number, yTop: number, width: number, height: number) {
  page.drawRectangle({
    x: scaleX(x),
    y: scaleYFromTop(yTop + height),
    width: scaleX(width),
    height: (height / BL_PREVIEW_HEIGHT) * BL_PDF_HEIGHT,
    color: rgb(1, 1, 1),
  });
}

function wrapPdfText(text: string, font: any, size: number, maxWidth: number) {
  const normalized = String(text || '').split('\n');
  const lines: string[] = [];
  normalized.forEach((rawLine) => {
    const words = rawLine.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push('');
      return;
    }
    let current = words[0];
    for (const word of words.slice(1)) {
      const candidate = `${current} ${word}`;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }
    lines.push(current);
  });
  return lines;
}

export async function buildBillOfLadingPdfBytes(
  payload: ShippingBillOfLadingPdfPayload,
  copies: Array<{ outputLabel: string; printVariant: 'original' | 'copy' }>,
) {
  const templateBytes = await fetch('/branding/tikur-abay-bl-template.pdf').then(async (response) => {
    if (!response.ok) {
      throw new Error('Unable to load BL template PDF');
    }
    return response.arrayBuffer();
  });

  const templateDocument = await PDFDocument.load(templateBytes);
  const pdfDocument = await PDFDocument.create();
  const fontRegular = await pdfDocument.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDocument.embedFont(StandardFonts.HelveticaBold);
  const embeddedTemplatePage = await pdfDocument.embedPage(templateDocument.getPage(0));

  for (const copy of copies) {
    const page = pdfDocument.addPage([BL_PDF_WIDTH, BL_PDF_HEIGHT]);
    page.drawPage(embeddedTemplatePage);
    const fields: PdfBlField[] = [
      { x: 66, yTop: 82, width: 252, size: 8.2, text: payload.shipper, lineGap: 2.6 },
      { x: 452, yTop: 82, width: 88, size: 7.6, text: payload.bookingReference || 'Pending' },
      { x: 452, yTop: 96, width: 88, size: 7.6, text: payload.masterBlNumber },
      { x: 452, yTop: 109, width: 88, size: 7.6, text: payload.slotCarrierBillNumber },
      { x: 649, yTop: 83, width: 66, size: 7.8, text: payload.blNumber, align: 'center' },
      { x: 452, yTop: 136, width: 248, size: 7.6, text: payload.bookingReference || 'Pending' },
      { x: 66, yTop: 171, width: 252, size: 8.2, text: payload.consignee, lineGap: 2.6 },
      { x: 66, yTop: 259, width: 252, size: 8.2, text: payload.notifyParty, lineGap: 2.6 },
      { x: 64, yTop: 348, width: 108, size: 7.3, text: payload.placeOfReceipt, lineGap: 2.2 },
      { x: 179, yTop: 348, width: 106, size: 7.3, text: payload.placeOfReceipt, lineGap: 2.2 },
      { x: 64, yTop: 386, width: 77, size: 7.3, text: payload.vessel, lineGap: 2.2 },
      { x: 145, yTop: 386, width: 40, size: 7.1, text: payload.voyage, lineGap: 2.2 },
      { x: 188, yTop: 386, width: 97, size: 7.3, text: payload.portOfLoading, lineGap: 2.2 },
      { x: 64, yTop: 423, width: 108, size: 7.3, text: payload.portOfDischarge, lineGap: 2.2 },
      { x: 188, yTop: 423, width: 97, size: 7.3, text: payload.placeOfDelivery, lineGap: 2.2 },
      { x: 297, yTop: 423, width: 90, size: 7.3, text: payload.placeOfIssue, lineGap: 2.2 },
      { x: 392, yTop: 423, width: 88, size: 7.3, text: payload.placeOfIssue, lineGap: 2.2 },
      { x: 64, yTop: 492, width: 76, size: 7.1, text: `${payload.marksAndNumbers}\n${payload.containerNumber}\n${payload.sealNumber}`, lineGap: 2.1 },
      { x: 147, yTop: 492, width: 48, size: 7.1, text: payload.packages, lineGap: 2.1 },
      { x: 201, yTop: 492, width: 174, size: 7.1, text: payload.cargoDescription, lineGap: 2.1 },
      { x: 381, yTop: 492, width: 64, size: 7.1, text: payload.weight, align: 'center' },
      { x: 449, yTop: 492, width: 52, size: 7.1, text: payload.measurementCbm, align: 'center' },
      { x: 64, yTop: 724, width: 118, size: 7.8, text: '1' },
      { x: 64, yTop: 747, width: 118, size: 7.8, text: payload.packages || '' },
      { x: 64, yTop: 777, width: 45, size: 7.8, text: String(payload.numberOfOriginalBills) },
      { x: 118, yTop: 777, width: 80, size: 7.6, text: payload.slotCarrierBillNumber },
      { x: 204, yTop: 777, width: 144, size: 7.6, text: payload.placeOfIssue },
      { x: 353, yTop: 777, width: 107, size: 7.6, text: payload.shippedOnBoardDate },
      { x: 64, yTop: 814, width: 280, size: 7.1, text: 'Received, in apparent good order and condition unless otherwise stated, the Goods or containers or other packages said to contain Goods herein mentioned to be transported subject always to the exceptions, limitations, provisions, conditions and liberties contained herein and whether written, printed or stamped on the front or reverse hereof, from the place of receipt or the port of loading, whichever applicable, to the port of discharge or the place of delivery, whichever applicable. All agreements or freight engagements for shipment of the Goods are superseded by this Bill of Lading.\nIn witness whereof the Master or Agents have affirmed to the number of original Bills of Lading, one of which being accomplished, the other(s) to be void.', lineGap: 2.1 },
      { x: 353, yTop: 814, width: 126, size: 7.1, text: 'Freight and charges\nInterest shall be payable at 2% above bank lending rate at place of payment per annum and be paid on any freight and charges remaining unpaid after due date of payment', lineGap: 2.1 },
      { x: 188, yTop: 944, width: 96, size: 7.8, text: '(AS AGENT)', align: 'center', font: 'bold' },
      { x: 283, yTop: 944, width: 79, size: 7.8, text: 'for the carrier', align: 'center' },
      { x: 64, yTop: 997, width: 112, size: 7.8, text: payload.issueDate },
    ];

    for (const field of fields) {
      const font = field.font === 'bold' ? fontBold : fontRegular;
      const textSize = field.size * (BL_PDF_WIDTH / BL_PREVIEW_WIDTH);
      const maxWidth = field.width ? scaleX(field.width) : undefined;
      const lines = maxWidth ? wrapPdfText(String(field.text || ''), font, textSize, maxWidth) : String(field.text || '').split('\n');
      lines.forEach((line, index) => {
        const x = scaleX(field.x);
        const y = scaleYFromTop(field.yTop + index * (field.lineGap ?? field.size + 2));
        let drawX = x;
        if (field.align && field.width) {
          const lineWidth = font.widthOfTextAtSize(line, textSize);
          const available = scaleX(field.width);
          if (field.align === 'right') drawX = x + Math.max(0, available - lineWidth);
          if (field.align === 'center') drawX = x + Math.max(0, (available - lineWidth) / 2);
        }
        page.drawText(line, {
          x: drawX,
          y,
          size: textSize,
          font,
          color: rgb(30 / 255, 58 / 255, 138 / 255),
        });
      });
    }

    const label = copy.printVariant === 'copy' ? 'COPY' : copy.outputLabel;
    const labelSize = 17 * (BL_PDF_WIDTH / BL_PREVIEW_WIDTH);
    const labelWidth = fontBold.widthOfTextAtSize(label, labelSize);
    page.drawText(label, {
      x: scaleX(546) + Math.max(0, (scaleX(172) - labelWidth) / 2),
      y: scaleYFromTop(281),
      size: labelSize,
      font: fontBold,
      color: rgb(30 / 255, 58 / 255, 138 / 255),
    });

    if (copy.printVariant === 'copy') {
      page.drawText('COPY', {
        x: scaleX(262),
        y: scaleYFromTop(700),
        size: 54,
        font: fontBold,
        color: rgb(30 / 255, 58 / 255, 138 / 255),
        opacity: 0.045,
        rotate: degrees(-24),
      });
    }
  }

  return pdfDocument.save();
}

async function openBillOfLadingPdfWindow(
  popup: Window,
  payload: ShippingBillOfLadingPdfPayload,
  copies: Array<{ outputLabel: string; printVariant: 'original' | 'copy' }>,
) {
  popup.document.title = 'Bill of Lading';
  popup.document.body.innerHTML = '<p style="font-family: Arial, Helvetica, sans-serif; padding: 24px;">Preparing bill of lading PDF...</p>';
  const bytes = await buildBillOfLadingPdfBytes(payload, copies);
  const url = URL.createObjectURL(bytesToBlob(bytes));
  popup.location.replace(url);
  setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);
}

async function loadLogoPdfImage(): Promise<PdfLogoImage | null> {
  if (typeof window === 'undefined') return null;
  try {
    const response = await fetch('/branding/tikur-abay-logo.png');
    if (!response.ok) return null;
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = objectUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      URL.revokeObjectURL(objectUrl);
      return null;
    }
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);
    URL.revokeObjectURL(objectUrl);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const base64 = dataUrl.split(',')[1] || '';
    return {
      binary: atob(base64),
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  } catch {
    return null;
  }
}

async function buildSimplePdfBase64(payload: ShippingBillPdfPayload) {
  const logo = await loadLogoPdfImage();
  const headerText = [
    'BT',
    '/F2 11 Tf',
    '50 755 Td',
    `(${pdfEscape(payload.title)}) Tj`,
    '0 -16 Td',
    '/F1 10 Tf',
    `(${pdfEscape(payload.subtitle)}) Tj`,
    'ET',
  ];
  const logoBlock = logo
    ? ['q', '118 0 0 84 444 712 cm', '/Im1 Do', 'Q']
    : ['BT', '/F2 11 Tf', '458 756 Td', '(TIKUR ABAY) Tj', 'ET'];
  const contentStream = [
    ...logoBlock,
    ...headerText,
    '0.85 w',
    '50 700 m',
    '562 700 l',
    'S',
    'BT',
    '/F1 12 Tf',
    '50 676 Td',
    ...payload.lines.flatMap((line, index) => (index === 0 ? [`(${pdfEscape(line)}) Tj`] : ['0 -20 Td', `(${pdfEscape(line)}) Tj`])),
    'ET',
  ].join('\n');
  const resources = logo
    ? '/Font << /F1 5 0 R /F2 6 0 R >> /XObject << /Im1 7 0 R >>'
    : '/Font << /F1 5 0 R /F2 6 0 R >>';
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << ${resources} >> >> endobj`,
    `4 0 obj << /Length ${contentStream.length} >> stream\n${contentStream}\nendstream endobj`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    '6 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj',
  ];
  if (logo) {
    objects.push(
      `7 0 obj << /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logo.binary.length} >> stream\n${logo.binary}\nendstream endobj`,
    );
  }
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object) => {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return btoa(pdf);
}

export async function downloadSimpleShippingPdf(payload: ShippingBillPdfPayload) {
  if (typeof window === 'undefined') return;
  const base64 = await buildSimplePdfBase64(payload);
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = payload.fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadDriverTransitPacketPdf(
  payload: DriverTransitPacketPdfPayload,
) {
  if (typeof window === 'undefined') return;
  const { pdf, page, font, bold, blue, dark, pale } = await createOperationsPdfShell(
    'DRIVER TRANSIT PACKET',
    'Driver-side dispatch packet for corridor movement, document control, and checkpoint execution.',
  );

  drawFieldRow(page, font, bold, blue, dark, 596, [
    { label: 'Trip ID', value: payload.tripId, x: 40, width: 186 },
    { label: 'Booking Number', value: payload.bookingNumber, x: 226, width: 166 },
    { label: 'Departure Status', value: payload.departureTime || 'Pending departure confirmation', x: 392, width: 180 },
  ]);
  drawFieldRow(page, font, bold, blue, dark, 546, [
    { label: 'Customer', value: payload.customerName, x: 40, width: 176 },
    { label: 'Driver', value: payload.driverName, x: 216, width: 176 },
    { label: 'Route', value: payload.route, x: 392, width: 180 },
  ]);
  drawFieldRow(page, font, bold, blue, dark, 496, [
    { label: 'Truck Plate', value: payload.truckPlate, x: 40, width: 176 },
    { label: 'Trailer Plate', value: payload.trailerPlate, x: 216, width: 176 },
    { label: 'Container / Seal', value: `${payload.containerNumber}\n${payload.sealNumber}`, x: 392, width: 180 },
  ]);

  page.drawRectangle({ x: 40, y: 228, width: 532, height: 236, borderColor: blue, borderWidth: 1 });
  page.drawRectangle({ x: 40, y: 438, width: 532, height: 26, color: pale, borderColor: blue, borderWidth: 1 });
  page.drawText('Required driver documents and trip controls', { x: 48, y: 448, size: 9, font: bold, color: blue });
  payload.documents.slice(0, 9).forEach((item, index) => {
    const y = 412 - index * 22;
    page.drawRectangle({ x: 48, y: y - 4, width: 516, height: 18, borderColor: pale, borderWidth: 0.6 });
    page.drawText(`${index + 1}.`, { x: 56, y, size: 8, font: bold, color: blue });
    drawWrappedManifestText(page, normalizePdfReference(item, item), 74, y + 6, 482, font, 8, dark, 10);
  });

  drawBlankEntryBox(
    page,
    font,
    bold,
    blue,
    dark,
    40,
    116,
    532,
    86,
    'Dispatch Note',
    payload.notes || 'Carry the complete transit packet, verify container and seal before movement, and report every route exception immediately.',
  );
  drawSignaturePanel(page, font, bold, blue, dark, 40, 18, 252, 'Dispatch Control', ['Reviewed by dispatch', 'Packet issued', 'Date']);
  drawSignaturePanel(page, font, bold, blue, dark, 320, 18, 252, 'Driver Acknowledgement', ['Driver name', 'Signature', 'Date']);

  triggerPdfDownload(await pdf.save(), payload.fileName);
}

function drawWrappedManifestText(
  page: any,
  text: string,
  x: number,
  y: number,
  width: number,
  font: any,
  size: number,
  color: any,
  lineGap = 11,
) {
  const lines = wrapPdfText(String(text || '-'), font, size, width);
  lines.forEach((line, index) => {
    page.drawText(line, {
      x,
      y: y - index * lineGap,
      size,
      font,
      color,
    });
  });
}

function formatPdfDateTime(value: string) {
  if (!value) return 'Pending';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function triggerPdfDownload(bytes: Uint8Array, fileName: string) {
  const url = URL.createObjectURL(bytesToBlob(bytes));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function drawOperationsPdfShellPage(
  pdf: PDFDocument,
  title: string,
  subtitle: string,
) {
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const palette: OperationsPdfPalette = {
    brand: rgb(15 / 255, 78 / 255, 114 / 255),
    brandDark: rgb(11 / 255, 40 / 255, 64 / 255),
    ink: rgb(30 / 255, 41 / 255, 59 / 255),
    muted: rgb(90 / 255, 108 / 255, 128 / 255),
    line: rgb(170 / 255, 191 / 255, 210 / 255),
    panel: rgb(238 / 255, 246 / 255, 250 / 255),
    panelStrong: rgb(225 / 255, 238 / 255, 245 / 255),
    surface: rgb(250 / 255, 252 / 255, 253 / 255),
  };
  const blue = palette.brand;
  const dark = palette.ink;
  const pale = palette.panel;
  const logo = await loadLogoPdfImage();
  const companyTitle = 'TIKUR ABAY TRANSPORT & LOGISTICS PLC';
  const companyTitleSize = 14;
  const formTitleSize = 15;
  const subtitleSize = 8;
  const companyTitleWidth = bold.widthOfTextAtSize(companyTitle, companyTitleSize);
  const formTitleWidth = bold.widthOfTextAtSize(title, formTitleSize);
  const subtitleWidth = font.widthOfTextAtSize(subtitle, subtitleSize);
  const headerCenterX = 306;

  page.drawRectangle({ x: 0, y: 0, width: 612, height: 792, color: palette.surface });
  page.drawRectangle({ x: 28, y: 28, width: 556, height: 736, borderColor: palette.line, borderWidth: 1.1 });
  page.drawRectangle({ x: 28, y: 692, width: 556, height: 72, color: palette.panel });
  page.drawRectangle({ x: 28, y: 704, width: 556, height: 4, color: palette.brand });
  if (logo) {
    const bytes = Uint8Array.from(logo.binary, (char) => char.charCodeAt(0));
    const jpg = await pdf.embedJpg(bytes);
    const scale = 42 / jpg.height;
    page.drawImage(jpg, {
      x: 40,
      y: 716,
      width: jpg.width * scale,
      height: jpg.height * scale,
    });
  }
  page.drawText(companyTitle, {
    x: headerCenterX - companyTitleWidth / 2,
    y: 740,
    size: companyTitleSize,
    font: bold,
    color: palette.brand,
  });
  page.drawText(title, {
    x: headerCenterX - formTitleWidth / 2,
    y: 718,
    size: formTitleSize,
    font: bold,
    color: palette.brandDark,
  });
  page.drawText(subtitle, {
    x: headerCenterX - subtitleWidth / 2,
    y: 688,
    size: subtitleSize,
    font,
    color: palette.muted,
  });

  return { pdf, page, font, bold, blue, dark, pale, palette };
}

async function createOperationsPdfShell(title: string, subtitle: string) {
  const pdf = await PDFDocument.create();
  return drawOperationsPdfShellPage(pdf, title, subtitle);
}

function drawFieldRow(
  page: any,
  font: any,
  bold: any,
  blue: any,
  dark: any,
  y: number,
  fields: Array<{ label: string; value: string; x: number; width: number }>,
  options?: {
    height?: number;
    labelBandHeight?: number;
    valueFontSize?: number;
    valueLineGap?: number;
  },
) {
  const height = options?.height ?? 42;
  const labelBandHeight = options?.labelBandHeight ?? 18;
  const valueFontSize = options?.valueFontSize ?? 8;
  const valueLineGap = options?.valueLineGap ?? 10;
  fields.forEach((field) => {
    page.drawRectangle({
      x: field.x,
      y,
      width: field.width,
      height,
      borderColor: rgb(170 / 255, 191 / 255, 210 / 255),
      borderWidth: 0.9,
      color: rgb(250 / 255, 252 / 255, 253 / 255),
    });
    page.drawRectangle({
      x: field.x,
      y: y + height - labelBandHeight,
      width: field.width,
      height: labelBandHeight,
      color: rgb(238 / 255, 246 / 255, 250 / 255),
    });
    page.drawText(field.label, {
      x: field.x + 8,
      y: y + height - labelBandHeight + 3,
      size: 8,
      font: bold,
      color: blue,
    });
    drawWrappedManifestText(page, field.value || '-', field.x + 8, y + height - labelBandHeight - 10, field.width - 16, font, valueFontSize, dark, valueLineGap);
  });
}

function drawBlankEntryBox(
  page: any,
  font: any,
  bold: any,
  blue: any,
  dark: any,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  hint = '',
  options?: {
    labelBandHeight?: number;
    valueFontSize?: number;
    valueLineGap?: number;
  },
) {
  const labelBandHeight = options?.labelBandHeight ?? 18;
  const valueFontSize = options?.valueFontSize ?? 7;
  const valueLineGap = options?.valueLineGap ?? 10;
  page.drawRectangle({
    x,
    y,
    width,
    height,
    borderColor: rgb(170 / 255, 191 / 255, 210 / 255),
    borderWidth: 0.9,
    color: rgb(250 / 255, 252 / 255, 253 / 255),
  });
  page.drawRectangle({ x, y: y + height - labelBandHeight, width, height: labelBandHeight, color: rgb(238 / 255, 246 / 255, 250 / 255) });
  page.drawText(label, {
    x: x + 8,
    y: y + height - labelBandHeight + 4,
    size: 8,
    font: bold,
    color: blue,
  });
  if (hint) {
    drawWrappedManifestText(page, hint, x + 8, y + height - labelBandHeight - 10, width - 16, font, valueFontSize, dark, valueLineGap);
  }
}

function drawChecklistColumn(
  page: any,
  font: any,
  blue: any,
  dark: any,
  x: number,
  startY: number,
  width: number,
  items: string[],
) {
  items.forEach((item, index) => {
    const y = startY - index * 22;
    page.drawRectangle({
      x,
      y,
      width,
      height: 18,
      borderColor: rgb(170 / 255, 191 / 255, 210 / 255),
      borderWidth: 0.8,
      color: rgb(250 / 255, 252 / 255, 253 / 255),
    });
    page.drawRectangle({ x: x + 8, y: y + 4, width: 10, height: 10, borderColor: blue, borderWidth: 0.8 });
    page.drawText(item, {
      x: x + 26,
      y: y + 6,
      size: 8,
      font,
      color: dark,
    });
  });
}

function drawSignaturePanel(
  page: any,
  font: any,
  bold: any,
  blue: any,
  dark: any,
  x: number,
  y: number,
  width: number,
  title: string,
  lines: string[],
) {
  page.drawRectangle({
    x,
    y,
    width,
    height: 118,
    borderColor: rgb(170 / 255, 191 / 255, 210 / 255),
    borderWidth: 0.9,
    color: rgb(250 / 255, 252 / 255, 253 / 255),
  });
  page.drawRectangle({ x, y: y + 92, width, height: 26, color: rgb(238 / 255, 246 / 255, 250 / 255) });
  page.drawText(title, { x: x + 8, y: y + 100, size: 9, font: bold, color: blue });
  lines.forEach((line, index) => {
    const baseline = y + 74 - index * 22;
    page.drawLine({ start: { x: x + 8, y: baseline }, end: { x: x + width - 8, y: baseline }, thickness: 0.8, color: blue });
    page.drawText(line, { x: x + 8, y: baseline - 12, size: 7, font, color: dark });
  });
}

export async function downloadLogisticsQuoteRequestFormPdf(payload: LogisticsQuoteRequestFormPdfPayload) {
  if (typeof window === 'undefined') return;
  triggerPdfDownload(await buildLogisticsQuoteRequestFormPdfBytes(payload), payload.fileName);
}

export async function downloadQuoteAcceptanceFormPdf(payload: QuoteAcceptanceFormPdfPayload) {
  if (typeof window === 'undefined') return;
  triggerPdfDownload(await buildQuoteAcceptanceFormPdfBytes(payload), payload.fileName);
}

export async function downloadBookingRequestFormPdf(payload: BookingRequestFormPdfPayload) {
  if (typeof window === 'undefined') return;
  triggerPdfDownload(await buildBookingRequestFormPdfBytes(payload), payload.fileName);
}

async function buildChargeInvoicePdfBytes(payload: ChargeInvoicePdfPayload) {
  const { pdf, page, font, bold, blue, dark, pale } = await createOperationsPdfShell(
    'CUSTOMER CHARGE INVOICE',
    'Post-LC import settlement charge sheet for finance clearance and release control.',
  );

  drawFieldRow(page, font, bold, blue, dark, 596, [
    { label: 'Invoice Number', value: payload.invoiceNo, x: 40, width: 176 },
    { label: 'Shipment Reference', value: payload.shipmentReference, x: 216, width: 176 },
    { label: 'Invoice Type', value: payload.invoiceType, x: 392, width: 180 },
  ]);
  drawFieldRow(page, font, bold, blue, dark, 546, [
    { label: 'Customer', value: payload.customerName, x: 40, width: 266 },
    { label: 'LC / Bank Reference', value: payload.lcReference || 'Pending', x: 306, width: 266 },
  ]);
  drawFieldRow(page, font, bold, blue, dark, 496, [
    { label: 'Due Date', value: payload.dueDate ? formatPdfDateTime(payload.dueDate) : 'Pending', x: 40, width: 176 },
    { label: 'Issued By', value: payload.createdBy, x: 216, width: 176 },
    { label: 'Currency', value: payload.currency, x: 392, width: 180 },
  ]);

  page.drawRectangle({ x: 40, y: 230, width: 532, height: 238, borderColor: blue, borderWidth: 1 });
  page.drawRectangle({ x: 40, y: 440, width: 532, height: 28, color: pale, borderColor: blue, borderWidth: 1 });
  page.drawText('Charge lines', { x: 48, y: 450, size: 9, font: bold, color: blue });

  const columns = [
    { label: 'Charge Type', x: 48, width: 120 },
    { label: 'Description', x: 176, width: 236 },
    { label: 'Amount', x: 420, width: 64 },
    { label: 'Tax', x: 492, width: 36 },
    { label: 'Curr.', x: 536, width: 28 },
  ] as const;
  columns.forEach((column) => {
    page.drawText(column.label, { x: column.x, y: 426, size: 7, font: bold, color: blue });
  });
  page.drawLine({ start: { x: 40, y: 418 }, end: { x: 572, y: 418 }, thickness: 1, color: blue });
  [168, 412, 484, 528].forEach((x) => {
    page.drawLine({ start: { x, y: 230 }, end: { x, y: 440 }, thickness: 0.8, color: blue });
  });

  payload.lines.slice(0, 7).forEach((line, index) => {
    const y = 396 - index * 28;
    page.drawText(line.chargeType.replace(/_/g, ' '), { x: 48, y, size: 8, font: bold, color: dark });
    drawWrappedManifestText(page, line.description || line.chargeType, 176, y + 8, 228, font, 7, dark, 10);
    page.drawText(Number(line.amount || 0).toLocaleString('en-US'), { x: 420, y, size: 8, font, color: dark });
    page.drawText(Number(line.taxAmount || 0).toLocaleString('en-US'), { x: 492, y, size: 8, font, color: dark });
    page.drawText(line.currency || payload.currency, { x: 536, y, size: 8, font, color: dark });
    page.drawLine({ start: { x: 40, y: y - 10 }, end: { x: 572, y: y - 10 }, thickness: 0.5, color: pale });
  });

  drawFieldRow(page, font, bold, blue, dark, 172, [
    { label: 'Subtotal', value: `${payload.currency} ${payload.subtotal.toLocaleString('en-US')}`, x: 40, width: 176 },
    { label: 'Tax', value: `${payload.currency} ${payload.tax.toLocaleString('en-US')}`, x: 216, width: 176 },
    { label: 'Invoice Total', value: `${payload.currency} ${payload.total.toLocaleString('en-US')}`, x: 392, width: 180 },
  ]);
  drawBlankEntryBox(page, font, bold, blue, dark, 40, 84, 532, 70, 'Finance Note', payload.notes || 'Customer payment receipts must be submitted to Tikur Abay Finance for verification before release.');
  drawSignaturePanel(page, font, bold, blue, dark, 40, 8, 252, 'Finance Issuance', ['Prepared by finance', 'Authorized signature / seal', 'Date']);
  drawSignaturePanel(page, font, bold, blue, dark, 320, 8, 252, 'Customer Acknowledgement', ['Received by customer', 'Reference / stamp', 'Date']);

  return pdf.save();
}

async function buildOfficialReceiptPdfBytes(payload: OfficialReceiptPdfPayload) {
  const { pdf, page, font, bold, blue, dark, pale } = await createOperationsPdfShell(
    'OFFICIAL RECEIPT',
    'Tikur Abay Transport & Logistics Plc official payment receipt.',
  );

  drawFieldRow(page, font, bold, blue, dark, 596, [
    { label: 'Receipt Number', value: payload.officialReceiptNo, x: 40, width: 176 },
    { label: 'Shipment Reference', value: payload.shipmentReference, x: 216, width: 176 },
    { label: 'Issued At', value: formatPdfDateTime(payload.issuedAt), x: 392, width: 180 },
  ]);
  drawFieldRow(page, font, bold, blue, dark, 546, [
    { label: 'Customer', value: payload.customerName, x: 40, width: 266 },
    { label: 'Received By', value: payload.issuedBy, x: 306, width: 266 },
  ]);
  drawFieldRow(page, font, bold, blue, dark, 496, [
    { label: 'Payment Method', value: payload.paymentMethod.replace(/_/g, ' '), x: 40, width: 176 },
    { label: 'Amount Received', value: `${payload.currency} ${payload.amountReceived.toLocaleString('en-US')}`, x: 216, width: 176 },
    { label: 'Status', value: 'OFFICIAL', x: 392, width: 180 },
  ]);

  page.drawRectangle({ x: 40, y: 298, width: 252, height: 166, borderColor: blue, borderWidth: 1 });
  page.drawRectangle({ x: 320, y: 298, width: 252, height: 166, borderColor: blue, borderWidth: 1 });
  page.drawRectangle({ x: 40, y: 438, width: 252, height: 26, color: pale, borderColor: blue, borderWidth: 1 });
  page.drawRectangle({ x: 320, y: 438, width: 252, height: 26, color: pale, borderColor: blue, borderWidth: 1 });
  page.drawText('Linked invoice references', { x: 48, y: 448, size: 9, font: bold, color: blue });
  page.drawText('Verified payment references', { x: 328, y: 448, size: 9, font: bold, color: blue });
  drawWrappedManifestText(page, payload.invoiceReferences.join('\n') || 'No linked invoice', 48, 422, 236, font, 8, dark, 13);
  drawWrappedManifestText(page, payload.paymentReferences.join('\n') || 'No linked payment receipt', 328, 422, 236, font, 8, dark, 13);

  drawBlankEntryBox(page, font, bold, blue, dark, 40, 180, 532, 92, 'Receipt Note', payload.note || 'Payment verified by Tikur Abay Finance. Cargo release remains subject to finance clearance and release authorization.');
  drawSignaturePanel(page, font, bold, blue, dark, 40, 24, 252, 'Finance Signature', ['Received by', 'Official seal', 'Date']);
  drawSignaturePanel(page, font, bold, blue, dark, 320, 24, 252, 'Customer Copy Control', ['Delivered through portal / email', 'Receipt status', 'Date']);

  return pdf.save();
}

async function buildReleaseAuthorizationPdfBytes(payload: ReleaseAuthorizationPdfPayload) {
  const { pdf, page, font, bold, blue, dark, pale } = await createOperationsPdfShell(
    'CARGO RELEASE AUTHORIZATION',
    'Release approval for direct customer handover or dry-port cargo release.',
  );

  drawFieldRow(page, font, bold, blue, dark, 596, [
    { label: 'Release Authorization', value: payload.releaseAuthorizationId, x: 40, width: 176 },
    { label: 'Shipment Reference', value: payload.shipmentReference, x: 216, width: 176 },
    { label: 'Issued At', value: formatPdfDateTime(payload.issuedAt), x: 392, width: 180 },
  ]);
  drawFieldRow(page, font, bold, blue, dark, 546, [
    { label: 'Customer', value: payload.customerName, x: 40, width: 266 },
    { label: 'Release Mode', value: payload.releaseMode.replace(/_/g, ' '), x: 306, width: 266 },
  ]);
  drawFieldRow(page, font, bold, blue, dark, 496, [
    { label: 'Recipient / Agent', value: payload.recipientName, x: 40, width: 266 },
    { label: 'Finance Status', value: payload.financeStatus.replace(/_/g, ' '), x: 306, width: 266 },
  ]);

  page.drawRectangle({ x: 40, y: 266, width: 532, height: 188, borderColor: blue, borderWidth: 1 });
  page.drawRectangle({ x: 40, y: 428, width: 532, height: 26, color: pale, borderColor: blue, borderWidth: 1 });
  page.drawText('Authorized document pack', { x: 48, y: 438, size: 9, font: bold, color: blue });
  drawWrappedManifestText(page, payload.documents.map((item, index) => `${index + 1}. ${item}`).join('\n') || 'Release note only', 48, 410, 516, font, 8, dark, 13);

  drawBlankEntryBox(page, font, bold, blue, dark, 40, 144, 532, 96, 'Release Instruction', payload.note || 'Cargo may be released only against this approved authorization and after recipient identity verification.');
  drawSignaturePanel(page, font, bold, blue, dark, 40, 18, 252, 'Tikur Abay Authorization', ['Issued by finance / operations', 'Signature / seal', 'Date']);
  drawSignaturePanel(page, font, bold, blue, dark, 320, 18, 252, 'Receiving Desk Confirmation', ['Dry-port agent / customer rep', 'Signature', 'Date']);

  return pdf.save();
}

async function buildDocumentHandoverSheetPdfBytes(payload: DocumentHandoverSheetPdfPayload) {
  const { pdf, page, font, bold, blue, dark, pale } = await createOperationsPdfShell(
    'DOCUMENT HANDOVER SHEET',
    'Shipment-side control sheet for customs, release, and interchange papers.',
  );

  drawFieldRow(page, font, bold, blue, dark, 596, [
    { label: 'Shipment Reference', value: payload.shipmentReference, x: 40, width: 176 },
    { label: 'Customer', value: payload.customerName, x: 216, width: 176 },
    { label: 'Issued At', value: formatPdfDateTime(payload.issuedAt), x: 392, width: 180 },
  ]);
  drawFieldRow(page, font, bold, blue, dark, 546, [
    { label: 'Issued By', value: payload.issuedBy, x: 40, width: 266 },
    { label: 'Handed Over To', value: payload.handoverTo, x: 306, width: 266 },
  ]);
  drawBlankEntryBox(page, font, bold, blue, dark, 40, 468, 532, 54, 'Purpose', payload.purpose);

  page.drawRectangle({ x: 40, y: 132, width: 532, height: 310, borderColor: blue, borderWidth: 1 });
  page.drawRectangle({ x: 40, y: 416, width: 532, height: 26, color: pale, borderColor: blue, borderWidth: 1 });
  page.drawText('Document checklist', { x: 48, y: 426, size: 9, font: bold, color: blue });
  page.drawText('Document', { x: 48, y: 402, size: 7, font: bold, color: blue });
  page.drawText('Reference', { x: 330, y: 402, size: 7, font: bold, color: blue });
  page.drawText('Status', { x: 492, y: 402, size: 7, font: bold, color: blue });
  page.drawLine({ start: { x: 320, y: 132 }, end: { x: 320, y: 416 }, thickness: 0.8, color: blue });
  page.drawLine({ start: { x: 484, y: 132 }, end: { x: 484, y: 416 }, thickness: 0.8, color: blue });

  payload.documentRows.slice(0, 10).forEach((row, index) => {
    const y = 380 - index * 26;
    drawWrappedManifestText(page, row.name, 48, y, 260, font, 8, dark, 10);
    drawWrappedManifestText(page, row.reference || '-', 330, y, 144, font, 8, dark, 10);
    drawWrappedManifestText(page, row.status || 'prepared', 492, y, 72, font, 8, dark, 10);
    page.drawLine({ start: { x: 40, y: y - 10 }, end: { x: 572, y: y - 10 }, thickness: 0.5, color: pale });
  });

  drawSignaturePanel(page, font, bold, blue, dark, 40, 12, 252, 'Handed Over By', ['Name / desk', 'Signature', 'Date']);
  drawSignaturePanel(page, font, bold, blue, dark, 320, 12, 252, 'Received By', ['Agent / customer representative', 'Signature', 'Date']);

  return pdf.save();
}

async function buildDriverReimbursementStatementPdfBytes(payload: DriverReimbursementStatementPdfPayload) {
  const { pdf, page, font, bold, blue, dark, pale } = await createOperationsPdfShell(
    'DRIVER REIMBURSEMENT STATEMENT',
    'Approved driver out-of-pocket refund statement.',
  );

  drawFieldRow(page, font, bold, blue, dark, 596, [
    { label: 'Claim Reference', value: payload.claimReference, x: 40, width: 176 },
    { label: 'Shipment Reference', value: payload.shipmentReference, x: 216, width: 176 },
    { label: 'Trip ID', value: payload.tripId || 'Pending', x: 392, width: 180 },
  ]);
  drawFieldRow(page, font, bold, blue, dark, 546, [
    { label: 'Driver', value: payload.driverName, x: 40, width: 266 },
    { label: 'Paid By', value: payload.paidBy, x: 306, width: 266 },
  ]);
  drawFieldRow(page, font, bold, blue, dark, 496, [
    { label: 'Paid At', value: formatPdfDateTime(payload.paidAt), x: 40, width: 176 },
    { label: 'Method', value: payload.method.replace(/_/g, ' '), x: 216, width: 176 },
    { label: 'Reference', value: payload.referenceNo || 'Pending', x: 392, width: 180 },
  ]);

  page.drawRectangle({ x: 40, y: 196, width: 532, height: 272, borderColor: blue, borderWidth: 1 });
  page.drawRectangle({ x: 40, y: 442, width: 532, height: 26, color: pale, borderColor: blue, borderWidth: 1 });
  page.drawText('Approved reimbursement items', { x: 48, y: 452, size: 9, font: bold, color: blue });
  page.drawText('Category', { x: 48, y: 428, size: 7, font: bold, color: blue });
  page.drawText('Location / Note', { x: 176, y: 428, size: 7, font: bold, color: blue });
  page.drawText('Claimed', { x: 420, y: 428, size: 7, font: bold, color: blue });
  page.drawText('Approved', { x: 500, y: 428, size: 7, font: bold, color: blue });
  page.drawLine({ start: { x: 168, y: 196 }, end: { x: 168, y: 442 }, thickness: 0.8, color: blue });
  page.drawLine({ start: { x: 412, y: 196 }, end: { x: 412, y: 442 }, thickness: 0.8, color: blue });
  page.drawLine({ start: { x: 492, y: 196 }, end: { x: 492, y: 442 }, thickness: 0.8, color: blue });

  payload.items.slice(0, 8).forEach((item, index) => {
    const y = 404 - index * 28;
    drawWrappedManifestText(page, item.category.replace(/_/g, ' '), 48, y, 110, font, 8, dark, 10);
    drawWrappedManifestText(page, [item.location, item.note].filter(Boolean).join(' · ') || '-', 176, y, 228, font, 7, dark, 10);
    page.drawText(`${payload.currency} ${Number(item.amount || 0).toLocaleString('en-US')}`, { x: 420, y, size: 8, font, color: dark });
    page.drawText(`${payload.currency} ${Number(item.approvedAmount || 0).toLocaleString('en-US')}`, { x: 500, y, size: 8, font: bold, color: dark });
    page.drawLine({ start: { x: 40, y: y - 10 }, end: { x: 572, y: y - 10 }, thickness: 0.5, color: pale });
  });

  drawFieldRow(page, font, bold, blue, dark, 146, [
    { label: 'Amount Paid', value: `${payload.currency} ${payload.amountPaid.toLocaleString('en-US')}`, x: 40, width: 266 },
    { label: 'Status', value: 'REIMBURSED', x: 306, width: 266 },
  ]);
  drawSignaturePanel(page, font, bold, blue, dark, 40, 20, 252, 'Finance Payment Confirmation', ['Paid by', 'Signature / seal', 'Date']);
  drawSignaturePanel(page, font, bold, blue, dark, 320, 20, 252, 'Driver Acknowledgement', ['Driver name', 'Signature', 'Date']);

  return pdf.save();
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

export async function buildChargeInvoicePdfBase64(payload: ChargeInvoicePdfPayload) {
  return bytesToBase64(await buildChargeInvoicePdfBytes(payload));
}

export async function buildOfficialReceiptPdfBase64(payload: OfficialReceiptPdfPayload) {
  return bytesToBase64(await buildOfficialReceiptPdfBytes(payload));
}

export async function buildReleaseAuthorizationPdfBase64(payload: ReleaseAuthorizationPdfPayload) {
  return bytesToBase64(await buildReleaseAuthorizationPdfBytes(payload));
}

export async function buildDocumentHandoverSheetPdfBase64(payload: DocumentHandoverSheetPdfPayload) {
  return bytesToBase64(await buildDocumentHandoverSheetPdfBytes(payload));
}

export async function buildDriverReimbursementStatementPdfBase64(payload: DriverReimbursementStatementPdfPayload) {
  return bytesToBase64(await buildDriverReimbursementStatementPdfBytes(payload));
}

export async function downloadChargeInvoicePdf(payload: ChargeInvoicePdfPayload) {
  if (typeof window === 'undefined') return;
  triggerPdfDownload(await buildChargeInvoicePdfBytes(payload), payload.fileName);
}

export async function downloadOfficialReceiptPdf(payload: OfficialReceiptPdfPayload) {
  if (typeof window === 'undefined') return;
  triggerPdfDownload(await buildOfficialReceiptPdfBytes(payload), payload.fileName);
}

export async function downloadReleaseAuthorizationPdf(payload: ReleaseAuthorizationPdfPayload) {
  if (typeof window === 'undefined') return;
  triggerPdfDownload(await buildReleaseAuthorizationPdfBytes(payload), payload.fileName);
}

export async function downloadDocumentHandoverSheetPdf(payload: DocumentHandoverSheetPdfPayload) {
  if (typeof window === 'undefined') return;
  triggerPdfDownload(await buildDocumentHandoverSheetPdfBytes(payload), payload.fileName);
}

export async function downloadDriverReimbursementStatementPdf(payload: DriverReimbursementStatementPdfPayload) {
  if (typeof window === 'undefined') return;
  triggerPdfDownload(await buildDriverReimbursementStatementPdfBytes(payload), payload.fileName);
}

export async function downloadShippingManifestPdf(payload: ShippingManifestPdfPayload) {
  if (typeof window === 'undefined') return;
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const blue = rgb(15 / 255, 78 / 255, 114 / 255);
  const dark = rgb(30 / 255, 41 / 255, 59 / 255);
  const muted = rgb(90 / 255, 108 / 255, 128 / 255);
  const pale = rgb(238 / 255, 246 / 255, 250 / 255);
  const lighter = rgb(250 / 255, 252 / 255, 253 / 255);
  const line = rgb(170 / 255, 191 / 255, 210 / 255);
  const logo = await loadLogoPdfImage();
  const companyTitle = 'TIKUR ABAY TRANSPORT & LOGISTICS PLC';
  const title = payload.manifestType === 'freight' ? 'FREIGHT MANIFEST' : 'CARGO MANIFEST';
  const subtitle = 'System-generated manifest from the Tikur Abay shipping workspace';
  const headerCenterX = 306;
  const companyTitleWidth = bold.widthOfTextAtSize(companyTitle, 14);
  const titleWidth = bold.widthOfTextAtSize(title, 15);
  const subtitleWidth = font.widthOfTextAtSize(subtitle, 8);

  page.drawRectangle({ x: 0, y: 0, width: 612, height: 792, color: lighter });
  page.drawRectangle({ x: 28, y: 28, width: 556, height: 736, borderColor: line, borderWidth: 1.1 });
  page.drawRectangle({ x: 28, y: 692, width: 556, height: 72, color: pale });
  page.drawRectangle({ x: 28, y: 704, width: 556, height: 4, color: blue });

  if (logo) {
    const bytes = Uint8Array.from(logo.binary, (char) => char.charCodeAt(0));
    const jpg = await pdf.embedJpg(bytes);
    const scale = 42 / jpg.height;
    page.drawImage(jpg, {
      x: 40,
      y: 716,
      width: jpg.width * scale,
      height: jpg.height * scale,
    });
  }

  page.drawText(companyTitle, {
    x: headerCenterX - companyTitleWidth / 2,
    y: 740,
    size: 14,
    font: bold,
    color: blue,
  });
  page.drawText(title, {
    x: headerCenterX - titleWidth / 2,
    y: 718,
    size: 15,
    font: bold,
    color: dark,
  });
  page.drawText(subtitle, {
    x: headerCenterX - subtitleWidth / 2,
    y: 688,
    size: 8,
    font,
    color: muted,
  });

  const drawHeaderRow = (y: number, label: string, value: string) => {
    page.drawRectangle({ x: 42, y, width: 528, height: 24, borderColor: line, borderWidth: 1, color: lighter });
    page.drawRectangle({ x: 43, y: y + 1, width: 526, height: 22, color: lighter });
    page.drawText(label, { x: 52, y: y + 8, size: 8, font: bold, color: blue });
    page.drawText(`: ${value || '-'}`, { x: 184, y: y + 8, size: 8, font, color: dark });
  };

  drawHeaderRow(686, 'Port of Loading', payload.portOfLoading);
  drawHeaderRow(662, 'Port of Discharge', payload.portOfDischarge);
  drawHeaderRow(638, 'Place of Delivery', payload.placeOfDelivery);
  drawHeaderRow(614, 'Vessel / Voyage No.', `${payload.vesselName} / ${payload.voyageNumber}`);
  drawHeaderRow(590, 'Sailing Date', payload.sailingDate ? formatPdfDateTime(payload.sailingDate) : 'Pending');
  drawHeaderRow(566, 'Page', payload.pageLabel || `1 / ${Math.max(payload.rows.length, 1)}`);

  page.drawRectangle({ x: 42, y: 380, width: 528, height: 170, borderColor: line, borderWidth: 1 });
  page.drawRectangle({ x: 43, y: 381, width: 526, height: 138, color: lighter });
  page.drawRectangle({ x: 42, y: 520, width: 528, height: 30, color: pale, borderColor: blue, borderWidth: 1 });

  const columns = [
    { label: 'Marks & Numbers', x: 48, width: 74 },
    { label: 'Container No.', x: 124, width: 68 },
    { label: 'Seal No.', x: 194, width: 56 },
    { label: 'No. & Type of Pkg', x: 252, width: 74 },
    { label: 'Description of Goods', x: 328, width: 126 },
    { label: 'Gross Weight', x: 456, width: 54 },
    { label: 'CBM', x: 512, width: 50 },
  ] as const;
  columns.forEach((column) => {
    page.drawLine({ start: { x: column.x - 2, y: 380 }, end: { x: column.x - 2, y: 550 }, thickness: 1, color: blue });
    drawWrappedManifestText(page, column.label, column.x, 538, column.width - 4, bold, 7, blue, 9);
  });
  page.drawLine({ start: { x: 570, y: 380 }, end: { x: 570, y: 550 }, thickness: 1, color: blue });
  page.drawLine({ start: { x: 42, y: 520 }, end: { x: 570, y: 520 }, thickness: 1, color: blue });

  const row = payload.rows[0];
  if (row) {
    drawWrappedManifestText(page, row.marksAndNumbers, 48, 506, 70, font, 8, dark);
    drawWrappedManifestText(page, row.containerNumber, 124, 506, 64, font, 8, dark);
    drawWrappedManifestText(page, row.sealNumber, 194, 506, 52, font, 8, dark);
    drawWrappedManifestText(page, row.packageSummary, 252, 506, 70, font, 8, dark);
    drawWrappedManifestText(page, row.descriptionOfGoods, 328, 506, 122, font, 8, dark);
    drawWrappedManifestText(page, row.grossWeight, 456, 506, 50, font, 8, dark);
    drawWrappedManifestText(page, row.cbm, 512, 506, 44, font, 8, dark);
  }

  page.drawRectangle({ x: 42, y: 274, width: 528, height: 88, borderColor: line, borderWidth: 1 });
  page.drawRectangle({ x: 42, y: 274, width: 258, height: 88, borderColor: line, borderWidth: 1 });
  page.drawRectangle({ x: 300, y: 274, width: 270, height: 88, borderColor: line, borderWidth: 1 });
  page.drawRectangle({ x: 43, y: 275, width: 256, height: 86, color: lighter });
  page.drawRectangle({ x: 301, y: 275, width: 268, height: 86, color: lighter });
  if (row) {
    page.drawText('Shipper', { x: 52, y: 346, size: 8, font: bold, color: blue });
    drawWrappedManifestText(page, row.shipper, 52, 330, 236, font, 8, dark, 12);
    page.drawText('Consignee', { x: 310, y: 346, size: 8, font: bold, color: blue });
    drawWrappedManifestText(page, row.consignee, 310, 330, 248, font, 8, dark, 12);
    page.drawText('Notify Party', { x: 310, y: 300, size: 8, font: bold, color: blue });
    drawWrappedManifestText(page, row.notifyParty, 310, 284, 248, font, 8, dark, 12);
  }

  page.drawRectangle({ x: 42, y: 156, width: 528, height: 102, borderColor: line, borderWidth: 1 });
  page.drawRectangle({ x: 43, y: 157, width: 526, height: 100, color: lighter });
  if (row) {
    drawWrappedManifestText(
      page,
      [
        `Bill of Lading No.: ${row.billOfLadingNo}`,
        `Slot Carrier's Waybill No.: ${row.slotCarrierWaybillNo}`,
        `HS CODE: ${row.hsCode}`,
        `TIN NO.: ${row.tinNo}`,
        `AREA CODE: ${row.areaCode}`,
        `CARGO IN TRANSIT TO: ${row.cargoInTransitTo}`,
      ].join('\n'),
      52,
      238,
      508,
      font,
      8,
      dark,
      13,
    );
  }

  page.drawLine({ start: { x: 42, y: 142 }, end: { x: 570, y: 142 }, thickness: 0.8, color: line });
  page.drawText(`Generated ${title.toLowerCase()} for ${payload.vesselName} / ${payload.voyageNumber}`, {
    x: 42,
    y: 132,
    size: 8,
    font,
    color: muted,
  });

  const bytes = await pdf.save();
  triggerPdfDownload(bytes, payload.fileName);
}

export async function downloadDjiboutiGatePassPdf(payload: DjiboutiGatePassPdfPayload) {
  if (typeof window === 'undefined') return;
  const { pdf, page, font, bold, blue, dark, pale } = await createOperationsPdfShell(
    'DJIBOUTI GATE PASS',
    'Terminal pickup control for multimodal release and inland handoff.',
  );

  page.drawRectangle({ x: 40, y: 628, width: 532, height: 40, color: pale, borderColor: blue, borderWidth: 1 });
  page.drawText('Gate pass is valid only when line release, customs release, and transit packet are complete.', {
    x: 48,
    y: 644,
    size: 8,
    font: bold,
    color: blue,
  });

  drawFieldRow(page, font, bold, blue, dark, 570, [
    { label: 'Booking Number', value: payload.bookingNumber, x: 40, width: 168 },
    { label: 'B/L Number', value: normalizePdfReference(payload.blNumber, payload.blNumber), x: 208, width: 180 },
    { label: 'Container / Seal', value: `${payload.containerNumber}\n${payload.sealNumber}`, x: 388, width: 184 },
  ]);
  drawFieldRow(page, font, bold, blue, dark, 520, [
    { label: 'Customer', value: payload.customerName, x: 40, width: 220 },
    { label: 'Vessel / Voyage', value: `${payload.vesselName}\n${payload.voyageNumber}`, x: 260, width: 170 },
    { label: 'Discharge Port', value: payload.dischargePort, x: 430, width: 142 },
  ]);
  drawFieldRow(page, font, bold, blue, dark, 470, [
    { label: 'Terminal / Depot', value: payload.terminalDepot, x: 40, width: 200 },
    { label: 'Final Destination', value: payload.finalDestination, x: 240, width: 200 },
    { label: 'Release Owner', value: payload.releaseOwner, x: 440, width: 132 },
  ]);
  drawFieldRow(page, font, bold, blue, dark, 420, [
    { label: 'Expected Gate-Out', value: formatPdfDateTime(payload.expectedGateOutTime), x: 40, width: 266 },
    { label: 'Gate Pass Status', value: payload.gatePassStatus, x: 306, width: 130 },
    { label: 'Pickup Status', value: payload.pickupStatus, x: 436, width: 136 },
  ]);

  page.drawRectangle({ x: 40, y: 262, width: 532, height: 126, borderColor: blue, borderWidth: 1 });
  page.drawText('Release Instructions', { x: 48, y: 370, size: 9, font: bold, color: blue });
  drawWrappedManifestText(
    page,
    [
      '1. Present this gate pass together with the released file at the terminal gate.',
      '2. Verify container and seal number before truck loading.',
      '3. Any discrepancy must be escalated before inland dispatch is released.',
      '4. Pickup remains subject to terminal and customs final controls.',
    ].join('\n'),
    48,
    352,
    516,
    font,
    8,
    dark,
    14,
  );

  page.drawRectangle({ x: 40, y: 90, width: 350, height: 132, borderColor: blue, borderWidth: 1 });
  page.drawText('Release Desk Authorization', { x: 48, y: 204, size: 9, font: bold, color: blue });
  page.drawLine({ start: { x: 56, y: 138 }, end: { x: 260, y: 138 }, thickness: 1, color: blue });
  page.drawText('Authorized by Djibouti release desk', { x: 88, y: 122, size: 8, font, color: dark });
  page.drawText(`Issued: ${formatPdfDateTime(new Date().toISOString())}`, { x: 48, y: 100, size: 8, font: bold, color: dark });

  page.drawRectangle({ x: 390, y: 90, width: 182, height: 132, borderColor: blue, borderWidth: 1 });
  page.drawText('GATE PASS', { x: 438, y: 188, size: 18, font: bold, color: blue });
  page.drawText('DJIBOUTI RELEASE', { x: 420, y: 164, size: 10, font: bold, color: dark });

  const bytes = await pdf.save();
  triggerPdfDownload(bytes, payload.fileName);
}

export async function downloadDjiboutiHandoffPdf(payload: DjiboutiHandoffPdfPayload) {
  if (typeof window === 'undefined') return;
  const { pdf, page, font, bold, blue, dark } = await createOperationsPdfShell(
    'TRANSITOR / CLEARANCE HANDOFF PACKET',
    'Formal handoff from Djibouti release to inland transitor and clearance control.',
  );

  drawFieldRow(page, font, bold, blue, dark, 596, [
    { label: 'Booking Number', value: payload.bookingNumber, x: 40, width: 170 },
    { label: 'B/L Number', value: normalizePdfReference(payload.blNumber, payload.blNumber), x: 210, width: 180 },
    { label: 'Container Number', value: payload.containerNumber, x: 390, width: 182 },
  ]);
  drawFieldRow(page, font, bold, blue, dark, 546, [
    { label: 'Customer', value: payload.customerName, x: 40, width: 220 },
    { label: 'Destination Corridor', value: payload.destinationCorridor, x: 260, width: 200 },
    { label: 'Inland Destination', value: payload.inlandDestination, x: 460, width: 112 },
  ]);
  drawFieldRow(page, font, bold, blue, dark, 496, [
    { label: 'Dispatch Owner', value: payload.dispatchOwner, x: 40, width: 266 },
    { label: 'Trip Creation Status', value: payload.tripCreationStatus, x: 306, width: 266 },
  ]);

  page.drawRectangle({ x: 40, y: 210, width: 532, height: 250, borderColor: blue, borderWidth: 1 });
  page.drawText('Handoff Packet Checklist', { x: 48, y: 442, size: 9, font: bold, color: blue });
  payload.packetItems.forEach((item, index) => {
    const y = 412 - index * 24;
    page.drawRectangle({ x: 48, y: y - 6, width: 516, height: 20, borderColor: blue, borderWidth: 0.8 });
    page.drawText(item.label, { x: 58, y, size: 8, font: bold, color: dark });
    page.drawText(item.complete ? 'READY' : 'MISSING', {
      x: 500,
      y,
      size: 8,
      font: bold,
      color: item.complete ? blue : dark,
    });
  });

  page.drawRectangle({ x: 40, y: 90, width: 532, height: 96, borderColor: blue, borderWidth: 1 });
  drawWrappedManifestText(
    page,
    'This packet confirms that the Djibouti release desk has prepared the inland handoff file for transitor and clearance. Dispatch creation must remain blocked until transitor verifies receipt and transport clearance is released.',
    48,
    164,
    516,
    font,
    8,
    dark,
    13,
  );
  page.drawLine({ start: { x: 56, y: 112 }, end: { x: 238, y: 112 }, thickness: 1, color: blue });
  page.drawLine({ start: { x: 334, y: 112 }, end: { x: 516, y: 112 }, thickness: 1, color: blue });
  page.drawText('Djibouti release desk', { x: 98, y: 98, size: 8, font, color: dark });
  page.drawText('Transitor / clearance receipt', { x: 370, y: 98, size: 8, font, color: dark });

  const bytes = await pdf.save();
  triggerPdfDownload(bytes, payload.fileName);
}

export async function downloadTransitorClearancePdf(payload: TransitorClearancePdfPayload) {
  if (typeof window === 'undefined') return;
  const { pdf, page, font, bold, blue, dark, pale } = await createOperationsPdfShell(
    'TRANSITOR CLEARANCE RELEASE',
    'Dispatch release record for T1, charges, and inland transport readiness.',
  );
  const muted = rgb(88 / 255, 104 / 255, 138 / 255);
  const lighter = rgb(250 / 255, 252 / 255, 253 / 255);

  drawFieldRow(page, font, bold, blue, dark, 596, [
    { label: 'Booking Number', value: payload.bookingNumber, x: 40, width: 168 },
    { label: 'B/L Number', value: normalizePdfReference(payload.blNumber, payload.blNumber), x: 208, width: 180 },
    { label: 'Container Number', value: payload.containerNumber, x: 388, width: 184 },
  ]);
  drawFieldRow(page, font, bold, blue, dark, 546, [
    { label: 'Customer', value: payload.customerName, x: 40, width: 212 },
    { label: 'Inland Destination', value: payload.inlandDestination, x: 252, width: 180 },
    { label: 'Transit Document Ref', value: payload.transitDocumentRef, x: 432, width: 140 },
  ]);
  drawFieldRow(page, font, bold, blue, dark, 496, [
    { label: 'Transitor Assigned To', value: payload.transitorAssignedTo, x: 40, width: 176 },
    { label: 'Company', value: payload.transitorCompany, x: 216, width: 160 },
    { label: 'Phone / Email', value: [payload.transitorPhone, payload.transitorEmail].filter(Boolean).join('\n'), x: 376, width: 196 },
  ]);
  drawFieldRow(page, font, bold, blue, dark, 446, [
    { label: 'Transit Document Status', value: payload.transitDocumentStatus, x: 40, width: 176 },
    { label: 'Charges Status', value: payload.chargesPaymentStatus, x: 216, width: 160 },
    { label: 'Clearance Packet', value: payload.clearancePacketStatus, x: 376, width: 196 },
  ]);

  page.drawRectangle({ x: 40, y: 242, width: 532, height: 166, borderColor: blue, borderWidth: 1 });
  page.drawRectangle({ x: 41, y: 243, width: 530, height: 164, color: lighter });
  page.drawRectangle({ x: 40, y: 380, width: 532, height: 28, color: pale, borderColor: blue, borderWidth: 1 });
  page.drawText('Clearance Notes', { x: 48, y: 390, size: 9, font: bold, color: blue });
  drawWrappedManifestText(page, payload.transitorClearanceNote || 'No additional clearance note provided.', 48, 370, 516, font, 8, dark, 13);

  page.drawRectangle({ x: 40, y: 90, width: 532, height: 124, borderColor: blue, borderWidth: 1 });
  page.drawRectangle({ x: 41, y: 91, width: 530, height: 122, color: lighter });
  page.drawRectangle({ x: 40, y: 186, width: 532, height: 28, color: pale, borderColor: blue, borderWidth: 1 });
  page.drawText('Dispatch Release Control', { x: 48, y: 196, size: 9, font: bold, color: blue });
  drawWrappedManifestText(
    page,
    [
      `Transport clearance release: ${payload.clearancePacketStatus === 'complete' ? 'APPROVED' : 'PENDING'}`,
      `Clearance completed at: ${formatPdfDateTime(payload.clearanceCompletedAt)}`,
      'Dispatch may create the inland trip only after this release record is issued.',
    ].join('\n'),
    48,
    176,
    516,
    font,
    8,
    dark,
    14,
  );
  page.drawLine({ start: { x: 56, y: 116 }, end: { x: 250, y: 116 }, thickness: 1, color: blue });
  page.drawLine({ start: { x: 334, y: 116 }, end: { x: 516, y: 116 }, thickness: 1, color: blue });
  page.drawText('Transitor / clearance desk', { x: 102, y: 102, size: 8, font, color: dark });
  page.drawText('Dispatch release control', { x: 388, y: 102, size: 8, font, color: dark });
  page.drawLine({ start: { x: 40, y: 76 }, end: { x: 572, y: 76 }, thickness: 0.8, color: pale });
  page.drawText(`Issued at ${formatPdfDateTime(new Date().toISOString())}`, { x: 40, y: 62, size: 8, font, color: muted });

  const bytes = await pdf.save();
  triggerPdfDownload(bytes, payload.fileName);
}

export async function downloadDispatchLoadingReportPdf(payload: DispatchLoadingReportPdfPayload) {
  if (typeof window === 'undefined') return;
  const { pdf, page, font, bold, blue, dark, pale } = await createOperationsPdfShell(
    'LOADING REPORT',
    'Dispatch-side loading and departure control for inland multimodal movement.',
  );

  const muted = rgb(88 / 255, 104 / 255, 138 / 255);
  const lighter = rgb(248 / 255, 250 / 255, 255 / 255);

  drawFieldRow(page, font, bold, blue, dark, 596, [
    { label: 'Trip ID', value: payload.tripId, x: 40, width: 130 },
    { label: 'Booking Number', value: payload.bookingNumber, x: 170, width: 150 },
    { label: 'B/L Number', value: normalizePdfReference(payload.blNumber, payload.blNumber), x: 320, width: 150 },
    { label: 'Container / Seal', value: `${payload.containerNumber}\n${payload.sealNumber}`, x: 470, width: 102 },
  ]);
  drawFieldRow(page, font, bold, blue, dark, 546, [
    { label: 'Customer', value: payload.customerName, x: 40, width: 210 },
    { label: 'Corridor Route', value: payload.corridorRoute, x: 250, width: 200 },
    { label: 'Dispatch Owner', value: payload.dispatchOwner, x: 450, width: 122 },
  ]);
  drawFieldRow(page, font, bold, blue, dark, 496, [
    { label: 'Assigned Truck', value: payload.assignedTruck, x: 40, width: 140 },
    { label: 'Trailer', value: payload.assignedTrailer, x: 180, width: 120 },
    { label: 'Driver', value: payload.assignedDriver, x: 300, width: 160 },
    { label: 'Driver Phone', value: payload.driverPhone, x: 460, width: 112 },
  ]);
  drawFieldRow(page, font, bold, blue, dark, 446, [
    { label: 'Origin Handoff Point', value: payload.originHandoffPoint, x: 40, width: 210 },
    { label: 'Inland Destination', value: payload.inlandDestination, x: 250, width: 180 },
    { label: 'Planned Departure', value: formatPdfDateTime(payload.plannedDepartureTime), x: 430, width: 142 },
  ]);
  drawFieldRow(page, font, bold, blue, dark, 396, [
    { label: 'Expected Arrival', value: formatPdfDateTime(payload.expectedArrivalTime), x: 40, width: 266 },
    { label: 'Dispatch Note', value: payload.dispatchNote || 'No dispatch note recorded.', x: 306, width: 266 },
  ]);

  page.drawRectangle({ x: 40, y: 170, width: 532, height: 188, borderColor: blue, borderWidth: 1 });
  page.drawRectangle({ x: 41, y: 171, width: 530, height: 186, color: lighter });
  page.drawRectangle({ x: 40, y: 330, width: 532, height: 28, color: pale, borderColor: blue, borderWidth: 1 });
  page.drawText('Operational Loading Confirmation', { x: 48, y: 340, size: 9, font: bold, color: blue });
  drawWrappedManifestText(
    page,
    [
      '1. Truck, trailer, driver, and transit packet were reviewed before release.',
      '2. Container and seal number were matched against the dispatch file.',
      '3. Driver mobile packet was synchronized before departure confirmation.',
      '4. Any checkpoint hold, route diversion, or cargo issue must be reported immediately.',
    ].join('\n'),
    48,
    312,
    516,
    font,
    8,
    dark,
    14,
  );
  page.drawRectangle({ x: 48, y: 192, width: 516, height: 72, borderColor: pale, borderWidth: 1 });
  page.drawText('Release Readiness', { x: 56, y: 248, size: 8, font: bold, color: muted });
  drawWrappedManifestText(
    page,
    [
      `Truck plate: ${payload.assignedTruck || '-'}`,
      `Trailer plate: ${payload.assignedTrailer || '-'}`,
      `Driver: ${payload.assignedDriver || '-'}${payload.driverPhone ? ` · ${payload.driverPhone}` : ''}`,
      `Route: ${payload.corridorRoute || '-'}`,
    ].join('\n'),
    56,
    232,
    500,
    font,
    8,
    dark,
    13,
  );

  page.drawRectangle({ x: 40, y: 90, width: 532, height: 84, borderColor: blue, borderWidth: 1 });
  page.drawRectangle({ x: 41, y: 91, width: 530, height: 82, color: lighter });
  page.drawLine({ start: { x: 56, y: 112 }, end: { x: 238, y: 112 }, thickness: 1, color: blue });
  page.drawLine({ start: { x: 334, y: 112 }, end: { x: 516, y: 112 }, thickness: 1, color: blue });
  page.drawText('Dispatch controller', { x: 110, y: 98, size: 8, font, color: dark });
  page.drawText('Driver acknowledgement', { x: 388, y: 98, size: 8, font, color: dark });
  page.drawText('Departure authorization is valid only after route, truck, and packet checks are complete.', {
    x: 56,
    y: 140,
    size: 7,
    font: bold,
    color: muted,
  });
  page.drawLine({ start: { x: 40, y: 76 }, end: { x: 572, y: 76 }, thickness: 0.8, color: pale });
  page.drawText(`Generated at ${formatPdfDateTime(new Date().toISOString())}`, { x: 40, y: 62, size: 8, font, color: muted });

  const bytes = await pdf.save();
  triggerPdfDownload(bytes, payload.fileName);
}

export async function downloadYardReceiptPdf(payload: YardReceiptPdfPayload) {
  if (typeof window === 'undefined') return;
  const { pdf, page, font, bold, blue, dark } = await createOperationsPdfShell(
    payload.title,
    'Inland cargo handoff, customer receipt, and release-side condition confirmation.',
  );

  drawFieldRow(page, font, bold, blue, dark, 596, [
    { label: 'Booking Number', value: payload.bookingNumber, x: 40, width: 170 },
    { label: 'Container Number', value: payload.containerNumber, x: 210, width: 170 },
    { label: 'Issue Date', value: formatPdfDateTime(payload.issueDate), x: 380, width: 192 },
  ]);
  drawFieldRow(page, font, bold, blue, dark, 546, [
    { label: 'Customer', value: payload.customerName, x: 40, width: 210 },
    { label: 'Consignee', value: payload.consigneeName, x: 250, width: 180 },
    { label: 'Storage Location', value: payload.storageLocation, x: 430, width: 142 },
  ]);
  drawFieldRow(page, font, bold, blue, dark, 496, [
    { label: 'Arrival Time', value: formatPdfDateTime(payload.actualArrivalTime), x: 40, width: 180 },
    { label: 'Received By', value: payload.receivedBy, x: 220, width: 170 },
    { label: 'Receiving Company', value: payload.receivingCompany, x: 390, width: 182 },
  ]);
  drawFieldRow(page, font, bold, blue, dark, 446, [
    { label: 'Contact', value: payload.receivingContact || 'Pending', x: 40, width: 180 },
    { label: 'Receipt Status', value: payload.receiptStatus, x: 220, width: 170 },
    { label: 'POD Status', value: payload.podStatus, x: 390, width: 182 },
  ]);
  drawFieldRow(page, font, bold, blue, dark, 396, [
    { label: 'Shortage Status', value: payload.shortageStatus, x: 40, width: 180 },
    { label: 'Damage Status', value: payload.damageStatus, x: 220, width: 170 },
    { label: 'Receipt Time', value: formatPdfDateTime(payload.receivedAt), x: 390, width: 182 },
  ]);

  page.drawRectangle({ x: 40, y: 146, width: 532, height: 262, borderColor: blue, borderWidth: 1 });
  page.drawText('Condition / Receipt Note', { x: 48, y: 390, size: 9, font: bold, color: blue });
  drawWrappedManifestText(
    page,
    payload.remarks || 'No receipt note recorded.',
    48,
    370,
    516,
    font,
    8,
    dark,
    14,
  );
  page.drawText(`Receipt recorded at: ${formatPdfDateTime(payload.receivedAt)}`, {
    x: 48,
    y: 164,
    size: 8,
    font: bold,
    color: dark,
  });

  page.drawRectangle({ x: 40, y: 40, width: 532, height: 72, borderColor: blue, borderWidth: 1 });
  page.drawLine({ start: { x: 56, y: 64 }, end: { x: 238, y: 64 }, thickness: 1, color: blue });
  page.drawLine({ start: { x: 334, y: 64 }, end: { x: 516, y: 64 }, thickness: 1, color: blue });
  page.drawText('Yard / receiving officer', { x: 100, y: 50, size: 8, font, color: dark });
  page.drawText('Customer / consignee representative', { x: 360, y: 50, size: 8, font, color: dark });

  const bytes = await pdf.save();
  triggerPdfDownload(bytes, payload.fileName);
}

export async function downloadTransitorBatchSheetPdf(payload: TransitorBatchSheetPdfPayload) {
  if (typeof window === 'undefined') return;
  const { pdf, page, font, bold, blue, dark, pale } = await createOperationsPdfShell(
    'TRANSITOR ASSOCIATION / BATCH SHEET',
    'Djibouti batch release and transitor assignment control sheet.',
  );
  const muted = rgb(88 / 255, 104 / 255, 138 / 255);
  const lighter = rgb(250 / 255, 252 / 255, 253 / 255);

  drawFieldRow(page, font, bold, blue, dark, 596, [
    { label: 'Batch Number', value: payload.batchNumber, x: 40, width: 160 },
    { label: 'Booking Number', value: payload.bookingNumber, x: 200, width: 170 },
    { label: 'B/L Number', value: normalizePdfReference(payload.blNumber, payload.blNumber), x: 370, width: 202 },
  ]);
  drawFieldRow(page, font, bold, blue, dark, 546, [
    { label: 'Container Number', value: payload.containerNumber, x: 40, width: 180 },
    { label: 'Customer', value: payload.customerName, x: 220, width: 210 },
    { label: 'Inland Destination', value: payload.inlandDestination, x: 430, width: 142 },
  ]);
  drawFieldRow(page, font, bold, blue, dark, 496, [
    { label: 'Transitor Assigned To', value: payload.transitorAssignedTo, x: 40, width: 190 },
    { label: 'Transitor Company', value: payload.transitorCompany, x: 230, width: 180 },
    { label: 'Phone', value: payload.transitorPhone, x: 410, width: 162 },
  ]);
  drawFieldRow(page, font, bold, blue, dark, 446, [
    { label: 'Transit Document Ref', value: payload.transitDocumentRef, x: 40, width: 180 },
    { label: 'Transit Status', value: payload.transitDocumentStatus, x: 220, width: 120 },
    { label: 'Charges Status', value: payload.chargesPaymentStatus, x: 340, width: 120 },
    { label: 'Packet Status', value: payload.clearancePacketStatus, x: 460, width: 112 },
  ]);

  page.drawRectangle({ x: 40, y: 238, width: 532, height: 166, borderColor: blue, borderWidth: 1 });
  page.drawRectangle({ x: 41, y: 239, width: 530, height: 164, color: lighter });
  page.drawRectangle({ x: 40, y: 376, width: 532, height: 28, color: pale, borderColor: blue, borderWidth: 1 });
  page.drawText('Distribution / Control Note', { x: 48, y: 386, size: 9, font: bold, color: blue });
  drawWrappedManifestText(
    page,
    [
      `Multimodal file received at: ${formatPdfDateTime(payload.multimodalReceivedAt)}`,
      'This batch sheet records the file handoff from Djibouti release into transitor / clearance control.',
      'The transitor must verify T1, packet completeness, and charge status before dispatch release is authorized.',
    ].join('\n'),
    48,
    366,
    516,
    font,
    8,
    dark,
    14,
  );

  page.drawRectangle({ x: 40, y: 90, width: 532, height: 112, borderColor: blue, borderWidth: 1 });
  page.drawRectangle({ x: 41, y: 91, width: 530, height: 110, color: lighter });
  page.drawLine({ start: { x: 56, y: 114 }, end: { x: 238, y: 114 }, thickness: 1, color: blue });
  page.drawLine({ start: { x: 334, y: 114 }, end: { x: 516, y: 114 }, thickness: 1, color: blue });
  page.drawText('Djibouti release desk', { x: 104, y: 100, size: 8, font, color: dark });
  page.drawText('Transitor association desk', { x: 378, y: 100, size: 8, font, color: dark });
  page.drawText(`Issued at ${formatPdfDateTime(new Date().toISOString())}`, { x: 48, y: 174, size: 8, font: bold, color: muted });

  const bytes = await pdf.save();
  triggerPdfDownload(bytes, payload.fileName);
}

function blSectionTitle(text: string, x: number, y: number) {
  return ['BT', '/F2 10 Tf', `${x} ${y} Td`, `(${pdfEscape(text)}) Tj`, 'ET'];
}

function blText(text: string, x: number, y: number, bold = false) {
  return ['BT', `/${bold ? 'F2' : 'F1'} ${bold ? 10 : 9} Tf`, `${x} ${y} Td`, `(${pdfEscape(text)}) Tj`, 'ET'];
}

export async function downloadBillOfLadingPdf(payload: ShippingBillOfLadingPdfPayload) {
  if (typeof window === 'undefined') return;
  const logo = await loadLogoPdfImage();
  const wrapSimpleLine = (value: string, maxChars: number) => {
    const words = String(value || '').split(/\s+/).filter(Boolean);
    if (!words.length) return [''];
    const lines: string[] = [];
    let current = words[0];
    for (const word of words.slice(1)) {
      const candidate = `${current} ${word}`;
      if (candidate.length <= maxChars) {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }
    lines.push(current);
    return lines;
  };
  const placeOfDeliveryLines = wrapSimpleLine(payload.placeOfDelivery, 44).slice(0, 2);
  const cargoLines = wrapSimpleLine(payload.cargoDescription, 64).slice(0, 2);
  const parts = [
    '0.8 w',
    '24 24 547 744 re',
    'S',
    ...(logo ? ['q', '76 0 0 54 465 728 cm', '/Im1 Do', 'Q'] : []),
    ...blText('TIKUR ABAY TRANSPORT & LOGISTICS PLC', 40, 760, true),
    ...blText(payload.documentTitle.toUpperCase(), 40, 744, true),
    '0.6 w',
    '40 720 m',
    '555 720 l',
    'S',
    ...blText(`BL NO: ${payload.blNumber}`, 40, 704, true),
    ...blText(`MASTER BL NO: ${payload.masterBlNumber}`, 250, 704, true),
    ...blText(`SLOT CARRIER BILL NO: ${payload.slotCarrierBillNumber}`, 40, 676, true),
    ...blText(`DATE OF ISSUE: ${payload.issueDate}`, 40, 690),
    ...blText(`PLACE OF ISSUE: ${payload.placeOfIssue}`, 250, 690),

    ...blSectionTitle('PARTIES', 40, 648),
    ...blText('SHIPPER:', 40, 632, true),
    ...blText(payload.shipper, 40, 618),
    ...blText('CONSIGNEE:', 290, 632, true),
    ...blText(payload.consignee, 290, 618),
    ...blText('NOTIFY PARTY:', 40, 600, true),
    ...blText(payload.notifyParty, 40, 586),

    ...blSectionTitle('SHIPPING DETAILS', 40, 558),
    ...blText(`PLACE OF RECEIPT: ${payload.placeOfReceipt}`, 40, 542),
    ...blText(`PORT OF LOADING: ${payload.portOfLoading}`, 40, 528),
    ...blText(`PORT OF DISCHARGE: ${payload.portOfDischarge}`, 40, 514),
    ...blText(`PLACE OF DELIVERY: ${placeOfDeliveryLines[0] || ''}`, 40, 500),
    ...(placeOfDeliveryLines[1] ? blText(placeOfDeliveryLines[1], 118, 486) : []),
    ...blText(`VESSEL: ${payload.vessel}`, 345, 542),
    ...blText(`VOYAGE: ${payload.voyage}`, 345, 528),
    ...blText(`INCOTERM: ${payload.incoterm}`, 345, 514),
    ...blText(`FREIGHT: ${payload.freightTerm.toUpperCase()}`, 345, 500),
    ...blText(`SHIPPED ON BOARD: ${payload.shippedOnBoardDate}`, 345, 486),

    ...blSectionTitle('CONTAINER DETAILS', 40, 458),
    '40 440 515 24 re',
    'S',
    '40 416 515 24 re',
    'S',
    '120 416 m 120 464 l S',
    '195 416 m 195 464 l S',
    '255 416 m 255 464 l S',
    '345 416 m 345 464 l S',
    '445 416 m 445 464 l S',
    ...blText('Container No', 46, 448, true),
    ...blText('Seal No', 128, 448, true),
    ...blText('Type', 205, 448, true),
    ...blText('Packages', 265, 448, true),
    ...blText('Weight', 455, 448, true),
    ...blText(payload.containerNumber, 46, 424),
    ...blText(payload.sealNumber, 128, 424),
    ...blText(payload.containerType, 205, 424),
    ...blText(payload.packages, 265, 424),
    ...blText(payload.weight, 455, 424),

    ...blSectionTitle('CARGO DESCRIPTION', 40, 390),
    ...blText(`MARKS & NUMBERS: ${payload.marksAndNumbers}`, 40, 374),
    ...blText('DESCRIPTION OF GOODS:', 40, 360, true),
    ...blText(cargoLines[0] || '', 40, 346),
    ...(cargoLines[1] ? blText(cargoLines[1], 40, 332) : []),
    ...blText(`HS CODE: ${payload.hsCode}`, 40, cargoLines[1] ? 318 : 332),
    ...blText(`MEASUREMENT (M3): ${payload.measurementCbm}`, 240, cargoLines[1] ? 318 : 332),

    ...blSectionTitle('TRADE REFERENCES', 40, 304),
    ...blText(`TIN NO: ${payload.tinNumber}`, 40, 288),
    ...blText(`TIN AREA CODE: ${payload.tinAreaCode}`, 240, 288),
    ...blText(`LC / BANK REF: ${payload.lcNumber}`, 40, 274),

    ...blSectionTitle('FREIGHT DETAILS', 40, 246),
    ...blText(`Sea Freight: ${payload.seaFreight}`, 40, 230),
    ...blText(`Djibouti Clearance: ${payload.clearanceFreight}`, 40, 216),
    ...blText(`Inland Transport: ${payload.inlandFreight}`, 40, 202),

    ...blSectionTitle('LEGAL TEXT', 40, 174),
    ...blText('This Bill of Lading serves as:', 40, 158),
    ...blText('- Receipt of cargo', 55, 144),
    ...blText('- Contract of carriage', 55, 130),
    ...blText('- Document of title', 55, 116),
    ...blText(`${payload.numberOfOriginalBills} originals have been issued`, 320, 158, true),

    '40 48 515 58 re',
    'S',
    ...blText('FOR TIKUR ABAY TRANSPORT', 54, 90, true),
    ...blText('Authorized Signature', 54, 74),
    ...blText('Stamp', 54, 60),
    ...blText(`Date: ${payload.issueDate}`, 200, 60),
    ...blText(payload.outputLabel, 400, 90, true),
  ].join('\n');

  const resources = logo
    ? '/Font << /F1 5 0 R /F2 6 0 R >> /XObject << /Im1 7 0 R >>'
    : '/Font << /F1 5 0 R /F2 6 0 R >>';
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << ${resources} >> >> endobj`,
    `4 0 obj << /Length ${parts.length} >> stream\n${parts}\nendstream endobj`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    '6 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj',
  ];
  if (logo) {
    objects.push(`7 0 obj << /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logo.binary.length} >> stream\n${logo.binary}\nendstream endobj`);
  }
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object) => {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  const bytes = Uint8Array.from(atob(btoa(pdf)), (char) => char.charCodeAt(0));
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = payload.fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function openBillOfLadingPrintView(payload: ShippingBillOfLadingPdfPayload) {
  if (typeof window === 'undefined') return;
  const html = buildBillOfLadingPrintHtml([payload]);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const popup = window.open(url, '_blank', 'noopener,noreferrer,width=980,height=1200');
  if (!popup) {
    URL.revokeObjectURL(url);
    return;
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function printBillOfLadingOriginals(payload: ShippingBillOfLadingPdfPayload) {
  if (typeof window === 'undefined') return;
  const html = buildBillOfLadingPrintHtml([
      { ...payload, outputLabel: 'ORIGINAL 1', printVariant: 'original' },
      { ...payload, outputLabel: 'ORIGINAL 2', printVariant: 'original' },
      { ...payload, outputLabel: 'ORIGINAL 3', printVariant: 'original' },
    ]);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const popup = window.open(url, '_blank', 'noopener,noreferrer,width=980,height=1200');
  if (!popup) {
    URL.revokeObjectURL(url);
    return;
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function buildBillOfLadingPrintHtml(payloads: ShippingBillOfLadingPdfPayload[]) {
  const titleText = 'BILL OF LADING FOR COMBINED TRANSPORT AND PORT TO PORT SHIPMENTS';
  const baseHref = typeof window === 'undefined' ? '/' : `${window.location.origin}/`;
  const sheet = (payload: ShippingBillOfLadingPdfPayload) => {
    const marksBlock = [payload.marksAndNumbers, payload.containerNumber, payload.sealNumber].filter(Boolean).join('<br />');
    const verifyUrl = payload.verifyUrl || `/shipping/bills-of-lading/verify?blNumber=${encodeURIComponent(payload.blNumber)}`;
    const copyLabel =
      payload.printVariant === 'copy'
        ? 'COPY'
        : (payload.outputLabel || '').includes('ORIGINAL 1 / ORIGINAL 2 / ORIGINAL 3')
          ? 'ORIGINAL 1'
          : (payload.outputLabel || '').startsWith('ORIGINAL')
            ? htmlEscape(payload.outputLabel || 'ORIGINAL')
            : htmlEscape(payload.outputLabel || 'ORIGINAL');
    return `
      <div class="bol-page${payload.printVariant === 'copy' ? ' bol-page-copy' : ''}">
        ${payload.printVariant === 'copy' ? '<div class="bol-copy-watermark" aria-hidden="true"><svg viewBox="0 0 1000 1000" class="bol-copy-watermark-svg"><text x="500" y="560" text-anchor="middle" class="bol-copy-watermark-text">COPY</text></svg></div>' : ''}
        <div class="bol-title-cell">${titleText}</div>
        <div class="bol-body">
          <div class="bol-side-rail">
            <div class="left-vertical-note bol-vertical-text"><span>Goods of dangerous or damaging nature must not be tendered for shipment unless written notice of their nature and the name and address of the sender have been previously given to the Carrier Master of Agent of he vessel and the nature is dis inctly marked on the outside of the pac! age or packages as required by statute under heavy penalties. A special stowage order giving consent to shipment must also be obtained from the Carrier, Master or Agent of the vessel shippers will be liable for all Consequential damage and expense if all the foregoing provisions are not complied with</span></div>
          </div>
          <div class="bol-main-layout">
            <table class="bol-table bol-header-table">
              <colgroup><col style="width:46%" /><col style="width:32%" /><col style="width:22%" /></colgroup>
              <tbody>
                <tr>
                  <td class="bol-shipper-cell"><div class="bol-label">Shipper</div><div class="bol-value bol-value-strong">${htmlEscape(payload.shipper)}</div></td>
                  <td class="bol-reference-cell"><div class="bol-ref-grid"><div class="bol-ref-row"><span class="bol-label">Shipper's Reference</span><strong>${htmlEscape(payload.bookingReference || 'Pending')}</strong></div><div class="bol-ref-row"><span class="bol-label">Carrier's Reference</span><strong>${htmlEscape(payload.masterBlNumber)}</strong></div><div class="bol-ref-row"><span class="bol-label">F/Agent Ref</span><strong>${htmlEscape(payload.slotCarrierBillNumber)}</strong></div></div></td>
                  <td class="bol-number-cell"><div class="bol-pages-box"><div class="bol-label">Pages</div><div class="bol-value bol-value-strong">1</div></div><div class="bol-label">Bill of Lading Number</div><div class="bol-value bol-value-strong">${htmlEscape(payload.blNumber)}</div></td>
                </tr>
                <tr><td colspan="3" class="bol-booking-cell"><span class="bol-label">Booking Reference No.</span><strong>${htmlEscape(payload.bookingReference || 'Pending')}</strong></td></tr>
              </tbody>
            </table>
            <table class="bol-table bol-party-table">
              <colgroup><col style="width:46%" /><col style="width:54%" /></colgroup>
              <tbody>
                <tr><td class="bol-party-cell"><div class="bol-label">Consignee</div><div class="bol-value bol-value-strong">${htmlEscape(payload.consignee)}</div></td><td class="bol-logo-cell" rowspan="2"><div class="bol-logo-panel"><div class="bol-logo-wrap"><img src="/branding/tikur-abay-logo.png" alt="Tikur Abay logo" class="bol-logo" /><div class="bol-logo-copy bol-logo-copy-small">Tikur Abay Transport and Logistics</div><div class="bol-logo-copy bol-logo-copy-amharic-small">ቲኩር አባይ ትራንስፖርት እና ሎጂስቲክስ</div><div class="bol-logo-copy bol-logo-copy-amharic">ቲኩር አባይ ትራንስፖርት እና ሎጂስቲክስ ኃ/የተ/የግ/ማህበር</div><div class="bol-logo-copy bol-logo-copy-native">TIKUR ABAY TRANSPORT &amp; LOGISTICS PLC</div><div class="bol-logo-copy bol-logo-copy-amharic-small">አዲስ አበባ</div><div class="bol-logo-copy">ADDIS ABABA</div></div><div class="bol-original-holder"><div class="bol-original-box">${copyLabel}</div></div></div></td></tr>
                <tr><td class="bol-party-cell"><div class="bol-label">Notify Party</div><div class="bol-value bol-value-strong">${htmlEscape(payload.notifyParty)}</div></td></tr>
              </tbody>
            </table>
            <table class="bol-table bol-transport-table">
              <tbody>
                <tr><td><div class="bol-label">Pre-Carriage By</div><div class="bol-value">${htmlEscape(payload.placeOfReceipt)}</div></td><td><div class="bol-label">Place of Receipt by pre-carrier</div><div class="bol-value">${htmlEscape(payload.placeOfReceipt)}</div></td><td><div class="bol-label">Port of Loading</div><div class="bol-value">${htmlEscape(payload.portOfLoading)}</div></td><td><div class="bol-label">Port of Discharge</div><div class="bol-value">${htmlEscape(payload.portOfDischarge)}</div></td></tr>
                <tr><td><div class="bol-label">Vessel</div><div class="bol-value">${htmlEscape(payload.vessel)}</div></td><td><div class="bol-label">Voyage No</div><div class="bol-value">${htmlEscape(payload.voyage)}</div></td><td><div class="bol-label">Place of Delivery</div><div class="bol-value">${htmlEscape(payload.placeOfDelivery)}</div></td><td><div class="bol-label">On Carriage Payable at</div><div class="bol-value">${htmlEscape(payload.placeOfIssue)}</div></td></tr>
              </tbody>
            </table>
            <table class="bl-goods">
              <colgroup><col style="width:22%" /><col style="width:15%" /><col style="width:39%" /><col style="width:12%" /><col style="width:12%" /></colgroup>
              <tbody>
                <tr class="goods-title-row"><th colspan="5">PARTICULARS OF GOODS ARE THOSE DECLARED BY SHIPPER</th></tr>
                <tr class="goods-head-row"><th>Marks and Nos. Container no/seal no</th><th>Kind &amp; No of Packages</th><th>Description of Goods</th><th>Gross Weight (Kg)</th><th>Measurements (m&sup3;)</th></tr>
                <tr class="goods-body-row"><td>${marksBlock}</td><td>${htmlEscape(payload.packages)}</td><td>${htmlEscape(payload.cargoDescription)}</td><td>${htmlEscape(payload.weight)}</td><td>${htmlEscape(payload.measurementCbm)}</td></tr>
              </tbody>
            </table>
            <table class="bl-summary">
              <colgroup><col style="width:25%" /><col style="width:25%" /><col style="width:25%" /><col style="width:25%" /></colgroup>
              <tbody>
                <tr>
                  <td colspan="2">
                    <div class="label">Total No of Containers</div>
                    <div class="value">1</div>
                  </td>
                  <td colspan="2">
                    <div class="label">Total no Packages</div>
                    <div class="value">${htmlEscape(payload.packages)}</div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div class="label">No. of original Bills of Lading</div>
                    <div class="value">${payload.numberOfOriginalBills}</div>
                  </td>
                  <td>
                    <div class="label">Slot carrier bill no</div>
                    <div class="value">${htmlEscape(payload.slotCarrierBillNumber)}</div>
                  </td>
                  <td>
                    <div class="label">Payable at</div>
                    <div class="value">${htmlEscape(payload.placeOfIssue)}</div>
                  </td>
                  <td>
                    <div class="label">Shipped on Board Date</div>
                    <div class="value">${htmlEscape(payload.shippedOnBoardDate)}</div>
                  </td>
                </tr>
                <tr>
                  <td colspan="3" class="legal-text-cell">
                  <p>
                    Received, in apparent good order and condition unless otherwise stated, the goods or containers or
                    other packages said to contain goods herein mentioned to be transported subject always to the
                    exceptions, limitations, provisions, conditions and liberties contained herein and whether written,
                    printed or stamped on the front or reverse hereof, from the place of receipt or the port of
                    loading, whichever applicable, to the port of discharge or the place of delivery, whichever
                    applicable. All agreements or freight engagements for shipment of the goods are superseded by this
                    Bill of Lading.
                  </p>
                  <p class="bol-legal-tail">In witness whereof the Master or Agents have affirmed to the number of original Bills of Lading, one of which being accomplished, the other(s) to be void.</p>
                  </td>
                  <td class="freight-cell">
                  <div><strong>Freight:</strong> ${htmlEscape(payload.freightTerm.toUpperCase())}</div>
                  <div><strong>Incoterm:</strong> ${htmlEscape(payload.incoterm)}</div>
                  <div><strong>HS Code:</strong> ${htmlEscape(payload.hsCode)}</div>
                  <div><strong>TIN:</strong> ${htmlEscape(payload.tinNumber)}</div>
                  <div><strong>LC / Bank Ref:</strong> ${htmlEscape(payload.lcNumber)}</div>
                  <div><strong>Payable at:</strong> ${htmlEscape(payload.placeOfIssue)}</div>
                  </td>
                </tr>
                <tr>
                  <td colspan="3" class="signature-cell">
                    <table class="bol-signature-table">
                      <tbody>
                        <tr>
                          <td class="bol-signature-image-cell"><img src="/branding/tikur-abay-stamp.svg" alt="Official stamp" class="bol-stamp" /></td>
                          <td class="bol-signature-image-cell"><img src="/branding/tikur-abay-signature.svg" alt="Carrier signature" class="bol-sign-mark" /></td>
                        </tr>
                        <tr>
                          <td>(AS AGENT)</td>
                          <td>for the carrier</td>
                        </tr>
                      </tbody>
                    </table>
                    <div class="bol-date-block"><span class="bol-label">Date of Issue</span><strong>${htmlEscape(payload.issueDate)}</strong></div>
                  </td>
                  <td class="qr-cell">
                    <div class="bol-original-box bol-original-box--footer">${copyLabel}</div>
                    <img src="/api/qr?data=${encodeURIComponent(verifyUrl)}" alt="BL QR" class="bol-qr" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  };

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Bill of Lading</title>
      <base href="${baseHref}" />
      <style>
        @page { size: A4 portrait; margin: 0; }
        html, body {
          margin: 0;
          padding: 0;
          width: 210mm;
          min-height: 297mm;
          font-family: Arial, Helvetica, sans-serif;
          background: #fff;
          color: #2f3e9e;
          overflow: visible !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        * { box-sizing: border-box; }
        .bol-page {
          width: 210mm;
          height: 297mm;
          padding: 4mm;
          background: white;
          color: #2f3e9e;
          overflow: hidden;
          page-break-after: always;
          display: flex;
          flex-direction: column;
          position: relative;
        }
        .bol-copy-watermark {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: rotate(-28deg);
          pointer-events: none;
          user-select: none;
          z-index: 0;
        }
        .bol-copy-watermark-svg {
          width: 72%;
          height: 72%;
          overflow: visible;
        }
        .bol-copy-watermark-text {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 240px;
          font-weight: 700;
          letter-spacing: 48px;
          fill: rgba(47, 62, 158, 0.03);
          stroke: rgba(47, 62, 158, 0.22);
          stroke-width: 5px;
          stroke-dasharray: 18 14;
          paint-order: stroke fill;
        }
        .bol-page > *:not(.bol-copy-watermark) {
          position: relative;
          z-index: 1;
        }
        .bol-page,
        .bol-page div,
        .bol-page span,
        .bol-page p,
        .bol-page strong,
        .bol-page td,
        .bol-page th {
          color: #2f3e9e;
        }
        .bol-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }
        .bol-table td,
        .bol-table th {
          border: 1px solid #2f3e9e;
          padding: 3px;
          vertical-align: top;
          font-size: 9px;
          color: #2f3e9e;
          line-height: 1.08;
        }
        .bol-title-cell { text-align: center; font-size: 12px !important; font-weight: 700; padding: 3px !important; border: 1px solid #2f3e9e; color: #2f3e9e; }
        .bol-body { display: flex; flex: 1; min-height: 0; }
        .bol-side-rail { width: 34px; display: flex; }
        .left-vertical-note, .bol-vertical-text { width: 34px; writing-mode: vertical-rl; transform: rotate(180deg); text-align: center; padding: 6px 2px; font-size: 9px; line-height: 1.15; height: 100%; width: 100%; color: #3347b0; border-left: 1px solid #3347b0; border-right: 1px solid #3347b0; border-bottom: 1px solid #3347b0; }
        .bol-vertical-text span { display: -webkit-box; -webkit-line-clamp: 34; -webkit-box-orient: vertical; overflow: hidden; }
        .bol-main-layout { display: flex; flex: 1; flex-direction: column; min-height: 0; width: 100%; border-right: 1px solid #2f3e9e; border-bottom: 1px solid #2f3e9e; }
        .bol-label { display: block; font-size: 9px; margin-bottom: 2px; }
        .bol-value { white-space: pre-wrap; font-size: 10px; }
        .bol-value-strong { font-weight: 700; font-size: 10px; }
        .bol-header-table td { padding-top: 5px; padding-bottom: 5px; }
        .bol-shipper-cell { width: 46%; min-height: 86px; height: auto; }
        .bol-reference-cell { width: 32%; }
        .bol-reference-cell { min-height: 86px; }
        .bol-number-cell { width: 22%; min-height: 86px; }
        .bol-pages-box { margin-bottom: 4px; text-align: right; border-bottom: 1px solid #1e3a8a; padding-bottom: 2px; }
        .bol-ref-row { margin-bottom: 2px; }
        .bol-booking-cell strong { display: inline-block; margin-left: 8px; }
        .bol-booking-cell { min-height: 30px; }
        .bol-party-cell { width: 46%; min-height: 78px; height: auto; }
        .bol-logo-cell { width: 54%; padding: 0 !important; }
        .bol-logo-panel { display: flex; flex-direction: column; height: 100%; }
        .bol-logo-wrap { display: flex; min-height: 126px; align-items: center; justify-content: center; flex-direction: column; text-align: center; padding: 6px 8px 2px; }
        .bol-logo { width: 104px; height: auto; margin-bottom: 4px; }
        .bol-logo-copy { font-weight: 700; line-height: 1.05; }
        .bol-logo-copy-small { font-size: 8px; font-weight: 400; margin-bottom: 2px; }
        .bol-logo-copy-amharic-small { font-size: 7px; margin-bottom: 2px; }
        .bol-logo-copy-amharic { font-size: 9px; margin-bottom: 2px; }
        .bol-logo-copy-native { font-size: 10px; }
        .bol-original-holder { padding: 0 !important; border-top: 1px solid #2f3e9e; display: flex; align-items: center; justify-content: center; min-height: 68px; }
        .bol-original-box { min-height: 40px; width: 100%; text-align: center; font-size: 18px; font-weight: 700; line-height: 1.35; padding: 10px 4px; white-space: pre-line; }
        .bol-transport-table td { min-height: 52px; }
        .bl-goods, .bl-summary { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 0; }
        .bl-goods th, .bl-goods td, .bl-summary td, .bl-summary th { border: 1px solid #3347b0; padding: 4px 6px; vertical-align: top; font-size: 11px; line-height: 1.2; color: #3347b0; overflow-wrap: break-word; }
        .goods-title-row th { text-align: center; font-weight: 700; font-size: 11px; letter-spacing: 0.1px; }
        .goods-head-row th { text-align: center; font-weight: 600; }
        .goods-body-row td { min-height: 120px; height: 120px; white-space: pre-wrap; }
        .bl-summary .label { font-weight: 700; font-size: 10px; }
        .bl-summary .value { margin-top: 4px; }
        .bl-summary .legal-text-cell { width: 68%; line-height: 1.25; }
        .bl-summary .freight-cell { width: 32%; font-size: 10.5px; line-height: 1.2; }
        .bl-summary .freight-cell div { margin-bottom: 4px; }
        .bl-summary .freight-cell div:last-child { margin-bottom: 0; }
        .bol-legal-tail { margin-top: 8px; }
        .bol-date-block strong { display: block; margin-top: 2px; }
        .bol-date-block { padding-top: 8px; }
        .signature-cell { height: 92px; vertical-align: bottom; }
        .qr-cell { text-align: center; vertical-align: middle; }
        .bol-signature-table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 8px; }
        .bol-signature-table td { border: 1px solid #3347b0; padding: 6px 4px; text-align: center; vertical-align: middle; font-size: 10px; line-height: 1.2; color: #3347b0; }
        .bol-signature-image-cell { height: 58px; }
        .bol-stamp { width: 58px; height: 58px; object-fit: contain; }
        .bol-sign-mark { width: 88px; height: auto; object-fit: contain; }
        .bol-qr { width: 92px; height: 92px; object-fit: contain; display: block; margin: 8px auto 0; }
        .bol-original-box--footer { width: 100%; min-height: 48px; display: block; padding: 12px 4px; border-bottom: 1px solid #3347b0; }
        @media print {
          html, body { margin: 0; padding: 0; width: 210mm; height: 297mm; }
          .bol-page { width: 210mm; height: 297mm; padding: 4mm; page-break-after: always; overflow: hidden; }
          button, .no-print { display: none; }
        }
      </style>
    </head>
    <body>${payloads.map(sheet).join('')}<script>(function(){function markLargeSpace(){document.querySelectorAll('.bol-page').forEach(function(page){var content=page.querySelector('.bol-main-layout');if(content&&content.scrollHeight+12<content.clientHeight){page.classList.add('large-space');}});}function waitForImages(){var images=Array.prototype.slice.call(document.images||[]);if(!images.length){return Promise.resolve();}return Promise.all(images.map(function(image){if(image.complete){return Promise.resolve();}return new Promise(function(resolve){var done=function(){resolve();};image.addEventListener('load',done,{once:true});image.addEventListener('error',done,{once:true});});}));}function triggerPrint(){window.setTimeout(function(){window.focus();window.print();},180);}markLargeSpace();if(document.readyState==='complete'){waitForImages().then(triggerPrint);}else{window.addEventListener('load',function(){waitForImages().then(triggerPrint);},{once:true});}})();</script></body>
  </html>`;
}
