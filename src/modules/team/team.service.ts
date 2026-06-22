import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { ListTeamDto } from './dto/list-team.dto';

@Injectable()
export class TeamService {
  constructor(private prisma: PrismaService) {}

  private canManageTeams(role: string): boolean {
    return ['manager_hrga', 'hrd', 'admin', 'super_admin'].includes(role);
  }

  async list(query: ListTeamDto, companyId: string) {
    const where: any = { company_id: companyId };

    if (query.department_id) {
      where.department_id = query.department_id;
    }

    if (query.is_active !== undefined) {
      where.is_active = query.is_active;
    }

    return this.prisma.ms_teams.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        ms_departments: { select: { id: true, name: true } },
      },
    });
  }

  async create(role: string, companyId: string, dto: CreateTeamDto) {
    if (!this.canManageTeams(role)) {
      throw new ForbiddenException(
        'Only manager HRGA, HRD, or admin can manage teams',
      );
    }

    return this.prisma.ms_teams.create({
      data: {
        department_id: dto.department_id,
        name: dto.name,
        code: dto.code || null,
        is_active: dto.is_active !== undefined ? dto.is_active : true,
        company_id: companyId,
      },
    });
  }

  async update(role: string, companyId: string, id: string, dto: UpdateTeamDto) {
    if (!this.canManageTeams(role)) {
      throw new ForbiddenException(
        'Only manager HRGA, HRD, or admin can manage teams',
      );
    }

    const exists = await this.prisma.ms_teams.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Team not found');

    const data: any = {};
    if (dto.department_id !== undefined) data.department_id = dto.department_id;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.code !== undefined) data.code = dto.code;
    if (dto.is_active !== undefined) data.is_active = dto.is_active;

    return this.prisma.ms_teams.update({ where: { id }, data });
  }

  async delete(role: string, companyId: string, id: string) {
    if (!this.canManageTeams(role)) {
      throw new ForbiddenException(
        'Only manager HRGA, HRD, or admin can manage teams',
      );
    }

    const exists = await this.prisma.ms_teams.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Team not found');

    return this.prisma.ms_teams.delete({ where: { id } });
  }
}