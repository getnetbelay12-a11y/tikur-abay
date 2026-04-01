export type BookingRequestSource = 'customer' | 'supplier' | 'internal' | 'port_agent' | 'admin';

export type QuoteWorkflowStatus =
  | 'quote_requested'
  | 'quote_under_review'
  | 'quote_sent'
  | 'quote_accepted'
  | 'quote_rejected'
  | 'quote_revision_requested'
  | 'booking_created'
  | 'assigned_to_origin';

export type ContainerType =
  | '20GP'
  | '40GP'
  | '40HC'
  | 'Reefer / Fridge'
  | 'Flat Rack'
  | 'Open Top'
  | 'Tank'
  | 'OOG / special cargo support note';

export type UnifiedBookingRequest = {
  id: string;
  quoteId: string;
  bookingId: string;
  convertedToShipmentId: string;
  requestSource: BookingRequestSource;
  quoteStatus: QuoteWorkflowStatus;
  bookingStatus: 'draft' | 'converted' | 'assigned_to_origin' | 'in_origin';
  quoteAmount: number;
  quoteCurrency: string;
  acceptedAt: string;
  assignedOriginAgentId: string;
  assignedOriginAgentEmail: string;
  approvalStatus?: 'draft' | 'sent' | 'waiting_approval' | 'accepted' | 'rejected' | 'expired';
  approvalMethod?: string;
  approvalRecordedBy?: string;
  approvalRecordedAt?: string;
  createdAt: string;
  updatedAt: string;
  requestedBy: string;
  assignedDesk: string;
  customerName: string;
  customerContactPerson?: string;
  customerAddress?: string;
  consigneeName: string;
  contactPerson: string;
  phone: string;
  email: string;
  localPortalRecipientEmail?: string;
  notificationChannels?: Array<'email' | 'telegram' | 'in_app'>;
  company: string;
  customerTinVatNumber?: string;
  shipperName?: string;
  shipperContactPerson?: string;
  shipperAddress?: string;
  shipperPhone?: string;
  shipperEmail?: string;
  notifyPartyName?: string;
  secondNotifyParty?: string;
  incoterm: string;
  serviceType: 'multimodal' | 'unimodal';
  shipmentMode?: 'Ocean Freight' | 'Air Freight' | 'Road' | 'Multimodal';
  bookingType?: 'FCL' | 'LCL' | 'RoRo' | 'Air Freight';
  serviceLevel?: 'Port to Port' | 'Door to Port' | 'Port to Door' | 'Door to Door';
  originCountry: string;
  originCityOrPort: string;
  portOfLoading: string;
  portOfDischarge: string;
  placeOfReceipt?: string;
  inlandDestination: string;
  finalDeliveryLocation: string;
  commoditySummary: string;
  cargoDescription: string;
  hsCode: string;
  marksAndNumbers?: string;
  packageSummary?: string;
  freightPaymentTerm?: 'prepaid' | 'collect';
  prepaidAt?: string;
  collectAt?: string;
  lcNumber?: string;
  bankPermitNumber?: string;
  consigneeTinNumber?: string;
  tinAreaCode?: string;
  unNumber?: string;
  vesselName?: string;
  voyageNumber?: string;
  etaLoadingPort?: string;
  shippingCertificateRequired?: boolean;
  hazardousFlag: boolean;
  temperatureControl: boolean;
  outOfGaugeFlag: boolean;
  specialHandlingRequired: boolean;
  specialHandlingNote: string;
  containerType: ContainerType;
  containerCount: number;
  weightPerContainer: number;
  totalWeight: number;
  cbm: number;
  requestedLoadingDate: string;
  earliestDepartureDate: string;
  requestedArrivalWindow: string;
  priceOwner: string;
  pricingBreakdown?: {
    baseFreight: number;
    originCharges: number;
    destinationCharges: number;
    customsEstimate: number;
    inlandTransportEstimate: number;
    insuranceEstimate: number;
    handlingFees: number;
    discount: number;
    total: number;
    currency: string;
  };
  remarks: string;
  reeferSettings: {
    requiredTemperature: string;
    ventilation: string;
    humidity: string;
    commodityPreCooled: boolean;
  };
  oogSettings: {
    cargoDimensions: string;
    overHeight: string;
    overWidth: string;
    overLength: string;
    lashingNote: string;
  };
  quoteHistory: Array<{ status: QuoteWorkflowStatus; at: string; by: string; note: string }>;
};

export const bookingQuoteStorageKey = 'tikur-abay:booking-quote-desk:requests';

export const originAgentEmail = 'supplier.agent@tikurabay.com';

export const intakeSourceLabels: Record<BookingRequestSource, string> = {
  customer: 'Customer portal',
  supplier: 'Supplier',
  internal: 'Head office / support',
  port_agent: 'Tikur Abay Port Agent (China)',
  admin: 'Internal admin / operations',
};

