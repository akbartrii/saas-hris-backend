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
import { CompanyService } from "./company.service";
import { CreateCompanyDto } from "./dto/create-company.dto";
import { UpdateCompanyDto } from "./dto/update-company.dto";
import { ListCompanyDto } from "./dto/list-company.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { CompanyContext } from "../../common/decorators/company-context.decorator";

@ApiTags("Companies")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("companies")
export class CompanyController {
  constructor(private readonly service: CompanyService) {}

  @Get()
  async list(
    @CompanyContext("id") companyId: string,
    @Query() query: ListCompanyDto,
  ) {
    return this.service.list(companyId, query);
  }

  @Post()
  @Roles("super_admin")
  async create(
    @CurrentUser("role") role: string,
    @CompanyContext("id") companyId: string,
    @Body() dto: CreateCompanyDto,
  ) {
    return this.service.create(role, companyId, dto);
  }

  @Patch(":id")
  @Roles("super_admin")
  async update(
    @CurrentUser("role") role: string,
    @CompanyContext("id") companyId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.service.update(role, companyId, id, dto);
  }

  @Delete(":id")
  @Roles("super_admin")
  async delete(
    @CurrentUser("role") role: string,
    @CompanyContext("id") companyId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.delete(role, companyId, id);
  }
}
