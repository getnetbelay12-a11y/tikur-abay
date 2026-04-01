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
exports.PreferencesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const mongo_1 = require("../../database/mongo");
const models_1 = require("../../database/models");
const current_user_decorator_1 = require("../auth/current-user.decorator");
let PreferencesController = class PreferencesController {
    async getPreferences(user) {
        await (0, mongo_1.connectToDatabase)();
        const preference = await models_1.UserPreferenceModel.findOneAndUpdate({ userId: user.id }, { $setOnInsert: { language: 'en', timezone: 'Africa/Addis_Ababa', notificationPreferences: {} } }, { upsert: true, new: true }).lean();
        return preference;
    }
    async updateLanguage(user, body) {
        await (0, mongo_1.connectToDatabase)();
        return models_1.UserPreferenceModel.findOneAndUpdate({ userId: user.id }, { $set: { language: body.language || 'en' } }, { upsert: true, new: true }).lean();
    }
    async updatePreferences(user, body) {
        await (0, mongo_1.connectToDatabase)();
        return models_1.UserPreferenceModel.findOneAndUpdate({ userId: user.id }, {
            $set: {
                ...(body.language ? { language: body.language } : {}),
                ...(body.timezone ? { timezone: body.timezone } : {}),
                ...(body.notificationPreferences ? { notificationPreferences: body.notificationPreferences } : {}),
            },
        }, { upsert: true, new: true }).lean();
    }
};
exports.PreferencesController = PreferencesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PreferencesController.prototype, "getPreferences", null);
__decorate([
    (0, common_1.Patch)('language'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PreferencesController.prototype, "updateLanguage", null);
__decorate([
    (0, common_1.Patch)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PreferencesController.prototype, "updatePreferences", null);
exports.PreferencesController = PreferencesController = __decorate([
    (0, swagger_1.ApiTags)('me'),
    (0, common_1.Controller)('me/preferences')
], PreferencesController);
//# sourceMappingURL=preferences.controller.js.map