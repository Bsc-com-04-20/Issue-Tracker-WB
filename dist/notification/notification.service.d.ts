import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export type IssueNotificationPayload = {
    type: string;
    issueId: number;
    summary: string;
    reporterEmail?: string | null;
};
export declare class NotificationService implements OnModuleInit {
    private readonly config;
    private readonly logger;
    private transporter;
    private smtpHost;
    private usingEthereal;
    constructor(config: ConfigService);
    onModuleInit(): Promise<void>;
    notifyIssueEvent(payload: IssueNotificationPayload): Promise<void>;
}
