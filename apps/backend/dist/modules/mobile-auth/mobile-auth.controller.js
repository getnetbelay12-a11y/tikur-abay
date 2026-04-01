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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MobileAuthController = void 0;
const common_1 = require("@nestjs/common");
const public_decorator_1 = require("../auth/public.decorator");
const mobile_auth_service_1 = require("./mobile-auth.service");
const send_otp_dto_1 = require("./dto/send-otp.dto");
const verify_otp_dto_1 = require("./dto/verify-otp.dto");
const register_customer_dto_1 = require("./dto/register-customer.dto");
const register_driver_dto_1 = require("./dto/register-driver.dto");
const login_driver_dto_1 = require("./dto/login-driver.dto");
const login_customer_dto_1 = require("./dto/login-customer.dto");
let MobileAuthController = class MobileAuthController {
    constructor(mobileAuthService) {
        this.mobileAuthService = mobileAuthService;
    }
    sendOtp(dto) {
        return this.mobileAuthService.sendOtp(dto);
    }
    verifyOtp(dto) {
        return this.mobileAuthService.verifyOtp(dto);
    }
    registerCustomer(dto) {
        return this.mobileAuthService.registerCustomer(dto);
    }
    loginCustomer(dto) {
        return this.mobileAuthService.loginCustomer(dto);
    }
    registerDriver(dto) {
        return this.mobileAuthService.registerDriver(dto);
    }
    loginDriver(dto) {
        return this.mobileAuthService.loginDriver(dto);
    }
};
exports.MobileAuthController = MobileAuthController;
__decorate([
    (0, common_1.Post)('send-otp'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [send_otp_dto_1.SendOtpDto]),
    __metadata("design:returntype", void 0)
], MobileAuthController.prototype, "sendOtp", null);
__decorate([
    (0, common_1.Post)('verify-otp'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [verify_otp_dto_1.VerifyOtpDto]),
    __metadata("design:returntype", void 0)
], MobileAuthController.prototype, "verifyOtp", null);
__decorate([
    (0, common_1.Post)('register-customer'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_customer_dto_1.RegisterCustomerDto]),
    __metadata("design:returntype", void 0)
], MobileAuthController.prototype, "registerCustomer", null);
__decorate([
    (0, common_1.Post)('login-customer'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_customer_dto_1.LoginCustomerDto]),
    __metadata("design:returntype", void 0)
], MobileAuthController.prototype, "loginCustomer", null);
__decorate([
    (0, common_1.Post)('register-driver'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_driver_dto_1.RegisterDriverDto]),
    __metadata("design:returntype", void 0)
], MobileAuthController.prototype, "registerDriver", null);
__decorate([
    (0, common_1.Post)('login-driver'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_driver_dto_1.LoginDriverDto]),
    __metadata("design:returntype", void 0)
], MobileAuthController.prototype, "loginDriver", null);
exports.MobileAuthController = MobileAuthController = __decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Controller)('mobile-auth'),
    __metadata("design:paramtypes", [mobile_auth_service_1.MobileAuthService])
], MobileAuthController);
//# sourceMappingURL=mobile-auth.controller.js.map