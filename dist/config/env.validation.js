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
exports.envValidationSchema = void 0;
const Joi = __importStar(require("joi"));
exports.envValidationSchema = Joi.object({
    NODE_ENV: Joi.string()
        .valid('development', 'production', 'test')
        .default('development'),
    PORT: Joi.number().default(3000),
    DB_HOST: Joi.string().default('127.0.0.1'),
    DB_PORT: Joi.number().default(3306),
    DB_USER: Joi.string().default('root'),
    DB_PASSWORD: Joi.string().allow('').default(''),
    DB_NAME: Joi.string().default('issue_tracking_system'),
    DB_SYNC: Joi.string().when('NODE_ENV', {
        is: 'production',
        then: Joi.valid('false', '0').required().messages({
            'any.only': 'DB_SYNC must be false in production — run migrations (MIGRATIONS_RUN=true or npm run migration:run)',
        }),
        otherwise: Joi.string().default('true'),
    }),
    MIGRATIONS_RUN: Joi.string().valid('true', 'false').default('false'),
    JWT_SECRET: Joi.string().when('NODE_ENV', {
        is: 'production',
        then: Joi.string().min(32).required().messages({
            'string.min': 'JWT_SECRET must be at least 32 characters in production',
        }),
        otherwise: Joi.string().default('dev-secret-change-me'),
    }),
    JWT_ACCESS_EXPIRES_IN_SECONDS: Joi.number().default(86400),
    JWT_REFRESH_EXPIRES_IN_DAYS: Joi.number().default(7),
    LOGIN_THROTTLE_LIMIT: Joi.number().default(60),
    LOGIN_THROTTLE_TTL_MS: Joi.number().default(60000),
    LOGIN_MAX_FAILED_ATTEMPTS: Joi.number().default(5),
    LOGIN_LOCKOUT_MINUTES: Joi.number().default(15),
    CORS_ORIGIN: Joi.string().allow('').optional(),
    SWAGGER_ENABLED: Joi.string().valid('true', 'false').when('NODE_ENV', {
        is: 'production',
        then: Joi.string().default('false'),
        otherwise: Joi.string().default('true'),
    }),
    LOG_LEVEL: Joi.string()
        .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace')
        .default('info'),
    LOG_TYPEORM: Joi.string().valid('true', 'false').default('false'),
    SENTRY_DSN: Joi.string().allow('').optional(),
    SENTRY_TRACES_SAMPLE_RATE: Joi.number().min(0).max(1).default(0),
    UPLOAD_DIR: Joi.string().default('uploads'),
    MAX_UPLOAD_MB: Joi.number().default(5),
    SMTP_USE_ETHEREAL: Joi.string().valid('true', 'false', '1', '0').optional(),
    SMTP_HOST: Joi.string().allow('').optional(),
    SMTP_PORT: Joi.number().optional(),
    SMTP_USER: Joi.string().allow('').optional(),
    SMTP_PASS: Joi.string().allow('').optional(),
    SMTP_FROM: Joi.string().allow('').optional(),
    NOTIFY_EMAIL: Joi.string().allow('').optional(),
});
//# sourceMappingURL=env.validation.js.map