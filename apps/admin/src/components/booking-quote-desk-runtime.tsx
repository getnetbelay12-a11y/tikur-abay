'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { memo, useEffect, useMemo, useState } from 'react';
import type { SupplierDeskShipment } from '../lib/supplier-agent-demo-data';
import { syncBookingToBackendWorkflow } from '../lib/backend-booking-sync';
import {
  intakeSourceLabels,
  lifecycleStages,
  originAgentEmail,
  seededBookingRequests,
  type BookingRequestSource,
  type ContainerType,
  type QuoteWorkflowStatus,
  type UnifiedBookingRequest,
} from '../lib/booking-quote-demo-data';
import { readShippingPhase1Workspace, shippingDeskLink, shippingNextActionLabel, shippingPhase1UpdatedEvent, shippingStageLabel } from '../lib/shipping-phase1';
import {
  hydrateSharedQuoteRequestsFromServer,
  readSharedQuoteRequests,
  sharedQuoteStorageUpdatedEvent,
  writeSharedQuoteRequests,
} from '../lib/shared-quote-storage';
import { writeWorkflowState } from '../lib/workflow-state-client';

const supplierDeskStorageKey = 'tikur-abay:supplier-desk:manual-shipments';

const containerOptions: ContainerType[] = ['20GP', '40GP', '40HC', 'Reefer / Fridge', 'Flat Rack', 'Open Top', 'Tank', 'OOG / special cargo support note'];
const incoterms = ['EXW', 'FOB', 'CFR', 'CIF', 'DAP', 'DDP'];
const serviceTypes = ['multimodal', 'unimodal'] as const;
const priceOwners = ['Consignee', 'Supplier', 'Shipper', 'Internal settlement'];
const intakeStages = ['Shipment Details', 'Quote Review', 'Customer Approval', 'Booking Confirmation', 'Handoff'] as const;

type QuoteFormState = Omit<
  UnifiedBookingRequest,
  'id' | 'quoteId' | 'bookingId' | 'convertedToShipmentId' | 'quoteStatus' | 'bookingStatus' | 'quoteAmount' | 'quoteCurrency' | 'acceptedAt' | 'assignedOriginAgentId' | 'assignedOriginAgentEmail' | 'createdAt' | 'updatedAt' | 'requestedBy' | 'assignedDesk' | 'quoteHistory'
>;

function nextStepClass(isActive: boolean) {
  return isActive ? 'supplier-next-step-button' : '';
}

function readStoredRequests() {
  return readSharedQuoteRequests([]);
}

function compareRequestOrder(left: UnifiedBookingRequest, right: UnifiedBookingRequest) {
  const leftCreated = new Date(left.createdAt || '').getTime() || 0;
  const rightCreated = new Date(right.createdAt || '').getTime() || 0;
  if (leftCreated !== rightCreated) return rightCreated - leftCreated;
  const leftBooking = String(left.bookingId || left.quoteId || '').replace(/\D/g, '');
  const rightBooking = String(right.bookingId || right.quoteId || '').replace(/\D/g, '');
  if (leftBooking.length !== rightBooking.length) return rightBooking.length - leftBooking.length;
  return rightBooking.localeCompare(leftBooking);
}

function writeStoredRequests(requests: UnifiedBookingRequest[]) {
  writeSharedQuoteRequests(requests);
}

