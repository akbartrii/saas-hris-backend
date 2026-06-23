import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Query,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from "@nestjs/swagger";
import { LeaveService } from "./leave.service";
import { CreateLeaveDto } from "./dto/create-leave.dto";
import { ApproveLeaveDto } from "./dto/approve-leave.dto";
import { ListLeaveDto } from "./dto/list-leave.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { CompanyContext } from "../../common/decorators/company-context.decorator";

@ApiTags("Leave")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("leave")
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post()
  @ApiOperation({ summary: "Create a new leave request" })
  @ApiResponse({ status: 201, description: "Leave created successfully" })
  async createLeave(
    @CurrentUser("userId") userId: string,
    @CompanyContext("id") companyId: string,
    @CurrentUser("role") role: string,
    @Body() dto: CreateLeaveDto,
  ) {
    return this.leaveService.createLeave(userId, companyId, role, dto);
  }

  @Get("balance")
  @ApiOperation({ summary: "Get leave balance for current user" })
  @ApiResponse({ status: 200, description: "Leave balance retrieved" })
  async getLeaveBalance(
    @CurrentUser("userId") userId: string,
    @CompanyContext("id") companyId: string,
  ) {
    return this.leaveService.getLeaveBalance(userId, companyId);
  }

  @Get()
  @ApiOperation({ summary: "List leave requests for current user" })
  @ApiResponse({ status: 200, description: "Leave list retrieved" })
  async listLeaves(
    @CurrentUser("userId") userId: string,
    @CompanyContext("id") companyId: string,
    @Query() query: ListLeaveDto,
  ) {
    return this.leaveService.listLeaves(userId, companyId, query);
  }

  @Get("subordinates")
  @Roles("atasan", "manager_hrga", "admin", "super_admin")
  @ApiOperation({ summary: "List subordinate leave requests for approval" })
  @ApiResponse({ status: 200, description: "Subordinate leave list retrieved" })
  async listSubordinateLeaves(
    @CurrentUser("userId") userId: string,
    @CompanyContext("id") companyId: string,
    @Query() query: ListLeaveDto,
  ) {
    return this.leaveService.listSubordinateLeaves(userId, companyId, query);
  }

  @Patch(":id/approve")
  @Roles("atasan", "manager_hrga", "admin", "super_admin")
  @ApiOperation({ summary: "Approve or reject a leave request" })
  @ApiResponse({ status: 200, description: "Leave approved/rejected" })
  async approveLeave(
    @CurrentUser("userId") userId: string,
    @CompanyContext("id") companyId: string,
    @CurrentUser("role") role: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ApproveLeaveDto,
  ) {
    return this.leaveService.approveLeave(userId, companyId, id, dto, role);
  }

  @Patch(":id/cancel")
  @Roles("karyawan", "atasan", "manager_hrga", "hrd", "admin", "super_admin")
  @ApiOperation({ summary: "Cancel a leave request" })
  @ApiResponse({ status: 200, description: "Leave cancelled successfully" })
  async cancelLeave(
    @CurrentUser("userId") userId: string,
    @CompanyContext("id") companyId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.leaveService.cancelLeave(userId, companyId, id);
  }
}
