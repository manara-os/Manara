import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../../auth/guards/workspace.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole, ReviewSource, ReviewSentiment } from '@prisma/client';

@ApiTags('Reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly service: ReviewsService) {}

  @Get()
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  findAll(
    @Request() req: any,
    @Query('source') source?: ReviewSource,
    @Query('sentiment') sentiment?: ReviewSentiment,
    @Query('responded') responded?: string,
  ) {
    return this.service.findAll(req.workspaceId, {
      source,
      sentiment,
      responded: responded === undefined ? undefined : responded === 'true',
    });
  }

  @Get('dashboard')
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  dashboard(@Request() req: any) {
    return this.service.getDashboard(req.workspaceId);
  }

  @Post()
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  create(@Request() req: any, @Body() dto: any) {
    return this.service.create(req.workspaceId, dto);
  }

  @Post(':id/respond')
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  respond(@Request() req: any, @Param('id') id: string, @Body() body: { response: string }) {
    return this.service.respond(req.workspaceId, id, req.user.id, body.response);
  }

  @Post(':id/ai-draft')
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  aiDraft(@Request() req: any, @Param('id') id: string) {
    return this.service.draftAiResponse(req.workspaceId, id);
  }
}
