import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { connectToDatabase } from '../../database/mongo';
import { ActivityLogModel, IncidentReportModel } from '../../database/models';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';

@ApiTags('incident-reports')
@Controller('incident-reports')
export class IncidentReportsController {
  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() body: Record<string, unknown>) {
    await connectToDatabase();
    const doc = await IncidentReportModel.create({
      ...body,
      createdAt: new Date(),
    });
    await ActivityLogModel.create({
      entityType: 'incident_report',
      entityId: String(doc._id),
      tripId: doc.tripId,
      vehicleId: doc.vehicleId,
      driverId: doc.driverId,
      userId: user.id,
      activityType: doc.type,
      title: `${doc.vehicleCode || 'Vehicle'} ${doc.type}`,
      description: doc.description,
      metadata: { severity: doc.severity, status: doc.status },
    });
    return doc.toObject();
  }

  @Get()
  async list() {
    await connectToDatabase();
    return IncidentReportModel.find().sort({ createdAt: -1 }).limit(100).lean();
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    await connectToDatabase();
    return IncidentReportModel.findOne({ $or: [{ _id: id }, { tripCode: id }] }).lean();
  }
}
