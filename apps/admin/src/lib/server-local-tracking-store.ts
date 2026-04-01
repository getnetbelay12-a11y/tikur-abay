import 'server-only';

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { seededBookingRequests, type UnifiedBookingRequest } from './booking-quote-demo-data';

type ServerTrackingEvent = {
  id: string;
  containerNo: string;
  eventType: string;
  location: string;
  timestamp: string;
  source: string;
  description: string;
};

type ServerContainerRecord = {
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
  returnStatus: 'PENDING' | 'RETURNED' | 'OVERDUE';
  returnDate: string;
  expectedReturnDate: string;
  demurrageDays: number;
  penaltyAmount: number;
  createdAt: string;
  updatedAt: string;
};

type ServerTrackingStore = {
  containers: ServerContainerRecord[];
  events: ServerTrackingEvent[];
};

type TrackingAliasSuggestion = {
  alias: string;
  kind: 'container' | 'bill_of_lading' | 'booking' | 'shipment' | 'trip';
  containerNo: string;
  bookingNo: string;
  currentStatus: string;
  currentLocation: string;
  score: number;
};

const storeDir = path.join('/tmp', 'tikur_abay_tracking_store');
const storePath = path.join(storeDir, 'tracking.json');

function normalizeReference(value: string) {
  return value.trim().toUpperCase();
}

function normalizeContainerNumber(value: string) {
  return value.trim().toUpperCase();
}

function normalizeLooseReference(value: string) {
  return normalizeReference(value).replace(/[^A-Z0-9]/g, '');
}

function isoAfter(base: string, days: number) {
  const parsed = new Date(base || Date.now());
  return new Date(parsed.getTime() + days * 86400000).toISOString();
}

function buildContainerNumberFromReference(reference: string, index: number) {
  const suffix = reference.replace(/\D/g, '').slice(-6).padStart(6, '0');
  const serial = String(index + 1).padStart(1, '0');
  return `MSCU${suffix}${serial}`.slice(0, 11);
}

function buildContainerNumber(request: UnifiedBookingRequest, index: number) {
  return buildContainerNumberFromReference(request.bookingId || request.quoteId, index);
}

function extractBookingReference(reference: string) {
  const normalized = normalizeReference(reference);
  if (normalized.startsWith('TRP-')) return normalized.slice(4);
  if (normalized.startsWith('TRIP-')) return normalized.slice(5);
  return normalized;
}

function buildTripAliases(bookingNo: string) {
  const normalized = normalizeReference(bookingNo);
  return [
    `TRP-${normalized}`,
    `TRIP-${normalized}`,
  ];
}

function buildOperationalAliases(container: ServerContainerRecord) {
  const aliases = [
    { alias: normalizeReference(container.containerNo), kind: 'container' as const },
    { alias: normalizeReference(container.blNo), kind: 'bill_of_lading' as const },
    { alias: normalizeReference(container.bookingNo), kind: 'booking' as const },
    { alias: normalizeReference(container.shipmentNo), kind: 'shipment' as const },
    ...buildTripAliases(container.bookingNo).map((alias) => ({ alias: normalizeReference(alias), kind: 'trip' as const })),
  ].filter((entry) => entry.alias);
  const deduped = new Map<string, { alias: string; kind: 'container' | 'bill_of_lading' | 'booking' | 'shipment' | 'trip' }>();
  aliases.forEach((entry) => {
    if (!deduped.has(entry.alias)) deduped.set(entry.alias, entry);
  });
  return Array.from(deduped.values());
}

function buildContainerAliases(container: ServerContainerRecord) {
  const aliases = new Set<string>();
  buildOperationalAliases(container).forEach(({ alias }) => {
    aliases.add(alias);
    aliases.add(normalizeLooseReference(alias));
  });
  return Array.from(aliases);
}

