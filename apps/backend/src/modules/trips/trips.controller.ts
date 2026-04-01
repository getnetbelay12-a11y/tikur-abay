// @ts-nocheck
import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { connectToDatabase } from '../../database/mongo';
import {
  CorridorContainerModel,
  CorridorDocumentModel,
  CorridorShipmentModel,
  CorridorTripAssignmentModel,
  DriverModel,
  DriverReportModel,
  FuelLogModel,
  InvoiceModel,
  TripEventModel,
  TripModel,
  UploadedDocumentModel,
  UserModel,
} from '../../database/models';
import { CurrentUser } from '../auth/current-user.decorator';
import { Permissions } from '../auth/permissions.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { CorridorService, corridorActorFromUser } from '../corridor/corridor.service';

@ApiTags('trips')
@Controller('trips')
export class TripsController {
  constructor(private readonly corridorService: CorridorService) {}

  private isDriverActor(user: AuthenticatedUser) {
    return ['driver', 'internal_driver', 'external_driver'].includes(String(user.role || '')) ||
      ['internal_driver', 'external_driver'].includes(String(user.mobileRole || ''));
  }

  private tripCodeScore(...values: unknown[]) {
    for (const value of values) {
      const digits = String(value || '').replace(/\D/g, '');
      if (!digits) continue;
      const parsed = Number(digits);
      if (!Number.isNaN(parsed)) return parsed;
    }
    return -1;
  }

  private tripStatusWeight(...values: unknown[]) {
    const normalized = String(values.find((value) => String(value || '').trim()) || '')
      .trim()
      .toLowerCase();
    switch (normalized) {
      case 'awaiting_unload_handoff':
      case 'awaiting unload handoff':
      case 'handed_to_yard':
      case 'handed to yard':
      case 'arrived_inland':
      case 'arrived inland':
        return 95;
      case 'ready_to_depart':
      case 'ready to depart':
        return 90;
      case 'departed':
      case 'in_transit':
      case 'in transit':
      case 'checkpoint_hold':
      case 'checkpoint hold':
      case 'delayed':
        return 80;
      case 'assigned':
        return 70;
      case 'awaiting_driver_assignment':
      case 'awaiting driver assignment':
        return 60;
      case 'awaiting_truck_assignment':
      case 'awaiting truck assignment':
        return 10;
      default:
        return 40;
    }
  }

  private tripUpdatedAtScore(trip: any) {
    return new Date(trip?.lastUpdate || trip?.updatedAt || trip?.createdAt || 0).getTime();
  }

