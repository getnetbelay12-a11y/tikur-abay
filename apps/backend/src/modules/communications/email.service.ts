import { Injectable } from '@nestjs/common';
import { lookup } from 'node:dns/promises';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import * as nodemailer from 'nodemailer';

let cachedTransport: any = null;
let cachedTransportKey = '';
let cachedLogo: Buffer | null | undefined;

@Injectable()
export class EmailService {
  async send(payload: { recipient: string; subject?: string; body: string; attachments?: Array<{ filename: string; contentBase64?: string; contentType?: string }> }) {
    const emailEnabled = String(process.env.EMAIL_ENABLED || 'true').toLowerCase() !== 'false';
    const provider = process.env.EMAIL_PROVIDER || 'log';
    const nodeEnv = String(process.env.NODE_ENV || 'development').toLowerCase();
    const localSimulationDefault =
      nodeEnv !== 'production' &&
      String(process.env.EMAIL_REAL_DELIVERY || 'false').toLowerCase() !== 'true';
    const smtpHost =
      process.env.EMAIL_SMTP_HOST ||
      process.env.SMTP_HOST ||
      process.env.MAIL_HOST ||
      '';
    const smtpPort = Number(
      process.env.EMAIL_SMTP_PORT ||
      process.env.SMTP_PORT ||
      process.env.MAIL_PORT ||
      587,
    );
    const smtpSecure = String(
      process.env.EMAIL_SMTP_SECURE ||
      process.env.MAIL_SECURE ||
      'false',
    ).toLowerCase() === 'true';
    const smtpUser =
      process.env.EMAIL_SMTP_USER ||
      process.env.MAIL_USER ||
      '';
    const smtpPass =
      process.env.EMAIL_SMTP_PASS ||
      process.env.MAIL_PASSWORD ||
      '';
    const sender = formatSender(
      process.env.EMAIL_SENDER ||
        process.env.MAIL_FROM ||
        'notifications@tikurabay.local',
    );
    const forcedRecipient =
      process.env.EMAIL_FORCE_TEST_RECIPIENT ||
      process.env.TEST_EMAIL_RECIPIENT ||
      process.env.DEMO_NOTIFICATION_EMAIL ||
      '';
    const recipient = forcedRecipient || payload.recipient;
    const simulated = localSimulationDefault || !emailEnabled || provider === 'log' || !smtpHost;
    const logo = loadLogoAsset();
    const htmlBody = renderBrandedEmail({
      subject: payload.subject || 'Tikur Abay update',
      body: payload.body,
      logoCid: logo ? 'tikur-abay-logo' : '',
    });
    const subject = payload.subject || 'Tikur Abay update';

    if (simulated) {
      return {
        status: emailEnabled ? 'sent' : 'disabled',
        sender,
        recipient,
        subject,
        htmlBody,
        providerMessage: `simulated ${provider} email accepted from ${sender} to ${recipient}${localSimulationDefault ? ' (local development mode)' : ''}`,
        providerMessageId: `email-${Date.now()}`,
        simulated: true,
      };
    }

    const preferIpv4 =
      String(process.env.EMAIL_FORCE_IPV4 || 'true').toLowerCase() !== 'false';
    const resolvedTransport = preferIpv4
      ? await resolveTransportHost(smtpHost)
      : { host: smtpHost, servername: '' };

    const transport = getTransport({
      smtpHost: resolvedTransport.host,
      smtpServername: resolvedTransport.servername || smtpHost,
      smtpPort,
      smtpSecure,
      smtpUser,
      smtpPass,
    });

    const dynamicAttachments = (payload.attachments || [])
      .filter((item) => item.filename && item.contentBase64)
      .map((item) => ({
        filename: item.filename,
        content: Buffer.from(String(item.contentBase64), 'base64'),
        contentType: item.contentType || undefined,
      }));

    const result = await transport.sendMail({
      from: sender,
      to: recipient,
      subject,
      text: payload.body,
      html: htmlBody,
      attachments: [
        ...(logo
          ? [
              {
                filename: 'tikur-abay-logo.png',
                content: logo,
                cid: 'tikur-abay-logo',
              },
            ]
          : []),
        ...dynamicAttachments,
      ],
    });

    return {
      status: 'sent',
      sender,
      recipient,
      subject,
      htmlBody,
      providerMessage: `email accepted from ${sender} to ${recipient}`,
      providerMessageId: result.messageId || `email-${Date.now()}`,
      simulated: false,
    };
  }
}

