import { Controller, Get, Post, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReceiptsService } from './receipts.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../../auth/guards/workspace.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Receipts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
@Controller('receipts')
export class ReceiptsController {
  constructor(private readonly service: ReceiptsService) {}

  @Get()
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS, UserRole.OWNER)
  findAll(@Request() req: any, @Query('ownerId') ownerId: string) {
    return this.service.findByOwner(req.workspaceId, ownerId);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.service.findOne(req.workspaceId, id);
  }

  @Post()
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  create(@Request() req: any, @Body() dto: any) {
    return this.service.create(req.workspaceId, dto);
  }

  @Post(':id/approve')
  @Roles(UserRole.OWNER, UserRole.PM_ADMIN)
  approve(@Request() req: any, @Param('id') id: string) {
    return this.service.approve(req.workspaceId, id, req.user.id);
  }

  @Post(':id/reject')
  @Roles(UserRole.OWNER, UserRole.PM_ADMIN)
  reject(@Request() req: any, @Param('id') id: string, @Body() body: { reason: string }) {
    return this.service.reject(req.workspaceId, id, body.reason);
  }

  @Post(':id/mark-paid')
  @Roles(UserRole.PM_ADMIN)
  markPaid(@Request() req: any, @Param('id') id: string) {
    return this.service.markPaid(req.workspaceId, id);
  }
}
