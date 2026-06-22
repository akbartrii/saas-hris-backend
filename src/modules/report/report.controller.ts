import { Controller, Get, Query, UseGuards, Res } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { ReportService } from "./report.service";
import {
  AttendanceReportDto,
  LeaveReportDto,
  PayrollReportDto,
  OvertimeReportDto,
} from "./dto/report.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { CompanyContext } from "../../common/decorators/company-context.decorator";

@ApiTags("Report")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("hrd", "admin", "super_admin")
@Controller("reports")
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get("attendance")
  async attendanceReport(
    @CurrentUser("role") role: string,
    @CompanyContext("id") companyId: string,
    @Query() query: AttendanceReportDto,
  ) {
    return this.reportService.attendanceReport(role, companyId, query);
  }

  @Get("leave")
  async leaveReport(
    @CurrentUser("role") role: string,
    @CompanyContext("id") companyId: string,
    @Query() query: LeaveReportDto,
  ) {
    return this.reportService.leaveReport(role, companyId, query);
  }

  @Get("payroll")
  async payrollReport(
    @CurrentUser("role") role: string,
    @CompanyContext("id") companyId: string,
    @Query() query: PayrollReportDto,
  ) {
    return this.reportService.payrollReport(role, companyId, query);
  }

  @Get("overtime")
  async overtimeReport(
    @CurrentUser("role") role: string,
    @CompanyContext("id") companyId: string,
    @Query() query: OvertimeReportDto,
  ) {
    return this.reportService.overtimeReport(role, companyId, query);
  }

  @Get("attendance/export")
  async exportAttendance(
    @CurrentUser("role") role: string,
    @CompanyContext("id") companyId: string,
    @Query() query: AttendanceReportDto,
    @Res() res: Response,
  ) {
    const buffer = await this.reportService.exportAttendanceExcel(
      role,
      companyId,
      query,
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=attendance-report.xlsx",
    );
    res.send(buffer);
  }

  @Get("leave/export")
  async exportLeave(
    @CurrentUser("role") role: string,
    @CompanyContext("id") companyId: string,
    @Query() query: LeaveReportDto,
    @Res() res: Response,
  ) {
    const buffer = await this.reportService.exportLeaveExcel(
      role,
      companyId,
      query,
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=leave-report.xlsx",
    );
    res.send(buffer);
  }

  @Get("payroll/export")
  async exportPayroll(
    @CurrentUser("role") role: string,
    @CompanyContext("id") companyId: string,
    @Query() query: PayrollReportDto,
    @Res() res: Response,
  ) {
    const buffer = await this.reportService.exportPayrollExcel(
      role,
      companyId,
      query,
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=payroll-report.xlsx",
    );
    res.send(buffer);
  }

  @Get("overtime/export")
  async exportOvertime(
    @CurrentUser("role") role: string,
    @CompanyContext("id") companyId: string,
    @Query() query: OvertimeReportDto,
    @Res() res: Response,
  ) {
    const buffer = await this.reportService.exportOvertimeExcel(
      role,
      companyId,
      query,
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=overtime-report.xlsx",
    );
    res.send(buffer);
  }
}
