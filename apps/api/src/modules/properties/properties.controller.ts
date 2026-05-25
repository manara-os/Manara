import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { PropertyQueryDto } from './dto/property-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { WorkspaceGuard } from '../../auth/guards/workspace.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Properties')
@ApiBearerAuth('JWT-Auth')
@UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
@Controller('properties')
export class PropertiesController {
  constructor(private propertiesService: PropertiesService) {}

  @Get()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.PM_ADMIN, UserRole.PM_OPS, UserRole.OWNER)
  @ApiOperation({ summary: 'List all properties in workspace' })
  findAll(@CurrentUser() user: any, @Query() query: PropertyQueryDto) {
    return this.propertiesService.findAll(user.workspaceId, query);
  }

  @Get('vacancy')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.PM_ADMIN, UserRole.PM_OPS, UserRole.OWNER)
  @ApiOperation({ summary: 'Get vacancy report across all properties' })
  getVacancy(@CurrentUser() user: any, @Query('propertyId') propertyId?: string) {
    return this.propertiesService.getVacancyReport(user.workspaceId, propertyId);
  }

  @Get(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.PM_ADMIN, UserRole.PM_OPS, UserRole.OWNER)
  @ApiOperation({ summary: 'Get property detail with units' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  findOne(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.propertiesService.findOne(user.workspaceId, id);
  }

  @Post()
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  @ApiOperation({ summary: 'Create a new property' })
  create(@CurrentUser() user: any, @Body() dto: CreatePropertyDto) {
    return this.propertiesService.create(user.workspaceId, dto, user.sub);
  }

  @Patch(':id')
  @Roles(UserRole.PM_ADMIN, UserRole.PM_OPS)
  @ApiOperation({ summary: 'Update property details' })
  update(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePropertyDto,
  ) {
    return this.propertiesService.update(user.workspaceId, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.PM_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a property' })
  delete(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.propertiesService.delete(user.workspaceId, id);
  }
}
