import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'staging', 'production').default('development'),
  PORT: Joi.number().default(3001),

  // Database
  DATABASE_URL: Joi.string().required(),

  // Redis
  REDIS_URL: Joi.string().default('redis://localhost:6379'),

  // JWT
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // Twilio
  TWILIO_ACCOUNT_SID: Joi.string().allow('').when('NODE_ENV', {
    is: Joi.string().valid('production', 'staging'),
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  TWILIO_AUTH_TOKEN: Joi.string().allow('').optional(),
  TWILIO_PHONE_NUMBER: Joi.string().allow('').optional(),
  TWILIO_WHATSAPP_NUMBER: Joi.string().allow('').optional(),

  // AWS
  AWS_REGION: Joi.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: Joi.string().allow('').optional(),
  AWS_SECRET_ACCESS_KEY: Joi.string().allow('').optional(),
  AWS_S3_BUCKET: Joi.string().allow('').optional(),
  AWS_CLOUDFRONT_DOMAIN: Joi.string().allow('').optional(),
  AWS_SES_FROM_EMAIL: Joi.string().email().allow('').optional(),

  // OpenAI
  OPENAI_API_KEY: Joi.string().allow('').optional(),
  OPENAI_MODEL: Joi.string().default('gpt-4o'),

  // Stripe
  STRIPE_SECRET_KEY: Joi.string().allow('').optional(),
  STRIPE_WEBHOOK_SECRET: Joi.string().allow('').optional(),
  STRIPE_PRO_PRICE_ID: Joi.string().allow('').optional(),
  STRIPE_ENTERPRISE_PRICE_ID: Joi.string().allow('').optional(),

  // Firebase
  FIREBASE_PROJECT_ID: Joi.string().allow('').optional(),
  FIREBASE_CLIENT_EMAIL: Joi.string().allow('').optional(),
  FIREBASE_PRIVATE_KEY: Joi.string().allow('').optional(),

  // Expo
  EXPO_ACCESS_TOKEN: Joi.string().allow('').optional(),

  // Ejari / DLD
  EJARI_API_URL: Joi.string().uri().allow('').optional(),
  EJARI_API_KEY: Joi.string().allow('').optional(),
  EJARI_MOCK_MODE: Joi.boolean().default(true),

  // RERA
  RERA_API_URL: Joi.string().uri().allow('').optional(),
  RERA_API_KEY: Joi.string().allow('').optional(),

  // Sentry
  SENTRY_DSN: Joi.string().uri().allow('').optional(),

  // Rate Limiting
  RATE_LIMIT_TTL: Joi.number().default(60000),
  RATE_LIMIT_MAX: Joi.number().default(100),
  AUTH_RATE_LIMIT_MAX: Joi.number().default(10),

  // CORS
  CORS_ORIGINS: Joi.string().default('http://localhost:3000'),

  // App
  APP_URL: Joi.string().uri().optional(),
  API_URL: Joi.string().uri().optional(),
});
