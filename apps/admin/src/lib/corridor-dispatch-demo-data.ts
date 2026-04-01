export type DispatchTripStatus =
  | 'Awaiting truck assignment'
  | 'Awaiting driver assignment'
  | 'Assigned'
  | 'Ready to depart'
  | 'In transit'
  | 'Checkpoint hold'
  | 'Delayed'
  | 'Arrived inland'
  | 'Awaiting unload handoff'
  | 'Awaiting empty return assignment'
  | 'Awaiting empty return departure'
  | 'Empty return in transit'
  | 'Empty returned';

export type DispatchTripRecord = {
  id: string;
  tripId: string;
  bookingNumber: string;
  blNumber: string;
  containerNumber: string;
  sealNumber: string;
  customerName: string;
  serviceType: 'multimodal' | 'unimodal';
  corridorRoute: string;
  originHandoffPoint: string;
  inlandDestination: string;
  currentTripStatus: DispatchTripStatus;
  assignedDispatchOwner: string;
  assignedTruck: string;
  assignedTrailer: string;
  assignedDriver: string;
  driverType: 'Internal' | 'External';
  partnerName: string;
  plannedDepartureTime: string;
  cargoLoadedAt?: string;
  departedDjiboutiAt?: string;
  expectedArrivalTime: string;
  routeType: string;
  dispatchNote: string;
  handoffSource: string;
  etaSummary: string;
  driverStatus: string;
  issueChip: string | null;
  delayRisk: 'Low' | 'Medium' | 'High';
  lastGpsTimestamp: string;
  lastUpdated: string;
  emptyReturnConfirmedAt?: string;
  transitPack: {
    packetComplete: boolean;
    mobileSyncStatus: string;
    driverAcknowledgement: string;
    lastPacketUpdate: string;
    qrGenerated: boolean;
    packetItems: Array<{ label: string; complete: boolean }>;
  };
  liveMovement: {
    currentLocation: string;
    corridorName: string;
    distanceToDestinationKm: number;
    eta: string;
    speedSummary: string;
    movementHealth: 'On schedule' | 'Minor delay' | 'Checkpoint hold' | 'Route diversion' | 'No update risk';
  };
  checkpoints: Array<{
    id: string;
    label: string;
    timestamp: string;
    location: string;
    status: string;
    driverNote: string;
    sealConfirmed: boolean;
    officerNote: string;
  }>;
  issues: Array<{
    id: string;
    severity: 'Low' | 'Medium' | 'High';
    title: string;
    explanation: string;
    actionLabel: string;
  }>;
  arrivalReadiness: {
    destinationNode: string;
    unloadHandoffOwner: string;
    yardContact: string;
    specialHandlingInstructions: string;
    podExpectation: string;
    emptyReturnInstructionAvailable: boolean;
    arrivalNoticeSent: boolean;
    unloadContactConfirmed: boolean;
  };
};

function normalizeDispatchDestination(value: string) {
  if (value.includes('Kality')) {
    return 'Combolcha Dry Port';
  }
  if (value.includes('Addis') || value.includes('Adama') || value.includes('Modjo')) {
    return 'Adama Dry Port';
  }
  return value;
}

function normalizeDispatchRoute(destination: string) {
  if (destination.includes('Combolcha')) {
    return 'Djibouti Port -> Galafi -> Combolcha Dry Port';
  }
  return 'Djibouti Port -> Galafi -> Adama Dry Port';
}

function replaceDispatchLocationText(value: string, destination: string) {
  const normalizedRoute = normalizeDispatchRoute(destination);
  const normalizedNode = normalizeDispatchDestination(destination);
  const normalizedShort = normalizedNode.includes('Combolcha') ? 'Combolcha' : 'Adama';

  return value
    .replace(/Djibouti Port -> Galafi -> Modjo Dry Port/g, normalizedRoute)
    .replace(/Djibouti Port -> Galafi -> Modjo/g, normalizedRoute)
    .replace(/Djibouti Port -> Galafi -> Kality/g, normalizedRoute)
    .replace(/Djibouti Port -> Addis/g, normalizedRoute)
    .replace(/Djibouti Port -> Galafi -> Addis/g, normalizedRoute)
    .replace(/Djibouti Port -> Galafi -> Adama/g, normalizedRoute)
    .replace(/Djibouti -> Galafi -> Modjo/g, normalizedRoute.replace(' Port', '').replace(' Dry Port', ''))
    .replace(/Djibouti -> Galafi -> Kality/g, normalizedRoute.replace(' Port', '').replace(' Dry Port', ''))
    .replace(/Djibouti -> Galafi -> Addis/g, normalizedRoute.replace(' Port', '').replace(' Dry Port', ''))
    .replace(/Djibouti -> Addis/g, normalizedRoute.replace(' Port', '').replace(' Dry Port', ''))
    .replace(/Modjo Dry Port/g, normalizedNode)
    .replace(/Kality ICD/g, normalizedNode)
    .replace(/Addis Ababa Warehouse/g, normalizedNode)
    .replace(/Adama Logistics Park/g, normalizedNode)
    .replace(/Adama Solar Yard/g, normalizedNode)
    .replace(/ETA Modjo/g, `ETA ${normalizedShort}`)
    .replace(/ETA Kality/g, `ETA ${normalizedShort}`)
    .replace(/Arrived Adama/g, `Arrived ${normalizedShort}`)
    .replace(/Kality arrival/g, `${normalizedShort} arrival`)
    .replace(/Modjo arrival/g, `${normalizedShort} arrival`)
    .replace(/Kality gate office/g, `${normalizedShort} gate office`)
    .replace(/Kality desk/g, `${normalizedShort} desk`)
    .replace(/Modjo gate office/g, `${normalizedShort} gate office`)
    .replace(/Addis corridor arrival desk/g, `${normalizedShort} corridor arrival desk`)
    .replace(/Addis Pharma receiving/g, `${normalizedShort} customer receiving`)
    .replace(/Adama yard lead/g, `${normalizedShort} yard lead`)
    .replace(/Adama yard desk/g, `${normalizedShort} yard desk`)
    .replace(/Adama Solar Yard gate/g, `${normalizedShort} Dry Port gate`);
}

