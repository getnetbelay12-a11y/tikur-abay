export type YardStage =
  | 'Arriving inland'
  | 'Arrived at gate'
  | 'Awaiting unload'
  | 'Unloading in progress'
  | 'In storage'
  | 'Awaiting consignee handoff'
  | 'POD complete'
  | 'Empty released'
  | 'Empty return in progress'
  | 'Cycle closed';

export type YardRecord = {
  id: string;
  tripId: string;
  bookingNumber: string;
  blNumber: string;
  containerNumber: string;
  sealNumber: string;
  customerName: string;
  consigneeName: string;
  serviceType: 'multimodal' | 'unimodal';
  inlandNode: string;
  yardStage: YardStage;
  unloadChip: string;
  emptyReturnChip: string | null;
  etaSummary: string;
  assignedYardAgent: string;
  arrivalTimestamp: string;
  lastUpdated: string;
  arrivalControl: {
    eta: string;
    actualArrivalTime: string;
    gateInConfirmed: boolean;
    routeCompleted: boolean;
    arrivalNote: string;
    yardContact: string;
    inspectionRequired: boolean;
    sealCheckAtArrival: boolean;
  };
  unloadStatus: {
    unloadStarted: boolean;
    unloadCompleted: boolean;
    unloadStartTime: string;
    unloadEndTime: string;
    unloadedBy: string;
    cargoCountVerified: boolean;
    varianceNote: string;
    unloadPhotosUploaded: boolean;
  };
  storageAssignment: {
    storageLocation: string;
    storageStartTime: string;
    storageStatus: 'Not assigned' | 'Assigned' | 'Ready for pickup' | 'Released';
    expectedPickupTime: string;
    specialHandlingConditions: string;
    goodsArea: 'Bonded' | 'Controlled' | 'Normal';
    consigneePickupReady: boolean;
  };
  podReadiness: {
    podRequired: boolean;
    consigneeContact: string;
    receivingContact: string;
    deliveryNoteStatus: string;
    releaseNoteAvailable: boolean;
    handoffInstruction: string;
    signatureRequired: boolean;
    photoProofRequired: boolean;
  };
  consigneeHandoff: {
    representative: string;
    handoffStatus: 'Pending' | 'Scheduled' | 'Completed' | 'Issue raised';
    handoffTime: string;
    signedBy: string;
    photoProofUploaded: boolean;
    issueAtHandoff: boolean;
    finalCargoConditionNote: string;
  };
  emptyReturn: {
    status: 'Not released' | 'Ready for empty release' | 'Empty in return transit' | 'Empty returned' | 'Closure pending' | 'Cycle closed';
    emptyReleaseGranted: boolean;
    emptyReleaseTimestamp: string;
    returnOwner: string;
    returnTripId?: string;
    assignedReturnDriver?: string;
    returnDriverPhone?: string;
    assignedReturnTruck?: string;
    assignedReturnTrailer?: string;
    designatedDepot: string;
    currentLocation?: string;
    lastLocationUpdateAt?: string;
    emptyPickupStatus: string;
    emptyDepartureTime: string;
    emptyReturned: boolean;
    returnTimestamp: string;
    returnReceiptAvailable: boolean;
    returnReceiptRef: string;
    detentionRiskOpen: boolean;
  };
  exceptions: Array<{
    id: string;
    severity: 'Low' | 'Medium' | 'High';
    issueText: string;
    actionLabel: string;
  }>;
};

function normalizeYardDestination(value: string) {
  if (value.includes('Kality')) {
    return 'Combolcha Dry Port';
  }
  return 'Adama Dry Port';
}

function replaceYardLocationText(value: string, destination: string) {
  const short = destination.includes('Combolcha') ? 'Combolcha' : 'Adama';
  return value
    .replace(/Modjo Dry Port/g, destination)
    .replace(/Adama Inland Terminal/g, destination)
    .replace(/Kality Inland Yard/g, destination)
    .replace(/Addis Inland Delivery/g, destination)
    .replace(/Modjo Gate Office/g, `${short} Gate Office`)
    .replace(/Modjo gate office/g, `${short} gate office`)
    .replace(/Modjo/g, short)
    .replace(/Kality/g, short)
    .replace(/Addis/g, short)
    .replace(/Adama/g, short)
    .replace(/Doraleh Empty Depot/g, 'Djibouti Empty Depot')
    .replace(/Djibouti Empty Yard 4/g, 'Djibouti Empty Depot')
    .replace(/Modjo Empty Pool/g, 'Djibouti Empty Depot');
}

