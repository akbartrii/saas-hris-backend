import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { SaveFcmTokenDto } from "./dto/save-fcm-token.dto";
import { RevokeFcmTokenDto } from "./dto/revoke-fcm-token.dto";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async login(loginDto: LoginDto) {
    try {
      const { email, password } = loginDto;

      const user = await this.prisma.ms_users.findUnique({
        where: { email },
        include: {
          ms_roles: true,
          ms_employees: {
            include: {
              ms_locations: true,
              tr_remote_work_requests_current_remote_work: true,
              ms_departments_ms_employees_department_idToms_departments: true,
            },
          },
        },
      });

      if (!user) {
        throw new UnauthorizedException("Invalid email or password");
      }

      const isPasswordValid = await bcrypt.compare(
        password,
        user.password_hash,
      );

      if (!isPasswordValid) {
        throw new UnauthorizedException("Invalid email or password");
      }

      const jwtSecret = this.configService.get<string>("JWT_SECRET");
      if (!jwtSecret) {
        throw new InternalServerErrorException("JWT_SECRET not configured");
      }
      const roleId = user.ms_roles?.id || null;
      const roleName = user.ms_roles?.name || "karyawan";

      const permissions = await this.getUserPermissions(roleId, roleName);

      const token = jwt.sign(
        {
          sub: user.id,
          email: user.email,
          role: roleName,
          role_id: roleId,
          employee_id: user.ms_employees?.id || null,
          name: user.full_name,
          company_id: user.company_id,
          company_name: user.full_name,
          department_id: user.ms_employees?.department_id || null,
          position_id: user.ms_employees?.position_id || null,
          manager_id: user.ms_employees?.manager_id || null,
          supervisor_id: user.ms_employees?.supervisor_id || null,
          department_head:
            user.ms_employees
              ?.ms_departments_ms_employees_department_idToms_departments
              ?.head_employee_id || null,
          location_id: user.ms_employees?.location_id || null,
          current_remote_work_id:
            user.ms_employees?.current_remote_work_id || null,
        },
        jwtSecret,
        { expiresIn: "30d" },
      );

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: roleName,
          role_id: roleId,
          employee_id: user.ms_employees?.id || null,
          company_id: user.company_id,
        },
        permissions,
      };
    } catch (error) {
      this.logger.error("Login failed", error.stack);
      throw error;
    }
  }

  async getProfile(userId: string) {
    try {
      const user = await this.prisma.ms_users.findUnique({
        where: { id: userId },
        include: {
          ms_roles: true,
          ms_employees: {
            include: {
              ms_departments_ms_employees_department_idToms_departments: true,
              ms_positions: true,
              ms_locations: true,
              ms_teams: true,
            },
          },
        },
      });

      if (!user) {
        throw new UnauthorizedException("User not found");
      }

      const roleId = user.ms_roles?.id || null;
      const roleName = user.ms_roles?.name || null;
      const permissions = await this.getUserPermissions(roleId, roleName);

      return {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        role: user.ms_roles?.name || "karyawan",
        role_id: roleId,
        employee: user.ms_employees,
        permissions,
      };
    } catch (error) {
      this.logger.error(
        `getProfile failed for user ${userId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  async saveFcmToken(userId: string, dto: SaveFcmTokenDto) {
    const existing = await this.prisma.tr_user_devices.findUnique({
      where: { fcm_token: dto.token },
    });

    if (existing) {
      return this.prisma.tr_user_devices.update({
        where: { fcm_token: dto.token },
        data: { user_id: userId, platform: dto.device_type || null },
      });
    }

    return this.prisma.tr_user_devices.create({
      data: {
        user_id: userId,
        fcm_token: dto.token,
        platform: dto.device_type || null,
      },
    });
  }

  async revokeFcmToken(userId: string, dto: RevokeFcmTokenDto) {
    return this.prisma.tr_user_devices.update({
      where: { fcm_token: dto.token },
      data: { is_active: false },
    });
  }

  async revokeAllFcmTokens(userId: string) {
    return this.prisma.tr_user_devices.updateMany({
      where: { user_id: userId, is_active: true },
      data: { is_active: false },
    });
  }

  async getAllPermissions() {
    const permissions = await this.prisma.ms_permissions.findMany({
      include: {
        menu: { include: { parent: true } },
      },
      orderBy: [{ menu: { sort_order: "asc" } }, { action: "asc" }],
    });

    return this.formatPermissions(permissions);
  }

  async getUserPermissions(roleId: string | null, roleName?: string | null) {
    if (!roleId) return [];

    if (roleName === "super_admin") {
      return this.getAllPermissions();
    }

    const rolePermissions = await this.prisma.ms_role_permissions.findMany({
      where: { role_id: roleId },
      include: {
        permission: {
          include: { menu: { include: { parent: true } } },
        },
      },
    });

    const permissions = rolePermissions.map((rp) => ({
      id: rp.permission.id,
      menu_id: rp.permission.menu_id,
      action: rp.permission.action,
      menu: rp.permission.menu,
    }));

    return this.formatPermissions(permissions);
  }

  private formatPermissions(
    permissions: Array<{
      action: string;
      menu: { code: string; parent: { code: string } | null };
    }>,
  ) {
    const childrenByParent = new Map<string, Map<string, string[]>>();
    const topLevel = new Map<string, string[]>();

    for (const perm of permissions) {
      const menuCode = perm.menu.code;
      const parentCode = perm.menu.parent?.code || null;

      if (parentCode) {
        if (!childrenByParent.has(parentCode)) {
          childrenByParent.set(parentCode, new Map());
        }
        const childGroup = childrenByParent.get(parentCode)!;
        if (!childGroup.has(menuCode)) {
          childGroup.set(menuCode, []);
        }
        if (!childGroup.get(menuCode).includes(perm.action)) {
          childGroup.get(menuCode).push(perm.action);
        }
      } else {
        if (!topLevel.has(menuCode)) {
          topLevel.set(menuCode, []);
        }
        if (!topLevel.get(menuCode).includes(perm.action)) {
          topLevel.get(menuCode).push(perm.action);
        }
      }
    }

    const result: any[] = [];
    const processedParents = new Set<string>();

    for (const [menu, actions] of topLevel) {
      const children = childrenByParent.get(menu);
      if (children && children.size > 0) {
        const submenus = Array.from(children.entries()).map(
          ([code, acts]) => ({
            name: code.replace(`${menu}-`, ""),
            actions: acts,
          }),
        );
        result.push({ menu, submenus });
      } else {
        result.push({ menu, actions });
      }
      processedParents.add(menu);
    }

    for (const [parentCode, children] of childrenByParent) {
      if (!processedParents.has(parentCode)) {
        result.push({
          menu: parentCode,
          submenus: Array.from(children.entries()).map(([code, acts]) => ({
            name: code.replace(`${parentCode}-`, ""),
            actions: acts,
          })),
        });
      }
    }

    return result;
  }

  async getUserPermissionsByUserId(userId: string) {
    const user = await this.prisma.ms_users.findUnique({
      where: { id: userId },
      select: { role_id: true, ms_roles: { select: { name: true } } },
    });

    if (!user) return [];

    return this.getUserPermissions(user.role_id, user.ms_roles?.name);
  }

  async verifyToken(userId: string) {
    const user = await this.prisma.ms_users.findUnique({
      where: { id: userId },
    });
    return {
      message: "Token is valid",
      user: user ? { id: user.id, email: user.email } : null,
    };
  }
}
