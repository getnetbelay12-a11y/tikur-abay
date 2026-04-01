import { bookingQuoteStorageKey, type UnifiedBookingRequest } from './booking-quote-demo-data';
import { readWorkflowState, writeWorkflowState } from './workflow-state-client';

const sharedQuoteReviewCookiePrefix = 'tikur_abay_quote_review_';
const sharedQuoteReviewCollectionCookieKey = 'tikur_abay_quote_reviews';
export const sharedQuoteStorageUpdatedEvent = 'tikur-abay:booking-quote-desk:storage-updated';

function parseTime(value: string | undefined) {
  const parsed = new Date(String(value || ''));
  const time = parsed.getTime();
  return Number.isFinite(time) ? time : 0;
}

function compareReferenceOrder(left: string | undefined, right: string | undefined) {
  const leftKey = String(left || '').replace(/\D/g, '');
  const rightKey = String(right || '').replace(/\D/g, '');
  if (leftKey.length !== rightKey.length) return rightKey.length - leftKey.length;
  return rightKey.localeCompare(leftKey);
}

function sortQuoteRequestsNewestFirst(requests: UnifiedBookingRequest[]) {
  return [...requests].sort((left, right) => {
    const createdDelta = parseTime(right.createdAt) - parseTime(left.createdAt);
    if (createdDelta !== 0) return createdDelta;
    const updatedDelta = parseTime(right.updatedAt) - parseTime(left.updatedAt);
    if (updatedDelta !== 0) return updatedDelta;
    const bookingDelta = compareReferenceOrder(left.bookingId, right.bookingId);
    if (bookingDelta !== 0) return bookingDelta;
    return compareReferenceOrder(left.quoteId, right.quoteId);
  });
}

export function compactQuoteReviewRecord(request: UnifiedBookingRequest) {
  return {
    quoteId: request.quoteId,
    bookingId: request.bookingId,
    requestSource: request.requestSource,
    customerName: request.customerName,
    company: request.company,
    consigneeName: request.consigneeName,
    notifyPartyName: request.notifyPartyName,
    secondNotifyParty: request.secondNotifyParty,
    contactPerson: request.contactPerson,
    phone: request.phone,
    email: request.email,
    localPortalRecipientEmail: request.localPortalRecipientEmail,
    serviceType: request.serviceType,
    shipmentMode: request.shipmentMode || (request.serviceType === 'unimodal' ? 'Ocean Freight' : 'Multimodal'),
    loadType: request.bookingType || (request.containerCount > 0 ? 'FCL' : 'LCL'),
    serviceLevel: request.serviceLevel || 'Door to Door',
    portOfLoading: request.portOfLoading,
    portOfDischarge: request.portOfDischarge,
    placeOfReceipt: request.placeOfReceipt,
    inlandDestination: request.inlandDestination,
    finalDeliveryLocation: request.finalDeliveryLocation,
    commoditySummary: request.commoditySummary,
    cargoDescription: request.cargoDescription,
    hsCode: request.hsCode,
    marksAndNumbers: request.marksAndNumbers,
    packageSummary: request.packageSummary,
    freightPaymentTerm: request.freightPaymentTerm,
    prepaidAt: request.prepaidAt,
    collectAt: request.collectAt,
    lcNumber: request.lcNumber,
    bankPermitNumber: request.bankPermitNumber,
    consigneeTinNumber: request.consigneeTinNumber,
    tinAreaCode: request.tinAreaCode,
    unNumber: request.unNumber,
    quoteAmount: request.quoteAmount,
    quoteCurrency: request.quoteCurrency,
    quoteStatus: request.quoteStatus,
    approvalStatus: request.approvalStatus,
    approvalMethod: request.approvalMethod,
    approvalRecordedBy: request.approvalRecordedBy,
    approvalRecordedAt: request.approvalRecordedAt,
    assignedOriginAgentEmail: request.assignedOriginAgentEmail,
    containerType: request.containerType,
    containerCount: request.containerCount,
    vesselName: request.vesselName,
    voyageNumber: request.voyageNumber,
    etaLoadingPort: request.etaLoadingPort,
    shippingCertificateRequired: request.shippingCertificateRequired,
    totalWeight: request.totalWeight,
    cbm: request.cbm,
    requestedLoadingDate: request.requestedLoadingDate,
    earliestDepartureDate: request.earliestDepartureDate,
    requestedArrivalWindow: request.requestedArrivalWindow,
    incoterm: request.incoterm,
    pricingBreakdown: request.pricingBreakdown,
    remarks: request.remarks,
    priceOwner: request.priceOwner,
    specialHandlingNote: request.specialHandlingNote,
  };
}

