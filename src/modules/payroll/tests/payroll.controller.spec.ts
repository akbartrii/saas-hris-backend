import { Test, TestingModule } from '@nestjs/testing';
import { PayrollController } from '../payroll.controller';
import { PayrollService } from '../payroll.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { EncryptionService } from '../../encryption/encryption.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';

describe('PayrollController', () => {
  let controller: PayrollController;
  let payrollService: any;

  const mockPayrollService = {
    listPayslips: jest.fn(),
    getPayslipDetail: jest.fn(),
    generateBatchPayslip: jest.fn(),
    listPayrollPeriods: jest.fn(),
    createPeriod: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PayrollController],
      providers: [
        { provide: PayrollService, useValue: mockPayrollService },
        { provide: PrismaService, useValue: {} },
        { provide: EncryptionService, useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PayrollController>(PayrollController);
    payrollService = module.get(PayrollService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listPayslips', () => {
    it('should delegate to service', async () => {
      mockPayrollService.listPayslips.mockResolvedValue({ data: [], total: 0 });

      const result = await controller.listPayslips('u1', 'c1', 'admin', {} as any);

      expect(payrollService.listPayslips).toHaveBeenCalledWith('u1', 'c1', {}, 'admin');
      expect(result).toEqual({ data: [], total: 0 });
    });
  });

  describe('getPayslipDetail', () => {
    it('should delegate to service', async () => {
      mockPayrollService.getPayslipDetail.mockResolvedValue({ id: 'ps1' });

      const result = await controller.getPayslipDetail('u1', 'c1', 'admin', 'ps1');

      expect(payrollService.getPayslipDetail).toHaveBeenCalledWith('u1', 'c1', 'ps1', 'admin');
    });
  });

  describe('generateBatchPayslip', () => {
    it('should delegate to service with keycode', async () => {
      mockPayrollService.generateBatchPayslip.mockResolvedValue({ count: 2 });

      const result = await controller.generateBatchPayslip('u1', 'c1', 'admin', 'valid-key', {} as any);

      expect(payrollService.generateBatchPayslip).toHaveBeenCalled();
      expect(result).toEqual({ count: 2 });
    });
  });

  describe('listPayrollPeriods', () => {
    it('should delegate to service', async () => {
      mockPayrollService.listPayrollPeriods.mockResolvedValue([{ id: 'p1' }]);

      const result = await controller.listPayrollPeriods('c1');

      expect(payrollService.listPayrollPeriods).toHaveBeenCalledWith('c1');
      expect(result).toHaveLength(1);
    });
  });

  describe('createPayrollPeriod', () => {
    it('should delegate to service', async () => {
      mockPayrollService.createPeriod.mockResolvedValue({ id: 'p1', period_name: 'July 2026' });

      const result = await controller.createPayrollPeriod('c1', { month: 7, year: 2026 } as any, 'admin');

      expect(payrollService.createPeriod).toHaveBeenCalledWith({ month: 7, year: 2026 }, 'admin', 'c1');
    });
  });
});
