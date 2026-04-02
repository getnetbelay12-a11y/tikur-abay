'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { clearSession, readSession } from '../lib/auth-session';
import { canAccessPath, navForRole, routeMeta, type ConsoleSession } from '../lib/console-config';
import { apiGet, apiLogout, apiPost } from '../lib/api';
import { bookingQuoteStorageKey } from '../lib/booking-quote-demo-data';
import {
  persistConsoleLanguage,
  readConsoleLanguage,
  resolveActiveConsoleLanguage,
  translate,
  translateUiText,
  type ConsoleLanguage,
} from '../lib/i18n';
import { manualCorridorStorageUpdatedEvent } from '../lib/manual-corridor-journey';
import { readSharedQuoteRequests, sharedQuoteStorageUpdatedEvent } from '../lib/shared-quote-storage';
import { readShippingPhase1Workspace, shippingPhase1UpdatedEvent } from '../lib/shipping-phase1';
import { ChinaDeskShell } from './china-desk-shell';
import { ConsoleCommandHeader } from './console-command-header';
import type { GlobalLocatorResult } from './console-shell-global-search';
import {
  ActivityIcon,
  BellIcon,
  BriefcaseIcon,
  LayoutDashboardIcon,
  MapPinIcon,
  MenuIcon,
  MessageSquareIcon,
  PanelLeftIcon,
  RefreshIcon,
  RouteIcon,
  SettingsIcon,
  ShieldIcon,
  TruckIcon,
  UsersIcon,
  WalletIcon,
  WrenchIcon,
} from './console-icons';

const ConsoleShellFlowPanels = dynamic(
  () => import('./console-shell-flow-panels').then((module) => module.ConsoleShellFlowPanels),
  {
    ssr: false,
    loading: () => null,
  },
);

const ConsoleShellGlobalSearch = dynamic(
  () => import('./console-shell-global-search').then((module) => module.ConsoleShellGlobalSearch),
  {
    ssr: false,
    loading: () => (
      <div className="search-box global-search-box">
        <div className="search-box-form">
          <input
            className="field field-compact"
            aria-label="Universal container search"
            placeholder="Find container / BL / booking from any page"
            disabled
          />
        </div>
      </div>
    ),
  },
);

const branchOptions = ['All branches', 'China Origin Desk', 'Dubai Port Desk', 'Djibouti Operations', 'Adama', 'Combolcha'];
const dateRangeOptions = [
  { label: 'Today', value: 'today' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'This month', value: 'month' },
];
const SIDEBAR_WIDTH_KEY = 'tikur-abay-sidebar-width';
const SIDEBAR_COLLAPSED_KEY = 'tikur-abay-sidebar-collapsed';
const SIDEBAR_MIN_WIDTH = 198;
const SIDEBAR_DEFAULT_WIDTH = 232;
const SIDEBAR_MAX_WIDTH = 300;
const SIDEBAR_COLLAPSED_WIDTH = 72;
const DESKTOP_BREAKPOINT = 1180;
const manualDispatchTripStorageKey = 'tikur-abay:manual-corridor:dispatch-trips';
const shellAiRelevantStorageKeys = new Set([
  bookingQuoteStorageKey,
  'tikur-abay:shipping-phase1:validations',
  'tikur-abay:shipping-phase1:payments',
  'tikur-abay:shipping-phase4:lcs',
  'tikur-abay:shipping-phase4:release-controls',
  'tikur-abay:shipping-phase2:instructions',
  'tikur-abay:shipping-phase2:bills',
  'tikur-abay:shipping-phase2:manifests',
  'tikur-abay:shipping-phase3:fleet',
  'tikur-abay:shipping-phase3:containers',
  'tikur-abay:shipping-phase3:incidents',
  'tikur-abay:shipping-phase5:after-sales',
  'tikur-abay:shipping-phase6:carrier-assignments',
  'tikur-abay:supplier-desk:manual-shipments',
  'tikur-abay:yard-post-delivery-follow-up',
]);

type WorkflowStep = {
  key: string;
  title: string;
  href: string;
  helper: string;
  docs: string[];
  matches: (pathname: string) => boolean;
};

type ClosureJourneyStep = {
  key: string;
  title: string;
  href: string;
  helper: string;
  proof: string;
};

type ClosureJourneyOverrideState = {
  activeKey: ClosureJourneyStep['key'];
  title: string;
  helper: string;
  closed?: boolean;
} | null;

function withWorkflowContext(href: string, params: URLSearchParams) {
  const nextParams = new URLSearchParams();
  const contextualKeys = ['booking', 'shipment', 'container', 'query', 'q'];

  for (const key of contextualKeys) {
    const value = params.get(key);
    if (value) {
      nextParams.set(key, value);
    }
  }

  const query = nextParams.toString();
  if (!query) return href;
  return `${href}${href.includes('?') ? '&' : '?'}${query}`;
}

function normalizeWorkflowReference(value: string) {
  return String(value || '').trim().toUpperCase();
}

function isBookingWorkflowReference(value: string) {
  const normalized = normalizeWorkflowReference(value);
  return normalized.startsWith('BK-') || normalized.startsWith('TRP-') || normalized.startsWith('TRIP-');
}

function inferWorkflowIndexFromTracking(result: GlobalLocatorResult | null) {
  if (!result?.container) return null;

  const status = normalizeWorkflowReference(result.container.currentStatus).replace(/_/g, ' ');
  const location = normalizeWorkflowReference(result.container.currentLocation).replace(/_/g, ' ');
  const latestEvent = normalizeWorkflowReference(result.events?.[0]?.eventType || '').replace(/_/g, ' ');
  const combined = `${status} ${location} ${latestEvent}`;

  if (combined.includes('RETURNED') || combined.includes('DELIVERED') || combined.includes('ARRIVED INLAND') || combined.includes('YARD')) {
    return 6;
  }
  if (combined.includes('OUT FOR DELIVERY') || combined.includes('TRUCK ASSIGNED') || combined.includes('INLAND TRANSIT') || combined.includes('MODJO')) {
    return 5;
  }
  if (combined.includes('CUSTOMS CLEARED') || combined.includes('CLEARANCE')) {
    return 4;
  }
  if (combined.includes('DJIBOUTI') || combined.includes('ARRIVED PORT') || combined.includes('DISCHARGED') || combined.includes('VESSEL ARRIVED')) {
    return 3;
  }
  if (combined.includes('ON VESSEL') || combined.includes('AT PORT') || combined.includes('LOADED') || combined.includes('SHIPPING')) {
    return 2;
  }
  if (combined.includes('ORIGIN') || combined.includes('SUPPLIER') || combined.includes('STUFFING')) {
    return 1;
  }

  return 0;
}