function classifyTrackingQuery(query: string) {
  const raw = String(query || '').trim();
  const upper = raw.toUpperCase();
  if (!raw) return { matchedBy: 'Container / BL / Booking', type: 'all' as const };
  if (upper.includes('BL')) return { matchedBy: 'Bill of lading', type: 'bl' as const };
  if (upper.startsWith('TRP-') || upper.startsWith('TRIP-') || upper.includes('BK-') || upper.includes('TAB-') || upper.includes('TB-')) {
    return { matchedBy: 'Booking reference', type: 'booking' as const };
  }
  return { matchedBy: 'Container number', type: 'container' as const };
}

function scoreContainerMatch(container: ServerContainerRecord, query: string) {
  const rawNeedle = query.trim();
  const needle = rawNeedle.toLowerCase();
  const normalizedNeedle = normalizeLooseReference(rawNeedle);
  if (!needle) return 1;
  const aliases = buildContainerAliases(container);
  if (aliases.includes(normalizeReference(rawNeedle)) || aliases.includes(normalizedNeedle)) return 100;
  if (aliases.some((alias) => alias.includes(normalizedNeedle) || alias.toLowerCase().includes(needle))) return 70;

  const haystack = [
    container.containerNo,
    container.blNo,
    container.bookingNo,
    container.shipmentNo,
    container.currentLocation,
    container.consignee,
    container.shipper,
    container.vesselName,
    container.voyageNo,
  ]
    .join(' ')
    .toLowerCase();
  if (haystack.includes(needle)) return 40;
  return 0;
}

function levenshteinDistance(left: string, right: string) {
  if (!left) return right.length;
  if (!right) return left.length;
  const rows = Array.from({ length: left.length + 1 }, (_, index) => index);
  for (let column = 1; column <= right.length; column += 1) {
    let previous = rows[0];
    rows[0] = column;
    for (let row = 1; row <= left.length; row += 1) {
      const current = rows[row];
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;
      rows[row] = Math.min(
        rows[row] + 1,
        rows[row - 1] + 1,
        previous + cost,
      );
      previous = current;
    }
  }
  return rows[left.length];
}

function scoreAliasSuggestion(alias: string, query: string) {
  const normalizedAlias = normalizeLooseReference(alias);
  const normalizedQuery = normalizeLooseReference(query);
  if (!normalizedAlias || !normalizedQuery) return 0;
  if (normalizedAlias === normalizedQuery) return 100;
  if (normalizedAlias.startsWith(normalizedQuery) || normalizedQuery.startsWith(normalizedAlias)) return 92;
  if (normalizedAlias.includes(normalizedQuery) || normalizedQuery.includes(normalizedAlias)) return 84;
  const distance = levenshteinDistance(normalizedAlias, normalizedQuery);
  const lengthGap = Math.abs(normalizedAlias.length - normalizedQuery.length);
  if (distance <= 2) return 78 - lengthGap;
  if (distance <= 4 && normalizedAlias.slice(0, 4) === normalizedQuery.slice(0, 4)) return 68 - lengthGap;
  return 0;
}

function deriveMatchedAliases(container: ServerContainerRecord | null, query: string) {
  if (!container) return [];
  const aliases = buildOperationalAliases(container);
  const normalizedQuery = normalizeLooseReference(query);
  const matched = aliases
    .filter(({ alias }) => {
      const normalizedAlias = normalizeLooseReference(alias);
      return !normalizedQuery || normalizedAlias === normalizedQuery || normalizedAlias.includes(normalizedQuery) || normalizedQuery.includes(normalizedAlias);
    })
    .map(({ alias, kind }) => ({ alias, kind }));
  return (matched.length ? matched : aliases).slice(0, 6);
}

function deriveSuggestedAliases(containers: ServerContainerRecord[], query: string, excludeContainerNo = ''): TrackingAliasSuggestion[] {
  const suggestions = containers.flatMap((container) =>
    buildOperationalAliases(container).map(({ alias, kind }) => ({
      alias,
      kind,
      containerNo: container.containerNo,
      bookingNo: container.bookingNo,
      currentStatus: container.currentStatus,
      currentLocation: container.currentLocation,
      score: scoreAliasSuggestion(alias, query),
    })),
  );
  const deduped = new Map<string, TrackingAliasSuggestion>();
  suggestions
    .filter((entry) => entry.score >= 60 && entry.containerNo !== excludeContainerNo)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.alias.localeCompare(right.alias);
    })
    .forEach((entry) => {
      const key = `${entry.alias}:${entry.containerNo}`;
      if (!deduped.has(key)) deduped.set(key, entry);
    });
  return Array.from(deduped.values()).slice(0, 6);
}

