import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../../auth/guards/workspace.guard';
import { CommunicationsService, SendMessageDto } from './communications.service';

@ApiTags('Communications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard)
@Controller('communications')
export class CommunicationsController {
  constructor(private readonly service: CommunicationsService) {}

  @Post('send')
  @ApiOperation({ summary: 'Send a WhatsApp / Email / SMS to a tenant, owner, or vendor' })
  send(@Request() req: any, @Body() dto: SendMessageDto) {
    return this.service.send(req.workspaceId, req.user.id, dto);
  }

  @Post('send-bulk')
  @ApiOperation({ summary: 'Bulk send to multiple recipients (e.g. WhatsApp blast to overdue tenants)' })
  sendBulk(
    @Request() req: any,
    @Body() dto: {
      channel: SendMessageDto['channel'];
      template: string;
      recipientIds: string[];
      recipientType: 'tenant' | 'owner' | 'vendor';
      data?: Record<string, any>;
    },
  ) {
    return this.service.sendBulk(req.workspaceId, req.user.id, dto);
  }

  @Get('history')
  @ApiOperation({ summary: 'Recent outbound messages (optionally filtered by tenant, owner, channel)' })
  history(
    @Request() req: any,
    @Query('tenantId') tenantId?: string,
    @Query('ownerId') ownerId?: string,
    @Query('channel') channel?: any,
    @Query('limit') limit?: string,
  ) {
    return this.service.history(req.workspaceId, {
      tenantId,
      ownerId,
      channel,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }
}
