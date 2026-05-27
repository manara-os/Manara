import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../../auth/guards/workspace.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole, ChequeStatus } from '@prisma/client';

@ApiTags('Finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get financial dashboard summary' })
  getSummary(@Request() req: any) {
    return this.financeService.getDashboardSummary(req.workspaceId);
  }

  @Get('collections')
  @ApiOperation({ summary: 'List rent collections' })
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  getCollections(@Request() req: any, @Query('leaseId') leaseId?: string) {
    return this.financeService.getCollections(req.workspaceId, { leaseId });
  }

  @Post('collections')
  @ApiOperation({ summary: 'Record a rent payment' })
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  recordCollection(@Request() req: any, @Body() dto: any) {
    return this.financeService.recordCollection(req.workspaceId, dto);
  }

  @Get('cheques')
  @ApiOperation({ summary: 'List PDC cheques' })
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  getCheques(
    @Request() req: any,
    @Query('leaseId') leaseId?: string,
    @Query('status') status?: ChequeStatus,
  ) {
    return this.financeService.getCheques(req.workspaceId, { leaseId, status });
  }

  @Patch('cheques/:id/status')
  @ApiOperation({ summary: 'Update PDC cheque status (cleared, bounced, cancelled)' })
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  updateChequeStatus(
    @Param('id') id: string,
    @Body('status') status: ChequeStatus,
    @Body('bouncedReason') bouncedReason?: string,
  ) {
    return this.financeService.updateChequeStatus(id, status, bouncedReason);
  }

  @Get('overdue')
  @ApiOperation({ summary: 'Get all overdue rent cheques' })
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  getOverdue(@Request() req: any) {
    return this.financeService.getOverdueRent(req.workspaceId);
  }

  @Get('expenses')
  @ApiOperation({ summary: 'List property expenses' })
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS, UserRole.OWNER)
  getExpenses(
    @Request() req: any,
    @Query('propertyId') propertyId?: string,
    @Query('unitId') unitId?: string,
  ) {
    return this.financeService.getExpenses(req.workspaceId, { propertyId, unitId });
  }

  @Post('expenses')
  @ApiOperation({ summary: 'Record a property expense' })
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  createExpense(@Request() req: any, @Body() dto: any) {
    return this.financeService.createExpense(req.workspaceId, dto);
  }

  @Get('owner-soa/:ownerId')
  @ApiOperation({ summary: 'Get owner statement of account for a period (YYYY-MM)' })
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS, UserRole.OWNER)
  getOwnerSoa(
    @Request() req: any,
    @Param('ownerId') ownerId: string,
    @Query('period') period: string,
  ) {
    return this.financeService.getOwnerSoa(req.workspaceId, ownerId, period ?? `${new Date().getFullYear()}-${new Date().getMonth() + 1}`);
  }

  @Get('commissions')
  @ApiOperation({ summary: 'List commissions' })
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  listCommissions(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('leaseId') leaseId?: string,
  ) {
    return this.financeService.listCommissions(req.workspaceId, { status, leaseId });
  }

  // ─── Accounting upgrade ────────────────────────────────────────────

  @Get('chart-of-accounts')
  @ApiOperation({ summary: 'UAE PM chart of accounts with live balances' })
  @Roles(UserRole.PM_ADMIN)
  getChartOfAccounts(@Request() req: any) {
    return this.financeService.getChartOfAccounts(req.workspaceId);
  }

  @Get('journal-entries')
  @ApiOperation({ summary: 'General ledger journal entries (synthesised from collections + expenses)' })
  @Roles(UserRole.PM_ADMIN)
  getJournalEntries(@Request() req: any, @Query('limit') limit?: string) {
    return this.financeService.getJournalEntries(req.workspaceId, limit ? parseInt(limit, 10) : 50);
  }

  @Get('trust-accounts')
  @ApiOperation({ summary: 'Owner trust account balances — segregated PM-side trust accounting' })
  @Roles(UserRole.PM_ADMIN)
  getTrustAccounts(@Request() req: any) {
    return this.financeService.getTrustAccounts(req.workspaceId);
  }

  @Get('vat-report')
  @ApiOperation({ summary: 'UAE 5% VAT quarterly report with TRN' })
  @Roles(UserRole.PM_ADMIN)
  getVatReport(
    @Request() req: any,
    @Query('year') year?: string,
    @Query('quarter') quarter?: string,
  ) {
    const y = parseInt(year ?? String(new Date().getFullYear()), 10);
    const q = quarter ? parseInt(quarter, 10) : undefined;
    return this.financeService.getVatReport(req.workspaceId, y, q);
  }
}
