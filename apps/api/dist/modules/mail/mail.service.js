"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var MailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer = __importStar(require("nodemailer"));
let MailService = MailService_1 = class MailService {
    config;
    logger = new common_1.Logger(MailService_1.name);
    transporter;
    fromAddress = 'MADCreate <no-reply@madcreate.madleads.ai>';
    constructor(config) {
        this.config = config;
    }
    onModuleInit() {
        const host = this.config.get('smtp.host');
        const port = this.config.get('smtp.port') ?? 587;
        const user = this.config.get('smtp.user');
        const pass = this.config.get('smtp.pass');
        this.fromAddress = this.config.get('smtp.from') ?? this.fromAddress;
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
    async send(msg) {
        if (!this.transporter) {
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
        }
        catch (err) {
            this.logger.error(`Failed to send mail to ${msg.to}: ${err.message}`);
            throw err;
        }
    }
    async sendVerificationEmail(to, token, appUrl) {
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
    async sendPasswordResetEmail(to, token, appUrl) {
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
    async sendMagicLink(to, token, appUrl, redirect) {
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
    async sendWorkspaceInvite(to, inviterName, workspaceName, token, appUrl) {
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
};
exports.MailService = MailService;
exports.MailService = MailService = MailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MailService);
function wrap(body) {
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
function stripHtml(html) {
    return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}
//# sourceMappingURL=mail.service.js.map