import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

/** Hours from report → first meaningful dispatch / assignment (target). */
export type SlaHoursPair = {
  firstResponseHours: number;
  resolutionHours: number;
};

type MergeFileShape = {
  resolutionHoursByKey?: Record<string, number>;
  firstResponseHoursByKey?: Record<string, number>;
};

const DEFAULT_RESOLUTION_HOURS: Record<string, Record<string, number>> = {
  water_supply: {
    __default__: 48,
    no_water_supply: 24,
    delayed_water_restoration: 24,
    low_water_pressure: 72,
    intermittent_supply: 48,
    air_in_pipes: 72,
  },
  infrastructure_maintenance: {
    __default__: 24,
    pipe_burst: 4,
    broken_hydrant: 8,
    water_leakage: 12,
    damaged_valve: 24,
    reservoir_or_tank_damage: 12,
    illegal_connection_damage: 48,
    meter_infrastructure_damage: 48,
  },
  billing_account: { __default__: 120 },
  metering: { __default__: 72, prepaid_meter_token_failure: 24 },
  water_quality: {
    __default__: 48,
    suspected_contamination: 4,
    brown_or_dirty_water: 24,
    bad_smell: 24,
    bad_taste: 24,
    high_chlorine_levels: 24,
    silt_or_mud_presence: 48,
  },
  digital_payment: { __default__: 48, system_downtime: 8 },
  illegal_connection_fraud: { __default__: 168 },
};

@Injectable()
export class SlaRulesService implements OnModuleInit {
  private merge: MergeFileShape = {};

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.reloadMergeFile();
  }

  mergeFilePath(): string {
    return this.config.get<string>(
      'SLA_POLICY_MERGE_PATH',
      'config/sla-policy.merge.json',
    );
  }

  reloadMergeFile(): void {
    const p = this.mergeFilePath();
    try {
      if (existsSync(p)) {
        const raw = readFileSync(p, 'utf8');
        this.merge = JSON.parse(raw) as MergeFileShape;
      } else {
        this.merge = {};
      }
    } catch {
      this.merge = {};
    }
  }

  readMergeJson(): MergeFileShape {
    this.reloadMergeFile();
    return { ...this.merge };
  }

  writeMergeJson(body: MergeFileShape): void {
    const p = this.mergeFilePath();
    const dir = dirname(p);
    mkdirSync(dir, { recursive: true });
    writeFileSync(p, JSON.stringify(body, null, 2), 'utf8');
    this.merge = body;
  }

  private hoursFor(
    map: Record<string, number> | undefined,
    category: string,
    subcategory: string | null,
  ): number | undefined {
    if (!map) return undefined;
    const sub = subcategory?.trim() || '';
    const k1 = `${category}:${sub}`;
    if (map[k1] != null) return Number(map[k1]);
    const k2 = `${category}:__default__`;
    if (map[k2] != null) return Number(map[k2]);
    return undefined;
  }

  resolve(
    category: string,
    subcategory: string | null,
    urgencyLevel: string,
  ): SlaHoursPair {
    const cat = DEFAULT_RESOLUTION_HOURS[category] ?? { __default__: 72 };
    const sub = subcategory?.trim() || '';
    const rawBase = (sub && cat[sub]) ?? cat.__default__ ?? 72;
    const baseRes = Number(rawBase);
    const baseFirst = Math.min(
      8,
      Math.max(2, Math.round(baseRes / 6)),
    );

    let resolutionHours: number = baseRes;
    let firstResponseHours: number = baseFirst;

    const mr = this.merge.resolutionHoursByKey;
    const mf = this.merge.firstResponseHoursByKey;
    const overrideRes = this.hoursFor(mr, category, subcategory);
    const overrideFirst = this.hoursFor(mf, category, subcategory);
    if (overrideRes != null && Number.isFinite(overrideRes) && overrideRes > 0) {
      resolutionHours = overrideRes;
    }
    if (overrideFirst != null && Number.isFinite(overrideFirst) && overrideFirst > 0) {
      firstResponseHours = overrideFirst;
    }

    const u = (urgencyLevel ?? 'normal').trim().toLowerCase();
    if (u === 'critical') {
      resolutionHours *= 0.25;
      firstResponseHours *= 0.25;
    } else if (u === 'urgent') {
      resolutionHours *= 0.5;
      firstResponseHours *= 0.5;
    } else if (u === 'high') {
      resolutionHours *= 0.75;
      firstResponseHours *= 0.75;
    }

    return {
      firstResponseHours: Math.max(1, Math.round(firstResponseHours)),
      resolutionHours: Math.max(1, Math.round(resolutionHours)),
    };
  }

  addHours(d: Date, hours: number): Date {
    const out = new Date(d.getTime());
    out.setTime(out.getTime() + hours * 3600 * 1000);
    return out;
  }
}