function renderBrandedEmail(input: { subject: string; body: string; logoCid: string }) {
  const escapedBody = escapeHtml(input.body)
    .split(/\n\s*\n/)
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;color:#213547;font-size:16px;line-height:1.75;">${paragraph.replace(/\n/g, '<br />')}</p>`,
    )
    .join('');

  return `
    <div style="margin:0;padding:0;background:#f0f4f8;font-family:Arial,sans-serif;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f0f4f8;margin:0;padding:24px 0;">
        <tr>
          <td align="center">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="680" style="width:680px;max-width:680px;background:#fdfaf3;border-collapse:separate;border-spacing:0;border-radius:20px;overflow:hidden;border:1px solid #d9e3ef;">
              <tr>
                <td style="padding:0;background:linear-gradient(135deg,#10233e 0%,#1c4766 48%,#f97316 100%);">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td style="padding:28px 32px 24px;">
                        ${
                          input.logoCid
                            ? `<img src="cid:${input.logoCid}" alt="Tikur Abay logo" style="display:block;height:56px;width:auto;margin:0 0 18px;" />`
                            : `<div style="display:inline-block;padding:10px 16px;border-radius:999px;background:#10233e;color:#ffffff;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">Tikur Abay Transport</div>`
                        }
                        <div style="margin:0 0 10px;color:rgba(255,255,255,0.78);font-size:12px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;">Shipment Delivered</div>
                        <div style="margin:0;color:#ffffff;font-size:32px;line-height:1.15;font-weight:800;">${escapeHtml(input.subject)}</div>
                        <div style="margin-top:14px;max-width:520px;color:rgba(255,255,255,0.88);font-size:15px;line-height:1.7;">
                          Your shipment has reached the final delivery stage. Thank you for trusting Tikur Abay with your cargo journey.
                        </div>
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;background:rgba(255,247,237,0.16);border:1px solid rgba(255,255,255,0.2);border-radius:16px;width:100%;">
                          <tr>
                            <td style="padding:16px 18px;color:#fff7ed;font-size:13px;line-height:1.7;">
                              <strong style="display:block;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.76);margin-bottom:6px;">Support Desk</strong>
                              Phone: +251-XXX-XXX-XXX<br />
                              Email: support@tikurabay.com
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:34px 34px 18px;background:#fdfaf3;">
                  ${escapedBody}
                </td>
              </tr>
              <tr>
                <td style="padding:0 34px 34px;background:#fdfaf3;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fff4e6;border:1px solid #fed7aa;border-radius:18px;">
                    <tr>
                      <td style="padding:18px 20px;color:#9a3412;font-size:13px;line-height:1.7;">
                        <strong style="display:block;margin-bottom:6px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">Stay Connected</strong>
                        If you experienced any shortage, damage, or service issue, reply to this email or contact the Tikur Abay support desk and our team will follow up immediately.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:0 34px 30px;background:#fdfaf3;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:1px solid #e2e8f0;">
                    <tr>
                      <td style="padding-top:16px;color:#64748b;font-size:12px;line-height:1.8;">
                        Tikur Abay Team<br />
                        Transportation You Can Trust
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `.trim();
}

function loadLogoAsset() {
  if (cachedLogo !== undefined) return cachedLogo;
  const candidates = [
    resolve(process.cwd(), 'apps/admin/public/branding/tikur-abay-logo.png'),
    resolve(process.cwd(), '../admin/public/branding/tikur-abay-logo.png'),
    join(__dirname, '../../../../admin/public/branding/tikur-abay-logo.png'),
    join(__dirname, '../../../../../apps/admin/public/branding/tikur-abay-logo.png'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      cachedLogo = readFileSync(candidate);
      return cachedLogo;
    }
  }

  cachedLogo = null;
  return cachedLogo;
}

function formatSender(value: string) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return 'Tikur Abay <notifications@tikurabay.local>';
  if (trimmed.includes('<') && trimmed.includes('>')) return trimmed;
  if (trimmed.includes('@')) return `Tikur Abay <${trimmed}>`;
  return trimmed;
}

function getTransport(config: {
  smtpHost: string;
  smtpServername: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
}) {
  const transportKey = JSON.stringify(config);
  if (cachedTransport && cachedTransportKey === transportKey) {
    return cachedTransport;
  }

  cachedTransport = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: config.smtpUser && config.smtpPass ? { user: config.smtpUser, pass: config.smtpPass } : undefined,
    name: config.smtpServername,
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
    family: 4,
    tls: {
      servername: config.smtpServername,
    },
  });
  cachedTransportKey = transportKey;
  return cachedTransport;
}

async function resolveTransportHost(host: string) {
  const normalizedHost = String(host || '').trim();
  if (!normalizedHost) {
    return { host: normalizedHost, servername: '' };
  }

  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(normalizedHost)) {
    return { host: normalizedHost, servername: '' };
  }

  try {
    const result = await lookup(normalizedHost, { family: 4, all: false });
    return {
      host: result.address || normalizedHost,
      servername: normalizedHost,
    };
  } catch {
    return { host: normalizedHost, servername: normalizedHost };
  }
}

function escapeHtml(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
