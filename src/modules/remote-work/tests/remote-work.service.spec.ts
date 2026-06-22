import { Test, TestingModule } from '@nestjs/testing';
import { RemoteWorkService } from '../remote-work.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('RemoteWorkService', () => {
  let service: RemoteWorkService;

  const mockPrisma = {
    tr_remote_work_requests: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    ms_employees: { findUnique: jest.fn(), findMany: jest.fn() },
    ms_users: { findUnique: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemoteWorkService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<RemoteWorkService>(RemoteWorkService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('should return paginated requests', async () => {
      mockPrisma.ms_users.findUnique.mockResolvedValue({ id: 'u1', ms_employees: [{ id: 'e1' }] });
      mockPrisma.tr_remote_work_requests.findMany.mockResolvedValue([{ id: 'rw1', status: 'pending' }]);

      const result = await service.list('u1', 'c1', 'karyawan', {} as any);

      expect(result.data).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('should create a request', async () => {
      mockPrisma.ms_users.findUnique.mockResolvedValue({ id: 'u1', ms_employees: [{ id: 'e1' }] });
      mockPrisma.tr_remote_work_requests.create.mockResolvedValue({ id: 'rw1', reason: 'WFH' });

      const result = await service.create('u1', 'c1', { reason: 'WFH' } as any);

      expect(result).toBeDefined();
    });
  });

  describe('approve', () => {
    it('should approve a pending request', async () => {
      mockPrisma.tr_remote_work_requests.findUnique.mockResolvedValue({ id: 'rw1', company_id: 'c1', employee_id: 'e1', status: 'pending' });
      mockPrisma.tr_remote_work_requests.update.mockResolvedValue({ id: 'rw1', status: 'approved' });

      const result = await service.approve('u1', 'c1', 'admin', 'rw1', { action: 'approve' } as any);

      expect(result.status).toBe('approved');
    });
  });
});
