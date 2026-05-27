import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { envValidationSchema } from './config/env.validation';
import { SentryExceptionFilter } from './common/filters/sentry-exception.filter';
import { UserModule } from './user/user.module';
import { IssueModule } from './issue/issue.module';
import { AssignmentModule } from './assignment/assignment.module';
import { LocationModule } from './location/location.module';
import { StatusModule } from './status/status.module';
import { ReportModule } from './report/report.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { NotificationModule } from './notification/notification.module';
import { ProductionHardening1730128000000 } from './migrations/1730128000000-production-hardening';
import { AddDepartmentSpecialistRoles1740000000000 } from './migrations/1740000000000-add-department-specialist-roles';
import { StreamlineWaterBoardRoles1741000000000 } from './migrations/1741000000000-streamline-water-board-roles';
import { OperationalIntelligenceFields1742000000000 } from './migrations/1742000000000-operational-intelligence-fields';
import { ExtendedOperationsSla1743000000000 } from './migrations/1743000000000-extended-operations-sla';
import { EnsureStreamlinedUserRoles1741000000001 } from './migrations/1741000000001-ensure-streamlined-user-roles';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false,
        allowUnknown: true,
      },
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.get<string>('LOG_LEVEL', 'info'),
          autoLogging: true,
        },
      }),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 200,
      },
    ]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql' as const,
        host: configService.get<string>('DB_HOST', '127.0.0.1'),
        port: Number(configService.get<string>('DB_PORT', '3306')),
        username: configService.get<string>('DB_USER', 'root'),
        password: configService.get<string>('DB_PASSWORD', ''),
        database: configService.get<string>(
          'DB_NAME',
          'issue_tracking_system',
        ),
        autoLoadEntities: true,
        synchronize:
          configService.get<string>('DB_SYNC', 'true') === 'true',
        logging:
          configService.get<string>('LOG_TYPEORM', 'false') === 'true',
        logger: 'advanced-console',
        connectTimeout: 10000,
        migrations: [
          ProductionHardening1730128000000,
          AddDepartmentSpecialistRoles1740000000000,
          StreamlineWaterBoardRoles1741000000000,
          EnsureStreamlinedUserRoles1741000000001,
          OperationalIntelligenceFields1742000000000,
          ExtendedOperationsSla1743000000000,
        ],
        migrationsRun:
          configService.get<string>('MIGRATIONS_RUN', 'false') === 'true',
        migrationsTableName: 'typeorm_migrations',
      }),
    }),
    NotificationModule,
    HealthModule,
    AuthModule,
    UserModule,
    IssueModule,
    AssignmentModule,
    LocationModule,
    StatusModule,
    ReportModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: SentryExceptionFilter },
  ],
})
export class AppModule {}
