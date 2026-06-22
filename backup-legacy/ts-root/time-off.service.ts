import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { HrisRequestEvent } from '../notification/events/hris-request.event';
import { CreateTimeOffDto } from './dto/create-time-off.dto';
import { ApproveTimeOffDto } from './dto/approve-time-off.dto';
import { ListTimeOffDto } from './dto/list-time-off.dto';

@Injectable()
export class TimeOffService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  private async getEmployeeFromUser(userId: string) {
    const user = await this.prisma.ms_users.findUnique({
      where: { id: userId },
      include: { ms_employees: true },
    });
    if (!user || !user.ms_employees) {
      throw new NotFoundException('Employee not found');
    }
    return user.ms_employees;
  }

  private isAdminOrHRD(role: string): boolean {
    return ['manager_hrga', 'hrd', 'admin', 'super_admin'].includes(role);
  }

  async createTimeOff(userId: string, userRole: string, dto: CreateTimeOffDto) {
    let employee = await this.getEmployeeFromUser(userId);

    if (dto.employee_id && this.isAdminOrHRD(userRole)) {
      const targetEmployee = await this.prisma.ms_employees.findUnique({
        where: { id: dto.employee_id },
      });
      if (!targetEmployee) {
        throw new NotFoundException('Target employee not found');
      }
      employee = targetEmployee;
    }

    const timeOffType = await this.prisma.ms_time_off_types.findUnique({
      where: { id: dto.time_off_type_id },
    });

    if (!timeOffType) {
      throw new NotFoundException('Time off type not found');
    }

    const startDate = new Date(dto.start_date);
    const endDate = new Date(dto.end_date);

    if (startDate > endDate) {
      throw new BadRequestException(
        'Start date must be before or equal to end date',
      );
    }

    const timeOff = await this.prisma.tr_time_off_requests.create({
      data: {
        employee_id: employee.id,
        time_off_type_id: dto.time_off_type_id,
        start_date: startDate,
        end_date: endDate,
        start_time: dto.start_time
          ? new Date(`1970-01-01T${dto.start_time}:00`)
          : null,
        end_time: dto.end_time
          ? new Date(`1970-01-01T${dto.end_time}:00`)
          : null,
        reason: dto.reason,
        work_handover_to: dto.work_handover_to || null,
        attachment_url: dto.attachment_url,
        status: 'pending',
      },
    });

    await this.eventEmitter.emitAsync(
      'hris.request',
      new HrisRequestEvent(timeOff.id, employee.id, 'time_off', 'submitted', {
        details: `mengajukan izin dari ${dto.start_date} s/d ${dto.end_date}`,
      }),
    );

    return timeOff;
  }

  async listTimeOffs(userId: string, query: ListTimeOffDto) {
    const user = await this.prisma.ms_users.findUnique({
      where: { id: userId },
      include: { ms_employees: true, ms_roles: true },
    });
    if (!user || !user.ms_employees) {
      throw new NotFoundException('Employee not found');
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    const userRole = user.ms_roles?.name || 'karyawan';

    if (!['admin', 'hrd', 'manager_hrga', 'super_admin'].includes(userRole)) {
      where.employee_id = user.ms_employees.id;
    }

    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.tr_time_off_requests.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          ms_time_off_types: true,
          ms_employees_tr_time_off_requests_employee_idToms_employees: true,
        },
      }),
      this.prisma.tr_time_off_requests.count({ where }),
    ]);

    return { data, meta: { page, limit, total } };
  }

  async approveTimeOff(
    userId: string,
    timeOffId: string,
    dto: ApproveTimeOffDto,
    approverRole: string,
  ) {
    const approver = await this.getEmployeeFromUser(userId);
    const timeOff = await this.prisma.tr_time_off_requests.findUnique({
      where: { id: timeOffId },
    });

    if (!timeOff) {
      throw new NotFoundException('Time off request not found');
    }

    if (
      timeOff.status !== 'pending' &&
      timeOff.status !== 'supervisor_approved'
    ) {
      throw new BadRequestException('Time off request already processed');
    }

    if (approverRole === 'atasan') {
      if (timeOff.status !== 'pending') {
        throw new BadRequestException('Time off request already processed');
      }

      const requester = await this.prisma.ms_employees.findUnique({
        where: { id: timeOff.employee_id },
      });
      if (!requester || requester.supervisor_id !== approver.id) {
        throw new ForbiddenException(
          'You can only approve time off requests for your direct subordinates',
        );
      }

      if (dto.action === 'approve') {
        await this.prisma.tr_time_off_requests.update({
          where: { id: timeOffId },
          data: {
            supervisor_approved_at: new Date(),
            supervisor_id: approver.id,
            status: 'supervisor_approved',
          },
        });

        await this.eventEmitter.emitAsync(
          'hris.request',
          new HrisRequestEvent(
            timeOffId,
            timeOff.employee_id,
            'time_off',
            'supervisor_approved',
          ),
        );
      } else {
        await this.prisma.tr_time_off_requests.update({
          where: { id: timeOffId },
          data: {
            supervisor_id: approver.id,
            status: 'rejected',
            rejection_reason: dto.rejection_reason || 'Rejected by supervisor',
          },
        });

        await this.eventEmitter.emitAsync(
          'hris.request',
          new HrisRequestEvent(
            timeOffId,
            timeOff.employee_id,
            'time_off',
            'rejected',
            {
              rejectionReason: dto.rejection_reason || 'Rejected by supervisor',
            },
          ),
        );
      }
      return { message: `Time off request ${dto.action}d by supervisor` };
    }

    if (
      approverRole === 'manager_hrga' ||
      approverRole === 'admin' ||
      approverRole === 'super_admin'
    ) {
      if (timeOff.status !== 'supervisor_approved') {
        throw new BadRequestException('Must be approved by supervisor first');
      }

      if (dto.action === 'approve') {
        await this.prisma.tr_time_off_requests.update({
          where: { id: timeOffId },
          data: {
            hrga_approved_at: new Date(),
            hrga_manager_id: approver.id,
            status: 'approved',
          },
        });

        await this.eventEmitter.emitAsync(
          'hris.request',
          new HrisRequestEvent(
            timeOffId,
            timeOff.employee_id,
            'time_off',
            'approved',
          ),
        );
      } else {
        await this.prisma.tr_time_off_requests.update({
          where: { id: timeOffId },
          data: {
            hrga_manager_id: approver.id,
            status: 'rejected',
            rejection_reason: dto.rejection_reason || 'Rejected by HRGA',
          },
        });

        await this.eventEmitter.emitAsync(
          'hris.request',
          new HrisRequestEvent(
            timeOffId,
            timeOff.employee_id,
            'time_off',
            'rejected',
            {
              rejectionReason: dto.rejection_reason || 'Rejected by HRGA',
            },
          ),
        );
      }
      return { message: `Time off request ${dto.action}d by HRGA` };
    }

    throw new BadRequestException('Insufficient permissions');
  }

  async cancelTimeOff(userId: string, timeOffId: string) {
    const employee = await this.getEmployeeFromUser(userId);

    const timeOff = await this.prisma.tr_time_off_requests.findUnique({
      where: { id: timeOffId },
    });

    if (!timeOff) {
      throw new NotFoundException('Time off request not found');
    }

    if (timeOff.employee_id !== employee.id) {
      throw new ForbiddenException(
        'You can only cancel your own time off requests',
      );
    }

    if (
      timeOff.status !== 'pending' &&
      timeOff.status !== 'supervisor_approved'
    ) {
      throw new BadRequestException(
        'Only pending or supervisor approved time off requests can be cancelled',
      );
    }

    await this.prisma.tr_time_off_requests.update({
      where: { id: timeOffId },
      data: { status: 'cancelled' },
    });

    await this.eventEmitter.emitAsync(
      'hris.request',
      new HrisRequestEvent(
        timeOffId,
        employee.id,
        'time_off',
        'cancelled',
      ),
    );

    return { message: 'Time off request cancelled successfully' };
  }
}
