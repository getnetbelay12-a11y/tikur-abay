import { Injectable } from '@nestjs/common';

@Injectable()
export class SmsService {
  async send(payload: { recipient: string; body: string }) {
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
}
