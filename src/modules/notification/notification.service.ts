import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ListNotificationDto } from './dto/list-notification.dto';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { FcmService } from '../../common/services/fcm.service';

@Injectable()
export class NotificationService {
  constructor(
    private prisma: PrismaService,
    private fcmService: FcmService,
  ) {}

  private canManageNotifications(role: string): boolean {
    return ['manager_hrga', 'hrd', 'admin', 'super_admin'].includes(role);
  }

  async listNotifications(userId: string, companyId: string, query: ListNotificationDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = { user_id: userId };

    if (query.is_read !== undefined) {
      where.is_read = query.is_read;
    }

    const [data, total] = await Promise.all([
      this.prisma.tr_notifications.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.tr_notifications.count({ where }),
    ]);

    return { data, meta: { page, limit, total } };
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.tr_notifications.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.user_id !== userId) {
      throw new ForbiddenException(
        'You can only mark your own notifications as read',
      );
    }

    const updated = await this.prisma.tr_notifications.update({
      where: { id: notificationId },
      data: {
        is_read: true,
        read_at: new Date(),
      },
    });

    return updated;
  }

  async markAllAsRead(userId: string) {
    await this.prisma.tr_notifications.updateMany({
      where: { user_id: userId, is_read: false },
      data: {
        is_read: true,
        read_at: new Date(),
      },
    });

    return { message: 'All notifications marked as read' };
  }

  async createNotification(
    userId: string,
    companyId: string,
    userRole: string,
    dto: CreateNotificationDto,
  ) {
    if (!this.canManageNotifications(userRole)) {
      throw new ForbiddenException(
        'Only manager HRGA, HRD, or admin can create notifications',
      );
    }

    const notification = await this.prisma.tr_notifications.create({
      data: {
        user_id: dto.user_id,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        reference_type: dto.reference_type,
        reference_id: dto.reference_id,
        company_id: companyId,
      },
    });

    await this.fcmService.sendPushNotification(dto.user_id, dto.title, dto.message);

    return notification;
  }

  async getUnreadCount(userId: string, companyId: string) {
    return this.prisma.tr_notifications.count({
      where: { user_id: userId, is_read: false },
    });
  }

  async createNotificationInternal(
    userId: string,
    companyId: string,
    type: string,
    title: string,
    message: string,
    referenceType: string,
    referenceId: string,
  ) {
    return this.prisma.tr_notifications.create({
      data: {
        user_id: userId,
        company_id: companyId,
        type,
        title,
        message,
        reference_type: referenceType,
        reference_id: referenceId,
      },
    });
  }
}
