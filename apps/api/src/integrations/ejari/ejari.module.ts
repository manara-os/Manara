import { Module } from '@nestjs/common';
import { EjariService } from './ejari.service';

@Module({
  providers: [EjariService],
  exports: [EjariService],
})
export class EjariModule {}
