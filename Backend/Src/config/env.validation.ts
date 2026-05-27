import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
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
      'any.only':
        'DB_SYNC must be false in production — run migrations (MIGRATIONS_RUN=true or npm run migration:run)',
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

  /** 0 disables the cap (not recommended in production). */
  MAX_ACTIVE_ASSIGNMENTS_PER_TECHNICIAN: Joi.number().integer().min(0).default(12),

  /**
   * When true, supervisors and department officers cannot close an issue until the
   * customer submits confirmed resolution feedback on the public track page (admins may still close).
   */
  REQUIRE_CUSTOMER_RESOLUTION_ACK_BEFORE_CLOSE: Joi.string()
    .valid('true', 'false', '1', '0')
    .default('false'),

  SLA_POLICY_MERGE_PATH: Joi.string().allow('').optional(),

  /** Optional JSON file merging extra meter registry rows (keyed by normalized meter number). */
  METER_REGISTRY_MERGE_PATH: Joi.string().allow('').optional(),
  /** Prototype OTP value for meter ownership verification (replace with SMS). */
  METER_VERIFICATION_DEMO_OTP: Joi.string().allow('').optional(),
  METER_VERIFICATION_EXPOSE_OTP_IN_RESPONSE: Joi.string()
    .valid('true', 'false', '1', '0')
    .optional(),
  METER_VERIFICATION_TTL_MS: Joi.number().optional(),

  SMTP_USE_ETHEREAL: Joi.string().valid('true', 'false', '1', '0').optional(),
  SMTP_HOST: Joi.string().allow('').optional(),
  SMTP_PORT: Joi.number().optional(),
  SMTP_USER: Joi.string().allow('').optional(),
  SMTP_PASS: Joi.string().allow('').optional(),
  SMTP_FROM: Joi.string().allow('').optional(),
  NOTIFY_EMAIL: Joi.string().allow('').optional(),

  SMS_ENABLED: Joi.string().valid('true', 'false', '1', '0').default('false'),
  SMS_PROVIDER: Joi.string().valid('noop', 'airtel', 'tnm').default('noop'),
  SMS_AIRTEL_BASE_URL: Joi.string().allow('').optional(),
  SMS_AIRTEL_API_KEY: Joi.string().allow('').optional(),
  SMS_AIRTEL_SENDER_ID: Joi.string().allow('').optional(),
  SMS_TNM_BASE_URL: Joi.string().allow('').optional(),
  SMS_TNM_API_KEY: Joi.string().allow('').optional(),
  SMS_TNM_SENDER_ID: Joi.string().allow('').optional(),
});
