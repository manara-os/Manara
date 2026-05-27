import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TeamService } from './team.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../../auth/guards/workspace.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Team')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
@Controller('team')
export class TeamController {
  constructor(private readonly service: TeamService) {}

  @Get()
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS, UserRole.PLATFORM_ADMIN)
  list(@Request() req: any) {
    return this.service.list(req.workspaceId);
  }

  @Get('escalation-matrix')
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS, UserRole.PLATFORM_ADMIN)
  matrix(@Request() req: any) {
    return this.service.getEscalationMatrix(req.workspaceId);
  }
}
