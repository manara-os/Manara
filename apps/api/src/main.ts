import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { WinstonLogger } from './common/logger/winston.logger';

async function bootstrap() {
  const logger = WinstonLogger.getInstance();

  const app = await NestFactory.create(AppModule, {
    logger: logger,
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('API_PORT', 3001);
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');
  const corsOrigins = configService
    .get<string>('CORS_ORIGINS', 'http://localhost:3000')
    .split(',');

  // ── Security ────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          scriptSrc: ["'self'"],
        },
      },
      hsts: { maxAge: 31536000, includeSubDomains: true },
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );

  app.use(compression());
  app.use(cookieParser());

  // ── CORS ────────────────────────────────────────────────
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        corsOrigins.some(
          (o) => origin === o || (o.includes('*') && origin.endsWith(o.replace('*', ''))),
        )
      ) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Workspace-ID', 'X-Request-ID'],
  });

  // ── API Prefix ──────────────────────────────────────────
  app.setGlobalPrefix(apiPrefix);

  // ── Validation ─────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      stopAtFirstError: false,
    }),
  );

  // ── Global Filters & Interceptors ───────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());

  // ── Swagger Documentation ───────────────────────────────
  if (configService.get('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Manara OS API')
      .setDescription('UAE Property Management Operating System — REST API v3')
      .setVersion('3.0.0')
      .addServer(`http://localhost:${port}`, 'Local Development')
      .addServer('https://api.manaraos.ae', 'Production')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', name: 'JWT' },
        'JWT-Auth',
      )
      .addApiKey({ type: 'apiKey', in: 'header', name: 'X-API-Key' }, 'API-Key')
      .setContact('Manara OS', 'https://manaraos.ae', 'support@manaraos.ae')
      .setLicense('Proprietary', '')
      .addTag('Auth', 'OTP authentication and token management')
      .addTag('Workspaces', 'Multi-tenant workspace management')
      .addTag('Properties', 'Property and unit management')
      .addTag('Tenants', 'Tenant management and KYC')
      .addTag('Leases', 'Lease lifecycle management')
      .addTag('Tickets', 'Maintenance (Happy Code) tickets')
      .addTag('Finance', 'Rent collection, PDC, SOA')
      .addTag('Owners', 'Owner portal APIs')
      .addTag('Vendors', 'Vendor management')
      .addTag('Documents', 'Document vault')
      .addTag('Notifications', 'Push, email, WhatsApp notifications')
      .addTag('AI', 'AI automation and rent follow-up calls')
      .addTag('Integrations', 'DLD Ejari, RERA, Trakheesi APIs')
      .addTag('Admin', 'Platform admin APIs')
      .addTag('Billing', 'Subscription and billing')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        tagsSorter: 'alpha',
      },
    });
  }

  // ── Graceful Shutdown ───────────────────────────────────
  app.enableShutdownHooks();

  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 Manara OS API running on port ${port}`, 'Bootstrap');
  logger.log(`📚 Swagger docs at http://localhost:${port}/docs`, 'Bootstrap');
  logger.log(`🌍 Environment: ${configService.get('NODE_ENV')}`, 'Bootstrap');
}

bootstrap();
