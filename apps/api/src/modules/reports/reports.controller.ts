import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../../auth/guards/workspace.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
@Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('occupancy')
  @ApiOperation({ summary: 'Occupancy report across all units' })
  getOccupancy(@Request() req: any) {
    return this.reportsService.getOccupancyReport(req.workspaceId);
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Revenue & expenses report for a period' })
  getRevenue(
    @Request() req: any,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('period') period?: string,
  ) {
    const y = year ? parseInt(year, 10) : undefined;
    const m = month ? parseInt(month, 10) : undefined;
    return this.reportsService.getRevenueReport(req.workspaceId, y, m, period);
  }

  @Get('maintenance')
  @ApiOperation({ summary: 'Maintenance ticket analytics' })
  getMaintenance(@Request() req: any) {
    return this.reportsService.getMaintenanceReport(req.workspaceId);
  }

  @Get('tenants')
  @ApiOperation({ summary: 'Tenant summary report' })
  getTenants(@Request() req: any) {
    return this.reportsService.getTenantReport(req.workspaceId);
  }

  @Get('leases')
  @ApiOperation({ summary: 'Lease lifecycle report' })
  getLeases(@Request() req: any) {
    return this.reportsService.getLeaseReport(req.workspaceId);
  }

  @Get('master-dashboard')
  @ApiOperation({ summary: '4-section master dashboard: Operations, Inventory, Leasing & Renewals, Financials' })
  getMasterDashboard(@Request() req: any, @Query('period') period?: string) {
    return this.reportsService.getMasterDashboard(req.workspaceId, period);
  }
}
