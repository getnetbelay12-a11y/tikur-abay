'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPatch, apiPost, hasPortalAuth, readPortalSession } from '../lib/api';
import {
  readSharedCollectionCookieQuotes,
  readSharedQuoteRequests,
  sharedQuoteStorageUpdatedEvent,
  type SharedBookingRequest,
  writeSharedQuoteRequests,
} from '../lib/shared-quote-storage';

type PortalQuoteStatus =
  | 'quote_requested'
  | 'quote_sent'
  | 'quote_accepted'
  | 'booking_created';

type PortalQuote = {
  id: string;
  quoteId: string;
  bookingId: string;
  source: 'customer' | 'supplier' | 'internal' | 'port_agent' | 'admin';
  customerName: string;
  route: string;
  serviceType: 'multimodal' | 'unimodal';
  containerType: string;
  commoditySummary: string;
  quoteAmount: string;
  status: PortalQuoteStatus;
  assignedOriginAgent: string;
  validityUntil?: string;
  breakdown?: {
    oceanBase: number;
    destinationRelease: number;
    inlandTrucking: number;
    clearance: number;
    total: number;
    currency: string;
  };
};

type BackendQuote = {
  _id?: string;
  quoteCode?: string;
  customerName?: string;
  route?: string;
  serviceType?: 'multimodal' | 'unimodal';
  serviceLevel?: string;
  shipmentMode?: string;
  bookingType?: string;
  containerType?: string;
  commoditySummary?: string;
  quotedAmount?: number;
  quoteAmount?: number;
  currency?: string;
  status?: string;
  assignedOriginAgentEmail?: string;
  validUntil?: string;
  requestedDate?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  inlandDestination?: string;
  deliveryAddress?: string;
  pricingBreakdown?: {
    baseFreight?: number;
    originCharges?: number;
    destinationCharges?: number;
    customsEstimate?: number;
    inlandTransportEstimate?: number;
    insuranceEstimate?: number;
    handlingFees?: number;
    discount?: number;
    total?: number;
    currency?: string;
  };
  acceptedAt?: string;
  bookingId?: string;
  convertedToShipmentId?: string;
};

const seededQuotes: PortalQuote[] = [
  {
    id: 'portal-quote-1',
    quoteId: 'QT-260325-001',
    bookingId: '',
    source: 'customer',
    customerName: 'Abyssinia Industrial Imports PLC',
    route: 'Shanghai -> Djibouti -> Modjo Dry Port -> Adama customer delivery',
    serviceType: 'multimodal',
    containerType: '40HC',
    commoditySummary: 'Factory machine spare parts',
    quoteAmount: 'USD 48,250',
    status: 'quote_sent',
    assignedOriginAgent: '',
    validityUntil: '2026-04-02',
  },
  {
    id: 'portal-quote-2',
    quoteId: 'QT-260325-003',
    bookingId: 'BK-260325-003',
    source: 'port_agent',
    customerName: 'East Gate Manufacturing PLC',
    route: 'Yantian -> Djibouti -> Modjo Dry Port -> Addis industrial zone',
    serviceType: 'multimodal',
    containerType: '40HC',
    commoditySummary: 'Industrial gearbox assemblies',
    quoteAmount: 'USD 39,100',
    status: 'booking_created',
    assignedOriginAgent: 'supplier.agent@tikurabay.com',
    validityUntil: '2026-04-01',
  },
];

function mapSharedRequestsToPortalQuotes(parsed: SharedBookingRequest[]) {
  return parsed.map((item, index) => ({
    id: `shared-${item.quoteId || index}`,
    quoteId: item.quoteId || `QT-SHARED-${index + 1}`,
    bookingId: item.bookingId || '',
    source: item.requestSource || 'customer',
    customerName: item.customerName || 'Customer',
    route: `${item.portOfLoading || 'Origin'} -> ${item.portOfDischarge || 'Djibouti'} -> ${item.inlandDestination || 'Dry Port'} -> ${item.finalDeliveryLocation || 'Customer delivery'}`,
    serviceType: item.serviceType || 'multimodal',
    containerType: item.containerType || 'Container pending',
    commoditySummary: item.commoditySummary || 'Cargo summary pending',
    quoteAmount: item.quoteAmount ? `${item.quoteCurrency || 'USD'} ${item.quoteAmount.toLocaleString('en-US')}` : 'Pending pricing',
    status: (['quote_requested', 'quote_sent', 'quote_accepted', 'booking_created'].includes(String(item.quoteStatus)) ? item.quoteStatus : item.bookingId ? 'booking_created' : 'quote_requested') as PortalQuoteStatus,
    assignedOriginAgent: item.assignedOriginAgentEmail || '',
    validityUntil: item.requestedArrivalWindow || '',
    breakdown: item.pricingBreakdown ? {
      oceanBase: item.pricingBreakdown.baseFreight,
      destinationRelease: item.pricingBreakdown.originCharges + item.pricingBreakdown.destinationCharges,
      inlandTrucking: item.pricingBreakdown.inlandTransportEstimate,
      clearance: item.pricingBreakdown.customsEstimate + item.pricingBreakdown.insuranceEstimate + item.pricingBreakdown.handlingFees - item.pricingBreakdown.discount,
      total: item.pricingBreakdown.total,
      currency: item.pricingBreakdown.currency,
    } : item.quoteAmount ? {
      oceanBase: Math.round(item.quoteAmount * 0.48),
      destinationRelease: Math.round(item.quoteAmount * 0.14),
      inlandTrucking: Math.round(item.quoteAmount * 0.24),
      clearance: Math.round(item.quoteAmount * 0.14),
      total: item.quoteAmount,
      currency: item.quoteCurrency || 'USD',
    } : undefined,
  }));
}

