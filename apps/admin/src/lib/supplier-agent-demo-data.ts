export type SupplierDeskStage =
  | 'Booking created'
  | 'Cargo items incomplete'
  | 'Documents pending'
  | 'BL draft review'
  | 'Stuffing scheduled'
  | 'Gate-in pending'
  | 'Ready for vessel handoff';

export type SupplierDeskShipment = {
  id: string;
  bookingNumber: string;
  quoteReference?: string;
  customerName: string;
  supplierName: string;
  supplierCode: string;
  serviceType: 'multimodal' | 'unimodal';
  originPort: string;
  dischargePort: string;
  finalDestination: string;
  placeOfReceipt?: string;
  incoterm: string;
  freightPaymentTerm?: 'prepaid' | 'collect';
  currentStage: SupplierDeskStage;
  assignedAgent: string;
  lastUpdated: string;
  etd: string;
  etaDjibouti: string;
  exceptionLabel: string | null;
  tradeReferences?: {
    notifyPartyName?: string;
    secondNotifyParty?: string;
    lcNumber?: string;
    bankPermitNumber?: string;
    consigneeTinNumber?: string;
    tinAreaCode?: string;
    marksAndNumbers?: string;
    packageSummary?: string;
    unNumber?: string;
    shippingCertificateRequired?: boolean;
  };
  cargoItems: Array<{
    id: string;
    lineNo: string;
    description: string;
    hsCode: string;
    packageType: string;
    packageQuantity: number;
    netWeightKg: number;
    grossWeightKg: number;
    cbm: number;
    marksNumbers: string;
    invoiceRef: string;
    packingListRef: string;
    remarks?: string;
    status: 'Complete' | 'Needs review' | 'Missing data';
  }>;
  documents: Array<{
    id: string;
    type: string;
    referenceNumber: string;
    uploadedDate: string;
    status: 'missing' | 'uploaded' | 'under review' | 'approved';
    uploadedBy: string;
  }>;
  container: {
    containerNumber: string;
    containerType: string;
    sealNumber: string;
    stuffingDateTime: string;
    stuffingLocation: string;
    loadedBy: string;
    containerCondition: string;
    stuffingPhotoProof: string;
    sealPhotoProof: string;
    stuffingConfirmed: boolean;
    sealCaptured: boolean;
    conditionVerified: boolean;
    gateInConfirmed: boolean;
  };
  handoff: {
    vesselName: string;
    voyageNumber: string;
    carrier: string;
    carrierBlNumber?: string;
    houseBlNumber?: string;
    blStatus: 'Draft pending' | 'Draft approved' | 'Final uploaded';
    terminalGateInStatus: 'Pending' | 'Confirmed';
    oceanHandoffStatus: 'Not ready' | 'Ready for carrier handoff' | 'Handed off to Djibouti release';
  };
  exceptions: Array<{
    id: string;
    severity: 'Low' | 'Medium' | 'High';
    issueText: string;
    actionLabel: string;
  }>;
};

function buildShipment(input: {
  id: string;
  bookingNumber: string;
  quoteReference?: string;
  customerName: string;
  supplierName: string;
  supplierCode: string;
  serviceType: 'multimodal' | 'unimodal';
  originPort: string;
  finalDestination: string;
  placeOfReceipt?: string;
  incoterm: string;
  freightPaymentTerm?: 'prepaid' | 'collect';
  currentStage: SupplierDeskStage;
  assignedAgent: string;
  lastUpdated: string;
  etd: string;
  etaDjibouti: string;
  exceptionLabel: string | null;
  tradeReferences?: SupplierDeskShipment['tradeReferences'];
  cargoItems: SupplierDeskShipment['cargoItems'];
  documents: SupplierDeskShipment['documents'];
  container: SupplierDeskShipment['container'];
  handoff: SupplierDeskShipment['handoff'];
  exceptions: SupplierDeskShipment['exceptions'];
}): SupplierDeskShipment {
  return {
    ...input,
    dischargePort: 'Djibouti Port',
  };
}

function normalizeSupplierDestination(value: string) {
  if (value === 'Djibouti handoff') {
    return value;
  }
  if (value.includes('Kality')) {
    return 'Combolcha Dry Port';
  }
  return 'Adama Dry Port';
}

