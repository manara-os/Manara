import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { RenewalAlertsProcessor } from './processors/renewal-alerts.processor';
import { EjariProcessor } from './processors/ejari.processor';
import { NotificationsProcessor } from './processors/notifications.processor';
import { DatabaseModule } from '../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EjariModule } from '../integrations/ejari/ejari.module';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'renewal-alerts' },
      { name: 'ejari' },
      { name: 'notifications' },
      { name: 'ai-calls' },
      { name: 'pma-alerts' },
      { name: 'push-notifications' },
      { name: 'document-expiry' },
    ),
    DatabaseModule,
    NotificationsModule,
    EjariModule,
  ],
  providers: [
    RenewalAlertsProcessor,
    EjariProcessor,
    NotificationsProcessor,
  ],
  exports: [BullModule],
})
export class QueuesModule {}
