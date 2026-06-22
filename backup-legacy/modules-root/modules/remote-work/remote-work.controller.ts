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
  Header,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RemoteWorkService } from './remote-work.service';
import { CreateRemoteWorkDto } from './dto/create-remote-work.dto';
import { ListRemoteWorkDto } from './dto/list-remote-work.dto';
import { ApproveRemoteWorkDto } from './dto/approve-remote-work.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Remote Work')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('remote-work')
export class RemoteWorkController {
  constructor(private readonly service: RemoteWorkService) {}

  @Get()
  async list(
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: string,
    @Query() query: ListRemoteWorkDto,
  ) {
    return this.service.list(userId, role, query);
  }

  @Get('subordinates')
  @Header(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, proxy-revalidate',
  )
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  async listSubordinates(
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: string,
    @Query() query: ListRemoteWorkDto,
  ) {
    return this.service.listSubordinates(userId, role, query);
  }

  @Post()
  async create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateRemoteWorkDto,
  ) {
    return this.service.create(userId, dto);
  }

  @Patch(':id/approve')
  async approve(
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveRemoteWorkDto,
  ) {
    return this.service.approve(userId, role, id, dto);
  }

  @Patch(':id/cancel')
  async cancel(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason?: string,
  ) {
    return this.service.cancel(userId, id, reason);
  }
}