const seededSupplierDeskShipments: SupplierDeskShipment[] = [
  buildShipment({
    id: 'supplier-1',
    bookingNumber: 'TAB-SUP-260319-01',
    customerName: 'East Gate Manufacturing PLC',
    supplierName: 'Shenzhen Corridor Industrial Supply Co., Ltd.',
    supplierCode: 'SHZ-118',
    serviceType: 'multimodal',
    originPort: 'Yantian',
    finalDestination: 'Modjo Dry Port',
    incoterm: 'CIF Djibouti',
    currentStage: 'BL draft review',
    assignedAgent: 'Liya Chen',
    lastUpdated: '2026-03-19T11:24:00Z',
    etd: '2026-03-22T18:40:00Z',
    etaDjibouti: '2026-03-29T06:20:00Z',
    exceptionLabel: 'BL mismatch',
    cargoItems: [
      { id: '1-1', lineNo: '01', description: 'Industrial gearbox assemblies', hsCode: '8483.40', packageType: 'Crate', packageQuantity: 16, netWeightKg: 9420, grossWeightKg: 9980, cbm: 12.6, marksNumbers: 'EGM/GEAR/01-16', invoiceRef: 'INV-SHZ-4482', packingListRef: 'PL-SHZ-4482', status: 'Complete' },
      { id: '1-2', lineNo: '02', description: 'Copper cable drum sets', hsCode: '8544.49', packageType: 'Drum', packageQuantity: 14, netWeightKg: 5220, grossWeightKg: 5480, cbm: 7.2, marksNumbers: 'EGM/CBL/17-30', invoiceRef: 'INV-SHZ-4482', packingListRef: 'PL-SHZ-4482', status: 'Needs review' },
      { id: '1-3', lineNo: '03', description: 'Hydraulic seal kits', hsCode: '4016.93', packageType: 'Carton', packageQuantity: 24, netWeightKg: 1880, grossWeightKg: 2040, cbm: 3.1, marksNumbers: 'EGM/HYD/31-54', invoiceRef: 'INV-SHZ-4482', packingListRef: 'PL-SHZ-4482', status: 'Complete' },
    ],
    documents: [
      { id: '1-d1', type: 'Commercial invoice', referenceNumber: 'INV-SHZ-4482', uploadedDate: '2026-03-18', status: 'approved', uploadedBy: 'Liya Chen' },
      { id: '1-d2', type: 'Packing list', referenceNumber: 'PL-SHZ-4482', uploadedDate: '2026-03-18', status: 'approved', uploadedBy: 'Liya Chen' },
      { id: '1-d3', type: 'BL draft', referenceNumber: 'BLD-MSK-88214', uploadedDate: '2026-03-19', status: 'under review', uploadedBy: 'Tikur Abay Origin Desk' },
      { id: '1-d4', type: 'Final BL', referenceNumber: '-', uploadedDate: '-', status: 'missing', uploadedBy: 'Not uploaded' },
      { id: '1-d5', type: 'Export permit / customs doc', referenceNumber: 'EX-CN-55218', uploadedDate: '2026-03-18', status: 'uploaded', uploadedBy: 'Liya Chen' },
      { id: '1-d6', type: 'Stuffing photos', referenceNumber: 'PH-SHZ-4482', uploadedDate: '2026-03-19', status: 'uploaded', uploadedBy: 'Warehouse Ops' },
      { id: '1-d7', type: 'Seal photo', referenceNumber: '-', uploadedDate: '-', status: 'missing', uploadedBy: 'Pending upload' },
    ],
    container: {
      containerNumber: 'MSCU 458912-7',
      containerType: '40FT Dry',
      sealNumber: 'SEAL-ET-44821',
      stuffingDateTime: '2026-03-20 14:30',
      stuffingLocation: 'Shenzhen Baoan Factory Zone',
      loadedBy: 'Baoan shift A',
      containerCondition: 'Verified clean and dry',
      stuffingPhotoProof: '6 images uploaded',
      sealPhotoProof: 'Pending',
      stuffingConfirmed: false,
      sealCaptured: true,
      conditionVerified: true,
      gateInConfirmed: false,
    },
    handoff: {
      vesselName: 'MV Red Sea Meridian',
      voyageNumber: 'RSM-118',
      carrier: 'Maersk',
      blStatus: 'Draft pending',
      terminalGateInStatus: 'Pending',
      oceanHandoffStatus: 'Not ready',
    },
    exceptions: [
      { id: '1-e1', severity: 'High', issueText: 'Seal photo missing for captured seal SEAL-ET-44821.', actionLabel: 'Upload proof' },
      { id: '1-e2', severity: 'Medium', issueText: 'BL draft quantity for cable drums differs from packing list by 2 units.', actionLabel: 'Review BL draft' },
      { id: '1-e3', severity: 'Low', issueText: 'Gate-in confirmation still pending from terminal.', actionLabel: 'Check terminal' },
    ],
  }),
  buildShipment({
    id: 'supplier-2',
    bookingNumber: 'TAB-SUP-260319-02',
    customerName: 'Abay Agro Processing',
    supplierName: 'Ningbo Harvest Equipment Manufacturing',
    supplierCode: 'NGB-442',
    serviceType: 'multimodal',
    originPort: 'Ningbo',
    finalDestination: 'Kality ICD',
    incoterm: 'FOB Ningbo',
    currentStage: 'Documents pending',
    assignedAgent: 'Daniel Wu',
    lastUpdated: '2026-03-19T09:16:00Z',
    etd: '2026-03-24T16:00:00Z',
    etaDjibouti: '2026-04-01T07:10:00Z',
    exceptionLabel: 'Packing list',
    cargoItems: [
      { id: '2-1', lineNo: '01', description: 'Oil press line components', hsCode: '8479.20', packageType: 'Crate', packageQuantity: 12, netWeightKg: 7840, grossWeightKg: 8260, cbm: 10.4, marksNumbers: 'AAP/OP/01-12', invoiceRef: 'INV-NGB-7714', packingListRef: 'PL-NGB-7714', status: 'Complete' },
      { id: '2-2', lineNo: '02', description: 'Spare roller sets', hsCode: '8438.90', packageType: 'Pallet', packageQuantity: 8, netWeightKg: 2680, grossWeightKg: 2870, cbm: 4.8, marksNumbers: 'AAP/RLR/13-20', invoiceRef: 'INV-NGB-7714', packingListRef: 'PL-NGB-7714', status: 'Missing data' },
    ],
    documents: [
      { id: '2-d1', type: 'Commercial invoice', referenceNumber: 'INV-NGB-7714', uploadedDate: '2026-03-18', status: 'approved', uploadedBy: 'Daniel Wu' },
      { id: '2-d2', type: 'Packing list', referenceNumber: '-', uploadedDate: '-', status: 'missing', uploadedBy: 'Pending upload' },
      { id: '2-d3', type: 'BL draft', referenceNumber: '-', uploadedDate: '-', status: 'missing', uploadedBy: 'Pending upload' },
      { id: '2-d4', type: 'Final BL', referenceNumber: '-', uploadedDate: '-', status: 'missing', uploadedBy: 'Pending upload' },
      { id: '2-d5', type: 'Export permit / customs doc', referenceNumber: 'EX-CN-77501', uploadedDate: '2026-03-18', status: 'uploaded', uploadedBy: 'Daniel Wu' },
      { id: '2-d6', type: 'Stuffing photos', referenceNumber: '-', uploadedDate: '-', status: 'missing', uploadedBy: 'Pending upload' },
      { id: '2-d7', type: 'Seal photo', referenceNumber: '-', uploadedDate: '-', status: 'missing', uploadedBy: 'Pending upload' },
    ],
    container: {
      containerNumber: 'OOLU 621500-2',
      containerType: '40FT HC',
      sealNumber: '',
      stuffingDateTime: '2026-03-22 09:00',
      stuffingLocation: 'Ningbo Cixi plant',
      loadedBy: 'Harvest loading team',
      containerCondition: 'Awaiting pre-stuffing inspection',
      stuffingPhotoProof: 'Not uploaded',
      sealPhotoProof: 'Not uploaded',
      stuffingConfirmed: false,
      sealCaptured: false,
      conditionVerified: false,
      gateInConfirmed: false,
    },
    handoff: {
      vesselName: 'MV Horn of Africa',
      voyageNumber: 'HOA-204',
      carrier: 'MSC',
      blStatus: 'Draft pending',
      terminalGateInStatus: 'Pending',
      oceanHandoffStatus: 'Not ready',
    },
    exceptions: [
      { id: '2-e1', severity: 'High', issueText: 'Packing list not uploaded for booking TAB-SUP-260319-02.', actionLabel: 'Upload packing list' },
      { id: '2-e2', severity: 'Medium', issueText: 'HS code or gross weight missing on line 02.', actionLabel: 'Complete item line' },
    ],
  }),
  buildShipment({
    id: 'supplier-3',
    bookingNumber: 'TAB-SUP-260319-03',
    customerName: 'Addis Pharma PLC',
    supplierName: 'Qingdao Meditech Packaging Ltd.',
    supplierCode: 'QDG-205',
    serviceType: 'unimodal',
    originPort: 'Qingdao',
    finalDestination: 'Addis Ababa Warehouse',
    incoterm: 'CFR Djibouti',
    currentStage: 'Ready for vessel handoff',
    assignedAgent: 'Martha Song',
    lastUpdated: '2026-03-19T07:40:00Z',
    etd: '2026-03-21T12:30:00Z',
    etaDjibouti: '2026-03-28T09:45:00Z',
    exceptionLabel: null,
    cargoItems: [
      { id: '3-1', lineNo: '01', description: 'Pharmaceutical blister foil rolls', hsCode: '7607.19', packageType: 'Roll', packageQuantity: 18, netWeightKg: 4660, grossWeightKg: 4890, cbm: 5.8, marksNumbers: 'APH/BLF/01-18', invoiceRef: 'INV-QDG-2218', packingListRef: 'PL-QDG-2218', status: 'Complete' },
      { id: '3-2', lineNo: '02', description: 'Sterile packaging trays', hsCode: '3923.10', packageType: 'Carton', packageQuantity: 26, netWeightKg: 1880, grossWeightKg: 2110, cbm: 4.2, marksNumbers: 'APH/TRAY/19-44', invoiceRef: 'INV-QDG-2218', packingListRef: 'PL-QDG-2218', status: 'Complete' },
    ],
    documents: [
      { id: '3-d1', type: 'Commercial invoice', referenceNumber: 'INV-QDG-2218', uploadedDate: '2026-03-17', status: 'approved', uploadedBy: 'Martha Song' },
      { id: '3-d2', type: 'Packing list', referenceNumber: 'PL-QDG-2218', uploadedDate: '2026-03-17', status: 'approved', uploadedBy: 'Martha Song' },
      { id: '3-d3', type: 'BL draft', referenceNumber: 'BLD-CMA-9087', uploadedDate: '2026-03-18', status: 'approved', uploadedBy: 'Tikur Abay Origin Desk' },
      { id: '3-d4', type: 'Final BL', referenceNumber: 'FBL-CMA-9087', uploadedDate: '2026-03-19', status: 'uploaded', uploadedBy: 'Tikur Abay Origin Desk' },
      { id: '3-d5', type: 'Export permit / customs doc', referenceNumber: 'EX-CN-11209', uploadedDate: '2026-03-18', status: 'approved', uploadedBy: 'Martha Song' },
      { id: '3-d6', type: 'Stuffing photos', referenceNumber: 'PH-QDG-2218', uploadedDate: '2026-03-19', status: 'uploaded', uploadedBy: 'Warehouse Ops' },
      { id: '3-d7', type: 'Seal photo', referenceNumber: 'SEAL-QDG-2218', uploadedDate: '2026-03-19', status: 'uploaded', uploadedBy: 'Warehouse Ops' },
    ],
    container: {
      containerNumber: 'TEMU 741208-4',
      containerType: '20FT Dry',
      sealNumber: 'SEA-QDG-9871',
      stuffingDateTime: '2026-03-19 13:10',
      stuffingLocation: 'Qingdao medical export yard',
      loadedBy: 'Meditech export crew',
      containerCondition: 'Verified clean and dry',
      stuffingPhotoProof: '4 images uploaded',
      sealPhotoProof: '1 image uploaded',
      stuffingConfirmed: true,
      sealCaptured: true,
      conditionVerified: true,
      gateInConfirmed: true,
    },
    handoff: {
      vesselName: 'MV Gulf Prosperity',
      voyageNumber: 'GP-551',
      carrier: 'CMA CGM',
      blStatus: 'Final uploaded',
      terminalGateInStatus: 'Confirmed',
      oceanHandoffStatus: 'Ready for carrier handoff',
    },
    exceptions: [],
  }),
  buildShipment({
    id: 'supplier-4',
    bookingNumber: 'TAB-SUP-260319-04',
    customerName: 'Blue Nile Cables',
    supplierName: 'Shanghai Zenith Cable Systems',
    supplierCode: 'SHA-883',
    serviceType: 'multimodal',
    originPort: 'Shanghai',
    finalDestination: 'Adama Logistics Park',
    incoterm: 'CIP Adama',
    currentStage: 'Cargo items incomplete',
    assignedAgent: 'Saron Li',
    lastUpdated: '2026-03-18T18:42:00Z',
    etd: '2026-03-25T21:00:00Z',
    etaDjibouti: '2026-04-03T08:20:00Z',
    exceptionLabel: 'HS code',
    cargoItems: [
      { id: '4-1', lineNo: '01', description: 'High-voltage cable spools', hsCode: '8544.60', packageType: 'Spool', packageQuantity: 10, netWeightKg: 7320, grossWeightKg: 7810, cbm: 9.4, marksNumbers: 'BNC/HVC/01-10', invoiceRef: 'INV-SHA-6610', packingListRef: 'PL-SHA-6610', status: 'Complete' },
      { id: '4-2', lineNo: '02', description: 'Termination connector kits', hsCode: '', packageType: 'Carton', packageQuantity: 22, netWeightKg: 980, grossWeightKg: 1140, cbm: 1.8, marksNumbers: 'BNC/TCK/11-32', invoiceRef: 'INV-SHA-6610', packingListRef: 'PL-SHA-6610', status: 'Missing data' },
    ],
    documents: [
      { id: '4-d1', type: 'Commercial invoice', referenceNumber: 'INV-SHA-6610', uploadedDate: '2026-03-18', status: 'approved', uploadedBy: 'Saron Li' },
      { id: '4-d2', type: 'Packing list', referenceNumber: 'PL-SHA-6610', uploadedDate: '2026-03-18', status: 'uploaded', uploadedBy: 'Saron Li' },
      { id: '4-d3', type: 'BL draft', referenceNumber: '-', uploadedDate: '-', status: 'missing', uploadedBy: 'Pending upload' },
      { id: '4-d4', type: 'Final BL', referenceNumber: '-', uploadedDate: '-', status: 'missing', uploadedBy: 'Pending upload' },
      { id: '4-d5', type: 'Export permit / customs doc', referenceNumber: 'EX-CN-80811', uploadedDate: '2026-03-18', status: 'approved', uploadedBy: 'Saron Li' },
      { id: '4-d6', type: 'Stuffing photos', referenceNumber: '-', uploadedDate: '-', status: 'missing', uploadedBy: 'Pending upload' },
      { id: '4-d7', type: 'Seal photo', referenceNumber: '-', uploadedDate: '-', status: 'missing', uploadedBy: 'Pending upload' },
    ],
    container: {
      containerNumber: '',
      containerType: '40FT HC',
      sealNumber: '',
      stuffingDateTime: '2026-03-23 16:00',
      stuffingLocation: 'Shanghai export consolidation yard',
      loadedBy: 'Zenith yard team',
      containerCondition: 'Pending container allocation',
      stuffingPhotoProof: 'Not uploaded',
      sealPhotoProof: 'Not uploaded',
      stuffingConfirmed: false,
      sealCaptured: false,
      conditionVerified: false,
      gateInConfirmed: false,
    },
    handoff: {
      vesselName: 'MV Lion City Bridge',
      voyageNumber: 'LCB-77',
      carrier: 'ONE',
      blStatus: 'Draft pending',
      terminalGateInStatus: 'Pending',
      oceanHandoffStatus: 'Not ready',
    },
    exceptions: [
      { id: '4-e1', severity: 'High', issueText: 'HS code missing on line 02.', actionLabel: 'Complete line' },
      { id: '4-e2', severity: 'Medium', issueText: 'Container number not yet captured from carrier allocation.', actionLabel: 'Capture container' },
    ],
  }),
  buildShipment({
    id: 'supplier-5',
    bookingNumber: 'TAB-SUP-260319-05',
    customerName: 'Ethio Build Materials',
    supplierName: 'Guangzhou Prime Ceramics Export',
    supplierCode: 'GZH-512',
    serviceType: 'multimodal',
    originPort: 'Nansha',
    finalDestination: 'Addis Ababa',
    incoterm: 'FOB Guangzhou',
    currentStage: 'Stuffing scheduled',
    assignedAgent: 'Helen Zhao',
    lastUpdated: '2026-03-19T06:50:00Z',
    etd: '2026-03-23T15:50:00Z',
    etaDjibouti: '2026-03-31T10:05:00Z',
    exceptionLabel: 'Stuffing photos',
    cargoItems: [
      { id: '5-1', lineNo: '01', description: 'Polished ceramic tile pallets', hsCode: '6907.21', packageType: 'Pallet', packageQuantity: 20, netWeightKg: 16380, grossWeightKg: 17120, cbm: 15.7, marksNumbers: 'EBM/TILE/01-20', invoiceRef: 'INV-GZH-9081', packingListRef: 'PL-GZH-9081', status: 'Complete' },
      { id: '5-2', lineNo: '02', description: 'Tile adhesive bags', hsCode: '3214.90', packageType: 'Bag', packageQuantity: 180, netWeightKg: 4280, grossWeightKg: 4510, cbm: 5.5, marksNumbers: 'EBM/ADH/21-200', invoiceRef: 'INV-GZH-9081', packingListRef: 'PL-GZH-9081', status: 'Complete' },
    ],
    documents: [
      { id: '5-d1', type: 'Commercial invoice', referenceNumber: 'INV-GZH-9081', uploadedDate: '2026-03-17', status: 'approved', uploadedBy: 'Helen Zhao' },
      { id: '5-d2', type: 'Packing list', referenceNumber: 'PL-GZH-9081', uploadedDate: '2026-03-17', status: 'approved', uploadedBy: 'Helen Zhao' },
      { id: '5-d3', type: 'BL draft', referenceNumber: 'BLD-HPL-5412', uploadedDate: '2026-03-18', status: 'approved', uploadedBy: 'Tikur Abay Origin Desk' },
      { id: '5-d4', type: 'Final BL', referenceNumber: '-', uploadedDate: '-', status: 'missing', uploadedBy: 'Pending upload' },
      { id: '5-d5', type: 'Export permit / customs doc', referenceNumber: 'EX-CN-90120', uploadedDate: '2026-03-18', status: 'approved', uploadedBy: 'Helen Zhao' },
      { id: '5-d6', type: 'Stuffing photos', referenceNumber: '-', uploadedDate: '-', status: 'missing', uploadedBy: 'Pending upload' },
      { id: '5-d7', type: 'Seal photo', referenceNumber: '-', uploadedDate: '-', status: 'missing', uploadedBy: 'Pending upload' },
    ],
    container: {
      containerNumber: 'GESU 551720-1',
      containerType: '40FT HC',
      sealNumber: '',
      stuffingDateTime: '2026-03-20 11:00',
      stuffingLocation: 'Guangzhou tile export yard',
      loadedBy: 'Prime ceramics team',
      containerCondition: 'Verified structurally sound',
      stuffingPhotoProof: 'Pending upload',
      sealPhotoProof: 'Pending upload',
      stuffingConfirmed: false,
      sealCaptured: false,
      conditionVerified: true,
      gateInConfirmed: false,
    },
    handoff: {
      vesselName: 'MV East Africa Pioneer',
      voyageNumber: 'EAP-312',
      carrier: 'Hapag-Lloyd',
      blStatus: 'Draft approved',
      terminalGateInStatus: 'Pending',
      oceanHandoffStatus: 'Not ready',
    },
    exceptions: [
      { id: '5-e1', severity: 'Medium', issueText: 'Stuffing photo set not uploaded after container positioning.', actionLabel: 'Upload stuffing photos' },
      { id: '5-e2', severity: 'Medium', issueText: 'Seal number still missing ahead of stuffing slot.', actionLabel: 'Capture seal' },
    ],
  }),
  buildShipment({
    id: 'supplier-6',
    bookingNumber: 'TAB-SUP-260319-06',
    customerName: 'Horizon Water Systems',
    supplierName: 'Xiamen Aqua Flow Technologies',
    supplierCode: 'XMN-741',
    serviceType: 'unimodal',
    originPort: 'Xiamen',
    finalDestination: 'Djibouti handoff',
    incoterm: 'FOB Xiamen',
    currentStage: 'Gate-in pending',
    assignedAgent: 'Ruth Lin',
    lastUpdated: '2026-03-19T08:55:00Z',
    etd: '2026-03-24T19:10:00Z',
    etaDjibouti: '2026-04-01T06:45:00Z',
    exceptionLabel: 'Gate-in',
    cargoItems: [
      { id: '6-1', lineNo: '01', description: 'Water treatment skid modules', hsCode: '8421.21', packageType: 'Crate', packageQuantity: 8, netWeightKg: 6110, grossWeightKg: 6530, cbm: 8.8, marksNumbers: 'HWS/SKD/01-08', invoiceRef: 'INV-XMN-3345', packingListRef: 'PL-XMN-3345', status: 'Complete' },
      { id: '6-2', lineNo: '02', description: 'PVC filter housings', hsCode: '8421.99', packageType: 'Carton', packageQuantity: 36, netWeightKg: 1430, grossWeightKg: 1590, cbm: 2.4, marksNumbers: 'HWS/FLT/09-44', invoiceRef: 'INV-XMN-3345', packingListRef: 'PL-XMN-3345', status: 'Complete' },
    ],
    documents: [
      { id: '6-d1', type: 'Commercial invoice', referenceNumber: 'INV-XMN-3345', uploadedDate: '2026-03-18', status: 'approved', uploadedBy: 'Ruth Lin' },
      { id: '6-d2', type: 'Packing list', referenceNumber: 'PL-XMN-3345', uploadedDate: '2026-03-18', status: 'approved', uploadedBy: 'Ruth Lin' },
      { id: '6-d3', type: 'BL draft', referenceNumber: 'BLD-EMC-4127', uploadedDate: '2026-03-19', status: 'approved', uploadedBy: 'Tikur Abay Origin Desk' },
      { id: '6-d4', type: 'Final BL', referenceNumber: 'FBL-EMC-4127', uploadedDate: '2026-03-19', status: 'uploaded', uploadedBy: 'Tikur Abay Origin Desk' },
      { id: '6-d5', type: 'Export permit / customs doc', referenceNumber: 'EX-CN-77211', uploadedDate: '2026-03-18', status: 'approved', uploadedBy: 'Ruth Lin' },
      { id: '6-d6', type: 'Stuffing photos', referenceNumber: 'PH-XMN-3345', uploadedDate: '2026-03-19', status: 'uploaded', uploadedBy: 'Warehouse Ops' },
      { id: '6-d7', type: 'Seal photo', referenceNumber: 'SEAL-XMN-3345', uploadedDate: '2026-03-19', status: 'approved', uploadedBy: 'Warehouse Ops' },
    ],
    container: {
      containerNumber: 'TRHU 338120-9',
      containerType: '20FT Dry',
      sealNumber: 'XMN-SEA-2014',
      stuffingDateTime: '2026-03-19 10:10',
      stuffingLocation: 'Xiamen export park',
      loadedBy: 'Aqua Flow loading team',
      containerCondition: 'Verified clean and dry',
      stuffingPhotoProof: '5 images uploaded',
      sealPhotoProof: '1 image uploaded',
      stuffingConfirmed: true,
      sealCaptured: true,
      conditionVerified: true,
      gateInConfirmed: false,
    },
    handoff: {
      vesselName: 'MV Jade Straits',
      voyageNumber: 'JS-208',
      carrier: 'Evergreen',
      blStatus: 'Final uploaded',
      terminalGateInStatus: 'Pending',
      oceanHandoffStatus: 'Not ready',
    },
    exceptions: [
      { id: '6-e1', severity: 'Medium', issueText: 'Terminal gate-in still pending for booked vessel cutoff.', actionLabel: 'Confirm gate-in' },
    ],
  }),
  buildShipment({
    id: 'supplier-7',
    bookingNumber: 'TAB-SUP-260319-07',
    customerName: 'Ethio Solar Projects',
    supplierName: 'Suzhou BrightVolt New Energy',
    supplierCode: 'SZH-624',
    serviceType: 'multimodal',
    originPort: 'Shanghai',
    finalDestination: 'Adama Solar Yard',
    incoterm: 'CIF Djibouti',
    currentStage: 'Booking created',
    assignedAgent: 'Grace Xu',
    lastUpdated: '2026-03-19T05:22:00Z',
    etd: '2026-03-27T22:15:00Z',
    etaDjibouti: '2026-04-05T09:15:00Z',
    exceptionLabel: 'Invoice',
    cargoItems: [
      { id: '7-1', lineNo: '01', description: 'Solar inverter cabinets', hsCode: '8504.40', packageType: 'Crate', packageQuantity: 6, netWeightKg: 3220, grossWeightKg: 3470, cbm: 4.6, marksNumbers: 'ESP/INV/01-06', invoiceRef: '', packingListRef: '', status: 'Missing data' },
    ],
    documents: [
      { id: '7-d1', type: 'Commercial invoice', referenceNumber: '-', uploadedDate: '-', status: 'missing', uploadedBy: 'Pending upload' },
      { id: '7-d2', type: 'Packing list', referenceNumber: '-', uploadedDate: '-', status: 'missing', uploadedBy: 'Pending upload' },
      { id: '7-d3', type: 'BL draft', referenceNumber: '-', uploadedDate: '-', status: 'missing', uploadedBy: 'Pending upload' },
      { id: '7-d4', type: 'Final BL', referenceNumber: '-', uploadedDate: '-', status: 'missing', uploadedBy: 'Pending upload' },
      { id: '7-d5', type: 'Export permit / customs doc', referenceNumber: '-', uploadedDate: '-', status: 'missing', uploadedBy: 'Pending upload' },
      { id: '7-d6', type: 'Stuffing photos', referenceNumber: '-', uploadedDate: '-', status: 'missing', uploadedBy: 'Pending upload' },
      { id: '7-d7', type: 'Seal photo', referenceNumber: '-', uploadedDate: '-', status: 'missing', uploadedBy: 'Pending upload' },
    ],
    container: {
      containerNumber: '',
      containerType: '40FT HC',
      sealNumber: '',
      stuffingDateTime: 'Not scheduled',
      stuffingLocation: 'Suzhou plant loading bay',
      loadedBy: 'Not assigned',
      containerCondition: 'Not verified',
      stuffingPhotoProof: 'Not uploaded',
      sealPhotoProof: 'Not uploaded',
      stuffingConfirmed: false,
      sealCaptured: false,
      conditionVerified: false,
      gateInConfirmed: false,
    },
    handoff: {
      vesselName: 'MV Ocean Reliance',
      voyageNumber: 'OR-401',
      carrier: 'COSCO',
      blStatus: 'Draft pending',
      terminalGateInStatus: 'Pending',
      oceanHandoffStatus: 'Not ready',
    },
    exceptions: [
      { id: '7-e1', severity: 'High', issueText: 'Commercial invoice not uploaded.', actionLabel: 'Upload invoice' },
      { id: '7-e2', severity: 'High', issueText: 'Packing list not uploaded.', actionLabel: 'Upload packing list' },
    ],
  }),
  buildShipment({
    id: 'supplier-8',
    bookingNumber: 'TAB-SUP-260319-08',
    customerName: 'Afar Mining Inputs',
    supplierName: 'Tianjin Alloy Drilling Tools Co.',
    supplierCode: 'TJN-990',
    serviceType: 'multimodal',
    originPort: 'Tianjin',
    finalDestination: 'Kality ICD',
    incoterm: 'CFR Djibouti',
    currentStage: 'Ready for vessel handoff',
    assignedAgent: 'Meron Fang',
    lastUpdated: '2026-03-19T10:08:00Z',
    etd: '2026-03-22T13:50:00Z',
    etaDjibouti: '2026-03-30T05:55:00Z',
    exceptionLabel: null,
    cargoItems: [
      { id: '8-1', lineNo: '01', description: 'Drill rod bundles', hsCode: '7304.23', packageType: 'Bundle', packageQuantity: 28, netWeightKg: 12440, grossWeightKg: 12980, cbm: 13.4, marksNumbers: 'AMI/ROD/01-28', invoiceRef: 'INV-TJN-1207', packingListRef: 'PL-TJN-1207', status: 'Complete' },
      { id: '8-2', lineNo: '02', description: 'Rock bit assemblies', hsCode: '8207.19', packageType: 'Crate', packageQuantity: 14, netWeightKg: 3210, grossWeightKg: 3490, cbm: 4.1, marksNumbers: 'AMI/BIT/29-42', invoiceRef: 'INV-TJN-1207', packingListRef: 'PL-TJN-1207', status: 'Complete' },
    ],
    documents: [
      { id: '8-d1', type: 'Commercial invoice', referenceNumber: 'INV-TJN-1207', uploadedDate: '2026-03-17', status: 'approved', uploadedBy: 'Meron Fang' },
      { id: '8-d2', type: 'Packing list', referenceNumber: 'PL-TJN-1207', uploadedDate: '2026-03-17', status: 'approved', uploadedBy: 'Meron Fang' },
      { id: '8-d3', type: 'BL draft', referenceNumber: 'BLD-MSK-7612', uploadedDate: '2026-03-18', status: 'approved', uploadedBy: 'Tikur Abay Origin Desk' },
      { id: '8-d4', type: 'Final BL', referenceNumber: 'FBL-MSK-7612', uploadedDate: '2026-03-19', status: 'uploaded', uploadedBy: 'Tikur Abay Origin Desk' },
      { id: '8-d5', type: 'Export permit / customs doc', referenceNumber: 'EX-CN-44518', uploadedDate: '2026-03-18', status: 'approved', uploadedBy: 'Meron Fang' },
      { id: '8-d6', type: 'Stuffing photos', referenceNumber: 'PH-TJN-1207', uploadedDate: '2026-03-19', status: 'approved', uploadedBy: 'Warehouse Ops' },
      { id: '8-d7', type: 'Seal photo', referenceNumber: 'SEAL-TJN-1207', uploadedDate: '2026-03-19', status: 'approved', uploadedBy: 'Warehouse Ops' },
    ],
    container: {
      containerNumber: 'GLDU 781224-6',
      containerType: '40FT Dry',
      sealNumber: 'TJN-ET-2217',
      stuffingDateTime: '2026-03-19 12:40',
      stuffingLocation: 'Tianjin bonded export yard',
      loadedBy: 'Alloy drilling export team',
      containerCondition: 'Verified clean and dry',
      stuffingPhotoProof: '7 images uploaded',
      sealPhotoProof: '2 images uploaded',
      stuffingConfirmed: true,
      sealCaptured: true,
      conditionVerified: true,
      gateInConfirmed: true,
    },
    handoff: {
      vesselName: 'MV Nile Compass',
      voyageNumber: 'NC-144',
      carrier: 'Maersk',
      blStatus: 'Final uploaded',
      terminalGateInStatus: 'Confirmed',
      oceanHandoffStatus: 'Ready for carrier handoff',
    },
    exceptions: [],
  }),
];

export const supplierDeskShipments: SupplierDeskShipment[] = seededSupplierDeskShipments.map((shipment) => ({
  ...shipment,
  finalDestination: normalizeSupplierDestination(shipment.finalDestination),
}));
