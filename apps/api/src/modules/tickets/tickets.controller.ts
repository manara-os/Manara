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
  findAll(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('category') category?: TicketCategory,
    @Query('priority') priority?: TicketPriority,
    @Query('unitId') unitId?: string,
    @Query('propertyId') propertyId?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ticketsService.findAll(req.workspaceId, {
      status, category, priority, unitId, propertyId, search,
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
  create(@Request() req: any, @Body() dto: any) {
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
