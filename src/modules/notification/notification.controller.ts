import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { NotificationService } from "./notification.service";
import { ListNotificationDto } from "./dto/list-notification.dto";
import { CreateNotificationDto } from "./dto/create-notification.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { CompanyContext } from "../../common/decorators/company-context.decorator";

@ApiTags("Notification")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("notifications")
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async listNotifications(
    @CurrentUser("userId") userId: string,
    @CompanyContext("id") companyId: string,
    @Query() query: ListNotificationDto,
  ) {
    return this.notificationService.listNotifications(userId, companyId, query);
  }

  @Get("unread-count")
  async getUnreadCount(
    @CurrentUser("userId") userId: string,
    @CompanyContext("id") companyId: string,
  ) {
    return this.notificationService.getUnreadCount(userId, companyId);
  }

  @Patch(":id/read")
  async markAsRead(
    @CurrentUser("userId") userId: string,
    @CompanyContext("id") companyId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.notificationService.markAsRead(userId, id);
  }

  @Patch("read-all")
  async markAllAsRead(
    @CurrentUser("userId") userId: string,
    @CompanyContext("id") companyId: string,
  ) {
    return this.notificationService.markAllAsRead(userId);
  }

  @Post()
  @Roles("manager_hrga", "hrd", "admin", "super_admin")
  async createNotification(
    @CurrentUser("userId") userId: string,
    @CompanyContext("id") companyId: string,
    @CurrentUser("role") role: string,
    @Body() dto: CreateNotificationDto,
  ) {
    return this.notificationService.createNotification(
      userId,
      companyId,
      role,
      dto,
    );
  }
}
