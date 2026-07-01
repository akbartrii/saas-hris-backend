import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  Param,
  UseGuards,
  ParseUUIDPipe,
  Headers,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from "@nestjs/swagger";
import { EmployeeService } from "./employee.service";
import { ListEmployeeDto } from "./dto/list-employee.dto";
import { CreateEmployeeDto } from "./dto/create-employee.dto";
import { UpdateEmployeeDto } from "./dto/update-employee.dto";
import {
  AssignScheduleDto,
  UpdateEmployeeScheduleDto,
} from "./dto/assign-schedule.dto";
import { ToggleWebClockInDto } from "./dto/toggle-web-clock-in.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { CompanyContext } from "../../common/decorators/company-context.decorator";

@ApiTags("Employee")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("employees")
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post()
  @Roles("hrd", "admin", "super_admin")
  @ApiOperation({ summary: "Create a new employee" })
  @ApiResponse({ status: 201, description: "Employee created successfully" })
  async createEmployee(
    @CurrentUser("userId") userId: string,
    @CurrentUser("role") role: string,
    @CompanyContext("id") companyId: string,
    @Headers("x-salary-keycode") keycode: string | undefined,
    @Body() dto: CreateEmployeeDto,
  ) {
    return this.employeeService.createEmployee(userId, companyId, role, dto);
  }

  @Get()
  @Roles("hrd", "admin", "super_admin")
  @ApiOperation({ summary: "List employees with pagination and filters" })
  @ApiResponse({ status: 200, description: "Employee list retrieved" })
  async listEmployees(
    @CurrentUser("userId") userId: string,
    @CurrentUser("role") role: string,
    @CompanyContext("id") companyId: string,
    @Query() query: ListEmployeeDto,
  ) {
    return this.employeeService.listEmployees(userId, companyId, role, query);
  }

  @Get("team-mates")
  @ApiOperation({ summary: "Get team mates of current user" })
  @ApiResponse({ status: 200, description: "Team mates retrieved" })
  async getTeamMates(
    @CurrentUser("employeeId") employeeId: string,
    @CompanyContext("id") companyId: string,
  ) {
    return this.employeeService.getTeamMates(employeeId, companyId);
  }

  @Get("subordinates")
  @Roles("atasan", "manager_hrga", "admin", "super_admin")
  @ApiOperation({ summary: "Get subordinates of current user" })
  @ApiResponse({ status: 200, description: "Subordinates retrieved" })
  async getSubordinates(
    @CurrentUser("employeeId") employeeId: string,
    @CompanyContext("id") companyId: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.employeeService.getSubordinates(
      employeeId,
      companyId,
      page,
      limit,
    );
  }

  @Get(":id")
  @ApiOperation({ summary: "Get employee detail by ID" })
  @ApiResponse({ status: 200, description: "Employee detail retrieved" })
  async getEmployeeDetail(
    @CurrentUser("userId") userId: string,
    @CurrentUser("role") role: string,
    @CompanyContext("id") companyId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.employeeService.getEmployeeDetail(userId, companyId, id);
  }

  @Patch(":id")
  @Roles("hrd", "admin", "super_admin")
  @ApiOperation({ summary: "Update employee data" })
  @ApiResponse({ status: 200, description: "Employee updated successfully" })
  async updateEmployee(
    @CurrentUser("userId") userId: string,
    @CurrentUser("role") role: string,
    @CompanyContext("id") companyId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.employeeService.updateEmployee(userId, companyId, id, dto);
  }

  @Get(":id/schedules")
  @ApiOperation({ summary: "Get work schedules for an employee" })
  @ApiResponse({ status: 200, description: "Employee schedules retrieved" })
  async getEmployeeSchedules(
    @CurrentUser("userId") userId: string,
    @CompanyContext("id") companyId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.employeeService.getEmployeeSchedules(userId, companyId, id);
  }

  @Post(":id/schedules")
  @Roles("hrd", "admin", "super_admin")
  @ApiOperation({ summary: "Assign work schedule to employee" })
  @ApiResponse({ status: 201, description: "Schedule assigned successfully" })
  async assignSchedule(
    @CurrentUser("userId") userId: string,
    @CompanyContext("id") companyId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AssignScheduleDto,
  ) {
    return this.employeeService.assignSchedule(companyId, id, dto);
  }

  @Patch(":id/schedules/:scheduleId")
  @Roles("hrd", "admin", "super_admin")
  @ApiOperation({ summary: "Update employee schedule assignment" })
  @ApiResponse({ status: 200, description: "Schedule updated successfully" })
  async updateEmployeeSchedule(
    @CurrentUser("userId") userId: string,
    @CompanyContext("id") companyId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("scheduleId", ParseUUIDPipe) scheduleId: string,
    @Body() dto: UpdateEmployeeScheduleDto,
  ) {
    return this.employeeService.updateEmployeeSchedule(
      companyId,
      id,
      scheduleId,
      dto,
    );
  }

  @Patch(":id/location")
  @ApiOperation({ summary: "Assign location to employee" })
  @ApiResponse({ status: 200, description: "Location assigned successfully" })
  async assignLocation(
    @CurrentUser("userId") userId: string,
    @CompanyContext("id") companyId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: { location_id: string },
  ) {
    return this.employeeService.assignLocation(
      userId,
      companyId,
      id,
      dto.location_id,
    );
  }

  @Patch(":id/toggle-web-clock-in")
  @Roles("atasan", "manager_hrga", "hrd", "admin", "super_admin")
  @ApiOperation({ summary: "Toggle web clock-in allowance for an employee" })
  @ApiResponse({ status: 200, description: "Web clock-in toggled successfully" })
  async toggleWebClockIn(
    @CurrentUser() user: any,
    @CompanyContext("id") companyId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ToggleWebClockInDto,
  ) {
    return this.employeeService.toggleWebClockIn(
      id,
      dto.allow,
      user,
      companyId,
    );
  }
}
