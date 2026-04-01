import { Controller, Get, Header } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../auth/permissions.decorator';
import { ObservabilityService } from './observability.service';

@ApiTags('observability')
@ApiBearerAuth()
@Controller('metrics')
export class ObservabilityController {
  constructor(private readonly observabilityService: ObservabilityService) {}

  @Get()
  @Permissions('dashboards:executive:view')
  @ApiOperation({ summary: 'Get operational metrics summary for the local production stack' })
  async getSummary() {
    return this.observabilityService.getSummary();
  }

  @Get('prometheus')
  @Permissions('dashboards:executive:view')
  @Header('Content-Type', 'text/plain; version=0.0.4')
  @ApiOperation({ summary: 'Get operational metrics in Prometheus text format' })
  async getPrometheusText() {
    return this.observabilityService.getPrometheusText();
  }
}
