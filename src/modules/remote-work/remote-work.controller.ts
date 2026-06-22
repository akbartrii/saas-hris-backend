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
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RemoteWorkService } from "./remote-work.service";
import { CreateRemoteWorkDto } from "./dto/create-remote-work.dto";
import { ListRemoteWorkDto } from "./dto/list-remote-work.dto";
import { ApproveRemoteWorkDto } from "./dto/approve-remote-work.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { CompanyContext } from "../../common/decorators/company-context.decorator";

@ApiTags("Remote Work")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("remote-work")
export class RemoteWorkController {
  constructor(private readonly service: RemoteWorkService) {}

  @Get()
  async list(
    @CurrentUser("userId") userId: string,
    @CompanyContext("id") companyId: string,
    @CurrentUser("role") role: string,
    @Query() query: ListRemoteWorkDto,
  ) {
    return this.service.list(userId, companyId, role, query);
  }

  @Get("subordinates")
  async listSubordinates(
    @CurrentUser("userId") userId: string,
    @CompanyContext("id") companyId: string,
    @CurrentUser("role") role: string,
    @Query() query: ListRemoteWorkDto,
  ) {
    return this.service.listSubordinates(userId, companyId, role, query);
  }

  @Post()
  async create(
    @CurrentUser("userId") userId: string,
    @CompanyContext("id") companyId: string,
    @Body() dto: CreateRemoteWorkDto,
  ) {
    return this.service.create(userId, companyId, dto);
  }

  @Patch(":id/approve")
  async approve(
    @CurrentUser("userId") userId: string,
    @CompanyContext("id") companyId: string,
    @CurrentUser("role") role: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ApproveRemoteWorkDto,
  ) {
    return this.service.approve(userId, companyId, role, id, dto);
  }

  @Patch(":id/cancel")
  async cancel(
    @CurrentUser("userId") userId: string,
    @CompanyContext("id") companyId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body("reason") reason?: string,
  ) {
    return this.service.cancel(userId, companyId, id, reason);
  }
}
