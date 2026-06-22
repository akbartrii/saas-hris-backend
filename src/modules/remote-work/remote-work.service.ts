import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { HrisRequestEvent } from '../notification/events/hris-request.event';
import { CreateRemoteWorkDto } from './dto/create-remote-work.dto';
import { ListRemoteWorkDto } from './dto/list-remote-work.dto';
import { ApproveRemoteWorkDto } from './dto/approve-remote-work.dto';

@Injectable()
export class RemoteWorkService {
  constructor(private prisma: PrismaService) {}

  async list(
    userId: string,
    companyId: string,
    userRole: string,
    query: ListRemoteWorkDto,
  ) {
    const user = await this.prisma.ms_users.findUnique({
      where: { id: userId, company_id: companyId },
      include: { ms_employees: true },
    });
    if (!user || !user.ms_employees) {
      throw new NotFoundException('Employee not found');
    }

    const where: any = { company_id: companyId };
    const isAdmin = ['admin', 'super_admin'].includes(userRole);

    if (!isAdmin) {
      where.employee_id = user.ms_employees.id;
    }

    if (query.status) {
      where.status = query.status;
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.tr_remote_work_requests.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.tr_remote_work_requests.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return { data, meta: { page, limit, total, totalPages } };
  }

  async listSubordinates(
    userId: string,
    companyId: string,
    userRole: string,
    query: ListRemoteWorkDto,
  ) {
    const user = await this.prisma.ms_users.findUnique({
      where: { id: userId, company_id: companyId },
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
      company_id: companyId,
    };

    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.tr_remote_work_requests.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.tr_remote_work_requests.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return { data, meta: { page, limit, total, totalPages } };
  }

  async create(userId: string, companyId: string, dto: CreateRemoteWorkDto) {
    const user = await this.prisma.ms_users.findUnique({
      where: { id: userId, company_id: companyId },
      include: { ms_employees: true },
    });
    if (!user || !user.ms_employees) {
      throw new NotFoundException('Employee not found');
    }

    const start = new Date(dto.start_date);
    const end = new Date(dto.end_date);
    if (end < start) {
      throw new BadRequestException('End date must be after start date');
    }

    const existing = await this.prisma.tr_remote_work_requests.findFirst({
      where: {
        employee_id: user.ms_employees.id,
        company_id: companyId,
        status: { in: ['pending', 'approved'] },
        OR: [{ start_date: { lte: end }, end_date: { gte: start } }],
      },
    });

    if (existing) {
      throw new BadRequestException(
        'You already have a pending or approved WFH request in this date range',
      );
    }

    const request = await this.prisma.tr_remote_work_requests.create({
      data: {
        employee_id: user.ms_employees.id,
        company_id: companyId,
        start_date: start,
        end_date: end,
        latitude: dto.latitude,
        longitude: dto.longitude,
        address: dto.address || null,
        radius_meters: 50,
        reason: dto.reason || null,
        status: 'pending',
        supervisor_id: user.ms_employees.supervisor_id,
      },
    });

    return request;
  }

  async approve(
    userId: string,
    companyId: string,
    userRole: string,
    requestId: string,
    dto: ApproveRemoteWorkDto,
  ) {
    const approver = await this.prisma.ms_users.findUnique({
      where: { id: userId, company_id: companyId },
      include: { ms_employees: true },
    });
    if (!approver || !approver.ms_employees) {
      throw new NotFoundException('Approver not found');
    }

    const request = await this.prisma.tr_remote_work_requests.findUnique({
      where: { id: requestId, company_id: companyId },
    });
    if (!request) {
      throw new NotFoundException('Remote work request not found');
    }

    if (dto.action === 'reject') {
      return this.prisma.tr_remote_work_requests.update({
        where: { id: requestId },
        data: {
          status: 'rejected',
          rejected_reason: dto.rejection_reason || 'Rejected',
        },
      });
    }

    if (dto.action === 'approve') {
      return this.prisma.tr_remote_work_requests.update({
        where: { id: requestId },
        data: {
          status: 'approved',
          approved_at: new Date(),
        },
      });
    }

    throw new BadRequestException('Invalid action');
  }

  async cancel(
    userId: string,
    companyId: string,
    requestId: string,
    reason?: string,
  ) {
    const request = await this.prisma.tr_remote_work_requests.findUnique({
      where: { id: requestId, company_id: companyId },
    });
    if (!request) {
      throw new NotFoundException('Remote work request not found');
    }

    return this.prisma.tr_remote_work_requests.update({
      where: { id: requestId },
      data: {
        status: 'cancelled',
        cancelled_at: new Date(),
        cancelled_reason: reason || 'Cancelled by user',
      },
    });
  }
}