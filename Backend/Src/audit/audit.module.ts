import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditLog } from './audit-log.entity';
import { Issue } from '../issue/issue.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog, Issue])],
  controllers: [AuditController],
  providers: [AuditService],
})
export class AuditModule {}
