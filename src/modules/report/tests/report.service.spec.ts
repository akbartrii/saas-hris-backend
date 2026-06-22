import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ReportService } from '../report.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { PdfService } from '../../../common/services/pdf.service';

describe('ReportService', () => {
  let service: ReportService;
  let prisma: any;

  const mockPrisma = {
    tr_attendances: { findMany: jest.fn(), aggregate: jest.fn() },
    tr_leave_requests: { findMany: jest.fn() },
    tr_payslips: { findMany: jest.fn() },
    tr_overtime_requests: { findMany: jest.fn() },
    ms_employees: { findMany: jest.fn() },
  };

  const mockPdfService = { generatePdf: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PdfService, useValue: mockPdfService },
      ],
    }).compile();

    service = module.get<ReportService>(ReportService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('attendanceReport', () => {
    it('should return attendance data for admin', async () => {
      mockPrisma.tr_attendances.findMany.mockResolvedValue([{ id: 'a1', status: 'present' }]);

      const result = await service.attendanceReport('c1', 'admin', {} as any);

      expect(result).toBeDefined();
    });

    it('should throw ForbiddenException for non-admin', async () => {
      await expect(service.attendanceReport('c1', 'karyawan', {} as any)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('leaveReport', () => {
    it('should return leave data for admin', async () => {
      mockPrisma.tr_leave_requests.findMany.mockResolvedValue([{ id: 'lr1', status: 'approved' }]);

      const result = await service.leaveReport('c1', 'admin', {} as any);

      expect(result).toBeDefined();
    });
  });

  describe('payrollReport', () => {
    it('should return payroll data for admin', async () => {
      mockPrisma.tr_payslips.findMany.mockResolvedValue([{ id: 'ps1', net_income: 5000000 }]);

      const result = await service.payrollReport('c1', 'admin', {} as any);

      expect(result).toBeDefined();
    });
  });

  describe('overtimeReport', () => {
    it('should return overtime data for admin', async () => {
      mockPrisma.tr_overtime_requests.findMany.mockResolvedValue([{ id: 'ot1', total_overtime_pay: 100000 }]);

      const result = await service.overtimeReport('c1', 'admin', {} as any);

      expect(result).toBeDefined();
    });
  });
});
