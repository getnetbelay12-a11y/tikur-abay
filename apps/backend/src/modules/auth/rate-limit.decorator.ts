import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'routeRateLimit';

export type RouteRateLimit = {
  windowMs: number;
  max: number;
  scope?: string;
};

export const RateLimit = (config: RouteRateLimit) => SetMetadata(RATE_LIMIT_KEY, config);