function mapBackendQuotesToPortalQuotes(parsed: BackendQuote[]) {
  return parsed.map((item, index) => {
    const total = Number(item.pricingBreakdown?.total || item.quotedAmount || item.quoteAmount || 0);
    const currency = String(item.pricingBreakdown?.currency || item.currency || 'USD');
    const normalizedStatus = String(item.status || '').toLowerCase();
    const status: PortalQuoteStatus =
      normalizedStatus === 'accepted' || normalizedStatus === 'approved'
        ? 'quote_accepted'
        : item.convertedToShipmentId || item.bookingId
          ? 'booking_created'
          : normalizedStatus === 'sent' || normalizedStatus === 'waiting_approval'
            ? 'quote_sent'
            : 'quote_requested';

    return {
      id: String(item._id || item.quoteCode || `backend-quote-${index + 1}`),
      quoteId: String(item.quoteCode || item._id || `QT-LIVE-${index + 1}`),
      bookingId: String(item.bookingId || ''),
      source: 'customer' as const,
      customerName: String(item.customerName || 'Customer'),
      route:
        String(item.route || '').trim() ||
        `${item.portOfLoading || 'Origin'} -> ${item.portOfDischarge || 'Djibouti'} -> ${item.inlandDestination || 'Dry Port'} -> ${item.deliveryAddress || 'Customer delivery'}`,
      serviceType: item.serviceType || 'multimodal',
      containerType: String(item.containerType || 'Container pending'),
      commoditySummary: String(item.commoditySummary || 'Cargo summary pending'),
      quoteAmount: total > 0 ? `${currency} ${total.toLocaleString('en-US')}` : 'Pending pricing',
      status,
      assignedOriginAgent: String(item.assignedOriginAgentEmail || ''),
      validityUntil: item.validUntil || item.requestedDate || '',
      breakdown: total > 0
        ? {
            oceanBase: Number(item.pricingBreakdown?.baseFreight || Math.round(total * 0.48)),
            destinationRelease: Number(
              item.pricingBreakdown
                ? (item.pricingBreakdown.originCharges || 0) + (item.pricingBreakdown.destinationCharges || 0)
                : Math.round(total * 0.14),
            ),
            inlandTrucking: Number(item.pricingBreakdown?.inlandTransportEstimate || Math.round(total * 0.24)),
            clearance: Number(
              item.pricingBreakdown
                ? (item.pricingBreakdown.customsEstimate || 0)
                  + (item.pricingBreakdown.insuranceEstimate || 0)
                  + (item.pricingBreakdown.handlingFees || 0)
                  - (item.pricingBreakdown.discount || 0)
                : Math.round(total * 0.14),
            ),
            total,
            currency,
          }
        : undefined,
    };
  });
}

