import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { EmployeeService } from '../employee.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('EmployeeService', () => {
  let service: EmployeeService;
  let prisma: any;

  const mockPrisma = {
    ms_employees: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    ms_users: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    ms_roles: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<EmployeeService>(EmployeeService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('listEmployees', () => {
    it('should return paginated employees', async () => {
      const mockEmployees = [
        { id: '1', full_name: 'John', nik: '123', is_active: true, company_id: 'c1' },
      ];
      mockPrisma.ms_employees.findMany.mockResolvedValue(mockEmployees);
      mockPrisma.ms_employees.count.mockResolvedValue(1);

      const result = await service.listEmployees('u1', 'c1', 'admin', { page: 1, limit: 10 } as any);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('createEmployee', () => {
    const dto = {
      full_name: 'New Emp',
      email: 'new@example.com',
      password: 'password123',
      department_id: 'd1',
      position_id: 'p1',
      hire_date: '2024-01-01',
    };

    it('should throw ForbiddenException for non-admin role', async () => {
      await expect(
        service.createEmployee('u1', 'c1', 'karyawan', dto as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create employee successfully', async () => {
      mockPrisma.ms_users.findUnique.mockResolvedValue(null);
      mockPrisma.ms_roles.findFirst.mockResolvedValue({ id: 'r1', name: 'karyawan' });
      mockPrisma.ms_users.create.mockResolvedValue({ id: 'u2', email: dto.email });
      mockPrisma.ms_employees.create.mockResolvedValue({ id: 'e1', full_name: dto.full_name, company_id: 'c1' });

      const result = await service.createEmployee('u1', 'c1', 'admin', dto as any);

      expect(result).toBeDefined();
      expect(result.full_name).toBe(dto.full_name);
    });
  });

  describe('getEmployeeDetail', () => {
    it('should throw NotFoundException when employee not found', async () => {
      mockPrisma.ms_employees.findUnique.mockResolvedValue(null);

      await expect(
        service.getEmployeeDetail('u1', 'c1', 'e1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return employee details', async () => {
      const mockEmp = { id: 'e1', full_name: 'John', company_id: 'c1' };
      mockPrisma.ms_employees.findUnique.mockResolvedValue(mockEmp);

      const result = await service.getEmployeeDetail('u1', 'c1', 'e1');
      expect(result).toBeDefined();
      expect(result.id).toBe('e1');
    });
  });
});
