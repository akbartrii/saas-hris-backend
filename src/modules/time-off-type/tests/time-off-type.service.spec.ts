import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException } from "@nestjs/common";
import { TimeOffTypeService } from "../time-off-type.service";
import { PrismaService } from "../../../prisma/prisma.service";

describe("TimeOffTypeService", () => {
  let service: TimeOffTypeService;
  let _prisma: any;

  const mockPrisma = {
    ms_time_off_types: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimeOffTypeService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TimeOffTypeService>(TimeOffTypeService);
    _prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("list", () => {
    it("should return time-off types", async () => {
      mockPrisma.ms_time_off_types.findMany.mockResolvedValue([
        { id: "t1", name: "Sick Leave" },
      ]);

      const result = await service.list("c1");

      expect(result).toHaveLength(1);
    });
  });

  describe("create", () => {
    it("should create for admin", async () => {
      mockPrisma.ms_time_off_types.create.mockResolvedValue({
        id: "t1",
        name: "Sick Leave",
      });

      const result = await service.create("c1", "admin", {
        name: "Sick Leave",
      } as any);

      expect(result.name).toBe("Sick Leave");
    });

    it("should throw ForbiddenException for non-admin", async () => {
      await expect(service.create("c1", "karyawan", {} as any)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
