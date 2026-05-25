import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UnitsService } from './units.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../../auth/guards/workspace.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole, OccupancyStatus } from '@prisma/client';

@ApiTags('Units')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
@Controller('units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Get()
  @ApiOperation({ summary: 'List all units' })
  @ApiQuery({ name: 'propertyId', required: false })
  @ApiQuery({ name: 'occupancyStatus', required: false, enum: OccupancyStatus })
  findAll(
    @Request() req: any,
    @Query('propertyId') propertyId?: string,
    @Query('occupancyStatus') occupancyStatus?: OccupancyStatus,
    @Query('type') type?: string,
  ) {
    return this.unitsService.findAll(req.workspaceId, { propertyId, occupancyStatus, type });
  }

  @Get('vacant')
  @ApiOperation({ summary: 'Get all vacant units' })
  getVacant(@Request() req: any) {
    return this.unitsService.getVacantUnits(req.workspaceId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get unit details' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.unitsService.findOne(req.workspaceId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new unit' })
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  create(@Request() req: any, @Body() dto: any) {
    return this.unitsService.create(req.workspaceId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update unit details' })
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  update(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.unitsService.update(req.workspaceId, id, dto);
  }
}