const workflowSteps: WorkflowStep[] = [
  {
    key: 'booking',
    title: 'Booking / Quote',
    href: '/shipments/intake?mode=booking',
    helper: 'Receive request, issue quote, confirm booking, and capture shipper-commercial details.',
    docs: ['Quotation request', 'Acceptance form', 'Booking request'],
    matches: (pathname) =>
      pathname === '/' ||
      pathname.startsWith('/shipments/intake') ||
      pathname.startsWith('/bookings/new') ||
      pathname.startsWith('/operations/booking') ||
      pathname.startsWith('/operations/booking-quote') ||
      pathname === '/booking',
  },
  {
    key: 'origin',
    title: 'Origin / Supplier',
    href: '/operations/supplier-agent',
    helper: 'Collect cargo details, upload origin documents, confirm stuffing, and hand off ocean file.',
    docs: ['Commercial invoice', 'Packing list', 'Stuffing / seal file'],
    matches: (pathname) =>
      pathname.startsWith('/operations/supplier-agent') ||
      pathname.startsWith('/supplier-agent') ||
      pathname.startsWith('/china-desk'),
  },
  {
    key: 'shipping',
    title: 'Shipping Docs',
    href: '/shipping/instructions',
    helper: 'Prepare and approve SI, BL, manifest, and finance readiness before downstream execution.',
    docs: ['Shipping instruction', 'Bill of lading', 'Freight / cargo manifest'],
    matches: (pathname) =>
      pathname.startsWith('/shipping') || pathname.startsWith('/operations/shipping'),
  },
  {
    key: 'djibouti',
    title: 'Djibouti Release',
    href: '/operations/djibouti-release',
    helper: 'Confirm arrival, discharge, customs readiness, and gate-out before handoff.',
    docs: ['Gate pass', 'Release note', 'Handoff packet'],
    matches: (pathname) =>
      pathname.startsWith('/operations/djibouti-release') ||
      pathname === '/djibouti-release' ||
      pathname === '/corridor/djibouti',
  },
  {
    key: 'clearance',
    title: 'Clearance',
    href: '/operations/transitor-clearance',
    helper: 'Assign transitor, prepare T1, clear charges, and release the file to dispatch.',
    docs: ['T1 / transit packet', 'Batch sheet', 'Clearance release'],
    matches: (pathname) =>
      pathname.startsWith('/operations/transitor-clearance') ||
      pathname.startsWith('/operations/clearance'),
  },
  {
    key: 'dispatch',
    title: 'Dispatch',
    href: '/operations/corridor-dispatch',
    helper: 'Assign truck and driver, push the transit pack, and execute inland delivery.',
    docs: ['Transit pack', 'Loading report', 'Checkpoint updates'],
    matches: (pathname) =>
      pathname.startsWith('/operations/corridor-dispatch') ||
      pathname === '/corridor-dispatch' ||
      pathname === '/corridor/dispatch',
  },
  {
    key: 'yard',
    title: 'Yard / Closure',
    href: '/operations/dry-port-yard',
    helper: 'Confirm arrival, unload, POD, customer receipt, empty return, and shipment closure.',
    docs: ['Receipt record', 'POD', 'Return receipt'],
    matches: (pathname) =>
      pathname.startsWith('/operations/dry-port-yard') ||
      pathname.startsWith('/operations/empty-return') ||
      pathname.startsWith('/operations/yard-desk') ||
      pathname === '/corridor/yard' ||
      pathname === '/corridor/empty-return',
  },
  {
    key: 'customer',
    title: 'Customer View',
    href: '/customer',
    helper: 'Expose customer-safe shipment status, documents, payments, and delivery confirmation.',
    docs: ['Tracking view', 'Customer documents', 'Payment visibility'],
    matches: (pathname) => pathname.startsWith('/customer'),
  },
];

const closureJourneySteps: ClosureJourneyStep[] = [
  {
    key: 'arrival',
    title: 'Arrival',
    href: '/operations/djibouti-release',
    helper: 'Confirm vessel arrival, discharge, release readiness, and corridor handoff.',
    proof: 'Arrival, discharge, and release confirmations',
  },
  {
    key: 'clearance',
    title: 'Clearance',
    href: '/operations/transitor-clearance',
    helper: 'Clear T1, charges, and customs-release dependencies before inland dispatch.',
    proof: 'T1, charges paid, and dispatch release',
  },
  {
    key: 'dispatch',
    title: 'Dispatch',
    href: '/operations/corridor-dispatch',
    helper: 'Assign truck and driver, push the pack, and control inland movement.',
    proof: 'Transit pack, departure, and checkpoint flow',
  },
  {
    key: 'gate_in',
    title: 'Gate-in',
    href: '/operations/dry-port-yard',
    helper: 'Confirm inland arrival, gate-in, and yard ownership without losing the corridor file.',
    proof: 'Arrival record and gate-in confirmation',
  },
  {
    key: 'unload_pod',
    title: 'Unload / POD',
    href: '/operations/dry-port-yard#yard-customer',
    helper: 'Complete unload, prepare POD, and lock the customer handoff proof.',
    proof: 'Unload confirmation and POD evidence',
  },
  {
    key: 'customer_receipt',
    title: 'Customer receipt',
    href: '/operations/dry-port-yard#yard-customer',
    helper: 'Capture signature, receipt confirmation, and any final delivery exception notes.',
    proof: 'Signed receipt and customer confirmation',
  },
  {
    key: 'empty_return',
    title: 'Empty return',
    href: '/operations/empty-return',
    helper: 'Release the empty, confirm depot return, and upload the return receipt.',
    proof: 'Empty return confirmation and depot receipt',
  },
  {
    key: 'closed',
    title: 'Closed',
    href: '/customer',
    helper: 'Hold the final closed state only after receipt, empty return, and closure evidence are complete.',
    proof: 'Closed journey with full closure pack',
  },
];

