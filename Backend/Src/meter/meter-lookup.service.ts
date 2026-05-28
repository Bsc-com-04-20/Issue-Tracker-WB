import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, readFileSync } from 'fs';
import type { PremiseLookupResult } from './premise-lookup.types';
import { METER_REGISTRY_SEED } from './meter-registry.seed';

/**
 * Resolves meter numbers to premise / account context.
 * Replace the in-memory registry with a CIS/MDM API client in production.
 */
@Injectable()
export class MeterLookupService implements OnModuleInit {
  private readonly logger = new Logger(MeterLookupService.name);
  private registry: Record<string, PremiseLookupResult> = { ...METER_REGISTRY_SEED };

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const mergePath = this.configService
      .get<string>('METER_REGISTRY_MERGE_PATH')
      ?.trim();
    if (!mergePath) {
      return;
    }
    if (!existsSync(mergePath)) {
      this.logger.warn(`METER_REGISTRY_MERGE_PATH set but file not found: ${mergePath}`);
      return;
    }
    try {
      const raw = readFileSync(mergePath, 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        this.logger.warn('METER_REGISTRY_MERGE_PATH must be a JSON object keyed by meter number');
        return;
      }
      const extra = parsed as Record<string, PremiseLookupResult>;
      let n = 0;
      for (const [k, v] of Object.entries(extra)) {
        const key = this.normalizeMeterNumber(k);
        if (!key || !v || typeof v !== 'object') continue;
        this.registry[key] = {
          ...v,
          found: v.found !== false,
          meterNumber: key,
        };
        n += 1;
      }
      this.logger.log(`Loaded ${n} meter record(s) from METER_REGISTRY_MERGE_PATH`);
    } catch (e) {
      this.logger.error(
        `Failed to load METER_REGISTRY_MERGE_PATH: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  normalizeMeterNumber(raw: string): string {
    return raw.trim().replace(/\s+/g, '').toUpperCase();
  }

  /** Full registry row (includes phone for server-side verification). */
  lookup(rawMeterNumber: string): PremiseLookupResult {
    const meterNumber = this.normalizeMeterNumber(rawMeterNumber);
    if (!meterNumber) {
      return { found: false, meterNumber: '' };
    }
    const hit = this.registry[meterNumber];
    if (hit) {
      return { ...hit, meterNumber };
    }
    return { found: false, meterNumber };
  }

  /** Resolve by billing account number (CIS / registry). */
  lookupByAccountNumber(rawAccount: string): PremiseLookupResult | null {
    const account = rawAccount.trim().toUpperCase();
    if (!account) return null;
    for (const row of Object.values(this.registry)) {
      if (row.accountNumber?.trim().toUpperCase() === account) {
        return { ...row, meterNumber: row.meterNumber };
      }
    }
    return null;
  }
}
