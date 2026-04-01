'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { memo, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  bookingQuoteStorageKey,
  seededBookingRequests,
  type UnifiedBookingRequest,
} from '../lib/booking-quote-demo-data';
import {
  manualCorridorStorageUpdatedEvent,
  readManualDispatchTrips,
  readManualDjiboutiReleaseRecords,
  readManualYardRecords,
} from '../lib/manual-corridor-journey';
import { readShippingPhase1Workspace, shippingDeskLink, shippingNextActionLabel, shippingPhase1UpdatedEvent, shippingStageLabel } from '../lib/shipping-phase1';
import { dryPortYardRecords } from '../lib/dry-port-yard-demo-data';
import { useConsoleI18n } from '../lib/use-console-i18n';
import { CommunicationCenterDrawer, type CommunicationDrawerTarget } from './communication-center-drawer';
import { getPriorityShipmentNow, type ShipmentAttentionItem } from '../lib/shipment-attention';
import ExecutiveControlTower from './dashboard/ExecutiveControlTower';

const DeferredLiveFleetMap = dynamic(
  () => import('./live-fleet-map').then((module) => module.LiveFleetMap),
  {
    ssr: false,
    loading: () => <div className="executive-map-loading executive-skeleton" />,
  },
);

export type ExecutiveTab = 'overview' | 'journey' | 'finance' | 'operations' | 'fuel' | 'attention';
export type ExecutiveWorkspacePayload = (Partial<ExecutiveTabData> & { tab?: ExecutiveTab }) | null;

const shipmentWorkflowStages = [
  'Booking / Quote',
  'Origin Preparation',
  'Shipping Docs',
  'Djibouti Release',
  'Transitor / Clearance',
  'Finance Settlement',
  'Release Authorization',
  'Dispatch / Inland Delivery',
  'Yard / Closure',
  'Closed',
] as const;

const containerLifecycleStages = [
  'Empty release (EMPTY_OUT)',
  'Container pickup (EMPTY_OUT)',
  'Loaded at shipper (FULL_OUT)',
  'Gate-in at port (FULL_OUT)',
  'Loaded on vessel (FULL_OUT)',
  'Vessel departed (FULL_OUT)',
  'Transshipment (FULL_OUT)',
  'Vessel arrived (FULL_OUT)',
  'Discharged (FULL_OUT)',
  'Available for clearance (FULL_OUT)',
  'Customs cleared (FULL_OUT)',
  'Truck assigned (FULL_OUT)',
  'Out for delivery (FULL_OUT)',
  'FULL IN (FULL_IN)',
  'Ready for empty release (EMPTY_IN)',
  'Empty return in transit (EMPTY_OUT)',
  'Empty returned (EMPTY_RETURNED)',
] as const;

type ExecutiveMetric = {
  label: string;
  value: number | string;
  helper: string;
  tone: 'critical' | 'warning' | 'good' | 'info';
  href?: string;
};

type ExecutiveAiSuggestion = {
  title: string;
  reason: string;
  tag: string;
  tone: ExecutiveMetric['tone'];
  href: string;
  actionLabel: string;
  meta?: string;
};

type InsightRow = {
  id: string;
  title: string;
  description: string;
  chip: string;
  tone: ExecutiveMetric['tone'];
  href?: string;
  actionLabel?: string;
  communication?: CommunicationDrawerTarget;
};

type FinanceRow = {
  id: string;
  title: string;
  subtitle: string;
  amount: number;
  status: string;
  communication: CommunicationDrawerTarget;
};

type CorridorTimelineItem = {
  stage: string;
  timestamp: string;
  status: string;
};

function compareShipmentRefOrder(left: string, right: string) {
  const leftKey = left.replace(/\D/g, '');
  const rightKey = right.replace(/\D/g, '');
  if (leftKey.length !== rightKey.length) return rightKey.length - leftKey.length;
  return rightKey.localeCompare(leftKey);
}

function compareExecutiveQueueOrder(
  left: { shipmentRef: string; sortTimestamp: string },
  right: { shipmentRef: string; sortTimestamp: string },
) {
  const leftTime = Date.parse(left.sortTimestamp);
  const rightTime = Date.parse(right.sortTimestamp);
  const leftHasTime = Number.isFinite(leftTime);
  const rightHasTime = Number.isFinite(rightTime);

  if (leftHasTime && rightHasTime && leftTime !== rightTime) return rightTime - leftTime;
  if (leftHasTime !== rightHasTime) return leftHasTime ? -1 : 1;
  return compareShipmentRefOrder(left.shipmentRef, right.shipmentRef);
}

type CargoItem = {
  lineNumber: string;
  description: string;
  hsCode: string;
  packageType: string;
  packageQuantity: number;
  grossWeight: number;
  netWeight: number;
  cbm: number;
  invoiceReference: string;
  packingListReference: string;
  customsReference: string;
  remarks: string;
};

type MessageRow = {
  id: string;
  title: string;
  subtitle: string;
  channel: 'Chat' | 'Telegram' | 'Email' | 'SMS';
  href?: string;
};

type FleetPoint = {
  tripId: string;
  tripCode: string;
  vehicleDbId: string;
  vehicleId: string;
  plateNumber: string;
  driverName: string;
  driverPhone: string;
  branch: string;
  routeName: string;
  destination: string;
  tripStatus: string;
  vehicleStatus: string;
  geofence: string;
  locationLabel: string;
  currentOdometerKm: number;
  lastFuelOdometerKm: number | null;
  lastFuelAt: string | null;
  fuelStation: string | null;
  lastMaintenanceAt: string | null;
  latestGpsAt: string | null;
  lastSeenMinutes: number | null;
  offline: boolean;
  latitude: number;
  longitude: number;
  speed: number;
  djiboutiFlag: boolean;
  delayed: boolean;
  markerColor: string;
};

type SelectedVehicleContext = {
  vehicleId: string;
  tripCode: string;
  truckPlate: string;
  driver: string;
  phone: string;
  route: string;
  currentStage: string;
  currentLocation: string;
  customsDocument: string;
  releaseWindow: string;
  fuelNote: string;
  maintenanceNote: string;
};

type ExecutiveTabData = {
  generatedAt: string;
  overview: {
    urgent: ExecutiveMetric[];
    moving: ExecutiveMetric[];
    risks: InsightRow[];
    opportunities: InsightRow[];
    actions: InsightRow[];
  };
  finance: {
    metrics: ExecutiveMetric[];
    quickActions: InsightRow[];
    topCustomers: FinanceRow[];
    recentPayments: FinanceRow[];
  };
  operations: {
    summary: {
      totalVehicles: number;
      activeVehicles: number;
      delayedVehicles: number;
      inDjiboutiVehicles: number;
    };
    points: FleetPoint[];
    selectedVehicles: Record<string, SelectedVehicleContext>;
    routeHistory: Array<{ latitude: number; longitude: number; speed: number; geofence: string; recordedAt: string }>;
    highRisk: InsightRow[];
    dispatchFollowUp: InsightRow[];
    maintenanceAlerts: InsightRow[];
  };
  attention: {
    alerts: InsightRow[];
    tasks: InsightRow[];
    messages: MessageRow[];
  };
  journeys: Array<{
    shipmentRef: string;
    customerName: string;
    serviceMode: string;
    blNumber: string;
    containerNumber: string;
    sealNumber: string;
    eta: string;
    stage: string;
    containerStage: string;
    containerLocation: string;
    exception: string;
    timeline: CorridorTimelineItem[];
    items: CargoItem[];
  }>;
  shipment: {
    shipmentRef: string;
    customerName: string;
    serviceMode: string;
    blNumber: string;
    containerNumber: string;
    sealNumber: string;
    eta: string;
    stage: string;
    containerStage: string;
    containerLocation: string;
    exception: string;
    timeline: CorridorTimelineItem[];
    items: CargoItem[];
  };
};

const AM = {
  updated: 'የዘመነበት',
  heroTitle: 'የቲኩር አባይ የጭነት ጉዞ ኮማንድ',
  heroSubtitle: 'ከቻይና አቅራቢ መነሻ እስከ መርከብ ጭነት፣ ጅቡቲ ማራገፍ፣ የውስጥ መኪና ክትትል፣ የደንበኛ ማረጋገጫ እና ባዶ መመለስ ድረስ አንድ እይታ።',
  heroBullets: [
    'የቻይና መነሻ እና የመርከብ ጭነት ቁጥጥር',
    'የጅቡቲ ሪሊዝ እና የውስጥ መኪና ክትትል',
    'የደንበኛ ማረጋገጫ እና የባዶ መመለስ ክትትል',
  ],
  overviewEyebrow: 'አጠቃላይ እይታ',
  tabOverview: 'አጠቃላይ እይታ',
  tabJourney: 'የጭነት ጉዞ',
  tabFinance: 'ፋይናንስ',
  tabOperations: 'ኦፕሬሽን',
  tabFuel: 'ነዳጅ',
  tabAttention: 'ትኩረት',
  aiTitle: 'AI Command Center',
  corridorFocus: 'የኮሪደር ትኩረት',
  executiveNext: 'የአስፈፃሚ ዴስክ ቀጣይ ምን እንደሚያደርግ',
  priorityShipment: 'ዋና ትኩረት ያለበት ጭነት',
  currentTruth: 'የአሁኑ እውነታ',
  operationalNote: 'የኦፕሬሽን ማስታወሻ',
  trackedShipments: 'የሚከታተሉ ጭነቶች',
  corridorMetrics: 'የኮሪደር መለኪያዎች',
  riskTitle: 'አደጋዎች',
  opportunityTitle: 'እድሎች',
  actionTitle: 'የሚመከሩ እርምጃዎች',
  urgentTitle: 'ምን አስቸኳይ ነው?',
  movingTitle: 'ምን እየተንቀሳቀሰ ነው?',
  financeTitle: 'ፋይናንስ ሲግናል',
  quickActions: 'ፈጣን እርምጃዎች',
  topCustomers: 'ከፍተኛ ደንበኞች',
  recentPayments: 'የቅርብ ክፍያዎች',
  operationsTitle: 'የኮሪደር ቁጥጥር ግንብ',
  liveFleet: 'የቀጥታ ፍሊት ቁጥጥር',
  highRisk: 'ከፍተኛ አደጋ ያላቸው',
  dispatchFollowUp: 'የዲስፓች ክትትል',
  maintenanceAlerts: 'የደንበኛ ማረጋገጫ እና ባዶ መመለስ',
  attentionTitle: 'ትኩረት',
  alerts: 'ማንቂያዎች',
  tasks: 'ስራዎች',
  messages: 'መልዕክቶች',
  selectedVehicle: 'የተመረጠ ተሽከርካሪ',
  dispatchContext: 'የመንገድ / ዲስፓች አውድ',
  fuelContext: 'ነዳጅ / ጥገና አውድ',
  fuelTracking: 'የነዳጅ ክትትል',
  fuelRangeHelper: 'ሙሉ ታንክ = 400 ኪሜ መመዘኛ',
  driverLabel: 'ሹፌር',
  phoneLabel: 'ስልክ',
  plateLabel: 'ታርጋ',
  fuelLogLabel: 'የነዳጅ መዝገብ',
  rangeUsedLabel: 'የተጠቀሰ ርቀት',
  rangeLeftLabel: 'የቀረ ርቀት',
  noFuelLog: 'ምንም የነዳጅ መዝገብ የለም',
  awaitingFuel: 'የነዳጅ መዝገብ እየተጠበቀ ነው',
  noOdometer: 'እስካሁን የኦዶሜትር ዝማኔ የለም',
  noMaintenance: 'የቅርብ ጥገና መዝገብ የለም',
  openList: 'ዝርዝሩን ክፈት',
  viewDetails: 'ዝርዝር እይታ',
  sendReminder: 'አስታዋሽ ላክ',
  thankPayment: 'ለክፍያ አመሰግናለሁ',
  sendReceipt: 'ደረሰኝ ላክ',
  scheduleSend: 'መላኪያ መርሃ ግብር',
  openFinance: 'ፋይናንስ ኮንሶል ክፈት',
  openOperations: 'ኦፕሬሽን ክፈት',
  liveTracking: 'ቀጥታ እንቅስቃሴ ክፈት',
  corridorShipment: 'የኮሪደር ጭነት',
  generatedHelper: 'የአስፈፃሚ ኮሪደር ሁኔታ',
};

const EN = {
  updated: 'Updated',
  heroTitle: 'Tikur Abay Shipment Journey Command',
  heroSubtitle: 'One executive view of the main shipment workflow from booking and origin handling to release, clearance, finance, dispatch, customer handoff, and closure.',
  heroBullets: [
    'Booking / quote intake and automated routing to China origin',
    'China origin, shipping documents, and vessel handoff',
    'Djibouti release, transitor clearance, and inland dispatch execution',
    'Customer confirmation, POD, empty return, and shipment closure',
  ],
  overviewEyebrow: 'Overview',
  tabOverview: 'Overview',
  tabJourney: 'Shipment Journey',
  tabFinance: 'Finance',
  tabOperations: 'Operations',
  tabFuel: 'Fuel',
  tabAttention: 'Attention',
  aiTitle: 'AI Command Center',
  corridorFocus: 'Corridor focus',
  executiveNext: 'What the executive desk should drive next',
  priorityShipment: 'Priority shipment',
  currentTruth: 'Current truth',
  operationalNote: 'Operational note',
  trackedShipments: 'Tracked shipments',
  corridorMetrics: 'Corridor metrics',
  riskTitle: 'Risks',
  opportunityTitle: 'Opportunities',
  actionTitle: 'Recommended Actions',
  urgentTitle: 'What is urgent?',
  movingTitle: 'What is moving?',
  financeTitle: 'Finance Signal',
  quickActions: 'Quick actions',
  topCustomers: 'Top customers',
  recentPayments: 'Recent payments',
  operationsTitle: 'Corridor Control Tower',
  liveFleet: 'Live Fleet Command View',
  highRisk: 'High-Risk Items',
  dispatchFollowUp: 'Dispatch Follow-Up',
  maintenanceAlerts: 'Customer Confirmation & Empty Return',
  attentionTitle: 'Attention',
  alerts: 'Alerts',
  tasks: 'Tasks',
  messages: 'Messages',
  selectedVehicle: 'Selected vehicle',
  dispatchContext: 'Route / dispatch context',
  fuelContext: 'Fuel / maintenance context',
  fuelTracking: 'Fuel tracking',
  fuelRangeHelper: 'Full tank benchmark = 400 km',
  driverLabel: 'Driver',
  phoneLabel: 'Phone',
  plateLabel: 'Plate',
  fuelLogLabel: 'Fuel log',
  rangeUsedLabel: 'Range used',
  rangeLeftLabel: 'Range left',
  noFuelLog: 'No fuel log yet',
  awaitingFuel: 'Awaiting fuel log',
  noOdometer: 'No odometer update yet',
  noMaintenance: 'No recent maintenance entry',
  openList: 'Open list',
  viewDetails: 'View details',
  sendReminder: 'Send reminder',
  thankPayment: 'Thank-you note',
  sendReceipt: 'Send receipt',
  scheduleSend: 'Schedule send',
  openFinance: 'Open finance console',
  openOperations: 'Open operations',
  liveTracking: 'Open live tracking',
  corridorShipment: 'Corridor shipment',
  generatedHelper: 'Executive corridor status',
};

function copyFor(language: 'en' | 'am') {
  return language === 'am' ? AM : EN;
}

function formatMoney(language: 'en' | 'am', value: number, compact = false) {
  const locale = language === 'am' ? 'am-ET' : 'en-US';
  if (compact) {
    return `ETB ${new Intl.NumberFormat(locale, {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 2,
    }).format(value)}`;
  }
  return `ETB ${new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(value)}`;
}

function formatNumber(language: 'en' | 'am', value: number) {
  return new Intl.NumberFormat(language === 'am' ? 'am-ET' : 'en-US', { maximumFractionDigits: 0 }).format(value);
}

