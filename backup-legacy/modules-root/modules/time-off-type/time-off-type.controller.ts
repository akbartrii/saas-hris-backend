import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TimeOffTypeService } from './time-off-type.service';
import { CreateTimeOffTypeDto } from './dto/create-time-off-type.dto';
import { UpdateTimeOffTypeDto } from './dto/update-time-off-type.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Time Off Types')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('time-off-types')
export class TimeOffTypeController {
  constructor(private readonly service: TimeOffTypeService) {}

  @Get()
  async list() {
    return this.service.list();
  }

  @Post()
  @Roles('hrd', 'admin', 'super_admin')
  async create(
    @CurrentUser('role') role: string,
    @Body() dto: CreateTimeOffTypeDto,
  ) {
    return this.service.create(role, dto);
  }

  @Patch(':id')
  @Roles('hrd', 'admin', 'super_admin')
  async update(
    @CurrentUser('role') role: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTimeOffTypeDto,
  ) {
    return this.service.update(role, id, dto);
  }

  @Delete(':id')
  @Roles('hrd', 'admin', 'super_admin')
  async delete(
    @CurrentUser('role') role: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.delete(role, id);
  }
}
