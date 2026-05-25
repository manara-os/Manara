import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole, WorkspaceStatus } from '@prisma/client';

@ApiTags('Admin (Platform)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLATFORM_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get platform-wide statistics' })
  getPlatformStats() {
    return this.adminService.getPlatformStats();
  }

  @Get('workspaces')
  @ApiOperation({ summary: 'List all workspaces' })
  listWorkspaces(@Query('status') status?: WorkspaceStatus, @Query('search') search?: string) {
    return this.adminService.listWorkspaces({ status, search });
  }

  @Post('workspaces')
  @ApiOperation({ summary: 'Create a new workspace (onboarding)' })
  createWorkspace(@Body() dto: any) {
    return this.adminService.createWorkspace(dto);
  }

  @Patch('workspaces/:id/status')
  @ApiOperation({ summary: 'Update workspace status (activate/suspend)' })
  updateWorkspaceStatus(@Param('id') id: string, @Body('status') status: WorkspaceStatus) {
    return this.adminService.updateWorkspaceStatus(id, status);
  }

  @Get('users')
  @ApiOperation({ summary: 'List all platform users' })
  listUsers(@Query('search') search?: string) {
    return this.adminService.listUsers({ search });
  }

  @Get('audit-log')
  @ApiOperation({ summary: 'Get platform audit log' })
  getAuditLog(@Query('workspaceId') workspaceId?: string, @Query('limit') limit?: string) {
    return this.adminService.getAuditLog(workspaceId, limit ? parseInt(limit, 10) : 50);
  }
}
