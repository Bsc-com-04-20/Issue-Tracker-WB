import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { MeterLookupService } from './meter-lookup.service';
import { SystemSettingsService } from './system-settings.service';
import { normalizePhoneDigits } from './phone-normalize';

type Session = {
  meterNumber: string;
  phoneDigits: string;
  otp: string;
  expiresAt: number;
  confirmed: boolean;
};

/**
 * Prototype meter ownership verification (OTP).
 * Replace with SMS gateway + short-lived signed tokens in production.
 */
@Injectable()
export class MeterVerificationService {
  private readonly logger = new Logger(MeterVerificationService.name);
  private readonly sessions = new Map<string, Session>();

  constructor(
    private readonly configService: ConfigService,
    private readonly meterLookupService: MeterLookupService,
    private readonly settingsService: SystemSettingsService,
  ) {
    setInterval(() => this.pruneExpired(), 60_000).unref?.();
  }

  private pruneExpired(): void {
    const now = Date.now();
    for (const [id, s] of this.sessions) {
      if (s.expiresAt < now && !s.confirmed) {
        this.sessions.delete(id);
      }
    }
  }

  async start(meterNumberRaw: string, phoneRaw: string): Promise<{
    verificationId: string;
    message: string;
    demoOtp?: string;
  }> {
    const meterNumber = this.meterLookupService.normalizeMeterNumber(meterNumberRaw);
    const row = this.meterLookupService.lookup(meterNumber);
    if (!row.found) {
      throw new BadRequestException(
        'Invalid meter number. Please verify and try again, or contact the water board.',
      );
    }
    const regPhone = row.phoneNumber?.trim();
    if (!regPhone) {
      throw new BadRequestException(
        'This meter record has no linked phone for verification. Please contact customer service.',
      );
    }
    const a = normalizePhoneDigits(phoneRaw);
    const b = normalizePhoneDigits(regPhone);
    if (!a || a !== b) {
      throw new ForbiddenException(
        'The phone number you entered does not match the number linked to this meter in the registry.',
      );
    }

    const demoOtp = await this.settingsService.get('meter_verification_otp', '000000');
    const ttlMs = await this.settingsService.get('otp_ttl_ms', 900000);

    const verificationId = randomUUID();
    this.sessions.set(verificationId, {
      meterNumber,
      phoneDigits: a,
      otp: demoOtp,
      expiresAt: Date.now() + ttlMs,
      confirmed: false,
    });
    this.logger.log(`Meter OTP session created for ${meterNumber} (prototype / demo OTP)`);
    const expose =
      this.configService.get('NODE_ENV') !== 'production' ||
      this.configService.get<string>('METER_VERIFICATION_EXPOSE_OTP_IN_RESPONSE') === 'true';
    return {
      verificationId,
      message:
        'If your phone matches the registry, an SMS code would be sent. In this prototype, use the demo code shown below (or configured METER_VERIFICATION_DEMO_OTP).',
      ...(expose ? { demoOtp } : {}),
    };
  }

  confirm(verificationId: string, otp: string, meterNumberRaw: string): { ok: true } {
    const meterNumber = this.meterLookupService.normalizeMeterNumber(meterNumberRaw);
    const s = this.sessions.get(verificationId);
    if (!s || s.meterNumber !== meterNumber) {
      throw new BadRequestException('Invalid or unknown verification session.');
    }
    if (Date.now() > s.expiresAt) {
      this.sessions.delete(verificationId);
      throw new BadRequestException('Verification session expired. Start again.');
    }
    const expected = (s.otp ?? '').trim();
    if (!otp?.trim() || otp.trim() !== expected) {
      throw new ForbiddenException('Incorrect verification code.');
    }
    s.confirmed = true;
    s.expiresAt = Date.now() + 600_000;
    return { ok: true };
  }

  assertConsumedForPublicCreate(verificationId: string | undefined, meterNumberRaw: string): void {
    const meterNumber = this.meterLookupService.normalizeMeterNumber(meterNumberRaw);
    if (!verificationId?.trim()) {
      throw new BadRequestException(
        'Meter ownership verification is required before submitting a public report.',
      );
    }
    const s = this.sessions.get(verificationId.trim());
    if (!s || s.meterNumber !== meterNumber || !s.confirmed) {
      throw new ForbiddenException('Invalid or incomplete meter verification.');
    }
    this.sessions.delete(verificationId.trim());
  }
}
