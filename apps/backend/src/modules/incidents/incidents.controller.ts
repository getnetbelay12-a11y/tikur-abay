import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { connectToDatabase } from '../../database/mongo';
import { DriverReportModel } from '../../database/models';
import { CurrentUser } from '../auth/current-user.decorator';
import { Permissions } from '../auth/permissions.decorator';
import { AuthenticatedUser } from '../auth/auth.types';

@ApiTags('incidents')
@Controller('incidents')
export class IncidentsController {
  @Get('open')
  @Permissions('driver-reports:view', 'dashboards:executive:view')
  async open(@CurrentUser() user: AuthenticatedUser) {
    await connectToDatabase();
    const query: Record<string, unknown> = {
      status: { $in: ['submitted', 'under_review'] },
    };
    if (!user.permissions.includes('*') && !['executive', 'super_admin', 'operations_manager', 'dispatcher'].includes(user.role)) {
      query.branchId = user.branchId;
    }
    return DriverReportModel.find(query)
      .sort({ createdAt: -1 })
      .limit(25)
      .select('reportCode type vehicleCode driverName urgency status createdAt')
      .lean();
  }
}