const seededCorridorDispatchTrips: DispatchTripRecord[] = [
  {
    id: 'dispatch-1',
    tripId: 'TRP-240319-11',
    bookingNumber: 'TAB-DJI-260319-01',
    blNumber: 'MSKU-DJI-884211',
    containerNumber: 'MSCU 458912-7',
    sealNumber: 'SEAL-ET-44821',
    customerName: 'East Gate Manufacturing PLC',
    serviceType: 'multimodal',
    corridorRoute: 'Djibouti Port -> Galafi -> Modjo',
    originHandoffPoint: 'Djibouti Port Gate 3',
    inlandDestination: 'Modjo Dry Port',
    currentTripStatus: 'In transit',
    assignedDispatchOwner: 'Samrawit Bekele',
    assignedTruck: 'ET-TRK-46291',
    assignedTrailer: 'TRL-9021',
    assignedDriver: 'Abel Hailu',
    driverType: 'Internal',
    partnerName: 'Tikur Abay Fleet',
    plannedDepartureTime: '2026-03-19T05:40:00Z',
    cargoLoadedAt: '2026-03-19T05:10:00Z',
    departedDjiboutiAt: '2026-03-19T05:40:00Z',
    expectedArrivalTime: '2026-03-20T08:15:00Z',
    routeType: 'Djibouti to Modjo corridor',
    dispatchNote: 'Carry customs packet and checkpoint inspection note for line 01.',
    handoffSource: 'Multimodal / Djibouti Release Desk / Clearance ready',
    etaSummary: 'ETA Modjo Mar 20 08:15',
    driverStatus: 'Driver acknowledged and moving',
    issueChip: 'Minor delay',
    delayRisk: 'Medium',
    lastGpsTimestamp: '2026-03-19T18:10:00Z',
    lastUpdated: '2026-03-19T18:12:00Z',
    transitPack: {
      packetComplete: true,
      mobileSyncStatus: 'Synced 2 minutes ago',
      driverAcknowledgement: 'Acknowledged by Abel Hailu',
      lastPacketUpdate: '2026-03-19T17:54:00Z',
      qrGenerated: true,
      packetItems: [
        { label: 'BL', complete: true },
        { label: 'Packing list', complete: true },
        { label: 'Invoice summary', complete: true },
        { label: 'Transit/customs document', complete: true },
        { label: 'Release note', complete: true },
        { label: 'Container number', complete: true },
        { label: 'Seal number', complete: true },
        { label: 'Consignee/contact', complete: true },
        { label: 'Route note', complete: true },
        { label: 'Special handling note', complete: true },
        { label: 'Item summary', complete: true },
      ],
    },
    liveMovement: {
      currentLocation: 'Galafi checkpoint',
      corridorName: 'Djibouti -> Galafi -> Modjo',
      distanceToDestinationKm: 312,
      eta: '2026-03-20T08:15:00Z',
      speedSummary: 'Average 54 km/h since departure',
      movementHealth: 'Minor delay',
    },
    checkpoints: [
      {
        id: 'c1',
        label: 'Gate-out from Djibouti',
        timestamp: '2026-03-19T05:40:00Z',
        location: 'Djibouti Port Gate 3',
        status: 'Passed',
        driverNote: 'Transit packet checked before departure.',
        sealConfirmed: true,
        officerNote: 'Release packet verified.',
      },
      {
        id: 'c2',
        label: 'Galafi checkpoint',
        timestamp: '2026-03-19T17:40:00Z',
        location: 'Galafi',
        status: 'Inspection',
        driverNote: 'Queued for customs note cross-check.',
        sealConfirmed: true,
        officerNote: 'Line 01 inspection remark reviewed.',
      },
      {
        id: 'c3',
        label: 'Modjo arrival',
        timestamp: '2026-03-20T08:15:00Z',
        location: 'Modjo Dry Port',
        status: 'Pending',
        driverNote: 'Arrival handoff pending.',
        sealConfirmed: true,
        officerNote: '',
      },
    ],
    issues: [
      {
        id: 'i1',
        severity: 'Medium',
        title: 'ETA slipping by 2 hours',
        explanation: 'Galafi queue extended checkpoint dwell time.',
        actionLabel: 'Notify customer',
      },
    ],
    arrivalReadiness: {
      destinationNode: 'Modjo Dry Port',
      unloadHandoffOwner: 'Meron Tadesse',
      yardContact: 'Modjo gate office · +251 911 440 210',
      specialHandlingInstructions: 'Keep inspection note attached to unload file.',
      podExpectation: 'Digital POD expected within 30 minutes of unload.',
      emptyReturnInstructionAvailable: true,
      arrivalNoticeSent: true,
      unloadContactConfirmed: true,
    },
  },
  {
    id: 'dispatch-2',
    tripId: 'TRP-240319-12',
    bookingNumber: 'TAB-DJI-260319-05',
    blNumber: 'HPL-DJI-667218',
    containerNumber: 'GESU 551720-1',
    sealNumber: 'GZH-ET-5541',
    customerName: 'Ethio Build Materials',
    serviceType: 'multimodal',
    corridorRoute: 'Djibouti Port -> Galafi -> Addis',
    originHandoffPoint: 'Djibouti Port Terminal 2',
    inlandDestination: 'Addis Ababa',
    currentTripStatus: 'Awaiting truck assignment',
    assignedDispatchOwner: 'Samuel Isayas',
    assignedTruck: 'Not assigned',
    assignedTrailer: 'Not assigned',
    assignedDriver: 'Not assigned',
    driverType: 'External',
    partnerName: 'Afar Corridor Carriers',
    plannedDepartureTime: '2026-03-20T05:30:00Z',
    cargoLoadedAt: '',
    departedDjiboutiAt: '',
    expectedArrivalTime: '2026-03-21T09:10:00Z',
    routeType: 'Djibouti to Addis corridor',
    dispatchNote: 'High storage-risk file. Prioritize same-day assignment.',
    handoffSource: 'Transitor / Clearance Desk / Ready for dispatch',
    etaSummary: 'Needs truck before 05:30 departure slot',
    driverStatus: 'Awaiting assignment',
    issueChip: 'Truck gap',
    delayRisk: 'High',
    lastGpsTimestamp: 'Not started',
    lastUpdated: '2026-03-19T17:40:00Z',
    transitPack: {
      packetComplete: false,
      mobileSyncStatus: 'Not synced',
      driverAcknowledgement: 'No driver linked',
      lastPacketUpdate: '2026-03-19T16:52:00Z',
      qrGenerated: false,
      packetItems: [
        { label: 'BL', complete: true },
        { label: 'Packing list', complete: true },
        { label: 'Invoice summary', complete: true },
        { label: 'Transit/customs document', complete: true },
        { label: 'Release note', complete: false },
        { label: 'Container number', complete: true },
        { label: 'Seal number', complete: true },
        { label: 'Consignee/contact', complete: true },
        { label: 'Route note', complete: true },
        { label: 'Special handling note', complete: true },
        { label: 'Item summary', complete: true },
      ],
    },
    liveMovement: {
      currentLocation: 'Djibouti dispatch yard',
      corridorName: 'Djibouti -> Galafi -> Addis',
      distanceToDestinationKm: 0,
      eta: '2026-03-21T09:10:00Z',
      speedSummary: 'No movement yet',
      movementHealth: 'No update risk',
    },
    checkpoints: [
      {
        id: 'c1',
        label: 'Gate-out from Djibouti',
        timestamp: '',
        location: 'Djibouti dispatch yard',
        status: 'Pending',
        driverNote: '',
        sealConfirmed: false,
        officerNote: '',
      },
    ],
    issues: [
      {
        id: 'i2',
        severity: 'High',
        title: 'No truck assigned',
        explanation: 'Release file is ready but assignment is still open with 12 hours to departure slot.',
        actionLabel: 'Assign support',
      },
    ],
    arrivalReadiness: {
      destinationNode: 'Addis Ababa',
      unloadHandoffOwner: 'Addis yard liaison',
      yardContact: 'Addis corridor arrival desk · +251 911 221 118',
      specialHandlingInstructions: 'Unload by stack plan C4 on arrival.',
      podExpectation: 'POD after consignee handoff on same day.',
      emptyReturnInstructionAvailable: true,
      arrivalNoticeSent: false,
      unloadContactConfirmed: false,
    },
  },
  {
    id: 'dispatch-3',
    tripId: 'TRP-240319-13',
    bookingNumber: 'TAB-DJI-260319-08',
    blNumber: 'MSK-DJI-772601',
    containerNumber: 'GLDU 781224-6',
    sealNumber: 'TJN-ET-2217',
    customerName: 'Afar Mining Inputs',
    serviceType: 'multimodal',
    corridorRoute: 'Djibouti Port -> Galafi -> Kality',
    originHandoffPoint: 'Djibouti Port Terminal 2',
    inlandDestination: 'Kality ICD',
    currentTripStatus: 'Ready to depart',
    assignedDispatchOwner: 'Samrawit Bekele',
    assignedTruck: 'ET-TRK-44218',
    assignedTrailer: 'TRL-7784',
    assignedDriver: 'Mohammed Omar',
    driverType: 'External',
    partnerName: 'Afar Corridor Carriers',
    plannedDepartureTime: '2026-03-19T20:00:00Z',
    cargoLoadedAt: '2026-03-19T19:20:00Z',
    departedDjiboutiAt: '',
    expectedArrivalTime: '2026-03-20T18:10:00Z',
    routeType: 'Djibouti to Kality corridor',
    dispatchNote: 'Driver should acknowledge transit packet before departure.',
    handoffSource: 'Transitor / Clearance Desk / Dispatch push received',
    etaSummary: 'Departure tonight · ETA Kality tomorrow 18:10',
    driverStatus: 'Awaiting pack acknowledgement',
    issueChip: 'Ack pending',
    delayRisk: 'Low',
    lastGpsTimestamp: 'Not started',
    lastUpdated: '2026-03-19T18:00:00Z',
    transitPack: {
      packetComplete: true,
      mobileSyncStatus: 'Pending driver open',
      driverAcknowledgement: 'Pending acknowledgement',
      lastPacketUpdate: '2026-03-19T17:59:00Z',
      qrGenerated: true,
      packetItems: [
        { label: 'BL', complete: true },
        { label: 'Packing list', complete: true },
        { label: 'Invoice summary', complete: true },
        { label: 'Transit/customs document', complete: true },
        { label: 'Release note', complete: true },
        { label: 'Container number', complete: true },
        { label: 'Seal number', complete: true },
        { label: 'Consignee/contact', complete: true },
        { label: 'Route note', complete: true },
        { label: 'Special handling note', complete: true },
        { label: 'Item summary', complete: true },
      ],
    },
    liveMovement: {
      currentLocation: 'Djibouti staging lane',
      corridorName: 'Djibouti -> Galafi -> Kality',
      distanceToDestinationKm: 0,
      eta: '2026-03-20T18:10:00Z',
      speedSummary: 'Departure not yet confirmed',
      movementHealth: 'On schedule',
    },
    checkpoints: [
      {
        id: 'c1',
        label: 'Gate-out from Djibouti',
        timestamp: '',
        location: 'Djibouti staging lane',
        status: 'Pending',
        driverNote: '',
        sealConfirmed: false,
        officerNote: '',
      },
    ],
    issues: [],
    arrivalReadiness: {
      destinationNode: 'Kality ICD',
      unloadHandoffOwner: 'Kality arrival office',
      yardContact: 'Kality desk · +251 911 660 014',
      specialHandlingInstructions: 'Customer requires arrival SMS before gate entry.',
      podExpectation: 'POD within 1 hour of unload.',
      emptyReturnInstructionAvailable: true,
      arrivalNoticeSent: true,
      unloadContactConfirmed: true,
    },
  },
  {
    id: 'dispatch-4',
    tripId: 'TRP-240319-14',
    bookingNumber: 'TAB-DJI-260319-03',
    blNumber: 'CMA-DJI-440671',
    containerNumber: 'TEMU 741208-4',
    sealNumber: 'SEA-QDG-9871',
    customerName: 'Addis Pharma PLC',
    serviceType: 'unimodal',
    corridorRoute: 'Djibouti Port -> Addis',
    originHandoffPoint: 'SGTD Terminal',
    inlandDestination: 'Addis Ababa Warehouse',
    currentTripStatus: 'Assigned',
    assignedDispatchOwner: 'Samuel Isayas',
    assignedTruck: 'ET-TRK-33092',
    assignedTrailer: 'TRL-4410',
    assignedDriver: 'Getachew Kebede',
    driverType: 'Internal',
    partnerName: 'Tikur Abay Fleet',
    plannedDepartureTime: '2026-03-20T06:15:00Z',
    cargoLoadedAt: '',
    departedDjiboutiAt: '',
    expectedArrivalTime: '2026-03-20T22:00:00Z',
    routeType: 'Direct Djibouti to Addis',
    dispatchNote: 'Consignee pickup instructions attached in transit packet.',
    handoffSource: 'Customer release file',
    etaSummary: 'Assigned and waiting departure confirmation',
    driverStatus: 'Driver onboarded',
    issueChip: null,
    delayRisk: 'Low',
    lastGpsTimestamp: 'Not started',
    lastUpdated: '2026-03-19T15:20:00Z',
    transitPack: {
      packetComplete: true,
      mobileSyncStatus: 'Synced',
      driverAcknowledgement: 'Acknowledged by Getachew Kebede',
      lastPacketUpdate: '2026-03-19T15:10:00Z',
      qrGenerated: true,
      packetItems: [
        { label: 'BL', complete: true },
        { label: 'Packing list', complete: true },
        { label: 'Invoice summary', complete: true },
        { label: 'Transit/customs document', complete: true },
        { label: 'Release note', complete: true },
        { label: 'Container number', complete: true },
        { label: 'Seal number', complete: true },
        { label: 'Consignee/contact', complete: true },
        { label: 'Route note', complete: true },
        { label: 'Special handling note', complete: true },
        { label: 'Item summary', complete: true },
      ],
    },
    liveMovement: {
      currentLocation: 'Dispatch lane B',
      corridorName: 'Djibouti -> Addis',
      distanceToDestinationKm: 0,
      eta: '2026-03-20T22:00:00Z',
      speedSummary: 'Departure not yet started',
      movementHealth: 'On schedule',
    },
    checkpoints: [
      {
        id: 'c1',
        label: 'Gate-out from Djibouti',
        timestamp: '',
        location: 'Dispatch lane B',
        status: 'Pending',
        driverNote: '',
        sealConfirmed: false,
        officerNote: '',
      },
    ],
    issues: [],
    arrivalReadiness: {
      destinationNode: 'Addis Ababa Warehouse',
      unloadHandoffOwner: 'Customer warehouse dock',
      yardContact: 'Addis Pharma receiving · +251 911 721 009',
      specialHandlingInstructions: 'Pharma packaging file must stay with consignee rep.',
      podExpectation: 'Signed POD at warehouse dock.',
      emptyReturnInstructionAvailable: false,
      arrivalNoticeSent: true,
      unloadContactConfirmed: true,
    },
  },
  {
    id: 'dispatch-5',
    tripId: 'TRP-240319-15',
    bookingNumber: 'TAB-DJI-260319-04',
    blNumber: 'ONE-DJI-320118',
    containerNumber: 'GLDU 219845-0',
    sealNumber: 'ONE-4471',
    customerName: 'Blue Nile Cables',
    serviceType: 'multimodal',
    corridorRoute: 'Djibouti Port -> Galafi -> Adama',
    originHandoffPoint: 'Doraleh Container Terminal',
    inlandDestination: 'Adama Logistics Park',
    currentTripStatus: 'Awaiting driver assignment',
    assignedDispatchOwner: 'Samrawit Bekele',
    assignedTruck: 'ET-TRK-22714',
    assignedTrailer: 'TRL-5514',
    assignedDriver: 'Pending driver',
    driverType: 'External',
    partnerName: 'Red Sea Haulage',
    plannedDepartureTime: '2026-03-20T09:00:00Z',
    expectedArrivalTime: '2026-03-21T05:30:00Z',
    routeType: 'Djibouti to Adama corridor',
    dispatchNote: 'Driver assignment blocked until partner confirms crew.',
    handoffSource: 'Djibouti release file pending final assignment',
    etaSummary: 'Truck assigned, driver still missing',
    driverStatus: 'Awaiting driver confirmation',
    issueChip: 'Driver gap',
    delayRisk: 'Medium',
    lastGpsTimestamp: 'Not started',
    lastUpdated: '2026-03-19T16:08:00Z',
    transitPack: {
      packetComplete: true,
      mobileSyncStatus: 'Waiting driver session',
      driverAcknowledgement: 'No driver session',
      lastPacketUpdate: '2026-03-19T15:45:00Z',
      qrGenerated: true,
      packetItems: [
        { label: 'BL', complete: true },
        { label: 'Packing list', complete: true },
        { label: 'Invoice summary', complete: true },
        { label: 'Transit/customs document', complete: true },
        { label: 'Release note', complete: true },
        { label: 'Container number', complete: true },
        { label: 'Seal number', complete: true },
        { label: 'Consignee/contact', complete: true },
        { label: 'Route note', complete: true },
        { label: 'Special handling note', complete: true },
        { label: 'Item summary', complete: true },
      ],
    },
    liveMovement: {
      currentLocation: 'Assignment pool',
      corridorName: 'Djibouti -> Adama',
      distanceToDestinationKm: 0,
      eta: '2026-03-21T05:30:00Z',
      speedSummary: 'Awaiting driver before departure',
      movementHealth: 'No update risk',
    },
    checkpoints: [
      { id: 'c1', label: 'Gate-out from Djibouti', timestamp: '', location: 'Assignment pool', status: 'Pending', driverNote: '', sealConfirmed: false, officerNote: '' },
    ],
    issues: [
      { id: 'i5', severity: 'Medium', title: 'Awaiting driver assignment', explanation: 'External partner has not confirmed the assigned driver identity.', actionLabel: 'Notify partner' },
    ],
    arrivalReadiness: {
      destinationNode: 'Adama Logistics Park',
      unloadHandoffOwner: 'Adama logistics gate',
      yardContact: 'Adama desk · +251 911 330 214',
      specialHandlingInstructions: 'Send arrival ETA update once departed.',
      podExpectation: 'Gate POD before yard unload.',
      emptyReturnInstructionAvailable: true,
      arrivalNoticeSent: false,
      unloadContactConfirmed: false,
    },
  },
  {
    id: 'dispatch-6',
    tripId: 'TRP-240319-16',
    bookingNumber: 'TAB-DJI-260319-02',
    blNumber: 'OOLU-DJI-551208',
    containerNumber: 'OOLU 621500-2',
    sealNumber: 'OOL-ET-22019',
    customerName: 'Abay Agro Processing',
    serviceType: 'multimodal',
    corridorRoute: 'Djibouti Port -> Galafi -> Kality',
    originHandoffPoint: 'Doraleh Container Terminal',
    inlandDestination: 'Kality ICD',
    currentTripStatus: 'Checkpoint hold',
    assignedDispatchOwner: 'Samuel Isayas',
    assignedTruck: 'ET-TRK-11028',
    assignedTrailer: 'TRL-2231',
    assignedDriver: 'Hassen Nur',
    driverType: 'External',
    partnerName: 'Afar Corridor Carriers',
    plannedDepartureTime: '2026-03-19T03:20:00Z',
    expectedArrivalTime: '2026-03-20T01:15:00Z',
    routeType: 'Djibouti to Kality corridor',
    dispatchNote: 'Checkpoint hold due to customs note cross-check.',
    handoffSource: 'Transitor / Clearance Desk / urgent release',
    etaSummary: 'Hold at Galafi · ETA under review',
    driverStatus: 'Driver checked in from checkpoint',
    issueChip: 'Checkpoint hold',
    delayRisk: 'High',
    lastGpsTimestamp: '2026-03-19T17:22:00Z',
    lastUpdated: '2026-03-19T17:24:00Z',
    transitPack: {
      packetComplete: true,
      mobileSyncStatus: 'Synced',
      driverAcknowledgement: 'Acknowledged by Hassen Nur',
      lastPacketUpdate: '2026-03-19T02:54:00Z',
      qrGenerated: true,
      packetItems: [
        { label: 'BL', complete: true },
        { label: 'Packing list', complete: true },
        { label: 'Invoice summary', complete: true },
        { label: 'Transit/customs document', complete: true },
        { label: 'Release note', complete: true },
        { label: 'Container number', complete: true },
        { label: 'Seal number', complete: true },
        { label: 'Consignee/contact', complete: true },
        { label: 'Route note', complete: true },
        { label: 'Special handling note', complete: true },
        { label: 'Item summary', complete: true },
      ],
    },
    liveMovement: {
      currentLocation: 'Galafi checkpoint',
      corridorName: 'Djibouti -> Galafi -> Kality',
      distanceToDestinationKm: 402,
      eta: '2026-03-20T05:40:00Z',
      speedSummary: 'Stopped for 2h 10m at checkpoint',
      movementHealth: 'Checkpoint hold',
    },
    checkpoints: [
      { id: 'c1', label: 'Gate-out from Djibouti', timestamp: '2026-03-19T03:20:00Z', location: 'Doraleh Terminal', status: 'Passed', driverNote: 'Departed with full transit pack.', sealConfirmed: true, officerNote: 'Gate-out cleared.' },
      { id: 'c2', label: 'Galafi checkpoint', timestamp: '2026-03-19T17:10:00Z', location: 'Galafi', status: 'Hold', driverNote: 'Officer requested customs note verification.', sealConfirmed: true, officerNote: 'Waiting customs supervisor callback.' },
    ],
    issues: [
      { id: 'i6', severity: 'High', title: 'Customs hold at checkpoint', explanation: 'Galafi officers paused trip pending document validation.', actionLabel: 'Escalate' },
      { id: 'i7', severity: 'Medium', title: 'ETA slipping by 6 hours', explanation: 'Hold will affect Kality arrival slot.', actionLabel: 'Notify customer' },
    ],
    arrivalReadiness: {
      destinationNode: 'Kality ICD',
      unloadHandoffOwner: 'Kality gate office',
      yardContact: 'Kality dispatch desk · +251 911 443 910',
      specialHandlingInstructions: 'Arrival slot must be reconfirmed if delay exceeds 4 hours.',
      podExpectation: 'POD after consignee release.',
      emptyReturnInstructionAvailable: true,
      arrivalNoticeSent: false,
      unloadContactConfirmed: false,
    },
  },
  {
    id: 'dispatch-7',
    tripId: 'TRP-240319-17',
    bookingNumber: 'TAB-DJI-260319-06',
    blNumber: 'EMC-DJI-411902',
    containerNumber: 'TRHU 338120-9',
    sealNumber: 'XMN-SEA-2014',
    customerName: 'Horizon Water Systems',
    serviceType: 'unimodal',
    corridorRoute: 'Djibouti pickup -> Addis',
    originHandoffPoint: 'SGTD Terminal',
    inlandDestination: 'Addis customer warehouse',
    currentTripStatus: 'Delayed',
    assignedDispatchOwner: 'Samrawit Bekele',
    assignedTruck: 'ET-TRK-77140',
    assignedTrailer: 'TRL-6712',
    assignedDriver: 'Amanuel Desta',
    driverType: 'Internal',
    partnerName: 'Tikur Abay Fleet',
    plannedDepartureTime: '2026-03-19T06:00:00Z',
    expectedArrivalTime: '2026-03-20T01:00:00Z',
    routeType: 'Direct customer corridor',
    dispatchNote: 'Fuel issue reported after Ali Sabieh.',
    handoffSource: 'Customer pickup release file',
    etaSummary: 'Minor roadside stop · ETA slipping',
    driverStatus: 'Driver reported fuel issue',
    issueChip: 'Fuel issue',
    delayRisk: 'Medium',
    lastGpsTimestamp: '2026-03-19T16:44:00Z',
    lastUpdated: '2026-03-19T16:46:00Z',
    transitPack: {
      packetComplete: true,
      mobileSyncStatus: 'Synced',
      driverAcknowledgement: 'Acknowledged by Amanuel Desta',
      lastPacketUpdate: '2026-03-19T05:10:00Z',
      qrGenerated: true,
      packetItems: [
        { label: 'BL', complete: true },
        { label: 'Packing list', complete: true },
        { label: 'Invoice summary', complete: true },
        { label: 'Transit/customs document', complete: true },
        { label: 'Release note', complete: true },
        { label: 'Container number', complete: true },
        { label: 'Seal number', complete: true },
        { label: 'Consignee/contact', complete: true },
        { label: 'Route note', complete: true },
        { label: 'Special handling note', complete: true },
        { label: 'Item summary', complete: true },
      ],
    },
    liveMovement: {
      currentLocation: 'Ali Sabieh corridor segment',
      corridorName: 'Djibouti -> Addis',
      distanceToDestinationKm: 438,
      eta: '2026-03-20T05:40:00Z',
      speedSummary: 'Stopped 45m for roadside fueling support',
      movementHealth: 'Minor delay',
    },
    checkpoints: [
      { id: 'c1', label: 'Gate-out from Djibouti', timestamp: '2026-03-19T06:00:00Z', location: 'SGTD Terminal', status: 'Passed', driverNote: 'Departed as planned.', sealConfirmed: true, officerNote: 'Transit pack checked.' },
      { id: 'c2', label: 'Ali Sabieh segment', timestamp: '2026-03-19T16:40:00Z', location: 'Ali Sabieh', status: 'Delayed', driverNote: 'Fuel support requested before continuing.', sealConfirmed: true, officerNote: '' },
    ],
    issues: [
      { id: 'i8', severity: 'Medium', title: 'Fuel issue submitted', explanation: 'Driver requested support before resuming corridor movement.', actionLabel: 'Notify driver' },
    ],
    arrivalReadiness: {
      destinationNode: 'Addis customer warehouse',
      unloadHandoffOwner: 'Customer receiving team',
      yardContact: 'Horizon Water receiving · +251 911 984 330',
      specialHandlingInstructions: 'Call customer 1 hour before arrival.',
      podExpectation: 'Customer POD on handheld.',
      emptyReturnInstructionAvailable: false,
      arrivalNoticeSent: true,
      unloadContactConfirmed: true,
    },
  },
  {
    id: 'dispatch-8',
    tripId: 'TRP-240319-18',
    bookingNumber: 'TAB-DJI-260319-07',
    blNumber: 'COS-DJI-708114',
    containerNumber: 'SEKU 640772-3',
    sealNumber: 'COS-9012',
    customerName: 'Ethio Solar Projects',
    serviceType: 'multimodal',
    corridorRoute: 'Djibouti Port -> Galafi -> Adama',
    originHandoffPoint: 'Doraleh Container Terminal',
    inlandDestination: 'Adama Solar Yard',
    currentTripStatus: 'Arrived inland',
    assignedDispatchOwner: 'Samuel Isayas',
    assignedTruck: 'ET-TRK-55102',
    assignedTrailer: 'TRL-8892',
    assignedDriver: 'Yohannes Mulu',
    driverType: 'Internal',
    partnerName: 'Tikur Abay Fleet',
    plannedDepartureTime: '2026-03-18T19:15:00Z',
    expectedArrivalTime: '2026-03-19T17:20:00Z',
    routeType: 'Djibouti to Adama corridor',
    dispatchNote: 'Prepare unload handoff with yard team immediately.',
    handoffSource: 'Djibouti release desk',
    etaSummary: 'Arrived Adama · handoff pending',
    driverStatus: 'Awaiting unload handoff',
    issueChip: null,
    delayRisk: 'Low',
    lastGpsTimestamp: '2026-03-19T17:22:00Z',
    lastUpdated: '2026-03-19T17:24:00Z',
    transitPack: {
      packetComplete: true,
      mobileSyncStatus: 'Synced',
      driverAcknowledgement: 'Acknowledged by Yohannes Mulu',
      lastPacketUpdate: '2026-03-18T18:52:00Z',
      qrGenerated: true,
      packetItems: [
        { label: 'BL', complete: true },
        { label: 'Packing list', complete: true },
        { label: 'Invoice summary', complete: true },
        { label: 'Transit/customs document', complete: true },
        { label: 'Release note', complete: true },
        { label: 'Container number', complete: true },
        { label: 'Seal number', complete: true },
        { label: 'Consignee/contact', complete: true },
        { label: 'Route note', complete: true },
        { label: 'Special handling note', complete: true },
        { label: 'Item summary', complete: true },
      ],
    },
    liveMovement: {
      currentLocation: 'Adama Solar Yard gate',
      corridorName: 'Djibouti -> Galafi -> Adama',
      distanceToDestinationKm: 0,
      eta: '2026-03-19T17:20:00Z',
      speedSummary: 'Trip completed at inland gate',
      movementHealth: 'On schedule',
    },
    checkpoints: [
      { id: 'c1', label: 'Gate-out from Djibouti', timestamp: '2026-03-18T19:15:00Z', location: 'Doraleh Terminal', status: 'Passed', driverNote: 'Departed with full release packet.', sealConfirmed: true, officerNote: '' },
      { id: 'c2', label: 'Galafi checkpoint', timestamp: '2026-03-19T08:45:00Z', location: 'Galafi', status: 'Passed', driverNote: 'Checkpoint cleared.', sealConfirmed: true, officerNote: 'Transit document checked.' },
      { id: 'c3', label: 'Arrival at inland node', timestamp: '2026-03-19T17:20:00Z', location: 'Adama Solar Yard', status: 'Arrived', driverNote: 'Waiting unload handoff team.', sealConfirmed: true, officerNote: '' },
    ],
    issues: [],
    arrivalReadiness: {
      destinationNode: 'Adama Solar Yard',
      unloadHandoffOwner: 'Adama yard desk',
      yardContact: 'Adama yard lead · +251 911 887 621',
      specialHandlingInstructions: 'Unload under supervisor review.',
      podExpectation: 'POD after unload completion.',
      emptyReturnInstructionAvailable: true,
      arrivalNoticeSent: true,
      unloadContactConfirmed: true,
    },
  },
];

