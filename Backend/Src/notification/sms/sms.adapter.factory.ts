import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsAdapter } from './sms.adapter';
import { NoopSmsAdapter } from './noop-sms.adapter';

function normalizeProvider(input: string | undefined): 'noop' | 'airtel' | 'tnm' {
  const value = (input ?? 'noop').trim().toLowerCase();
  if (value === 'airtel') return 'airtel';
  if (value === 'tnm') return 'tnm';
  return 'noop';
}

export function createSmsAdapter(
  config: ConfigService,
  logger: Logger,
): SmsAdapter {
  const provider = normalizeProvider(config.get<string>('SMS_PROVIDER'));
  if (provider === 'airtel' || provider === 'tnm') {
    logger.warn(
      `SMS provider "${provider}" selected but not implemented yet; using noop adapter placeholder.`,
    );
    return new NoopSmsAdapter(logger);
  }
  return new NoopSmsAdapter(logger);
}