const seededDryPortYardRecords: YardRecord[] = [
  {
    id: 'yard-1',
    tripId: 'TRP-240319-11',
    bookingNumber: 'TAB-DJI-260319-01',
    blNumber: 'MSKU-DJI-884211',
    containerNumber: 'MSCU 458912-7',
    sealNumber: 'SEAL-ET-44821',
    customerName: 'East Gate Manufacturing PLC',
    consigneeName: 'East Gate Manufacturing PLC',
    serviceType: 'multimodal',
    inlandNode: 'Modjo Dry Port',
    yardStage: 'Awaiting unload',
    unloadChip: 'Gate-in complete',
    emptyReturnChip: 'Not released',
    etaSummary: 'Arrived Mar 20 08:40',
    assignedYardAgent: 'Meron Tadesse',
    arrivalTimestamp: '2026-03-20T08:40:00Z',
    lastUpdated: '2026-03-20T09:02:00Z',
    arrivalControl: {
      eta: '2026-03-20T08:15:00Z',
      actualArrivalTime: '2026-03-20T08:40:00Z',
      gateInConfirmed: true,
      routeCompleted: true,
      arrivalNote: 'Checkpoint inspection note attached to arrival file.',
      yardContact: 'Modjo Gate Office · +251 911 440 210',
      inspectionRequired: true,
      sealCheckAtArrival: true,
    },
    unloadStatus: {
      unloadStarted: false,
      unloadCompleted: false,
      unloadStartTime: '',
      unloadEndTime: '',
      unloadedBy: 'Bay 4 unload team',
      cargoCountVerified: false,
      varianceNote: 'Inspection slot reserved before unload start.',
      unloadPhotosUploaded: false,
    },
    storageAssignment: {
      storageLocation: 'Zone B / Bay 14',
      storageStartTime: '',
      storageStatus: 'Not assigned',
      expectedPickupTime: '2026-03-20T14:30:00Z',
      specialHandlingConditions: 'Hold first two pallets for customs re-check.',
      goodsArea: 'Controlled',
      consigneePickupReady: false,
    },
    podReadiness: {
      podRequired: true,
      consigneeContact: 'Hanna Mesfin · +251 911 220 190',
      receivingContact: 'Meseret Alemu',
      deliveryNoteStatus: 'Awaiting unload completion',
      releaseNoteAvailable: true,
      handoffInstruction: 'Release only after inspection sign-off on line 01.',
      signatureRequired: true,
      photoProofRequired: true,
    },
    consigneeHandoff: {
      representative: 'Pending consignee assignment',
      handoffStatus: 'Pending',
      handoffTime: '',
      signedBy: '',
      photoProofUploaded: false,
      issueAtHandoff: false,
      finalCargoConditionNote: 'Awaiting unload completion.',
    },
    emptyReturn: {
      status: 'Not released',
      emptyReleaseGranted: false,
      emptyReleaseTimestamp: '',
      returnOwner: 'Tikur Abay Yard Control',
      designatedDepot: 'Doraleh Empty Depot',
      emptyPickupStatus: 'Awaiting unload completion',
      emptyDepartureTime: '',
      emptyReturned: false,
      returnTimestamp: '',
      returnReceiptAvailable: false,
      returnReceiptRef: '',
      detentionRiskOpen: true,
    },
    exceptions: [
      { id: 'yard-1-ex-1', severity: 'Medium', issueText: 'Arrival confirmed but unload not yet started.', actionLabel: 'Start unload' },
      { id: 'yard-1-ex-2', severity: 'Low', issueText: 'Storage location not yet assigned after gate-in.', actionLabel: 'Assign storage' },
    ],
  },
  {
    id: 'yard-2',
    tripId: 'TRP-240318-07',
    bookingNumber: 'TAB-DJI-260318-04',
    blNumber: 'OOLU-DJI-663901',
    containerNumber: 'OOLU 114820-3',
    sealNumber: 'SEAL-MDJ-55104',
    customerName: 'Addis Agro Inputs SC',
    consigneeName: 'Addis Agro Inputs SC',
    serviceType: 'multimodal',
    inlandNode: 'Adama Inland Terminal',
    yardStage: 'In storage',
    unloadChip: 'Unload complete',
    emptyReturnChip: 'Ready for empty release',
    etaSummary: 'Stored at Adama since Mar 19',
    assignedYardAgent: 'Haileselassie Fikru',
    arrivalTimestamp: '2026-03-19T06:28:00Z',
    lastUpdated: '2026-03-19T12:18:00Z',
    arrivalControl: {
      eta: '2026-03-19T05:50:00Z',
      actualArrivalTime: '2026-03-19T06:28:00Z',
      gateInConfirmed: true,
      routeCompleted: true,
      arrivalNote: 'Vehicle entered via Adama gate lane 2.',
      yardContact: 'Adama yard control · +251 911 802 144',
      inspectionRequired: false,
      sealCheckAtArrival: true,
    },
    unloadStatus: {
      unloadStarted: true,
      unloadCompleted: true,
      unloadStartTime: '2026-03-19T08:10:00Z',
      unloadEndTime: '2026-03-19T10:45:00Z',
      unloadedBy: 'Warehouse crew C',
      cargoCountVerified: true,
      varianceNote: 'No variance against packing list.',
      unloadPhotosUploaded: true,
    },
    storageAssignment: {
      storageLocation: 'Warehouse 2 / Bay 03',
      storageStartTime: '2026-03-19T10:52:00Z',
      storageStatus: 'Assigned',
      expectedPickupTime: '2026-03-20T09:00:00Z',
      specialHandlingConditions: 'Keep fertilizer drums in ventilated zone.',
      goodsArea: 'Normal',
      consigneePickupReady: true,
    },
    podReadiness: {
      podRequired: true,
      consigneeContact: 'Tigist Benti · +251 911 880 440',
      receivingContact: 'Alemayehu Abebe',
      deliveryNoteStatus: 'Prepared',
      releaseNoteAvailable: true,
      handoffInstruction: 'Pickup after consignee truck plate is verified.',
      signatureRequired: true,
      photoProofRequired: true,
    },
    consigneeHandoff: {
      representative: 'Tigist Benti',
      handoffStatus: 'Scheduled',
      handoffTime: '',
      signedBy: '',
      photoProofUploaded: false,
      issueAtHandoff: false,
      finalCargoConditionNote: 'Cargo ready for consignee handoff.',
    },
    emptyReturn: {
      status: 'Ready for empty release',
      emptyReleaseGranted: false,
      emptyReleaseTimestamp: '',
      returnOwner: 'Adama return desk',
      designatedDepot: 'Djibouti Empty Yard 4',
      emptyPickupStatus: 'Release pending handoff completion',
      emptyDepartureTime: '',
      emptyReturned: false,
      returnTimestamp: '',
      returnReceiptAvailable: false,
      returnReceiptRef: '',
      detentionRiskOpen: true,
    },
    exceptions: [
      { id: 'yard-2-ex-1', severity: 'Medium', issueText: 'Consignee handoff delayed beyond planned pickup window.', actionLabel: 'Notify consignee' },
    ],
  },
  {
    id: 'yard-3',
    tripId: 'TRP-240317-03',
    bookingNumber: 'TAB-DJI-260317-11',
    blNumber: 'CMAU-DJI-774320',
    containerNumber: 'CMAU 310744-5',
    sealNumber: 'SEAL-KAL-33810',
    customerName: 'Kality Steel Industries',
    consigneeName: 'Kality Steel Industries',
    serviceType: 'unimodal',
    inlandNode: 'Kality Inland Yard',
    yardStage: 'Awaiting consignee handoff',
    unloadChip: 'Storage ready',
    emptyReturnChip: 'Pending release',
    etaSummary: 'Ready for consignee pickup today',
    assignedYardAgent: 'Betelhem Mengistu',
    arrivalTimestamp: '2026-03-18T15:15:00Z',
    lastUpdated: '2026-03-19T08:30:00Z',
    arrivalControl: {
      eta: '2026-03-18T14:50:00Z',
      actualArrivalTime: '2026-03-18T15:15:00Z',
      gateInConfirmed: true,
      routeCompleted: true,
      arrivalNote: 'Driver closed trip with clean seal confirmation.',
      yardContact: 'Kality release desk · +251 911 450 944',
      inspectionRequired: false,
      sealCheckAtArrival: true,
    },
    unloadStatus: {
      unloadStarted: true,
      unloadCompleted: true,
      unloadStartTime: '2026-03-18T16:10:00Z',
      unloadEndTime: '2026-03-18T18:24:00Z',
      unloadedBy: 'Kality night unload crew',
      cargoCountVerified: true,
      varianceNote: 'No shortages noted.',
      unloadPhotosUploaded: true,
    },
    storageAssignment: {
      storageLocation: 'Kality zone D / Rack 08',
      storageStartTime: '2026-03-18T18:30:00Z',
      storageStatus: 'Ready for pickup',
      expectedPickupTime: '2026-03-19T11:00:00Z',
      specialHandlingConditions: 'Lift steel coil bundles with spreader only.',
      goodsArea: 'Controlled',
      consigneePickupReady: true,
    },
    podReadiness: {
      podRequired: true,
      consigneeContact: 'Martha Tesfaye · +251 911 105 770',
      receivingContact: 'Yohannes Nega',
      deliveryNoteStatus: 'Ready',
      releaseNoteAvailable: true,
      handoffInstruction: 'Consignee ID and crane slot must be confirmed.',
      signatureRequired: true,
      photoProofRequired: true,
    },
    consigneeHandoff: {
      representative: 'Yohannes Nega',
      handoffStatus: 'Scheduled',
      handoffTime: '2026-03-19T12:00:00Z',
      signedBy: '',
      photoProofUploaded: false,
      issueAtHandoff: false,
      finalCargoConditionNote: 'Awaiting final consignee receipt.',
    },
    emptyReturn: {
      status: 'Not released',
      emptyReleaseGranted: false,
      emptyReleaseTimestamp: '',
      returnOwner: 'Kality yard control',
      designatedDepot: 'Modjo Empty Pool',
      emptyPickupStatus: 'Blocked until POD is captured',
      emptyDepartureTime: '',
      emptyReturned: false,
      returnTimestamp: '',
      returnReceiptAvailable: false,
      returnReceiptRef: '',
      detentionRiskOpen: true,
    },
    exceptions: [
      { id: 'yard-3-ex-1', severity: 'Low', issueText: 'POD not yet captured although handoff slot is booked.', actionLabel: 'Prepare POD' },
    ],
  },
  {
    id: 'yard-4',
    tripId: 'TRP-240316-09',
    bookingNumber: 'TAB-DJI-260316-02',
    blNumber: 'MAEU-DJI-441180',
    containerNumber: 'MAEU 204118-6',
    sealNumber: 'SEAL-ADD-90418',
    customerName: 'Habesha Retail Importers',
    consigneeName: 'Habesha Retail Importers',
    serviceType: 'multimodal',
    inlandNode: 'Addis Inland Delivery',
    yardStage: 'POD complete',
    unloadChip: 'Handoff complete',
    emptyReturnChip: 'Empty in return transit',
    etaSummary: 'POD captured, empty moving back to depot',
    assignedYardAgent: 'Ruth G/Medhin',
    arrivalTimestamp: '2026-03-18T07:42:00Z',
    lastUpdated: '2026-03-19T13:22:00Z',
    arrivalControl: {
      eta: '2026-03-18T07:10:00Z',
      actualArrivalTime: '2026-03-18T07:42:00Z',
      gateInConfirmed: true,
      routeCompleted: true,
      arrivalNote: 'Final delivery handled at customer compound in Addis.',
      yardContact: 'Addis handoff desk · +251 911 764 233',
      inspectionRequired: false,
      sealCheckAtArrival: true,
    },
    unloadStatus: {
      unloadStarted: true,
      unloadCompleted: true,
      unloadStartTime: '2026-03-18T09:10:00Z',
      unloadEndTime: '2026-03-18T11:18:00Z',
      unloadedBy: 'Customer receiving team',
      cargoCountVerified: true,
      varianceNote: 'Delivered clean.',
      unloadPhotosUploaded: true,
    },
    storageAssignment: {
      storageLocation: 'Direct delivery / customer compound',
      storageStartTime: '2026-03-18T11:25:00Z',
      storageStatus: 'Released',
      expectedPickupTime: '2026-03-18T11:25:00Z',
      specialHandlingConditions: 'Direct delivery, no yard hold.',
      goodsArea: 'Normal',
      consigneePickupReady: true,
    },
    podReadiness: {
      podRequired: true,
      consigneeContact: 'Fitsum Dereje · +251 911 715 401',
      receivingContact: 'Sofia Bekele',
      deliveryNoteStatus: 'Completed',
      releaseNoteAvailable: true,
      handoffInstruction: 'Signed POD and receiving photo required.',
      signatureRequired: true,
      photoProofRequired: true,
    },
    consigneeHandoff: {
      representative: 'Sofia Bekele',
      handoffStatus: 'Completed',
      handoffTime: '2026-03-18T11:36:00Z',
      signedBy: 'Sofia Bekele',
      photoProofUploaded: true,
      issueAtHandoff: false,
      finalCargoConditionNote: 'Cargo received without damage.',
    },
    emptyReturn: {
      status: 'Empty in return transit',
      emptyReleaseGranted: true,
      emptyReleaseTimestamp: '2026-03-18T13:10:00Z',
      returnOwner: 'Addis empty return coordinator',
      designatedDepot: 'Doraleh Empty Depot',
      emptyPickupStatus: 'Empty left Addis for return corridor',
      emptyDepartureTime: '2026-03-19T06:20:00Z',
      emptyReturned: false,
      returnTimestamp: '',
      returnReceiptAvailable: false,
      returnReceiptRef: '',
      detentionRiskOpen: true,
    },
    exceptions: [
      { id: 'yard-4-ex-1', severity: 'Medium', issueText: 'Return receipt still missing while empty is in transit.', actionLabel: 'Monitor return' },
    ],
  },
  {
    id: 'yard-5',
    tripId: 'TRP-240315-16',
    bookingNumber: 'TAB-DJI-260315-07',
    blNumber: 'COSU-DJI-998214',
    containerNumber: 'COSU 711294-4',
    sealNumber: 'SEAL-MDJ-22108',
    customerName: 'Abyssinia Pharma Import',
    consigneeName: 'Abyssinia Pharma Import',
    serviceType: 'multimodal',
    inlandNode: 'Modjo Dry Port',
    yardStage: 'Cycle closed',
    unloadChip: 'Closed',
    emptyReturnChip: 'Returned',
    etaSummary: 'Cycle closed on Mar 19',
    assignedYardAgent: 'Selamawit Dagne',
    arrivalTimestamp: '2026-03-17T05:45:00Z',
    lastUpdated: '2026-03-19T16:05:00Z',
    arrivalControl: {
      eta: '2026-03-17T05:20:00Z',
      actualArrivalTime: '2026-03-17T05:45:00Z',
      gateInConfirmed: true,
      routeCompleted: true,
      arrivalNote: 'Cold-chain goods shifted to controlled bay after unload.',
      yardContact: 'Modjo cold chain desk · +251 911 331 881',
      inspectionRequired: false,
      sealCheckAtArrival: true,
    },
    unloadStatus: {
      unloadStarted: true,
      unloadCompleted: true,
      unloadStartTime: '2026-03-17T07:10:00Z',
      unloadEndTime: '2026-03-17T09:55:00Z',
      unloadedBy: 'Cold-chain team A',
      cargoCountVerified: true,
      varianceNote: 'All pallet counts matched packing list.',
      unloadPhotosUploaded: true,
    },
    storageAssignment: {
      storageLocation: 'Controlled Warehouse / Bay 01',
      storageStartTime: '2026-03-17T10:02:00Z',
      storageStatus: 'Released',
      expectedPickupTime: '2026-03-18T08:00:00Z',
      specialHandlingConditions: 'Temperature log attached to POD.',
      goodsArea: 'Controlled',
      consigneePickupReady: true,
    },
    podReadiness: {
      podRequired: true,
      consigneeContact: 'Samson Biftu · +251 911 650 222',
      receivingContact: 'Aster Woldemariam',
      deliveryNoteStatus: 'Completed',
      releaseNoteAvailable: true,
      handoffInstruction: 'POD and temperature log must both be attached.',
      signatureRequired: true,
      photoProofRequired: true,
    },
    consigneeHandoff: {
      representative: 'Aster Woldemariam',
      handoffStatus: 'Completed',
      handoffTime: '2026-03-18T08:24:00Z',
      signedBy: 'Aster Woldemariam',
      photoProofUploaded: true,
      issueAtHandoff: false,
      finalCargoConditionNote: 'Received clean with temperature record.',
    },
    emptyReturn: {
      status: 'Cycle closed',
      emptyReleaseGranted: true,
      emptyReleaseTimestamp: '2026-03-18T10:10:00Z',
      returnOwner: 'Modjo empty return team',
      designatedDepot: 'Djibouti Container Depot 6',
      emptyPickupStatus: 'Returned and closed',
      emptyDepartureTime: '2026-03-18T11:25:00Z',
      emptyReturned: true,
      returnTimestamp: '2026-03-19T14:42:00Z',
      returnReceiptAvailable: true,
      returnReceiptRef: 'ERR-MDJ-0319-214',
      detentionRiskOpen: false,
    },
    exceptions: [],
  },
  {
    id: 'yard-6',
    tripId: 'TRP-240319-15',
    bookingNumber: 'TAB-DJI-260319-12',
    blNumber: 'EMCU-DJI-551009',
    containerNumber: 'EMCU 509940-2',
    sealNumber: 'SEAL-ADA-19904',
    customerName: 'Blue Nile Consumer Goods',
    consigneeName: 'Blue Nile Consumer Goods',
    serviceType: 'unimodal',
    inlandNode: 'Adama Inland Terminal',
    yardStage: 'Arriving inland',
    unloadChip: 'Arrival pending',
    emptyReturnChip: null,
    etaSummary: 'ETA Adama Mar 20 17:20',
    assignedYardAgent: 'Tsedey Hailu',
    arrivalTimestamp: '',
    lastUpdated: '2026-03-19T15:20:00Z',
    arrivalControl: {
      eta: '2026-03-20T17:20:00Z',
      actualArrivalTime: '',
      gateInConfirmed: false,
      routeCompleted: false,
      arrivalNote: 'Dispatch expects late-afternoon arrival from Galafi corridor.',
      yardContact: 'Adama gate supervisor · +251 911 214 009',
      inspectionRequired: false,
      sealCheckAtArrival: false,
    },
    unloadStatus: {
      unloadStarted: false,
      unloadCompleted: false,
      unloadStartTime: '',
      unloadEndTime: '',
      unloadedBy: 'Pending unload crew',
      cargoCountVerified: false,
      varianceNote: 'Awaiting arrival.',
      unloadPhotosUploaded: false,
    },
    storageAssignment: {
      storageLocation: 'Pending assignment',
      storageStartTime: '',
      storageStatus: 'Not assigned',
      expectedPickupTime: '2026-03-21T08:00:00Z',
      specialHandlingConditions: 'Handle palletized FMCG stock by aisle release.',
      goodsArea: 'Normal',
      consigneePickupReady: false,
    },
    podReadiness: {
      podRequired: true,
      consigneeContact: 'Naol Hailemariam · +251 911 998 400',
      receivingContact: 'Pending contact',
      deliveryNoteStatus: 'Awaiting arrival',
      releaseNoteAvailable: true,
      handoffInstruction: 'Confirm receiving bay before unload.',
      signatureRequired: true,
      photoProofRequired: false,
    },
    consigneeHandoff: {
      representative: 'Pending',
      handoffStatus: 'Pending',
      handoffTime: '',
      signedBy: '',
      photoProofUploaded: false,
      issueAtHandoff: false,
      finalCargoConditionNote: 'Awaiting arrival.',
    },
    emptyReturn: {
      status: 'Not released',
      emptyReleaseGranted: false,
      emptyReleaseTimestamp: '',
      returnOwner: 'Adama empty return desk',
      designatedDepot: 'Adama Empty Stack',
      emptyPickupStatus: 'Awaiting arrival and unload',
      emptyDepartureTime: '',
      emptyReturned: false,
      returnTimestamp: '',
      returnReceiptAvailable: false,
      returnReceiptRef: '',
      detentionRiskOpen: true,
    },
    exceptions: [
      { id: 'yard-6-ex-1', severity: 'Low', issueText: 'Receiving contact not yet confirmed for tomorrow arrival.', actionLabel: 'Confirm contact' },
    ],
  },
  {
    id: 'yard-7',
    tripId: 'TRP-240314-04',
    bookingNumber: 'TAB-DJI-260314-08',
    blNumber: 'ONEY-DJI-221600',
    containerNumber: 'ONEU 602310-9',
    sealNumber: 'SEAL-KAL-77210',
    customerName: 'Tana Home Appliances',
    consigneeName: 'Tana Home Appliances',
    serviceType: 'multimodal',
    inlandNode: 'Kality Inland Yard',
    yardStage: 'Empty return in progress',
    unloadChip: 'POD complete',
    emptyReturnChip: 'Overdue return',
    etaSummary: 'Return overdue by 18 hours',
    assignedYardAgent: 'Bamlak Zewdu',
    arrivalTimestamp: '2026-03-16T03:50:00Z',
    lastUpdated: '2026-03-19T11:14:00Z',
    arrivalControl: {
      eta: '2026-03-16T03:20:00Z',
      actualArrivalTime: '2026-03-16T03:50:00Z',
      gateInConfirmed: true,
      routeCompleted: true,
      arrivalNote: 'Offloaded to Kality yard during early shift.',
      yardContact: 'Kality yard control · +251 911 313 113',
      inspectionRequired: false,
      sealCheckAtArrival: true,
    },
    unloadStatus: {
      unloadStarted: true,
      unloadCompleted: true,
      unloadStartTime: '2026-03-16T05:00:00Z',
      unloadEndTime: '2026-03-16T07:42:00Z',
      unloadedBy: 'Morning unload team',
      cargoCountVerified: true,
      varianceNote: 'Two pallet scuffs acknowledged by consignee.',
      unloadPhotosUploaded: true,
    },
    storageAssignment: {
      storageLocation: 'Kality zone A / outbound empty lane',
      storageStartTime: '2026-03-16T07:55:00Z',
      storageStatus: 'Released',
      expectedPickupTime: '2026-03-17T09:20:00Z',
      specialHandlingConditions: 'Container requires floor sweep before return.',
      goodsArea: 'Normal',
      consigneePickupReady: true,
    },
    podReadiness: {
      podRequired: true,
      consigneeContact: 'Fikirte Addis · +251 911 712 004',
      receivingContact: 'Moges Gerba',
      deliveryNoteStatus: 'Completed',
      releaseNoteAvailable: true,
      handoffInstruction: 'Damage remarks acknowledged on POD.',
      signatureRequired: true,
      photoProofRequired: true,
    },
    consigneeHandoff: {
      representative: 'Moges Gerba',
      handoffStatus: 'Completed',
      handoffTime: '2026-03-16T08:14:00Z',
      signedBy: 'Moges Gerba',
      photoProofUploaded: true,
      issueAtHandoff: true,
      finalCargoConditionNote: 'Minor pallet scuff documented at handoff.',
    },
    emptyReturn: {
      status: 'Empty in return transit',
      emptyReleaseGranted: true,
      emptyReleaseTimestamp: '2026-03-17T06:18:00Z',
      returnOwner: 'Kality empty coordinator',
      designatedDepot: 'Doraleh Empty Depot',
      emptyPickupStatus: 'Driver delayed between Galafi and Djibouti',
      emptyDepartureTime: '2026-03-18T07:05:00Z',
      emptyReturned: false,
      returnTimestamp: '',
      returnReceiptAvailable: false,
      returnReceiptRef: '',
      detentionRiskOpen: true,
    },
    exceptions: [
      { id: 'yard-7-ex-1', severity: 'High', issueText: 'Empty return overdue beyond planned window.', actionLabel: 'Escalate return' },
      { id: 'yard-7-ex-2', severity: 'Medium', issueText: 'Return receipt missing while detention risk remains open.', actionLabel: 'Request receipt' },
    ],
  },
  {
    id: 'yard-8',
    tripId: 'TRP-240313-06',
    bookingNumber: 'TAB-DJI-260313-10',
    blNumber: 'HLCU-DJI-115420',
    containerNumber: 'HLCU 780144-8',
    sealNumber: 'SEAL-ADD-31850',
    customerName: 'Unity Textile Mills',
    consigneeName: 'Unity Textile Mills',
    serviceType: 'multimodal',
    inlandNode: 'Addis Inland Delivery',
    yardStage: 'Unloading in progress',
    unloadChip: 'Variance watch',
    emptyReturnChip: 'Pending',
    etaSummary: 'Unload active since 13:05',
    assignedYardAgent: 'Rahel Assefa',
    arrivalTimestamp: '2026-03-19T12:10:00Z',
    lastUpdated: '2026-03-19T14:08:00Z',
    arrivalControl: {
      eta: '2026-03-19T11:40:00Z',
      actualArrivalTime: '2026-03-19T12:10:00Z',
      gateInConfirmed: true,
      routeCompleted: true,
      arrivalNote: 'Direct delivery unload at factory dock 2.',
      yardContact: 'Factory receiving dock 2 · +251 911 711 224',
      inspectionRequired: true,
      sealCheckAtArrival: true,
    },
    unloadStatus: {
      unloadStarted: true,
      unloadCompleted: false,
      unloadStartTime: '2026-03-19T13:05:00Z',
      unloadEndTime: '',
      unloadedBy: 'Unity textile receiving team',
      cargoCountVerified: false,
      varianceNote: 'Carton count on line 02 still under reconciliation.',
      unloadPhotosUploaded: true,
    },
    storageAssignment: {
      storageLocation: 'Direct delivery dock 2',
      storageStartTime: '2026-03-19T13:05:00Z',
      storageStatus: 'Assigned',
      expectedPickupTime: '2026-03-19T18:30:00Z',
      specialHandlingConditions: 'Keep cartons under canopy during unload.',
      goodsArea: 'Normal',
      consigneePickupReady: false,
    },
    podReadiness: {
      podRequired: true,
      consigneeContact: 'Saron Yilma · +251 911 511 600',
      receivingContact: 'Bekele Fenta',
      deliveryNoteStatus: 'In preparation',
      releaseNoteAvailable: true,
      handoffInstruction: 'POD only after variance note is signed.',
      signatureRequired: true,
      photoProofRequired: true,
    },
    consigneeHandoff: {
      representative: 'Bekele Fenta',
      handoffStatus: 'Pending',
      handoffTime: '',
      signedBy: '',
      photoProofUploaded: false,
      issueAtHandoff: false,
      finalCargoConditionNote: 'Unload still running.',
    },
    emptyReturn: {
      status: 'Not released',
      emptyReleaseGranted: false,
      emptyReleaseTimestamp: '',
      returnOwner: 'Addis empty return desk',
      designatedDepot: 'Modjo Empty Pool',
      emptyPickupStatus: 'Blocked until unload variance is resolved',
      emptyDepartureTime: '',
      emptyReturned: false,
      returnTimestamp: '',
      returnReceiptAvailable: false,
      returnReceiptRef: '',
      detentionRiskOpen: true,
    },
    exceptions: [
      { id: 'yard-8-ex-1', severity: 'Medium', issueText: 'Unload variance against packing list still unresolved.', actionLabel: 'Record variance' },
      { id: 'yard-8-ex-2', severity: 'Low', issueText: 'POD preparation is waiting on final carton reconciliation.', actionLabel: 'Prepare POD' },
    ],
  },
];