  @Get()
  @Permissions('trips:view', 'trips:own:view', 'trips:view-assigned')
  async list(@CurrentUser() user: AuthenticatedUser) {
    await connectToDatabase();
    const query: Record<string, unknown> = {};
    const isDriverActor = this.isDriverActor(user);
    if (user.role === 'customer') {
      query.customerCode = user.customerCode;
    }
    if (isDriverActor) {
      query.driverId = user.id;
    }
    if (!user.permissions.includes('*') && user.role !== 'executive' && user.role !== 'customer' && !isDriverActor) {
      query.branchId = user.branchId;
    }
    const trips = await TripModel.find(query).sort({ createdAt: -1 }).limit(100).lean();
    const corridorPhoneTrips = isDriverActor && user.phone
      ? await CorridorTripAssignmentModel.find({ driverPhone: user.phone })
          .select('tripId shipmentId shipmentRef containerNumber driverName driverPhone truckPlate trailerPlate tripStatus dispatchStatus currentCheckpoint blNumber routeName route originPoint destinationPoint')
          .lean()
      : [];
    const tripByCode = new Map(trips.map((trip: any) => [String(trip.tripCode || ''), trip]));
    const missingCorridorTripCodes = corridorPhoneTrips
      .map((trip: any) => String(trip.tripId || ''))
      .filter((tripCode) => tripCode && !tripByCode.has(tripCode));
    const supplementalTrips = missingCorridorTripCodes.length
      ? await TripModel.find({ tripCode: { $in: missingCorridorTripCodes } }).lean()
      : [];
    const mergedTrips = [...trips];
    supplementalTrips.forEach((trip: any) => {
      if (!mergedTrips.some((existing: any) => String(existing._id) === String(trip._id))) {
        mergedTrips.push(trip);
      }
    });

    const tripIds = mergedTrips.map((trip: any) => trip._id);
    const tripCodes = mergedTrips.map((trip: any) => trip.tripCode).filter(Boolean);
    const [reports, invoices, documents, fuelLogs, events] = await Promise.all([
      DriverReportModel.find({ tripId: { $in: tripIds } }).select('tripId reportCode type urgency status createdAt description').lean(),
      InvoiceModel.find({ tripId: { $in: tripIds } }).select('tripId invoiceCode status outstandingAmount totalAmount dueDate').lean(),
      UploadedDocumentModel.find({ tripId: { $in: tripIds } }).select('tripId documentType fileUrl status').lean(),
      FuelLogModel.find({ tripId: { $in: tripIds } }).sort({ date: -1 }).select('tripId liters cost station date receiptUrl odometerKm').lean(),
      TripEventModel.find({ tripId: { $in: tripIds } }).sort({ eventAt: 1 }).select('tripId title source description location eventAt').lean(),
    ]);
    const corridorTrips = [
      ...(tripCodes.length
        ? await CorridorTripAssignmentModel.find({ tripId: { $in: tripCodes } })
            .select('tripId shipmentId shipmentRef containerNumber driverName driverPhone truckPlate trailerPlate tripStatus dispatchStatus currentCheckpoint blNumber routeName route originPoint destinationPoint')
            .lean()
        : []),
      ...corridorPhoneTrips.filter(
        (trip: any, index: number, all: any[]) =>
          all.findIndex((candidate: any) => String(candidate.tripId) === String(trip.tripId)) === index,
      ),
    ];
    const shipmentIds = Array.from(
      new Set(
        corridorTrips
          .map((trip: any) => String(trip.shipmentId || trip.shipmentRef || ''))
          .filter(Boolean),
      ),
    );
    const [corridorShipments, corridorContainers, corridorDocuments] = shipmentIds.length
      ? await Promise.all([
          CorridorShipmentModel.find({ shipmentId: { $in: shipmentIds } })
            .select('shipmentId shipmentRef bookingNumber customerName billOfLadingNumber currentStage inlandDestination')
            .lean(),
          CorridorContainerModel.find({ shipmentId: { $in: shipmentIds } })
            .select('shipmentId containerNumber sealNumber')
            .lean(),
          CorridorDocumentModel.find({ shipmentId: { $in: shipmentIds } })
            .select('shipmentId documentType referenceNo status fileUrl')
            .lean(),
        ])
      : [[], [], []];

    const reportsByTrip = groupByTrip(reports);
    const invoicesByTrip = groupByTrip(invoices);
    const documentsByTrip = groupByTrip(documents);
    const fuelByTrip = groupByTrip(fuelLogs);
    const eventsByTrip = groupByTrip(events);
    const corridorTripByCode = new Map(corridorTrips.map((trip: any) => [String(trip.tripId), trip]));
    const corridorShipmentById = new Map(corridorShipments.map((shipment: any) => [String(shipment.shipmentId), shipment]));
    const corridorContainerByShipmentId = new Map<string, any>();
    corridorContainers.forEach((container: any) => {
      const key = String(container.shipmentId || '');
      if (key && !corridorContainerByShipmentId.has(key)) {
        corridorContainerByShipmentId.set(key, container);
      }
    });
    const corridorDocumentsByShipmentId = groupByShipment(corridorDocuments);

    const payload = mergedTrips.map((trip: any) => {
      const relatedReports = reportsByTrip.get(String(trip._id)) ?? [];
      const relatedInvoice = (invoicesByTrip.get(String(trip._id)) ?? [])[0] ?? null;
      const relatedDocuments = documentsByTrip.get(String(trip._id)) ?? [];
      const relatedFuel = (fuelByTrip.get(String(trip._id)) ?? [])[0] ?? null;
      const corridorTrip = corridorTripByCode.get(String(trip.tripCode || ''));
      const corridorShipment = corridorTrip ? corridorShipmentById.get(String(corridorTrip.shipmentId || corridorTrip.shipmentRef || '')) : null;
      const corridorContainer = corridorTrip ? corridorContainerByShipmentId.get(String(corridorTrip.shipmentId || corridorTrip.shipmentRef || '')) : null;
      const corridorShipmentDocuments = corridorTrip ? corridorDocumentsByShipmentId.get(String(corridorTrip.shipmentId || corridorTrip.shipmentRef || '')) ?? [] : [];
      const finalBl = findCorridorDocument(corridorShipmentDocuments, 'final_bl');
      const packingList = findCorridorDocument(corridorShipmentDocuments, 'packing_list');
      const invoiceDoc = findCorridorDocument(corridorShipmentDocuments, 'commercial_invoice');
      const transitDoc = findCorridorDocument(corridorShipmentDocuments, 'transit_document');
      const timeline = (eventsByTrip.get(String(trip._id)) ?? []).map((event: any) => ({
        title: event.title || 'Status update',
        source: event.source || 'System update',
        description: event.description || 'Operational update',
        location: event.location || 'Location not recorded',
        eventAt: event.eventAt || new Date(),
      }));

      return {
        id: String(trip._id),
        tripId: String(trip._id),
        tripCode: trip.tripCode || 'Trip',
        shipmentCode: corridorShipment?.bookingNumber || corridorShipment?.shipmentRef || '',
        bookingNumber: corridorShipment?.bookingNumber || corridorShipment?.shipmentRef || '',
        customer: trip.customerName || 'Customer not assigned',
        route: trip.routeName || `${trip.origin || 'Origin'} - ${trip.destination || 'Destination'}`,
        routeLabel: `${trip.origin || 'Origin'} -> ${trip.destination || 'Destination'}`,
        vehicle: trip.vehicleCode || 'Vehicle pending',
        driver: trip.driverName || 'Driver pending',
        driverName: corridorTrip?.driverName || trip.driverName || 'Driver pending',
        driverPhone: corridorTrip?.driverPhone || null,
        truckPlate: corridorTrip?.truckPlate || trip.vehicleCode || '',
        trailerPlate: corridorTrip?.trailerPlate || '',
        status: corridorTrip?.tripStatus || corridorTrip?.dispatchStatus || trip.status || 'assigned',
        tripStatus: corridorTrip?.tripStatus || trip.status || 'assigned',
        dispatchStatus: corridorTrip?.dispatchStatus || trip.status || 'assigned',
        eta: trip.plannedArrivalAt || null,
        value: Number(trip.revenueAmount || 0),
        pod: Boolean(trip.proofOfDeliveryUploaded),
        issues: relatedReports.length,
        lastUpdate: trip.updatedAt || trip.createdAt || null,
        branch: trip.branchName || 'Unknown branch',
        currentCheckpoint: corridorTrip?.currentCheckpoint || trip.currentCheckpoint || 'Origin',
        origin: corridorTrip?.originPoint || trip.origin || null,
        destination: corridorTrip?.destinationPoint || trip.destination || null,
        containerNumber: corridorTrip?.containerNumber || corridorContainer?.containerNumber || '',
        sealNumber: corridorContainer?.sealNumber || '',
        blNumber: finalBl?.referenceNo || corridorShipment?.billOfLadingNumber || '',
        packingListNumber: packingList?.referenceNo || '',
        invoiceNumber: invoiceDoc?.referenceNo || '',
        transitDocumentNumber: transitDoc?.referenceNo || '',
        delayed: Number(trip.delayedMinutes || 0) > 0,
        documents: relatedDocuments.map((document: any) => ({
          type: document.documentType || 'document',
          status: document.status || 'uploaded',
          fileUrl: document.fileUrl || '#',
        })),
        fuel: relatedFuel ? {
          liters: Number(relatedFuel.liters || 0),
          cost: Number(relatedFuel.cost || 0),
          station: relatedFuel.station || 'Fuel station',
          date: relatedFuel.date || null,
          receiptUrl: relatedFuel.receiptUrl || null,
          odometerKm: Number(relatedFuel.odometerKm || 0),
        } : null,
        incidents: relatedReports.map((report: any) => ({
          reportCode: report.reportCode || 'Report',
          type: report.type || 'incident',
          severity: report.urgency || 'medium',
          status: report.status || 'submitted',
          createdAt: report.createdAt || null,
          description: report.description || 'Driver report filed.',
        })),
        invoice: relatedInvoice ? {
          code: relatedInvoice.invoiceCode || 'Invoice',
          status: relatedInvoice.status || 'pending',
          outstandingAmount: Number(relatedInvoice.outstandingAmount || 0),
          totalAmount: Number(relatedInvoice.totalAmount || 0),
          dueDate: relatedInvoice.dueDate || null,
          href: '/finance-console',
        } : null,
        timeline,
      };
    });

    if (isDriverActor) {
      return payload.sort((left: any, right: any) => {
        const rightUpdated = this.tripUpdatedAtScore(right);
        const leftUpdated = this.tripUpdatedAtScore(left);
        if (rightUpdated !== leftUpdated) return rightUpdated - leftUpdated;

        const rightStatusWeight = this.tripStatusWeight(right.tripStatus, right.dispatchStatus, right.status);
        const leftStatusWeight = this.tripStatusWeight(left.tripStatus, left.dispatchStatus, left.status);
        if (rightStatusWeight !== leftStatusWeight) return rightStatusWeight - leftStatusWeight;
        const rightScore = this.tripCodeScore(right.tripCode, right.bookingNumber, right.shipmentCode);
        const leftScore = this.tripCodeScore(left.tripCode, left.bookingNumber, left.shipmentCode);
        if (rightScore !== leftScore) return rightScore - leftScore;
        return rightUpdated - leftUpdated;
      });
    }

    return payload;
  }

