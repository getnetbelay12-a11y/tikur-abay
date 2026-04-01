import { AuthenticatedUser } from '../auth/auth.types';
type AgreementView = {
    _id: unknown;
    agreementCode?: string;
    customerCode?: string;
    status?: string;
    secureSignToken?: string;
    sentForSignatureAt?: Date;
    signedPdfUrl?: string;
};
export declare class AgreementsController {
    list(user: AuthenticatedUser): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    my(user: AuthenticatedUser): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    sendSignLink(id: string): Promise<{
        agreementId: string;
        signLink: string;
        status: string | undefined;
    } | null>;
    sign(id: string, user: AuthenticatedUser, body: {
        signerName?: string;
        signerEmail?: string;
        signerPhone?: string;
        deviceInfo?: string;
        ipAddress?: string;
    }): Promise<{
        agreement: AgreementView;
        signature: any;
    } | null>;
    download(id: string): Promise<{
        agreementId: string;
        agreementCode: string | undefined;
        downloadUrl: string;
        status: string | undefined;
    } | null>;
}
export {};
