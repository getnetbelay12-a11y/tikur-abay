export declare class EmailService {
    send(payload: {
        recipient: string;
        subject?: string;
        body: string;
        attachments?: Array<{
            filename: string;
            contentBase64?: string;
            contentType?: string;
        }>;
    }): Promise<{
        status: string;
        sender: string;
        recipient: string;
        subject: string;
        htmlBody: string;
        providerMessage: string;
        providerMessageId: any;
        simulated: boolean;
    }>;
}
