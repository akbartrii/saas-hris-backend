import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PdfService } from '../../common/services/pdf.service';
import * as ExcelJS from 'exceljs';
import {
  AttendanceReportDto,
  LeaveReportDto,
  PayrollReportDto,
  OvertimeReportDto,
} from './dto/report.dto';

@Injectable()
export class ReportService {
  constructor(
    private prisma: PrismaService,
    private pdfService: PdfService,
  ) {}

  private isAdminOrHRD(role: string): boolean {
    return ['manager_hrga', 'hrd', 'admin', 'super_admin'].includes(role);
  }

  async attendanceReport(
    companyId: string,
    userRole: string,
    query: AttendanceReportDto,
  ) {
    if (!this.isAdminOrHRD(userRole)) {
      throw new ForbiddenException('Only Admin/HRD can access reports');
    }

    const where: any = { company_id: companyId };

    if (query.month) {
      const [year, month] = query.month.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      where.attendance_date = { gte: startDate, lte: endDate };
    }

    if (query.employee_id) {
      where.employee_id = query.employee_id;
    }

    if (query.department_id) {
      const employees = await this.prisma.ms_employees.findMany({
        where: { department_id: query.department_id, company_id: companyId },
        select: { id: true },
      });
      where.employee_id = { in: employees.map((e) => e.id) };
    }

    const data = await this.prisma.tr_attendances.findMany({
      where,
      orderBy: { attendance_date: 'desc' },
      include: {
        ms_employees: {
          include: {
            ms_departments_ms_employees_department_idToms_departments: { select: { id: true, name: true } },
          },
        },
      },
    });

    const summary = {
      total_records: data.length,
      present_count: data.filter((a) => a.status === 'present').length,
      late_count: data.filter((a) => a.status === 'late').length,
      absent_count: data.filter((a) => !a.clock_in).length,
      total_late_deduction: data.reduce(
        (sum, a) => sum + Number(a.late_deduction || 0),
        0,
      ),
    };

    return { data, summary };
  }

