'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { manualCorridorStorageUpdatedEvent } from '../lib/manual-corridor-journey';
import {
  deriveShippingTrackingAlerts,
  findShippingTrackingMatches,
  formatCorridorMilestoneLabel,
  predictShippingEta,
  type ShippingContainerMovementRecord,
  type ShippingContainerEventType,
  shippingPhase1UpdatedEvent,
  shippingTrackingLookupLabel,
} from '../lib/shipping-phase1';
import { sharedQuoteStorageUpdatedEvent } from '../lib/shared-quote-storage';

type Props = {
  initialQuery?: string;
  embedded?: boolean;
};

type ServerTrackingPayload = {
  query: string;
  container: null | {
    containerNo: string;
    blNo: string;
    bookingNo: string;
    shipmentNo: string;
    carrier: string;
    vesselName: string;
    voyageNo: string;
    currentStatus: string;
    currentLocation: string;
    eta: string;
    shipper: string;
    consignee: string;
    assignedDriver: string;
    deliveredBy: string;
    returnedBy: string;
    returnStatus: string;
    returnDate: string;
    expectedReturnDate: string;
    demurrageDays: number;
    penaltyAmount: number;
    createdAt: string;
    updatedAt: string;
  };
  events: Array<{
    id: string;
    containerNo: string;
    eventType: string;
    location: string;
    timestamp: string;
    source: string;
    description: string;
  }>;
  relatedContainers: Array<{
    containerNo: string;
    blNo: string;
    bookingNo: string;
    currentStatus: string;
    currentLocation: string;
  }>;
  alerts: Array<{ title: string; tone: 'critical' | 'warning' | 'info' | 'good'; detail: string }>;
  matchedBy: string;
  matchedAliases: Array<{
    alias: string;
    kind: 'container' | 'bill_of_lading' | 'booking' | 'shipment' | 'trip';
  }>;
  suggestions: Array<{
    alias: string;
    kind: 'container' | 'bill_of_lading' | 'booking' | 'shipment' | 'trip';
    containerNo: string;
    bookingNo: string;
    currentStatus: string;
    currentLocation: string;
    score: number;
  }>;
};

