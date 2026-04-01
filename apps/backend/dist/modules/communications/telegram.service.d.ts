export declare class TelegramService {
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
