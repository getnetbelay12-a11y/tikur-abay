import { AuthService } from './auth.service';
import { AuthenticatedUser } from './auth.types';
export declare class MeController {
    private readonly authService;
    constructor(authService: AuthService);
    me(user: AuthenticatedUser): {
        dashboardRoute: string;
        id: string;
        firstName: string;
        lastName: string;
        name: string;
        email: string;
        phone?: string;
        role: string;
        permissions: string[];
        branch: string;
        branchId: string;
        status: string;
        customerCode?: string;
        mobileRole?: "customer" | "internal_driver" | "external_driver";
        kycStatus?: string;
    };
}
