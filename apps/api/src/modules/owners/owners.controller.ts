import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OwnersService } from './owners.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../../auth/guards/workspace.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Owners')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
@Controller('owners')
export class OwnersController {
  constructor(private readonly ownersService: OwnersService) {}

  @Get()
  @ApiOperation({ summary: 'List all property owners' })
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  findAll(@Request() req: any, @Query('search') search?: string, @Query('kycVerified') kycVerified?: string) {
    return this.ownersService.findAll(req.workspaceId, {
      search,
      kycVerified: kycVerified !== undefined ? kycVerified === 'true' : undefined,
    });
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current owner profile (for mobile owner app)' })
  findMe(@Request() req: any) {
    return this.ownersService.findMe(req.workspaceId, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get owner profile' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.ownersService.findOne(req.workspaceId, id);
  }

  @Get(':id/portfolio')
  @ApiOperation({ summary: 'Get owner property portfolio with stats' })
  getPortfolio(@Request() req: any, @Param('id') id: string) {
    return this.ownersService.getPortfolio(req.workspaceId, id);
  }

  @Get(':id/investor-dashboard')
  @ApiOperation({ summary: 'Investor dashboard with real trailing-12 P&L, YoY, NOI per property, occupancy heat' })
  getInvestorDashboard(@Request() req: any, @Param('id') id: string) {
    return this.ownersService.getInvestorDashboard(req.workspaceId, id);
  }

  @Get(':id/market-intel')
  @ApiOperation({ summary: 'Per-unit vs-RERA-index pricing + workspace peer comparables' })
  getMarketIntel(@Request() req: any, @Param('id') id: string) {
    return this.ownersService.getMarketIntel(req.workspaceId, id);
  }

  @Get(':id/statement')
  @ApiOperation({ summary: 'Get owner income statement for a date range' })
  getStatement(
    @Request() req: any,
    @Param('id') id: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : new Date();
    return this.ownersService.getStatement(req.workspaceId, id, start, end);
  }

  @Post()
  @ApiOperation({ summary: 'Create an owner profile' })
  @Roles(UserRole.PM_ADMIN)
  create(@Request() req: any, @Body() dto: any) {
    return this.ownersService.create(req.workspaceId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update owner profile' })
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  update(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.ownersService.update(req.workspaceId, id, dto);
  }

  @Post(':id/verify-kyc')
  @ApiOperation({ summary: 'Mark owner KYC as verified' })
  @Roles(UserRole.PM_ADMIN)
  verifyKyc(@Request() req: any, @Param('id') id: string) {
    return this.ownersService.verifyKyc(req.workspaceId, id);
  }

  @Patch(':id/pma-status')
  @ApiOperation({ summary: 'Update PMA status for an owner' })
  @Roles(UserRole.PM_ADMIN)
  updatePmaStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: { status: 'ACTIVE' | 'PENDING_RENEWAL' | 'TERMINATED' },
  ) {
    return this.ownersService.updatePmaStatus(req.workspaceId, id, dto.status);
  }

  @Post(':id/pma-renewal')
  @ApiOperation({ summary: 'Trigger PMA renewal alert for an owner' })
  @Roles(UserRole.PM_ADMIN)
  triggerPmaRenewal(@Request() req: any, @Param('id') id: string) {
    return this.ownersService.triggerPmaRenewal(req.workspaceId, id);
  }
}