function estimateQuoteBreakdown(input: {
  containerType: string;
  containerCount: number;
  portOfLoading: string;
  inlandDestination: string;
  serviceType: 'multimodal' | 'unimodal';
  shipmentMode?: 'Ocean Freight' | 'Air Freight' | 'Road' | 'Multimodal';
  bookingType?: 'FCL' | 'LCL' | 'RoRo' | 'Air Freight';
  totalWeight: number;
  cbm: number;
  hazardousFlag: boolean;
  reeferFlag: boolean;
  oogFlag: boolean;
}) {
  if (input.shipmentMode === 'Air Freight' || input.bookingType === 'Air Freight') {
    const chargeableWeight = Math.max(input.totalWeight, input.cbm * 167);
    const oceanBase = Math.round(chargeableWeight * 4.9 + 960);
    const destinationRelease = 620;
    const inlandTrucking = input.serviceType === 'multimodal' ? 1180 : 0;
    const clearance = 680 + (input.hazardousFlag ? 1200 : 0) + (input.reeferFlag ? 1500 : 0);
    return {
      oceanBase,
      destinationRelease,
      inlandTrucking,
      clearance,
      total: oceanBase + destinationRelease + inlandTrucking + clearance,
      currency: 'USD',
    };
  }

  if (input.bookingType === 'LCL') {
    const billableCbm = Math.max(input.cbm, input.totalWeight / 1000);
    const oceanBase = Math.round(billableCbm * 138 + 640);
    const destinationRelease = input.serviceType === 'multimodal' ? 920 : 640;
    const inlandTrucking = input.serviceType === 'multimodal' ? Math.round((input.inlandDestination.toLowerCase().includes('modjo') ? 980 : 1260) * Math.max(billableCbm / 6, 1)) : 0;
    const clearance = Math.round(720 + billableCbm * 26 + (input.hazardousFlag ? 1200 : 0));
    return {
      oceanBase,
      destinationRelease,
      inlandTrucking,
      clearance,
      total: oceanBase + destinationRelease + inlandTrucking + clearance,
      currency: 'USD',
    };
  }

  const oceanBasePerContainer =
    input.containerType === '20GP' ? 2400 :
    input.containerType === '40GP' ? 3600 :
    input.containerType === '40HC' ? 3900 :
    input.containerType === 'Reefer' ? 5400 :
    input.containerType === 'Flat Rack' ? 5900 :
    input.containerType === 'Open Top' ? 5100 :
    input.containerType === 'Tank' ? 6400 :
    3900;

  const routeFactor = input.portOfLoading.toLowerCase().includes('shanghai')
    ? 1
    : input.portOfLoading.toLowerCase().includes('yantian')
      ? 1.08
      : input.portOfLoading.toLowerCase().includes('ningbo')
        ? 0.96
        : 0.94;

  const inlandTruckingPerContainer = input.inlandDestination.toLowerCase().includes('modjo')
    ? 2800
    : input.inlandDestination.toLowerCase().includes('adama')
      ? 2550
      : input.inlandDestination.toLowerCase().includes('kombolcha')
        ? 3650
        : 3000;

  const oceanBase = Math.round(oceanBasePerContainer * input.containerCount * routeFactor);
  const destinationRelease = (input.serviceType === 'multimodal' ? 1850 : 1250) * input.containerCount;
  const inlandTrucking = input.serviceType === 'multimodal' ? inlandTruckingPerContainer * input.containerCount : 0;
  const clearance = Math.round(
    (input.serviceType === 'multimodal' ? 1450 : 780) * input.containerCount +
    Math.max(input.totalWeight - (input.containerCount * 18000), 0) * 0.06 +
    Math.max(input.cbm - (input.containerCount * 26), 0) * 18 +
    (input.hazardousFlag ? 1200 : 0) +
    (input.reeferFlag ? 1800 : 0) +
    (input.oogFlag ? 2200 : 0),
  );
  const total = oceanBase + destinationRelease + inlandTrucking + clearance;

  return {
    oceanBase,
    destinationRelease,
    inlandTrucking,
    clearance,
    total,
    currency: 'USD',
  };
}

function statusTone(status: PortalQuoteStatus) {
  if (status === 'booking_created' || status === 'quote_accepted') return 'success';
  if (status === 'quote_sent') return 'info';
  return 'warning';
}

