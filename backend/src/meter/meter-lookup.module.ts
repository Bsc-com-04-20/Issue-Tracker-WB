import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeterLookupService } from './meter-lookup.service';
import { MeterVerificationService } from './meter-verification.service';
import { SystemSettingsService } from './system-settings.service';
import { SystemSetting } from './system-settings.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SystemSetting])],
  providers: [MeterLookupService, MeterVerificationService, SystemSettingsService],
  exports: [MeterLookupService, MeterVerificationService, SystemSettingsService],
})
export class MeterLookupModule {}
