import { Injectable, Logger } from '@nestjs/common';
import { AttendanceService } from '../attendance/attendance.service';
import { PayrollService } from '../payroll/payroll.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly payrollService: PayrollService,
    private readonly prisma: PrismaService,
  ) {}

  async markAbsent() {
    await this.attendanceService.markAbsentEmployees();
    return { status: 'ok', task: 'mark-absent' };
  }

  async generatePayroll() {
    const activeCompanies = await this.prisma.ms_companies.findMany({
      where: { is_active: true },
      select: { id: true },
    });

    const results: { companyId: string; payslipsGenerated: number }[] = [];

    for (const company of activeCompanies) {
      const latestOpenPeriod = await this.prisma.tr_payroll_periods.findFirst({
        where: {
          company_id: company.id,
          status: { not: 'closed' },
        },
        orderBy: { period_name: 'desc' },
      });

      if (!latestOpenPeriod) {
        this.logger.log(`No open payroll period for company ${company.id}`);
        continue;
      }

      const employees = await this.prisma.ms_employees.findMany({
        where: { company_id: company.id, is_active: true },
      });

      const existingPayslips = await this.prisma.tr_payslips.findMany({
        where: {
          payroll_period_id: latestOpenPeriod.id,
          company_id: company.id,
        },
        select: { employee_id: true },
      });
      const existingEmployeeIds = new Set(existingPayslips.map((p) => p.employee_id));

      let payslipCount = 0;
      for (const employee of employees) {
        if (existingEmployeeIds.has(employee.id)) continue;

        await this.prisma.tr_payslips.create({
          data: {
            company_id: company.id,
            employee_id: employee.id,
            payroll_period_id: latestOpenPeriod.id,
            base_salary: 0,
            fixed_allowance: 0,
            gross_income: 0,
            total_deductions: 0,
            net_income: 0,
            status: 'draft',
          },
        });
        payslipCount++;
      }

      results.push({ companyId: company.id, payslipsGenerated: payslipCount });
    }

    return { status: 'ok', task: 'generate-payroll', results };
  }

  async cleanupNotifications() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    const result = await this.prisma.tr_notifications.deleteMany({
      where: { created_at: { lt: cutoff } },
    });

    this.logger.log(`Cleaned up ${result.count} old notifications`);
    return { status: 'ok', task: 'cleanup-notifications', deletedCount: result.count };
  }
}
