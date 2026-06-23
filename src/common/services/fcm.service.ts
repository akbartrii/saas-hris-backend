import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { firebaseAdmin } from "./firebase-admin.service";

@Injectable()
export class FcmService {
  private readonly logger = new Logger(FcmService.name);
  private readonly isFirebaseReady = firebaseAdmin.apps.length > 0;

  constructor(private prisma: PrismaService) {}

  async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ) {
    const devices = await this.prisma.tr_user_devices.findMany({
      where: {
        user_id: userId,
        is_active: true,
      },
    });

    if (devices.length === 0) {
      this.logger.warn(`No active FCM devices found for user ${userId}`);
      return;
    }

    for (const device of devices) {
      if (this.isFirebaseReady) {
        try {
          await firebaseAdmin.messaging().send({
            token: device.fcm_token,
            notification: { title, body },
            data,
          });
          this.logger.log(
            `[FCM] Sent to user ${userId} (device ${device.platform || "unknown"}): ${title}`,
          );
        } catch (error: any) {
          if (
            error.code === "messaging/registration-token-not-registered" ||
            error.code === "messaging/invalid-registration-token"
          ) {
            this.logger.warn(
              `FCM token invalid for device ${device.id}, deactivating...`,
            );
            await this.prisma.tr_user_devices.update({
              where: { id: device.id },
              data: { is_active: false },
            });
          } else {
            this.logger.error(
              `Failed to send FCM to device ${device.id}:`,
              error.message,
            );
          }
        }
      } else {
        this.logger.log(
          `[FCM Stub] To user ${userId} (device ${device.platform || "unknown"}): ${title} — ${body}${data ? " | data: " + JSON.stringify(data) : ""}`,
        );
      }
    }
  }
}
