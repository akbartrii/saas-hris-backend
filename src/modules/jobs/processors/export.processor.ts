import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Processor('export')
@Injectable()
export class ExportProcessor extends WorkerHost {
  private readonly logger = new Logger(ExportProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<{
    type: string;
    format: string;
    companyId: string;
    filters?: Record<string, any>;
  }>): Promise<any> {
    this.logger.log(`Processing export job ${job.id}: type=${job.data.type}, format=${job.data.format}`);

    const { type, format, companyId, filters } = job.data;

    switch (type) {
      case 'payroll':
        return this.exportPayroll(companyId, format, filters);
      case 'attendance':
        return this.exportAttendance(companyId, format, filters);
      case 'leave':
        return this.exportLeave(companyId, format, filters);
      case 'overtime':
        return this.exportOvertime(companyId, format, filters);
      default:
        throw new Error(`Unknown export type: ${type}`);
    }
  }

  private async exportPayroll(companyId: string, format: string, filters?: Record<string, any>) {
    const payslips = await this.prisma.tr_payslips.findMany({
      where: {
        company_id: companyId,
        ...(filters?.periodId ? { payroll_period_id: filters.periodId } : {}),
      },
      include: {
        ms_employees: { select: { full_name: true, nik: true } },
        tr_payroll_periods: { select: { period_name: true } },
      },
    });

    this.logger.log(`Exporting ${payslips.length} payslips for company ${companyId} as ${format}`);

    return {
      records: payslips.length,
      format,
      message: `${format.toUpperCase()} export for ${payslips.length} payslips ready`,
    };
  }

  private async exportAttendance(companyId: string, format: string, filters?: Record<string, any>) {
    const where: any = { company_id: companyId };

    if (filters?.startDate) {
      where.attendance_date = { ...where.attendance_date, gte: new Date(filters.startDate) };
    }
    if (filters?.endDate) {
      where.attendance_date = { ...where.attendance_date, lte: new Date(filters.endDate) };
    }
    if (filters?.employeeId) {
      where.employee_id = filters.employeeId;
    }

    const records = await this.prisma.tr_attendances.findMany({
      where,
      include: {
        ms_employees: { select: { full_name: true, nik: true } },
      },
    });

    this.logger.log(`Exporting ${records.length} attendance records for company ${companyId} as ${format}`);
    return { records: records.length, format };
  }

  private async exportLeave(companyId: string, format: string, filters?: Record<string, any>) {
    const where: any = { company_id: companyId };

    if (filters?.startDate) {
      where.start_date = { ...where.start_date, gte: new Date(filters.startDate) };
    }
    if (filters?.endDate) {
      where.end_date = { ...where.end_date, lte: new Date(filters.endDate) };
    }

    const records = await this.prisma.tr_leave_requests.findMany({
      where,
      include: {
        ms_employees_tr_leave_requests_employee_idToms_employees: {
          select: { full_name: true, nik: true },
        },
      },
    });

    this.logger.log(`Exporting ${records.length} leave records for company ${companyId} as ${format}`);
    return { records: records.length, format };
  }

  private async exportOvertime(companyId: string, format: string, filters?: Record<string, any>) {
    const where: any = { company_id: companyId };

    if (filters?.startDate) {
      where.date = { ...where.date, gte: new Date(filters.startDate) };
    }
    if (filters?.endDate) {
      where.date = { ...where.date, lte: new Date(filters.endDate) };
    }

    const records = await this.prisma.tr_overtime_requests.findMany({
      where,
      include: {
        ms_employees_tr_overtime_requests_employee_idToms_employees: {
          select: { full_name: true, nik: true },
        },
      },
    });

    this.logger.log(`Exporting ${records.length} overtime records for company ${companyId} as ${format}`);
    return { records: records.length, format };
  }
}
