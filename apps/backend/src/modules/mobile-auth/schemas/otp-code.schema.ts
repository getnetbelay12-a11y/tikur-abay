import { HydratedDocument, Schema, model, models } from 'mongoose';

export type OtpCodeDocument = HydratedDocument<OtpCode>;

export class OtpCode {
  identifier!: string;
  role!: string;
  code!: string;
  used!: boolean;
  expiresAt!: Date;
}

export const OtpCodeSchema = new Schema<OtpCode>(
  {
    identifier: { type: String, required: true, index: true },
    role: { type: String, required: true, index: true },
    code: { type: String, required: true },
    used: { type: Boolean, default: false, index: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, collection: 'otp_codes' },
);
OtpCodeSchema.index({ identifier: 1, code: 1, used: 1 });
OtpCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OtpCodeModel = models.OtpCode || model<OtpCode>('OtpCode', OtpCodeSchema);
