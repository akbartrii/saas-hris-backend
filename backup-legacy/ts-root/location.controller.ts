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
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LocationService } from './location.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { ListLocationDto } from './dto/list-location.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Locations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('locations')
export class LocationController {
  constructor(private readonly service: LocationService) {}

  @Get()
  async list(
    @CurrentUser('userId') userId: string,
    @Query() query: ListLocationDto,
  ) {
    return this.service.list(userId, query);
  }

  @Get('assigned')
  async getAssignedLocations(@CurrentUser('userId') userId: string) {
    return this.service.getAssignedLocations(userId);
  }

  @Post()
  @Roles('manager_hrga', 'hrd', 'admin', 'super_admin')
  async create(
    @CurrentUser('role') role: string,
    @Body() dto: CreateLocationDto,
  ) {
    return this.service.create(role, dto);
  }

  @Patch(':id')
  @Roles('manager_hrga', 'hrd', 'admin', 'super_admin')
  async update(
    @CurrentUser('role') role: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.service.update(role, id, dto);
  }

  @Delete(':id')
  @Roles('manager_hrga', 'hrd', 'admin', 'super_admin')
  async delete(
    @CurrentUser('role') role: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.delete(role, id);
  }
}
