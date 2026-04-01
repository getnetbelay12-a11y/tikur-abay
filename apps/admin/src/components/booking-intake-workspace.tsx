'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import type { SupplierDeskShipment } from '../lib/supplier-agent-demo-data';
import { apiGet, apiPost } from '../lib/api';
import { syncBookingToBackendWorkflow } from '../lib/backend-booking-sync';
import {
  buildBookingRequestFormPdfBase64,
  buildLogisticsQuoteRequestFormPdfBase64,
  buildQuoteAcceptanceFormPdfBase64,
  downloadBookingRequestFormPdf,
  downloadLogisticsQuoteRequestFormPdf,
  downloadQuoteAcceptanceFormPdf,
} from '../lib/shipping-pdf';
import {
  originAgentEmail,
  type BookingRequestSource,
  type ContainerType,
  type UnifiedBookingRequest,
} from '../lib/booking-quote-demo-data';
import { compactQuoteReviewRecord, readSharedQuoteRequests, sharedQuoteStorageUpdatedEvent, writeSharedQuoteRequests } from '../lib/shared-quote-storage';
import { writeWorkflowState } from '../lib/workflow-state-client';

const BookingIntakeSummaryPanels = dynamic(
  () => import('./booking-intake-summary-panels').then((module) => module.BookingIntakeSummaryPanels),
  {
    ssr: false,
    loading: () => null,
  },
);

const intakeDraftStorageKey = 'tikur-abay:booking-intake:draft';
const intakeLastRecordStorageKey = 'tikur-abay:booking-intake:last-record';
const placeholderCustomerEmail = 'write2get@gmail.com';
const supplierDeskStorageKey = 'tikur-abay:supplier-desk:manual-shipments';
const supplierDeskStorageUpdatedEvent = 'tikur-abay:supplier-desk:storage-updated';
const localCommunicationLogStorageKey = 'tikur-abay:local-communications';
const localCustomerConsoleEmail = 'customer1@tikurabay.com';
const multimodalInlandEtbRate = 140;

type IntakeMode = 'quote' | 'booking';
type WorkflowStep = 1 | 2 | 3 | 4 | 5;
type ShipmentMode = 'Ocean Freight' | 'Air Freight' | 'Road' | 'Multimodal';
type BookingType = 'FCL' | 'LCL' | 'RoRo' | 'Air Freight';
type ShipmentDirection = 'Import' | 'Export';
type ServiceLevel = 'Port to Port' | 'Door to Port' | 'Port to Door' | 'Door to Door';
type Priority = 'Standard' | 'Express' | 'Urgent';
type CustomerType = 'Existing customer' | 'New customer';
type CustomsReadiness = 'Ready' | 'Pending' | 'Not started';
type DocumentsCompleteness = 'Complete' | 'Partial' | 'Missing';
type ApprovalMethod = 'Customer agreed by phone' | 'Customer agreed by email' | 'Customer agreed in person' | 'Customer approved digitally';
type QuoteApprovalStatus = 'draft' | 'sent' | 'waiting_approval' | 'accepted' | 'rejected' | 'expired';

type IntakeFormState = {
  requestSource: BookingRequestSource;
  shipmentMode: ShipmentMode;
  bookingType: BookingType;
  shipmentDirection: ShipmentDirection;
  serviceLevel: ServiceLevel;
  priority: Priority;
  customerName: string;
  companyName: string;
  customerContactPerson: string;
  customerAddress: string;
  customerTinVatNumber: string;
  phone: string;
  email: string;
  notifyCustomerBy: 'Email' | 'Phone' | 'WhatsApp / Telegram';
  shipperName: string;
  shipperContactPerson: string;
  shipperAddress: string;
  shipperPhone: string;
  shipperEmail: string;
  notifyPartyName: string;
  secondNotifyParty: string;
  consigneeName: string;
  consigneeCompany: string;
  customerType: CustomerType;
  saveReusableCustomer: boolean;
  originCountry: string;
  originCityPort: string;
  originPort: string;
  placeOfReceipt: string;
  pickupAddress: string;
  destinationCountry: string;
  destinationCityPort: string;
  destinationPort: string;
  deliveryAddress: string;
  preferredDepartureWindow: string;
  preferredArrivalWindow: string;
  incoterm: 'EXW' | 'FOB' | 'CFR' | 'CIF' | 'DDP';
  cargoCategory: string;
  commodityDescription: string;
  hsCode: string;
  marksAndNumbers: string;
  grossWeight: string;
  volumeCbm: string;
  cargoLengthCm: string;
  cargoWidthCm: string;
  cargoHeightCm: string;
  packageCount: string;
  packagingType: string;
  freightPaymentTerm: 'prepaid' | 'collect';
  prepaidAt: string;
  collectAt: string;
  lcNumber: string;
  bankPermitNumber: string;
  consigneeTinNumber: string;
  tinAreaCode: string;
  unNumber: string;
  dangerousGoods: boolean;
  temperatureControlled: boolean;
  customsDocumentsReady: boolean;
  specialHandlingNotes: string;
  containerType: '20FT Standard' | '40FT Standard' | '40FT High Cube' | 'Reefer 20FT' | 'Reefer 40FT' | 'Flat Rack' | 'Open Top';
  containerQuantity: string;
  containerSize: '20FT' | '40FT' | '45FT';
  truckType: 'Small Truck' | 'Medium Truck' | 'Trailer';
  roadDistanceKm: string;
  stuffingType: 'Live load' | 'Warehouse stuffing' | 'Factory stuffing';
  emptyPickupLocation: string;
  sealRequired: boolean;
  emptyReturnDepotPreference: string;
  equipmentNotes: string;
  cargoReadyDate: string;
  customsReadiness: CustomsReadiness;
  documentsCompleteness: DocumentsCompleteness;
  vesselName: string;
  voyageNumber: string;
  etaLoadingPort: string;
  shippingCertificateRequired: boolean;
  truckingRequired: boolean;
  warehousingRequired: boolean;
  insuranceRequired: boolean;
  customsClearanceSupport: boolean;
  inspectionRequired: boolean;
  originHandlingNeeded: boolean;
  destinationHandlingNeeded: boolean;
  vesselBookingAssistance: boolean;
  baseFreight: string;
  originCharges: string;
  destinationCharges: string;
  customsEstimate: string;
  inlandTransportEstimate: string;
  insuranceEstimate: string;
  handlingFees: string;
  discount: string;
  currency: string;
};

type GeneratedQuoteState = {
  quoteId: string;
  bookingId: string;
  validityUntil: string;
  status: QuoteApprovalStatus;
  sentAt: string;
  approvalMethod: ApprovalMethod | '';
  approvalNote: string;
  approvedAt: string;
  approvedBy: string;
};

type QuotePdfAttachment = Awaited<ReturnType<typeof buildQuotePdfAttachment>>;
type DirectCommunicationResult = {
  records?: Array<{
    recipientAddress?: string;
    channel?: 'email' | 'telegram' | 'in_app';
    status?: string;
    metadata?: {
      simulated?: boolean;
      providerMessage?: string;
    };
  }>;
};

type DirectCommunicationRecord = NonNullable<DirectCommunicationResult['records']>[number];
type UploadedDocumentView = {
  id: string;
  entityType?: string;
  entityId?: string;
  title?: string;
  fileName?: string;
  documentType?: string;
  referenceNo?: string;
};

type InlineErrors = Partial<Record<keyof IntakeFormState, string>>;

type OriginLocationPreset = {
  key: string;
  country: string;
  cityOrPort: string;
  port: string;
  pickupAddress: string;
};

type DestinationLocationPreset = {
  key: string;
  country: string;
  cityOrPort: string;
  port: string;
  deliveryAddress: string;
};

type CustomerPreset = {
  key: string;
  customerName: string;
  companyName: string;
  customerContactPerson: string;
  customerAddress: string;
  customerTinVatNumber: string;
  phone: string;
  email: string;
  shipperName: string;
  shipperContactPerson: string;
  shipperAddress: string;
  shipperPhone: string;
  shipperEmail: string;
  consigneeName: string;
  consigneeCompany: string;
  notifyPartyName: string;
  secondNotifyParty: string;
};

type LiveQuoteSummaryRow = {
  label: string;
  amount: number;
  currency: string;
};

type OpsCopilotInsight = {
  score: number;
  status: 'ready' | 'watch' | 'blocked';
  headline: string;
  blockers: string[];
  recommendations: string[];
  highlights: string[];
};

type OpsCopilotAction = {
  id: 'customer_preset' | 'route_preset' | 'readiness_baseline' | 'commercial_baseline';
  label: string;
  description: string;
};

type PricingModel = 'CBM_CONTAINER' | 'CHARGEABLE_WEIGHT' | 'DISTANCE_TRUCK' | 'COMBINED';
type ShipmentModeConfig = {
  pricing: PricingModel;
  requiredFields: string[];
  steps: string[];
  documents: string[];
  bookingDeskLabel: string;
  bookingDeskHref: string;
  equipmentTitle: string;
};

const defaultServiceLevels: readonly ServiceLevel[] = ['Port to Port', 'Door to Port', 'Port to Door', 'Door to Door'] as const;
const roadServiceLevels: readonly ServiceLevel[] = ['Port to Door', 'Door to Door'] as const;
const defaultBookingTypes: readonly BookingType[] = ['FCL', 'LCL', 'RoRo', 'Air Freight'] as const;
const roadBookingTypes: readonly BookingType[] = ['FCL', 'LCL'] as const;
const defaultShipmentDirections: readonly ShipmentDirection[] = ['Import', 'Export'] as const;
const roadShipmentDirections: readonly ShipmentDirection[] = ['Import'] as const;
const shipmentModeConfigs: Record<ShipmentMode, ShipmentModeConfig> = {
  'Ocean Freight': {
    pricing: 'CBM_CONTAINER',
    requiredFields: ['containerType', 'volumeCbm', 'grossWeight'],
    steps: ['port', 'vessel', 'container'],
    documents: ['Bill of Lading'],
    bookingDeskLabel: 'Open in China Port Agent Desk',
    bookingDeskHref: '/china-desk/queue',
    equipmentTitle: 'Container / Equipment',
  },
  'Air Freight': {
    pricing: 'CHARGEABLE_WEIGHT',
    requiredFields: ['grossWeight', 'cargoLengthCm', 'cargoWidthCm', 'cargoHeightCm'],
    steps: ['airport', 'flight'],
    documents: ['Air Waybill'],
    bookingDeskLabel: 'Open in Operations Booking Desk',
    bookingDeskHref: '/operations/booking-quote',
    equipmentTitle: 'Air Shipment Profile',
  },
  Road: {
    pricing: 'DISTANCE_TRUCK',
    requiredFields: ['pickupAddress', 'deliveryAddress', 'truckType', 'roadDistanceKm'],
    steps: ['route', 'driver'],
    documents: ['Delivery Note'],
    bookingDeskLabel: 'Open in Corridor Dispatch',
    bookingDeskHref: '/operations/corridor-dispatch',
    equipmentTitle: 'Truck / Route Setup',
  },
  Multimodal: {
    pricing: 'COMBINED',
    requiredFields: ['containerType', 'grossWeight', 'volumeCbm'],
    steps: ['road', 'sea', 'road'],
    documents: ['Bill of Lading'],
    bookingDeskLabel: 'Open in China Port Agent Desk',
    bookingDeskHref: '/china-desk/queue',
    equipmentTitle: 'Container / Equipment',
  },
};

function getShipmentModeConfig(shipmentMode: ShipmentMode): ShipmentModeConfig {
  return shipmentModeConfigs[shipmentMode];
}

function serviceLevelOptionsForMode(shipmentMode: ShipmentMode): readonly ServiceLevel[] {
  return shipmentMode === 'Road' ? roadServiceLevels : defaultServiceLevels;
}

function bookingTypeOptionsForMode(shipmentMode: ShipmentMode): readonly BookingType[] {
  return shipmentMode === 'Road' ? roadBookingTypes : defaultBookingTypes;
}

function shipmentDirectionOptionsForMode(shipmentMode: ShipmentMode): readonly ShipmentDirection[] {
  return shipmentMode === 'Road' ? roadShipmentDirections : defaultShipmentDirections;
}

function isDjiboutiOrEthiopiaLocation(value: string) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized.includes('djibouti') || normalized.includes('ethiopia');
}

function normalizeRoadShipmentForm(current: IntakeFormState): IntakeFormState {
  if (current.shipmentMode !== 'Road') {
    return current;
  }

  const next = { ...current };
  const currentOriginLooksValid =
    isDjiboutiOrEthiopiaLocation(next.originCountry) ||
    isDjiboutiOrEthiopiaLocation(next.originCityPort) ||
    isDjiboutiOrEthiopiaLocation(next.originPort);

  if (!currentOriginLooksValid) {
    next.originCountry = 'Djibouti';
    next.originCityPort = 'Djibouti Port';
    next.originPort = 'Djibouti Port';
    next.placeOfReceipt = 'Djibouti Port';
    next.pickupAddress = 'Djibouti port cargo release yard';
  }

  if (!String(next.destinationCountry || '').trim() || next.destinationCountry.toLowerCase() !== 'ethiopia') {
    next.destinationCountry = 'Ethiopia';
  }

  if (!String(next.destinationPort || '').trim()) {
    next.destinationPort = 'Djibouti Port';
  }

  next.currency = 'ETB';
  next.shipmentDirection = 'Import';
  next.vesselName = '';
  next.voyageNumber = '';
  next.etaLoadingPort = '';
  next.truckType = next.truckType || 'Trailer';
  if (!roadServiceLevels.includes(next.serviceLevel)) {
    next.serviceLevel = 'Port to Door';
  }
  if (!roadBookingTypes.includes(next.bookingType)) {
    next.bookingType = 'FCL';
  }
  next.containerType = next.containerType || '40FT High Cube';

  return next;
}

const originLocationPresets: OriginLocationPreset[] = [
  { key: 'cn-shanghai', country: 'China', cityOrPort: 'Shanghai', port: 'Shanghai', pickupAddress: 'Shanghai export consolidation yard' },
  { key: 'cn-shenzhen-yantian', country: 'China', cityOrPort: 'Shenzhen', port: 'Yantian', pickupAddress: 'Baoan consolidation yard, Shenzhen' },
  { key: 'cn-guangzhou-nansha', country: 'China', cityOrPort: 'Guangzhou', port: 'Nansha', pickupAddress: 'Nansha export cargo terminal, Guangzhou' },
  { key: 'cn-ningbo', country: 'China', cityOrPort: 'Ningbo', port: 'Ningbo', pickupAddress: 'Ningbo bonded logistics park' },
  { key: 'cn-qingdao', country: 'China', cityOrPort: 'Qingdao', port: 'Qingdao', pickupAddress: 'Qingdao export processing zone' },
  { key: 'cn-tianjin', country: 'China', cityOrPort: 'Tianjin', port: 'Tianjin', pickupAddress: 'Tianjin logistics consolidation yard' },
  { key: 'cn-xiamen', country: 'China', cityOrPort: 'Xiamen', port: 'Xiamen', pickupAddress: 'Xiamen export staging yard' },
  { key: 'ae-dubai-jebel-ali', country: 'United Arab Emirates', cityOrPort: 'Dubai', port: 'Jebel Ali', pickupAddress: 'Jebel Ali Free Zone export yard, Dubai' },
  { key: 'ae-abu-dhabi-khalifa', country: 'United Arab Emirates', cityOrPort: 'Abu Dhabi', port: 'Khalifa Port', pickupAddress: 'Khalifa Port logistics district, Abu Dhabi' },
  { key: 'tr-istanbul-ambarli', country: 'Turkey', cityOrPort: 'Istanbul', port: 'Ambarli', pickupAddress: 'Ambarli port logistics terminal, Istanbul' },
  { key: 'tr-izmir-aliaga', country: 'Turkey', cityOrPort: 'Izmir', port: 'Aliaga', pickupAddress: 'Aliaga export terminal, Izmir' },
  { key: 'tr-mersin', country: 'Turkey', cityOrPort: 'Mersin', port: 'Mersin', pickupAddress: 'Mersin free zone logistics yard' },
  { key: 'in-mumbai-nhava-sheva', country: 'India', cityOrPort: 'Mumbai', port: 'Nhava Sheva', pickupAddress: 'Nhava Sheva export holding yard, Mumbai' },
  { key: 'in-mundra', country: 'India', cityOrPort: 'Mundra', port: 'Mundra', pickupAddress: 'Mundra inland container yard' },
  { key: 'in-chennai', country: 'India', cityOrPort: 'Chennai', port: 'Chennai', pickupAddress: 'Chennai export freight station' },
  { key: 'sg-singapore', country: 'Singapore', cityOrPort: 'Singapore', port: 'Singapore', pickupAddress: 'PSA Singapore freight consolidation yard' },
  { key: 'my-port-klang', country: 'Malaysia', cityOrPort: 'Port Klang', port: 'Port Klang', pickupAddress: 'Port Klang free commercial zone' },
  { key: 'vn-hai-phong', country: 'Vietnam', cityOrPort: 'Hai Phong', port: 'Hai Phong', pickupAddress: 'Hai Phong export yard' },
  { key: 'vn-ho-chi-minh-cat-lai', country: 'Vietnam', cityOrPort: 'Ho Chi Minh City', port: 'Cat Lai', pickupAddress: 'Cat Lai container terminal, Ho Chi Minh City' },
  { key: 'sa-jeddah', country: 'Saudi Arabia', cityOrPort: 'Jeddah', port: 'Jeddah Islamic Port', pickupAddress: 'Jeddah logistics support yard' },
  { key: 'eg-alexandria', country: 'Egypt', cityOrPort: 'Alexandria', port: 'Alexandria', pickupAddress: 'Alexandria container freight station' },
  { key: 'eg-port-said', country: 'Egypt', cityOrPort: 'Port Said', port: 'Port Said', pickupAddress: 'Port Said east terminal logistics yard' },
] as const;

const roadOriginLocationPresets: OriginLocationPreset[] = [
  { key: 'road-dj-djibouti-port', country: 'Djibouti', cityOrPort: 'Djibouti Port', port: 'Djibouti Port', pickupAddress: 'Djibouti port cargo release yard' },
  { key: 'road-et-modjo-dry-port', country: 'Ethiopia', cityOrPort: 'Modjo Dry Port', port: 'Modjo Dry Port', pickupAddress: 'Modjo dry-port dispatch lane' },
  { key: 'road-et-adama-dry-port', country: 'Ethiopia', cityOrPort: 'Adama Dry Port', port: 'Adama Dry Port', pickupAddress: 'Adama dry-port outbound lane' },
  { key: 'road-et-kality-icd', country: 'Ethiopia', cityOrPort: 'Kality ICD', port: 'Kality ICD', pickupAddress: 'Kality ICD cargo handoff yard' },
  { key: 'road-et-gelan-icd', country: 'Ethiopia', cityOrPort: 'Gelan ICD', port: 'Gelan ICD', pickupAddress: 'Gelan ICD outbound truck bay' },
  { key: 'road-et-combolcha-dry-port', country: 'Ethiopia', cityOrPort: 'Combolcha Dry Port', port: 'Combolcha Dry Port', pickupAddress: 'Combolcha dry-port dispatch gate' },
  { key: 'road-et-dire-dawa-icd', country: 'Ethiopia', cityOrPort: 'Dire Dawa ICD', port: 'Dire Dawa ICD', pickupAddress: 'Dire Dawa ICD release area' },
  { key: 'road-et-semera-dry-port', country: 'Ethiopia', cityOrPort: 'Semera Dry Port', port: 'Semera Dry Port', pickupAddress: 'Semera dry-port dispatch yard' },
  { key: 'road-et-mekelle-dry-port', country: 'Ethiopia', cityOrPort: 'Mekelle Dry Port', port: 'Mekelle Dry Port', pickupAddress: 'Mekelle dry-port truck release bay' },
] as const;

const originCountryOptions = Array.from(new Set(originLocationPresets.map((item) => item.country)));
const originCityPortOptions = Array.from(new Set(originLocationPresets.map((item) => item.cityOrPort)));
const originPortOptions = Array.from(new Set(originLocationPresets.map((item) => item.port)));
const roadOriginCountryOptions = Array.from(new Set(roadOriginLocationPresets.map((item) => item.country)));
const roadOriginCityPortOptions = Array.from(new Set(roadOriginLocationPresets.map((item) => item.cityOrPort)));
const roadOriginPortOptions = Array.from(new Set(roadOriginLocationPresets.map((item) => item.port)));

const destinationLocationPresets: DestinationLocationPreset[] = [
  { key: 'et-modjo-dry-port', country: 'Ethiopia', cityOrPort: 'Modjo Dry Port', port: 'Djibouti Port', deliveryAddress: 'Modjo dry-port inbound lane' },
  { key: 'et-adama-dry-port', country: 'Ethiopia', cityOrPort: 'Adama Dry Port', port: 'Djibouti Port', deliveryAddress: 'Adama dry-port bonded warehouse' },
  { key: 'et-addis-delivery', country: 'Ethiopia', cityOrPort: 'Addis Ababa', port: 'Djibouti Port', deliveryAddress: 'Addis Ababa customer delivery dock' },
  { key: 'et-kality-dry-port', country: 'Ethiopia', cityOrPort: 'Kality ICD', port: 'Djibouti Port', deliveryAddress: 'Kality dry-port receiving yard' },
  { key: 'et-gelan-icd', country: 'Ethiopia', cityOrPort: 'Gelan ICD', port: 'Djibouti Port', deliveryAddress: 'Gelan inland container depot receiving lane' },
  { key: 'et-combolcha-dry-port', country: 'Ethiopia', cityOrPort: 'Combolcha Dry Port', port: 'Djibouti Port', deliveryAddress: 'Combolcha dry-port cargo yard' },
  { key: 'et-dire-dawa', country: 'Ethiopia', cityOrPort: 'Dire Dawa ICD', port: 'Djibouti Port', deliveryAddress: 'Dire Dawa inland delivery hub' },
  { key: 'et-semera-dry-port', country: 'Ethiopia', cityOrPort: 'Semera Dry Port', port: 'Djibouti Port', deliveryAddress: 'Semera dry-port cargo handoff zone' },
  { key: 'et-mekelle-dry-port', country: 'Ethiopia', cityOrPort: 'Mekelle Dry Port', port: 'Djibouti Port', deliveryAddress: 'Mekelle dry-port bonded cargo terminal' },
  { key: 'et-hawassa-inland-terminal', country: 'Ethiopia', cityOrPort: 'Hawassa Inland Terminal', port: 'Djibouti Port', deliveryAddress: 'Hawassa inland freight terminal' },
  { key: 'et-bahir-dar-inland-terminal', country: 'Ethiopia', cityOrPort: 'Bahir Dar Inland Terminal', port: 'Djibouti Port', deliveryAddress: 'Bahir Dar inland cargo delivery terminal' },
  { key: 'et-jimma-inland-terminal', country: 'Ethiopia', cityOrPort: 'Jimma Inland Terminal', port: 'Djibouti Port', deliveryAddress: 'Jimma inland cargo distribution hub' },
  { key: 'dj-djibouti-direct', country: 'Djibouti', cityOrPort: 'Djibouti', port: 'Djibouti Port', deliveryAddress: 'Djibouti direct release delivery point' },
  { key: 'so-berbera', country: 'Somaliland', cityOrPort: 'Berbera', port: 'Berbera Port', deliveryAddress: 'Berbera inland delivery point' },
  { key: 'ke-nairobi', country: 'Kenya', cityOrPort: 'Nairobi', port: 'Mombasa Port', deliveryAddress: 'Nairobi bonded inland container depot' },
] as const;

