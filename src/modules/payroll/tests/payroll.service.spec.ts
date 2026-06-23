import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { PayrollService } from "../payroll.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { EncryptionService } from "../../encryption/encryption.service";
import { PdfService } from "../../../common/services/pdf.service";

describe("PayrollService", () => {
  let service: PayrollService;
  let _prisma: any;

  const mockPrisma = {
    tr_payslips: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    tr_payroll_periods: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    ms_employees: { findMany: jest.fn(), findUnique: jest.fn() },
    tr_thr_records: { findMany: jest.fn(), create: jest.fn() },
  };

  const mockEncryptionService = {
    validateKeycode: jest.fn(),
    decrypt: jest.fn(),
  };
  const mockPdfService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EncryptionService, useValue: mockEncryptionService },
        { provide: PdfService, useValue: mockPdfService },
      ],
    }).compile();

    service = module.get<PayrollService>(PayrollService);
    _prisma = module.get(PrismaService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("listPayslips", () => {
    it("should return paginated payslips", async () => {
      mockPrisma.tr_payslips.findMany.mockResolvedValue([
        { id: "p1", status: "draft" },
      ]);
      mockPrisma.tr_payslips.count.mockResolvedValue(1);

      const result = await service.listPayslips(
        "u1",
        "c1",
        { page: 1, limit: 10 } as any,
        "admin",
      );
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe("getPayslipDetail", () => {
    it("should throw when payslip not found", async () => {
      mockPrisma.tr_payslips.findUnique.mockResolvedValue(null);
      await expect(
        service.getPayslipDetail("u1", "c1", "p1", "admin"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should return payslip detail", async () => {
      mockPrisma.tr_payslips.findUnique.mockResolvedValue({
        id: "p1",
        ms_employees: { company_id: "c1" },
      });
      const result = await service.getPayslipDetail("u1", "c1", "p1", "admin");
      expect(result.id).toBe("p1");
    });
  });

  describe("generatePayslip", () => {
    const dto = { employee_id: "e1", payroll_period_id: "pp1" };

    it("should throw if employee not found", async () => {
      mockPrisma.ms_employees.findUnique.mockResolvedValue(null);
      await expect(
        service.generatePayslip("u1", "c1", dto as any, "admin"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw if period not found", async () => {
      mockPrisma.ms_employees.findUnique.mockResolvedValue({
        id: "e1",
        company_id: "c1",
      });
      mockPrisma.tr_payroll_periods.findUnique.mockResolvedValue(null);
      await expect(
        service.generatePayslip("u1", "c1", dto as any, "admin"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw if payslip already exists", async () => {
      mockPrisma.ms_employees.findUnique.mockResolvedValue({
        id: "e1",
        company_id: "c1",
      });
      mockPrisma.tr_payroll_periods.findUnique.mockResolvedValue({
        id: "pp1",
        company_id: "c1",
      });
      mockPrisma.tr_payslips.findFirst.mockResolvedValue({ id: "existing" });
      await expect(
        service.generatePayslip("u1", "c1", dto as any, "admin"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should create payslip successfully", async () => {
      mockPrisma.ms_employees.findUnique.mockResolvedValue({
        id: "e1",
        company_id: "c1",
        base_salary: "5000000",
        fixed_allowance: "1000000",
      });
      mockPrisma.tr_payroll_periods.findUnique.mockResolvedValue({
        id: "pp1",
        company_id: "c1",
      });
      mockPrisma.tr_payslips.findFirst.mockResolvedValue(null);
      mockPrisma.tr_payslips.create.mockResolvedValue({
        id: "p1",
        status: "draft",
        net_income: 6000000,
      });

      const result = await service.generatePayslip(
        "u1",
        "c1",
        dto as any,
        "admin",
      );
      expect(result.status).toBe("draft");
    });
  });

  describe("listPayrollPeriods", () => {
    it("should return all periods for company", async () => {
      mockPrisma.tr_payroll_periods.findMany.mockResolvedValue([
        { id: "pp1", period_name: "Jan 2024" },
      ]);
      const result = await service.listPayrollPeriods("c1");
      expect(result).toHaveLength(1);
    });
  });

  describe("createPeriod", () => {
    it("should create a payroll period", async () => {
      const dto = {
        period_name: "January 2024",
        start_date: "2024-01-01",
        end_date: "2024-01-31",
      };
      mockPrisma.tr_payroll_periods.create.mockResolvedValue({
        id: "pp1",
        ...dto,
        month: 1,
        year: 2024,
      });
      const result = await service.createPeriod(dto as any, "admin", "c1");
      expect(result).toBeDefined();
    });
  });

  describe("exportPayroll", () => {
    it("should export CSV buffer", async () => {
      mockPrisma.tr_payslips.findMany.mockResolvedValue([
        {
          ms_employees: {
            nik: "123",
            full_name: "Emp",
            ms_departments_ms_employees_department_idToms_departments: {
              name: "IT",
            },
          },
          gross_income: 5000000,
          total_deductions: 500000,
          net_income: 4500000,
          tr_payroll_periods: { period_name: "Jan" },
        },
      ]);

      const result = await service.exportPayroll("c1", "pp1", "admin");
      expect(result).toBeInstanceOf(Buffer);
    });
  });
});