function sortMatchedContainers(containers: ServerContainerRecord[], query: string) {
  return [...containers]
    .map((container) => ({ container, score: scoreContainerMatch(container, query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return String(b.container.updatedAt).localeCompare(String(a.container.updatedAt));
    })
    .map((entry) => entry.container);
}

function seedFromRequests(requests: UnifiedBookingRequest[]): ServerTrackingStore {
  const containers: ServerContainerRecord[] = [];
  const events: ServerTrackingEvent[] = [];

  requests
    .filter((request) => request.bookingId)
    .forEach((request) => {
      const count = Math.max(request.containerCount || 1, 1);
      for (let index = 0; index < count; index += 1) {
        const containerNo = buildContainerNumber(request, index);
        const event: ServerTrackingEvent = {
          id: `${request.bookingId}-BOOKED-${index + 1}`,
          containerNo,
          eventType: 'BOOKED',
          location: request.portOfLoading || request.originCityOrPort || 'Origin terminal',
          timestamp: request.acceptedAt || request.updatedAt || new Date().toISOString(),
          source: 'seed',
          description: 'Tracking object created from confirmed booking.',
        };
        containers.push({
          containerNo,
          blNo: `HBL-${request.bookingId}`,
          bookingNo: request.bookingId,
          shipmentNo: request.convertedToShipmentId || request.bookingId,
          carrier: request.assignedOriginAgentEmail ? 'Tikur Abay / Origin managed' : 'Pending carrier',
          vesselName: request.vesselName || 'Pending vessel',
          voyageNo: request.voyageNumber || 'Pending voyage',
          currentStatus: 'BOOKED',
          currentLocation: request.portOfLoading || request.originCityOrPort || 'Origin terminal',
          eta: isoAfter(request.createdAt || new Date().toISOString(), 14),
          shipper: request.company || request.customerName,
          consignee: request.consigneeName || request.customerName,
          assignedDriver: '',
          deliveredBy: '',
          returnedBy: '',
          returnStatus: 'PENDING',
          returnDate: '',
          expectedReturnDate: isoAfter(request.createdAt || new Date().toISOString(), 21),
          demurrageDays: 0,
          penaltyAmount: 0,
          createdAt: request.createdAt || new Date().toISOString(),
          updatedAt: event.timestamp,
        });
        events.push(event);
      }
    });

  return { containers, events };
}

function normalizeStoredContainer(container: ServerContainerRecord): ServerContainerRecord {
  const normalizedBookingNo = extractBookingReference(container.bookingNo);
  const normalizedShipmentNo = normalizeReference(container.shipmentNo || container.bookingNo);
  const normalizedBlNo =
    normalizeReference(container.blNo).startsWith('HBL-TRP-') || normalizeReference(container.blNo).startsWith('HBL-TRIP-')
      ? `HBL-${normalizedBookingNo}`
      : normalizeReference(container.blNo || `HBL-${normalizedBookingNo}`);
  return {
    ...container,
    containerNo: normalizeContainerNumber(container.containerNo),
    bookingNo: normalizedBookingNo,
    shipmentNo: normalizedShipmentNo,
    blNo: normalizedBlNo,
  };
}

function normalizeStoredEvent(event: ServerTrackingEvent): ServerTrackingEvent {
  return {
    ...event,
    containerNo: normalizeContainerNumber(event.containerNo),
  };
}

async function ensureStore() {
  await mkdir(storeDir, { recursive: true });
  try {
    const raw = await readFile(storePath, 'utf8');
    const parsed = JSON.parse(raw) as ServerTrackingStore;
    if (Array.isArray(parsed.containers) && Array.isArray(parsed.events)) {
      const normalized: ServerTrackingStore = {
        containers: parsed.containers.map(normalizeStoredContainer),
        events: parsed.events.map(normalizeStoredEvent),
      };
      if (JSON.stringify(normalized) !== JSON.stringify(parsed)) {
        await writeFile(storePath, JSON.stringify(normalized, null, 2), 'utf8');
      }
      return normalized;
    }
  } catch {}
  const seeded = seedFromRequests(seededBookingRequests);
  await writeFile(storePath, JSON.stringify(seeded, null, 2), 'utf8');
  return seeded;
}

async function saveStore(store: ServerTrackingStore) {
  await mkdir(storeDir, { recursive: true });
  await writeFile(storePath, JSON.stringify(store, null, 2), 'utf8');
}

function deriveStatus(eventType: string) {
  const key = eventType.toUpperCase();
  const statuses: Record<string, string> = {
    BOOKED: 'BOOKED',
    EMPTY_RELEASED: 'EMPTY_RELEASED',
    EMPTY_PICKUP: 'EMPTY_PICKUP',
    LOADED_AT_SHIPPER: 'LOADED',
    GATE_IN_AT_PORT: 'AT_PORT',
    LOADED_ON_VESSEL: 'ON_VESSEL',
    VESSEL_DEPARTED: 'IN_TRANSIT',
    TRANSSHIPMENT: 'TRANSSHIPMENT',
    VESSEL_ARRIVED: 'ARRIVED_PORT',
    DISCHARGED_FROM_VESSEL: 'DISCHARGED',
    AVAILABLE_FOR_CLEARANCE: 'CLEARANCE_READY',
    CUSTOMS_CLEARED: 'CUSTOMS_CLEARED',
    TRUCK_ASSIGNED: 'TRUCK_ASSIGNED',
    OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
    ARRIVED_INLAND: 'ARRIVED_INLAND',
    YARD_HANDOFF: 'YARD_HANDOFF',
    UNLOADED_INLAND: 'UNLOADED_INLAND',
    HANDOFF: 'HANDOFF',
    IN_TRANSIT: 'INLAND_TRANSIT',
    ARRIVED: 'DELIVERED',
    EMPTY_RETURN_STARTED: 'EMPTY_RETURN_IN_PROGRESS',
    EMPTY_RETURNED: 'RETURNED',
  };
  return statuses[key] || key;
}

function deriveAlerts(container: ServerContainerRecord, events: ServerTrackingEvent[]) {
  const latest = events[0];
  const alerts: Array<{ title: string; tone: 'critical' | 'warning' | 'info' | 'good'; detail: string }> = [];
  if (container.eta && new Date(container.eta).getTime() < Date.now() && !['DELIVERED', 'RETURNED'].includes(container.currentStatus)) {
    alerts.push({ title: 'Delay detected', tone: 'critical', detail: `ETA ${container.eta} has already passed.` });
  }
  if (latest && Date.now() - new Date(latest.timestamp).getTime() > 12 * 3600000) {
    alerts.push({ title: 'No update risk', tone: 'critical', detail: 'No tracking update in the last 12 hours.' });
  }
  if (container.returnStatus === 'OVERDUE') {
    alerts.push({ title: 'Container not returned', tone: 'warning', detail: `${container.demurrageDays} demurrage day(s) · USD ${container.penaltyAmount.toLocaleString('en-US')}.` });
  }
  return alerts.length ? alerts : [{ title: 'Tracking healthy', tone: 'good', detail: 'Container updates are flowing in the expected lifecycle.' }];
}

function buildFallbackBookingContainer(bookingNo: string): ServerContainerRecord {
  const now = new Date().toISOString();
  const normalizedBookingNo = extractBookingReference(bookingNo);
  const normalizedShipmentNo = normalizeReference(bookingNo);
  return {
    containerNo: buildContainerNumberFromReference(normalizedBookingNo, 0),
    blNo: `HBL-${normalizedBookingNo}`,
    bookingNo: normalizedBookingNo,
    shipmentNo: normalizedShipmentNo,
    carrier: 'Pending carrier',
    vesselName: 'Pending vessel',
    voyageNo: 'Pending voyage',
    currentStatus: 'BOOKED',
    currentLocation: 'Origin terminal',
    eta: isoAfter(now, 14),
    shipper: '',
    consignee: '',
    assignedDriver: '',
    deliveredBy: '',
    returnedBy: '',
    returnStatus: 'PENDING',
    returnDate: '',
    expectedReturnDate: isoAfter(now, 21),
    demurrageDays: 0,
    penaltyAmount: 0,
    createdAt: now,
    updatedAt: now,
  };
}

function buildFallbackContainer(containerNo: string): ServerContainerRecord {
  const now = new Date().toISOString();
  const normalizedContainerNo = normalizeContainerNumber(containerNo);
  return {
    containerNo: normalizedContainerNo,
    blNo: `HBL-${normalizedContainerNo}`,
    bookingNo: `BK-${normalizedContainerNo}`,
    shipmentNo: `SHP-${normalizedContainerNo}`,
    carrier: 'Pending carrier',
    vesselName: 'Pending vessel',
    voyageNo: 'Pending voyage',
    currentStatus: 'BOOKED',
    currentLocation: 'Origin terminal',
    eta: isoAfter(now, 14),
    shipper: '',
    consignee: '',
    assignedDriver: '',
    deliveredBy: '',
    returnedBy: '',
    returnStatus: 'PENDING',
    returnDate: '',
    expectedReturnDate: isoAfter(now, 21),
    demurrageDays: 0,
    penaltyAmount: 0,
    createdAt: now,
    updatedAt: now,
  };
}

function buildFallbackBookingEvent(bookingNo: string, containerNo: string): ServerTrackingEvent {
  const timestamp = new Date().toISOString();
  const normalizedBookingNo = extractBookingReference(bookingNo);
  return {
    id: `${normalizedBookingNo}-BOOKED-FALLBACK`,
    containerNo: normalizeContainerNumber(containerNo),
    eventType: 'BOOKED',
    location: 'Origin terminal',
    timestamp,
    source: 'fallback',
    description: 'Tracking object created from booking reference fallback.',
  };
}

function buildFallbackContainerEvent(containerNo: string): ServerTrackingEvent {
  const timestamp = new Date().toISOString();
  const normalizedContainerNo = normalizeContainerNumber(containerNo);
  return {
    id: `${normalizedContainerNo}-BOOKED-FALLBACK`,
    containerNo: normalizedContainerNo,
    eventType: 'BOOKED',
    location: 'Origin terminal',
    timestamp,
    source: 'fallback',
    description: 'Tracking object created from container reference fallback.',
  };
}

export async function readServerTrackingByQuery(query: string) {
  const store = await ensureStore();
  const trimmedQuery = query.trim();
  const normalizedNeedle = normalizeLooseReference(trimmedQuery);
  const classification = classifyTrackingQuery(trimmedQuery);
  let suggestions = trimmedQuery ? deriveSuggestedAliases(store.containers, trimmedQuery) : [];
  let matchedContainers = !trimmedQuery
    ? [...store.containers].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    : sortMatchedContainers(store.containers, trimmedQuery);
  if (!matchedContainers.length && classification.type === 'booking' && !suggestions.length) {
    const fallback = buildFallbackBookingContainer(query.trim());
    store.containers.push(fallback);
    store.events.unshift(buildFallbackBookingEvent(fallback.bookingNo, fallback.containerNo));
    await saveStore(store);
    matchedContainers = [fallback];
    suggestions = [];
  }
  if (!matchedContainers.length && classification.type === 'container' && !suggestions.length) {
    const fallback = buildFallbackContainer(query.trim());
    store.containers.push(fallback);
    store.events.unshift(buildFallbackContainerEvent(fallback.containerNo));
    await saveStore(store);
    matchedContainers = [fallback];
    suggestions = [];
  }
  const primary = matchedContainers[0] || null;
  const events = primary
    ? store.events
        .filter((event) => event.containerNo === primary.containerNo)
        .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)))
    : [];
  const effectiveEvents = events;
  const relatedContainers = primary
    ? matchedContainers.filter((container) =>
        container.bookingNo === primary.bookingNo ||
        container.blNo === primary.blNo ||
        buildContainerAliases(container).includes(normalizedNeedle),
      )
    : [];
  return {
    query,
    container: primary,
    events: effectiveEvents,
    relatedContainers,
    alerts: primary ? deriveAlerts(primary, effectiveEvents) : [],
    matchedBy: classification.matchedBy,
    matchedAliases: deriveMatchedAliases(primary, trimmedQuery),
    suggestions: deriveSuggestedAliases(store.containers, trimmedQuery, primary?.containerNo || ''),
    type: classification.type,
  };
}

