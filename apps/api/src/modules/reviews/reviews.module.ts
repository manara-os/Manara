import { Module } from '@nestjs/common';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { NpsController } from './nps.controller';
import { NpsService } from './nps.service';

@Module({
  controllers: [ReviewsController, NpsController],
  providers: [ReviewsService, NpsService],
  exports: [ReviewsService, NpsService],
})
export class ReviewsModule {}