const destinationCountryOptions = Array.from(new Set(destinationLocationPresets.map((item) => item.country)));
const destinationCityPortOptions = Array.from(new Set(destinationLocationPresets.map((item) => item.cityOrPort)));
const destinationPortOptions = Array.from(new Set(destinationLocationPresets.map((item) => item.port)));
const roadDestinationLocationPresets = destinationLocationPresets.filter((item) => item.country === 'Ethiopia');
const roadDestinationCountryOptions = Array.from(new Set(roadDestinationLocationPresets.map((item) => item.country)));
const roadDestinationCityPortOptions = Array.from(new Set(roadDestinationLocationPresets.map((item) => item.cityOrPort)));
const roadDestinationPortOptions = Array.from(new Set(roadDestinationLocationPresets.map((item) => item.port)));

const customerPresets: CustomerPreset[] = [
  {
    key: 'alem-logistics-plc',
    customerName: 'Alem Logistics PLC',
    companyName: 'Alem Logistics PLC',
    customerContactPerson: 'Solomon Bekele',
    customerAddress: 'Addis Ababa, Ethiopia',
    customerTinVatNumber: '0012345678',
    phone: '+251987654321',
    email: 'write2get@gmail.com',
    shipperName: 'Alem Logistics PLC',
    shipperContactPerson: 'Origin shipping desk',
    shipperAddress: 'Shanghai export consolidation yard',
    shipperPhone: '+86 21 5555 0123',
    shipperEmail: 'origin@alemlogistics.com',
    consigneeName: 'Alem Logistics PLC',
    consigneeCompany: 'Alem Logistics PLC',
    notifyPartyName: 'Same as consignee',
    secondNotifyParty: '',
  },
  {
    key: 'sadyaro-llc',
    customerName: 'SADYARO LLC',
    companyName: 'SADYARO LLC',
    customerContactPerson: 'Sales Coordination Desk',
    customerAddress: 'Addis Ababa, Ethiopia',
    customerTinVatNumber: '',
    phone: '',
    email: '',
    shipperName: 'SADYARO LLC',
    shipperContactPerson: 'Origin shipping desk',
    shipperAddress: 'Shanghai export consolidation yard',
    shipperPhone: '',
    shipperEmail: '',
    consigneeName: 'SADYARO LLC',
    consigneeCompany: 'SADYARO LLC',
    notifyPartyName: 'Same as consignee',
    secondNotifyParty: '',
  },
  {
    key: 'kelel-digital-marketing',
    customerName: 'KELEL DIGITAL MARKETING',
    companyName: 'KELEL DIGITAL MARKETING',
    customerContactPerson: 'Operations Coordination Desk',
    customerAddress: 'Addis Ababa, Ethiopia',
    customerTinVatNumber: '',
    phone: '',
    email: '',
    shipperName: 'KELEL DIGITAL MARKETING',
    shipperContactPerson: 'Origin shipping desk',
    shipperAddress: 'Shanghai export consolidation yard',
    shipperPhone: '',
    shipperEmail: '',
    consigneeName: 'KELEL DIGITAL MARKETING',
    consigneeCompany: 'KELEL DIGITAL MARKETING',
    notifyPartyName: 'Same as consignee',
    secondNotifyParty: '',
  },
] as const;

function defaultForm(): IntakeFormState {
  return {
    requestSource: 'admin',
    shipmentMode: 'Multimodal',
    bookingType: 'FCL',
    shipmentDirection: 'Import',
    serviceLevel: 'Door to Door',
    priority: 'Standard',
    customerName: 'Alem Logistics PLC',
    companyName: 'Alem Logistics PLC',
    customerContactPerson: 'Solomon Bekele',
    customerAddress: 'Addis Ababa, Ethiopia',
    customerTinVatNumber: '0012345678',
    phone: '+251911220190',
    email: 'write2get@gmail.com',
    notifyCustomerBy: 'Email',
    shipperName: 'Alem Logistics PLC',
    shipperContactPerson: 'Origin shipping desk',
    shipperAddress: 'Shanghai export consolidation yard',
    shipperPhone: '+86 21 5555 0123',
    shipperEmail: 'origin@alemlogistics.com',
    notifyPartyName: 'Same as consignee',
    secondNotifyParty: '',
    consigneeName: 'Alem Logistics PLC',
    consigneeCompany: 'Alem Logistics PLC',
    customerType: 'Existing customer',
    saveReusableCustomer: true,
    originCountry: 'China',
    originCityPort: 'Shanghai',
    originPort: 'Shanghai',
    placeOfReceipt: 'Shanghai export consolidation yard',
    pickupAddress: 'Baoan consolidation yard, Shenzhen',
    destinationCountry: 'Ethiopia',
    destinationCityPort: 'Modjo Dry Port',
    destinationPort: 'Djibouti',
    deliveryAddress: 'Adama industrial zone, customer receiving dock',
    preferredDepartureWindow: '2026-04-06 to 2026-04-09',
    preferredArrivalWindow: '2026-04-18 to 2026-04-23',
    incoterm: 'CIF',
    cargoCategory: 'Industrial spare parts',
    commodityDescription: 'Crated machinery spare parts, cable kits, and control accessories.',
    hsCode: '8483.40',
    marksAndNumbers: 'ALEM/SHG/001-042',
    grossWeight: '18800',
    volumeCbm: '24.5',
    cargoLengthCm: '',
    cargoWidthCm: '',
    cargoHeightCm: '',
    packageCount: '42',
    packagingType: 'Crates and pallets',
    freightPaymentTerm: 'prepaid',
    prepaidAt: 'Shanghai',
    collectAt: 'Djibouti',
    lcNumber: 'LC-260326-001',
    bankPermitNumber: '',
    consigneeTinNumber: '0012345678',
    tinAreaCode: 'AA',
    unNumber: '',
    dangerousGoods: false,
    temperatureControlled: false,
    customsDocumentsReady: true,
    specialHandlingNotes: 'Keep customs inspection references attached to the shipment file.',
    containerType: '40FT High Cube',
    containerQuantity: '1',
    containerSize: '40FT',
    truckType: 'Trailer',
    roadDistanceKm: '',
    stuffingType: 'Factory stuffing',
    emptyPickupLocation: 'Shenzhen empty pickup yard',
    sealRequired: true,
    emptyReturnDepotPreference: 'Djibouti Container Depot',
    equipmentNotes: 'Standard dry box with customs seal control.',
    cargoReadyDate: '2026-04-05',
    customsReadiness: 'Ready',
    documentsCompleteness: 'Complete',
    vesselName: 'MSC Blue Nile',
    voyageNumber: 'VOY-260322-001',
    etaLoadingPort: '2026-04-06',
    shippingCertificateRequired: true,
    truckingRequired: true,
    warehousingRequired: false,
    insuranceRequired: true,
    customsClearanceSupport: true,
    inspectionRequired: false,
    originHandlingNeeded: true,
    destinationHandlingNeeded: true,
    vesselBookingAssistance: true,
    baseFreight: '',
    originCharges: '',
    destinationCharges: '',
    customsEstimate: '',
    inlandTransportEstimate: '',
    insuranceEstimate: '',
    handlingFees: '',
    discount: '0',
    currency: 'USD',
  };
}

function buildBlankIntakeForm(current: IntakeFormState): IntakeFormState {
  const next = normalizeRoadShipmentForm({ ...defaultForm(), requestSource: current.requestSource, shipmentMode: current.shipmentMode });
  (Object.keys(next) as Array<keyof IntakeFormState>).forEach((key) => {
    if (typeof next[key] === 'string') {
      (next[key] as string) = '';
    }
  });
  next.requestSource = current.requestSource;
  next.shipmentMode = current.shipmentMode;
  next.saveReusableCustomer = false;
  next.customsDocumentsReady = false;
  next.dangerousGoods = false;
  next.temperatureControlled = false;
  next.sealRequired = false;
  next.shippingCertificateRequired = false;
  next.truckingRequired = false;
  next.warehousingRequired = false;
  next.insuranceRequired = false;
  next.customsClearanceSupport = false;
  next.inspectionRequired = false;
  next.originHandlingNeeded = false;
  next.destinationHandlingNeeded = false;
  next.vesselBookingAssistance = false;
  next.customerType = 'New customer';
  return next;
}

function buildExistingCustomerIntakeForm(current: IntakeFormState, preset: CustomerPreset): IntakeFormState {
  return normalizeRoadShipmentForm({
    ...defaultForm(),
    requestSource: current.requestSource,
    shipmentMode: current.shipmentMode,
    customerName: preset.customerName,
    companyName: preset.companyName,
    customerContactPerson: preset.customerContactPerson,
    customerAddress: preset.customerAddress,
    customerTinVatNumber: preset.customerTinVatNumber,
    phone: preset.phone,
    email: preset.email,
    shipperName: preset.shipperName,
    shipperContactPerson: preset.shipperContactPerson,
    shipperAddress: preset.shipperAddress,
    shipperPhone: preset.shipperPhone,
    shipperEmail: preset.shipperEmail,
    consigneeName: preset.consigneeName,
    consigneeCompany: preset.consigneeCompany,
    notifyPartyName: preset.notifyPartyName,
    secondNotifyParty: preset.secondNotifyParty,
    customerType: 'Existing customer',
    saveReusableCustomer: true,
  });
}

function workflowStepFromRequest(request: UnifiedBookingRequest): WorkflowStep {
  if (request.quoteStatus === 'assigned_to_origin' || request.bookingStatus === 'assigned_to_origin' || request.bookingId) return 5;
  if (request.approvalStatus === 'accepted' || request.quoteStatus === 'quote_accepted') return 4;
  if (request.approvalStatus === 'waiting_approval' || request.quoteStatus === 'quote_sent') return 3;
  if (request.quoteId) return 2;
  return 1;
}

function generatedQuoteFromRequest(request: UnifiedBookingRequest): GeneratedQuoteState {
  return {
    quoteId: request.quoteId,
    bookingId: request.bookingId || '',
    validityUntil: request.requestedArrivalWindow || '',
    status: (request.approvalStatus || (request.quoteStatus === 'quote_accepted' ? 'accepted' : request.quoteStatus === 'quote_sent' ? 'waiting_approval' : 'draft')) as QuoteApprovalStatus,
    sentAt: request.quoteStatus === 'quote_sent' || request.approvalStatus === 'waiting_approval' ? request.updatedAt || '' : '',
    approvalMethod: (request.approvalMethod as ApprovalMethod | '') || '',
    approvalNote: '',
    approvedAt: request.approvalRecordedAt || request.acceptedAt || '',
    approvedBy: request.approvalRecordedBy || '',
  };
}

function formatReferenceDatePart(date: Date) {
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return year + month + day;
}

function generateWorkflowReference(prefix: 'QT' | 'BK' | 'SHP') {
  const now = new Date();
  const datePart = formatReferenceDatePart(now);
  const timePart = [
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('');
  const milliPart = String(now.getMilliseconds()).padStart(3, '0');
  return prefix + '-' + datePart + '-' + timePart + milliPart;
}

function deriveBookingIdFromQuote(quoteId: string) {
  if (!quoteId) return generateWorkflowReference('BK');
  return quoteId.startsWith('QT-') ? `BK-${quoteId.slice(3)}` : `BK-${quoteId}`;
}

function deriveShipmentIdFromQuote(quoteId: string) {
  if (!quoteId) return generateWorkflowReference('SHP');
  return quoteId.startsWith('QT-') ? `SHP-${quoteId.slice(3)}` : `SHP-${quoteId}`;
}

function firstTokenSegment(value?: string | null) {
  return String(value || '')
    .split('·')[0]
    .trim();
}

function derivePackagingTypeFromRequest(request: UnifiedBookingRequest) {
  const packageSummary = String(request.packageSummary || '').trim();
  if (packageSummary) {
    const cleaned = packageSummary.replace(/^\d+\s*/u, '').trim();
    if (cleaned) return cleaned;
  }
  return request.bookingType || 'Packages';
}

function formFromRequest(request: UnifiedBookingRequest): IntakeFormState {
  return normalizeRoadShipmentForm({
    ...defaultForm(),
    requestSource: request.requestSource,
    shipmentMode: (request.shipmentMode as ShipmentMode) || (request.serviceType === 'unimodal' ? 'Ocean Freight' : 'Multimodal'),
    bookingType: (request.bookingType as BookingType) || 'FCL',
    serviceLevel: (request.serviceLevel as ServiceLevel) || 'Door to Door',
    customerName: request.customerName || '',
    companyName: request.company || '',
    customerContactPerson: request.contactPerson || request.customerName || '',
    customerAddress: request.customerAddress || '',
    customerTinVatNumber: request.customerTinVatNumber || '',
    phone: request.phone || '',
    email: request.email || '',
    shipperName: request.shipperName || request.company || request.customerName || '',
    shipperContactPerson: request.shipperContactPerson || request.contactPerson || '',
    shipperAddress: request.shipperAddress || '',
    shipperPhone: request.shipperPhone || request.phone || '',
    shipperEmail: request.shipperEmail || request.email || '',
    notifyPartyName: request.notifyPartyName || request.contactPerson || request.consigneeName || '',
    secondNotifyParty: request.secondNotifyParty || '',
    consigneeName: request.consigneeName || '',
    consigneeCompany: request.consigneeName || '',
    originCountry: request.originCountry || 'China',
    originCityPort: request.originCityOrPort || '',
    originPort: request.portOfLoading || '',
    placeOfReceipt: request.placeOfReceipt || request.originCityOrPort || request.portOfLoading || '',
    destinationCountry: 'Ethiopia',
    destinationCityPort: request.inlandDestination || request.portOfDischarge || '',
    destinationPort: request.portOfDischarge || '',
    deliveryAddress: request.finalDeliveryLocation || '',
    preferredDepartureWindow: request.earliestDepartureDate || '',
    preferredArrivalWindow: request.requestedArrivalWindow || '',
    incoterm: (request.incoterm as IntakeFormState['incoterm']) || 'CIF',
    cargoCategory: firstTokenSegment(request.commoditySummary) || request.cargoDescription || '',
    commodityDescription: request.cargoDescription || '',
    hsCode: request.hsCode || '',
    marksAndNumbers: request.marksAndNumbers || '',
    grossWeight: String(request.totalWeight || ''),
    volumeCbm: String(request.cbm || ''),
    cargoLengthCm: '',
    cargoWidthCm: '',
    cargoHeightCm: '',
    packageCount: String(request.containerCount || 1),
    packagingType: derivePackagingTypeFromRequest(request),
    freightPaymentTerm: request.freightPaymentTerm || (request.incoterm === 'FOB' ? 'collect' : 'prepaid'),
    prepaidAt: request.prepaidAt || '',
    collectAt: request.collectAt || '',
    lcNumber: request.lcNumber || '',
    bankPermitNumber: request.bankPermitNumber || '',
    consigneeTinNumber: request.consigneeTinNumber || '',
    tinAreaCode: request.tinAreaCode || '',
    unNumber: request.unNumber || '',
    dangerousGoods: Boolean(request.hazardousFlag),
    temperatureControlled: Boolean(request.temperatureControl),
    specialHandlingNotes: request.specialHandlingNote || '',
    containerType:
      request.containerType === '20GP' ? '20FT Standard' :
      request.containerType === '40GP' ? '40FT Standard' :
      request.containerType === '40HC' ? '40FT High Cube' :
      request.containerType === 'Reefer / Fridge' ? 'Reefer 40FT' :
      request.containerType === 'Flat Rack' ? 'Flat Rack' :
      request.containerType === 'Open Top' ? 'Open Top' :
      '40FT High Cube',
    containerQuantity: String(request.containerCount || 1),
    containerSize: String(request.containerType || '').includes('20') ? '20FT' : '40FT',
    truckType: 'Trailer',
    roadDistanceKm: '',
    customsDocumentsReady: true,
    documentsCompleteness: 'Complete',
    customsReadiness: 'Ready',
    vesselName: request.vesselName || '',
    voyageNumber: request.voyageNumber || '',
    etaLoadingPort: request.etaLoadingPort || '',
    shippingCertificateRequired: Boolean(request.shippingCertificateRequired),
  });
}

function toContainerType(value: IntakeFormState['containerType']): ContainerType {
  switch (value) {
    case '20FT Standard':
      return '20GP';
    case '40FT Standard':
      return '40GP';
    case '40FT High Cube':
      return '40HC';
    case 'Reefer 20FT':
    case 'Reefer 40FT':
      return 'Reefer / Fridge';
    case 'Flat Rack':
      return 'Flat Rack';
    case 'Open Top':
      return 'Open Top';
    default:
      return '40HC';
  }
}

function readStoredRequests() {
  return readSharedQuoteRequests([] as UnifiedBookingRequest[]);
}

function writeStoredRequests(requests: UnifiedBookingRequest[]) {
  writeSharedQuoteRequests(requests);
}

function updateStoredRequestStatus(
  quoteId: string,
  updater: (request: UnifiedBookingRequest) => UnifiedBookingRequest,
) {
  const existing = readStoredRequests();
  const next = existing.map((request) => (request.quoteId === quoteId ? updater(request) : request));
  writeStoredRequests(next);
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
  const serialized = JSON.stringify(shipments);
  window.localStorage.setItem(supplierDeskStorageKey, serialized);
  document.cookie = `tikur_abay_supplier_shipments=${encodeURIComponent(serialized)}; path=/; max-age=2592000; samesite=lax`;
  window.dispatchEvent(
    new CustomEvent(supplierDeskStorageUpdatedEvent, {
      detail: { key: supplierDeskStorageKey },
    }),
  );
  void writeWorkflowState('supplier-shipments', shipments).catch(() => {});
}

function recordLocalCommunication(payload: {
  entityType: 'quote' | 'booking';
  entityId: string;
  bookingId?: string;
  recipientAddress: string;
  channel: 'email' | 'telegram' | 'in_app';
  subject: string;
  templateKey: string;
  messageBody: string;
  attachmentName?: string;
  attachmentUrl?: string;
  attachmentMimeType?: string;
}) {
  if (typeof window === 'undefined') return;
  const raw = window.localStorage.getItem(localCommunicationLogStorageKey);
  let current: Array<Record<string, string>> = [];
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Array<Record<string, string>>;
      if (Array.isArray(parsed)) current = parsed;
    } catch {
      current = [];
    }
  }
  const next = [
    {
      id: `local-com-${Date.now()}`,
      sentAt: new Date().toISOString(),
      channel: payload.channel,
      entityType: payload.entityType,
      entityId: payload.entityId,
      bookingId: payload.bookingId || '',
      recipientAddress: payload.recipientAddress,
      subject: payload.subject,
      templateKey: payload.templateKey,
      messageBody: payload.messageBody,
      attachmentName: payload.attachmentName || '',
      attachmentUrl: payload.attachmentUrl || '',
      attachmentMimeType: payload.attachmentMimeType || '',
      status: 'sent',
      mode: 'local-simulated',
    },
    ...current,
  ].slice(0, 60);
  window.localStorage.setItem(localCommunicationLogStorageKey, JSON.stringify(next));
}

function resolveCustomerEmailAddress(form: IntakeFormState) {
  return placeholderCustomerEmail;
}

async function buildQuotePdfAttachment(request: UnifiedBookingRequest) {
  const payload = encodeURIComponent(JSON.stringify(compactQuoteReviewRecord(request)));
  const pdfContent = await buildLogisticsQuoteRequestFormPdfBase64(buildQuoteRequestFormPayloadFromRequest(request));
  return {
    attachmentName: `${request.quoteId}.pdf`,
    attachmentMimeType: 'application/pdf',
    attachmentUrl: `http://127.0.0.1:6011/quotes/${encodeURIComponent(request.quoteId)}/review?localQuote=${payload}&format=pdf`,
    attachmentContentBase64: pdfContent,
  };
}

function slugifyDocumentToken(value: string) {
  return String(value || 'draft').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'draft';
}

