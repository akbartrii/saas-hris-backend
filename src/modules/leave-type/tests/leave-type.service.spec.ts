import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException } from "@nestjs/common";
import { LeaveTypeService } from "../leave-type.service";
import { PrismaService } from "../../../prisma/prisma.service";

describe("LeaveTypeService", () => {
  let service: LeaveTypeService;
  let _prisma: any;
  const mockPrisma = {
    ms_leave_types: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaveTypeService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<LeaveTypeService>(LeaveTypeService);
    _prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("list", () => {
    it("should return leave types", async () => {
      mockPrisma.ms_leave_types.findMany.mockResolvedValue([
        { id: "lt1", name: "Annual Leave" },
      ]);

      const result = await service.list("c1");

      expect(result).toHaveLength(1);
    });
  });

  describe("create", () => {
    it("should create for admin", async () => {
      mockPrisma.ms_leave_types.create.mockResolvedValue({
        id: "lt1",
        name: "Annual Leave",
      });

      const result = await service.create("c1", "admin", {
        name: "Annual Leave",
      } as any);

      expect(result.name).toBe("Annual Leave");
    });

    it("should throw ForbiddenException for non-admin", async () => {
      await expect(service.create("c1", "karyawan", {} as any)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("update", () => {
    it("should update a leave type", async () => {
      mockPrisma.ms_leave_types.findUnique.mockResolvedValue({
        id: "lt1",
        company_id: "c1",
      });
      mockPrisma.ms_leave_types.update.mockResolvedValue({
        id: "lt1",
        name: "Updated Leave",
      });

      const result = await service.update("c1", "admin", "lt1", {
        name: "Updated Leave",
      } as any);

      expect(result.name).toBe("Updated Leave");
    });
  });
});
