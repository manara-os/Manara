import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RoiService } from './roi.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../../auth/guards/workspace.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('ROI Simulator')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
@Controller('roi')
export class RoiController {
  constructor(private readonly service: RoiService) {}

  @Get('scenarios')
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS, UserRole.OWNER)
  scenarios(@Request() req: any) {
    return this.service.listScenarios(req.workspaceId);
  }

  @Post('simulate')
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS, UserRole.OWNER)
  simulate(@Body() body: any) {
    return this.service.simulate(body);
  }
}