export async function readServerTrackingByBl(blNo: string) {
  const store = await ensureStore();
  const normalized = blNo.trim().toLowerCase();
  const containers = store.containers.filter((container) => container.blNo.toLowerCase() === normalized);
  return {
    blNo,
    containers,
  };
}

export async function readServerContainerList(query: string) {
  const store = await ensureStore();
  const trimmedQuery = query.trim();
  const classification = classifyTrackingQuery(trimmedQuery);
  let containers = !trimmedQuery
    ? [...store.containers].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    : sortMatchedContainers(store.containers, trimmedQuery);
  if (!containers.length && classification.type === 'booking') {
    const fallback = buildFallbackBookingContainer(query.trim());
    store.containers.push(fallback);
    store.events.unshift(buildFallbackBookingEvent(fallback.bookingNo, fallback.containerNo));
    await saveStore(store);
    containers = [fallback];
  }
  if (!containers.length && classification.type === 'container') {
    const fallback = buildFallbackContainer(query.trim());
    store.containers.push(fallback);
    store.events.unshift(buildFallbackContainerEvent(fallback.containerNo));
    await saveStore(store);
    containers = [fallback];
  }
  return { total: containers.length, containers };
}

export async function readServerContainer(containerNo: string) {
  const store = await ensureStore();
  return store.containers.find((container) => container.containerNo.toLowerCase() === containerNo.trim().toLowerCase()) || null;
}

