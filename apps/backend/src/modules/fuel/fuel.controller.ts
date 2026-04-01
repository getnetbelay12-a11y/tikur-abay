import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { connectToDatabase } from '../../database/mongo';
import { FuelLogModel, TripModel, VehicleModel } from '../../database/models';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';

@ApiTags('fuel-logs')
@Controller('fuel-logs')
export class FuelController {
  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() body: Record<string, unknown>) {
    await connectToDatabase();
    const doc = await FuelLogModel.create({
      ...body,
      driverId: body.driverId || user.id,
      date: body.date || new Date(),
    });
    if (doc.vehicleId) {
      await VehicleModel.updateOne(
        { _id: doc.vehicleId },
        {
          $set: {
            lastFuelAt: doc.date,
            lastFuelKm: doc.odometerKm,
            odometerKm: doc.odometerKm,
          },
          $max: { totalKmDriven: doc.odometerKm || 0 },
        },
      );
    }
    return doc.toObject();
  }

  @Get()
  async list(@Query('vehicleId') vehicleId?: string, @Query('tripId') tripId?: string) {
    await connectToDatabase();
    const query: Record<string, unknown> = {};
    if (vehicleId) query.vehicleId = vehicleId;
    if (tripId) query.tripId = tripId;
    return FuelLogModel.find(query).sort({ date: -1 }).limit(200).lean();
  }
}
