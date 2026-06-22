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
import { HolidayCalendarService } from "./holiday-calendar.service";
import { CreateHolidayDto } from "./dto/create-holiday.dto";
import { UpdateHolidayDto } from "./dto/update-holiday.dto";
import { ListHolidayDto } from "./dto/list-holiday.dto";
import { SyncHolidayDto } from "./dto/sync-holiday.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { CompanyContext } from "../../common/decorators/company-context.decorator";

@ApiTags("Holiday Calendar")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("holiday-calendar")
export class HolidayCalendarController {
  constructor(private readonly service: HolidayCalendarService) {}

  @Get()
  async list(
    @CurrentUser("userId") userId: string,
    @CurrentUser("role") role: string,
    @CompanyContext("id") companyId: string,
    @Query() query: ListHolidayDto,
  ) {
    return this.service.list(userId, role, companyId, query);
  }

  @Post()
  @Roles("hrd", "admin", "super_admin")
  async create(
    @CurrentUser("userId") userId: string,
    @CurrentUser("role") role: string,
    @CompanyContext("id") companyId: string,
    @Body() dto: CreateHolidayDto,
  ) {
    return this.service.create(userId, role, companyId, dto);
  }

  @Patch(":id")
  @Roles("hrd", "admin", "super_admin")
  async update(
    @CurrentUser("userId") userId: string,
    @CurrentUser("role") role: string,
    @CompanyContext("id") companyId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateHolidayDto,
  ) {
    return this.service.update(userId, role, companyId, id, dto);
  }

  @Delete(":id")
  @Roles("hrd", "admin", "super_admin")
  async delete(
    @CurrentUser("userId") userId: string,
    @CurrentUser("role") role: string,
    @CompanyContext("id") companyId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.delete(userId, role, companyId, id);
  }

  @Post("sync")
  @Roles("hrd", "admin", "super_admin")
  async sync(
    @CompanyContext("id") companyId: string,
    @Body() dto: SyncHolidayDto,
  ) {
    return this.service.syncHolidays(companyId, dto.year);
  }
}
