import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatusController } from './status.controller';
import { StatusService } from './status.service';
import { Status } from './status.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Status])],
  controllers: [StatusController],
  providers: [StatusService],
  exports: [StatusService, TypeOrmModule],
})
export class StatusModule {}