export async function appendServerTrackingEvent(input: {
  containerNo: string;
  eventType: string;
  location: string;
  source?: string;
  timestamp?: string;
  description?: string;
}) {
  const store = await ensureStore();
  const containerNo = normalizeContainerNumber(input.containerNo);
  const index = store.containers.findIndex((container) => normalizeContainerNumber(container.containerNo) === containerNo);
  if (index < 0) {
    return { accepted: false, reason: 'Container not found' };
  }
  const duplicate = store.events.find(
    (event) =>
      normalizeContainerNumber(event.containerNo) === containerNo &&
      event.eventType.toUpperCase() === input.eventType.toUpperCase() &&
      event.location.trim().toLowerCase() === input.location.trim().toLowerCase(),
  );
  if (duplicate) {
    return { accepted: true, deduped: true, container: store.containers[index], event: duplicate };
  }
  const timestamp = input.timestamp || new Date().toISOString();
  const nextEvent: ServerTrackingEvent = {
    id: `${store.containers[index].containerNo}-${Date.now()}`,
    containerNo: store.containers[index].containerNo,
    eventType: input.eventType,
    location: input.location,
    timestamp,
    source: input.source || 'manual',
    description: input.description || `${input.eventType} recorded at ${input.location}.`,
  };
  store.events.unshift(nextEvent);

  const current = store.containers[index];
  const updated: ServerContainerRecord = {
    ...current,
    currentStatus: deriveStatus(input.eventType),
    currentLocation: input.location,
    updatedAt: timestamp,
  };
  if (input.eventType.toUpperCase() === 'ARRIVED') {
    updated.deliveredBy = current.assignedDriver || 'Recorded by tracking event';
  }
  if (input.eventType.toUpperCase() === 'EMPTY_RETURNED') {
    updated.returnDate = timestamp;
    updated.returnStatus = 'RETURNED';
    updated.returnedBy = current.assignedDriver || 'Recorded by tracking event';
    updated.demurrageDays = Math.max(Math.ceil((new Date(timestamp).getTime() - new Date(current.expectedReturnDate).getTime()) / 86400000), 0);
    updated.penaltyAmount = updated.demurrageDays * 45;
  } else if (current.expectedReturnDate && new Date(current.expectedReturnDate).getTime() < Date.now() && !current.returnDate) {
    updated.returnStatus = 'OVERDUE';
    updated.demurrageDays = Math.max(Math.ceil((Date.now() - new Date(current.expectedReturnDate).getTime()) / 86400000), 0);
    updated.penaltyAmount = updated.demurrageDays * 45;
  }
  store.containers[index] = updated;
  await saveStore(store);
  return { accepted: true, container: updated, event: nextEvent };
}