export function BookingQuoteCenter() {
  const [quotes, setQuotes] = useState<PortalQuote[]>(seededQuotes);
  const [hydrating, setHydrating] = useState(true);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [customerName, setCustomerName] = useState('Alem Logistics PLC');
  const [consigneeName, setConsigneeName] = useState('Alem Logistics PLC');
  const [contactPerson, setContactPerson] = useState('Lidya Getachew');
  const [phone, setPhone] = useState('+251 911 220 190');
  const [email, setEmail] = useState('lidya@alemlogistics.com');
  const [incoterm, setIncoterm] = useState('CFR');
  const [serviceType, setServiceType] = useState<'multimodal' | 'unimodal'>('multimodal');
  const [origin, setOrigin] = useState('Shanghai');
  const [pol, setPol] = useState('Shanghai');
  const [pod, setPod] = useState('Djibouti');
  const [inlandDestination, setInlandDestination] = useState('Modjo Dry Port');
  const [finalDelivery, setFinalDelivery] = useState('Adama customer delivery');
  const [commoditySummary, setCommoditySummary] = useState('Factory machine spare parts');
  const [cargoDescription, setCargoDescription] = useState('Crated machinery spares and accessories.');
  const [containerType, setContainerType] = useState('40HC');
  const [containerCount, setContainerCount] = useState('1');
  const [requestSource, setRequestSource] = useState<'customer' | 'supplier' | 'internal' | 'port_agent' | 'admin'>('customer');
  const [company, setCompany] = useState('Alem Logistics PLC');
  const [originCountry, setOriginCountry] = useState('China');
  const [weight, setWeight] = useState('18800');
  const [cbm, setCbm] = useState('24.5');
  const [hazardous, setHazardous] = useState(false);
  const [reefer, setReefer] = useState(false);
  const [oog, setOog] = useState(false);
  const [requestedLoadingDate, setRequestedLoadingDate] = useState('2026-04-04');
  const [earliestDepartureDate, setEarliestDepartureDate] = useState('2026-04-06');
  const [requestedArrivalWindow, setRequestedArrivalWindow] = useState('2026-04-18 to 2026-04-23');
  const [priceOwner, setPriceOwner] = useState('Consignee');
  const [specialHandlingNote, setSpecialHandlingNote] = useState('');
  const [remarks, setRemarks] = useState('Handle via standard multimodal corridor to Modjo.');
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hydrate = async () => {
      const session = readPortalSession();
      const storageRequests = readSharedQuoteRequests();
      const collectionCookieRequests = readSharedCollectionCookieQuotes();
      let liveQuotes: PortalQuote[] = [];
      const hasLocalSeededQuotes = storageRequests.length > 0 || collectionCookieRequests.length > 0;
      if (hasPortalAuth() && !hasLocalSeededQuotes) {
        try {
          const backendQuotes = await apiGet<BackendQuote[]>('/quotes/my');
          liveQuotes = mapBackendQuotesToPortalQuotes(backendQuotes);
        } catch {
          liveQuotes = [];
        }
      }
      const mergedRequests = [
        ...collectionCookieRequests,
        ...storageRequests.filter(
          (item) =>
            !collectionCookieRequests.some((cookieItem) => cookieItem.quoteId === item.quoteId),
        ),
      ];
      const scopedRequests = (() => {
        const sessionEmail = String(session?.email || '').trim().toLowerCase();
        const sessionCompany = String(session?.companyName || '').trim().toLowerCase();
        if (!sessionEmail && !sessionCompany) return mergedRequests;
        const matched = mergedRequests.filter((item) => {
          const itemEmail = String(item.email || '').trim().toLowerCase();
          const itemPortalEmail = String(item.localPortalRecipientEmail || '').trim().toLowerCase();
          const itemCustomer = String(item.customerName || item.company || '').trim().toLowerCase();
          return Boolean(
            (sessionEmail && itemEmail === sessionEmail) ||
            (sessionEmail && itemPortalEmail === sessionEmail) ||
            (sessionCompany && itemCustomer === sessionCompany),
          );
        });
        return matched.length > 0 ? matched : mergedRequests;
      })();
      const externalQuotes = mapSharedRequestsToPortalQuotes(scopedRequests);
      const merged = [
        ...liveQuotes,
        ...externalQuotes.filter((item) => !liveQuotes.some((live) => live.quoteId === item.quoteId)),
        ...seededQuotes.filter(
          (seed) => !liveQuotes.some((item) => item.quoteId === seed.quoteId)
            && !externalQuotes.some((item) => item.quoteId === seed.quoteId),
        ),
      ];
      setQuotes(merged);
      setHydrating(false);
    };

    void hydrate();
    const interval = window.setInterval(() => {
      void hydrate();
    }, 1500);
    window.addEventListener('storage', hydrate);
    window.addEventListener(sharedQuoteStorageUpdatedEvent, hydrate as EventListener);
    window.addEventListener('focus', hydrate);
    document.addEventListener('visibilitychange', hydrate);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('storage', hydrate);
      window.removeEventListener(sharedQuoteStorageUpdatedEvent, hydrate as EventListener);
      window.removeEventListener('focus', hydrate);
      document.removeEventListener('visibilitychange', hydrate);
    };
  }, []);

  const cards = useMemo(() => ([
    { label: 'Quote requested', value: quotes.filter((item) => item.status === 'quote_requested').length, helper: 'Requests awaiting pricing review.' },
    { label: 'Quote sent', value: quotes.filter((item) => item.status === 'quote_sent').length, helper: 'Customer can accept or request revision.' },
    { label: 'Booking created', value: quotes.filter((item) => item.status === 'booking_created').length, helper: 'Accepted quotes already converted.' },
    { label: 'Origin assigned', value: quotes.filter((item) => item.assignedOriginAgent).length, helper: 'Accepted files routed to China port agent.' },
  ]), [quotes]);

  const quotePreview = useMemo(() => estimateQuoteBreakdown({
    containerType,
    containerCount: Number(containerCount) || 0,
    portOfLoading: pol,
    inlandDestination,
    serviceType,
    shipmentMode: serviceType === 'unimodal' ? 'Ocean Freight' : 'Multimodal',
    bookingType: 'FCL',
    totalWeight: Number(weight) || 0,
    cbm: Number(cbm) || 0,
    hazardousFlag: hazardous,
    reeferFlag: reefer || containerType === 'Reefer',
    oogFlag: oog || containerType === 'Flat Rack',
  }), [cbm, containerCount, containerType, hazardous, inlandDestination, oog, pol, reefer, serviceType, weight]);

  function persistSharedRequest(nextRequest: SharedBookingRequest) {
    const parsed = readSharedQuoteRequests();
    const merged = [nextRequest, ...parsed.filter((item) => item.quoteId !== nextRequest.quoteId)];
    writeSharedQuoteRequests(merged);
  }

  async function submitQuote(mode: 'quote' | 'book') {
    const nextErrors = [customerName, consigneeName, contactPerson, phone, email, origin, pol, pod, inlandDestination, finalDelivery, commoditySummary, cargoDescription]
      .map((value, index) => ({ value, index }))
      .filter((item) => !item.value.trim())
      .map(() => 'Complete all required commercial, route, and cargo fields.');

    if (!containerCount || Number(containerCount) < 1) {
      nextErrors.push('Container count must be at least 1.');
    }
    if (!weight || Number(weight) <= 0) {
      nextErrors.push('Estimated total weight must be greater than 0.');
    }
    if (!cbm || Number(cbm) <= 0) {
      nextErrors.push('Estimated CBM must be greater than 0.');
    }

    setErrors(nextErrors);
    if (nextErrors.length) return;

    try {
      const createdQuote = await apiPost<BackendQuote>('/quotes/request', {
        customerName,
        consigneeName,
        contactPerson,
        phone,
        email,
        company,
        incoterm,
        requestSource,
        serviceType,
        shipmentMode: serviceType === 'unimodal' ? 'Ocean Freight' : 'Multimodal',
        bookingType: 'FCL',
        serviceLevel: serviceType === 'multimodal' ? 'Door to Door' : 'Port to Port',
        originCountry,
        originCity: origin,
        originPort: pol,
        portOfLoading: pol,
        portOfDischarge: pod,
        inlandDestination,
        deliveryAddress: finalDelivery,
        commoditySummary,
        cargoDescription,
        hazardousFlag: hazardous,
        reeferFlag: reefer,
        oogFlag: oog,
        specialHandlingNote,
        containerType,
        containerQuantity: Number(containerCount),
        containerCount: Number(containerCount),
        grossWeight: Number(weight),
        totalWeight: Number(weight),
        volumeCbm: Number(cbm),
        requestedDate: requestedLoadingDate,
        earliestDepartureDate,
        requestedArrivalWindow,
        quoteAmount: quotePreview.total,
        currency: quotePreview.currency,
        pricingBreakdown: {
          baseFreight: quotePreview.oceanBase,
          originCharges: quotePreview.destinationRelease,
          destinationCharges: 0,
          customsEstimate: quotePreview.clearance,
          inlandTransportEstimate: quotePreview.inlandTrucking,
          insuranceEstimate: 0,
          handlingFees: 0,
          discount: 0,
          total: quotePreview.total,
          currency: quotePreview.currency,
        },
        remarks,
        priceOwner,
      });

      let liveQuote = createdQuote;
      if (mode === 'book') {
        liveQuote = await apiPatch<BackendQuote>(`/quotes/${encodeURIComponent(createdQuote.quoteCode || createdQuote._id || '')}/status`, {
          status: 'accepted',
          approvalMethod: 'Customer approved at intake',
        });
        const bookingResult = await apiPost<{ bookingId?: string; bookingCode?: string; shipmentRef?: string }>('/bookings', {
          quoteId: liveQuote.quoteCode || liveQuote._id,
        });
        liveQuote = {
          ...liveQuote,
          bookingId: bookingResult.bookingCode || bookingResult.bookingId,
          convertedToShipmentId: bookingResult.shipmentRef,
          assignedOriginAgentEmail: 'supplier.agent@tikurabay.com',
          status: 'accepted',
        };
      }

      const nextQuote = mapBackendQuotesToPortalQuotes([liveQuote])[0];
      setQuotes((current) => [nextQuote, ...current.filter((item) => item.quoteId !== nextQuote.quoteId)]);
      persistSharedRequest({
        quoteId: nextQuote.quoteId,
        bookingId: nextQuote.bookingId,
        requestSource,
        customerName,
        consigneeName,
        contactPerson,
        phone,
        email,
        company,
        incoterm,
        serviceType,
        originCountry,
        originCityOrPort: origin,
        portOfLoading: pol,
        portOfDischarge: pod,
        inlandDestination,
        finalDeliveryLocation: finalDelivery,
        commoditySummary,
        cargoDescription,
        hazardousFlag: hazardous,
        temperatureControl: reefer,
        outOfGaugeFlag: oog,
        specialHandlingRequired: Boolean(specialHandlingNote.trim()),
        specialHandlingNote,
        containerType,
        containerCount: Number(containerCount),
        weightPerContainer: Math.round((Number(weight) || 0) / Math.max(Number(containerCount) || 1, 1)),
        totalWeight: Number(weight),
        cbm: Number(cbm),
        requestedLoadingDate,
        earliestDepartureDate,
        requestedArrivalWindow,
        priceOwner,
        remarks,
        quoteAmount: quotePreview.total,
        quoteCurrency: quotePreview.currency,
        quoteStatus: mode === 'book' ? 'assigned_to_origin' : 'quote_sent',
        bookingStatus: mode === 'book' ? 'assigned_to_origin' : 'draft',
        assignedOriginAgentEmail: mode === 'book' ? 'supplier.agent@tikurabay.com' : '',
      });
      setErrors([]);
      setNotice({
        tone: 'success',
        text: mode === 'book'
          ? 'Booking was created from the accepted quote and routed to origin.'
          : 'Quote request was saved and is now available from the live customer queue.',
      });
    } catch (error) {
      setNotice({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Quote request failed.',
      });
    }
  }

  async function acceptQuote(id: string) {
    const target = quotes.find((item) => item.id === id);
    if (!target) return;
    try {
      await apiPatch(`/quotes/${encodeURIComponent(target.quoteId)}/status`, {
        status: 'accepted',
        approvalMethod: 'Customer accepted from queue',
      });
      const bookingResult = await apiPost<{ bookingId?: string; bookingCode?: string; shipmentRef?: string }>('/bookings', {
        quoteId: target.quoteId,
      });
      setQuotes((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                status: 'booking_created',
                bookingId: bookingResult.bookingCode || bookingResult.bookingId || item.bookingId,
                assignedOriginAgent: 'supplier.agent@tikurabay.com',
              }
            : item,
        ),
      );
      setNotice({
        tone: 'success',
        text: `Quote ${target.quoteId} was accepted and pushed into booking/origin flow.`,
      });
    } catch (error) {
      setNotice({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Quote acceptance failed.',
      });
    }
  }

  return (
    <section className="portal-grid">
      {notice ? <div className={`portal-quote-notice ${notice.tone === 'error' ? 'info' : notice.tone}`}>{notice.text}</div> : null}

      <div className="portal-grid two">
        {cards.map((card) => (
          <article key={card.label} className="portal-card">
            <div className="portal-section-header">
              <div>
                <div className="portal-section-eyebrow">Queue</div>
                <h2>{card.label}</h2>
              </div>
            </div>
            <strong style={{ fontSize: 28 }}>{card.value}</strong>
            <p>{card.helper}</p>
          </article>
        ))}
      </div>

      <div className="portal-grid two">
        <article className="portal-card">
          <div className="portal-section-header">
            <div>
              <div className="portal-section-eyebrow">Unified intake</div>
              <h2>Get quote and book shipment</h2>
            </div>
            <div className="portal-actions">
              <Link href="/bookings" className="portal-btn secondary">New Quote</Link>
              <Link href="#portal-quote-queue" className="portal-btn">View Quote Queue</Link>
            </div>
          </div>
          <div className="portal-data-grid two-col">
            <label className="portal-data-item"><span>Request source</span><select className="portal-select" value={requestSource} onChange={(event) => setRequestSource(event.target.value as 'customer' | 'supplier' | 'internal' | 'port_agent' | 'admin')}><option value="customer">Customer</option><option value="supplier">Supplier</option><option value="internal">Internal operator</option><option value="port_agent">Port agent</option><option value="admin">Admin</option></select></label>
            <label className="portal-data-item"><span>Customer name</span><input className="portal-input" value={customerName} onChange={(event) => setCustomerName(event.target.value)} /></label>
            <label className="portal-data-item"><span>Consignee name</span><input className="portal-input" value={consigneeName} onChange={(event) => setConsigneeName(event.target.value)} /></label>
            <label className="portal-data-item"><span>Contact person</span><input className="portal-input" value={contactPerson} onChange={(event) => setContactPerson(event.target.value)} /></label>
            <label className="portal-data-item"><span>Phone</span><input className="portal-input" value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
            <label className="portal-data-item"><span>Email</span><input className="portal-input" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label className="portal-data-item"><span>Company</span><input className="portal-input" value={company} onChange={(event) => setCompany(event.target.value)} /></label>
            <label className="portal-data-item"><span>Incoterm</span><input className="portal-input" value={incoterm} onChange={(event) => setIncoterm(event.target.value)} /></label>
            <label className="portal-data-item"><span>Service type</span><select className="portal-select" value={serviceType} onChange={(event) => setServiceType(event.target.value as 'multimodal' | 'unimodal')}><option value="multimodal">Multimodal</option><option value="unimodal">Unimodal</option></select></label>
            <label className="portal-data-item"><span>Origin country</span><input className="portal-input" value={originCountry} onChange={(event) => setOriginCountry(event.target.value)} /></label>
            <label className="portal-data-item"><span>Origin city / port</span><input className="portal-input" value={origin} onChange={(event) => setOrigin(event.target.value)} /></label>
            <label className="portal-data-item"><span>Port of loading</span><input className="portal-input" value={pol} onChange={(event) => setPol(event.target.value)} /></label>
            <label className="portal-data-item"><span>Port of discharge</span><input className="portal-input" value={pod} onChange={(event) => setPod(event.target.value)} /></label>
            <label className="portal-data-item"><span>Inland destination</span><input className="portal-input" value={inlandDestination} onChange={(event) => setInlandDestination(event.target.value)} /></label>
            <label className="portal-data-item"><span>Final delivery location</span><input className="portal-input" value={finalDelivery} onChange={(event) => setFinalDelivery(event.target.value)} /></label>
            <label className="portal-data-item"><span>Commodity summary</span><input className="portal-input" value={commoditySummary} onChange={(event) => setCommoditySummary(event.target.value)} /></label>
            <label className="portal-data-item"><span>Container type</span><input className="portal-input" value={containerType} onChange={(event) => setContainerType(event.target.value)} /></label>
            <label className="portal-data-item"><span>Container count</span><input className="portal-input" value={containerCount} onChange={(event) => setContainerCount(event.target.value)} /></label>
            <label className="portal-data-item"><span>Estimated total weight</span><input className="portal-input" value={weight} onChange={(event) => setWeight(event.target.value)} /></label>
            <label className="portal-data-item"><span>Estimated CBM</span><input className="portal-input" value={cbm} onChange={(event) => setCbm(event.target.value)} /></label>
            <label className="portal-data-item"><span>Requested loading date</span><input className="portal-input" type="date" value={requestedLoadingDate} onChange={(event) => setRequestedLoadingDate(event.target.value)} /></label>
            <label className="portal-data-item"><span>Departure window</span><input className="portal-input" type="date" value={earliestDepartureDate} onChange={(event) => setEarliestDepartureDate(event.target.value)} /></label>
            <label className="portal-data-item"><span>Arrival window</span><input className="portal-input" value={requestedArrivalWindow} onChange={(event) => setRequestedArrivalWindow(event.target.value)} /></label>
            <label className="portal-data-item"><span>Price owner / payer</span><input className="portal-input" value={priceOwner} onChange={(event) => setPriceOwner(event.target.value)} /></label>
          </div>
          <div style={{ marginTop: 14 }}>
            <label className="portal-data-item"><span>Detailed cargo description</span><textarea className="portal-input" value={cargoDescription} onChange={(event) => setCargoDescription(event.target.value)} /></label>
          </div>
          <div style={{ marginTop: 14 }}>
            <label className="portal-data-item"><span>Special handling note</span><textarea className="portal-input" value={specialHandlingNote} onChange={(event) => setSpecialHandlingNote(event.target.value)} /></label>
          </div>
          <div style={{ marginTop: 14 }}>
            <label className="portal-data-item"><span>Remarks</span><textarea className="portal-input" value={remarks} onChange={(event) => setRemarks(event.target.value)} /></label>
          </div>
          <div className="portal-actions" style={{ marginTop: 14 }}>
            <button type="button" className="portal-btn secondary" onClick={() => setHazardous((current) => !current)}>{hazardous ? 'Hazardous: Yes' : 'Hazardous: No'}</button>
            <button type="button" className="portal-btn secondary" onClick={() => setReefer((current) => !current)}>{reefer ? 'Reefer: Yes' : 'Reefer: No'}</button>
            <button type="button" className="portal-btn secondary" onClick={() => setOog((current) => !current)}>{oog ? 'OOG: Yes' : 'OOG: No'}</button>
          </div>
          <div className="portal-grid two" style={{ marginTop: 16 }}>
            <article className="portal-card">
              <div className="portal-section-header">
                <div>
                  <div className="portal-section-eyebrow">Quote result</div>
                  <h2>Indicative price</h2>
                </div>
              </div>
              <div className="portal-list">
                <div className="portal-list-row"><div><strong>Ocean / base charge</strong></div><div>{quotePreview.currency} {quotePreview.oceanBase.toLocaleString('en-US')}</div></div>
                <div className="portal-list-row"><div><strong>Destination / release charge</strong></div><div>{quotePreview.currency} {quotePreview.destinationRelease.toLocaleString('en-US')}</div></div>
                <div className="portal-list-row"><div><strong>Inland trucking charge</strong></div><div>{quotePreview.currency} {quotePreview.inlandTrucking.toLocaleString('en-US')}</div></div>
                <div className="portal-list-row"><div><strong>Clearance / transitor charge</strong></div><div>{quotePreview.currency} {quotePreview.clearance.toLocaleString('en-US')}</div></div>
                <div className="portal-list-row"><div><strong>Total quoted amount</strong><p>Valid until {earliestDepartureDate || 'departure confirmation'}</p></div><div><strong>{quotePreview.currency} {quotePreview.total.toLocaleString('en-US')}</strong></div></div>
              </div>
            </article>
            <article className="portal-card">
              <div className="portal-section-header">
                <div>
                  <div className="portal-section-eyebrow">Next step</div>
                  <h2>Booking conversion</h2>
                </div>
              </div>
              <p>If the quote is accepted, the system creates the booking, creates the shipment, and routes it automatically to <strong>supplier.agent@tikurabay.com</strong> for China origin preparation.</p>
              <div className="portal-actions" style={{ marginTop: 16 }}>
                <button type="button" className="portal-btn secondary" onClick={() => submitQuote('quote')}>Get Quote</button>
                <button type="button" className="portal-btn" onClick={() => submitQuote('book')}>Book Shipment</button>
              </div>
            </article>
          </div>
          {errors.length ? (
            <div className="portal-list" style={{ marginTop: 12 }}>
              {errors.map((error) => (
                <div key={error} className="portal-list-row">
                  <div>
                    <strong>Validation</strong>
                    <p>{error}</p>
                  </div>
                  <span className="portal-status-chip warning">Fix</span>
                </div>
              ))}
            </div>
          ) : null}
        </article>

        <article className="portal-card">
          <div className="portal-section-header">
            <div>
              <div className="portal-section-eyebrow">Customer actions</div>
              <h2>Review quote and booking visibility</h2>
            </div>
          </div>
          <div id="portal-quote-queue" className="portal-list">
            {hydrating ? <div className="portal-list-row"><div><strong>Refreshing live quote state</strong><p>Checking the latest backend quote and booking status.</p></div></div> : null}
            {quotes.map((quote) => (
              <div key={quote.id} className="portal-list-row">
                <div>
                  <strong>{quote.quoteId} {quote.bookingId ? `· ${quote.bookingId}` : ''}</strong>
                  <p>{quote.customerName} · {quote.route}</p>
                  <p>{quote.containerType} · {quote.serviceType} · {quote.commoditySummary}</p>
                  <p>{quote.quoteAmount}{quote.assignedOriginAgent ? ` · Routed to ${quote.assignedOriginAgent}` : ''}</p>
                  {quote.breakdown ? <p>Ocean {quote.breakdown.currency} {quote.breakdown.oceanBase.toLocaleString('en-US')} · Inland {quote.breakdown.currency} {quote.breakdown.inlandTrucking.toLocaleString('en-US')} · Clearance {quote.breakdown.currency} {quote.breakdown.clearance.toLocaleString('en-US')}</p> : null}
                </div>
                <div className="portal-actions">
                  <span className={`portal-status-chip ${statusTone(quote.status)}`}>{quote.status.replace(/_/g, ' ')}</span>
                  <Link href={`/quotes/${encodeURIComponent(quote.quoteId)}/review?format=pdf`} className="portal-btn secondary">Review quote</Link>
                  {quote.status === 'quote_sent' ? (
                    <button type="button" className="portal-btn secondary" onClick={() => acceptQuote(quote.id)}>Accept quote</button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