function clearLegacyQuoteReviewCookies(quoteIds: string[]) {
  if (typeof document === 'undefined') return;
  const cookieNames = document.cookie
    .split('; ')
    .map((entry) => entry.split('=')[0])
    .filter((name) => name.startsWith(sharedQuoteReviewCookiePrefix));
  const knownNames = quoteIds.map((quoteId) => `${sharedQuoteReviewCookiePrefix}${quoteId}`);
  const namesToClear = Array.from(new Set([...cookieNames, ...knownNames]));
  namesToClear.forEach((name) => {
    document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
  });
}

function writeSharedQuoteReviewCollection(requests: UnifiedBookingRequest[]) {
  if (typeof document === 'undefined') return;
  clearLegacyQuoteReviewCookies(requests.map((request) => request.quoteId));
  const payload = encodeURIComponent(JSON.stringify(requests.slice(0, 40).map(compactQuoteReviewRecord)));
  document.cookie = `${sharedQuoteReviewCollectionCookieKey}=${payload}; path=/; max-age=2592000; samesite=lax`;
}

function readCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null;
}

function readSharedQuoteCollectionCookie() {
  const raw = readCookie(sharedQuoteReviewCollectionCookieKey);
  if (!raw) return [] as Partial<UnifiedBookingRequest>[];
  try {
    const parsed = JSON.parse(raw) as Partial<UnifiedBookingRequest>[];
    return Array.isArray(parsed) ? parsed.filter((item) => Boolean(item?.quoteId)) : [];
  } catch {
    return [] as Partial<UnifiedBookingRequest>[];
  }
}

export function readSharedQuoteRequests(fallback: UnifiedBookingRequest[] = []) {
  if (typeof window === 'undefined') return fallback;
  const cookieQuotes = readSharedQuoteCollectionCookie();
  let storedQuotes = [] as UnifiedBookingRequest[];
  const raw = window.localStorage.getItem(bookingQuoteStorageKey);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as UnifiedBookingRequest[];
      storedQuotes = Array.isArray(parsed) ? parsed : [];
    } catch {
      storedQuotes = [];
    }
  }

  const base = storedQuotes.length ? storedQuotes : fallback;
  if (!cookieQuotes.length) return base;

  const byQuoteId = new Map<string, UnifiedBookingRequest>();
  base.forEach((request) => {
    if (request.quoteId) byQuoteId.set(request.quoteId, request);
  });

  cookieQuotes.forEach((cookieRequest) => {
    const quoteId = String(cookieRequest.quoteId || '');
    if (!quoteId) return;
    const existing = byQuoteId.get(quoteId);
    if (existing) {
      byQuoteId.set(quoteId, {
        ...existing,
        ...cookieRequest,
        quoteHistory: existing.quoteHistory,
      });
      return;
    }
    const fallbackMatch = fallback.find((request) => request.quoteId === quoteId);
    if (fallbackMatch) {
      byQuoteId.set(quoteId, {
        ...fallbackMatch,
        ...cookieRequest,
      });
      return;
    }
    byQuoteId.set(quoteId, {
      id: `shared-${quoteId}`,
      quoteId,
      bookingId: String(cookieRequest.bookingId || ''),
      convertedToShipmentId: String(cookieRequest.convertedToShipmentId || ''),
      quoteStatus: (cookieRequest.quoteStatus as UnifiedBookingRequest['quoteStatus']) || 'quote_sent',
      bookingStatus: (cookieRequest.bookingStatus as UnifiedBookingRequest['bookingStatus']) || 'draft',
      quoteAmount: Number(cookieRequest.quoteAmount || 0),
      quoteCurrency: String(cookieRequest.quoteCurrency || 'USD'),
      acceptedAt: String(cookieRequest.acceptedAt || ''),
      assignedOriginAgentId: '',
      assignedOriginAgentEmail: String(cookieRequest.assignedOriginAgentEmail || ''),
      createdAt: '',
      updatedAt: String(cookieRequest.approvalRecordedAt || ''),
      requestedBy: 'Customer portal',
      assignedDesk: 'Commercial pricing desk',
      quoteHistory: [],
      requestSource: (cookieRequest.requestSource as UnifiedBookingRequest['requestSource']) || 'customer',
      customerName: String(cookieRequest.customerName || ''),
      consigneeName: String(cookieRequest.consigneeName || ''),
      contactPerson: String(cookieRequest.contactPerson || ''),
      phone: String(cookieRequest.phone || ''),
      email: String(cookieRequest.email || ''),
      company: String(cookieRequest.company || ''),
      incoterm: String(cookieRequest.incoterm || 'CFR'),
      serviceType: (cookieRequest.serviceType as UnifiedBookingRequest['serviceType']) || 'multimodal',
      originCountry: String((cookieRequest as UnifiedBookingRequest).originCountry || ''),
      originCityOrPort: String((cookieRequest as UnifiedBookingRequest).originCityOrPort || ''),
      portOfLoading: String(cookieRequest.portOfLoading || ''),
      portOfDischarge: String(cookieRequest.portOfDischarge || 'Djibouti'),
      inlandDestination: String(cookieRequest.inlandDestination || ''),
      finalDeliveryLocation: String(cookieRequest.finalDeliveryLocation || ''),
      commoditySummary: String(cookieRequest.commoditySummary || ''),
      cargoDescription: String(cookieRequest.cargoDescription || ''),
      hsCode: '',
      hazardousFlag: false,
      temperatureControl: false,
      outOfGaugeFlag: false,
      specialHandlingRequired: false,
      specialHandlingNote: String(cookieRequest.specialHandlingNote || ''),
      containerType: (cookieRequest.containerType as UnifiedBookingRequest['containerType']) || '40HC',
      containerCount: Number(cookieRequest.containerCount || 1),
      weightPerContainer: Number((cookieRequest as UnifiedBookingRequest).weightPerContainer || 0),
      totalWeight: Number(cookieRequest.totalWeight || 0),
      cbm: Number(cookieRequest.cbm || 0),
      requestedLoadingDate: String(cookieRequest.requestedLoadingDate || ''),
      earliestDepartureDate: String(cookieRequest.earliestDepartureDate || ''),
      requestedArrivalWindow: String(cookieRequest.requestedArrivalWindow || ''),
      priceOwner: String(cookieRequest.priceOwner || 'Consignee'),
      remarks: String(cookieRequest.remarks || ''),
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
      approvalStatus: cookieRequest.approvalStatus,
      approvalMethod: String(cookieRequest.approvalMethod || ''),
      approvalRecordedBy: String(cookieRequest.approvalRecordedBy || ''),
      approvalRecordedAt: String(cookieRequest.approvalRecordedAt || ''),
      localPortalRecipientEmail: String(cookieRequest.localPortalRecipientEmail || ''),
      shipmentMode: (cookieRequest as UnifiedBookingRequest).shipmentMode,
      bookingType: ((cookieRequest as UnifiedBookingRequest).bookingType || (cookieRequest as UnifiedBookingRequest & { loadType?: UnifiedBookingRequest['bookingType'] }).loadType) as UnifiedBookingRequest['bookingType'],
      serviceLevel: (cookieRequest as UnifiedBookingRequest).serviceLevel,
      pricingBreakdown: cookieRequest.pricingBreakdown,
    });
  });

  return sortQuoteRequestsNewestFirst(Array.from(byQuoteId.values()));
}

