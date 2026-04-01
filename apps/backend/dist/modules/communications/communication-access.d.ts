import type { AuthenticatedUser } from '../auth/auth.types';
export declare function canSendCommunication(user: Partial<AuthenticatedUser> | null | undefined, templateKey?: string, entityType?: string): boolean;
export declare function assertCanSendCommunication(user: Partial<AuthenticatedUser> | null | undefined, templateKey?: string, entityType?: string): void;
export declare function canViewCommunicationHistory(user: Partial<AuthenticatedUser> | null | undefined, entityType?: string): boolean;
export declare function assertCanViewCommunicationHistory(user: Partial<AuthenticatedUser> | null | undefined, entityType?: string): void;
