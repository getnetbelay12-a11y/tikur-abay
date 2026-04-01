// @ts-nocheck
import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { connectToDatabase } from '../../database/mongo';
import { AvailabilityReportModel, BranchModel, DriverKycRequestModel, DriverModel, DriverPerformanceMetricModel, DriverProfileModel, RentalPartnerModel, RentalPartnerTripModel, TripModel, UserModel } from '../../database/models';
import { Permissions } from '../auth/permissions.decorator';

@ApiTags('drivers')
@Controller('drivers')
export class DriversController {
  @Get()
  @Permissions('drivers:view')
  async list() {
    await connectToDatabase();
    const [drivers, latestMetrics] = await Promise.all([
      DriverModel.find({}).sort({ updatedAt: -1 }).limit(200).lean(),
      DriverPerformanceMetricModel.aggregate([
        { $sort: { periodEnd: -1 } },
        {
          $group: {
            _id: '$driverId',
            performanceScore: { $first: '$performanceScore' },
            tripsCompleted: { $first: '$tripsCompleted' },
            delayedTrips: { $first: '$delayedTrips' },
            accidentCount: { $first: '$accidentCount' },
          },
        },
      ]),
    ]);

    const driverIds = (drivers as any[]).map((driver) => driver._id);
    const userIds = (drivers as any[]).map((driver) => driver.userId).filter(Boolean);
    const branchIds = (drivers as any[]).map((driver) => driver.branchId).filter(Boolean);
    const [profiles, users, branches, activeTrips, availabilityReports, kycRequests, rentalTrips, rentalPartners] = await Promise.all([
      DriverProfileModel.find({ driverId: { $in: driverIds } }).select('driverId phone emergencyContact licenseNumber licenseExpiry').lean(),
      UserModel.find({ _id: { $in: userIds } }).select('_id phone phoneNumber').lean(),
      BranchModel.find({ _id: { $in: branchIds } }).select('_id name').lean(),
      TripModel.find({ driverId: { $in: driverIds }, status: { $in: ['assigned', 'loading', 'loaded', 'in_transit', 'at_checkpoint', 'at_border', 'offloading', 'in_djibouti', 'delayed'] } })
        .sort({ updatedAt: -1 })
        .select('driverId tripCode vehicleCode routeName destination status plannedArrivalAt')
        .lean(),
      AvailabilityReportModel.find({ driverId: { $in: driverIds } }).sort({ createdAt: -1 }).select('driverId status reason notes createdAt').lean(),
      DriverKycRequestModel.find({ userId: { $in: userIds } }).select('userId status faydaFrontDocumentId faydaBackDocumentId').lean(),
      RentalPartnerTripModel.find({ status: { $in: ['assigned', 'in_progress'] } })
        .sort({ assignedAt: -1 })
        .limit(40)
        .select('partnerId tripId tripCode vehicleCode externalDriverName externalDriverPhone currentLocationLabel branchId assignedAt status')
        .lean(),
      RentalPartnerModel.find({ status: 'active' }).select('_id partnerName phone').lean(),
    ]);

    const metricMap = new Map((latestMetrics as any[]).map((metric) => [String(metric._id), metric]));
    const profileMap = new Map((profiles as any[]).map((profile) => [String(profile.driverId), profile]));
    const userMap = new Map((users as any[]).map((user) => [String(user._id), user]));
    const branchMap = new Map((branches as any[]).map((branch) => [String(branch._id), branch.name]));
    const tripMap = new Map((activeTrips as any[]).map((trip) => [String(trip.driverId), trip]));
    const kycMap = new Map((kycRequests as any[]).map((item) => [String(item.userId), item]));
    const partnerMap = new Map((rentalPartners as any[]).map((partner) => [String(partner._id), partner]));
    const tripDetailMap = new Map(
      (
        await TripModel.find({ _id: { $in: (rentalTrips as any[]).map((item) => item.tripId).filter(Boolean) } })
          .select('_id destination routeName plannedArrivalAt')
          .lean()
      ).map((trip: any) => [String(trip._id), trip]),
    );
    const availabilityMap = new Map<string, any>();
    for (const report of availabilityReports as any[]) {
      const key = String(report.driverId);
      if (!availabilityMap.has(key)) availabilityMap.set(key, report);
    }
    const internalRows = (drivers as any[]).map((driver) => {
      const metric = metricMap.get(String(driver._id));
      const profile = profileMap.get(String(driver._id));
      const user = userMap.get(String(driver.userId ?? ''));
      const trip = tripMap.get(String(driver._id));
      const kyc = kycMap.get(String(driver.userId ?? ''));
      const availability = availabilityMap.get(String(driver._id));
      return {
        id: String(driver._id),
        driverId: driver.driverCode,
        source: 'internal',
        name: `${driver.firstName || ''} ${driver.lastName || ''}`.trim(),
        branchId: driver.branchId ? String(driver.branchId) : null,
        branch: branchMap.get(String(driver.branchId ?? '')) ?? 'Unknown branch',
        phone: profile?.phone || user?.phone || user?.phoneNumber || 'Phone pending',
        emergencyContact: profile?.emergencyContact || 'Emergency contact pending',
        licenseNumber: profile?.licenseNumber || 'DL pending',
        faydaStatus: kyc?.status || 'draft',
        faydaFrontId: kyc?.faydaFrontDocumentId || null,
        faydaBackId: kyc?.faydaBackDocumentId || null,
        status: driver.status,
        vehicle: trip?.vehicleCode || driver.assignedVehicleCode || 'Unassigned',
        currentTrip: trip?.tripCode || 'No active trip',
        route: trip?.routeName || 'Route pending',
        destination: trip?.destination || 'Destination pending',
        eta: trip?.plannedArrivalAt || null,
        availability: availability?.status || 'available',
        availabilityReason: availability?.reason || availability?.notes || null,
        licenseExpiry: profile?.licenseExpiry || driver.licenseExpiry || null,
        performanceScore: metric?.performanceScore ?? null,
        tripsCompleted: metric?.tripsCompleted ?? 0,
        delayedTrips: metric?.delayedTrips ?? 0,
        accidentCount: metric?.accidentCount ?? 0,
      };
    });

    const externalRows = (rentalTrips as any[]).map((trip: any, index: number) => {
      const partner = partnerMap.get(String(trip.partnerId));
      const tripDetail = tripDetailMap.get(String(trip.tripId));
      return {
        id: `external-${String(trip._id)}`,
        driverId: `EXT-${String(index + 1).padStart(4, '0')}`,
        source: 'external',
        name: trip.externalDriverName || 'Partner driver',
        branchId: trip.branchId ? String(trip.branchId) : null,
        branch: branchMap.get(String(trip.branchId ?? '')) ?? 'External partner',
        phone: trip.externalDriverPhone || partner?.phone || 'Phone pending',
        emergencyContact: partner?.phone || 'Partner desk',
        licenseNumber: 'Partner managed',
        faydaStatus: 'partner_managed',
        faydaFrontId: null,
        faydaBackId: null,
        status: trip.status === 'in_progress' ? 'active' : 'assigned',
        vehicle: trip.vehicleCode || 'External vehicle',
        currentTrip: trip.tripCode || 'Assigned rental trip',
        route: tripDetail?.routeName || 'Partner route',
        destination: tripDetail?.destination || 'Destination pending',
        eta: tripDetail?.plannedArrivalAt || null,
        availability: trip.status === 'in_progress' ? 'on_trip' : 'reserved',
        availabilityReason: trip.currentLocationLabel || partner?.partnerName || 'Partner dispatch',
        licenseExpiry: null,
        performanceScore: null,
        tripsCompleted: 0,
        delayedTrips: 0,
        accidentCount: 0,
      };
    });

    return [...internalRows, ...externalRows];
  }