export const dryPortYardRecords: YardRecord[] = seededDryPortYardRecords.map((record): YardRecord => {
  const inlandNode = normalizeYardDestination(record.inlandNode);

  return {
    ...record,
    inlandNode,
    etaSummary: replaceYardLocationText(record.etaSummary, inlandNode),
    arrivalControl: {
      ...record.arrivalControl,
      arrivalNote: replaceYardLocationText(record.arrivalControl.arrivalNote, inlandNode),
      yardContact: replaceYardLocationText(record.arrivalControl.yardContact, inlandNode),
    },
    unloadStatus: {
      ...record.unloadStatus,
      unloadedBy: replaceYardLocationText(record.unloadStatus.unloadedBy, inlandNode),
      varianceNote: replaceYardLocationText(record.unloadStatus.varianceNote, inlandNode),
    },
    storageAssignment: {
      ...record.storageAssignment,
      storageLocation: replaceYardLocationText(record.storageAssignment.storageLocation, inlandNode),
    },
    podReadiness: {
      ...record.podReadiness,
      handoffInstruction: replaceYardLocationText(record.podReadiness.handoffInstruction, inlandNode),
    },
    consigneeHandoff: {
      ...record.consigneeHandoff,
      finalCargoConditionNote: replaceYardLocationText(record.consigneeHandoff.finalCargoConditionNote, inlandNode),
    },
    emptyReturn: {
      ...record.emptyReturn,
      returnOwner: replaceYardLocationText(record.emptyReturn.returnOwner, inlandNode),
      designatedDepot: replaceYardLocationText(record.emptyReturn.designatedDepot, inlandNode),
      emptyPickupStatus: replaceYardLocationText(record.emptyReturn.emptyPickupStatus, inlandNode),
    },
    exceptions: record.exceptions.map((exception) => ({
      ...exception,
      issueText: replaceYardLocationText(exception.issueText, inlandNode),
    })),
  };
});
