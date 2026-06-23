import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../../prisma/prisma.service";
import { ParameterService } from "../parameter/parameter.service";
import { CreateLeaveDto } from "./dto/create-leave.dto";
import { ApproveLeaveDto } from "./dto/approve-leave.dto";
import { ListLeaveDto } from "./dto/list-leave.dto";

@Injectable()
export class LeaveService {
  constructor(
    private prisma: PrismaService,
    private parameterService: ParameterService,
    private eventEmitter: EventEmitter2,
  ) {}

  async createLeave(
    userId: string,
    companyId: string,
    userRole: string,
    dto: CreateLeaveDto,
  ) {
    const employee = await this.prisma.ms_employees.findUnique({
      where: { id: userId, company_id: companyId },
      include: { ms_users: true },
    });
    if (!employee) {
      throw new NotFoundException("Employee not found");
    }

    const leaveType = await this.prisma.ms_leave_types.findUnique({
      where: { id: dto.leave_type_id, company_id: companyId },
    });
    if (!leaveType) {
      throw new NotFoundException("Leave type not found");
    }

    const startDate = new Date(dto.start_date);
    const endDate = new Date(dto.end_date);

    if (startDate > endDate) {
      throw new BadRequestException(
        "Start date must be before or equal to end date",
      );
    }

    const dateRangeDays =
      Math.floor(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      ) + 1;

    if (dateRangeDays > dto.total_days) {
      throw new BadRequestException(
        `Total days (${dto.total_days}) exceeds the date range of ${dateRangeDays} calendar day(s)`,
      );
    }

    const leave = await this.prisma.tr_leave_requests.create({
      data: {
        employee_id: employee.id,
        leave_type_id: dto.leave_type_id,
        start_date: startDate,
        end_date: endDate,
        total_days: dto.total_days,
        reason: dto.reason,
        attachment_url: dto.attachment_url,
        status: "pending",
        company_id: companyId,
      },
    });

    return leave;
  }

  async getLeaveBalance(userId: string, companyId: string) {
    const employee = await this.prisma.ms_employees.findUnique({
      where: { id: userId, company_id: companyId },
    });
    if (!employee) throw new NotFoundException("Employee not found");

    const leaveTypes = await this.prisma.ms_leave_types.findMany({
      where: { company_id: companyId },
    });

    const currentYear = new Date().getFullYear();
    const usedDaysRaw = await this.prisma.$queryRaw<
      Array<{ leave_type_id: string; total: bigint | null }>
    >`
      SELECT leave_type_id, COALESCE(SUM(total_days), 0) as total
      FROM tr_leave_requests
      WHERE employee_id = ${employee.id}
        AND status IN ('approved', 'pending')
        AND start_date >= ${new Date(currentYear, 0, 1)}::date
        AND start_date <= ${new Date(currentYear, 11, 31)}::date
      GROUP BY leave_type_id
    `;

    const usedMap = new Map(
      usedDaysRaw.map((u) => [u.leave_type_id, Number(u.total)]),
    );

    return leaveTypes.map((lt) => ({
      leave_type_id: lt.id,
      leave_type_name: lt.name,
      quota: lt.default_days || 0,
      used: usedMap.get(lt.id) || 0,
      remaining: (lt.default_days || 0) - (usedMap.get(lt.id) || 0),
    }));
  }

  async listSubordinateLeaves(
    userId: string,
    companyId: string,
    query: ListLeaveDto,
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const subordinates = await this.prisma.ms_employees.findMany({
      where: {
        OR: [{ supervisor_id: userId }, { manager_id: userId }],
        company_id: companyId,
      },
      select: { id: true },
    });

    const subordinateIds = subordinates.map((e) => e.id);
    if (subordinateIds.length === 0) {
      return { data: [], meta: { page, limit, total: 0 } };
    }

    const where: any = {
      employee_id: { in: subordinateIds },
      company_id: companyId,
    };

    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.tr_leave_requests.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          ms_leave_types: true,
          ms_employees_tr_leave_requests_employee_idToms_employees: {
            select: { id: true, full_name: true },
          },
        },
      }),
      this.prisma.tr_leave_requests.count({ where }),
    ]);

    return { data, meta: { page, limit, total } };
  }

  async approveLeave(
    userId: string,
    companyId: string,
    leaveId: string,
    dto: ApproveLeaveDto,
    _approverRole: string,
  ) {
    const leave = await this.prisma.tr_leave_requests.findUnique({
      where: { id: leaveId, company_id: companyId },
    });
    if (!leave) throw new NotFoundException("Leave request not found");

    if (dto.action === "approve") {
      return this.prisma.tr_leave_requests.update({
        where: { id: leaveId },
        data: { status: "approved", supervisor_id: userId },
      });
    }

    return this.prisma.tr_leave_requests.update({
      where: { id: leaveId },
      data: {
        status: "rejected",
        rejection_reason: dto.rejection_reason || "Rejected",
      },
    });
  }

  async cancelLeave(userId: string, companyId: string, leaveId: string) {
    const leave = await this.prisma.tr_leave_requests.findUnique({
      where: { id: leaveId, company_id: companyId },
    });
    if (!leave) throw new NotFoundException("Leave request not found");
    if (leave.status !== "pending") {
      throw new BadRequestException("Only pending leave can be cancelled");
    }

    return this.prisma.tr_leave_requests.update({
      where: { id: leaveId },
      data: { status: "cancelled" },
    });
  }

  async listLeaves(userId: string, companyId: string, query: ListLeaveDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {
      employee_id: userId,
      company_id: companyId,
    };

    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.tr_leave_requests.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          ms_leave_types: true,
          ms_employees_tr_leave_requests_employee_idToms_employees: {
            select: { id: true, full_name: true },
          },
        },
      }),
      this.prisma.tr_leave_requests.count({ where }),
    ]);

    return { data, meta: { page, limit, total } };
  }
}
