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
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { EmployeeService } from "./employee.service";
import { ListEmployeeDto } from "./dto/list-employee.dto";
import { CreateEmployeeDto } from "./dto/create-employee.dto";
import { UpdateEmployeeDto } from "./dto/update-employee.dto";
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
  @ApiOperation({ summary: 'Create a new employee' })
  @ApiResponse({ status: 201, description: 'Employee created successfully' })
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
  @ApiOperation({ summary: 'List employees with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Employee list retrieved' })
  async listEmployees(
    @CurrentUser("userId") userId: string,
    @CurrentUser("role") role: string,
    @CompanyContext("id") companyId: string,
    @Query() query: ListEmployeeDto,
  ) {
    return this.employeeService.listEmployees(userId, companyId, role, query);
  }

  @Get("team-mates")
  @ApiOperation({ summary: 'Get team mates of current user' })
  @ApiResponse({ status: 200, description: 'Team mates retrieved' })
  async getTeamMates(
    @CurrentUser("userId") userId: string,
    @CompanyContext("id") companyId: string,
  ) {
    return this.employeeService.getTeamMates(userId, companyId);
  }

  @Get("subordinates")
  @ApiOperation({ summary: 'Get subordinates of current user' })
  @ApiResponse({ status: 200, description: 'Subordinates retrieved' })
  async getSubordinates(
    @CurrentUser("userId") userId: string,
    @CompanyContext("id") companyId: string,
  ) {
    return this.employeeService.getSubordinates(userId, companyId);
  }

  @Get(":id")
  @ApiOperation({ summary: 'Get employee detail by ID' })
  @ApiResponse({ status: 200, description: 'Employee detail retrieved' })
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
  @ApiOperation({ summary: 'Update employee data' })
  @ApiResponse({ status: 200, description: 'Employee updated successfully' })
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
  @ApiOperation({ summary: 'Get work schedules for an employee' })
  @ApiResponse({ status: 200, description: 'Employee schedules retrieved' })
  async getEmployeeSchedules(
    @CurrentUser("userId") userId: string,
    @CompanyContext("id") companyId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.employeeService.getEmployeeSchedules(userId, companyId, id);
  }

  @Patch(":id/location")
  @ApiOperation({ summary: 'Assign location to employee' })
  @ApiResponse({ status: 200, description: 'Location assigned successfully' })
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
}
