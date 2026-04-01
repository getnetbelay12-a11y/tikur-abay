import { MobileAuthService } from './mobile-auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { RegisterDriverDto } from './dto/register-driver.dto';
import { LoginDriverDto } from './dto/login-driver.dto';
import { LoginCustomerDto } from './dto/login-customer.dto';
export declare class MobileAuthController {
    private readonly mobileAuthService;
    constructor(mobileAuthService: MobileAuthService);
    sendOtp(dto: SendOtpDto): Promise<{
        success: boolean;
        message: string;
        data: {
            identifier: string;
            role: string;
            expiresInSeconds: number;
            debugOtp: string | undefined;
        };
    }>;
    verifyOtp(dto: VerifyOtpDto): Promise<{
        success: boolean;
        data: {
            existingUser: boolean;
            role: string;
            identifier: string;
            accessToken?: undefined;
            refreshToken?: undefined;
            user?: undefined;
        };
    } | {
        success: boolean;
        data: {
            existingUser: boolean;
            accessToken: string;
            refreshToken: string;
            user: {
                _id: any;
                fullName: string;
                email: any;
                phone: any;
                role: any;
                branchId: any;
                language: string;
                kycStatus: string;
            };
            role?: undefined;
            identifier?: undefined;
        };
    }>;
    registerCustomer(dto: RegisterCustomerDto): Promise<{
        success: boolean;
        data: {
            accessToken: string;
            refreshToken: string;
            user: {
                _id: any;
                fullName: string;
                email: string;
                phone: any;
                role: string;
                branchId: any;
                language: string;
                kycStatus: string;
            };
        };
    }>;
    loginCustomer(dto: LoginCustomerDto): Promise<{
        success: boolean;
        data: {
            accessToken: string;
            refreshToken: string;
            user: {
                phone: any;
                email: any;
                role: string;
                mobileRole: string;
                kycStatus: string;
            };
        };
    }>;
    registerDriver(dto: RegisterDriverDto): Promise<{
        success: boolean;
        data: {
            accessToken: string;
            refreshToken: string;
            user: {
                _id: any;
                fullName: string;
                phone: any;
                role: string;
                branchId: any;
                language: string;
                kycStatus: string;
            };
        };
    }>;
    loginDriver(dto: LoginDriverDto): Promise<{
        success: boolean;
        data: {
            accessToken: string;
            refreshToken: string;
            user: {
                phone: any;
                role: any;
                mobileRole: any;
                kycStatus: string;
            };
        };
    }>;
}