  async leaveReport(
    companyId: string,
    userRole: string,
    query: LeaveReportDto,
  ) {
    if (!this.isAdminOrHRD(userRole)) {
      throw new ForbiddenException('Only Admin/HRD can access reports');
    }

    const where: any = { company_id: companyId };

    if (query.year) {
      const year = Number(query.year);
      where.start_date = {
        gte: new Date(year, 0, 1),
        lte: new Date(year, 11, 31),
      };
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.department_id) {
      const employees = await this.prisma.ms_employees.findMany({
        where: { department_id: query.department_id, company_id: companyId },
        select: { id: true },
      });
      where.employee_id = { in: employees.map((e) => e.id) };
    }

    const data = await this.prisma.tr_leave_requests.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        ms_leave_types: true,
        ms_employees_tr_leave_requests_employee_idToms_employees: {
          include: {
            ms_departments_ms_employees_department_idToms_departments: { select: { id: true, name: true } },
          },
        },
      },
    });

    const summary = {
      total_requests: data.length,
      approved_count: data.filter((l) => l.status === 'approved').length,
      rejected_count: data.filter((l) => l.status === 'rejected').length,
      pending_count: data.filter((l) => l.status === 'pending').length,
      total_days: data.reduce((sum, l) => sum + (l.total_days || 0), 0),
    };

    return { data, summary };
  }

  async payrollReport(
    companyId: string,
    userRole: string,
    query: PayrollReportDto,
  ) {
    if (!this.isAdminOrHRD(userRole)) {
      throw new ForbiddenException('Only Admin/HRD can access reports');
    }

    const where: any = { company_id: companyId };

    if (query.payroll_period_id) {
      where.payroll_period_id = query.payroll_period_id;
    }

    if (query.department_id) {
      const employees = await this.prisma.ms_employees.findMany({
        where: { department_id: query.department_id, company_id: companyId },
        select: { id: true },
      });
      where.employee_id = { in: employees.map((e) => e.id) };
    }

    const data = await this.prisma.tr_payslips.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        tr_payroll_periods: true,
        ms_employees: {
          include: {
            ms_departments_ms_employees_department_idToms_departments: { select: { id: true, name: true } },
          },
        },
      },
    });

    const summary = {
      total_payslips: data.length,
      total_gross_income: data.reduce(
        (sum, p) => sum + Number(p.gross_income || 0),
        0,
      ),
      total_deductions: data.reduce(
        (sum, p) => sum + Number(p.total_deductions || 0),
        0,
      ),
      total_net_income: data.reduce(
        (sum, p) => sum + Number(p.net_income || 0),
        0,
      ),
    };

    return { data, summary };
  }

  async exportAttendanceExcel(
    userRole: string,
    companyId: string,
    query: AttendanceReportDto,
  ) {
    const report = await this.attendanceReport(companyId, userRole, query);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Attendance');
    sheet.columns = [
      { header: 'Date', key: 'date' },
      { header: 'Employee', key: 'employee' },
      { header: 'Clock In', key: 'clockIn' },
      { header: 'Clock Out', key: 'clockOut' },
      { header: 'Status', key: 'status' },
    ];
    for (const row of report.data) {
      sheet.addRow({
        date: row.attendance_date,
        employee: row.ms_employees?.full_name,
        clockIn: row.clock_in,
        clockOut: row.clock_out,
        status: row.status,
      });
    }
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  async exportLeaveExcel(
    userRole: string,
    companyId: string,
    query: LeaveReportDto,
  ) {
    const report = await this.leaveReport(companyId, userRole, query);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Leave');
    sheet.columns = [
      { header: 'Employee', key: 'employee' },
      { header: 'Leave Type', key: 'type' },
      { header: 'Start', key: 'start' },
      { header: 'End', key: 'end' },
      { header: 'Status', key: 'status' },
    ];
    for (const row of report.data) {
      sheet.addRow({
        employee: row.ms_employees_tr_leave_requests_employee_idToms_employees?.full_name,
        type: row.ms_leave_types?.name,
        start: row.start_date,
        end: row.end_date,
        status: row.status,
      });
    }
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  async exportPayrollExcel(
    userRole: string,
    companyId: string,
    query: PayrollReportDto,
  ) {
    const report = await this.payrollReport(companyId, userRole, query);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Payroll');
    sheet.columns = [
      { header: 'Employee', key: 'employee' },
      { header: 'Gross Income', key: 'gross' },
      { header: 'Deductions', key: 'deductions' },
      { header: 'Net Income', key: 'net' },
    ];
    for (const row of report.data) {
      sheet.addRow({
        employee: row.ms_employees?.full_name,
        gross: row.gross_income,
        deductions: row.total_deductions,
        net: row.net_income,
      });
    }
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  async exportOvertimeExcel(
    userRole: string,
    companyId: string,
    query: OvertimeReportDto,
  ) {
    const report = await this.overtimeReport(companyId, userRole, query);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Overtime');
    sheet.columns = [
      { header: 'Employee', key: 'employee' },
      { header: 'Date', key: 'date' },
      { header: 'Hours', key: 'hours' },
      { header: 'Pay', key: 'pay' },
      { header: 'Status', key: 'status' },
    ];
    for (const row of report.data) {
      sheet.addRow({
        employee: row.ms_employees_tr_overtime_requests_employee_idToms_employees?.full_name,
        date: row.date,
        hours: row.total_hours,
        pay: row.total_overtime_pay,
        status: row.status,
      });
    }
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  async overtimeReport(
    companyId: string,
    userRole: string,
    query: OvertimeReportDto,
  ) {
    if (!this.isAdminOrHRD(userRole)) {
      throw new ForbiddenException('Only Admin/HRD can access reports');
    }

    const where: any = { company_id: companyId, status: 'processed' };

    if (query.month) {
      const [year, month] = query.month.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      where.date = { gte: startDate, lte: endDate };
    }

    if (query.employee_id) {
      where.employee_id = query.employee_id;
    }

    const data = await this.prisma.tr_overtime_requests.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        ms_employees_tr_overtime_requests_employee_idToms_employees: {
          include: {
            ms_departments_ms_employees_department_idToms_departments: { select: { id: true, name: true } },
          },
        },
      },
    });

    const summary = {
      total_requests: data.length,
      total_hours: data.reduce((sum, o) => sum + Number(o.total_hours || 0), 0),
      total_overtime_pay: data.reduce(
        (sum, o) => sum + Number(o.total_overtime_pay || 0),
        0,
      ),
      total_meal_allowance: data.reduce(
        (sum, o) => sum + Number(o.total_meal_allowance || 0),
        0,
      ),
    };

    return { data, summary };
  }
}