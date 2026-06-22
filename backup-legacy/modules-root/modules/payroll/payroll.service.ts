import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PdfService } from '../../common/services/pdf.service';
import { ParameterService } from '../parameter/parameter.service';
import {
  GeneratePayslipDto,
  ListPayslipDto,
  CreatePayrollPeriodDto,
  UpdatePayrollPeriodDto,
  GenerateBatchPayslipDto,
  GenerateTHRDto,
} from './dto/generate-payslip.dto';
import { EncryptionService } from '../encryption/encryption.service';

@Injectable()
export class PayrollService {
  constructor(
    private prisma: PrismaService,
    private pdfService: PdfService,
    private parameterService: ParameterService,
    private encryptionService: EncryptionService,
  ) {}

  private isAdminOrHRD(role: string): boolean {
    return ['manager_hrga', 'hrd', 'admin', 'super_admin'].includes(role);
  }

  private async calculatePPh21(
    monthlyGrossIncome: number,
    ptkpStatus: string,
  ): Promise<number> {
    const ter = await this.prisma.ms_ter.findFirst({
      where: { ptkp_name: ptkpStatus },
    });
    if (!ter) {
      return 0;
    }

    const fee = await this.prisma.ms_ter_fee.findFirst({
      where: {
        ter_type: ter.ter_type,
        fee_from: { lte: monthlyGrossIncome },
        fee_until: { gte: monthlyGrossIncome },
      },
    });

    if (!fee) {
      return 0;
    }

    return Number(
      (monthlyGrossIncome * (Number(fee.amount_in_percent) / 100)).toFixed(2),
    );
  }

  private async calculateBPJS(
    baseSalary: number,
    bpjsPaymentType: string | null,
  ): Promise<{ kesehatan: number; ketenagakerjaan: number; jp: number }> {
    if (bpjsPaymentType === 'company') {
      return { kesehatan: 0, ketenagakerjaan: 0, jp: 0 };
    }
    const kesehatanCap = Math.min(
      baseSalary,
      await this.parameterService.getNumber('bpjs_kesehatan_cap', 12000000),
    );
    const kesehatanRate = await this.parameterService.getNumber(
      'bpjs_kesehatan_rate',
      0.01,
    );
    const kesehatan = Number((kesehatanCap * kesehatanRate).toFixed(2));
    const jhtRate = await this.parameterService.getNumber(
      'bpjs_jht_rate',
      0.02,
    );
    const jht = Number((baseSalary * jhtRate).toFixed(2));
    const jkmRate = await this.parameterService.getNumber(
      'bpjs_jkm_rate',
      0.003,
    );
    const jkm = Number((baseSalary * jkmRate).toFixed(2));
    const jkkRate = await this.parameterService.getNumber(
      'bpjs_jkk_rate',
      0.0024,
    );
    const jkk = Number((baseSalary * jkkRate).toFixed(2));
    const ketenagakerjaan = Number((jht + jkm + jkk).toFixed(2));
    const jpCap = Math.min(
      baseSalary,
      await this.parameterService.getNumber('bpjs_jp_cap', 9559600),
    );
    const jpRate = await this.parameterService.getNumber('bpjs_jp_rate', 0.01);
    const jp = Number((jpCap * jpRate).toFixed(2));
    return { kesehatan, ketenagakerjaan, jp };
  }

  private async calculateProrate(
    baseSalary: number,
    fixedAllowance: number,
    workedDays: number,
    month: number,
    year: number,
    companyId: string,
  ): Promise<{
    prorateAmount: number;
    isProrated: boolean;
    effectiveDays: number;
  }> {
    const effectiveDays = await this.calculateEffectiveWorkDays(
      month,
      year,
      companyId,
    );

    if (workedDays >= effectiveDays) {
      return { prorateAmount: 0, isProrated: false, effectiveDays };
    }
    const daily = (baseSalary + fixedAllowance) / effectiveDays;
    const prorate = Number((daily * workedDays).toFixed(2));
    return { prorateAmount: prorate, isProrated: true, effectiveDays };
  }

