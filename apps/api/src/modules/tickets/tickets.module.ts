import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'notifications' })],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
