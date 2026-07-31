export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || process.env.API_PORT || '3001', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  appVersion: process.env.APP_VERSION || '3.0.0',

  database: {
    url: process.env.DATABASE_URL,
    poolMin: parseInt(process.env.DATABASE_POOL_MIN || '2', 10),
    poolMax: parseInt(process.env.DATABASE_POOL_MAX || '20', 10),
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD,
    tls: process.env.REDIS_TLS === 'true',
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  platformAdmin: {
    secret: process.env.PLATFORM_ADMIN_SECRET,
  },

  otp: {
    ttlSeconds: parseInt(process.env.OTP_TTL_SECONDS || '300', 10),
    devBypass: process.env.OTP_DEV_BYPASS || '123456',
  },

  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'me-central-1',
    s3Bucket: process.env.AWS_S3_BUCKET || 'manara-os-documents',
    cloudfrontDomain: process.env.AWS_CLOUDFRONT_DOMAIN,
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    plans: {
      starter: process.env.STRIPE_STARTER_PRICE_ID,
      pro: process.env.STRIPE_PRO_PRICE_ID,
      enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    },
  },

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    fromNumber: process.env.TWILIO_FROM_NUMBER,
    whatsappFrom: process.env.TWILIO_WHATSAPP_FROM,
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    ttsModel: process.env.OPENAI_TTS_MODEL || 'tts-1-hd',
    ttsVoice: process.env.OPENAI_TTS_VOICE || 'alloy',
  },

  dld: {
    apiBaseUrl: process.env.DLD_API_BASE_URL || 'https://api.dubailand.gov.ae',
    apiKey: process.env.DLD_API_KEY,
    clientId: process.env.DLD_CLIENT_ID,
    clientSecret: process.env.DLD_CLIENT_SECRET,
    ejariApiUrl: process.env.EJARI_API_URL || 'https://ejari.dubailand.gov.ae/api',
    trakheesiApiUrl: process.env.TRAKHEESI_API_URL || 'https://trakheesi.dubailand.gov.ae/api',
    reraIndexApiUrl: process.env.RERA_INDEX_API_URL || 'https://smartrental.rera.gov.ae/api',
  },

  email: {
    provider: process.env.EMAIL_PROVIDER || 'ses',
    from: process.env.EMAIL_FROM || 'noreply@manaraos.ae',
    fromName: process.env.EMAIL_FROM_NAME || 'Manara OS',
  },

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  },

  expo: {
    accessToken: process.env.EXPO_ACCESS_TOKEN,
  },

  sentry: {
    dsn: process.env.SENTRY_DSN,
  },

  encryption: {
    key: process.env.ENCRYPTION_KEY,
    iv: process.env.ENCRYPTION_IV,
  },

  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL || '60000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    authMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10', 10),
  },

  features: {
    aiCalls: process.env.FEATURE_AI_CALLS !== 'false',
    ejariIntegration: process.env.FEATURE_EJARI_INTEGRATION !== 'false',
    reraIndex: process.env.FEATURE_RERA_INDEX !== 'false',
    investmentIntelligence: process.env.FEATURE_INVESTMENT_INTELLIGENCE !== 'false',
    portalSyndication: process.env.FEATURE_PORTAL_SYNDICATION === 'true',
  },
});
