import { Test, TestingModule } from "@nestjs/testing";
import { OvernightService } from "../overnight.service";
import { PrismaService } from "../../../prisma/prisma.service";

describe("OvernightService", () => {
  let service: OvernightService;

  const mockPrisma = {
    tr_overnight_requests: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    ms_employees: { findUnique: jest.fn(), findMany: jest.fn() },
    ms_users: { findUnique: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OvernightService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<OvernightService>(OvernightService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("list", () => {
    it("should return requests", async () => {
      mockPrisma.ms_users.findUnique.mockResolvedValue({
        id: "u1",
        ms_employees: [{ id: "e1" }],
      });
      mockPrisma.tr_overnight_requests.findMany.mockResolvedValue([
        { id: "on1", status: "pending" },
      ]);

      const result = await service.list("u1", "c1", "karyawan", {} as any);

      expect(result.data).toHaveLength(1);
    });
  });

  describe("create", () => {
    it("should create request", async () => {
      mockPrisma.ms_users.findUnique.mockResolvedValue({
        id: "u1",
        ms_employees: [{ id: "e1" }],
      });
      mockPrisma.tr_overnight_requests.create.mockResolvedValue({
        id: "on1",
        date: "2026-07-01",
      });

      const result = await service.create("u1", "c1", {
        date: "2026-07-01",
      } as any);

      expect(result).toBeDefined();
    });
  });

  describe("approve", () => {
    it("should approve for supervisor", async () => {
      mockPrisma.tr_overnight_requests.findUnique.mockResolvedValue({
        id: "on1",
        company_id: "c1",
        employee_id: "e1",
        status: "pending",
        ms_employees_tr_overnight_requests_employee_idToms_employees: {
          supervisor_id: "su1",
        },
      });
      mockPrisma.tr_overnight_requests.update.mockResolvedValue({
        id: "on1",
        status: "approved",
      });

      const result = await service.approve("su1", "c1", "supervisor", "on1", {
        action: "approve",
      } as any);

      expect(result.status).toBe("approved");
    });
  });
});
