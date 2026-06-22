import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { TeamService } from "./team.service";
import { CreateTeamDto } from "./dto/create-team.dto";
import { UpdateTeamDto } from "./dto/update-team.dto";
import { ListTeamDto } from "./dto/list-team.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { CompanyContext } from "../../common/decorators/company-context.decorator";

@ApiTags("Teams")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("teams")
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get()
  async list(
    @Query() query: ListTeamDto,
    @CompanyContext("id") companyId: string,
  ) {
    return this.teamService.list(query, companyId);
  }

  @Post()
  @Roles("manager_hrga", "hrd", "admin", "super_admin")
  async create(
    @CurrentUser("role") role: string,
    @Body() dto: CreateTeamDto,
    @CompanyContext("id") companyId: string,
  ) {
    return this.teamService.create(role, companyId, dto);
  }

  @Patch(":id")
  @Roles("manager_hrga", "hrd", "admin", "super_admin")
  async update(
    @CurrentUser("role") role: string,
    @CompanyContext("id") companyId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateTeamDto,
  ) {
    return this.teamService.update(role, companyId, id, dto);
  }

  @Delete(":id")
  @Roles("manager_hrga", "hrd", "admin", "super_admin")
  async delete(
    @CurrentUser("role") role: string,
    @CompanyContext("id") companyId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.teamService.delete(role, companyId, id);
  }
}
