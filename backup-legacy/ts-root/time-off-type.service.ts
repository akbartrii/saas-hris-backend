import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTimeOffTypeDto } from './dto/create-time-off-type.dto';
import { UpdateTimeOffTypeDto } from './dto/update-time-off-type.dto';

@Injectable()
export class TimeOffTypeService {
  constructor(private prisma: PrismaService) {}

  private isAdminOrHRD(role: string): boolean {
    return ['manager_hrga', 'hrd', 'admin', 'super_admin'].includes(role);
  }

  async list() {
    return this.prisma.ms_time_off_types.findMany({ orderBy: { name: 'asc' } });
  }

  async create(userRole: string, dto: CreateTimeOffTypeDto) {
    if (!this.isAdminOrHRD(userRole)) {
      throw new ForbiddenException(
        'Only HRD or admin can manage time off types',
      );
    }
    return this.prisma.ms_time_off_types.create({ data: dto as any });
  }

  async update(userRole: string, id: string, dto: UpdateTimeOffTypeDto) {
    if (!this.isAdminOrHRD(userRole)) {
      throw new ForbiddenException(
        'Only HRD or admin can manage time off types',
      );
    }
    const exists = await this.prisma.ms_time_off_types.findUnique({
      where: { id },
    });
    if (!exists) throw new NotFoundException('Time off type not found');
    return this.prisma.ms_time_off_types.update({
      where: { id },
      data: dto as any,
    });
  }

  async delete(userRole: string, id: string) {
    if (!this.isAdminOrHRD(userRole)) {
      throw new ForbiddenException(
        'Only HRD or admin can manage time off types',
      );
    }
    const exists = await this.prisma.ms_time_off_types.findUnique({
      where: { id },
    });
    if (!exists) throw new NotFoundException('Time off type not found');
    return this.prisma.ms_time_off_types.delete({ where: { id } });
  }
}
