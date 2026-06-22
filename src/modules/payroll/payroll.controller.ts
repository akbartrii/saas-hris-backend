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
  Res,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { PayrollService } from "./payroll.service";
import {
  GeneratePayslipDto,
  ListPayslipDto,
  PublishPayslipDto,
  GenerateBatchPayslipDto,
  GenerateTHRDto,
  CreatePayrollPeriodDto,
  UpdatePayrollPeriodDto,
  ExportPayrollDto,
} from "./dto/generate-payslip.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { CompanyContext } from "../../common/decorators/company-context.decorator";
import { Response } from "express";

@ApiTags("Payroll")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("payroll")
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get("payslips")
  @ApiOperation({ summary: "List payslips for current user" })
  @ApiResponse({ status: 200, description: "Payslip list retrieved" })
  async listPayslips(
    @CurrentUser("userId") userId: string,
    @CompanyContext("id") companyId: string,
    @CurrentUser("role") role: string,
    @Query() query: ListPayslipDto,
  ) {
    return this.payrollService.listPayslips(userId, companyId, query, role);
  }

  @Get("payslips/:id")
  @ApiOperation({ summary: "Get payslip detail by ID" })
  @ApiResponse({ status: 200, description: "Payslip detail retrieved" })
  async getPayslipDetail(
    @CurrentUser("userId") userId: string,
    @CompanyContext("id") companyId: string,
    @CurrentUser("role") role: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.payrollService.getPayslipDetail(userId, companyId, id, role);
  }

  @Post("generate")
  @Roles("hrd", "admin", "super_admin")
  @ApiOperation({ summary: "Generate a single payslip for an employee" })
  @ApiResponse({ status: 201, description: "Payslip generated" })
  async generatePayslip(
    @CurrentUser("userId") userId: string,
    @CompanyContext("id") companyId: string,
    @CurrentUser("role") role: string,
    @Headers("x-salary-keycode") keycode: string | undefined,
    @Body() dto: GeneratePayslipDto,
  ) {
    return this.payrollService.generatePayslip(
      userId,
      companyId,
      dto,
      role,
      keycode,
    );
  }

  @Post("generate-batch")
  @Roles("hrd", "admin", "super_admin")
  @ApiOperation({ summary: "Batch generate payslips for all employees in a period" })
  @ApiResponse({ status: 201, description: "Batch payslips generated" })
  async generateBatchPayslip(
    @CurrentUser("userId") userId: string,
    @CompanyContext("id") companyId: string,
    @CurrentUser("role") role: string,
    @Headers("x-salary-keycode") keycode: string | undefined,
    @Body() dto: GenerateBatchPayslipDto,
  ) {
    return this.payrollService.generateBatchPayslip(
      userId,
      companyId,
      dto,
      role,
      keycode,
    );
  }

  @Post("publish")
  @Roles("hrd", "admin", "super_admin")
  @ApiOperation({ summary: "Publish a draft payslip" })
  @ApiResponse({ status: 200, description: "Payslip published" })
  async publishPayslip(
    @CurrentUser("userId") userId: string,
    @CompanyContext("id") companyId: string,
    @CurrentUser("role") role: string,
    @Body() dto: PublishPayslipDto,
  ) {
    return this.payrollService.publishPayslip(
      userId,
      companyId,
      dto.payslip_id,
      role,
    );
  }

  @Get("periods")
  @ApiOperation({ summary: "List all payroll periods for company" })
  @ApiResponse({ status: 200, description: "Payroll periods retrieved" })
  async listPayrollPeriods(@CompanyContext("id") companyId?: string) {
    return this.payrollService.listPayrollPeriods(companyId);
  }

  @Post("periods")
  @Roles("hrd", "admin", "super_admin")
  @ApiOperation({ summary: "Create a new payroll period" })
  @ApiResponse({ status: 201, description: "Payroll period created" })
  async createPayrollPeriod(
    @CompanyContext("id") companyId: string,
    @Body() dto: CreatePayrollPeriodDto,
    @CurrentUser("role") role: string,
  ) {
    return this.payrollService.createPeriod(dto, role, companyId);
  }

  @Patch("periods/:id")
  @Roles("hrd", "admin", "super_admin")
  @ApiOperation({ summary: "Update a payroll period" })
  @ApiResponse({ status: 200, description: "Payroll period updated" })
  async updatePayrollPeriod(
    @CompanyContext("id") companyId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdatePayrollPeriodDto,
    @CurrentUser("role") role: string,
  ) {
    return this.payrollService.updatePeriod(companyId, id, dto, role);
  }

  @Get("thr")
  @ApiOperation({ summary: "List THR (holiday allowance) records" })
  @ApiResponse({ status: 200, description: "THR list retrieved" })
  async listTHR(
    @CurrentUser("userId") userId: string,
    @CompanyContext("id") companyId: string,
    @CurrentUser("role") role: string,
  ) {
    return this.payrollService.listTHR(userId, companyId, role);
  }

  @Post("thr/generate")
  @Roles("hrd", "admin", "super_admin")
  @ApiOperation({ summary: "Generate THR (holiday allowance) for employees" })
  @ApiResponse({ status: 201, description: "THR generated" })
  async generateTHR(
    @CurrentUser("userId") userId: string,
    @CompanyContext("id") companyId: string,
    @CurrentUser("role") role: string,
    @Headers("x-salary-keycode") keycode: string | undefined,
    @Body() dto: GenerateTHRDto,
  ) {
    return this.payrollService.generateTHR(
      userId,
      companyId,
      dto,
      role,
      keycode,
    );
  }

  @Post("export")
  @Roles("hrd", "admin", "super_admin")
  @ApiOperation({ summary: "Export payroll data as Excel" })
  @ApiResponse({ status: 200, description: "Excel file downloaded" })
  async exportPayroll(
    @CompanyContext("id") companyId: string,
    @Body() dto: ExportPayrollDto,
    @CurrentUser("role") role: string,
    @Res() res: Response,
  ) {
    const buffer = await this.payrollService.exportPayroll(
      companyId,
      dto.payroll_period_id,
      role,
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=payroll-${dto.payroll_period_id}.xlsx`,
    );
    res.send(buffer);
  }
}
