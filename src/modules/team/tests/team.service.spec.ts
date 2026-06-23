import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException } from "@nestjs/common";
import { TeamService } from "../team.service";
import { PrismaService } from "../../../prisma/prisma.service";

describe("TeamService", () => {
  let service: TeamService;
  let _prisma: any;
  const mockPrisma = {
    ms_teams: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    ms_departments: { findUnique: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TeamService>(TeamService);
    _prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("list", () => {
    it("should return paginated teams", async () => {
      mockPrisma.ms_teams.count.mockResolvedValue(1);
      mockPrisma.ms_teams.findMany.mockResolvedValue([
        { id: "t1", name: "Engineering", department_id: "d1" },
      ]);

      const result = await service.list({} as any, "c1");

      expect(result).toHaveLength(1);
      expect(mockPrisma.ms_teams.findMany).toHaveBeenCalled();
    });
  });

  describe("create", () => {
    it("should create a team for admin", async () => {
      mockPrisma.ms_departments.findUnique.mockResolvedValue({
        id: "d1",
        company_id: "c1",
      });
      mockPrisma.ms_teams.create.mockResolvedValue({
        id: "t1",
        name: "Engineering",
        department_id: "d1",
      });

      const result = await service.create("admin", "c1", {
        name: "Engineering",
        department_id: "d1",
      } as any);

      expect(result.name).toBe("Engineering");
    });

    it("should throw ForbiddenException for regular employee", async () => {
      await expect(service.create("karyawan", "c1", {} as any)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("update", () => {
    it("should update a team", async () => {
      mockPrisma.ms_teams.findUnique.mockResolvedValue({
        id: "t1",
        company_id: "c1",
      });
      mockPrisma.ms_teams.update.mockResolvedValue({
        id: "t1",
        name: "Updated Engineering",
      });

      const result = await service.update("admin", "c1", "t1", {
        name: "Updated Engineering",
      } as any);

      expect(result.name).toBe("Updated Engineering");
    });

    it("should throw ForbiddenException for non-admin update", async () => {
      await expect(
        service.update("karyawan", "c1", "t1", {} as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("delete", () => {
    it("should delete a team for superadmin", async () => {
      mockPrisma.ms_teams.findUnique.mockResolvedValue({
        id: "t1",
        company_id: "c1",
      });
      mockPrisma.ms_teams.delete.mockResolvedValue({ id: "t1" });

      const result = await service.delete("super_admin", "c1", "t1");

      expect(result.id).toBe("t1");
    });

    it("should throw ForbiddenException for non-admin delete", async () => {
      await expect(service.delete("karyawan", "c1", "t1")).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
