// @ts-nocheck
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { getRuntimeConfig, hashPassword } from '../../database/config';
import { connectToDatabase } from '../../database/mongo';
import {
  CustomerModel,
  CustomerProfileModel,
  DriverKycRequestModel,
  DriverModel,
  DriverProfileModel,
  RefreshSessionModel,
  UserModel,
  UserPreferenceModel,
} from '../../database/models';
import { rbacMatrix } from '../rbac-matrix';
import { LoginDto } from './dto/login.dto';
import { AuthenticatedUser } from './auth.types';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  async login(body: LoginDto) {
    const normalizedEmail = body.email.trim().toLowerCase();
    const dbUser = await this.findUserByEmail(normalizedEmail);
    const user = dbUser;

    if (!user || !this.passwordMatches(body.password, dbUser ? String(dbUser.passwordHash) : user.password)) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const profile = this.buildProfile(user);
    const accessToken = this.signToken(profile, 'access');
    const refreshToken = await this.issueRefreshToken(profile);

    return {
      accessToken,
      refreshToken,
      user: {
        ...profile,
        dashboardRoute: this.dashboardRouteForRole(profile.role),
      },
    };
  }

  async register(body: RegisterDto) {
    await connectToDatabase();
    if (body.role === 'driver') {
      if (!body.faydaFrontDocumentId?.trim()) {
        throw new BadRequestException('Fayda front document is required for driver registration');
      }
      if (!body.faydaBackDocumentId?.trim()) {
        throw new BadRequestException('Fayda back document is required for driver registration');
      }
      if (!body.phone?.trim()) {
        throw new BadRequestException('Phone number is required for driver registration');
      }
    }
    const [firstName, ...lastParts] = body.fullName.trim().split(/\s+/);
    const lastName = lastParts.join(' ') || 'User';
    const email = (body.email?.trim().toLowerCase() || `${body.phone.replace(/\D/g, '')}@mobile.tikurabay.local`);
    const branchName = 'Addis Ababa HQ';
    const role = body.role;
    const mobileRole =
      role === 'customer'
        ? 'customer'
        : body.mobileRole === 'external_driver'
          ? 'external_driver'
          : 'internal_driver';
    const dbRole = role === 'customer' ? 'customer' : 'driver';

    const user = await UserModel.create({
      firstName,
      lastName,
      email,
      phone: body.phone,
      passwordHash: hashPassword(body.password),
      role: dbRole,
      mobileRole,
      permissions: rbacMatrix[dbRole] || [],
      branchName,
      status: role === 'driver' ? 'submitted' : 'active',
      customerCode: role === 'customer' ? `CUST-MOB-${Date.now()}` : undefined,
    });

    if (role === 'customer') {
      const customer = await CustomerModel.create({
        customerCode: user.customerCode,
        companyName: body.companyName || body.fullName,
        status: 'active',
      });
      await CustomerProfileModel.create({
        userId: user._id,
        customerId: customer._id,
        fullName: body.fullName,
        companyName: body.companyName,
        phone: body.phone,
        email,
        tradeLicense: body.tradeLicense,
        tin: body.tin,
        vat: body.vat,
        address: body.address,
        accountState: 'active',
      });
    } else {
      const driver = await DriverModel.create({
        driverCode: `DRV-MOB-${Date.now()}`,
        userId: user._id,
        firstName,
        lastName,
        status: 'submitted',
      });
      await DriverProfileModel.create({
        userId: user._id,
        driverId: driver._id,
        fullName: body.fullName,
        phone: body.phone,
        licenseNumber: body.licenseNumber,
        emergencyContact: body.emergencyContact,
        branchId: body.branchId,
        partnerCompany: body.partnerCompany,
        partnerVehicleCode: body.partnerVehicleCode,
        accountState: 'submitted',
      });
      await DriverKycRequestModel.create({
        userId: user._id,
        fullName: body.fullName,
        phone: body.phone,
        faydaFrontDocumentId: body.faydaFrontDocumentId,
        faydaBackDocumentId: body.faydaBackDocumentId,
        selfieDocumentId: body.selfieDocumentId,
        licenseNumber: body.licenseNumber,
        emergencyContact: body.emergencyContact,
        branchId: body.branchId,
        partnerCompany: body.partnerCompany,
        partnerVehicleCode: body.partnerVehicleCode,
        status: 'submitted',
      });
    }

    await UserPreferenceModel.findOneAndUpdate(
      { userId: user._id },
      { $set: { language: 'en', timezone: 'Africa/Addis_Ababa', notificationPreferences: {} } },
      { upsert: true, new: true },
    );

    return this.login({ email, password: body.password });
  }

  async refreshToken(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }

    const payload = this.verifyToken(refreshToken, 'refresh');
    await connectToDatabase();
    const tokenHash = this.hashToken(refreshToken);
    const session = await RefreshSessionModel.findOne({
      userId: payload.sub,
      tokenId: payload.jti,
      tokenHash,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    }).lean();

    if (!session) {
      throw new UnauthorizedException('Refresh session is invalid or expired');
    }

    const user = await this.findUserByEmail(String(payload.email));
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User is not active');
    }

    const profile = this.buildProfile(user);
    const nextRefreshToken = await this.issueRefreshToken(profile);
    const nextPayload = this.decodeToken(nextRefreshToken);

    await RefreshSessionModel.updateOne(
      { _id: session._id },
      {
        $set: {
          revokedAt: new Date(),
          lastUsedAt: new Date(),
          replacedByTokenId: nextPayload.jti,
        },
      },
    );

    return {
      accessToken: this.signToken(profile, 'access'),
      refreshToken: nextRefreshToken,
      user: {
        ...profile,
        dashboardRoute: this.dashboardRouteForRole(profile.role),
      },
    };
  }

  async logout(refreshToken: string) {
    if (!refreshToken) {
      return { success: true };
    }

    try {
      const payload = this.verifyToken(refreshToken, 'refresh');
      await connectToDatabase();
      await RefreshSessionModel.updateOne(
        {
          userId: payload.sub,
          tokenId: payload.jti,
          tokenHash: this.hashToken(refreshToken),
          revokedAt: null,
        },
        {
          $set: {
            revokedAt: new Date(),
            lastUsedAt: new Date(),
          },
        },
      );
    } catch {
      return { success: true };
    }

    return { success: true };
  }

  async authenticate(token: string): Promise<AuthenticatedUser> {
    const payload = this.verifyToken(token, 'access');
    const dbUser = await UserModel.findOne({ _id: payload.id, email: payload.email }).lean().catch(() => null);
    const user = dbUser;
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User is not active');
    }

    return this.buildProfile(user);
  }

  dashboardRouteForRole(role: string) {
    const roleRoutes: Record<string, string> = {
      super_admin: '/',
      executive: '/dashboards/executive',
      operations_manager: '/operations',
      dispatcher: '/operations',
      technical_manager: '/maintenance-alerts',
      finance_officer: '/finance',
      hr_officer: '/hr',
      marketing_officer: '/marketing',
      customer: '/customer',
    };

    return roleRoutes[role] || '/';
  }

  private passwordMatches(input: string, expectedHashOrPlaintext: string) {
    const inputHash = Buffer.from(hashPassword(input));
    const expectedHash = Buffer.from(
      expectedHashOrPlaintext.length === 64 ? expectedHashOrPlaintext : createHash('sha256').update(expectedHashOrPlaintext).digest('hex'),
    );
    return timingSafeEqual(inputHash, expectedHash);
  }

  private buildProfile(user: any): AuthenticatedUser {
    return {
      id: 'id' in user ? user.id : String(user._id),
      firstName: user.firstName,
      lastName: user.lastName,
      name: user.name ? user.name : `${user.firstName} ${user.lastName}`,
      email: user.email,
      role: user.role,
      permissions: user.permissions?.length ? user.permissions : rbacMatrix[user.role as keyof typeof rbacMatrix] || [],
      branch: user.branch ? user.branch : String(user.branchName || 'Unassigned'),
      branchId: String(user.branchId || ''),
      status: user.status,
      customerCode: user.customerCode,
      phone: user.phone,
      mobileRole:
        user.mobileRole
          ? user.mobileRole
          : user.role === 'driver'
            ? 'internal_driver'
            : user.role === 'customer'
              ? 'customer'
              : undefined,
      kycStatus: user.kycStatus,
    };
  }

  private signToken(profile: AuthenticatedUser, kind: 'access' | 'refresh') {
    const runtime = getRuntimeConfig();
    const header = this.base64Url({ alg: 'HS256', typ: 'JWT' });
    const now = Math.floor(Date.now() / 1000);
    const payload = this.base64Url({
      sub: profile.id,
      email: profile.email,
      role: profile.role,
      kind,
      jti: randomUUID(),
      iat: now,
      exp: now + (kind === 'access' ? runtime.jwtAccessTtlSeconds : runtime.jwtRefreshTtlSeconds),
    });
    return `${header}.${payload}.${this.tokenSignature(`${header}.${payload}`, kind)}`;
  }

  private tokenSignature(input: string, kind: 'access' | 'refresh') {
    const runtime = getRuntimeConfig();
    const secret = kind === 'access' ? runtime.jwtAccessSecret : runtime.jwtRefreshSecret;
    return createHmac('sha256', secret).update(input).digest('base64url');
  }

  private verifyToken(token: string, expectedKind: 'access' | 'refresh') {
    const [encodedHeader, encodedPayload, signature] = token.split('.');
    if (!encodedHeader || !encodedPayload || !signature) {
      throw new UnauthorizedException('Invalid token');
    }

    const payload = this.decodeToken(token);
    if (payload.kind !== expectedKind) {
      throw new UnauthorizedException('Invalid token kind');
    }

    const expectedSignature = this.tokenSignature(`${encodedHeader}.${encodedPayload}`, expectedKind);
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      throw new UnauthorizedException('Invalid token signature');
    }
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('Token expired');
    }
    return {
      id: String(payload.sub),
      sub: String(payload.sub),
      email: String(payload.email),
      jti: String(payload.jti),
      kind: String(payload.kind),
    };
  }

  private decodeToken(token: string) {
    const [, encodedPayload] = token.split('.');
    return JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as Record<string, unknown>;
  }

  private async issueRefreshToken(profile: AuthenticatedUser) {
    const refreshToken = this.signToken(profile, 'refresh');
    const payload = this.decodeToken(refreshToken);
    await connectToDatabase();
    await RefreshSessionModel.create({
      userId: profile.id,
      tokenId: String(payload.jti),
      tokenHash: this.hashToken(refreshToken),
      expiresAt: new Date(Number(payload.exp) * 1000),
      lastUsedAt: new Date(),
    });
    return refreshToken;
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private base64Url(value: Record<string, unknown>) {
    return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
  }

  private async findUserByEmail(email: string) {
    try {
      await connectToDatabase();
      const dbUser = await UserModel.findOne({
        $or: [{ email }, { phone: email }],
      }).lean();
      if (!dbUser) return null;
      if (dbUser.role === 'driver') {
        const kyc = await DriverKycRequestModel.findOne({ userId: dbUser._id }).lean().catch(() => null);
        return { ...dbUser, kycStatus: kyc?.status || 'draft' };
      }
      return dbUser;
    } catch {
      return null;
    }
  }
}