type ServerBookingRegistrationInput = {
  bookingNo: string;
  quoteId?: string;
  shipmentNo?: string;
  containerCount?: number;
  blNo?: string;
  carrier?: string;
  vesselName?: string;
  voyageNo?: string;
  currentLocation?: string;
  shipper?: string;
  consignee?: string;
  createdAt?: string;
  updatedAt?: string;
  eta?: string;
};

type ServerOriginRegistrationInput = {
  bookingNo: string;
  containerNo?: string;
  blNo?: string;
  carrier?: string;
  vesselName?: string;
  voyageNo?: string;
  currentLocation?: string;
  shipper?: string;
  consignee?: string;
  eta?: string;
  eventType?: string;
  description?: string;
  timestamp?: string;
};

function upsertEventIfMissing(store: ServerTrackingStore, event: ServerTrackingEvent) {
  const existing = store.events.some(
    (item) => item.containerNo === event.containerNo && item.eventType === event.eventType && item.location === event.location,
  );
  if (!existing) {
    store.events.unshift(event);
  }
}

export async function upsertServerTrackingBooking(input: ServerBookingRegistrationInput) {
  const bookingNo = normalizeReference(input.bookingNo);
  if (!bookingNo) {
    return { accepted: false, reason: 'Booking number is required' };
  }

  const store = await ensureStore();
  const count = Math.max(input.containerCount || 1, 1);
  const createdAt = input.createdAt || new Date().toISOString();
  const updatedAt = input.updatedAt || createdAt;
  const currentLocation = input.currentLocation || 'Origin terminal';
  const baseContainerIndexes = Array.from({ length: count }, (_, index) => index);

  baseContainerIndexes.forEach((index) => {
    const fallbackContainerNo = buildContainerNumberFromReference(bookingNo || input.quoteId || bookingNo, index);
    const existingIndex = store.containers.findIndex(
      (container) =>
        normalizeReference(container.bookingNo) === bookingNo &&
        (normalizeContainerNumber(container.containerNo) === fallbackContainerNo || index === 0),
    );
    const nextContainer: ServerContainerRecord = {
      containerNo: existingIndex >= 0 ? normalizeContainerNumber(store.containers[existingIndex]!.containerNo) : fallbackContainerNo,
      blNo: normalizeReference(input.blNo || `HBL-${bookingNo}`),
      bookingNo,
      shipmentNo: normalizeReference(input.shipmentNo || bookingNo),
      carrier: input.carrier || 'Pending carrier',
      vesselName: input.vesselName || 'Pending vessel',
      voyageNo: input.voyageNo || 'Pending voyage',
      currentStatus: 'BOOKED',
      currentLocation,
      eta: input.eta || isoAfter(createdAt, 14),
      shipper: input.shipper || '',
      consignee: input.consignee || '',
      assignedDriver: existingIndex >= 0 ? store.containers[existingIndex]!.assignedDriver : '',
      deliveredBy: existingIndex >= 0 ? store.containers[existingIndex]!.deliveredBy : '',
      returnedBy: existingIndex >= 0 ? store.containers[existingIndex]!.returnedBy : '',
      returnStatus: existingIndex >= 0 ? store.containers[existingIndex]!.returnStatus : 'PENDING',
      returnDate: existingIndex >= 0 ? store.containers[existingIndex]!.returnDate : '',
      expectedReturnDate: existingIndex >= 0 ? store.containers[existingIndex]!.expectedReturnDate : isoAfter(createdAt, 21),
      demurrageDays: existingIndex >= 0 ? store.containers[existingIndex]!.demurrageDays : 0,
      penaltyAmount: existingIndex >= 0 ? store.containers[existingIndex]!.penaltyAmount : 0,
      createdAt: existingIndex >= 0 ? store.containers[existingIndex]!.createdAt : createdAt,
      updatedAt,
    };

    if (existingIndex >= 0) {
      store.containers[existingIndex] = nextContainer;
    } else {
      store.containers.push(nextContainer);
    }

    upsertEventIfMissing(store, {
      id: `${bookingNo}-BOOKED-${index + 1}`,
      containerNo: nextContainer.containerNo,
      eventType: 'BOOKED',
      location: currentLocation,
      timestamp: updatedAt,
      source: 'booking-sync',
      description: 'Tracking object created from confirmed booking.',
    });
  });

  await saveStore(store);
  return { accepted: true, bookingNo };
}

