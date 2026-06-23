import { Test, TestingModule } from "@nestjs/testing";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { ReimbursementService } from "../reimbursement.service";
import { PrismaService } from "../../../prisma/prisma.service";

describe("ReimbursementService", () => {
  let service: ReimbursementService;

  const mockPrisma = {
    tr_reimbursements: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    ms_employees: { findUnique: jest.fn(), findMany: jest.fn() },
    ms_users: { findUnique: jest.fn() },
  };

  const mockEventEmitter = { emitAsync: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReimbursementService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<ReimbursementService>(ReimbursementService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("list", () => {
    it("should return paginated reimbursements", async () => {
      mockPrisma.ms_users.findUnique.mockResolvedValue({
        id: "u1",
        ms_employees: [{ id: "e1" }],
      });
      mockPrisma.tr_reimbursements.findMany.mockResolvedValue([
        { id: "r1", amount: 50000 },
      ]);

      const result = await service.list("u1", "c1", "karyawan", {} as any);

      expect(result.data).toHaveLength(1);
    });
  });

  describe("create", () => {
    it("should create a reimbursement", async () => {
      mockPrisma.ms_users.findUnique.mockResolvedValue({
        id: "u1",
        ms_employees: [{ id: "e1" }],
      });
      mockPrisma.tr_reimbursements.create.mockResolvedValue({
        id: "r1",
        amount: 100000,
      });

      const result = await service.create("u1", "c1", {
        amount: 100000,
      } as any);

      expect(result).toBeDefined();
    });
  });

  describe("approve", () => {
    it("should approve a pending reimbursement", async () => {
      mockPrisma.tr_reimbursements.findUnique.mockResolvedValue({
        id: "r1",
        company_id: "c1",
        employee_id: "e1",
        status: "pending",
      });
      mockPrisma.tr_reimbursements.update.mockResolvedValue({
        id: "r1",
        status: "approved",
      });
      mockPrisma.ms_users.findUnique.mockResolvedValue({
        id: "u1",
        ms_employees: [{ id: "e2" }],
      });

      const result = await service.approve("u1", "c1", "admin", "r1", {
        action: "approve",
      } as any);

      expect(result.status).toBe("approved");
    });
  });
});