export const corridorDispatchTrips: DispatchTripRecord[] = seededCorridorDispatchTrips.map((trip): DispatchTripRecord => {
  const inlandDestination = normalizeDispatchDestination(trip.inlandDestination);

  return {
    ...trip,
    corridorRoute: normalizeDispatchRoute(inlandDestination),
    inlandDestination,
    routeType: inlandDestination.includes('Combolcha') ? 'Djibouti to Combolcha corridor' : 'Djibouti to Adama corridor',
    etaSummary: replaceDispatchLocationText(trip.etaSummary, inlandDestination),
    dispatchNote: replaceDispatchLocationText(trip.dispatchNote, inlandDestination),
    liveMovement: {
      ...trip.liveMovement,
      currentLocation: replaceDispatchLocationText(trip.liveMovement.currentLocation, inlandDestination),
      corridorName: replaceDispatchLocationText(trip.liveMovement.corridorName, inlandDestination),
      movementHealth: trip.liveMovement.movementHealth,
    } as DispatchTripRecord['liveMovement'],
    checkpoints: trip.checkpoints.map((checkpoint): DispatchTripRecord['checkpoints'][number] => ({
      ...checkpoint,
      label: replaceDispatchLocationText(checkpoint.label, inlandDestination),
      location: replaceDispatchLocationText(checkpoint.location, inlandDestination),
      driverNote: replaceDispatchLocationText(checkpoint.driverNote, inlandDestination),
      officerNote: replaceDispatchLocationText(checkpoint.officerNote, inlandDestination),
    })),
    issues: trip.issues.map((issue): DispatchTripRecord['issues'][number] => ({
      ...issue,
      explanation: replaceDispatchLocationText(issue.explanation, inlandDestination),
    })),
    arrivalReadiness: {
      ...trip.arrivalReadiness,
      destinationNode: inlandDestination,
      unloadHandoffOwner: inlandDestination.includes('Combolcha') ? 'Combolcha yard desk' : 'Adama yard desk',
      yardContact: replaceDispatchLocationText(trip.arrivalReadiness.yardContact, inlandDestination),
      specialHandlingInstructions: replaceDispatchLocationText(trip.arrivalReadiness.specialHandlingInstructions, inlandDestination),
    },
  };
});
