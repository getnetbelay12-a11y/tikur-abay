const bookingQuoteStorageKey = 'tikur-abay:booking-quote-desk:requests';
const sharedQuoteReviewCookiePrefix = 'tikur_abay_quote_review_';
const sharedQuoteReviewCollectionCookieKey = 'tikur_abay_quote_reviews';
export const sharedQuoteStorageUpdatedEvent = 'tikur-abay:booking-quote-desk:storage-updated';

export type SharedBookingRequest = {
  quoteId?: string;
  bookingId?: string;
  requestSource?: 'customer' | 'supplier' | 'internal' | 'port_agent' | 'admin';
  customerName?: string;
  company?: string;
  consigneeName?: string;
  notifyPartyName?: string;
  secondNotifyParty?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  localPortalRecipientEmail?: string;
  serviceType?: 'multimodal' | 'unimodal';
  shipmentMode?: 'Ocean Freight' | 'Air Freight' | 'Road' | 'Multimodal';
  loadType?: 'FCL' | 'LCL' | 'RoRo' | 'Air Freight';
  bookingType?: 'FCL' | 'LCL' | 'RoRo' | 'Air Freight';
  serviceLevel?: 'Port to Port' | 'Door to Port' | 'Port to Door' | 'Door to Door';
  portOfLoading?: string;
  portOfDischarge?: string;
  placeOfReceipt?: string;
  inlandDestination?: string;
  finalDeliveryLocation?: string;
  originCountry?: string;
  originCityOrPort?: string;
  cargoDescription?: string;
  hsCode?: string;
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
  hazardousFlag?: boolean;
  temperatureControl?: boolean;
  outOfGaugeFlag?: boolean;
  specialHandlingRequired?: boolean;
  commoditySummary?: string;
  quoteAmount?: number;
  quoteCurrency?: string;
  quoteStatus?: string;
  approvalStatus?: 'draft' | 'sent' | 'waiting_approval' | 'accepted' | 'rejected' | 'expired';
  approvalMethod?: string;
  approvalRecordedBy?: string;
  approvalRecordedAt?: string;
  assignedOriginAgentEmail?: string;
  acceptedAt?: string;
  convertedToShipmentId?: string;
  bookingStatus?: string;
  incoterm?: string;
  containerType?: string;
  containerCount?: number;
  vesselName?: string;
  voyageNumber?: string;
  etaLoadingPort?: string;
  shippingCertificateRequired?: boolean;
  weightPerContainer?: number;
  totalWeight?: number;
  cbm?: number;
  requestedLoadingDate?: string;
  earliestDepartureDate?: string;
  requestedArrivalWindow?: string;
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
  remarks?: string;
  priceOwner?: string;
  specialHandlingNote?: string;
};

export function readCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null;
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

function writeSharedQuoteCollection(requests: SharedBookingRequest[]) {
  if (typeof document === 'undefined') return;
  clearLegacyQuoteReviewCookies(requests.map((request) => String(request.quoteId || '')).filter(Boolean));
  const payload = encodeURIComponent(JSON.stringify(requests.slice(0, 40)));
  document.cookie = `${sharedQuoteReviewCollectionCookieKey}=${payload}; path=/; max-age=2592000; samesite=lax`;
}

export function readSharedQuoteRequests() {
  if (typeof window === 'undefined') return [] as SharedBookingRequest[];

  let stored = [] as SharedBookingRequest[];
  const raw = window.localStorage.getItem(bookingQuoteStorageKey);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as SharedBookingRequest[];
      stored = Array.isArray(parsed) ? parsed : [];
    } catch {
      stored = [];
    }
  }

  const cookieQuotes = readSharedCollectionCookieQuotes();
  if (!cookieQuotes.length) return stored;

  const byQuoteId = new Map<string, SharedBookingRequest>();
  stored.forEach((request) => {
    const quoteId = String(request.quoteId || '');
    if (quoteId) byQuoteId.set(quoteId, request);
  });

  cookieQuotes.forEach((request) => {
    const quoteId = String(request.quoteId || '');
    if (!quoteId) return;
    const existing = byQuoteId.get(quoteId);
    byQuoteId.set(quoteId, existing ? { ...existing, ...request } : request);
  });

  return Array.from(byQuoteId.values()).sort((left, right) => {
    const leftTime = new Date(left.approvalRecordedAt || left.acceptedAt || 0).getTime();
    const rightTime = new Date(right.approvalRecordedAt || right.acceptedAt || 0).getTime();
    return rightTime - leftTime;
  });
}

export function writeSharedQuoteRequests(requests: SharedBookingRequest[]) {
  if (typeof window === 'undefined') return;
  const serialized = JSON.stringify(requests);
  window.localStorage.setItem(bookingQuoteStorageKey, serialized);
  writeSharedQuoteCollection(requests);
  window.dispatchEvent(new CustomEvent(sharedQuoteStorageUpdatedEvent, { detail: { count: requests.length } }));
  window.dispatchEvent(new StorageEvent('storage', { key: bookingQuoteStorageKey, newValue: serialized }));
}

export function readSharedCollectionCookieQuotes() {
  const raw = readCookie(sharedQuoteReviewCollectionCookieKey);
  if (!raw) return [] as SharedBookingRequest[];
  try {
    const parsed = JSON.parse(raw) as SharedBookingRequest[];
    return Array.isArray(parsed) ? parsed.filter((item): item is SharedBookingRequest => Boolean(item?.quoteId)) : [];
  } catch {
    return [] as SharedBookingRequest[];
  }
}

export function readSharedQuote(quoteId: string) {
  const parsed = readSharedCollectionCookieQuotes();
  return parsed.find((item) => item.quoteId === quoteId) ?? null;
}

export function upsertSharedQuote(quote: SharedBookingRequest) {
  if (!quote.quoteId) return;
  const existing = readSharedQuoteRequests();
  const next = [quote, ...existing.filter((item) => item.quoteId !== quote.quoteId)];
  writeSharedQuoteRequests(next);
}
