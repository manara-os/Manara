import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AiController } from './ai.controller';
import { AiRentCallService } from './ai-rent-call.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({ name: 'ai-calls' }),
    BullModule.registerQueue({ name: 'notifications' }),
  ],
  controllers: [AiController],
  providers: [AiRentCallService],
  exports: [AiRentCallService],
})
export class AiModule {}
