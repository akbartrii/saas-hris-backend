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
import { OvernightService } from "./overnight.service";
import { CreateOvernightDto } from "./dto/create-overnight.dto";
import { ListOvernightDto } from "./dto/list-overnight.dto";
import { ApproveOvernightDto } from "./dto/approve-overnight.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { CompanyContext } from "../../common/decorators/company-context.decorator";

@ApiTags("Overnight")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("overnight")
export class OvernightController {
  constructor(private readonly service: OvernightService) {}

  @Get()
  async list(
    @CurrentUser("userId") userId: string,
    @CompanyContext("id") companyId: string,
    @CurrentUser("role") role: string,
    @Query() query: ListOvernightDto,
  ) {
    return this.service.list(userId, companyId, role, query);
  }

  @Get("subordinates")
  @Roles("atasan", "manager_hrga", "admin", "super_admin")
  async listSubordinates(
    @CurrentUser("userId") userId: string,
    @CompanyContext("id") companyId: string,
    @Query() query: ListOvernightDto,
  ) {
    return this.service.listSubordinateOvernights(userId, companyId, query);
  }

  @Post()
  async create(
    @CurrentUser("userId") userId: string,
    @CompanyContext("id") companyId: string,
    @Body() dto: CreateOvernightDto,
  ) {
    return this.service.create(userId, companyId, dto);
  }

  @Patch(":id/approve")
  @Roles("atasan", "manager_hrga", "admin", "super_admin")
  async approve(
    @CurrentUser("userId") userId: string,
    @CompanyContext("id") companyId: string,
    @CurrentUser("role") role: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ApproveOvernightDto,
  ) {
    return this.service.approve(userId, companyId, role, id, dto);
  }
}
