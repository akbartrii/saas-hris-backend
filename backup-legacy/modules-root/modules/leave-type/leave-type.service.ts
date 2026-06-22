import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLeaveTypeDto } from './dto/create-leave-type.dto';
import { UpdateLeaveTypeDto } from './dto/update-leave-type.dto';

@Injectable()
export class LeaveTypeService {
  constructor(private prisma: PrismaService) {}

  private isAdminOrHRD(role: string): boolean {
    return ['manager_hrga', 'hrd', 'admin', 'super_admin'].includes(role);
  }

  async list() {
    return this.prisma.ms_leave_types.findMany({ orderBy: { name: 'asc' } });
  }

  async create(userRole: string, dto: CreateLeaveTypeDto) {
    if (!this.isAdminOrHRD(userRole)) {
      throw new ForbiddenException('Only HRD or admin can manage leave types');
    }
    return this.prisma.ms_leave_types.create({ data: dto as any });
  }

  async update(userRole: string, id: string, dto: UpdateLeaveTypeDto) {
    if (!this.isAdminOrHRD(userRole)) {
      throw new ForbiddenException('Only HRD or admin can manage leave types');
    }
    const exists = await this.prisma.ms_leave_types.findUnique({
      where: { id },
    });
    if (!exists) throw new NotFoundException('Leave type not found');
    return this.prisma.ms_leave_types.update({
      where: { id },
      data: dto as any,
    });
  }

  async delete(userRole: string, id: string) {
    if (!this.isAdminOrHRD(userRole)) {
      throw new ForbiddenException('Only HRD or admin can manage leave types');
    }
    const exists = await this.prisma.ms_leave_types.findUnique({
      where: { id },
    });
    if (!exists) throw new NotFoundException('Leave type not found');
    return this.prisma.ms_leave_types.delete({ where: { id } });
  }
}
