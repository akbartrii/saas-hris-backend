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
import { LeaveTypeService } from './leave-type.service';
import { CreateLeaveTypeDto } from './dto/create-leave-type.dto';
import { UpdateLeaveTypeDto } from './dto/update-leave-type.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Leave Types')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leave-types')
export class LeaveTypeController {
  constructor(private readonly service: LeaveTypeService) {}

  @Get()
  async list() {
    return this.service.list();
  }

  @Post()
  @Roles('hrd', 'admin', 'super_admin')
  async create(
    @CurrentUser('role') role: string,
    @Body() dto: CreateLeaveTypeDto,
  ) {
    return this.service.create(role, dto);
  }

  @Patch(':id')
  @Roles('hrd', 'admin', 'super_admin')
  async update(
    @CurrentUser('role') role: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeaveTypeDto,
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
