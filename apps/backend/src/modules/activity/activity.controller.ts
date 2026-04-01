import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { connectToDatabase } from '../../database/mongo';
import { ActivityLogModel } from '../../database/models';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';

@ApiTags('activity-logs')
@Controller('activity-logs')
export class ActivityController {
  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() body: Record<string, unknown>) {
    await connectToDatabase();
    const doc = await ActivityLogModel.create({
      ...body,
      userId: body.userId || user.id,
    });
    return doc.toObject();
  }

  @Get()
  async list(@Query('tripId') tripId?: string, @Query('vehicleId') vehicleId?: string) {
    await connectToDatabase();
    const query: Record<string, unknown> = {};
    if (tripId) query.tripId = tripId;
    if (vehicleId) query.vehicleId = vehicleId;
    return ActivityLogModel.find(query).sort({ createdAt: -1 }).limit(200).lean();
  }

  @Get('feed')
  async feed() {
    await connectToDatabase();
    return ActivityLogModel.find().sort({ createdAt: -1 }).limit(40).lean();
  }

  @Get('my')
  async my(@CurrentUser() user: AuthenticatedUser) {
    await connectToDatabase();
    if (user.role === 'driver') {
      return ActivityLogModel.find({ $or: [{ userId: user.id }, { driverId: user.id }] }).sort({ createdAt: -1 }).limit(100).lean();
    }
    return ActivityLogModel.find({ userId: user.id }).sort({ createdAt: -1 }).limit(100).lean();
  }
}
