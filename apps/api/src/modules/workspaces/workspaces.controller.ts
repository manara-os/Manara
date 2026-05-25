import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WorkspacesService } from './workspaces.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../../auth/guards/workspace.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '@prisma/client';

@ApiTags('Workspaces')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get('current')
  @ApiOperation({ summary: 'Get current workspace' })
  getCurrent(@Request() req: any) {
    return this.workspacesService.findById(req.workspaceId);
  }

  @Get('current/stats')
  @ApiOperation({ summary: 'Get workspace statistics' })
  getStats(@Request() req: any) {
    return this.workspacesService.getStats(req.workspaceId);
  }

  @Get('current/members')
  @ApiOperation({ summary: 'List workspace members' })
  @Roles(UserRole.PM_ADMIN)
  getMembers(@Request() req: any) {
    return this.workspacesService.getMembers(req.workspaceId);
  }

  @Patch('current')
  @ApiOperation({ summary: 'Update workspace settings' })
  @Roles(UserRole.PM_ADMIN)
  update(@Request() req: any, @Body() dto: any) {
    return this.workspacesService.update(req.workspaceId, dto);
  }

  @Delete('current/members/:userId')
  @ApiOperation({ summary: 'Remove workspace member' })
  @Roles(UserRole.PM_ADMIN)
  removeMember(@Request() req: any, @Param('userId') userId: string) {
    return this.workspacesService.removeMember(req.workspaceId, userId);
  }
}
