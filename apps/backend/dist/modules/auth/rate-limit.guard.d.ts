import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
export declare class RateLimitGuard implements CanActivate {
    private readonly reflector;
    private readonly counters;
    constructor(reflector: Reflector);
    canActivate(context: ExecutionContext): boolean;
    private resolveDefaultConfig;
    private resolveClientId;
    private setHeaders;
    private cleanup;
}
