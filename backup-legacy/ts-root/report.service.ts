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

  private async getEmployeeIdsByDepartment(
    departmentId: string,
  ): Promise<string[]> {
    const employees = await this.prisma.ms_employees.findMany({
      where: { department_id: departmentId },
      select: { id: true },
    });
    return employees.map((e) => e.id);
  }

  async attendanceReport(userRole: string, query: AttendanceReportDto) {
    if (!this.isAdminOrHRD(userRole)) {
      throw new ForbiddenException('Only Admin/HRD can access reports');
    }

    const where: any = {};

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
      const employeeIds = await this.getEmployeeIdsByDepartment(
        query.department_id,
      );
      where.employee_id = { in: employeeIds };
    }

    const data = await this.prisma.tr_attendances.findMany({
      where,
      orderBy: { attendance_date: 'desc' },
      include: {
        ms_employees: {
          include: {
            ms_departments_ms_employees_department_idToms_departments: {
              select: { id: true, name: true },
            },
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

  async leaveReport(userRole: string, query: LeaveReportDto) {
    if (!this.isAdminOrHRD(userRole)) {
      throw new ForbiddenException('Only Admin/HRD can access reports');
    }

    const where: any = {};

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
      const employeeIds = await this.getEmployeeIdsByDepartment(
        query.department_id,
      );
      where.employee_id = { in: employeeIds };
    }

    const data = await this.prisma.tr_leave_requests.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        ms_leave_types: true,
        ms_employees_tr_leave_requests_employee_idToms_employees: {
          include: {
            ms_departments_ms_employees_department_idToms_departments: {
              select: { id: true, name: true },
            },
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

  async payrollReport(userRole: string, query: PayrollReportDto) {
    if (!this.isAdminOrHRD(userRole)) {
      throw new ForbiddenException('Only Admin/HRD can access reports');
    }

    const where: any = {};

    if (query.payroll_period_id) {
      where.payroll_period_id = query.payroll_period_id;
    }

    if (query.department_id) {
      const employeeIds = await this.getEmployeeIdsByDepartment(
        query.department_id,
      );
      where.employee_id = { in: employeeIds };
    }

    const data = await this.prisma.tr_payslips.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        tr_payroll_periods: true,
        ms_employees: {
          include: {
            ms_departments_ms_employees_department_idToms_departments: {
              select: { id: true, name: true },
            },
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

  async overtimeReport(userRole: string, query: OvertimeReportDto) {
    if (!this.isAdminOrHRD(userRole)) {
      throw new ForbiddenException('Only Admin/HRD can access reports');
    }

    const where: any = { status: 'processed' };

    if (query.month) {
      const [year, month] = query.month.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      where.date = { gte: startDate, lte: endDate };
    }

    if (query.employee_id) {
      where.employee_id = query.employee_id;
    }

    if (query.department_id) {
      const employeeIds = await this.getEmployeeIdsByDepartment(
        query.department_id,
      );
      where.employee_id = { in: employeeIds };
    }

    const data = await this.prisma.tr_overtime_requests.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        ms_employees_tr_overtime_requests_employee_idToms_employees: {
          include: {
            ms_departments_ms_employees_department_idToms_departments: {
              select: { id: true, name: true },
            },
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

  async exportAttendanceExcel(userRole: string, query: AttendanceReportDto) {
    if (!this.isAdminOrHRD(userRole)) {
      throw new ForbiddenException('Only Admin/HRD can export reports');
    }

    const report = await this.attendanceReport(userRole, query);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance Report');

    worksheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Employee', key: 'employee', width: 25 },
      { header: 'Department', key: 'department', width: 20 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Clock In', key: 'clock_in', width: 12 },
      { header: 'Clock Out', key: 'clock_out', width: 12 },
      { header: 'Late (min)', key: 'late_minutes', width: 12 },
      { header: 'Deduction', key: 'deduction', width: 15 },
    ];

    for (const row of report.data as any[]) {
      worksheet.addRow({
        date: row.attendance_date?.toISOString().split('T')[0] || '',
        employee: row.ms_employees?.full_name || '',
        department:
          row.ms_employees
            ?.ms_departments_ms_employees_department_idToms_departments?.name ||
          '',
        status: row.status,
        clock_in: row.clock_in?.toISOString().substr(11, 5) || '',
        clock_out: row.clock_out?.toISOString().substr(11, 5) || '',
        late_minutes: row.late_minutes || 0,
        deduction: Number(row.late_deduction || 0),
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportLeaveExcel(userRole: string, query: LeaveReportDto) {
    if (!this.isAdminOrHRD(userRole)) {
      throw new ForbiddenException('Only Admin/HRD can export reports');
    }

    const report = await this.leaveReport(userRole, query);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Leave Report');

    worksheet.columns = [
      { header: 'Employee', key: 'employee', width: 25 },
      { header: 'Department', key: 'department', width: 20 },
      { header: 'Leave Type', key: 'leave_type', width: 20 },
      { header: 'Start Date', key: 'start_date', width: 15 },
      { header: 'End Date', key: 'end_date', width: 15 },
      { header: 'Total Days', key: 'total_days', width: 12 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Reason', key: 'reason', width: 30 },
    ];

    for (const row of report.data as any[]) {
      worksheet.addRow({
        employee:
          row.ms_employees_tr_leave_requests_employee_idToms_employees
            ?.full_name || '',
        department:
          row.ms_employees_tr_leave_requests_employee_idToms_employees
            ?.ms_departments_ms_employees_department_idToms_departments?.name ||
          '',
        leave_type: row.ms_leave_types?.name || '',
        start_date: row.start_date?.toISOString().split('T')[0] || '',
        end_date: row.end_date?.toISOString().split('T')[0] || '',
        total_days: row.total_days,
        status: row.status,
        reason: row.reason || '',
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportPayrollExcel(userRole: string, query: PayrollReportDto) {
    if (!this.isAdminOrHRD(userRole)) {
      throw new ForbiddenException('Only Admin/HRD can export reports');
    }

    const report = await this.payrollReport(userRole, query);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Payroll Report');

    worksheet.columns = [
      { header: 'Employee', key: 'employee', width: 25 },
      { header: 'Department', key: 'department', width: 20 },
      { header: 'Period', key: 'period', width: 20 },
      { header: 'Base Salary', key: 'base_salary', width: 15 },
      { header: 'Gross Income', key: 'gross_income', width: 15 },
      { header: 'Total Deductions', key: 'total_deductions', width: 15 },
      { header: 'Net Income', key: 'net_income', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
    ];

    for (const row of report.data as any[]) {
      worksheet.addRow({
        employee: row.ms_employees?.full_name || '',
        department:
          row.ms_employees
            ?.ms_departments_ms_employees_department_idToms_departments?.name ||
          '',
        period: row.tr_payroll_periods?.period_name || '',
        base_salary: Number(row.base_salary || 0),
        gross_income: Number(row.gross_income || 0),
        total_deductions: Number(row.total_deductions || 0),
        net_income: Number(row.net_income || 0),
        status: row.status,
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportOvertimeExcel(userRole: string, query: OvertimeReportDto) {
    if (!this.isAdminOrHRD(userRole)) {
      throw new ForbiddenException('Only Admin/HRD can export reports');
    }

    const report = await this.overtimeReport(userRole, query);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Overtime Report');

    worksheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Employee', key: 'employee', width: 25 },
      { header: 'Department', key: 'department', width: 20 },
      { header: 'Start Time', key: 'start_time', width: 12 },
      { header: 'End Time', key: 'end_time', width: 12 },
      { header: 'Total Hours', key: 'total_hours', width: 12 },
      { header: 'Day Type', key: 'day_type', width: 12 },
      { header: 'Overtime Pay', key: 'overtime_pay', width: 15 },
      { header: 'Meal Allowance', key: 'meal_allowance', width: 15 },
    ];

    for (const row of report.data as any[]) {
      const emp =
        row.ms_employees_tr_overtime_requests_employee_idToms_employees;
      worksheet.addRow({
        date: row.date?.toISOString().split('T')[0] || '',
        employee: emp?.full_name || '',
        department:
          emp?.ms_departments_ms_employees_department_idToms_departments
            ?.name || '',
        start_time: row.start_time?.toISOString().substr(11, 5) || '',
        end_time: row.end_time?.toISOString().substr(11, 5) || '',
        total_hours: Number(row.total_hours || 0),
        day_type: row.day_type || '',
        overtime_pay: Number(row.total_overtime_pay || 0),
        meal_allowance: Number(row.total_meal_allowance || 0),
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