  @Get('latest')
  @Permissions('trips:view', 'dashboards:executive:view')
  async latest(@CurrentUser() user: AuthenticatedUser) {
    await connectToDatabase();
    const query: Record<string, unknown> = {};
    if (!user.permissions.includes('*') && !['executive', 'super_admin'].includes(user.role)) {
      query.branchId = user.branchId;
    }
    return TripModel.find(query)
      .sort({ createdAt: -1 })
      .limit(12)
      .select('tripCode customerName routeName status revenueAmount createdAt')
      .lean();
  }

  @Get(':id')
  @Permissions('trips:view', 'trips:own:view', 'trips:view-assigned')
  async getOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await connectToDatabase();
    const trip = await TripModel.findOne({ $or: [{ _id: id }, { tripCode: id }] }).lean();
    if (!trip) return null;
    const isDriverActor = this.isDriverActor(user);
    if (user.role === 'customer' && trip.customerCode !== user.customerCode) return null;
    if (isDriverActor && String(trip.driverId) !== user.id) {
      const corridorTripMatch = trip.tripCode
        ? await CorridorTripAssignmentModel.findOne({ tripId: trip.tripCode, driverPhone: user.phone })
            .select('tripId')
            .lean()
        : null;
      if (!corridorTripMatch) return null;
    }
    const corridorTrip = trip.tripCode
      ? await CorridorTripAssignmentModel.findOne({ tripId: trip.tripCode })
          .select('tripId shipmentId shipmentRef containerNumber driverName driverPhone truckPlate trailerPlate tripStatus dispatchStatus currentCheckpoint originPoint destinationPoint')
          .lean()
      : null;
    const corridorShipmentId = String(corridorTrip?.shipmentId || corridorTrip?.shipmentRef || '');
    const [events, documents, reports, fuel, invoice, driver, corridorShipment, corridorContainer, corridorDocuments] = await Promise.all([
      TripEventModel.find({ tripId: trip._id }).sort({ eventAt: 1 }).select('title source description location eventAt').lean(),
      UploadedDocumentModel.find({ tripId: trip._id }).sort({ createdAt: -1 }).select('documentType title fileUrl status createdAt').lean(),
      DriverReportModel.find({ tripId: trip._id }).sort({ createdAt: -1 }).select('reportCode type urgency status createdAt description').lean(),
      FuelLogModel.findOne({ tripId: trip._id }).sort({ date: -1 }).select('liters cost station date receiptUrl odometerKm').lean(),
      InvoiceModel.findOne({ tripId: trip._id }).select('invoiceCode status outstandingAmount totalAmount dueDate').lean(),
      trip.driverId ? DriverModel.findById(trip.driverId).select('userId firstName lastName').lean() : null,
      corridorShipmentId ? CorridorShipmentModel.findOne({ shipmentId: corridorShipmentId }).select('bookingNumber billOfLadingNumber').lean() : null,
      corridorShipmentId ? CorridorContainerModel.findOne({ shipmentId: corridorShipmentId }).select('containerNumber sealNumber').lean() : null,
      corridorShipmentId ? CorridorDocumentModel.find({ shipmentId: corridorShipmentId }).select('documentType referenceNo status fileUrl').lean() : [],
    ]);

