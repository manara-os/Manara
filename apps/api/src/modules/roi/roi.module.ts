import { Module } from '@nestjs/common';
import { RoiController } from './roi.controller';
import { RoiService } from './roi.service';

@Module({
  controllers: [RoiController],
  providers: [RoiService],
  exports: [RoiService],
})
export class RoiModule {}
