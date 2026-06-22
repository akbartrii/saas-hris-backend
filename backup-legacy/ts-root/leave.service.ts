import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { ParameterService } from '../parameter/parameter.service';
import { HrisRequestEvent } from '../notification/events/hris-request.event';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { ApproveLeaveDto } from './dto/approve-leave.dto';
import { ListLeaveDto } from './dto/list-leave.dto';

@Injectable()
export class LeaveService {
  private readonly logger = new Logger(LeaveService.name);

  constructor(
    private prisma: PrismaService,
    private parameterService: ParameterService,
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

  private async getOrCreateLeaveBalance(
    employeeId: string,
    leaveTypeId: string,
    year: number,
  ) {
    let balance = await this.prisma.tr_leave_balances.findUnique({
      where: {
        employee_id_leave_type_id_year: {
          employee_id: employeeId,
          leave_type_id: leaveTypeId,
          year,
        },
      },
    });

    if (!balance) {
      const leaveType = await this.prisma.ms_leave_types.findUnique({
        where: { id: leaveTypeId },
      });

      balance = await this.prisma.tr_leave_balances.create({
        data: {
          employee_id: employeeId,
          leave_type_id: leaveTypeId,
          year,
          total_days: leaveType?.default_days || 0,
          used_days: 0,
        },
      });
    }

    return balance;
  }

  private calculateDaysBetween(start: Date, end: Date): number {
    const msPerDay = 86400000;
    const startDay = Date.UTC(
      start.getFullYear(),
      start.getMonth(),
      start.getDate(),
    );
    const endDay = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
    return Math.floor((endDay - startDay) / msPerDay) + 1;
  }

  async createLeave(userId: string, userRole: string, dto: CreateLeaveDto) {
    let employee = await this.getEmployeeFromUser(userId);

    // If admin/HR provides an employee_id, use that instead
    if (dto.employee_id && this.isAdminOrHRD(userRole)) {
      const targetEmployee = await this.prisma.ms_employees.findUnique({
        where: { id: dto.employee_id },
      });
      if (!targetEmployee) {
        throw new NotFoundException('Target employee not found');
      }
      employee = targetEmployee;
    }
    const leaveType = await this.prisma.ms_leave_types.findUnique({
      where: { id: dto.leave_type_id },
    });

    if (!leaveType) {
      throw new NotFoundException('Leave type not found');
    }

    if (leaveType.is_annual) {
      if (!employee.join_date) {
        throw new BadRequestException('Join date not set');
      }
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      if (new Date(employee.join_date) > oneYearAgo) {
        throw new BadRequestException(
          'Annual leave only available after 1 year of service',
        );
      }
    }

    const startDate = new Date(dto.start_date);
    const endDate = new Date(dto.end_date);

    if (startDate > endDate) {
      throw new BadRequestException(
        'Start date must be before or equal to end date',
      );
    }

    const dateRangeDays = this.calculateDaysBetween(startDate, endDate);
    if (dto.total_days > dateRangeDays) {
      throw new BadRequestException(
        `Total days (${dto.total_days}) exceeds the date range of ${dateRangeDays} calendar day(s)`,
      );
    }

    if (
      leaveType.max_days_per_request &&
      dto.total_days > leaveType.max_days_per_request
    ) {
      throw new BadRequestException(
        `Total days exceeds maximum of ${leaveType.max_days_per_request} day(s) for this leave type`,
      );
    }

    if (leaveType.requires_attachment && !dto.attachment_url) {
      throw new BadRequestException(
        'Attachment is required for this leave type',
      );
    }

    const overlappingLeave = await this.prisma.tr_leave_requests.findFirst({
      where: {
        employee_id: employee.id,
        status: { in: ['pending', 'supervisor_approved', 'approved'] },
        start_date: { lte: endDate },
        end_date: { gte: startDate },
      },
    });

    if (overlappingLeave) {
      throw new BadRequestException(
        'Leave dates overlap with an existing leave request',
      );
    }

    const year = startDate.getFullYear();

    const leave = await this.prisma.$transaction(async (tx) => {
      let balance = await tx.tr_leave_balances.findUnique({
        where: {
          employee_id_leave_type_id_year: {
            employee_id: employee.id,
            leave_type_id: dto.leave_type_id,
            year,
          },
        },
      });

      if (!balance) {
        balance = await tx.tr_leave_balances.create({
          data: {
            employee_id: employee.id,
            leave_type_id: dto.leave_type_id,
            year,
            total_days: leaveType?.default_days || 0,
            used_days: 0,
          },
        });
      }

      if (balance.total_days - balance.used_days < dto.total_days) {
        throw new BadRequestException(
          `Insufficient leave balance. Available: ${balance.total_days - balance.used_days}, Requested: ${dto.total_days}`,
        );
      }

      const leave = await tx.tr_leave_requests.create({
        data: {
          employee_id: employee.id,
          leave_type_id: dto.leave_type_id,
          start_date: startDate,
          end_date: endDate,
          total_days: dto.total_days,
          reason: dto.reason,
          work_handover_to: dto.work_handover_to || null,
          attachment_url: dto.attachment_url,
          status: 'pending',
        },
      });

      return leave;
    });

    await this.eventEmitter.emitAsync(
      'hris.request',
      new HrisRequestEvent(leave.id, employee.id, 'leave', 'submitted', {
        details: `mengajukan cuti selama ${dto.total_days} hari mulai dari ${dto.start_date} s/d ${dto.end_date}`,
      }),
    );

    return leave;
  }

  async getLeaveBalance(userId: string) {
    const employee = await this.getEmployeeFromUser(userId);
    const year = new Date().getFullYear();

    const leaveTypes = await this.prisma.ms_leave_types.findMany();

    const balances = await Promise.all(
      leaveTypes.map(async (lt) => {
        const balance = await this.getOrCreateLeaveBalance(
          employee.id,
          lt.id,
          year,
        );
        return {
          ...balance,
          remaining_days: balance.total_days - balance.used_days,
        };
      }),
    );

    return balances;
  }

  async listLeaves(userId: string, query: ListLeaveDto) {
    const user = await this.prisma.ms_users.findUnique({
      where: { id: userId },
      include: { ms_employees: true, ms_roles: true },
    });
    if (!user || !user.ms_employees) {
      throw new NotFoundException('Employee not found');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    const userRole = user.ms_roles?.name || 'karyawan';

    if (!['admin', 'super_admin'].includes(userRole)) {
      where.employee_id = user.ms_employees.id;
    }

    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.tr_leave_requests.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          ms_leave_types: true,
          ms_employees_tr_leave_requests_employee_idToms_employees: true,
        },
      }),
      this.prisma.tr_leave_requests.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return { data, meta: { page, limit, total, totalPages } };
  }

  async listSubordinateLeaves(userId: string, query: ListLeaveDto) {
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
      this.prisma.tr_leave_requests.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          ms_leave_types: true,
          ms_employees_tr_leave_requests_employee_idToms_employees: true,
        },
      }),
      this.prisma.tr_leave_requests.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return { data, meta: { page, limit, total, totalPages } };
  }

  async approveLeave(
    userId: string,
    leaveId: string,
    dto: ApproveLeaveDto,
    approverRole: string,
  ) {
    const startTime = Date.now();

    const approver = await this.getEmployeeFromUser(userId);
    const leave = await this.prisma.tr_leave_requests.findUnique({
      where: { id: leaveId },
    });

    if (!leave) {
      throw new NotFoundException('Leave request not found');
    }

    if (leave.status !== 'pending' && leave.status !== 'supervisor_approved') {
      throw new BadRequestException('Leave request already processed');
    }

    if (approverRole === 'atasan') {
      if (leave.status !== 'pending') {
        throw new BadRequestException('Leave request already processed');
      }

      const requester = await this.prisma.ms_employees.findUnique({
        where: { id: leave.employee_id },
      });
      if (!requester || requester.supervisor_id !== approver.id) {
        throw new ForbiddenException(
          'You can only approve leave requests for your direct subordinates',
        );
      }

      if (dto.action === 'approve') {
        const txStart = Date.now();
        await this.prisma.$transaction([
          this.prisma.tr_leave_balances.updateMany({
            where: {
              employee_id: leave.employee_id,
              leave_type_id: leave.leave_type_id,
              year: new Date(leave.start_date).getFullYear(),
            },
            data: {
              used_days: { increment: leave.total_days },
            },
          }),
          this.prisma.tr_leave_requests.update({
            where: { id: leaveId },
            data: {
              supervisor_approved_at: new Date(),
              supervisor_id: approver.id,
              status: 'supervisor_approved',
            },
          }),
        ]);
        this.logger.log(
          `Leave approve transaction took ${Date.now() - txStart}ms`,
        );

        await this.eventEmitter.emitAsync(
          'hris.request',
          new HrisRequestEvent(
            leaveId,
            leave.employee_id,
            'leave',
            'supervisor_approved',
          ),
        );
      } else {
        await this.prisma.tr_leave_requests.update({
          where: { id: leaveId },
          data: {
            supervisor_id: approver.id,
            status: 'rejected',
            rejection_reason: dto.rejection_reason || 'Rejected by supervisor',
          },
        });

        await this.eventEmitter.emitAsync(
          'hris.request',
          new HrisRequestEvent(
            leaveId,
            leave.employee_id,
            'leave',
            'rejected',
            {
              rejectionReason: dto.rejection_reason || 'Rejected by supervisor',
            },
          ),
        );
      }
      this.logger.log(`Leave approve total took ${Date.now() - startTime}ms`);
      return { message: `Leave request ${dto.action}d by supervisor` };
    }

    if (
      approverRole === 'manager_hrga' ||
      approverRole === 'admin' ||
      approverRole === 'super_admin'
    ) {
      if (leave.status !== 'supervisor_approved') {
        throw new BadRequestException('Must be approved by supervisor first');
      }

      if (dto.action === 'approve') {
        await this.prisma.tr_leave_requests.update({
          where: { id: leaveId },
          data: {
            hrga_approved_at: new Date(),
            hrga_manager_id: approver.id,
            status: 'approved',
          },
        });

        await this.eventEmitter.emitAsync(
          'hris.request',
          new HrisRequestEvent(
            leaveId,
            leave.employee_id,
            'leave',
            'approved',
            {
              details: `selama ${leave.total_days} hari telah disetujui HR`,
            },
          ),
        );
      } else {
        const txStart = Date.now();
        await this.prisma.$transaction([
          this.prisma.tr_leave_balances.updateMany({
            where: {
              employee_id: leave.employee_id,
              leave_type_id: leave.leave_type_id,
              year: new Date(leave.start_date).getFullYear(),
            },
            data: {
              used_days: { decrement: leave.total_days },
            },
          }),
          this.prisma.tr_leave_requests.update({
            where: { id: leaveId },
            data: {
              hrga_manager_id: approver.id,
              status: 'rejected',
              rejection_reason: dto.rejection_reason || 'Rejected by HRGA',
            },
          }),
        ]);
        this.logger.log(
          `Leave reject transaction took ${Date.now() - txStart}ms`,
        );

        await this.eventEmitter.emitAsync(
          'hris.request',
          new HrisRequestEvent(
            leaveId,
            leave.employee_id,
            'leave',
            'rejected',
            {
              rejectionReason: dto.rejection_reason || 'Rejected by HRGA',
            },
          ),
        );
      }
      this.logger.log(`Leave approve total took ${Date.now() - startTime}ms`);
      return { message: `Leave request ${dto.action}d by HRGA` };
    }

    throw new BadRequestException('Insufficient permissions');
  }

  async cancelLeave(userId: string, leaveId: string) {
    const employee = await this.getEmployeeFromUser(userId);
    const leave = await this.prisma.tr_leave_requests.findUnique({
      where: { id: leaveId },
    });

    if (!leave) {
      throw new NotFoundException('Leave request not found');
    }

    if (leave.employee_id !== employee.id) {
      throw new BadRequestException(
        'You can only cancel your own leave requests',
      );
    }

    if (
      !['pending', 'supervisor_approved', 'approved'].includes(leave.status)
    ) {
      throw new BadRequestException(
        'Only pending, supervisor-approved, or approved leave requests can be cancelled',
      );
    }

    if (leave.status === 'supervisor_approved' || leave.status === 'approved') {
      await this.prisma.$transaction([
        this.prisma.tr_leave_balances.updateMany({
          where: {
            employee_id: leave.employee_id,
            leave_type_id: leave.leave_type_id,
            year: new Date(leave.start_date).getFullYear(),
          },
          data: {
            used_days: { decrement: leave.total_days },
          },
        }),
        this.prisma.tr_leave_requests.update({
          where: { id: leaveId },
          data: { status: 'cancelled' },
        }),
      ]);
    } else {
      await this.prisma.tr_leave_requests.update({
        where: { id: leaveId },
        data: { status: 'cancelled' },
      });
    }

    await this.eventEmitter.emitAsync(
      'hris.request',
      new HrisRequestEvent(
        leaveId,
        employee.id,
        'leave',
        'cancelled',
      ),
    );

    return { message: 'Leave request cancelled' };
  }

  @Cron('0 0 1 1 *')
  async resetAnnualLeaveBalances() {
    this.logger.log('Running annual leave balance reset cron job...');

    const year = new Date().getFullYear();
    const defaultDays = await this.parameterService.getNumber(
      'annual_leave_default_days',
      12,
    );
    const activeEmployees = await this.prisma.ms_employees.findMany({
      where: { is_active: true },
    });

    const annualLeaveTypes = await this.prisma.ms_leave_types.findMany({
      where: { is_annual: true },
    });

    for (const employee of activeEmployees) {
      for (const leaveType of annualLeaveTypes) {
        await this.prisma.tr_leave_balances.upsert({
          where: {
            employee_id_leave_type_id_year: {
              employee_id: employee.id,
              leave_type_id: leaveType.id,
              year,
            },
          },
          update: {
            total_days: defaultDays,
            used_days: 0,
          },
          create: {
            employee_id: employee.id,
            leave_type_id: leaveType.id,
            year,
            total_days: defaultDays,
            used_days: 0,
          },
        });
      }
    }

    this.logger.log(
      `Annual leave balances reset for ${activeEmployees.length} employees`,
    );
  }
}
