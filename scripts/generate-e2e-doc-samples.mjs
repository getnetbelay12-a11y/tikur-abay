import fs from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('docs/e2e-samples');

function escapePdfText(value) {
  return String(value)
    .replaceAll('\\', '\\\\')
    .replaceAll('(', '\\(')
    .replaceAll(')', '\\)');
}

function pdfTextBlock(lines) {
  const content = [];
  for (const line of lines) {
    if (line.type === 'text') {
      const size = line.size ?? 10;
      content.push(`BT /F1 ${size} Tf ${line.x} ${line.y} Td (${escapePdfText(line.text)}) Tj ET`);
    } else if (line.type === 'line') {
      content.push(`${line.x1} ${line.y1} m ${line.x2} ${line.y2} l S`);
    }
  }
  return content.join('\n');
}

function createPdf(fileName, lines) {
  const stream = pdfTextBlock(lines);
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj',
    `4 0 obj\n<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream\nendobj`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${object}\n`;
  }

  const xrefStart = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Root 1 0 R /Size ${objects.length + 1} >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  fs.writeFileSync(path.join(outDir, fileName), pdf, 'utf8');
}

function createSvg(fileName, svg) {
  fs.writeFileSync(path.join(outDir, fileName), svg, 'utf8');
}

const commonFooter = [
  { type: 'line', x1: 40, y1: 92, x2: 572, y2: 92 },
  { type: 'text', x: 42, y: 76, size: 9, text: 'Training mock document for internal E2E and operator workflow testing. Styled after standard shipping paperwork.' },
];

createPdf('commercial-invoice-sample.pdf', [
  { type: 'text', x: 40, y: 756, size: 18, text: 'COMMERCIAL INVOICE' },
  { type: 'text', x: 400, y: 756, size: 10, text: 'Invoice No: INV-260321-001' },
  { type: 'text', x: 400, y: 740, size: 10, text: 'Invoice Date: 2026-03-21' },
  { type: 'line', x1: 40, y1: 732, x2: 572, y2: 732 },
  { type: 'text', x: 40, y: 712, size: 10, text: 'Exporter / Seller:' },
  { type: 'text', x: 40, y: 696, size: 10, text: 'Shanghai East Industrial Supply Co., Ltd' },
  { type: 'text', x: 40, y: 680, size: 10, text: 'No. 88 Pudong Export Road, Shanghai, China' },
  { type: 'text', x: 330, y: 712, size: 10, text: 'Buyer / Consignee:' },
  { type: 'text', x: 330, y: 696, size: 10, text: 'Tikur Abay / Nile Star Trading PLC' },
  { type: 'text', x: 330, y: 680, size: 10, text: 'Adama Dry Port Release Desk, Ethiopia' },
  { type: 'text', x: 40, y: 650, size: 10, text: 'Incoterm: CFR Djibouti' },
  { type: 'text', x: 220, y: 650, size: 10, text: 'Country of Origin: China' },
  { type: 'text', x: 400, y: 650, size: 10, text: 'Final Destination: Adama' },
  { type: 'line', x1: 40, y1: 638, x2: 572, y2: 638 },
  { type: 'text', x: 40, y: 620, size: 10, text: 'Line  Description                               HS Code   Qty   Unit Price USD   Amount USD' },
  { type: 'line', x1: 40, y1: 614, x2: 572, y2: 614 },
  { type: 'text', x: 40, y: 596, size: 10, text: '01    Solar panels                              8541.43   20    480.00           9,600.00' },
  { type: 'text', x: 40, y: 580, size: 10, text: '02    Construction hardware and fasteners       7318.15   50    38.00            1,900.00' },
  { type: 'line', x1: 40, y1: 566, x2: 572, y2: 566 },
  { type: 'text', x: 360, y: 548, size: 10, text: 'Subtotal USD: 11,500.00' },
  { type: 'text', x: 360, y: 532, size: 10, text: 'Freight Included: CFR' },
  { type: 'text', x: 360, y: 516, size: 10, text: 'Total Invoice Value USD: 11,500.00' },
  { type: 'text', x: 40, y: 486, size: 10, text: 'Shipment Reference: TB-260321-001 / BL-DJI-260321-001-DRAFT' },
  { type: 'text', x: 40, y: 470, size: 10, text: 'Payment Terms: TT 30% advance, 70% against shipping documents' },
  { type: 'text', x: 40, y: 454, size: 10, text: 'Declaration: We certify that the goods described are of Chinese origin and the values are true and correct.' },
  ...commonFooter,
]);

createPdf('packing-list-sample.pdf', [
  { type: 'text', x: 40, y: 756, size: 18, text: 'PACKING LIST' },
  { type: 'text', x: 420, y: 756, size: 10, text: 'Packing List No: PL-260321-001' },
  { type: 'text', x: 420, y: 740, size: 10, text: 'Date: 2026-03-21' },
  { type: 'line', x1: 40, y1: 732, x2: 572, y2: 732 },
  { type: 'text', x: 40, y: 712, size: 10, text: 'Exporter: Shanghai East Industrial Supply Co., Ltd' },
  { type: 'text', x: 40, y: 696, size: 10, text: 'Consignee: Nile Star Trading PLC / Tikur Abay Adama Dry Port' },
  { type: 'text', x: 40, y: 680, size: 10, text: 'Container No: MSCU3344556    Seal No: SL-260321-001    Container Type: 40FT HC' },
  { type: 'line', x1: 40, y1: 668, x2: 572, y2: 668 },
  { type: 'text', x: 40, y: 650, size: 10, text: 'Pkg   Marks / Numbers         Description                          Gross KG   Net KG   CBM' },
  { type: 'line', x1: 40, y1: 644, x2: 572, y2: 644 },
  { type: 'text', x: 40, y: 626, size: 10, text: 'Pallet  NST/SLR/01-20         Photovoltaic solar panels           2,900      2,740    7.8' },
  { type: 'text', x: 40, y: 610, size: 10, text: 'Carton  NST/HDW/21-70         Hardware and fasteners              2,400      2,260    3.6' },
  { type: 'line', x1: 40, y1: 596, x2: 572, y2: 596 },
  { type: 'text', x: 330, y: 578, size: 10, text: 'Total Packages: 70' },
  { type: 'text', x: 330, y: 562, size: 10, text: 'Gross Weight KG: 5,300' },
  { type: 'text', x: 330, y: 546, size: 10, text: 'Net Weight KG: 5,000' },
  { type: 'text', x: 330, y: 530, size: 10, text: 'Total Volume CBM: 11.4' },
  { type: 'text', x: 40, y: 500, size: 10, text: 'Stuffing Location: Shanghai Export Yard' },
  { type: 'text', x: 40, y: 484, size: 10, text: 'Loaded By: Origin loading team' },
  { type: 'text', x: 40, y: 468, size: 10, text: 'Remarks: Pallets stretch-wrapped and corner-protected; cartons stacked on fumigated pallets.' },
  ...commonFooter,
]);

const billOfLadingBase = [
  { type: 'text', x: 40, y: 756, size: 18, text: 'OCEAN BILL OF LADING' },
  { type: 'text', x: 398, y: 756, size: 10, text: 'Carrier: MSC Mediterranean Shipping' },
  { type: 'line', x1: 40, y1: 744, x2: 572, y2: 744 },
  { type: 'text', x: 40, y: 724, size: 10, text: 'Shipper: Shanghai East Industrial Supply Co., Ltd' },
  { type: 'text', x: 40, y: 708, size: 10, text: 'Consignee: Tikur Abay Transportation Services for Nile Star Trading PLC' },
  { type: 'text', x: 40, y: 692, size: 10, text: 'Notify Party: Tikur Abay Djibouti Release Desk / Adama Dry Port Control' },
  { type: 'text', x: 40, y: 668, size: 10, text: 'Vessel / Voyage: MSC Blue Nile / VOY-260321-001' },
  { type: 'text', x: 310, y: 668, size: 10, text: 'Port of Loading: Shanghai' },
  { type: 'text', x: 310, y: 652, size: 10, text: 'Port of Discharge: Djibouti' },
  { type: 'text', x: 40, y: 652, size: 10, text: 'Place of Delivery: Adama Dry Port' },
  { type: 'line', x1: 40, y1: 640, x2: 572, y2: 640 },
  { type: 'text', x: 40, y: 622, size: 10, text: 'Container / Seal: MSCU3344556 / SL-260321-001' },
  { type: 'text', x: 40, y: 606, size: 10, text: 'Freight Terms: Freight Prepaid' },
  { type: 'text', x: 40, y: 590, size: 10, text: 'No. of Packages: 70 packages in 1 x 40FT HC container' },
  { type: 'text', x: 40, y: 574, size: 10, text: 'Description of Goods: Solar panels and construction hardware as per invoice INV-260321-001' },
  { type: 'text', x: 40, y: 558, size: 10, text: 'Gross Weight: 5,300 KGS    Measurement: 11.4 CBM' },
];

createPdf('bl-draft-sample.pdf', [
  ...billOfLadingBase,
  { type: 'text', x: 40, y: 530, size: 11, text: 'Draft B/L No: BL-DJI-260321-001-DRAFT' },
  { type: 'text', x: 40, y: 514, size: 10, text: 'Status: Draft for consignee review before final issue' },
  { type: 'text', x: 40, y: 498, size: 10, text: 'Originals to be issued: 3/3 after approval and freight release.' },
  ...commonFooter,
]);

createPdf('final-bl-sample.pdf', [
  ...billOfLadingBase,
  { type: 'text', x: 40, y: 530, size: 11, text: 'Original B/L No: BL-DJI-260321-001' },
  { type: 'text', x: 40, y: 514, size: 10, text: 'Status: Final issued / freight prepaid / release approved' },
  { type: 'text', x: 40, y: 498, size: 10, text: 'Issued at: Shanghai    Date of Issue: 2026-03-22    Originals: 3/3' },
  ...commonFooter,
]);

createPdf('transit-customs-doc-sample.pdf', [
  { type: 'text', x: 40, y: 756, size: 18, text: 'TRANSIT / CUSTOMS ACCOMPANYING DOCUMENT' },
  { type: 'text', x: 390, y: 756, size: 10, text: 'Reference: T1-DJI-260321-001' },
  { type: 'line', x1: 40, y1: 744, x2: 572, y2: 744 },
  { type: 'text', x: 40, y: 724, size: 10, text: 'Movement Reference Number (MRN): 26DJI00018455017' },
  { type: 'text', x: 40, y: 708, size: 10, text: 'Office of Departure: Djibouti Port Customs Office' },
  { type: 'text', x: 40, y: 692, size: 10, text: 'Office of Destination: Adama Dry Port Customs Office' },
  { type: 'text', x: 40, y: 676, size: 10, text: 'Principal / Declarant: Tikur Abay Transportation Services' },
  { type: 'text', x: 40, y: 660, size: 10, text: 'Consignee: Nile Star Trading PLC' },
  { type: 'text', x: 40, y: 644, size: 10, text: 'Container / Seal: MSCU3344556 / SL-260321-001' },
  { type: 'text', x: 40, y: 628, size: 10, text: 'Goods: Solar panels and construction hardware / Origin CN / HS 8541.43 + 7318.15' },
  { type: 'text', x: 40, y: 612, size: 10, text: 'Vehicle / Corridor: Djibouti -> Galafi -> Adama Dry Port' },
  { type: 'text', x: 40, y: 596, size: 10, text: 'Guarantee: Transit bond pending final discharge at inland destination' },
  { type: 'text', x: 40, y: 580, size: 10, text: 'Attached Documents: Commercial Invoice, Packing List, Bill of Lading, Release Note' },
  { type: 'text', x: 40, y: 564, size: 10, text: 'Inspection Status: Cleared for inland transit under customs control' },
  ...commonFooter,
]);

createSvg(
  'stuffing-photo-sample.svg',
  `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#c9def4"/>
      <stop offset="100%" stop-color="#eef4fb"/>
    </linearGradient>
    <linearGradient id="yard" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#a57a57"/>
      <stop offset="100%" stop-color="#6f5237"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#sky)"/>
  <rect y="560" width="1600" height="340" fill="url(#yard)"/>
  <rect x="170" y="255" width="1030" height="290" rx="10" fill="#d86a35"/>
  <rect x="220" y="310" width="860" height="180" fill="#bd5a2e"/>
  <g stroke="#f2d7c8" stroke-width="5">
    <line x1="260" y1="310" x2="260" y2="490"/>
    <line x1="335" y1="310" x2="335" y2="490"/>
    <line x1="410" y1="310" x2="410" y2="490"/>
    <line x1="485" y1="310" x2="485" y2="490"/>
    <line x1="560" y1="310" x2="560" y2="490"/>
    <line x1="635" y1="310" x2="635" y2="490"/>
    <line x1="710" y1="310" x2="710" y2="490"/>
    <line x1="785" y1="310" x2="785" y2="490"/>
    <line x1="860" y1="310" x2="860" y2="490"/>
    <line x1="935" y1="310" x2="935" y2="490"/>
  </g>
  <rect x="1115" y="340" width="170" height="130" rx="6" fill="#f4d47a"/>
  <rect x="1170" y="495" width="58" height="58" rx="8" fill="#333"/>
  <rect x="1090" y="495" width="58" height="58" rx="8" fill="#333"/>
  <rect x="520" y="585" width="135" height="110" fill="#e7ecef" stroke="#667" stroke-width="3"/>
  <rect x="675" y="575" width="150" height="120" fill="#d7dde2" stroke="#667" stroke-width="3"/>
  <rect x="850" y="590" width="125" height="100" fill="#eff2f4" stroke="#667" stroke-width="3"/>
  <rect x="40" y="32" width="500" height="128" rx="20" fill="#11253b" opacity="0.94"/>
  <text x="72" y="82" font-family="Helvetica, Arial, sans-serif" font-size="34" font-weight="700" fill="#ffffff">Stuffing confirmation photo</text>
  <text x="72" y="118" font-family="Helvetica, Arial, sans-serif" font-size="22" fill="#d8e6f5">Container MSCU3344556 · Seal pending capture · Shanghai Export Yard</text>
  <text x="72" y="148" font-family="Helvetica, Arial, sans-serif" font-size="18" fill="#d8e6f5">2026-03-21 12:18 CST · Origin loading team</text>
  <rect x="1130" y="60" width="410" height="148" rx="18" fill="#ffffff" opacity="0.93"/>
  <text x="1160" y="108" font-family="Helvetica, Arial, sans-serif" font-size="24" font-weight="700" fill="#10253e">Training mock evidence</text>
  <text x="1160" y="142" font-family="Helvetica, Arial, sans-serif" font-size="20" fill="#41556f">Built to look like a real yard capture,</text>
  <text x="1160" y="170" font-family="Helvetica, Arial, sans-serif" font-size="20" fill="#41556f">for operator workflow testing only.</text>
</svg>`
);

createSvg(
  'seal-photo-sample.svg',
  `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
  <defs>
    <radialGradient id="metal" cx="50%" cy="45%" r="65%">
      <stop offset="0%" stop-color="#f7f9fb"/>
      <stop offset="100%" stop-color="#b7c1cb"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="1200" fill="#1f2e3d"/>
  <rect x="90" y="90" width="1020" height="1020" rx="28" fill="#e7edf4"/>
  <circle cx="600" cy="450" r="230" fill="url(#metal)" stroke="#55616d" stroke-width="20"/>
  <circle cx="600" cy="450" r="78" fill="#1f2e3d"/>
  <path d="M600 680 C610 860, 790 890, 820 1030" fill="none" stroke="#b7c1cb" stroke-width="26" stroke-linecap="round"/>
  <rect x="370" y="760" width="460" height="180" rx="16" fill="#d12f2f"/>
  <text x="600" y="835" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="52" font-weight="700" fill="#ffffff">SL-260321-001</text>
  <rect x="130" y="130" width="460" height="120" rx="18" fill="#10253e" opacity="0.95"/>
  <text x="162" y="182" font-family="Helvetica, Arial, sans-serif" font-size="32" font-weight="700" fill="#ffffff">Seal capture photo</text>
  <text x="162" y="220" font-family="Helvetica, Arial, sans-serif" font-size="22" fill="#d8e6f5">Container MSCU3344556 · 2026-03-21 12:24 CST</text>
  <text x="600" y="1070" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="24" fill="#495c70">Training mock seal evidence for release and stuffing workflow tests</text>
</svg>`
);

console.log('Updated realistic E2E sample documents in docs/e2e-samples');