    const driverUser = driver?.userId ? await UserModel.findById(driver.userId).select('phone phoneNumber').lean() : null;
    const finalBl = findCorridorDocument(corridorDocuments, 'final_bl');
    const packingList = findCorridorDocument(corridorDocuments, 'packing_list');
    const invoiceDoc = findCorridorDocument(corridorDocuments, 'commercial_invoice');
    const transitDoc = findCorridorDocument(corridorDocuments, 'transit_document');

    return {
      id: String(trip._id),
      tripCode: trip.tripCode || 'Trip',
      bookingNumber: corridorShipment?.bookingNumber || corridorShipmentId || '',
      customer: trip.customerName || 'Customer not assigned',
      driver: trip.driverName || [driver?.firstName, driver?.lastName].filter(Boolean).join(' ') || 'Driver not assigned',
      driverPhone: corridorTrip?.driverPhone || driverUser?.phone || driverUser?.phoneNumber || null,
      vehicle: corridorTrip?.truckPlate || trip.vehicleCode || 'Vehicle pending',
      truckPlate: corridorTrip?.truckPlate || trip.vehicleCode || null,
      trailerPlate: corridorTrip?.trailerPlate || null,
      route: trip.routeName || `${trip.origin || 'Origin'} - ${trip.destination || 'Destination'}`,
      cargo: trip.routeType || null,
      origin: corridorTrip?.originPoint || trip.origin || null,
      destination: corridorTrip?.destinationPoint || trip.destination || null,
      status: corridorTrip?.tripStatus || trip.status || 'assigned',
      dispatchStatus: corridorTrip?.dispatchStatus || trip.status || 'assigned',
      startTime: trip.actualStartAt || trip.plannedStartAt || null,
      completionTime: trip.actualArrivalAt || null,
      eta: trip.plannedArrivalAt || null,
      currentCheckpoint: corridorTrip?.currentCheckpoint || trip.currentCheckpoint || null,
      branch: trip.branchName || null,
      delayedMinutes: Number(trip.delayedMinutes || 0),
      proofOfDeliveryUploaded: Boolean(trip.proofOfDeliveryUploaded),
      revenueAmount: Number(trip.revenueAmount || 0),
      containerNumber: corridorTrip?.containerNumber || corridorContainer?.containerNumber || '',
      sealNumber: corridorContainer?.sealNumber || '',
      blNumber: finalBl?.referenceNo || corridorShipment?.billOfLadingNumber || '',
      packingListNumber: packingList?.referenceNo || '',
      invoiceNumber: invoiceDoc?.referenceNo || '',
      transitDocumentNumber: transitDoc?.referenceNo || '',
      documents: documents.map((document: any) => ({
        id: String(document._id),
        title: document.title || document.documentType || 'Trip document',
        type: document.documentType || 'document',
        status: document.status || 'uploaded',
        fileUrl: document.fileUrl || '#',
        createdAt: document.createdAt || null,
      })),
      timeline: events.map((event: any) => ({
        id: String(event._id),
        title: event.title || 'Status update',
        source: event.source || 'System update',
        location: event.location || null,
        note: event.description || null,
        timestamp: event.eventAt || null,
      })),
      incidents: reports.map((report: any) => ({
        reportCode: report.reportCode || 'Report',
        type: report.type || 'incident',
        severity: report.urgency || 'medium',
        status: report.status || 'submitted',
        createdAt: report.createdAt || null,
        description: report.description || 'Driver report filed.',
      })),
      fuel: fuel ? {
        liters: Number(fuel.liters || 0),
        cost: Number(fuel.cost || 0),
        station: fuel.station || 'Fuel station',
        date: fuel.date || null,
        receiptUrl: fuel.receiptUrl || null,
        odometerKm: Number(fuel.odometerKm || 0),
      } : null,
      invoice: invoice ? {
        code: invoice.invoiceCode || 'Invoice',
        status: invoice.status || 'pending',
        outstandingAmount: Number(invoice.outstandingAmount || 0),
        totalAmount: Number(invoice.totalAmount || 0),
        dueDate: invoice.dueDate || null,
      } : null,
    };
  }

  @Patch(':id/status')
  @Permissions('trips:update-status', 'trips:view-assigned')
  async updateStatus(@Param('id') id: string, @Body() body: { status?: string }) {
    await connectToDatabase();
    const trip = await TripModel.findOneAndUpdate(
      { $or: [{ _id: id }, { tripCode: id }] },
      { $set: { status: body.status || 'assigned' } },
      { new: true },
    ).lean();
    return {
      ...(trip ?? { id }),
      status: body.status || trip?.status || 'assigned',
      updatedAt: new Date().toISOString(),
    };
  }

  @Post(':id/checkpoint-update')
  @Permissions('trips:update-status', 'trips:view-assigned')
  async checkpointUpdate(
    @Param('id') id: string,
    @Body()
    body: {
      location?: string;
      status?: string;
      sealIntact?: boolean;
      note?: string;
      officerName?: string;
    },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.corridorService.performTripAction(
      corridorActorFromUser(user),
      id,
      'checkpoint_update',
      body,
    );
  }

  @Get(':id/events')
  @Permissions('trip-events:view', 'trips:view', 'trips:own:view', 'trips:view-assigned')
  async events(@Param('id') id: string) {
    await connectToDatabase();
    const trip = await TripModel.findOne({ $or: [{ _id: id }, { tripCode: id }] }).lean();
    if (!trip) return [];
    return TripEventModel.find({ tripId: trip._id }).sort({ eventAt: 1 }).lean();
  }
}

function groupByTrip(items: any[]) {
  const map = new Map<string, any[]>();
  for (const item of items) {
    const key = String(item.tripId || '');
    if (!key) continue;
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return map;
}

function groupByShipment(items: any[]) {
  const map = new Map<string, any[]>();
  for (const item of items) {
    const key = String(item.shipmentId || '');
    if (!key) continue;
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return map;
}

function findCorridorDocument(items: any[], documentType: string) {
  return items.find((item: any) => String(item.documentType || '') === documentType) ?? null;
}
