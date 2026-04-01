'use client';

import Link from 'next/link';
import { useDeferredValue, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { readSession } from '../lib/auth-session';
import { manualCorridorStorageUpdatedEvent } from '../lib/manual-corridor-journey';
import {
  addShippingContainerEvent,
  assignShippingTruck,
  canOperateShippingAction,
  createShippingIncident,
  findShippingTrackingMatches,
  formatCorridorMilestoneLabel,
  readShippingPhase1Workspace,
  resolveShippingIncident,
  shippingActionOwner,
  shippingPhase1UpdatedEvent,
  type ShippingContainerEventType,
} from '../lib/shipping-phase1';
import { sharedQuoteStorageUpdatedEvent } from '../lib/shared-quote-storage';

const eventOptions: Array<{ value: ShippingContainerEventType; label: string; location: string; note: string }> = [
  { value: 'EMPTY_RELEASED', label: 'Empty release (EMPTY_OUT)', location: 'Shanghai empty depot', note: 'Container released empty for shipper pickup.' },
  { value: 'EMPTY_PICKUP', label: 'Container pickup (EMPTY_OUT)', location: 'Shipper pickup yard', note: 'Container picked up from depot.' },
  { value: 'LOADED_AT_SHIPPER', label: 'Loaded at shipper (FULL_OUT)', location: 'Shipper factory', note: 'Cargo loaded into container at shipper.' },
  { value: 'GATE_IN_AT_PORT', label: 'Gate-in at port (FULL_OUT)', location: 'Shanghai terminal gate', note: 'Container gated in at origin port.' },
  { value: 'LOADED_ON_VESSEL', label: 'Loaded on vessel (FULL_OUT)', location: 'Shanghai terminal berth', note: 'Container loaded on the outbound vessel.' },
  { value: 'VESSEL_DEPARTED', label: 'Vessel departed (FULL_OUT)', location: 'At sea', note: 'Vessel departed origin port.' },
  { value: 'TRANSSHIPMENT', label: 'Transshipment (FULL_OUT)', location: 'Transshipment hub', note: 'Container moved through transshipment hub.' },
  { value: 'VESSEL_ARRIVED', label: 'Vessel arrived (FULL_OUT)', location: 'Djibouti terminal', note: 'Inbound vessel arrived at Djibouti.' },
  { value: 'DISCHARGED_FROM_VESSEL', label: 'Discharged (FULL_OUT)', location: 'Djibouti quay', note: 'Container discharged from vessel.' },
  { value: 'AVAILABLE_FOR_CLEARANCE', label: 'Available for clearance (FULL_OUT)', location: 'Djibouti release yard', note: 'Container released for customs and clearance work.' },
  { value: 'CUSTOMS_CLEARED', label: 'Customs cleared (FULL_OUT)', location: 'Djibouti release yard', note: 'Customs and release packet completed.' },
  { value: 'HANDOFF', label: 'Record handoff', location: 'Djibouti handoff gate', note: 'Container handoff completed between desks.' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for delivery (FULL_OUT)', location: 'Inland delivery corridor', note: 'Container left dry-port control for delivery.' },
  { value: 'IN_TRANSIT', label: 'Mark in transit (FULL_OUT)', location: 'Galafi corridor', note: 'Container moving on inland corridor.' },
  { value: 'ARRIVED', label: 'Mark arrived inland', location: 'Adama Dry Port', note: 'Container reached inland destination.' },
  { value: 'EMPTY_RETURNED', label: 'Mark empty returned (EMPTY_RETURNED)', location: 'Djibouti empty depot', note: 'Empty container returned and closed.' },
];

function formatDate(value: string) {
  if (!value) return 'Pending';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

const corridorNodes = [
  { key: 'empty_release', label: 'Empty Release', match: ['empty release'] },
  { key: 'pickup', label: 'Pickup / Loaded', match: ['pickup', 'loaded at shipper'] },
  { key: 'gate_in', label: 'Gate-in Port', match: ['gate-in', 'origin port'] },
  { key: 'vessel', label: 'On Vessel', match: ['loaded on vessel', 'vessel departed', 'transshipment', 'at sea'] },
  { key: 'djibouti', label: 'Arrived Djibouti', match: ['vessel arrived', 'discharged', 'clearance', 'djibouti'] },
  { key: 'inland', label: 'Inland Delivery', match: ['truck assigned', 'out for delivery', 'in transit', 'arrived inland', 'delivery'] },
  { key: 'empty', label: 'Empty Return', match: ['empty returned', 'empty return'] },
] as const;

function corridorNodeIndex(location: string, status: string) {
  const haystack = `${location} ${status}`.toLowerCase();
  const matched = corridorNodes.findIndex((node) => node.match.some((token) => haystack.includes(token)));
  return matched >= 0 ? matched : 0;
}

function trackingHeroTone(status: string) {
  const value = status.toLowerCase();
  if (value.includes('returned')) return 'good';
  if (value.includes('arrived')) return 'info';
  if (value.includes('transit')) return 'warning';
  return 'neutral';
}

function timelineStatus(movement: NonNullable<ReturnType<typeof readShippingPhase1Workspace>['containerMovements'][number]> | null, keywords: string[]) {
  if (!movement) return 'next';
  const events = movement.events.map((event) => `${event.type} ${event.location}`.toLowerCase());
  if (events.some((value) => keywords.some((keyword) => value.includes(keyword)))) return 'done';
  if (keywords.some((keyword) => movement.lifecycleStage.toLowerCase().includes(keyword) || movement.currentStatus.toLowerCase().includes(keyword))) return 'active';
  return 'next';
}

function deriveTrackingAlerts(movement: NonNullable<ReturnType<typeof readShippingPhase1Workspace>['containerMovements'][number]> | null) {
  if (!movement) return [];
  const latestEvent = movement.events[0];
  const hoursSinceUpdate = latestEvent ? Math.max((Date.now() - new Date(latestEvent.timestamp).getTime()) / 36e5, 0) : 0;
  const alerts: Array<{ title: string; tone: 'critical' | 'warning' | 'info'; detail: string }> = [];

  if (hoursSinceUpdate >= 12) {
    alerts.push({
      title: 'No update risk',
      tone: 'critical',
      detail: `No new container event for ${Math.floor(hoursSinceUpdate)} hours.`,
    });
  }

  if (movement.currentStatus === 'Truck assigned' && hoursSinceUpdate >= 6) {
    alerts.push({
      title: 'Handoff delay',
      tone: 'warning',
      detail: 'Truck assignment is recorded, but corridor movement has not started on time.',
    });
  }

  const normalizedLocation = movement.currentLocation.toLowerCase();
  const validRouteHints = ['djibouti', 'galafi', 'adama', 'modjo', 'addis', 'combolcha', 'corridor', 'depot', 'port'];
  if (!validRouteHints.some((hint) => normalizedLocation.includes(hint))) {
    alerts.push({
      title: 'Route deviation watch',
      tone: 'info',
      detail: `Current location "${movement.currentLocation}" is outside the expected corridor naming pattern.`,
    });
  }

  return alerts;
}

type ShippingMovement = NonNullable<ReturnType<typeof readShippingPhase1Workspace>['containerMovements'][number]>;

type TrackingCopilotAction = {
  id: 'advance_event' | 'assign_truck' | 'open_incident';
  label: string;
  description: string;
};

type TrackingCopilotState = {
  score: number;
  status: 'ready' | 'watch' | 'blocked';
  headline: string;
  blockers: string[];
  recommendations: string[];
  highlights: string[];
  actions: TrackingCopilotAction[];
};

function compareBookingOrder(left: string, right: string) {
  const leftKey = left.replace(/\D/g, '');
  const rightKey = right.replace(/\D/g, '');
  if (leftKey.length !== rightKey.length) return rightKey.length - leftKey.length;
  return rightKey.localeCompare(leftKey);
}

function deriveTrackingCopilot(
  movement: ShippingMovement | null,
  alerts: Array<{ title: string; tone: 'critical' | 'warning' | 'info'; detail: string }>,
  canAssignTruck: boolean,
  canAddEvent: boolean,
  fleet: ReturnType<typeof readShippingPhase1Workspace>['fleet'],
): TrackingCopilotState {
  if (!movement) {
    return {
      score: 0,
      status: 'blocked',
      headline: 'No movement selected. Choose a container file to activate tracking guidance.',
      blockers: ['Tracking actions are unavailable until a container movement is selected.'],
      recommendations: ['Select a movement from the queue to review the current tracking state.'],
      highlights: [],
      actions: [],
    };
  }

  const blockers: string[] = [];
  const recommendations: string[] = [];
  const highlights: string[] = [];
  const actions: TrackingCopilotAction[] = [];
  let score = 100;
  const latestEvent = movement.events[0];
  const hoursSinceUpdate = latestEvent ? Math.max((Date.now() - new Date(latestEvent.timestamp).getTime()) / 36e5, 0) : 999;
  const status = String(movement.currentStatus || '').toLowerCase();
  const availableTruck = fleet.find((truck) => truck.status === 'available');

  if (!movement.containerNumber || !movement.billOfLadingNumber) {
    blockers.push('Container or BL reference is missing from the movement record.');
    score -= 22;
  } else {
    highlights.push(`${movement.containerNumber} linked to ${movement.billOfLadingNumber}.`);
  }

  if (hoursSinceUpdate >= 12) {
    blockers.push(`No fresh tracking event for ${Math.floor(hoursSinceUpdate)} hours.`);
    score -= 20;
    if (canAddEvent) {
      actions.push({
        id: 'open_incident',
        label: 'Open Incident',
        description: 'Create an exception record for stale tracking visibility.',
      });
    }
  } else {
    highlights.push(`Latest event posted ${Math.max(1, Math.floor(hoursSinceUpdate))} hour(s) ago.`);
  }

  if ((status.includes('customs cleared') || status.includes('available for clearance')) && !movement.assignedTruckId) {
    blockers.push('Container is ready for dispatch but no truck is assigned.');
    score -= 18;
    if (availableTruck && canAssignTruck) {
      actions.push({
        id: 'assign_truck',
        label: 'Assign Available Truck',
        description: `Assign ${availableTruck.plateNumber} from the live truck pool to the selected movement.`,
      });
    }
  }

  if (!status.includes('returned') && movement.returnDelayDays > 0) {
    blockers.push(`Empty return is overdue by ${movement.returnDelayDays} day(s).`);
    score -= 14;
  }

  if (alerts.some((alert) => alert.tone === 'critical')) {
    score -= 12;
  } else if (alerts.some((alert) => alert.tone === 'warning')) {
    score -= 6;
  }

  const nextEvent =
    status.includes('truck assigned') ? eventOptions.find((item) => item.value === 'OUT_FOR_DELIVERY') :
    status.includes('available for clearance') ? eventOptions.find((item) => item.value === 'CUSTOMS_CLEARED') :
    status.includes('customs cleared') ? eventOptions.find((item) => item.value === 'TRUCK_ASSIGNED') :
    status.includes('in transit') || status.includes('out for delivery') ? eventOptions.find((item) => item.value === 'ARRIVED') :
    !status.includes('loaded on vessel') && !status.includes('vessel departed') ? eventOptions.find((item) => item.value === 'LOADED_ON_VESSEL') :
    !status.includes('empty returned') && (status.includes('arrived') || status.includes('delivered')) ? eventOptions.find((item) => item.value === 'EMPTY_RETURNED') :
    null;

  if (nextEvent && canAddEvent) {
    actions.unshift({
      id: 'advance_event',
      label: `Post ${nextEvent.label}`,
      description: `Advance the tracking file to the next likely milestone: ${nextEvent.label}.`,
    });
    recommendations.push(`Next operational move is ${nextEvent.label.toLowerCase()}.`);
  }

  if (!movement.assignedTruckId) {
    recommendations.push('Truck assignment should happen as soon as the file clears dispatch readiness.');
  }
  if (movement.currentLocation) {
    highlights.push(`Current control point is ${movement.currentLocation}.`);
  }
  if (movement.assignedDriverName) {
    highlights.push(`Driver in control: ${movement.assignedDriverName}.`);
  }

  score = Math.max(0, Math.min(100, score));
  return {
    score,
    status: blockers.length > 0 ? 'blocked' : score < 85 ? 'watch' : 'ready',
    headline:
      blockers.length > 0
        ? 'Tracking execution needs intervention before the file moves cleanly.'
        : score < 85
          ? 'Tracking is moving, but the file still needs active operator follow-up.'
          : 'Tracking file is healthy and aligned with the current corridor stage.',
    blockers,
    recommendations: recommendations.length ? recommendations : ['No immediate intervention required. Keep monitoring the next corridor milestone.'],
    highlights,
    actions: actions.slice(0, 3),
  };
}

export function ShippingPhase3Workspace() {
  const [workspace, setWorkspace] = useState(() => readShippingPhase1Workspace());
  const [sessionRole, setSessionRole] = useState(() => readSession()?.role ?? null);
  const [search, setSearch] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    const reload = () => setWorkspace(readShippingPhase1Workspace());
    reload();
    setSessionRole(readSession()?.role ?? null);
    window.addEventListener(sharedQuoteStorageUpdatedEvent, reload as EventListener);
    window.addEventListener(shippingPhase1UpdatedEvent, reload as EventListener);
    window.addEventListener(manualCorridorStorageUpdatedEvent, reload as EventListener);
    return () => {
      window.removeEventListener(sharedQuoteStorageUpdatedEvent, reload as EventListener);
      window.removeEventListener(shippingPhase1UpdatedEvent, reload as EventListener);
      window.removeEventListener(manualCorridorStorageUpdatedEvent, reload as EventListener);
    };
  }, []);

  const movements = useMemo(() => {
    const needle = deferredSearch.trim().toLowerCase();
    return workspace.containerMovements
      .filter((movement) => {
        if (!needle) return true;
        return [movement.bookingId, movement.quoteId, movement.customerName, movement.containerNumber, movement.routeSummary].join(' ').toLowerCase().includes(needle);
      })
      .sort((left, right) => compareBookingOrder(left.bookingId || left.bookingNumber, right.bookingId || right.bookingNumber));
  }, [deferredSearch, workspace.containerMovements]);

  const selectedMovement = movements.find((item) => item.bookingId === selectedBookingId) || movements[0] || null;
  const selectedAlerts = useMemo(() => deriveTrackingAlerts(selectedMovement), [selectedMovement]);
  const activeNodeIndex = selectedMovement ? corridorNodeIndex(selectedMovement.currentLocation, selectedMovement.currentStatus) : 0;
  const canAssignTruck = canOperateShippingAction(sessionRole, 'tracking_assign_truck');
  const canAddEvent = canOperateShippingAction(sessionRole, 'tracking_add_event');
  const canResolveIncident = canOperateShippingAction(sessionRole, 'tracking_resolve_incident');
  const searchCount = useMemo(() => findShippingTrackingMatches(search).movements.length, [search]);
  const trackingCopilot = useMemo(
    () => deriveTrackingCopilot(selectedMovement, selectedAlerts, canAssignTruck, canAddEvent, workspace.fleet),
    [selectedMovement, selectedAlerts, canAssignTruck, canAddEvent, workspace.fleet],
  );

  useEffect(() => {
    if (!selectedBookingId && movements[0]?.bookingId) {
      setSelectedBookingId(movements[0].bookingId);
    }
  }, [movements, selectedBookingId]);

  function runTrackingCopilotAction(actionId: TrackingCopilotAction['id']) {
    if (!selectedMovement) return;
    const status = String(selectedMovement.currentStatus || '').toLowerCase();
    if (actionId === 'assign_truck') {
      const availableTruck = workspace.fleet.find((truck) => truck.status === 'available');
      if (availableTruck) {
        assignShippingTruck(selectedMovement.bookingId, availableTruck.truckId);
      }
      return;
    }
    if (actionId === 'open_incident') {
      createShippingIncident(
        selectedMovement.bookingId,
        'Tracking freshness exception',
        `Copilot flagged stale or risky tracking visibility for ${selectedMovement.containerNumber} at ${selectedMovement.currentLocation}.`,
        'warning',
      );
      return;
    }

    const nextEvent =
      status.includes('truck assigned') ? eventOptions.find((item) => item.value === 'OUT_FOR_DELIVERY') :
      status.includes('available for clearance') ? eventOptions.find((item) => item.value === 'CUSTOMS_CLEARED') :
      status.includes('customs cleared') ? eventOptions.find((item) => item.value === 'TRUCK_ASSIGNED') :
      status.includes('in transit') || status.includes('out for delivery') ? eventOptions.find((item) => item.value === 'ARRIVED') :
      !status.includes('loaded on vessel') && !status.includes('vessel departed') ? eventOptions.find((item) => item.value === 'LOADED_ON_VESSEL') :
      !status.includes('empty returned') && (status.includes('arrived') || status.includes('delivered')) ? eventOptions.find((item) => item.value === 'EMPTY_RETURNED') :
      eventOptions.find((item) => item.value === 'IN_TRANSIT');

    if (nextEvent) {
      addShippingContainerEvent(selectedMovement.bookingId, nextEvent.value, nextEvent.location, nextEvent.note);
    }
  }

  return (
    <main className="shell">
      <section className="supplier-desk-shell">
        <header className="supplier-desk-header">
          <div className="supplier-desk-title">
            <span className="supplier-desk-eyebrow">Shipping Phase 3</span>
            <h1>Fleet and Container Tracking</h1>
            <p>Track the container as the operating object, with truck availability and handoff history in one workspace.</p>
          </div>
          <div className="supplier-desk-toolbar">
            <input className="supplier-desk-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search booking, container, customer, route" />
          </div>
        </header>

        <nav className="supplier-jump-links">
          <Link className="supplier-jump-link" href="/shipping">Full workspace</Link>
          <Link className="supplier-jump-link" href="/shipping/carrier-schedules">Carrier Schedules</Link>
          <Link className="supplier-jump-link" href="/shipping/after-sales">After-Sales</Link>
          <Link className="supplier-jump-link" href="/shipping/finance">Finance</Link>
          <Link className="supplier-jump-link" href="/shipping/instructions">Shipping Instructions</Link>
          <Link className="supplier-jump-link" href="/shipping/bills-of-lading">Bills of Lading</Link>
          <Link className="supplier-jump-link" href="/shipping/manifest">Manifest</Link>
          <Link className="supplier-jump-link" href={search.trim() ? `/shipping/track?query=${encodeURIComponent(search.trim())}` : '/shipping/track'}>Public Track View</Link>
          <Link className="supplier-jump-link is-active" href="/shipping/tracking">Tracking</Link>
        </nav>

        <section className="shipping-phase3-layout">
          <article className="supplier-panel">
            <header className="supplier-panel-header">
              <div>
                <span className="supplier-panel-eyebrow">Track</span>
                <h2>Movement queue</h2>
              </div>
              <p>{movements.length} files</p>
            </header>
            <div className="shipping-track-bar">
              <input className="supplier-desk-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Enter container / BL / booking" />
              <Link href={search.trim() ? `/shipping/track?query=${encodeURIComponent(search.trim())}` : '/shipping/track'} className="supplier-desk-button supplier-desk-button-primary">
                Track
              </Link>
            </div>
            <div className="shipping-phase-note">
              <span>Lookup coverage</span>
              <p>{searchCount} matching container movement record{searchCount === 1 ? '' : 's'} for the current search.</p>
            </div>
            <div className="supplier-queue-list shipping-phase2-queue">
              {movements.map((movement) => (
                <button key={movement.bookingId} type="button" className={movement.bookingId === selectedMovement?.bookingId ? 'supplier-queue-row active' : 'supplier-queue-row'} onClick={() => setSelectedBookingId(movement.bookingId)}>
                  <div className="supplier-queue-topline">
                    <strong>{movement.bookingId}</strong>
                    <span className="status-badge info">{formatCorridorMilestoneLabel(movement.currentStatus)}</span>
                  </div>
                  <span>{movement.containerNumber}</span>
                  <span>{movement.customerName}</span>
                </button>
              ))}
            </div>
          </article>

          <div className="shipping-phase3-main">
            <article className="supplier-panel">
              <header className="supplier-panel-header">
                <div>
                  <span className="supplier-panel-eyebrow">Container Command</span>
                  <h2>{selectedMovement?.containerNumber || 'Container'}</h2>
                </div>
                <p>{formatCorridorMilestoneLabel(selectedMovement?.currentStatus || 'Pending')}</p>
              </header>
              {selectedMovement ? (
                <>
                  <div className={`shipping-tracking-hero shipping-tracking-hero-${trackingHeroTone(selectedMovement.currentStatus)}`}>
                    <div className="shipping-tracking-hero__primary">
                      <span>Current tracking truth</span>
                      <strong>{selectedMovement.currentLocation}</strong>
                      <p>{formatCorridorMilestoneLabel(selectedMovement.currentStatus)} · {selectedMovement.bookingId} · {selectedMovement.customerName}</p>
                    </div>
                    <div className="shipping-tracking-hero__meta">
                      <div><span>Truck</span><strong>{selectedMovement.assignedTruckId || 'Pending'}</strong></div>
                      <div><span>Driver</span><strong>{selectedMovement.assignedDriverName || 'Pending'}</strong></div>
                      <div><span>Coords</span><strong>{selectedMovement.currentLatitude.toFixed(3)}, {selectedMovement.currentLongitude.toFixed(3)}</strong></div>
                    </div>
                  </div>

                  <div className="shipping-summary-ribbon">
                    <div className="shipping-summary-ribbon__item">
                      <span>BL / Booking</span>
                      <strong>{selectedMovement.billOfLadingNumber} · {selectedMovement.bookingNumber}</strong>
                    </div>
                    <div className="shipping-summary-ribbon__item">
                      <span>Carrier</span>
                      <strong>{selectedMovement.carrierName}</strong>
                    </div>
                    <div className="shipping-summary-ribbon__item">
                      <span>Current holder</span>
                      <strong>{selectedMovement.currentHolder}</strong>
                    </div>
                    <div className="shipping-summary-ribbon__item">
                      <span>Expected empty return</span>
                      <strong>{formatDate(selectedMovement.expectedReturnDate)}</strong>
                    </div>
                  </div>

                  <div className="shipping-corridor-board">
                    <div className="shipping-corridor-board__header">
                      <div>
                        <span className="supplier-panel-eyebrow">Route lane</span>
                        <h3>Djibouti to inland container movement</h3>
                      </div>
                      <p>{selectedMovement.routeSummary}</p>
                    </div>
                    <div className="shipping-corridor-lane">
                      {corridorNodes.map((node, index) => {
                        const state = index < activeNodeIndex ? 'done' : index === activeNodeIndex ? 'active' : 'next';
                        return (
                          <div key={node.key} className={`shipping-corridor-stop is-${state}`}>
                            <span>{index + 1}</span>
                            <strong>{node.label}</strong>
                          </div>
                        );
                      })}
                    </div>
                    <div className="shipping-corridor-map">
                      <div className="shipping-corridor-map__frame">
                        <div className="shipping-corridor-map__track" />
                        <div
                          className="shipping-corridor-map__marker"
                          style={{ '--shipping-map-left': `${12 + activeNodeIndex * 22}%` } as CSSProperties}
                        >
                          <span>{selectedMovement.containerNumber}</span>
                        </div>
                        {corridorNodes.map((node, index) => (
                          <div
                            key={node.key}
                            className={`shipping-corridor-map__node is-${index <= activeNodeIndex ? 'active' : 'idle'}`}
                            style={{ '--shipping-map-left': `${10 + index * 22}%` } as CSSProperties}
                          >
                            <i />
                            <span>{node.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="shipping-lifecycle-strip">
                    {[
                      { label: 'Empty release (EMPTY_OUT)', keys: ['empty release'] },
                      { label: 'Container pickup (EMPTY_OUT)', keys: ['empty pickup'] },
                      { label: 'Loaded at shipper (FULL_OUT)', keys: ['loaded at shipper'] },
                      { label: 'Gate-in at port (FULL_OUT)', keys: ['gate-in at port'] },
                      { label: 'Loaded on vessel (FULL_OUT)', keys: ['loaded on vessel'] },
                      { label: 'Vessel departed (FULL_OUT)', keys: ['vessel departed'] },
                      { label: 'Transshipment (FULL_OUT)', keys: ['transshipment'] },
                      { label: 'Vessel arrived (FULL_OUT)', keys: ['vessel arrived'] },
                      { label: 'Discharged (FULL_OUT)', keys: ['discharged'] },
                      { label: 'Available for clearance (FULL_OUT)', keys: ['available for clearance'] },
                      { label: 'Customs cleared (FULL_OUT)', keys: ['customs cleared'] },
                      { label: 'Truck assigned (FULL_OUT)', keys: ['truck assigned'] },
                      { label: 'Out for delivery (FULL_OUT)', keys: ['out for delivery'] },
                      { label: 'Delivered (FULL_IN)', keys: ['arrived inland', 'delivered inland'] },
                      { label: 'Empty returned (EMPTY_RETURNED)', keys: ['empty return complete', 'empty returned'] },
                    ].map((step, index, steps) => {
                      const status = timelineStatus(selectedMovement, step.keys);
                      const finalStatus = index === steps.length - 1 && status === 'active' ? 'done' : status;
                      return (
                      <div key={step.label} className={`shipping-lifecycle-step is-${finalStatus}`}>
                        <span>{index + 1}</span>
                        <strong>{step.label}</strong>
                      </div>
                    )})}
                  </div>
                  <div className="shipping-monitor-grid shipping-monitor-grid-wide">
                    <div className="shipping-monitor-card shipping-monitor-card-primary">
                      <span>Live position</span>
                      <strong>{selectedMovement.currentLocation}</strong>
                      <p>{selectedMovement.currentLatitude.toFixed(3)}, {selectedMovement.currentLongitude.toFixed(3)}</p>
                    </div>
                    <div className="shipping-monitor-card">
                      <span>Last event</span>
                      <strong>{selectedMovement.events[0]?.type.replace(/_/g, ' ') || 'Pending'}</strong>
                      <p>{formatDate(selectedMovement.events[0]?.timestamp || '')}</p>
                    </div>
                    <div className="shipping-monitor-card">
                      <span>Route summary</span>
                      <strong>{selectedMovement.routeSummary}</strong>
                      <p>{selectedMovement.bookingId}</p>
                    </div>
                    <div className="shipping-monitor-card">
                      <span>Assigned truck</span>
                      <strong>{selectedMovement.assignedTruckId || 'Not assigned'}</strong>
                      <p>{selectedMovement.assignedDriverName || 'Driver pending'}</p>
                    </div>
                    <div className="shipping-monitor-card">
                      <span>Return control</span>
                      <strong>{selectedMovement.actualReturnDate ? 'Returned' : 'Open'}</strong>
                      <p>{selectedMovement.returnDelayDays} delay day(s) · USD {selectedMovement.demurragePenaltyAmount.toLocaleString('en-US')}</p>
                    </div>
                  </div>
                  <div className={`shipping-copilot-panel is-${trackingCopilot.status}`}>
                    <div className="shipping-copilot-header">
                      <div>
                        <span className="supplier-panel-eyebrow">AI Tracking Copilot</span>
                        <h3>{trackingCopilot.headline}</h3>
                      </div>
                      <div className={`shipping-copilot-score status-${trackingCopilot.status}`}>
                        <strong>{trackingCopilot.score}</strong>
                        <span>/100</span>
                      </div>
                    </div>
                    {trackingCopilot.blockers.length ? (
                      <div className="shipping-copilot-block">
                        <span>Blockers</span>
                        <ul>
                          {trackingCopilot.blockers.map((item) => <li key={item}>{item}</li>)}
                        </ul>
                      </div>
                    ) : null}
                    <div className="shipping-copilot-block">
                      <span>Recommendations</span>
                      <ul>
                        {trackingCopilot.recommendations.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                    <div className="shipping-copilot-highlights">
                      {trackingCopilot.highlights.slice(0, 3).map((item) => <div key={item}>{item}</div>)}
                    </div>
                    {trackingCopilot.actions.length ? (
                      <div className="shipping-copilot-actions">
                        {trackingCopilot.actions.map((action) => (
                          <button
                            key={action.id}
                            type="button"
                            className="supplier-desk-button supplier-desk-button-secondary"
                            disabled={(action.id === 'assign_truck' && !canAssignTruck) || ((action.id === 'advance_event' || action.id === 'open_incident') && !canAddEvent)}
                            onClick={() => runTrackingCopilotAction(action.id)}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="supplier-inline-actions">
                    {!canAddEvent ? (
                      <div className="shipping-phase-note is-blocked console-grid-span-full">
                        <span>Desk ownership</span>
                        <p>Tracking updates belong to {shippingActionOwner('tracking_add_event')}.</p>
                      </div>
                    ) : null}
                    {eventOptions.map((eventOption) => (
                      <button
                        key={eventOption.value}
                        type="button"
                        className="supplier-desk-button supplier-desk-button-secondary"
                        disabled={!canAddEvent}
                        onClick={() => addShippingContainerEvent(selectedMovement.bookingId, eventOption.value, eventOption.location, eventOption.note)}
                      >
                        {eventOption.label}
                      </button>
                    ))}
                  </div>
                  <div className="shipping-timeline-list">
                    {selectedMovement.events.map((event) => (
                      <div key={event.id} className="shipping-timeline-item">
                        <strong>{formatCorridorMilestoneLabel(event.type.replace(/_/g, ' '))}</strong>
                        <span>{event.location}</span>
                        <span>{event.note}</span>
                        <span>{formatDate(event.timestamp)} · {event.truckId || 'No truck'} · {event.driverName || 'No driver'}</span>
                      </div>
                    ))}
                  </div>
                  <div className="shipping-timeline-list">
                    {(selectedMovement.handoffHistory || []).length ? selectedMovement.handoffHistory.map((handoff) => (
                      <div key={handoff.id} className="shipping-timeline-item">
                        <strong>Truck handoff</strong>
                        <span>{handoff.location}</span>
                        <span>{handoff.fromTruckId} / {handoff.fromDriverName} {'->'} {handoff.toTruckId} / {handoff.toDriverName}</span>
                        <span>{formatDate(handoff.timestamp)}</span>
                      </div>
                    )) : (
                      <div className="shipping-timeline-item">
                        <strong>No handoff history</strong>
                        <span>The container has not been reassigned between trucks yet.</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="supplier-check-item is-pending"><strong>No container movement yet</strong><p>Approved bookings will create the tracking object.</p></div>
              )}
            </article>

            <article className="supplier-panel">
              <header className="supplier-panel-header">
                <div>
                  <span className="supplier-panel-eyebrow">Live position</span>
                  <h2>Tracking monitor</h2>
                </div>
                <p>{selectedMovement ? formatDate(selectedMovement.events[0]?.timestamp || '') : 'Pending'}</p>
              </header>
              {selectedMovement ? (
                <div className="shipping-monitor-grid">
                  <div className="shipping-monitor-card shipping-monitor-card-primary">
                    <span>Current node</span>
                    <strong>{selectedMovement.currentLocation}</strong>
                    <p>{selectedMovement.currentLatitude.toFixed(3)}, {selectedMovement.currentLongitude.toFixed(3)}</p>
                  </div>
                  <div className="shipping-monitor-card">
                    <span>Container</span>
                    <strong>{selectedMovement.containerNumber}</strong>
                    <p>{formatCorridorMilestoneLabel(selectedMovement.currentStatus)}</p>
                  </div>
                  <div className="shipping-monitor-card">
                    <span>Assigned truck</span>
                    <strong>{selectedMovement.assignedTruckId || 'Pending'}</strong>
                    <p>{selectedMovement.assignedDriverName || 'Driver pending'}</p>
                  </div>
                </div>
              ) : null}
            </article>

            <article className="supplier-panel">
              <header className="supplier-panel-header">
                <div>
                  <span className="supplier-panel-eyebrow">Exceptions</span>
                  <h2>Tracking alerts</h2>
                </div>
                <p>{selectedAlerts.length} alerts</p>
              </header>
              <div className="shipping-monitor-alerts">
                {selectedAlerts.length ? selectedAlerts.map((alert) => (
                  <div key={alert.title} className={`shipping-monitor-alert is-${alert.tone}`}>
                    <strong>{alert.title}</strong>
                    <span>{alert.detail}</span>
                    {selectedMovement ? (
                      <button
                        type="button"
                        className="supplier-desk-button supplier-desk-button-secondary"
                        disabled={!canAddEvent}
                        onClick={() => createShippingIncident(selectedMovement.bookingId, alert.title, alert.detail, alert.tone)}
                      >
                        Open incident
                      </button>
                    ) : null}
                  </div>
                )) : (
                  <div className="shipping-monitor-alert is-good">
                    <strong>No active tracking exception</strong>
                    <span>The latest container state is inside the expected corridor flow.</span>
                  </div>
                )}
              </div>
            </article>

            <article className="supplier-panel">
              <header className="supplier-panel-header">
                <div>
                  <span className="supplier-panel-eyebrow">Incidents</span>
                  <h2>Tracking incident queue</h2>
                </div>
                <p>{workspace.incidents.filter((item) => item.status === 'open').length} open</p>
              </header>
              <div className="shipping-monitor-alerts">
                {workspace.incidents.length ? workspace.incidents.slice(0, 8).map((incident) => (
                  <div key={incident.id} className={`shipping-monitor-alert is-${incident.severity}`}>
                    <strong>{incident.title}</strong>
                    <span>{incident.bookingId} · {incident.containerNumber} · {incident.customerName}</span>
                    <span>{incident.description}</span>
                    <span>{formatDate(incident.createdAt)} · {incident.status}</span>
                    {incident.status === 'open' ? (
                      <button type="button" className="supplier-desk-button supplier-desk-button-secondary" disabled={!canResolveIncident} onClick={() => resolveShippingIncident(incident.id)}>
                        Resolve incident
                      </button>
                    ) : null}
                  </div>
                )) : (
                  <div className="shipping-monitor-alert is-good">
                    <strong>No tracking incidents</strong>
                    <span>Open incidents from the tracking alerts will appear here.</span>
                  </div>
                )}
              </div>
            </article>

            <article className="supplier-panel">
              <header className="supplier-panel-header">
                <div>
                  <span className="supplier-panel-eyebrow">Fleet</span>
                  <h2>Truck pool</h2>
                </div>
                <p>{workspace.fleet.length} units</p>
              </header>
              <div className="shipping-fleet-list">
                {workspace.fleet.map((truck) => (
                  <div key={truck.truckId} className="shipping-fleet-item">
                    <div className="supplier-queue-topline">
                      <strong>{truck.plateNumber}</strong>
                      <span className={`status-badge ${truck.status === 'available' ? 'good' : truck.status === 'maintenance' ? 'warning' : 'info'}`}>{truck.status}</span>
                    </div>
                    <span>{truck.driverName} · {truck.driverPhone}</span>
                    <span>{truck.currentLocation}</span>
                    <span>{truck.assignedBookingId || 'Unassigned'}</span>
                    <button
                      type="button"
                      className="supplier-desk-button supplier-desk-button-secondary"
                      disabled={!selectedMovement || truck.status === 'maintenance' || !canAssignTruck}
                      onClick={() => selectedMovement && assignShippingTruck(selectedMovement.bookingId, truck.truckId)}
                    >
                      Assign to selected
                    </button>
                  </div>
                ))}
              </div>
              {!canAssignTruck ? (
                <div className="shipping-phase-note is-blocked console-gap-top-md">
                  <span>Desk ownership</span>
                  <p>Truck assignment belongs to {shippingActionOwner('tracking_assign_truck')}. Incident resolution belongs to {shippingActionOwner('tracking_resolve_incident')}.</p>
                </div>
              ) : null}
            </article>
          </div>
        </section>
      </section>
    </main>
  );
}
