'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { readSharedQuoteRequests, writeSharedQuoteRequests } from '../lib/shared-quote-storage';
import { type SupplierDeskShipment, type SupplierDeskStage } from '../lib/supplier-agent-demo-data';
import { syncManualReleaseFromShipment } from '../lib/manual-corridor-journey';
import { readWorkflowState, writeWorkflowState } from '../lib/workflow-state-client';

type LineDraft = {
  description: string;
  hsCode: string;
  packageType: string;
  packageQuantity: string;
  grossWeightKg: string;
  netWeightKg: string;
  cbm: string;
  marksNumbers: string;
  invoiceRef: string;
  packingListRef: string;
  remarks: string;
};

type ShipmentDraft = {
  bookingNumber: string;
  customerName: string;
  supplierName: string;
  supplierCode: string;
  serviceType: 'multimodal' | 'unimodal';
  originPort: string;
  dischargePort: string;
  finalDestination: string;
  fallbackDryPort: string;
  incoterm: string;
  assignedAgent: string;
  etd: string;
  etaDjibouti: string;
  carrier: string;
  vesselName: string;
  voyageNumber: string;
  containerNumber: string;
  containerType: string;
  sealNumber: string;
};

type ShipmentUpdateDraft = {
  containerNumber: string;
  containerType: string;
  sealNumber: string;
  stuffingDateTime: string;
  stuffingLocation: string;
  loadedBy: string;
  vesselName: string;
  voyageNumber: string;
  carrier: string;
  etd: string;
  etaDjibouti: string;
};

const stageOrder: SupplierDeskStage[] = [
  'Booking created',
  'Cargo items incomplete',
  'Documents pending',
  'BL draft review',
  'Stuffing scheduled',
  'Gate-in pending',
  'Ready for vessel handoff',
];

const progressLabels = ['Booking', 'Cargo Items', 'Documents', 'Container & Seal', 'Stuffing', 'Gate-in', 'Ocean Handoff'];

const emptyDraft: LineDraft = {
  description: '',
  hsCode: '',
  packageType: '',
  packageQuantity: '',
  grossWeightKg: '',
  netWeightKg: '',
  cbm: '',
  marksNumbers: '',
  invoiceRef: '',
  packingListRef: '',
  remarks: '',
};

const emptyShipmentDraft: ShipmentDraft = {
  bookingNumber: '',
  customerName: '',
  supplierName: '',
  supplierCode: '',
  serviceType: 'multimodal',
  originPort: 'Shanghai',
  dischargePort: 'Djibouti Port',
  finalDestination: 'Customer delivery location',
  fallbackDryPort: 'Adama Dry Port',
  incoterm: 'CFR',
  assignedAgent: '',
  etd: '',
  etaDjibouti: '',
  carrier: 'MSC',
  vesselName: '',
  voyageNumber: '',
  containerNumber: '',
  containerType: '40FT HC',
  sealNumber: '',
};

const supplierDeskStorageKey = 'tikur-abay:supplier-desk:manual-shipments';
const supplierDeskStorageUpdatedEvent = 'tikur-abay:supplier-desk:storage-updated';
const supplierDeskCookieKey = 'tikur_abay_supplier_shipments';

const originPortOptions = [
  'Shanghai',
  'Ningbo',
  'Shenzhen / Yantian',
  'Guangzhou / Nansha',
  'Qingdao',
  'Tianjin',
  'Xiamen',
  'Nhava Sheva / Mumbai',
  'Mundra',
  'Chennai',
  'Istanbul / Ambarli',
  'Izmir / Aliaga',
  'Mersin',
  'Jebel Ali / Dubai',
] as const;

const lineItemPresets: Array<{ label: string; draft: LineDraft }> = [
  {
    label: 'Electric motors',
    draft: {
      description: 'Electric motors',
      hsCode: '8501.52',
      packageType: 'Crate',
      packageQuantity: '12',
      grossWeightKg: '4200',
      netWeightKg: '3980',
      cbm: '8.4',
      marksNumbers: 'ALM/MTR/01-12',
      invoiceRef: 'INV-MANUAL-0001',
      packingListRef: 'PL-MANUAL-0001',
      remarks: 'Verify loading sequence before release.',
    },
  },
  {
    label: 'Industrial cables',
    draft: {
      description: 'Industrial cables',
      hsCode: '8544.49',
      packageType: 'Roll',
      packageQuantity: '24',
      grossWeightKg: '3100',
      netWeightKg: '2960',
      cbm: '5.9',
      marksNumbers: 'ALM/CBL/13-36',
      invoiceRef: 'INV-MANUAL-0001',
      packingListRef: 'PL-MANUAL-0001',
      remarks: 'Check drum count at gate-in.',
    },
  },
  {
    label: 'Control panels',
    draft: {
      description: 'Control panels',
      hsCode: '8537.10',
      packageType: 'Pallet',
      packageQuantity: '8',
      grossWeightKg: '2700',
      netWeightKg: '2550',
      cbm: '4.7',
      marksNumbers: 'ALM/CTL/37-44',
      invoiceRef: 'INV-MANUAL-0001',
      packingListRef: 'PL-MANUAL-0001',
      remarks: 'Control panels must remain upright.',
    },
  },
  {
    label: 'Steel fittings',
    draft: {
      description: 'Steel fittings',
      hsCode: '7307.99',
      packageType: 'Carton',
      packageQuantity: '40',
      grossWeightKg: '1900',
      netWeightKg: '1810',
      cbm: '3.1',
      marksNumbers: 'ALM/STL/45-84',
      invoiceRef: 'INV-MANUAL-0001',
      packingListRef: 'PL-MANUAL-0001',
      remarks: 'General cargo.',
    },
  },
  {
    label: 'Packaging materials',
    draft: {
      description: 'Packaging materials',
      hsCode: '3923.90',
      packageType: 'Bundle',
      packageQuantity: '16',
      grossWeightKg: '850',
      netWeightKg: '780',
      cbm: '2.4',
      marksNumbers: 'ALM/PKG/85-100',
      invoiceRef: 'INV-MANUAL-0001',
      packingListRef: 'PL-MANUAL-0001',
      remarks: 'Keep away from moisture.',
    },
  },
  {
    label: 'Generator parts',
    draft: {
      description: 'Generator spare parts',
      hsCode: '8503.00',
      packageType: 'Crate',
      packageQuantity: '10',
      grossWeightKg: '3600',
      netWeightKg: '3410',
      cbm: '6.2',
      marksNumbers: 'ALM/GEN/101-110',
      invoiceRef: 'INV-MANUAL-0001',
      packingListRef: 'PL-MANUAL-0001',
      remarks: 'Check crate labels before handoff.',
    },
  },
  {
    label: 'Solar panels',
    draft: {
      description: 'Photovoltaic solar panels',
      hsCode: '8541.43',
      packageType: 'Pallet',
      packageQuantity: '20',
      grossWeightKg: '2900',
      netWeightKg: '2740',
      cbm: '7.8',
      marksNumbers: 'ALM/SLR/111-130',
      invoiceRef: 'INV-MANUAL-0001',
      packingListRef: 'PL-MANUAL-0001',
      remarks: 'Keep dry and upright.',
    },
  },
  {
    label: 'Tyres',
    draft: {
      description: 'Truck and bus radial tyres',
      hsCode: '4011.20',
      packageType: 'Bundle',
      packageQuantity: '48',
      grossWeightKg: '4200',
      netWeightKg: '3990',
      cbm: '9.1',
      marksNumbers: 'ALM/TYR/131-178',
      invoiceRef: 'INV-MANUAL-0001',
      packingListRef: 'PL-MANUAL-0001',
      remarks: 'Stack by size grouping.',
    },
  },
  {
    label: 'Auto parts',
    draft: {
      description: 'Automotive spare parts',
      hsCode: '8708.99',
      packageType: 'Carton',
      packageQuantity: '36',
      grossWeightKg: '2100',
      netWeightKg: '1960',
      cbm: '4.9',
      marksNumbers: 'ALM/AUT/179-214',
      invoiceRef: 'INV-MANUAL-0001',
      packingListRef: 'PL-MANUAL-0001',
      remarks: 'Count cartons at unload.',
    },
  },
  {
    label: 'Home appliances',
    draft: {
      description: 'Small home appliances',
      hsCode: '8509.80',
      packageType: 'Carton',
      packageQuantity: '60',
      grossWeightKg: '2600',
      netWeightKg: '2380',
      cbm: '6.5',
      marksNumbers: 'ALM/HAP/215-274',
      invoiceRef: 'INV-MANUAL-0001',
      packingListRef: 'PL-MANUAL-0001',
      remarks: 'Fragile handling required.',
    },
  },
  {
    label: 'Textiles',
    draft: {
      description: 'Fabric rolls and textile inputs',
      hsCode: '5512.19',
      packageType: 'Roll',
      packageQuantity: '32',
      grossWeightKg: '1800',
      netWeightKg: '1690',
      cbm: '5.2',
      marksNumbers: 'ALM/TEX/275-306',
      invoiceRef: 'INV-MANUAL-0001',
      packingListRef: 'PL-MANUAL-0001',
      remarks: 'Keep dry during transit.',
    },
  },
  {
    label: 'Ceramic tiles',
    draft: {
      description: 'Ceramic floor and wall tiles',
      hsCode: '6907.21',
      packageType: 'Pallet',
      packageQuantity: '18',
      grossWeightKg: '8600',
      netWeightKg: '8350',
      cbm: '8.9',
      marksNumbers: 'ALM/TIL/307-324',
      invoiceRef: 'INV-MANUAL-0001',
      packingListRef: 'PL-MANUAL-0001',
      remarks: 'Heavy cargo, verify pallet condition.',
    },
  },
  {
    label: 'Pharma supplies',
    draft: {
      description: 'Pharmaceutical packaging and consumables',
      hsCode: '3006.90',
      packageType: 'Carton',
      packageQuantity: '28',
      grossWeightKg: '1450',
      netWeightKg: '1330',
      cbm: '3.8',
      marksNumbers: 'ALM/PHR/325-352',
      invoiceRef: 'INV-MANUAL-0001',
      packingListRef: 'PL-MANUAL-0001',
      remarks: 'Check carton integrity at unload.',
    },
  },
  {
    label: 'Lubricants',
    draft: {
      description: 'Industrial lubricants and oils',
      hsCode: '2710.19',
      packageType: 'Drum',
      packageQuantity: '20',
      grossWeightKg: '3900',
      netWeightKg: '3720',
      cbm: '4.6',
      marksNumbers: 'ALM/LUB/353-372',
      invoiceRef: 'INV-MANUAL-0001',
      packingListRef: 'PL-MANUAL-0001',
      remarks: 'Verify drum seals before handoff.',
    },
  },
  {
    label: 'Construction hardware',
    draft: {
      description: 'Construction hardware and fasteners',
      hsCode: '7318.15',
      packageType: 'Carton',
      packageQuantity: '50',
      grossWeightKg: '2400',
      netWeightKg: '2280',
      cbm: '3.6',
      marksNumbers: 'ALM/HDW/373-422',
      invoiceRef: 'INV-MANUAL-0001',
      packingListRef: 'PL-MANUAL-0001',
      remarks: 'General cargo.',
    },
  },
];