function closureJourneyIndexFromPath(pathname: string) {
  if (pathname.startsWith('/customer')) return 5;
  if (pathname.startsWith('/operations/empty-return') || pathname === '/corridor/empty-return') return 6;
  if (pathname.startsWith('/operations/dry-port-yard') || pathname.startsWith('/operations/yard-desk') || pathname === '/corridor/yard') return 3;
  if (pathname.startsWith('/operations/corridor-dispatch') || pathname === '/corridor-dispatch' || pathname === '/corridor/dispatch') return 2;
  if (pathname.startsWith('/operations/transitor-clearance') || pathname.startsWith('/operations/clearance')) return 1;
  if (
    pathname.startsWith('/operations/djibouti-release') ||
    pathname === '/djibouti-release' ||
    pathname === '/corridor/djibouti' ||
    pathname.startsWith('/shipping') ||
    pathname.startsWith('/operations/shipping') ||
    pathname.startsWith('/operations/supplier-agent') ||
    pathname.startsWith('/supplier-agent') ||
    pathname.startsWith('/china-desk') ||
    pathname.startsWith('/shipments/intake') ||
    pathname.startsWith('/bookings/new') ||
    pathname.startsWith('/operations/booking') ||
    pathname.startsWith('/operations/booking-quote') ||
    pathname === '/booking' ||
    pathname === '/'
  ) {
    return 0;
  }
  return 0;
}

type ManualDispatchSyncTrip = {
  id?: string;
  tripId?: string;
  bookingNumber?: string;
  blNumber?: string;
  containerNumber?: string;
  sealNumber?: string;
  customerName?: string;
  serviceType?: string;
  corridorRoute?: string;
  originHandoffPoint?: string;
  inlandDestination?: string;
  currentTripStatus?: string;
  assignedDriver?: string;
  driverType?: string;
  assignedTruck?: string;
  assignedTrailer?: string;
  expectedArrivalTime?: string;
  plannedDepartureTime?: string;
  lastUpdated?: string;
  departedDjiboutiAt?: string;
  blNumberRef?: string;
  liveMovement?: { eta?: string; currentLocation?: string };
  checkpoints?: Array<{ label?: string; location?: string; timestamp?: string }>;
};

function sidebarWidthStorageKey(userId?: string) {
  return userId ? `${SIDEBAR_WIDTH_KEY}:${userId}` : SIDEBAR_WIDTH_KEY;
}

function sidebarCollapsedStorageKey(userId?: string) {
  return userId ? `${SIDEBAR_COLLAPSED_KEY}:${userId}` : SIDEBAR_COLLAPSED_KEY;
}

const labelKeyMap: Record<string, string> = {
  Dashboard: 'dashboard',
  'Corridor Workspaces': 'corridorWorkspaces',
  'Customer View': 'customerView',
  'Finance & Control': 'financeAndControl',
  Communication: 'communication',
  Settings: 'settingsNav',
  'Executive Dashboard': 'executiveDashboard',
  'Booking / Quote Desk': 'supplierAgentDesk',
  'Tikur Abay Port Agent Desk (China)': 'supplierAgentDesk',
  'Supplier Agent Desk': 'supplierAgentDesk',
  'Multimodal / Djibouti Release Desk': 'djiboutiReleaseDesk',
  'Djibouti Release Desk': 'djiboutiReleaseDesk',
  'Transitor / Clearance Desk': 'financeCustomsControl',
  'Corridor Dispatch Hub': 'corridorDispatchHub',
  'Corridor Dispatch': 'corridorDispatchHub',
  'Dry-Port / Yard Desk': 'yardDesk',
  'Yard / Delivery Desk': 'yardDesk',
  'Empty Return Control': 'emptyReturnControl',
  'Finance / Customs Control': 'financeCustomsControl',
  'Customer Portal View': 'customerPortalView',
  'Customer Portal': 'customerPortalView',
  Payments: 'payments',
  Notifications: 'notifications',
  Alerts: 'notifications',
  'Support / Communications': 'chat',
  Chat: 'chat',
  Profile: 'profile',
  'My Account': 'myAccount',
  'System Settings': 'systemSettings',
  'User Access': 'userAccess',
  'Operations Status': 'operationsStatus',
};

function navIcon(label: string) {
  const className = 'sidebar-link-icon-svg';
  switch (label) {
    case 'Executive Dashboard':
    case 'Dashboard':
      return <LayoutDashboardIcon className={className} />;
    case 'Djibouti Release Desk':
    case 'Multimodal / Djibouti Release Desk':
    case 'Transitor / Clearance Desk':
    case 'Corridor Dispatch Hub':
    case 'Corridor Dispatch':
    case 'Corridor Workspaces':
      return <RouteIcon className={className} />;
    case 'Booking / Quote Desk':
    case 'Tikur Abay Port Agent Desk (China)':
    case 'Supplier Agent Desk':
      return <BriefcaseIcon className={className} />;
    case 'Dry-Port / Yard Desk':
    case 'Yard / Delivery Desk':
      return <TruckIcon className={className} />;
    case 'Empty Return Control':
      return <RefreshIcon className={className} />;
    case 'Customer Portal View':
    case 'Customer Portal':
    case 'Customer View':
      return <UsersIcon className={className} />;
    case 'Finance / Customs Control':
    case 'Finance & Control':
    case 'Payments':
      return <WalletIcon className={className} />;
    case 'System Settings':
    case 'User Access':
      return <SettingsIcon className={className} />;
    case 'Operations Status':
      return <ActivityIcon className={className} />;
    case 'Notifications':
    case 'Communication':
      return <BellIcon className={className} />;
    case 'Profile':
    case 'My Account':
      return <ShieldIcon className={className} />;
    case 'Chat':
      return <MessageSquareIcon className={className} />;
    default:
      return <SettingsIcon className={className} />;
  }
}

function shouldSyncDispatchTrip(trip: ManualDispatchSyncTrip) {
  return String(trip.bookingNumber || '').startsWith('TB-') || String(trip.id || '').startsWith('manual-dispatch-');
}

const manualDispatchSyncSignatureKey = 'tikur-abay:manual-dispatch-sync:signature';

