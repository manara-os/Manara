import { Module } from '@nestjs/common';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';
import { DatabaseModule } from '../../database/database.module';
import { FilesModule } from '../../files/files.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [DatabaseModule, FilesModule, AuditModule],
  controllers: [PropertiesController],
  providers: [PropertiesService],
  exports: [PropertiesService],
})
export class PropertiesModule {}
