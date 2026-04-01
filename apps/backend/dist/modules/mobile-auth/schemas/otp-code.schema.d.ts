import { HydratedDocument, Schema } from 'mongoose';
export type OtpCodeDocument = HydratedDocument<OtpCode>;
export declare class OtpCode {
    identifier: string;
    role: string;
    code: string;
    used: boolean;
    expiresAt: Date;
}
export declare const OtpCodeSchema: Schema<OtpCode, import("mongoose").Model<OtpCode, any, any, any, import("mongoose").Document<unknown, any, OtpCode, any, {}> & OtpCode & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, OtpCode, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<OtpCode>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<OtpCode> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare const OtpCodeModel: import("mongoose").Model<any, {}, {}, {}, any, any>;
