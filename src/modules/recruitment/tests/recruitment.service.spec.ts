import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { RecruitmentService } from '../recruitment.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('RecruitmentService', () => {
  let service: RecruitmentService;
  let prisma: any;

  const mockPrisma = {
    ms_users: { findUnique: jest.fn() },
    ms_job_postings: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn() },
    tr_job_applications: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecruitmentService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<RecruitmentService>(RecruitmentService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => jest.clearAllMocks());

  const mockUser = {
    id: 'u1', email: 'admin@test.com',
    ms_roles: { name: 'admin' },
    ms_employees: { id: 'e1', company_id: 'c1' },
  };

  describe('createJob', () => {
    const dto = { title: 'Software Engineer', description: 'Build stuff', requirements: 'Code', employment_type: 'full-time', department_id: 'd1', position_id: 'p1', location_id: 'loc1' };

    it('should throw ForbiddenException for non-admin role', async () => {
      mockPrisma.ms_users.findUnique.mockResolvedValue({ ...mockUser, ms_roles: { name: 'karyawan' } });
      await expect(service.createJob('u1', 'c1', dto as any)).rejects.toThrow(ForbiddenException);
    });

    it('should create a job posting', async () => {
      mockPrisma.ms_users.findUnique.mockResolvedValue(mockUser);
      mockPrisma.ms_job_postings.findUnique.mockResolvedValue(null);
      mockPrisma.ms_job_postings.create.mockResolvedValue({ id: 'j1', title: dto.title, status: 'active', public_slug: 'software-engineer-123' });

      const result = await service.createJob('u1', 'c1', dto as any);
      expect(result).toBeDefined();
      expect(result.title).toBe(dto.title);
    });

    it('should throw if slug already exists', async () => {
      mockPrisma.ms_users.findUnique.mockResolvedValue(mockUser);
      mockPrisma.ms_job_postings.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.createJob('u1', 'c1', { ...dto, public_slug: 'taken' } as any))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('listJobs', () => {
    it('should return paginated jobs', async () => {
      mockPrisma.ms_job_postings.findMany.mockResolvedValue([{ id: 'j1', title: 'Engineer' }]);
      mockPrisma.ms_job_postings.count.mockResolvedValue(1);

      const result = await service.listJobs('c1', { page: 1, limit: 10 } as any);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('applyJob', () => {
    const dto = { job_posting_id: 'j1', full_name: 'Applicant', email: 'a@test.com', phone: '123' };

    it('should throw if job not found', async () => {
      mockPrisma.ms_job_postings.findUnique.mockResolvedValue(null);
      await expect(service.applyJob(dto as any)).rejects.toThrow(NotFoundException);
    });

    it('should create application for active job', async () => {
      mockPrisma.ms_job_postings.findUnique.mockResolvedValue({ id: 'j1', status: 'active', company_id: 'c1' });
      mockPrisma.tr_job_applications.create.mockResolvedValue({ id: 'a1', status: 'new' });

      const result = await service.applyJob(dto as any);
      expect(result.status).toBe('new');
    });
  });

  describe('updateApplicationStatus', () => {
    it('should update application status', async () => {
      mockPrisma.tr_job_applications.findUnique.mockResolvedValue({
        id: 'a1', company_id: 'c1', ms_job_postings: { title: 'Engineer' },
      });
      mockPrisma.tr_job_applications.update.mockResolvedValue({ id: 'a1', status: 'approved' });

      const result = await service.updateApplicationStatus('u1', 'c1', 'a1', { status: 'approved', notes: 'Hired' });
      expect(result).toBeDefined();
    });
  });
});
