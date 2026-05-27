import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { RenewalAlertsProcessor } from './processors/renewal-alerts.processor';
import { EjariProcessor } from './processors/ejari.processor';
import { NotificationsProcessor } from './processors/notifications.processor';
import { ComplianceAlertsProcessor } from './processors/compliance-alerts.processor';
import { SlaMonitorProcessor } from './processors/sla-monitor.processor';
import { RentRemindersProcessor } from './processors/rent-reminders.processor';
import { AecbMonthlyProcessor } from './processors/aecb-monthly.processor';
import { VendorScoreProcessor } from './processors/vendor-score.processor';
import { NpsDispatchProcessor } from './processors/nps-dispatch.processor';
import { DatabaseModule } from '../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EjariModule } from '../integrations/ejari/ejari.module';
import { AecbModule } from '../modules/aecb/aecb.module';
import { VendorScoresModule } from '../modules/vendor-scores/vendor-scores.module';

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
      { name: 'compliance-alerts' },
      { name: 'sla-monitor' },
      { name: 'rent-reminders' },
      { name: 'aecb-monthly' },
      { name: 'vendor-scores' },
      { name: 'nps-dispatch' },
    ),
    DatabaseModule,
    NotificationsModule,
    EjariModule,
    AecbModule,
    VendorScoresModule,
  ],
  providers: [
    RenewalAlertsProcessor,
    EjariProcessor,
    NotificationsProcessor,
    ComplianceAlertsProcessor,
    SlaMonitorProcessor,
    RentRemindersProcessor,
    AecbMonthlyProcessor,
    VendorScoreProcessor,
    NpsDispatchProcessor,
  ],
  exports: [BullModule],
})
export class QueuesModule {}
