import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { LeaveService } from "../leave.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { ParameterService } from "../../parameter/parameter.service";

describe("LeaveService", () => {
  let service: LeaveService;
  let _prisma: any;

  const mockPrisma = {
    ms_employees: { findUnique: jest.fn(), findMany: jest.fn() },
    ms_leave_types: { findUnique: jest.fn(), findMany: jest.fn() },
    tr_leave_requests: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  const mockParameterService = { getNumber: jest.fn() };
  const mockEventEmitter = { emit: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaveService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ParameterService, useValue: mockParameterService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<LeaveService>(LeaveService);
    _prisma = module.get(PrismaService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("createLeave", () => {
    const dto = {
      leave_type_id: "lt1",
      start_date: "2024-06-01",
      end_date: "2024-06-03",
      total_days: 3,
      reason: "Sick",
    };

    it("should throw NotFoundException when employee not found", async () => {
      mockPrisma.ms_employees.findUnique.mockResolvedValue(null);
      await expect(
        service.createLeave("u1", "c1", "karyawan", dto as any),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException when leave type not found", async () => {
      mockPrisma.ms_employees.findUnique.mockResolvedValue({ id: "e1" });
      mockPrisma.ms_leave_types.findUnique.mockResolvedValue(null);
      await expect(
        service.createLeave("u1", "c1", "karyawan", dto as any),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when start > end", async () => {
      mockPrisma.ms_employees.findUnique.mockResolvedValue({
        id: "e1",
        ms_users: {},
      });
      mockPrisma.ms_leave_types.findUnique.mockResolvedValue({ id: "lt1" });
      await expect(
        service.createLeave("u1", "c1", "karyawan", {
          ...dto,
          start_date: "2024-06-05",
          end_date: "2024-06-01",
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it("should create leave request", async () => {
      mockPrisma.ms_employees.findUnique.mockResolvedValue({
        id: "e1",
        ms_users: {},
      });
      mockPrisma.ms_leave_types.findUnique.mockResolvedValue({ id: "lt1" });
      mockPrisma.tr_leave_requests.create.mockResolvedValue({
        id: "l1",
        status: "pending",
      });

      const result = await service.createLeave(
        "u1",
        "c1",
        "karyawan",
        dto as any,
      );
      expect(result.status).toBe("pending");
    });
  });

  describe("getLeaveBalance", () => {
    it("should return balances", async () => {
      mockPrisma.ms_employees.findUnique.mockResolvedValue({ id: "e1" });
      mockPrisma.ms_leave_types.findMany.mockResolvedValue([
        { id: "lt1", name: "Annual", default_days: 12 },
      ]);
      mockPrisma.$queryRaw.mockResolvedValue([
        { leave_type_id: "lt1", total: 3 },
      ]);

      const result = await service.getLeaveBalance("u1", "c1");
      expect(result).toHaveLength(1);
      expect(result[0].remaining).toBe(9);
    });
  });

  describe("approveLeave", () => {
    it("should throw when leave not found", async () => {
      mockPrisma.tr_leave_requests.findUnique.mockResolvedValue(null);
      await expect(
        service.approveLeave(
          "u1",
          "c1",
          "l1",
          { action: "approve" } as any,
          "admin",
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("should approve leave", async () => {
      mockPrisma.tr_leave_requests.findUnique.mockResolvedValue({
        id: "l1",
        company_id: "c1",
      });
      mockPrisma.tr_leave_requests.update.mockResolvedValue({
        id: "l1",
        status: "approved",
      });

      const result = await service.approveLeave(
        "u1",
        "c1",
        "l1",
        { action: "approve" } as any,
        "admin",
      );
      expect(result.status).toBe("approved");
    });

    it("should reject leave", async () => {
      mockPrisma.tr_leave_requests.findUnique.mockResolvedValue({
        id: "l1",
        company_id: "c1",
      });
      mockPrisma.tr_leave_requests.update.mockResolvedValue({
        id: "l1",
        status: "rejected",
      });

      const result = await service.approveLeave(
        "u1",
        "c1",
        "l1",
        { action: "reject", rejection_reason: "No reason" } as any,
        "admin",
      );
      expect(result.status).toBe("rejected");
    });
  });

  describe("cancelLeave", () => {
    it("should throw if not pending", async () => {
      mockPrisma.tr_leave_requests.findUnique.mockResolvedValue({
        id: "l1",
        company_id: "c1",
        status: "approved",
      });
      await expect(service.cancelLeave("u1", "c1", "l1")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should cancel pending leave", async () => {
      mockPrisma.tr_leave_requests.findUnique.mockResolvedValue({
        id: "l1",
        company_id: "c1",
        status: "pending",
      });
      mockPrisma.tr_leave_requests.update.mockResolvedValue({
        id: "l1",
        status: "cancelled",
      });

      const result = await service.cancelLeave("u1", "c1", "l1");
      expect(result.status).toBe("cancelled");
    });
  });

  describe("listLeaves", () => {
    it("should return paginated leaves", async () => {
      mockPrisma.tr_leave_requests.findMany.mockResolvedValue([
        { id: "l1", status: "pending" },
      ]);
      mockPrisma.tr_leave_requests.count.mockResolvedValue(1);

      const result = await service.listLeaves("u1", "c1", {
        page: 1,
        limit: 10,
      } as any);
      expect(result.data).toHaveLength(1);
    });
  });

  describe("listSubordinateLeaves", () => {
    it("should return empty when no subordinates", async () => {
      mockPrisma.ms_employees.findMany.mockResolvedValue([]);

      const result = await service.listSubordinateLeaves("u1", "c1", {
        page: 1,
        limit: 10,
      } as any);
      expect(result.data).toHaveLength(0);
    });
  });
});