async function syncStoredManualDispatchTrips() {
  if (typeof window === 'undefined') return;
  const raw = window.localStorage.getItem(manualDispatchTripStorageKey);
  if (!raw) return;
  let trips: ManualDispatchSyncTrip[] = [];
  try {
    const parsed = JSON.parse(raw) as ManualDispatchSyncTrip[];
    trips = Array.isArray(parsed) ? parsed : [];
  } catch {
    return;
  }

  const eligibleTrips = trips.filter(shouldSyncDispatchTrip);
  const signature = JSON.stringify(
    eligibleTrips.map((trip) => [
      trip.id,
      trip.bookingNumber,
      trip.currentTripStatus,
      trip.lastUpdated,
      trip.assignedTruck,
      trip.assignedDriver,
      trip.liveMovement?.currentLocation,
      trip.departedDjiboutiAt,
    ]),
  );
  if (window.sessionStorage.getItem(manualDispatchSyncSignatureKey) === signature) {
    return;
  }
  for (const trip of eligibleTrips) {
    try {
      await apiPost('/corridor/manual-sync/dispatch-trip', {
        bookingNumber: trip.bookingNumber,
        tripId: trip.tripId,
        customerName: trip.customerName,
        containerNumber: trip.containerNumber,
        sealNumber: trip.sealNumber,
        serviceType: trip.serviceType || 'multimodal',
        route: trip.corridorRoute,
        corridorRoute: trip.corridorRoute,
        origin: trip.originHandoffPoint,
        destination: trip.inlandDestination,
        inlandDestination: trip.inlandDestination,
        shippingLine: 'MSC',
        originPort: 'Shanghai',
        finalDeliveryLocation: trip.inlandDestination,
        incoterm: 'CFR',
        driverName: trip.assignedDriver === 'Not assigned' || trip.assignedDriver === 'Pending driver' ? '' : trip.assignedDriver,
        driverPhone: '+251900000015',
        driverType: trip.driverType === 'External' ? 'external_driver' : 'internal_driver',
        truckPlate: trip.assignedTruck === 'Not assigned' ? '' : trip.assignedTruck,
        trailerPlate: trip.assignedTrailer === 'Pending trailer' ? '' : trip.assignedTrailer,
        blNumber: trip.blNumber,
        transitDocumentNumber: `T1-${trip.bookingNumber}`,
        packingListNumber: `PL-${trip.bookingNumber}`,
        invoiceNumber: `INV-${trip.bookingNumber}`,
        releaseNoteNumber: `REL-${trip.bookingNumber}`,
        expectedArrivalTime: trip.expectedArrivalTime,
        eta: trip.liveMovement?.eta || trip.expectedArrivalTime,
        actualDeparture: ['In transit', 'Checkpoint hold', 'Delayed', 'Arrived inland', 'Awaiting unload handoff'].includes(String(trip.currentTripStatus || ''))
          ? trip.checkpoints?.find((event) => event.label === 'Gate-out from Djibouti')?.timestamp
          : undefined,
        actualArrival: ['Arrived inland', 'Awaiting unload handoff'].includes(String(trip.currentTripStatus || ''))
          ? trip.checkpoints?.find((event) => event.location === trip.inlandDestination)?.timestamp
          : undefined,
        currentCheckpoint: trip.liveMovement?.currentLocation || trip.originHandoffPoint,
        tripStatus: String(trip.currentTripStatus || 'Assigned').toLowerCase().split(' ').join('_'),
        dispatchStatus: String(trip.currentTripStatus || 'Assigned').toLowerCase().split(' ').join('_'),
      });
    } catch {
      // best effort bridge; dispatch desk still owns the authoritative local state
    }
  }
  window.sessionStorage.setItem(manualDispatchSyncSignatureKey, signature);
}

type ShellNextTaskState = {
  tone: 'orange';
  label: string;
  text: string;
} | null;

type ShellAiOperationsState = {
  summary: string;
  status: 'ready' | 'watch' | 'blocked';
  metrics: Array<{ label: string; value: string }>;
  nextActionLabel: string;
  nextActionText: string;
  nextActionHref: string;
};

let shellAiStateCacheSignature = '';
let shellAiStateCacheValue: ShellAiOperationsState | null = null;

function readShellAiStateSignature() {
  if (typeof window === 'undefined') return '';
  return [
    bookingQuoteStorageKey,
    'tikur-abay:shipping-phase1:validations',
    'tikur-abay:shipping-phase1:payments',
    'tikur-abay:shipping-phase4:lcs',
    'tikur-abay:shipping-phase4:release-controls',
    'tikur-abay:shipping-phase2:instructions',
    'tikur-abay:shipping-phase2:bills',
    'tikur-abay:shipping-phase2:manifests',
    'tikur-abay:shipping-phase3:fleet',
    'tikur-abay:shipping-phase3:containers',
    'tikur-abay:shipping-phase3:incidents',
    'tikur-abay:shipping-phase5:after-sales',
    'tikur-abay:shipping-phase6:carrier-assignments',
    'tikur-abay:supplier-desk:manual-shipments',
    'tikur-abay:yard-post-delivery-follow-up',
  ]
    .map((key) => `${key}:${window.localStorage.getItem(key) || ''}`)
    .join('|');
}

