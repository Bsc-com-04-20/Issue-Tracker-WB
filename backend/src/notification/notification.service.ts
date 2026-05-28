import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { SmsAdapter } from './sms/sms.adapter';
import { createSmsAdapter } from './sms/sms.adapter.factory';
import { UserService } from '../user/user.service';

export type IssueNotificationPayload = {
  type: string;
  issueId: number;
  summary: string;
  reporterEmail?: string | null;
  reporterPhone?: string | null;
};

function parseSmtpPort(raw: string | number | undefined, fallback: number): number {
  if (raw === undefined || raw === null || raw === '') {
    return fallback;
  }
  const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function envFlagTrue(v: string | undefined): boolean {
  if (!v) return false;
  const s = v.trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes';
}

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);
  private transporter: Transporter | null = null;
  private readonly smsAdapter: SmsAdapter;
  private readonly smsEnabled: boolean;
  private smtpHost: string | undefined;
  private usingEthereal = false;

  constructor(
    private readonly config: ConfigService,
    private readonly userService: UserService,
  ) {
    this.smsEnabled = envFlagTrue(this.config.get<string>('SMS_ENABLED'));
    this.smsAdapter = createSmsAdapter(this.config, this.logger);

    const host = this.config.get<string>('SMTP_HOST')?.trim();
    this.smtpHost = host || undefined;
    if (!host) {
      return;
    }

    const port = parseSmtpPort(
      this.config.get<string | number>('SMTP_PORT'),
      587,
    );
    const secure = port === 465;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: this.config.get<string>('SMTP_USER')?.trim()
        ? {
            user: this.config.get<string>('SMTP_USER')!.trim(),
            pass: this.config.get<string>('SMTP_PASS', '') ?? '',
          }
        : undefined,
    });
  }

  async onModuleInit(): Promise<void> {
    if (this.smsEnabled) {
      const provider = this.config.get<string>('SMS_PROVIDER', 'noop');
      this.logger.log(
        `SMS notifications enabled (provider=${provider}). Adapter is placeholder-ready for Airtel/TNM integration.`,
      );
    } else {
      this.logger.log('SMS notifications disabled (set SMS_ENABLED=true to enable).');
    }

    if (this.transporter && this.smtpHost) {
      const port = parseSmtpPort(
        this.config.get<string | number>('SMTP_PORT'),
        587,
      );
      this.logger.log(
        `Email delivery enabled (SMTP ${this.smtpHost}:${port}). Close/issue events will send when a recipient address is available.`,
      );
      return;
    }

    if (envFlagTrue(this.config.get<string>('SMTP_USE_ETHEREAL'))) {
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
        this.logger.log(
          'SMTP_USE_ETHEREAL=true — using Ethereal fake SMTP. After each send, copy the preview URL from logs to view the message in a browser.',
        );
      } catch (e) {
        this.logger.error(
          `Ethereal test account failed: ${e instanceof Error ? e.message : e}`,
        );
      }
      return;
    }

    if (!this.transporter) {
      this.logger.warn(
        'No email: set SMTP_HOST or SMTP_USE_ETHEREAL=true in .env (see .env.example).',
      );
    }
  }

  async notifyIssueEvent(payload: IssueNotificationPayload): Promise<void> {
    this.logger.log(
      JSON.stringify({
        event: 'issue_notification',
        ...payload,
      }),
    );

    if (payload.type === 'cs_supervisor_requested') {
      const supervisorEmails = await this.userService.findActiveSupervisorEmails();
      const notifyEmail = this.config.get<string>('NOTIFY_EMAIL')?.trim();
      const recipients = [
        ...new Set(
          [...supervisorEmails, ...(notifyEmail ? [notifyEmail] : [])].map((e) =>
            e.trim(),
          ),
        ),
      ].filter(Boolean);

      if (!this.transporter) {
        this.logger.warn(
          `Supervisor escalation email skipped for issue #${payload.issueId}: set SMTP_HOST or SMTP_USE_ETHEREAL=true`,
        );
      } else if (recipients.length === 0) {
        this.logger.warn(
          `Supervisor escalation for issue #${payload.issueId}: no active supervisor user emails and NOTIFY_EMAIL unset — no email recipients`,
        );
      } else {
        const from =
          this.config.get<string>('SMTP_FROM')?.trim() ||
          'noreply@issue-tracking.local';
        const subject = `[Issue ISS-${payload.issueId}] Supervisor attention requested`;
        for (const to of recipients) {
          await this.sendConfiguredMail(
            from,
            to,
            subject,
            payload.summary,
            payload.issueId,
            payload.type,
          );
        }
      }
      await this.notifySmsIfApplicable(payload);
      return;
    }

    const to =
      payload.reporterEmail?.trim() ||
      this.config.get<string>('NOTIFY_EMAIL')?.trim();

    if (!this.transporter) {
      if (payload.type === 'closed') {
        this.logger.warn(
          `Close email skipped for issue #${payload.issueId}: set SMTP_HOST or SMTP_USE_ETHEREAL=true`,
        );
      }
    } else if (!to) {
      if (payload.type === 'closed') {
        this.logger.warn(
          `Close email skipped for issue #${payload.issueId}: add reporter email on the issue or set NOTIFY_EMAIL in .env`,
        );
      }
    } else {
      const from =
        this.config.get<string>('SMTP_FROM')?.trim() ||
        'noreply@issue-tracking.local';

      const subject =
        payload.type === 'closed'
          ? `[Issue #${payload.issueId}] Your report has been closed`
          : payload.type === 'created'
            ? `[Issue #${payload.issueId}] Complaint received`
            : `[Issue #${payload.issueId}] ${payload.type}`;

      await this.sendConfiguredMail(
        from,
        to,
        subject,
        payload.summary,
        payload.issueId,
        payload.type,
      );
    }

    await this.notifySmsIfApplicable(payload);
  }

  private async sendConfiguredMail(
    from: string,
    to: string,
    subject: string,
    text: string,
    issueId: number,
    type: string,
  ): Promise<void> {
    if (!this.transporter) return;
    try {
      const info = await this.transporter.sendMail({
        from,
        to,
        subject,
        text,
      });
      this.logger.log(
        `Email sent for issue #${issueId} (${type}) to ${to}; messageId=${info.messageId ?? 'n/a'}`,
      );
      if (this.usingEthereal) {
        const preview = nodemailer.getTestMessageUrl(info);
        if (preview) {
          this.logger.log(`Open this URL in your browser to view the message: ${preview}`);
        }
      }
    } catch (e) {
      this.logger.error(
        `Email send failed for issue #${issueId}: ${e instanceof Error ? e.message : e}`,
      );
    }
  }

  private async notifySmsIfApplicable(
    payload: IssueNotificationPayload,
  ): Promise<void> {
    if (!this.smsEnabled) {
      return;
    }
    if (!payload.reporterPhone?.trim()) {
      return;
    }
    if (!this.isStatusChangeEvent(payload.type)) {
      return;
    }
    const text = this.buildStatusSms(payload);
    try {
      await this.smsAdapter.send({
        to: payload.reporterPhone.trim(),
        body: text,
      });
    } catch (e) {
      this.logger.error(
        `SMS send failed for issue #${payload.issueId}: ${e instanceof Error ? e.message : e}`,
      );
    }
  }

  private isStatusChangeEvent(type: string): boolean {
    return (
      type.startsWith('status_') ||
      type === 'assigned' ||
      type === 'reassigned' ||
      type === 'closed'
    );
  }

  /** Billing resolution outcome — SMS + email using staff-approved customerSummary. */
  async notifyBillingResolutionCustomer(params: {
    issueId: number;
    reporterName: string | null;
    reporterEmail: string | null;
    reporterPhone: string | null;
    smsBody: string;
    emailBody: string;
  }): Promise<{ smsSent: boolean; emailSent: boolean; detail: string }> {
    const parts: string[] = [];
    let smsSent = false;
    let emailSent = false;

    const phone = params.reporterPhone?.trim();
    if (this.smsEnabled && phone) {
      try {
        await this.smsAdapter.send({ to: phone, body: params.smsBody });
        smsSent = true;
        parts.push('SMS sent');
      } catch (e) {
        parts.push(
          `SMS failed: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    } else if (!phone) {
      parts.push('SMS skipped (no phone on issue)');
    } else {
      parts.push('SMS skipped (SMS_ENABLED is false)');
    }

    const to =
      params.reporterEmail?.trim() ||
      this.config.get<string>('NOTIFY_EMAIL')?.trim();
    if (this.transporter && to) {
      const from =
        this.config.get<string>('SMTP_FROM')?.trim() ||
        'noreply@issue-tracking.local';
      const subject = `[ISS-${params.issueId}] Your billing issue is resolved`;
      try {
        await this.sendConfiguredMail(
          from,
          to,
          subject,
          params.emailBody,
          params.issueId,
          'billing_resolution',
        );
        emailSent = true;
        parts.push(`Email sent to ${to}`);
      } catch (e) {
        parts.push(
          `Email failed: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    } else if (!to) {
      parts.push('Email skipped (no reporter email)');
    } else {
      parts.push('Email skipped (SMTP not configured)');
    }

    this.logger.log(
      JSON.stringify({
        event: 'billing_resolution_notification',
        issueId: params.issueId,
        smsSent,
        emailSent,
        detail: parts.join('; '),
      }),
    );

    return {
      smsSent,
      emailSent,
      detail: parts.join('; '),
    };
  }

  private buildStatusSms(payload: IssueNotificationPayload): string {
    const status =
      payload.type === 'assigned'
        ? 'assigned'
        : payload.type === 'reassigned'
          ? 'reassigned'
          : payload.type === 'closed'
            ? 'closed'
            : payload.type.replace(/^status_/, '').replace(/_/g, ' ');
    return `Malawi Water Board: Issue ISS-${payload.issueId} is now ${status}. Keep your reference for tracking.`;
  }
}
