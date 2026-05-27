import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { IntegrationsController } from './integrations.controller';
import { EjariService } from './ejari/ejari.service';
import { TwilioService } from './twilio.service';
import { OpenAiService } from './openai.service';
import { PaymentsService } from './payments.service';
import { EmailService } from './email.service';

@Global()
@Module({
  imports: [BullModule.registerQueue({ name: 'ejari' })],
  controllers: [IntegrationsController],
  providers: [EjariService, TwilioService, OpenAiService, PaymentsService, EmailService],
  exports: [EjariService, TwilioService, OpenAiService, PaymentsService, EmailService],
})
export class IntegrationsModule {}