function formatDate(value: string) {
  if (!value || value === '-') return '-';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatBookingDate(date: Date) {
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function generateBookingNumber(shipments: SupplierDeskShipment[]) {
  const datePrefix = formatBookingDate(new Date());
  const sameDayCount = shipments.filter((shipment) => shipment.bookingNumber.startsWith(`TB-${datePrefix}-`)).length + 1;
  return `TB-${datePrefix}-${String(sameDayCount).padStart(3, '0')}`;
}

function nextStepClass(isActive: boolean) {
  return isActive ? 'supplier-next-step-button' : '';
}

function shippingWorkspaceHrefForBooking(bookingNumber?: string | null) {
  const value = String(bookingNumber || '').trim();
  return value ? `/shipping?booking=${encodeURIComponent(value)}` : '/shipping';
}

function syncSharedBookingForShippingHandoff(nextShipment: SupplierDeskShipment) {
  if (typeof window === 'undefined') return;
  const timestamp = new Date().toISOString();
  const requests = readSharedQuoteRequests([]);
  const nextRequests = requests.map((request) => {
    if (request.bookingId !== nextShipment.bookingNumber && request.quoteId !== nextShipment.quoteReference) {
      return request;
    }
    const handoffNote = `Origin handoff completed for ${nextShipment.bookingNumber}. File promoted to Shipping Workspace.`;
    const quoteHistory = request.quoteHistory.some((entry) => entry.note === handoffNote)
      ? request.quoteHistory
      : [
          ...request.quoteHistory,
          {
            status: request.quoteStatus,
            at: timestamp,
            by: 'China Port Agent Desk',
            note: handoffNote,
          },
        ];
    return {
      ...request,
      bookingStatus: 'assigned_to_origin' as const,
      quoteStatus: request.quoteStatus === 'booking_created' ? 'assigned_to_origin' : request.quoteStatus,
      assignedDesk: 'Shipping Workspace',
      updatedAt: timestamp,
      vesselName: nextShipment.handoff.vesselName || request.vesselName,
      voyageNumber: nextShipment.handoff.voyageNumber || request.voyageNumber,
      etaLoadingPort: nextShipment.etd || request.etaLoadingPort,
      remarks: request.remarks ? `${request.remarks} ${handoffNote}` : handoffNote,
      quoteHistory,
    };
  });
  writeSharedQuoteRequests(nextRequests);
}

function activeStepPanelClass(isActive: boolean) {
  return isActive ? 'operations-step-active' : '';
}

const blockedPlaceholderValues = [
  'Pending container number',
  'Pending reefer allocation',
  'Pending seal',
  'Pending seal number',
  'Pending stuffing team',
  'Pending vessel',
  'Pending voyage',
  'Pending carrier',
];

function hasRealValue(value: string | null | undefined, blockedValues: string[] = blockedPlaceholderValues) {
  if (!value) return false;
  return !blockedValues.includes(value.trim());
}

function displayIfReal(value: string | null | undefined, blockedValues: string[]) {
  if (!hasRealValue(value, blockedValues)) return '';
  return value;
}

function documentCompleteCount(shipment: SupplierDeskShipment) {
  return shipment.documents.filter((document) => document.status !== 'missing').length;
}

function grossWeightLimitStatus(totalGrossWeight: number) {
  if (totalGrossWeight === 0) return 'No cargo entered yet';
  if (totalGrossWeight > 28000) return 'Above 28-ton planning limit';
  if (totalGrossWeight > 25000) return 'Near 28-ton planning limit';
  return 'Within 28-ton planning limit';
}

function isShipmentReady(shipment: SupplierDeskShipment) {
  const requiredDocs = ['Commercial invoice', 'Packing list', 'BL draft'];
  const docsReady = requiredDocs.every((type) => shipment.documents.some((document) => document.type === type && document.status !== 'missing'));
  const hasCargoLines = shipment.cargoItems.length > 0 && shipment.cargoItems.every((item) => item.description && item.hsCode && item.grossWeightKg > 0 && item.packageQuantity > 0);
  return (
    hasCargoLines &&
    docsReady &&
    Boolean(shipment.container.containerNumber) &&
    Boolean(shipment.container.sealNumber) &&
    shipment.container.stuffingConfirmed &&
    shipment.container.gateInConfirmed &&
    shipment.handoff.blStatus !== 'Draft pending'
  );
}

function compareShipmentOrder(left: SupplierDeskShipment, right: SupplierDeskShipment) {
  const leftKey = String(left.bookingNumber || left.quoteReference || '').replace(/\D/g, '');
  const rightKey = String(right.bookingNumber || right.quoteReference || '').replace(/\D/g, '');
  if (leftKey.length !== rightKey.length) return rightKey.length - leftKey.length;
  return rightKey.localeCompare(leftKey);
}

function mergeShipmentsByBooking(localShipments: SupplierDeskShipment[], serverShipments: SupplierDeskShipment[]) {
  const merged = [...localShipments];
  const seen = new Set(merged.map((shipment) => shipment.bookingNumber || shipment.id));
  serverShipments.forEach((shipment) => {
    const key = shipment.bookingNumber || shipment.id;
    if (seen.has(key)) return;
    merged.push(shipment);
    seen.add(key);
  });
  return merged.sort(compareShipmentOrder);
}

export const SupplierAgentDeskRuntime = memo(function SupplierAgentDeskRuntime({ deskVariant = 'hq' }: { deskVariant?: 'hq' | 'china' }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const headerQuery = searchParams.get('query') || searchParams.get('q') || '';
  const [shipments, setShipments] = useState<SupplierDeskShipment[]>([]);
  const [selectedShipmentId, setSelectedShipmentId] = useState('');
  const [searchValue, setSearchValue] = useState(headerQuery);
  const [statusFilter, setStatusFilter] = useState<'all' | SupplierDeskStage>('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [dateRange, setDateRange] = useState<'all' | '7d' | '14d' | '30d'>('all');
  const [blockedOnly, setBlockedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'updated' | 'priority' | 'stage'>('updated');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [lineDraft, setLineDraft] = useState<LineDraft>(emptyDraft);
  const [lineError, setLineError] = useState('');
  const [storageHydrated, setStorageHydrated] = useState(false);
  const documentInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const initialRouteSelectionAppliedRef = useRef(false);
  const [shipmentUpdateDraft, setShipmentUpdateDraft] = useState<ShipmentUpdateDraft>({
    containerNumber: '',
    containerType: '40FT',
    sealNumber: '',
    stuffingDateTime: '',
    stuffingLocation: '',
    loadedBy: '',
    vesselName: '',
    voyageNumber: '',
    carrier: 'MSC',
    etd: '',
    etaDjibouti: '',
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(supplierDeskStorageKey);
    let localShipments: SupplierDeskShipment[] = [];
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as SupplierDeskShipment[];
        if (Array.isArray(parsed)) {
          localShipments = parsed;
        }
      } catch {
        window.localStorage.removeItem(supplierDeskStorageKey);
      }
    }

    if (localShipments.length > 0) {
      setShipments(localShipments);
      setSelectedShipmentId((current) => current || localShipments[0]?.id || '');
    }

    void readWorkflowState<SupplierDeskShipment>('supplier-shipments')
      .then((serverShipments) => {
        const mergedShipments = mergeShipmentsByBooking(localShipments, serverShipments);
        if (mergedShipments.length > 0) {
          setShipments(mergedShipments);
          setSelectedShipmentId((current) => current || mergedShipments[0]?.id || '');
          window.localStorage.setItem(supplierDeskStorageKey, JSON.stringify(mergedShipments));
          if (JSON.stringify(mergedShipments) !== JSON.stringify(serverShipments)) {
            void writeWorkflowState('supplier-shipments', mergedShipments).catch(() => {});
          }
          return;
        }
        setShipments([]);
      })
      .finally(() => {
        setStorageHydrated(true);
      });
  }, []);

  useEffect(() => {
    setSearchValue(headerQuery);
  }, [headerQuery]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const refreshFromStorage = (event?: Event) => {
      const saved = window.localStorage.getItem(supplierDeskStorageKey);
      if (!saved) return;
      try {
        const parsed = JSON.parse(saved) as SupplierDeskShipment[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          const bookingNumber =
            event && 'detail' in event && event.detail && typeof event.detail === 'object' && 'bookingNumber' in event.detail
              ? String((event.detail as { bookingNumber?: string }).bookingNumber || '')
              : '';
          const shouldPromoteNewest =
            event?.type === supplierDeskStorageUpdatedEvent;
          setShipments(parsed);
          setSelectedShipmentId((current) => {
            if (bookingNumber) {
              const matched = parsed.find((shipment) => shipment.bookingNumber === bookingNumber);
              if (matched) return matched.id;
            }
            if (shouldPromoteNewest) return parsed[0]?.id || current;
            if (current && parsed.some((shipment) => shipment.id === current)) return current;
            return parsed[0]?.id || current;
          });
        }
      } catch {
        // Ignore malformed storage and keep current in-memory queue.
      }
    };

    window.addEventListener('storage', refreshFromStorage);
    window.addEventListener(supplierDeskStorageUpdatedEvent, refreshFromStorage as EventListener);
    return () => {
      window.removeEventListener('storage', refreshFromStorage);
      window.removeEventListener(supplierDeskStorageUpdatedEvent, refreshFromStorage as EventListener);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!storageHydrated) return;
    const serialized = JSON.stringify(shipments);
    window.localStorage.setItem(supplierDeskStorageKey, serialized);
    document.cookie = `${supplierDeskCookieKey}=${encodeURIComponent(serialized)}; path=/; max-age=2592000; samesite=lax`;
    void writeWorkflowState('supplier-shipments', shipments).catch(() => {});
  }, [shipments, storageHydrated]);

  useEffect(() => {
    if (!selectedShipmentId && shipments.length > 0) {
      setSelectedShipmentId(shipments[0]!.id);
    }
  }, [selectedShipmentId, shipments]);

  useEffect(() => {
    const booking = searchParams.get('booking');
    const shipmentId = searchParams.get('shipment');
    if (initialRouteSelectionAppliedRef.current) return;
    const requestedSelection = shipmentId ? `shipment:${shipmentId}` : booking ? `booking:${booking}` : '';
    if (!requestedSelection) return;
    if (shipmentId) {
      const matchedById = shipments.find((item) => item.id === shipmentId);
      if (matchedById) {
        initialRouteSelectionAppliedRef.current = true;
        setSelectedShipmentId(matchedById.id);
        return;
      }
    }
    if (!booking) return;
    const matched = shipments.find((item) => item.bookingNumber === booking);
    if (matched) {
      initialRouteSelectionAppliedRef.current = true;
      setSelectedShipmentId(matched.id);
    }
  }, [searchParams, shipments]);

  const supplierOptions = useMemo(
    () => ['all', ...Array.from(new Set(shipments.map((shipment) => shipment.supplierName)))],
    [shipments],
  );

  const filteredShipments = useMemo(() => {
    const now = new Date('2026-03-19T23:59:59Z').getTime();
    const cutoffMap = { all: 0, '7d': 7, '14d': 14, '30d': 30 };
    const rangeDays = cutoffMap[dateRange];
    const next = shipments.filter((shipment) => {
      const matchesSearch = [shipment.bookingNumber, shipment.customerName, shipment.supplierName]
        .join(' ')
        .toLowerCase()
        .includes(searchValue.trim().toLowerCase());
      const matchesStatus = statusFilter === 'all' || shipment.currentStage === statusFilter;
      const matchesSupplier = supplierFilter === 'all' || shipment.supplierName === supplierFilter;
      const isBlocked = shipment.exceptionLabel !== null || shipment.documents.some((document) => document.status === 'missing');
      const matchesBlocked = !blockedOnly || isBlocked;
      const matchesDate =
        rangeDays === 0 ||
        now - new Date(shipment.lastUpdated).getTime() <= rangeDays * 24 * 60 * 60 * 1000;
      return matchesSearch && matchesStatus && matchesSupplier && matchesDate && matchesBlocked;
    });
    return next.sort((left, right) => {
      if (sortBy === 'stage') {
        return stageOrder.indexOf(left.currentStage) - stageOrder.indexOf(right.currentStage);
      }
      if (sortBy === 'priority') {
        const priorityWeight = (shipment: SupplierDeskShipment) =>
          shipment.exceptions.some((item) => item.severity === 'High') ? 3 : shipment.exceptions.some((item) => item.severity === 'Medium') ? 2 : 1;
        return priorityWeight(right) - priorityWeight(left);
      }
      return compareShipmentOrder(left, right);
    });
  }, [blockedOnly, dateRange, searchValue, shipments, sortBy, statusFilter, supplierFilter]);

  const selectedShipment = useMemo(() => {
    return filteredShipments.find((shipment) => shipment.id === selectedShipmentId)
      ?? shipments.find((shipment) => shipment.id === selectedShipmentId)
      ?? filteredShipments[0]
      ?? shipments[0]
      ?? null;
  }, [filteredShipments, selectedShipmentId, shipments]);

  useEffect(() => {
    if (!storageHydrated || !selectedShipment) return;
    syncShipmentToTracking(selectedShipment);
  }, [
    storageHydrated,
    selectedShipment?.id,
    selectedShipment?.bookingNumber,
    selectedShipment?.customerName,
    selectedShipment?.supplierName,
    selectedShipment?.originPort,
    selectedShipment?.etaDjibouti,
    selectedShipment?.container.containerNumber,
    selectedShipment?.container.sealNumber,
    selectedShipment?.container.stuffingLocation,
    selectedShipment?.handoff.carrier,
    selectedShipment?.handoff.vesselName,
    selectedShipment?.handoff.voyageNumber,
    selectedShipment?.handoff.carrierBlNumber,
    selectedShipment?.handoff.houseBlNumber,
    selectedShipment?.handoff.oceanHandoffStatus,
  ]);

  useEffect(() => {
    setSelectedShipmentId((current) => {
      if (!shipments.length) return '';
      if (shipments.some((shipment) => shipment.id === current)) return current;
      return filteredShipments[0]?.id ?? shipments[0]?.id ?? '';
    });
  }, [filteredShipments, shipments]);

  useEffect(() => {
    if (!selectedShipment) return;
    setShipmentUpdateDraft({
      containerNumber: hasRealValue(selectedShipment.container.containerNumber, ['Pending container number', 'Pending reefer allocation']) ? selectedShipment.container.containerNumber : '',
      containerType: selectedShipment.container.containerType || '40FT',
      sealNumber: hasRealValue(selectedShipment.container.sealNumber, ['Pending seal', 'Pending seal number']) ? selectedShipment.container.sealNumber : '',
      stuffingDateTime: selectedShipment.container.stuffingDateTime === 'Not scheduled' ? '' : selectedShipment.container.stuffingDateTime,
      stuffingLocation: selectedShipment.container.stuffingLocation === 'Pending origin yard' ? '' : selectedShipment.container.stuffingLocation,
      loadedBy: selectedShipment.container.loadedBy === 'Not assigned' || selectedShipment.container.loadedBy === 'Pending stuffing team' ? '' : selectedShipment.container.loadedBy,
      vesselName: hasRealValue(selectedShipment.handoff.vesselName, ['Pending vessel']) ? selectedShipment.handoff.vesselName : '',
      voyageNumber: hasRealValue(selectedShipment.handoff.voyageNumber, ['Pending voyage']) ? selectedShipment.handoff.voyageNumber : '',
      carrier: hasRealValue(selectedShipment.handoff.carrier, ['Pending carrier']) ? selectedShipment.handoff.carrier : '',
      etd: selectedShipment.etd === '-' ? '' : selectedShipment.etd,
      etaDjibouti: selectedShipment.etaDjibouti === '-' ? '' : selectedShipment.etaDjibouti,
    });
  }, [selectedShipment]);

  function handleSelectShipment(shipmentId: string) {
    setSelectedShipmentId(shipmentId);
  }

  const selectedShipmentIndex = selectedShipment ? stageOrder.indexOf(selectedShipment.currentStage) : 0;

  const summaryCards = useMemo(() => {
    const openBookings = shipments.length;
    const pendingDocuments = shipments.filter((shipment) => shipment.documents.some((document) => document.status === 'missing')).length;
    const blDraftPending = shipments.filter((shipment) => shipment.handoff.blStatus === 'Draft pending').length;
    const stuffingPending = shipments.filter((shipment) => !shipment.container.stuffingConfirmed).length;
    const readyForHandoff = shipments.filter((shipment) => isShipmentReady(shipment)).length;
    return [
      { label: 'Bookings awaiting origin processing', value: openBookings, helper: 'Accepted bookings currently active in the China port agent queue.' },
      { label: 'Pending documents', value: pendingDocuments, helper: 'Shipment files still missing one or more origin documents.' },
      { label: 'BL draft pending', value: blDraftPending, helper: 'Draft BL files waiting for review or approval.' },
      { label: 'Stuffing pending', value: stuffingPending, helper: 'Booked shipments that still need stuffing confirmation.' },
      { label: 'Ready for vessel handoff', value: readyForHandoff, helper: 'Origin files fully prepared for carrier handoff.' },
    ];
  }, [shipments]);

  const queueRows = filteredShipments.slice(0, 10);
  const queueSummary = useMemo(() => ({
    open: filteredShipments.length,
    blocked: filteredShipments.filter((shipment) => shipment.exceptionLabel !== null || shipment.documents.some((document) => document.status === 'missing')).length,
    awaitingDocs: filteredShipments.filter((shipment) => shipment.documents.some((document) => document.status === 'missing')).length,
    readyToDispatch: filteredShipments.filter((shipment) => shipment.handoff.oceanHandoffStatus === 'Handed off to Djibouti release').length,
  }), [filteredShipments]);

  function syncShipmentToTracking(shipment: SupplierDeskShipment) {
    if (typeof window === 'undefined' || !shipment.bookingNumber) return;
    void fetch('/api/tracking/register-origin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingNo: shipment.bookingNumber,
        containerNo: shipment.container.containerNumber,
        blNo: shipment.handoff.houseBlNumber || shipment.handoff.carrierBlNumber || `HBL-${shipment.bookingNumber}`,
        carrier: shipment.handoff.carrier,
        vesselName: shipment.handoff.vesselName,
        voyageNo: shipment.handoff.voyageNumber,
        currentLocation: shipment.container.stuffingLocation || shipment.originPort,
        shipper: shipment.supplierName,
        consignee: shipment.customerName,
        eta: shipment.etaDjibouti,
        eventType: shipment.handoff.oceanHandoffStatus === 'Handed off to Djibouti release' ? 'LOADED_ON_VESSEL' : 'ORIGIN_UPDATED',
        description:
          shipment.handoff.oceanHandoffStatus === 'Handed off to Djibouti release'
            ? 'Origin desk completed ocean handoff with container and vessel details.'
            : 'Origin desk updated container and stuffing details.',
      }),
    }).catch(() => {
      // Local tracking sync is best-effort and should not block origin workflow.
    });
  }

  function updateSelectedShipment(mutator: (shipment: SupplierDeskShipment) => SupplierDeskShipment) {
    if (!selectedShipment) return;
    setShipments((current) => current.map((shipment) => (shipment.id === selectedShipment.id ? mutator(shipment) : shipment)));
  }

  function handleOpenNewShipment() {
    router.push('/shipments/intake?mode=booking');
  }

  function handleAddLine() {
    if (!selectedShipment) return;
    setEditingItemId('new');
    setLineDraft(emptyDraft);
    setLineError('');
  }

  function applyLinePreset(preset: LineDraft) {
    setEditingItemId('new');
    setLineDraft(preset);
    setLineError('');
  }

  function defaultDocumentReference(
    shipment: SupplierDeskShipment,
    documentType: string,
    fallback = '',
  ) {
    const bookingSuffix = shipment.bookingNumber.replace(/^BK-/, '').replace(/^TAB-/, '').trim() || shipment.id;
    if (documentType === 'Final BL') {
      return shipment.handoff.houseBlNumber || shipment.handoff.carrierBlNumber || `HBL-${bookingSuffix}`;
    }
    if (documentType === 'BL draft') {
      return shipment.handoff.houseBlNumber || `HBL-${bookingSuffix}`;
    }
    if (documentType === 'Commercial invoice') {
      return shipment.cargoItems[0]?.invoiceRef || `INV-${bookingSuffix}`;
    }
    if (documentType === 'Packing list') {
      return shipment.cargoItems[0]?.packingListRef || `PL-${bookingSuffix}`;
    }
    if (documentType === 'Export permit / customs doc') {
      return shipment.tradeReferences?.bankPermitNumber || shipment.tradeReferences?.lcNumber || `LC-${bookingSuffix}`;
    }
    return fallback.trim();
  }

  function normalizeDocumentReference(
    shipment: SupplierDeskShipment,
    documentType: string,
    candidate: string,
  ) {
    const value = candidate.trim();
    const looksLikeFileName = /\.[a-z0-9]{2,8}$/i.test(value);
    if (!value || value === '-' || looksLikeFileName) {
      return defaultDocumentReference(shipment, documentType, value);
    }
    return value;
  }

  function handleUploadDocument(documentId: string) {
    const input = documentInputRefs.current[documentId];
    if (input) {
      input.click();
      return;
    }

    if (!selectedShipment || typeof window === 'undefined') return;
    const target = selectedShipment.documents.find((document) => document.id === documentId);
    if (!target) return;

    const referenceNumber = window.prompt(`Enter reference number for ${target.type}`, target.referenceNumber === '-' ? '' : target.referenceNumber) ?? '';
    if (!referenceNumber.trim()) return;

    updateSelectedShipment((shipment) => {
      const targetDocument = shipment.documents.find((document) => document.id === documentId);
      const documents = shipment.documents.map((document) =>
        document.id === documentId
          ? {
              ...document,
              referenceNumber: normalizeDocumentReference(shipment, document.type, referenceNumber),
              uploadedDate: new Date().toISOString().slice(0, 10),
              uploadedBy: shipment.assignedAgent || 'Origin desk',
              status: (document.type === 'BL draft' ? 'under review' : document.type === 'Final BL' ? 'uploaded' : 'uploaded') as
                | 'missing'
                | 'uploaded'
                | 'under review'
                | 'approved',
            }
          : document,
      );

      const blDraft = documents.find((document) => document.type === 'BL draft');
      const finalBl = documents.find((document) => document.type === 'Final BL');
      const nextBlStatus =
        finalBl && finalBl.status !== 'missing'
          ? 'Final uploaded'
          : blDraft && blDraft.status !== 'missing'
            ? 'Draft approved'
            : shipment.handoff.blStatus;

      return {
        ...shipment,
        documents,
        container: {
          ...shipment.container,
          sealCaptured:
            targetDocument?.type === 'Seal photo'
              ? true
              : shipment.container.sealCaptured,
          stuffingPhotoProof:
            targetDocument?.type === 'Stuffing photos'
              ? '1 file uploaded'
              : shipment.container.stuffingPhotoProof,
          sealPhotoProof:
            targetDocument?.type === 'Seal photo'
              ? '1 file uploaded'
              : shipment.container.sealPhotoProof,
        },
        currentStage:
          shipment.currentStage === 'Booking created' && shipment.cargoItems.length > 0
            ? 'Documents pending'
            : shipment.currentStage,
        handoff: {
          ...shipment.handoff,
          blStatus: nextBlStatus,
        },
        lastUpdated: new Date().toISOString(),
      };
    });
  }

  function handleDocumentFileSelected(documentId: string, file: File | null) {
    if (!selectedShipment || !file) return;

    updateSelectedShipment((shipment) => {
      const targetDocument = shipment.documents.find((document) => document.id === documentId);
      const documents = shipment.documents.map((document) =>
        document.id === documentId
          ? {
              ...document,
              referenceNumber:
                document.referenceNumber === '-'
                  ? normalizeDocumentReference(shipment, document.type, file.name)
                  : document.referenceNumber,
              uploadedDate: new Date().toISOString().slice(0, 10),
              uploadedBy: shipment.assignedAgent || 'Origin desk',
              status: (document.type === 'BL draft' ? 'under review' : 'uploaded') as
                | 'missing'
                | 'uploaded'
                | 'under review'
                | 'approved',
            }
          : document,
      );

      const blDraft = documents.find((document) => document.type === 'BL draft');
      const finalBl = documents.find((document) => document.type === 'Final BL');
      const nextBlStatus =
        finalBl && finalBl.status !== 'missing'
          ? 'Final uploaded'
          : blDraft && blDraft.status !== 'missing'
            ? 'Draft approved'
            : shipment.handoff.blStatus;

      return {
        ...shipment,
        documents,
        container: {
          ...shipment.container,
          sealCaptured:
            targetDocument?.type === 'Seal photo'
              ? true
              : shipment.container.sealCaptured,
          stuffingPhotoProof:
            targetDocument?.type === 'Stuffing photos'
              ? `${file.name} uploaded`
              : shipment.container.stuffingPhotoProof,
          sealPhotoProof:
            targetDocument?.type === 'Seal photo'
              ? `${file.name} uploaded`
              : shipment.container.sealPhotoProof,
        },
        currentStage:
          shipment.currentStage === 'Booking created' && shipment.cargoItems.length > 0
            ? 'Documents pending'
            : shipment.currentStage,
        handoff: {
          ...shipment.handoff,
          blStatus: nextBlStatus,
        },
        lastUpdated: new Date().toISOString(),
      };
    });
  }

  function handleSaveShipmentUpdates() {
    if (!selectedShipment) return;
    updateSelectedShipment((shipment) => ({
      ...shipment,
      etd: shipmentUpdateDraft.etd || shipment.etd,
      etaDjibouti: shipmentUpdateDraft.etaDjibouti || shipment.etaDjibouti,
      container: {
        ...shipment.container,
        containerNumber: shipmentUpdateDraft.containerNumber || shipment.container.containerNumber,
        containerType: shipmentUpdateDraft.containerType || shipment.container.containerType,
        sealNumber: shipmentUpdateDraft.sealNumber || shipment.container.sealNumber,
        stuffingDateTime: shipmentUpdateDraft.stuffingDateTime || shipment.container.stuffingDateTime,
        stuffingLocation: shipmentUpdateDraft.stuffingLocation || shipment.container.stuffingLocation,
        loadedBy: shipmentUpdateDraft.loadedBy || shipment.container.loadedBy,
        sealCaptured: Boolean(shipmentUpdateDraft.sealNumber || shipment.container.sealNumber) || shipment.container.sealCaptured,
      },
      handoff: {
        ...shipment.handoff,
        vesselName: shipmentUpdateDraft.vesselName || shipment.handoff.vesselName,
        voyageNumber: shipmentUpdateDraft.voyageNumber || shipment.handoff.voyageNumber,
        carrier: shipmentUpdateDraft.carrier || shipment.handoff.carrier,
      },
      lastUpdated: new Date().toISOString(),
    }));
  }

  function handleEditLine(itemId: string) {
    if (!selectedShipment) return;
    const item = selectedShipment.cargoItems.find((entry) => entry.id === itemId);
    if (!item) return;
    setEditingItemId(itemId);
    setLineDraft({
      description: item.description,
      hsCode: item.hsCode,
      packageType: item.packageType,
      packageQuantity: String(item.packageQuantity),
      grossWeightKg: String(item.grossWeightKg),
      netWeightKg: String(item.netWeightKg),
      cbm: String(item.cbm),
      marksNumbers: item.marksNumbers,
      invoiceRef: item.invoiceRef,
      packingListRef: item.packingListRef,
      remarks: item.remarks ?? '',
    });
    setLineError('');
  }

  function handleRemoveLine(itemId: string) {
    updateSelectedShipment((shipment) => ({
      ...shipment,
      cargoItems: shipment.cargoItems.filter((item) => item.id !== itemId),
      currentStage: shipment.cargoItems.length <= 1 ? 'Cargo items incomplete' : shipment.currentStage,
    }));
  }

  function handleSaveLine() {
    if (!selectedShipment) return;
    if (!lineDraft.description || !lineDraft.hsCode || !lineDraft.packageQuantity || !lineDraft.grossWeightKg) {
      setLineError('Description, HS code, quantity, and gross weight are required.');
      return;
    }

    const nextItem = {
      id: editingItemId === 'new' ? `new-${Date.now()}` : (editingItemId ?? `new-${Date.now()}`),
      lineNo:
        editingItemId === 'new'
          ? String(selectedShipment.cargoItems.length + 1).padStart(2, '0')
          : selectedShipment.cargoItems.find((item) => item.id === editingItemId)?.lineNo ?? '01',
      description: lineDraft.description,
      hsCode: lineDraft.hsCode,
      packageType: lineDraft.packageType || 'Carton',
      packageQuantity: Number(lineDraft.packageQuantity),
      netWeightKg: Number(lineDraft.netWeightKg || '0'),
      grossWeightKg: Number(lineDraft.grossWeightKg),
      cbm: Number(lineDraft.cbm || '0'),
      marksNumbers: lineDraft.marksNumbers || 'Pending marks',
      invoiceRef: lineDraft.invoiceRef || 'Pending invoice ref',
      packingListRef: lineDraft.packingListRef || 'Pending packing ref',
      remarks: lineDraft.remarks || '',
      status: 'Complete' as const,
    };

    updateSelectedShipment((shipment) => {
      const cargoItems =
        editingItemId === 'new'
          ? [...shipment.cargoItems, nextItem]
          : shipment.cargoItems.map((item) => (item.id === editingItemId ? nextItem : item));
      return {
        ...shipment,
        cargoItems,
        currentStage: shipment.currentStage === 'Cargo items incomplete' ? 'Documents pending' : shipment.currentStage,
        lastUpdated: '2026-03-19T17:48:00Z',
      };
    });

    setEditingItemId(null);
    setLineDraft(emptyDraft);
    setLineError('');
  }

  function toggleStuffingConfirmed() {
    updateSelectedShipment((shipment) => ({
      ...shipment,
      container: {
        ...shipment.container,
        stuffingConfirmed: true,
        conditionVerified: true,
        containerCondition:
          shipment.container.containerCondition === 'Pending verification'
            ? 'Verified ready for gate-in'
            : shipment.container.containerCondition,
      },
      currentStage: shipment.container.gateInConfirmed ? shipment.currentStage : 'Gate-in pending',
      lastUpdated: new Date().toISOString(),
    }));
  }

  function toggleGateInConfirmed() {
    updateSelectedShipment((shipment) => ({
      ...shipment,
      container: {
        ...shipment.container,
        stuffingConfirmed: true,
        gateInConfirmed: true,
        conditionVerified: true,
        sealCaptured: Boolean(shipment.container.sealNumber) || shipment.container.sealCaptured,
        containerCondition:
          shipment.container.containerCondition === 'Pending verification'
            ? 'Verified and gated in'
            : shipment.container.containerCondition,
      },
      handoff: { ...shipment.handoff, terminalGateInStatus: 'Confirmed' },
      currentStage: isShipmentReady({
        ...shipment,
        container: {
          ...shipment.container,
          stuffingConfirmed: true,
          gateInConfirmed: true,
          conditionVerified: true,
          sealCaptured: Boolean(shipment.container.sealNumber) || shipment.container.sealCaptured,
        },
      })
        ? 'Ready for vessel handoff'
        : 'Gate-in pending',
      lastUpdated: new Date().toISOString(),
    }));
  }

  function markReadyForHandoff() {
    if (!selectedShipment || !isShipmentReady(selectedShipment)) return;
    const nextShipment: SupplierDeskShipment = {
      ...selectedShipment,
      currentStage: 'Ready for vessel handoff',
      handoff: { ...selectedShipment.handoff, oceanHandoffStatus: 'Handed off to Djibouti release', blStatus: 'Final uploaded' },
      exceptionLabel: null,
      lastUpdated: '2026-03-19T17:55:00Z',
      exceptions: selectedShipment.exceptions.filter((item) => item.severity !== 'High'),
    };
    const nextShipments = shipments.map((shipment) => (shipment.id === selectedShipment.id ? nextShipment : shipment));
    setShipments(nextShipments);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(supplierDeskStorageKey, JSON.stringify(nextShipments));
      window.dispatchEvent(
        new CustomEvent(supplierDeskStorageUpdatedEvent, {
          detail: { key: supplierDeskStorageKey, bookingNumber: nextShipment.bookingNumber },
        }),
      );
    }
    syncSharedBookingForShippingHandoff(nextShipment);
    syncManualReleaseFromShipment(nextShipment);
  }

  if (!selectedShipment) {
    return (
      <main className="shell">
        <section className="supplier-desk-shell">
          <div className="supplier-empty-state">
            <p>No supplier shipments are available.</p>
            <button type="button" className={`supplier-desk-button supplier-desk-button-primary ${nextStepClass(true)}`} onClick={handleOpenNewShipment}>
              New Booking Intake
            </button>
          </div>
        </section>
      </main>
    );
  }

  const totalPackages = selectedShipment ? selectedShipment.cargoItems.reduce((total, item) => total + item.packageQuantity, 0) : 0;
  const totalGrossWeight = selectedShipment ? selectedShipment.cargoItems.reduce((total, item) => total + item.grossWeightKg, 0) : 0;
  const totalCbm = selectedShipment ? selectedShipment.cargoItems.reduce((total, item) => total + item.cbm, 0) : 0;
  const activeShippingWorkspaceHref = shippingWorkspaceHrefForBooking(selectedShipment?.bookingNumber);
  const completeness = selectedShipment ? `${documentCompleteCount(selectedShipment)} of ${selectedShipment.documents.length} origin documents complete` : '0 of 0 origin documents complete';
  const readyForHandoff = selectedShipment ? isShipmentReady(selectedShipment) : false;
  const checklistRows = selectedShipment
    ? ([
        ['Cargo items complete', selectedShipment.cargoItems.every((item) => item.status !== 'Missing data' && item.hsCode)],
        ['Commercial invoice uploaded', selectedShipment.documents.some((document) => document.type === 'Commercial invoice' && document.status !== 'missing')],
        ['Packing list uploaded', selectedShipment.documents.some((document) => document.type === 'Packing list' && document.status !== 'missing')],
        ['BL draft confirmed', selectedShipment.handoff.blStatus !== 'Draft pending'],
        ['Container number captured', Boolean(selectedShipment.container.containerNumber)],
        ['Seal number captured', Boolean(selectedShipment.container.sealNumber)],
        ['Stuffing complete', selectedShipment.container.stuffingConfirmed],
        ['Gate-in complete', selectedShipment.container.gateInConfirmed],
        ['ETD/ETA recorded', Boolean(selectedShipment.etd) && Boolean(selectedShipment.etaDjibouti)],
      ] as const)
    : ([] as const);
  const nextRequiredAction = !selectedShipment
    ? null
    : selectedShipment.handoff.oceanHandoffStatus === 'Handed off to Djibouti release'
      ? {
          title: 'Open Shipping Workspace',
          helper: 'Origin handoff is complete. Continue immediately with shipping instructions, bills of lading, manifest, tracking, and shipping finance.',
          href: activeShippingWorkspaceHref,
        }
    : !selectedShipment.cargoItems.length
      ? { title: 'Add the first cargo line', helper: 'Create at least one cargo item before document completion can progress.', href: '#supplier-cargo' }
      : selectedShipment.documents.some((document) => document.status === 'missing')
        ? { title: 'Finish the origin document pack', helper: 'Invoice, packing list, BL, and proof files still need to be linked.', href: '#supplier-documents' }
        : !selectedShipment.container.containerNumber || !selectedShipment.container.sealNumber
          ? { title: 'Capture container and seal', helper: 'Container number and seal number must be present before stuffing can finalize.', href: '#supplier-container' }
          : !selectedShipment.container.stuffingConfirmed || !selectedShipment.container.gateInConfirmed
            ? { title: 'Confirm stuffing and gate-in', helper: 'Complete the physical origin controls before vessel handoff.', href: '#supplier-container' }
            : !selectedShipment.etd || selectedShipment.etd === '-' || !selectedShipment.etaDjibouti || selectedShipment.etaDjibouti === '-'
              ? { title: 'Record vessel handoff dates', helper: 'ETD and ETA are still required before the file can leave origin.', href: '#supplier-handoff' }
              : !readyForHandoff
                ? { title: 'Clear the final handoff blocker', helper: 'One origin requirement is still incomplete. Check the release checklist below.', href: '#supplier-checklist' }
                : { title: 'Mark ready for vessel handoff', helper: 'The origin file is complete and can move to Djibouti release.', href: '#supplier-handoff' };
  const nextMissingDocumentId = selectedShipment?.documents.find((document) => document.status === 'missing')?.id ?? null;
  const needsContainerNumber = selectedShipment ? !hasRealValue(selectedShipment.container.containerNumber, ['Pending container number', 'Pending reefer allocation']) : false;
  const needsSealNumber = selectedShipment ? !hasRealValue(selectedShipment.container.sealNumber, ['Pending seal', 'Pending seal number']) : false;
  const needsStuffingDateTime = selectedShipment ? !selectedShipment.container.stuffingDateTime || selectedShipment.container.stuffingDateTime === 'Not scheduled' : false;
  const needsStuffingLocation = selectedShipment ? !selectedShipment.container.stuffingLocation || selectedShipment.container.stuffingLocation === 'Pending origin yard' : false;
  const needsLoadedBy = selectedShipment ? !selectedShipment.container.loadedBy || selectedShipment.container.loadedBy === 'Not assigned' || selectedShipment.container.loadedBy === 'Pending stuffing team' : false;
  const needsContainerDetails = selectedShipment ? needsContainerNumber || needsSealNumber || needsStuffingDateTime || needsStuffingLocation || needsLoadedBy : false;
  const needsStuffingConfirmation = selectedShipment ? !needsContainerDetails && !selectedShipment.container.stuffingConfirmed : false;
  const needsGateInConfirmation = selectedShipment ? !needsContainerDetails && selectedShipment.container.stuffingConfirmed && !selectedShipment.container.gateInConfirmed : false;
  const needsVesselName = selectedShipment ? !hasRealValue(selectedShipment.handoff.vesselName, ['Pending vessel']) : false;
  const needsVoyageNumber = selectedShipment ? !hasRealValue(selectedShipment.handoff.voyageNumber, ['Pending voyage']) : false;
  const needsCarrier = selectedShipment ? !hasRealValue(selectedShipment.handoff.carrier, ['Pending carrier']) : false;
  const needsEtd = selectedShipment ? !selectedShipment.etd || selectedShipment.etd === '-' : false;
  const needsEtaDjibouti = selectedShipment ? !selectedShipment.etaDjibouti || selectedShipment.etaDjibouti === '-' : false;
  const needsHandoffDetails = selectedShipment ? needsVesselName || needsVoyageNumber || needsCarrier || needsEtd || needsEtaDjibouti : false;
  const needsCargoStep = selectedShipment ? selectedShipment.cargoItems.length === 0 : false;
  const needsDocumentStep = Boolean(nextMissingDocumentId);
  const isContainerStepActive = needsContainerDetails || needsStuffingConfirmation || needsGateInConfirmation;
  const isHandoffStepActive =
    !needsCargoStep &&
    !needsDocumentStep &&
    !isContainerStepActive &&
    Boolean(selectedShipment) &&
    (needsHandoffDetails || (readyForHandoff && selectedShipment?.handoff.oceanHandoffStatus !== 'Handed off to Djibouti release'));
  const recentActivityRows = [
    {
      label: 'Current blocker',
      detail: queueBlocker(selectedShipment),
      meta: `Updated ${formatDate(selectedShipment.lastUpdated)}`,
    },
    {
      label: 'Document pack',
      detail: completeness,
      meta: `${selectedShipment.documents.filter((document) => document.status !== 'missing').length} linked in origin file`,
    },
    {
      label: 'Container control',
      detail: `${displayIfReal(selectedShipment.container.containerNumber, ['Pending container number', 'Pending reefer allocation']) || 'Not captured'} · ${displayIfReal(selectedShipment.container.sealNumber, ['Pending seal', 'Pending seal number']) || 'Not captured'}`,
      meta: selectedShipment.container.gateInConfirmed ? 'Gate-in confirmed' : 'Gate-in still pending',
    },
    {
      label: 'Ocean handoff',
      detail: selectedShipment.handoff.oceanHandoffStatus,
      meta: hasRealValue(selectedShipment.handoff.carrier, ['Pending carrier']) ? selectedShipment.handoff.carrier : 'Carrier not linked yet',
    },
  ];
  const supportNextActionHref = nextRequiredAction?.href && nextRequiredAction.href !== '#' ? nextRequiredAction.href : undefined;
  function queuePriority(shipment: SupplierDeskShipment) {
    if (shipment.exceptions.some((item) => item.severity === 'High')) return 'Critical';
    if (shipment.documents.some((document) => document.status === 'missing')) return 'Waiting';
    if (shipment.handoff.oceanHandoffStatus === 'Handed off to Djibouti release') return 'Ready';
    return 'In Progress';
  }

  function queueBlocker(shipment: SupplierDeskShipment) {
    if (shipment.exceptions[0]) return shipment.exceptions[0].issueText;
    const missingDocument = shipment.documents.find((document) => document.status === 'missing');
    if (missingDocument) return `${missingDocument.type} missing`;
    if (!shipment.container.stuffingConfirmed) return 'Stuffing confirmation pending';
    if (!shipment.container.gateInConfirmed) return 'Gate-in pending';
    return 'Ready for Djibouti release handoff';
  }

  function queueTone(shipment: SupplierDeskShipment) {
    const priority = queuePriority(shipment);
    if (priority === 'Critical') return 'critical';
    if (priority === 'Waiting') return 'warning';
    if (priority === 'Ready') return 'ready';
    return 'progress';
  }

  function requestCheckpointUpdate() {
    if (!selectedShipment) return;
    updateSelectedShipment((shipment) => ({
      ...shipment,
      lastUpdated: new Date().toISOString(),
      exceptions: shipment.exceptions.length
        ? shipment.exceptions
        : [
            {
              id: `note-${Date.now()}`,
              severity: 'Low',
              issueText: 'Checkpoint update requested from downstream corridor team.',
              actionLabel: 'Monitor update',
            },
          ],
    }));
  }

  function sendCustomerUpdate() {
    if (!selectedShipment) return;
    updateSelectedShipment((shipment) => ({
      ...shipment,
      lastUpdated: new Date().toISOString(),
    }));
  }

  function markDocsReceived() {
    if (!selectedShipment) return;
    const nextMissingDocumentId = selectedShipment.documents.find((document) => document.status === 'missing')?.id;
    if (nextMissingDocumentId) handleUploadDocument(nextMissingDocumentId);
  }

  return (
    <main className="shell">
      <section className="supplier-desk-shell">
        <header className="supplier-desk-header">
          <div className="supplier-desk-command-row">
            <div className="supplier-desk-title supplier-desk-title-compact">
              <span className="supplier-desk-eyebrow">{deskVariant === 'china' ? 'Origin workspace' : 'Operations workspace'}</span>
              <h1>{deskVariant === 'china' ? 'Origin Queue and File Control' : 'Shipment Queue'}</h1>
              <p>{deskVariant === 'china' ? 'Queue on the left, live origin file on the right.' : 'Monitor, assign, and advance active shipment files.'}</p>
            </div>
            <div className="supplier-desk-primary-actions">
              <Link href="/shipments/intake?mode=booking" className="supplier-desk-button supplier-desk-button-primary" data-testid={deskVariant === 'china' ? 'china-new-booking-intake' : 'operations-book-shipment'}>{deskVariant === 'china' ? 'New Booking Intake' : 'Book Shipment'}</Link>
              <Link href="/shipments/intake?mode=quote" className="supplier-desk-button supplier-desk-button-secondary" data-testid={deskVariant === 'china' ? 'china-new-quote' : 'operations-get-quote'}>{deskVariant === 'china' ? 'New Quote' : 'Get Quote'}</Link>
            </div>
          </div>
          <div className="supplier-desk-toolbar supplier-desk-filter-row">
            <input
              data-testid={deskVariant === 'china' ? 'china-queue-search' : 'shipment-queue-search'}
              className="supplier-desk-input"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder={deskVariant === 'china' ? 'Search booking, customer, supplier' : 'Search booking, customer, supplier'}
            />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | SupplierDeskStage)} className="supplier-desk-select">
              <option value="all">All statuses</option>
              {stageOrder.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
            <select value={supplierFilter} onChange={(event) => setSupplierFilter(event.target.value)} className="supplier-desk-select">
              {supplierOptions.map((supplier) => (
                <option key={supplier} value={supplier}>
                  {supplier === 'all' ? 'All suppliers' : supplier}
                </option>
              ))}
            </select>
            <label className="supplier-inline-toggle">
              <input type="checkbox" checked={blockedOnly} onChange={(event) => setBlockedOnly(event.target.checked)} />
              <span>Blocked only</span>
            </label>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value as 'updated' | 'priority' | 'stage')} className="supplier-desk-select">
              <option value="updated">Sort: Last updated</option>
              <option value="priority">Sort: Priority</option>
              <option value="stage">Sort: Stage</option>
            </select>
            <select value={dateRange} onChange={(event) => setDateRange(event.target.value as 'all' | '7d' | '14d' | '30d')} className="supplier-desk-select">
              <option value="all">All dates</option>
              <option value="7d">Last 7 days</option>
              <option value="14d">Last 14 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>
        </header>

        <section className="supplier-main-grid">
          <article className="supplier-panel supplier-queue-panel">
            <div className="supplier-queue-summary-strip">
              <button type="button" className={`supplier-queue-summary-card ${statusFilter === 'all' && !blockedOnly ? 'is-active' : ''}`} onClick={() => { setStatusFilter('all'); setBlockedOnly(false); }}>
                <span>Open</span>
                <strong>{queueSummary.open}</strong>
              </button>
              <button type="button" className={`supplier-queue-summary-card ${blockedOnly && statusFilter === 'all' ? 'is-active' : ''}`} onClick={() => { setStatusFilter('all'); setBlockedOnly(true); }}>
                <span>Blocked</span>
                <strong>{queueSummary.blocked}</strong>
              </button>
              <button type="button" className={`supplier-queue-summary-card ${blockedOnly && statusFilter === 'Documents pending' ? 'is-active' : ''}`} onClick={() => { setStatusFilter('Documents pending'); setBlockedOnly(true); }}>
                <span>Awaiting docs</span>
                <strong>{queueSummary.awaitingDocs}</strong>
              </button>
              <button type="button" className={`supplier-queue-summary-card ${statusFilter === 'Ready for vessel handoff' ? 'is-active' : ''}`} onClick={() => { setStatusFilter('Ready for vessel handoff'); setBlockedOnly(false); }}>
                <span>Ready to dispatch</span>
                <strong>{queueSummary.readyToDispatch}</strong>
              </button>
            </div>
            <header className="supplier-panel-header">
              <div>
                <span className="supplier-panel-eyebrow">Queue</span>
                <h2>Origin file queue</h2>
              </div>
              <p>{queueRows.length} active files</p>
            </header>
            <div className="supplier-queue-list" data-testid={deskVariant === 'china' ? 'china-desk-queue' : 'shipment-queue'}>
              {queueRows.map((shipment) => (
                <button
                  key={shipment.id}
                  type="button"
                  className={shipment.id === selectedShipment?.id ? `supplier-queue-row active supplier-queue-row-${queueTone(shipment)}` : `supplier-queue-row supplier-queue-row-${queueTone(shipment)}`}
                  onPointerDown={() => handleSelectShipment(shipment.id)}
                  onClick={() => handleSelectShipment(shipment.id)}
                  data-testid={`queue-row-${shipment.bookingNumber}`}
                >
                  <div className="supplier-queue-topline">
                    <strong>{shipment.bookingNumber}</strong>
                    <span className={`supplier-chip supplier-chip-${queueTone(shipment)}`}>{queuePriority(shipment)}</span>
                  </div>
                  <span>{shipment.customerName}</span>
                  <span>{shipment.originPort} {'->'} {shipment.finalDestination}</span>
                  <div className="supplier-queue-meta">
                    <span>{shipment.currentStage}</span>
                    <span>{shipment.serviceType}</span>
                    <span>{shipment.assignedAgent}</span>
                  </div>
                  <p>{queueBlocker(shipment)}</p>
                  <div className="supplier-queue-meta">
                    <span>{shipment.supplierName}</span>
                    <span>Updated {formatDate(shipment.lastUpdated)}</span>
                  </div>
                </button>
              ))}
              {queueRows.length === 0 ? <div className="supplier-empty-state">No origin shipment yet. Click <strong>New Booking Intake</strong> to start from booking.</div> : null}
            </div>
          </article>

          <div className="supplier-center-column">
            {!selectedShipment ? (
              <article className="supplier-panel supplier-main-empty">
                <header className="supplier-panel-header">
                  <div>
                    <span className="supplier-panel-eyebrow">Booking Start</span>
                    <h2>No shipment selected yet</h2>
                  </div>
                  <p>Create the booking header first, then continue with cargo lines and documents.</p>
                </header>
                <div className="supplier-empty-state">
                  <p>The queue is clean and ready for a new origin booking.</p>
                  <button type="button" className={`supplier-desk-button supplier-desk-button-primary ${nextStepClass(true)}`} onClick={handleOpenNewShipment}>
                    New Booking Intake
                  </button>
                </div>
              </article>
            ) : (
              <>
                <article className="supplier-panel supplier-selected-header-panel" id="supplier-booking" data-testid={deskVariant === 'china' ? 'china-selected-shipment' : 'selected-shipment'}>
                  <header className="supplier-panel-header">
                    <div>
                      <span className="supplier-panel-eyebrow">Selected file</span>
                      <h2>{selectedShipment.bookingNumber}</h2>
                      <p>{selectedShipment.customerName} · {selectedShipment.originPort} {'->'} {selectedShipment.finalDestination}</p>
                    </div>
                    <div className="supplier-inline-actions">
                      <button type="button" className="supplier-desk-button supplier-desk-button-secondary" onClick={handleOpenNewShipment}>Assign</button>
                      {selectedShipment.handoff.oceanHandoffStatus === 'Handed off to Djibouti release' ? (
                        <Link href={activeShippingWorkspaceHref} className="supplier-desk-button supplier-desk-button-primary supplier-next-step-button">
                          Open Shipping Workspace
                        </Link>
                      ) : (
                        <button type="button" className="supplier-desk-button supplier-desk-button-secondary" onClick={markReadyForHandoff}>Advance Stage</button>
                      )}
                      <button type="button" className="supplier-desk-button supplier-desk-button-secondary" onClick={sendCustomerUpdate}>Add Note</button>
                      <Link href={`/operations/booking-quote?booking=${encodeURIComponent(selectedShipment.bookingNumber)}`} className="supplier-desk-button supplier-desk-button-secondary">Open Full Journey</Link>
                    </div>
                  </header>
                  <div className="supplier-detail-summary">
                    <div className="supplier-detail-item"><span>Customer</span><strong>{selectedShipment.customerName}</strong></div>
                    <div className="supplier-detail-item"><span>Supplier</span><strong>{selectedShipment.supplierName}</strong></div>
                    <div className="supplier-detail-item"><span>Service type</span><strong>{selectedShipment.serviceType}</strong></div>
                    <div className="supplier-detail-item"><span>Port of loading</span><strong>{selectedShipment.originPort}</strong></div>
                    <div className="supplier-detail-item"><span>Port of discharge</span><strong>{selectedShipment.dischargePort}</strong></div>
                    <div className="supplier-detail-item"><span>Customer final delivery</span><strong>{selectedShipment.finalDestination}</strong></div>
                    <div className="supplier-detail-item"><span>Incoterm</span><strong>{selectedShipment.incoterm}</strong></div>
                    <div className="supplier-detail-item"><span>Assigned agent</span><strong>{selectedShipment.assignedAgent}</strong></div>
                    <div className="supplier-detail-item"><span>Current stage</span><strong>{selectedShipment.currentStage}</strong></div>
                    <div className="supplier-detail-item"><span>Current owner desk</span><strong>Port Agent Desk</strong></div>
                    <div className="supplier-detail-item"><span>Container / seal</span><strong>{selectedShipment.container.containerNumber || 'Pending'} · {selectedShipment.container.sealNumber || 'Pending'}</strong></div>
                    <div className="supplier-detail-item"><span>Quote reference</span><strong>{selectedShipment.bookingNumber.replace('TB', 'QT')}</strong></div>
                  </div>
                  <div className="supplier-progress-strip">
                    {progressLabels.map((label, index) => {
                      const state =
                        index < selectedShipmentIndex
                          ? 'done'
                          : index === selectedShipmentIndex
                            ? 'active'
                            : index === selectedShipmentIndex + 1
                              ? 'next'
                              : 'upcoming';
                      const href =
                        index === 0
                          ? '#supplier-booking'
                          : index === 1
                            ? '#supplier-cargo'
                            : index === 2
                              ? '#supplier-documents'
                              : index === 3 || index === 4 || index === 5
                                ? '#supplier-container'
                                : selectedShipment.handoff.oceanHandoffStatus === 'Handed off to Djibouti release'
                                  ? activeShippingWorkspaceHref
                                  : '#supplier-handoff';
                      return (
                        href.startsWith('/shipping') ? (
                          <Link key={label} href={href} className={`supplier-progress-step supplier-progress-link supplier-progress-${state}`}>
                            <span>{index + 1}</span>
                            <strong>{label}</strong>
                          </Link>
                        ) : (
                          <a key={label} href={href} className={`supplier-progress-step supplier-progress-link supplier-progress-${state}`}>
                            <span>{index + 1}</span>
                            <strong>{label}</strong>
                          </a>
                        )
                      );
                    })}
                  </div>
                </article>

                <article className={`supplier-panel supplier-work-panel-wide ${activeStepPanelClass(needsCargoStep)}`} id="supplier-cargo">
                  <header className="supplier-panel-header">
                    <div>
                      <span className={`supplier-panel-eyebrow ${activeStepPanelClass(needsCargoStep)}`}>Step 2</span>
                      <h2>Cargo Items</h2>
                    </div>
                    <div className="supplier-inline-actions">
                      <button type="button" className={`supplier-desk-button supplier-desk-button-primary ${nextStepClass(!editingItemId && selectedShipment.cargoItems.length === 0)}`} onClick={handleAddLine}>
                        Add line item
                      </button>
                    </div>
                  </header>
                  {editingItemId ? (
                    <div className="supplier-line-editor">
                      <div className="supplier-panel-header console-gap-bottom-sm">
                        <div>
                          <span className="supplier-panel-eyebrow">Line Entry</span>
                          <h2>{editingItemId === 'new' ? 'New line item' : 'Edit line item'}</h2>
                        </div>
                        <p>Enter the cargo line now, then save it into the shipment.</p>
                      </div>
                      <div className="supplier-inline-actions console-wrap-actions console-gap-bottom-md">
                        {lineItemPresets.map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            className="supplier-desk-button supplier-desk-button-secondary"
                            onClick={() => applyLinePreset(preset.draft)}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                      <div className="supplier-form-grid">
                        <input className="supplier-desk-input" value={lineDraft.description} onChange={(event) => setLineDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Goods description" />
                        <input className="supplier-desk-input" value={lineDraft.hsCode} onChange={(event) => setLineDraft((current) => ({ ...current, hsCode: event.target.value }))} placeholder="HS code" />
                        <input className="supplier-desk-input" value={lineDraft.packageType} onChange={(event) => setLineDraft((current) => ({ ...current, packageType: event.target.value }))} placeholder="Package type" />
                        <input className="supplier-desk-input" value={lineDraft.packageQuantity} onChange={(event) => setLineDraft((current) => ({ ...current, packageQuantity: event.target.value }))} placeholder="Package quantity" />
                        <input className="supplier-desk-input" value={lineDraft.netWeightKg} onChange={(event) => setLineDraft((current) => ({ ...current, netWeightKg: event.target.value }))} placeholder="Net weight" />
                        <input className="supplier-desk-input" value={lineDraft.grossWeightKg} onChange={(event) => setLineDraft((current) => ({ ...current, grossWeightKg: event.target.value }))} placeholder="Gross weight" />
                        <input className="supplier-desk-input" value={lineDraft.cbm} onChange={(event) => setLineDraft((current) => ({ ...current, cbm: event.target.value }))} placeholder="CBM" />
                        <input className="supplier-desk-input" value={lineDraft.marksNumbers} onChange={(event) => setLineDraft((current) => ({ ...current, marksNumbers: event.target.value }))} placeholder="Marks / numbers" />
                        <input className="supplier-desk-input" value={lineDraft.invoiceRef} onChange={(event) => setLineDraft((current) => ({ ...current, invoiceRef: event.target.value }))} placeholder="Invoice ref" />
                        <input className="supplier-desk-input" value={lineDraft.packingListRef} onChange={(event) => setLineDraft((current) => ({ ...current, packingListRef: event.target.value }))} placeholder="Packing list ref" />
                        <input className="supplier-desk-input" value={lineDraft.remarks} onChange={(event) => setLineDraft((current) => ({ ...current, remarks: event.target.value }))} placeholder="Remarks" />
                      </div>
                      {lineError ? <p className="supplier-form-error">{lineError}</p> : null}
                      <div className="supplier-inline-actions">
                        <button type="button" className={`supplier-desk-button supplier-desk-button-primary ${nextStepClass(Boolean(editingItemId))}`} onClick={handleSaveLine}>Save line</button>
                        <button type="button" className="supplier-desk-button supplier-desk-button-secondary" onClick={() => { setEditingItemId(null); setLineDraft(emptyDraft); setLineError(''); }}>Cancel</button>
                      </div>
                    </div>
                  ) : null}
                  <div className="supplier-cargo-list">
                    {selectedShipment.cargoItems.map((item) => (
                      <div key={item.id} className="supplier-cargo-row">
                        <div className="supplier-cargo-primary">
                          <strong>Line {item.lineNo}</strong>
                          <span>{item.description}</span>
                          <p>HS {item.hsCode || 'Missing'} · {item.packageQuantity} {item.packageType.toLowerCase()} · {item.grossWeightKg.toLocaleString()} kg · {item.cbm.toFixed(1)} CBM</p>
                        </div>
                        <div className="supplier-cargo-meta">
                          <span>{item.invoiceRef} / {item.packingListRef}</span>
                          <span>{item.marksNumbers}</span>
                          {item.remarks ? <span>{item.remarks}</span> : null}
                        </div>
                        <div className="supplier-row-actions">
                          <span className={item.status === 'Complete' ? 'supplier-chip supplier-chip-ready' : 'supplier-chip supplier-chip-warning'}>{item.status}</span>
                          <button type="button" onClick={() => handleEditLine(item.id)}>Edit</button>
                          <button type="button" onClick={() => handleRemoveLine(item.id)}>Remove</button>
                        </div>
                      </div>
                    ))}
                    {selectedShipment.cargoItems.length === 0 ? (
                      <div className="supplier-empty-state">
                        <p>No cargo line yet. Start with the first item line for this booking.</p>
                        <button type="button" className={`supplier-desk-button supplier-desk-button-primary ${nextStepClass(selectedShipment.cargoItems.length === 0)}`} onClick={handleAddLine}>
                          Add first line item
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <footer className="supplier-cargo-footer">
                    <span>Total lines: {selectedShipment.cargoItems.length}</span>
                    <span>Total packages: {totalPackages}</span>
                    <span>Gross: {totalGrossWeight.toLocaleString()} kg</span>
                    <span>Total CBM: {totalCbm.toFixed(1)}</span>
                    <span>{grossWeightLimitStatus(totalGrossWeight)}</span>
                  </footer>
                </article>

                <div className="supplier-active-work-grid">
                  <section className="supplier-work-top-grid">
              <article className={`supplier-panel supplier-work-panel-wide supplier-work-panel-span-full ${activeStepPanelClass(needsDocumentStep)}`} id="supplier-documents">
                <header className="supplier-panel-header">
                  <div>
                    <span className={`supplier-panel-eyebrow ${activeStepPanelClass(needsDocumentStep)}`}>Step 3</span>
                    <h2>Documents</h2>
                  </div>
                  <p className="supplier-completeness-banner">{completeness}</p>
                </header>
                <div className="supplier-document-list">
                  {selectedShipment.documents.map((document) => (
                    <div key={document.id} className="supplier-document-row">
                      <div className="supplier-document-primary">
                        <strong>{document.type}</strong>
                        <span>{document.referenceNumber}</span>
                      </div>
                      <div className="supplier-document-meta">
                        <span>{document.uploadedDate} · {document.uploadedBy}</span>
                      </div>
                      <div className="supplier-document-actions">
                        <span className={`supplier-chip supplier-chip-${document.status.replace(/\s+/g, '-')}`}>{document.status}</span>
                        <button type="button" className={nextStepClass(nextMissingDocumentId === document.id)} onClick={() => handleUploadDocument(document.id)}>Upload</button>
                        <input
                          ref={(node) => {
                            documentInputRefs.current[document.id] = node;
                          }}
                          type="file"
                          accept="image/*,.pdf"
                          capture="environment"
                          hidden
                          onChange={(event) => {
                            handleDocumentFileSelected(document.id, event.target.files?.[0] ?? null);
                            event.currentTarget.value = '';
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <footer className="supplier-documents-footer">
                  <span>Upload file or take photo.</span>
                  <span>Invoice and packing list still need manual cargo review.</span>
                </footer>
              </article>
                  </section>

            <article className={`supplier-panel supplier-work-panel-wide supplier-container-panel-large ${activeStepPanelClass(isContainerStepActive)}`} id="supplier-container">
              <header className="supplier-panel-header">
                <div>
                  <span className={`supplier-panel-eyebrow ${activeStepPanelClass(isContainerStepActive)}`}>Step 4-6</span>
                  <h2>Container &amp; Stuffing</h2>
                </div>
              </header>
              <div className="supplier-line-editor console-gap-bottom-md">
                <div className="supplier-panel-header console-gap-bottom-sm">
                  <div>
                    <span className="supplier-panel-eyebrow">Update</span>
                    <h2>Fill missing container and seal details</h2>
                  </div>
                  <p>These fields must be present before vessel handoff can become ready.</p>
                </div>
                <div className="supplier-form-grid supplier-container-form-grid">
                  <label className={`supplier-field-block ${needsContainerNumber ? 'supplier-next-step-field' : ''}`}>
                    <span className="supplier-field-label">Container number</span>
                    <input data-testid="china-field-container-number" className="supplier-desk-input" value={shipmentUpdateDraft.containerNumber} onChange={(event) => setShipmentUpdateDraft((current) => ({ ...current, containerNumber: event.target.value }))} placeholder="Enter container number" />
                    <small className="supplier-field-help">Enter the full ISO container number, for example `MSCU3344556`.</small>
                  </label>
                  <label className="supplier-field-block">
                    <span className="supplier-field-label">Container type</span>
                    <select data-testid="china-field-container-type" className="supplier-desk-select" value={shipmentUpdateDraft.containerType} onChange={(event) => setShipmentUpdateDraft((current) => ({ ...current, containerType: event.target.value }))}>
                      <option value="20FT">20FT</option>
                      <option value="40FT">40FT</option>
                    </select>
                    <small className="supplier-field-help">Select the actual container size used for stuffing.</small>
                  </label>
                  <label className={`supplier-field-block ${needsSealNumber ? 'supplier-next-step-field' : ''}`}>
                    <span className="supplier-field-label">Seal number</span>
                    <input data-testid="china-field-seal-number" className="supplier-desk-input" value={shipmentUpdateDraft.sealNumber} onChange={(event) => setShipmentUpdateDraft((current) => ({ ...current, sealNumber: event.target.value }))} placeholder="Enter seal number" />
                    <small className="supplier-field-help">Use the physical seal number applied after stuffing.</small>
                  </label>
                  <label className={`supplier-field-block ${needsStuffingDateTime ? 'supplier-next-step-field' : ''}`}>
                    <span className="supplier-field-label">Stuffing date / time</span>
                    <input data-testid="china-field-stuffing-datetime" className="supplier-desk-input" value={shipmentUpdateDraft.stuffingDateTime} onChange={(event) => setShipmentUpdateDraft((current) => ({ ...current, stuffingDateTime: event.target.value }))} placeholder="Select stuffing date and time" />
                    <small className="supplier-field-help">Record when cargo loading into the container was completed.</small>
                  </label>
                  <label className={`supplier-field-block ${needsStuffingLocation ? 'supplier-next-step-field' : ''}`}>
                    <span className="supplier-field-label">Stuffing location</span>
                    <input data-testid="china-field-stuffing-location" className="supplier-desk-input" value={shipmentUpdateDraft.stuffingLocation} onChange={(event) => setShipmentUpdateDraft((current) => ({ ...current, stuffingLocation: event.target.value }))} placeholder="Enter stuffing location" />
                    <small className="supplier-field-help">Example: factory yard, export terminal, or stuffing warehouse.</small>
                  </label>
                  <label className={`supplier-field-block ${needsLoadedBy ? 'supplier-next-step-field' : ''}`}>
                    <span className="supplier-field-label">Loaded by</span>
                    <input data-testid="china-field-loaded-by" className="supplier-desk-input" value={shipmentUpdateDraft.loadedBy} onChange={(event) => setShipmentUpdateDraft((current) => ({ ...current, loadedBy: event.target.value }))} placeholder="Enter team or staff name" />
                    <small className="supplier-field-help">Enter the team, shift, or warehouse staff responsible for stuffing.</small>
                  </label>
                </div>
                <div className="supplier-inline-actions">
                  <button type="button" className={`supplier-desk-button supplier-desk-button-primary ${nextStepClass(!needsContainerDetails && isContainerStepActive)}`} onClick={handleSaveShipmentUpdates} data-testid="china-save-container-details">
                    Save container details
                  </button>
                </div>
              </div>
              <div className="supplier-two-column supplier-nested-grid supplier-container-summary-layout">
                <div className="supplier-detail-summary supplier-container-detail-summary">
                  <div className="supplier-detail-item"><span>Container number</span><strong>{displayIfReal(selectedShipment.container.containerNumber, ['Pending container number', 'Pending reefer allocation']) || 'Not captured'}</strong></div>
                  <div className="supplier-detail-item"><span>Container type</span><strong>{selectedShipment.container.containerType}</strong></div>
                  <div className="supplier-detail-item"><span>Seal number</span><strong>{displayIfReal(selectedShipment.container.sealNumber, ['Pending seal', 'Pending seal number']) || 'Not captured'}</strong></div>
                  <div className="supplier-detail-item"><span>Stuffing date / time</span><strong>{selectedShipment.container.stuffingDateTime}</strong></div>
                  <div className="supplier-detail-item"><span>Stuffing location</span><strong>{selectedShipment.container.stuffingLocation}</strong></div>
                  <div className="supplier-detail-item"><span>Loaded by</span><strong>{selectedShipment.container.loadedBy}</strong></div>
                  <div className="supplier-detail-item"><span>Container condition</span><strong>{selectedShipment.container.containerCondition}</strong></div>
                  <div className="supplier-detail-item"><span>Stuffing photo proof</span><strong>{selectedShipment.container.stuffingPhotoProof}</strong></div>
                  <div className="supplier-detail-item"><span>Seal photo proof</span><strong>{selectedShipment.container.sealPhotoProof}</strong></div>
                </div>
                <div className="supplier-checklist-card">
                  <div className={selectedShipment.container.stuffingConfirmed ? 'supplier-check-item is-complete' : 'supplier-check-item is-pending'}>
                    <span>Stuffing confirmed</span>
                    {selectedShipment.container.stuffingConfirmed ? (
                      <strong>Done</strong>
                    ) : (
                      <button type="button" className={`supplier-desk-button supplier-desk-button-secondary ${nextStepClass(needsStuffingConfirmation)}`} onClick={toggleStuffingConfirmed} data-testid="china-confirm-stuffing">
                        Confirm stuffing
                      </button>
                    )}
                  </div>
                  <div className={selectedShipment.container.sealCaptured ? 'supplier-check-item is-complete' : 'supplier-check-item is-blocked'}>
                    <span>Seal captured</span>
                    <strong>{selectedShipment.container.sealCaptured ? 'Yes' : 'No'}</strong>
                  </div>
                  <div className={selectedShipment.container.conditionVerified ? 'supplier-check-item is-complete' : 'supplier-check-item is-blocked'}>
                    <span>Container condition verified</span>
                    <strong>{selectedShipment.container.conditionVerified ? 'Yes' : 'No'}</strong>
                  </div>
                  <div className={selectedShipment.container.gateInConfirmed ? 'supplier-check-item is-complete' : 'supplier-check-item is-pending'}>
                    <span>Gate-in confirmed</span>
                    {selectedShipment.container.gateInConfirmed ? (
                      <strong>Done</strong>
                    ) : (
                      <button type="button" className={`supplier-desk-button supplier-desk-button-primary ${nextStepClass(needsGateInConfirmation)}`} onClick={toggleGateInConfirmed} data-testid="china-confirm-gate-in">
                        Confirm gate-in
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </article>

              <article className={`supplier-panel supplier-work-panel-wide ${activeStepPanelClass(isHandoffStepActive)}`} id="supplier-handoff">
                <header className="supplier-panel-header">
                  <div>
                    <span className={`supplier-panel-eyebrow ${activeStepPanelClass(isHandoffStepActive)}`}>Step 7</span>
                    <h2>Ocean Handoff</h2>
                  </div>
                </header>
                <div className="supplier-line-editor console-gap-bottom-md">
                  <div className="supplier-panel-header console-gap-bottom-sm">
                    <div>
                      <span className="supplier-panel-eyebrow">Update</span>
                      <h2>Fill vessel handoff details</h2>
                    </div>
                    <p>Vessel, voyage, ETD, and ETA must be captured before origin handoff can complete.</p>
                  </div>
                  <div className="supplier-form-grid">
                    <label className={`supplier-field-block ${needsVesselName ? 'supplier-next-step-field' : ''}`}>
                      <span className="supplier-field-label">Vessel name</span>
                      <input data-testid="china-field-vessel-name" className="supplier-desk-input" value={shipmentUpdateDraft.vesselName} onChange={(event) => setShipmentUpdateDraft((current) => ({ ...current, vesselName: event.target.value }))} placeholder="Enter vessel name" />
                      <small className="supplier-field-help">Enter the vessel name exactly as shown on the carrier schedule.</small>
                    </label>
                    <label className={`supplier-field-block ${needsVoyageNumber ? 'supplier-next-step-field' : ''}`}>
                      <span className="supplier-field-label">Voyage number</span>
                      <input data-testid="china-field-voyage-number" className="supplier-desk-input" value={shipmentUpdateDraft.voyageNumber} onChange={(event) => setShipmentUpdateDraft((current) => ({ ...current, voyageNumber: event.target.value }))} placeholder="Enter voyage number" />
                      <small className="supplier-field-help">Use the carrier sailing or voyage reference for this vessel call.</small>
                    </label>
                    <label className={`supplier-field-block ${needsCarrier ? 'supplier-next-step-field' : ''}`}>
                      <span className="supplier-field-label">Carrier / shipping line</span>
                      <input data-testid="china-field-carrier" className="supplier-desk-input" value={shipmentUpdateDraft.carrier} onChange={(event) => setShipmentUpdateDraft((current) => ({ ...current, carrier: event.target.value }))} placeholder="Enter carrier or shipping line" />
                      <small className="supplier-field-help">Example: MSC, Maersk, CMA CGM, COSCO.</small>
                    </label>
                    <label className={`supplier-field-block ${needsEtd ? 'supplier-next-step-field' : ''}`}>
                      <span className="supplier-field-label">ETD</span>
                      <input data-testid="china-field-etd" className="supplier-desk-input" value={shipmentUpdateDraft.etd} onChange={(event) => setShipmentUpdateDraft((current) => ({ ...current, etd: event.target.value }))} placeholder="Select ETD" />
                      <small className="supplier-field-help">Departure date and time from the origin port.</small>
                    </label>
                    <label className={`supplier-field-block ${needsEtaDjibouti ? 'supplier-next-step-field' : ''}`}>
                      <span className="supplier-field-label">ETA Djibouti</span>
                      <input data-testid="china-field-eta-djibouti" className="supplier-desk-input" value={shipmentUpdateDraft.etaDjibouti} onChange={(event) => setShipmentUpdateDraft((current) => ({ ...current, etaDjibouti: event.target.value }))} placeholder="Select ETA Djibouti" />
                      <small className="supplier-field-help">Expected vessel arrival date and time in Djibouti.</small>
                    </label>
                  </div>
                  <div className="supplier-inline-actions">
                    <button type="button" className={`supplier-desk-button supplier-desk-button-primary ${nextStepClass(!needsHandoffDetails && isHandoffStepActive && !readyForHandoff)}`} onClick={handleSaveShipmentUpdates} data-testid="china-save-vessel-handoff">
                      Save vessel handoff details
                    </button>
                  </div>
                </div>
                <div className="supplier-two-column supplier-nested-grid">
                  <div className="supplier-detail-summary">
                    <div className="supplier-detail-item"><span>Vessel name</span><strong>{displayIfReal(selectedShipment.handoff.vesselName, ['Pending vessel']) || 'Not captured'}</strong></div>
                    <div className="supplier-detail-item"><span>Voyage number</span><strong>{displayIfReal(selectedShipment.handoff.voyageNumber, ['Pending voyage']) || 'Not captured'}</strong></div>
                    <div className="supplier-detail-item"><span>ETD</span><strong>{formatDate(selectedShipment.etd)}</strong></div>
                    <div className="supplier-detail-item"><span>ETA Djibouti</span><strong>{formatDate(selectedShipment.etaDjibouti)}</strong></div>
                    <div className="supplier-detail-item"><span>Terminal gate-in status</span><strong>{selectedShipment.handoff.terminalGateInStatus}</strong></div>
                    <div className="supplier-detail-item"><span>Carrier / shipping line</span><strong>{displayIfReal(selectedShipment.handoff.carrier, ['Pending carrier']) || 'Not captured'}</strong></div>
                    <div className="supplier-detail-item"><span>BL status</span><strong>{selectedShipment.handoff.blStatus}</strong></div>
                    <div className="supplier-detail-item"><span>Ocean handoff status</span><strong>{selectedShipment.handoff.oceanHandoffStatus}</strong></div>
                  </div>
                  <div className="supplier-checklist-card">
                    <div className={selectedShipment.container.gateInConfirmed ? 'supplier-check-item is-complete' : 'supplier-check-item is-pending'}><span>Gate-in confirmed</span><strong>{selectedShipment.container.gateInConfirmed ? 'Done' : 'Pending'}</strong></div>
                    <div className={selectedShipment.handoff.blStatus !== 'Draft pending' ? 'supplier-check-item is-complete' : 'supplier-check-item is-pending'}><span>BL draft approved</span><strong>{selectedShipment.handoff.blStatus !== 'Draft pending' ? 'Done' : 'Pending'}</strong></div>
                    <div className={selectedShipment.handoff.blStatus === 'Final uploaded' ? 'supplier-check-item is-complete' : 'supplier-check-item is-pending'}><span>Final BL uploaded</span><strong>{selectedShipment.handoff.blStatus === 'Final uploaded' ? 'Done' : 'Pending'}</strong></div>
                    <div className={readyForHandoff ? 'supplier-check-item is-complete' : 'supplier-check-item is-blocked'}><span>Ready for carrier handoff</span><strong>{readyForHandoff ? 'Yes' : 'No'}</strong></div>
                    {selectedShipment.handoff.oceanHandoffStatus === 'Handed off to Djibouti release' ? (
                      <div className="supplier-check-item is-complete">
                        <span>Origin handoff</span>
                        <strong>Done</strong>
                      </div>
                    ) : (
                      <button type="button" className={`supplier-desk-button supplier-desk-button-primary supplier-cta ${nextStepClass(readyForHandoff && !needsHandoffDetails)}`} disabled={!readyForHandoff} onClick={markReadyForHandoff} data-testid="china-handoff-to-djibouti">
                        Mark ready for vessel handoff
                      </button>
                    )}
                  </div>
                </div>
              </article>

                <article className="supplier-panel supplier-activity-panel">
                  <header className="supplier-panel-header">
                    <div>
                      <span className="supplier-panel-eyebrow">Documents / Notes / History</span>
                      <h2>Recent activity</h2>
                    </div>
                    <p>Latest status, document, and handoff signals for this origin file.</p>
                  </header>
                  <div className="supplier-activity-grid">
                    {recentActivityRows.map((row) => (
                      <div key={row.label} className="supplier-activity-card">
                        <span>{row.label}</span>
                        <strong>{row.detail}</strong>
                        <p>{row.meta}</p>
                      </div>
                    ))}
                  </div>
                </article>
                </div>
              </>
            )}
          </div>

          {selectedShipment ? (
            <aside className="supplier-support-column">
              <article className="supplier-panel supplier-control-panel">
                <header className="supplier-panel-header">
                  <div>
                    <span className="supplier-panel-eyebrow">Next action</span>
                    <h2>Handoff control</h2>
                  </div>
                  <p>Keep the file moving without leaving this desk.</p>
                </header>
                <div className="supplier-control-grid supplier-control-grid-compact">
                  <div className="supplier-control-card supplier-control-card-primary supplier-next-step-button">
                    <span className="supplier-panel-eyebrow">Next required step</span>
                    <strong>{nextRequiredAction?.title}</strong>
                    <p>{nextRequiredAction?.helper}</p>
                    {supportNextActionHref ? (
                      <a className="supplier-command-link" href={supportNextActionHref}>
                        Open required section
                      </a>
                    ) : null}
                  </div>
                  <div className="supplier-control-card">
                    <span className="supplier-panel-eyebrow">Current blocker</span>
                    <strong>{queueBlocker(selectedShipment)}</strong>
                    <p>Owner: {selectedShipment.assignedAgent} · Desk: Port Agent Desk</p>
                  </div>
                  <div className="supplier-control-card">
                    <span className="supplier-panel-eyebrow">File readiness</span>
                    <strong>{readyForHandoff ? 'Ready for Djibouti release' : 'Origin file still in progress'}</strong>
                    <p>{completeness}. Cargo: {selectedShipment.cargoItems.length} lines. Weight plan: {grossWeightLimitStatus(totalGrossWeight)}.</p>
                  </div>
                  <div className="supplier-control-card">
                    <span className="supplier-panel-eyebrow">Jump to</span>
                    <div className="supplier-jump-links">
                      <a className="supplier-jump-link" href="#supplier-cargo">Cargo</a>
                      <a className="supplier-jump-link" href="#supplier-documents">Documents</a>
                      <a className="supplier-jump-link" href="#supplier-container">Container</a>
                      <a className="supplier-jump-link" href="#supplier-handoff">Handoff</a>
                      <a className="supplier-jump-link" href="#supplier-checklist">Checklist</a>
                    </div>
                  </div>
                </div>
              </article>

              <article className="supplier-panel supplier-support-panel" id="supplier-checklist">
                <div className="supplier-support-subpanel">
                  <header className="supplier-panel-header">
                    <div>
                      <span className="supplier-panel-eyebrow">Origin issues</span>
                      <h2>Origin Exceptions</h2>
                    </div>
                  </header>
                  <div className="supplier-exception-list">
                    {(selectedShipment.exceptions.length ? selectedShipment.exceptions : [{ id: 'none', severity: 'Low', issueText: 'No open origin exceptions on this shipment.', actionLabel: 'Monitor' }]).map((exception) => (
                      <div key={exception.id} className="supplier-exception-row">
                        <span className={`supplier-chip supplier-chip-${exception.severity.toLowerCase()}`}>{exception.severity}</span>
                        <div>
                          <strong>{exception.issueText}</strong>
                          <button type="button" onClick={() => {
                            if (exception.actionLabel.toLowerCase().includes('invoice') || exception.actionLabel.toLowerCase().includes('packing') || exception.actionLabel.toLowerCase().includes('upload')) {
                              document.getElementById('supplier-documents')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              return;
                            }
                            if (exception.actionLabel.toLowerCase().includes('container') || exception.actionLabel.toLowerCase().includes('seal')) {
                              document.getElementById('supplier-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              return;
                            }
                            document.getElementById('supplier-checklist')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }}>{exception.actionLabel}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="supplier-support-subpanel">
                  <header className="supplier-panel-header">
                    <div>
                      <span className="supplier-panel-eyebrow">Release control</span>
                      <h2>Ready-to-release Checklist</h2>
                    </div>
                  </header>
                  <div className="supplier-readiness-list">
                    {checklistRows.map(([label, complete]) => (
                      <div key={label} className={complete ? 'supplier-check-item is-complete' : label.includes('Container') || label.includes('Seal') ? 'supplier-check-item is-blocked' : 'supplier-check-item is-pending'}>
                        <span>{label}</span>
                        <strong>{complete ? 'Complete' : 'Pending'}</strong>
                      </div>
                    ))}
                  </div>
                  <footer className="supplier-readiness-footer">
                    <span>Shipment ready for ocean handoff</span>
                    <strong>{readyForHandoff ? 'Yes' : 'No'}</strong>
                  </footer>
                </div>
              </article>
            </aside>
          ) : null}
        </section>
      </section>
    </main>
  );
});