function buildQuoteRequestFormPayload(form: IntakeFormState, generatedQuote: GeneratedQuoteState | null) {
  const pricing = estimatePricing(form);
  const seaFreightUsd = pricing.baseFreight + pricing.originCharges;
  const clearanceUsd = pricing.destinationCharges + pricing.customsEstimate + pricing.insuranceEstimate + pricing.handlingFees - pricing.discount;
  const inlandRoadEtb = Math.round(pricing.inlandTransportEstimate * multimodalInlandEtbRate);
  return {
    fileName: `tikur-abay-quotation-request-${slugifyDocumentToken(generatedQuote?.quoteId || form.companyName)}.pdf`,
    quoteReference: generatedQuote?.quoteId || '',
    companyName: form.companyName,
    contactPerson: form.customerContactPerson,
    phone: form.phone,
    email: form.email,
    tinVatNumber: form.customerTinVatNumber,
    address: form.customerAddress,
    consignee: form.consigneeName,
    notifyParty: form.notifyPartyName,
    serviceLevel: form.serviceLevel,
    bookingType: form.bookingType,
    incoterm: form.incoterm,
    placeOfReceipt: form.placeOfReceipt,
    portOfLoading: form.originPort || form.originCityPort,
    portOfDischarge: form.destinationPort || form.destinationCityPort,
    finalDestination: form.deliveryAddress || form.destinationCityPort,
    shipmentDate: form.preferredDepartureWindow,
    deliveryDate: form.preferredArrivalWindow,
    preferredMode: form.shipmentMode,
    hsCode: form.hsCode,
    grossWeight: form.grossWeight,
    volumeCbm: form.volumeCbm,
    packageSummary: `${form.packageCount} ${form.packagingType}`.trim(),
    marksAndNumbers: form.marksAndNumbers,
    containerType: `${form.containerType} x ${form.containerQuantity}`.trim(),
    freightTerm: form.freightPaymentTerm,
    prepaidAt: form.prepaidAt,
    lcNumber: form.lcNumber,
    bankPermitNumber: form.bankPermitNumber,
    consigneeTinNumber: form.consigneeTinNumber,
    tinAreaCode: form.tinAreaCode,
    vesselName: form.vesselName,
    voyageNumber: form.voyageNumber,
    etaLoadingPort: form.etaLoadingPort,
    quotedAmount: `${pricing.currency} ${pricing.total.toLocaleString('en-US')}`,
    seaFreight: form.shipmentMode === 'Multimodal' ? `USD ${seaFreightUsd.toLocaleString('en-US')}` : `${pricing.currency} ${pricing.baseFreight.toLocaleString('en-US')}`,
    clearance: form.shipmentMode === 'Multimodal' ? `USD ${clearanceUsd.toLocaleString('en-US')}` : `${pricing.currency} ${(pricing.destinationCharges + pricing.customsEstimate).toLocaleString('en-US')}`,
    inlandTransport: form.shipmentMode === 'Multimodal' ? `ETB ${inlandRoadEtb.toLocaleString('en-US')}` : `${pricing.currency} ${pricing.inlandTransportEstimate.toLocaleString('en-US')}`,
    validityDate: generatedQuote?.validityUntil || '',
    paymentTerm: String(form.freightPaymentTerm || 'prepaid').replace(/^\w/, (value) => value.toUpperCase()),
    goodsDescription: form.commodityDescription,
  };
}

function buildQuoteRequestFormPayloadFromRequest(request: UnifiedBookingRequest) {
  const pricing = request.pricingBreakdown;
  const seaFreightUsd = pricing ? pricing.baseFreight + pricing.originCharges : 0;
  const clearanceUsd = pricing ? pricing.destinationCharges + pricing.customsEstimate + pricing.insuranceEstimate + pricing.handlingFees - pricing.discount : 0;
  const inlandRoadEtb = pricing ? Math.round(pricing.inlandTransportEstimate * multimodalInlandEtbRate) : 0;
  return {
    fileName: `tikur-abay-quotation-request-${slugifyDocumentToken(request.quoteId || request.company || request.customerName)}.pdf`,
    quoteReference: request.quoteId || '',
    companyName: request.company || request.customerName || '',
    contactPerson: request.contactPerson || request.customerName || '',
    phone: request.phone || '',
    email: request.email || '',
    tinVatNumber: request.customerTinVatNumber || '',
    address: request.customerAddress || '',
    consignee: request.consigneeName || '',
    notifyParty: request.notifyPartyName || '',
    serviceLevel: request.serviceLevel || '',
    bookingType: request.bookingType || '',
    incoterm: request.incoterm || '',
    placeOfReceipt: request.placeOfReceipt || '',
    portOfLoading: request.portOfLoading || request.originCityOrPort || '',
    portOfDischarge: request.portOfDischarge || request.inlandDestination || '',
    finalDestination: request.finalDeliveryLocation || request.inlandDestination || request.portOfDischarge || '',
    shipmentDate: request.earliestDepartureDate || '',
    deliveryDate: request.requestedArrivalWindow || '',
    preferredMode: request.shipmentMode || request.serviceType || '',
    hsCode: request.hsCode || '',
    grossWeight: request.totalWeight ? String(request.totalWeight) : '',
    volumeCbm: request.cbm ? String(request.cbm) : '',
    packageSummary: request.packageSummary || '',
    marksAndNumbers: request.marksAndNumbers || '',
    containerType: `${request.containerType || ''} x ${request.containerCount || ''}`.trim(),
    freightTerm: request.freightPaymentTerm || '',
    prepaidAt: request.prepaidAt || '',
    lcNumber: request.lcNumber || '',
    bankPermitNumber: request.bankPermitNumber || '',
    consigneeTinNumber: request.consigneeTinNumber || '',
    tinAreaCode: request.tinAreaCode || '',
    vesselName: request.vesselName || '',
    voyageNumber: request.voyageNumber || '',
    etaLoadingPort: request.etaLoadingPort || '',
    quotedAmount: pricing ? `${pricing.currency} ${pricing.total.toLocaleString('en-US')}` : `${request.quoteCurrency || 'USD'} ${Number(request.quoteAmount || 0).toLocaleString('en-US')}`,
    seaFreight: pricing ? (request.shipmentMode === 'Multimodal' ? `USD ${seaFreightUsd.toLocaleString('en-US')}` : `${pricing.currency} ${pricing.baseFreight.toLocaleString('en-US')}`) : '',
    clearance: pricing ? (request.shipmentMode === 'Multimodal' ? `USD ${clearanceUsd.toLocaleString('en-US')}` : `${pricing.currency} ${(pricing.destinationCharges + pricing.customsEstimate).toLocaleString('en-US')}`) : '',
    inlandTransport: pricing ? (request.shipmentMode === 'Multimodal' ? `ETB ${inlandRoadEtb.toLocaleString('en-US')}` : `${pricing.currency} ${pricing.inlandTransportEstimate.toLocaleString('en-US')}`) : '',
    validityDate: request.requestedArrivalWindow || '',
    paymentTerm: String(request.freightPaymentTerm || 'prepaid').replace(/^\w/, (value) => value.toUpperCase()),
    goodsDescription: request.cargoDescription || request.commoditySummary || '',
  };
}

function buildQuoteAcceptanceFormPayload(
  form: IntakeFormState,
  generatedQuote: GeneratedQuoteState | null,
  pricing: ReturnType<typeof estimatePricing>,
  lastRecordId: string,
) {
  return {
    fileName: `tikur-abay-quotation-acceptance-${slugifyDocumentToken(generatedQuote?.quoteId || form.companyName)}.pdf`,
    quotationReference: generatedQuote?.quoteId || '',
    customerRequestNo: lastRecordId || '',
    quotationDate: generatedQuote?.sentAt || new Date().toISOString().slice(0, 10),
    companyName: form.companyName,
    contactPerson: form.customerContactPerson,
    phone: form.phone,
    email: form.email,
    country: form.destinationCountry,
    address: form.customerAddress,
    serviceDescription: `${form.shipmentMode} ${form.serviceLevel} ${form.bookingType}`.trim(),
    acceptedAmount: `${pricing.currency} ${pricing.total.toLocaleString('en-US')}`,
    seaFreight: `${pricing.currency} ${pricing.baseFreight.toLocaleString('en-US')}`,
    clearance: `${pricing.currency} ${pricing.customsEstimate.toLocaleString('en-US')}`,
    inlandTransport: `${pricing.currency} ${pricing.inlandTransportEstimate.toLocaleString('en-US')}`,
    validityPeriod: generatedQuote?.validityUntil || form.preferredArrivalWindow,
    serviceStartDate: form.cargoReadyDate,
    paymentTerms: form.freightPaymentTerm,
  };
}

function buildBookingRequestFormPayload(form: IntakeFormState, generatedQuote: GeneratedQuoteState | null) {
  const cargoType = firstTokenSegment(form.cargoCategory) || form.cargoCategory;
  const packageUnits = `${form.packageCount} ${form.packagingType}`.trim();
  return {
    fileName: `tikur-abay-booking-request-${slugifyDocumentToken(generatedQuote?.bookingId || generatedQuote?.quoteId || form.companyName)}.pdf`,
    shipper: `${form.shipperName}\n${form.shipperAddress}`.trim(),
    consignee: `${form.consigneeName}\n${form.deliveryAddress}`.trim(),
    notifyParty: form.notifyPartyName,
    secondNotifyParty: form.secondNotifyParty,
    primaryContact: form.customerContactPerson,
    phone: form.phone,
    email: form.email,
    portOfLoading: form.originPort || form.originCityPort,
    portOfDischarge: form.destinationPort || form.destinationCityPort,
    placeOfDelivery: form.deliveryAddress,
    serviceContractNumber: generatedQuote?.quoteId || '',
    vesselName: form.vesselName,
    shippingDate: form.preferredDepartureWindow,
    routingRemarks: `${form.originCityPort} to ${form.destinationCityPort}. ${form.specialHandlingNotes}`.trim(),
    cargoType,
    containerTypeQuantity: `${form.containerType} x ${form.containerQuantity}`.trim(),
    paymentTerms: form.freightPaymentTerm,
    packageUnits,
    descriptionOfGoods: form.commodityDescription,
    measurementDimensions: [form.cargoLengthCm, form.cargoWidthCm, form.cargoHeightCm].filter(Boolean).join(' x ') || form.volumeCbm,
    goodsType: form.packagingType,
    grossWeight: form.grossWeight,
    reeferTemperature: form.temperatureControlled ? 'Controlled per commodity profile' : '',
    humidity: form.temperatureControlled ? 'Managed' : '',
    otherRequirement: form.equipmentNotes,
  };
}

function buildBookingRequestFormPayloadFromRequest(request: UnifiedBookingRequest) {
  const cargoType = firstTokenSegment(request.commoditySummary) || request.cargoDescription || '';
  return {
    fileName: `tikur-abay-booking-request-${slugifyDocumentToken(request.bookingId || request.quoteId || request.company || request.customerName)}.pdf`,
    shipper: [request.shipperName || request.company || request.customerName || '', request.shipperAddress || ''].filter(Boolean).join('\n'),
    consignee: [request.consigneeName || '', request.finalDeliveryLocation || ''].filter(Boolean).join('\n'),
    notifyParty: request.notifyPartyName || '',
    secondNotifyParty: request.secondNotifyParty || '',
    primaryContact: request.contactPerson || request.customerName || '',
    phone: request.phone || '',
    email: request.email || '',
    portOfLoading: request.portOfLoading || request.originCityOrPort || '',
    portOfDischarge: request.portOfDischarge || request.inlandDestination || '',
    placeOfDelivery: request.finalDeliveryLocation || '',
    serviceContractNumber: request.quoteId || '',
    vesselName: request.vesselName || '',
    shippingDate: request.earliestDepartureDate || '',
    routingRemarks: [request.originCityOrPort, 'to', request.inlandDestination || request.portOfDischarge, request.specialHandlingNote].filter(Boolean).join(' ').trim(),
    cargoType,
    containerTypeQuantity: [request.containerType || '', request.containerCount ? `x ${request.containerCount}` : ''].join(' ').trim(),
    paymentTerms: request.freightPaymentTerm || '',
    packageUnits: request.packageSummary || '',
    descriptionOfGoods: request.cargoDescription || request.commoditySummary || '',
    measurementDimensions: request.cbm ? String(request.cbm) : '',
    goodsType: derivePackagingTypeFromRequest(request),
    grossWeight: request.totalWeight ? String(request.totalWeight) : '',
    reeferTemperature: request.temperatureControl ? 'Controlled per commodity profile' : '',
    humidity: request.temperatureControl ? 'Managed' : '',
    otherRequirement: request.specialHandlingNote || '',
  };
}

async function registerWorkflowDocument(options: {
  entityType: 'quote' | 'booking';
  entityId: string;
  title: string;
  documentType: string;
  referenceNo: string;
  fileName: string;
  fileContentBase64: string;
}) {
  let existing: UploadedDocumentView[] = [];
  try {
    existing = await apiGet<UploadedDocumentView[]>(`/documents/by-entity/${encodeURIComponent(options.entityType)}/${encodeURIComponent(options.entityId)}`);
  } catch {
    existing = [];
  }

  const duplicate = existing.some((document) =>
    String(document.documentType || '').toLowerCase() === options.documentType.toLowerCase() &&
    String(document.referenceNo || '').toLowerCase() === options.referenceNo.toLowerCase() &&
    String(document.fileName || '').toLowerCase() === options.fileName.toLowerCase(),
  );
  if (duplicate) {
    return false;
  }

  await apiPost('/documents/upload', {
    title: options.title,
    entityType: options.entityType,
    entityId: options.entityId,
    category: options.documentType,
    documentType: options.documentType,
    referenceNo: options.referenceNo,
    visibilityScope: options.entityType === 'booking' ? 'customer_visible' : 'internal',
    status: 'uploaded',
    fileName: options.fileName,
    mimeType: 'application/pdf',
    fileContentBase64: options.fileContentBase64,
  });

  return true;
}

