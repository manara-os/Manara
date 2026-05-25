import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../../auth/guards/workspace.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole, DocumentType } from '@prisma/client';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'List documents' })
  findAll(
    @Request() req: any,
    @Query('type') type?: DocumentType,
    @Query('leaseId') leaseId?: string,
    @Query('tenantId') tenantId?: string,
    @Query('ownerId') ownerId?: string,
  ) {
    return this.documentsService.findAll(req.workspaceId, { type, leaseId, tenantId, ownerId });
  }

  @Get('expiring')
  @ApiOperation({ summary: 'Get documents expiring within N days' })
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  getExpiring(@Request() req: any, @Query('days') days = '30') {
    return this.documentsService.getExpiring(req.workspaceId, parseInt(days, 10));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document details' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.documentsService.findOne(req.workspaceId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create document record after S3 upload' })
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  create(@Request() req: any, @Body() dto: any) {
    return this.documentsService.create(req.workspaceId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a document' })
  @Roles(UserRole.PM_ADMIN)
  delete(@Request() req: any, @Param('id') id: string) {
    return this.documentsService.delete(req.workspaceId, id);
  }
}
