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
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { LeaveTypeService } from "./leave-type.service";
import { CreateLeaveTypeDto } from "./dto/create-leave-type.dto";
import { UpdateLeaveTypeDto } from "./dto/update-leave-type.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { CompanyContext } from "../../common/decorators/company-context.decorator";

@ApiTags("Leave Types")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("leave-types")
export class LeaveTypeController {
  constructor(private readonly service: LeaveTypeService) {}

  @Get()
  async list(@CompanyContext("id") companyId: string) {
    return this.service.list(companyId);
  }

  @Post()
  @Roles("hrd", "admin", "super_admin")
  async create(
    @CurrentUser("role") role: string,
    @CompanyContext("id") companyId: string,
    @Body() dto: CreateLeaveTypeDto,
  ) {
    return this.service.create(role, companyId, dto);
  }

  @Patch(":id")
  @Roles("hrd", "admin", "super_admin")
  async update(
    @CurrentUser("role") role: string,
    @CompanyContext("id") companyId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeaveTypeDto,
  ) {
    return this.service.update(role, companyId, id, dto);
  }

  @Delete(":id")
  @Roles("hrd", "admin", "super_admin")
  async delete(
    @CurrentUser("role") role: string,
    @CompanyContext("id") companyId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.delete(role, companyId, id);
  }
}
