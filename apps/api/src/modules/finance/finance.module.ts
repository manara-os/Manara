import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'notifications' })],
  controllers: [FinanceController],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
