"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const core_1 = require("@nestjs/core");
const throttler_1 = require("@nestjs/throttler");
const nestjs_pino_1 = require("nestjs-pino");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const env_validation_1 = require("./config/env.validation");
const sentry_exception_filter_1 = require("./common/filters/sentry-exception.filter");
const user_module_1 = require("./user/user.module");
const issue_module_1 = require("./issue/issue.module");
const assignment_module_1 = require("./assignment/assignment.module");
const location_module_1 = require("./location/location.module");
const status_module_1 = require("./status/status.module");
const report_module_1 = require("./report/report.module");
const audit_module_1 = require("./audit/audit.module");
const auth_module_1 = require("./auth/auth.module");
const health_module_1 = require("./health/health.module");
const notification_module_1 = require("./notification/notification.module");
const _1730128000000_production_hardening_1 = require("./migrations/1730128000000-production-hardening");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                validationSchema: env_validation_1.envValidationSchema,
                validationOptions: {
                    abortEarly: false,
                    allowUnknown: true,
                },
            }),
            nestjs_pino_1.LoggerModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    pinoHttp: {
                        level: config.get('LOG_LEVEL', 'info'),
                        autoLogging: true,
                    },
                }),
            }),
            throttler_1.ThrottlerModule.forRoot([
                {
                    ttl: 60000,
                    limit: 200,
                },
            ]),
            typeorm_1.TypeOrmModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    type: 'mysql',
                    host: configService.get('DB_HOST', '127.0.0.1'),
                    port: Number(configService.get('DB_PORT', '3306')),
                    username: configService.get('DB_USER', 'root'),
                    password: configService.get('DB_PASSWORD', ''),
                    database: configService.get('DB_NAME', 'issue_tracking_system'),
                    autoLoadEntities: true,
                    synchronize: configService.get('DB_SYNC', 'true') === 'true',
                    logging: configService.get('LOG_TYPEORM', 'false') === 'true',
                    logger: 'advanced-console',
                    connectTimeout: 10000,
                    migrations: [_1730128000000_production_hardening_1.ProductionHardening1730128000000],
                    migrationsRun: configService.get('MIGRATIONS_RUN', 'false') === 'true',
                    migrationsTableName: 'typeorm_migrations',
                }),
            }),
            notification_module_1.NotificationModule,
            health_module_1.HealthModule,
            auth_module_1.AuthModule,
            user_module_1.UserModule,
            issue_module_1.IssueModule,
            assignment_module_1.AssignmentModule,
            location_module_1.LocationModule,
            status_module_1.StatusModule,
            report_module_1.ReportModule,
            audit_module_1.AuditModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [
            app_service_1.AppService,
            { provide: core_1.APP_GUARD, useClass: throttler_1.ThrottlerGuard },
            { provide: core_1.APP_FILTER, useClass: sentry_exception_filter_1.SentryExceptionFilter },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map