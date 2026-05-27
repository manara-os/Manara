import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ComplianceService } from './compliance.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../../auth/guards/workspace.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole, ComplianceCategory, ComplianceStatus } from '@prisma/client';

@ApiTags('Compliance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
@Controller('compliance')
export class ComplianceController {
  constructor(private readonly service: ComplianceService) {}

  @Get()
  @ApiOperation({ summary: 'List compliance items' })
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  findAll(
    @Request() req: any,
    @Query('category') category?: ComplianceCategory,
    @Query('status') status?: ComplianceStatus,
  ) {
    return this.service.findAll(req.workspaceId, { category, status });
  }

  @Get('kpis')
  @ApiOperation({ summary: 'Compliance KPI dashboard' })
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  getKpis(@Request() req: any) {
    return this.service.getKpis(req.workspaceId);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.service.findOne(req.workspaceId, id);
  }

  @Post()
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  create(@Request() req: any, @Body() dto: any) {
    return this.service.create(req.workspaceId, dto);
  }

  @Patch(':id')
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  update(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.service.update(req.workspaceId, id, dto);
  }

  @Post(':id/renew')
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  renew(@Request() req: any, @Param('id') id: string, @Body() body: { newExpiryDate: string }) {
    return this.service.renew(req.workspaceId, id, new Date(body.newExpiryDate));
  }

  @Delete(':id')
  @Roles(UserRole.PM_ADMIN)
  delete(@Request() req: any, @Param('id') id: string) {
    return this.service.delete(req.workspaceId, id);
  }
}
