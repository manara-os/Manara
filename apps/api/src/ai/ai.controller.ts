import { Controller, Post, Get, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiRentCallService } from './ai-rent-call.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../auth/guards/workspace.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiRentCallService: AiRentCallService) {}

  @Post('rent-call/:leaseId')
  @ApiOperation({ summary: 'Trigger AI rent follow-up call for overdue tenant' })
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  triggerRentCall(@Param('leaseId') leaseId: string, @Request() req: any) {
    return this.aiRentCallService.initiateRentCall(leaseId, req.workspaceId);
  }

  @Get('calls')
  @ApiOperation({ summary: 'List all AI call records' })
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  getCalls(@Request() req: any, @Query('leaseId') leaseId?: string) {
    return this.aiRentCallService.getCallHistory(req.workspaceId, leaseId);
  }
}
