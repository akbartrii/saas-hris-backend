import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException } from "@nestjs/common";
import { NotificationService } from "../notification.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { FcmService } from "../../../common/services/fcm.service";

describe("NotificationService", () => {
  let service: NotificationService;
  let _prisma: any;

  const mockPrisma = {
    tr_notifications: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const mockFcmService = {
    sendPushNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FcmService, useValue: mockFcmService },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    _prisma = module.get(PrismaService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("listNotifications", () => {
    it("should return paginated notifications", async () => {
      mockPrisma.tr_notifications.findMany.mockResolvedValue([
        { id: "n1", title: "Test" },
      ]);
      mockPrisma.tr_notifications.count.mockResolvedValue(1);

      const result = await service.listNotifications("u1", "c1", {
        page: 1,
        limit: 10,
      } as any);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe("markAsRead", () => {
    it("should throw ForbiddenException when not owner", async () => {
      mockPrisma.tr_notifications.findUnique.mockResolvedValue({
        id: "n1",
        user_id: "other-user",
      });

      await expect(service.markAsRead("u1", "n1")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should mark notification as read", async () => {
      mockPrisma.tr_notifications.findUnique.mockResolvedValue({
        id: "n1",
        user_id: "u1",
      });
      mockPrisma.tr_notifications.update.mockResolvedValue({
        id: "n1",
        is_read: true,
      });

      const result = await service.markAsRead("u1", "n1");
      expect(result.is_read).toBe(true);
    });
  });

  describe("markAllAsRead", () => {
    it("should mark all notifications as read", async () => {
      mockPrisma.tr_notifications.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.markAllAsRead("u1");
      expect(result.message).toBe("All notifications marked as read");
    });
  });

  describe("getUnreadCount", () => {
    it("should return unread count", async () => {
      mockPrisma.tr_notifications.count.mockResolvedValue(5);

      const result = await service.getUnreadCount("u1", "c1");
      expect(result).toBe(5);
    });
  });

  describe("createNotification", () => {
    const dto = {
      user_id: "u2",
      type: "info",
      title: "Test",
      message: "Hello",
    };

    it("should throw ForbiddenException for non-admin", async () => {
      await expect(
        service.createNotification("u1", "c1", "karyawan", dto as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should create notification and send push", async () => {
      mockPrisma.tr_notifications.create.mockResolvedValue({
        id: "n1",
        ...dto,
      });
      mockFcmService.sendPushNotification.mockResolvedValue(undefined);

      const result = await service.createNotification(
        "u1",
        "c1",
        "admin",
        dto as any,
      );
      expect(result).toBeDefined();
      expect(mockFcmService.sendPushNotification).toHaveBeenCalledWith(
        "u2",
        "Test",
        "Hello",
      );
    });
  });

  describe("createNotificationInternal", () => {
    it("should create notification without push", async () => {
      mockPrisma.tr_notifications.create.mockResolvedValue({ id: "n1" });

      const result = await service.createNotificationInternal(
        "u1",
        "c1",
        "info",
        "Title",
        "Msg",
        "leave",
        "l1",
      );
      expect(result).toBeDefined();
    });
  });
});