export function writeSharedQuoteRequests(requests: UnifiedBookingRequest[]) {
  if (typeof window === 'undefined') return;
  const orderedRequests = sortQuoteRequestsNewestFirst(requests);
  const serialized = JSON.stringify(orderedRequests);
  window.localStorage.setItem(bookingQuoteStorageKey, serialized);
  writeSharedQuoteReviewCollection(orderedRequests);
  window.dispatchEvent(new CustomEvent(sharedQuoteStorageUpdatedEvent, { detail: { count: orderedRequests.length } }));
  window.dispatchEvent(new StorageEvent('storage', { key: bookingQuoteStorageKey, newValue: serialized }));
  void writeWorkflowState('booking-quotes', orderedRequests).catch(() => {});
}

function mergeQuoteRequestsById(localRequests: UnifiedBookingRequest[], serverRequests: UnifiedBookingRequest[]) {
  const byQuoteId = new Map(localRequests.map((request) => [request.quoteId, request] as const));
  serverRequests.forEach((request) => {
    if (!byQuoteId.has(request.quoteId)) {
      byQuoteId.set(request.quoteId, request);
    }
  });
  return sortQuoteRequestsNewestFirst(Array.from(byQuoteId.values()));
}

export async function hydrateSharedQuoteRequestsFromServer(fallback: UnifiedBookingRequest[] = []) {
  if (typeof window === 'undefined') return fallback;
  const localRequests = readSharedQuoteRequests(fallback);
  try {
    const serverRequests = await readWorkflowState<UnifiedBookingRequest>('booking-quotes');
    const mergedRequests =
      localRequests.length > 0 && serverRequests.length > 0
        ? mergeQuoteRequestsById(localRequests, serverRequests)
        : localRequests.length > 0
          ? localRequests
          : sortQuoteRequestsNewestFirst(serverRequests);
    if (mergedRequests.length > 0) {
      writeSharedQuoteRequests(mergedRequests);
      return mergedRequests;
    }
    return [];
  } catch {
    return localRequests;
  }
}