function readStoredSupplierShipments(): SupplierDeskShipment[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(supplierDeskStorageKey);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SupplierDeskShipment[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredSupplierShipments(shipments: SupplierDeskShipment[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(supplierDeskStorageKey, JSON.stringify(shipments));
  void writeWorkflowState('supplier-shipments', shipments).catch(() => {});
}

function defaultForm(source: BookingRequestSource = 'customer'): QuoteFormState {
  return {
    requestSource: source,
    customerName: '',
    consigneeName: '',
    contactPerson: '',
    phone: '',
    email: '',
    company: '',
    incoterm: 'CFR',
    serviceType: 'multimodal',
    originCountry: 'China',
    originCityOrPort: '',
    portOfLoading: '',
    portOfDischarge: 'Djibouti',
    inlandDestination: '',
    finalDeliveryLocation: '',
    commoditySummary: '',
    cargoDescription: '',
    hsCode: '',
    hazardousFlag: false,
    temperatureControl: false,
    outOfGaugeFlag: false,
    specialHandlingRequired: false,
    specialHandlingNote: '',
    containerType: '40HC',
    containerCount: 1,
    weightPerContainer: 0,
    totalWeight: 0,
    cbm: 0,
    requestedLoadingDate: '',
    earliestDepartureDate: '',
    requestedArrivalWindow: '',
    priceOwner: 'Consignee',
    remarks: '',
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
  };
}

function statusTone(status: QuoteWorkflowStatus) {
  if (status === 'assigned_to_origin' || status === 'booking_created' || status === 'quote_accepted') return 'good';
  if (status === 'quote_rejected') return 'critical';
  if (status === 'quote_revision_requested' || status === 'quote_under_review') return 'warning';
  return 'info';
}

function estimateQuoteAmount(form: QuoteFormState) {
  const containerBase =
    form.containerType === '20GP' ? 2350 :
    form.containerType === '40GP' ? 3650 :
    form.containerType === '40HC' ? 3950 :
    form.containerType === 'Reefer / Fridge' ? 5650 :
    form.containerType === 'Flat Rack' ? 6100 :
    form.containerType === 'Open Top' ? 5200 :
    form.containerType === 'Tank' ? 6900 :
    7400;

  const routeBase = form.portOfLoading.toLowerCase().includes('shanghai')
    ? 9200
    : form.portOfLoading.toLowerCase().includes('ningbo')
      ? 8900
      : form.portOfLoading.toLowerCase().includes('yantian')
        ? 9700
        : 8800;

  const inlandBase = form.inlandDestination.toLowerCase().includes('combolcha')
    ? 3600
    : form.inlandDestination.toLowerCase().includes('modjo')
      ? 2800
      : form.inlandDestination.toLowerCase().includes('adama')
        ? 2500
        : 3000;

  const serviceBase = form.serviceType === 'multimodal' ? 4200 : 1800;
  const weightSurcharge = Math.max(form.totalWeight - (form.containerCount * 18000), 0) * 0.08;
  const cbmSurcharge = Math.max(form.cbm - (form.containerCount * 26), 0) * 32;
  const hazardousSurcharge = form.hazardousFlag ? 1850 : 0;
  const reeferSurcharge = (form.temperatureControl || form.containerType === 'Reefer / Fridge') ? 2100 : 0;
  const oogSurcharge = (form.outOfGaugeFlag || form.containerType === 'Flat Rack' || form.containerType === 'OOG / special cargo support note') ? 2600 : 0;
  const handlingSurcharge = form.specialHandlingRequired ? 650 : 0;

  return Math.round(
    (routeBase + inlandBase + serviceBase + containerBase) * Math.max(form.containerCount, 1) +
    weightSurcharge +
    cbmSurcharge +
    hazardousSurcharge +
    reeferSurcharge +
    oogSurcharge +
    handlingSurcharge,
  );
}

function validateForm(form: QuoteFormState) {
  const errors: string[] = [];
  const required = [
    ['customer name', form.customerName],
    ['consignee name', form.consigneeName],
    ['contact person', form.contactPerson],
    ['phone', form.phone],
    ['email', form.email],
    ['company', form.company],
    ['origin city / port', form.originCityOrPort],
    ['port of loading', form.portOfLoading],
    ['port of discharge', form.portOfDischarge],
    ['inland destination', form.inlandDestination],
    ['final delivery location', form.finalDeliveryLocation],
    ['commodity summary', form.commoditySummary],
    ['cargo description', form.cargoDescription],
    ['requested loading date', form.requestedLoadingDate],
    ['earliest departure date', form.earliestDepartureDate],
    ['requested arrival window', form.requestedArrivalWindow],
  ] as const;

  required.forEach(([label, value]) => {
    if (!String(value).trim()) {
      errors.push(`Missing ${label}.`);
    }
  });

  if (form.containerCount < 1) errors.push('Container count must be at least 1.');
  if (form.totalWeight <= 0) errors.push('Total weight must be greater than 0.');
  if (form.weightPerContainer <= 0) errors.push('Estimated weight per container must be greater than 0.');
  if (form.cbm <= 0) errors.push('Total volume / CBM must be greater than 0.');

  if (form.hazardousFlag && !form.specialHandlingNote.trim()) {
    errors.push('Hazardous cargo requires a special handling note.');
  }
  if ((form.containerType === 'Reefer / Fridge' || form.temperatureControl) && !form.reeferSettings.requiredTemperature.trim()) {
    errors.push('Reefer bookings require required temperature.');
  }
  if ((form.containerType === 'Reefer / Fridge' || form.temperatureControl) && !form.reeferSettings.ventilation.trim()) {
    errors.push('Reefer bookings require ventilation details.');
  }
  if ((form.containerType === 'Flat Rack' || form.containerType === 'OOG / special cargo support note' || form.outOfGaugeFlag) && !form.oogSettings.cargoDimensions.trim()) {
    errors.push('Out-of-gauge cargo requires cargo dimensions.');
  }
  if ((form.containerType === 'Flat Rack' || form.containerType === 'OOG / special cargo support note' || form.outOfGaugeFlag) && !form.oogSettings.lashingNote.trim()) {
    errors.push('Out-of-gauge cargo requires lashing or special equipment note.');
  }

  return errors;
}

function toOriginShipment(request: UnifiedBookingRequest): SupplierDeskShipment {
  return {
    id: `manual-origin-${request.id}`,
    bookingNumber: request.bookingId,
    customerName: request.customerName,
    supplierName: `${request.originCityOrPort} export partner`,
    supplierCode: request.requestSource.toUpperCase(),
    serviceType: request.serviceType,
    originPort: request.portOfLoading,
    dischargePort: request.portOfDischarge,
    finalDestination: request.inlandDestination,
    incoterm: request.incoterm,
    currentStage: 'Booking created',
    assignedAgent: originAgentEmail,
    lastUpdated: request.updatedAt,
    etd: request.earliestDepartureDate || '-',
    etaDjibouti: request.requestedArrivalWindow || '-',
    exceptionLabel: request.specialHandlingRequired || request.hazardousFlag || request.outOfGaugeFlag ? 'Special handling' : null,
    cargoItems: [
      {
        id: `${request.id}-line-01`,
        lineNo: '01',
        description: request.cargoDescription,
        hsCode: request.hsCode || 'Pending',
        packageType: request.containerType,
        packageQuantity: request.containerCount,
        netWeightKg: Math.max(request.totalWeight - 180, 0),
        grossWeightKg: request.totalWeight,
        cbm: request.cbm,
        marksNumbers: request.commoditySummary,
        invoiceRef: `INV-${request.bookingId}`,
        packingListRef: `PL-${request.bookingId}`,
        status: 'Needs review',
      },
    ],
    documents: [
      { id: `${request.id}-doc-1`, type: 'Commercial invoice', referenceNumber: `INV-${request.bookingId}`, uploadedDate: '-', status: 'missing', uploadedBy: 'Pending origin upload' },
      { id: `${request.id}-doc-2`, type: 'Packing list', referenceNumber: `PL-${request.bookingId}`, uploadedDate: '-', status: 'missing', uploadedBy: 'Pending origin upload' },
      { id: `${request.id}-doc-3`, type: 'BL draft', referenceNumber: '-', uploadedDate: '-', status: 'missing', uploadedBy: 'Pending origin upload' },
      { id: `${request.id}-doc-4`, type: 'Final BL', referenceNumber: '-', uploadedDate: '-', status: 'missing', uploadedBy: 'Pending origin upload' },
      { id: `${request.id}-doc-5`, type: 'Export permit / customs doc', referenceNumber: '-', uploadedDate: '-', status: 'missing', uploadedBy: 'Pending origin upload' },
      { id: `${request.id}-doc-6`, type: 'Stuffing photos', referenceNumber: '-', uploadedDate: '-', status: 'missing', uploadedBy: 'Pending origin upload' },
      { id: `${request.id}-doc-7`, type: 'Seal photo', referenceNumber: '-', uploadedDate: '-', status: 'missing', uploadedBy: 'Pending origin upload' },
    ],
    container: {
      containerNumber: '',
      containerType: request.containerType,
      sealNumber: '',
      stuffingDateTime: request.requestedLoadingDate,
      stuffingLocation: request.originCityOrPort,
      loadedBy: '',
      containerCondition: 'Awaiting origin inspection',
      stuffingPhotoProof: 'Pending upload',
      sealPhotoProof: 'Pending upload',
      stuffingConfirmed: false,
      sealCaptured: false,
      conditionVerified: false,
      gateInConfirmed: false,
    },
    handoff: {
      vesselName: '',
      voyageNumber: '',
      carrier: '',
      blStatus: 'Draft pending',
      terminalGateInStatus: 'Pending',
      oceanHandoffStatus: 'Not ready',
    },
    exceptions: [
      {
        id: `${request.id}-origin-ex-1`,
        severity: request.hazardousFlag || request.outOfGaugeFlag ? 'High' : 'Medium',
        issueText: 'Booking converted from unified quote intake. Origin file still needs document set, container, seal, stuffing, gate-in, and vessel details.',
        actionLabel: 'Complete origin file',
      },
    ],
  };
}

export const BookingQuoteDeskRuntime = memo(function BookingQuoteDeskRuntime() {
  const searchParams = useSearchParams();
  const headerQuery = searchParams.get('query') || searchParams.get('q') || '';
  const [requests, setRequests] = useState<UnifiedBookingRequest[]>(() => readStoredRequests());
  const [selectedId, setSelectedId] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | BookingRequestSource>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | QuoteWorkflowStatus>('all');
  const [shippingFilter, setShippingFilter] = useState<'all' | 'blocked' | 'ready'>('all');
  const [search, setSearch] = useState(headerQuery);
  const [shippingWorkspace, setShippingWorkspace] = useState(() => readShippingPhase1Workspace());
  const [form, setForm] = useState<QuoteFormState>(defaultForm());
  const [formErrors, setFormErrors] = useState<string[]>([]);

  useEffect(() => {
    const reload = () => setRequests(readStoredRequests());
    reload();
    void hydrateSharedQuoteRequestsFromServer([]).then((next) => {
      setRequests(next);
    });
    window.addEventListener('storage', reload);
    window.addEventListener(sharedQuoteStorageUpdatedEvent, reload as EventListener);
    return () => {
      window.removeEventListener('storage', reload);
      window.removeEventListener(sharedQuoteStorageUpdatedEvent, reload as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!selectedId && requests.length > 0) {
      setSelectedId(requests[0]?.id ?? '');
    }
  }, [requests, selectedId]);

  useEffect(() => {
    const reload = () => setShippingWorkspace(readShippingPhase1Workspace());
    reload();
    window.addEventListener(shippingPhase1UpdatedEvent, reload as EventListener);
    return () => {
      window.removeEventListener(shippingPhase1UpdatedEvent, reload as EventListener);
    };
  }, []);

  useEffect(() => {
    const booking = searchParams.get('booking');
    const quote = searchParams.get('quote');
    if (!booking && !quote) return;
    const matched = requests.find((item) => item.bookingId === booking || item.quoteId === quote);
    if (matched) setSelectedId(matched.id);
  }, [requests, searchParams]);

  useEffect(() => {
    setSearch(headerQuery);
  }, [headerQuery]);

  const shippingBookingById = useMemo(
    () => new Map(shippingWorkspace.bookings.map((item) => [item.bookingId, item] as const)),
    [shippingWorkspace.bookings],
  );

  const filteredRequests = useMemo(
    () =>
      requests
        .filter((request) => {
          const matchesSource = sourceFilter === 'all' || request.requestSource === sourceFilter;
          const matchesStatus = statusFilter === 'all' || request.quoteStatus === statusFilter;
          const matchesSearch = [
            request.quoteId,
            request.bookingId,
            request.customerName,
            request.contactPerson,
            request.containerType,
            request.portOfLoading,
            request.inlandDestination,
          ].join(' ').toLowerCase().includes(search.trim().toLowerCase());
          const shippingBooking = request.bookingId ? shippingBookingById.get(request.bookingId) : null;
          const matchesShipping =
            shippingFilter === 'all'
              ? true
              : shippingFilter === 'blocked'
                ? Boolean(shippingBooking && shippingBooking.currentStage !== 'Shipping packet complete')
                : Boolean(shippingBooking && shippingBooking.currentStage === 'Shipping packet complete');
          return matchesSource && matchesStatus && matchesSearch && matchesShipping;
        })
        .sort(compareRequestOrder),
    [requests, search, shippingBookingById, shippingFilter, sourceFilter, statusFilter],
  );

  const selectedRequest = filteredRequests.find((item) => item.id === selectedId) ?? requests.find((item) => item.id === selectedId) ?? filteredRequests[0] ?? requests[0] ?? null;
  const selectedShippingBooking = selectedRequest?.bookingId ? shippingBookingById.get(selectedRequest.bookingId) || null : null;
  const selectedShippingLink = shippingDeskLink(selectedShippingBooking?.currentStage);

  useEffect(() => {
    setSelectedId((current) => {
      if (!requests.length) return '';
      if (requests.some((request) => request.id === current)) return current;
      return filteredRequests[0]?.id ?? requests[0]?.id ?? '';
    });
  }, [filteredRequests, requests]);

  function persist(next: UnifiedBookingRequest[]) {
    setRequests(next);
    writeStoredRequests(next);
  }

  function updateRequest(id: string, updater: (request: UnifiedBookingRequest) => UnifiedBookingRequest) {
    const next = requests.map((request) => request.id === id ? updater(request) : request);
    persist(next);
  }

  function addHistory(request: UnifiedBookingRequest, status: QuoteWorkflowStatus, by: string, note: string) {
    return {
      ...request,
      quoteStatus: status,
      updatedAt: new Date().toISOString(),
      quoteHistory: [...request.quoteHistory, { status, at: new Date().toISOString(), by, note }],
    };
  }

  function issueQuote() {
    if (!selectedRequest) return;
    updateRequest(selectedRequest.id, (request) => ({
      ...addHistory(request, 'quote_sent', 'Commercial pricing desk', 'Quote amount reviewed and issued.'),
      quoteAmount: request.quoteAmount || estimateQuoteAmount(request),
    }));
  }

  function requestRevision() {
    if (!selectedRequest) return;
    updateRequest(selectedRequest.id, (request) => addHistory(request, 'quote_revision_requested', 'Request owner', 'Revision requested on pricing or scope.'));
  }

  function rejectQuote() {
    if (!selectedRequest) return;
    updateRequest(selectedRequest.id, (request) => addHistory(request, 'quote_rejected', 'Request owner', 'Quote rejected by request owner.'));
  }

  function acceptQuote() {
    if (!selectedRequest) return;
    const acceptedAt = new Date().toISOString();
    const bookingId = selectedRequest.bookingId || `BK-${selectedRequest.quoteId.split('-').slice(1).join('-')}`;
    const shipmentId = selectedRequest.convertedToShipmentId || `SHP-${selectedRequest.quoteId.split('-').slice(1).join('-')}`;
    const assignedOriginAgentId = 'origin-agent-supplier';

    let backendRequest: UnifiedBookingRequest | null = null;
    updateRequest(selectedRequest.id, (request) => {
      const acceptedRequest: UnifiedBookingRequest = {
        ...request,
        quoteStatus: 'assigned_to_origin',
        bookingStatus: 'assigned_to_origin',
        acceptedAt,
        bookingId,
        convertedToShipmentId: shipmentId,
        assignedOriginAgentId,
        assignedOriginAgentEmail: originAgentEmail,
        assignedDesk: 'Tikur Abay Port Agent Desk (China)',
        updatedAt: acceptedAt,
        quoteHistory: [
          ...request.quoteHistory,
          { status: 'quote_accepted', at: acceptedAt, by: 'Request owner', note: 'Quote accepted.' },
          { status: 'booking_created', at: acceptedAt, by: 'System', note: `Booking ${bookingId} created automatically.` },
          { status: 'assigned_to_origin', at: acceptedAt, by: 'System', note: `Assigned to ${originAgentEmail}.` },
        ],
      };
      const originShipment = toOriginShipment(acceptedRequest);
      const existingShipments = readStoredSupplierShipments();
      const withoutCurrent = existingShipments.filter((shipment) => shipment.id !== originShipment.id);
      writeStoredSupplierShipments([originShipment, ...withoutCurrent]);
      backendRequest = acceptedRequest;
      return acceptedRequest;
    });
    if (backendRequest) {
      void syncBookingToBackendWorkflow(backendRequest).catch(() => {
        // Local booking acceptance should not fail if backend shipment sync is temporarily unavailable.
      });
    }
  }

  function submitNewRequest(mode: 'quote' | 'book') {
    const errors = validateForm(form);
    setFormErrors(errors);
    if (errors.length) return;

    const now = new Date().toISOString();
    const serial = String(requests.length + 1).padStart(3, '0');
    const estimatedAmount = estimateQuoteAmount(form);
    const bookingId = `BK-260325-${serial}`;
    const shipmentId = `SHP-260325-${serial}`;
    const next: UnifiedBookingRequest = {
      id: `quote-${serial}`,
      quoteId: `QT-260325-${serial}`,
      bookingId: mode === 'book' ? bookingId : '',
      convertedToShipmentId: mode === 'book' ? shipmentId : '',
      quoteStatus: mode === 'book' ? 'assigned_to_origin' : 'quote_sent',
      bookingStatus: mode === 'book' ? 'assigned_to_origin' : 'draft',
      quoteAmount: estimatedAmount,
      quoteCurrency: 'USD',
      acceptedAt: mode === 'book' ? now : '',
      assignedOriginAgentId: mode === 'book' ? 'origin-agent-supplier' : '',
      assignedOriginAgentEmail: mode === 'book' ? originAgentEmail : '',
      createdAt: now,
      updatedAt: now,
      requestedBy: intakeSourceLabels[form.requestSource],
      assignedDesk: mode === 'book' ? 'Tikur Abay Port Agent Desk (China)' : 'Commercial pricing desk',
      quoteHistory: mode === 'book'
        ? [
            { status: 'quote_requested', at: now, by: intakeSourceLabels[form.requestSource], note: 'Unified quote intake created.' },
            { status: 'quote_sent', at: now, by: 'System pricing', note: `Indicative quote generated at USD ${estimatedAmount.toLocaleString('en-US')}.` },
            { status: 'quote_accepted', at: now, by: 'Request owner', note: 'Quote accepted and converted immediately.' },
            { status: 'booking_created', at: now, by: 'System', note: `Booking ${bookingId} created.` },
            { status: 'assigned_to_origin', at: now, by: 'System', note: `Assigned to ${originAgentEmail}.` },
          ]
        : [
            { status: 'quote_requested', at: now, by: intakeSourceLabels[form.requestSource], note: 'Unified quote intake created.' },
            { status: 'quote_sent', at: now, by: 'System pricing', note: `Indicative quote generated at USD ${estimatedAmount.toLocaleString('en-US')}.` },
          ],
      ...form,
    };

    const merged = [next, ...requests];
    persist(merged);
    if (mode === 'book') {
      const originShipment = toOriginShipment(next);
      const existingShipments = readStoredSupplierShipments();
      const withoutCurrent = existingShipments.filter((shipment) => shipment.id !== originShipment.id);
      writeStoredSupplierShipments([originShipment, ...withoutCurrent]);
      void syncBookingToBackendWorkflow(next).catch(() => {
        // Best-effort backend sync only.
      });
    }
    setSelectedId(next.id);
    setForm(defaultForm(form.requestSource));
    setFormErrors([]);
  }

  const quotePreview = useMemo(() => estimateQuoteAmount(form), [form]);

  const summaryCards = useMemo(() => ([
    { label: 'Quotes pending', value: requests.filter((item) => item.quoteStatus === 'quote_requested' || item.quoteStatus === 'quote_under_review').length, helper: 'Unified intake items waiting on review or issuance.' },
    { label: 'Quotes sent', value: requests.filter((item) => item.quoteStatus === 'quote_sent').length, helper: 'Request owners can accept, reject, or request revision.' },
    { label: 'Bookings awaiting origin', value: requests.filter((item) => item.quoteStatus === 'booking_created' || item.quoteStatus === 'assigned_to_origin').length, helper: `Accepted files already routed to ${originAgentEmail}.` },
    { label: 'Shipping gates active', value: shippingWorkspace.bookings.filter((item) => item.currentStage !== 'Shipping packet complete').length, helper: 'Booked files still moving through validation, SI, BL, manifest, or finance.' },
    { label: 'Multi-source intake', value: new Set(requests.map((item) => item.requestSource)).size, helper: 'Customer, supplier, internal, port agent, and admin all feed one queue.' },
  ]), [requests, shippingWorkspace.bookings]);
  const selectedStageIndex =
    !selectedRequest ? 0 :
    selectedRequest.quoteStatus === 'assigned_to_origin' ? 4 :
    selectedRequest.quoteStatus === 'booking_created' ? 3 :
    selectedRequest.quoteStatus === 'quote_accepted' ? 2 :
    selectedRequest.quoteStatus === 'quote_sent' ? 1 :
    0;
  const nextActionKey =
    !selectedRequest
      ? 'new-intake'
      : selectedRequest.quoteStatus === 'assigned_to_origin'
        ? 'open-origin'
        : selectedRequest.quoteStatus === 'booking_created'
          ? 'send-origin'
          : selectedRequest.quoteStatus === 'quote_accepted'
            ? 'accept-book'
            : selectedRequest.quoteStatus === 'quote_sent'
              ? 'wait-approval'
              : selectedRequest.quoteStatus === 'quote_under_review'
                ? 'issue-quote'
                : 'issue-quote';
  const nextActionLabel =
    selectedRequest?.quoteStatus === 'assigned_to_origin'
      ? 'Ready for origin handoff'
      : selectedRequest?.quoteStatus === 'booking_created'
        ? 'Send booking to origin'
        : selectedRequest?.quoteStatus === 'quote_sent'
          ? 'Customer approval required'
          : formErrors.length
            ? 'Resolve intake validation'
            : 'Complete shipment details';

  return (
    <main className="shell">
      <section className="supplier-desk-shell">
        <header className="supplier-desk-header">
          <div className="supplier-desk-title">
            <span className="supplier-desk-eyebrow">Unified Intake</span>
            <h1>Booking / Quote Desk</h1>
            <p>Quote, approval, booking, and handoff control.</p>
          </div>
          <div className="supplier-desk-toolbar">
            <Link className="supplier-desk-button supplier-desk-button-primary" href="/operations/booking">Get quote / book shipment</Link>
            <select className="supplier-desk-select" value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as 'all' | BookingRequestSource)}>
              <option value="all">All sources</option>
              {Object.entries(intakeSourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select className="supplier-desk-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | QuoteWorkflowStatus)}>
              <option value="all">All quote states</option>
              <option value="quote_requested">Quote requested</option>
              <option value="quote_under_review">Quote under review</option>
              <option value="quote_sent">Quote sent</option>
              <option value="quote_accepted">Quote accepted</option>
              <option value="booking_created">Booking created</option>
              <option value="assigned_to_origin">Assigned to origin</option>
            </select>
            <select className="supplier-desk-select" value={shippingFilter} onChange={(event) => setShippingFilter(event.target.value as 'all' | 'blocked' | 'ready')}>
              <option value="all">All shipping gates</option>
              <option value="blocked">Shipping blocked</option>
              <option value="ready">Shipping ready</option>
            </select>
          </div>
        </header>

        <section className="supplier-summary-grid">
          {summaryCards.map((card) => (
            <article key={card.label} className="supplier-summary-card">
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <p>{card.helper}</p>
            </article>
          ))}
        </section>

        <section className="supplier-panel supplier-booking-command-panel">
          <div className="supplier-panel-header">
            <div>
              <span className="supplier-panel-eyebrow">Next Action</span>
              <h2>{nextActionLabel}</h2>
            </div>
            <span className="supplier-chip supplier-chip-mode">{selectedRequest?.quoteStatus?.replace(/_/g, ' ') || 'new intake'}</span>
          </div>
          <div className="supplier-progress-strip supplier-booking-stage-strip">
            {intakeStages.map((stage, index) => {
              const state =
                index < selectedStageIndex
                  ? 'supplier-progress-done'
                  : index === selectedStageIndex
                    ? 'supplier-progress-active'
                    : index === selectedStageIndex + 1
                      ? 'supplier-progress-next'
                      : 'supplier-progress-upcoming';
              return (
                <div key={stage} className={`supplier-progress-step ${state}`}>
                  <span>{index + 1}</span>
                  <strong>{stage}</strong>
                </div>
              );
            })}
          </div>
        </section>

        <section className="supplier-main-grid">
          <article className="supplier-panel">
            <header className="supplier-panel-header">
              <div>
                <span className="supplier-panel-eyebrow">Unified Queue</span>
                <h2>Booking requests and quote reviews</h2>
              </div>
              <p>{filteredRequests.length} active requests</p>
            </header>
            <div className="supplier-queue-list">
              {filteredRequests.map((request) => (
                <button key={request.id} type="button" className={request.id === selectedRequest?.id ? 'supplier-queue-row active' : 'supplier-queue-row'} onClick={() => setSelectedId(request.id)}>
                  <div className="supplier-queue-topline">
                    <strong>{request.quoteId}</strong>
                    <span className={`status-badge ${statusTone(request.quoteStatus)}`}>{request.quoteStatus.replace(/_/g, ' ')}</span>
                  </div>
                  <span>{request.customerName}</span>
                  <span>{intakeSourceLabels[request.requestSource]} · {request.serviceType}</span>
                  <div className="supplier-queue-meta">
                    <span>{request.portOfLoading} {'->'} {request.inlandDestination}</span>
                    <span>{request.containerType} x {request.containerCount}</span>
                  </div>
                  {request.bookingId && shippingBookingById.get(request.bookingId) ? (
                    <div className="supplier-queue-meta">
                      <span>{shippingStageLabel(shippingBookingById.get(request.bookingId)?.currentStage)}</span>
                      <span>{shippingBookingById.get(request.bookingId)?.responsibleDesk}</span>
                    </div>
                  ) : null}
                  <p>{request.commoditySummary}</p>
                </button>
              ))}
            </div>
          </article>

          <div className="supplier-detail-column">
            {selectedRequest ? (
              <>
                <article className="supplier-panel">
                  <header className="supplier-panel-header">
                    <div>
                      <span className="supplier-panel-eyebrow">Selected Intake</span>
                      <h2>{selectedRequest.quoteId}</h2>
                    </div>
                    <p>{intakeSourceLabels[selectedRequest.requestSource]}</p>
                  </header>
                  <div className="supplier-detail-summary">
                    <div className="supplier-detail-item"><span>Customer</span><strong>{selectedRequest.customerName}</strong></div>
                    <div className="supplier-detail-item"><span>Consignee</span><strong>{selectedRequest.consigneeName}</strong></div>
                    <div className="supplier-detail-item"><span>Contact</span><strong>{selectedRequest.contactPerson} · {selectedRequest.phone}</strong></div>
                    <div className="supplier-detail-item"><span>Commercial</span><strong>{selectedRequest.company} · {selectedRequest.incoterm}</strong></div>
                    <div className="supplier-detail-item"><span>Route</span><strong>{selectedRequest.portOfLoading} {'->'} {selectedRequest.portOfDischarge} {'->'} {selectedRequest.inlandDestination}</strong></div>
                    <div className="supplier-detail-item"><span>Final delivery</span><strong>{selectedRequest.finalDeliveryLocation}</strong></div>
                    <div className="supplier-detail-item"><span>Container requirement</span><strong>{selectedRequest.containerType} x {selectedRequest.containerCount}</strong></div>
                    <div className="supplier-detail-item"><span>Quote</span><strong>{selectedRequest.quoteAmount ? `${selectedRequest.quoteCurrency} ${selectedRequest.quoteAmount.toLocaleString('en-US')}` : 'Pending issuance'}</strong></div>
                    <div className="supplier-detail-item"><span>Booking route</span><strong>{selectedRequest.bookingId || 'Not converted'} {selectedRequest.assignedOriginAgentEmail ? `· ${selectedRequest.assignedOriginAgentEmail}` : ''}</strong></div>
                  </div>
                  {selectedShippingBooking ? (
                    <>
                      <div className="shipping-phase-note console-gap-top-md">
                        <span>Shipping gate</span>
                        <p>{shippingStageLabel(selectedShippingBooking.currentStage)} · {selectedShippingBooking.responsibleDesk}</p>
                      </div>
                      <div className="shipping-phase-note">
                        <span>Next downstream action</span>
                        <p>{shippingNextActionLabel(selectedShippingBooking.nextAction)}</p>
                      </div>
                    </>
                  ) : null}
                  <div className="supplier-inline-actions">
                    <button type="button" className={`supplier-desk-button supplier-desk-button-secondary ${nextStepClass(nextActionKey === 'issue-quote' && selectedRequest.quoteStatus !== 'quote_sent')}`} onClick={() => updateRequest(selectedRequest.id, (request) => addHistory(request, 'quote_under_review', 'Commercial pricing desk', 'Pricing owner reviewing cost and routing.'))}>Mark under review</button>
                    <button type="button" className={`supplier-desk-button supplier-desk-button-secondary ${nextStepClass(nextActionKey === 'issue-quote')}`} onClick={issueQuote}>Issue quote</button>
                    <button type="button" className="supplier-desk-button supplier-desk-button-secondary" onClick={requestRevision}>Request revision</button>
                    <button type="button" className="supplier-desk-button supplier-desk-button-secondary" onClick={rejectQuote}>Reject quote</button>
                    <button type="button" className={`supplier-desk-button supplier-desk-button-primary ${nextStepClass(nextActionKey === 'accept-book' || nextActionKey === 'send-origin')}`} onClick={acceptQuote}>{selectedRequest.quoteStatus === 'quote_sent' ? 'Accept quote and book shipment' : 'Send to China Port Agent'}</button>
                    {selectedShippingBooking ? <Link className="supplier-desk-button supplier-desk-button-secondary" href={selectedShippingLink.href}>{selectedShippingLink.label}</Link> : null}
                    {selectedRequest.assignedOriginAgentEmail ? <Link className={`supplier-desk-button supplier-desk-button-secondary ${nextStepClass(nextActionKey === 'open-origin')}`} href={`/operations/supplier-agent?booking=${encodeURIComponent(selectedRequest.bookingId)}`}>Open China Port Agent Desk</Link> : null}
                  </div>
                </article>

                <article className="supplier-panel">
                  <header className="supplier-panel-header">
                    <div>
                      <span className="supplier-panel-eyebrow">Validation and routing</span>
                      <h2>Adaptive cargo and container controls</h2>
                    </div>
                  </header>
                  <div className="supplier-detail-summary">
                    <div className="supplier-detail-item"><span>Hazardous</span><strong>{selectedRequest.hazardousFlag ? 'Yes' : 'No'}</strong></div>
                    <div className="supplier-detail-item"><span>Temperature control</span><strong>{selectedRequest.temperatureControl ? 'Yes' : 'No'}</strong></div>
                    <div className="supplier-detail-item"><span>Out of gauge</span><strong>{selectedRequest.outOfGaugeFlag ? 'Yes' : 'No'}</strong></div>
                    <div className="supplier-detail-item"><span>Reefer settings</span><strong>{selectedRequest.reeferSettings.requiredTemperature || 'Not required'}</strong></div>
                    <div className="supplier-detail-item"><span>OOG dimensions</span><strong>{selectedRequest.oogSettings.cargoDimensions || 'Not required'}</strong></div>
                    <div className="supplier-detail-item"><span>Special handling</span><strong>{selectedRequest.specialHandlingNote || 'No special note'}</strong></div>
                    <div className="supplier-detail-item"><span>Weight per container</span><strong>{selectedRequest.weightPerContainer.toLocaleString('en-US')} kg</strong></div>
                    <div className="supplier-detail-item"><span>Total weight / CBM</span><strong>{selectedRequest.totalWeight.toLocaleString('en-US')} kg / {selectedRequest.cbm} CBM</strong></div>
                  </div>
                </article>

                <article className="supplier-panel">
                  <header className="supplier-panel-header">
                    <div>
                      <span className="supplier-panel-eyebrow">Workflow backbone</span>
                      <h2>Shipment lifecycle</h2>
                    </div>
                  </header>
                  <div className="corridor-timeline">
                    {lifecycleStages.map((stage) => {
                      const isActive = stage === 'Booking / Quote';
                      return (
                        <div key={stage} className={`corridor-timeline-item corridor-timeline-${isActive ? 'active' : 'next'}`}>
                          <div className="corridor-timeline-dot" />
                          <div>
                            <strong>{stage}</strong>
                            <span>{isActive ? 'Current backbone stage for this desk' : 'Downstream operational stage'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>

                <article className="supplier-panel">
                  <header className="supplier-panel-header">
                    <div>
                      <span className="supplier-panel-eyebrow">Quote history</span>
                      <h2>Issue, accept, and convert without duplicate re-entry</h2>
                    </div>
                  </header>
                  <div className="supplier-checklist">
                    {selectedRequest.quoteHistory.map((item) => (
                      <div key={`${item.status}-${item.at}`} className="supplier-check-item">
                        <strong>{item.status.replace(/_/g, ' ')}</strong>
                        <span>{new Date(item.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · {item.by}</span>
                        <p>{item.note}</p>
                      </div>
                    ))}
                  </div>
                </article>
              </>
            ) : null}
          </div>
        </section>

        <section className="supplier-two-column">
          <article className="supplier-panel">
            <header className="supplier-panel-header">
              <div>
                <span className="supplier-panel-eyebrow">New intake</span>
                <h2>Create unified quote request</h2>
              </div>
              <p>Capture the shipment once, then move it through quote, approval, booking, and origin handoff.</p>
            </header>
            <div className="supplier-detail-summary">
              <div className="supplier-detail-item"><span>Indicative quote</span><strong>USD {quotePreview.toLocaleString('en-US')}</strong></div>
              <div className="supplier-detail-item"><span>Next booking route</span><strong>{originAgentEmail}</strong></div>
              <div className="supplier-detail-item"><span>Entry mode</span><strong>{intakeSourceLabels[form.requestSource]}</strong></div>
              <div className="supplier-detail-item"><span>Stage after booking</span><strong>China Port Agent / Origin Preparation</strong></div>
            </div>
            <div className="supplier-detail-summary">
              <label className="supplier-detail-item"><span>Request source</span><select className="supplier-desk-select" value={form.requestSource} onChange={(event) => setForm((current) => ({ ...current, requestSource: event.target.value as BookingRequestSource }))}>{Object.entries(intakeSourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="supplier-detail-item"><span>Customer name</span><input className="supplier-desk-input" value={form.customerName} onChange={(event) => setForm((current) => ({ ...current, customerName: event.target.value }))} /></label>
              <label className="supplier-detail-item"><span>Consignee name</span><input className="supplier-desk-input" value={form.consigneeName} onChange={(event) => setForm((current) => ({ ...current, consigneeName: event.target.value }))} /></label>
              <label className="supplier-detail-item"><span>Contact person</span><input className="supplier-desk-input" value={form.contactPerson} onChange={(event) => setForm((current) => ({ ...current, contactPerson: event.target.value }))} /></label>
              <label className="supplier-detail-item"><span>Phone</span><input className="supplier-desk-input" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></label>
              <label className="supplier-detail-item"><span>Email</span><input className="supplier-desk-input" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></label>
              <label className="supplier-detail-item"><span>Company</span><input className="supplier-desk-input" value={form.company} onChange={(event) => setForm((current) => ({ ...current, company: event.target.value }))} /></label>
              <label className="supplier-detail-item"><span>Incoterm</span><select className="supplier-desk-select" value={form.incoterm} onChange={(event) => setForm((current) => ({ ...current, incoterm: event.target.value }))}>{incoterms.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label className="supplier-detail-item"><span>Service type</span><select className="supplier-desk-select" value={form.serviceType} onChange={(event) => setForm((current) => ({ ...current, serviceType: event.target.value as 'multimodal' | 'unimodal' }))}>{serviceTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label className="supplier-detail-item"><span>Origin country</span><input className="supplier-desk-input" value={form.originCountry} onChange={(event) => setForm((current) => ({ ...current, originCountry: event.target.value }))} /></label>
              <label className="supplier-detail-item"><span>Origin city / port</span><input className="supplier-desk-input" value={form.originCityOrPort} onChange={(event) => setForm((current) => ({ ...current, originCityOrPort: event.target.value }))} /></label>
              <label className="supplier-detail-item"><span>Port of loading</span><input className="supplier-desk-input" value={form.portOfLoading} onChange={(event) => setForm((current) => ({ ...current, portOfLoading: event.target.value }))} /></label>
              <label className="supplier-detail-item"><span>Port of discharge</span><input className="supplier-desk-input" value={form.portOfDischarge} onChange={(event) => setForm((current) => ({ ...current, portOfDischarge: event.target.value }))} /></label>
              <label className="supplier-detail-item"><span>Inland destination</span><input className="supplier-desk-input" value={form.inlandDestination} onChange={(event) => setForm((current) => ({ ...current, inlandDestination: event.target.value }))} /></label>
              <label className="supplier-detail-item"><span>Final delivery location</span><input className="supplier-desk-input" value={form.finalDeliveryLocation} onChange={(event) => setForm((current) => ({ ...current, finalDeliveryLocation: event.target.value }))} /></label>
              <label className="supplier-detail-item"><span>Commodity summary</span><input className="supplier-desk-input" value={form.commoditySummary} onChange={(event) => setForm((current) => ({ ...current, commoditySummary: event.target.value }))} /></label>
              <label className="supplier-detail-item"><span>HS code</span><input className="supplier-desk-input" value={form.hsCode} onChange={(event) => setForm((current) => ({ ...current, hsCode: event.target.value }))} /></label>
              <label className="supplier-detail-item"><span>Container type</span><select className="supplier-desk-select" value={form.containerType} onChange={(event) => setForm((current) => ({ ...current, containerType: event.target.value as ContainerType }))}>{containerOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label className="supplier-detail-item"><span>Container count</span><input className="supplier-desk-input" type="number" min="1" value={form.containerCount} onChange={(event) => setForm((current) => ({ ...current, containerCount: Number(event.target.value) }))} /></label>
              <label className="supplier-detail-item"><span>Estimated weight / container</span><input className="supplier-desk-input" type="number" min="0" value={form.weightPerContainer} onChange={(event) => setForm((current) => ({ ...current, weightPerContainer: Number(event.target.value) }))} /></label>
              <label className="supplier-detail-item"><span>Total weight</span><input className="supplier-desk-input" type="number" min="0" value={form.totalWeight} onChange={(event) => setForm((current) => ({ ...current, totalWeight: Number(event.target.value) }))} /></label>
              <label className="supplier-detail-item"><span>Total volume / CBM</span><input className="supplier-desk-input" type="number" min="0" step="0.1" value={form.cbm} onChange={(event) => setForm((current) => ({ ...current, cbm: Number(event.target.value) }))} /></label>
              <label className="supplier-detail-item"><span>Requested loading date</span><input className="supplier-desk-input" type="date" value={form.requestedLoadingDate} onChange={(event) => setForm((current) => ({ ...current, requestedLoadingDate: event.target.value }))} /></label>
              <label className="supplier-detail-item"><span>Earliest departure date</span><input className="supplier-desk-input" type="date" value={form.earliestDepartureDate} onChange={(event) => setForm((current) => ({ ...current, earliestDepartureDate: event.target.value }))} /></label>
              <label className="supplier-detail-item"><span>Requested arrival window</span><input className="supplier-desk-input" value={form.requestedArrivalWindow} onChange={(event) => setForm((current) => ({ ...current, requestedArrivalWindow: event.target.value }))} /></label>
              <label className="supplier-detail-item"><span>Price owner / paying party</span><select className="supplier-desk-select" value={form.priceOwner} onChange={(event) => setForm((current) => ({ ...current, priceOwner: event.target.value }))}>{priceOwners.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            </div>
            <label className="supplier-detail-item console-gap-top-md"><span>Detailed cargo description</span><textarea className="supplier-desk-input" value={form.cargoDescription} onChange={(event) => setForm((current) => ({ ...current, cargoDescription: event.target.value }))} /></label>
            <label className="supplier-detail-item console-gap-top-md"><span>Remarks</span><textarea className="supplier-desk-input" value={form.remarks} onChange={(event) => setForm((current) => ({ ...current, remarks: event.target.value }))} /></label>
            <label className="supplier-detail-item console-gap-top-md"><span>Special handling note</span><textarea className="supplier-desk-input" value={form.specialHandlingNote} onChange={(event) => setForm((current) => ({ ...current, specialHandlingNote: event.target.value }))} /></label>
            <div className="supplier-inline-actions">
              <button type="button" className="supplier-desk-button supplier-desk-button-secondary" onClick={() => setForm((current) => ({ ...current, hazardousFlag: !current.hazardousFlag }))}>{form.hazardousFlag ? 'Hazardous: Yes' : 'Hazardous: No'}</button>
              <button type="button" className="supplier-desk-button supplier-desk-button-secondary" onClick={() => setForm((current) => ({ ...current, temperatureControl: !current.temperatureControl }))}>{form.temperatureControl ? 'Temperature control: Yes' : 'Temperature control: No'}</button>
              <button type="button" className="supplier-desk-button supplier-desk-button-secondary" onClick={() => setForm((current) => ({ ...current, outOfGaugeFlag: !current.outOfGaugeFlag }))}>{form.outOfGaugeFlag ? 'Out of gauge: Yes' : 'Out of gauge: No'}</button>
              <button type="button" className="supplier-desk-button supplier-desk-button-secondary" onClick={() => setForm((current) => ({ ...current, specialHandlingRequired: !current.specialHandlingRequired }))}>{form.specialHandlingRequired ? 'Special handling: Yes' : 'Special handling: No'}</button>
            </div>
            {form.temperatureControl || form.containerType === 'Reefer / Fridge' ? (
              <div className="supplier-detail-summary console-gap-top-md">
                <label className="supplier-detail-item"><span>Required temperature</span><input className="supplier-desk-input" value={form.reeferSettings.requiredTemperature} onChange={(event) => setForm((current) => ({ ...current, reeferSettings: { ...current.reeferSettings, requiredTemperature: event.target.value } }))} /></label>
                <label className="supplier-detail-item"><span>Ventilation</span><input className="supplier-desk-input" value={form.reeferSettings.ventilation} onChange={(event) => setForm((current) => ({ ...current, reeferSettings: { ...current.reeferSettings, ventilation: event.target.value } }))} /></label>
                <label className="supplier-detail-item"><span>Humidity</span><input className="supplier-desk-input" value={form.reeferSettings.humidity} onChange={(event) => setForm((current) => ({ ...current, reeferSettings: { ...current.reeferSettings, humidity: event.target.value } }))} /></label>
                <button type="button" className="supplier-desk-button supplier-desk-button-secondary" onClick={() => setForm((current) => ({ ...current, reeferSettings: { ...current.reeferSettings, commodityPreCooled: !current.reeferSettings.commodityPreCooled } }))}>{form.reeferSettings.commodityPreCooled ? 'Commodity pre-cooled: Yes' : 'Commodity pre-cooled: No'}</button>
              </div>
            ) : null}
            {form.outOfGaugeFlag || form.containerType === 'Flat Rack' || form.containerType === 'OOG / special cargo support note' ? (
              <div className="supplier-detail-summary console-gap-top-md">
                <label className="supplier-detail-item"><span>Cargo dimensions</span><input className="supplier-desk-input" value={form.oogSettings.cargoDimensions} onChange={(event) => setForm((current) => ({ ...current, oogSettings: { ...current.oogSettings, cargoDimensions: event.target.value } }))} /></label>
                <label className="supplier-detail-item"><span>Over-height</span><input className="supplier-desk-input" value={form.oogSettings.overHeight} onChange={(event) => setForm((current) => ({ ...current, oogSettings: { ...current.oogSettings, overHeight: event.target.value } }))} /></label>
                <label className="supplier-detail-item"><span>Over-width</span><input className="supplier-desk-input" value={form.oogSettings.overWidth} onChange={(event) => setForm((current) => ({ ...current, oogSettings: { ...current.oogSettings, overWidth: event.target.value } }))} /></label>
                <label className="supplier-detail-item"><span>Over-length</span><input className="supplier-desk-input" value={form.oogSettings.overLength} onChange={(event) => setForm((current) => ({ ...current, oogSettings: { ...current.oogSettings, overLength: event.target.value } }))} /></label>
                <label className="supplier-detail-item"><span>Lashing / equipment note</span><input className="supplier-desk-input" value={form.oogSettings.lashingNote} onChange={(event) => setForm((current) => ({ ...current, oogSettings: { ...current.oogSettings, lashingNote: event.target.value } }))} /></label>
              </div>
            ) : null}
            {formErrors.length ? (
              <div className="supplier-checklist console-gap-top-md">
                {formErrors.map((error) => <div key={error} className="supplier-check-item"><strong>Validation</strong><p>{error}</p></div>)}
              </div>
            ) : null}
            <div className="supplier-inline-actions">
              <button type="button" className="supplier-desk-button supplier-desk-button-secondary" onClick={() => submitNewRequest('quote')}>Get quote</button>
              <button type="button" className="supplier-desk-button supplier-desk-button-primary" onClick={() => submitNewRequest('book')}>Book shipment</button>
            </div>
          </article>

          <article className="supplier-panel supplier-booking-summary-panel">
            <header className="supplier-panel-header">
              <div>
                <span className="supplier-panel-eyebrow">Live quote summary</span>
                <h2>Quote, readiness, and handoff</h2>
              </div>
            </header>
            <div className="supplier-detail-summary supplier-booking-summary-grid">
              <div className="supplier-detail-item"><span>Indicative quote</span><strong>USD {quotePreview.toLocaleString('en-US')}</strong></div>
              <div className="supplier-detail-item"><span>Service level</span><strong>{form.serviceType} · {form.incoterm}</strong></div>
              <div className="supplier-detail-item"><span>Route</span><strong>{form.portOfLoading || 'Origin pending'} {'->'} {form.portOfDischarge || 'Discharge pending'} {'->'} {form.inlandDestination || 'Destination pending'}</strong></div>
              <div className="supplier-detail-item"><span>Container setup</span><strong>{form.containerType} x {form.containerCount}</strong></div>
              <div className="supplier-detail-item"><span>Cargo profile</span><strong>{form.commoditySummary || 'Commodity summary pending'}</strong></div>
              <div className="supplier-detail-item"><span>Operational needs</span><strong>{[form.hazardousFlag && 'Hazmat', form.temperatureControl && 'Temp control', form.outOfGaugeFlag && 'OOG', form.specialHandlingRequired && 'Special handling'].filter(Boolean).join(' · ') || 'Standard handling'}</strong></div>
              <div className="supplier-detail-item"><span>Customer</span><strong>{form.customerName || 'Customer pending'}</strong></div>
              <div className="supplier-detail-item"><span>Consignee</span><strong>{form.consigneeName || 'Consignee pending'}</strong></div>
              <div className="supplier-detail-item"><span>Next handoff</span><strong>{originAgentEmail}</strong></div>
            </div>
            <div className="supplier-checklist">
              <div className={`supplier-check-item ${form.customerName && form.consigneeName && form.contactPerson ? 'is-complete' : 'is-pending'}`}>
                <strong>Customer and consignee</strong>
                <span>{form.customerName && form.consigneeName && form.contactPerson ? 'Ready' : 'Missing required contact details'}</span>
              </div>
              <div className={`supplier-check-item ${form.portOfLoading && form.portOfDischarge && form.inlandDestination ? 'is-complete' : 'is-pending'}`}>
                <strong>Route definition</strong>
                <span>{form.portOfLoading && form.portOfDischarge && form.inlandDestination ? 'Ready' : 'Origin, discharge, or inland destination is missing'}</span>
              </div>
              <div className={`supplier-check-item ${form.cargoDescription && form.totalWeight > 0 && form.cbm > 0 ? 'is-complete' : 'is-pending'}`}>
                <strong>Cargo details</strong>
                <span>{form.cargoDescription && form.totalWeight > 0 && form.cbm > 0 ? 'Ready' : 'Cargo description, weight, or CBM is incomplete'}</span>
              </div>
              <div className={`supplier-check-item ${formErrors.length === 0 ? 'is-complete' : 'is-blocked'}`}>
                <strong>Quote and booking readiness</strong>
                <span>{formErrors.length === 0 ? 'No blocking validation issue' : `${formErrors.length} validation item(s) still blocking quote or booking`}</span>
              </div>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
});
