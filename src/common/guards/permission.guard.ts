import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../../prisma/prisma.service";
import { PERMISSION_KEY } from "../decorators/permission.decorator";

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<{
      menu: string;
      action: string;
    }>(PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    if (!required) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException("User not authenticated");
    }

    if (!user.role_id) {
      throw new ForbiddenException("User role not found");
    }

    if (user.role === "super_admin") {
      return true;
    }

    const permission = await this.prisma.ms_permissions.findFirst({
      where: {
        menu: { code: required.menu },
        action: required.action,
        role_permissions: {
          some: { role_id: user.role_id },
        },
      },
    });

    if (!permission) {
      throw new ForbiddenException(
        `Access denied: missing ${required.action} permission on ${required.menu}`,
      );
    }

    return true;
  }
}
