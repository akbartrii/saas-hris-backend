import { Test, TestingModule } from "@nestjs/testing";
import { EncryptionService } from "../encryption.service";
import { PrismaService } from "../../../prisma/prisma.service";

jest.mock("bcryptjs", () => ({
  compare: jest.fn().mockResolvedValue(true),
  hash: jest.fn().mockResolvedValue("$2a$10$hashvalue"),
}));

describe("EncryptionService", () => {
  let service: EncryptionService;

  const mockPrisma = {
    $transaction: jest.fn().mockImplementation((cb) =>
      cb({
        ms_employees: { update: jest.fn() },
      }),
    ),
    ms_salary_keys: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    ms_employees: {
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("isEncrypted", () => {
    it("should return true for encrypted value", () => {
      expect(
        service.isEncrypted(
          "7b6a5c4d3e2f1a0b:abc123def4567890abcdef:abc123def456",
        ),
      ).toBe(true);
    });

    it("should return false for plain text", () => {
      expect(service.isEncrypted("plain-text")).toBe(false);
    });

    it("should return false for null", () => {
      expect(service.isEncrypted(null)).toBe(false);
    });
  });

  describe("validateKeycode", () => {
    it("should return true for valid keycode", async () => {
      mockPrisma.ms_salary_keys.findFirst.mockResolvedValue({
        id: "sk1",
        keycode_hash: "$2a$10$hashvalue",
      });

      const result = await service.validateKeycode("test-keycode", 7, 2026);

      expect(result).toBe(true);
    });

    it("should return false when not found", async () => {
      mockPrisma.ms_salary_keys.findFirst.mockResolvedValue(null);

      const result = await service.validateKeycode("wrong", 7, 2026);

      expect(result).toBe(false);
    });
  });

  describe("generateKeycode", () => {
    it("should create a new salary key", async () => {
      mockPrisma.ms_salary_keys.findUnique.mockResolvedValue(null);
      mockPrisma.ms_salary_keys.findFirst.mockResolvedValue({
        id: "sk1",
        keycode_hash: "$2a$10$hashvalue",
      });
      mockPrisma.ms_salary_keys.create.mockResolvedValue({ id: "sk1" });

      await service.generateKeycode("new-keycode", 7, 2026);

      expect(mockPrisma.ms_salary_keys.create).toHaveBeenCalled();
    });
  });

  describe("encrypt/decrypt", () => {
    it("should round-trip a value", () => {
      const encrypted = service.encrypt(5000000, "test-keycode");
      expect(encrypted).toBeDefined();
      expect(service.decrypt(encrypted, "test-keycode")).toBe("5000000");
    });

    it("should return null for null input", () => {
      expect(service.encrypt(null, "key")).toBeNull();
      expect(service.decrypt(null, "key")).toBeNull();
    });
  });
});
