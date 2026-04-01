import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { connectToDatabase } from '../../database/mongo';
import { DriverProfileModel, DriverReportModel, TripModel, VehicleModel } from '../../database/models';

@ApiTags('driver-reports')
@Controller('driver-reports')
export class DriverReportsController {
  @Get()
  async list() {
    await connectToDatabase();
    const reports = await DriverReportModel.find().sort({ createdAt: -1 }).limit(100).lean();
    const driverIds = reports.map((report: any) => report.driverId).filter(Boolean);
    const tripIds = reports.map((report: any) => report.tripId).filter(Boolean);
    const vehicleIds = reports.map((report: any) => report.vehicleId).filter(Boolean);
    const [profiles, trips, vehicles] = await Promise.all([
      DriverProfileModel.find({ userId: { $in: driverIds } }).select('userId phone fullName').lean(),
      TripModel.find({ _id: { $in: tripIds } }).select('routeName status customerName plannedArrivalAt').lean(),
      VehicleModel.find({ _id: { $in: vehicleIds } }).select('currentStatus branchName plateNumber currentOdometerKm').lean(),
    ]);
    const profileMap = new Map(profiles.map((profile: any) => [String(profile.userId), profile]));
    const tripMap = new Map(trips.map((trip: any) => [String(trip._id), trip]));
    const vehicleMap = new Map(vehicles.map((vehicle: any) => [String(vehicle._id), vehicle]));

    return reports.map((report: any) => {
      const profile = profileMap.get(String(report.driverId));
      const trip = tripMap.get(String(report.tripId));
      const vehicle = vehicleMap.get(String(report.vehicleId));
      return {
        id: String(report._id),
        reportId: String(report._id),
        reportCode: report.reportCode || 'Report',
        type: report.type || 'general_support',
        severity: report.urgency || 'medium',
        driver: report.driverName || profile?.fullName || 'Driver pending',
        driverPhone: profile?.phone || 'Phone pending',
        vehicle: report.vehicleCode || 'Vehicle pending',
        trip: report.tripCode || 'Trip pending',
        branch: report.branchName || vehicle?.branchName || 'Unknown branch',
        submitted: report.createdAt || report.updatedAt || null,
        status: report.status || 'submitted',
        assignedTo: assignedOwner(report.status, report.type),
        description: report.description || 'Driver report submitted.',
        attachments: Array.isArray(report.attachments) ? report.attachments : [],
        location: report.location || null,
        tripDetail: trip ? {
          route: trip.routeName || 'Route pending',
          status: trip.status || 'assigned',
          customer: trip.customerName || 'Customer pending',
          eta: trip.plannedArrivalAt || null,
        } : null,
        vehicleDetail: vehicle ? {
          currentStatus: vehicle.currentStatus || 'available',
          plateNumber: vehicle.plateNumber || 'Plate pending',
          currentOdometerKm: Number(vehicle.currentOdometerKm || 0),
        } : null,
      };
    });
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    await connectToDatabase();
    return DriverReportModel.findOne({ $or: [{ _id: id }, { reportCode: id }] }).lean();
  }

  @Post()
  async create(@Body() body: Record<string, unknown>) {
    await connectToDatabase();
    const count = await DriverReportModel.countDocuments({});
    const doc = await DriverReportModel.create({
      reportCode: `RPT-${String(count + 1).padStart(5, '0')}`,
      ...body,
      status: body.status ?? 'submitted',
    });
    return doc.toObject();
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: { status?: string }) {
    await connectToDatabase();
    return DriverReportModel.findOneAndUpdate(
      { $or: [{ _id: id }, { reportCode: id }] },
      { $set: { status: body.status ?? 'under_review' } },
      { new: true },
    ).lean();
  }
}

function assignedOwner(status?: string, type?: string) {
  if (status === 'resolved') return 'Closed by operations';
  if (type === 'accident_report') return 'Safety lead';
  if (type === 'fuel_request') return 'Fleet desk';
  if (type === 'maintenance_needed' || type === 'tire_issue') return 'Maintenance desk';
  return status === 'under_review' ? 'Operations supervisor' : 'Dispatch queue';
}
