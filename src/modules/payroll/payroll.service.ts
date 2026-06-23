import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  GeneratePayslipDto,
  ListPayslipDto,
  GenerateBatchPayslipDto,
  GenerateTHRDto,
  CreatePayrollPeriodDto,
  UpdatePayrollPeriodDto,
} from "./dto/generate-payslip.dto";
import { EncryptionService } from "../encryption/encryption.service";
import { PdfService } from "../../common/services/pdf.service";
import * as ExcelJS from "exceljs";

@Injectable()
export class PayrollService {
  constructor(
    private prisma: PrismaService,
    private pdfService: PdfService,
    private encryptionService: EncryptionService,
  ) {}

  async listPayslips(
    userId: string,
    companyId: string,
    query: ListPayslipDto,
    _userRole: string,
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {
      ms_employees: { company_id: companyId },
    };

    if (query.status) {
      where.status = query.status;
    }
    if (query.payroll_period_id) {
      where.payroll_period_id = query.payroll_period_id;
    }

    const [data, total] = await Promise.all([
      this.prisma.tr_payslips.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          tr_payroll_periods: true,
          ms_employees: {
            select: {
              id: true,
              full_name: true,
              ms_users: { select: { email: true } },
            },
          },
        },
      }),
      this.prisma.tr_payslips.count({ where }),
    ]);

    return { data, meta: { page, limit, total } };
  }

  async getPayslipDetail(
    userId: string,
    companyId: string,
    payslipId: string,
    _userRole: string,
  ) {
    const payslip = await this.prisma.tr_payslips.findUnique({
      where: { id: payslipId },
      include: {
        tr_payroll_periods: true,
        ms_employees: {
          include: {
            ms_departments_ms_employees_department_idToms_departments: true,
            ms_positions: true,
            ms_users: { select: { email: true } },
          },
        },
      },
    });

    if (!payslip || payslip.ms_employees?.company_id !== companyId) {
      throw new NotFoundException("Payslip not found");
    }

    return payslip;
  }

  async generatePayslip(
    userId: string,
    companyId: string,
    dto: GeneratePayslipDto,
    userRole: string,
    keycode?: string,
  ) {
    const employee = await this.prisma.ms_employees.findUnique({
      where: { id: dto.employee_id, company_id: companyId },
    });
    if (!employee) {
      throw new NotFoundException("Employee not found");
    }

    const period = await this.prisma.tr_payroll_periods.findUnique({
      where: { id: dto.payroll_period_id, company_id: companyId },
    });
    if (!period) {
      throw new NotFoundException("Payroll period not found");
    }

    const existing = await this.prisma.tr_payslips.findFirst({
      where: {
        employee_id: dto.employee_id,
        payroll_period_id: dto.payroll_period_id,
      },
    });
    if (existing) {
      throw new BadRequestException("Payslip already exists for this period");
    }

    let baseSalary = 0;
    let fixedAllowance = 0;

    if (keycode) {
      const isValid = await this.encryptionService.validateKeycode(keycode);
      if (isValid) {
        baseSalary = Number(
          this.encryptionService.decrypt(employee.base_salary || "0", keycode),
        );
        fixedAllowance = Number(
          this.encryptionService.decrypt(
            employee.fixed_allowance || "0",
            keycode,
          ),
        );
      }
    }

    const grossIncome = baseSalary + fixedAllowance;
    const totalDeductions = 0;
    const netIncome = grossIncome - totalDeductions;

    return this.prisma.tr_payslips.create({
      data: {
        company_id: companyId,
        employee_id: dto.employee_id,
        payroll_period_id: dto.payroll_period_id,
        base_salary: baseSalary,
        fixed_allowance: fixedAllowance,
        gross_income: grossIncome,
        total_deductions: totalDeductions,
        net_income: netIncome,
        status: "draft",
      },
    });
  }

  async generateBatchPayslip(
    userId: string,
    companyId: string,
    dto: GenerateBatchPayslipDto,
    userRole: string,
    keycode?: string,
  ) {
    const period = await this.prisma.tr_payroll_periods.findUnique({
      where: { id: dto.payroll_period_id, company_id: companyId },
    });
    if (!period) {
      throw new NotFoundException("Payroll period not found");
    }

    const employees = await this.prisma.ms_employees.findMany({
      where: { company_id: companyId, is_active: true },
    });

    const existingPayslips = await this.prisma.tr_payslips.findMany({
      where: {
        payroll_period_id: dto.payroll_period_id,
        company_id: companyId,
      },
      select: { employee_id: true },
    });
    const existingEmployeeIds = new Set(
      existingPayslips.map((p) => p.employee_id),
    );

    const results = [];
    for (const employee of employees) {
      if (existingEmployeeIds.has(employee.id)) continue;

      let baseSalary = 0;
      let fixedAllowance = 0;

      if (keycode) {
        const isValid = await this.encryptionService.validateKeycode(keycode);
        if (isValid) {
          baseSalary = Number(
            this.encryptionService.decrypt(
              employee.base_salary || "0",
              keycode,
            ),
          );
          fixedAllowance = Number(
            this.encryptionService.decrypt(
              employee.fixed_allowance || "0",
              keycode,
            ),
          );
        }
      }

      const payslip = await this.prisma.tr_payslips.create({
        data: {
          company_id: companyId,
          employee_id: employee.id,
          payroll_period_id: dto.payroll_period_id,
          base_salary: baseSalary,
          fixed_allowance: fixedAllowance,
          gross_income: baseSalary + fixedAllowance,
          total_deductions: 0,
          net_income: baseSalary + fixedAllowance,
          status: "draft",
        },
      });
      results.push(payslip);
    }

    return { data: results, total: results.length };
  }

  async publishPayslip(
    userId: string,
    companyId: string,
    payslipId: string,
    _userRole: string,
  ) {
    const payslip = await this.prisma.tr_payslips.findUnique({
      where: { id: payslipId },
      include: { ms_employees: true },
    });

    if (!payslip || payslip.ms_employees?.company_id !== companyId) {
      throw new NotFoundException("Payslip not found");
    }

    if (payslip.status !== "draft") {
      throw new BadRequestException("Payslip is not in draft status");
    }

    return this.prisma.tr_payslips.update({
      where: { id: payslipId },
      data: { status: "published" },
    });
  }

  async listPayrollPeriods(companyId?: string) {
    const where: any = {};
    if (companyId) {
      where.company_id = companyId;
    }
    return this.prisma.tr_payroll_periods.findMany({
      where,
      orderBy: { created_at: "desc" },
    });
  }

  async createPeriod(
    dto: CreatePayrollPeriodDto,
    userRole: string,
    companyId: string,
  ) {
    const startDate = new Date(dto.start_date);
    return this.prisma.tr_payroll_periods.create({
      data: {
        period_name: dto.period_name,
        start_date: startDate,
        end_date: new Date(dto.end_date),
        month: startDate.getMonth() + 1,
        year: startDate.getFullYear(),
        company_id: companyId,
      },
    });
  }

  async updatePeriod(
    companyId: string,
    id: string,
    dto: UpdatePayrollPeriodDto,
    _userRole: string,
  ) {
    const exists = await this.prisma.tr_payroll_periods.findUnique({
      where: { id, company_id: companyId },
    });
    if (!exists) throw new NotFoundException("Payroll period not found");

    const data: any = {};
    if (dto.period_name) data.period_name = dto.period_name;
    if (dto.start_date) data.start_date = new Date(dto.start_date);
    if (dto.end_date) data.end_date = new Date(dto.end_date);

    return this.prisma.tr_payroll_periods.update({
      where: { id },
      data,
    });
  }

  async listTHR(userId: string, companyId: string, _userRole: string) {
    const where: any = {
      ms_employees: { company_id: companyId },
    };

    return this.prisma.tr_thr_records.findMany({
      where,
      orderBy: { created_at: "desc" },
      include: {
        ms_employees: {
          select: {
            id: true,
            full_name: true,
            ms_users: { select: { email: true } },
          },
        },
      },
    });
  }

  async generateTHR(
    userId: string,
    companyId: string,
    dto: GenerateTHRDto,
    userRole: string,
    keycode?: string,
  ) {
    const employee = await this.prisma.ms_employees.findUnique({
      where: { id: dto.employee_id, company_id: companyId },
    });
    if (!employee) {
      throw new NotFoundException("Employee not found");
    }

    let baseSalary = 0;
    if (keycode) {
      const isValid = await this.encryptionService.validateKeycode(keycode);
      if (isValid) {
        baseSalary = Number(
          this.encryptionService.decrypt(employee.base_salary || "0", keycode),
        );
      }
    }

    return this.prisma.tr_thr_records.create({
      data: {
        company_id: companyId,
        employee_id: dto.employee_id,
        period_name: new Date().getFullYear().toString(),
        base_salary: baseSalary,
        months_worked: 12,
        thr_amount: dto.thr_amount || baseSalary,
      },
    });
  }

  async exportPayroll(
    companyId: string,
    payrollPeriodId: string,
    _userRole: string,
  ): Promise<Buffer> {
    const data = await this.prisma.tr_payslips.findMany({
      where: {
        payroll_period_id: payrollPeriodId,
        ms_employees: { company_id: companyId },
      },
      include: {
        ms_employees: {
          select: {
            id: true,
            full_name: true,
            nik: true,
            ms_departments_ms_employees_department_idToms_departments: {
              select: { name: true },
            },
          },
        },
        tr_payroll_periods: true,
      },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Payroll");

    sheet.columns = [
      { header: "NIK", key: "nik", width: 20 },
      { header: "Nama", key: "name", width: 30 },
      { header: "Department", key: "department", width: 25 },
      { header: "Gaji Pokok", key: "baseSalary", width: 20 },
      { header: "Tunjangan", key: "allowance", width: 20 },
      { header: "Potongan", key: "deductions", width: 20 },
      { header: "Take Home Pay", key: "netIncome", width: 20 },
    ];

    for (const row of data) {
      sheet.addRow({
        nik: row.ms_employees?.nik || "",
        name: row.ms_employees?.full_name || "",
        department:
          row.ms_employees
            ?.ms_departments_ms_employees_department_idToms_departments?.name ||
          "",
        baseSalary: Number(row.gross_income || 0),
        allowance: 0,
        deductions: Number(row.total_deductions || 0),
        netIncome: Number(row.net_income || 0),
      });
    }

    sheet.getRow(1).font = { bold: true };
    const buf = await workbook.xlsx.writeBuffer();
    return buf as unknown as Buffer;
  }
}
