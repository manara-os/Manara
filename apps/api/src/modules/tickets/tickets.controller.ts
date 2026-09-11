import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../../auth/guards/workspace.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole, TicketStatus, TicketCategory, TicketPriority } from '@prisma/client';

@ApiTags('Tickets (Happy Code)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  @ApiOperation({ summary: 'List all maintenance tickets' })
  @ApiQuery({ name: 'status', required: false, enum: TicketStatus })
  @ApiQuery({ name: 'category', required: false, enum: TicketCategory })
  @ApiQuery({ name: 'priority', required: false, enum: TicketPriority })
  @ApiQuery({ name: 'assignedToMe', required: false, description: 'Scope to the calling vendor\'s own tickets' })
  async findAll(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('category') category?: TicketCategory,
    @Query('priority') priority?: TicketPriority,
    @Query('unitId') unitId?: string,
    @Query('propertyId') propertyId?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('assignedToMe') assignedToMe?: string,
  ) {
    // `assignedToMe` was previously accepted and silently ignored — every
    // vendor calling it got every ticket in the workspace, not just their
    // own. Resolving the vendor id from the JWT (rather than trusting one
    // supplied by the client) is what makes this safe to scope by.
    let assignedVendorId: string | undefined;
    if (assignedToMe === 'true') {
      const vendor = await this.ticketsService.resolveVendorIdForUser(req.workspaceId, req.user.id);
      assignedVendorId = vendor.id;
    }
    // This endpoint has no @Roles restriction, so a TENANT can reach it too
    // — unscoped, that returned every maintenance ticket in the workspace
    // (other tenants' unit issues included), not just their own.
    let raisedByTenantId: string | undefined;
    if (req.user.role === 'TENANT') {
      const tenant = await this.ticketsService.resolveTenantIdForUser(req.workspaceId, req.user.id);
      raisedByTenantId = tenant.id;
    }
    return this.ticketsService.findAll(req.workspaceId, {
      status, category, priority, unitId, propertyId, search, assignedVendorId, raisedByTenantId,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('board')
  @ApiOperation({ summary: 'Get tickets as Kanban board grouped by status' })
  getBoard(@Request() req: any) {
    return this.ticketsService.getKanbanBoard(req.workspaceId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ticket details' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.ticketsService.findOne(req.workspaceId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new maintenance ticket' })
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS, UserRole.TENANT)
  async create(@Request() req: any, @Body() dto: any) {
    // For a TENANT caller, always force raisedByTenantId from the JWT rather
    // than trusting the body — otherwise a tenant could attribute a ticket
    // to a different tenant's id. If unitId is also omitted (the tenant app
    // only has one active unit and shouldn't need to know its id), resolve
    // it from their own active lease.
    if (req.user.role === 'TENANT') {
      const tenant = await this.ticketsService.resolveTenantIdForUser(req.workspaceId, req.user.id);
      dto = { ...dto, raisedByTenantId: tenant.id };
      if (!dto.unitId) {
        dto.unitId = await this.ticketsService.resolveActiveUnitIdForTenant(req.workspaceId, tenant.id);
      }
    }
    return this.ticketsService.create(req.workspaceId, dto);
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign ticket to vendor' })
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  assign(@Request() req: any, @Param('id') id: string, @Body('vendorId') vendorId: string) {
    return this.ticketsService.assign(req.workspaceId, id, vendorId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update ticket status' })
  updateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body('status') status: TicketStatus,
    @Body('note') note?: string,
  ) {
    return this.ticketsService.updateStatus(req.workspaceId, id, status, note);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update ticket details' })
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  update(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.ticketsService.update(req.workspaceId, id, dto);
  }
}
