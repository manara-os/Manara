import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { LeasesService } from './leases.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../../auth/guards/workspace.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole, LeaseStatus } from '@prisma/client';

@ApiTags('Leases')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
@Controller('leases')
export class LeasesController {
  constructor(private readonly leasesService: LeasesService) {}

  @Get()
  @ApiOperation({ summary: 'List all leases' })
  @ApiQuery({ name: 'status', required: false, enum: LeaseStatus })
  @ApiQuery({ name: 'unitId', required: false })
  @ApiQuery({ name: 'tenantId', required: false })
  findAll(
    @Request() req: any,
    @Query('status') status?: LeaseStatus,
    @Query('unitId') unitId?: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.leasesService.findAll(req.workspaceId, { status, unitId, tenantId });
  }

  @Get('expiring')
  @ApiOperation({ summary: 'Get leases expiring within N days' })
  getExpiring(@Request() req: any, @Query('days') days = '90') {
    return this.leasesService.getExpiring(req.workspaceId, parseInt(days, 10));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lease details' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.leasesService.findOne(req.workspaceId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new lease' })
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  create(@Request() req: any, @Body() dto: any) {
    return this.leasesService.create(req.workspaceId, dto, req.user?.sub);
  }

  @Post(':id/renew')
  @ApiOperation({ summary: 'Renew a lease' })
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  renew(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.leasesService.renew(req.workspaceId, id, dto);
  }

  @Post(':id/terminate')
  @ApiOperation({ summary: 'Terminate a lease' })
  @Roles(UserRole.PM_ADMIN)
  terminate(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.leasesService.terminate(req.workspaceId, id, dto);
  }

  @Get(':id/rera-analysis')
  @ApiOperation({ summary: 'Get RERA rent increase analysis' })
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  reraAnalysis(@Request() req: any, @Param('id') id: string) {
    return this.leasesService.analyzeReraRent(req.workspaceId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update lease details' })
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  update(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.leasesService.update(req.workspaceId, id, dto);
  }

  @Patch(':id/move-in-status')
  @ApiOperation({ summary: 'Update move-in status (PENDING → ONGOING → COMPLETE)' })
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  updateMoveInStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: { status: 'PENDING' | 'ONGOING' | 'COMPLETE' },
  ) {
    return this.leasesService.updateMoveInStatus(req.workspaceId, id, dto.status);
  }

  @Post(':id/commission')
  @ApiOperation({ summary: 'Submit commission for a lease' })
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  submitCommission(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.leasesService.submitCommission(req.workspaceId, id, dto);
  }

  @Patch(':id/commission/verify')
  @ApiOperation({ summary: 'Verify commission for a lease' })
  @Roles(UserRole.PM_ADMIN)
  verifyCommission(@Request() req: any, @Param('id') id: string) {
    return this.leasesService.verifyCommission(req.workspaceId, id, req.user?.sub);
  }

  @Post(':id/move-out')
  @ApiOperation({ summary: 'Create move-out inspection' })
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  createMoveOut(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.leasesService.createMoveOut(req.workspaceId, id, dto);
  }

  @Patch(':id/move-out')
  @ApiOperation({ summary: 'Update move-out inspection' })
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  updateMoveOut(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.leasesService.updateMoveOut(req.workspaceId, id, dto);
  }
}
