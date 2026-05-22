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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var NotificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer = __importStar(require("nodemailer"));
function parseSmtpPort(raw, fallback) {
    if (raw === undefined || raw === null || raw === '') {
        return fallback;
    }
    const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw), 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
}
function envFlagTrue(v) {
    if (!v)
        return false;
    const s = v.trim().toLowerCase();
    return s === 'true' || s === '1' || s === 'yes';
}
let NotificationService = NotificationService_1 = class NotificationService {
    config;
    logger = new common_1.Logger(NotificationService_1.name);
    transporter = null;
    smtpHost;
    usingEthereal = false;
    constructor(config) {
        this.config = config;
        const host = this.config.get('SMTP_HOST')?.trim();
        this.smtpHost = host || undefined;
        if (!host) {
            return;
        }
        const port = parseSmtpPort(this.config.get('SMTP_PORT'), 587);
        const secure = port === 465;
        this.transporter = nodemailer.createTransport({
            host,
            port,
            secure,
            auth: this.config.get('SMTP_USER')?.trim()
                ? {
                    user: this.config.get('SMTP_USER').trim(),
                    pass: this.config.get('SMTP_PASS', '') ?? '',
                }
                : undefined,
        });
    }
    async onModuleInit() {
        if (this.transporter && this.smtpHost) {
            const port = parseSmtpPort(this.config.get('SMTP_PORT'), 587);
            this.logger.log(`Email delivery enabled (SMTP ${this.smtpHost}:${port}). Close/issue events will send when a recipient address is available.`);
            return;
        }
        if (envFlagTrue(this.config.get('SMTP_USE_ETHEREAL'))) {
            try {
                const testAccount = await nodemailer.createTestAccount();
                this.transporter = nodemailer.createTransport({
                    host: 'smtp.ethereal.email',
                    port: 587,
                    secure: false,
                    auth: {
                        user: testAccount.user,
                        pass: testAccount.pass,
                    },
                });
                this.usingEthereal = true;
                this.logger.log('SMTP_USE_ETHEREAL=true — using Ethereal fake SMTP. After each send, copy the preview URL from logs to view the message in a browser.');
            }
            catch (e) {
                this.logger.error(`Ethereal test account failed: ${e instanceof Error ? e.message : e}`);
            }
            return;
        }
        if (!this.transporter) {
            this.logger.warn('No email: set SMTP_HOST or SMTP_USE_ETHEREAL=true in .env (see .env.example).');
        }
    }
    async notifyIssueEvent(payload) {
        this.logger.log(JSON.stringify({
            event: 'issue_notification',
            ...payload,
        }));
        const to = payload.reporterEmail?.trim() ||
            this.config.get('NOTIFY_EMAIL')?.trim();
        if (!this.transporter) {
            if (payload.type === 'closed') {
                this.logger.warn(`Close email skipped for issue #${payload.issueId}: set SMTP_HOST or SMTP_USE_ETHEREAL=true`);
            }
            return;
        }
        if (!to) {
            if (payload.type === 'closed') {
                this.logger.warn(`Close email skipped for issue #${payload.issueId}: add reporter email on the issue or set NOTIFY_EMAIL in .env`);
            }
            return;
        }
        const from = this.config.get('SMTP_FROM')?.trim() ||
            'noreply@issue-tracking.local';
        const subject = payload.type === 'closed'
            ? `[Issue #${payload.issueId}] Your report has been closed`
            : `[Issue #${payload.issueId}] ${payload.type}`;
        try {
            const info = await this.transporter.sendMail({
                from,
                to,
                subject,
                text: payload.summary,
            });
            this.logger.log(`Email sent for issue #${payload.issueId} (${payload.type}) to ${to}; messageId=${info.messageId ?? 'n/a'}`);
            if (this.usingEthereal) {
                const preview = nodemailer.getTestMessageUrl(info);
                if (preview) {
                    this.logger.log(`Open this URL in your browser to view the message: ${preview}`);
                }
            }
        }
        catch (e) {
            this.logger.error(`Email send failed for issue #${payload.issueId}: ${e instanceof Error ? e.message : e}`);
        }
    }
};
exports.NotificationService = NotificationService;
exports.NotificationService = NotificationService = NotificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], NotificationService);
//# sourceMappingURL=notification.service.js.map