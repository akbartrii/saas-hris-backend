import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { OvertimeMealAllowanceService } from '../overtime-meal-allowance.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('OvertimeMealAllowanceService', () => {
  let service: OvertimeMealAllowanceService;
  let prisma: any;

  const mockPrisma = {
    ms_overtime_meal_allowances: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OvertimeMealAllowanceService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<OvertimeMealAllowanceService>(OvertimeMealAllowanceService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('should return all meal allowances for a company', async () => {
      mockPrisma.ms_overtime_meal_allowances.findMany.mockResolvedValue([{ id: 'ma1', day_type: 'weekday', amount: 25000 }]);

      const result = await service.list('c1');

      expect(result).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('should create a meal allowance for admin', async () => {
      const dto = { day_type: 'weekday', time_start: '18:00', time_end: '22:00', amount: 25000 };
      mockPrisma.ms_overtime_meal_allowances.create.mockResolvedValue({ id: 'ma1', ...dto });

      const result = await service.create('c1', 'admin', dto as any);

      expect(result.day_type).toBe('weekday');
    });

    it('should throw ForbiddenException for non-admin', async () => {
      await expect(service.create('c1', 'karyawan', {} as any)).rejects.toThrow(ForbiddenException);
    });
  });
});
