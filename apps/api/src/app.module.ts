import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { AuthModule } from './auth/auth.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { PropertiesModule } from './modules/properties/properties.module';
import { UnitsModule } from './modules/units/units.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { LeasesModule } from './modules/leases/leases.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { FinanceModule } from './modules/finance/finance.module';
import { OwnersModule } from './modules/owners/owners.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AiModule } from './ai/ai.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { AdminModule } from './modules/admin/admin.module';
import { BillingModule } from './modules/subscriptions/billing.module';
import { ReportsModule } from './modules/reports/reports.module';
import { CommunicationsModule } from './modules/communications/communications.module';
import { ListingsModule } from './modules/listings/listings.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { ReceiptsModule } from './modules/receipts/receipts.module';
import { TaxCertificatesModule } from './modules/tax-certificates/tax-certificates.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { BidsModule } from './modules/bids/bids.module';
import { VendorScoresModule } from './modules/vendor-scores/vendor-scores.module';
import { AecbModule } from './modules/aecb/aecb.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { RoiModule } from './modules/roi/roi.module';
import { PrivacyModule } from './modules/privacy/privacy.module';
import { DatabaseModule } from './database/database.module';
import { CryptoModule } from './common/crypto/crypto.module';
import { QueuesModule } from './queues/queues.module';
import { FilesModule } from './files/files.module';
import { HealthController } from './health/health.controller';
import configuration from './config/configuration';
import { validationSchema } from './config/validation';

@Module({
  controllers: [HealthController],
  imports: [
    // ── Config ────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      cache: true,
      expandVariables: true,
    }),

    // ── Rate Limiting ─────────────────────────────────────
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: config.get('RATE_LIMIT_TTL', 60000),
            limit: config.get('RATE_LIMIT_MAX', 100),
          },
          {
            name: 'auth',
            ttl: 60000,
            limit: config.get('AUTH_RATE_LIMIT_MAX', 10),
          },
        ],
      }),
    }),

    // ── Scheduler ─────────────────────────────────────────
    ScheduleModule.forRoot(),

    // ── Queue ─────────────────────────────────────────────
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: config.get('REDIS_URL', 'redis://localhost:6379'),
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 500,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      }),
    }),

    // ── Core Modules ──────────────────────────────────────
    DatabaseModule,
    CryptoModule,
    FilesModule,
    AuthModule,
    WorkspacesModule,
    PropertiesModule,
    UnitsModule,
    TenantsModule,
    LeasesModule,
    TicketsModule,
    FinanceModule,
    OwnersModule,
    VendorsModule,
    DocumentsModule,
    NotificationsModule,
    AiModule,
    IntegrationsModule,
    AdminModule,
    BillingModule,
    ReportsModule,
    CommunicationsModule,
    ListingsModule,
    ComplianceModule,
    ReceiptsModule,
    TaxCertificatesModule,
    ReviewsModule,
    BidsModule,
    VendorScoresModule,
    AecbModule,
    WhatsAppModule,
    RoiModule,
    PrivacyModule,
    QueuesModule,
  ],
})
export class AppModule {}