function formatDate(language: 'en' | 'am', value: string) {
  return new Intl.DateTimeFormat(language === 'am' ? 'am-ET' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function baseCommunication(entityType: string, entityId: string, title: string, subtitle: string, template: CommunicationDrawerTarget['defaultTemplate']): CommunicationDrawerTarget {
  return {
    entityType,
    entityId,
    title,
    subtitle,
    defaultTemplate: template,
    severity: 'medium',
  };
}

function buildExecutiveData(language: 'en' | 'am'): ExecutiveTabData {
  const c = copyFor(language);

  const shipment = {
    shipmentRef: 'TB-MANUAL-0001',
    customerName: 'Alem Logistics PLC',
    serviceMode: language === 'am' ? 'መልቲሞዳል' : 'Multimodal',
    blNumber: 'BL-DJI-MANUAL-0001',
    containerNumber: 'MSCU1234567',
    sealNumber: 'SL-908877',
    eta: language === 'am' ? 'መጋቢት 20 05:10' : 'Mar 20, 05:10',
    stage: language === 'am' ? 'ደንበኛ አረጋግጧል፣ ባዶ መመለስ ተጠናቋል' : 'Customer confirmed receipt and empty return is closed',
    containerStage: 'Empty returned (EMPTY_RETURNED)',
    containerLocation: 'Djibouti Empty Depot',
    exception: language === 'am' ? 'የደረሰኝ እና የመመለሻ ደረሰኝ ተጠናቀዋል' : 'POD, customer receipt, and return receipt are all complete',
    timeline: [
      { stage: language === 'am' ? 'ቦኪንግ / ኮቴሽን' : 'Booking / quote', timestamp: '2026-03-20T01:15:00Z', status: 'done' },
      { stage: language === 'am' ? 'መነሻ ዝግጅት' : 'Origin preparation', timestamp: '2026-03-20T01:55:00Z', status: 'done' },
      { stage: language === 'am' ? 'መርከብ ጉዞ' : 'Ocean transit', timestamp: '2026-03-20T03:30:00Z', status: 'done' },
      { stage: language === 'am' ? 'ጅቡቲ ሪሊዝ' : 'Djibouti release', timestamp: '2026-03-20T04:17:00Z', status: 'done' },
      { stage: language === 'am' ? 'ትራንዚተር / ክሊራንስ' : 'Transitor / clearance', timestamp: '2026-03-20T04:42:00Z', status: 'done' },
      { stage: language === 'am' ? 'የውስጥ መኪና ጉዞ' : 'Inland truck transit', timestamp: '2026-03-20T05:02:00Z', status: 'done' },
      { stage: language === 'am' ? 'የውስጥ መድረስ' : 'Inland arrival', timestamp: '2026-03-20T05:10:00Z', status: 'done' },
      { stage: language === 'am' ? 'ማራገፍ / የደንበኛ ማረጋገጫ' : 'Unload / customer confirmation', timestamp: '2026-03-20T18:45:00Z', status: 'done' },
      { stage: language === 'am' ? 'ባዶ መመለስ' : 'Empty return', timestamp: '2026-03-21T03:18:00Z', status: 'done' },
      { stage: language === 'am' ? 'ዝግ ተደርጓል' : 'Closed', timestamp: '2026-03-21T03:36:00Z', status: 'active' },
    ],
    items: [
      {
        lineNumber: '01',
        description: language === 'am' ? 'ኤሌክትሪክ ሞተሮች' : 'Electric motors',
        hsCode: '8501.52',
        packageType: language === 'am' ? 'ክሬት' : 'Crate',
        packageQuantity: 12,
        grossWeight: 4200,
        netWeight: 3980,
        cbm: 8.4,
        invoiceReference: 'INV-MANUAL-0001',
        packingListReference: 'PL-MANUAL-0001',
        customsReference: 'T1-DJI-MANUAL-0001',
        remarks: language === 'am' ? 'እጥረት ወይም ጉዳት አልተመዘገበም' : 'No shortage or damage recorded',
      },
      {
        lineNumber: '02',
        description: language === 'am' ? 'የኢንዱስትሪ ኬብሎች' : 'Industrial cables',
        hsCode: '8544.49',
        packageType: language === 'am' ? 'ሮል' : 'Roll',
        packageQuantity: 24,
        grossWeight: 3100,
        netWeight: 2960,
        cbm: 5.9,
        invoiceReference: 'INV-MANUAL-0001',
        packingListReference: 'PL-MANUAL-0001',
        customsReference: 'T1-DJI-MANUAL-0001',
        remarks: language === 'am' ? 'ሲል በመንገድ ሙሉ ጊዜ ተጠብቋል' : 'Seal remained intact through corridor transit',
      },
      {
        lineNumber: '03',
        description: language === 'am' ? 'ኮንትሮል ፓነሎች' : 'Control panels',
        hsCode: '8537.10',
        packageType: language === 'am' ? 'ፓሌት' : 'Pallet',
        packageQuantity: 8,
        grossWeight: 2700,
        netWeight: 2550,
        cbm: 4.7,
        invoiceReference: 'INV-MANUAL-0001',
        packingListReference: 'PL-MANUAL-0001',
        customsReference: 'T1-DJI-MANUAL-0001',
        remarks: language === 'am' ? 'POD እና የደንበኛ ማረጋገጫ ተጠናቀዋል' : 'POD and customer receipt are complete',
      },
    ],
  };

  const journeys: ExecutiveTabData['journeys'] = [
    {
      ...shipment,
      customerName: 'Alem Logistics PLC',
    },
    {
      shipmentRef: 'TB-OCEAN-0008',
      customerName: 'Blue Nile Cables',
      serviceMode: language === 'am' ? 'መልቲሞዳል' : 'Multimodal',
      blNumber: 'BL-DJI-OCEAN-0008',
      containerNumber: 'GLDU2198450',
      sealNumber: 'SL-440122',
      eta: language === 'am' ? 'መጋቢት 23 13:20' : 'Mar 23, 13:20',
      stage: language === 'am' ? 'በባህር ላይ ነው' : 'Ocean transit to Djibouti',
      containerStage: 'Vessel departed (FULL_OUT)',
      containerLocation: 'Red Sea corridor',
      exception: language === 'am' ? 'መጨረሻ BL እና ETA ተረጋግጠዋል' : 'Final BL is complete and ETA is confirmed',
      timeline: [
        { stage: language === 'am' ? 'መነሻ ዝግጅት' : 'Origin preparation', timestamp: '2026-03-19T07:10:00Z', status: 'done' },
        { stage: language === 'am' ? 'ስቲፊንግ / ጌት-ኢን' : 'Stuffing / gate-in', timestamp: '2026-03-19T10:40:00Z', status: 'done' },
        { stage: language === 'am' ? 'መርከብ ጉዞ' : 'Ocean transit', timestamp: '2026-03-19T15:20:00Z', status: 'active' },
      ],
      items: shipment.items,
    },
    {
      shipmentRef: 'TB-DJI-0012',
      customerName: 'East Gate Manufacturing PLC',
      serviceMode: language === 'am' ? 'መልቲሞዳል' : 'Multimodal',
      blNumber: 'MSKU-DJI-884211',
      containerNumber: 'MSCU4589127',
      sealNumber: 'SEAL-ET-44821',
      eta: language === 'am' ? 'መጋቢት 20 11:30' : 'Mar 20, 11:30',
      stage: language === 'am' ? 'ጅቡቲ ሪሊዝ በመጠባበቅ ላይ' : 'Djibouti release awaiting gate-out',
      containerStage: 'Available for clearance (FULL_OUT)',
      containerLocation: 'Djibouti release yard',
      exception: language === 'am' ? '16 ሰዓት ፍሪ ታይም ቀርቷል' : '16 hours left in free time before detention',
      timeline: [
        { stage: language === 'am' ? 'መነሻ ዝግጅት' : 'Origin preparation', timestamp: '2026-03-18T04:10:00Z', status: 'done' },
        { stage: language === 'am' ? 'ስቲፊንግ / ጌት-ኢን' : 'Stuffing / gate-in', timestamp: '2026-03-18T08:45:00Z', status: 'done' },
        { stage: language === 'am' ? 'መርከብ ጉዞ' : 'Ocean transit', timestamp: '2026-03-18T13:30:00Z', status: 'done' },
        { stage: language === 'am' ? 'ጅቡቲ ሪሊዝ' : 'Djibouti release', timestamp: '2026-03-20T04:15:00Z', status: 'active' },
      ],
      items: shipment.items,
    },
  ];

  const fleetPoints: FleetPoint[] = [
    {
      tripId: 'trip-01',
      tripCode: 'TRP-240319-11',
      vehicleDbId: 'veh-db-01',
      vehicleId: 'TKR-401',
      plateNumber: 'AA-3-46291',
      driverName: 'Abel Hailu',
      driverPhone: '+251911120101',
      branch: 'Djibouti Operations',
      routeName: 'Djibouti Port -> Galafi -> Adama Dry Port',
      destination: 'Adama Dry Port',
      tripStatus: 'in_transit',
      vehicleStatus: 'active',
      geofence: 'Galafi Corridor',
      locationLabel: 'Galafi checkpoint',
      currentOdometerKm: 321440,
      lastFuelOdometerKm: 321080,
      lastFuelAt: '2026-03-19T05:30:00Z',
      fuelStation: 'Galafi Shell',
      lastMaintenanceAt: '2026-03-16T09:15:00Z',
      latestGpsAt: '2026-03-19T11:12:00Z',
      lastSeenMinutes: 4,
      offline: false,
      latitude: 11.736,
      longitude: 41.837,
      speed: 54,
      djiboutiFlag: true,
      delayed: false,
      markerColor: '#0f9d58',
    },
    {
      tripId: 'trip-02',
      tripCode: 'TRP-240319-08',
      vehicleDbId: 'veh-db-02',
      vehicleId: 'TKR-315',
      plateNumber: 'AA-3-31882',
      driverName: 'Mekdes Taye',
      driverPhone: '+251911120102',
      branch: 'Djibouti Operations',
      routeName: 'Djibouti Port -> Dire Dawa',
      destination: 'Dire Dawa ICD',
      tripStatus: 'delayed',
      vehicleStatus: 'warning',
      geofence: 'Ali Sabieh corridor',
      locationLabel: 'Ali Sabieh fuel bay',
      currentOdometerKm: 286120,
      lastFuelOdometerKm: null,
      lastFuelAt: null,
      fuelStation: null,
      lastMaintenanceAt: '2026-03-15T12:45:00Z',
      latestGpsAt: '2026-03-19T10:48:00Z',
      lastSeenMinutes: 18,
      offline: false,
      latitude: 11.157,
      longitude: 42.712,
      speed: 0,
      djiboutiFlag: true,
      delayed: true,
      markerColor: '#f59e0b',
    },
    {
      tripId: 'trip-03',
      tripCode: 'TRP-240318-22',
      vehicleDbId: 'veh-db-03',
      vehicleId: 'TKR-229',
      plateNumber: 'AA-3-27751',
      driverName: 'Samuel Kebede',
      driverPhone: '+251911120103',
      branch: 'Adama',
      routeName: 'Adama Dry Port -> Customer Delivery',
      destination: 'Adama Customer Delivery',
      tripStatus: 'arrival_window',
      vehicleStatus: 'active',
      geofence: 'Adama inbound',
      locationLabel: 'Adama weighbridge',
      currentOdometerKm: 411990,
      lastFuelOdometerKm: 411760,
      lastFuelAt: '2026-03-18T18:10:00Z',
      fuelStation: 'Adama Total',
      lastMaintenanceAt: null,
      latestGpsAt: '2026-03-19T11:05:00Z',
      lastSeenMinutes: 6,
      offline: false,
      latitude: 8.553,
      longitude: 39.269,
      speed: 36,
      djiboutiFlag: false,
      delayed: false,
      markerColor: '#2563eb',
    },
  ];

  return {
    generatedAt: '2026-03-19T11:15:00Z',
    overview: {
      urgent: [
        {
          label: language === 'am' ? 'የሚጠብቁ ኮቴሽኖች' : 'Quotes pending',
          value: 9,
          helper: language === 'am' ? 'አንድ የbooking intake ቅድሚያ ውስጥ ያሉ ጥያቄዎች' : 'Unified booking-intake requests still waiting on review or issuance',
          tone: 'critical',
          href: '/operations/booking',
        },
        {
          label: language === 'am' ? 'በመነሻ የሚጠብቁ ቦኪንጎች' : 'Bookings awaiting origin',
          value: 6,
          helper: language === 'am' ? 'ተቀባይነት ያገኙ ቦኪንጎች ወደ ቻይና ዴስክ ሊገቡ ናቸው' : 'Accepted bookings that still need full China origin preparation',
          tone: 'warning',
          href: '/operations/supplier-agent',
        },
        {
          label: language === 'am' ? 'ክሊራንስ የሚጠብቁ ፋይሎች' : 'Awaiting clearance',
          value: 5,
          helper: language === 'am' ? 'በጅቡቲ ሪሊዝ የተዘጋጁ ፋይሎች ወደ ትራንዚተር መግባት አለባቸው' : 'Multimodal files waiting on transitor clearance and T1 readiness',
          tone: 'warning',
          href: '/operations/transitor-clearance',
        },
        {
          label: language === 'am' ? 'የደንበኛ ማረጋገጫ የሚጠብቁ' : 'Awaiting customer confirmation',
          value: 4,
          helper: language === 'am' ? 'arrival እና unload ተደርጓል ነገር ግን ደንበኛ አልረጋገጠም' : 'Arrived and unloaded, but customer receipt confirmation is still open',
          tone: 'warning',
          href: '/operations/dry-port-yard',
        },
        {
          label: language === 'am' ? 'ባዶ መመለስ ያልተዘጉ' : 'Open empty returns',
          value: 7,
          helper: language === 'am' ? 'return እና receipt ያልተጠናቀቁ ፋይሎች' : 'Files still waiting on empty return movement or return receipt',
          tone: 'critical',
          href: '/operations/empty-return',
        },
      ],
      moving: [
        {
          label: language === 'am' ? 'በባህር ላይ ያሉ ጭነቶች' : 'Origin in progress',
          value: 8,
          helper: language === 'am' ? 'ቦኪንግ ከተቀበለ በኋላ የመነሻ ፋይል በሂደት ላይ ነው' : 'Bookings already assigned to China origin and moving through file readiness',
          tone: 'good',
        },
        {
          label: language === 'am' ? 'በመንገድ ላይ ያሉ መኪናዎች' : 'Trucks moving inland',
          value: 18,
          helper: language === 'am' ? 'ከጅቡቲ ወደ ደረቅ ወደብ በቀጥታ እየተንቀሳቀሱ ናቸው' : 'Dispatch-assigned corridor trucks are moving now',
          tone: 'good',
        },
        {
          label: language === 'am' ? 'ready for dispatch' : 'Ready for dispatch',
          value: 12,
          helper: language === 'am' ? 'ክሊራንስ ዝግጁ ሆነው ወደ ዲስፓች ሊገቡ የሚችሉ ፋይሎች' : 'Transport clearance is complete and dispatch can create the trip',
          tone: 'info',
        },
        {
          label: language === 'am' ? 'arrival ነገር ግን ያልተዘጉ' : 'Arrived but not yet confirmed',
          value: 7,
          helper: language === 'am' ? 'arrival ወይም unload ተደርጓል ነገር ግን customer confirmation ያስፈልጋል' : 'Arrival or unload is complete, but POD or customer confirmation is still open',
          tone: 'warning',
        },
      ],
      risks: [
        {
          id: 'risk-1',
          title: language === 'am' ? 'MSCU 458912-7 ለዲቴንሽን ተጋላጭ ነው' : 'MSCU 458912-7 nearing detention',
          description: language === 'am' ? 'ፍሪ ታይም ውስጥ 16 ሰዓት ቀርቷል፣ ሪሊዝ እና ጌት-አውት መጠናቀቅ አለበት' : '16 hours left in free time. Release and gate-out need one ownership path.',
          chip: language === 'am' ? 'ከፍተኛ' : 'Critical',
          tone: 'critical',
          href: '/operations/djibouti-release',
          actionLabel: c.viewDetails,
          communication: baseCommunication('trip', 'trip-01', 'MSCU 458912-7', 'Detention-risk container', 'trip_delay_update'),
        },
        {
          id: 'risk-2',
          title: language === 'am' ? '2 ኢንቮይሶች ሪሊዝ እያዘገዩ ናቸው' : '2 invoices are blocking release',
          description: language === 'am' ? 'ፋይናንስ ማረጋገጫ ሳይሰጥ የጌት-አውት ጥያቄ አይከፈትም' : 'Finance confirmation is still missing for gate-out readiness.',
          chip: language === 'am' ? 'ክፍያ' : 'Finance',
          tone: 'warning',
          href: '/finance',
          actionLabel: c.sendReminder,
          communication: baseCommunication('invoice', 'inv-01', 'Release-linked invoice', 'Collections follow-up', 'payment_reminder'),
        },
        {
          id: 'risk-3',
          title: language === 'am' ? 'TKR-315 የነዳጅ መዝገብ አልሰጠም' : 'TKR-315 missing fuel update',
          description: language === 'am' ? 'አሊ ሳቢህ ላይ ቆሟል፣ የሹፌር ማረጋገጫ ያስፈልጋል' : 'Stopped at Ali Sabieh. Dispatch needs a driver and customs note.',
          chip: language === 'am' ? 'ዲስፓች' : 'Dispatch',
          tone: 'warning',
          href: '/operations/corridor-dispatch',
          actionLabel: c.openOperations,
          communication: baseCommunication('trip', 'trip-02', 'TRP-240319-08', 'Dispatch follow-up', 'dispatch_follow_up'),
        },
      ],
      opportunities: [
        {
          id: 'opp-1',
          title: language === 'am' ? '3 ኮንቴነሮች በፍጥነት መልቀቅ ይችላሉ' : '3 containers can close early',
          description: language === 'am' ? 'የሰነድ ፓኬጁ ሙሉ ነው፣ የጅቡቲ ቡድን ፈጣን ሪሊዝ ሊጠይቅ ይችላል' : 'Document packs are complete. Djibouti team can accelerate release window.',
          chip: language === 'am' ? 'እድል' : 'Opportunity',
          tone: 'good',
          href: '/operations/djibouti-release',
          actionLabel: c.openList,
        },
        {
          id: 'opp-2',
          title: language === 'am' ? 'Dry-port unload ስራ ወደ 1 ሺፍት ሊመጣ ይችላል' : 'Dry-port unload can move to one-shift plan',
          description: language === 'am' ? '7 መድረሶች በአንድ የያርድ ቡድን ሊጨርሱ ይችላሉ' : '7 arrivals can complete under one coordinated yard crew.',
          chip: language === 'am' ? 'ያርድ' : 'Yard',
          tone: 'good',
          href: '/operations/dry-port-yard',
          actionLabel: c.viewDetails,
        },
        {
          id: 'opp-3',
          title: language === 'am' ? '2 ደንበኞች በቴሌግራም እየመለሱ ናቸው' : '2 customers respond faster on Telegram',
          description: language === 'am' ? 'ስርጭት በቴሌግራም ካደረግን የሪሊዝ ክፍያ ፈጣን ይሆናል' : 'Collections close faster when release reminders use Telegram first.',
          chip: 'Telegram',
          tone: 'info',
          href: '/finance',
          actionLabel: c.sendReminder,
          communication: baseCommunication('customer', 'cust-02', 'Kaliti Industrial PLC', 'Telegram reminder route', 'payment_reminder'),
        },
      ],
      actions: [
        {
          id: 'act-1',
          title: language === 'am' ? 'የጌት-አውት ባለቤት አንድ ሰው አድርግ' : 'Assign one gate-out owner',
          description: language === 'am' ? 'Djibouti clearance እና dispatch በአንድ ሰው ስር እንዲሰሩ አድርግ' : 'Make one owner accountable for release, gate-out, and inland handoff.',
          chip: language === 'am' ? 'አሁን' : 'Now',
          tone: 'critical',
          href: '/operations/djibouti-release',
          actionLabel: c.openOperations,
        },
        {
          id: 'act-2',
          title: language === 'am' ? 'የክፍያ አስታዋሽ እና ደረሰኝ በአንድ ጊዜ ላክ' : 'Send reminder plus receipt pack',
          description: language === 'am' ? 'ፋይናንስ እና customer desk አንድ ኮሙኒኬሽን እንዲጠቀሙ አድርግ' : 'Use one communication flow for reminder, receipt, and release confirmation.',
          chip: language === 'am' ? 'መገናኛ' : 'Comms',
          tone: 'warning',
          href: '/finance',
          actionLabel: c.sendReceipt,
          communication: baseCommunication('invoice', 'inv-04', 'INV-2403-441', 'Receipt and reminder package', 'payment_receipt'),
        },
        {
          id: 'act-3',
          title: language === 'am' ? 'በሹፌር ሞባይል ላይ የትራንዚት ፓክ አሳይ' : 'Push transit pack to driver mobile',
          description: language === 'am' ? 'BL፣ T1፣ packing list እና item summary ለሹፌር በአንድ ቦታ አሳይ' : 'Surface BL, T1, packing list, and item summary together for the assigned driver.',
          chip: language === 'am' ? 'ሞባይል' : 'Mobile',
          tone: 'info',
          href: '/operations/corridor-dispatch',
          actionLabel: c.liveTracking,
        },
      ],
    },
    finance: {
      metrics: [
        { label: 'Revenue MTD', value: 8584000, helper: 'Multimodal + unimodal corridor revenue booked', tone: 'good' },
        { label: 'Outstanding balance', value: 12440000, helper: 'Open customer balances across release and dry-port stages', tone: 'warning' },
        { label: 'Collections due', value: 230200, helper: 'Due within the next 24 hours', tone: 'critical' },
        { label: 'Recent success rate', value: '96%', helper: 'Receipts confirmed across the last 25 payments', tone: 'info' },
      ],
      quickActions: [
        {
          id: 'finance-action-1',
          title: language === 'am' ? 'የክፍያ አስታዋሽ ላክ' : 'Send payment reminder',
          description: language === 'am' ? 'Email, SMS, Telegram ወይም in-app በአንድ ስራ ሂደት' : 'Email, SMS, Telegram, or in-app from one drawer.',
          chip: 'Email / SMS / Telegram / In-app',
          tone: 'warning',
          communication: baseCommunication('invoice', 'inv-01', 'Release invoice follow-up', 'Collections reminder', 'payment_reminder'),
        },
        {
          id: 'finance-action-2',
          title: language === 'am' ? 'ኢንቮይሶችን እይ' : 'View invoices',
          description: language === 'am' ? 'ሪሊዝ እና dispatch ጋር የተያያዙ ኢንቮይሶች' : 'Release-linked and corridor invoices in scope.',
          chip: '5 due',
          tone: 'info',
          href: '/payments',
        },
        {
          id: 'finance-action-3',
          title: language === 'am' ? 'ፋይናንስ ኮንሶል ክፈት' : 'Open finance console',
          description: language === 'am' ? 'የደረሰኝ መላክ፣ የተከፈለ እና ያልተከፈለ ክትትል' : 'Receipts, thank-you notes, and collections history.',
          chip: 'Receipts',
          tone: 'good',
          href: '/finance',
        },
      ],
      topCustomers: [
        {
          id: 'cust-01',
          title: 'East Gate Manufacturing',
          subtitle: language === 'am' ? '2 ኮንቴነሮች ለሪሊዝ ክፍያ እየጠበቁ ናቸው' : '2 containers waiting on release-linked settlement',
          amount: 4410000,
          status: 'Release risk',
          communication: baseCommunication('customer', 'cust-01', 'East Gate Manufacturing', 'Release settlement follow-up', 'payment_reminder'),
        },
        {
          id: 'cust-02',
          title: 'Kaliti Industrial PLC',
          subtitle: language === 'am' ? 'የደረቅ ወደብ ማከማቻ ክፍያ ተዘግይቷል' : 'Dry-port storage fee follow-up in progress',
          amount: 2980000,
          status: 'Storage exposure',
          communication: baseCommunication('customer', 'cust-02', 'Kaliti Industrial PLC', 'Storage invoice follow-up', 'payment_reminder'),
        },
        {
          id: 'cust-03',
          title: 'Addis Agro Export',
          subtitle: language === 'am' ? 'BL final ከላኩ በኋላ ክፍያ ይጠበቃል' : 'Awaiting final payment after BL release',
          amount: 1760000,
          status: 'BL release',
          communication: baseCommunication('customer', 'cust-03', 'Addis Agro Export', 'BL-linked balance reminder', 'payment_reminder'),
        },
      ],
      recentPayments: [
        {
          id: 'pay-01',
          title: 'Horizon Retail Group',
          subtitle: language === 'am' ? 'Telegram እና ደረሰኝ በአንድ ጊዜ ተልኳል' : 'Telegram thank-you and receipt sent',
          amount: 1220000,
          status: 'Paid today',
          communication: baseCommunication('payment', 'pay-01', 'Horizon Retail Group', 'Thank-you for payment', 'payment_thank_you'),
        },
        {
          id: 'pay-02',
          title: 'Tekleberhan Steel',
          subtitle: language === 'am' ? 'የተቀበለ ክፍያ ደረሰኝ ተልኳል' : 'Receipt pack issued after confirmation',
          amount: 984000,
          status: 'Receipt sent',
          communication: baseCommunication('payment', 'pay-02', 'Tekleberhan Steel', 'Payment receipt', 'payment_receipt'),
        },
        {
          id: 'pay-03',
          title: 'Alem Pharma',
          subtitle: language === 'am' ? 'በኢሜይል የተላከ አመሰግናለሁ መልዕክት' : 'Thank-you note delivered by email',
          amount: 731000,
          status: 'Closed',
          communication: baseCommunication('payment', 'pay-03', 'Alem Pharma', 'Thank-you communication', 'payment_thank_you'),
        },
      ],
    },
    operations: {
      summary: {
        totalVehicles: 31,
        activeVehicles: 24,
        delayedVehicles: 4,
        inDjiboutiVehicles: 9,
      },
      points: fleetPoints,
      selectedVehicles: {
        'TKR-401': {
          vehicleId: 'TKR-401',
          tripCode: 'TRP-240319-11',
          truckPlate: 'AA-3-46291',
          driver: 'Abel Hailu',
          phone: '+251911120101',
          route: 'Djibouti Port -> Galafi -> Adama Dry Port',
          currentStage: 'Transit document checked at Galafi',
          currentLocation: 'Galafi checkpoint',
          customsDocument: 'T1-DJI-99281',
          releaseWindow: 'Release cleared, dry-port ETA 09:40 tomorrow',
          fuelNote: 'Last fuel update 05:30 at Galafi Shell',
          maintenanceNote: 'Last maintenance completed Mar 16',
        },
        'TKR-315': {
          vehicleId: 'TKR-315',
          tripCode: 'TRP-240319-08',
          truckPlate: 'AA-3-31882',
          driver: 'Mekdes Taye',
          phone: '+251911120102',
          route: 'Djibouti Port -> Dire Dawa',
          currentStage: 'Waiting on customs note and dispatch confirmation',
          currentLocation: 'Ali Sabieh fuel bay',
          customsDocument: 'Transit declaration TRN-445811',
          releaseWindow: 'Gate-out approved but delay note is open',
          fuelNote: c.awaitingFuel,
          maintenanceNote: 'Brake lining check due within 480 km',
        },
        'TKR-229': {
          vehicleId: 'TKR-229',
          tripCode: 'TRP-240318-22',
          truckPlate: 'AA-3-27751',
          driver: 'Samuel Kebede',
          phone: '+251911120103',
          route: 'Adama Dry Port -> Customer Delivery',
          currentStage: 'Approaching unload window',
          currentLocation: 'Adama weighbridge',
          customsDocument: 'Customs release note REL-88412',
          releaseWindow: 'Unload bay reserved for 13:20',
          fuelNote: 'Fuel top-up completed Mar 18 at Adama Total',
          maintenanceNote: c.noMaintenance,
        },
      },
      routeHistory: [
        { latitude: 11.589, longitude: 43.145, speed: 22, geofence: 'Djibouti Port', recordedAt: '2026-03-18T14:00:00Z' },
        { latitude: 11.157, longitude: 42.712, speed: 18, geofence: 'Ali Sabieh', recordedAt: '2026-03-18T20:00:00Z' },
        { latitude: 11.736, longitude: 41.837, speed: 54, geofence: 'Galafi', recordedAt: '2026-03-19T11:00:00Z' },
      ],
      highRisk: [
        {
          id: 'risk-op-1',
          title: language === 'am' ? 'MSCU 458912-7 ዲቴንሽን አደጋ' : 'MSCU 458912-7 detention risk',
          description: language === 'am' ? 'Gate-out እና dispatch owner አንድ አድርግ' : 'Need one owner for gate-out and inland dispatch.',
          chip: 'Container',
          tone: 'critical',
          href: '/operations/djibouti-release',
        },
        {
          id: 'risk-op-2',
          title: language === 'am' ? 'TRP-240319-08 ዘግይቷል' : 'TRP-240319-08 delayed',
          description: language === 'am' ? 'የሹፌር ማስረጃ እና fuel note ይፈልጋል' : 'Waiting on driver confirmation and fuel note.',
          chip: 'Dispatch',
          tone: 'warning',
          href: '/operations/corridor-dispatch',
        },
        {
          id: 'risk-op-3',
          title: language === 'am' ? '1 POD አልተሰበሰበም' : '1 POD still open',
          description: language === 'am' ? 'Dry-port unload ከተጠናቀቀ በኋላ POD ማረጋገጫ ያስፈልጋል' : 'POD proof still missing after unload confirmation.',
          chip: 'POD',
          tone: 'warning',
          href: '/operations/dry-port-yard',
        },
      ],
      dispatchFollowUp: [
        {
          id: 'dispatch-1',
          title: language === 'am' ? 'Djibouti -> Adama convoy 14:00' : 'Djibouti -> Adama convoy 14:00',
          description: language === 'am' ? '3 ተሽከርካሪዎች ለመንቀሳቀስ ዝግጁ ናቸው' : '3 units ready once release file is attached.',
          chip: 'Convoy',
          tone: 'info',
          href: '/operations/corridor-dispatch',
        },
        {
          id: 'dispatch-2',
          title: language === 'am' ? 'Dry-port unload slot 13:20' : 'Dry-port unload slot 13:20',
          description: language === 'am' ? 'ያርድ ቡድን እና customs file ተያያዥ ነው' : 'Yard crew and customs handoff aligned.',
          chip: 'Yard',
          tone: 'good',
          href: '/operations/dry-port-yard',
        },
        {
          id: 'dispatch-3',
          title: language === 'am' ? 'Empty return booking needed' : 'Empty return booking needed',
          description: language === 'am' ? '2 ኮንቴነሮች በነገ እስከ 16:00 መመለስ አለባቸው' : '2 containers need Djibouti empty-return slots by tomorrow 16:00.',
          chip: 'Return',
          tone: 'warning',
          href: '/operations/empty-return',
        },
      ],
      maintenanceAlerts: [
        {
          id: 'confirm-1',
          title: language === 'am' ? '4 ደንበኞች የመቀበያ ማረጋገጫ እየጠበቁ ናቸው' : '4 customers still need receipt confirmation',
          description: language === 'am' ? 'POD እና receiving contact አልተዘጉም' : 'POD or receiving-contact confirmation is still open.',
          chip: 'Customer',
          tone: 'warning',
          href: '/operations/dry-port-yard',
        },
        {
          id: 'confirm-2',
          title: language === 'am' ? '2 ባዶ ኮንቴነሮች ወደ ጅቡቲ መመለስ አለባቸው' : '2 empties need return movement to Djibouti',
          description: language === 'am' ? 'return booking እና depot receipt አልተጠናቀቁም' : 'Return booking and depot receipt are still pending.',
          chip: 'Return',
          tone: 'critical',
          href: '/operations/empty-return',
        },
        {
          id: 'confirm-3',
          title: language === 'am' ? '1 unload file የማረጋገጫ ፎቶ ይፈልጋል' : '1 unload file still needs confirmation proof',
          description: language === 'am' ? 'photo / signature ሳይኖር ዑደቱ አይዘጋም' : 'Photo or signature proof is still required before closure.',
          chip: 'POD',
          tone: 'info',
          href: '/operations/dry-port-yard',
        },
      ],
    },
    attention: {
      alerts: [
        {
          id: 'alert-1',
          title: language === 'am' ? 'Customs hold note opened' : 'Customs hold note opened',
          description: language === 'am' ? '1 container ለinspection ተመርጧል' : '1 container selected for inspection review.',
          chip: 'Customs',
          tone: 'critical',
          href: '/operations/djibouti-release',
        },
        {
          id: 'alert-2',
          title: language === 'am' ? 'Storage free-time at 78%' : 'Storage free-time at 78%',
          description: language === 'am' ? 'Djibouti port storage exposure growing' : 'Djibouti storage exposure is climbing.',
          chip: 'Storage',
          tone: 'warning',
          href: '/operations/djibouti-release',
        },
        {
          id: 'alert-3',
          title: language === 'am' ? '2 receipt confirmations pending' : '2 receipt confirmations pending',
          description: language === 'am' ? 'Finance needs one final confirmation' : 'Finance still needs final confirmation to close.',
          chip: 'Finance',
          tone: 'info',
          href: '/finance',
        },
      ],
      tasks: [
        {
          id: 'task-1',
          title: language === 'am' ? 'Assign release owner for TRP-240319-11' : 'Assign release owner for TRP-240319-11',
          description: language === 'am' ? 'Djibouti clearance + dispatch' : 'Djibouti clearance + dispatch handoff',
          chip: 'Owner',
          tone: 'critical',
          href: '/operations/corridor-dispatch',
        },
        {
          id: 'task-2',
          title: language === 'am' ? 'Send thank-you note for Horizon Retail' : 'Send thank-you note for Horizon Retail',
          description: language === 'am' ? 'Receipt issued, appreciation still pending' : 'Receipt sent, appreciation still pending',
          chip: 'Finance',
          tone: 'good',
          href: '/finance',
        },
        {
          id: 'task-3',
          title: language === 'am' ? 'Push customs pack to assigned driver' : 'Push customs pack to assigned driver',
          description: language === 'am' ? 'BL + T1 + packing list + QR' : 'BL + T1 + packing list + QR',
          chip: 'Mobile',
          tone: 'info',
          href: '/operations/corridor-dispatch',
        },
      ],
      messages: [
        { id: 'msg-1', title: 'Kaliti Industrial PLC', subtitle: language === 'am' ? 'Release reminder acknowledged' : 'Release reminder acknowledged', channel: 'Telegram', href: '/chat' },
        { id: 'msg-2', title: 'Djibouti Port Agent', subtitle: language === 'am' ? 'Container discharge photos shared' : 'Container discharge photos shared', channel: 'Chat', href: '/chat' },
        { id: 'msg-3', title: 'Horizon Retail Group', subtitle: language === 'am' ? 'Receipt email delivered' : 'Receipt email delivered', channel: 'Email', href: '/finance' },
        { id: 'msg-4', title: 'Abel Hailu', subtitle: language === 'am' ? 'Checkpoint note submitted from Galafi' : 'Checkpoint note submitted from Galafi', channel: 'SMS', href: '/operations/corridor-dispatch' },
      ],
    },
    journeys,
    shipment,
  };
}

function buildManualJourneyTimeline(
  stageIndex: number,
  timestamps: Partial<Record<number, string>>,
): CorridorTimelineItem[] {
  return shipmentWorkflowStages.map((stage, index) => ({
    stage,
    timestamp: timestamps[index] || '',
    status: index < stageIndex ? 'done' : index == stageIndex ? 'active' : 'pending',
  }));
}

function buildManualJourneyEntries(
  language: 'en' | 'am',
  fallbackItems: CargoItem[],
): ExecutiveTabData['journeys'] {
  if (typeof window === 'undefined') return [];

  const bookingRequests = readStoredExecutiveArray<UnifiedBookingRequest>(bookingQuoteStorageKey, seededBookingRequests);
  const dispatchTrips = readManualDispatchTrips();
  const releaseRecords = readManualDjiboutiReleaseRecords();
  const yardRecords = readManualYardRecords();
  const shippingWorkspace = readShippingPhase1Workspace();
  const movementByBooking = new Map(shippingWorkspace.containerMovements.map((item) => [item.bookingId, item] as const));
  const shippingBookingByBooking = new Map(shippingWorkspace.bookings.map((item) => [item.bookingId, item] as const));

  const dispatchByBooking = new Map(dispatchTrips.map((trip) => [trip.bookingNumber, trip] as const));
  const releaseByBooking = new Map(releaseRecords.map((record) => [record.bookingNumber, record] as const));
  const yardByBooking = new Map(yardRecords.map((record) => [record.bookingNumber, record] as const));
  const bookingByBooking = new Map(
    bookingRequests
      .filter((request) => Boolean(request.bookingId))
      .map((request) => [request.bookingId, request] as const),
  );
  const bookingRefs = Array.from(
    new Set([
      ...bookingRequests.filter((request) => Boolean(request.bookingId)).map((request) => request.bookingId),
      ...releaseRecords.map((record) => record.bookingNumber),
      ...dispatchTrips.map((trip) => trip.bookingNumber),
      ...yardRecords.map((record) => record.bookingNumber),
    ]),
  );

  return bookingRefs
    .map((bookingNumber) => {
      const booking = bookingByBooking.get(bookingNumber);
      const yard = yardByBooking.get(bookingNumber);
      const dispatch = dispatchByBooking.get(bookingNumber);
      const release = releaseByBooking.get(bookingNumber);
      const movement = movementByBooking.get(bookingNumber);
      const shippingBooking = shippingBookingByBooking.get(bookingNumber);

      if (!booking && !release && !dispatch && !yard) return null;

      const customerName = yard?.customerName || dispatch?.customerName || release?.customerName || booking?.customerName || bookingNumber;
      const serviceType = yard?.serviceType || dispatch?.serviceType || release?.serviceType || booking?.serviceType || 'multimodal';
      const blNumber = release?.blNumber || dispatch?.blNumber || yard?.blNumber || 'Pending BL';
      const containerNumber =
        yard?.containerNumber ||
        dispatch?.containerNumber ||
        release?.containerNumber ||
        (booking?.containerType ? `${booking.containerType} planned` : 'Pending container');
      const sealNumber = yard?.sealNumber || dispatch?.sealNumber || release?.sealNumber || 'Pending seal';
      const etaSource = yard?.arrivalControl.eta || dispatch?.expectedArrivalTime || release?.expectedGateOutTime || '';

      let stageIndex = 0;
      let stage = language === 'am' ? 'ቡኪንግ / ኮቴሽን' : 'Booking / Quote';
      let exception = language === 'am' ? 'አዲስ ቡኪንግ በቻይና መነሻ ዴስክ ይጠብቃል' : 'Fresh booking is waiting in the China origin desk';

      if (yard && (yard.yardStage === 'Cycle closed' || yard.emptyReturn.status === 'Cycle closed')) {
        stageIndex = 9;
        stage = language === 'am' ? 'ዝግ ተደርጓል' : 'Closed';
        exception = language === 'am' ? 'የደንበኛ ማረጋገጫ እና የባዶ መመለስ ተጠናቀዋል' : 'Customer receipt and empty return are complete';
      } else if (yard && (yard.emptyReturn.emptyReleaseGranted || yard.emptyReturn.emptyReturned)) {
        stageIndex = 8;
        stage = language === 'am' ? 'ባዶ መመለስ' : 'Empty return';
        exception = language === 'am' ? 'የባዶ መመለስ ቁጥጥር እየተጠናቀቀ ነው' : 'Empty return controls are in progress';
      } else if (yard && (yard.podReadiness.deliveryNoteStatus === 'Prepared' || yard.consigneeHandoff.handoffStatus === 'Completed')) {
        stageIndex = 7;
        stage = language === 'am' ? 'ማራገፍ / የደንበኛ ማረጋገጫ' : 'Unload / customer confirmation';
        exception = language === 'am' ? 'POD እና የደንበኛ ማረጋገጫ በሂደት ላይ ነው' : 'POD and customer receipt are in progress';
      } else if (yard?.arrivalControl.actualArrivalTime) {
        stageIndex = 6;
        stage = language === 'am' ? 'የውስጥ መድረስ' : 'Inland arrival';
        exception = language === 'am' ? 'ያርድ ሂደት እየተቀጠለ ነው' : 'Yard handling is in progress';
      } else if (yard?.arrivalControl.actualArrivalTime || movement?.currentStatus === 'Arrived inland') {
        stageIndex = 6;
        stage = language === 'am' ? 'የውስጥ መድረስ' : 'Inland arrival';
        exception = language === 'am' ? `የኮንቴነር ክትትል ቦታ ${movement?.currentLocation || 'ያርድ'} ያሳያል` : `Container tracking shows arrival at ${movement?.currentLocation || 'yard'}`;
      } else if (dispatch?.currentTripStatus === 'In transit' || movement?.currentStatus === 'In transit' || dispatch?.currentTripStatus === 'Arrived inland' || dispatch?.currentTripStatus === 'Awaiting unload handoff') {
        stageIndex = 5;
        stage = language === 'am' ? 'የውስጥ መኪና ጉዞ' : 'Inland truck transit';
        exception =
          language === 'am'
            ? `መኪናው በኮሪደሩ ላይ ነው · ${movement?.currentLocation || dispatch?.liveMovement?.currentLocation || 'አዲስ አካባቢ የለም'}`
            : `Truck is moving on the corridor · ${movement?.currentLocation || dispatch?.liveMovement?.currentLocation || 'No live location yet'}`;
      } else if (dispatch) {
        stageIndex = 4;
        stage = language === 'am' ? 'ትራንዚተር / ክሊራንስ' : 'Transitor / clearance';
        exception = language === 'am' ? 'የትራንዚት ሰነዶች እና ክሊራንስ ሂደት በመጨረሻ ዝግጅት ላይ ነው' : 'Transit documents and clearance are being finalized';
      } else if (release?.inlandHandoffSent || release?.gateOutReady || release?.lineReleaseReceived) {
        stageIndex = 3;
        stage = language === 'am' ? 'ጅቡቲ ሪሊዝ' : 'Djibouti release';
        exception = language === 'am' ? 'ሪሊዝ እና ጌት-አውት ቁጥጥር በሂደት ላይ ነው' : 'Release and gate-out controls are in progress';
      } else if (release) {
        stageIndex = 2;
        stage = language === 'am' ? 'መርከብ ጉዞ' : 'Ocean transit';
        exception = language === 'am' ? 'ማኑዋል ኦሽን ሃንድኦፍ ተቀባይነት አግኝቷል' : 'Manual ocean handoff has been received';
      } else if (booking) {
        if (shippingBooking) {
          stageIndex = 1;
          stage = shippingBooking.currentStage;
          exception =
            language === 'am'
              ? `${shippingBooking.responsibleDesk} · ${shippingNextActionLabel(shippingBooking.nextAction)}`
              : `${shippingBooking.responsibleDesk} · ${shippingNextActionLabel(shippingBooking.nextAction)}`;
        } else if (booking.quoteStatus === 'assigned_to_origin' || booking.bookingStatus === 'assigned_to_origin') {
          stageIndex = 1;
          stage = language === 'am' ? 'መነሻ ዝግጅት' : 'Origin preparation';
          exception = language === 'am' ? 'ቡኪንግ ወደ ቻይና መነሻ ዴስክ ተመድቧል' : `Booking assigned to ${booking.assignedOriginAgentEmail || 'origin desk'}`;
        } else if (booking.quoteStatus === 'quote_accepted') {
          stageIndex = 0;
          stage = language === 'am' ? 'ቡኪንግ / ኮቴሽን' : 'Booking / Quote';
          exception = language === 'am' ? 'ኮቴሽኑ ጸድቋል እና ቡኪንግ ይጠብቃል' : 'Quote accepted and waiting for booking conversion';
        } else {
          stageIndex = 0;
          stage = language === 'am' ? 'ቡኪንግ / ኮቴሽን' : 'Booking / Quote';
          exception = language === 'am' ? 'ኮቴሽን እየተከታተለ ነው' : 'Booking request is still in the quote stage';
        }
      }

      const timeline = buildManualJourneyTimeline(stageIndex, {
        0: booking?.updatedAt || '',
        3: release?.lastUpdated || '',
        4: dispatch?.plannedDepartureTime || '',
        5: dispatch?.lastUpdated || '',
        6: yard?.arrivalControl.actualArrivalTime || '',
        7: yard?.consigneeHandoff.handoffTime || '',
        8: yard?.emptyReturn.returnTimestamp || '',
        9: yard && (yard.yardStage === 'Cycle closed' || yard.emptyReturn.status === 'Cycle closed') ? yard.lastUpdated : '',
      });

      return {
        sortTimestamp: yard?.lastUpdated || dispatch?.lastUpdated || release?.lastUpdated || booking?.updatedAt || booking?.createdAt || '',
        shipmentRef: bookingNumber,
        customerName,
        serviceMode: serviceType === 'multimodal' ? (language === 'am' ? 'መልቲሞዳል' : 'Multimodal') : (language === 'am' ? 'ዩኒሞዳል' : 'Unimodal'),
        blNumber,
        containerNumber,
        sealNumber,
        eta: etaSource ? new Date(etaSource).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '',
        stage,
        containerStage: movement?.currentStatus || (yard?.emptyReturn.emptyReturned ? 'Empty returned' : dispatch?.currentTripStatus || release?.currentStage || 'Booked'),
        containerLocation: movement?.currentLocation || dispatch?.liveMovement?.currentLocation || yard?.inlandNode || release?.dischargePort || booking?.portOfLoading || '',
        exception,
        timeline,
        items: fallbackItems,
      };
    })
    .filter(
      (
        item,
      ): item is ExecutiveTabData['journeys'][number] & {
        sortTimestamp: string;
      } => item !== null,
    )
    .sort((a, b) => compareExecutiveQueueOrder(a, b))
    .map(({ sortTimestamp: _sortTimestamp, ...item }) => item);
}

function readStoredExecutiveArray<T>(key: string, fallback: T[]) {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function buildManualDemurrageInsights(language: 'en' | 'am') {
  if (typeof window === 'undefined') {
    return {
      overviewUrgent: [] as ExecutiveMetric[],
      attentionAlerts: [] as InsightRow[],
    };
  }

  const nowMs = new Date('2026-03-20T23:59:59Z').getTime();
  const manualYardRecords = readManualYardRecords();
  const manualIds = new Set(manualYardRecords.map((record) => record.id));
  const activeDemurrage = [...manualYardRecords, ...dryPortYardRecords.filter((record) => !manualIds.has(record.id))].filter((record) => {
    const arrivalAt = record.arrivalControl.actualArrivalTime || record.arrivalTimestamp || record.arrivalControl.eta;
    const arrivalMs = new Date(arrivalAt).getTime();
    const chargeStartsAtMs = Number.isNaN(arrivalMs) ? Number.NaN : arrivalMs + 24 * 60 * 60 * 1000;
    return (
      !Number.isNaN(chargeStartsAtMs) &&
      nowMs >= chargeStartsAtMs &&
      record.emptyReturn.detentionRiskOpen &&
      !record.emptyReturn.returnReceiptAvailable
    );
  });

  return {
    overviewUrgent: activeDemurrage.length > 0
      ? [{
          label: language === 'am' ? 'የደረቅ ወደብ ዲመሬጅ ንቁ' : 'Dry-port demurrage active',
          value: activeDemurrage.length,
          helper: language === 'am' ? 'ከመድረሱ 24 ሰዓት በኋላ ክፍያ የጀመሩ ፋይሎች' : 'Files that crossed 24 hours after inland arrival',
          tone: 'critical' as const,
          href: '/operations/dry-port-yard',
        }]
      : [],
    attentionAlerts: activeDemurrage.slice(0, 3).map((record, index) => ({
      id: `manual-demurrage-${record.tripId}-${index}`,
      title: language === 'am'
        ? `${record.bookingNumber} የደረቅ ወደብ ዲመሬጅ`
        : `${record.bookingNumber} dry-port demurrage`,
      description: language === 'am'
        ? `${record.customerName} ላይ ከ24 ሰዓት በኋላ የደረቅ ወደብ ክፍያ ንቁ ነው`
        : `${record.customerName} has active dry-port demurrage after the 24-hour threshold`,
      chip: 'Demurrage',
      tone: 'critical' as const,
      href: '/operations/dry-port-yard',
    })),
  };
}

function buildTrackingIncidentInsights(language: 'en' | 'am') {
  if (typeof window === 'undefined') {
    return {
      attentionAlerts: [] as InsightRow[],
    };
  }
  const shippingWorkspace = readShippingPhase1Workspace();
  return {
    attentionAlerts: shippingWorkspace.incidents
      .filter((incident) => incident.status === 'open')
      .slice(0, 5)
      .map((incident, index) => ({
        id: `tracking-incident-${incident.id}-${index}`,
        title: incident.title,
        description:
          language === 'am'
            ? `${incident.bookingId} · ${incident.containerNumber} · ${incident.description}`
            : `${incident.bookingId} · ${incident.containerNumber} · ${incident.description}`,
        chip: 'Tracking',
        tone: incident.severity,
        href: '/shipping/tracking',
      })),
  };
}

function buildAfterSalesInsights(language: 'en' | 'am') {
  if (typeof window === 'undefined') {
    return {
      attentionAlerts: [] as InsightRow[],
    };
  }
  const shippingWorkspace = readShippingPhase1Workspace();
  return {
    attentionAlerts: shippingWorkspace.afterSales
      .filter((item) => item.status === 'open' || item.status === 'feedback_pending')
      .slice(0, 5)
      .map((item, index) => ({
        id: `after-sales-${item.bookingId}-${index}`,
        title:
          item.status === 'open'
            ? (language === 'am' ? `${item.bookingId} የደንበኛ አገልግሎት ጉዳይ` : `${item.bookingId} customer after-sales case`)
            : (language === 'am' ? `${item.bookingId} የአስተያየት ክትትል` : `${item.bookingId} feedback pending`),
        description:
          language === 'am'
            ? `${item.customerName} · ${item.summary}`
            : `${item.customerName} · ${item.summary}`,
        chip: 'After-sales',
        tone: item.status === 'open' ? ('warning' as const) : ('info' as const),
        href: '/shipping/after-sales',
      })),
  };
}

function buildCarrierScheduleInsights(language: 'en' | 'am') {
  if (typeof window === 'undefined') {
    return {
      attentionAlerts: [] as InsightRow[],
    };
  }
  const shippingWorkspace = readShippingPhase1Workspace();
  return {
    attentionAlerts: shippingWorkspace.carrierAlerts.slice(0, 5).map((alert, index) => ({
      id: `carrier-schedule-${alert.id}-${index}`,
      title: language === 'am' ? alert.title : alert.title,
      description: language === 'am' ? alert.description : alert.description,
      chip: 'Carrier',
      tone: alert.tone,
      href: alert.href,
    })),
  };
}

function buildShippingGateInsights(language: 'en' | 'am') {
  if (typeof window === 'undefined') {
    return {
      attentionAlerts: [] as InsightRow[],
    };
  }
  const shippingWorkspace = readShippingPhase1Workspace();
  return {
    attentionAlerts: shippingWorkspace.bookings
      .filter((item) => item.currentStage !== 'Shipping packet complete')
      .slice(0, 5)
      .map((item, index) => ({
        id: `shipping-gate-${item.bookingId}-${index}`,
        title: language === 'am' ? `${item.bookingId} የሽፒንግ እገዳ` : `${item.bookingId} shipping gate blocker`,
        description: language === 'am'
          ? `${shippingStageLabel(item.currentStage)} · ${item.responsibleDesk} · ${shippingNextActionLabel(item.nextAction)}`
          : `${shippingStageLabel(item.currentStage)} · ${item.responsibleDesk} · ${shippingNextActionLabel(item.nextAction)}`,
        chip: 'Shipping',
        tone: item.currentStage.includes('validation') || item.currentStage.includes('finance') ? ('warning' as const) : ('info' as const),
        href: shippingDeskLink(item.currentStage).href,
        actionLabel: shippingDeskLink(item.currentStage).label,
      })),
  };
}

function normalizeTab(value: string | null | undefined): ExecutiveTab {
  return value === 'journey' || value === 'finance' || value === 'operations' || value === 'attention' ? value : 'overview';
}

function normalizeExecutiveData(
  language: 'en' | 'am',
  payload?: ExecutiveWorkspacePayload,
): ExecutiveTabData {
  const fallback = buildExecutiveData(language);
  if (!payload) return fallback;

  return {
    generatedAt: payload.generatedAt ?? fallback.generatedAt,
    overview: {
      urgent: payload.overview?.urgent ?? fallback.overview.urgent,
      moving: payload.overview?.moving ?? fallback.overview.moving,
      risks: payload.overview?.risks ?? fallback.overview.risks,
      opportunities: payload.overview?.opportunities ?? fallback.overview.opportunities,
      actions: payload.overview?.actions ?? fallback.overview.actions,
    },
    finance: {
      metrics: payload.finance?.metrics ?? fallback.finance.metrics,
      quickActions: payload.finance?.quickActions ?? fallback.finance.quickActions,
      topCustomers: payload.finance?.topCustomers ?? fallback.finance.topCustomers,
      recentPayments: payload.finance?.recentPayments ?? fallback.finance.recentPayments,
    },
    operations: {
      summary: payload.operations?.summary ?? fallback.operations.summary,
      points: payload.operations?.points ?? fallback.operations.points,
      selectedVehicles: payload.operations?.selectedVehicles ?? fallback.operations.selectedVehicles,
      routeHistory: payload.operations?.routeHistory ?? fallback.operations.routeHistory,
      highRisk: payload.operations?.highRisk ?? fallback.operations.highRisk,
      dispatchFollowUp: payload.operations?.dispatchFollowUp ?? fallback.operations.dispatchFollowUp,
      maintenanceAlerts: payload.operations?.maintenanceAlerts ?? fallback.operations.maintenanceAlerts,
    },
    attention: {
      alerts: payload.attention?.alerts ?? fallback.attention.alerts,
      tasks: payload.attention?.tasks ?? fallback.attention.tasks,
      messages: payload.attention?.messages ?? fallback.attention.messages,
    },
    journeys: payload.journeys ?? fallback.journeys,
    shipment: {
      shipmentRef: payload.shipment?.shipmentRef ?? fallback.shipment.shipmentRef,
      customerName: (payload.shipment as Partial<ExecutiveTabData['shipment']> | undefined)?.customerName ?? fallback.shipment.customerName,
      serviceMode: payload.shipment?.serviceMode ?? fallback.shipment.serviceMode,
      blNumber: payload.shipment?.blNumber ?? fallback.shipment.blNumber,
      containerNumber: payload.shipment?.containerNumber ?? fallback.shipment.containerNumber,
      sealNumber: payload.shipment?.sealNumber ?? fallback.shipment.sealNumber,
      eta: payload.shipment?.eta ?? fallback.shipment.eta,
      stage: payload.shipment?.stage ?? fallback.shipment.stage,
      containerStage: payload.shipment?.containerStage ?? fallback.shipment.containerStage,
      containerLocation: payload.shipment?.containerLocation ?? fallback.shipment.containerLocation,
      exception: payload.shipment?.exception ?? fallback.shipment.exception,
      timeline: payload.shipment?.timeline ?? fallback.shipment.timeline,
      items: payload.shipment?.items ?? fallback.shipment.items,
    },
  };
}

function toneClass(tone: ExecutiveMetric['tone']) {
  return `tone-${tone}`;
}

function metricValue(metric: ExecutiveMetric | undefined) {
  return typeof metric?.value === 'number' ? metric.value : 0;
}

function deskLabelFromHref(href: string) {
  if (href.includes('/operations/booking')) return 'Booking / Quote Desk';
  if (href.includes('/operations/djibouti-release')) return 'Djibouti Release Desk';
  if (href.includes('/operations/transitor-clearance')) return 'Transitor / Clearance Desk';
  if (href.includes('/operations/corridor-dispatch')) return 'Corridor Dispatch';
  if (href.includes('/operations/dry-port-yard')) return 'Yard / Delivery Desk';
  if (href.includes('/operations/empty-return')) return 'Empty Return Control';
  return 'Operations Desk';
}

function shipmentWorkflowIndexFromShipment(shipment: ExecutiveTabData['shipment']) {
  const stage = shipment.stage.toLowerCase();
  if (stage.includes('closed')) return 9;
  if (stage.includes('yard') || stage.includes('customer') || stage.includes('pod') || stage.includes('unload')) return 8;
  if (stage.includes('dispatch') || stage.includes('inland') || stage.includes('truck')) return 7;
  if (stage.includes('release authorization') || stage.includes('authorize cargo release')) return 6;
  if (stage.includes('finance') || stage.includes('payment') || stage.includes('lc') || stage.includes('settlement')) return 5;
  if (stage.includes('clearance') || stage.includes('transitor')) return 4;
  if (stage.includes('release') || stage.includes('djibouti')) return 3;
  if (stage.includes('shipping') || stage.includes('manifest') || stage.includes('bill of lading') || stage.includes('instruction') || stage.includes('ocean') || stage.includes('vessel')) return 2;
  if (stage.includes('stuffing') || stage.includes('gate-in') || stage.includes('origin')) return 1;
  return 0;
}

function containerLifecycleIndexFromShipment(shipment: ExecutiveTabData['shipment']) {
  const stage = shipment.containerStage.toLowerCase();
  if (stage.includes('empty returned') || stage.includes('cycle closed')) return 16;
  if (stage.includes('empty return in progress') || stage.includes('empty in return transit')) return 15;
  if (stage.includes('ready for empty release')) return 14;
  if (stage.includes('arrived inland') || stage.includes('yard handoff') || stage.includes('unloaded inland') || stage.includes('full_in')) return 13;
  if (stage.includes('out for delivery') || stage.includes('in transit')) return 12;
  if (stage.includes('truck assigned')) return 11;
  if (stage.includes('customs cleared')) return 10;
  if (stage.includes('available for clearance')) return 9;
  if (stage.includes('discharged')) return 8;
  if (stage.includes('vessel arrived')) return 7;
  if (stage.includes('transshipment')) return 6;
  if (stage.includes('vessel departed')) return 5;
  if (stage.includes('loaded on vessel')) return 4;
  if (stage.includes('gate-in')) return 3;
  if (stage.includes('loaded at shipper')) return 2;
  if (stage.includes('pickup')) return 1;
  if (stage.includes('empty release')) return 0;
  return 0;
}

const ExecutiveHero = memo(function ExecutiveHero({ language, generatedAt }: { language: 'en' | 'am'; generatedAt: string }) {
  const c = copyFor(language);
  return (
    <section className="executive-hero-card">
      <div className="executive-hero-copy">
        <span className="eyebrow">{c.overviewEyebrow}</span>
        <h1>{c.heroTitle}</h1>
        <p>One control surface for quote, origin, release, dispatch, yard, and closure state.</p>
        <div className="executive-hero-meta">
          <span>{c.generatedHelper}</span>
          <span>{formatDate(language, generatedAt)}</span>
        </div>
      </div>
      <div className="executive-hero-banner executive-hero-summary">
        <div className="executive-hero-summary-head">
          <span className="eyebrow">Executive control</span>
          <h3>Corridor command</h3>
          <div className="executive-row-actions">
            <Link href="/operations/booking">Booking intake</Link>
            <Link href="/operations/transitor-clearance">Clearance queue</Link>
          </div>
        </div>
        <div className="executive-hero-summary-grid">
          <article className="executive-hero-summary-card">
            <span>Origin</span>
            <strong>6</strong>
            <p>Origin files still moving through stuffing or handoff.</p>
          </article>
          <article className="executive-hero-summary-card">
            <span>Release</span>
            <strong>5</strong>
            <p>Release and customs blockers needing action.</p>
          </article>
          <article className="executive-hero-summary-card">
            <span>Closure</span>
            <strong>11</strong>
            <p>POD, receipt, or empty-return control still open.</p>
          </article>
        </div>
      </div>
    </section>
  );
});

const ExecutiveJourneyStrip = memo(function ExecutiveJourneyStrip({
  shipment,
}: {
  shipment: ExecutiveTabData['shipment'];
}) {
  const activeIndex = shipmentWorkflowIndexFromShipment(shipment);
  const timelineByStage = new Map(
    shipment.timeline.map((item) => [item.stage.toLowerCase(), item]),
  );
  return (
    <section className="card executive-journey-strip">
      <div className="executive-section-header">
        <div>
          <div className="eyebrow">Shipment workflow</div>
          <h3>{shipment.shipmentRef}</h3>
        </div>
        <span className="executive-chip tone-good">{shipmentWorkflowStages[activeIndex]}</span>
      </div>
      <div className="executive-journey-grid">
        {shipmentWorkflowStages.map((stage, index) => {
          const isTerminalActive = index === activeIndex && activeIndex === shipmentWorkflowStages.length - 1;
          const state = index < activeIndex || isTerminalActive ? 'done' : index === activeIndex ? 'active' : 'next';
          const timelineItem = timelineByStage.get(stage.toLowerCase());
          return (
            <div key={stage} className={`executive-journey-step ${state}`}>
              <span>{index + 1}</span>
              <strong>{stage}</strong>
              <p>{timelineItem ? timelineItem.timestamp : state === 'next' ? 'Pending' : 'In progress'}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
});

const ExecutiveContainerLifecycleStrip = memo(function ExecutiveContainerLifecycleStrip({
  shipment,
}: {
  shipment: ExecutiveTabData['shipment'];
}) {
  const activeIndex = containerLifecycleIndexFromShipment(shipment);
  return (
    <section className="card executive-journey-strip">
      <div className="executive-section-header">
        <div>
          <div className="eyebrow">Container lifecycle</div>
          <h3>{shipment.containerNumber || 'Container pending'}</h3>
        </div>
        <span className="executive-chip tone-info">{shipment.containerStage}</span>
      </div>
      <div className="executive-command-topline">
        <strong>{shipment.containerNumber || 'Container pending'}</strong>
        <span>{shipment.sealNumber || 'Seal pending'}</span>
        <span>{shipment.containerLocation || 'Location pending'}</span>
      </div>
      <div className="executive-journey-grid">
        {containerLifecycleStages.map((stage, index) => {
          const isTerminalActive = index === activeIndex && activeIndex === containerLifecycleStages.length - 1;
          const state = index < activeIndex || isTerminalActive ? 'done' : index === activeIndex ? 'active' : 'next';
          return (
            <div key={stage} className={`executive-journey-step ${state}`}>
              <span>{index + 1}</span>
              <strong>{stage}</strong>
              <p>{index === activeIndex ? shipment.containerLocation || 'In progress' : state === 'next' ? 'Pending' : 'Completed'}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
});

function ExecutiveCommandHeader({
  shipment,
}: {
  shipment: ExecutiveTabData['shipment'];
}) {
  const blockerDesk = shippingDeskLink(shipment.stage);
  return (
    <section className="card executive-command-header">
      <div className="executive-section-header">
        <div>
          <div className="eyebrow">Shipment command</div>
          <h3>{shipment.customerName}</h3>
        </div>
        <div className="executive-row-actions">
          <span className="executive-chip tone-info">{shipment.serviceMode}</span>
          {shipment.stage !== 'Closed' ? <Link href={blockerDesk.href}>{blockerDesk.label}</Link> : null}
        </div>
      </div>
      <div className="executive-command-topline">
        <strong>{shipment.shipmentRef}</strong>
        <span>{shipment.containerNumber || 'Container pending'}</span>
        <span>{shipment.blNumber || 'BL pending'}</span>
      </div>
      <div className="executive-command-grid">
        <div className="executive-command-cell">
          <span>Current corridor truth</span>
          <strong>{shipment.stage}</strong>
        </div>
        <div className="executive-command-cell">
          <span>Operational focus</span>
          <strong>{shipment.exception}</strong>
        </div>
        <div className="executive-command-cell">
          <span>Container / seal</span>
          <strong>{shipment.containerNumber} · {shipment.sealNumber}</strong>
        </div>
        <div className="executive-command-cell">
          <span>BL / ETA</span>
          <strong>{shipment.blNumber} · {shipment.eta}</strong>
        </div>
      </div>
    </section>
  );
}

function ExecutiveOverviewCommand({
  language,
  priority,
  queue,
  primaryMetrics,
  onRequestUpdate,
}: {
  language: 'en' | 'am';
  priority: ShipmentAttentionItem | null;
  queue: ShipmentAttentionItem[];
  primaryMetrics: ExecutiveMetric[];
  onRequestUpdate: (target: CommunicationDrawerTarget) => void;
}) {
  const aiSuggestion = useMemo<ExecutiveAiSuggestion | null>(() => {
    if (priority) {
      return {
        title: `Prioritize ${priority.bookingNumber} handoff`,
        reason: `${priority.blockerLabel} is blocking flow under ${priority.ownerRole}, increasing delay risk for ${priority.shipmentId}.`,
        tag:
          priority.blocker === 'no_checkpoint_update'
            ? 'Dispatch blocker'
            : priority.ownerRole.toLowerCase().includes('release')
              ? 'Release blocker'
              : priority.ownerRole.toLowerCase().includes('clearance')
                ? 'Customer delay'
                : 'Critical risk',
        tone: priority.riskState === 'Critical' ? 'critical' : priority.riskState === 'High' ? 'warning' : 'info',
        href: priority.deskHref,
        actionLabel: 'Open Shipment',
        meta: `Owner: ${priority.currentOwner}`,
      };
    }

    const quoteBacklog = primaryMetrics.find((item) => item.label === 'Quotes pending');
    if (quoteBacklog && metricValue(quoteBacklog) > 0) {
      return {
        title: `Review ${metricValue(quoteBacklog)} bookings awaiting quote action`,
        reason: 'Commercial approvals are still open and can delay origin planning and booking conversion.',
        tag: 'Revenue delay',
        tone: 'warning',
        href: '/operations/booking-quote',
        actionLabel: 'Open Booking Queue',
        meta: 'Based on intake backlog',
      };
    }

    const emptyReturn = primaryMetrics.find((item) => item.label === 'Awaiting Clearance');
    if (emptyReturn && metricValue(emptyReturn) > 0) {
      return {
        title: `Clear ${metricValue(emptyReturn)} files before dispatch`,
        reason: 'Transit documentation or charge readiness is still blocking downstream dispatch release.',
        tag: 'Dispatch blocker',
        tone: 'warning',
        href: '/operations/transitor-clearance',
        actionLabel: 'Open Clearance Desk',
      };
    }

    return null;
  }, [primaryMetrics, priority]);

  return (
    <>
      <section className="executive-ops-grid">
        <section className="card executive-ops-section">
          <div className="executive-section-header">
            <div>
              <div className="eyebrow">Operations health</div>
              <h3>Critical corridor KPIs</h3>
            </div>
          </div>
          <div className="executive-ops-kpi-row">
            {primaryMetrics.map((item) => <KpiCard key={item.label} language={language} item={item} />)}
          </div>
        </section>

        {aiSuggestion ? (
          <section className="card executive-ops-section executive-ai-suggestion-card">
            <div className="executive-ai-suggestion-row">
              <div className="executive-ai-suggestion-main">
                <div className="executive-ai-suggestion-heading">
                  <span className="executive-ai-suggestion-icon" aria-hidden="true">AI</span>
                  <div>
                    <div className="eyebrow">AI Suggested Next Action</div>
                    <h3>{aiSuggestion.title}</h3>
                  </div>
                </div>
                <div className="executive-ai-suggestion-body">
                  <p>{aiSuggestion.reason}</p>
                  {aiSuggestion.meta ? (
                    <div className="executive-ai-suggestion-meta">
                      <span className="executive-ai-suggestion-meta-label">Owner</span>
                      <strong>{aiSuggestion.meta.replace(/^Owner:\s*/, '')}</strong>
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="executive-ai-suggestion-side">
                <span className={`executive-chip ${toneClass(aiSuggestion.tone)}`}>{aiSuggestion.tag}</span>
                <Link href={aiSuggestion.href} className="btn btn-compact">
                  {aiSuggestion.actionLabel}
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        {priority ? (
          <section className="card executive-ops-section executive-attention-now-card">
            <div className="executive-section-header">
              <div>
                <div className="eyebrow">Attention now</div>
                <h3>Current critical shipment</h3>
              </div>
            </div>
            <div className="executive-attention-now-top">
              <strong>{priority.bookingNumber}</strong>
              <span className={`executive-chip ${toneClass(priority.riskState === 'Critical' ? 'critical' : priority.riskState === 'High' ? 'warning' : 'info')}`}>{priority.riskState}</span>
            </div>
            <div className="executive-attention-now-body">
              <div><span>Shipment ID</span><strong>{priority.shipmentId}</strong></div>
              <div><span>Blocker</span><strong>{priority.blockerLabel}</strong></div>
              <div><span>Owner</span><strong>{priority.currentOwner}</strong></div>
              <div><span>Desk</span><strong>{priority.ownerRole}</strong></div>
              <div><span>Next action</span><strong>{priority.nextAction}</strong></div>
            </div>
            <div className="executive-row-actions">
              <button
                type="button"
                className="btn btn-secondary btn-compact"
                onClick={() =>
                  onRequestUpdate({
                    entityType: 'shipment',
                    entityId: priority.shipmentId,
                    title: priority.bookingNumber,
                    subtitle: `Request update from ${priority.ownerRole}`,
                    defaultTemplate: 'dispatch_follow_up',
                    severity: priority.riskState === 'Critical' ? 'high' : 'medium',
                  })
                }
              >
                Request update
              </button>
              <Link href={priority.deskHref}>Open shipment</Link>
            </div>
          </section>
        ) : null}

        {queue.length > 0 ? (
          <section className="card executive-ops-section">
            <div className="executive-section-header">
              <div>
                <div className="eyebrow">Attention queue</div>
                <h3>Next shipments needing attention</h3>
              </div>
            </div>
            <div className="executive-queue-list">
              {queue.map((item) => (
                <article key={`${item.bookingNumber}-${item.blocker}`} className="executive-queue-row">
                  <strong>{item.bookingNumber}</strong>
                  <span>{item.blockerLabel}</span>
                  <span>{deskLabelFromHref(item.deskHref)}</span>
                  <span>{item.currentOwner}</span>
                  <span className={`executive-chip ${toneClass(item.riskState === 'Critical' ? 'critical' : item.riskState === 'High' ? 'warning' : 'info')}`}>{item.riskState}</span>
                  <Link href={item.deskHref}>{item.nextAction}</Link>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </section>
    </>
  );
}

function ExecutiveJourneyWorkspace({
  shipments,
  selectedShipmentRef,
  onSelectShipment,
  language,
}: {
  shipments: ExecutiveTabData['journeys'];
  selectedShipmentRef: string;
  onSelectShipment: (shipmentRef: string) => void;
  language: 'en' | 'am';
}) {
  const copy = copyFor(language);
  const selectedShipment = shipments.find((item) => item.shipmentRef === selectedShipmentRef) ?? shipments[0];
  if (!selectedShipment) return null;

  return (
    <div className="executive-tab-content">
      <section className="executive-journey-workspace">
        <article className="card executive-journey-list-panel">
          <div className="executive-section-header">
            <div>
              <div className="eyebrow">Shipment queue</div>
              <h3>{copy.trackedShipments}</h3>
            </div>
            <span className="executive-chip tone-info">{shipments.length} files</span>
          </div>
          <div className="executive-journey-list">
            {shipments.map((item) => (
              <button
                key={item.shipmentRef}
                type="button"
                className={item.shipmentRef === selectedShipment.shipmentRef ? 'executive-journey-list-item active' : 'executive-journey-list-item'}
                onClick={() => onSelectShipment(item.shipmentRef)}
                data-testid={`executive-journey-row-${item.shipmentRef}`}
              >
                <div className="executive-journey-list-head">
                  <strong>{item.shipmentRef}</strong>
                  <span className="executive-chip tone-info">{shipmentWorkflowStages[shipmentWorkflowIndexFromShipment(item)]}</span>
                </div>
                <span>{item.customerName}</span>
                <div className="executive-journey-list-meta">
                  <span>{item.containerNumber || 'Container pending'}</span>
                  <span>{item.blNumber || 'BL pending'}</span>
                </div>
              </button>
            ))}
          </div>
        </article>

        <div className="executive-journey-detail">
          <ExecutiveControlTower />
          <ExecutiveCommandHeader shipment={selectedShipment} />

          <section className="executive-journey-lower-grid">
            <section className="card executive-cargo-panel">
              <div className="executive-section-header">
                <div>
                  <div className="eyebrow">Cargo items</div>
                  <h3>Shipment contents</h3>
                </div>
                <span className="executive-chip tone-info">{selectedShipment.items.length} lines</span>
              </div>
              <div className="executive-side-list">
                {selectedShipment.items.map((item) => (
                  <article key={`${selectedShipment.shipmentRef}-${item.lineNumber}`} className="executive-side-row">
                    <div className="executive-side-row-head">
                      <h3>Line {item.lineNumber} · {item.description}</h3>
                      <span className="executive-chip tone-info">{item.hsCode}</span>
                    </div>
                    <p>{item.packageQuantity} {item.packageType} · {item.grossWeight.toLocaleString()} kg gross · {item.cbm.toFixed(1)} CBM</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="card executive-spec-panel">
              <div className="executive-section-header">
                <div>
                  <div className="eyebrow">Control spec</div>
                  <h3>Operational references</h3>
                </div>
              </div>
              <div className="executive-spec-grid">
                <div className="executive-spec-item">
                  <span>Customer</span>
                  <strong>{selectedShipment.customerName}</strong>
                </div>
                <div className="executive-spec-item">
                  <span>Service mode</span>
                  <strong>{selectedShipment.serviceMode}</strong>
                </div>
                <div className="executive-spec-item">
                  <span>Container</span>
                  <strong>{selectedShipment.containerNumber || 'Pending container'}</strong>
                </div>
                <div className="executive-spec-item">
                  <span>Seal</span>
                  <strong>{selectedShipment.sealNumber || 'Pending seal'}</strong>
                </div>
                <div className="executive-spec-item">
                  <span>BL</span>
                  <strong>{selectedShipment.blNumber || 'Pending BL'}</strong>
                </div>
                <div className="executive-spec-item">
                  <span>ETA</span>
                  <strong>{selectedShipment.eta}</strong>
                </div>
              </div>
            </section>
          </section>
        </div>
      </section>
    </div>
  );
}

const KpiCard = memo(function KpiCard({ language, item, compactMoney = false }: { language: 'en' | 'am'; item: ExecutiveMetric; compactMoney?: boolean }) {
  const value = typeof item.value === 'number' && item.label.toLowerCase().includes('balance')
    ? formatMoney(language, item.value, compactMoney || item.value >= 1000000)
    : typeof item.value === 'number' && item.label.toLowerCase().includes('revenue')
      ? formatMoney(language, item.value, compactMoney || item.value >= 1000000)
      : typeof item.value === 'number' && item.label.toLowerCase().includes('collections')
        ? formatMoney(language, item.value, true)
        : typeof item.value === 'number'
          ? formatNumber(language, item.value)
          : item.value;
  return (
    <article className={`executive-kpi-card ${toneClass(item.tone)}`}>
      <div className="executive-kpi-top">
        <span>{item.label}</span>
      </div>
      <strong>{value}</strong>
      <p>{item.helper}</p>
      {item.href ? <Link href={item.href}>{copyFor(language).viewDetails}</Link> : null}
    </article>
  );
});

function InsightList({
  title,
  items,
  language,
  onCommunicate,
}: {
  title: string;
  items: InsightRow[];
  language: 'en' | 'am';
  onCommunicate: (target: CommunicationDrawerTarget) => void;
}) {
  return (
    <section className="executive-insight-column card">
      <div className="executive-section-header">
        <div>
          <div className="eyebrow">{title}</div>
        </div>
      </div>
      <div className="executive-insight-list">
        {items.slice(0, 3).map((item) => (
          <article key={item.id} className={`executive-insight-row ${toneClass(item.tone)}`}>
            <div className="executive-insight-head">
              <h3>{item.title}</h3>
              <span className={`executive-chip ${toneClass(item.tone)}`}>{item.chip}</span>
            </div>
            <p>{item.description}</p>
            <div className="executive-row-actions">
              {item.href ? <Link href={item.href}>{item.actionLabel || copyFor(language).viewDetails}</Link> : null}
              {item.communication ? (
                <button type="button" className="btn btn-secondary btn-compact" onClick={() => onCommunicate(item.communication!)}>
                  {item.href ? 'Message' : item.actionLabel || copyFor(language).sendReminder}
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function FinanceRowCard({
  item,
  language,
  onCommunicate,
}: {
  item: FinanceRow;
  language: 'en' | 'am';
  onCommunicate: (target: CommunicationDrawerTarget) => void;
}) {
  return (
    <article className="executive-finance-row">
      <div>
        <h3>{item.title}</h3>
        <p>{item.subtitle}</p>
      </div>
      <div className="executive-finance-row-meta">
        <strong>{formatMoney(language, item.amount, item.amount >= 1000000)}</strong>
        <span className="executive-chip tone-info">{item.status}</span>
        <button type="button" className="executive-inline-button" onClick={() => onCommunicate(item.communication)}>
          {copyFor(language).sendReminder}
        </button>
      </div>
    </article>
  );
}

function AttentionMessage({ item }: { item: MessageRow }) {
  return (
    <article className="executive-attention-row">
      <div>
        <h3>{item.title}</h3>
        <p>{item.subtitle}</p>
      </div>
      <div className="executive-attention-actions">
        <span className="executive-channel-chip">{item.channel}</span>
        {item.href ? <Link href={item.href}>Open</Link> : null}
      </div>
    </article>
  );
}

function OperationsPanel({
  title,
  items,
  language,
  onCommunicate,
}: {
  title: string;
  items: InsightRow[];
  language: 'en' | 'am';
  onCommunicate: (target: CommunicationDrawerTarget) => void;
}) {
  return (
    <section className="card executive-side-panel">
      <div className="executive-section-header">
        <div>
          <div className="eyebrow">{title}</div>
        </div>
      </div>
      <div className="executive-side-list">
        {items.slice(0, 5).map((item) => (
          <article key={item.id} className="executive-side-row">
            <div className="executive-side-row-head">
              <h3>{item.title}</h3>
              <span className={`executive-chip ${toneClass(item.tone)}`}>{item.chip}</span>
            </div>
            <p>{item.description}</p>
            <div className="executive-row-actions">
              {item.href ? <Link href={item.href}>{copyFor(language).openList}</Link> : null}
              {item.communication ? (
                <button type="button" className="btn btn-secondary btn-compact" onClick={() => onCommunicate(item.communication!)}>
                  {copyFor(language).sendReminder}
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ExecutiveDashboardRuntime({
  initialWorkspace,
  initialTab = 'overview',
}: {
  initialWorkspace?: ExecutiveWorkspacePayload;
  initialTab?: ExecutiveTab;
}) {
  const { language } = useConsoleI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lang = language === 'am' ? 'am' : 'en';
  const copy = copyFor(lang);
  const [activeTab, setActiveTab] = useState<ExecutiveTab>(normalizeTab(initialTab));
  const [manualSyncVersion, setManualSyncVersion] = useState(0);
  const [selectedVehicleId, setSelectedVehicleId] = useState('TKR-401');
  const [selectedJourneyRef, setSelectedJourneyRef] = useState('TB-MANUAL-0001');
  const [communicationTarget, setCommunicationTarget] = useState<CommunicationDrawerTarget | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (activeTab === 'overview') {
      url.searchParams.delete('tab');
    } else {
      url.searchParams.set('tab', activeTab);
    }
    window.history.replaceState({}, '', `${pathname}${url.search}`);
  }, [activeTab, pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const refreshManualState = () => setManualSyncVersion((current) => current + 1);
    refreshManualState();
    window.addEventListener(manualCorridorStorageUpdatedEvent, refreshManualState);
    window.addEventListener(shippingPhase1UpdatedEvent, refreshManualState);
    window.addEventListener('storage', refreshManualState);
    window.addEventListener('focus', refreshManualState);
    document.addEventListener('visibilitychange', refreshManualState);
    return () => {
      window.removeEventListener(manualCorridorStorageUpdatedEvent, refreshManualState);
      window.removeEventListener(shippingPhase1UpdatedEvent, refreshManualState);
      window.removeEventListener('storage', refreshManualState);
      window.removeEventListener('focus', refreshManualState);
      document.removeEventListener('visibilitychange', refreshManualState);
    };
  }, []);

  const data = useMemo(() => {
    const shouldUseInitialWorkspace = manualSyncVersion === 0 && activeTab === normalizeTab(initialTab);
    return normalizeExecutiveData(lang, shouldUseInitialWorkspace ? initialWorkspace : undefined);
  }, [activeTab, initialTab, initialWorkspace, lang, manualSyncVersion]);
  const manualDemurrage = useMemo(() => buildManualDemurrageInsights(lang), [lang, manualSyncVersion]);
  const fuelInsights = useMemo(() => {
    const activePoints = data.operations.points ?? [];
    const missingFuelLogCount = activePoints.filter((point) => !point.lastFuelAt).length;
    const fueledVehicleCount = activePoints.filter((point) => point.lastFuelAt).length;
    const uniqueFuelStations = new Set(activePoints.map((point) => point.fuelStation).filter(Boolean)).size;
    const highestOdometer = activePoints.reduce((max, point) => Math.max(max, point.currentOdometerKm || 0), 0);

    return [
      {
        label: lang === 'am' ? 'የነዳጅ መዝገብ የጎደላቸው መኪናዎች' : 'Vehicles missing fuel log',
        value: missingFuelLogCount,
        helper: lang === 'am' ? 'በንቁ ፍሊት ውስጥ የመጨረሻ የነዳጅ መዝገብ የሌላቸው' : 'Active fleet units without a recent fuel update',
        tone: missingFuelLogCount > 0 ? 'warning' : 'good',
        href: '/?tab=operations',
      } satisfies ExecutiveMetric,
      {
        label: lang === 'am' ? 'የነዳጅ ዝማኔ ያላቸው መኪናዎች' : 'Vehicles with fuel update',
        value: fueledVehicleCount,
        helper: lang === 'am' ? 'የቅርብ የነዳጅ መረጃ የተመዘገበላቸው' : 'Active fleet units with a recent fuel log',
        tone: 'info',
        href: '/?tab=operations',
      } satisfies ExecutiveMetric,
      {
        label: lang === 'am' ? 'ንቁ የነዳጅ ጣቢያዎች' : 'Fuel stations in use',
        value: uniqueFuelStations,
        helper: lang === 'am' ? 'ከፍሊት ውስጥ የተመዘገቡ ጣቢያዎች' : 'Distinct stations recorded across the active fleet',
        tone: 'good',
        href: '/?tab=operations',
      } satisfies ExecutiveMetric,
      {
        label: lang === 'am' ? 'ከፍተኛ ኦዶሜትር' : 'Highest odometer tracked',
        value: `${highestOdometer.toLocaleString()} km`,
        helper: lang === 'am' ? 'ከንቁ ፍሊት ውስጥ ከፍተኛው የተመዘገበ ኪሎሜትር' : 'Largest recorded odometer reading in the active fleet',
        tone: 'info',
        href: '/?tab=operations',
      } satisfies ExecutiveMetric,
    ];
  }, [data.operations.points, lang]);
  const fuelRows = useMemo(() => {
    return (data.operations.points ?? []).map((point) => {
      const fullTankKm = 400;
      const distanceUsedRaw =
        point.lastFuelOdometerKm != null
          ? Math.max(point.currentOdometerKm - point.lastFuelOdometerKm, 0)
          : null;
      const distanceUsed =
        distanceUsedRaw == null ? null : Math.min(distanceUsedRaw, fullTankKm);
      const percentUsed =
        distanceUsed == null ? 0 : Math.min(Math.round((distanceUsed / fullTankKm) * 100), 100);
      const rangeLeft = distanceUsed == null ? null : Math.max(fullTankKm - distanceUsed, 0);
      return {
        ...point,
        distanceUsed,
        percentUsed,
        rangeLeft,
        fullTankKm,
      };
    });
  }, [data.operations.points]);
  const fuelPriorityRows = useMemo(() => {
    return [...fuelRows].sort((left, right) => {
      const leftMissing = left.lastFuelAt ? 0 : 1;
      const rightMissing = right.lastFuelAt ? 0 : 1;
      if (leftMissing !== rightMissing) return rightMissing - leftMissing;
      if ((left.percentUsed || 0) !== (right.percentUsed || 0)) return (right.percentUsed || 0) - (left.percentUsed || 0);
      return compareShipmentRefOrder(left.tripCode, right.tripCode);
    });
  }, [fuelRows]);
  const fuelStationSnapshot = useMemo(() => {
    const byStation = new Map<string, number>();
    fuelRows.forEach((row) => {
      const station = row.fuelStation || (row.lastFuelAt ? 'Unspecified station' : '');
      if (!station) return;
      byStation.set(station, (byStation.get(station) || 0) + 1);
    });
    return Array.from(byStation.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 4);
  }, [fuelRows]);
  const journeyShipments = useMemo(() => {
    const manualJourneys = buildManualJourneyEntries(lang, data.shipment.items);
    const manualRefs = new Set(manualJourneys.map((item) => item.shipmentRef));
    return [...manualJourneys, ...data.journeys.filter((item) => !manualRefs.has(item.shipmentRef))];
  }, [data.journeys, data.shipment.items, lang, manualSyncVersion]);
  const journeyQuery = (searchParams.get('query') || searchParams.get('q') || '').trim().toLowerCase();
  const filteredJourneyShipments = useMemo(() => {
    if (!journeyQuery) return journeyShipments;
    return journeyShipments.filter((item) =>
      [
        item.shipmentRef,
        item.customerName,
        item.containerNumber,
        item.blNumber,
        item.sealNumber,
        item.serviceMode,
      ]
        .join(' ')
        .toLowerCase()
        .includes(journeyQuery),
    );
  }, [journeyQuery, journeyShipments]);
  const trackingIncidents = buildTrackingIncidentInsights(language);
  const afterSalesAlerts = buildAfterSalesInsights(language);
  const carrierScheduleAlerts = buildCarrierScheduleInsights(language);
  const shippingGateAlerts = buildShippingGateInsights(language);
  const attentionAlerts = [
    ...shippingGateAlerts.attentionAlerts,
    ...carrierScheduleAlerts.attentionAlerts,
    ...afterSalesAlerts.attentionAlerts,
    ...trackingIncidents.attentionAlerts,
    ...manualDemurrage.attentionAlerts,
    ...data.attention.alerts,
  ];
  const attentionState = useMemo(() => getPriorityShipmentNow(), [manualSyncVersion]);
  const filteredAttentionItems = useMemo(() => {
    if (!journeyQuery) return attentionState.items;
    return attentionState.items.filter((item) =>
      [
        item.bookingNumber,
        item.shipmentId,
        item.customer,
        item.consignee,
        item.container,
        item.seal,
        item.currentOwner,
        item.ownerRole,
        item.blockerLabel,
        item.nextAction,
      ]
        .join(' ')
        .toLowerCase()
        .includes(journeyQuery),
    );
  }, [attentionState.items, journeyQuery]);
  const attentionPriority = filteredAttentionItems[0] ?? attentionState.priority;
  const attentionQueue = filteredAttentionItems.slice(1, 6);
  const shipment = useMemo(
    () => filteredJourneyShipments.find((item) => item.shipmentRef === selectedJourneyRef) ?? filteredJourneyShipments[0] ?? data.shipment,
    [data.shipment, filteredJourneyShipments, selectedJourneyRef],
  );
  const operationsContext = data.operations.selectedVehicles[selectedVehicleId] ?? data.operations.selectedVehicles['TKR-401'] ?? Object.values(data.operations.selectedVehicles)[0];
  const hasFinanceMetrics = data.finance.metrics.length > 0;
  const hasFinanceActions = data.finance.quickActions.length > 0;
  const hasTopCustomers = data.finance.topCustomers.length > 0;
  const hasRecentPayments = data.finance.recentPayments.length > 0;
  const hasAttentionAlerts = attentionAlerts.length > 0;
  const hasAttentionTasks = data.attention.tasks.length > 0;
  const hasAttentionMessages = data.attention.messages.length > 0;
  const djiboutiBlockedCount = useMemo(() => {
    const liveBlocked = readManualDjiboutiReleaseRecords().filter(
      (record) => !record.lineReleaseReceived || !record.terminalReleaseReady || !record.gateOutReady,
    ).length;
    if (liveBlocked > 0) return liveBlocked;
    return attentionAlerts.filter((item) => item.href?.includes('/operations/djibouti-release')).length;
  }, [attentionAlerts, manualSyncVersion]);
  const overdueUpdatesCount = useMemo(
    () => attentionState.queue.filter((item) => item.blocker === 'no_checkpoint_update' || item.blocker === 'customer_confirmation_pending').length,
    [attentionState.queue],
  );
  const blockedFilesCount = useMemo(
    () => attentionState.queue.filter((item) => item.riskState === 'Critical' || item.riskState === 'High').length,
    [attentionState.queue],
  );
  const detentionExposureCount = useMemo(
    () => attentionAlerts.filter((item) => item.title.toLowerCase().includes('detention') || item.title.toLowerCase().includes('demurrage')).length,
    [attentionAlerts],
  );
  const primaryMetrics = useMemo<ExecutiveMetric[]>(() => [
    { label: 'Quotes pending', value: metricValue(data.overview.urgent[0]), helper: 'Intake items still waiting on pricing or review', tone: metricValue(data.overview.urgent[0]) > 0 ? 'warning' : 'good', href: '/operations/booking-quote' },
    { label: 'Awaiting origin', value: metricValue(data.overview.urgent[1]), helper: 'Accepted bookings still not fully in origin flow', tone: metricValue(data.overview.urgent[1]) > 0 ? 'warning' : 'good', href: '/operations/supplier-agent' },
    { label: 'Awaiting release', value: djiboutiBlockedCount, helper: djiboutiBlockedCount > 0 ? 'Djibouti files still blocked before gate-out' : 'Release flow stable', tone: djiboutiBlockedCount > 0 ? 'critical' : 'good', href: '/operations/djibouti-release' },
    { label: 'Awaiting Clearance', value: metricValue(data.overview.urgent[2]), helper: 'T1 and charges pending', tone: metricValue(data.overview.urgent[2]) > 0 ? 'warning' : 'good', href: '/operations/transitor-clearance' },
    { label: 'Ready for dispatch', value: metricValue(data.overview.moving[2]), helper: 'Clearance complete and ready to assign', tone: metricValue(data.overview.moving[2]) > 0 ? 'info' : 'good', href: '/operations/corridor-dispatch' },
    { label: 'Trucks moving inland', value: metricValue(data.overview.moving[1]), helper: 'Dispatch trips active now', tone: 'good', href: '/operations/corridor-dispatch' },
  ], [data.overview.moving, data.overview.urgent, djiboutiBlockedCount]);
  const flowMetrics = useMemo<ExecutiveMetric[]>(() => [
    { label: 'Shipments in origin', value: metricValue(data.overview.moving[0]), helper: 'Files still in origin preparation', tone: 'info', href: '/operations/supplier-agent' },
    { label: 'Shipments in transit', value: metricValue(data.overview.moving[1]), helper: 'Corridor trips moving', tone: 'good', href: '/operations/corridor-dispatch' },
    { label: 'Awaiting release', value: djiboutiBlockedCount, helper: 'Djibouti release files still blocked', tone: djiboutiBlockedCount > 0 ? 'warning' : 'good', href: '/operations/djibouti-release' },
  ], [data.overview.moving, djiboutiBlockedCount]);
  const riskMetrics = useMemo<ExecutiveMetric[]>(() => [
    { label: 'Blocked files', value: blockedFilesCount, helper: 'High-risk operational files', tone: blockedFilesCount > 0 ? 'critical' : 'good', href: '/dashboards/executive?tab=attention' },
    { label: 'Overdue updates', value: overdueUpdatesCount, helper: 'Checkpoint or receipt updates missing', tone: overdueUpdatesCount > 0 ? 'warning' : 'good', href: '/operations/corridor-dispatch' },
    { label: 'Detention exposure', value: detentionExposureCount, helper: 'Demurrage and detention watch', tone: detentionExposureCount > 0 ? 'critical' : 'good', href: '/operations/djibouti-release' },
  ], [blockedFilesCount, detentionExposureCount, overdueUpdatesCount]);
  const closureMetrics = useMemo<ExecutiveMetric[]>(() => [
    { label: 'Ready for dispatch', value: metricValue(data.overview.moving[2]), helper: 'Clearance completed', tone: 'info', href: '/operations/corridor-dispatch' },
    { label: 'Arrived not confirmed', value: metricValue(data.overview.moving[3]), helper: 'Unload or receipt still open', tone: 'warning', href: '/operations/dry-port-yard' },
    { label: 'Empty return pending', value: metricValue(data.overview.urgent[4]), helper: 'Return receipt not closed', tone: 'warning', href: '/operations/empty-return' },
  ], [data.overview.moving, data.overview.urgent]);
  const executiveBriefs = useMemo(
    () => [...data.overview.risks, ...data.overview.opportunities].slice(0, 3),
    [data.overview.opportunities, data.overview.risks],
  );

  return (
    <div className="executive-dashboard">
      <div className="executive-tabs-row" role="tablist" aria-label="Executive tabs">
        {[
          { key: 'overview' as const, label: copy.tabOverview },
          { key: 'journey' as const, label: copy.tabJourney },
          { key: 'finance' as const, label: copy.tabFinance },
          { key: 'operations' as const, label: copy.tabOperations },
          { key: 'fuel' as const, label: copy.tabFuel },
          { key: 'attention' as const, label: copy.tabAttention },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={tab.key === activeTab ? 'executive-tab active' : 'executive-tab'}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
        <Link
          href="/shipments/intake?mode=booking"
          className="executive-tab executive-tab-link executive-tab-link-next"
          data-testid="command-book-shipment"
        >
          New Booking
        </Link>
        <Link
          href="/shipments/intake?mode=quote"
          className="executive-tab executive-tab-link executive-tab-link-secondary executive-tab-link-next"
          data-testid="command-get-quote"
        >
          New Quote
        </Link>
        <Link href="/shipping" className="executive-tab executive-tab-link executive-tab-link-secondary" data-testid="command-open-shipping">
          Open Shipping
        </Link>
      </div>

      {activeTab === 'overview' ? (
        <div className="executive-tab-content">
          <ExecutiveOverviewCommand
            language={lang}
            priority={attentionPriority}
            queue={attentionQueue.slice(0, 8)}
            primaryMetrics={primaryMetrics}
            onRequestUpdate={setCommunicationTarget}
          />
          <section className="executive-metric-groups">
            <section className="card executive-ops-section">
              <div className="executive-section-header">
                <div>
                  <div className="eyebrow">Flow</div>
                  <h3>What is moving normally</h3>
                </div>
              </div>
              <div className="executive-ops-support-grid">
                {flowMetrics.map((item) => <KpiCard key={item.label} language={lang} item={item} />)}
              </div>
            </section>
            <section className="card executive-ops-section">
              <div className="executive-section-header">
                <div>
                  <div className="eyebrow">Risk</div>
                  <h3>Where risk is building</h3>
                </div>
              </div>
              <div className="executive-ops-support-grid">
                {riskMetrics.map((item) => <KpiCard key={item.label} language={lang} item={item} />)}
              </div>
            </section>
            <section className="card executive-ops-section">
              <div className="executive-section-header">
                <div>
                  <div className="eyebrow">Closure</div>
                  <h3>What can close today</h3>
                </div>
              </div>
              <div className="executive-ops-support-grid">
                {closureMetrics.map((item) => <KpiCard key={item.label} language={lang} item={item} />)}
              </div>
            </section>
          </section>

          {executiveBriefs.length > 0 ? (
            <section className="card executive-ops-section">
              <div className="executive-section-header">
                <div>
                  <div className="eyebrow">Executive brief</div>
                  <h3>Concise risks and opportunities</h3>
                </div>
              </div>
              <div className="executive-risk-list">
                {executiveBriefs.map((item) => (
                  <article key={item.id} className="executive-risk-row">
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.description}</p>
                    </div>
                    <div className="executive-row-actions">
                      {item.href ? <Link href={item.href}>{item.actionLabel || 'Open'}</Link> : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {activeTab === 'journey' ? (
        <ExecutiveJourneyWorkspace
          shipments={filteredJourneyShipments}
          selectedShipmentRef={selectedJourneyRef}
          onSelectShipment={setSelectedJourneyRef}
          language={lang}
        />
      ) : null}

      {activeTab === 'finance' ? (
        <div className="executive-tab-content">
          {hasFinanceMetrics ? (
            <section className="card">
              <div className="executive-section-header">
                <div>
                  <div className="eyebrow">{copy.financeTitle}</div>
                </div>
              </div>
              <div className="executive-kpi-grid finance">
                {data.finance.metrics.map((item) => <KpiCard key={item.label} language={lang} item={item} compactMoney />)}
              </div>
            </section>
          ) : null}

          {hasFinanceActions ? (
            <section className="executive-quick-action-grid">
              {data.finance.quickActions.map((action) => (
                <article key={action.id} className={`card executive-action-card ${toneClass(action.tone)}`}>
                  <div className="executive-section-header">
                    <div>
                      <div className="eyebrow">{copy.quickActions}</div>
                      <h3>{action.title}</h3>
                    </div>
                    <span className={`executive-chip ${toneClass(action.tone)}`}>{action.chip}</span>
                  </div>
                  <p>{action.description}</p>
                  <div className="executive-row-actions">
                    {action.href ? <Link href={action.href}>{copy.viewDetails}</Link> : null}
                    {action.communication ? (
                      <button type="button" className="btn btn-secondary btn-compact" onClick={() => setCommunicationTarget(action.communication!)}>
                        {copy.sendReminder}
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </section>
          ) : null}

          {hasTopCustomers || hasRecentPayments ? (
            <section className="executive-two-column">
              {hasTopCustomers ? (
                <div className="card">
                  <div className="executive-section-header">
                    <div>
                      <div className="eyebrow">{copy.topCustomers}</div>
                    </div>
                  </div>
                  <div className="executive-finance-list">
                    {data.finance.topCustomers.slice(0, 5).map((item) => (
                      <FinanceRowCard key={item.id} item={item} language={lang} onCommunicate={setCommunicationTarget} />
                    ))}
                  </div>
                </div>
              ) : null}
              {hasRecentPayments ? (
                <div className="card">
                  <div className="executive-section-header">
                    <div>
                      <div className="eyebrow">{copy.recentPayments}</div>
                    </div>
                  </div>
                  <div className="executive-finance-list">
                    {data.finance.recentPayments.slice(0, 5).map((item) => (
                      <FinanceRowCard key={item.id} item={item} language={lang} onCommunicate={setCommunicationTarget} />
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      ) : null}

      {activeTab === 'operations' ? (
        <div className="executive-tab-content">
          <section className="executive-operations-layout">
            <div className="executive-operations-main">
              <div className="card executive-map-card">
                <div className="executive-section-header">
                  <div>
                    <div className="eyebrow">{copy.operationsTitle}</div>
                    <h3>{copy.liveFleet}</h3>
                  </div>
                  <Link href="/tracking" className="executive-inline-link">{copy.liveTracking}</Link>
                </div>
                <DeferredLiveFleetMap
                  title={copy.liveFleet}
                  summary={data.operations.summary}
                  points={data.operations.points}
                  selectedVehicleId={selectedVehicleId}
                  onSelectVehicle={setSelectedVehicleId}
                  routeHistoryPoints={data.operations.routeHistory}
                  vehicleDetail={{
                    vehicleDbId: operationsContext.vehicleId,
                    vehicleId: operationsContext.vehicleId,
                    plateNumber: operationsContext.truckPlate,
                    branch: 'Djibouti Operations',
                    status: operationsContext.currentStage,
                    currentOdometerKm: 321440,
                    lastFuelAt: data.operations.points.find((item) => item.vehicleId === selectedVehicleId)?.lastFuelAt ?? null,
                    lastFuelKm: null,
                    lastMaintenanceAt: data.operations.points.find((item) => item.vehicleId === selectedVehicleId)?.lastMaintenanceAt ?? null,
                    lastMaintenanceKm: null,
                    driverName: operationsContext.driver,
                    driverPhone: operationsContext.phone,
                    emergencyContact: null,
                    tripCode: operationsContext.tripCode,
                    routeName: operationsContext.route,
                    destination: shipment.stage,
                    geofence: operationsContext.currentLocation,
                    locationLabel: operationsContext.currentLocation,
                    fuelStation: data.operations.points.find((item) => item.vehicleId === selectedVehicleId)?.fuelStation ?? null,
                    latestGpsAt: data.operations.points.find((item) => item.vehicleId === selectedVehicleId)?.latestGpsAt ?? null,
                    speed: data.operations.points.find((item) => item.vehicleId === selectedVehicleId)?.speed ?? 0,
                    latitude: data.operations.points.find((item) => item.vehicleId === selectedVehicleId)?.latitude ?? null,
                    longitude: data.operations.points.find((item) => item.vehicleId === selectedVehicleId)?.longitude ?? null,
                  }}
                  language={lang}
                  layout="executive"
                />
                <div className="executive-map-context-grid">
                  <article className="executive-context-panel">
                    <div className="eyebrow">{copy.selectedVehicle}</div>
                    <strong>{operationsContext.vehicleId} · {operationsContext.truckPlate}</strong>
                    <p>{operationsContext.driver} · {operationsContext.phone}</p>
                    <p>{shipment.containerNumber} · {shipment.sealNumber}</p>
                  </article>
                  <article className="executive-context-panel">
                    <div className="eyebrow">{copy.dispatchContext}</div>
                    <strong>{operationsContext.route}</strong>
                    <p>{operationsContext.currentStage}</p>
                    <p>{operationsContext.customsDocument} · {operationsContext.releaseWindow}</p>
                  </article>
                  <article className="executive-context-panel">
                    <div className="eyebrow">{copy.fuelContext}</div>
                    <strong>{operationsContext.fuelNote || copy.awaitingFuel}</strong>
                    <p>{copy.noOdometer}</p>
                    <p>{operationsContext.maintenanceNote || copy.noMaintenance}</p>
                  </article>
                </div>
              </div>
            </div>
            <div className="executive-operations-side">
              <OperationsPanel title={copy.highRisk} items={data.operations.highRisk} language={lang} onCommunicate={setCommunicationTarget} />
              <OperationsPanel title={copy.dispatchFollowUp} items={data.operations.dispatchFollowUp} language={lang} onCommunicate={setCommunicationTarget} />
              <OperationsPanel title={copy.maintenanceAlerts} items={data.operations.maintenanceAlerts} language={lang} onCommunicate={setCommunicationTarget} />
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === 'fuel' ? (
        <div className="executive-tab-content">
          <section className="card executive-fuel-hero">
            <div className="executive-section-header">
              <div>
                <div className="eyebrow">{copy.fuelTracking}</div>
                <h3>Fuel control board</h3>
                <p className="executive-fuel-hero-copy">Monitor missing fuel logs, consumption drift, and station activity without leaving the executive console.</p>
              </div>
              <div className="executive-fuel-benchmark">
                <span>Benchmark</span>
                <strong>{copy.fuelRangeHelper}</strong>
              </div>
            </div>
            <div className="executive-kpi-grid finance">
              {fuelInsights.map((item) => <KpiCard key={item.label} language={lang} item={item} />)}
            </div>
          </section>

          <section className="executive-fuel-layout">
            <section className="card executive-fuel-watchlist">
              <div className="executive-section-header">
                <div>
                  <div className="eyebrow">Watchlist</div>
                  <h3>Units needing fuel attention</h3>
                </div>
              </div>
              <div className="executive-fuel-watchlist-grid">
                {fuelPriorityRows.slice(0, 3).map((row) => (
                  <article key={row.tripCode} className={`executive-fuel-watch-card ${!row.lastFuelAt ? 'is-missing' : row.percentUsed >= 90 ? 'is-critical' : row.percentUsed >= 70 ? 'is-warning' : 'is-stable'}`}>
                    <div className="executive-fuel-watch-topline">
                      <strong>{row.tripCode}</strong>
                      <span className={`executive-chip ${row.lastFuelAt ? (row.percentUsed >= 90 ? 'tone-critical' : row.percentUsed >= 70 ? 'tone-warning' : 'tone-good') : 'tone-warning'}`}>
                        {!row.lastFuelAt ? copy.noFuelLog : `${row.percentUsed}% used`}
                      </span>
                    </div>
                    <p>{row.driverName} · {row.plateNumber}</p>
                    <p>{row.locationLabel || row.geofence} · {row.routeName}</p>
                    <div className="executive-range-meter">
                      <div className="executive-range-track">
                        <div
                          className={`executive-range-fill ${row.percentUsed >= 90 ? 'critical' : row.percentUsed >= 70 ? 'warning' : 'good'}`}
                          style={{ '--range-fill': `${row.percentUsed}%` } as CSSProperties}
                        />
                      </div>
                      <div className="executive-range-meta">
                        <span>{copy.rangeUsedLabel}: {row.distanceUsed == null ? 'No log' : `${row.distanceUsed} km`}</span>
                        <span>{copy.rangeLeftLabel}: {row.rangeLeft == null ? `${row.fullTankKm} km` : `${row.rangeLeft} km`}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <aside className="card executive-fuel-stations">
              <div className="executive-section-header">
                <div>
                  <div className="eyebrow">Stations</div>
                  <h3>Where fueling is happening</h3>
                </div>
              </div>
              <div className="executive-fuel-station-list">
                {fuelStationSnapshot.length ? fuelStationSnapshot.map(([station, count]) => (
                  <div key={station} className="executive-fuel-station-row">
                    <div>
                      <strong>{station}</strong>
                      <p>{count} active unit{count === 1 ? '' : 's'}</p>
                    </div>
                    <span className="executive-chip tone-info">{count}</span>
                  </div>
                )) : (
                  <div className="executive-fuel-empty">No fuel station activity recorded yet.</div>
                )}
              </div>
            </aside>
          </section>

          <section className="card executive-fuel-board">
            <div className="executive-section-header">
              <div>
                <div className="eyebrow">Fleet board</div>
                <h3>Fuel status by active vehicle</h3>
              </div>
            </div>
            <div className="executive-fuel-grid">
              {fuelPriorityRows.map((row) => (
                <article key={row.tripCode} className="executive-fuel-card">
                  <div className="executive-fuel-card-topline">
                    <div>
                      <strong>{row.tripCode}</strong>
                      <p>{row.driverName} · {row.driverPhone}</p>
                    </div>
                    <span className={`executive-chip ${row.lastFuelAt ? (row.percentUsed >= 90 ? 'tone-critical' : row.percentUsed >= 70 ? 'tone-warning' : 'tone-good') : 'tone-warning'}`}>
                      {!row.lastFuelAt ? copy.noFuelLog : `${row.percentUsed}%`}
                    </span>
                  </div>
                  <div className="executive-fuel-meta-grid">
                    <div><span>{copy.plateLabel}</span><strong>{row.plateNumber}</strong></div>
                    <div><span>Location</span><strong>{row.locationLabel || row.geofence}</strong></div>
                    <div><span>Fuel log</span><strong>{row.lastFuelAt ? row.lastFuelAt : copy.noFuelLog}</strong></div>
                    <div><span>Station</span><strong>{row.fuelStation || 'Pending station'}</strong></div>
                  </div>
                  <div className="executive-range-meter">
                    <div className="executive-range-track">
                      <div
                        className={`executive-range-fill ${row.percentUsed >= 90 ? 'critical' : row.percentUsed >= 70 ? 'warning' : 'good'}`}
                        style={{ '--range-fill': `${row.percentUsed}%` } as CSSProperties}
                      />
                    </div>
                    <div className="executive-range-meta">
                      <span>{copy.rangeUsedLabel}: {row.distanceUsed == null ? 'No log' : `${row.distanceUsed} km`}</span>
                      <span>{copy.rangeLeftLabel}: {row.rangeLeft == null ? `${row.fullTankKm} km` : `${row.rangeLeft} km`}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === 'attention' ? (
        <div className="executive-tab-content executive-three-column">
          {hasAttentionAlerts ? (
            <section className="card">
              <div className="executive-section-header">
                <div>
                  <div className="eyebrow">{copy.alerts}</div>
                </div>
              </div>
              <div className="executive-side-list">
                {attentionAlerts.slice(0, 5).map((item) => (
                  <article key={item.id} className="executive-side-row">
                    <div className="executive-side-row-head">
                      <h3>{item.title}</h3>
                      <span className={`executive-chip ${toneClass(item.tone)}`}>{item.chip}</span>
                    </div>
                    <p>{item.description}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
          {hasAttentionTasks ? (
            <section className="card">
              <div className="executive-section-header">
                <div>
                  <div className="eyebrow">{copy.tasks}</div>
                </div>
              </div>
              <div className="executive-side-list">
                {data.attention.tasks.slice(0, 5).map((item) => (
                  <article key={item.id} className="executive-side-row">
                    <div className="executive-side-row-head">
                      <h3>{item.title}</h3>
                      <span className={`executive-chip ${toneClass(item.tone)}`}>{item.chip}</span>
                    </div>
                    <p>{item.description}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
          {hasAttentionMessages ? (
            <section className="card">
              <div className="executive-section-header">
                <div>
                  <div className="eyebrow">{copy.messages}</div>
                </div>
              </div>
              <div className="executive-side-list">
                {data.attention.messages.slice(0, 5).map((item) => <AttentionMessage key={item.id} item={item} />)}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
      <CommunicationCenterDrawer target={communicationTarget} onClose={() => setCommunicationTarget(null)} />
    </div>
  );
}
