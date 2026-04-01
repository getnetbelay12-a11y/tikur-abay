import { LoginDto } from './dto/login.dto';
import { AuthenticatedUser } from './auth.types';
import { RegisterDto } from './dto/register.dto';
export declare class AuthService {
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
    refreshToken(refreshToken: string): Promise<{
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
    logout(refreshToken: string): Promise<{
        success: boolean;
    }>;
    authenticate(token: string): Promise<AuthenticatedUser>;
    dashboardRouteForRole(role: string): string;
    private passwordMatches;
    private buildProfile;
    private signToken;
    private tokenSignature;
    private verifyToken;
    private decodeToken;
    private issueRefreshToken;
    private hashToken;
    private base64Url;
    private findUserByEmail;
}
