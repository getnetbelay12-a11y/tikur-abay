export declare class SmsService {
    send(payload: {
        recipient: string;
        body: string;
    }): Promise<{
        status: string;
        providerMessage: string;
        providerMessageId: string;
        simulated: boolean;
    }>;
}
