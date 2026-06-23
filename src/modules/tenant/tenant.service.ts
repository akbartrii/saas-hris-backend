import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { RegisterTenantDto } from "./dto/register-tenant.dto";
import { SetupTenantDto } from "./dto/setup-tenant.dto";
import { DEFAULT_ROLES } from "./default-roles";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async register(dto: RegisterTenantDto) {
    const existingUser = await this.prisma.ms_users.findUnique({
      where: { email: dto.admin_email },
    });

    if (existingUser) {
      throw new ConflictException("Email already registered");
    }

    const passwordHash = await bcrypt.hash(dto.admin_password, 12);

    const freePlan = await this.prisma.ms_plans.findUnique({
      where: { code: "free" },
    });

    const allPermissions = await this.prisma.ms_permissions.findMany({
      include: { menu: true },
    });

    const permissionMap = new Map<string, string[]>();
    for (const perm of allPermissions) {
      const key = perm.menu.code;
      if (!permissionMap.has(key)) {
        permissionMap.set(key, []);
      }
      permissionMap.get(key).push(perm.id);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const company = await tx.ms_companies.create({
        data: {
          name: dto.company_name,
          phone: dto.company_phone,
          address: dto.company_address,
          email: dto.admin_email,
          is_active: true,
        },
      });

      const createdRoles: Record<string, string> = {};

      for (const def of DEFAULT_ROLES) {
        let rolePermissionIds: string[] = [];

        if (def.roleName === "admin") {
          rolePermissionIds = allPermissions.map((p) => p.id);
        } else {
          for (const mp of def.permissions) {
            const _menuPerms = permissionMap.get(mp.menu) || [];
            const menuActions = allPermissions.filter(
              (p) => p.menu.code === mp.menu && mp.actions.includes(p.action),
            );
            rolePermissionIds.push(...menuActions.map((p) => p.id));
          }
        }

        const role = await tx.ms_roles.create({
          data: {
            company_id: company.id,
            name: def.roleName,
            display_name: def.displayName,
            is_active: true,
          },
        });

        if (rolePermissionIds.length > 0) {
          await tx.ms_role_permissions.createMany({
            data: rolePermissionIds.map((permission_id) => ({
              role_id: role.id,
              permission_id,
            })),
          });
        }

        createdRoles[def.roleName] = role.id;
      }

      const user = await tx.ms_users.create({
        data: {
          email: dto.admin_email,
          password_hash: passwordHash,
          full_name: "Admin",
          role_id: createdRoles["admin"],
          company_id: company.id,
          is_active: true,
        },
      });

      if (freePlan) {
        await tx.ms_subscriptions.create({
          data: {
            company_id: company.id,
            plan_id: freePlan.id,
            status: "trial",
            trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            starts_at: new Date(),
          },
        });
      }

      return { company, user };
    });

    const jwtSecret = this.configService.get<string>("JWT_SECRET");
    const token = jwt.sign(
      {
        sub: result.user.id,
        email: result.user.email,
        role: "admin",
        company_id: result.company.id,
        name: result.user.full_name,
      },
      jwtSecret,
      { expiresIn: "30d" },
    );

    return {
      token,
      company: {
        id: result.company.id,
        name: result.company.name,
        email: result.company.email,
      },
      user: {
        id: result.user.id,
        email: result.user.email,
        full_name: result.user.full_name,
      },
    };
  }

  async setup(companyId: string, dto: SetupTenantDto) {
    const company = await this.prisma.ms_companies.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new InternalServerErrorException("Company not found");
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.ms_companies.update({
        where: { id: companyId },
        data: {
          phone: dto.phone,
          address: dto.address,
        },
      });

      const departments = [];
      for (const dept of dto.departments) {
        const created = await tx.ms_departments.create({
          data: {
            company_id: companyId,
            name: dept.name,
          },
        });
        departments.push(created);
      }

      const leaveTypes = [];
      for (const lt of dto.leave_types) {
        const created = await tx.ms_leave_types.create({
          data: {
            company_id: companyId,
            name: lt.name,
            default_days: lt.default_days ? parseInt(lt.default_days, 10) : 0,
          },
        });
        leaveTypes.push(created);
      }

      return { departments, leaveTypes };
    });

    return {
      departments_created: result.departments.length,
      leave_types_created: result.leaveTypes.length,
    };
  }

  async getOnboardingStatus(companyId: string) {
    const company = await this.prisma.ms_companies.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new InternalServerErrorException("Company not found");
    }

    const departmentCount = await this.prisma.ms_departments.count({
      where: { company_id: companyId },
    });

    const employeeCount = await this.prisma.ms_employees.count({
      where: { company_id: companyId },
    });

    const leaveTypeCount = await this.prisma.ms_leave_types.count({
      where: { company_id: companyId },
    });

    const subscription = await this.prisma.ms_subscriptions.findFirst({
      where: { company_id: companyId },
      include: { plan: true },
    });

    const steps = {
      company_profile: !!company.phone || !!company.address,
      departments: departmentCount > 0,
      leave_types: leaveTypeCount > 0,
      employees: employeeCount > 0,
    };

    const allCompleted = Object.values(steps).every(Boolean);
    const progress = Object.values(steps).filter(Boolean).length;
    const total = Object.values(steps).length;

    return {
      company: {
        id: company.id,
        name: company.name,
        is_active: company.is_active,
      },
      subscription: subscription
        ? {
            status: subscription.status,
            plan: subscription.plan.name,
            trial_ends_at: subscription.trial_ends_at,
          }
        : null,
      steps,
      progress: `${progress}/${total}`,
      is_completed: allCompleted,
    };
  }
}
