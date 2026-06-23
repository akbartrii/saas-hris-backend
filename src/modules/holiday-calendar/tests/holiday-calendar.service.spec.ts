import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException } from "@nestjs/common";
import { HolidayCalendarService } from "../holiday-calendar.service";
import { PrismaService } from "../../../prisma/prisma.service";

describe("HolidayCalendarService", () => {
  let service: HolidayCalendarService;
  let _prisma: any;
  const mockPrisma = {
    ms_holiday_calendars: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    ms_employees: { findUnique: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HolidayCalendarService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<HolidayCalendarService>(HolidayCalendarService);
    _prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("list", () => {
    it("should return holidays list", async () => {
      mockPrisma.ms_employees.findUnique.mockResolvedValue({
        id: "e1",
        company_id: "c1",
      });
      mockPrisma.ms_holiday_calendars.findMany.mockResolvedValue([
        { id: "h1", name: "New Year" },
      ]);

      const result = await service.list("u1", "c1", "karyawan", {} as any);

      expect(result).toHaveLength(1);
    });
  });

  describe("create", () => {
    it("should create a holiday for admin", async () => {
      mockPrisma.ms_holiday_calendars.findFirst.mockResolvedValue(null);
      mockPrisma.ms_holiday_calendars.create.mockResolvedValue({
        id: "h1",
        name: "Independence Day",
      });

      const result = await service.create("u1", "c1", "admin", {
        name: "Independence Day",
      } as any);

      expect(result.name).toBe("Independence Day");
    });

    it("should throw ForbiddenException for non-admin", async () => {
      await expect(
        service.create("u1", "c1", "karyawan", {} as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("delete", () => {
    it("should delete a holiday for admin", async () => {
      mockPrisma.ms_holiday_calendars.findUnique.mockResolvedValue({
        id: "h1",
        company_id: "c1",
      });
      mockPrisma.ms_holiday_calendars.delete.mockResolvedValue({ id: "h1" });

      const result = await service.delete("u1", "c1", "admin", "h1");

      expect(result.id).toBe("h1");
    });

    it("should throw ForbiddenException for non-admin", async () => {
      await expect(
        service.delete("u1", "c1", "karyawan", "h1"),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
