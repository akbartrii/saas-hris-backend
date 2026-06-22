import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { ParameterService } from '../parameter/parameter.service';
import { CreateOvertimeDto } from './dto/create-overtime.dto';
import { ApproveOvertimeDto } from './dto/approve-overtime.dto';
import { ListOvertimeDto } from './dto/list-overtime.dto';
import { EncryptionService } from '../encryption/encryption.service';
import { HrisRequestEvent } from '../notification/events/hris-request.event';

@Injectable()
export class OvertimeService {
  private readonly logger = new Logger(OvertimeService.name);

  constructor(
    private prisma: PrismaService,
    private parameterService: ParameterService,
    private encryptionService: EncryptionService,
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

  private timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private roundUpHours(totalMinutes: number): number {
    if (totalMinutes <= 30) {
      return 0.5;
    }
    if (totalMinutes <= 60) {
      return 1.0;
    }

    const fullHours = Math.floor(totalMinutes / 60);
    const remainder = totalMinutes % 60;

    if (remainder === 0) {
      return fullHours;
    }
    if (remainder <= 15) {
      return fullHours;
    }
    if (remainder <= 45) {
      return fullHours + 0.5;
    }
    return fullHours + 1.0;
  }

  private async determineDayType(
    date: Date,
    companyId?: string,
  ): Promise<string> {
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    const nextDay = new Date(dateOnly);
    nextDay.setDate(nextDay.getDate() + 1);

    const holiday = await this.prisma.ms_holiday_calendars.findFirst({
      where: {
        ...(companyId ? { company_id: companyId } : {}),
        holiday_date: { gte: dateOnly, lt: nextDay },
      },
    });

    if (holiday) {
      return 'holiday';
    }

    const dayOfWeek = dateOnly.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6 ? 'weekend' : 'weekday';
  }

  private calculateCrossMidnightMinutes(
    startMinutes: number,
    endMinutes: number,
  ): number {
    if (endMinutes > startMinutes) {
      return endMinutes - startMinutes;
    }
    return 1440 - startMinutes + endMinutes;
  }

  private async calculateOvertimePay(
    rawMinutes: number,
    dayType: string,
    ratePerHour: number,
  ): Promise<number> {
    const totalHours = rawMinutes / 60;

    if (dayType === 'weekday') {
      let pay = 0;
      const firstMultiplier = await this.parameterService.getNumber(
        'overtime_weekday_first_hour_multiplier',
        1.5,
      );
      const subsequentMultiplier = await this.parameterService.getNumber(
        'overtime_weekday_subsequent_multiplier',
        2,
      );
      if (totalHours <= 1) {
        pay = totalHours * firstMultiplier;
      } else {
        pay = 1 * firstMultiplier + (totalHours - 1) * subsequentMultiplier;
      }
      return Number((pay * ratePerHour).toFixed(2));
    }

    let pay = 0;
    const weekend8h = await this.parameterService.getNumber(
      'overtime_weekend_first_8h_multiplier',
      2,
    );
    const weekend9_10h = await this.parameterService.getNumber(
      'overtime_weekend_9_10h_multiplier',
      3,
    );
    const weekendBeyond10h = await this.parameterService.getNumber(
      'overtime_weekend_beyond_10h_multiplier',
      4,
    );
    if (totalHours <= 8) {
      pay = totalHours * weekend8h;
    } else if (totalHours <= 10) {
      pay = 8 * weekend8h + (totalHours - 8) * weekend9_10h;
    } else {
      pay =
        8 * weekend8h + 2 * weekend9_10h + (totalHours - 10) * weekendBeyond10h;
    }
    return Number((pay * ratePerHour).toFixed(2));
  }

  private async calculateMealAllowance(
    dayType: string,
    startMinutes: number,
    endMinutes: number,
  ): Promise<number> {
    const allowances = await this.prisma.ms_overtime_meal_allowances.findMany({
      where: { day_type: dayType },
    });

    let totalMeal = 0;

    for (const slot of allowances) {
      const slotStart =
        slot.time_start.getHours() * 60 + slot.time_start.getMinutes();
      const slotEnd =
        slot.time_end.getHours() * 60 + slot.time_end.getMinutes();

      const overlapStart = Math.max(startMinutes, slotStart);
      const overlapEnd = Math.min(endMinutes, slotEnd);

      if (overlapStart < overlapEnd) {
        totalMeal += Number(slot.amount);
      }
    }

    return totalMeal;
  }

  private canSubmitOvertime(role: string): boolean {
    return [
      'karyawan',
      'atasan',
      'manager_hrga',
      'admin',
      'super_admin',
    ].includes(role);
  }

  async createOvertime(
    userId: string,
    dto: CreateOvertimeDto,
    requesterRole: string,
    keycode?: string,
  ) {
    if (!this.canSubmitOvertime(requesterRole)) {
      throw new ForbiddenException(
        'Only supervisor or above can submit overtime requests',
      );
    }

    const requester = await this.getEmployeeFromUser(userId);

    if (requesterRole === 'karyawan' && dto.employee_id !== requester.id) {
      throw new ForbiddenException('You can only submit overtime for yourself');
    }

    const targetEmployee = await this.prisma.ms_employees.findUnique({
      where: { id: dto.employee_id },
    });

    if (!targetEmployee) {
      throw new NotFoundException('Target employee not found');
    }

    if (!['admin', 'super_admin'].includes(requesterRole)) {
      if (
        targetEmployee.supervisor_id !== requester.id &&
        targetEmployee.manager_id !== requester.id
      ) {
        throw new ForbiddenException(
          'You can only submit overtime for your subordinates',
        );
      }
    }

    const overtimeDate = new Date(dto.date);

    const existingOvertime = await this.prisma.tr_overtime_requests.findFirst({
      where: {
        employee_id: dto.employee_id,
        date: overtimeDate,
        status: { notIn: ['rejected', 'cancelled'] },
      },
    });

    if (existingOvertime) {
      throw new BadRequestException(
        'Employee already has an active overtime request for this date',
      );
    }

    if (!targetEmployee.user_id) {
      throw new BadRequestException(
        'Employee does not have an associated user account',
      );
    }

    const user = await this.prisma.ms_users.findUnique({
      where: { id: targetEmployee.user_id },
    });
    const companyId = user?.company_id;

    if (!companyId) {
      throw new BadRequestException('Target employee does not have a company');
    }

    const dayType = await this.determineDayType(overtimeDate, companyId);

    const startMinutes = this.timeToMinutes(dto.start_time);
    const endMinutes = this.timeToMinutes(dto.end_time);

    if (startMinutes === endMinutes) {
      throw new BadRequestException('End time must differ from start time');
    }

    const rawMinutes = this.calculateCrossMidnightMinutes(
      startMinutes,
      endMinutes,
    );
    const totalHours = this.roundUpHours(rawMinutes);

    let baseSalary = 0;
    let fixedAllowance = 0;
    let isCalculated = false;

    if (keycode) {
      const isValid = await this.encryptionService.validateKeycode(keycode);
      if (isValid) {
        const decryptVal = (val: string | null) => {
          if (!val) return 0;
          try {
            const decrypted = this.encryptionService.decrypt(val, keycode);
            const num = Number(decrypted);
            return isNaN(num) ? 0 : num;
          } catch {
            return 0;
          }
        };
        baseSalary = decryptVal(targetEmployee.base_salary);
        fixedAllowance = decryptVal(targetEmployee.fixed_allowance);
        isCalculated = true;
      }
    } else {
      if (!this.encryptionService.isEncrypted(targetEmployee.base_salary)) {
        baseSalary = Number(targetEmployee.base_salary || 0);
        fixedAllowance = Number(targetEmployee.fixed_allowance || 0);
        isCalculated = true;
      }
    }

    const divisor = await this.parameterService.getNumber(
      'overtime_divisor',
      173,
    );
    if (divisor <= 0) {
      throw new BadRequestException('Invalid overtime_divisor parameter');
    }

    const ratePerHour = isCalculated ? ((baseSalary + fixedAllowance) / divisor) : 0;
    if (!Number.isFinite(ratePerHour)) {
      throw new BadRequestException('Invalid overtime rate calculation');
    }

    const totalOvertimePay = isCalculated ? await this.calculateOvertimePay(
      rawMinutes,
      dayType,
      ratePerHour,
    ) : 0;
    if (!Number.isFinite(totalOvertimePay)) {
      throw new BadRequestException('Invalid overtime pay calculation');
    }

    const mealStartMinutes = startMinutes;
    const mealEndMinutes =
      endMinutes > startMinutes ? endMinutes : endMinutes + 1440;

    const totalMealAllowance = await this.calculateMealAllowance(
      dayType,
      mealStartMinutes,
      mealEndMinutes,
    );

    try {
      const overtime = await this.prisma.tr_overtime_requests.create({
        data: {
          employee_id: dto.employee_id,
          requested_by: requester.id,
          date: overtimeDate,
          start_time: new Date(`1970-01-01T${dto.start_time}:00`),
          end_time: new Date(`1970-01-01T${dto.end_time}:00`),
          total_hours: totalHours,
          raw_minutes: rawMinutes,
          type: dto.type,
          day_type: dayType,
          description: dto.description,
          rate_per_hour: ratePerHour,
          total_overtime_pay: totalOvertimePay,
          total_meal_allowance: totalMealAllowance,
          status: 'pending',
        },
      });

      await this.eventEmitter.emitAsync(
        'hris.request',
        new HrisRequestEvent(overtime.id, dto.employee_id, 'overtime', 'submitted', {
          details: `mengajukan lembur selama ${totalHours} jam pada tanggal ${dto.date}`,
        }),
      );

      return overtime;
    } catch (error) {
      this.logger.error('Failed to create overtime request', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        payload: dto,
        calculations: {
          baseSalary,
          fixedAllowance,
          divisor,
          ratePerHour,
          totalOvertimePay,
          totalMealAllowance,
          totalHours,
          rawMinutes,
          dayType,
        },
      });
      throw new BadRequestException(
        'Failed to create overtime request: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async cancelOvertime(userId: string, overtimeId: string) {
    const employee = await this.getEmployeeFromUser(userId);

    const overtime = await this.prisma.tr_overtime_requests.findUnique({
      where: { id: overtimeId },
    });

    if (!overtime) {
      throw new NotFoundException('Overtime request not found');
    }

    if (overtime.status !== 'pending') {
      throw new BadRequestException(
        'Only pending overtime requests can be cancelled',
      );
    }

    if (
      overtime.requested_by !== employee.id &&
      overtime.employee_id !== employee.id
    ) {
      throw new ForbiddenException(
        'You can only cancel your own overtime requests',
      );
    }

    await this.prisma.tr_overtime_requests.update({
      where: { id: overtimeId },
      data: {
        status: 'cancelled',
        rejection_reason: 'Cancelled by requester',
      },
    });

    await this.eventEmitter.emitAsync(
      'hris.request',
      new HrisRequestEvent(
        overtimeId,
        overtime.employee_id,
        'overtime',
        'cancelled',
      ),
    );

    return { message: 'Overtime request cancelled' };
  }

  async deleteOvertime(userId: string, overtimeId: string, userRole: string) {
    if (!['admin', 'super_admin'].includes(userRole)) {
      throw new ForbiddenException('Only admin can delete overtime requests');
    }

    const overtime = await this.prisma.tr_overtime_requests.findUnique({
      where: { id: overtimeId },
    });

    if (!overtime) {
      throw new NotFoundException('Overtime request not found');
    }

    if (
      overtime.status !== 'pending' &&
      overtime.status !== 'rejected' &&
      overtime.status !== 'cancelled'
    ) {
      throw new BadRequestException(
        'Can only delete pending, rejected, or cancelled overtime requests',
      );
    }

    await this.prisma.tr_overtime_requests.delete({
      where: { id: overtimeId },
    });

    return { message: 'Overtime request deleted' };
  }

  async listOvertimes(userId: string, query: ListOvertimeDto) {
    try {
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

      if (query.status) {
        where.status = query.status;
      }

      if (['admin', 'super_admin'].includes(userRole)) {
        if (query.employee_id) {
          where.employee_id = query.employee_id;
        }
      } else {
        where.employee_id = user.ms_employees.id;
      }

      if (query.month) {
        const [year, month] = query.month.split('-').map(Number);
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        where.date = { gte: startDate, lte: endDate };
      }

      const [data, total] = await Promise.all([
        this.prisma.tr_overtime_requests.findMany({
          where,
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
          include: {
            ms_employees_tr_overtime_requests_employee_idToms_employees: {
              select: { id: true, full_name: true, nik: true },
            },
          },
        }),
        this.prisma.tr_overtime_requests.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);
      return { data, meta: { page, limit, total, totalPages } };
    } catch (error) {
      this.logger.error(`Error in listOvertimes for user ${userId}:`, error);
      throw error;
    }
  }

  async listSubordinateOvertimes(userId: string, query: ListOvertimeDto) {
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

    if (query.month) {
      const [year, month] = query.month.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      where.date = { gte: startDate, lte: endDate };
    }

    const [data, total] = await Promise.all([
      this.prisma.tr_overtime_requests.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          ms_employees_tr_overtime_requests_employee_idToms_employees: {
            select: { id: true, full_name: true, nik: true },
          },
        },
      }),
      this.prisma.tr_overtime_requests.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return { data, meta: { page, limit, total, totalPages } };
  }

  async getOvertimeSummary(userId: string, month?: string) {
    const user = await this.prisma.ms_users.findUnique({
      where: { id: userId },
      include: { ms_employees: true, ms_roles: true },
    });

    if (!user || !user.ms_employees) {
      throw new NotFoundException('Employee not found');
    }

    const userRole = user.ms_roles?.name || 'karyawan';
    if (!['admin', 'hrd', 'manager_hrga', 'super_admin'].includes(userRole)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    let dateFilter: any = {};
    if (month) {
      const [year, m] = month.split('-').map(Number);
      const startDate = new Date(year, m - 1, 1);
      const endDate = new Date(year, m, 0);
      dateFilter = { gte: startDate, lte: endDate };
    } else {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      dateFilter = { gte: startDate, lte: endDate };
    }

    const requests = await this.prisma.tr_overtime_requests.findMany({
      where: { date: dateFilter },
      include: {
        ms_employees_tr_overtime_requests_employee_idToms_employees: {
          select: { id: true, full_name: true, nik: true },
        },
      },
    });

    const summaryMap = new Map<string, any>();

    for (const req of requests) {
      const emp =
        req.ms_employees_tr_overtime_requests_employee_idToms_employees;
      if (!summaryMap.has(emp.id)) {
        summaryMap.set(emp.id, {
          employee_id: emp.id,
          employee_name: emp.full_name,
          nik: emp.nik,
          total_requests: 0,
          total_hours: 0,
          total_overtime_pay: 0,
          total_meal_allowance: 0,
        });
      }

      const entry = summaryMap.get(emp.id);
      entry.total_requests += 1;
      entry.total_hours += Number(req.total_hours);
      entry.total_overtime_pay += Number(req.total_overtime_pay || 0);
      entry.total_meal_allowance += Number(req.total_meal_allowance || 0);
    }

    return Array.from(summaryMap.values());
  }

  async approveOvertime(
    userId: string,
    overtimeId: string,
    dto: ApproveOvertimeDto,
    approverRole: string,
  ) {
    const approver = await this.getEmployeeFromUser(userId);

    const overtime = await this.prisma.tr_overtime_requests.findUnique({
      where: { id: overtimeId },
    });

    if (!overtime) {
      throw new NotFoundException('Overtime request not found');
    }

    if (dto.action === 'reject') {
      await this.prisma.tr_overtime_requests.update({
        where: { id: overtimeId },
        data: {
          status: 'rejected',
          rejection_reason: dto.rejection_reason || 'Rejected',
        },
      });

      await this.eventEmitter.emitAsync(
        'hris.request',
        new HrisRequestEvent(
          overtimeId,
          overtime.employee_id,
          'overtime',
          'rejected',
          {
            rejectionReason: dto.rejection_reason || 'Rejected',
          },
        ),
      );

      return { message: 'Overtime request rejected' };
    }

    if (dto.action !== 'approve') {
      throw new BadRequestException('Invalid action');
    }

    // Step 1: Supervisor approval
    if (approverRole === 'atasan' && overtime.status === 'pending') {
      const targetEmployee = await this.prisma.ms_employees.findUnique({
        where: { id: overtime.employee_id },
      });
      if (
        !targetEmployee ||
        (targetEmployee.supervisor_id !== approver.id &&
          targetEmployee.manager_id !== approver.id)
      ) {
        throw new ForbiddenException(
          'You can only approve overtime for your subordinates',
        );
      }

      await this.prisma.tr_overtime_requests.update({
        where: { id: overtimeId },
        data: {
          status: 'supervisor_approved',
        },
      });

      await this.eventEmitter.emitAsync(
        'hris.request',
        new HrisRequestEvent(
          overtimeId,
          overtime.employee_id,
          'overtime',
          'supervisor_approved',
        ),
      );

      return { message: 'Overtime request approved by supervisor' };
    }

    // Step 2: Manager/HR approval
    if (
      ['manager_hrga', 'hrd', 'admin', 'super_admin'].includes(approverRole) &&
      overtime.status === 'supervisor_approved'
    ) {
      await this.prisma.tr_overtime_requests.update({
        where: { id: overtimeId },
        data: {
          manager_approved_at: new Date(),
          manager_id: approver.id,
          status: 'approved',
        },
      });

      await this.eventEmitter.emitAsync(
        'hris.request',
        new HrisRequestEvent(
          overtimeId,
          overtime.employee_id,
          'overtime',
          'approved',
          {
            details: `telah disetujui oleh atasan/manager dan menunggu pemrosesan HRD`,
          },
        ),
      );

      return { message: 'Overtime request approved by manager' };
    }

    throw new ForbiddenException(
      'You are not authorized to approve this overtime request at this stage',
    );
  }

  async processOvertime(
    userId: string,
    overtimeId: string,
    dto: ApproveOvertimeDto,
    processorRole: string,
    keycode?: string,
  ) {
    if (
      !['manager_hrga', 'hrd', 'admin', 'super_admin'].includes(processorRole)
    ) {
      throw new ForbiddenException('Only HRD or above can process overtime');
    }

    const processor = await this.getEmployeeFromUser(userId);

    const overtime = await this.prisma.tr_overtime_requests.findUnique({
      where: { id: overtimeId },
    });

    if (!overtime) {
      throw new NotFoundException('Overtime request not found');
    }

    if (overtime.status !== 'approved') {
      throw new BadRequestException(
        'Overtime must be approved by manager first',
      );
    }

    if (dto.action === 'approve') {
      if (!keycode) {
        throw new BadRequestException('x-salary-keycode header is required to process and approve overtime.');
      }
      const isValid = await this.encryptionService.validateKeycode(keycode);
      if (!isValid) {
        throw new BadRequestException('Invalid or expired salary keycode.');
      }

      const targetEmployee = await this.prisma.ms_employees.findUnique({
        where: { id: overtime.employee_id },
      });
      if (!targetEmployee) {
        throw new NotFoundException('Target employee not found');
      }

      const decryptVal = (val: string | null) => {
        if (!val) return 0;
        try {
          const decrypted = this.encryptionService.decrypt(val, keycode);
          const num = Number(decrypted);
          return isNaN(num) ? 0 : num;
        } catch {
          return 0;
        }
      };

      const baseSalary = decryptVal(targetEmployee.base_salary);
      const fixedAllowance = decryptVal(targetEmployee.fixed_allowance);

      const divisor = await this.parameterService.getNumber(
        'overtime_divisor',
        173,
      );
      if (divisor <= 0) {
        throw new BadRequestException('Invalid overtime_divisor parameter');
      }

      const ratePerHour = (baseSalary + fixedAllowance) / divisor;
      const totalOvertimePay = await this.calculateOvertimePay(
        overtime.raw_minutes || 0,
        overtime.day_type,
        ratePerHour,
      );

      await this.prisma.tr_overtime_requests.update({
        where: { id: overtimeId },
        data: {
          hrd_processed_at: new Date(),
          hrd_id: processor.id,
          status: 'processed',
          rate_per_hour: ratePerHour,
          total_overtime_pay: totalOvertimePay,
        },
      });

      await this.eventEmitter.emitAsync(
        'hris.request',
        new HrisRequestEvent(
          overtimeId,
          overtime.employee_id,
          'overtime',
          'approved',
          {
            details: `telah selesai diproses oleh HRD`,
          },
        ),
      );
    } else {
      await this.prisma.tr_overtime_requests.update({
        where: { id: overtimeId },
        data: {
          hrd_id: processor.id,
          status: 'rejected',
          rejection_reason: dto.rejection_reason || 'Rejected by HRD',
        },
      });

      await this.eventEmitter.emitAsync(
        'hris.request',
        new HrisRequestEvent(
          overtimeId,
          overtime.employee_id,
          'overtime',
          'rejected',
          {
            rejectionReason: dto.rejection_reason || 'Rejected by HRD',
          },
        ),
      );
    }

    return { message: `Overtime request ${dto.action}d by HRD` };
  }

  async getOvertimeDetail(userId: string, overtimeId: string) {
    const requester = await this.getEmployeeFromUser(userId);
    const user = await this.prisma.ms_users.findUnique({
      where: { id: userId },
      include: { ms_roles: true },
    });
    const roleName = user?.ms_roles?.name || '';

    const overtime = await this.prisma.tr_overtime_requests.findUnique({
      where: { id: overtimeId },
      include: {
        ms_employees_tr_overtime_requests_employee_idToms_employees: true,
      },
    });

    if (!overtime) {
      throw new NotFoundException('Overtime request not found');
    }

    // Check permissions
    const isOwner = overtime.employee_id === requester.id || overtime.requested_by === requester.id;
    const isHrOrAdmin = ['hrd', 'admin', 'super_admin', 'manager_hrga'].includes(roleName);
    
    // Check if requester is the supervisor or manager of the target employee
    const targetEmployee = overtime.ms_employees_tr_overtime_requests_employee_idToms_employees;
    const isAtasan = targetEmployee && (targetEmployee.supervisor_id === requester.id || targetEmployee.manager_id === requester.id);

    if (!isOwner && !isHrOrAdmin && !isAtasan) {
      throw new ForbiddenException('You do not have permission to view this overtime request');
    }

    const formula = {
      hourly_rate_formula: '(gaji pokok + tunjangan tetap) / 173',
      rounding_rules: {
        '1_to_30_minutes': '0.5 jam',
        '31_to_60_minutes': '1.0 jam',
        '1_hour_15_minutes': '1.0 jam',
        '1_hour_30_minutes': '1.5 jam',
        '1_hour_45_minutes': '1.5 jam',
        '1_hour_46_minutes_and_above': 'Pembulatan ke atas (2.0 jam)'
      },
      meal_allowance_rules: {
        workdays: {
          before_office_hours: 'Rp 10.000',
          '16:00_to_20:00': 'Rp 20.000',
          '20:00_to_24:00': 'Rp 10.000',
          '24:00_to_end': 'Rp 20.000'
        },
        saturdays: {
          before_office_hours: 'Rp 10.000',
          '14:00_to_22:00': 'Rp 6.000',
          '18:00_to_22:00': 'Rp 20.000',
          '22:00_to_end': 'Rp 10.000'
        },
        sundays_and_holidays: {
          before_office_hours: 'Rp 10.000',
          '08:00_to_12:00': 'Rp 10.000',
          '13:00_to_17:00': 'Rp 15.000',
          '17:00_to_21:00': 'Rp 20.000',
          '24:00_to_end': 'Rp 20.000'
        }
      },
      multiplier_rules: {
        '6_days_workweek': {
          workday: '1st hour x 1.5, subsequent hours x 2',
          holiday: 'first 7 hours x 2, 8th hour x 3, subsequent hours x 4'
        },
        '5_days_workweek': {
          workday: '1st hour x 1.5, subsequent hours x 2',
          holiday: 'first 8 hours x 2, 9th hour x 3, subsequent hours x 4'
        }
      },
      workflow: 'Atasan/SPV/Manager melakukan pengajuan lembur -> Manager ACC -> HRD rekap'
    };

    const { ms_employees_tr_overtime_requests_employee_idToms_employees, ...restOvertime } = overtime;

    let cleanEmployee = null;
    if (ms_employees_tr_overtime_requests_employee_idToms_employees) {
      const {
        base_salary,
        fixed_allowance,
        phone_allowance,
        dinas_allowance,
        ...publicEmployeeInfo
      } = ms_employees_tr_overtime_requests_employee_idToms_employees;
      cleanEmployee = publicEmployeeInfo;
    }

    return {
      ...restOvertime,
      employee: cleanEmployee,
      formula,
    };
  }
}

