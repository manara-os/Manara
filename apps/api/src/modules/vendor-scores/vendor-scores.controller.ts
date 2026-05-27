import { Controller, Get, Post, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { VendorScoresService } from './vendor-scores.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../../auth/guards/workspace.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Vendor Scores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
@Controller('vendor-scores')
export class VendorScoresController {
  constructor(private readonly service: VendorScoresService) {}

  @Get('leaderboard')
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  leaderboard(@Request() req: any, @Query('period') period?: '30D' | '90D' | 'YTD') {
    return this.service.leaderboard(req.workspaceId, period ?? '90D');
  }

  @Post('recompute')
  @Roles(UserRole.PM_ADMIN)
  recompute(@Request() req: any) {
    return this.service.recompute(req.workspaceId, new Date(Date.now() - 90 * 86_400_000));
  }
}
