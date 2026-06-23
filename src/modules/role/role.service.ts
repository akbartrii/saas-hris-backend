import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { AssignPermissionsDto } from "./dto/assign-permissions.dto";

@Injectable()
export class RoleService {
  constructor(private prisma: PrismaService) {}

  async findAll(company_id: string) {
    return this.prisma.ms_roles.findMany({
      where: { company_id, is_active: true },
      include: {
        _count: { select: { ms_users: true, role_permissions: true } },
      },
      orderBy: { created_at: "asc" },
    });
  }

  async findOne(id: string) {
    const role = await this.prisma.ms_roles.findUnique({
      where: { id },
      include: {
        role_permissions: {
          include: {
            permission: {
              include: { menu: true },
            },
          },
        },
        _count: { select: { ms_users: true } },
      },
    });

    if (!role) {
      throw new NotFoundException("Role not found");
    }

    return role;
  }

  async create(company_id: string, dto: CreateRoleDto) {
    const existing = await this.prisma.ms_roles.findFirst({
      where: { name: dto.name, company_id },
    });

    if (existing) {
      throw new ConflictException("Role name already exists in this company");
    }

    const role = await this.prisma.ms_roles.create({
      data: {
        company_id,
        name: dto.name,
        display_name: dto.display_name,
      },
    });

    if (dto.permission_ids?.length) {
      await this.prisma.ms_role_permissions.createMany({
        data: dto.permission_ids.map((permission_id) => ({
          role_id: role.id,
          permission_id,
        })),
      });
    }

    return this.findOne(role.id);
  }

  async update(id: string, dto: UpdateRoleDto) {
    const role = await this.prisma.ms_roles.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException("Role not found");
    }

    if (dto.name && dto.name !== role.name) {
      const existing = await this.prisma.ms_roles.findFirst({
        where: { name: dto.name, company_id: role.company_id },
      });
      if (existing) {
        throw new ConflictException("Role name already exists in this company");
      }
    }

    await this.prisma.ms_roles.update({
      where: { id },
      data: {
        name: dto.name,
        display_name: dto.display_name,
      },
    });

    if (dto.permission_ids) {
      await this.prisma.ms_role_permissions.deleteMany({
        where: { role_id: id },
      });

      if (dto.permission_ids.length) {
        await this.prisma.ms_role_permissions.createMany({
          data: dto.permission_ids.map((permission_id) => ({
            role_id: id,
            permission_id,
          })),
        });
      }
    }

    return this.findOne(id);
  }

  async assignPermissions(id: string, dto: AssignPermissionsDto) {
    const role = await this.prisma.ms_roles.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException("Role not found");
    }

    await this.prisma.ms_role_permissions.deleteMany({
      where: { role_id: id },
    });

    if (dto.permission_ids.length) {
      await this.prisma.ms_role_permissions.createMany({
        data: dto.permission_ids.map((permission_id) => ({
          role_id: id,
          permission_id,
        })),
      });
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    const role = await this.prisma.ms_roles.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException("Role not found");
    }

    await this.prisma.ms_roles.update({
      where: { id },
      data: { is_active: false },
    });

    return { message: "Role deactivated successfully" };
  }
}
