export type DjiboutiReleaseStage =
  | 'Vessel arrived'
  | 'Awaiting discharge'
  | 'Discharged'
  | 'Shipping line release pending'
  | 'Customs note pending'
  | 'Transit document pending'
  | 'Gate-out ready'
  | 'Waiting inland handoff';

export type DjiboutiReleaseRecord = {
  id: string;
  bookingNumber: string;
  blNumber: string;
  containerNumber: string;
  sealNumber: string;
  customerName: string;
  serviceType: 'multimodal' | 'unimodal';
  vesselName: string;
  voyageNumber: string;
  dischargePort: string;
  finalDestination: string;
  currentStage: DjiboutiReleaseStage;
  assignedAgent: string;
  lastUpdated: string;
  vesselArrival: string;
  dischargeTime: string;
  etaSummary: string;
  releaseStatus: 'Awaiting release' | 'Release in progress' | 'Gate-out ready' | 'Handed to dispatch';
  customsStatus: 'Pending' | 'Under review' | 'Cleared';
  storageRisk: 'Safe' | 'Approaching' | 'Urgent';
  lineReleaseReceived: boolean;
  terminalReleaseReady: boolean;
  customsHold: boolean;
  releaseNoteUploaded: boolean;
  gateOutReady: boolean;
  inlandHandoffSent: boolean;
  releaseOwner: string;
  releaseDeadline: string;
  expectedGateOutTime: string;
  releaseBlockers: string;
  customsTransit: {
    declarationReference: string;
    transitType: 'T1' | 'TIR' | 'Transit declaration' | 'Customs transit permit' | 'Other';
    transitNumber: string;
    inspectionStatus: 'Not selected' | 'Pending' | 'Under inspection' | 'Cleared';
    customsNoteStatus: 'Missing' | 'Uploaded' | 'Approved';
    customsCleared: boolean;
    dutyTaxNote: string;
    bondGuaranteeNote: string;
    transitPacketComplete: boolean;
  };
  storage: {
    terminalDepot: string;
    freeTimeStart: string;
    freeTimeEnd: string;
    timeRemainingHours: number;
    warningText: string;
    gatePassStatus: 'Pending' | 'Generated' | 'Approved';
    terminalPickupStatus: string;
  };
  handoff: {
    destinationCorridor: string;
    inlandDestination: string;
    dispatchOwner: string;
    truckAssignmentStatus: string;
    tripCreationStatus: string;
    handoffPacketComplete: boolean;
    packetItems: Array<{
      label: string;
      complete: boolean;
    }>;
  };
  exceptions: Array<{
    id: string;
    severity: 'Low' | 'Medium' | 'High';
    issueText: string;
    actionLabel: string;
  }>;
};

function buildRecord(input: DjiboutiReleaseRecord): DjiboutiReleaseRecord {
  return input;
}

function normalizeReleaseDestination(value: string) {
  if (value === 'Customer pickup at Djibouti') {
    return value;
  }
  if (value.includes('Kality')) {
    return 'Combolcha Dry Port';
  }
  return 'Adama Dry Port';
}

function normalizeReleaseCorridor(destination: string) {
  if (destination === 'Customer pickup at Djibouti') {
    return 'Djibouti local pickup';
  }
  if (destination.includes('Combolcha')) {
    return 'Djibouti -> Galafi -> Combolcha';
  }
  return 'Djibouti -> Galafi -> Adama';
}

function normalizeDispatchOwner(destination: string) {
  return destination.includes('Combolcha') ? 'Combolcha Corridor Control' : 'Adama Corridor Control';
}

