import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { NotificationController } from "./notification.controller";
import { NotificationService } from "./notification.service";
import { FcmService } from "../../common/services/fcm.service";
import { NotificationListener } from "./listeners/notification.listener";

@Module({
  imports: [PrismaModule],
  controllers: [NotificationController],
  providers: [NotificationService, FcmService, NotificationListener],
  exports: [NotificationService, FcmService],
})
export class NotificationModule {}
