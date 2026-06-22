import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReimbursementService } from './reimbursement.service';
import { CreateReimbursementDto } from './dto/create-reimbursement.dto';
import { ListReimbursementDto } from './dto/list-reimbursement.dto';
import { ApproveReimbursementDto } from './dto/approve-reimbursement.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Reimbursements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reimbursements')
export class ReimbursementController {
  constructor(private readonly service: ReimbursementService) {}

  @Get()
  async list(
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: string,
    @Query() query: ListReimbursementDto,
  ) {
    return this.service.list(userId, role, query);
  }

  @Get('subordinates')
  @Roles('atasan', 'manager_hrga', 'admin', 'super_admin')
  async listSubordinates(
    @CurrentUser('userId') userId: string,
    @Query() query: ListReimbursementDto,
  ) {
    return this.service.listSubordinateReimbursements(userId, query);
  }

  @Post()
  async create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateReimbursementDto,
  ) {
    return this.service.create(userId, dto);
  }

  @Patch(':id/approve')
  @Roles('atasan', 'manager_hrga', 'admin', 'super_admin')
  async approve(
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveReimbursementDto,
  ) {
    return this.service.approve(userId, role, id, dto);
  }
}