  @Get(':id')
  @Permissions('drivers:view')
  async getOne(@Param('id') id: string) {
    await connectToDatabase();
    const driver = (await DriverModel.findOne({
      $or: [{ _id: id }, { driverCode: id }],
    }).lean()) as any;

    if (!driver) return null;

    const [metric, profile, user, branch, trip, availability, kyc] = await Promise.all([
      DriverPerformanceMetricModel.findOne({ driverId: driver._id }).sort({ periodEnd: -1 }).lean(),
      DriverProfileModel.findOne({ driverId: driver._id }).select('phone emergencyContact licenseNumber licenseExpiry').lean(),
      driver.userId ? UserModel.findById(driver.userId).select('phone phoneNumber').lean() : null,
      driver.branchId ? BranchModel.findById(driver.branchId).select('name').lean() : null,
      TripModel.findOne({
        driverId: driver._id,
        status: { $in: ['assigned', 'loading', 'loaded', 'in_transit', 'at_checkpoint', 'at_border', 'offloading', 'in_djibouti', 'delayed'] },
      })
        .sort({ updatedAt: -1 })
        .select('tripCode vehicleCode routeName destination status plannedArrivalAt')
        .lean(),
      AvailabilityReportModel.findOne({ driverId: driver._id }).sort({ createdAt: -1 }).select('status reason notes').lean(),
      driver.userId ? DriverKycRequestModel.findOne({ userId: driver.userId }).select('status faydaFrontDocumentId faydaBackDocumentId').lean() : null,
    ]);

    return {
      id: String(driver._id),
      driverId: driver.driverCode,
      name: `${driver.firstName || ''} ${driver.lastName || ''}`.trim(),
      branchId: driver.branchId ? String(driver.branchId) : null,
      branch: branch?.name || 'Unknown branch',
      phone: profile?.phone || user?.phone || user?.phoneNumber || 'Phone pending',
      emergencyContact: profile?.emergencyContact || 'Emergency contact pending',
      licenseNumber: profile?.licenseNumber || 'DL pending',
      faydaStatus: kyc?.status || 'draft',
      faydaFrontId: kyc?.faydaFrontDocumentId || null,
      faydaBackId: kyc?.faydaBackDocumentId || null,
      licenseExpiry: profile?.licenseExpiry || driver.licenseExpiry || null,
      status: driver.status,
      assignedVehicleCode: trip?.vehicleCode || driver.assignedVehicleCode || null,
      currentTrip: trip?.tripCode || null,
      route: trip?.routeName || null,
      destination: trip?.destination || null,
      eta: trip?.plannedArrivalAt || null,
      availability: availability?.status || 'available',
      availabilityReason: availability?.reason || availability?.notes || null,
      performanceScore: metric?.performanceScore ?? null,
      tripsCompleted: metric?.tripsCompleted ?? 0,
      delayedTrips: metric?.delayedTrips ?? 0,
      accidentCount: metric?.accidentCount ?? 0,
      breakdownCount: metric?.breakdownCount ?? 0,
      podComplianceRate: metric?.podComplianceRate ?? null,
      documentComplianceRate: metric?.documentComplianceRate ?? null,
    };
  }
}
