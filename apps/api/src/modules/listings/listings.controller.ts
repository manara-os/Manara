import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../../auth/guards/workspace.guard';
import { ListingsService } from './listings.service';
import { ListingPortal, ListingStatus } from '@prisma/client';

@ApiTags('Listings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard)
@Controller('listings')
export class ListingsController {
  constructor(private readonly service: ListingsService) {}

  @Get()
  @ApiOperation({ summary: 'List all property listings (Exclusive Leasing pipeline)' })
  findAll(
    @Request() req: any,
    @Query('status') status?: ListingStatus,
    @Query('portal') portal?: ListingPortal,
    @Query('propertyId') propertyId?: string,
  ) {
    return this.service.findAll(req.workspaceId, { status, portal, propertyId });
  }

  @Get('summary')
  @ApiOperation({ summary: 'Listing analytics summary' })
  summary(@Request() req: any) {
    return this.service.summary(req.workspaceId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one listing' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.service.findOne(req.workspaceId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a listing (draft)' })
  create(
    @Request() req: any,
    @Body() dto: { propertyId: string; unitId?: string; portal: ListingPortal; title?: string; askingRent?: number; listingUrl?: string },
  ) {
    return this.service.create(req.workspaceId, dto);
  }

  @Patch(':id/publish')
  @ApiOperation({ summary: 'Publish a draft listing to its portal' })
  publish(@Request() req: any, @Param('id') id: string) {
    return this.service.publish(req.workspaceId, id);
  }

  @Patch(':id/pause')
  @ApiOperation({ summary: 'Pause an active listing' })
  pause(@Request() req: any, @Param('id') id: string) {
    return this.service.pause(req.workspaceId, id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel / expire a listing' })
  cancel(@Request() req: any, @Param('id') id: string) {
    return this.service.cancel(req.workspaceId, id);
  }
}
