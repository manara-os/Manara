import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../../auth/guards/workspace.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @ApiOperation({ summary: 'List all tenants' })
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  findAll(
    @Request() req: any,
    @Query('search') search?: string,
    @Query('kycVerified') kycVerified?: string,
  ) {
    return this.tenantsService.findAll(req.workspaceId, {
      search,
      kycVerified: kycVerified !== undefined ? kycVerified === 'true' : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tenant details' })
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.tenantsService.findOne(req.workspaceId, id);
  }

  @Get(':id/ledger')
  @ApiOperation({ summary: 'Get tenant payment ledger' })
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  getLedger(@Request() req: any, @Param('id') id: string) {
    return this.tenantsService.getLedger(req.workspaceId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create tenant profile' })
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  create(@Request() req: any, @Body() dto: any) {
    return this.tenantsService.create(req.workspaceId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update tenant profile' })
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  update(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.tenantsService.update(req.workspaceId, id, dto);
  }

  @Post(':id/verify-kyc')
  @ApiOperation({ summary: 'Mark tenant KYC as verified' })
  @Roles(UserRole.PM_ADMIN)
  verifyKyc(@Request() req: any, @Param('id') id: string) {
    return this.tenantsService.verifyKyc(req.workspaceId, id);
  }

  @Patch(':id/screening')
  @ApiOperation({ summary: 'Approve or reject tenant screening' })
  @Roles(UserRole.PM_ADMIN)
  updateScreening(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: { status: 'APPROVED' | 'REJECTED' },
  ) {
    return this.tenantsService.updateScreening(req.workspaceId, id, dto.status, req.user?.sub);
  }

  @Get(':id/statement')
  @ApiOperation({ summary: 'Get tenant payment statement for a date range' })
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  getStatement(
    @Request() req: any,
    @Param('id') id: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : new Date();
    return this.tenantsService.getStatement(req.workspaceId, id, start, end);
  }
}
