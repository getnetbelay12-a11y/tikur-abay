"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtpCodeModel = exports.OtpCodeSchema = exports.OtpCode = void 0;
const mongoose_1 = require("mongoose");
class OtpCode {
}
exports.OtpCode = OtpCode;
exports.OtpCodeSchema = new mongoose_1.Schema({
    identifier: { type: String, required: true, index: true },
    role: { type: String, required: true, index: true },
    code: { type: String, required: true },
    used: { type: Boolean, default: false, index: true },
    expiresAt: { type: Date, required: true },
}, { timestamps: true, collection: 'otp_codes' });
exports.OtpCodeSchema.index({ identifier: 1, code: 1, used: 1 });
exports.OtpCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
exports.OtpCodeModel = mongoose_1.models.OtpCode || (0, mongoose_1.model)('OtpCode', exports.OtpCodeSchema);
//# sourceMappingURL=otp-code.schema.js.map