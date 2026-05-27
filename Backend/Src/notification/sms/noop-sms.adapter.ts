import { Logger } from '@nestjs/common';
import { SmsAdapter, SmsMessage } from './sms.adapter';

export class NoopSmsAdapter implements SmsAdapter {
  constructor(private readonly logger: Logger) {}

  async send(message: SmsMessage): Promise<void> {
    this.logger.log(
      `SMS placeholder (noop): to=${message.to} body="${message.body}"`,
    );
  }
}
