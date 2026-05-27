import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BidsService } from './bids.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../../auth/guards/workspace.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Ticket Bids')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
@Controller('bids')
export class BidsController {
  constructor(private readonly service: BidsService) {}

  @Get('ticket/:ticketId')
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS, UserRole.VENDOR)
  list(@Request() req: any, @Param('ticketId') ticketId: string) {
    return this.service.listForTicket(req.workspaceId, ticketId);
  }

  @Post('ticket/:ticketId')
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS, UserRole.VENDOR)
  submit(@Request() req: any, @Param('ticketId') ticketId: string, @Body() dto: any) {
    return this.service.submit(req.workspaceId, ticketId, dto);
  }

  @Post(':bidId/accept')
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  accept(@Request() req: any, @Param('bidId') bidId: string) {
    return this.service.accept(req.workspaceId, bidId);
  }

  @Post(':bidId/reject')
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  reject(@Request() req: any, @Param('bidId') bidId: string) {
    return this.service.reject(req.workspaceId, bidId);
  }

  @Post(':bidId/withdraw')
  @Roles(UserRole.VENDOR)
  withdraw(@Request() req: any, @Param('bidId') bidId: string) {
    return this.service.withdraw(req.workspaceId, bidId);
  }
}
