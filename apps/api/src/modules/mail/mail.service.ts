import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter?: Transporter;
  private fromAddress = 'MADCreate <no-reply@madcreate.madleads.ai>';

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const host = this.config.get<string>('smtp.host');
    const port = this.config.get<number>('smtp.port') ?? 587;
    const user = this.config.get<string>('smtp.user');
    const pass = this.config.get<string>('smtp.pass');
    this.fromAddress = this.config.get<string>('smtp.from') ?? this.fromAddress;

    if (!host) {
      this.logger.warn('SMTP not configured — emails will be logged to stdout instead.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user ? { user, pass } : undefined,
    });
    this.logger.log(`SMTP transport ready: ${host}:${port}`);
  }

  async send(msg: MailMessage): Promise<void> {
    if (!this.transporter) {
      // eslint-disable-next-line no-console -- stub fallback when no SMTP transport is configured; intentionally visible in dev output
      console.log(`[mail:stub] to=${msg.to} subject=${msg.subject}\n${msg.text ?? msg.html}\n`);
      return;
    }
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        text: msg.text ?? stripHtml(msg.html),
      });
    } catch (err) {
      this.logger.error(`Failed to send mail to ${msg.to}: ${(err as Error).message}`);
      throw err;
    }
  }

  // ---- High-level helpers used by AuthService ----

  async sendVerificationEmail(to: string, token: string, appUrl: string): Promise<void> {
    const link = `${appUrl.replace(/\/$/, '')}/verify?token=${encodeURIComponent(token)}`;
    return this.send({
      to,
      subject: 'Verify your MADCreate email',
      html: wrap(`
        <h2>Welcome to MADCreate</h2>
        <p>Click the button below to verify your email address.</p>
        <p><a href="${link}" class="btn">Verify email →</a></p>
        <p class="muted">If the button doesn't work, copy this link:<br/><code>${link}</code></p>
      `),
    });
  }

  async sendPasswordResetEmail(to: string, token: string, appUrl: string): Promise<void> {
    const link = `${appUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
    return this.send({
      to,
      subject: 'Reset your MADCreate password',
      html: wrap(`
        <h2>Password reset</h2>
        <p>Click below to set a new password. This link expires in 1 hour.</p>
        <p><a href="${link}" class="btn">Reset password →</a></p>
        <p class="muted">If you didn't request this, ignore this email.</p>
      `),
    });
  }

  async sendMagicLink(to: string, token: string, appUrl: string, redirect?: string): Promise<void> {
    const link = `${appUrl.replace(/\/$/, '')}/magic?token=${encodeURIComponent(token)}${redirect ? `&redirect=${encodeURIComponent(redirect)}` : ''}`;
    return this.send({
      to,
      subject: 'Your MADCreate sign-in link',
      html: wrap(`
        <h2>Sign in</h2>
        <p>Click below to sign in. This link expires in 15 minutes.</p>
        <p><a href="${link}" class="btn">Sign in →</a></p>
      `),
    });
  }

  async sendWorkspaceInvite(to: string, inviterName: string, workspaceName: string, token: string, appUrl: string): Promise<void> {
    const link = `${appUrl.replace(/\/$/, '')}/accept-invite?token=${encodeURIComponent(token)}`;
    return this.send({
      to,
      subject: `${inviterName} invited you to ${workspaceName} on MADCreate`,
      html: wrap(`
        <h2>You've been invited</h2>
        <p><strong>${inviterName}</strong> invited you to join <strong>${workspaceName}</strong> on MADCreate.</p>
        <p><a href="${link}" class="btn">Accept invitation →</a></p>
      `),
    });
  }
}

function wrap(body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body { font: 14px/1.55 -apple-system, Segoe UI, Inter, sans-serif; color: #111; background: #f6f7fb; margin: 0; padding: 24px; }
    .card { max-width: 560px; margin: 0 auto; background: white; border-radius: 14px; padding: 32px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
    h2 { margin: 0 0 12px; font-size: 22px; color: #111; }
    p { margin: 0 0 14px; }
    .btn { display: inline-block; padding: 11px 18px; background: linear-gradient(135deg, #7C5CFF, #F472B6); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; }
    .muted { color: #6b7280; font-size: 12px; }
    code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 12px; word-break: break-all; }
    .footer { text-align: center; color: #9ca3af; font-size: 11px; margin-top: 18px; }
  </style></head><body>
    <div class="card">${body}</div>
    <div class="footer">MADCreate · by MAD Prospects</div>
  </body></html>`;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}
