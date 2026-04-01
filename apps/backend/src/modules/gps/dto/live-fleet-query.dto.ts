import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { tripStatuses, vehicleStatuses } from '../../../common/enums';

export class LiveFleetQueryDto {
  @IsOptional()
  @IsString()
  branch?: string;

  @IsOptional()
  @IsString()
  route?: string;

  @IsOptional()
  @IsIn([...tripStatuses])
  tripStatus?: string;

  @IsOptional()
  @IsIn([...vehicleStatuses])
  vehicleStatus?: string;

  @IsOptional()
  @IsString()
  geofence?: string;

  @IsOptional()
  @IsString()
  djiboutiOnly?: string;

  @IsOptional()
  @IsString()
  delayedOnly?: string;

  @IsOptional()
  @IsString()
  offlineOnly?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(240)
  offlineMinutes?: number;
}
