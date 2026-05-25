import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [
    PrismaService,
    {
      provide: 'PRISMA_CLIENT',
      useFactory: (prisma: PrismaService) => prisma,
      inject: [PrismaService],
    },
  ],
  exports: [PrismaService],
})
export class DatabaseModule {}
