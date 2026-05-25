import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { LeasesController } from './leases.controller';
import { LeasesService } from './leases.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'ejari' }),
    BullModule.registerQueue({ name: 'notifications' }),
  ],
  controllers: [LeasesController],
  providers: [LeasesService],
  exports: [LeasesService],
})
export class LeasesModule {}