export async function upsertServerTrackingOrigin(input: ServerOriginRegistrationInput) {
  const bookingNo = normalizeReference(input.bookingNo);
  if (!bookingNo) {
    return { accepted: false, reason: 'Booking number is required' };
  }

  const store = await ensureStore();
  const existingIndex = store.containers.findIndex((container) => normalizeReference(container.bookingNo) === bookingNo);
  const timestamp = input.timestamp || new Date().toISOString();
  const containerNo =
    normalizeContainerNumber(input.containerNo || '') ||
    (existingIndex >= 0 ? normalizeContainerNumber(store.containers[existingIndex]!.containerNo) : buildContainerNumberFromReference(bookingNo, 0));

  const current: ServerContainerRecord =
    existingIndex >= 0
      ? store.containers[existingIndex]!
      : {
          containerNo,
          blNo: normalizeReference(input.blNo || `HBL-${bookingNo}`),
          bookingNo,
          shipmentNo: bookingNo,
          carrier: input.carrier || 'Pending carrier',
          vesselName: input.vesselName || 'Pending vessel',
          voyageNo: input.voyageNo || 'Pending voyage',
          currentStatus: 'BOOKED',
          currentLocation: input.currentLocation || 'Origin terminal',
          eta: input.eta || isoAfter(timestamp, 14),
          shipper: input.shipper || '',
          consignee: input.consignee || '',
          assignedDriver: '',
          deliveredBy: '',
          returnedBy: '',
          returnStatus: 'PENDING',
          returnDate: '',
          expectedReturnDate: isoAfter(timestamp, 21),
          demurrageDays: 0,
          penaltyAmount: 0,
          createdAt: timestamp,
          updatedAt: timestamp,
        };

  const updated: ServerContainerRecord = {
    ...current,
    containerNo,
    blNo: normalizeReference(input.blNo || current.blNo),
    carrier: input.carrier || current.carrier,
    vesselName: input.vesselName || current.vesselName,
    voyageNo: input.voyageNo || current.voyageNo,
    currentStatus: input.eventType ? deriveStatus(input.eventType) : current.currentStatus,
    currentLocation: input.currentLocation || current.currentLocation,
    shipper: input.shipper || current.shipper,
    consignee: input.consignee || current.consignee,
    eta: input.eta || current.eta,
    updatedAt: timestamp,
  };

  if (existingIndex >= 0) {
    store.containers[existingIndex] = updated;
  } else {
    store.containers.push(updated);
  }

  upsertEventIfMissing(store, {
    id: `${updated.containerNo}-${Date.now()}`,
    containerNo: updated.containerNo,
    eventType: input.eventType || 'ORIGIN_UPDATED',
    location: updated.currentLocation,
    timestamp,
    source: 'origin-sync',
    description: input.description || 'Origin desk updated container and vessel details.',
  });

  await saveStore(store);
  return { accepted: true, bookingNo, containerNo: updated.containerNo };
}
