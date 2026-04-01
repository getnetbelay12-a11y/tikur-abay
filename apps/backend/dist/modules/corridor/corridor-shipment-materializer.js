"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.materializeCorridorShipmentFromBooking = materializeCorridorShipmentFromBooking;
const models_1 = require("../../database/models");
function buildCorridorRoute(booking) {
    const origin = String(booking.routeSnapshot?.portOfLoading || booking.routeSnapshot?.originCityOrPort || booking.routeSnapshot?.placeOfReceipt || '').trim();
    const destination = String(booking.routeSnapshot?.inlandDestination || booking.routeSnapshot?.finalDeliveryLocation || booking.routeSnapshot?.portOfDischarge || '').trim();
    if (origin && destination)
        return `${origin} -> ${destination}`;
    return String(booking.route || booking.routeSnapshot?.routeSummary || 'China -> Djibouti -> Ethiopia');
}
function buildShipmentPatchFromBooking(booking) {
    const shipmentRef = String(booking.shipmentRef || booking.bookingCode || '').trim();
    const bookingCode = String(booking.bookingCode || shipmentRef || '').trim();
    const routeSnapshot = booking.routeSnapshot || {};
    const cargoSnapshot = booking.cargoSnapshot || {};
    const pricingSnapshot = booking.pricingSnapshot || {};
    return {
        shipmentId: shipmentRef,
        shipmentRef,
        bookingNumber: bookingCode,
        customerId: String(booking.customerCode || booking.customerId || ''),
        customerCode: String(booking.customerCode || booking.customerId || ''),
        customerName: String(booking.customerName || booking.customerSnapshot?.customerName || ''),
        consigneeName: String(booking.customerSnapshot?.consigneeName || ''),
        serviceMode: String(cargoSnapshot.containerType || booking.requestedVehicleType || ''),
        serviceType: 'multimodal',
        shipmentStatus: 'active',
        status: 'active',
        quoteId: String(booking.quoteId || ''),
        bookingId: bookingCode,
        bookingStatus: String(booking.status || 'confirmed'),
        quoteStatus: String(booking.quoteStatus || ''),
        acceptedAt: booking.acceptedAt || undefined,
        assignedOriginAgentId: String(booking.assignedOriginAgentId || ''),
        assignedOriginAgentEmail: String(booking.assignedOriginAgentEmail || ''),
        originPort: String(routeSnapshot.originCityOrPort || routeSnapshot.portOfLoading || ''),
        portOfLoading: String(routeSnapshot.portOfLoading || routeSnapshot.originCityOrPort || ''),
        portOfDischarge: String(routeSnapshot.portOfDischarge || ''),
        dischargePort: String(routeSnapshot.portOfDischarge || ''),
        inlandDestination: String(routeSnapshot.inlandDestination || ''),
        finalDeliveryLocation: String(routeSnapshot.finalDeliveryLocation || ''),
        corridorRoute: buildCorridorRoute(booking),
        currentStage: 'booking_quote',
        currentOwnerRole: 'supplier_agent',
        currentStatus: 'booking_created',
        financeStatus: 'awaiting_bank_document',
        releaseStatus: 'not_ready_for_release',
        dryPortStatus: 'awaiting_release',
        interchangeStatus: 'full_received',
        invoiceStatus: 'missing',
        packingListStatus: 'missing',
        blStatus: 'missing',
        customsDocStatus: 'missing',
        transitDocStatus: 'missing',
        releaseNoteStatus: 'missing',
        podStatus: 'missing',
        customerConfirmationStatus: 'pending',
        shortageStatus: 'clear',
        damageStatus: 'clear',
        emptyReturnOpen: true,
        returnReceiptStatus: 'missing',
        originReady: false,
        djiboutiReleaseReady: false,
        dispatchReady: false,
        inlandArrivalReady: false,
        yardClosureReady: false,
        emptyReturnClosed: false,
        totalChargeAmount: Number(pricingSnapshot.totalAmount || pricingSnapshot.total || 0),
        totalPaidAmount: 0,
        balanceDueAmount: Number(pricingSnapshot.totalAmount || pricingSnapshot.total || 0),
        blockedReasons: ['Missing Manifest', 'Missing BL', 'Missing Invoice', 'Missing Packing List'],
        readinessStatus: 'blocked',
        workflowState: 'waiting_for_documents',
        commoditySummary: String(cargoSnapshot.commoditySummary || booking.cargoType || ''),
        incoterm: String(routeSnapshot.incoterm || ''),
    };
}
async function materializeCorridorShipmentFromBooking(reference) {
    const normalizedReference = String(reference || '').trim();
    if (!normalizedReference)
        return null;
    const existingShipment = await models_1.CorridorShipmentModel.findOne({
        $or: [
            { shipmentId: normalizedReference },
            { shipmentRef: normalizedReference },
            { bookingNumber: normalizedReference },
        ],
    }).lean();
    if (existingShipment)
        return existingShipment;
    const booking = (await models_1.BookingModel.findOne({
        $or: [
            { bookingCode: normalizedReference },
            { shipmentRef: normalizedReference },
            { quoteId: normalizedReference },
        ],
    }).lean());
    if (!booking)
        return null;
    const shipmentRef = String(booking.shipmentRef || booking.bookingCode || '').trim();
    if (!shipmentRef)
        return null;
    await models_1.CorridorShipmentModel.findOneAndUpdate({ shipmentRef }, { $set: buildShipmentPatchFromBooking(booking) }, { upsert: true, new: true }).lean();
    return models_1.CorridorShipmentModel.findOne({ shipmentRef }).lean();
}
//# sourceMappingURL=corridor-shipment-materializer.js.map