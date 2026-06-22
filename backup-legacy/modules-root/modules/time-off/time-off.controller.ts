import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Query,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TimeOffService } from './time-off.service';
import { CreateTimeOffDto } from './dto/create-time-off.dto';
import { ApproveTimeOffDto } from './dto/approve-time-off.dto';
import { ListTimeOffDto } from './dto/list-time-off.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Time Off')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('time-off')
export class TimeOffController {
  constructor(private readonly timeOffService: TimeOffService) {}

  @Post()
  async createTimeOff(
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: CreateTimeOffDto,
  ) {
    return this.timeOffService.createTimeOff(userId, role, dto);
  }

  @Get()
  async listTimeOffs(
    @CurrentUser('userId') userId: string,
    @Query() query: ListTimeOffDto,
  ) {
    return this.timeOffService.listTimeOffs(userId, query);
  }

  @Patch(':id/approve')
  @Roles('atasan', 'manager_hrga', 'admin', 'super_admin')
  async approveTimeOff(
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveTimeOffDto,
  ) {
    return this.timeOffService.approveTimeOff(userId, id, dto, role);
  }

  @Patch(':id/cancel')
  @Roles('karyawan', 'atasan', 'manager_hrga', 'hrd', 'admin', 'super_admin')
  async cancelTimeOff(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.timeOffService.cancelTimeOff(userId, id);
  }
}
