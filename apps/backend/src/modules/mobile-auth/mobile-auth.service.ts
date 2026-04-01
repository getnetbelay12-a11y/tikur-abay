import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { Types } from 'mongoose';
import { connectToDatabase } from '../../database/mongo';
import { hashPassword } from '../../database/config';
import {
  CustomerModel,
  CustomerProfileModel,
  DriverKycRequestModel,
  DriverModel,
  DriverProfileModel,
  UserModel,
  UserPreferenceModel,
} from '../../database/models';
import { rbacMatrix } from '../rbac-matrix';
import { AuthService } from '../auth/auth.service';
import { OtpCodeModel } from './schemas/otp-code.schema';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { RegisterDriverDto } from './dto/register-driver.dto';
import { LoginDriverDto } from './dto/login-driver.dto';
import { LoginCustomerDto } from './dto/login-customer.dto';

@Injectable()
export class MobileAuthService {
  constructor(private readonly authService: AuthService) {}

  private resolveMobileDriverKycStatus(status?: string | null) {
    const normalized = String(status || '').trim().toLowerCase();
    return normalized === 'suspended' ? 'suspended' : 'not_required';
  }

  private generateOtp(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  private normalizeRole(role: string) {
    return role === 'driver' ? 'internal_driver' : role;
  }

  private splitName(fullName: string) {
    const [firstName, ...lastParts] = fullName.trim().split(/\s+/);
    return {
      firstName: firstName || 'User',
      lastName: lastParts.join(' ') || 'User',
    };
  }

  private normalizeBranch(branchId?: string) {
    const trimmed = branchId?.trim();
    if (!trimmed) {
      return { branchId: undefined, branchName: undefined };
    }
    if (Types.ObjectId.isValid(trimmed)) {
      return { branchId: trimmed, branchName: undefined };
    }
    return { branchId: undefined, branchName: trimmed };
  }

  private createUniqueMobileEmail(identifier: string) {
    const base = identifier.replace(/\W+/g, '') || Date.now().toString();
    const suffix = randomBytes(4).toString('hex');
    return `${base}-${suffix}@mobile.tikurabay.local`.toLowerCase();
  }

  private async buildAuthPayload(user: any) {
    const auth = this.authService as unknown as {
      buildProfile(user: any): any;
      signToken(profile: any, kind: 'access' | 'refresh'): string;
      issueRefreshToken(profile: any): Promise<string>;
    };
    const profile = auth.buildProfile(user);
    return {
      accessToken: auth.signToken(profile, 'access'),
      refreshToken: await auth.issueRefreshToken(profile),
      user: profile,
    };
  }

  async sendOtp(dto: SendOtpDto) {
    await connectToDatabase();
    const role = this.normalizeRole(dto.role);
    const identifier = dto.identifier.trim();
    const code = this.generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await OtpCodeModel.deleteMany({ identifier, role, used: false });
    await OtpCodeModel.create({ identifier, role, code, used: false, expiresAt });

    // Local/dev shortcut: return OTP in response
    const isLocal =
      process.env.NODE_ENV !== 'production' ||
      process.env.ALLOW_DEBUG_OTP === 'true';

    return {
      success: true,
      message: 'OTP sent',
      data: {
        identifier,
        role,
        expiresInSeconds: 300,
        debugOtp: isLocal ? code : undefined,
      },
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    await connectToDatabase();
    const role = this.normalizeRole(dto.role);
    const identifier = dto.identifier.trim();

    const otp = await OtpCodeModel.findOne({
      identifier,
      role,
      code: dto.code,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otp) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    otp.used = true;
    await otp.save();

    const user = await UserModel.findOne({
      $or: [{ phone: identifier }, { email: identifier }],
      ...(role === 'customer' ? { role: 'customer' } : { mobileRole: role }),
    });

    if (!user) {
      return {
        success: true,
        data: {
          existingUser: false,
          role,
          identifier,
        },
      };
    }

    const authPayload = await this.buildAuthPayload(user);
    const kyc =
      role === 'customer'
        ? null
        : ((await DriverKycRequestModel.findOne({ userId: user._id }).lean().catch(() => null)) as { status?: string } | null);

    return {
      success: true,
      data: {
        existingUser: true,
        accessToken: authPayload.accessToken,
        refreshToken: authPayload.refreshToken,
        user: {
          _id: user._id,
          fullName: [user.firstName, user.lastName].filter(Boolean).join(' ').trim(),
          email: user.email,
          phone: user.phone,
          role: user.mobileRole ?? user.role,
          branchId: user.branchId,
          language: 'en',
          kycStatus:
            role === 'customer'
              ? 'not_required'
              : this.resolveMobileDriverKycStatus(kyc?.status),
        },
      },
    };
  }

  async registerCustomer(dto: RegisterCustomerDto) {
    await connectToDatabase();
    const identifier = dto.identifier.trim();

    const existing = await UserModel.findOne({
      $or: [{ phone: identifier }, { email: identifier }],
      role: 'customer',
    });

    if (existing) {
      throw new BadRequestException('Customer already exists');
    }

    const phone = dto.phone ?? (identifier.includes('@') ? undefined : identifier);
    const email = dto.email ?? (identifier.includes('@') ? identifier : undefined);
    const normalizedEmail = (email ?? this.createUniqueMobileEmail(identifier)).trim().toLowerCase();
    const { firstName, lastName } = this.splitName(dto.fullName);

    const user = await UserModel.create({
      firstName,
      lastName,
      phone,
      email: normalizedEmail,
      role: 'customer',
      mobileRole: 'customer',
      passwordHash: hashPassword(dto.password),
      permissions: rbacMatrix.customer || [],
      branchName: 'Addis Ababa HQ',
      status: 'active',
      customerCode: `CUST-MOB-${Date.now()}`,
    });

    const customer = await CustomerModel.create({
      customerCode: user.customerCode,
      companyName: dto.companyName || dto.fullName,
      status: 'active',
    });
    await CustomerProfileModel.create({
      userId: user._id,
      customerId: customer._id,
      fullName: dto.fullName,
      companyName: dto.companyName,
      phone,
      email: normalizedEmail,
      accountState: 'active',
    });
    await UserPreferenceModel.findOneAndUpdate(
      { userId: user._id },
      { $set: { language: dto.language ?? 'en', timezone: 'Africa/Addis_Ababa', notificationPreferences: {} } },
      { upsert: true, new: true },
    );

    const authPayload = await this.buildAuthPayload(user);

    return {
      success: true,
      data: {
        accessToken: authPayload.accessToken,
        refreshToken: authPayload.refreshToken,
        user: {
          _id: user._id,
          fullName: dto.fullName,
          email: normalizedEmail,
          phone: user.phone,
          role: 'customer',
          branchId: user.branchId,
          language: dto.language ?? 'en',
          kycStatus: 'not_required',
        },
      },
    };
  }

  async loginCustomer(dto: LoginCustomerDto) {
    await connectToDatabase();
    const identifier = dto.identifier.trim();
    const normalizedEmail = identifier.toLowerCase();
    const user = (await UserModel.findOne({
      role: 'customer',
      $or: [{ phone: identifier }, { email: normalizedEmail }],
    }).lean()) as any;

    if (!user || hashPassword(dto.password) !== String(user.passwordHash)) {
      throw new UnauthorizedException('Invalid customer account or 4-digit PIN');
    }

    const authPayload = await this.buildAuthPayload(user);
    const profile = authPayload.user as Record<string, any>;

    return {
      success: true,
      data: {
        accessToken: authPayload.accessToken,
        refreshToken: authPayload.refreshToken,
        user: {
          ...profile,
          phone: user.phone,
          email: user.email,
          role: 'customer',
          mobileRole: 'customer',
          kycStatus: 'not_required',
        },
      },
    };
  }

  async registerDriver(dto: RegisterDriverDto) {
    await connectToDatabase();
    const identifier = dto.identifier.trim();

    const existing = await UserModel.findOne({
      phone: identifier,
      mobileRole: dto.driverType,
    });

    if (existing) {
      throw new BadRequestException('Driver already exists');
    }

    const { firstName, lastName } = this.splitName(dto.fullName);
    const email = this.createUniqueMobileEmail(identifier);
    const branch = this.normalizeBranch(dto.branchId);
    const emergencyContact = [dto.emergencyContactName, dto.emergencyContactPhone].filter(Boolean).join(' ').trim() || undefined;
    const user = await UserModel.create({
      firstName,
      lastName,
      phone: identifier,
      email,
      role: 'driver',
      mobileRole: dto.driverType,
      passwordHash: hashPassword(dto.password),
      permissions: rbacMatrix.driver || [],
      branchId: branch.branchId,
      branchName: branch.branchName ?? 'Addis Ababa HQ',
      status: 'active',
    });

    const driver = await DriverModel.create({
      driverCode: `DRV-MOB-${Date.now()}`,
      userId: user._id,
      branchId: branch.branchId,
      firstName,
      lastName,
      status: 'active',
    });
    await DriverProfileModel.create({
      userId: user._id,
      driverId: driver._id,
      fullName: dto.fullName,
      phone: identifier,
      licenseNumber: dto.licenseNumber,
      emergencyContact,
      branchId: branch.branchId,
      partnerCompany: dto.partnerCompanyId,
      accountState: 'active',
    });
    await UserPreferenceModel.findOneAndUpdate(
      { userId: user._id },
      { $set: { language: dto.language ?? 'en', timezone: 'Africa/Addis_Ababa', notificationPreferences: {} } },
      { upsert: true, new: true },
    );

    const authPayload = await this.buildAuthPayload(user);

    return {
      success: true,
      data: {
        accessToken: authPayload.accessToken,
        refreshToken: authPayload.refreshToken,
        user: {
          _id: user._id,
          fullName: dto.fullName,
          phone: user.phone,
          role: dto.driverType,
          branchId: user.branchId,
          language: dto.language ?? 'en',
          kycStatus: 'not_required',
        },
      },
    };
  }

  async loginDriver(dto: LoginDriverDto) {
    await connectToDatabase();
    const identifier = dto.identifier.trim();
    const candidates = await UserModel.find({
      phone: identifier,
      mobileRole: { $in: ['internal_driver', 'external_driver'] },
    })
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    const user =
      candidates.find((candidate) => String(candidate.email || '').toLowerCase() === 'driver.fixed@tikurabay.com') ??
      candidates[0];

    if (!user || hashPassword(dto.password) !== String(user.passwordHash)) {
      throw new UnauthorizedException('Invalid phone number or 4-digit PIN');
    }

    const authPayload = await this.buildAuthPayload(user);
    const profile = authPayload.user as Record<string, any>;

    return {
      success: true,
      data: {
        accessToken: authPayload.accessToken,
        refreshToken: authPayload.refreshToken,
        user: {
          ...profile,
          phone: user.phone,
          role: user.mobileRole ?? user.role,
          mobileRole: user.mobileRole ?? user.role,
          kycStatus: 'approved',
        },
      },
    };
  }
}
