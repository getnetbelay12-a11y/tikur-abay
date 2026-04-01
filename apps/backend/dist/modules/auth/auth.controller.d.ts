import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthService } from './auth.service';
import { AuthenticatedUser } from './auth.types';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(body: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
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
    }>;
    refresh(body: {
        refreshToken?: string;
    }): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
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
    }>;
    logout(body: {
        refreshToken?: string;
    }): Promise<{
        success: boolean;
    }>;
    register(body: RegisterDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
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
    }>;
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
