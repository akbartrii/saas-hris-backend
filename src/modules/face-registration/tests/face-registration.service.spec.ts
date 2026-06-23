import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { FaceRegistrationService } from "../face-registration.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { SupabaseStorageService } from "../../../common/services/supabase-storage.service";

describe("FaceRegistrationService", () => {
  let service: FaceRegistrationService;
  let _prisma: any;

  const mockPrisma = {
    ms_users: { findUnique: jest.fn() },
    ms_employees: { findUnique: jest.fn(), update: jest.fn() },
    ms_face_registrations: {
      findUnique: jest.fn(),
      upsert: jest.fn().mockResolvedValue({ id: "f1" }),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockStorageService = {
    uploadFile: jest.fn().mockResolvedValue("https://storage.url/photo.jpg"),
    deleteFile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FaceRegistrationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SupabaseStorageService, useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<FaceRegistrationService>(FaceRegistrationService);
    _prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getStatus", () => {
    it("should return not_registered status", async () => {
      mockPrisma.ms_users.findUnique.mockResolvedValue({
        id: "u1",
        ms_employees: {
          id: "e1",
          company_id: "c1",
          face_registration_status: "not_registered",
        },
      });
      mockPrisma.ms_face_registrations.findUnique.mockResolvedValue(null);

      const result = await service.getStatus("u1", "c1");

      expect(result.status).toBe("not_registered");
    });

    it("should return registered status", async () => {
      mockPrisma.ms_users.findUnique.mockResolvedValue({
        id: "u1",
        ms_employees: {
          id: "e1",
          company_id: "c1",
          face_registration_status: "registered",
        },
      });
      mockPrisma.ms_face_registrations.findUnique.mockResolvedValue({
        id: "f1",
        employee_id: "e1",
        front_photo_url: "url",
      });

      const result = await service.getStatus("u1", "c1");

      expect(result.status).toBe("registered");
    });
  });

  describe("register", () => {
    it("should throw when employee not found", async () => {
      mockPrisma.ms_users.findUnique.mockResolvedValue(null);

      const files = {
        front_photo: {} as any,
        smile_photo: {} as any,
        right_photo: {} as any,
        left_photo: {} as any,
      };

      await expect(service.register("u1", "c1", files)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should register face successfully", async () => {
      const mockFile = {
        buffer: Buffer.from("test"),
        mimetype: "image/jpeg",
        originalname: "photo.jpg",
      } as any;
      mockPrisma.ms_users.findUnique.mockResolvedValue({
        id: "u1",
        ms_employees: { id: "e1", company_id: "c1" },
      });
      mockPrisma.ms_face_registrations.findUnique.mockResolvedValue(null);
      mockPrisma.ms_employees.update.mockResolvedValue({
        id: "e1",
        face_registration_status: "registered",
      });

      const files = {
        front_photo: mockFile,
        smile_photo: mockFile,
        right_photo: mockFile,
        left_photo: mockFile,
      };

      const result = await service.register("u1", "c1", files);

      expect(result.status).toBe("registered");
    });
  });
});
