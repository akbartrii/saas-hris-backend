import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';

@Injectable()
export class UserManagementService {
  constructor(private prisma: PrismaService) {}

  async findAll(company_id: string, query: UserQueryDto) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '10', 10);
    const skip = (page - 1) * limit;

    const where: any = { company_id };

    if (query.search) {
      where.OR = [
        { full_name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { employee_id: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.role_id) {
      where.role_id = query.role_id;
    }

    if (query.is_active !== undefined) {
      where.is_active = query.is_active === 'true';
    }

    const [data, total] = await Promise.all([
      this.prisma.ms_users.findMany({
        where,
        skip,
        take: limit,
        include: {
          ms_roles: { select: { id: true, name: true, display_name: true } },
          ms_employees: {
            select: { id: true, full_name: true },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.ms_users.count({ where }),
    ]);

    return {
      data: data.map((user) => {
        const { password_hash, ms_employees, ms_roles, ...rest } = user;
        return {
          ...rest,
          employee: ms_employees,
          role: ms_roles,
        };
      }),
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.ms_users.findUnique({
      where: { id },
      include: {
        ms_roles: { select: { id: true, name: true, display_name: true } },
        ms_employees: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password_hash, ms_roles, ms_employees, ...rest } = user;
    return { ...rest, role: ms_roles, employee: ms_employees };
  }

  async create(company_id: string, dto: CreateUserDto) {
    const existing = await this.prisma.ms_users.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const role = await this.prisma.ms_roles.findUnique({
      where: { id: dto.role_id },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const password_hash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.ms_users.create({
      data: {
        company_id,
        email: dto.email,
        full_name: dto.full_name,
        password_hash,
        role_id: dto.role_id,
        employee_id: dto.employee_id,
        phone: dto.phone,
      },
    });

    return this.findOne(user.id);
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.ms_users.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.email && dto.email !== user.email) {
      const existing = await this.prisma.ms_users.findUnique({
        where: { email: dto.email },
      });
      if (existing) {
        throw new ConflictException('Email already registered');
      }
    }

    if (dto.role_id) {
      const role = await this.prisma.ms_roles.findUnique({
        where: { id: dto.role_id },
      });
      if (!role) {
        throw new NotFoundException('Role not found');
      }
    }

    await this.prisma.ms_users.update({
      where: { id },
      data: {
        email: dto.email,
        full_name: dto.full_name,
        role_id: dto.role_id,
        employee_id: dto.employee_id,
        phone: dto.phone,
      },
    });

    return this.findOne(id);
  }

  async remove(id: string) {
    const user = await this.prisma.ms_users.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.ms_users.update({
      where: { id },
      data: { is_active: false },
    });

    return { message: 'User deactivated successfully' };
  }

  async activate(id: string) {
    const user = await this.prisma.ms_users.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.ms_users.update({
      where: { id },
      data: { is_active: true },
    });

    return this.findOne(id);
  }
}
