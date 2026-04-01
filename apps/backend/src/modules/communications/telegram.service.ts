import { Injectable } from '@nestjs/common';

@Injectable()
export class TelegramService {
  async send(payload: { recipient: string; body: string }) {
    const simulated = !process.env.TELEGRAM_BOT_TOKEN;
    return {
      status: 'sent',
      providerMessage: simulated
        ? `simulated telegram accepted for ${payload.recipient}`
        : `telegram accepted for ${payload.recipient}`,
      providerMessageId: `telegram-${Date.now()}`,
      simulated,
    };
  }
}
