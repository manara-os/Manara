import { Module } from '@nestjs/common';
import { TaxCertificatesController } from './tax-certificates.controller';
import { TaxCertificatesService } from './tax-certificates.service';

@Module({
  controllers: [TaxCertificatesController],
  providers: [TaxCertificatesService],
  exports: [TaxCertificatesService],
})
export class TaxCertificatesModule {}