export const lifecycleStages = [
  'Booking / Quote',
  'China Port Agent / Origin Preparation',
  'Ocean Transit',
  'Djibouti Release / Multimodal Department',
  'Transitor / Clearance Preparation',
  'Corridor Dispatch / Truck Transit',
  'Dry Port Arrival',
  'Customer Delivery / Receipt Confirmation',
  'Empty Return to Dry Port',
  'Empty Return to Djibouti',
  'Closed',
] as const;

export const seededBookingRequests: UnifiedBookingRequest[] = [
  {
    id: 'quote-001',
    quoteId: 'QT-260325-001',
    bookingId: '',
    convertedToShipmentId: '',
    requestSource: 'customer',
    quoteStatus: 'quote_sent',
    bookingStatus: 'draft',
    quoteAmount: 48250,
    quoteCurrency: 'USD',
    acceptedAt: '',
    assignedOriginAgentId: '',
    assignedOriginAgentEmail: '',
    createdAt: '2026-03-24T08:15:00Z',
    updatedAt: '2026-03-25T08:40:00Z',
    requestedBy: 'Customer self-service',
    assignedDesk: 'Commercial pricing desk',
    customerName: 'Abyssinia Industrial Imports PLC',
    consigneeName: 'Abyssinia Industrial Imports PLC',
    contactPerson: 'Lidya Getachew',
    phone: '+251 911 220 190',
    email: 'lidya.getachew@abyssinia-industrial.com',
    company: 'Abyssinia Industrial Imports PLC',
    incoterm: 'CIF',
    serviceType: 'multimodal',
    originCountry: 'China',
    originCityOrPort: 'Shanghai',
    portOfLoading: 'Shanghai',
    portOfDischarge: 'Djibouti',
    inlandDestination: 'Modjo Dry Port',
    finalDeliveryLocation: 'Adama customer delivery',
    commoditySummary: 'Factory machine spare parts',
    cargoDescription: 'Crated machinery spares with cable accessories and control panels.',
    hsCode: '8483.40',
    hazardousFlag: false,
    temperatureControl: false,
    outOfGaugeFlag: false,
    specialHandlingRequired: true,
    specialHandlingNote: 'Keep customs inspection note visible through Djibouti release.',
    containerType: '40HC',
    containerCount: 1,
    weightPerContainer: 18200,
    totalWeight: 18200,
    cbm: 26.4,
    requestedLoadingDate: '2026-03-28',
    earliestDepartureDate: '2026-03-30',
    requestedArrivalWindow: 'Apr 10 - Apr 14',
    priceOwner: 'Consignee',
    remarks: 'Customer wants POD and empty return visible until closure.',
    reeferSettings: {
      requiredTemperature: '',
      ventilation: '',
      humidity: '',
      commodityPreCooled: false,
    },
    oogSettings: {
      cargoDimensions: '',
      overHeight: '',
      overWidth: '',
      overLength: '',
      lashingNote: '',
    },
    quoteHistory: [
      { status: 'quote_requested', at: '2026-03-24T08:15:00Z', by: 'Customer portal', note: 'Quote request created.' },
      { status: 'quote_under_review', at: '2026-03-24T11:00:00Z', by: 'Commercial desk', note: 'Pricing review started.' },
      { status: 'quote_sent', at: '2026-03-25T08:40:00Z', by: 'Commercial desk', note: 'Quote issued to customer.' },
    ],
  },
  {
    id: 'quote-002',
    quoteId: 'QT-260325-002',
    bookingId: '',
    convertedToShipmentId: '',
    requestSource: 'supplier',
    quoteStatus: 'quote_under_review',
    bookingStatus: 'draft',
    quoteAmount: 0,
    quoteCurrency: 'USD',
    acceptedAt: '',
    assignedOriginAgentId: '',
    assignedOriginAgentEmail: '',
    createdAt: '2026-03-25T06:10:00Z',
    updatedAt: '2026-03-25T06:55:00Z',
    requestedBy: 'Supplier commercial desk',
    assignedDesk: 'Commercial pricing desk',
    customerName: 'Blue Nile Cables',
    consigneeName: 'Blue Nile Cables',
    contactPerson: 'Mulu Gebru',
    phone: '+251 911 540 011',
    email: 'mulu@bluenilecables.com',
    company: 'Blue Nile Cables',
    incoterm: 'FOB',
    serviceType: 'multimodal',
    originCountry: 'China',
    originCityOrPort: 'Ningbo',
    portOfLoading: 'Ningbo',
    portOfDischarge: 'Djibouti',
    inlandDestination: 'Adama Dry Port',
    finalDeliveryLocation: 'Adama cable plant',
    commoditySummary: 'Industrial cable drums',
    cargoDescription: 'Cable drums requiring dry container routing and careful yard handling.',
    hsCode: '8544.49',
    hazardousFlag: false,
    temperatureControl: false,
    outOfGaugeFlag: false,
    specialHandlingRequired: true,
    specialHandlingNote: 'Drums must remain upright during stuffing and inland handoff.',
    containerType: '40GP',
    containerCount: 2,
    weightPerContainer: 14600,
    totalWeight: 29200,
    cbm: 41.1,
    requestedLoadingDate: '2026-03-31',
    earliestDepartureDate: '2026-04-01',
    requestedArrivalWindow: 'Apr 12 - Apr 16',
    priceOwner: 'Supplier',
    remarks: 'Supplier requested direct origin visibility after booking conversion.',
    reeferSettings: {
      requiredTemperature: '',
      ventilation: '',
      humidity: '',
      commodityPreCooled: false,
    },
    oogSettings: {
      cargoDimensions: '',
      overHeight: '',
      overWidth: '',
      overLength: '',
      lashingNote: '',
    },
    quoteHistory: [
      { status: 'quote_requested', at: '2026-03-25T06:10:00Z', by: 'Supplier', note: 'Unified intake created from supplier entry point.' },
      { status: 'quote_under_review', at: '2026-03-25T06:55:00Z', by: 'Commercial desk', note: 'Quote under pricing review.' },
    ],
  },
  {
    id: 'quote-003',
    quoteId: 'QT-260325-003',
    bookingId: 'BK-260325-003',
    convertedToShipmentId: 'SHP-260325-003',
    requestSource: 'port_agent',
    quoteStatus: 'assigned_to_origin',
    bookingStatus: 'assigned_to_origin',
    quoteAmount: 39100,
    quoteCurrency: 'USD',
    acceptedAt: '2026-03-25T05:18:00Z',
    assignedOriginAgentId: 'origin-agent-liya-chen',
    assignedOriginAgentEmail: originAgentEmail,
    createdAt: '2026-03-24T16:10:00Z',
    updatedAt: '2026-03-25T05:19:00Z',
    requestedBy: 'China port agent desk',
    assignedDesk: 'Tikur Abay Port Agent Desk (China)',
    customerName: 'East Gate Manufacturing PLC',
    consigneeName: 'East Gate Manufacturing PLC',
    contactPerson: 'Hanna Mesfin',
    phone: '+251 911 220 210',
    email: 'hanna@eastgate-manufacturing.com',
    company: 'East Gate Manufacturing PLC',
    incoterm: 'CFR',
    serviceType: 'multimodal',
    originCountry: 'China',
    originCityOrPort: 'Shenzhen',
    portOfLoading: 'Yantian',
    portOfDischarge: 'Djibouti',
    inlandDestination: 'Modjo Dry Port',
    finalDeliveryLocation: 'Addis industrial zone',
    commoditySummary: 'Industrial gearbox assemblies',
    cargoDescription: 'Factory gearboxes, copper cable drums, and hydraulic seal kits.',
    hsCode: '8483.40',
    hazardousFlag: false,
    temperatureControl: false,
    outOfGaugeFlag: false,
    specialHandlingRequired: false,
    specialHandlingNote: '',
    containerType: '40HC',
    containerCount: 1,
    weightPerContainer: 17340,
    totalWeight: 17340,
    cbm: 23.6,
    requestedLoadingDate: '2026-03-27',
    earliestDepartureDate: '2026-03-28',
    requestedArrivalWindow: 'Apr 7 - Apr 10',
    priceOwner: 'Consignee',
    remarks: 'Accepted and routed to origin agent automatically.',
    reeferSettings: {
      requiredTemperature: '',
      ventilation: '',
      humidity: '',
      commodityPreCooled: false,
    },
    oogSettings: {
      cargoDimensions: '',
      overHeight: '',
      overWidth: '',
      overLength: '',
      lashingNote: '',
    },
    quoteHistory: [
      { status: 'quote_requested', at: '2026-03-24T16:10:00Z', by: 'Port agent', note: 'Port agent created intake file from origin side.' },
      { status: 'quote_under_review', at: '2026-03-24T18:10:00Z', by: 'Commercial desk', note: 'Pricing reviewed.' },
      { status: 'quote_sent', at: '2026-03-24T19:30:00Z', by: 'Commercial desk', note: 'Quote shared with request owner.' },
      { status: 'quote_accepted', at: '2026-03-25T05:18:00Z', by: 'Request owner', note: 'Quote accepted.' },
      { status: 'booking_created', at: '2026-03-25T05:18:30Z', by: 'System', note: 'Booking created automatically.' },
      { status: 'assigned_to_origin', at: '2026-03-25T05:19:00Z', by: 'System', note: `Assigned to ${originAgentEmail}.` },
    ],
  },
];