  private async calculateEffectiveWorkDays(
    month: number,
    year: number,
    companyId: string,
  ): Promise<number> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const holidays = await this.prisma.ms_holiday_calendars.findMany({
      where: {
        company_id: companyId,
        holiday_date: { gte: startDate, lte: endDate },
      },
      select: { holiday_date: true },
    });

    const holidaySet = new Set(
      holidays.map((h) => h.holiday_date.toISOString().split('T')[0]),
    );

    let workingDays = 0;
    const current = new Date(startDate);
    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      const dateStr = current.toISOString().split('T')[0];

      // 0 = Sunday, 6 = Saturday
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaySet.has(dateStr)) {
        workingDays++;
      }
      current.setDate(current.getDate() + 1);
    }

    return workingDays || 21; // Fallback to 21 if somehow 0
  }

  private async computeMonthsWorked(
    joinDate: Date,
    referenceDate: Date,
  ): Promise<number> {
    let months =
      (referenceDate.getFullYear() - joinDate.getFullYear()) * 12 +
      (referenceDate.getMonth() - joinDate.getMonth());
    if (referenceDate.getDate() < joinDate.getDate()) {
      months -= 1;
    }
    const minMonths = await this.parameterService.getNumber(
      'thr_min_months',
      1,
    );
    const maxMonths = await this.parameterService.getNumber(
      'thr_max_months',
      12,
    );
    return Math.max(minMonths, Math.min(maxMonths, months));
  }

  private async buildPayslipData(
    employeeId: string,
    period: {
      id: string;
      month: number;
      year: number;
      company_id: string;
      start_date: Date | null;
      end_date: Date | null;
      attendance_cutoff_start: Date | null;
      attendance_cutoff_end: Date | null;
    },
    ptkpStatus: string = 'TK/0',
    keycode?: string,
  ) {
    const employee = await this.prisma.ms_employees.findUnique({
      where: { id: employeeId },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const cutoffStart =
      period.attendance_cutoff_start ??
      period.start_date ??
      new Date(period.year, period.month - 1, 1);
    const cutoffEnd =
      period.attendance_cutoff_end ??
      period.end_date ??
      new Date(period.year, period.month, 0);

    const [
      attendances,
      overtimeRequests,
      loanDeductions,
      leaveRequests,
      reimbursements,
    ] = await Promise.all([
      this.prisma.tr_attendances.findMany({
        where: {
          employee_id: employeeId,
          attendance_date: { gte: cutoffStart, lte: cutoffEnd },
        },
      }),
      this.prisma.tr_overtime_requests.findMany({
        where: {
          employee_id: employeeId,
          status: 'processed',
          date: { gte: cutoffStart, lte: cutoffEnd },
        },
      }),
      this.prisma.tr_loan_deductions.findMany({
        where: {
          employee_id: employeeId,
          status: 'active',
        },
      }),
      this.prisma.tr_leave_requests.findMany({
        where: {
          employee_id: employeeId,
          status: 'approved',
          start_date: { lte: cutoffEnd },
          end_date: { gte: cutoffStart },
        },
        include: { ms_leave_types: true },
      }),
      this.prisma.tr_reimbursements.findMany({
        where: {
          employee_id: employeeId,
          status: 'approved',
          date: { gte: cutoffStart, lte: cutoffEnd },
        },
      }),
    ]);

    const decryptVal = (val: string | null) => {
      if (!val || !keycode) return 0;
      try {
        const decrypted = this.encryptionService.decrypt(val, keycode);
        const num = Number(decrypted);
        return isNaN(num) ? 0 : num;
      } catch {
        return 0;
      }
    };

    const baseSalary = decryptVal(employee.base_salary);
    const fixedAllowance = decryptVal(employee.fixed_allowance);
    const phoneAllowance = decryptVal(employee.phone_allowance);
    const dinasAllowance = decryptVal(employee.dinas_allowance);

    const attendanceAllowance = attendances.reduce(
      (sum, a) => sum + Number(a.attendance_allowance || 0),
      0,
    );
    const overtimePay = overtimeRequests.reduce(
      (sum, o) => sum + Number(o.total_overtime_pay || 0),
      0,
    );
    const overtimeMealAllowance = overtimeRequests.reduce(
      (sum, o) => sum + Number(o.total_meal_allowance || 0),
      0,
    );
    const lateDeduction = attendances.reduce(
      (sum, a) => sum + Number(a.late_deduction || 0),
      0,
    );

    const workedDays = attendances.filter(
      (a) => a.clock_in && a.clock_out,
    ).length;
    const prorate = await this.calculateProrate(
      baseSalary,
      fixedAllowance,
      workedDays,
      period.month,
      period.year,
      period.company_id,
    );

    let effectiveBaseSalary: number;
    let effectiveFixedAllowance: number;
    if (prorate.isProrated) {
      effectiveBaseSalary = prorate.prorateAmount;
      effectiveFixedAllowance = 0;
    } else {
      effectiveBaseSalary = baseSalary;
      effectiveFixedAllowance = fixedAllowance;
    }

    const reimbursementAmount = reimbursements.reduce(
      (sum, r) => sum + Number(r.amount || 0),
      0,
    );

    const unpaidLeaveDeduction = leaveRequests.reduce((sum, l) => {
      if (l.ms_leave_types?.is_paid) return sum;
      const overlapStart =
        l.start_date < cutoffStart ? cutoffStart : l.start_date;
      const overlapEnd = l.end_date > cutoffEnd ? cutoffEnd : l.end_date;
      const msPerDay = 86400000;
      const days =
        Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / msPerDay) +
        1;
      const dailyRate = (baseSalary + fixedAllowance) / 21;
      return sum + Number((dailyRate * days).toFixed(2));
    }, 0);

    const grossIncome =
      effectiveBaseSalary +
      effectiveFixedAllowance +
      phoneAllowance +
      dinasAllowance +
      attendanceAllowance +
      overtimePay +
      overtimeMealAllowance +
      reimbursementAmount;

    const bpjs = await this.calculateBPJS(
      baseSalary,
      employee.bpjs_payment_type || 'company',
    );

    const loanDeductionAmount = loanDeductions.reduce((sum, l) => {
      const monthlyDeduction = Number(l.monthly_deduction || 0);
      const remaining = Number(l.remaining_amount || 0);
      return sum + Math.min(monthlyDeduction, remaining);
    }, 0);

    const totalDeductions =
      lateDeduction +
      loanDeductionAmount +
      bpjs.kesehatan +
      bpjs.ketenagakerjaan +
      bpjs.jp +
      unpaidLeaveDeduction;

    const pph21 = await this.calculatePPh21(grossIncome, ptkpStatus);
    const netIncome = Number(
      (grossIncome - totalDeductions - pph21).toFixed(2),
    );

    return {
      employee,
      baseSalary,
      effectiveBaseSalary,
      effectiveFixedAllowance,
      phoneAllowance,
      dinasAllowance,
      attendanceAllowance,
      overtimePay,
      overtimeMealAllowance,
      reimbursementAmount,
      unpaidLeaveDeduction,
      lateDeduction,
      loanDeductionAmount,
      bpjs,
      pph21,
      workedDays,
      isProrated: prorate.isProrated,
      effectiveDays: prorate.effectiveDays,
      grossIncome,
      totalDeductions,
      netIncome,
      loanDeductions,
    };
  }

  async listPayslips(userId: string, query: ListPayslipDto, userRole: string) {
    const user = await this.prisma.ms_users.findUnique({
      where: { id: userId },
      include: { ms_employees: true },
    });
    if (!user || !user.ms_employees) {
      throw new NotFoundException('Employee not found');
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (!this.isAdminOrHRD(userRole)) {
      where.employee_id = user.ms_employees.id;
    }
    if (query.payroll_period_id) {
      where.payroll_period_id = query.payroll_period_id;
    }

    const [data, total] = await Promise.all([
      this.prisma.tr_payslips.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: { tr_payroll_periods: true },
      }),
      this.prisma.tr_payslips.count({ where }),
    ]);

    return { data, meta: { page, limit, total } };
  }

  async getPayslipDetail(userId: string, payslipId: string, userRole: string) {
    const user = await this.prisma.ms_users.findUnique({
      where: { id: userId },
      include: { ms_employees: true },
    });
    if (!user || !user.ms_employees) {
      throw new NotFoundException('Employee not found');
    }

    const payslip = await this.prisma.tr_payslips.findUnique({
      where: { id: payslipId },
      include: { tr_payroll_periods: true },
    });
    if (!payslip) {
      throw new NotFoundException('Payslip not found');
    }
    if (
      !this.isAdminOrHRD(userRole) &&
      payslip.employee_id !== user.ms_employees.id
    ) {
      throw new ForbiddenException('You can only view your own payslip');
    }

    return payslip;
  }

  async generatePayslip(
    userId: string,
    dto: GeneratePayslipDto,
    userRole: string,
    keycode?: string,
  ) {
    if (!this.isAdminOrHRD(userRole)) {
      throw new ForbiddenException('Only HRD or admin can generate payslips');
    }

    if (!keycode) {
      throw new BadRequestException('x-salary-keycode header is required to generate payslips.');
    }
    const isValid = await this.encryptionService.validateKeycode(keycode);
    if (!isValid) {
      throw new BadRequestException('Invalid or expired salary keycode.');
    }

    const period = await this.prisma.tr_payroll_periods.findUnique({
      where: { id: dto.payroll_period_id },
    });
    if (!period) {
      throw new NotFoundException('Payroll period not found');
    }

    const existing = await this.prisma.tr_payslips.findFirst({
      where: {
        employee_id: dto.employee_id,
        payroll_period_id: dto.payroll_period_id,
      },
    });
    if (existing) {
      throw new BadRequestException(
        'Payslip already exists for this employee and period',
      );
    }

    const employee = await this.prisma.ms_employees.findUnique({
      where: { id: dto.employee_id },
      select: { ptkp_status: true },
    });
    const ptkpStatus = employee?.ptkp_status || 'TK/0';
    const data = await this.buildPayslipData(
      dto.employee_id,
      period,
      ptkpStatus,
      keycode,
    );

    const [payslip] = await this.prisma.$transaction([
      this.prisma.tr_payslips.create({
        data: {
          employee_id: dto.employee_id,
          payroll_period_id: dto.payroll_period_id,
          base_salary: data.effectiveBaseSalary,
          fixed_allowance: data.effectiveFixedAllowance,
          phone_allowance: data.phoneAllowance,
          dinas_allowance: data.dinasAllowance,
          attendance_allowance: data.attendanceAllowance,
          overtime_pay: data.overtimePay,
          overtime_meal_allowance: data.overtimeMealAllowance,
          reimbursement_amount: data.reimbursementAmount,
          late_deduction: data.lateDeduction,
          loan_deduction: data.loanDeductionAmount,
          bpjs_kesehatan: data.bpjs.kesehatan,
          bpjs_ketenagakerjaan: data.bpjs.ketenagakerjaan,
          bpjs_jp: data.bpjs.jp,
          unpaid_leave_deduction: data.unpaidLeaveDeduction,
          pph21: data.pph21,
          other_deductions: 0,
          prorate_days_worked: data.workedDays,
          prorate_days_effective: 21,
          is_prorated: data.isProrated,
          gross_income: data.grossIncome,
          total_deductions: data.totalDeductions,
          net_income: data.netIncome,
          pdf_url: null,
          status: 'draft',
        },
      }),
    ]);

    await this.updateLoanBalances(data.loanDeductions as any[]);

    return payslip;
  }

  private async updateLoanBalances(
    loans: {
      id: string;
      monthly_deduction: number | null;
      remaining_amount: number | null;
    }[],
  ) {
    for (const loan of loans) {
      const monthlyDeduction = Number(loan.monthly_deduction || 0);
      const remaining = Number(loan.remaining_amount || 0);
      const deduction = Math.min(monthlyDeduction, remaining);
      const newRemaining = Number((remaining - deduction).toFixed(2));

      if (newRemaining <= 0) {
        await this.prisma.tr_loan_deductions.update({
          where: { id: loan.id },
          data: { remaining_amount: 0, status: 'paid_off' },
        });
      } else {
        await this.prisma.tr_loan_deductions.update({
          where: { id: loan.id },
          data: { remaining_amount: newRemaining },
        });
      }
    }
  }

  async generateBatchPayslip(
    userId: string,
    dto: GenerateBatchPayslipDto,
    userRole: string,
    keycode?: string,
  ) {
    if (!this.isAdminOrHRD(userRole)) {
      throw new ForbiddenException('Only HRD or admin can generate payslips');
    }

    if (!keycode) {
      throw new BadRequestException('x-salary-keycode header is required to generate payslips.');
    }
    const isValid = await this.encryptionService.validateKeycode(keycode);
    if (!isValid) {
      throw new BadRequestException('Invalid or expired salary keycode.');
    }

    const period = await this.prisma.tr_payroll_periods.findUnique({
      where: { id: dto.payroll_period_id },
    });
    if (!period) {
      throw new NotFoundException('Payroll period not found');
    }

    const departments = await this.prisma.ms_departments.findMany({
      where: { company_id: period.company_id },
      select: { id: true },
    });
    const departmentIds = departments.map((d) => d.id);

    const employees = await this.prisma.ms_employees.findMany({
      where: {
        is_active: true,
        department_id: { in: departmentIds },
      },
      select: { id: true, ptkp_status: true },
    });

    const existingPayslips = await this.prisma.tr_payslips.findMany({
      where: {
        payroll_period_id: dto.payroll_period_id,
        employee_id: { in: employees.map((e) => e.id) },
      },
      select: { employee_id: true },
    });
    const existingEmployeeIds = new Set(
      existingPayslips.map((p) => p.employee_id),
    );

    const results: { employee_id: string; status: string; error?: string }[] =
      [];

    for (const emp of employees) {
      if (existingEmployeeIds.has(emp.id)) {
        results.push({
          employee_id: emp.id,
          status: 'skipped',
          error: 'Payslip already exists',
        });
        continue;
      }

      try {
        const data = await this.buildPayslipData(
          emp.id,
          period,
          emp.ptkp_status || 'TK/0',
          keycode,
        );

        await this.prisma.$transaction([
          this.prisma.tr_payslips.create({
            data: {
              employee_id: emp.id,
              payroll_period_id: dto.payroll_period_id,
              base_salary: data.effectiveBaseSalary,
              fixed_allowance: data.effectiveFixedAllowance,
              phone_allowance: data.phoneAllowance,
              dinas_allowance: data.dinasAllowance,
              attendance_allowance: data.attendanceAllowance,
              overtime_pay: data.overtimePay,
              overtime_meal_allowance: data.overtimeMealAllowance,
              reimbursement_amount: data.reimbursementAmount,
              late_deduction: data.lateDeduction,
              loan_deduction: data.loanDeductionAmount,
              bpjs_kesehatan: data.bpjs.kesehatan,
              bpjs_ketenagakerjaan: data.bpjs.ketenagakerjaan,
              bpjs_jp: data.bpjs.jp,
              unpaid_leave_deduction: data.unpaidLeaveDeduction,
              pph21: data.pph21,
              other_deductions: 0,
              prorate_days_worked: data.workedDays,
              prorate_days_effective: 21,
              is_prorated: data.isProrated,
              gross_income: data.grossIncome,
              total_deductions: data.totalDeductions,
              net_income: data.netIncome,
              pdf_url: null,
              status: 'draft',
            },
          }),
        ]);

        await this.updateLoanBalances(data.loanDeductions as any[]);

        results.push({ employee_id: emp.id, status: 'created' });
      } catch (err) {
        results.push({
          employee_id: emp.id,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return {
      total: employees.length,
      created: results.filter((r) => r.status === 'created').length,
      skipped: results.filter((r) => r.status === 'skipped').length,
      errors: results.filter((r) => r.status === 'error').length,
      details: results,
    };
  }

  async publishPayslip(userId: string, payslipId: string, userRole: string) {
    if (!this.isAdminOrHRD(userRole)) {
      throw new ForbiddenException('Only HRD or admin can publish payslips');
    }

    const payslip = await this.prisma.tr_payslips.findUnique({
      where: { id: payslipId },
      include: {
        ms_employees: { select: { full_name: true, nik: true, birth_date: true } },
        tr_payroll_periods: { select: { period_name: true } },
      },
    });
    if (!payslip) {
      throw new NotFoundException('Payslip not found');
    }
    if (payslip.status === 'published') {
      throw new BadRequestException('Payslip already published');
    }

    let pdfPassword = undefined;
    if (payslip.ms_employees?.birth_date) {
      const birthDate = new Date(payslip.ms_employees.birth_date);
      const day = String(birthDate.getDate()).padStart(2, '0');
      const month = String(birthDate.getMonth() + 1).padStart(2, '0');
      const year = String(birthDate.getFullYear());
      pdfPassword = `${day}${month}${year}`;
    }

    const pdfBuffer = await this.pdfService.generatePayslipPdf({
      employeeName: payslip.ms_employees?.full_name || '-',
      nik: payslip.ms_employees?.nik || '-',
      periodName: payslip.tr_payroll_periods?.period_name || '-',
      baseSalary: Number(payslip.base_salary || 0),
      fixedAllowance: Number(payslip.fixed_allowance || 0),
      phoneAllowance: Number(payslip.phone_allowance || 0),
      dinasAllowance: Number(payslip.dinas_allowance || 0),
      attendanceAllowance: Number(payslip.attendance_allowance || 0),
      overtimePay: Number(payslip.overtime_pay || 0),
      overtimeMealAllowance: Number(payslip.overtime_meal_allowance || 0),
      grossIncome: Number(payslip.gross_income || 0),
      lateDeduction: Number(payslip.late_deduction || 0),
      loanDeduction: Number(payslip.loan_deduction || 0),
      bpjsKesehatan: Number(payslip.bpjs_kesehatan || 0),
      bpjsKetenagakerjaan: Number(payslip.bpjs_ketenagakerjaan || 0),
      pph21: Number(payslip.pph21 || 0),
      totalDeductions: Number(payslip.total_deductions || 0),
      netIncome: Number(payslip.net_income || 0),
    }, pdfPassword);

    // TODO: Upload pdfBuffer to cloud storage and get real URL
    const pdfUrl = `https://storage.supabase.co/payslips/${payslipId}.pdf`;

    return this.prisma.tr_payslips.update({
      where: { id: payslipId },
      data: {
        status: 'published',
        published_at: new Date(),
        pdf_url: pdfUrl,
      },
    });
  }

  async listPayrollPeriods(companyId?: string) {
    const where: any = {};
    if (companyId) {
      where.company_id = companyId;
    }
    return this.prisma.tr_payroll_periods.findMany({
      where,
      orderBy: { year: 'desc' },
    });
  }

  async createPeriod(dto: CreatePayrollPeriodDto, userRole: string) {
    if (!this.isAdminOrHRD(userRole)) {
      throw new ForbiddenException(
        'Only HRD or admin can create payroll periods',
      );
    }

    const existing = await this.prisma.tr_payroll_periods.findFirst({
      where: {
        company_id: dto.company_id,
        month: dto.month,
        year: dto.year,
      },
    });
    if (existing) {
      throw new BadRequestException(
        'Payroll period already exists for this company, month, and year',
      );
    }

    return this.prisma.tr_payroll_periods.create({
      data: {
        company_id: dto.company_id,
        month: dto.month,
        year: dto.year,
        period_name: dto.period_name,
        start_date: dto.start_date ? new Date(dto.start_date) : null,
        end_date: dto.end_date ? new Date(dto.end_date) : null,
        attendance_cutoff_start: dto.attendance_cutoff_start
          ? new Date(dto.attendance_cutoff_start)
          : null,
        attendance_cutoff_end: dto.attendance_cutoff_end
          ? new Date(dto.attendance_cutoff_end)
          : null,
        payment_date: dto.payment_date ? new Date(dto.payment_date) : null,
        status: 'draft',
      },
    });
  }

  async updatePeriod(
    periodId: string,
    dto: UpdatePayrollPeriodDto,
    userRole: string,
  ) {
    if (!this.isAdminOrHRD(userRole)) {
      throw new ForbiddenException(
        'Only HRD or admin can update payroll periods',
      );
    }

    const period = await this.prisma.tr_payroll_periods.findUnique({
      where: { id: periodId },
    });
    if (!period) {
      throw new NotFoundException('Payroll period not found');
    }
    if (period.status === 'published' || period.status === 'closed') {
      throw new BadRequestException(
        'Cannot update a published or closed payroll period',
      );
    }

    const data: any = {};
    if (dto.period_name !== undefined) data.period_name = dto.period_name;
    if (dto.start_date !== undefined)
      data.start_date = new Date(dto.start_date);
    if (dto.end_date !== undefined) data.end_date = new Date(dto.end_date);
    if (dto.attendance_cutoff_start !== undefined)
      data.attendance_cutoff_start = new Date(dto.attendance_cutoff_start);
    if (dto.attendance_cutoff_end !== undefined)
      data.attendance_cutoff_end = new Date(dto.attendance_cutoff_end);
    if (dto.payment_date !== undefined)
      data.payment_date = new Date(dto.payment_date);
    if (dto.status !== undefined) data.status = dto.status;

    return this.prisma.tr_payroll_periods.update({
      where: { id: periodId },
      data,
    });
  }

  async listTHR(userId: string, userRole: string) {
    const user = await this.prisma.ms_users.findUnique({
      where: { id: userId },
      include: { ms_employees: true },
    });
    if (!user || !user.ms_employees) {
      throw new NotFoundException('Employee not found');
    }

    const where: any = {};
    if (!this.isAdminOrHRD(userRole)) {
      where.employee_id = user.ms_employees.id;
    }

    return this.prisma.tr_thr_records.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        ms_employees: { select: { id: true, full_name: true, nik: true } },
      },
    });
  }

  async generateTHR(
    userId: string,
    dto: GenerateTHRDto,
    userRole: string,
    keycode?: string,
  ) {
    if (!this.isAdminOrHRD(userRole)) {
      throw new ForbiddenException('Only HRD or admin can generate THR');
    }

    if (!keycode) {
      throw new BadRequestException('x-salary-keycode header is required to generate THR.');
    }
    const isValid = await this.encryptionService.validateKeycode(keycode);
    if (!isValid) {
      throw new BadRequestException('Invalid or expired salary keycode.');
    }

    const employee = await this.prisma.ms_employees.findUnique({
      where: { id: dto.employee_id },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    if (!employee.join_date) {
      throw new BadRequestException('Employee join date is not set');
    }

    const existing = await this.prisma.tr_thr_records.findFirst({
      where: {
        employee_id: dto.employee_id,
        period_name: dto.period_name,
      },
    });
    if (existing) {
      throw new BadRequestException(
        'THR record already exists for this employee and period',
      );
    }

    let baseSalary = 0;
    if (employee.base_salary) {
      try {
        const decrypted = this.encryptionService.decrypt(employee.base_salary, keycode);
        const num = Number(decrypted);
        baseSalary = isNaN(num) ? 0 : num;
      } catch {
        baseSalary = 0;
      }
    }

    const monthsWorked = await this.computeMonthsWorked(
      new Date(employee.join_date),
      new Date(),
    );
    const thrDivisor = await this.parameterService.getNumber(
      'thr_divisor_months',
      12,
    );
    const thrAmount = Number(
      ((baseSalary / thrDivisor) * monthsWorked).toFixed(2),
    );

    return this.prisma.tr_thr_records.create({
      data: {
        employee_id: dto.employee_id,
        period_name: dto.period_name,
        base_salary: baseSalary,
        months_worked: monthsWorked,
        thr_amount: thrAmount,
        is_prorated: monthsWorked < 12,
        status: 'draft',
      },
    });
  }

  async exportPayroll(payrollPeriodId: string, userRole: string) {
    if (!this.isAdminOrHRD(userRole)) {
      throw new ForbiddenException('Only HRD or admin can export payroll');
    }

    const period = await this.prisma.tr_payroll_periods.findUnique({
      where: { id: payrollPeriodId },
    });
    if (!period) {
      throw new NotFoundException('Payroll period not found');
    }

    const payslips = await this.prisma.tr_payslips.findMany({
      where: { payroll_period_id: payrollPeriodId },
      include: {
        ms_employees: {
          select: {
            full_name: true,
            nik: true,
            bank_name: true,
            bank_account_number: true,
          },
        },
      },
      orderBy: { created_at: 'asc' },
    });

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Payroll');

    worksheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'NIK', key: 'nik', width: 15 },
      { header: 'Nama Karyawan', key: 'name', width: 25 },
      { header: 'Bank', key: 'bank', width: 15 },
      { header: 'No Rekening', key: 'account', width: 20 },
      { header: 'Gaji Pokok', key: 'base', width: 15 },
      { header: 'Tunjangan Tetap', key: 'fixed', width: 15 },
      { header: 'Tunjangan Pulsa', key: 'phone', width: 15 },
      { header: 'Tunjangan Dinas', key: 'dinas', width: 15 },
      { header: 'Uang Kehadiran', key: 'attendance', width: 15 },
      { header: 'Lembur', key: 'overtime', width: 15 },
      { header: 'Uang Makan Lembur', key: 'meal', width: 15 },
      { header: 'Reimbursement', key: 'reimbursement', width: 15 },
      { header: 'Gross Income', key: 'gross', width: 15 },
      { header: 'Potongan Terlambat', key: 'late', width: 15 },
      { header: 'Potongan Pinjaman', key: 'loan', width: 15 },
      { header: 'BPJS Kesehatan', key: 'bpjs_kes', width: 15 },
      { header: 'BPJS TK', key: 'bpjs_tk', width: 15 },
      { header: 'BPJS JP', key: 'bpjs_jp', width: 15 },
      { header: 'Potongan Cuti', key: 'unpaid_leave', width: 15 },
      { header: 'PPh21', key: 'pph21', width: 15 },
      { header: 'Total Potongan', key: 'total_deductions', width: 15 },
      { header: 'Net Income', key: 'net', width: 15 },
    ];

    payslips.forEach((p, index) => {
      worksheet.addRow({
        no: index + 1,
        nik: p.ms_employees?.nik || '-',
        name: p.ms_employees?.full_name || '-',
        bank: p.ms_employees?.bank_name || '-',
        account: p.ms_employees?.bank_account_number || '-',
        base: Number(p.base_salary),
        fixed: Number(p.fixed_allowance),
        phone: Number(p.phone_allowance),
        dinas: Number(p.dinas_allowance),
        attendance: Number(p.attendance_allowance),
        overtime: Number(p.overtime_pay),
        meal: Number(p.overtime_meal_allowance),
        reimbursement: Number(p.reimbursement_amount),
        gross: Number(p.gross_income),
        late: Number(p.late_deduction),
        loan: Number(p.loan_deduction),
        bpjs_kes: Number(p.bpjs_kesehatan),
        bpjs_tk: Number(p.bpjs_ketenagakerjaan),
        bpjs_jp: Number(p.bpjs_jp),
        unpaid_leave: Number(p.unpaid_leave_deduction),
        pph21: Number(p.pph21),
        total_deductions: Number(p.total_deductions),
        net: Number(p.net_income),
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }
}
