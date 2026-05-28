import { Module } from '@nestjs/common';
import { MeterLookupService } from './meter-lookup.service';
import { MeterVerificationService } from './meter-verification.service';

@Module({
  providers: [MeterLookupService, MeterVerificationService],
  exports: [MeterLookupService, MeterVerificationService],
})
export class MeterLookupModule {}
