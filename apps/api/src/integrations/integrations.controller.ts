import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EjariService } from './ejari/ejari.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../auth/guards/workspace.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Integrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly ejariService: EjariService) {}

  @Post('ejari/register/:leaseId')
  @ApiOperation({ summary: 'Register a lease with Ejari (DLD)' })
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  registerEjari(@Param('leaseId') leaseId: string, @Request() req: any) {
    return this.ejariService.registerLease(leaseId);
  }

  @Get('rera/index')
  @ApiOperation({ summary: 'Get RERA rental index for an area' })
  getReraIndex(
    @Query('area') area: string,
    @Query('propertyType') propertyType: string,
    @Query('bedroomCount') bedroomCount: string,
  ) {
    return this.ejariService.getReraIndex(area, propertyType, parseInt(bedroomCount, 10) || 0);
  }
}
