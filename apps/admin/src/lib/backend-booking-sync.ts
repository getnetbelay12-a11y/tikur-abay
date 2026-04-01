import { apiPost } from './api';
import type { UnifiedBookingRequest } from './booking-quote-demo-data';

function buildRoute(request: UnifiedBookingRequest) {
  return [
    request.portOfLoading || request.originCityOrPort || request.placeOfReceipt,
    request.inlandDestination || request.finalDeliveryLocation || request.portOfDischarge,
  ]
    .filter(Boolean)
    .join(' -> ');
}

export async function syncBookingToBackendWorkflow(request: UnifiedBookingRequest) {
  if (!request.bookingId) return null;

  return apiPost<Record<string, unknown>>('/shipment/book', {
    quoteId: request.quoteId,
    bookingId: request.bookingId,
    bookingCode: request.bookingId,
    shipmentId: request.convertedToShipmentId || request.bookingId,
    shipmentRef: request.convertedToShipmentId || request.bookingId,
    customerName: request.customerName,
    customerCode: request.customerTinVatNumber || request.consigneeTinNumber || '',
    consigneeName: request.consigneeName,
    company: request.company,
    phone: request.phone,
    email: request.email,
    containerType: request.containerType,
    route: buildRoute(request),
    originCityOrPort: request.originCityOrPort,
    portOfLoading: request.portOfLoading,
    portOfDischarge: request.portOfDischarge,
    inlandDestination: request.inlandDestination,
    finalDeliveryLocation: request.finalDeliveryLocation,
    placeOfReceipt: request.placeOfReceipt,
    cargoDescription: request.cargoDescription,
    commoditySummary: request.commoditySummary,
    incoterm: request.incoterm,
    quoteAmount: request.quoteAmount,
    quoteCurrency: request.quoteCurrency,
    quoteStatus: request.quoteStatus,
    acceptedAt: request.acceptedAt,
    assignedOriginAgentId: request.assignedOriginAgentId,
    assignedOriginAgentEmail: request.assignedOriginAgentEmail,
  });
}
