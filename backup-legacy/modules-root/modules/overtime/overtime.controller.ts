import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  ParseUUIDPipe,
  Headers,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OvertimeService } from './overtime.service';
import { CreateOvertimeDto } from './dto/create-overtime.dto';
import { ApproveOvertimeDto } from './dto/approve-overtime.dto';
import { ListOvertimeDto } from './dto/list-overtime.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Overtime')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('overtime')
export class OvertimeController {
  constructor(private readonly overtimeService: OvertimeService) {}

  @Post()
  @Roles('karyawan', 'atasan', 'manager_hrga', 'admin', 'super_admin')
  async createOvertime(
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: string,
    @Headers('x-salary-keycode') keycode: string | undefined,
    @Body() dto: CreateOvertimeDto,
  ) {
    return this.overtimeService.createOvertime(userId, dto, role, keycode);
  }

  @Patch(':id/cancel')
  @Roles('karyawan', 'atasan', 'manager_hrga', 'hrd', 'admin', 'super_admin')
  async cancelOvertime(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.overtimeService.cancelOvertime(userId, id);
  }

  @Get()
  async listOvertimes(
    @CurrentUser('userId') userId: string,
    @Query() query: ListOvertimeDto,
  ) {
    return this.overtimeService.listOvertimes(userId, query);
  }

  @Get('subordinates')
  @Roles('atasan', 'manager_hrga', 'admin', 'super_admin')
  async listSubordinateOvertimes(
    @CurrentUser('userId') userId: string,
    @Query() query: ListOvertimeDto,
  ) {
    return this.overtimeService.listSubordinateOvertimes(userId, query);
  }

  @Get('summary')
  @Roles('manager_hrga', 'hrd', 'admin', 'super_admin')
  async getSummary(
    @CurrentUser('userId') userId: string,
    @Query('month') month?: string,
  ) {
    return this.overtimeService.getOvertimeSummary(userId, month);
  }

  @Patch(':id/approve')
  @Roles('atasan', 'manager_hrga', 'admin', 'super_admin')
  async approveOvertime(
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveOvertimeDto,
  ) {
    return this.overtimeService.approveOvertime(userId, id, dto, role);
  }

  @Patch(':id/process')
  @Roles('hrd', 'admin', 'super_admin')
  async processOvertime(
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: string,
    @Headers('x-salary-keycode') keycode: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveOvertimeDto,
  ) {
    return this.overtimeService.processOvertime(userId, id, dto, role, keycode);
  }

  @Get('detail/:overtimeid')
  async getOvertimeDetail(
    @CurrentUser('userId') userId: string,
    @Param('overtimeid', ParseUUIDPipe) overtimeid: string,
  ) {
    return this.overtimeService.getOvertimeDetail(userId, overtimeid);
  }

  @Delete(':id')
  @Roles('admin', 'super_admin')
  async deleteOvertime(
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.overtimeService.deleteOvertime(userId, id, role);
  }
}
