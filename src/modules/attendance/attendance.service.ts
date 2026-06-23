import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { SupabaseStorageService } from "../../common/services/supabase-storage.service";
import { ParameterService } from "../parameter/parameter.service";
import { ClockInDto } from "./dto/clock-in.dto";
import { ClockOutDto } from "./dto/clock-out.dto";
import { CreateCorrectionDto } from "./dto/create-correction.dto";
import { ApproveCorrectionDto } from "./dto/approve-correction.dto";
import { ListAttendanceDto } from "./dto/list-attendance.dto";
import { FaceRecognitionService } from "../../common/services/face-recognition.service";

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    private prisma: PrismaService,
    private storageService: SupabaseStorageService,
    private parameterService: ParameterService,
    private faceRecognitionService: FaceRecognitionService,
  ) {}

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371000;
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private async getEmployeeWithLocation(employeeId: string) {
    const employee = await this.prisma.ms_employees.findUnique({
      where: { id: employeeId },
      include: {
        ms_locations: true,
        tr_remote_work_requests_current_remote_work: true,
      },
    });
    if (!employee) {
      throw new NotFoundException("Employee not found");
    }
    return employee;
  }

  private async getEmployeeSchedule(employeeId: string, date: Date) {
    const schedule = await this.prisma.tr_employee_schedules.findFirst({
      where: {
        employee_id: employeeId,
        effective_date: { lte: date },
        OR: [{ end_date: null }, { end_date: { gte: date } }],
      },
      include: { ms_work_schedules: true },
      orderBy: { effective_date: "desc" },
    });
    return schedule?.ms_work_schedules || null;
  }

  private async isHoliday(date: Date): Promise<boolean> {
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    const nextDay = new Date(dateOnly);
    nextDay.setDate(nextDay.getDate() + 1);

    const holiday = await this.prisma.ms_holiday_calendars.findFirst({
      where: {
        holiday_date: { gte: dateOnly, lt: nextDay },
      },
    });
    return !!holiday;
  }

  private async validateGPS(
    employee: any,
    lat: number,
    lng: number,
  ): Promise<{
    isValid: boolean;
    distance: number;
    locationId?: string;
    radius: number;
    error?: string;
  }> {
    const employeeId = employee.id;

    if (!employee) {
      return {
        isValid: false,
        distance: 0,
        radius: 0,
        error: "Employee not found",
      };
    }

    // Check for active remote work via current_remote_work_id
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (employee.current_remote_work_id) {
      const wfhRequest = employee.tr_remote_work_requests_current_remote_work;

      if (
        wfhRequest &&
        wfhRequest.status === "approved" &&
        wfhRequest.start_date <= today &&
        wfhRequest.end_date >= today
      ) {
        const radius = wfhRequest.radius_meters || 50;
        const distance = this.calculateDistance(
          Number(wfhRequest.latitude),
          Number(wfhRequest.longitude),
          lat,
          lng,
        );

        return {
          isValid: distance <= radius,
          distance: Math.round(distance),
          locationId: undefined,
          radius,
        };
      }

      // Expired or invalid, clear current_remote_work_id
      await this.prisma.ms_employees.update({
        where: { id: employeeId },
        data: { current_remote_work_id: null },
      });
    }

    // Fallback to office location
    if (!employee.location_id) {
      return {
        isValid: false,
        distance: 0,
        radius: 0,
        error: "Work location not assigned. Please contact your supervisor.",
      };
    }

    if (!employee.ms_locations) {
      return {
        isValid: false,
        distance: 0,
        radius: 0,
        error: "Assigned location not found.",
      };
    }

    if (!employee.ms_locations.is_active) {
      return {
        isValid: false,
        distance: 0,
        radius: 0,
        error: "Assigned location is inactive. Please contact your supervisor.",
      };
    }

    const location = employee.ms_locations;
    const defaultRadius = await this.parameterService.getNumber(
      "gps_default_radius_meters",
      employee.company_id,
      100,
    );
    const radius = location.radius_meters || defaultRadius;

    const distance = this.calculateDistance(
      Number(location.latitude),
      Number(location.longitude),
      lat,
      lng,
    );

    return {
      isValid: distance <= radius,
      distance: Math.round(distance),
      locationId: location.id,
      radius,
    };
  }

  private async calculateLateMinutes(
    clockIn: Date,
    scheduleStartTime: Date | null,
    companyId: string,
  ): Promise<number> {
    if (!scheduleStartTime) return 0;
    const scheduleMinutes =
      scheduleStartTime.getHours() * 60 + scheduleStartTime.getMinutes();
    const clockInMinutes = clockIn.getHours() * 60 + clockIn.getMinutes();
    const diff = clockInMinutes - scheduleMinutes;
    const tolerance = await this.parameterService.getNumber(
      "late_tolerance_minutes",
      companyId,
      5,
    );
    return diff > tolerance ? diff : 0;
  }

  private async calculateEarlyLeaveMinutes(
    clockOut: Date,
    scheduleEndTime: Date | null,
    companyId: string,
  ): Promise<number> {
    if (!scheduleEndTime) return 0;
    const scheduleMinutes =
      scheduleEndTime.getHours() * 60 + scheduleEndTime.getMinutes();
    const clockOutMinutes = clockOut.getHours() * 60 + clockOut.getMinutes();
    const diff = scheduleMinutes - clockOutMinutes;
    const tolerance = await this.parameterService.getNumber(
      "late_tolerance_minutes",
      companyId,
      5,
    );
    return diff > tolerance ? diff : 0;
  }

  private async recalculateAttendance(attendanceId: string) {
    const attendance = await this.prisma.tr_attendances.findUnique({
      where: { id: attendanceId },
    });
    if (!attendance || !attendance.clock_in) return;

    const schedule = await this.getEmployeeSchedule(
      attendance.employee_id,
      attendance.attendance_date,
    );

    let lateMinutes = 0;
    let lateDeduction = 0;
    let earlyLeaveMinutes = 0;
    let status = "present";
    let attendanceAllowance = 0;

    if (attendance.clock_in && schedule?.start_time) {
      lateMinutes = await this.calculateLateMinutes(
        attendance.clock_in,
        schedule.start_time,
        attendance.company_id,
      );
      if (lateMinutes > 0) {
        const lateRate = await this.parameterService.getNumber(
          "late_deduction_rate_per_hour",
          attendance.company_id,
          5000,
        );
        lateDeduction = Math.ceil(lateMinutes / 60) * lateRate;
        status = "late";
      }
    }

    if (attendance.clock_out && schedule?.end_time) {
      earlyLeaveMinutes = await this.calculateEarlyLeaveMinutes(
        attendance.clock_out,
        schedule.end_time,
        attendance.company_id,
      );
      if (earlyLeaveMinutes > 0) {
        if (status === "present") status = "early_leave";
      }
    }

    const isHoliday = await this.isHoliday(attendance.attendance_date);

    if (attendance.clock_in && attendance.clock_out) {
      attendanceAllowance = await this.parameterService.getNumber(
        "attendance_allowance_daily",
        attendance.company_id,
        25000,
      );
    } else {
      attendanceAllowance = 0;
    }

    if (isHoliday) status = "holiday";

    await this.prisma.tr_attendances.update({
      where: { id: attendanceId },
      data: {
        late_minutes: lateMinutes,
        late_deduction: lateDeduction,
        early_leave_minutes: earlyLeaveMinutes,
        attendance_allowance: attendanceAllowance,
        is_holiday: isHoliday,
        status,
      },
    });
  }

  private async verifyFace(employeeId: string, photo: Buffer) {
    const registration = await this.prisma.ms_face_registrations.findUnique({
      where: { employee_id: employeeId },
    });

    if (!registration) {
      throw new BadRequestException(
        "Face registration required. Please complete face registration first.",
      );
    }

    // If no face descriptor yet (new registration flow), skip verification for now
    // Will be cached on first clock-in after platform upgrade
    if (!registration.face_descriptor) {
      this.logger.warn(
        `[FaceVerify] No face descriptor for employee ${employeeId}. Skipping face verification.`,
      );
      return;
    }

    const currentDescriptor =
      await this.faceRecognitionService.getFaceDescriptor(photo);

    if (!currentDescriptor) {
      throw new BadRequestException(
        "Could not detect face in photo. Please ensure your face is clearly visible.",
      );
    }

    const isMatch = this.faceRecognitionService.isMatch(
      registration.face_descriptor as any,
      currentDescriptor,
    );

    if (!isMatch) {
      throw new BadRequestException(
        "Face verification failed. Wajah tidak cocok dengan data terdaftar.",
      );
    }
  }

  private async checkFaceRegistration(employeeId: string) {
    const employee = await this.prisma.ms_employees.findUnique({
      where: { id: employeeId },
      select: { face_registration_status: true },
    });

    if (!employee || employee.face_registration_status !== "registered") {
      throw new BadRequestException(
        "Face registration required. Please complete face registration before clocking in/out.",
      );
    }
  }

  async clockIn(
    userId: string,
    employeeId: string,
    dto: ClockInDto,
    photo: Express.Multer.File,
  ) {
    const employee = await this.getEmployeeWithLocation(employeeId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await this.checkFaceRegistration(employee.id);
    await this.verifyFace(employee.id, photo.buffer);

    const existing = await this.prisma.tr_attendances.findFirst({
      where: { employee_id: employee.id, attendance_date: today },
    });

    if (existing?.clock_in) {
      throw new BadRequestException("Already clocked in today");
    }

    const gpsValidation = await this.validateGPS(employee, dto.lat, dto.lng);

    if (!gpsValidation.isValid) {
      throw new BadRequestException(
        gpsValidation.error ||
          `You are ${gpsValidation.distance}m away from the assigned location. Maximum allowed is ${gpsValidation.radius}m.`,
      );
    }

    const ext = photo.mimetype.split("/")[1] || "jpg";
    const dateStr = today.toISOString().split("T")[0];
    const photoPath = `companies/${employee.company_id}/attendance/${employee.id}/${dateStr}_clock_in.${ext}`;
    const bucket =
      (await this.parameterService.getValue(
        "attendance_photo_bucket",
        employee.company_id,
      )) || "attendance-proof";
    const photoUrl = await this.storageService.uploadFile(
      bucket,
      photoPath,
      photo.buffer,
      photo.mimetype,
    );

    const schedule = await this.getEmployeeSchedule(employee.id, today);
    const now = new Date();
    const lateMinutes = await this.calculateLateMinutes(
      now,
      schedule?.start_time || null,
      employee.company_id,
    );
    const lateRate = await this.parameterService.getNumber(
      "late_deduction_rate_per_hour",
      employee.company_id,
      5000,
    );
    const lateDeduction = Math.ceil(lateMinutes / 60) * lateRate;
    const isHoliday = await this.isHoliday(today);

    let status = "present";
    if (lateMinutes > 0) status = "late";
    if (isHoliday) status = "holiday";

    const attendance = await this.prisma.tr_attendances.upsert({
      where: {
        employee_id_attendance_date: {
          employee_id: employee.id,
          attendance_date: today,
        },
      },
      update: {
        clock_in: now,
        clock_in_lat: dto.lat,
        clock_in_lng: dto.lng,
        clock_in_photo_url: photoUrl,
        clock_in_distance: gpsValidation.distance,
        location_id: gpsValidation.locationId,
        status,
        late_minutes: lateMinutes,
        late_deduction: lateDeduction,
        is_holiday: isHoliday,
        notes: dto.notes,
      },
      create: {
        company_id: employee.company_id,
        employee_id: employee.id,
        attendance_date: today,
        clock_in: now,
        clock_in_lat: dto.lat,
        clock_in_lng: dto.lng,
        clock_in_photo_url: photoUrl,
        clock_in_distance: gpsValidation.distance,
        location_id: gpsValidation.locationId,
        status,
        late_minutes: lateMinutes,
        late_deduction: lateDeduction,
        is_holiday: isHoliday,
        notes: dto.notes,
      },
    });

    return attendance;
  }

  async clockOut(
    userId: string,
    employeeId: string,
    dto: ClockOutDto,
    photo: Express.Multer.File,
  ) {
    const employee = await this.getEmployeeWithLocation(employeeId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await this.checkFaceRegistration(employee.id);
    await this.verifyFace(employee.id, photo.buffer);

    const attendance = await this.prisma.tr_attendances.findFirst({
      where: { employee_id: employee.id, attendance_date: today },
    });

    if (!attendance || !attendance.clock_in) {
      throw new BadRequestException("You must clock in before clocking out");
    }

    if (attendance.clock_out) {
      throw new BadRequestException("Already clocked out today");
    }

    const gpsValidation = await this.validateGPS(employee, dto.lat, dto.lng);

    if (!gpsValidation.isValid) {
      throw new BadRequestException(
        gpsValidation.error ||
          `You are ${gpsValidation.distance}m away from the assigned location. Maximum allowed is ${gpsValidation.radius}m.`,
      );
    }

    const ext = photo.mimetype.split("/")[1] || "jpg";
    const dateStr = today.toISOString().split("T")[0];
    const photoPath = `companies/${employee.company_id}/attendance/${employee.id}/${dateStr}_clock_out.${ext}`;
    const bucket =
      (await this.parameterService.getValue(
        "attendance_photo_bucket",
        employee.company_id,
      )) || "attendance-proof";
    const photoUrl = await this.storageService.uploadFile(
      bucket,
      photoPath,
      photo.buffer,
      photo.mimetype,
    );

    const schedule = await this.getEmployeeSchedule(employee.id, today);
    const now = new Date();
    const earlyLeaveMinutes = await this.calculateEarlyLeaveMinutes(
      now,
      schedule?.end_time || null,
      employee.company_id,
    );
    const earlyRate = await this.parameterService.getNumber(
      "early_leave_deduction_rate_per_hour",
      employee.company_id,
      5000,
    );
    const earlyLeaveDeduction = Math.ceil(earlyLeaveMinutes / 60) * earlyRate;

    let status = attendance.status;
    if (earlyLeaveMinutes > 0 && status === "present") {
      status = "early_leave";
    } else if (earlyLeaveMinutes > 0 && status === "late") {
      status = "late_and_early_leave";
    }

    const attendanceAllowance = await this.parameterService.getNumber(
      "attendance_allowance_daily",
      employee.company_id,
      25000,
    );

    const updated = await this.prisma.tr_attendances.update({
      where: { id: attendance.id },
      data: {
        clock_out: now,
        clock_out_lat: dto.lat,
        clock_out_lng: dto.lng,
        clock_out_photo_url: photoUrl,
        clock_out_distance: gpsValidation.distance,
        early_leave_minutes: earlyLeaveMinutes,
        late_deduction:
          (Number(attendance.late_deduction) || 0) + earlyLeaveDeduction,
        attendance_allowance: attendanceAllowance,
        status,
        notes: dto.notes || attendance.notes,
      },
    });

    return updated;
  }

  async getTodayStatus(employeeId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await this.prisma.tr_attendances.findFirst({
      where: { employee_id: employeeId, attendance_date: today },
      include: { ms_locations: true },
    });

    const schedule = await this.getEmployeeSchedule(employeeId, today);

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const scheduleStartMinutes = schedule?.start_time
      ? (schedule.start_time as any as Date).getHours() * 60 +
        (schedule.start_time as any as Date).getMinutes()
      : 480; // default 08:00

    return {
      date: today,
      attendance: attendance
        ? {
            id: attendance.id,
            clock_in: attendance.clock_in,
            clock_out: attendance.clock_out,
            clock_in_photo_url: attendance.clock_in_photo_url,
            clock_out_photo_url: attendance.clock_out_photo_url,
            clock_in_lat: attendance.clock_in_lat,
            clock_in_lng: attendance.clock_in_lng,
            clock_out_lat: attendance.clock_out_lat,
            clock_out_lng: attendance.clock_out_lng,
            status: attendance.status,
            is_holiday: attendance.is_holiday,
            late_minutes: attendance.late_minutes,
            early_leave_minutes: attendance.early_leave_minutes,
            notes: attendance.notes,
          }
        : null,
      schedule: schedule
        ? {
            start_time: schedule.start_time,
            end_time: schedule.end_time,
          }
        : null,
      can_clock_in:
        !attendance?.clock_in && currentMinutes >= scheduleStartMinutes - 60,
      can_clock_out: !!attendance?.clock_in && !attendance?.clock_out,
    };
  }

  async listAttendance(
    userId: string,
    employeeId: string,
    companyId: string,
    query: ListAttendanceDto,
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {
      employee_id: employeeId,
      company_id: companyId,
    };

    if (query.date) {
      where.attendance_date = new Date(query.date);
    }

    if (query.month) {
      const [year, month] = query.month.split("-").map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      where.attendance_date = { gte: startDate, lte: endDate };
    }

    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.tr_attendances.findMany({
        where,
        skip,
        take: limit,
        orderBy: { attendance_date: "desc" },
        include: { ms_locations: true },
      }),
      this.prisma.tr_attendances.count({ where }),
    ]);

    return { data, meta: { page, limit, total } };
  }

  async listAllAttendance(userId: string, companyId: string, query: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = { company_id: companyId };

    if (query.employee_id) where.employee_id = query.employee_id;
    if (query.status) where.status = query.status;
    if (query.month) {
      const [year, month] = query.month.split("-").map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      where.attendance_date = { gte: startDate, lte: endDate };
    }

    const [data, total] = await Promise.all([
      this.prisma.tr_attendances.findMany({
        where,
        skip,
        take: limit,
        orderBy: { attendance_date: "desc" },
        include: {
          ms_locations: true,
          ms_employees: { select: { id: true, full_name: true, nik: true } },
        },
      }),
      this.prisma.tr_attendances.count({ where }),
    ]);

    return { data, meta: { page, limit, total } };
  }

  async listSubordinateAttendance(
    userId: string,
    employeeId: string,
    companyId: string,
    query: ListAttendanceDto,
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const subordinates = await this.prisma.ms_employees.findMany({
      where: {
        OR: [{ supervisor_id: employeeId }, { manager_id: employeeId }],
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

    if (query.date) {
      where.attendance_date = new Date(query.date);
    }

    if (query.month) {
      const [year, month] = query.month.split("-").map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      where.attendance_date = { gte: startDate, lte: endDate };
    }

    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.tr_attendances.findMany({
        where,
        skip,
        take: limit,
        orderBy: { attendance_date: "desc" },
        include: {
          ms_locations: true,
          ms_employees: { select: { id: true, full_name: true, nik: true } },
        },
      }),
      this.prisma.tr_attendances.count({ where }),
    ]);

    return { data, meta: { page, limit, total } };
  }

  async createCorrection(
    userId: string,
    employeeId: string,
    dto: CreateCorrectionDto,
  ) {
    const attendance = await this.prisma.tr_attendances.findFirst({
      where: { id: dto.attendance_id, employee_id: employeeId },
    });

    if (!attendance) {
      throw new NotFoundException("Attendance record not found");
    }

    const pendingCorrection =
      await this.prisma.tr_attendance_corrections.findFirst({
        where: {
          attendance_id: dto.attendance_id,
          status: { in: ["pending", "supervisor_approved"] },
        },
      });

    if (pendingCorrection) {
      throw new BadRequestException(
        "A pending correction already exists for this attendance",
      );
    }

    const correction = await this.prisma.tr_attendance_corrections.create({
      data: {
        company_id: attendance.company_id,
        attendance_id: dto.attendance_id,
        employee_id: employeeId,
        submitted_by: userId,
        correction_type: dto.correction_type,
        correct_clock_in: dto.correct_clock_in
          ? new Date(`1970-01-01T${dto.correct_clock_in}:00`)
          : null,
        correct_clock_out: dto.correct_clock_out
          ? new Date(`1970-01-01T${dto.correct_clock_out}:00`)
          : null,
        reason: dto.reason,
        status: "pending",
      },
    });

    return correction;
  }

  async cancelCorrection(employeeId: string, correctionId: string) {
    const correction = await this.prisma.tr_attendance_corrections.findUnique({
      where: { id: correctionId },
    });

    if (!correction) {
      throw new NotFoundException("Correction not found");
    }

    if (correction.employee_id !== employeeId) {
      throw new ForbiddenException("You can only cancel your own corrections");
    }

    if (correction.status !== "pending") {
      throw new BadRequestException(
        "Only pending corrections can be cancelled",
      );
    }

    await this.prisma.tr_attendance_corrections.update({
      where: { id: correctionId },
      data: { status: "cancelled" },
    });

    return { message: "Correction cancelled" };
  }

  async listCorrections(employeeId: string, query: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    // If it's a specific employee list, we filter by employee_id.
    // The role filtering should happen in the controller if needed,
    // but here we just ensure we only show current employee data if requested.
    where.employee_id = employeeId;

    if (query.status) where.status = query.status;

    const [data, total] = await Promise.all([
      this.prisma.tr_attendance_corrections.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          tr_attendances: true,
          ms_employees_tr_attendance_corrections_employee_idToms_employees: true,
        },
      }),
      this.prisma.tr_attendance_corrections.count({ where }),
    ]);

    return { data, meta: { page, limit, total } };
  }

  async approveCorrection(
    userId: string,
    employeeId: string,
    correctionId: string,
    dto: ApproveCorrectionDto,
    approverRole: string,
  ) {
    const correction = await this.prisma.tr_attendance_corrections.findUnique({
      where: { id: correctionId },
      include: { tr_attendances: true },
    });

    if (!correction) {
      throw new NotFoundException("Correction request not found");
    }

    if (
      correction.status !== "pending" &&
      correction.status !== "supervisor_approved"
    ) {
      throw new BadRequestException("Correction request already processed");
    }

    if (approverRole === "atasan") {
      if (correction.status !== "pending") {
        throw new BadRequestException("Correction request already processed");
      }

      const employee = await this.prisma.ms_employees.findUnique({
        where: { id: correction.employee_id },
      });
      if (employee?.supervisor_id !== employeeId) {
        throw new ForbiddenException(
          "You can only approve corrections of your subordinates",
        );
      }

      if (dto.action === "approve") {
        await this.prisma.tr_attendance_corrections.update({
          where: { id: correctionId },
          data: {
            supervisor_approved_at: new Date(),
            supervisor_id: employeeId,
            status: "supervisor_approved",
          },
        });
      } else {
        await this.prisma.tr_attendance_corrections.update({
          where: { id: correctionId },
          data: {
            supervisor_id: employeeId,
            status: "rejected",
            rejection_reason: dto.rejection_reason || "Rejected by supervisor",
          },
        });
      }
      return { message: `Correction ${dto.action}d by supervisor` };
    }

    if (["manager_hrga", "admin", "super_admin"].includes(approverRole)) {
      if (correction.status !== "supervisor_approved") {
        throw new BadRequestException("Must be approved by supervisor first");
      }

      if (dto.action === "approve") {
        const attendanceDate = correction.tr_attendances?.attendance_date;
        if (!attendanceDate) {
          throw new NotFoundException("Attendance record not found");
        }

        const updateData: any = {};
        if (correction.correct_clock_in) {
          updateData.clock_in = this.combineDateTime(
            attendanceDate,
            correction.correct_clock_in,
          );
        }
        if (correction.correct_clock_out) {
          updateData.clock_out = this.combineDateTime(
            attendanceDate,
            correction.correct_clock_out,
          );
        }

        await this.prisma.tr_attendances.update({
          where: { id: correction.attendance_id },
          data: updateData,
        });

        await this.recalculateAttendance(correction.attendance_id);

        await this.prisma.tr_attendance_corrections.update({
          where: { id: correctionId },
          data: {
            hrga_approved_at: new Date(),
            hrga_manager_id: employeeId,
            status: "approved",
          },
        });
      } else {
        await this.prisma.tr_attendance_corrections.update({
          where: { id: correctionId },
          data: {
            hrga_manager_id: employeeId,
            status: "rejected",
            rejection_reason: dto.rejection_reason || "Rejected by HRGA",
          },
        });
      }
      return { message: `Correction ${dto.action}d by HRGA` };
    }

    throw new ForbiddenException("Insufficient permissions");
  }

  @Cron(CronExpression.EVERY_DAY_AT_11PM)
  async markAbsentEmployees() {
    this.logger.log("Running absent marking cron job...");

    const companies = await this.prisma.ms_companies.findMany({
      where: { is_active: true },
      select: { id: true },
    });

    for (const company of companies) {
      await this.markAbsentForCompany(company.id);
    }

    this.logger.log("Absent marking completed");
  }

  private async markAbsentForCompany(companyId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isTodayHoliday = await this.isHoliday(today);
    const dayOfWeek = today.getDay();

    const activeEmployees = await this.prisma.ms_employees.findMany({
      where: { is_active: true, company_id: companyId },
      include: {
        tr_employee_schedules: { include: { ms_work_schedules: true } },
      },
    });

    for (const employee of activeEmployees) {
      const schedule = employee.tr_employee_schedules
        ?.filter((s) => {
          const eff = new Date(s.effective_date);
          return eff <= today && (!s.end_date || new Date(s.end_date) >= today);
        })
        .sort(
          (a, b) =>
            new Date(b.effective_date).getTime() -
            new Date(a.effective_date).getTime(),
        )[0]?.ms_work_schedules;

      if (!schedule) continue;

      const workDays: number[] = schedule.work_days || [1, 2, 3, 4, 5];
      const isWorkDay = workDays.includes(dayOfWeek);

      if (isTodayHoliday && schedule.is_holiday_off) continue;
      if (!isWorkDay) continue;

      const existingAttendance = await this.prisma.tr_attendances.findFirst({
        where: {
          employee_id: employee.id,
          attendance_date: { gte: today, lt: tomorrow },
        },
      });

      if (!existingAttendance) {
        await this.prisma.tr_attendances.create({
          data: {
            employee_id: employee.id,
            company_id: companyId,
            attendance_date: today,
            status: "absent",
            is_holiday: isTodayHoliday,
            attendance_allowance: 0,
            late_deduction: 0,
            late_minutes: 0,
            early_leave_minutes: 0,
          },
        });
      } else if (!existingAttendance.clock_in) {
        await this.prisma.tr_attendances.update({
          where: { id: existingAttendance.id },
          data: { status: "absent", attendance_allowance: 0 },
        });
      }
    }
  }

  private combineDateTime(date: Date, time: Date): Date {
    const result = new Date(date);
    result.setHours(time.getHours(), time.getMinutes(), 0, 0);
    return result;
  }
}
