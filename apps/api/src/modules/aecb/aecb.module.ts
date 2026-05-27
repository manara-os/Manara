import { Module } from '@nestjs/common';
import { AecbController } from './aecb.controller';
import { AecbService } from './aecb.service';

@Module({
  controllers: [AecbController],
  providers: [AecbService],
  exports: [AecbService],
})
export class AecbModule {}
