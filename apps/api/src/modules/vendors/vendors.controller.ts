import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VendorsService } from './vendors.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../../auth/guards/workspace.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole, VendorStatus, TicketCategory } from '@prisma/client';

@ApiTags('Vendors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get()
  @ApiOperation({ summary: 'List all vendors' })
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  findAll(
    @Request() req: any,
    @Query('status') status?: VendorStatus,
    @Query('category') category?: TicketCategory,
    @Query('search') search?: string,
  ) {
    return this.vendorsService.findAll(req.workspaceId, { status, category, search });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vendor details' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.vendorsService.findOne(req.workspaceId, id);
  }

  @Get(':id/performance')
  @ApiOperation({ summary: 'Get vendor performance metrics' })
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  getPerformance(@Request() req: any, @Param('id') id: string) {
    return this.vendorsService.getPerformance(req.workspaceId, id);
  }

  @Get(':id/wallet')
  @ApiOperation({ summary: 'Vendor wallet — real earnings from ticket invoices, weekly trend, next payout' })
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS, UserRole.VENDOR)
  getWallet(@Request() req: any, @Param('id') id: string) {
    return this.vendorsService.getWallet(req.workspaceId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Add a new vendor' })
  @Roles(UserRole.PM_ADMIN)
  create(@Request() req: any, @Body() dto: any) {
    return this.vendorsService.create(req.workspaceId, dto);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a vendor' })
  @Roles(UserRole.PM_ADMIN)
  approve(@Request() req: any, @Param('id') id: string) {
    return this.vendorsService.approve(req.workspaceId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update vendor profile' })
  @Roles(UserRole.PM_ADMIN)
  update(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.vendorsService.update(req.workspaceId, id, dto);
  }
}
