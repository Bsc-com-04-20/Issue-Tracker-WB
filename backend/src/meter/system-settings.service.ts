import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from './system-settings.entity';

@Injectable()
export class SystemSettingsService implements OnModuleInit {
  constructor(
    @InjectRepository(SystemSetting)
    private repo: Repository<SystemSetting>,
  ) {}

  async onModuleInit() {
    // Seed default settings if they don't exist
    const defaults = [
      { key: 'otp_ttl_ms', value: 300000, description: 'OTP Validity in milliseconds' },
      { key: 'sla_critical_hours', value: 4, description: 'SLA for Critical issues' },
      { key: 'priority_clinic_weight', value: 40, description: 'Weight boost for medical facilities' },
    ];

    for (const d of defaults) {
      const exists = await this.repo.findOneBy({ key: d.key });
      if (!exists) await this.repo.save(d);
    }
  }

  async get<T>(key: string, defaultValue: T): Promise<T> {
    const setting = await this.repo.findOneBy({ key });
    return setting ? (setting.value as T) : defaultValue;
  }

  async getAll() {
    return this.repo.find();
  }

  async set(key: string, value: any) {
    return this.repo.save({ key, value });
  }
}