import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { WorkScheduleService } from '../work-schedule.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('WorkScheduleService', () => {
  let service: WorkScheduleService;
  let prisma: any;

  const mockPrisma = {
    ms_work_schedules: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkScheduleService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<WorkScheduleService>(WorkScheduleService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('should return all schedules for a company', async () => {
      mockPrisma.ms_work_schedules.findMany.mockResolvedValue([{ id: 's1', name: 'Morning Shift' }]);

      const result = await service.list('c1');

      expect(result).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('should create a schedule for admin', async () => {
      const dto = { name: 'Morning Shift', schedule_type: 'shift', start_time: '08:00', end_time: '17:00' };
      mockPrisma.ms_work_schedules.create.mockResolvedValue({ id: 's1', ...dto });

      const result = await service.create('c1', 'admin', dto as any);

      expect(result.name).toBe('Morning Shift');
    });

    it('should throw ForbiddenException for non-admin', async () => {
      await expect(service.create('c1', 'karyawan', {} as any)).rejects.toThrow(ForbiddenException);
    });
  });
});
