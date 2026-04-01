export declare const RATE_LIMIT_KEY = "routeRateLimit";
export type RouteRateLimit = {
    windowMs: number;
    max: number;
    scope?: string;
};
export declare const RateLimit: (config: RouteRateLimit) => import("@nestjs/common").CustomDecorator<string>;
