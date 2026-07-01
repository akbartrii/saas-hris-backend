import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateTimeOffDto } from "./dto/create-time-off.dto";
import { ApproveTimeOffDto } from "./dto/approve-time-off.dto";
import { ListTimeOffDto } from "./dto/list-time-off.dto";

@Injectable()
export class TimeOffService {
  constructor(private prisma: PrismaService) {}

  async listSubordinateTimeOffs(
    userId: string,
    companyId: string,
    query: ListTimeOffDto,
  ) {
    const user = await this.prisma.ms_users.findUnique({
      where: { id: userId, company_id: companyId },
      include: { ms_employees: true },
    });
    if (!user || !user.ms_employees) {
      throw new NotFoundException("Employee not found");
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const subordinates = await this.prisma.ms_employees.findMany({
      where: {
        OR: [
          { supervisor_id: user.ms_employees.id },
          { manager_id: user.ms_employees.id },
        ],
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
      this.prisma.tr_time_off_requests.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          ms_time_off_types: true,
          ms_employees_tr_time_off_requests_employee_idToms_employees: {
            select: { id: true, full_name: true },
          },
        },
      }),
      this.prisma.tr_time_off_requests.count({ where }),
    ]);

    return { data, meta: { page, limit, total } };
  }

  async createTimeOff(
    userId: string,
    companyId: string,
    userRole: string,
    dto: CreateTimeOffDto,
  ) {
    const employee = await this.prisma.ms_employees.findFirst({
      where: { user_id: userId, company_id: companyId },
    });
    if (!employee) {
      throw new NotFoundException("Employee not found");
    }

    const timeOffType = await this.prisma.ms_time_off_types.findUnique({
      where: { id: dto.time_off_type_id, company_id: companyId },
    });
    if (!timeOffType) {
      throw new NotFoundException("Time off type not found");
    }

    const startDate = new Date(dto.start_date);
    const endDate = new Date(dto.end_date);

    if (startDate > endDate) {
      throw new BadRequestException(
        "Start date must be before or equal to end date",
      );
    }

    const timeOff = await this.prisma.tr_time_off_requests.create({
      data: {
        employee_id: employee.id,
        time_off_type_id: dto.time_off_type_id,
        start_date: startDate,
        end_date: endDate,
        start_time: dto.start_time
          ? new Date(`1970-01-01T${dto.start_time}`)
          : null,
        end_time: dto.end_time ? new Date(`1970-01-01T${dto.end_time}`) : null,
        reason: dto.reason,
        work_handover_to: dto.work_handover_to || null,
        attachment_url: dto.attachment_url,
        status: "pending",
        company_id: companyId,
      },
    });

    return timeOff;
  }

  async approveTimeOff(
    userId: string,
    companyId: string,
    timeOffId: string,
    dto: ApproveTimeOffDto,
    _approverRole: string,
  ) {
    const timeOff = await this.prisma.tr_time_off_requests.findUnique({
      where: { id: timeOffId, company_id: companyId },
    });
    if (!timeOff) throw new NotFoundException("Time off request not found");

    if (dto.action === "approve") {
      return this.prisma.tr_time_off_requests.update({
        where: { id: timeOffId },
        data: { status: "approved" },
      });
    }

    return this.prisma.tr_time_off_requests.update({
      where: { id: timeOffId },
      data: {
        status: "rejected",
        rejection_reason: dto.rejection_reason || "Rejected",
      },
    });
  }

  async cancelTimeOff(userId: string, companyId: string, timeOffId: string) {
    const timeOff = await this.prisma.tr_time_off_requests.findUnique({
      where: { id: timeOffId, company_id: companyId },
    });
    if (!timeOff) throw new NotFoundException("Time off request not found");
    if (timeOff.status !== "pending") {
      throw new BadRequestException("Only pending time off can be cancelled");
    }

    return this.prisma.tr_time_off_requests.update({
      where: { id: timeOffId },
      data: { status: "cancelled" },
    });
  }

  async listTimeOffs(userId: string, companyId: string, query: ListTimeOffDto) {
    const employee = await this.prisma.ms_employees.findFirst({
      where: { user_id: userId, company_id: companyId },
    });
    if (!employee) {
      throw new NotFoundException("Employee not found");
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {
      employee_id: employee.id,
      company_id: companyId,
    };

    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.tr_time_off_requests.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          ms_time_off_types: true,
          ms_employees_tr_time_off_requests_employee_idToms_employees: {
            select: { id: true, full_name: true },
          },
        },
      }),
      this.prisma.tr_time_off_requests.count({ where }),
    ]);

    return { data, meta: { page, limit, total } };
  }
}
