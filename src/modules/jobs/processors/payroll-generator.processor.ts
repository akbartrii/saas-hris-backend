import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";

@Processor("payroll-generation")
@Injectable()
export class PayrollGeneratorProcessor extends WorkerHost {
  private readonly logger = new Logger(PayrollGeneratorProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(
    job: Job<{ periodId: string; companyId: string }>,
  ): Promise<any> {
    this.logger.log(
      `Processing payroll generation job ${job.id} for period ${job.data.periodId}`,
    );

    const { periodId, companyId } = job.data;

    const period = await this.prisma.tr_payroll_periods.findUnique({
      where: { id: periodId },
      include: { ms_companies: true },
    });

    if (!period) {
      throw new Error(`Payroll period ${periodId} not found`);
    }

    const activeEmployees = await this.prisma.ms_employees.findMany({
      where: {
        company_id: companyId,
        is_active: true,
      },
      include: {
        ms_users: true,
      },
    });

    this.logger.log(
      `Found ${activeEmployees.length} active employees for period ${period.period_name}`,
    );

    let generated = 0;
    for (const employee of activeEmployees) {
      const existingPayslip = await this.prisma.tr_payslips.findFirst({
        where: {
          employee_id: employee.id,
          payroll_period_id: periodId,
        },
      });

      if (existingPayslip && existingPayslip.status !== "draft") {
        continue;
      }

      const attendanceData = await this.prisma.tr_attendances.findMany({
        where: {
          employee_id: employee.id,
          attendance_date: {
            gte: period.attendance_cutoff_start,
            lte: period.attendance_cutoff_end,
          },
        },
      });

      const totalAttendanceAllowance = attendanceData.reduce(
        (sum, a) => sum + Number(a.attendance_allowance || 0),
        0,
      );
      const totalLateDeduction = attendanceData.reduce(
        (sum, a) => sum + Number(a.late_deduction || 0),
        0,
      );

      const overtimeData = await this.prisma.tr_overtime_requests.findMany({
        where: {
          employee_id: employee.id,
          status: "approved",
          date: {
            gte: period.attendance_cutoff_start,
            lte: period.attendance_cutoff_end,
          },
        },
      });

      const totalOvertimePay = overtimeData.reduce(
        (sum, o) => sum + Number(o.total_overtime_pay || 0),
        0,
      );
      const totalOvertimeMeal = overtimeData.reduce(
        (sum, o) => sum + Number(o.total_meal_allowance || 0),
        0,
      );

      const baseSalary = Number(employee.base_salary || 0);
      const fixedAllowance = Number(employee.fixed_allowance || 0);
      const grossIncome =
        baseSalary +
        fixedAllowance +
        totalAttendanceAllowance +
        totalOvertimePay +
        totalOvertimeMeal;
      const totalDeductions = totalLateDeduction;
      const netIncome = grossIncome - totalDeductions;

      await this.prisma.tr_payslips.upsert({
        where: existingPayslip ? { id: existingPayslip.id } : { id: "" },
        create: {
          employee_id: employee.id,
          payroll_period_id: periodId,
          company_id: companyId,
          base_salary: baseSalary,
          fixed_allowance: fixedAllowance,
          attendance_allowance: totalAttendanceAllowance,
          overtime_pay: totalOvertimePay,
          overtime_meal_allowance: totalOvertimeMeal,
          late_deduction: totalLateDeduction,
          gross_income: grossIncome,
          total_deductions: totalDeductions,
          net_income: netIncome,
          status: "draft",
        },
        update: {
          base_salary: baseSalary,
          fixed_allowance: fixedAllowance,
          attendance_allowance: totalAttendanceAllowance,
          overtime_pay: totalOvertimePay,
          overtime_meal_allowance: totalOvertimeMeal,
          late_deduction: totalLateDeduction,
          gross_income: grossIncome,
          total_deductions: totalDeductions,
          net_income: netIncome,
        },
      });

      generated++;
    }

    await this.prisma.tr_payroll_periods.update({
      where: { id: periodId },
      data: { status: "generated" },
    });

    this.logger.log(
      `Generated ${generated} payslips for period ${period.period_name}`,
    );
    return { generated };
  }
}
