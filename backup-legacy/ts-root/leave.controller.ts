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
import { LeaveService } from './leave.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { ApproveLeaveDto } from './dto/approve-leave.dto';
import { ListLeaveDto } from './dto/list-leave.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Leave')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leave')
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post()
  async createLeave(
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: CreateLeaveDto,
  ) {
    return this.leaveService.createLeave(userId, role, dto);
  }

  @Get('balance')
  async getLeaveBalance(@CurrentUser('userId') userId: string) {
    return this.leaveService.getLeaveBalance(userId);
  }

  @Get()
  async listLeaves(
    @CurrentUser('userId') userId: string,
    @Query() query: ListLeaveDto,
  ) {
    return this.leaveService.listLeaves(userId, query);
  }

  @Get('subordinates')
  @Roles('atasan', 'manager_hrga', 'admin', 'super_admin')
  async listSubordinateLeaves(
    @CurrentUser('userId') userId: string,
    @Query() query: ListLeaveDto,
  ) {
    return this.leaveService.listSubordinateLeaves(userId, query);
  }

  @Patch(':id/approve')
  @Roles('atasan', 'manager_hrga', 'admin', 'super_admin')
  async approveLeave(
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveLeaveDto,
  ) {
    return this.leaveService.approveLeave(userId, id, dto, role);
  }

  @Patch(':id/cancel')
  @Roles('karyawan', 'atasan', 'manager_hrga', 'hrd', 'admin', 'super_admin')
  async cancelLeave(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leaveService.cancelLeave(userId, id);
  }
}
