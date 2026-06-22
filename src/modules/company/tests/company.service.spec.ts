import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { CompanyService } from '../company.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('CompanyService', () => {
  let service: CompanyService;

  const mockPrisma = {
    ms_companies: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CompanyService>(CompanyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('should return companies', async () => {
      mockPrisma.ms_companies.findMany.mockResolvedValue([{ id: 'c1', name: 'Test Corp' }]);

      const result = await service.list('c1', {} as any);

      expect(result).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('should create for super_admin', async () => {
      mockPrisma.ms_companies.create.mockResolvedValue({ id: 'c1', name: 'New Corp' });

      const result = await service.create('super_admin', 'admin-id', { name: 'New Corp' } as any);

      expect(result.name).toBe('New Corp');
    });

    it('should throw ForbiddenException for non-super_admin', async () => {
      await expect(service.create('karyawan', 'c1', {} as any)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('should update for super_admin', async () => {
      mockPrisma.ms_companies.findUnique.mockResolvedValue({ id: 'c1' });
      mockPrisma.ms_companies.update.mockResolvedValue({ id: 'c1', name: 'Updated Corp' });

      const result = await service.update('super_admin', 'c1', 'c1', { name: 'Updated Corp' } as any);

      expect(result.name).toBe('Updated Corp');
    });

    it('should throw ForbiddenException for non-super_admin', async () => {
      await expect(service.update('karyawan', 'c1', 'c1', {} as any)).rejects.toThrow(ForbiddenException);
    });
  });
});