function formatDate(value?: string) {
  if (!value) return 'Pending';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function eventTone(index: number) {
  if (index === 0) return 'is-current';
  return 'is-complete';
}

function statusChipTone(status: string) {
  const value = status.toLowerCase();
  if (value.includes('returned') || value.includes('arrived')) return 'good';
  if (value.includes('delay') || value.includes('overdue')) return 'critical';
  if (value.includes('transit') || value.includes('vessel') || value.includes('delivery')) return 'info';
  return 'warning';
}

function aliasKindLabel(kind: ServerTrackingPayload['suggestions'][number]['kind']) {
  switch (kind) {
    case 'bill_of_lading':
      return 'BL';
    case 'booking':
      return 'Booking';
    case 'shipment':
      return 'Shipment';
    case 'trip':
      return 'Trip';
    default:
      return 'Container';
  }
}

function corridorLocationPoint(location: string) {
  const value = location.toLowerCase();
  if (value.includes('shanghai')) return { lat: 31.2156, lng: 121.491 };
  if (value.includes('galafi')) return { lat: 11.716, lng: 41.84 };
  if (value.includes('djibouti')) return { lat: 11.595, lng: 43.148 };
  if (value.includes('combolcha')) return { lat: 11.082, lng: 39.738 };
  if (value.includes('adama') || value.includes('modjo')) return { lat: 8.54, lng: 39.27 };
  return { lat: 10.902, lng: 41.899 };
}

function normalizeServerStatus(value: string) {
  return String(value || '')
    .trim()
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function toEventType(value: string): ShippingContainerEventType {
  const key = String(value || '').trim().toUpperCase();
  switch (key) {
    case 'BOOKED':
    case 'EMPTY_RELEASED':
    case 'EMPTY_PICKUP':
    case 'LOADED_AT_SHIPPER':
    case 'GATE_IN_AT_PORT':
    case 'LOADED_ON_VESSEL':
    case 'VESSEL_DEPARTED':
    case 'TRANSSHIPMENT':
    case 'VESSEL_ARRIVED':
    case 'DISCHARGED_FROM_VESSEL':
    case 'AVAILABLE_FOR_CLEARANCE':
    case 'CUSTOMS_CLEARED':
    case 'TRUCK_ASSIGNED':
    case 'OUT_FOR_DELIVERY':
    case 'ARRIVED_INLAND':
    case 'YARD_HANDOFF':
    case 'UNLOADED_INLAND':
    case 'HANDOFF':
    case 'IN_TRANSIT':
    case 'ARRIVED':
    case 'EMPTY_RETURN_STARTED':
    case 'EMPTY_RETURNED':
      return key;
    default:
      return 'BOOKED';
  }
}

const publicTimeline = [
  { label: 'Empty release (EMPTY_OUT)', match: ['empty released'] },
  { label: 'Container pickup (EMPTY_OUT)', match: ['empty picked up'] },
  { label: 'Loaded at shipper (FULL_OUT)', match: ['loaded at shipper'] },
  { label: 'Gate-in at port (FULL_OUT)', match: ['gate-in at port'] },
  { label: 'Loaded on vessel (FULL_OUT)', match: ['loaded on vessel'] },
  { label: 'Vessel departed (FULL_OUT)', match: ['vessel departed'] },
  { label: 'Transshipment (FULL_OUT)', match: ['transshipment'] },
  { label: 'Vessel arrived (FULL_OUT)', match: ['vessel arrived'] },
  { label: 'Discharged (FULL_OUT)', match: ['discharged from vessel'] },
  { label: 'Available for clearance (FULL_OUT)', match: ['available for clearance'] },
  { label: 'Customs cleared (FULL_OUT)', match: ['customs cleared'] },
  { label: 'Truck assigned (FULL_OUT)', match: ['truck assigned'] },
  { label: 'Out for delivery (FULL_OUT)', match: ['out for delivery', 'in transit'] },
  { label: 'Delivered (FULL_IN)', match: ['arrived inland'] },
  { label: 'Empty returned (EMPTY_RETURNED)', match: ['empty returned'] },
];

function stageState(status: string, lifecycleStage: string, eventTypes: string[], match: string[]) {
  const combined = `${status} ${lifecycleStage}`.toLowerCase();
  if (match.some((token) => combined.includes(token))) return 'active';
  if (eventTypes.some((entry) => match.some((token) => entry.includes(token)))) return 'done';
  return 'next';
}

function normalizeNeedle(value: string | undefined | null) {
  return String(value || '').trim().toLowerCase();
}

function latestMovementTimestamp(movement: { events?: Array<{ timestamp: string }> }) {
  return String(movement.events?.[0]?.timestamp || '');
}

function selectPreferredMovement(
  query: string,
  movements: ShippingContainerMovementRecord[],
): ShippingContainerMovementRecord | null {
  const needle = normalizeNeedle(query);
  if (!needle) return movements[0] || null;

  return [...movements].sort((left, right) => {
    const leftExact =
      normalizeNeedle(left.containerNumber) === needle ||
      normalizeNeedle(left.billOfLadingNumber) === needle ||
      normalizeNeedle(left.bookingId) === needle ||
      normalizeNeedle(left.bookingNumber) === needle;
    const rightExact =
      normalizeNeedle(right.containerNumber) === needle ||
      normalizeNeedle(right.billOfLadingNumber) === needle ||
      normalizeNeedle(right.bookingId) === needle ||
      normalizeNeedle(right.bookingNumber) === needle;
    if (leftExact !== rightExact) return rightExact ? 1 : -1;
    return latestMovementTimestamp(right).localeCompare(latestMovementTimestamp(left));
  })[0] || null;
}

export function ShippingPublicTrackingWorkspace({ initialQuery = '', embedded = false }: Props) {
  const [hydrated, setHydrated] = useState(false);
  const [workspaceVersion, setWorkspaceVersion] = useState(0);
  const [query, setQuery] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery);
  const [serverTracking, setServerTracking] = useState<ServerTrackingPayload | null>(null);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    const reload = () => setWorkspaceVersion((value) => value + 1);
    window.addEventListener(sharedQuoteStorageUpdatedEvent, reload as EventListener);
    window.addEventListener(shippingPhase1UpdatedEvent, reload as EventListener);
    window.addEventListener(manualCorridorStorageUpdatedEvent, reload as EventListener);
    return () => {
      window.removeEventListener(sharedQuoteStorageUpdatedEvent, reload as EventListener);
      window.removeEventListener(shippingPhase1UpdatedEvent, reload as EventListener);
      window.removeEventListener(manualCorridorStorageUpdatedEvent, reload as EventListener);
    };
  }, []);

  const result = useMemo(() => {
    void workspaceVersion;
    return findShippingTrackingMatches(submittedQuery);
  }, [submittedQuery, workspaceVersion]);

  useEffect(() => {
    if (!submittedQuery.trim()) {
      setServerTracking(null);
      return;
    }
    let cancelled = false;
    void fetch(`/api/tracking?query=${encodeURIComponent(submittedQuery.trim())}`)
      .then((response) => response.json())
      .then((payload: ServerTrackingPayload) => {
        if (!cancelled) setServerTracking(payload);
      })
      .catch(() => {
        if (!cancelled) setServerTracking(null);
      });
    return () => {
      cancelled = true;
    };
  }, [submittedQuery, workspaceVersion]);

  const selected = useMemo(() => {
    const fallback = selectPreferredMovement(submittedQuery, result.movements) || null;
    if (fallback) return fallback;
    if (!serverTracking?.container) return null;
    const point = corridorLocationPoint(serverTracking.container.currentLocation || '');
    return {
      bookingId: serverTracking.container.bookingNo || '',
      quoteId: '',
      bookingNumber: serverTracking.container.bookingNo || '',
      billOfLadingNumber: serverTracking.container.blNo || '',
      containerNumber: serverTracking.container.containerNo || '',
      carrierName: serverTracking.container.carrier || 'Tracking API',
      customerName: serverTracking.container.consignee || 'Pending customer',
      currentStatus: normalizeServerStatus(serverTracking.container.currentStatus || 'Pending'),
      currentLocation: serverTracking.container.currentLocation || 'Pending location',
      currentHolder:
        serverTracking.container.assignedDriver ||
        serverTracking.container.returnedBy ||
        serverTracking.container.deliveredBy ||
        'Tracking API',
      lifecycleStage: normalizeServerStatus(serverTracking.container.currentStatus || 'Pending'),
      expectedReturnDate: serverTracking.container.expectedReturnDate || '',
      actualReturnDate: serverTracking.container.returnDate || '',
      returnDelayDays: serverTracking.container.demurrageDays ?? 0,
      demurragePenaltyAmount: serverTracking.container.penaltyAmount ?? 0,
      assignedTruckId: '',
      assignedDriverName: serverTracking.container.assignedDriver || '',
      assignedDriverPhone: '',
      currentLatitude: point.lat,
      currentLongitude: point.lng,
      routeSummary: `${serverTracking.container.currentLocation} tracking`,
      events: serverTracking.events.length
          ? serverTracking.events.map((event) => ({
            id: event.id,
            type: toEventType(event.eventType),
            location: event.location,
            note: event.description,
            timestamp: event.timestamp,
            truckId: '',
            driverName: serverTracking.container?.assignedDriver || '',
          }))
        : [],
      handoffHistory: [],
    } satisfies ShippingContainerMovementRecord;
  }, [result.movements, serverTracking, submittedQuery]);
  const siblingContainers = serverTracking?.relatedContainers?.length
    ? serverTracking.relatedContainers.map((movement) => ({
        containerNumber: movement.containerNo,
        billOfLadingNumber: movement.blNo,
        bookingId: movement.bookingNo,
        currentStatus: normalizeServerStatus(movement.currentStatus),
        currentLocation: movement.currentLocation,
      }))
    : selected
      ? result.movements.filter((movement) => movement.bookingId === selected.bookingId || movement.billOfLadingNumber === selected.billOfLadingNumber)
      : [];
  const eta = serverTracking?.container?.eta || predictShippingEta(selected);
  const eventTypes = selected ? selected.events.map((event) => String(event.type).replace(/_/g, ' ').toLowerCase()) : [];
  const latestSnapshot = selected ? selected.events[0] : null;
  const alerts = serverTracking?.alerts?.length ? serverTracking.alerts : deriveShippingTrackingAlerts(selected);
  const matchedAliases = serverTracking?.matchedAliases || [];
  const suggestions = serverTracking?.suggestions || [];
  const returnRisk =
    selected && !selected.actualReturnDate && selected.expectedReturnDate
      ? Math.max(Math.ceil((Date.now() - new Date(selected.expectedReturnDate).getTime()) / 86400000), 0)
      : 0;
  const renderSelected = hydrated ? selected : null;
  const renderAlerts = hydrated ? alerts : [];
  const renderReturnRisk = hydrated ? returnRisk : 0;
  const renderLatestSnapshot = hydrated ? latestSnapshot : null;

  return (
    <main className="shell">
      <section className="shipping-public-shell">
        {!embedded ? (
          <>
            <header className="shipping-public-header">
              <div>
                <span className="supplier-desk-eyebrow">Maersk-style container tracking</span>
                <h1>Track container, BL, or booking</h1>
                <p>Follow the full container lifecycle from empty release to empty return using the same tracking truth used by operations.</p>
              </div>
              <Link className="supplier-jump-link" href="/shipping/tracking">Open operations tracking desk</Link>
            </header>

            <section className="shipping-public-searchbar">
              <input
                className="supplier-desk-input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Enter container number, BL number, or booking number"
              />
              <button type="button" className="supplier-desk-button supplier-desk-button-primary" onClick={() => setSubmittedQuery(query)}>
                Track
              </button>
            </section>
          </>
        ) : null}

        {renderSelected ? (
          <section className="shipping-public-chipbar">
            <span className={`status-badge ${statusChipTone(renderSelected.currentStatus)}`}>{formatCorridorMilestoneLabel(renderSelected.currentStatus)}</span>
            <span className={`status-badge ${renderReturnRisk > 0 ? 'warning' : 'good'}`}>{renderReturnRisk > 0 ? 'Return overdue' : 'Return in control'}</span>
            <span className={`status-badge ${renderAlerts.some((alert) => alert.tone === 'critical') ? 'danger' : renderAlerts.some((alert) => alert.tone === 'warning') ? 'warning' : 'good'}`}>
              {renderAlerts[0]?.title || 'Tracking healthy'}
            </span>
          </section>
        ) : null}

        <section className="shipping-public-layout">
          <article className="supplier-panel shipping-public-main">
            <header className="supplier-panel-header">
              <div>
                <span className="supplier-panel-eyebrow">{shippingTrackingLookupLabel(submittedQuery)}</span>
                <h2>{selected?.containerNumber || 'No container found'}</h2>
              </div>
              <p>{result.movements.length} match{result.movements.length === 1 ? '' : 'es'}</p>
            </header>

            {renderSelected ? (
              <>
                <div className="shipping-public-kpis">
                  <div className="shipping-public-kpi">
                    <span>Status</span>
                    <strong>{formatCorridorMilestoneLabel(renderSelected.currentStatus)}</strong>
                    <p>{renderSelected.lifecycleStage}</p>
                  </div>
                  <div className="shipping-public-kpi">
                    <span>ETA</span>
                    <strong>{formatDate(eta)}</strong>
                    <p>Predictive local ETA</p>
                  </div>
                  <div className="shipping-public-kpi">
                    <span>Last event</span>
                    <strong>{renderLatestSnapshot ? formatCorridorMilestoneLabel(String(renderLatestSnapshot.type).replace(/_/g, ' ')) : 'Pending'}</strong>
                    <p>{formatDate(renderLatestSnapshot?.timestamp)}</p>
                  </div>
                  <div className="shipping-public-kpi">
                    <span>Current holder</span>
                    <strong>{renderSelected.currentHolder}</strong>
                    <p>{renderSelected.currentLocation}</p>
                  </div>
                </div>

                <div className="shipping-public-mapcard">
                  <div>
                    <span className="supplier-panel-eyebrow">Live map</span>
                    <h3>{renderSelected.currentLocation}</h3>
                    <p>{renderSelected.currentLatitude.toFixed(3)}, {renderSelected.currentLongitude.toFixed(3)} · {renderSelected.carrierName}</p>
                  </div>
                  <div className="shipping-public-map">
                    <div className="shipping-public-map__route" />
                    <div
                      className="shipping-public-map__marker"
                      style={{ '--shipping-map-left': `${Math.max(10, Math.min(90, 14 + Math.min(renderSelected.events.length, 10) * 7))}%` } as CSSProperties}
                    >
                      <span>{renderSelected.containerNumber}</span>
                    </div>
                    <div className="shipping-public-map__legend">
                      <span>Ocean + inland position</span>
                      <strong>{renderSelected.bookingId} · {renderSelected.billOfLadingNumber}</strong>
                    </div>
                  </div>
                </div>

                <div className="shipping-public-summary-grid">
                  <div className="shipping-public-card">
                    <span>Container summary</span>
                    <strong>{renderSelected.containerNumber}</strong>
                    <p>{renderSelected.bookingNumber} · {renderSelected.billOfLadingNumber}</p>
                  </div>
                  <div className="shipping-public-card">
                    <span>Customer</span>
                    <strong>{renderSelected.customerName}</strong>
                    <p>{renderSelected.routeSummary}</p>
                  </div>
                  <div className="shipping-public-card">
                    <span>Truck / driver</span>
                    <strong>{renderSelected.assignedTruckId || 'Pending truck'}</strong>
                    <p>{renderSelected.assignedDriverName || 'Pending driver'}{renderSelected.assignedDriverPhone ? ` · ${renderSelected.assignedDriverPhone}` : ''}</p>
                  </div>
                  <div className={`shipping-public-card ${renderReturnRisk > 0 ? 'is-risk' : ''}`}>
                    <span>Empty return control</span>
                    <strong>{renderSelected.actualReturnDate ? 'Returned' : 'Open'}</strong>
                    <p>
                      Expected {formatDate(renderSelected.expectedReturnDate)}
                      {renderSelected.actualReturnDate ? ` · Actual ${formatDate(renderSelected.actualReturnDate)}` : ''}
                      {!renderSelected.actualReturnDate && renderReturnRisk > 0 ? ` · ${renderReturnRisk} day delay` : ''}
                    </p>
                  </div>
                </div>

                {matchedAliases.length ? (
                  <div className="shipping-public-multi">
                    <div className="supplier-panel-header">
                      <div>
                        <span className="supplier-panel-eyebrow">Matched aliases</span>
                        <h3>Resolved references</h3>
                      </div>
                    </div>
                    <div className="shipping-public-multi-grid">
                      {matchedAliases.map((entry) => (
                        <div key={`${entry.kind}-${entry.alias}`} className="shipping-public-mini active">
                          <strong>{entry.alias}</strong>
                          <span>{aliasKindLabel(entry.kind)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="shipping-monitor-alerts">
                  {renderAlerts.map((alert) => (
                    <div key={alert.title} className={`shipping-monitor-alert is-${alert.tone}`}>
                      <strong>{alert.title}</strong>
                      <span>{alert.detail}</span>
                    </div>
                  ))}
                </div>

                {siblingContainers.length > 1 ? (
                  <div className="shipping-public-multi">
                    <div className="supplier-panel-header">
                      <div>
                        <span className="supplier-panel-eyebrow">Multi-container tracking</span>
                        <h3>Containers under the same booking / BL</h3>
                      </div>
                    </div>
                    <div className="shipping-public-multi-grid">
                      {siblingContainers.map((movement) => (
                        <div key={`${movement.bookingId}-${movement.containerNumber}`} className={`shipping-public-mini ${movement.containerNumber === renderSelected.containerNumber ? 'active' : ''}`}>
                          <strong>{movement.containerNumber}</strong>
                          <span>{formatCorridorMilestoneLabel(movement.currentStatus)}</span>
                          <span>{movement.currentLocation}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="shipping-public-events">
                  <div className="supplier-panel-header">
                    <div>
                      <span className="supplier-panel-eyebrow">Event log</span>
                      <h3>Audit trail</h3>
                    </div>
                  </div>
                  {renderSelected.events.map((event, index) => (
                    <div key={event.id} className={`shipping-public-event ${eventTone(index)}`}>
                      <strong>{formatCorridorMilestoneLabel(event.type.replace(/_/g, ' '))}</strong>
                      <span>{event.location}</span>
                      <span>{event.note}</span>
                      <span>{formatDate(event.timestamp)} · {event.driverName || 'No driver'} · {event.truckId || 'No truck'}</span>
                    </div>
                  ))}
                </div>

                <div className="shipping-public-multi">
                  <div className="supplier-panel-header">
                    <div>
                      <span className="supplier-panel-eyebrow">Container lifecycle</span>
                      <h3>Movement flow</h3>
                    </div>
                  </div>
                  <div className="shipping-public-timeline">
                    {publicTimeline.map((step, index) => (
                      <div key={step.label} className={`shipping-public-step is-${stageState(renderSelected.currentStatus, renderSelected.lifecycleStage, eventTypes, step.match)}`}>
                        <span>{index + 1}</span>
                        <strong>{step.label}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="shipping-monitor-alerts">
                <div className="shipping-monitor-alert is-info">
                  <strong>No tracking result</strong>
                  <span>Enter a container number like `MSCU3344556`, a BL number, or a booking reference.</span>
                </div>
                {submittedQuery.trim() && suggestions.length ? (
                  <div className="shipping-monitor-alert is-warning">
                    <strong>Did you mean one of these aliases?</strong>
                    <span>The search was close to live tracking records, but not exact.</span>
                  </div>
                ) : null}
              </div>
            )}
          </article>

          <aside className="supplier-panel shipping-public-side">
            <header className="supplier-panel-header">
              <div>
                <span className="supplier-panel-eyebrow">Matched records</span>
                <h2>Search results</h2>
              </div>
            </header>
            <div className="shipping-public-results">
              {result.movements.length ? result.movements.map((movement) => (
                <button key={`${movement.bookingId}-${movement.containerNumber}`} type="button" className="supplier-queue-row active">
                  <div className="supplier-queue-topline">
                    <strong>{movement.containerNumber}</strong>
                    <span className="status-badge info">{formatCorridorMilestoneLabel(movement.currentStatus)}</span>
                  </div>
                  <span>{movement.billOfLadingNumber}</span>
                  <span>{movement.bookingId}</span>
                  <span>{movement.currentLocation}</span>
                </button>
              )) : suggestions.length ? suggestions.map((entry) => (
                <button
                  key={`${entry.alias}-${entry.containerNo}`}
                  type="button"
                  className="supplier-queue-row active"
                  onClick={() => {
                    setQuery(entry.alias);
                    setSubmittedQuery(entry.alias);
                  }}
                >
                  <div className="supplier-queue-topline">
                    <strong>{entry.alias}</strong>
                    <span className="status-badge info">{aliasKindLabel(entry.kind)}</span>
                  </div>
                  <span>{entry.containerNo}</span>
                  <span>{entry.bookingNo}</span>
                  <span>{formatCorridorMilestoneLabel(normalizeServerStatus(entry.currentStatus))} · {entry.currentLocation}</span>
                </button>
              )) : (
                <div className="shipping-timeline-item">
                  <strong>No matched record</strong>
                  <span>Tracking results appear here after a search.</span>
                </div>
              )}
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}
