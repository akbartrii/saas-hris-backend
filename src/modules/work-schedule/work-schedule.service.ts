import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateWorkScheduleDto } from "./dto/create-work-schedule.dto";
import { UpdateWorkScheduleDto } from "./dto/update-work-schedule.dto";

@Injectable()
export class WorkScheduleService {
  constructor(private prisma: PrismaService) {}

  private isAdminOrHRD(role: string): boolean {
    return ["manager_hrga", "hrd", "admin", "super_admin"].includes(role);
  }

  async list(companyId: string) {
    return this.prisma.ms_work_schedules.findMany({
      where: { company_id: companyId },
      orderBy: { name: "asc" },
    });
  }

  async create(
    companyId: string,
    userRole: string,
    dto: CreateWorkScheduleDto,
  ) {
    if (!this.isAdminOrHRD(userRole)) {
      throw new ForbiddenException(
        "Only HRD or admin can manage work schedules",
      );
    }
    const data: any = { ...dto, company_id: companyId };
    if (dto.start_time)
      data.start_time = new Date(`1970-01-01T${dto.start_time}`);
    if (dto.end_time) data.end_time = new Date(`1970-01-01T${dto.end_time}`);
    if (dto.break_start)
      data.break_start = new Date(`1970-01-01T${dto.break_start}`);
    if (dto.break_end) data.break_end = new Date(`1970-01-01T${dto.break_end}`);
    return this.prisma.ms_work_schedules.create({ data });
  }

  async update(
    companyId: string,
    userRole: string,
    id: string,
    dto: UpdateWorkScheduleDto,
  ) {
    if (!this.isAdminOrHRD(userRole)) {
      throw new ForbiddenException(
        "Only HRD or admin can manage work schedules",
      );
    }
    const exists = await this.prisma.ms_work_schedules.findUnique({
      where: { id, company_id: companyId },
    });
    if (!exists) throw new NotFoundException("Work schedule not found");
    const data: any = { ...dto, company_id: companyId };
    if (dto.start_time)
      data.start_time = new Date(`1970-01-01T${dto.start_time}`);
    if (dto.end_time) data.end_time = new Date(`1970-01-01T${dto.end_time}`);
    if (dto.break_start)
      data.break_start = new Date(`1970-01-01T${dto.break_start}`);
    if (dto.break_end) data.break_end = new Date(`1970-01-01T${dto.break_end}`);
    return this.prisma.ms_work_schedules.update({ where: { id }, data });
  }

  async delete(companyId: string, userRole: string, id: string) {
    if (!this.isAdminOrHRD(userRole)) {
      throw new ForbiddenException(
        "Only HRD or admin can manage work schedules",
      );
    }
    const exists = await this.prisma.ms_work_schedules.findUnique({
      where: { id, company_id: companyId },
    });
    if (!exists) throw new NotFoundException("Work schedule not found");
    return this.prisma.ms_work_schedules.delete({
      where: { id, company_id: companyId },
    });
  }
}