function pdfEscape(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function estimatePricing(form: IntakeFormState) {
  const normalizedForm = form.shipmentMode === 'Road' ? normalizeRoadShipmentForm(form) : form;
  const weight = Number(form.grossWeight) || 0;
  const cbm = Number(form.volumeCbm) || 0;
  const lengthCm = Number(form.cargoLengthCm) || 0;
  const widthCm = Number(form.cargoWidthCm) || 0;
  const heightCm = Number(form.cargoHeightCm) || 0;
  const packageCount = Number(form.packageCount) || 0;
  const containerQuantity = Math.max(Number(normalizedForm.containerQuantity) || 0, normalizedForm.bookingType === 'LCL' || normalizedForm.bookingType === 'Air Freight' ? 0 : 1);
  const priorityFactor = normalizedForm.priority === 'Urgent' ? 1.16 : normalizedForm.priority === 'Express' ? 1.08 : 1;
  const serviceFactor =
    normalizedForm.serviceLevel === 'Port to Port' ? 0.82 :
    normalizedForm.serviceLevel === 'Door to Port' ? 0.93 :
    normalizedForm.serviceLevel === 'Port to Door' ? 1.08 :
    1.18;
  const routeFactor =
    normalizedForm.originPort.toLowerCase().includes('yantian') ? 1.08 :
    normalizedForm.originPort.toLowerCase().includes('jebel ali') ? 0.94 :
    normalizedForm.originPort.toLowerCase().includes('ambarli') || normalizedForm.originPort.toLowerCase().includes('mersin') ? 0.98 :
    normalizedForm.originPort.toLowerCase().includes('nhava') || normalizedForm.originPort.toLowerCase().includes('mundra') ? 0.96 :
    1;
  const inlandDistanceFactor =
    normalizedForm.destinationCityPort.toLowerCase().includes('mekelle') ? 1.42 :
    normalizedForm.destinationCityPort.toLowerCase().includes('combolcha') ? 1.36 :
    normalizedForm.destinationCityPort.toLowerCase().includes('bahir dar') ? 1.3 :
    normalizedForm.destinationCityPort.toLowerCase().includes('dire dawa') ? 1.22 :
    normalizedForm.destinationCityPort.toLowerCase().includes('hawassa') ? 1.14 :
    normalizedForm.destinationCityPort.toLowerCase().includes('modjo') ? 1.08 :
    normalizedForm.destinationCityPort.toLowerCase().includes('adama') ? 1 :
    1.12;
  const hazmatSurcharge = normalizedForm.dangerousGoods ? 1450 : 0;
  const reeferSurcharge = normalizedForm.temperatureControlled ? 1850 : 0;
  const oversizedSurcharge = normalizedForm.containerType === 'Flat Rack' || normalizedForm.containerType === 'Open Top' ? 2250 : 0;
  const airChargeableWeight = Math.max(weight, lengthCm > 0 && widthCm > 0 && heightCm > 0 ? (lengthCm * widthCm * heightCm) / 6000 : 0);

  if (normalizedForm.shipmentMode === 'Road') {
    const roadDistanceKm = Math.max(Number(normalizedForm.roadDistanceKm) || 0, 1);
    const truckRatePerKm =
      normalizedForm.truckType === 'Small Truck' ? 118 :
      normalizedForm.truckType === 'Medium Truck' ? 176 :
      238;
    const roadLinehaulEtb =
      Number(normalizedForm.baseFreight)
      || Math.round((roadDistanceKm * truckRatePerKm + weight * 0.9 + cbm * 240) * inlandDistanceFactor * priorityFactor);
    const roadOriginEtb =
      Number(normalizedForm.originCharges)
      || Math.round((9500 + packageCount * 22 + (normalizedForm.originHandlingNeeded ? 3400 : 0)) * serviceFactor);
    const roadDestinationEtb =
      Number(normalizedForm.destinationCharges)
      || Math.round((7800 + packageCount * 18 + (normalizedForm.destinationHandlingNeeded ? 2800 : 0)) * inlandDistanceFactor);
    const roadCustomsEtb =
      Number(normalizedForm.customsEstimate)
      || (normalizedForm.customsClearanceSupport
        ? Math.round((6200 + (normalizedForm.inspectionRequired ? 1800 : 0) + hazmatSurcharge * 0.18))
        : 0);
    const roadInlandEtb =
      Number(normalizedForm.inlandTransportEstimate)
      || Math.round((26000 + containerQuantity * 14000) * inlandDistanceFactor * (normalizedForm.serviceLevel === 'Port to Port' ? 0.86 : 1));
    const roadInsuranceEtb =
      Number(normalizedForm.insuranceEstimate)
      || (normalizedForm.insuranceRequired ? Math.round((roadLinehaulEtb + roadInlandEtb) * 0.009) : 0);
    const roadHandlingEtb =
      Number(normalizedForm.handlingFees)
      || Math.round(2400 + (normalizedForm.warehousingRequired ? 4200 : 0) + (normalizedForm.sealRequired ? 480 : 0) + reeferSurcharge + oversizedSurcharge);
    const roadDiscountEtb = Number(normalizedForm.discount) || 0;
    const roadTotalEtb =
      roadLinehaulEtb + roadOriginEtb + roadDestinationEtb + roadCustomsEtb + roadInlandEtb + roadInsuranceEtb + roadHandlingEtb - roadDiscountEtb;

    return {
      baseFreight: roadLinehaulEtb,
      originCharges: roadOriginEtb,
      destinationCharges: roadDestinationEtb,
      customsEstimate: roadCustomsEtb,
      inlandTransportEstimate: roadInlandEtb,
      insuranceEstimate: roadInsuranceEtb,
      handlingFees: roadHandlingEtb,
      discount: roadDiscountEtb,
      total: roadTotalEtb,
      currency: 'ETB',
    };
  }

  const computedBaseFreight = (() => {
    if (normalizedForm.shipmentMode === 'Air Freight' || normalizedForm.bookingType === 'Air Freight') {
      return Math.round((airChargeableWeight * 5.4 + 920) * priorityFactor);
    }
    if (normalizedForm.bookingType === 'LCL') {
      const billableCbm = Math.max(cbm, weight / 1000);
      return Math.round((billableCbm * 138 + 640) * routeFactor * priorityFactor);
    }
    if (normalizedForm.bookingType === 'RoRo') {
      return Math.round((6200 + weight * 0.22 + cbm * 34) * routeFactor * priorityFactor);
    }
    const containerBase =
      normalizedForm.containerType === '20FT Standard' ? 2550 :
      normalizedForm.containerType === '40FT Standard' ? 3720 :
      normalizedForm.containerType === '40FT High Cube' ? 4025 :
      normalizedForm.containerType === 'Reefer 20FT' ? 5280 :
      normalizedForm.containerType === 'Reefer 40FT' ? 6140 :
      normalizedForm.containerType === 'Flat Rack' ? 6480 :
      5580;
    const multimodalBase = normalizedForm.shipmentMode === 'Multimodal' ? 9440 : 8420;
    return Math.round((multimodalBase + containerBase * Math.max(containerQuantity, 1)) * routeFactor * priorityFactor);
  })();

  const baseFreight = Number(normalizedForm.baseFreight) || computedBaseFreight;
  const originCharges = Number(normalizedForm.originCharges) || Math.round((
    (normalizedForm.shipmentMode === 'Air Freight' ? 720 : 980) +
    packageCount * 6 +
    (containerQuantity * 360) +
    (normalizedForm.originHandlingNeeded ? 280 : 0) +
    (normalizedForm.serviceLevel.includes('Door') ? 420 : 0)
  ) * serviceFactor);
  const destinationCharges = Number(normalizedForm.destinationCharges) || Math.round((
    (normalizedForm.shipmentMode === 'Air Freight' ? 640 : 1280) +
    containerQuantity * 395 +
    (normalizedForm.destinationHandlingNeeded ? 340 : 0) +
    (normalizedForm.serviceLevel.endsWith('Door') ? 760 : 0)
  ) * inlandDistanceFactor);
  const customsEstimate = Number(normalizedForm.customsEstimate) || Math.round(
    (normalizedForm.customsReadiness === 'Ready' ? 760 : normalizedForm.customsReadiness === 'Pending' ? 1080 : 1340) +
    (normalizedForm.customsClearanceSupport ? 290 : 0) +
    (normalizedForm.inspectionRequired ? 260 : 0) +
    hazmatSurcharge * 0.22,
  );
  const inlandTransportEstimate = Number(normalizedForm.inlandTransportEstimate) || (
    normalizedForm.truckingRequired
      ? Math.round(
          (normalizedForm.shipmentMode === 'Air Freight' ? 1180 : 2480) *
            inlandDistanceFactor *
            (normalizedForm.serviceLevel === 'Port to Port' ? 0.58 : normalizedForm.serviceLevel === 'Door to Port' ? 0.76 : 1),
        )
      : 0
  );
  const insuranceEstimate = Number(normalizedForm.insuranceEstimate) || (
    normalizedForm.insuranceRequired
      ? Math.round((baseFreight + destinationCharges + inlandTransportEstimate) * (normalizedForm.shipmentMode === 'Air Freight' ? 0.029 : 0.021))
      : 0
  );
  const handlingFees = Number(normalizedForm.handlingFees) || Math.round(
    180 +
    (normalizedForm.warehousingRequired ? 360 : 0) +
    (normalizedForm.sealRequired ? 95 : 0) +
    (normalizedForm.vesselBookingAssistance ? 180 : 0) +
    reeferSurcharge +
    oversizedSurcharge,
  );
  const discount = Number(normalizedForm.discount) || 0;
  const total = baseFreight + originCharges + destinationCharges + customsEstimate + inlandTransportEstimate + insuranceEstimate + handlingFees - discount;

  return {
    baseFreight,
    originCharges,
    destinationCharges,
    customsEstimate,
    inlandTransportEstimate,
    insuranceEstimate,
    handlingFees,
    discount,
    total,
    currency: normalizedForm.currency || 'USD',
  };
}

function deriveOpsCopilotInsight(input: {
  form: IntakeFormState;
  generatedQuote: GeneratedQuoteState | null;
  workflowStep: WorkflowStep;
  pricing: ReturnType<typeof estimatePricing>;
  hints: ReturnType<typeof routeHints>;
  canUseContainerFields: boolean;
}): OpsCopilotInsight {
  const { form, generatedQuote, workflowStep, pricing, hints, canUseContainerFields } = input;
  const blockers: string[] = [];
  const recommendations: string[] = [];
  const highlights: string[] = [];
  let score = 100;

  if (!form.customerName.trim() || !form.customerContactPerson.trim() || !form.phone.trim()) {
    blockers.push('Customer identity and contact fields are incomplete.');
    score -= 16;
  }
  if (!form.originCityPort.trim() || !form.destinationCityPort.trim()) {
    blockers.push('Routing is incomplete. Origin and destination must both be set.');
    score -= 18;
  } else {
    highlights.push(`${form.originCityPort} to ${form.destinationCityPort} routed through ${hints.corridor}.`);
  }
  if (!form.commodityDescription.trim() || Number(form.grossWeight) <= 0 || Number(form.volumeCbm) <= 0) {
    blockers.push('Cargo description, gross weight, and CBM must be complete.');
    score -= 18;
  } else {
    highlights.push(`${Number(form.grossWeight).toLocaleString('en-US')} KG and ${Number(form.volumeCbm).toLocaleString('en-US')} CBM captured.`);
  }
  if (canUseContainerFields && Number(form.containerQuantity) <= 0) {
    blockers.push('Container quantity is missing for a containerized movement.');
    score -= 10;
  }
  if (form.documentsCompleteness === 'Missing') {
    blockers.push('Document completeness is marked missing, which blocks booking confirmation.');
    score -= 18;
  } else if (form.documentsCompleteness === 'Partial') {
    recommendations.push('Document set is only partial. Push invoice, packing list, and permit collection before handoff.');
    score -= 8;
  } else {
    highlights.push('Document completeness is marked complete.');
  }
  if (!form.customsDocumentsReady || form.customsReadiness !== 'Ready') {
    recommendations.push('Customs readiness is not fully green. Pre-clearance coordination should start before origin release.');
    score -= 8;
  } else {
    highlights.push('Customs file is marked ready for execution.');
  }
  if (form.dangerousGoods && !form.unNumber.trim()) {
    blockers.push('Dangerous goods flag is on but the UN number is missing.');
    score -= 14;
  }
  if (form.temperatureControlled) {
    recommendations.push('Temperature-controlled cargo detected. Confirm reefer setpoint and depot availability before final booking.');
  }
  if (form.insuranceRequired) {
    recommendations.push('Insurance is requested. Confirm declared cargo value before customer acceptance.');
  }
  if (workflowStep >= 2 && !generatedQuote?.quoteId) {
    blockers.push('Workflow moved past intake without a quote reference.');
    score -= 14;
  }
  if (generatedQuote?.status === 'waiting_approval') {
    highlights.push(`Quote ${generatedQuote.quoteId} is out for approval.`);
  }
  if (generatedQuote?.status === 'accepted') {
    highlights.push(`Quote ${generatedQuote.quoteId} has customer approval and is ready for booking conversion.`);
  }
  if (pricing.total <= 0) {
    blockers.push('Pricing total is zero or invalid. Review freight and charge logic.');
    score -= 20;
  } else {
    highlights.push(`Commercial total sits at ${pricing.currency} ${pricing.total.toLocaleString('en-US')}.`);
  }

  score = Math.max(0, Math.min(100, score));
  const status = blockers.length > 0 ? 'blocked' : score < 82 ? 'watch' : 'ready';
  const headline =
    status === 'blocked'
      ? 'Execution risk is high. Clear blockers before moving the file forward.'
      : status === 'watch'
        ? 'Core intake is usable, but a few risks should be cleaned up before handoff.'
        : 'Shipment file looks operationally ready for the current stage.';

  if (!recommendations.length) {
    recommendations.push(
      workflowStep === 1
        ? 'Generate the quote and lock the current commercial baseline.'
        : workflowStep === 2
          ? 'Send the quote package and wait for customer approval.'
          : workflowStep === 3
            ? 'Record approval method and timestamp before booking conversion.'
            : workflowStep === 4
              ? 'Confirm booking and push the file to origin operations.'
              : 'Continue execution in the destination desk with documents and tracking already aligned.',
    );
  }

  return { score, status, headline, blockers, recommendations, highlights };
}

function deriveOpsCopilotActions(input: {
  form: IntakeFormState;
  selectedCustomerPresetKey: string;
  canUseContainerFields: boolean;
}): OpsCopilotAction[] {
  const { form, selectedCustomerPresetKey, canUseContainerFields } = input;
  const actions: OpsCopilotAction[] = [];

  if (!selectedCustomerPresetKey) {
    actions.push({
      id: 'customer_preset',
      label: 'Apply Customer Preset',
      description: 'Fill customer, shipper, and notify party from the closest known company profile.',
    });
  }

  const originMatched = (form.shipmentMode === 'Road' ? roadOriginLocationPresets : originLocationPresets).some(
    (item) => item.port === form.originPort && item.cityOrPort === form.originCityPort,
  );
  const destinationMatched = (form.shipmentMode === 'Road' ? roadDestinationLocationPresets : destinationLocationPresets).some(
    (item) => item.port === form.destinationPort && item.cityOrPort === form.destinationCityPort,
  );
  if (!originMatched || !destinationMatched) {
    actions.push({
      id: 'route_preset',
      label: 'Apply Route Preset',
      description: 'Normalize origin and destination using Tikur Abay operational lanes.',
    });
  }

  if (form.documentsCompleteness !== 'Complete' || form.customsReadiness !== 'Ready' || !form.customsDocumentsReady) {
    actions.push({
      id: 'readiness_baseline',
      label: 'Apply Readiness Baseline',
      description: 'Set document and customs readiness to the standard pre-quote baseline.',
    });
  }

  if (
    !String(form.baseFreight || '').trim() ||
    !String(form.originCharges || '').trim() ||
    !String(form.destinationCharges || '').trim() ||
    !String(form.customsEstimate || '').trim()
  ) {
    actions.push({
      id: 'commercial_baseline',
      label: 'Apply Commercial Baseline',
      description: 'Populate charge inputs using the current pricing logic as the starting commercial model.',
    });
  }

  if (canUseContainerFields && !String(form.containerQuantity || '').trim()) {
    actions.unshift({
      id: 'commercial_baseline',
      label: 'Apply Commercial Baseline',
      description: 'Populate charge inputs using the current pricing logic as the starting commercial model.',
    });
  }

  return actions.filter((action, index, array) => array.findIndex((item) => item.id === action.id) === index).slice(0, 3);
}

function routeHints(form: IntakeFormState) {
  if (form.shipmentMode === 'Road') {
    return {
      originDesk: 'Djibouti port desk / Ethiopian inland dispatch',
      destinationDesk: 'Corridor Dispatch -> Customer Delivery',
      corridor: 'Road-only inland movement from Djibouti or Ethiopian inland port to customer',
    };
  }
  const normalizedOrigin = form.originCountry.toLowerCase();
  return {
    originDesk:
      normalizedOrigin.includes('china')
        ? 'Tikur Abay Port Agent Desk (China)'
        : normalizedOrigin.includes('united arab emirates') || normalizedOrigin.includes('dubai')
          ? 'Tikur Abay Port Agent Desk (Dubai)'
          : normalizedOrigin.includes('turkey')
            ? 'Tikur Abay Port Agent Desk (Turkey)'
            : 'Origin commercial desk',
    destinationDesk: form.destinationCountry.toLowerCase().includes('ethiopia') ? 'Djibouti Release -> Transitor -> Corridor Dispatch' : 'Destination agent handoff',
    corridor: form.destinationCityPort.toLowerCase().includes('modjo') ? 'Djibouti -> Modjo inland corridor' : 'Djibouti -> inland dry port corridor',
  };
}

function buildLiveQuoteSummary(form: IntakeFormState, pricing: ReturnType<typeof estimatePricing>) {
  if (form.shipmentMode === 'Multimodal') {
    const seaFreightUsd = pricing.baseFreight + pricing.originCharges;
    const clearanceUsd = pricing.destinationCharges + pricing.customsEstimate + pricing.insuranceEstimate + pricing.handlingFees - pricing.discount;
    const inlandRoadEtb = Math.round(pricing.inlandTransportEstimate * multimodalInlandEtbRate);

    return {
      title: 'USD / ETB split',
      rows: [
        { label: 'Sea freight', amount: seaFreightUsd, currency: 'USD' },
        { label: 'Djibouti clearance', amount: clearanceUsd, currency: 'USD' },
        { label: 'Inland truck / road', amount: inlandRoadEtb, currency: 'ETB' },
      ] satisfies LiveQuoteSummaryRow[],
      note: `Road leg shown in ETB at ${multimodalInlandEtbRate} ETB / USD.`,
    };
  }

  return {
    title: `${pricing.currency} ${pricing.total.toLocaleString('en-US')}`,
    rows: [
      { label: 'Freight', amount: pricing.baseFreight, currency: pricing.currency },
      { label: 'Origin', amount: pricing.originCharges, currency: pricing.currency },
      { label: 'Destination', amount: pricing.destinationCharges, currency: pricing.currency },
      { label: 'Customs', amount: pricing.customsEstimate, currency: pricing.currency },
      { label: 'Inland transport', amount: pricing.inlandTransportEstimate, currency: pricing.currency },
      { label: 'Insurance', amount: pricing.insuranceEstimate, currency: pricing.currency },
      { label: 'Fees', amount: pricing.handlingFees, currency: pricing.currency },
      { label: 'Discount', amount: -pricing.discount, currency: pricing.currency },
    ] satisfies LiveQuoteSummaryRow[],
    note: null,
  };
}

function buildQuoteEmailBreakdown(form: IntakeFormState, pricing: ReturnType<typeof estimatePricing>) {
  if (form.shipmentMode === 'Multimodal') {
    const seaFreightUsd = pricing.baseFreight + pricing.originCharges;
    const clearanceUsd = pricing.destinationCharges + pricing.customsEstimate + pricing.insuranceEstimate + pricing.handlingFees - pricing.discount;
    const inlandRoadEtb = Math.round(pricing.inlandTransportEstimate * multimodalInlandEtbRate);
    return [
      `Sea freight: USD ${seaFreightUsd.toLocaleString('en-US')}`,
      `Djibouti clearance: USD ${clearanceUsd.toLocaleString('en-US')}`,
      `Inland truck / road: ETB ${inlandRoadEtb.toLocaleString('en-US')}`,
    ];
  }

  return [
    `Freight: ${pricing.currency} ${pricing.baseFreight.toLocaleString('en-US')}`,
    `Destination / clearance: ${pricing.currency} ${(pricing.destinationCharges + pricing.customsEstimate).toLocaleString('en-US')}`,
    `Inland truck / road: ${pricing.currency} ${pricing.inlandTransportEstimate.toLocaleString('en-US')}`,
  ];
}

function validateForm(form: IntakeFormState, mode: IntakeMode): InlineErrors {
  const errors: InlineErrors = {};
  const modeConfig = getShipmentModeConfig(form.shipmentMode);
  const quoteRequiredText: Array<[keyof IntakeFormState, string]> = [
    ['customerName', 'Customer name is required.'],
    ['companyName', 'Company name is required.'],
    ['customerContactPerson', 'Customer contact person is required.'],
    ['originCountry', 'Origin country is required.'],
    ['originCityPort', 'Origin city / port is required.'],
    ['destinationCountry', 'Destination country is required.'],
    ['destinationCityPort', 'Destination city / port is required.'],
    ['commodityDescription', 'Commodity description is required.'],
    ['grossWeight', 'Gross weight is required.'],
    ['volumeCbm', 'Volume is required.'],
    ['packageCount', 'Number of packages is required.'],
    ['cargoReadyDate', 'Cargo ready date is required.'],
  ];
  const bookingOnlyRequiredText: Array<[keyof IntakeFormState, string]> = [
    ['customerAddress', 'Customer address is required.'],
    ['shipperName', 'Shipper name is required.'],
    ['shipperAddress', 'Shipper address is required.'],
    ['consigneeName', 'Consignee name is required.'],
  ];

  const requiredText = mode === 'booking'
    ? [...quoteRequiredText, ...bookingOnlyRequiredText]
    : quoteRequiredText;

  requiredText.forEach(([key, message]) => {
    if (!String(form[key] ?? '').trim()) errors[key] = message;
  });

  if (!String(form.phone || '').trim()) {
    errors.phone = 'Phone is required.';
  }

  modeConfig.requiredFields.forEach((field) => {
    if (field in form && !String(form[field as keyof IntakeFormState] ?? '').trim()) {
      if (field === 'truckType') errors.truckType = 'Truck type is required for road shipments.';
      if (field === 'roadDistanceKm') errors.roadDistanceKm = 'Road distance is required for road shipments.';
      if (field === 'cargoLengthCm') errors.cargoLengthCm = 'Length is required for air shipments.';
      if (field === 'cargoWidthCm') errors.cargoWidthCm = 'Width is required for air shipments.';
      if (field === 'cargoHeightCm') errors.cargoHeightCm = 'Height is required for air shipments.';
      if (field === 'containerType') errors.containerQuantity = errors.containerQuantity || 'Container/equipment setup is required.';
    }
  });

  if (form.bookingType !== 'LCL' && form.bookingType !== 'Air Freight' && (!form.containerQuantity || Number(form.containerQuantity) < 1)) {
    errors.containerQuantity = 'Container quantity must be at least 1.';
  }
  if (Number(form.grossWeight) <= 0) errors.grossWeight = 'Gross weight must be greater than zero.';
  if (Number(form.volumeCbm) <= 0) errors.volumeCbm = 'Volume must be greater than zero.';
  if (form.shipmentMode === 'Air Freight') {
    if (Number(form.cargoLengthCm) <= 0) errors.cargoLengthCm = 'Length must be greater than zero.';
    if (Number(form.cargoWidthCm) <= 0) errors.cargoWidthCm = 'Width must be greater than zero.';
    if (Number(form.cargoHeightCm) <= 0) errors.cargoHeightCm = 'Height must be greater than zero.';
  }
  if (form.shipmentMode === 'Road' && Number(form.roadDistanceKm) <= 0) {
    errors.roadDistanceKm = 'Road distance must be greater than zero.';
  }
  if (mode === 'booking' && form.documentsCompleteness === 'Missing') {
    errors.documentsCompleteness = 'Booking confirmation requires at least partial documents.';
  }
  if (form.shipmentMode === 'Road') {
    const roadOriginValid =
      isDjiboutiOrEthiopiaLocation(form.originCountry) ||
      isDjiboutiOrEthiopiaLocation(form.originCityPort) ||
      isDjiboutiOrEthiopiaLocation(form.originPort);
    if (!roadOriginValid) {
      errors.originCountry = 'Road shipments must start from Djibouti port or an Ethiopian inland port.';
      errors.originCityPort = 'Choose Djibouti port or an Ethiopian inland port for road shipments.';
    }
    if (String(form.destinationCountry || '').trim().toLowerCase() !== 'ethiopia') {
      errors.destinationCountry = 'Road shipments must deliver to an Ethiopian customer destination.';
    }
  }

  return errors;
}

function buildValidationNotice(errors: InlineErrors, fallback: string) {
  const highlights = Object.values(errors).slice(0, 3);
  return highlights.length ? `${fallback} ${highlights.join(' ')}` : fallback;
}

function toOriginShipment(request: UnifiedBookingRequest): SupplierDeskShipment {
  return {
    id: `manual-origin-${request.id}`,
    bookingNumber: request.bookingId,
    quoteReference: request.quoteId,
    customerName: request.customerName,
    supplierName: `${request.originCityOrPort} export partner`,
    supplierCode: request.requestSource.toUpperCase(),
    serviceType: request.serviceType,
    originPort: request.portOfLoading,
    dischargePort: request.portOfDischarge,
    finalDestination: request.inlandDestination,
    placeOfReceipt: request.placeOfReceipt || request.originCityOrPort,
    incoterm: request.incoterm,
    freightPaymentTerm: request.freightPaymentTerm || (request.incoterm === 'FOB' ? 'collect' : 'prepaid'),
    currentStage: 'Booking created',
    assignedAgent: originAgentEmail,
    lastUpdated: request.updatedAt,
    etd: request.earliestDepartureDate || '-',
    etaDjibouti: request.requestedArrivalWindow || '-',
    exceptionLabel: request.specialHandlingRequired || request.hazardousFlag || request.outOfGaugeFlag ? 'Special handling' : null,
    tradeReferences: {
      notifyPartyName: request.notifyPartyName || request.contactPerson,
      secondNotifyParty: request.secondNotifyParty || '',
      lcNumber: request.lcNumber || '',
      bankPermitNumber: request.bankPermitNumber || '',
      consigneeTinNumber: request.consigneeTinNumber || '',
      tinAreaCode: request.tinAreaCode || '',
      marksAndNumbers: request.marksAndNumbers || request.commoditySummary,
      packageSummary: request.packageSummary || `${request.containerCount} shipment unit(s)`,
      unNumber: request.unNumber || '',
      shippingCertificateRequired: Boolean(request.shippingCertificateRequired),
    },
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
        marksNumbers: request.marksAndNumbers || request.commoditySummary,
        invoiceRef: `INV-${request.bookingId}`,
        packingListRef: `PL-${request.bookingId}`,
        remarks: `Notify ${request.notifyPartyName || request.contactPerson || request.customerName}. ${request.lcNumber || request.bankPermitNumber ? `LC/Bank ${request.lcNumber || request.bankPermitNumber}. ` : ''}${request.hazardousFlag ? `UN ${request.unNumber || 'Pending'}.` : ''}`.trim(),
        status: 'Needs review',
      },
    ],
    documents: [
      { id: `${request.id}-doc-1`, type: 'Commercial invoice', referenceNumber: `INV-${request.bookingId}`, uploadedDate: '-', status: 'missing', uploadedBy: 'Pending origin upload' },
      { id: `${request.id}-doc-2`, type: 'Packing list', referenceNumber: `PL-${request.bookingId}`, uploadedDate: '-', status: 'missing', uploadedBy: 'Pending origin upload' },
      { id: `${request.id}-doc-3`, type: 'BL draft', referenceNumber: `HBL-${request.bookingId}`, uploadedDate: '-', status: 'missing', uploadedBy: 'Pending origin upload' },
      { id: `${request.id}-doc-4`, type: 'Final BL', referenceNumber: '-', uploadedDate: '-', status: 'missing', uploadedBy: 'Pending origin upload' },
      { id: `${request.id}-doc-5`, type: 'Export permit / customs doc', referenceNumber: request.bankPermitNumber || request.lcNumber || '-', uploadedDate: '-', status: 'missing', uploadedBy: 'Pending origin upload' },
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
      vesselName: request.vesselName || '',
      voyageNumber: request.voyageNumber || '',
      carrier: request.shipmentMode === 'Ocean Freight' ? 'Tikur Abay nominated carrier' : 'Tikur Abay multimodal carrier',
      carrierBlNumber: request.bookingId ? `MBL-${request.bookingId}` : '',
      houseBlNumber: request.bookingId ? `HBL-${request.bookingId}` : '',
      blStatus: 'Draft pending',
      terminalGateInStatus: 'Pending',
      oceanHandoffStatus: 'Not ready',
    },
    exceptions: [
      {
        id: `${request.id}-origin-ex-1`,
        severity: 'Medium',
        issueText: `Booking converted from intake workspace. Origin file still needs document set, container, seal, stuffing, gate-in, and vessel details. Trade refs: ${request.lcNumber || request.bankPermitNumber || 'no LC/bank permit yet'} · TIN ${request.consigneeTinNumber || 'pending'}.`,
        actionLabel: 'Complete origin file',
      },
    ],
  };
}

