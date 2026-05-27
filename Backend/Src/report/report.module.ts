import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { Issue } from '../issue/issue.entity';
import { Resolution } from '../issue/resolution.entity';
import { User } from '../user/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Issue, Resolution, User])],
  controllers: [ReportController],
  providers: [ReportService],
})
export class ReportModule {}
