import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { WhatsAppService } from './whatsapp.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../../auth/guards/workspace.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('WhatsApp Messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly service: WhatsAppService) {}

  @Get('thread')
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS, UserRole.OWNER, UserRole.TENANT, UserRole.VENDOR)
  thread(
    @Request() req: any,
    @Query('recipientType') recipientType: 'tenant' | 'owner' | 'vendor',
    @Query('recipientId') recipientId: string,
  ) {
    return this.service.listThread(req.workspaceId, recipientType, recipientId);
  }

  @Post('send')
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  send(@Request() req: any, @Body() dto: any) {
    return this.service.send(req.workspaceId, dto);
  }

  @Post(':id/read')
  markRead(@Request() req: any, @Param('id') id: string) {
    return this.service.markRead(req.workspaceId, id);
  }
}
