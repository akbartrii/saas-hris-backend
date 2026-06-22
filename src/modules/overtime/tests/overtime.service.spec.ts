import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OvertimeService } from '../overtime.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ParameterService } from '../../parameter/parameter.service';
import { EncryptionService } from '../../encryption/encryption.service';

describe('OvertimeService', () => {
  let service: OvertimeService;

  const mockPrisma = {
    tr_overtime_requests: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    ms_overtime_meal_allowances: { findMany: jest.fn().mockResolvedValue([]) },
    ms_employees: { findUnique: jest.fn(), findMany: jest.fn() },
    ms_users: { findUnique: jest.fn() },
    ms_holiday_calendars: { findFirst: jest.fn() },
    ms_work_schedules: { findFirst: jest.fn() },
    tr_approvals: { create: jest.fn() },
  };

  const mockParameterService = { getNumber: jest.fn().mockResolvedValue(1.5) };
  const mockEncryptionService = { decrypt: jest.fn().mockReturnValue('5000000'), validateKeycode: jest.fn().mockResolvedValue(true) };
  const mockEventEmitter = { emitAsync: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OvertimeService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ParameterService, useValue: mockParameterService },
        { provide: EncryptionService, useValue: mockEncryptionService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<OvertimeService>(OvertimeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createOvertime', () => {
    it('should create an overtime request', async () => {
      mockPrisma.ms_users.findUnique.mockResolvedValue({ id: 'u1', company_id: 'c1', ms_employees: [{ id: 'e1' }] });
      mockPrisma.ms_employees.findUnique.mockResolvedValue({ id: 'e1', company_id: 'c1', user_id: 'u1' });
      mockPrisma.tr_overtime_requests.create.mockResolvedValue({ id: 'ot1', total_overtime_pay: 100000 });

      const dto = { employee_id: 'e1', date: '2026-07-14', start_time: '18:00', end_time: '21:00', description: 'Work', type: 'weekday' };

      const result = await service.createOvertime('u1', 'c1', dto as any, 'admin', 'valid-key');

      expect(result).toBeDefined();
    });
  });

  describe('cancelOvertime', () => {
    it('should cancel a pending request', async () => {
      mockPrisma.tr_overtime_requests.findUnique.mockResolvedValue({ id: 'ot1', company_id: 'c1', employee_id: 'e1', status: 'pending' });
      mockPrisma.ms_employees.findUnique.mockResolvedValue({ id: 'e1', company_id: 'c1' });
      mockPrisma.tr_overtime_requests.update.mockResolvedValue({ id: 'ot1', status: 'cancelled' });

      const result = await service.cancelOvertime('u1', 'c1', 'ot1');

      expect(result).toBeDefined();
    });
  });
});