const seededDjiboutiReleaseRecords: DjiboutiReleaseRecord[] = [
  buildRecord({
    id: 'dji-1',
    bookingNumber: 'TAB-DJI-260319-01',
    blNumber: 'MSKU-DJI-884211',
    containerNumber: 'MSCU 458912-7',
    sealNumber: 'SEAL-ET-44821',
    customerName: 'East Gate Manufacturing PLC',
    serviceType: 'multimodal',
    vesselName: 'MV Red Sea Meridian',
    voyageNumber: 'RSM-118',
    dischargePort: 'Djibouti Port',
    finalDestination: 'Modjo Dry Port',
    currentStage: 'Transit document pending',
    assignedAgent: 'Muna Ibrahim',
    lastUpdated: '2026-03-19T12:18:00Z',
    vesselArrival: '2026-03-18T05:20:00Z',
    dischargeTime: '2026-03-18T07:45:00Z',
    etaSummary: 'Arrived Mar 18 · Gate-out target Mar 20',
    releaseStatus: 'Release in progress',
    customsStatus: 'Under review',
    storageRisk: 'Approaching',
    lineReleaseReceived: true,
    terminalReleaseReady: true,
    customsHold: false,
    releaseNoteUploaded: true,
    gateOutReady: false,
    inlandHandoffSent: false,
    releaseOwner: 'Muna Ibrahim',
    releaseDeadline: '2026-03-20T17:00:00Z',
    expectedGateOutTime: '2026-03-20T15:30:00Z',
    releaseBlockers: 'Transit document packet still awaiting customs reference attachment.',
    customsTransit: {
      declarationReference: 'DEC-DJI-55281',
      transitType: 'T1',
      transitNumber: 'T1-DJI-99281',
      inspectionStatus: 'Pending',
      customsNoteStatus: 'Uploaded',
      customsCleared: false,
      dutyTaxNote: 'Tax estimate validated for inland movement under transit.',
      bondGuaranteeNote: 'Bond BOND-7782 active through Modjo destination office.',
      transitPacketComplete: false,
    },
    storage: {
      terminalDepot: 'SGTD Terminal',
      freeTimeStart: '2026-03-18T07:45:00Z',
      freeTimeEnd: '2026-03-20T07:45:00Z',
      timeRemainingHours: 16,
      warningText: '16 hours remaining before detention risk.',
      gatePassStatus: 'Pending',
      terminalPickupStatus: 'Pickup can proceed once gate pass is generated.',
    },
    handoff: {
      destinationCorridor: 'Djibouti -> Galafi -> Modjo',
      inlandDestination: 'Modjo Dry Port',
      dispatchOwner: 'Adama Corridor Control',
      truckAssignmentStatus: 'Awaiting push to dispatch',
      tripCreationStatus: 'Not created',
      handoffPacketComplete: false,
      packetItems: [
        { label: 'BL', complete: true },
        { label: 'Invoice', complete: true },
        { label: 'Packing list', complete: true },
        { label: 'Transit/customs doc', complete: false },
        { label: 'Release note', complete: true },
        { label: 'Container + seal', complete: true },
        { label: 'Customer contact', complete: true },
        { label: 'Special handling notes', complete: true },
      ],
    },
    exceptions: [
      { id: 'dji-1e1', severity: 'High', issueText: 'Free time below 24 hours and gate pass not yet generated.', actionLabel: 'Escalate release' },
      { id: 'dji-1e2', severity: 'Medium', issueText: 'Transit document packet still incomplete for inland movement.', actionLabel: 'Attach transit file' },
    ],
  }),
  buildRecord({
    id: 'dji-2',
    bookingNumber: 'TAB-DJI-260319-02',
    blNumber: 'OOLU-DJI-551208',
    containerNumber: 'OOLU 621500-2',
    sealNumber: 'OOL-ET-22019',
    customerName: 'Abay Agro Processing',
    serviceType: 'multimodal',
    vesselName: 'MV Horn of Africa',
    voyageNumber: 'HOA-204',
    dischargePort: 'Djibouti Port',
    finalDestination: 'Kality ICD',
    currentStage: 'Shipping line release pending',
    assignedAgent: 'Siham Ali',
    lastUpdated: '2026-03-19T09:04:00Z',
    vesselArrival: '2026-03-19T02:30:00Z',
    dischargeTime: '2026-03-19T08:20:00Z',
    etaSummary: 'Arrived Mar 19 · Release watch active',
    releaseStatus: 'Awaiting release',
    customsStatus: 'Pending',
    storageRisk: 'Safe',
    lineReleaseReceived: false,
    terminalReleaseReady: false,
    customsHold: false,
    releaseNoteUploaded: false,
    gateOutReady: false,
    inlandHandoffSent: false,
    releaseOwner: 'Siham Ali',
    releaseDeadline: '2026-03-21T16:00:00Z',
    expectedGateOutTime: '2026-03-21T11:00:00Z',
    releaseBlockers: 'Line release and customs note are both outstanding.',
    customsTransit: {
      declarationReference: 'DEC-DJI-66172',
      transitType: 'Transit declaration',
      transitNumber: 'TR-DJI-66172',
      inspectionStatus: 'Not selected',
      customsNoteStatus: 'Missing',
      customsCleared: false,
      dutyTaxNote: 'Duty note pending broker estimate.',
      bondGuaranteeNote: 'Guarantee file not yet attached.',
      transitPacketComplete: false,
    },
    storage: {
      terminalDepot: 'Doraleh Container Terminal',
      freeTimeStart: '2026-03-19T08:20:00Z',
      freeTimeEnd: '2026-03-22T08:20:00Z',
      timeRemainingHours: 62,
      warningText: '62 hours remaining in free time.',
      gatePassStatus: 'Pending',
      terminalPickupStatus: 'Pickup blocked until line release is confirmed.',
    },
    handoff: {
      destinationCorridor: 'Djibouti -> Galafi -> Addis',
      inlandDestination: 'Kality ICD',
      dispatchOwner: 'Addis Dispatch Desk',
      truckAssignmentStatus: 'Not released to dispatch',
      tripCreationStatus: 'Not created',
      handoffPacketComplete: false,
      packetItems: [
        { label: 'BL', complete: true },
        { label: 'Invoice', complete: true },
        { label: 'Packing list', complete: true },
        { label: 'Transit/customs doc', complete: false },
        { label: 'Release note', complete: false },
        { label: 'Container + seal', complete: true },
        { label: 'Customer contact', complete: true },
        { label: 'Special handling notes', complete: true },
      ],
    },
    exceptions: [
      { id: 'dji-2e1', severity: 'High', issueText: 'Shipping line release still pending after discharge confirmation.', actionLabel: 'Chase line release' },
      { id: 'dji-2e2', severity: 'Medium', issueText: 'Customs note missing from release packet.', actionLabel: 'Upload customs note' },
    ],
  }),
  buildRecord({
    id: 'dji-3',
    bookingNumber: 'TAB-DJI-260319-03',
    blNumber: 'CMA-DJI-440671',
    containerNumber: 'TEMU 741208-4',
    sealNumber: 'SEA-QDG-9871',
    customerName: 'Addis Pharma PLC',
    serviceType: 'unimodal',
    vesselName: 'MV Gulf Prosperity',
    voyageNumber: 'GP-551',
    dischargePort: 'Djibouti Port',
    finalDestination: 'Addis Ababa Warehouse',
    currentStage: 'Gate-out ready',
    assignedAgent: 'Fatuma Warsame',
    lastUpdated: '2026-03-19T07:30:00Z',
    vesselArrival: '2026-03-18T21:45:00Z',
    dischargeTime: '2026-03-19T00:25:00Z',
    etaSummary: 'Arrived overnight · Pickup can proceed today',
    releaseStatus: 'Gate-out ready',
    customsStatus: 'Cleared',
    storageRisk: 'Safe',
    lineReleaseReceived: true,
    terminalReleaseReady: true,
    customsHold: false,
    releaseNoteUploaded: true,
    gateOutReady: true,
    inlandHandoffSent: false,
    releaseOwner: 'Fatuma Warsame',
    releaseDeadline: '2026-03-20T13:00:00Z',
    expectedGateOutTime: '2026-03-19T16:15:00Z',
    releaseBlockers: 'No release blockers remain.',
    customsTransit: {
      declarationReference: 'DEC-DJI-44712',
      transitType: 'Customs transit permit',
      transitNumber: 'CTP-DJI-44712',
      inspectionStatus: 'Cleared',
      customsNoteStatus: 'Approved',
      customsCleared: true,
      dutyTaxNote: 'No additional duty hold for unimodal release.',
      bondGuaranteeNote: 'Broker guarantee verified.',
      transitPacketComplete: true,
    },
    storage: {
      terminalDepot: 'SGTD Terminal',
      freeTimeStart: '2026-03-19T00:25:00Z',
      freeTimeEnd: '2026-03-22T00:25:00Z',
      timeRemainingHours: 54,
      warningText: '54 hours remaining in free time.',
      gatePassStatus: 'Approved',
      terminalPickupStatus: 'Pickup can proceed today.',
    },
    handoff: {
      destinationCorridor: 'Djibouti -> Addis',
      inlandDestination: 'Addis Ababa Warehouse',
      dispatchOwner: 'Customer-arranged inland move',
      truckAssignmentStatus: 'Waiting customer pickup instruction',
      tripCreationStatus: 'External handoff',
      handoffPacketComplete: true,
      packetItems: [
        { label: 'BL', complete: true },
        { label: 'Invoice', complete: true },
        { label: 'Packing list', complete: true },
        { label: 'Transit/customs doc', complete: true },
        { label: 'Release note', complete: true },
        { label: 'Container + seal', complete: true },
        { label: 'Customer contact', complete: true },
        { label: 'Special handling notes', complete: true },
      ],
    },
    exceptions: [],
  }),
  buildRecord({
    id: 'dji-4',
    bookingNumber: 'TAB-DJI-260319-04',
    blNumber: 'ONE-DJI-320118',
    containerNumber: 'GLDU 219845-0',
    sealNumber: 'ONE-4471',
    customerName: 'Blue Nile Cables',
    serviceType: 'multimodal',
    vesselName: 'MV Lion City Bridge',
    voyageNumber: 'LCB-77',
    dischargePort: 'Djibouti Port',
    finalDestination: 'Adama Logistics Park',
    currentStage: 'Awaiting discharge',
    assignedAgent: 'Muna Ibrahim',
    lastUpdated: '2026-03-19T06:20:00Z',
    vesselArrival: '2026-03-19T04:10:00Z',
    dischargeTime: '',
    etaSummary: 'Vessel berthed · discharge window pending',
    releaseStatus: 'Awaiting release',
    customsStatus: 'Pending',
    storageRisk: 'Safe',
    lineReleaseReceived: false,
    terminalReleaseReady: false,
    customsHold: false,
    releaseNoteUploaded: false,
    gateOutReady: false,
    inlandHandoffSent: false,
    releaseOwner: 'Muna Ibrahim',
    releaseDeadline: '2026-03-22T18:00:00Z',
    expectedGateOutTime: '2026-03-21T14:00:00Z',
    releaseBlockers: 'Discharge confirmation not yet received from terminal.',
    customsTransit: {
      declarationReference: 'DEC-DJI-90214',
      transitType: 'TIR',
      transitNumber: 'TIR-DJI-90214',
      inspectionStatus: 'Not selected',
      customsNoteStatus: 'Missing',
      customsCleared: false,
      dutyTaxNote: 'Awaiting broker customs review.',
      bondGuaranteeNote: 'TIR carnet details pending attachment.',
      transitPacketComplete: false,
    },
    storage: {
      terminalDepot: 'Doraleh Container Terminal',
      freeTimeStart: '2026-03-19T04:10:00Z',
      freeTimeEnd: '2026-03-22T04:10:00Z',
      timeRemainingHours: 58,
      warningText: '58 hours remaining in free time.',
      gatePassStatus: 'Pending',
      terminalPickupStatus: 'Pickup blocked until discharge is confirmed.',
    },
    handoff: {
      destinationCorridor: 'Djibouti -> Galafi -> Adama',
      inlandDestination: 'Adama Logistics Park',
      dispatchOwner: 'Adama Corridor Control',
      truckAssignmentStatus: 'Not released to dispatch',
      tripCreationStatus: 'Not created',
      handoffPacketComplete: false,
      packetItems: [
        { label: 'BL', complete: true },
        { label: 'Invoice', complete: true },
        { label: 'Packing list', complete: true },
        { label: 'Transit/customs doc', complete: false },
        { label: 'Release note', complete: false },
        { label: 'Container + seal', complete: true },
        { label: 'Customer contact', complete: true },
        { label: 'Special handling notes', complete: true },
      ],
    },
    exceptions: [
      { id: 'dji-4e1', severity: 'High', issueText: 'Discharge confirmation missing although vessel has berthed.', actionLabel: 'Confirm discharge' },
    ],
  }),
  buildRecord({
    id: 'dji-5',
    bookingNumber: 'TAB-DJI-260319-05',
    blNumber: 'HPL-DJI-667218',
    containerNumber: 'GESU 551720-1',
    sealNumber: 'GZH-ET-5541',
    customerName: 'Ethio Build Materials',
    serviceType: 'multimodal',
    vesselName: 'MV East Africa Pioneer',
    voyageNumber: 'EAP-312',
    dischargePort: 'Djibouti Port',
    finalDestination: 'Addis Ababa',
    currentStage: 'Customs note pending',
    assignedAgent: 'Siham Ali',
    lastUpdated: '2026-03-19T10:12:00Z',
    vesselArrival: '2026-03-18T17:10:00Z',
    dischargeTime: '2026-03-18T22:55:00Z',
    etaSummary: 'Discharged Mar 18 · Customs follow-up pending',
    releaseStatus: 'Release in progress',
    customsStatus: 'Under review',
    storageRisk: 'Approaching',
    lineReleaseReceived: true,
    terminalReleaseReady: true,
    customsHold: false,
    releaseNoteUploaded: false,
    gateOutReady: false,
    inlandHandoffSent: false,
    releaseOwner: 'Siham Ali',
    releaseDeadline: '2026-03-20T12:00:00Z',
    expectedGateOutTime: '2026-03-20T18:00:00Z',
    releaseBlockers: 'Customs note and release note upload still pending.',
    customsTransit: {
      declarationReference: 'DEC-DJI-71108',
      transitType: 'Transit declaration',
      transitNumber: 'TR-DJI-71108',
      inspectionStatus: 'Under inspection',
      customsNoteStatus: 'Missing',
      customsCleared: false,
      dutyTaxNote: 'Valuation note cleared; inspection note still pending.',
      bondGuaranteeNote: 'Guarantee file valid through Addis destination.',
      transitPacketComplete: false,
    },
    storage: {
      terminalDepot: 'Djibouti Port Terminal 2',
      freeTimeStart: '2026-03-18T22:55:00Z',
      freeTimeEnd: '2026-03-20T22:55:00Z',
      timeRemainingHours: 22,
      warningText: '22 hours remaining before detention risk.',
      gatePassStatus: 'Pending',
      terminalPickupStatus: 'Pickup blocked by customs note gap.',
    },
    handoff: {
      destinationCorridor: 'Djibouti -> Galafi -> Addis',
      inlandDestination: 'Addis Ababa',
      dispatchOwner: 'Addis Dispatch Desk',
      truckAssignmentStatus: 'On hold',
      tripCreationStatus: 'Waiting release desk',
      handoffPacketComplete: false,
      packetItems: [
        { label: 'BL', complete: true },
        { label: 'Invoice', complete: true },
        { label: 'Packing list', complete: true },
        { label: 'Transit/customs doc', complete: true },
        { label: 'Release note', complete: false },
        { label: 'Container + seal', complete: true },
        { label: 'Customer contact', complete: true },
        { label: 'Special handling notes', complete: true },
      ],
    },
    exceptions: [
      { id: 'dji-5e1', severity: 'High', issueText: 'Free time below 24 hours with customs note still missing.', actionLabel: 'Escalate customs' },
      { id: 'dji-5e2', severity: 'Medium', issueText: 'Release note not uploaded to release packet.', actionLabel: 'Upload release note' },
    ],
  }),
  buildRecord({
    id: 'dji-6',
    bookingNumber: 'TAB-DJI-260319-06',
    blNumber: 'EMC-DJI-411902',
    containerNumber: 'TRHU 338120-9',
    sealNumber: 'XMN-SEA-2014',
    customerName: 'Horizon Water Systems',
    serviceType: 'unimodal',
    vesselName: 'MV Jade Straits',
    voyageNumber: 'JS-208',
    dischargePort: 'Djibouti Port',
    finalDestination: 'Customer pickup at Djibouti',
    currentStage: 'Discharged',
    assignedAgent: 'Fatuma Warsame',
    lastUpdated: '2026-03-19T08:42:00Z',
    vesselArrival: '2026-03-19T01:55:00Z',
    dischargeTime: '2026-03-19T05:40:00Z',
    etaSummary: 'Discharged today · Release can progress',
    releaseStatus: 'Awaiting release',
    customsStatus: 'Pending',
    storageRisk: 'Safe',
    lineReleaseReceived: false,
    terminalReleaseReady: false,
    customsHold: false,
    releaseNoteUploaded: false,
    gateOutReady: false,
    inlandHandoffSent: false,
    releaseOwner: 'Fatuma Warsame',
    releaseDeadline: '2026-03-22T15:00:00Z',
    expectedGateOutTime: '2026-03-21T09:30:00Z',
    releaseBlockers: 'Line release and customs file still outstanding.',
    customsTransit: {
      declarationReference: 'DEC-DJI-89011',
      transitType: 'Other',
      transitNumber: 'CT-DJI-89011',
      inspectionStatus: 'Not selected',
      customsNoteStatus: 'Missing',
      customsCleared: false,
      dutyTaxNote: 'Customer-managed taxes pending confirmation.',
      bondGuaranteeNote: 'No bond note required yet.',
      transitPacketComplete: false,
    },
    storage: {
      terminalDepot: 'SGTD Terminal',
      freeTimeStart: '2026-03-19T05:40:00Z',
      freeTimeEnd: '2026-03-22T05:40:00Z',
      timeRemainingHours: 57,
      warningText: '57 hours remaining in free time.',
      gatePassStatus: 'Pending',
      terminalPickupStatus: 'Waiting release controls.',
    },
    handoff: {
      destinationCorridor: 'No inland dispatch required',
      inlandDestination: 'Customer pickup at Djibouti',
      dispatchOwner: 'Not applicable',
      truckAssignmentStatus: 'Customer pickup pending',
      tripCreationStatus: 'Not applicable',
      handoffPacketComplete: false,
      packetItems: [
        { label: 'BL', complete: true },
        { label: 'Invoice', complete: true },
        { label: 'Packing list', complete: true },
        { label: 'Transit/customs doc', complete: false },
        { label: 'Release note', complete: false },
        { label: 'Container + seal', complete: true },
        { label: 'Customer contact', complete: true },
        { label: 'Special handling notes', complete: true },
      ],
    },
    exceptions: [
      { id: 'dji-6e1', severity: 'Medium', issueText: 'Customs note missing for released unimodal pickup file.', actionLabel: 'Upload customs file' },
    ],
  }),
  buildRecord({
    id: 'dji-7',
    bookingNumber: 'TAB-DJI-260319-07',
    blNumber: 'COS-DJI-708114',
    containerNumber: 'SEKU 640772-3',
    sealNumber: 'COS-9012',
    customerName: 'Ethio Solar Projects',
    serviceType: 'multimodal',
    vesselName: 'MV Ocean Reliance',
    voyageNumber: 'OR-401',
    dischargePort: 'Djibouti Port',
    finalDestination: 'Adama Solar Yard',
    currentStage: 'Vessel arrived',
    assignedAgent: 'Muna Ibrahim',
    lastUpdated: '2026-03-19T11:02:00Z',
    vesselArrival: '2026-03-19T10:10:00Z',
    dischargeTime: '',
    etaSummary: 'Vessel arrived this morning',
    releaseStatus: 'Awaiting release',
    customsStatus: 'Pending',
    storageRisk: 'Safe',
    lineReleaseReceived: false,
    terminalReleaseReady: false,
    customsHold: false,
    releaseNoteUploaded: false,
    gateOutReady: false,
    inlandHandoffSent: false,
    releaseOwner: 'Muna Ibrahim',
    releaseDeadline: '2026-03-22T17:00:00Z',
    expectedGateOutTime: '2026-03-21T13:15:00Z',
    releaseBlockers: 'Arrival confirmed but discharge and line release are still pending.',
    customsTransit: {
      declarationReference: 'DEC-DJI-55011',
      transitType: 'T1',
      transitNumber: 'T1-DJI-55011',
      inspectionStatus: 'Not selected',
      customsNoteStatus: 'Missing',
      customsCleared: false,
      dutyTaxNote: 'Transit estimate not yet approved.',
      bondGuaranteeNote: 'Bond file draft prepared but not activated.',
      transitPacketComplete: false,
    },
    storage: {
      terminalDepot: 'Doraleh Container Terminal',
      freeTimeStart: '2026-03-19T10:10:00Z',
      freeTimeEnd: '2026-03-22T10:10:00Z',
      timeRemainingHours: 61,
      warningText: '61 hours remaining in free time.',
      gatePassStatus: 'Pending',
      terminalPickupStatus: 'Awaiting discharge and release controls.',
    },
    handoff: {
      destinationCorridor: 'Djibouti -> Galafi -> Adama',
      inlandDestination: 'Adama Solar Yard',
      dispatchOwner: 'Adama Corridor Control',
      truckAssignmentStatus: 'Not released to dispatch',
      tripCreationStatus: 'Not created',
      handoffPacketComplete: false,
      packetItems: [
        { label: 'BL', complete: true },
        { label: 'Invoice', complete: true },
        { label: 'Packing list', complete: true },
        { label: 'Transit/customs doc', complete: false },
        { label: 'Release note', complete: false },
        { label: 'Container + seal', complete: true },
        { label: 'Customer contact', complete: true },
        { label: 'Special handling notes', complete: true },
      ],
    },
    exceptions: [
      { id: 'dji-7e1', severity: 'Medium', issueText: 'Discharge confirmation still pending after vessel arrival.', actionLabel: 'Confirm discharge' },
    ],
  }),
  buildRecord({
    id: 'dji-8',
    bookingNumber: 'TAB-DJI-260319-08',
    blNumber: 'MSK-DJI-772601',
    containerNumber: 'GLDU 781224-6',
    sealNumber: 'TJN-ET-2217',
    customerName: 'Afar Mining Inputs',
    serviceType: 'multimodal',
    vesselName: 'MV Nile Compass',
    voyageNumber: 'NC-144',
    dischargePort: 'Djibouti Port',
    finalDestination: 'Kality ICD',
    currentStage: 'Waiting inland handoff',
    assignedAgent: 'Siham Ali',
    lastUpdated: '2026-03-19T07:52:00Z',
    vesselArrival: '2026-03-18T23:20:00Z',
    dischargeTime: '2026-03-19T03:05:00Z',
    etaSummary: 'Gate-out approved · waiting dispatch push',
    releaseStatus: 'Handed to dispatch',
    customsStatus: 'Cleared',
    storageRisk: 'Safe',
    lineReleaseReceived: true,
    terminalReleaseReady: true,
    customsHold: false,
    releaseNoteUploaded: true,
    gateOutReady: true,
    inlandHandoffSent: false,
    releaseOwner: 'Siham Ali',
    releaseDeadline: '2026-03-20T11:30:00Z',
    expectedGateOutTime: '2026-03-19T09:45:00Z',
    releaseBlockers: 'Dispatch push still needs to be triggered.',
    customsTransit: {
      declarationReference: 'DEC-DJI-33082',
      transitType: 'T1',
      transitNumber: 'T1-DJI-33082',
      inspectionStatus: 'Cleared',
      customsNoteStatus: 'Approved',
      customsCleared: true,
      dutyTaxNote: 'No finance block remains.',
      bondGuaranteeNote: 'Bond guarantee active and verified.',
      transitPacketComplete: true,
    },
    storage: {
      terminalDepot: 'Djibouti Port Terminal 2',
      freeTimeStart: '2026-03-19T03:05:00Z',
      freeTimeEnd: '2026-03-22T03:05:00Z',
      timeRemainingHours: 51,
      warningText: '51 hours remaining in free time.',
      gatePassStatus: 'Approved',
      terminalPickupStatus: 'Pickup can proceed immediately.',
    },
    handoff: {
      destinationCorridor: 'Djibouti -> Galafi -> Kality',
      inlandDestination: 'Kality ICD',
      dispatchOwner: 'Addis Dispatch Desk',
      truckAssignmentStatus: 'Truck preselected',
      tripCreationStatus: 'Ready to create',
      handoffPacketComplete: true,
      packetItems: [
        { label: 'BL', complete: true },
        { label: 'Invoice', complete: true },
        { label: 'Packing list', complete: true },
        { label: 'Transit/customs doc', complete: true },
        { label: 'Release note', complete: true },
        { label: 'Container + seal', complete: true },
        { label: 'Customer contact', complete: true },
        { label: 'Special handling notes', complete: true },
      ],
    },
    exceptions: [
      { id: 'dji-8e1', severity: 'Low', issueText: 'Dispatch push not yet triggered although gate-out is approved.', actionLabel: 'Push to dispatch' },
    ],
  }),
];

export const djiboutiReleaseRecords: DjiboutiReleaseRecord[] = seededDjiboutiReleaseRecords.map((record): DjiboutiReleaseRecord => {
  const finalDestination = normalizeReleaseDestination(record.finalDestination);
  const destinationCorridor = normalizeReleaseCorridor(finalDestination);

  return {
    ...record,
    finalDestination,
    handoff: {
      ...record.handoff,
      inlandDestination: normalizeReleaseDestination(record.handoff.inlandDestination),
      destinationCorridor,
      dispatchOwner: normalizeDispatchOwner(finalDestination),
    },
  };
});
