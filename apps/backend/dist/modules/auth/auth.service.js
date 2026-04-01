"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const config_1 = require("../../database/config");
const mongo_1 = require("../../database/mongo");
const models_1 = require("../../database/models");
const rbac_matrix_1 = require("../rbac-matrix");
let AuthService = class AuthService {
    async login(body) {
        const normalizedEmail = body.email.trim().toLowerCase();
        const dbUser = await this.findUserByEmail(normalizedEmail);
        const user = dbUser;
        if (!user || !this.passwordMatches(body.password, dbUser ? String(dbUser.passwordHash) : user.password)) {
            throw new common_1.UnauthorizedException('Invalid email or password');
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
    async register(body) {
        await (0, mongo_1.connectToDatabase)();
        if (body.role === 'driver') {
            if (!body.faydaFrontDocumentId?.trim()) {
                throw new common_1.BadRequestException('Fayda front document is required for driver registration');
            }
            if (!body.faydaBackDocumentId?.trim()) {
                throw new common_1.BadRequestException('Fayda back document is required for driver registration');
            }
            if (!body.phone?.trim()) {
                throw new common_1.BadRequestException('Phone number is required for driver registration');
            }
        }
        const [firstName, ...lastParts] = body.fullName.trim().split(/\s+/);
        const lastName = lastParts.join(' ') || 'User';
        const email = (body.email?.trim().toLowerCase() || `${body.phone.replace(/\D/g, '')}@mobile.tikurabay.local`);
        const branchName = 'Addis Ababa HQ';
        const role = body.role;
        const mobileRole = role === 'customer'
            ? 'customer'
            : body.mobileRole === 'external_driver'
                ? 'external_driver'
                : 'internal_driver';
        const dbRole = role === 'customer' ? 'customer' : 'driver';
        const user = await models_1.UserModel.create({
            firstName,
            lastName,
            email,
            phone: body.phone,
            passwordHash: (0, config_1.hashPassword)(body.password),
            role: dbRole,
            mobileRole,
            permissions: rbac_matrix_1.rbacMatrix[dbRole] || [],
            branchName,
            status: role === 'driver' ? 'submitted' : 'active',
            customerCode: role === 'customer' ? `CUST-MOB-${Date.now()}` : undefined,
        });
        if (role === 'customer') {
            const customer = await models_1.CustomerModel.create({
                customerCode: user.customerCode,
                companyName: body.companyName || body.fullName,
                status: 'active',
            });
            await models_1.CustomerProfileModel.create({
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
        }
        else {
            const driver = await models_1.DriverModel.create({
                driverCode: `DRV-MOB-${Date.now()}`,
                userId: user._id,
                firstName,
                lastName,
                status: 'submitted',
            });
            await models_1.DriverProfileModel.create({
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
            await models_1.DriverKycRequestModel.create({
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
        await models_1.UserPreferenceModel.findOneAndUpdate({ userId: user._id }, { $set: { language: 'en', timezone: 'Africa/Addis_Ababa', notificationPreferences: {} } }, { upsert: true, new: true });
        return this.login({ email, password: body.password });
    }
    async refreshToken(refreshToken) {
        if (!refreshToken) {
            throw new common_1.UnauthorizedException('Missing refresh token');
        }
        const payload = this.verifyToken(refreshToken, 'refresh');
        await (0, mongo_1.connectToDatabase)();
        const tokenHash = this.hashToken(refreshToken);
        const session = await models_1.RefreshSessionModel.findOne({
            userId: payload.sub,
            tokenId: payload.jti,
            tokenHash,
            revokedAt: null,
            expiresAt: { $gt: new Date() },
        }).lean();
        if (!session) {
            throw new common_1.UnauthorizedException('Refresh session is invalid or expired');
        }
        const user = await this.findUserByEmail(String(payload.email));
        if (!user || user.status !== 'active') {
            throw new common_1.UnauthorizedException('User is not active');
        }
        const profile = this.buildProfile(user);
        const nextRefreshToken = await this.issueRefreshToken(profile);
        const nextPayload = this.decodeToken(nextRefreshToken);
        await models_1.RefreshSessionModel.updateOne({ _id: session._id }, {
            $set: {
                revokedAt: new Date(),
                lastUsedAt: new Date(),
                replacedByTokenId: nextPayload.jti,
            },
        });
        return {
            accessToken: this.signToken(profile, 'access'),
            refreshToken: nextRefreshToken,
            user: {
                ...profile,
                dashboardRoute: this.dashboardRouteForRole(profile.role),
            },
        };
    }
    async logout(refreshToken) {
        if (!refreshToken) {
            return { success: true };
        }
        try {
            const payload = this.verifyToken(refreshToken, 'refresh');
            await (0, mongo_1.connectToDatabase)();
            await models_1.RefreshSessionModel.updateOne({
                userId: payload.sub,
                tokenId: payload.jti,
                tokenHash: this.hashToken(refreshToken),
                revokedAt: null,
            }, {
                $set: {
                    revokedAt: new Date(),
                    lastUsedAt: new Date(),
                },
            });
        }
        catch {
            return { success: true };
        }
        return { success: true };
    }
    async authenticate(token) {
        const payload = this.verifyToken(token, 'access');
        const dbUser = await models_1.UserModel.findOne({ _id: payload.id, email: payload.email }).lean().catch(() => null);
        const user = dbUser;
        if (!user || user.status !== 'active') {
            throw new common_1.UnauthorizedException('User is not active');
        }
        return this.buildProfile(user);
    }
    dashboardRouteForRole(role) {
        const roleRoutes = {
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
    passwordMatches(input, expectedHashOrPlaintext) {
        const inputHash = Buffer.from((0, config_1.hashPassword)(input));
        const expectedHash = Buffer.from(expectedHashOrPlaintext.length === 64 ? expectedHashOrPlaintext : (0, node_crypto_1.createHash)('sha256').update(expectedHashOrPlaintext).digest('hex'));
        return (0, node_crypto_1.timingSafeEqual)(inputHash, expectedHash);
    }
    buildProfile(user) {
        return {
            id: 'id' in user ? user.id : String(user._id),
            firstName: user.firstName,
            lastName: user.lastName,
            name: user.name ? user.name : `${user.firstName} ${user.lastName}`,
            email: user.email,
            role: user.role,
            permissions: user.permissions?.length ? user.permissions : rbac_matrix_1.rbacMatrix[user.role] || [],
            branch: user.branch ? user.branch : String(user.branchName || 'Unassigned'),
            branchId: String(user.branchId || ''),
            status: user.status,
            customerCode: user.customerCode,
            phone: user.phone,
            mobileRole: user.mobileRole
                ? user.mobileRole
                : user.role === 'driver'
                    ? 'internal_driver'
                    : user.role === 'customer'
                        ? 'customer'
                        : undefined,
            kycStatus: user.kycStatus,
        };
    }
    signToken(profile, kind) {
        const runtime = (0, config_1.getRuntimeConfig)();
        const header = this.base64Url({ alg: 'HS256', typ: 'JWT' });
        const now = Math.floor(Date.now() / 1000);
        const payload = this.base64Url({
            sub: profile.id,
            email: profile.email,
            role: profile.role,
            kind,
            jti: (0, node_crypto_1.randomUUID)(),
            iat: now,
            exp: now + (kind === 'access' ? runtime.jwtAccessTtlSeconds : runtime.jwtRefreshTtlSeconds),
        });
        return `${header}.${payload}.${this.tokenSignature(`${header}.${payload}`, kind)}`;
    }
    tokenSignature(input, kind) {
        const runtime = (0, config_1.getRuntimeConfig)();
        const secret = kind === 'access' ? runtime.jwtAccessSecret : runtime.jwtRefreshSecret;
        return (0, node_crypto_1.createHmac)('sha256', secret).update(input).digest('base64url');
    }
    verifyToken(token, expectedKind) {
        const [encodedHeader, encodedPayload, signature] = token.split('.');
        if (!encodedHeader || !encodedPayload || !signature) {
            throw new common_1.UnauthorizedException('Invalid token');
        }
        const payload = this.decodeToken(token);
        if (payload.kind !== expectedKind) {
            throw new common_1.UnauthorizedException('Invalid token kind');
        }
        const expectedSignature = this.tokenSignature(`${encodedHeader}.${encodedPayload}`, expectedKind);
        if (!(0, node_crypto_1.timingSafeEqual)(Buffer.from(signature), Buffer.from(expectedSignature))) {
            throw new common_1.UnauthorizedException('Invalid token signature');
        }
        if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
            throw new common_1.UnauthorizedException('Token expired');
        }
        return {
            id: String(payload.sub),
            sub: String(payload.sub),
            email: String(payload.email),
            jti: String(payload.jti),
            kind: String(payload.kind),
        };
    }
    decodeToken(token) {
        const [, encodedPayload] = token.split('.');
        return JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    }
    async issueRefreshToken(profile) {
        const refreshToken = this.signToken(profile, 'refresh');
        const payload = this.decodeToken(refreshToken);
        await (0, mongo_1.connectToDatabase)();
        await models_1.RefreshSessionModel.create({
            userId: profile.id,
            tokenId: String(payload.jti),
            tokenHash: this.hashToken(refreshToken),
            expiresAt: new Date(Number(payload.exp) * 1000),
            lastUsedAt: new Date(),
        });
        return refreshToken;
    }
    hashToken(token) {
        return (0, node_crypto_1.createHash)('sha256').update(token).digest('hex');
    }
    base64Url(value) {
        return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
    }
    async findUserByEmail(email) {
        try {
            await (0, mongo_1.connectToDatabase)();
            const dbUser = await models_1.UserModel.findOne({
                $or: [{ email }, { phone: email }],
            }).lean();
            if (!dbUser)
                return null;
            if (dbUser.role === 'driver') {
                const kyc = await models_1.DriverKycRequestModel.findOne({ userId: dbUser._id }).lean().catch(() => null);
                return { ...dbUser, kycStatus: kyc?.status || 'draft' };
            }
            return dbUser;
        }
        catch {
            return null;
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)()
], AuthService);
//# sourceMappingURL=auth.service.js.map