"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunicationsModule = void 0;
const common_1 = require("@nestjs/common");
const communications_controller_1 = require("./communications.controller");
const communication_orchestrator_service_1 = require("./communication-orchestrator.service");
const email_service_1 = require("./email.service");
const sms_service_1 = require("./sms.service");
const telegram_service_1 = require("./telegram.service");
const in_app_notification_service_1 = require("./in-app-notification.service");
let CommunicationsModule = class CommunicationsModule {
};
exports.CommunicationsModule = CommunicationsModule;
exports.CommunicationsModule = CommunicationsModule = __decorate([
    (0, common_1.Module)({
        controllers: [communications_controller_1.CommunicationsController],
        providers: [
            communication_orchestrator_service_1.CommunicationOrchestratorService,
            email_service_1.EmailService,
            sms_service_1.SmsService,
            telegram_service_1.TelegramService,
            in_app_notification_service_1.InAppNotificationService,
        ],
        exports: [communication_orchestrator_service_1.CommunicationOrchestratorService],
    })
], CommunicationsModule);
//# sourceMappingURL=communications.module.js.map