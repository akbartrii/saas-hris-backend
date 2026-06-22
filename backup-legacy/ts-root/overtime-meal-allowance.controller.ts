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
import { OvertimeMealAllowanceService } from './overtime-meal-allowance.service';
import { CreateOvertimeMealAllowanceDto } from './dto/create-overtime-meal-allowance.dto';
import { UpdateOvertimeMealAllowanceDto } from './dto/update-overtime-meal-allowance.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Overtime Meal Allowances')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('overtime-meal-allowances')
export class OvertimeMealAllowanceController {
  constructor(private readonly service: OvertimeMealAllowanceService) {}

  @Get()
  async list() {
    return this.service.list();
  }

  @Post()
  @Roles('hrd', 'admin', 'super_admin')
  async create(
    @CurrentUser('role') role: string,
    @Body() dto: CreateOvertimeMealAllowanceDto,
  ) {
    return this.service.create(role, dto);
  }

  @Patch(':id')
  @Roles('hrd', 'admin', 'super_admin')
  async update(
    @CurrentUser('role') role: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOvertimeMealAllowanceDto,
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
