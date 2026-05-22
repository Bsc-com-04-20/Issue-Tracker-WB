"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const nestjs_pino_1 = require("nestjs-pino");
const swagger_1 = require("@nestjs/swagger");
const Sentry = __importStar(require("@sentry/node"));
const app_module_1 = require("./app.module");
const swagger_constants_1 = require("./common/swagger.constants");
function isSwaggerEnabled() {
    if (process.env.SWAGGER_ENABLED === 'true') {
        return true;
    }
    if (process.env.SWAGGER_ENABLED === 'false') {
        return false;
    }
    return process.env.NODE_ENV !== 'production';
}
async function bootstrap() {
    if (process.env.SENTRY_DSN) {
        Sentry.init({
            dsn: process.env.SENTRY_DSN,
            environment: process.env.NODE_ENV ?? 'development',
            tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
        });
    }
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { bufferLogs: true });
    app.useLogger(app.get(nestjs_pino_1.Logger));
    const corsOrigin = process.env.CORS_ORIGIN;
    app.enableCors({
        origin: corsOrigin
            ? corsOrigin.split(',').map((o) => o.trim()).filter(Boolean)
            : true,
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
    }));
    if (isSwaggerEnabled()) {
        const swaggerConfig = new swagger_1.DocumentBuilder()
            .setTitle('Issue Tracking System API')
            .setDescription('Staff workflow API. Login returns accessToken + refreshToken. Use Authorize with the access JWT; call POST /auth/refresh when it expires.')
            .setVersion('1.0')
            .addBearerAuth({
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            in: 'header',
        }, swagger_constants_1.SWAGGER_JWT_AUTH)
            .build();
        const document = swagger_1.SwaggerModule.createDocument(app, swaggerConfig);
        swagger_1.SwaggerModule.setup('api', app, document, {
            swaggerOptions: { persistAuthorization: true },
        });
    }
    await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
//# sourceMappingURL=main.js.map