import { Injectable, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getOverview(companyId: string, userRole: string) {
    if (!["atasan", "manager_hrga", "hrd", "admin", "super_admin"].includes(userRole)) {
      throw new ForbiddenException("Only Admin/HRD can access dashboard");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalEmployees,
      activeEmployees,
      todayAttendance,
      pendingLeaves,
      currentPayroll,
      attendanceSummary,
    ] = await Promise.all([
      this.prisma.ms_employees.count({ where: { company_id: companyId } }),
      this.prisma.ms_employees.count({
        where: { company_id: companyId, is_active: true },
      }),
      this.prisma.tr_attendances.count({
        where: { company_id: companyId, attendance_date: { gte: today } },
      }),
      this.prisma.tr_leave_requests.count({
        where: { company_id: companyId, status: "pending" },
      }),
      this.prisma.tr_payroll_periods.findFirst({
        where: { company_id: companyId },
        orderBy: { created_at: "desc" },
      }),
      this.prisma.tr_attendances.groupBy({
        by: ["status"],
        where: { company_id: companyId, attendance_date: { gte: monthStart } },
        _count: true,
      }),
    ]);

    return {
      employees: {
        total: totalEmployees,
        active: activeEmployees,
      },
      attendance_today: todayAttendance,
      pending_leaves: pendingLeaves,
      current_payroll_period: currentPayroll,
      attendance_this_month: attendanceSummary.reduce(
        (acc, row) => ({ ...acc, [row.status]: row._count }),
        {} as Record<string, number>,
      ),
    };
  }
}
