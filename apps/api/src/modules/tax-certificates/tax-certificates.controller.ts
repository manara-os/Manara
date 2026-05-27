import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TaxCertificatesService } from './tax-certificates.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../../auth/guards/workspace.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Tax Certificates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
@Controller('tax-certificates')
export class TaxCertificatesController {
  constructor(private readonly service: TaxCertificatesService) {}

  @Get()
  @Roles(UserRole.PM_ADMIN, UserRole.OWNER)
  findAll(@Request() req: any, @Query('ownerId') ownerId: string) {
    return this.service.findByOwner(req.workspaceId, ownerId);
  }

  @Post('generate')
  @Roles(UserRole.PM_ADMIN, UserRole.OWNER)
  generate(@Request() req: any, @Body() body: { ownerId: string; taxYear: number }) {
    return this.service.generate(req.workspaceId, body.ownerId, body.taxYear);
  }

  @Post(':id/email')
  @Roles(UserRole.PM_ADMIN, UserRole.OWNER)
  email(@Request() req: any, @Param('id') id: string, @Body() body: { email: string }) {
    return this.service.emailTo(req.workspaceId, id, body.email);
  }
}
