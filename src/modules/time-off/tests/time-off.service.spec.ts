import { Test, TestingModule } from "@nestjs/testing";
import { TimeOffService } from "../time-off.service";
import { PrismaService } from "../../../prisma/prisma.service";

describe("TimeOffService", () => {
  let service: TimeOffService;
  let _prisma: any;

  const mockPrisma = {
    ms_time_off_types: { findUnique: jest.fn() },
    tr_time_off_requests: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    ms_employees: { findUnique: jest.fn() },
    tr_approvals: { create: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimeOffService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TimeOffService>(TimeOffService);
    _prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createTimeOff", () => {
    it("should create a time-off request", async () => {
      const userId = "u1";
      const companyId = "c1";
      const dto = {
        time_off_type_id: "t1",
        start_date: "2026-07-01",
        end_date: "2026-07-02",
        reason: "Personal",
      };

      mockPrisma.ms_employees.findUnique.mockResolvedValue({
        id: "e1",
        company_id: companyId,
      });
      mockPrisma.ms_time_off_types.findUnique.mockResolvedValue({
        id: "t1",
        company_id: companyId,
      });
      mockPrisma.tr_time_off_requests.create.mockResolvedValue({
        id: "to1",
        ...dto,
        employee_id: "e1",
      });

      const result = await service.createTimeOff(
        userId,
        companyId,
        "karyawan",
        dto as any,
      );

      expect(result).toBeDefined();
      expect(mockPrisma.tr_time_off_requests.create).toHaveBeenCalled();
    });

    it("should throw if employee not found", async () => {
      mockPrisma.ms_employees.findUnique.mockResolvedValue(null);

      await expect(
        service.createTimeOff("u1", "c1", "karyawan", {} as any),
      ).rejects.toThrow();
    });
  });

  describe("listTimeOffs", () => {
    it("should return paginated time-off requests", async () => {
      mockPrisma.tr_time_off_requests.count.mockResolvedValue(1);
      mockPrisma.tr_time_off_requests.findMany.mockResolvedValue([
        { id: "to1" },
      ]);
      mockPrisma.ms_employees.findUnique.mockResolvedValue({
        id: "e1",
        company_id: "c1",
      });

      const result = await service.listTimeOffs("u1", "c1", {
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
    });
  });
});
