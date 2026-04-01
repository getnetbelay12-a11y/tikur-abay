"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MobileAuthService = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const mongoose_1 = require("mongoose");
const mongo_1 = require("../../database/mongo");
const config_1 = require("../../database/config");
const models_1 = require("../../database/models");
const rbac_matrix_1 = require("../rbac-matrix");
const auth_service_1 = require("../auth/auth.service");
const otp_code_schema_1 = require("./schemas/otp-code.schema");
let MobileAuthService = class MobileAuthService {
    constructor(authService) {
        this.authService = authService;
    }
    resolveMobileDriverKycStatus(status) {
        const normalized = String(status || '').trim().toLowerCase();
        return normalized === 'suspended' ? 'suspended' : 'not_required';
    }
    generateOtp() {
        return String(Math.floor(100000 + Math.random() * 900000));
    }
    normalizeRole(role) {
        return role === 'driver' ? 'internal_driver' : role;
    }
    splitName(fullName) {
        const [firstName, ...lastParts] = fullName.trim().split(/\s+/);
        return {
            firstName: firstName || 'User',
            lastName: lastParts.join(' ') || 'User',
        };
    }
    normalizeBranch(branchId) {
        const trimmed = branchId?.trim();
        if (!trimmed) {
            return { branchId: undefined, branchName: undefined };
        }
        if (mongoose_1.Types.ObjectId.isValid(trimmed)) {
            return { branchId: trimmed, branchName: undefined };
        }
        return { branchId: undefined, branchName: trimmed };
    }
    createUniqueMobileEmail(identifier) {
        const base = identifier.replace(/\W+/g, '') || Date.now().toString();
        const suffix = (0, node_crypto_1.randomBytes)(4).toString('hex');
        return `${base}-${suffix}@mobile.tikurabay.local`.toLowerCase();
    }
    async buildAuthPayload(user) {
        const auth = this.authService;
        const profile = auth.buildProfile(user);
        return {
            accessToken: auth.signToken(profile, 'access'),
            refreshToken: await auth.issueRefreshToken(profile),
            user: profile,
        };
    }
    async sendOtp(dto) {
        await (0, mongo_1.connectToDatabase)();
        const role = this.normalizeRole(dto.role);
        const identifier = dto.identifier.trim();
        const code = this.generateOtp();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        await otp_code_schema_1.OtpCodeModel.deleteMany({ identifier, role, used: false });
        await otp_code_schema_1.OtpCodeModel.create({ identifier, role, code, used: false, expiresAt });
        const isLocal = process.env.NODE_ENV !== 'production' ||
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
    async verifyOtp(dto) {
        await (0, mongo_1.connectToDatabase)();
        const role = this.normalizeRole(dto.role);
        const identifier = dto.identifier.trim();
        const otp = await otp_code_schema_1.OtpCodeModel.findOne({
            identifier,
            role,
            code: dto.code,
            used: false,
            expiresAt: { $gt: new Date() },
        });
        if (!otp) {
            throw new common_1.UnauthorizedException('Invalid or expired OTP');
        }
        otp.used = true;
        await otp.save();
        const user = await models_1.UserModel.findOne({
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
        const kyc = role === 'customer'
            ? null
            : (await models_1.DriverKycRequestModel.findOne({ userId: user._id }).lean().catch(() => null));
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
                    kycStatus: role === 'customer'
                        ? 'not_required'
                        : this.resolveMobileDriverKycStatus(kyc?.status),
                },
            },
        };
    }
    async registerCustomer(dto) {
        await (0, mongo_1.connectToDatabase)();
        const identifier = dto.identifier.trim();
        const existing = await models_1.UserModel.findOne({
            $or: [{ phone: identifier }, { email: identifier }],
            role: 'customer',
        });
        if (existing) {
            throw new common_1.BadRequestException('Customer already exists');
        }
        const phone = dto.phone ?? (identifier.includes('@') ? undefined : identifier);
        const email = dto.email ?? (identifier.includes('@') ? identifier : undefined);
        const normalizedEmail = (email ?? this.createUniqueMobileEmail(identifier)).trim().toLowerCase();
        const { firstName, lastName } = this.splitName(dto.fullName);
        const user = await models_1.UserModel.create({
            firstName,
            lastName,
            phone,
            email: normalizedEmail,
            role: 'customer',
            mobileRole: 'customer',
            passwordHash: (0, config_1.hashPassword)(dto.password),
            permissions: rbac_matrix_1.rbacMatrix.customer || [],
            branchName: 'Addis Ababa HQ',
            status: 'active',
            customerCode: `CUST-MOB-${Date.now()}`,
        });
        const customer = await models_1.CustomerModel.create({
            customerCode: user.customerCode,
            companyName: dto.companyName || dto.fullName,
            status: 'active',
        });
        await models_1.CustomerProfileModel.create({
            userId: user._id,
            customerId: customer._id,
            fullName: dto.fullName,
            companyName: dto.companyName,
            phone,
            email: normalizedEmail,
            accountState: 'active',
        });
        await models_1.UserPreferenceModel.findOneAndUpdate({ userId: user._id }, { $set: { language: dto.language ?? 'en', timezone: 'Africa/Addis_Ababa', notificationPreferences: {} } }, { upsert: true, new: true });
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
    async loginCustomer(dto) {
        await (0, mongo_1.connectToDatabase)();
        const identifier = dto.identifier.trim();
        const normalizedEmail = identifier.toLowerCase();
        const user = (await models_1.UserModel.findOne({
            role: 'customer',
            $or: [{ phone: identifier }, { email: normalizedEmail }],
        }).lean());
        if (!user || (0, config_1.hashPassword)(dto.password) !== String(user.passwordHash)) {
            throw new common_1.UnauthorizedException('Invalid customer account or 4-digit PIN');
        }
        const authPayload = await this.buildAuthPayload(user);
        const profile = authPayload.user;
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
    async registerDriver(dto) {
        await (0, mongo_1.connectToDatabase)();
        const identifier = dto.identifier.trim();
        const existing = await models_1.UserModel.findOne({
            phone: identifier,
            mobileRole: dto.driverType,
        });
        if (existing) {
            throw new common_1.BadRequestException('Driver already exists');
        }
        const { firstName, lastName } = this.splitName(dto.fullName);
        const email = this.createUniqueMobileEmail(identifier);
        const branch = this.normalizeBranch(dto.branchId);
        const emergencyContact = [dto.emergencyContactName, dto.emergencyContactPhone].filter(Boolean).join(' ').trim() || undefined;
        const user = await models_1.UserModel.create({
            firstName,
            lastName,
            phone: identifier,
            email,
            role: 'driver',
            mobileRole: dto.driverType,
            passwordHash: (0, config_1.hashPassword)(dto.password),
            permissions: rbac_matrix_1.rbacMatrix.driver || [],
            branchId: branch.branchId,
            branchName: branch.branchName ?? 'Addis Ababa HQ',
            status: 'active',
        });
        const driver = await models_1.DriverModel.create({
            driverCode: `DRV-MOB-${Date.now()}`,
            userId: user._id,
            branchId: branch.branchId,
            firstName,
            lastName,
            status: 'active',
        });
        await models_1.DriverProfileModel.create({
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
        await models_1.UserPreferenceModel.findOneAndUpdate({ userId: user._id }, { $set: { language: dto.language ?? 'en', timezone: 'Africa/Addis_Ababa', notificationPreferences: {} } }, { upsert: true, new: true });
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
    async loginDriver(dto) {
        await (0, mongo_1.connectToDatabase)();
        const identifier = dto.identifier.trim();
        const candidates = await models_1.UserModel.find({
            phone: identifier,
            mobileRole: { $in: ['internal_driver', 'external_driver'] },
        })
            .sort({ updatedAt: -1, createdAt: -1 })
            .lean();
        const user = candidates.find((candidate) => String(candidate.email || '').toLowerCase() === 'driver.fixed@tikurabay.com') ??
            candidates[0];
        if (!user || (0, config_1.hashPassword)(dto.password) !== String(user.passwordHash)) {
            throw new common_1.UnauthorizedException('Invalid phone number or 4-digit PIN');
        }
        const authPayload = await this.buildAuthPayload(user);
        const profile = authPayload.user;
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
};
exports.MobileAuthService = MobileAuthService;
exports.MobileAuthService = MobileAuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], MobileAuthService);
//# sourceMappingURL=mobile-auth.service.js.map