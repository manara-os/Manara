import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NpsService } from './nps.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../../auth/guards/workspace.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('NPS')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
@Controller('nps')
export class NpsController {
  constructor(private readonly service: NpsService) {}

  @Get()
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  list(@Request() req: any, @Query('campaignName') campaignName?: string) {
    return this.service.list(req.workspaceId, campaignName);
  }

  @Post('dispatch')
  @Roles(UserRole.PM_ADMIN)
  dispatch(@Request() req: any, @Body() body: { campaignName?: string }) {
    return this.service.dispatchCampaign(req.workspaceId, body.campaignName ?? `NPS Q${Math.ceil((new Date().getMonth() + 1) / 3)}`);
  }

  @Post(':id/respond')
  respond(@Request() req: any, @Param('id') id: string, @Body() body: { score: number; comment?: string }) {
    return this.service.recordResponse(req.workspaceId, id, body.score, body.comment);
  }
}
