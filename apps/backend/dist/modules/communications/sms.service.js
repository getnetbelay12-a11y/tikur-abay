"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsService = void 0;
const common_1 = require("@nestjs/common");
let SmsService = class SmsService {
    async send(payload) {
        const simulated = !process.env.SMS_PROVIDER_TOKEN;
        if (payload.body.length > 640) {
            return {
                status: 'failed',
                providerMessage: 'sms body exceeds 640 characters',
                providerMessageId: '',
                simulated,
            };
        }
        return {
            status: 'sent',
            providerMessage: simulated
                ? `simulated sms accepted for ${payload.recipient}`
                : `sms accepted for ${payload.recipient}`,
            providerMessageId: `sms-${Date.now()}`,
            simulated,
        };
    }
};
exports.SmsService = SmsService;
exports.SmsService = SmsService = __decorate([
    (0, common_1.Injectable)()
], SmsService);
//# sourceMappingURL=sms.service.js.map