import { Module } from '@nestjs/common';
import { VendorScoresController } from './vendor-scores.controller';
import { VendorScoresService } from './vendor-scores.service';

@Module({
  controllers: [VendorScoresController],
  providers: [VendorScoresService],
  exports: [VendorScoresService],
})
export class VendorScoresModule {}
