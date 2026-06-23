import { Test, TestingModule } from "@nestjs/testing";
import { ParameterService } from "../parameter.service";
import { PrismaService } from "../../../prisma/prisma.service";

describe("ParameterService", () => {
  let service: ParameterService;

  const mockPrisma = {
    ms_parameters: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParameterService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ParameterService>(ParameterService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return all parameters", async () => {
      mockPrisma.ms_parameters.findMany.mockResolvedValue([
        { id: 1, key: "overtime_rate", value: "1.5" },
      ]);

      const result = await service.findAll("c1");

      expect(result).toHaveLength(1);
    });
  });

  describe("getValue", () => {
    it("should return value", async () => {
      mockPrisma.ms_parameters.findUnique.mockResolvedValue({
        id: 1,
        key: "overtime_rate",
        value: "1.5",
      });

      const result = await service.getValue("overtime_rate", "c1");

      expect(result).toBe("1.5");
    });

    it("should return null when not found", async () => {
      mockPrisma.ms_parameters.findUnique.mockResolvedValue(null);

      const result = await service.getValue("nonexistent", "c1");

      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("should create a parameter", async () => {
      mockPrisma.ms_parameters.create.mockResolvedValue({
        id: 1,
        key: "overtime_rate",
        value: "1.5",
      });

      await service.create("overtime_rate", "1.5", "c1");

      expect(mockPrisma.ms_parameters.create).toHaveBeenCalled();
    });
  });
});
