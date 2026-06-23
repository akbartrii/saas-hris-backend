import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateCompanyDto } from "./dto/create-company.dto";
import { UpdateCompanyDto } from "./dto/update-company.dto";
import { ListCompanyDto } from "./dto/list-company.dto";

@Injectable()
export class CompanyService {
  constructor(private prisma: PrismaService) {}

  private isSuperAdmin(role: string): boolean {
    return role === "super_admin";
  }

  async list(companyId: string, query: ListCompanyDto) {
    const where: any = {};
    if (query.is_active !== undefined) {
      where.is_active = query.is_active;
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { code: { contains: query.search, mode: "insensitive" } },
      ];
    }

    return this.prisma.ms_companies.findMany({
      where,
      orderBy: { name: "asc" },
    });
  }

  async create(userRole: string, companyId: string, dto: CreateCompanyDto) {
    if (!this.isSuperAdmin(userRole)) {
      throw new ForbiddenException("Only super admin can create companies");
    }
    return this.prisma.ms_companies.create({
      data: {
        name: dto.name,
        code: dto.code || null,
        address: dto.address || null,
        phone: dto.phone || null,
        email: dto.email || null,
        npwp: dto.npwp || null,
        is_active: dto.is_active !== undefined ? dto.is_active : true,
      },
    });
  }

  async update(
    userRole: string,
    companyId: string,
    id: string,
    dto: UpdateCompanyDto,
  ) {
    if (!this.isSuperAdmin(userRole)) {
      throw new ForbiddenException("Only super admin can update companies");
    }
    const exists = await this.prisma.ms_companies.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException("Company not found");
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.code !== undefined) data.code = dto.code;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.npwp !== undefined) data.npwp = dto.npwp;
    if (dto.is_active !== undefined) data.is_active = dto.is_active;

    return this.prisma.ms_companies.update({ where: { id }, data });
  }

  async delete(userRole: string, companyId: string, id: string) {
    if (!this.isSuperAdmin(userRole)) {
      throw new ForbiddenException("Only super admin can delete companies");
    }
    const exists = await this.prisma.ms_companies.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException("Company not found");
    }
    return this.prisma.ms_companies.delete({ where: { id } });
  }
}
