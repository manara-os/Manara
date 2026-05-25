import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { IntegrationsController } from './integrations.controller';
import { EjariService } from './ejari/ejari.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'ejari' })],
  controllers: [IntegrationsController],
  providers: [EjariService],
  exports: [EjariService],
})
export class IntegrationsModule {}
