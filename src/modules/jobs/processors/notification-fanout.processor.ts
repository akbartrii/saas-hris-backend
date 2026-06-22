import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { FcmService } from '../../../common/services/fcm.service';

@Processor('notification-fanout')
@Injectable()
export class NotificationFanoutProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationFanoutProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fcmService: FcmService,
  ) {
    super();
  }

  async process(job: Job<{
    companyId: string;
    userIds: string[];
    type: string;
    title: string;
    message: string;
    referenceType?: string;
    referenceId?: string;
  }>): Promise<any> {
    this.logger.log(`Processing notification fanout job ${job.id} to ${job.data.userIds.length} users`);

    const { companyId, userIds, type, title, message, referenceType, referenceId } = job.data;

    const notifications = userIds.map((userId) => ({
      user_id: userId,
      company_id: companyId,
      type,
      title,
      message,
      reference_type: referenceType || null,
      reference_id: referenceId || null,
    }));

    await this.prisma.tr_notifications.createMany({ data: notifications });

    for (const userId of userIds) {
      try {
        await this.fcmService.sendPushNotification(userId, title, message);
      } catch (error) {
        this.logger.warn(`Failed to send push notification to user ${userId}: ${(error as Error).message}`);
      }
    }

    this.logger.log(`Successfully sent ${userIds.length} notifications`);
    return { sent: userIds.length };
  }
}
