import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOvernightDto } from './dto/create-overnight.dto';
import { ListOvernightDto } from './dto/list-overnight.dto';
import { ApproveOvernightDto } from './dto/approve-overnight.dto';

@Injectable()
export class OvernightService {
  constructor(private prisma: PrismaService) {}

  async list(userId: string, userRole: string, query: ListOvernightDto) {
    const user = await this.prisma.ms_users.findUnique({
      where: { id: userId },
      include: { ms_employees: true },
    });
    if (!user || !user.ms_employees) {
      throw new NotFoundException('Employee not found');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    const isAdmin = ['admin', 'super_admin'].includes(userRole);

    if (!isAdmin) {
      where.employee_id = user.ms_employees.id;
    }

    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.tr_overnight_requests.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.tr_overnight_requests.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return { data, meta: { page, limit, total, totalPages } };
  }

  async listSubordinateOvernights(userId: string, query: ListOvernightDto) {
    const user = await this.prisma.ms_users.findUnique({
      where: { id: userId },
      include: { ms_employees: true },
    });
    if (!user || !user.ms_employees) {
      throw new NotFoundException('Employee not found');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const subordinates = await this.prisma.ms_employees.findMany({
      where: {
        OR: [
          { supervisor_id: user.ms_employees.id },
          { manager_id: user.ms_employees.id },
        ],
      },
      select: { id: true },
    });

    const subordinateIds = subordinates.map((e) => e.id);
    if (subordinateIds.length === 0) {
      return { data: [], meta: { page, limit, total: 0, totalPages: 0 } };
    }

    const where: any = {
      employee_id: { in: subordinateIds },
    };

    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.tr_overnight_requests.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.tr_overnight_requests.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return { data, meta: { page, limit, total, totalPages } };
  }

  async create(userId: string, dto: CreateOvernightDto) {
    const user = await this.prisma.ms_users.findUnique({
      where: { id: userId },
      include: { ms_employees: true },
    });
    if (!user || !user.ms_employees) {
      throw new NotFoundException('Employee not found');
    }

    return this.prisma.tr_overnight_requests.create({
      data: {
        employee_id: user.ms_employees.id,
        date: new Date(dto.date),
        shift_type: dto.shift_type,
        remarks: dto.remarks || null,
        status: 'pending',
        supervisor_id: user.ms_employees.supervisor_id,
      },
    });
  }

  async approve(
    userId: string,
    userRole: string,
    requestId: string,
    dto: ApproveOvernightDto,
  ) {
    const approver = await this.prisma.ms_users.findUnique({
      where: { id: userId },
      include: { ms_employees: true },
    });
    if (!approver || !approver.ms_employees) {
      throw new NotFoundException('Approver not found');
    }

    const request = await this.prisma.tr_overnight_requests.findUnique({
      where: { id: requestId },
    });
    if (!request) {
      throw new NotFoundException('Overnight request not found');
    }

    if (dto.action === 'reject') {
      return this.prisma.tr_overnight_requests.update({
        where: { id: requestId },
        data: {
          status: 'rejected',
          rejection_reason: dto.rejection_reason || 'Rejected',
        },
      });
    }

    if (dto.action !== 'approve') {
      throw new BadRequestException('Invalid action');
    }

    // Step 1: Supervisor approval
    if (
      request.status === 'pending' &&
      request.supervisor_id === approver.ms_employees.id
    ) {
      return this.prisma.tr_overnight_requests.update({
        where: { id: requestId },
        data: {
          status: 'supervisor_approved',
          supervisor_approved_at: new Date(),
        },
      });
    }

    // Step 2: HR final approval
    const isHR = ['manager_hrga', 'hrd', 'admin', 'super_admin'].includes(
      userRole,
    );
    if (request.status === 'supervisor_approved' && isHR) {
      return this.prisma.tr_overnight_requests.update({
        where: { id: requestId },
        data: {
          status: 'approved',
        },
      });
    }

    throw new ForbiddenException(
      'You are not authorized to approve this overnight request at this stage',
    );
  }
}