export function BookingIntakeWorkspace() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode') === 'quote' ? 'quote' : 'booking';
  const quoteParam = searchParams.get('quote') || searchParams.get('query') || searchParams.get('q') || '';
  const bookingParam = searchParams.get('booking') || '';
  const [form, setForm] = useState<IntakeFormState>(defaultForm());
  const [errors, setErrors] = useState<InlineErrors>({});
  const [notice, setNotice] = useState<{ tone: 'success' | 'info'; text: string } | null>(null);
  const [lastRecordId, setLastRecordId] = useState('');
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>(1);
  const [generatedQuote, setGeneratedQuote] = useState<GeneratedQuoteState | null>(null);
  const [isSendingQuote, setIsSendingQuote] = useState(false);
  const [quoteSendState, setQuoteSendState] = useState<'idle' | 'preparing' | 'sending' | 'sent'>('idle');
  const [quoteDeliverySimulated, setQuoteDeliverySimulated] = useState(false);
  const quoteAttachmentCacheRef = useRef<Record<string, QuotePdfAttachment>>({});
  const quoteAttachmentInflightRef = useRef<Record<string, Promise<QuotePdfAttachment>>>({});
  const deferredForm = useDeferredValue(form);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(intakeDraftStorageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as IntakeFormState;
      setForm({ ...defaultForm(), ...parsed });
    } catch {
      // ignore invalid draft payloads
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(intakeDraftStorageKey, JSON.stringify(form));
  }, [form]);

  useEffect(() => {
    const hydrate = () => {
      const requests = readStoredRequests();
      const explicitTarget = (quoteParam || bookingParam).trim().toLowerCase();
      let target = explicitTarget;
      if (!target && typeof window !== 'undefined') {
        try {
          const raw = window.localStorage.getItem(intakeLastRecordStorageKey);
          if (raw) {
            const parsed = JSON.parse(raw) as { bookingId?: string; quoteId?: string };
            target = String(parsed.bookingId || parsed.quoteId || '').trim().toLowerCase();
          }
        } catch {
          target = '';
        }
      }
      if (!target) return;
      const matched = requests.find((item) =>
        String(item.quoteId || '').trim().toLowerCase() === target ||
        String(item.bookingId || '').trim().toLowerCase() === target,
      );
      if (!matched) return;
      setForm(formFromRequest(matched));
      setGeneratedQuote(generatedQuoteFromRequest(matched));
      setLastRecordId(matched.bookingId || matched.quoteId || '');
      setWorkflowStep(workflowStepFromRequest(matched));
      setQuoteSendState(matched.approvalStatus === 'waiting_approval' ? 'sent' : 'idle');
      setQuoteDeliverySimulated(false);
      prewarmQuoteAttachment(matched);
      setNotice(null);
      if (!explicitTarget) {
        const params = new URLSearchParams(searchParams.toString());
        params.set('mode', matched.bookingId ? 'booking' : 'quote');
        if (matched.bookingId) {
          params.set('booking', matched.bookingId);
          params.delete('quote');
          params.delete('q');
        } else {
          params.set('quote', matched.quoteId);
          params.delete('booking');
          params.delete('q');
        }
        router.replace(`${pathname}?${params.toString()}`);
      }
    };

    hydrate();
    window.addEventListener(sharedQuoteStorageUpdatedEvent, hydrate as EventListener);
    return () => {
      window.removeEventListener(sharedQuoteStorageUpdatedEvent, hydrate as EventListener);
    };
  }, [bookingParam, pathname, quoteParam, router, searchParams]);

  useEffect(() => {
    if (typeof window === 'undefined' || !lastRecordId) return;
    const activeRequest = readStoredRequests().find((item) => item.bookingId === lastRecordId || item.quoteId === lastRecordId);
    const payload = {
      bookingId: activeRequest?.bookingId || (lastRecordId.startsWith('TB-') ? lastRecordId : ''),
      quoteId: activeRequest?.quoteId || (lastRecordId.startsWith('QT-') ? lastRecordId : ''),
    };
    window.localStorage.setItem(intakeLastRecordStorageKey, JSON.stringify(payload));
  }, [lastRecordId]);

  async function ensureQuoteAttachment(request: UnifiedBookingRequest) {
    const cached = quoteAttachmentCacheRef.current[request.quoteId];
    if (cached) return cached;
    const inflight = quoteAttachmentInflightRef.current[request.quoteId];
    if (inflight) return inflight;
    const nextPromise = buildQuotePdfAttachment(request).then((attachment) => {
      quoteAttachmentCacheRef.current[request.quoteId] = attachment;
      delete quoteAttachmentInflightRef.current[request.quoteId];
      return attachment;
    });
    quoteAttachmentInflightRef.current[request.quoteId] = nextPromise;
    return nextPromise;
  }

  function prewarmQuoteAttachment(request: UnifiedBookingRequest) {
    void ensureQuoteAttachment(request);
  }

  const pricing = useMemo(() => estimatePricing(form), [form]);
  const liveQuoteSummary = useMemo(() => buildLiveQuoteSummary(form, pricing), [form, pricing]);
  const hints = useMemo(() => routeHints(form), [form]);
  const modeConfig = useMemo(() => getShipmentModeConfig(form.shipmentMode), [form.shipmentMode]);
  const serviceLevelOptions = useMemo(() => serviceLevelOptionsForMode(form.shipmentMode), [form.shipmentMode]);
  const bookingTypeOptions = useMemo(() => bookingTypeOptionsForMode(form.shipmentMode), [form.shipmentMode]);
  const shipmentDirectionOptions = useMemo(() => shipmentDirectionOptionsForMode(form.shipmentMode), [form.shipmentMode]);
  const activeOriginLocationPresets = useMemo(() => (form.shipmentMode === 'Road' ? roadOriginLocationPresets : originLocationPresets), [form.shipmentMode]);
  const activeDestinationLocationPresets = useMemo(() => (form.shipmentMode === 'Road' ? roadDestinationLocationPresets : destinationLocationPresets), [form.shipmentMode]);
  const activeOriginCountryOptions = useMemo(() => (form.shipmentMode === 'Road' ? roadOriginCountryOptions : originCountryOptions), [form.shipmentMode]);
  const activeOriginCityPortOptions = useMemo(() => (form.shipmentMode === 'Road' ? roadOriginCityPortOptions : originCityPortOptions), [form.shipmentMode]);
  const activeOriginPortOptions = useMemo(() => (form.shipmentMode === 'Road' ? roadOriginPortOptions : originPortOptions), [form.shipmentMode]);
  const activeDestinationCountryOptions = useMemo(() => (form.shipmentMode === 'Road' ? roadDestinationCountryOptions : destinationCountryOptions), [form.shipmentMode]);
  const activeDestinationCityPortOptions = useMemo(() => (form.shipmentMode === 'Road' ? roadDestinationCityPortOptions : destinationCityPortOptions), [form.shipmentMode]);
  const activeDestinationPortOptions = useMemo(() => (form.shipmentMode === 'Road' ? roadDestinationPortOptions : destinationPortOptions), [form.shipmentMode]);
  const selectedCustomerPresetKey = useMemo(() => {
    const match = customerPresets.find((preset) => preset.customerName.toLowerCase() === form.customerName.trim().toLowerCase());
    return match?.key || '';
  }, [form.customerName]);
  const canUseContainerFields = (form.shipmentMode === 'Ocean Freight' || form.shipmentMode === 'Multimodal') && form.bookingType !== 'LCL' && form.bookingType !== 'Air Freight';
  const showAirFields = form.shipmentMode === 'Air Freight';
  const showRoadFields = form.shipmentMode === 'Road';
  const showVesselFields = form.shipmentMode === 'Ocean Freight' || form.shipmentMode === 'Multimodal';
  const airChargeableWeight = useMemo(() => {
    const weight = Number(form.grossWeight) || 0;
    const lengthCm = Number(form.cargoLengthCm) || 0;
    const widthCm = Number(form.cargoWidthCm) || 0;
    const heightCm = Number(form.cargoHeightCm) || 0;
    return Math.max(weight, lengthCm > 0 && widthCm > 0 && heightCm > 0 ? (lengthCm * widthCm * heightCm) / 6000 : 0);
  }, [form.grossWeight, form.cargoHeightCm, form.cargoLengthCm, form.cargoWidthCm]);
  const copilotInsight = useMemo(
    () =>
      deriveOpsCopilotInsight({
        form: deferredForm,
        generatedQuote,
        workflowStep,
        pricing,
        hints,
        canUseContainerFields,
      }),
    [deferredForm, generatedQuote, workflowStep, pricing, hints, canUseContainerFields],
  );
  const copilotActions = useMemo(
    () => deriveOpsCopilotActions({ form, selectedCustomerPresetKey, canUseContainerFields }),
    [form, selectedCustomerPresetKey, canUseContainerFields],
  );
  const readinessItems = [
    { label: 'Documents', value: form.documentsCompleteness },
    { label: 'Customs', value: form.customsReadiness },
    { label: 'Trucking', value: form.truckingRequired ? 'Required' : 'Not required' },
    { label: 'Warehousing', value: form.warehousingRequired ? 'Required' : 'Not required' },
    { label: 'Insurance', value: form.insuranceRequired ? 'Required' : 'Not required' },
  ];

  function applyOriginPreset(presetKey: string) {
    const preset = (form.shipmentMode === 'Road' ? roadOriginLocationPresets : originLocationPresets).find((item) => item.key === presetKey);
    if (!preset) return;
    setForm((current) => normalizeRoadShipmentForm({
      ...current,
      originCountry: preset.country,
      originCityPort: preset.cityOrPort,
      originPort: preset.port,
      placeOfReceipt: preset.port,
      pickupAddress: preset.pickupAddress,
    }));
    setErrors((current) => ({
      ...current,
      originCountry: undefined,
      originCityPort: undefined,
    }));
  }

  function syncOriginPresetFromPort(portValue: string) {
    const preset = (form.shipmentMode === 'Road' ? roadOriginLocationPresets : originLocationPresets).find((item) => item.port.toLowerCase() === portValue.trim().toLowerCase());
    if (!preset) return;
    setForm((current) => normalizeRoadShipmentForm({
      ...current,
      originCountry: preset.country,
      originCityPort: preset.cityOrPort,
      originPort: preset.port,
      placeOfReceipt: current.placeOfReceipt.trim() ? current.placeOfReceipt : preset.port,
      pickupAddress: current.pickupAddress.trim() ? current.pickupAddress : preset.pickupAddress,
    }));
  }

  function applyDestinationPreset(presetKey: string) {
    const preset = (form.shipmentMode === 'Road' ? roadDestinationLocationPresets : destinationLocationPresets).find((item) => item.key === presetKey);
    if (!preset) return;
    setForm((current) => normalizeRoadShipmentForm({
      ...current,
      destinationCountry: preset.country,
      destinationCityPort: preset.cityOrPort,
      destinationPort: preset.port,
      deliveryAddress: preset.deliveryAddress,
    }));
    setErrors((current) => ({
      ...current,
      destinationCountry: undefined,
      destinationCityPort: undefined,
    }));
  }

  function syncDestinationPresetFromPort(portValue: string) {
    const preset = (form.shipmentMode === 'Road' ? roadDestinationLocationPresets : destinationLocationPresets).find((item) => item.port.toLowerCase() === portValue.trim().toLowerCase());
    if (!preset) return;
    setForm((current) => normalizeRoadShipmentForm({
      ...current,
      destinationCountry: preset.country,
      destinationCityPort: current.destinationCityPort.trim() ? current.destinationCityPort : preset.cityOrPort,
      destinationPort: preset.port,
      deliveryAddress: current.deliveryAddress.trim() ? current.deliveryAddress : preset.deliveryAddress,
    }));
  }

  function applyCustomerPreset(presetKey: string) {
    const preset = customerPresets.find((item) => item.key === presetKey);
    if (!preset) return;
    setForm((current) => buildExistingCustomerIntakeForm(current, preset));
    setErrors((current) => ({
      ...current,
      customerName: undefined,
      companyName: undefined,
      customerContactPerson: undefined,
      customerAddress: undefined,
      phone: undefined,
      email: undefined,
      shipperName: undefined,
      shipperAddress: undefined,
      consigneeName: undefined,
      originCountry: undefined,
      originCityPort: undefined,
      destinationCountry: undefined,
      destinationCityPort: undefined,
      commodityDescription: undefined,
      grossWeight: undefined,
      volumeCbm: undefined,
      packageCount: undefined,
      cargoReadyDate: undefined,
      documentsCompleteness: undefined,
    }));
    setNotice({ tone: 'info', text: preset.customerName + ' loaded with the full customer, route, cargo, readiness, and pricing baseline.' });
  }

  function applyBestCustomerPreset() {
    const matched =
      customerPresets.find((preset) => preset.customerName.toLowerCase() === form.customerName.trim().toLowerCase()) ||
      customerPresets.find((preset) => preset.companyName.toLowerCase() === form.companyName.trim().toLowerCase()) ||
      customerPresets[0];
    if (!matched) return;
    applyCustomerPreset(matched.key);
    setNotice({ tone: 'info', text: `Copilot applied the ${matched.customerName} customer preset.` });
  }

  function applyBestRoutePreset() {
    const originPreset = (form.shipmentMode === 'Road' ? roadOriginLocationPresets : originLocationPresets).find(
      (item) =>
        item.port.toLowerCase() === form.originPort.trim().toLowerCase() ||
        item.cityOrPort.toLowerCase() === form.originCityPort.trim().toLowerCase(),
    ) || (form.shipmentMode === 'Road' ? roadOriginLocationPresets[0] : originLocationPresets[0]);
    const destinationPreset = (form.shipmentMode === 'Road' ? roadDestinationLocationPresets : destinationLocationPresets).find(
      (item) =>
        item.port.toLowerCase() === form.destinationPort.trim().toLowerCase() ||
        item.cityOrPort.toLowerCase() === form.destinationCityPort.trim().toLowerCase(),
    ) || (form.shipmentMode === 'Road' ? roadDestinationLocationPresets[0] : destinationLocationPresets[0]);

    if (originPreset) applyOriginPreset(originPreset.key);
    if (destinationPreset) applyDestinationPreset(destinationPreset.key);
    setNotice({ tone: 'info', text: 'Copilot normalized the shipment route using the closest operational lane presets.' });
  }

  function applyReadinessBaseline() {
    setForm((current) => normalizeRoadShipmentForm({
      ...current,
      customsDocumentsReady: true,
      customsReadiness: 'Ready',
      documentsCompleteness: 'Complete',
      truckingRequired: current.truckingRequired || current.shipmentMode !== 'Air Freight',
      customsClearanceSupport: true,
      originHandlingNeeded: true,
      destinationHandlingNeeded: true,
    }));
    setErrors((current) => ({
      ...current,
      documentsCompleteness: undefined,
    }));
    setNotice({ tone: 'info', text: 'Copilot applied the standard readiness baseline for documents, customs, and handling.' });
  }

  function applyCommercialBaseline() {
    setForm((current) => {
      const estimate = estimatePricing(current);
      return normalizeRoadShipmentForm({
        ...current,
        baseFreight: String(estimate.baseFreight),
        originCharges: String(estimate.originCharges),
        destinationCharges: String(estimate.destinationCharges),
        customsEstimate: String(estimate.customsEstimate),
        inlandTransportEstimate: String(estimate.inlandTransportEstimate),
        insuranceEstimate: String(estimate.insuranceEstimate),
        handlingFees: String(estimate.handlingFees),
        discount: String(estimate.discount),
        currency: estimate.currency,
      });
    });
    setNotice({ tone: 'info', text: 'Copilot populated the pricing inputs from the current commercial baseline.' });
  }

  function runCopilotAction(actionId: OpsCopilotAction['id']) {
    if (actionId === 'customer_preset') {
      applyBestCustomerPreset();
      return;
    }
    if (actionId === 'route_preset') {
      applyBestRoutePreset();
      return;
    }
    if (actionId === 'readiness_baseline') {
      applyReadinessBaseline();
      return;
    }
    applyCommercialBaseline();
  }

  function setField<K extends keyof IntakeFormState>(key: K, value: IntakeFormState[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === 'shipmentMode') {
        if (value === 'Road') {
          next.currency = 'ETB';
        } else if (current.currency === 'ETB') {
          next.currency = 'USD';
        }
      }
      return normalizeRoadShipmentForm(next);
    });
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function handleCustomerTypeChange(nextType: CustomerType) {
    if (nextType === 'New customer') {
      setForm((current) => buildBlankIntakeForm(current));
      setErrors({});
      setGeneratedQuote(null);
      setLastRecordId('');
      setWorkflowStep(1);
      setQuoteSendState('idle');
      setQuoteDeliverySimulated(false);
      setNotice({ tone: 'info', text: 'New customer selected. Intake form has been cleared across Sections 1 to 7.' });
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(intakeLastRecordStorageKey);
      }
      const params = new URLSearchParams(searchParams.toString());
      params.delete('booking');
      params.delete('quote');
      params.delete('q');
      router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname);
      return;
    }
    const preset = customerPresets.find((item) => item.key === selectedCustomerPresetKey) || customerPresets[0];
    if (preset) {
      applyCustomerPreset(preset.key);
      return;
    }
    setField('customerType', nextType);
  }

  function switchMode(nextMode: IntakeMode) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('mode', nextMode);
    router.replace(`${pathname}?${params.toString()}`);
    setNotice(null);
  }

  function saveDraft() {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(intakeDraftStorageKey, JSON.stringify(form));
    }
    setNotice({ tone: 'info', text: 'Draft saved to the booking intake workspace.' });
  }

  function buildQuoteDraftState(currentQuote?: GeneratedQuoteState | null) {
    const quoteId = currentQuote?.quoteId || generateWorkflowReference('QT');
    const validityUntil = form.preferredDepartureWindow.split(' ')[0] || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return {
      quoteId,
      bookingId: currentQuote?.bookingId || '',
      validityUntil,
      status: 'draft',
      sentAt: '',
      approvalMethod: '',
      approvalNote: '',
      approvedAt: '',
      approvedBy: '',
    } satisfies GeneratedQuoteState;
  }

  function persistQuoteDraft(quote: GeneratedQuoteState) {
    const request = buildRequest('quote', quote);
    const draftRecord: UnifiedBookingRequest = {
      ...request,
      quoteId: quote.quoteId,
      quoteStatus: 'quote_under_review',
      approvalStatus: 'draft',
      updatedAt: new Date().toISOString(),
    };
    persistRequest(draftRecord);
  }

  function saveQuoteDraft() {
    const nextErrors = validateForm(form, 'quote');
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setNotice({ tone: 'info', text: buildValidationNotice(nextErrors, 'Complete the required shipment details before saving the quote draft.') });
      return;
    }
    const draftQuote = buildQuoteDraftState(generatedQuote);
    setGeneratedQuote(draftQuote);
    persistQuoteDraft(draftQuote);
    setQuoteDeliverySimulated(false);
    setQuoteSendState('idle');
    setWorkflowStep(2);
    setLastRecordId(draftQuote.quoteId);
    setNotice({ tone: 'success', text: `Quote draft ${draftQuote.quoteId} saved. Review and send it to the customer for approval.` });
  }

  async function sendQuoteToCustomer() {
    const nextErrors = validateForm(form, 'quote');
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setNotice({ tone: 'info', text: buildValidationNotice(nextErrors, 'Complete the required shipment details before sending the quote to the customer.') });
      return;
    }
    const activeQuote = generatedQuote || buildQuoteDraftState(generatedQuote);
    if (!generatedQuote) {
      setGeneratedQuote(activeQuote);
      persistQuoteDraft(activeQuote);
      setQuoteDeliverySimulated(false);
      setLastRecordId(activeQuote.quoteId);
      setWorkflowStep(2);
    }
    if (isSendingQuote || activeQuote.status === 'waiting_approval') {
      return;
    }
    setIsSendingQuote(true);
    const sentAt = new Date().toISOString();
    const quoteRequest = buildRequest('quote', activeQuote);
    const recipientEmail = resolveCustomerEmailAddress(form);
    const telegramRecipient = resolveCustomerEmailAddress(form) || form.phone.trim();
    const subject = `Quote ${activeQuote.quoteId} from Tikur Abay`;
    const quoteBreakdownLines = buildQuoteEmailBreakdown(form, pricing);
    const messageBody = `Dear ${form.customerName || 'Customer'},

Your quote ${activeQuote.quoteId} is ready for review.

Route: ${form.originCityPort} -> ${form.destinationCityPort}
Quoted amount: ${pricing.currency} ${pricing.total.toLocaleString('en-US')}
Shipment mode: ${form.shipmentMode}
Service level: ${form.serviceLevel}
Booking type: ${form.bookingType}
Incoterm: ${form.incoterm}

Shipment details:
- Consignee: ${form.consigneeName || '-'}
- Notify party: ${form.notifyPartyName || '-'}
- Place of receipt: ${form.placeOfReceipt || '-'}
- Port of loading: ${form.originPort || form.originCityPort}
- Port of discharge: ${form.destinationPort || form.destinationCityPort}
- Final delivery: ${form.deliveryAddress || form.destinationCityPort}
- Cargo: ${form.commodityDescription || '-'}
- HS code: ${form.hsCode || '-'}
- Marks & numbers: ${form.marksAndNumbers || '-'}
- Packages: ${`${form.packageCount} ${form.packagingType}`.trim() || '-'}
- Gross weight: ${form.grossWeight || '-'}
- Volume: ${form.volumeCbm || '-'}
- Container setup: ${`${form.containerType} x ${form.containerQuantity}`.trim() || '-'}

Commercial breakdown:
- ${quoteBreakdownLines.join('\n- ')}

Commercial controls:
- LC number: ${form.lcNumber || '-'}
- Bank permit: ${form.bankPermitNumber || '-'}
- Consignee TIN: ${form.consigneeTinNumber || '-'}
- TIN area code: ${form.tinAreaCode || '-'}
- Vessel / Voyage: ${(form.vesselName || '-')}${form.voyageNumber ? ` / ${form.voyageNumber}` : ''}
- ETA loading port: ${form.etaLoadingPort || '-'}

Validity date: ${activeQuote.validityUntil}
Payment term: ${String(form.freightPaymentTerm || 'prepaid').replace(/^\w/, (value) => value.toUpperCase())}

Please review and approve the quote to continue with booking.

Tikur Abay Team`;
    let pdfAttachment: QuotePdfAttachment | null = null;
    let sendResult: DirectCommunicationResult | null = null;
    let emailRecord: DirectCommunicationRecord | undefined;
    let telegramRecord: DirectCommunicationRecord | undefined;
    try {
      setQuoteSendState('preparing');
      pdfAttachment = await ensureQuoteAttachment(quoteRequest);
      setQuoteSendState('sending');
      sendResult = await apiPost<DirectCommunicationResult>('/communications/direct-send', {
        entityType: 'custom',
        entityId: activeQuote.quoteId,
        channels: [recipientEmail ? 'email' : 'telegram', 'telegram'],
        templateKey: 'custom_message',
        language: 'en',
        subject,
        messageBody,
        recipientName: form.customerName || 'Customer',
        recipientType: 'customer',
        recipientOverrides: {
          email: recipientEmail,
          telegram: telegramRecipient,
        },
        attachments: [
          {
            filename: pdfAttachment.attachmentName,
            contentBase64: pdfAttachment.attachmentContentBase64,
            contentType: pdfAttachment.attachmentMimeType,
            attachmentUrl: pdfAttachment.attachmentUrl,
          },
        ],
      });
      emailRecord = sendResult.records?.find((record) => record.channel === 'email');
      telegramRecord = sendResult.records?.find((record) => record.channel === 'telegram');
      if (recipientEmail && !emailRecord) {
        throw new Error('Email delivery record was not created.');
      }
    } catch (error) {
      if (recipientEmail && pdfAttachment) {
          recordLocalCommunication({
            entityType: 'quote',
            entityId: activeQuote.quoteId,
          recipientAddress: recipientEmail,
          channel: 'email',
          subject,
          templateKey: 'quote_review_request',
          messageBody,
          attachmentName: pdfAttachment.attachmentName,
          attachmentMimeType: pdfAttachment.attachmentMimeType,
          attachmentUrl: pdfAttachment.attachmentUrl,
        });
      }
      if (telegramRecipient) {
          recordLocalCommunication({
            entityType: 'quote',
            entityId: activeQuote.quoteId,
          recipientAddress: telegramRecipient,
          channel: 'telegram',
          subject,
          templateKey: 'quote_review_request',
          messageBody,
          attachmentName: pdfAttachment?.attachmentName,
          attachmentMimeType: pdfAttachment?.attachmentMimeType,
          attachmentUrl: pdfAttachment?.attachmentUrl,
        });
      }
      setQuoteSendState('idle');
      setIsSendingQuote(false);
      setNotice({
        tone: 'info',
        text: error instanceof Error
          ? `Quote send failed: ${error.message}`
          : 'Quote send failed before delivery. Check communications configuration and try again.',
      });
      return;
    }

    recordLocalCommunication({
      entityType: 'quote',
      entityId: activeQuote.quoteId,
      recipientAddress: localCustomerConsoleEmail,
      channel: 'in_app',
      subject,
      templateKey: 'quote_review_request',
      messageBody,
    });
    setGeneratedQuote((current) => current ? {
      ...current,
      status: 'waiting_approval',
      bookingId: current.bookingId || '',
      sentAt,
    } : current);
    updateStoredRequestStatus(activeQuote.quoteId, (request) => ({
      ...request,
      quoteStatus: 'quote_sent',
      approvalStatus: 'waiting_approval',
      localPortalRecipientEmail: localCustomerConsoleEmail,
      notificationChannels: ['email', 'telegram', 'in_app'],
      updatedAt: sentAt,
      remarks: `${request.remarks || ''}\nQuote sent to customer for approval.`.trim(),
    }));
    setWorkflowStep(3);
    setQuoteSendState('sent');
    setQuoteDeliverySimulated(Boolean(emailRecord?.metadata?.simulated) || !recipientEmail);
    setNotice({
      tone: 'success',
      text: recipientEmail
        ? `Quote ${activeQuote.quoteId} sent to ${emailRecord?.recipientAddress || recipientEmail}${emailRecord?.metadata?.simulated ? ' (simulated/test delivery)' : ''}. Customer console delivery was also recorded.`
        : `Quote ${activeQuote.quoteId} sent through the communication relay and recorded in the customer console.`,
    });
    setIsSendingQuote(false);
  }

  function markQuoteAccepted(method: ApprovalMethod) {
    if (!generatedQuote) return;
    const approvedAt = new Date().toISOString();
    const bookingId = generatedQuote.bookingId || deriveBookingIdFromQuote(generatedQuote.quoteId);
    setGeneratedQuote({
      ...generatedQuote,
      status: 'accepted',
      bookingId,
      approvalMethod: method,
      approvalNote: generatedQuote.approvalNote,
      approvedAt,
      approvedBy: 'Booking intake workspace',
    });
    updateStoredRequestStatus(generatedQuote.quoteId, (request) => ({
      ...request,
      bookingId: request.bookingId || bookingId,
      quoteStatus: 'quote_accepted',
      bookingStatus: request.bookingStatus || 'draft',
      approvalStatus: 'accepted',
      approvalMethod: method,
      approvalRecordedBy: 'Booking intake workspace',
      approvalRecordedAt: approvedAt,
      acceptedAt: approvedAt,
      updatedAt: approvedAt,
      remarks: `${request.remarks || ''}\nCustomer approval recorded via ${method.toLowerCase()}.`.trim(),
    }));
    setWorkflowStep(4);
    setQuoteDeliverySimulated(false);
    setLastRecordId(bookingId);
    setNotice({ tone: 'success', text: `Customer approval recorded by ${method.toLowerCase()}. Booking number ${bookingId} is now reserved and ready for confirmation.` });
  }

  function markQuoteRejected() {
    if (!generatedQuote) return;
    const rejectedAt = new Date().toISOString();
    setGeneratedQuote({
      ...generatedQuote,
      status: 'rejected',
      bookingId: generatedQuote.bookingId || '',
      approvedAt: '',
      approvedBy: '',
    });
    updateStoredRequestStatus(generatedQuote.quoteId, (request) => ({
      ...request,
      quoteStatus: 'quote_rejected',
      approvalStatus: 'rejected',
      approvalRecordedBy: '',
      approvalRecordedAt: rejectedAt,
      acceptedAt: '',
      updatedAt: rejectedAt,
      remarks: `${request.remarks || ''}\nCustomer rejected the quote.`.trim(),
    }));
    setWorkflowStep(3);
    setQuoteDeliverySimulated(false);
    setNotice({ tone: 'info', text: `Quote ${generatedQuote.quoteId} marked as rejected. Revise the shipment details or pricing before sending again.` });
  }

  function reviseQuote() {
    if (!generatedQuote) return;
    const revisedAt = new Date().toISOString();
    setGeneratedQuote({
      ...generatedQuote,
      status: 'draft',
      bookingId: generatedQuote.bookingId || '',
      sentAt: '',
      approvedAt: '',
      approvedBy: '',
      approvalMethod: '',
    });
    updateStoredRequestStatus(generatedQuote.quoteId, (request) => ({
      ...request,
      quoteStatus: 'quote_under_review',
      approvalStatus: 'draft',
      approvalMethod: '',
      approvalRecordedBy: '',
      approvalRecordedAt: '',
      acceptedAt: '',
      updatedAt: revisedAt,
      remarks: `${request.remarks || ''}\nQuote returned for revision.`.trim(),
    }));
    setWorkflowStep(2);
    setQuoteDeliverySimulated(false);
    setNotice({ tone: 'info', text: `Quote ${generatedQuote.quoteId} returned to draft review.` });
  }

  function startNewQuote() {
    const next = buildBlankIntakeForm(form);
    setForm(next);
    setErrors({});
    setGeneratedQuote(null);
    setLastRecordId('');
    setWorkflowStep(1);
    setQuoteSendState('idle');
    setQuoteDeliverySimulated(false);
    setNotice({ tone: 'info', text: 'Started a new quote. Previous quote and booking context has been cleared.' });
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(intakeLastRecordStorageKey);
      window.localStorage.setItem(intakeDraftStorageKey, JSON.stringify(next));
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set('mode', 'quote');
    params.delete('booking');
    params.delete('quote');
    params.delete('q');
    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  }

  function startNewBooking() {
    const next = buildBlankIntakeForm(form);
    setForm(next);
    setErrors({});
    setGeneratedQuote(null);
    setLastRecordId('');
    setWorkflowStep(1);
    setQuoteSendState('idle');
    setQuoteDeliverySimulated(false);
    setNotice({ tone: 'info', text: 'Started a new booking. Previous quote and booking context has been cleared.' });
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(intakeLastRecordStorageKey);
      window.localStorage.setItem(intakeDraftStorageKey, JSON.stringify(next));
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set('mode', 'booking');
    params.delete('booking');
    params.delete('quote');
    params.delete('q');
    router.replace(params.toString() ? pathname + '?' + params.toString() : pathname);
  }

  function resetForm() {
    const next = defaultForm();
    setForm(next);
    setErrors({});
    setNotice({ tone: 'info', text: 'Intake form reset.' });
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(intakeDraftStorageKey, JSON.stringify(next));
    }
  }

  function buildRequest(targetMode: IntakeMode, quoteOverride?: GeneratedQuoteState | null): UnifiedBookingRequest {
    const now = new Date().toISOString();
    const effectiveQuote = quoteOverride === undefined ? generatedQuote : quoteOverride;
    const quoteId = effectiveQuote?.quoteId || generateWorkflowReference('QT');
    const bookingId = effectiveQuote?.bookingId || deriveBookingIdFromQuote(quoteId);
    const shipmentId = deriveShipmentIdFromQuote(quoteId);
    const routeSummary = `${form.originCityPort} -> ${form.destinationCityPort}`;
    const commoditySummary = `${form.cargoCategory} · ${form.packagingType}`;
    return {
      id: `quote-${Date.now()}`,
      quoteId,
      bookingId: targetMode === 'booking' ? bookingId : '',
      convertedToShipmentId: targetMode === 'booking' ? shipmentId : '',
      requestSource: form.requestSource,
      quoteStatus: targetMode === 'booking' ? 'assigned_to_origin' : effectiveQuote?.status === 'accepted' ? 'quote_accepted' : effectiveQuote?.status === 'waiting_approval' ? 'quote_sent' : 'quote_sent',
      bookingStatus: targetMode === 'booking' ? 'assigned_to_origin' : 'draft',
      quoteAmount: pricing.total,
      quoteCurrency: pricing.currency,
      acceptedAt: targetMode === 'booking' ? (effectiveQuote?.approvedAt || now) : '',
      assignedOriginAgentId: targetMode === 'booking' ? 'origin-agent-supplier' : '',
      assignedOriginAgentEmail: targetMode === 'booking' ? originAgentEmail : '',
      approvalStatus: effectiveQuote?.status || (targetMode === 'booking' ? 'accepted' : 'draft'),
      approvalMethod: effectiveQuote?.approvalMethod || '',
      approvalRecordedBy: effectiveQuote?.approvedBy || '',
      approvalRecordedAt: effectiveQuote?.approvedAt || '',
      createdAt: now,
      updatedAt: now,
      requestedBy: 'Booking intake workspace',
      assignedDesk: targetMode === 'booking' ? modeConfig.bookingDeskLabel.replace('Open in ', '') : 'Commercial pricing desk',
      customerName: form.customerName,
      customerAddress: form.customerAddress,
      consigneeName: form.consigneeName,
      contactPerson: form.customerContactPerson || form.customerName,
      phone: form.phone,
      email: resolveCustomerEmailAddress(form),
      localPortalRecipientEmail: localCustomerConsoleEmail,
      notificationChannels: ['email', 'telegram', 'in_app'],
      company: form.companyName,
      customerTinVatNumber: form.customerTinVatNumber,
      shipperName: form.shipperName,
      shipperContactPerson: form.shipperContactPerson,
      shipperAddress: form.shipperAddress,
      shipperPhone: form.shipperPhone,
      shipperEmail: form.shipperEmail,
      notifyPartyName: form.notifyPartyName,
      secondNotifyParty: form.secondNotifyParty,
      incoterm: form.incoterm,
      serviceType: form.shipmentMode === 'Road' || form.shipmentMode === 'Air Freight' ? 'unimodal' : 'multimodal',
      shipmentMode: form.shipmentMode,
      bookingType: form.bookingType,
      serviceLevel: form.serviceLevel,
      originCountry: form.originCountry,
      originCityOrPort: form.originCityPort,
      portOfLoading: form.originCityPort,
      portOfDischarge: form.destinationCityPort,
      placeOfReceipt: form.placeOfReceipt,
      inlandDestination: form.destinationCityPort,
      finalDeliveryLocation: form.deliveryAddress,
      commoditySummary,
      cargoDescription: form.commodityDescription,
      hsCode: form.hsCode,
      marksAndNumbers: form.marksAndNumbers,
      packageSummary: `${form.packageCount} ${form.packagingType}`.trim(),
      freightPaymentTerm: form.freightPaymentTerm,
      prepaidAt: form.prepaidAt,
      collectAt: form.collectAt,
      lcNumber: form.lcNumber,
      bankPermitNumber: form.bankPermitNumber,
      consigneeTinNumber: form.consigneeTinNumber,
      tinAreaCode: form.tinAreaCode,
      unNumber: form.unNumber,
      vesselName: form.vesselName,
      voyageNumber: form.voyageNumber,
      etaLoadingPort: form.etaLoadingPort,
      shippingCertificateRequired: form.shippingCertificateRequired,
      hazardousFlag: form.dangerousGoods,
      temperatureControl: form.temperatureControlled,
      outOfGaugeFlag: form.containerType === 'Flat Rack' || form.containerType === 'Open Top',
      specialHandlingRequired: Boolean(form.specialHandlingNotes.trim()),
      specialHandlingNote: form.specialHandlingNotes,
      containerType: canUseContainerFields ? toContainerType(form.containerType) : '20GP',
      containerCount: canUseContainerFields ? Math.max(Number(form.containerQuantity) || 1, 1) : 1,
      weightPerContainer: Math.round((Number(form.grossWeight) || 0) / Math.max(canUseContainerFields ? Number(form.containerQuantity) || 1 : 1, 1)),
      totalWeight: Number(form.grossWeight) || 0,
      cbm: Number(form.volumeCbm) || 0,
      requestedLoadingDate: form.cargoReadyDate,
      earliestDepartureDate: form.preferredDepartureWindow,
      requestedArrivalWindow: form.preferredArrivalWindow,
      priceOwner: form.customerType === 'Existing customer' ? 'Consignee' : 'Customer',
      pricingBreakdown: pricing,
      remarks: `${routeSummary}. Shipper ${form.shipperName}. Notify by ${form.notifyCustomerBy}. Receipt ${form.placeOfReceipt}. Delivery ${form.deliveryAddress}. Document path: ${modeConfig.documents.join(', ')}. ${form.equipmentNotes}`.trim(),
      reeferSettings: {
        requiredTemperature: form.temperatureControlled ? 'Controlled per commodity profile' : '',
        ventilation: form.temperatureControlled ? 'Standard airflow' : '',
        humidity: form.temperatureControlled ? 'Managed' : '',
        commodityPreCooled: false,
      },
      oogSettings: {
        cargoDimensions: form.containerType === 'Flat Rack' || form.containerType === 'Open Top' ? 'Pending final measurement' : '',
        overHeight: '',
        overWidth: '',
        overLength: '',
        lashingNote: form.containerType === 'Flat Rack' || form.containerType === 'Open Top' ? form.equipmentNotes : '',
      },
      quoteHistory: targetMode === 'booking'
        ? [
            { status: 'quote_requested', at: now, by: 'Booking intake workspace', note: 'Booking intake created from the unified workspace.' },
            { status: 'quote_sent', at: now, by: 'System pricing', note: `Pricing snapshot generated at ${pricing.currency} ${pricing.total.toLocaleString('en-US')}.` },
            { status: 'quote_accepted', at: now, by: generatedQuote?.approvalMethod || 'Booking desk', note: 'Quote approved for booking conversion.' },
            { status: 'booking_created', at: now, by: 'System', note: `Booking ${bookingId} created.` },
            { status: 'assigned_to_origin', at: now, by: 'System', note: `Assigned to ${originAgentEmail}.` },
          ]
        : [
            { status: 'quote_requested', at: now, by: 'Booking intake workspace', note: 'Quote request created from intake workspace.' },
            { status: 'quote_sent', at: now, by: 'System pricing', note: `Pricing snapshot generated at ${pricing.currency} ${pricing.total.toLocaleString('en-US')}.` },
          ],
    };
  }

  function persistRequest(request: UnifiedBookingRequest) {
    const existing = readStoredRequests();
    const merged = [request, ...existing.filter((item) => item.quoteId !== request.quoteId)];
    writeStoredRequests(merged);
    if (request.bookingId) {
      const originShipment = toOriginShipment(request);
      const currentShipments = readStoredSupplierShipments();
      writeStoredSupplierShipments([originShipment, ...currentShipments.filter((item) => item.id !== originShipment.id)]);
    }
  }

  async function generateQuote() {
    const nextErrors = validateForm(form, 'quote');
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setNotice({ tone: 'info', text: buildValidationNotice(nextErrors, 'Complete the required fields before generating the quote.') });
      return;
    }
    const quoteId = generatedQuote?.quoteId || generateWorkflowReference('QT');
    const validityUntil = form.preferredDepartureWindow.split(' ')[0] || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const sentAt = new Date().toISOString();
    setGeneratedQuote({
      quoteId,
      bookingId: '',
      validityUntil,
      status: 'sent',
      sentAt,
      approvalMethod: '',
      approvalNote: '',
      approvedAt: '',
      approvedBy: '',
    });
    setQuoteSendState('idle');
    setLastRecordId(quoteId);
    setWorkflowStep(2);
    const request = buildRequest('quote');
    const persistedRequest: UnifiedBookingRequest = {
      ...request,
      quoteId,
      quoteStatus: 'quote_sent',
      approvalStatus: 'sent',
      updatedAt: sentAt,
    };
    persistRequest(persistedRequest);
    prewarmQuoteAttachment(persistedRequest);
    let registeredCount = 0;
    try {
      const quoteRequestPayload = buildQuoteRequestFormPayload(form, {
        quoteId,
        bookingId: '',
        validityUntil,
        status: 'sent',
        sentAt,
        approvalMethod: '',
        approvalNote: '',
        approvedAt: '',
        approvedBy: '',
      });
      const acceptancePayload = buildQuoteAcceptanceFormPayload(
        form,
        {
          quoteId,
          bookingId: '',
          validityUntil,
          status: 'sent',
          sentAt,
          approvalMethod: '',
          approvalNote: '',
          approvedAt: '',
          approvedBy: '',
        },
        pricing,
        quoteId,
      );

      const [quoteRequestCreated, acceptanceCreated] = await Promise.all([
        registerWorkflowDocument({
          entityType: 'quote',
          entityId: quoteId,
          title: 'Quotation Request Form',
          documentType: 'quotation_request_form',
          referenceNo: quoteId,
          fileName: quoteRequestPayload.fileName,
          fileContentBase64: await buildLogisticsQuoteRequestFormPdfBase64(quoteRequestPayload),
        }),
        registerWorkflowDocument({
          entityType: 'quote',
          entityId: quoteId,
          title: 'Quotation Acceptance Form',
          documentType: 'quotation_acceptance_form',
          referenceNo: quoteId,
          fileName: acceptancePayload.fileName,
          fileContentBase64: await buildQuoteAcceptanceFormPdfBase64(acceptancePayload),
        }),
      ]);
      registeredCount = Number(quoteRequestCreated) + Number(acceptanceCreated);
    } catch {
      registeredCount = 0;
    }
    setNotice({
      tone: 'success',
      text:
        registeredCount > 0
          ? `Quote ${quoteId} generated at ${pricing.currency} ${pricing.total.toLocaleString('en-US')}. ${registeredCount} branded PDF ${registeredCount === 1 ? 'document was' : 'documents were'} added to the Documents register.`
          : `Quote ${quoteId} generated at ${pricing.currency} ${pricing.total.toLocaleString('en-US')}. Review and send it for customer approval.`,
    });
  }

  function syncBookingToTracking(request: UnifiedBookingRequest) {
    if (typeof window === 'undefined' || !request.bookingId) return;
    void fetch('/api/tracking/register-booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingNo: request.bookingId,
        quoteId: request.quoteId,
        shipmentNo: request.convertedToShipmentId || request.bookingId,
        containerCount: request.containerCount || 1,
        blNo: `HBL-${request.bookingId}`,
        carrier: request.vesselName ? 'Origin managed' : 'Pending carrier',
        vesselName: request.vesselName || '',
        voyageNo: request.voyageNumber || '',
        currentLocation: request.placeOfReceipt || request.portOfLoading || request.originCityOrPort || 'Origin terminal',
        shipper: request.shipperName || request.company || request.customerName,
        consignee: request.consigneeName || request.customerName,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
        eta: request.requestedArrivalWindow || '',
      }),
    }).catch(() => {
      // Local tracking registration is best-effort and should not block booking confirmation.
    });
  }

  function downloadPrefilledQuoteRequestForm() {
    void downloadLogisticsQuoteRequestFormPdf(buildQuoteRequestFormPayload(form, generatedQuote));
  }

  function downloadPrefilledAcceptanceForm() {
    void downloadQuoteAcceptanceFormPdf(buildQuoteAcceptanceFormPayload(form, generatedQuote, pricing, lastRecordId));
  }

  function downloadPrefilledBookingRequestForm() {
    void downloadBookingRequestFormPdf(buildBookingRequestFormPayload(form, generatedQuote));
  }

  async function confirmBooking() {
    if (!generatedQuote || generatedQuote.status !== 'accepted') {
      setNotice({ tone: 'info', text: 'Booking confirmation is available only after the customer has accepted the quote.' });
      setWorkflowStep(3);
      return;
    }
    const nextErrors = validateForm(form, 'booking');
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setNotice({ tone: 'info', text: buildValidationNotice(nextErrors, 'Resolve the booking validation items before confirmation.') });
      return;
    }
    const request = buildRequest('booking');
    persistRequest(request);
    try {
      await syncBookingToBackendWorkflow(request);
    } catch {
      // Backend shipment sync is best-effort here; local workflow should still continue.
    }
    syncBookingToTracking(request);
    let bookingDocumentRegistered = false;
    let bookingAttachment:
      | {
          attachmentName: string;
          attachmentMimeType: string;
          attachmentContentBase64: string;
        }
      | null = null;
    try {
      const bookingPayload = buildBookingRequestFormPayload(form, {
        ...generatedQuote,
        bookingId: request.bookingId,
      });
      const bookingContentBase64 = await buildBookingRequestFormPdfBase64(bookingPayload);
      bookingAttachment = {
        attachmentName: bookingPayload.fileName,
        attachmentMimeType: 'application/pdf',
        attachmentContentBase64: bookingContentBase64,
      };
      bookingDocumentRegistered = await registerWorkflowDocument({
        entityType: 'booking',
        entityId: request.bookingId,
        title: 'Booking Request Form',
        documentType: 'booking_request_form',
        referenceNo: request.bookingId,
        fileName: bookingPayload.fileName,
        fileContentBase64: bookingContentBase64,
      });
    } catch {
      bookingDocumentRegistered = false;
    }
    const recipientEmail = resolveCustomerEmailAddress(form);
    const subject = `Booking ${request.bookingId} confirmed`;
    const messageBody = `Dear ${request.customerName || 'Customer'},

Your booking ${request.bookingId} has been confirmed.

Origin: ${request.portOfLoading}
Destination: ${request.inlandDestination}
Assigned origin desk: ${originAgentEmail}

Your shipment has now entered origin processing.

Tikur Abay Team`;
    let bookingSendResult: DirectCommunicationResult | null = null;
    if (recipientEmail) {
      try {
        bookingSendResult = await apiPost<DirectCommunicationResult>('/communications/direct-send', {
          entityType: 'booking',
          entityId: request.bookingId,
          channels: ['email'],
          templateKey: 'custom_message',
          language: 'en',
          subject,
          messageBody,
          recipientName: request.customerName || 'Customer',
          recipientType: 'customer',
          recipientOverrides: {
            email: recipientEmail,
          },
          attachments: bookingAttachment
            ? [
                {
                  filename: bookingAttachment.attachmentName,
                  contentBase64: bookingAttachment.attachmentContentBase64,
                  contentType: bookingAttachment.attachmentMimeType,
                },
              ]
            : [],
        });
      } catch {
        recordLocalCommunication({
          entityType: 'booking',
          entityId: request.bookingId,
          bookingId: request.bookingId,
          recipientAddress: recipientEmail,
          channel: 'email',
          subject,
          templateKey: 'booking_confirmation',
          messageBody,
          attachmentName: bookingAttachment?.attachmentName,
          attachmentMimeType: bookingAttachment?.attachmentMimeType,
        });
      }
    }
    recordLocalCommunication({
      entityType: 'booking',
      entityId: request.bookingId,
      bookingId: request.bookingId,
      recipientAddress: localCustomerConsoleEmail,
      channel: 'in_app',
      subject,
      templateKey: 'booking_confirmation',
      messageBody,
    });
    setGeneratedQuote((current) => current ? { ...current, bookingId: request.bookingId } : current);
    setLastRecordId(request.bookingId);
    setWorkflowStep(5);
    setNotice({
      tone: 'success',
      text: recipientEmail
        ? `Booking ${request.bookingId} created, assigned to ${originAgentEmail}, ${bookingDocumentRegistered ? 'stored in Documents, and ' : ''}confirmation email sent to ${(bookingSendResult?.records?.find((record) => record.channel === 'email')?.recipientAddress) || recipientEmail}${bookingSendResult?.records?.find((record) => record.channel === 'email')?.metadata?.simulated ? ' (simulated/test delivery)' : ''}.`
        : `Booking ${request.bookingId} created, assigned to ${originAgentEmail}${bookingDocumentRegistered ? ', and stored in Documents' : ''}.`,
    });
  }

  const primaryAction =
    workflowStep === 1 ? generateQuote :
    workflowStep === 2 ? sendQuoteToCustomer :
    workflowStep === 3 ? () => markQuoteAccepted('Customer agreed by phone') :
    workflowStep === 4 ? confirmBooking :
    () => router.push('/china-desk/queue');
  const primaryLabel =
    workflowStep === 1 ? 'Generate Quote' :
    workflowStep === 2 ? 'Send Quote to Customer' :
    workflowStep === 3 ? 'Mark as Accepted' :
    workflowStep === 4 ? 'Confirm Booking' :
    'Open in China Desk';
  const currentStepLabel =
    workflowStep === 1 ? 'Shipment Details' :
    workflowStep === 2 ? 'Quote Review' :
    workflowStep === 3 ? 'Approval' :
    workflowStep === 4 ? 'Booking' :
    'Origin Handoff';

  const maxAvailableStep: WorkflowStep =
    generatedQuote?.status === 'accepted'
      ? 4
      : generatedQuote?.status === 'waiting_approval'
        ? 3
        : generatedQuote?.quoteId
          ? 2
          : 1;

  function jumpToStep(step: WorkflowStep) {
    if (step > maxAvailableStep && step !== 5) return;
    if (step === 5 && !(generatedQuote?.status === 'accepted' || lastRecordId)) return;
    setWorkflowStep(step);
  }

  return (
    <main className="shell">
      <section className="booking-intake-shell" data-testid="shipment-intake-workspace">
        <header className="booking-intake-header">
          <div className="booking-intake-heading">
            <div className="booking-intake-title-row">
              <div>
                <div className="booking-intake-kicker">Booking / Quote Workflow</div>
                <h1>{mode === 'quote' ? 'Get Quote' : 'Book Shipment'}</h1>
                <p>Enter cargo, container, route, and customer details to price and launch a shipment file.</p>
              </div>
              <div className="booking-mode-switcher" role="tablist" aria-label="Booking intake mode">
                <button type="button" className={mode === 'quote' ? 'active' : ''} onClick={() => switchMode('quote')} data-testid="mode-quote">Quote Mode</button>
                <button type="button" className={mode === 'booking' ? 'active' : ''} onClick={() => switchMode('booking')} data-testid="mode-booking">Booking Mode</button>
              </div>
            </div>
            <div className="booking-intake-actions">
              <button type="button" className="btn btn-compact booking-intake-primary-action" onClick={startNewQuote} data-testid="start-new-quote">Start New Quote</button>
              <button type="button" className="btn btn-compact booking-intake-primary-action" onClick={startNewBooking} data-testid="start-new-booking">Start New Booking</button>
              <button type="button" className="btn btn-secondary btn-compact" onClick={saveDraft} data-testid="intake-save-draft">Save Draft</button>
              <button type="button" className="btn btn-tertiary btn-compact" onClick={resetForm} data-testid="intake-reset">Reset</button>
              <Link href="/dashboards/executive" className="btn btn-secondary btn-compact">Back to Dashboard</Link>
            </div>
          </div>
          <section className="booking-form-kit-panel">
            <div className="booking-form-kit-copy">
              <span>Branded form kit</span>
              <strong>Generate customer forms from the booking desk</strong>
              <p>Download the approved quotation request, acceptance, and booking request PDFs without leaving intake.</p>
            </div>
            <div className="booking-form-kit-actions">
              <button type="button" className="btn btn-secondary btn-compact console-download-button" onClick={downloadPrefilledQuoteRequestForm}>
                Quote Request PDF
              </button>
              <button type="button" className="btn btn-secondary btn-compact console-download-button" onClick={downloadPrefilledAcceptanceForm}>
                Acceptance PDF
              </button>
              <button type="button" className="btn btn-secondary btn-compact console-download-button" onClick={downloadPrefilledBookingRequestForm}>
                Booking Request PDF
              </button>
            </div>
          </section>
          <div className="booking-section-progress">
            {[
              { label: 'Shipment Details', step: 1 },
              { label: 'Quote Review', step: 2 },
              { label: 'Approval', step: 3 },
              { label: 'Booking', step: 4 },
              { label: 'Origin Handoff', step: 5 },
            ].map((item) => {
              const isCurrent = workflowStep === item.step;
              const isComplete = workflowStep > item.step;
              const isNext = item.step === Math.min(maxAvailableStep, workflowStep + 1) && !isCurrent;
              return (
              <button
                key={item.label}
                type="button"
                className={isCurrent ? 'active' : isComplete ? 'complete' : isNext ? 'step-pulse' : ''}
                onClick={() => jumpToStep(item.step as WorkflowStep)}
                disabled={item.step > maxAvailableStep && item.step !== 5}
              >
                <span className="booking-section-progress-index">{item.step}</span>
                <span className="booking-section-progress-copy">
                  <strong>{item.label}</strong>
                </span>
              </button>
              );
            })}
          </div>
        </header>

        {notice ? <div className={`booking-intake-notice ${notice.tone}`} data-testid="intake-notice">{notice.text}</div> : null}

        <section className="booking-intake-grid">
          <div className="booking-intake-form-column" data-testid="shipment-intake-form">
            <article className="booking-intake-card">
              <div className="booking-intake-card-header"><span>Section 1</span><h2>Shipment Type</h2></div>
              <div className="booking-intake-field-grid three">
                <label><span>Shipment mode</span><select value={form.shipmentMode} onChange={(event) => setField('shipmentMode', event.target.value as ShipmentMode)} data-testid="field-shipment-mode"><option>Ocean Freight</option><option>Air Freight</option><option>Road</option><option>Multimodal</option></select></label>
                <label><span>Booking Type</span><select value={form.bookingType} onChange={(event) => setField('bookingType', event.target.value as BookingType)} data-testid="field-booking-type">{bookingTypeOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
                <label><span>Shipment Direction</span><select value={form.shipmentDirection} onChange={(event) => setField('shipmentDirection', event.target.value as ShipmentDirection)} disabled={form.shipmentMode === 'Road'}>{shipmentDirectionOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
                <label><span>Service Level</span><select value={form.serviceLevel} onChange={(event) => setField('serviceLevel', event.target.value as ServiceLevel)} data-testid="field-service-level">{serviceLevelOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
                <label><span>Priority</span><select value={form.priority} onChange={(event) => setField('priority', event.target.value as Priority)}><option>Standard</option><option>Express</option><option>Urgent</option></select></label>
                <label><span>Request Source</span><select value={form.requestSource} onChange={(event) => setField('requestSource', event.target.value as BookingRequestSource)}><option value="customer">Customer</option><option value="supplier">Supplier</option><option value="internal">Internal operator</option><option value="port_agent">Port agent</option><option value="admin">Admin</option></select></label>
              </div>
              <div className="booking-route-hints">
                <div><strong>Pricing model</strong><span>{modeConfig.pricing.split('_').join(' ')}</span></div>
                <div><strong>Booking flow</strong><span>{modeConfig.steps.join(' -> ')}</span></div>
                <div><strong>Document output</strong><span>{modeConfig.documents.join(', ')}</span></div>
              </div>
            </article>

            <article className="booking-intake-card">
              <div className="booking-intake-card-header"><span>Section 2</span><h2>Customer / Company and Shipper</h2></div>
              <div className="booking-intake-field-grid two">
                <label><span>Customer type</span><select value={form.customerType} onChange={(event) => handleCustomerTypeChange(event.target.value as CustomerType)}><option>Existing customer</option><option>New customer</option></select></label>
                <label><span>Saved customer</span><select value={selectedCustomerPresetKey} onChange={(event) => applyCustomerPreset(event.target.value)}><option value="">Select customer</option>{customerPresets.map((preset) => <option key={preset.key} value={preset.key}>{preset.customerName}</option>)}</select></label>
                <label><span>Customer / company name</span><input value={form.customerName} onChange={(event) => setField('customerName', event.target.value)} data-testid="field-customer-name" />{errors.customerName ? <em>{errors.customerName}</em> : null}</label>
                <label><span>Company legal name</span><input value={form.companyName} onChange={(event) => setField('companyName', event.target.value)} data-testid="field-company-name" />{errors.companyName ? <em>{errors.companyName}</em> : null}</label>
                <label><span>Customer contact person</span><input value={form.customerContactPerson} onChange={(event) => setField('customerContactPerson', event.target.value)} />{errors.customerContactPerson ? <em>{errors.customerContactPerson}</em> : null}</label>
                <label><span>Customer TIN / VAT number</span><input value={form.customerTinVatNumber} onChange={(event) => setField('customerTinVatNumber', event.target.value)} /></label>
                <label className="full"><span>Customer address</span><input value={form.customerAddress} onChange={(event) => setField('customerAddress', event.target.value)} />{errors.customerAddress ? <em>{errors.customerAddress}</em> : null}</label>
                <label><span>Phone</span><input value={form.phone} onChange={(event) => setField('phone', event.target.value)} data-testid="field-phone" />{errors.phone ? <em>{errors.phone}</em> : null}</label>
                <label><span>Email</span><input value={form.email} onChange={(event) => setField('email', event.target.value)} placeholder={placeholderCustomerEmail} data-testid="field-email" />{errors.email ? <em>{errors.email}</em> : null}</label>
                <label><span>Notify customer by</span><select value={form.notifyCustomerBy} onChange={(event) => setField('notifyCustomerBy', event.target.value as IntakeFormState['notifyCustomerBy'])}><option>Email</option><option>Phone</option><option>WhatsApp / Telegram</option></select></label>
                <label><span>Shipper company name</span><input value={form.shipperName} onChange={(event) => setField('shipperName', event.target.value)} />{errors.shipperName ? <em>{errors.shipperName}</em> : null}</label>
                <label><span>Shipper contact person</span><input value={form.shipperContactPerson} onChange={(event) => setField('shipperContactPerson', event.target.value)} /></label>
                <label><span>Shipper phone number</span><input value={form.shipperPhone} onChange={(event) => setField('shipperPhone', event.target.value)} placeholder="+251911000000" /></label>
                <label><span>Shipper email address</span><input value={form.shipperEmail} onChange={(event) => setField('shipperEmail', event.target.value)} /></label>
                <label className="full"><span>Shipper full address</span><input value={form.shipperAddress} onChange={(event) => setField('shipperAddress', event.target.value)} />{errors.shipperAddress ? <em>{errors.shipperAddress}</em> : null}</label>
                <label><span>Consignee name</span><input value={form.consigneeName} onChange={(event) => setField('consigneeName', event.target.value)} data-testid="field-consignee-name" />{errors.consigneeName ? <em>{errors.consigneeName}</em> : null}</label>
                <label><span>Consignee company</span><input value={form.consigneeCompany} onChange={(event) => setField('consigneeCompany', event.target.value)} /></label>
                <label><span>Notify party</span><input value={form.notifyPartyName} onChange={(event) => setField('notifyPartyName', event.target.value)} /></label>
                <label><span>2nd notify party</span><input value={form.secondNotifyParty} onChange={(event) => setField('secondNotifyParty', event.target.value)} /></label>
                <label className="booking-toggle"><input type="checkbox" checked={form.saveReusableCustomer} onChange={(event) => setField('saveReusableCustomer', event.target.checked)} /><span>Save as reusable customer</span></label>
              </div>
            </article>

            <article className="booking-intake-card">
              <div className="booking-intake-card-header"><span>Section 3</span><h2>Origin and Destination</h2></div>
              <div className="booking-intake-field-grid two">
                <label className="full">
                  <span>Origin preset</span>
                  <select
                    value={activeOriginLocationPresets.find((item) => item.port === form.originPort && item.cityOrPort === form.originCityPort)?.key ?? ''}
                    onChange={(event) => applyOriginPreset(event.target.value)}
                    data-testid="field-origin-preset"
                  >
                    <option value="">Select origin preset</option>
                    {form.shipmentMode === 'Road' ? (
                      <>
                        <optgroup label="Djibouti">
                          {roadOriginLocationPresets.filter((item) => item.country === 'Djibouti').map((item) => <option key={item.key} value={item.key}>{item.cityOrPort} / {item.port}</option>)}
                        </optgroup>
                        <optgroup label="Ethiopian inland ports">
                          {roadOriginLocationPresets.filter((item) => item.country === 'Ethiopia').map((item) => <option key={item.key} value={item.key}>{item.cityOrPort} / {item.port}</option>)}
                        </optgroup>
                      </>
                    ) : (
                      <>
                        <optgroup label="China">
                          {originLocationPresets.filter((item) => item.country === 'China').map((item) => <option key={item.key} value={item.key}>{item.cityOrPort} / {item.port}</option>)}
                        </optgroup>
                        <optgroup label="United Arab Emirates">
                          {originLocationPresets.filter((item) => item.country === 'United Arab Emirates').map((item) => <option key={item.key} value={item.key}>{item.cityOrPort} / {item.port}</option>)}
                        </optgroup>
                        <optgroup label="Turkey">
                          {originLocationPresets.filter((item) => item.country === 'Turkey').map((item) => <option key={item.key} value={item.key}>{item.cityOrPort} / {item.port}</option>)}
                        </optgroup>
                        <optgroup label="India">
                          {originLocationPresets.filter((item) => item.country === 'India').map((item) => <option key={item.key} value={item.key}>{item.cityOrPort} / {item.port}</option>)}
                        </optgroup>
                        <optgroup label="Southeast Asia / Middle East">
                          {originLocationPresets.filter((item) => !['China', 'United Arab Emirates', 'Turkey', 'India'].includes(item.country)).map((item) => <option key={item.key} value={item.key}>{item.cityOrPort} / {item.port}</option>)}
                        </optgroup>
                      </>
                    )}
                  </select>
                </label>
                <label>
                  <span>Origin country</span>
                  <input
                    value={form.originCountry}
                    onChange={(event) => setField('originCountry', event.target.value)}
                    list="origin-country-options"
                    data-testid="field-origin-country"
                  />
                  {errors.originCountry ? <em>{errors.originCountry}</em> : null}
                </label>
                <label>
                  <span>Origin city / port</span>
                  <input
                    value={form.originCityPort}
                    onChange={(event) => setField('originCityPort', event.target.value)}
                    list="origin-city-port-options"
                    data-testid="field-origin-city-port"
                  />
                  {errors.originCityPort ? <em>{errors.originCityPort}</em> : null}
                </label>
                <label>
                  <span>Origin port</span>
                  <input
                    value={form.originPort}
                    onChange={(event) => {
                      setField('originPort', event.target.value);
                      syncOriginPresetFromPort(event.target.value);
                    }}
                    list="origin-port-options"
                    data-testid="field-origin-port"
                  />
                </label>
                <label className="full"><span>Place of receipt</span><input value={form.placeOfReceipt} onChange={(event) => setField('placeOfReceipt', event.target.value)} /></label>
                <label className="full"><span>Pickup address</span><input value={form.pickupAddress} onChange={(event) => setField('pickupAddress', event.target.value)} /></label>
                <label className="full">
                  <span>Destination preset</span>
                  <select
                    value={activeDestinationLocationPresets.find((item) => item.port === form.destinationPort && item.cityOrPort === form.destinationCityPort)?.key ?? ''}
                    onChange={(event) => applyDestinationPreset(event.target.value)}
                    data-testid="field-destination-preset"
                  >
                    <option value="">Select destination preset</option>
                    <optgroup label="Ethiopia">
                      {activeDestinationLocationPresets.filter((item) => item.country === 'Ethiopia').map((item) => <option key={item.key} value={item.key}>{item.cityOrPort} via {item.port}</option>)}
                    </optgroup>
                    {form.shipmentMode === 'Road' ? null : (
                      <optgroup label="Regional">
                        {destinationLocationPresets.filter((item) => item.country !== 'Ethiopia').map((item) => <option key={item.key} value={item.key}>{item.cityOrPort} via {item.port}</option>)}
                      </optgroup>
                    )}
                  </select>
                </label>
                <label>
                  <span>Destination country</span>
                  <input
                    value={form.destinationCountry}
                    onChange={(event) => setField('destinationCountry', event.target.value)}
                    list="destination-country-options"
                    data-testid="field-destination-country"
                  />
                  {errors.destinationCountry ? <em>{errors.destinationCountry}</em> : null}
                </label>
                <label>
                  <span>Destination city / port</span>
                  <input
                    value={form.destinationCityPort}
                    onChange={(event) => setField('destinationCityPort', event.target.value)}
                    list="destination-city-port-options"
                    data-testid="field-destination-city-port"
                  />
                  {errors.destinationCityPort ? <em>{errors.destinationCityPort}</em> : null}
                </label>
                <label>
                  <span>Destination port</span>
                  <input
                    value={form.destinationPort}
                    onChange={(event) => {
                      setField('destinationPort', event.target.value);
                      syncDestinationPresetFromPort(event.target.value);
                    }}
                    list="destination-port-options"
                    data-testid="field-destination-port"
                  />
                </label>
                <label className="full"><span>Delivery address</span><input value={form.deliveryAddress} onChange={(event) => setField('deliveryAddress', event.target.value)} data-testid="field-delivery-address" /></label>
                <label><span>Preferred departure window</span><input value={form.preferredDepartureWindow} onChange={(event) => setField('preferredDepartureWindow', event.target.value)} /></label>
                <label><span>Preferred arrival window</span><input value={form.preferredArrivalWindow} onChange={(event) => setField('preferredArrivalWindow', event.target.value)} /></label>
                <label><span>Incoterm</span><select value={form.incoterm} onChange={(event) => setField('incoterm', event.target.value as IntakeFormState['incoterm'])}><option>EXW</option><option>FOB</option><option>CFR</option><option>CIF</option><option>DDP</option></select></label>
              </div>
              <datalist id="origin-country-options">
                {activeOriginCountryOptions.map((item) => <option key={item} value={item} />)}
              </datalist>
              <datalist id="origin-city-port-options">
                {activeOriginCityPortOptions.map((item) => <option key={item} value={item} />)}
              </datalist>
              <datalist id="origin-port-options">
                {activeOriginPortOptions.map((item) => <option key={item} value={item} />)}
              </datalist>
              <datalist id="destination-country-options">
                {activeDestinationCountryOptions.map((item) => <option key={item} value={item} />)}
              </datalist>
              <datalist id="destination-city-port-options">
                {activeDestinationCityPortOptions.map((item) => <option key={item} value={item} />)}
              </datalist>
              <datalist id="destination-port-options">
                {activeDestinationPortOptions.map((item) => <option key={item} value={item} />)}
              </datalist>
              <div className="booking-route-hints">
                <div><strong>Origin desk</strong><span>{hints.originDesk}</span></div>
                <div><strong>Destination handoff</strong><span>{hints.destinationDesk}</span></div>
                <div><strong>Corridor suggestion</strong><span>{hints.corridor}</span></div>
              </div>
            </article>

            <article className="booking-intake-card">
              <div className="booking-intake-card-header"><span>Section 4</span><h2>Cargo Details</h2></div>
              <div className="booking-intake-field-grid three">
                <label><span>Cargo category</span><input value={form.cargoCategory} onChange={(event) => setField('cargoCategory', event.target.value)} data-testid="field-cargo-category" /></label>
                <label className="full"><span>Commodity / goods description</span><textarea value={form.commodityDescription} onChange={(event) => setField('commodityDescription', event.target.value)} data-testid="field-commodity-description" />{errors.commodityDescription ? <em>{errors.commodityDescription}</em> : null}</label>
                <label><span>HS code</span><input value={form.hsCode} onChange={(event) => setField('hsCode', event.target.value)} /></label>
                <label><span>Marks &amp; numbers</span><input value={form.marksAndNumbers} onChange={(event) => setField('marksAndNumbers', event.target.value)} /></label>
                <label><span>Gross weight</span><input value={form.grossWeight} onChange={(event) => setField('grossWeight', event.target.value)} data-testid="field-gross-weight" />{errors.grossWeight ? <em>{errors.grossWeight}</em> : null}</label>
                <label><span>Volume (CBM)</span><input value={form.volumeCbm} onChange={(event) => setField('volumeCbm', event.target.value)} data-testid="field-volume-cbm" />{errors.volumeCbm ? <em>{errors.volumeCbm}</em> : null}</label>
                {showAirFields ? <label><span>Length (cm)</span><input value={form.cargoLengthCm} onChange={(event) => setField('cargoLengthCm', event.target.value)} />{errors.cargoLengthCm ? <em>{errors.cargoLengthCm}</em> : null}</label> : null}
                {showAirFields ? <label><span>Width (cm)</span><input value={form.cargoWidthCm} onChange={(event) => setField('cargoWidthCm', event.target.value)} />{errors.cargoWidthCm ? <em>{errors.cargoWidthCm}</em> : null}</label> : null}
                {showAirFields ? <label><span>Height (cm)</span><input value={form.cargoHeightCm} onChange={(event) => setField('cargoHeightCm', event.target.value)} />{errors.cargoHeightCm ? <em>{errors.cargoHeightCm}</em> : null}</label> : null}
                {showAirFields ? <label><span>Chargeable weight</span><input value={airChargeableWeight ? airChargeableWeight.toFixed(2) : ''} readOnly /></label> : null}
                <label><span>Number of packages</span><input value={form.packageCount} onChange={(event) => setField('packageCount', event.target.value)} data-testid="field-package-count" />{errors.packageCount ? <em>{errors.packageCount}</em> : null}</label>
                <label><span>Packaging type</span><input value={form.packagingType} onChange={(event) => setField('packagingType', event.target.value)} data-testid="field-packaging-type" /></label>
                <label><span>Freight payment term</span><select value={form.freightPaymentTerm} onChange={(event) => setField('freightPaymentTerm', event.target.value as IntakeFormState['freightPaymentTerm'])}><option value="prepaid">Prepaid</option><option value="collect">Collect</option></select></label>
                <label><span>Prepaid at</span><input value={form.prepaidAt} onChange={(event) => setField('prepaidAt', event.target.value)} /></label>
                <label><span>Collect at</span><input value={form.collectAt} onChange={(event) => setField('collectAt', event.target.value)} /></label>
                <label><span>LC number</span><input value={form.lcNumber} onChange={(event) => setField('lcNumber', event.target.value)} /></label>
                <label><span>Bank permit number</span><input value={form.bankPermitNumber} onChange={(event) => setField('bankPermitNumber', event.target.value)} /></label>
                <label><span>Consignee TIN</span><input value={form.consigneeTinNumber} onChange={(event) => setField('consigneeTinNumber', event.target.value)} /></label>
                <label><span>TIN area code</span><input value={form.tinAreaCode} onChange={(event) => setField('tinAreaCode', event.target.value)} /></label>
                <label><span>UN number</span><input value={form.unNumber} onChange={(event) => setField('unNumber', event.target.value)} /></label>
                <label className="booking-toggle"><input type="checkbox" checked={form.dangerousGoods} onChange={(event) => setField('dangerousGoods', event.target.checked)} /><span>Dangerous goods</span></label>
                <label className="booking-toggle"><input type="checkbox" checked={form.temperatureControlled} onChange={(event) => setField('temperatureControlled', event.target.checked)} /><span>Temperature controlled</span></label>
                <label className="booking-toggle"><input type="checkbox" checked={form.customsDocumentsReady} onChange={(event) => setField('customsDocumentsReady', event.target.checked)} /><span>Customs documents ready</span></label>
                <label className="full"><span>Special handling notes</span><textarea value={form.specialHandlingNotes} onChange={(event) => setField('specialHandlingNotes', event.target.value)} /></label>
              </div>
            </article>

            <article className="booking-intake-card">
              <div className="booking-intake-card-header"><span>Section 5</span><h2>{modeConfig.equipmentTitle}</h2></div>
              {canUseContainerFields ? (
                <div className="booking-intake-field-grid three">
                  <label><span>Container type</span><select value={form.containerType} onChange={(event) => setField('containerType', event.target.value as IntakeFormState['containerType'])} data-testid="field-container-type"><option>20FT Standard</option><option>40FT Standard</option><option>40FT High Cube</option><option>Reefer 20FT</option><option>Reefer 40FT</option><option>Flat Rack</option><option>Open Top</option></select></label>
                  <label><span>Container size</span><select value={form.containerSize} onChange={(event) => setField('containerSize', event.target.value as IntakeFormState['containerSize'])} data-testid="field-container-size"><option>20FT</option><option>40FT</option><option>45FT</option></select></label>
                  <label><span>Container quantity</span><input value={form.containerQuantity} onChange={(event) => setField('containerQuantity', event.target.value)} data-testid="field-container-quantity" />{errors.containerQuantity ? <em>{errors.containerQuantity}</em> : null}</label>
                  <label><span>Estimated stuffing type</span><select value={form.stuffingType} onChange={(event) => setField('stuffingType', event.target.value as IntakeFormState['stuffingType'])}><option>Live load</option><option>Warehouse stuffing</option><option>Factory stuffing</option></select></label>
                  <label><span>Empty pickup location</span><input value={form.emptyPickupLocation} onChange={(event) => setField('emptyPickupLocation', event.target.value)} /></label>
                  <label className="booking-toggle"><input type="checkbox" checked={form.sealRequired} onChange={(event) => setField('sealRequired', event.target.checked)} /><span>Seal required</span></label>
                  <label><span>Empty return depot preference</span><input value={form.emptyReturnDepotPreference} onChange={(event) => setField('emptyReturnDepotPreference', event.target.value)} /></label>
                  <label className="full"><span>Equipment notes</span><textarea value={form.equipmentNotes} onChange={(event) => setField('equipmentNotes', event.target.value)} /></label>
                </div>
              ) : showRoadFields ? (
                <div className="booking-intake-field-grid three">
                  <label><span>Truck type</span><select value={form.truckType} onChange={(event) => setField('truckType', event.target.value as IntakeFormState['truckType'])}><option>Small Truck</option><option>Medium Truck</option><option>Trailer</option></select>{errors.truckType ? <em>{errors.truckType}</em> : null}</label>
                  <label><span>Road distance (km)</span><input value={form.roadDistanceKm} onChange={(event) => setField('roadDistanceKm', event.target.value)} />{errors.roadDistanceKm ? <em>{errors.roadDistanceKm}</em> : null}</label>
                  <label><span>Pickup location type</span><input value={form.placeOfReceipt} onChange={(event) => setField('placeOfReceipt', event.target.value)} /></label>
                  <label className="full"><span>Truck / corridor notes</span><textarea value={form.equipmentNotes} onChange={(event) => setField('equipmentNotes', event.target.value)} /></label>
                </div>
              ) : showAirFields ? (
                <div className="booking-intake-field-grid two">
                  <label><span>Handling profile</span><input value={form.packagingType} onChange={(event) => setField('packagingType', event.target.value)} /></label>
                  <label><span>Airport-ready cargo note</span><input value={form.specialHandlingNotes} onChange={(event) => setField('specialHandlingNotes', event.target.value)} /></label>
                  <div className="booking-adaptive-note full">Air mode uses weight plus dimensions to calculate chargeable weight and will issue an Air Waybill instead of a Bill of Lading.</div>
                </div>
              ) : (
                <div className="booking-adaptive-note">Container-specific fields are not required for {form.bookingType}. Equipment handling is derived from cargo, routing, and service level.</div>
              )}
            </article>

            <article className="booking-intake-card">
              <div className="booking-intake-card-header"><span>Section 6</span><h2>Timeline / Operational Readiness</h2></div>
              <div className="booking-intake-field-grid three">
                <label><span>Cargo ready date</span><input type="date" value={form.cargoReadyDate} onChange={(event) => setField('cargoReadyDate', event.target.value)} data-testid="field-cargo-ready-date" />{errors.cargoReadyDate ? <em>{errors.cargoReadyDate}</em> : null}</label>
                <label><span>Customs readiness</span><select value={form.customsReadiness} onChange={(event) => setField('customsReadiness', event.target.value as CustomsReadiness)}><option>Ready</option><option>Pending</option><option>Not started</option></select></label>
                <label><span>Documents completeness</span><select value={form.documentsCompleteness} onChange={(event) => setField('documentsCompleteness', event.target.value as DocumentsCompleteness)}><option>Complete</option><option>Partial</option><option>Missing</option></select>{errors.documentsCompleteness ? <em>{errors.documentsCompleteness}</em> : null}</label>
                {showVesselFields ? <label><span>Intended vessel</span><input value={form.vesselName} onChange={(event) => setField('vesselName', event.target.value)} /></label> : null}
                {showVesselFields ? <label><span>Voyage number</span><input value={form.voyageNumber} onChange={(event) => setField('voyageNumber', event.target.value)} /></label> : null}
                {showVesselFields ? <label><span>ETA loading port</span><input value={form.etaLoadingPort} onChange={(event) => setField('etaLoadingPort', event.target.value)} /></label> : null}
                <label className="booking-toggle"><input type="checkbox" checked={form.truckingRequired} onChange={(event) => setField('truckingRequired', event.target.checked)} /><span>Trucking required</span></label>
                <label className="booking-toggle"><input type="checkbox" checked={form.warehousingRequired} onChange={(event) => setField('warehousingRequired', event.target.checked)} /><span>Warehousing required</span></label>
                <label className="booking-toggle"><input type="checkbox" checked={form.insuranceRequired} onChange={(event) => setField('insuranceRequired', event.target.checked)} /><span>Insurance required</span></label>
                <label className="booking-toggle"><input type="checkbox" checked={form.customsClearanceSupport} onChange={(event) => setField('customsClearanceSupport', event.target.checked)} /><span>Customs clearance support</span></label>
                <label className="booking-toggle"><input type="checkbox" checked={form.inspectionRequired} onChange={(event) => setField('inspectionRequired', event.target.checked)} /><span>Inspection required</span></label>
                <label className="booking-toggle"><input type="checkbox" checked={form.shippingCertificateRequired} onChange={(event) => setField('shippingCertificateRequired', event.target.checked)} /><span>Shipping certificate required</span></label>
                <label className="booking-toggle"><input type="checkbox" checked={form.originHandlingNeeded} onChange={(event) => setField('originHandlingNeeded', event.target.checked)} /><span>Origin handling needed</span></label>
                <label className="booking-toggle"><input type="checkbox" checked={form.destinationHandlingNeeded} onChange={(event) => setField('destinationHandlingNeeded', event.target.checked)} /><span>Destination handling needed</span></label>
                <label className="booking-toggle"><input type="checkbox" checked={form.vesselBookingAssistance} onChange={(event) => setField('vesselBookingAssistance', event.target.checked)} /><span>Need vessel booking assistance</span></label>
              </div>
            </article>

            <article className="booking-intake-card">
              <div className="booking-intake-card-header"><span>Section 7</span><h2>Pricing Inputs / Quote Logic</h2></div>
              <div className="booking-intake-field-grid three">
                <label><span>{form.shipmentMode === 'Road' ? 'Road linehaul' : form.shipmentMode === 'Air Freight' ? 'Air freight' : 'Base freight'}</span><input value={form.baseFreight} onChange={(event) => setField('baseFreight', event.target.value)} /></label>
                <label><span>Origin charges</span><input value={form.originCharges} onChange={(event) => setField('originCharges', event.target.value)} /></label>
                <label><span>Destination charges</span><input value={form.destinationCharges} onChange={(event) => setField('destinationCharges', event.target.value)} /></label>
                <label><span>Customs estimate</span><input value={form.customsEstimate} onChange={(event) => setField('customsEstimate', event.target.value)} /></label>
                <label><span>Inland transport estimate</span><input value={form.inlandTransportEstimate} onChange={(event) => setField('inlandTransportEstimate', event.target.value)} /></label>
                <label><span>Insurance estimate</span><input value={form.insuranceEstimate} onChange={(event) => setField('insuranceEstimate', event.target.value)} /></label>
                <label><span>Handling fees</span><input value={form.handlingFees} onChange={(event) => setField('handlingFees', event.target.value)} /></label>
                <label><span>Discount</span><input value={form.discount} onChange={(event) => setField('discount', event.target.value)} /></label>
                <label><span>Currency</span><select value={form.currency} onChange={(event) => setField('currency', event.target.value)} disabled={form.shipmentMode === 'Road'}><option>USD</option><option>ETB</option><option>EUR</option></select></label>
              </div>
              <div className="booking-intake-footer-actions">
                <button type="button" className="btn btn-secondary btn-compact" onClick={saveQuoteDraft} data-testid="save-quote-draft">Save Quote Draft</button>
                <button type="button" className="btn btn-compact" onClick={generateQuote} data-testid="generate-quote">Generate Final Quote</button>
              </div>
            </article>

            <article className="booking-intake-card">
              <div className="booking-intake-card-header"><span>Stage 2</span><h2>Quote Review</h2></div>
              <div className="booking-review-grid">
                <div><strong>Quote reference</strong><span>{generatedQuote?.quoteId || 'Not generated yet'}</span></div>
                <div><strong>Quote status</strong><span>{generatedQuote?.status || 'draft'}</span></div>
                <div><strong>Validity</strong><span>{generatedQuote?.validityUntil || 'Pending'}</span></div>
                <div><strong>Customer summary</strong><span>{form.customerName} · {form.notifyCustomerBy}</span></div>
                <div><strong>Route summary</strong><span>{form.originPort || form.originCityPort} {'->'} {form.destinationPort || form.destinationCityPort}</span></div>
                <div><strong>Equipment summary</strong><span>{canUseContainerFields ? `${form.containerType} / ${form.containerSize} x ${form.containerQuantity}` : form.bookingType}</span></div>
                <div><strong>Notify party</strong><span>{form.notifyPartyName || 'Pending'}</span></div>
                <div><strong>HS / Marks</strong><span>{form.hsCode || 'Pending'} · {form.marksAndNumbers || 'Pending'}</span></div>
                <div><strong>LC / TIN</strong><span>{form.lcNumber || form.bankPermitNumber || 'Pending'} · {form.consigneeTinNumber || 'Pending'} / {form.tinAreaCode || 'Pending'}</span></div>
                <div><strong>Document path</strong><span>{modeConfig.documents.join(', ')}</span></div>
              </div>
              <div className={`shipping-phase-note ${quoteSendState === 'sent' ? 'is-success' : quoteSendState === 'preparing' || quoteSendState === 'sending' ? 'is-warning' : ''}`}>
                <span>Send confirmation</span>
                <p>
                  {quoteSendState === 'preparing'
                    ? 'Preparing the quote PDF attachment.'
                    : quoteSendState === 'sending'
                      ? 'Sending the quote now. Do not click again.'
                      : quoteSendState === 'sent'
                        ? quoteDeliverySimulated
                          ? `Quote ${generatedQuote?.quoteId || ''} was recorded, but email delivery is simulated. Customer console delivery can continue in the next stage.`
                          : `Quote ${generatedQuote?.quoteId || ''} already sent. Customer approval can continue in the next stage.`
                        : 'Quote not sent yet.'}
                </p>
              </div>
              <div className="booking-intake-footer-actions">
                <button type="button" className="btn btn-secondary btn-compact" onClick={saveQuoteDraft} data-testid="save-quote-draft-stage">Save Quote Draft</button>
                <button
                  type="button"
                  className="btn btn-compact"
                  onClick={sendQuoteToCustomer}
                  data-testid="send-quote-to-customer"
                  disabled={isSendingQuote || generatedQuote?.status === 'waiting_approval'}
                >
                  {quoteSendState === 'preparing'
                    ? 'Preparing PDF...'
                    : quoteSendState === 'sending'
                      ? 'Sending...'
                      : quoteSendState === 'sent' || generatedQuote?.status === 'waiting_approval'
                        ? quoteDeliverySimulated
                          ? 'Simulated delivery'
                          : 'Sent to Customer'
                        : 'Send Quote to Customer'}
                </button>
                <button type="button" className="btn btn-secondary btn-compact" onClick={() => setWorkflowStep(1)}>Edit Shipment Details</button>
              </div>
            </article>

            <article className="booking-intake-card">
              <div className="booking-intake-card-header"><span>Stage 3</span><h2>Customer Approval</h2></div>
              <div className="booking-review-grid">
                <div><strong>Approval status</strong><span>{generatedQuote?.status || 'Waiting for quote send'}</span></div>
                <div><strong>Sent at</strong><span>{generatedQuote?.sentAt || 'Not sent yet'}</span></div>
                <div><strong>Approval method</strong><span>{generatedQuote?.approvalMethod || 'Pending'}</span></div>
                <div><strong>Approved at</strong><span>{generatedQuote?.approvedAt || 'Pending'}</span></div>
                <div><strong>Recorded by</strong><span>{generatedQuote?.approvedBy || 'Pending'}</span></div>
              </div>
              <div className="booking-intake-footer-actions">
                <button type="button" className="btn btn-compact" onClick={() => markQuoteAccepted('Customer agreed by phone')} data-testid="approve-quote-phone">Customer agreed by phone</button>
                <button type="button" className="btn btn-secondary btn-compact" onClick={() => markQuoteAccepted('Customer agreed by email')} data-testid="approve-quote-email">Customer agreed by email</button>
                <button type="button" className="btn btn-secondary btn-compact" onClick={() => markQuoteAccepted('Customer approved digitally')} data-testid="approve-quote-digital">Customer approved digitally</button>
                <button type="button" className="btn btn-tertiary btn-compact" onClick={markQuoteRejected} data-testid="reject-quote">Mark Rejected</button>
                <button type="button" className="btn btn-secondary btn-compact" onClick={reviseQuote} data-testid="revise-quote">Revise Quote</button>
              </div>
            </article>

            <article className="booking-intake-card">
              <div className="booking-intake-card-header"><span>Stage 4</span><h2>Booking Confirmation</h2></div>
              <div className="booking-review-grid">
                <div><strong>{generatedQuote?.bookingId ? 'Booking reference' : 'Quote reference'}</strong><span>{generatedQuote?.bookingId || generatedQuote?.quoteId || 'Pending'}</span></div>
                <div><strong>Approval state</strong><span>{generatedQuote?.bookingId ? 'Booking confirmed' : generatedQuote?.status === 'accepted' ? 'Customer approved' : 'Awaiting approval'}</span></div>
                <div><strong>First responsible desk</strong><span>{modeConfig.bookingDeskLabel.replace('Open in ', '')}</span></div>
                <div><strong>Booking route</strong><span>{form.shipmentMode === 'Ocean Freight' || form.shipmentMode === 'Multimodal' ? (form.originCountry === 'China' ? originAgentEmail : 'Operations allocation') : 'Mode-driven operations flow'}</span></div>
                <div><strong>Trade refs</strong><span>{form.freightPaymentTerm.toUpperCase()} · LC {form.lcNumber || form.bankPermitNumber || 'Pending'} · TIN {form.consigneeTinNumber || 'Pending'}</span></div>
                <div><strong>Source packet</strong><span>{form.placeOfReceipt || form.originCityPort} {'->'} {form.deliveryAddress}</span></div>
              </div>
              <div className="booking-intake-footer-actions">
                <button type="button" className="btn btn-compact" onClick={confirmBooking} disabled={generatedQuote?.status !== 'accepted'} data-testid="confirm-booking">Confirm Booking</button>
                <button type="button" className="btn btn-secondary btn-compact" onClick={saveDraft} data-testid="save-booking-draft">Save Booking Draft</button>
                <Link href={modeConfig.bookingDeskHref} className="btn btn-secondary btn-compact" data-testid="open-mode-booking-desk">{modeConfig.bookingDeskLabel}</Link>
              </div>
            </article>

            <article className="booking-intake-card">
              <div className="booking-intake-card-header"><span>Section 8</span><h2>Review & Confirm</h2></div>
              <div className="booking-review-grid">
                <div><strong>Shipment</strong><span>{form.bookingType} · {form.shipmentDirection} · {form.serviceLevel} · {form.priority}</span></div>
                <div><strong>Customer</strong><span>{form.customerName} · {form.companyName}</span></div>
                <div><strong>Route</strong><span>{form.originCityPort} {'->'} {form.destinationCityPort}</span></div>
                <div><strong>Cargo</strong><span>{form.cargoCategory} · {form.grossWeight} kg · {form.volumeCbm} CBM</span></div>
                <div><strong>Equipment</strong><span>{canUseContainerFields ? `${form.containerType} / ${form.containerSize} x ${form.containerQuantity}` : form.bookingType}</span></div>
                <div><strong>Pricing</strong><span>{pricing.currency} {pricing.total.toLocaleString('en-US')}</span></div>
                <div><strong>Readiness</strong><span>{form.documentsCompleteness} docs · {form.customsReadiness} customs</span></div>
                <div><strong>Commercial refs</strong><span>HS {form.hsCode || 'Pending'} · Marks {form.marksAndNumbers || 'Pending'} · {form.packageCount} {form.packagingType}</span></div>
                <div><strong>Trade / document</strong><span>{form.freightPaymentTerm.toUpperCase()} · LC {form.lcNumber || form.bankPermitNumber || 'Pending'} · {modeConfig.documents.join(', ')}</span></div>
              </div>
              <div className="booking-intake-footer-actions">
                <button type="button" className="btn btn-compact" onClick={primaryAction} data-testid="primary-workflow-action">{primaryLabel}</button>
                <button type="button" className="btn btn-secondary btn-compact" onClick={confirmBooking} disabled={generatedQuote?.status !== 'accepted'} data-testid="convert-to-booking">Convert to Booking</button>
              </div>
            </article>
          </div>

          <BookingIntakeSummaryPanels
            liveQuoteSummary={liveQuoteSummary}
            validityDate={generatedQuote?.validityUntil || form.preferredDepartureWindow}
            snapshot={{
              bookingType: form.bookingType,
              route: `${form.originCityPort} -> ${form.destinationCityPort}`,
              cargo: form.cargoCategory,
              equipment: canUseContainerFields ? `${form.containerType} / ${form.containerSize} x ${form.containerQuantity}` : form.bookingType,
              targetDeparture: form.preferredDepartureWindow || 'Pending',
              customer: form.customerName,
            }}
            readinessItems={readinessItems}
            copilotInsight={copilotInsight}
            copilotActions={copilotActions}
            onRunCopilotAction={runCopilotAction}
            nextAction={{
              title: workflowStep === 1 ? 'Generate quote from shipment details' : workflowStep === 2 ? 'Send quote to customer' : workflowStep === 3 ? 'Record customer approval' : workflowStep === 4 ? 'Confirm booking and assign origin' : modeConfig.bookingDeskLabel,
              currentStepLabel,
              description: workflowStep === 1 ? 'Shipment details come first. Pricing is generated only after cargo, route, and equipment details are complete.' : workflowStep === 2 ? 'Review the quote snapshot, then send it to the customer for formal approval.' : workflowStep === 3 ? 'Booking remains locked until approval is recorded with method and timestamp.' : workflowStep === 4 ? `Create the booking, create the shipment, and route it to ${modeConfig.bookingDeskLabel.replace('Open in ', '')}.` : `Commercial details are locked. Continue the workflow in ${modeConfig.bookingDeskLabel.replace('Open in ', '')}.`,
              primaryLabel,
              bookingDeskHref: modeConfig.bookingDeskHref,
              bookingDeskLabel: modeConfig.bookingDeskLabel,
              showDeskLink: workflowStep >= 4,
              latestRecord: lastRecordId,
            }}
            onPrimaryAction={primaryAction}
          />
        </section>
      </section>
    </main>
  );
}
