import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOvertimeMealAllowanceDto } from './dto/create-overtime-meal-allowance.dto';
import { UpdateOvertimeMealAllowanceDto } from './dto/update-overtime-meal-allowance.dto';

@Injectable()
export class OvertimeMealAllowanceService {
  constructor(private prisma: PrismaService) {}

  private isAdminOrHRD(role: string): boolean {
    return ['manager_hrga', 'hrd', 'admin', 'super_admin'].includes(role);
  }

  async list() {
    return this.prisma.ms_overtime_meal_allowances.findMany({
      orderBy: { created_at: 'asc' },
    });
  }

  async create(userRole: string, dto: CreateOvertimeMealAllowanceDto) {
    if (!this.isAdminOrHRD(userRole)) {
      throw new ForbiddenException(
        'Only HRD or admin can manage overtime meal allowances',
      );
    }
    return this.prisma.ms_overtime_meal_allowances.create({
      data: {
        day_type: dto.day_type,
        time_start: new Date(`1970-01-01T${dto.time_start}`),
        time_end: new Date(`1970-01-01T${dto.time_end}`),
        amount: Number(dto.amount),
      },
    });
  }

  async update(
    userRole: string,
    id: string,
    dto: UpdateOvertimeMealAllowanceDto,
  ) {
    if (!this.isAdminOrHRD(userRole)) {
      throw new ForbiddenException(
        'Only HRD or admin can manage overtime meal allowances',
      );
    }
    const exists = await this.prisma.ms_overtime_meal_allowances.findUnique({
      where: { id },
    });
    if (!exists)
      throw new NotFoundException('Overtime meal allowance not found');
    const data: any = {};
    if (dto.day_type) data.day_type = dto.day_type;
    if (dto.time_start)
      data.time_start = new Date(`1970-01-01T${dto.time_start}`);
    if (dto.time_end) data.time_end = new Date(`1970-01-01T${dto.time_end}`);
    if (dto.amount) data.amount = Number(dto.amount);
    return this.prisma.ms_overtime_meal_allowances.update({
      where: { id },
      data,
    });
  }

  async delete(userRole: string, id: string) {
    if (!this.isAdminOrHRD(userRole)) {
      throw new ForbiddenException(
        'Only HRD or admin can manage overtime meal allowances',
      );
    }
    const exists = await this.prisma.ms_overtime_meal_allowances.findUnique({
      where: { id },
    });
    if (!exists)
      throw new NotFoundException('Overtime meal allowance not found');
    return this.prisma.ms_overtime_meal_allowances.delete({ where: { id } });
  }
}
