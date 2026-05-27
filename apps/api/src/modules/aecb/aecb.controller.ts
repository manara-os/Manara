import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AecbService } from './aecb.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../../auth/guards/workspace.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('AECB Credit Reporting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
@Controller('aecb')
export class AecbController {
  constructor(private readonly service: AecbService) {}

  @Get('tenants/:tenantId')
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS, UserRole.TENANT)
  history(@Request() req: any, @Param('tenantId') tenantId: string) {
    return this.service.getTenantHistory(req.workspaceId, tenantId);
  }

  @Post('tenants/:tenantId/opt-in')
  @Roles(UserRole.TENANT, UserRole.PM_ADMIN)
  optIn(@Request() req: any, @Param('tenantId') tenantId: string, @Body() body: { optIn: boolean }) {
    return this.service.setOptIn(req.workspaceId, tenantId, body.optIn);
  }

  @Post('queue-monthly')
  @Roles(UserRole.PM_ADMIN)
  queueMonthly(@Request() req: any, @Body() body: { month?: string }) {
    const month = body.month ? new Date(body.month) : new Date(Date.now() - 30 * 86_400_000);
    return this.service.queueMonthlyReports(req.workspaceId, month);
  }
}