function deriveShellAiOperationsState() : ShellAiOperationsState {
  const signature = readShellAiStateSignature();
  if (signature && shellAiStateCacheSignature === signature && shellAiStateCacheValue) {
    return shellAiStateCacheValue;
  }
  const requests = readSharedQuoteRequests([]);
  const shipping = readShippingPhase1Workspace();
  const quotesAwaitingApproval = requests.filter((item) => item.approvalStatus === 'waiting_approval').length;
  const bookingsAwaitingOrigin = requests.filter((item) => item.bookingId && item.bookingStatus !== 'assigned_to_origin').length;
  const originDocsPending = shipping.instructions.filter((item) => item.status !== 'approved').length;
  const blPending = shipping.billsOfLading.filter((item) => item.status !== 'final').length;
  const manifestPending = shipping.manifests.filter((item) => item.status !== 'generated').length;
  const trackingExceptions = shipping.incidents.filter((item) => item.status === 'open').length;

  if (quotesAwaitingApproval > 0) {
    shellAiStateCacheValue = {
      summary: 'Commercial approvals are the current bottleneck.',
      status: 'watch',
      metrics: [
        { label: 'Quotes awaiting approval', value: String(quotesAwaitingApproval) },
        { label: 'BL pending', value: String(blPending) },
        { label: 'Tracking exceptions', value: String(trackingExceptions) },
      ],
      nextActionLabel: 'Follow Quote Approval',
      nextActionText: 'Customer approval is still the fastest way to unblock downstream booking, BL, and manifest work.',
      nextActionHref: '/operations/booking-quote',
    };
    shellAiStateCacheSignature = signature;
    return shellAiStateCacheValue;
  }

  if (originDocsPending > 0) {
    shellAiStateCacheValue = {
      summary: 'Origin document readiness is holding the shipping packet.',
      status: 'blocked',
      metrics: [
        { label: 'Origin docs pending', value: String(originDocsPending) },
        { label: 'BL pending', value: String(blPending) },
        { label: 'Manifest pending', value: String(manifestPending) },
      ],
      nextActionLabel: 'Clear Shipping Instruction',
      nextActionText: 'Approved shipping instructions unlock BL approval and stabilize the shipping document chain.',
      nextActionHref: '/shipping/instructions',
    };
    shellAiStateCacheSignature = signature;
    return shellAiStateCacheValue;
  }

  if (blPending > 0) {
    shellAiStateCacheValue = {
      summary: 'Bills of lading remain the active document gate.',
      status: 'watch',
      metrics: [
        { label: 'BL pending', value: String(blPending) },
        { label: 'Manifest pending', value: String(manifestPending) },
        { label: 'Bookings awaiting origin', value: String(bookingsAwaitingOrigin) },
      ],
      nextActionLabel: 'Finalize BL Pack',
      nextActionText: 'Carrier schedule lock, BL approval, and final issue should be completed before manifest generation.',
      nextActionHref: '/shipping/bills-of-lading',
    };
    shellAiStateCacheSignature = signature;
    return shellAiStateCacheValue;
  }

  if (manifestPending > 0) {
    shellAiStateCacheValue = {
      summary: 'Voyage manifests are the next release gate.',
      status: 'watch',
      metrics: [
        { label: 'Manifest pending', value: String(manifestPending) },
        { label: 'Tracking exceptions', value: String(trackingExceptions) },
        { label: 'Bookings awaiting origin', value: String(bookingsAwaitingOrigin) },
      ],
      nextActionLabel: 'Generate Manifest',
      nextActionText: 'BL is in control. The next system move is consolidating the voyage manifest for dispatch.',
      nextActionHref: '/shipping/manifest',
    };
    shellAiStateCacheSignature = signature;
    return shellAiStateCacheValue;
  }

  if (trackingExceptions > 0) {
    shellAiStateCacheValue = {
      summary: 'Document flow is mostly clear, but movement execution needs intervention.',
      status: 'blocked',
      metrics: [
        { label: 'Tracking exceptions', value: String(trackingExceptions) },
        { label: 'Bookings awaiting origin', value: String(bookingsAwaitingOrigin) },
        { label: 'Quotes awaiting approval', value: String(quotesAwaitingApproval) },
      ],
      nextActionLabel: 'Resolve Tracking Exceptions',
      nextActionText: 'Open container incidents or stale tracking signals need dispatch attention before clean closure.',
      nextActionHref: '/shipping/tracking',
    };
    shellAiStateCacheSignature = signature;
    return shellAiStateCacheValue;
  }

  shellAiStateCacheValue = {
    summary: 'The end-to-end chain is balanced across commercial, documents, and execution.',
    status: 'ready',
    metrics: [
      { label: 'Quotes awaiting approval', value: String(quotesAwaitingApproval) },
      { label: 'BL pending', value: String(blPending) },
      { label: 'Tracking exceptions', value: String(trackingExceptions) },
    ],
    nextActionLabel: 'Open Operations Status',
    nextActionText: 'No immediate blockers dominate the corridor. Monitor live execution and exception drift from the operations hub.',
    nextActionHref: '/operations-status',
  };
  shellAiStateCacheSignature = signature;
  return shellAiStateCacheValue;
}

