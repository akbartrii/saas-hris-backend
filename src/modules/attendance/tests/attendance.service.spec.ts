import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AttendanceService } from '../attendance.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { SupabaseStorageService } from '../../../common/services/supabase-storage.service';
import { ParameterService } from '../../parameter/parameter.service';
import { FaceRecognitionService } from '../../../common/services/face-recognition.service';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let prisma: any;

  const mockPrisma = {
    ms_companies: { findMany: jest.fn() },
    ms_employees: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    ms_face_registrations: { findUnique: jest.fn() },
    tr_attendances: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn(), upsert: jest.fn(), create: jest.fn(), update: jest.fn() },
    tr_attendance_corrections: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn() },
    tr_employee_schedules: { findFirst: jest.fn() },
    ms_holiday_calendars: { findFirst: jest.fn() },
    ms_locations: { findUnique: jest.fn() },
    tr_remote_work_requests_current_remote_work: { findUnique: jest.fn() },
  };

  const mockStorageService = { uploadFile: jest.fn() };
  const mockParameterService = { getNumber: jest.fn(), getValue: jest.fn() };
  const mockFaceRecognitionService = { getFaceDescriptor: jest.fn(), isMatch: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SupabaseStorageService, useValue: mockStorageService },
        { provide: ParameterService, useValue: mockParameterService },
        { provide: FaceRecognitionService, useValue: mockFaceRecognitionService },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => jest.clearAllMocks());

  const mockPhoto = { buffer: Buffer.from('test'), mimetype: 'image/jpeg' } as Express.Multer.File;

  describe('getTodayStatus', () => {
    it('should return today status with no attendance', async () => {
      mockPrisma.tr_attendances.findFirst.mockResolvedValue(null);
      mockPrisma.tr_employee_schedules.findFirst.mockResolvedValue(null);
      mockPrisma.ms_employees.findUnique.mockResolvedValue(null);

      const result = await service.getTodayStatus('e1');
      expect(result).toHaveProperty('attendance', null);
      expect(result).toHaveProperty('can_clock_in');
    });
  });

  describe('listAttendance', () => {
    it('should return paginated attendance', async () => {
      mockPrisma.tr_attendances.findMany.mockResolvedValue([{ id: 'a1', status: 'present' }]);
      mockPrisma.tr_attendances.count.mockResolvedValue(1);

      const result = await service.listAttendance('u1', 'e1', 'c1', { page: 1, limit: 10 } as any);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('createCorrection', () => {
    const dto = { attendance_id: 'a1', correction_type: 'clock_in', reason: 'Forgot' };

    it('should throw when attendance not found', async () => {
      mockPrisma.tr_attendances.findFirst.mockResolvedValue(null);
      await expect(service.createCorrection('u1', 'e1', dto as any)).rejects.toThrow(NotFoundException);
    });

    it('should create correction', async () => {
      mockPrisma.tr_attendances.findFirst.mockResolvedValue({ id: 'a1', company_id: 'c1' });
      mockPrisma.tr_attendance_corrections.findFirst.mockResolvedValue(null);
      mockPrisma.tr_attendance_corrections.create.mockResolvedValue({ id: 'c1', status: 'pending' });

      const result = await service.createCorrection('u1', 'e1', dto as any);
      expect(result.status).toBe('pending');
    });
  });

  describe('cancelCorrection', () => {
    it('should throw when not found', async () => {
      mockPrisma.tr_attendance_corrections.findUnique.mockResolvedValue(null);
      await expect(service.cancelCorrection('e1', 'c1')).rejects.toThrow(NotFoundException);
    });

    it('should throw when not owner', async () => {
      mockPrisma.tr_attendance_corrections.findUnique.mockResolvedValue({ id: 'c1', employee_id: 'other-e1' });
      await expect(service.cancelCorrection('e1', 'c1')).rejects.toThrow(ForbiddenException);
    });

    it('should cancel pending correction', async () => {
      mockPrisma.tr_attendance_corrections.findUnique.mockResolvedValue({ id: 'c1', employee_id: 'e1', status: 'pending' });
      mockPrisma.tr_attendance_corrections.update.mockResolvedValue({ id: 'c1', status: 'cancelled' });

      const result = await service.cancelCorrection('e1', 'c1');
      expect(result.message).toBe('Correction cancelled');
    });
  });

  describe('listCorrections', () => {
    it('should return paginated corrections', async () => {
      mockPrisma.tr_attendance_corrections.findMany.mockResolvedValue([{ id: 'c1', status: 'pending' }]);
      mockPrisma.tr_attendance_corrections.count.mockResolvedValue(1);

      const result = await service.listCorrections('e1', { page: '1', limit: '10' });
      expect(result.data).toHaveLength(1);
    });
  });

  describe('calculateDistance', () => {
    it('should calculate correct distance', () => {
      const distance = (service as any).calculateDistance(
        -6.2088, 106.8456,
        -6.2100, 106.8500,
      );
      expect(distance).toBeGreaterThan(0);
    });
  });
});
