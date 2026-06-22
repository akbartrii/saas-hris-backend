import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ParameterService } from "./parameter.service";
import { CreateParameterDto, UpdateParameterDto } from "./dto/parameter.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CompanyContext } from "../../common/decorators/company-context.decorator";

@ApiTags("Parameters")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("parameters")
export class ParameterController {
  constructor(private readonly service: ParameterService) {}

  @Get()
  async findAll(@CompanyContext("id") companyId: string) {
    return this.service.findAll(companyId);
  }

  @Get(":key")
  async findOne(
    @Param("key") key: string,
    @CompanyContext("id") companyId: string,
  ) {
    return this.service.findOne(key, companyId);
  }

  @Post()
  @Roles("admin", "super_admin")
  async create(
    @Body() dto: CreateParameterDto,
    @CompanyContext("id") companyId: string,
  ) {
    return this.service.create(dto.key, dto.value, companyId);
  }

  @Patch(":key")
  @Roles("admin", "super_admin")
  async update(
    @Param("key") key: string,
    @Body() dto: UpdateParameterDto,
    @CompanyContext("id") companyId: string,
  ) {
    return this.service.update(key, dto.value, companyId);
  }

  @Delete(":key")
  @Roles("admin", "super_admin")
  async remove(
    @Param("key") key: string,
    @CompanyContext("id") companyId: string,
  ) {
    return this.service.remove(key, companyId);
  }
}