export function ConsoleShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isExecutiveRoute = pathname === '/' || pathname === '/dashboards/executive';
  const isDispatchRoute = pathname.startsWith('/operations/corridor-dispatch') || pathname === '/corridor-dispatch' || pathname === '/corridor/dispatch';
  const [session, setSession] = useState<ConsoleSession | null>(null);
  const [language, setLanguage] = useState<ConsoleLanguage>('en');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [globalSearchContext, setGlobalSearchContext] = useState<{ query: string; result: GlobalLocatorResult | null }>({
    query: searchParams.get('query') || searchParams.get('q') || '',
    result: null,
  });
  const [authRedirecting, setAuthRedirecting] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDesktopSidebar, setIsDesktopSidebar] = useState(true);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [sidebarPrefsReady, setSidebarPrefsReady] = useState(false);
  const [clientReady, setClientReady] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [shellNextTaskOverride, setShellNextTaskOverride] = useState<ShellNextTaskState>(null);
  const [closureJourneyOverride, setClosureJourneyOverride] = useState<ClosureJourneyOverrideState>(null);
  const [shellAiOperations, setShellAiOperations] = useState<ShellAiOperationsState>(() => deriveShellAiOperationsState());
  const loadedPreferenceSessionId = useRef<string | null>(null);
  const workflowContextParams = useMemo(() => {
    const params = new URLSearchParams();
    for (const key of ['booking', 'shipment', 'container', 'query', 'q']) {
      const value = searchParams.get(key);
      if (value) {
        params.set(key, value);
      }
    }
    return params;
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setLanguage(readConsoleLanguage());
    const nextSession = readSession();
    setSession(nextSession);
    setAuthRedirecting(!nextSession);
    setIsDesktopSidebar(window.innerWidth > DESKTOP_BREAKPOINT);
    setClientReady(true);
    setAuthChecked(true);
  }, []);

  useEffect(() => {
    if (
      !clientReady ||
      pathname.startsWith('/auth/login') ||
      pathname === '/shipping/track' ||
      pathname === '/track' ||
      pathname.startsWith('/track/')
    ) {
      return;
    }

    const nextSession = readSession();
    if (!nextSession) {
      setSession(null);
      setAuthRedirecting(true);
      window.location.replace('/auth/login');
      return;
    }

    if (!canAccessPath(nextSession.role, pathname)) {
      setSession(nextSession);
      router.replace(nextSession.dashboardRoute || '/');
      return;
    }

    setAuthRedirecting(false);
    setSession(nextSession);
    setAuthChecked(true);
  }, [clientReady, pathname, router]);

  useEffect(() => {
    setShellNextTaskOverride(null);
    setClosureJourneyOverride(null);
    if (typeof window === 'undefined') return;
    if (!(pathname.includes('/operations/dry-port-yard') || pathname.includes('/operations/yard-desk') || pathname === '/corridor/yard')) {
      return;
    }

    const handleYardNextTask = (event: Event) => {
      const detail = (event as CustomEvent<{
        closed?: boolean;
        title?: string;
        helper?: string;
        closureStepKey?: ClosureJourneyStep['key'];
      }>).detail;
      if (detail?.closed) {
        setShellNextTaskOverride({
          tone: 'orange',
          label: 'Completed',
          text: 'Shipment cycle complete',
        });
        setClosureJourneyOverride({
          activeKey: 'closed',
          title: detail.title || 'Close shipment cycle',
          helper: detail.helper || 'All closure controls are complete.',
          closed: true,
        });
      } else if (detail?.closureStepKey && detail?.title && detail?.helper) {
        setClosureJourneyOverride({
          activeKey: detail.closureStepKey,
          title: detail.title,
          helper: detail.helper,
          closed: false,
        });
        setShellNextTaskOverride(null);
        return;
      }
      setShellNextTaskOverride(null);
      setClosureJourneyOverride(null);
    };

    window.addEventListener('tikur-abay:yard-next-task', handleYardNextTask as EventListener);
    return () => window.removeEventListener('tikur-abay:yard-next-task', handleYardNextTask as EventListener);
  }, [pathname]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const refreshShellAi = () => {
      setShellAiOperations(deriveShellAiOperationsState());
    };
    const handleStorage = (event: StorageEvent) => {
      if (!event.key || shellAiRelevantStorageKeys.has(event.key)) {
        refreshShellAi();
      }
    };
    const handleShippingPhaseUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string }>).detail;
      if (!detail?.key || shellAiRelevantStorageKeys.has(detail.key)) {
        refreshShellAi();
      }
    };

    refreshShellAi();
    window.addEventListener('storage', handleStorage);
    window.addEventListener(sharedQuoteStorageUpdatedEvent, refreshShellAi as EventListener);
    window.addEventListener(shippingPhase1UpdatedEvent, handleShippingPhaseUpdate as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(sharedQuoteStorageUpdatedEvent, refreshShellAi as EventListener);
      window.removeEventListener(shippingPhase1UpdatedEvent, handleShippingPhaseUpdate as EventListener);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isDispatchRoute && !isExecutiveRoute) return;
    void syncStoredManualDispatchTrips();
    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === manualDispatchTripStorageKey) {
        void syncStoredManualDispatchTrips();
      }
    };
    const handleManualDispatchWrite = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string }>).detail;
      if (!detail?.key || detail.key === manualDispatchTripStorageKey) {
        void syncStoredManualDispatchTrips();
      }
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener(
      manualCorridorStorageUpdatedEvent,
      handleManualDispatchWrite as EventListener,
    );
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(
        manualCorridorStorageUpdatedEvent,
        handleManualDispatchWrite as EventListener,
      );
    };
  }, [isDispatchRoute, isExecutiveRoute]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const onResize = () => {
      setIsDesktopSidebar(window.innerWidth > DESKTOP_BREAKPOINT);
    };

    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!sidebarPrefsReady) return;
    window.localStorage.setItem(sidebarWidthStorageKey(session?.id), String(sidebarWidth));
  }, [session?.id, sidebarPrefsReady, sidebarWidth]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!sidebarPrefsReady) return;
    window.localStorage.setItem(sidebarCollapsedStorageKey(session?.id), String(sidebarCollapsed));
  }, [session?.id, sidebarCollapsed, sidebarPrefsReady]);

  useEffect(() => {
    if (typeof window === 'undefined' || !session?.id) return;
    setSidebarPrefsReady(false);

    const storedWidthRaw = window.localStorage.getItem(sidebarWidthStorageKey(session.id));
    const storedCollapsed = window.localStorage.getItem(sidebarCollapsedStorageKey(session.id));

    if (storedWidthRaw !== null && Number.isFinite(Number(storedWidthRaw))) {
      const storedWidth = Number(storedWidthRaw);
      setSidebarWidth(Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, storedWidth)));
    } else {
      setSidebarWidth(SIDEBAR_DEFAULT_WIDTH);
    }

    setSidebarCollapsed(storedCollapsed === 'true');
    setSidebarPrefsReady(true);
  }, [session?.id]);

  useEffect(() => {
    if (!isResizingSidebar || !isDesktopSidebar) {
      return undefined;
    }

    const onPointerMove = (event: PointerEvent) => {
      const nextWidth = Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, event.clientX));
      setSidebarCollapsed(false);
      setSidebarWidth(nextWidth);
    };

    const stopResize = () => {
      setIsResizingSidebar(false);
      document.body.classList.remove('sidebar-resizing');
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', stopResize);
    document.body.classList.add('sidebar-resizing');

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', stopResize);
      document.body.classList.remove('sidebar-resizing');
    };
  }, [isDesktopSidebar, isResizingSidebar]);

  useEffect(() => {
    if (!session) {
      loadedPreferenceSessionId.current = null;
      return;
    }

    if (loadedPreferenceSessionId.current === session.id) {
      return;
    }

    let cancelled = false;
    loadedPreferenceSessionId.current = session.id;

    async function loadPreferences() {
      try {
        const preference = await apiGet<{ language?: string }>('/me/preferences');
        if (cancelled) return;
        const nextLanguage = resolveActiveConsoleLanguage(preference.language);
        setLanguage(nextLanguage);
        persistConsoleLanguage(nextLanguage);
      } catch (error) {
        if (cancelled) return;
        loadedPreferenceSessionId.current = null;
        console.error('Failed to load console preferences', error);
      }
    }

    void loadPreferences();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const meta = useMemo(() => routeMeta(pathname), [pathname]);
  const t = (key: string, fallback?: string) => translate(language, key, fallback);
  const tx = (text: string) => translateUiText(language, text);
  const isShippingWorkspaceRoute =
    pathname.startsWith('/shipping') ||
    pathname.startsWith('/operations/shipping');
  const isConsoleWorkspaceRoute =
    isExecutiveRoute ||
    pathname.startsWith('/operations/') ||
    pathname.startsWith('/customer');
  const showExecutiveFilters = session?.role === 'super_admin' || session?.role === 'executive';
  const effectiveSidebarWidth = isDesktopSidebar ? (sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : sidebarWidth) : SIDEBAR_DEFAULT_WIDTH;
  const shellStyle = {
    '--sidebar-width': `${effectiveSidebarWidth}px`,
  } as CSSProperties;
  const activeDeskLabel = isExecutiveRoute
    ? 'HQ Console'
    : pathname.startsWith('/operations/booking') || pathname.startsWith('/shipments/intake') || pathname.startsWith('/bookings/new')
      ? 'Booking / Quote Desk'
      : meta.title;
  const deskSubtitle = isExecutiveRoute
    ? 'Corridor command summary'
    : pathname.startsWith('/operations/booking') || pathname.startsWith('/bookings/new')
      ? 'Quote, approval, and booking control'
      : pathname.startsWith('/operations/djibouti-release')
        ? 'Release blockers and gate-out control'
        : pathname.startsWith('/operations/transitor-clearance')
          ? 'T1, charges, and dispatch release'
          : pathname.startsWith('/operations/corridor-dispatch')
            ? 'Dispatch, movement, and arrival handoff'
            : pathname.startsWith('/operations/dry-port-yard')
              ? 'Arrival, yard, pickup, and closure'
              : pathname.startsWith('/customer')
                ? 'Shipment timeline and customer actions'
                : 'Operations workspace';
  const routeWorkflowIndex = workflowSteps.findIndex((step) => step.matches(pathname));
  const searchedWorkflowIndex = useMemo(() => {
    if (!isExecutiveRoute) return null;

    const booking = normalizeWorkflowReference(searchParams.get('booking') || '');
    if (booking) {
      return 1;
    }

    const query = normalizeWorkflowReference(globalSearchContext.query || searchParams.get('query') || searchParams.get('q') || '');
    if (!query) return null;

    if (isBookingWorkflowReference(query)) {
      return 1;
    }

    if (!globalSearchContext.result?.container) return null;
    return inferWorkflowIndexFromTracking(globalSearchContext.result);
  }, [globalSearchContext, isExecutiveRoute, searchParams]);
  const activeWorkflowIndex = searchedWorkflowIndex ?? routeWorkflowIndex;
  const activeWorkflowStep = activeWorkflowIndex >= 0 ? workflowSteps[activeWorkflowIndex] : workflowSteps[0];
  const previousWorkflowStep = activeWorkflowIndex > 0 ? workflowSteps[activeWorkflowIndex - 1] : null;
  const nextWorkflowStep = activeWorkflowIndex >= 0 && activeWorkflowIndex < workflowSteps.length - 1 ? workflowSteps[activeWorkflowIndex + 1] : null;
  const activeClosureIndex = closureJourneyOverride
    ? Math.max(0, closureJourneySteps.findIndex((step) => step.key === closureJourneyOverride.activeKey))
    : closureJourneyIndexFromPath(pathname);
  const baseClosureStep = closureJourneySteps[activeClosureIndex] ?? closureJourneySteps[0];
  const activeClosureStep = closureJourneyOverride
    ? { ...baseClosureStep, title: closureJourneyOverride.title, helper: closureJourneyOverride.helper }
    : baseClosureStep;
  const nextClosureStep = activeClosureIndex < closureJourneySteps.length - 1 ? closureJourneySteps[activeClosureIndex + 1] : null;
  const showFlowNavigator = !pathname.startsWith('/notifications') && !pathname.startsWith('/chat');
  const isPublicTrackingRoute = pathname === '/shipping/track' || pathname === '/track' || pathname.startsWith('/track/');
  if (pathname.startsWith('/auth/login') || isPublicTrackingRoute) {
    return <>{children}</>;
  }

  if (!clientReady || !authChecked) {
    return (
      <div className="shell">
        <div className="panel">
          <div className="loading-panel">{t('loadingConsole', 'Loading console...')}</div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="shell">
        <div className="panel">
          <div className="loading-panel">
            {authRedirecting ? t('enterConsole', 'Sign in') : t('loadingConsole', 'Loading console...')}
          </div>
        </div>
      </div>
    );
  }

  if (pathname.startsWith('/china-desk')) {
    return <ChinaDeskShell session={session}>{children}</ChinaDeskShell>;
  }

  function updateQuery(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([key, value]) => {
      if (!value || value === 'all') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  async function handleLogout() {
    await apiLogout();
    clearSession();
    router.replace('/auth/login');
  }

  return (
    <div className={sidebarCollapsed ? 'console-shell sidebar-collapsed' : 'console-shell'} style={shellStyle}>
      <aside className={mobileSidebarOpen ? 'sidebar open' : 'sidebar'}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-brand-mark">
              <div className="sidebar-logo-shell">
                <img src="/branding/tikur-abay-logo.png" alt="Tikur Abay Transport logo" className="sidebar-logo" />
              </div>
              <div className="sidebar-brand-copy">
                <div className="sidebar-kicker">Tikur Abay</div>
                <h1>{t('unifiedConsole', 'Tikur Abay')}</h1>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="sidebar-collapse-button"
            onClick={() => setSidebarCollapsed((value) => !value)}
            aria-label={sidebarCollapsed ? t('openNavigation', 'Expand navigation') : t('collapseNavigation', 'Collapse navigation')}
            title={sidebarCollapsed ? t('openNavigation', 'Expand navigation') : t('collapseNavigation', 'Collapse navigation')}
          >
            <PanelLeftIcon size={16} />
          </button>
          <button type="button" className="sidebar-close-button" onClick={() => setMobileSidebarOpen(false)} aria-label="Close navigation">
            <PanelLeftIcon size={16} />
          </button>
        </div>

        <div
          className="sidebar-signed-in"
          data-initials={`${session.firstName[0] ?? ''}${session.lastName[0] ?? ''}`}
          title={sidebarCollapsed ? `${tx(session.role.replace(/_/g, ' '))} • ${session.branch}` : undefined}
        >
          <div className="label">{session.name}</div>
          <strong>{tx(session.role.replace(/_/g, ' '))}</strong>
          <span>{session.branch}</span>
          <button type="button" className="sidebar-signout-button" onClick={handleLogout}>
            Sign out
          </button>
        </div>

        <div className="sidebar-sections">
          {navForRole(session.role).map((group) => (
            <section key={group.key} className="sidebar-group">
              <div className="sidebar-group-label" title={sidebarCollapsed ? t(labelKeyMap[group.label] ?? group.label, group.label) : undefined}>
                {navIcon(group.label)}
                <span>{t(labelKeyMap[group.label] ?? group.label, group.label)}</span>
              </div>
              <div className="sidebar-nav">
                {group.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={active ? 'sidebar-link active' : 'sidebar-link'}
                      title={sidebarCollapsed ? t(labelKeyMap[item.label] ?? item.label, item.label) : undefined}
                      aria-label={sidebarCollapsed ? t(labelKeyMap[item.label] ?? item.label, item.label) : undefined}
                    >
                      <span className="sidebar-link-icon">{navIcon(item.label)}</span>
                      <span className="sidebar-link-title">{t(labelKeyMap[item.label] ?? item.label, item.label)}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <button
          type="button"
          className="sidebar-resize-handle"
          aria-label={t('resizeNavigation', 'Resize navigation')}
          title={t('resizeNavigation', 'Resize navigation')}
          onPointerDown={(event) => {
            if (!isDesktopSidebar) return;
            event.preventDefault();
            setIsResizingSidebar(true);
          }}
        />
      </aside>

      {mobileSidebarOpen ? <button type="button" className="sidebar-backdrop" aria-label="Close navigation overlay" onClick={() => setMobileSidebarOpen(false)} /> : null}

      <div className="console-main">
        <div className={isExecutiveRoute ? 'console-topbar executive-topbar' : 'console-topbar'}>
          <ConsoleCommandHeader
            title={isExecutiveRoute ? 'Executive Dashboard' : t(labelKeyMap[meta.title] ?? meta.title, meta.title)}
            subtitle={deskSubtitle}
            contextTitle=""
            contextSubtitle=""
            menuButton={
              <button type="button" className="icon-button topbar-menu-button" onClick={() => setMobileSidebarOpen(true)} aria-label="Open navigation">
                <MenuIcon size={18} />
              </button>
            }
            tools={
              <div className={isExecutiveRoute ? 'header-tools executive-header-tools' : 'header-tools'}>
                <ConsoleShellGlobalSearch
                  isConsoleWorkspaceRoute={isConsoleWorkspaceRoute}
                  isShippingWorkspaceRoute={isShippingWorkspaceRoute}
                  onStateChange={setGlobalSearchContext}
                />
                {showExecutiveFilters ? (
                  <label className="toolbar-select">
                    <select
                      aria-label={t('dateRange', 'Date range')}
                      value={searchParams.get('range') || '30d'}
                      onChange={(event) => updateQuery({ range: event.target.value })}
                    >
                      {dateRangeOptions.map((option) => (
                        <option key={option.value} value={option.value}>{t(option.label, option.label)}</option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {showExecutiveFilters ? (
                  <label className="toolbar-select toolbar-select-wide">
                    <select
                      aria-label={t('branch', 'Branch')}
                      value={searchParams.get('branch') || 'all'}
                      onChange={(event) => updateQuery({ branch: event.target.value })}
                    >
                      <option value="all">{t('allBranches', 'All branches')}</option>
                      {branchOptions.slice(1).map((option) => (
                        <option key={option} value={option}>{tx(option)}</option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>
            }
            utilities={
              <>
                {!isExecutiveRoute &&
                !isShippingWorkspaceRoute &&
                !pathname.startsWith('/shipments/intake') &&
                (session.role === 'super_admin' || session.role === 'executive') ? (
                  <button className="btn btn-secondary btn-compact topbar-utility-button" type="button" onClick={() => router.push('/dashboards/executive')}>
                    HQ Console
                  </button>
                ) : null}
              </>
            }
            profile={null}
          />
        </div>

        <ConsoleShellFlowPanels
          showFlowNavigator={showFlowNavigator}
          isConsoleWorkspaceRoute={isConsoleWorkspaceRoute}
          workflowSteps={workflowSteps.map((step) => ({
            key: step.key,
            title: step.title,
            helper: step.helper,
            href: withWorkflowContext(step.href, workflowContextParams),
            doc: step.docs[0],
          }))}
          activeWorkflowIndex={activeWorkflowIndex}
          activeWorkflowStep={{
            key: activeWorkflowStep.key,
            title: activeWorkflowStep.title,
            helper: activeWorkflowStep.helper,
            href: withWorkflowContext(activeWorkflowStep.href, workflowContextParams),
            doc: activeWorkflowStep.docs[0],
          }}
          previousWorkflowStep={previousWorkflowStep ? {
            title: previousWorkflowStep.title,
            href: withWorkflowContext(previousWorkflowStep.href, workflowContextParams),
          } : null}
          nextWorkflowStep={nextWorkflowStep ? {
            title: nextWorkflowStep.title,
            href: withWorkflowContext(nextWorkflowStep.href, workflowContextParams),
          } : null}
          activeWorkflowDocs={activeWorkflowStep.docs}
          shellAiOperations={shellAiOperations}
          closureJourneySteps={closureJourneySteps.map((step) => ({
            key: step.key,
            title: step.title,
            helper: step.helper,
            href: withWorkflowContext(step.href, workflowContextParams),
            proof: step.proof,
          }))}
          activeClosureIndex={activeClosureIndex}
          activeClosureStep={{
            key: activeClosureStep.key,
            title: activeClosureStep.title,
            helper: activeClosureStep.helper,
            href: withWorkflowContext(activeClosureStep.href, workflowContextParams),
            proof: activeClosureStep.proof,
          }}
          nextClosureStep={nextClosureStep ? {
            title: nextClosureStep.title,
            href: withWorkflowContext(nextClosureStep.href, workflowContextParams),
          } : null}
        />

        <div className="console-content">{children}</div>
      </div>
    </div>
  );
}
