import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Query,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiTags,
  ApiConsumes,
  ApiBody,
  ApiOperation,
  ApiResponse,
} from "@nestjs/swagger";
import { AttendanceService } from "./attendance.service";
import { ClockInDto } from "./dto/clock-in.dto";
import { ClockOutDto } from "./dto/clock-out.dto";
import { CreateCorrectionDto } from "./dto/create-correction.dto";
import { ApproveCorrectionDto } from "./dto/approve-correction.dto";
import { ListAttendanceDto } from "./dto/list-attendance.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { CompanyContext } from "../../common/decorators/company-context.decorator";

@ApiTags("Attendance")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("attendance")
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}
  // add comment for deploy
  @Post("clock-in")
  @UseInterceptors(FileInterceptor("photo"))
  @ApiOperation({ summary: "Clock in with GPS location and photo" })
  @ApiResponse({ status: 201, description: "Clock-in recorded" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({ description: "Clock in with GPS and photo", type: ClockInDto })
  async clockIn(
    @CurrentUser("userId") userId: string,
    @CompanyContext("id") companyId: string,
    @Body() dto: ClockInDto,
    @UploadedFile() photo: Express.Multer.File,
    @CurrentUser() requestUser: any,
  ) {
    const isWeb = dto.source === "web";
    if (!photo && !isWeb) {
      throw new BadRequestException("Photo is required");
    }
    return this.attendanceService.clockIn(
      userId,
      requestUser.employeeId,
      dto,
      photo,
    );
  }

  @Post("clock-out")
  @UseInterceptors(FileInterceptor("photo"))
  @ApiOperation({ summary: "Clock out with GPS location and photo" })
  @ApiResponse({ status: 201, description: "Clock-out recorded" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({ description: "Clock out with GPS and photo", type: ClockOutDto })
  async clockOut(
    @CurrentUser("userId") userId: string,
    @CompanyContext("id") companyId: string,
    @Body() dto: ClockOutDto,
    @UploadedFile() photo: Express.Multer.File,
    @CurrentUser() requestUser: any,
  ) {
    const isWeb = dto.source === "web";
    if (!photo && !isWeb) {
      throw new BadRequestException("Photo is required");
    }
    return this.attendanceService.clockOut(
      userId,
      requestUser.employeeId,
      dto,
      photo,
    );
  }

  @Get("today")
  @ApiOperation({ summary: "Get today's attendance status for current user" })
  @ApiResponse({ status: 200, description: "Today status retrieved" })
  async getTodayStatus(
    @CompanyContext("id") companyId: string,
    @CurrentUser("employeeId") employeeId: string,
  ) {
    return this.attendanceService.getTodayStatus(employeeId);
  }

  @Get("history")
  @ApiOperation({ summary: "Get attendance history for current user" })
  @ApiResponse({ status: 200, description: "Attendance history retrieved" })
  async listAttendance(
    @CurrentUser("userId") userId: string,
    @CompanyContext("id") companyId: string,
    @CurrentUser("employeeId") employeeId: string,
    @Query() query: ListAttendanceDto,
  ) {
    return this.attendanceService.listAttendance(
      userId,
      employeeId,
      companyId,
      query,
    );
  }

  @Get("all")
  @Roles("hrd", "admin", "manager_hrga", "super_admin")
  @ApiOperation({ summary: "List all attendance records (HR/manager)" })
  @ApiResponse({ status: 200, description: "All attendance records retrieved" })
  async listAllAttendance(
    @CurrentUser("userId") userId: string,
    @CompanyContext("id") companyId: string,
    @Query() query: any,
  ) {
    return this.attendanceService.listAllAttendance(userId, companyId, query);
  }

  @Get("subordinates")
  @Roles("atasan", "manager_hrga", "admin", "super_admin")
  @ApiOperation({ summary: "List subordinate attendance records" })
  @ApiResponse({ status: 200, description: "Subordinate attendance retrieved" })
  async listSubordinateAttendance(
    @CurrentUser("userId") userId: string,
    @CompanyContext("id") companyId: string,
    @CurrentUser("employeeId") employeeId: string,
    @Query() query: ListAttendanceDto,
  ) {
    return this.attendanceService.listSubordinateAttendance(
      userId,
      employeeId,
      companyId,
      query,
    );
  }

  @Post("corrections")
  @ApiOperation({ summary: "Create an attendance correction request" })
  @ApiResponse({ status: 201, description: "Correction created" })
  async createCorrection(
    @CurrentUser("userId") userId: string,
    @CompanyContext("id") companyId: string,
    @CurrentUser("employeeId") employeeId: string,
    @Body() dto: CreateCorrectionDto,
  ) {
    return this.attendanceService.createCorrection(userId, employeeId, dto);
  }

  @Patch("corrections/:id/cancel")
  @Roles("karyawan", "atasan", "manager_hrga", "hrd", "admin", "super_admin")
  @ApiOperation({ summary: "Cancel an attendance correction request" })
  @ApiResponse({ status: 200, description: "Correction cancelled" })
  async cancelCorrection(
    @CompanyContext("id") companyId: string,
    @CurrentUser("employeeId") employeeId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.attendanceService.cancelCorrection(employeeId, id);
  }

  @Get("corrections")
  @ApiOperation({ summary: "List attendance corrections for current user" })
  @ApiResponse({ status: 200, description: "Corrections list retrieved" })
  async listCorrections(
    @CompanyContext("id") companyId: string,
    @CurrentUser("employeeId") employeeId: string,
    @Query() query: any,
  ) {
    return this.attendanceService.listCorrections(employeeId, query);
  }

  @Patch("corrections/:id/approve")
  @Roles("atasan", "manager_hrga", "admin", "super_admin")
  @ApiOperation({ summary: "Approve or reject an attendance correction" })
  @ApiResponse({ status: 200, description: "Correction approved/rejected" })
  async approveCorrection(
    @CurrentUser("userId") userId: string,
    @CompanyContext("id") companyId: string,
    @CurrentUser("employeeId") employeeId: string,
    @CurrentUser("role") role: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ApproveCorrectionDto,
  ) {
    return this.attendanceService.approveCorrection(
      userId,
      employeeId,
      id,
      dto,
      role,
    );
  }
}
