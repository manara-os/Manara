import { Controller, Post, Get, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiRentCallService } from './ai-rent-call.service';
import { AiIntelligenceService } from './ai-intelligence.service';
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
  constructor(
    private readonly aiRentCallService: AiRentCallService,
    private readonly ai: AiIntelligenceService,
  ) {}

  @Post('rent-call/:leaseId')
  @ApiOperation({ summary: 'Trigger AI rent follow-up call for overdue tenant (legacy)' })
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

  // ── Unified AI Calling ─────────────────────────────────────────────

  @Post('call')
  @ApiOperation({ summary: 'Initiate an AI call to a tenant, owner, or vendor with purpose context' })
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  initiateCall(
    @Request() req: any,
    @Body() dto: { recipientType: 'tenant' | 'owner' | 'vendor'; recipientId: string; purpose: any; contextNote?: string },
  ) {
    return this.ai.initiateCall(req.workspaceId, req.user.id, dto);
  }

  @Get('call-history')
  @ApiOperation({ summary: 'Unified AI call history with filters' })
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  callHistory(
    @Request() req: any,
    @Query('recipientType') recipientType?: 'tenant' | 'owner' | 'vendor',
    @Query('recipientId') recipientId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ai.listCalls(req.workspaceId, {
      recipientType, recipientId, limit: limit ? parseInt(limit, 10) : 25,
    });
  }

  // ── AI Reports ─────────────────────────────────────────────────────

  @Get('reports/:persona')
  @ApiOperation({ summary: 'Generate persona-tailored AI intelligence report' })
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS, UserRole.OWNER, UserRole.TENANT, UserRole.VENDOR)
  getReport(
    @Request() req: any,
    @Param('persona') persona: any,
    @Query('entityId') entityId?: string,
  ) {
    return this.ai.generateReport(req.workspaceId, persona, entityId);
  }

  // ── AI Suggestions ─────────────────────────────────────────────────

  @Get('suggestions')
  @ApiOperation({ summary: 'Get contextual AI suggestions for a given surface (dashboard / property / owner / tenant / ticket)' })
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  getSuggestions(
    @Request() req: any,
    @Query('surface') surface: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.ai.getSuggestions(req.workspaceId, { surface, entityId });
  }
}
