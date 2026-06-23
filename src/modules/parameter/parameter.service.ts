import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class ParameterService {
  private cache = new Map<string, { value: string | null; expiry: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string) {
    return this.prisma.ms_parameters.findMany({
      where: { company_id: companyId },
      orderBy: { key: "asc" },
    });
  }

  async findOne(key: string, companyId: string) {
    return this.prisma.ms_parameters.findUnique({
      where: { company_id_key: { company_id: companyId, key } },
    });
  }

  async getValue(key: string, companyId: string): Promise<string | null> {
    const now = Date.now();
    const cached = this.cache.get(key);

    if (cached && cached.expiry > now) {
      return cached.value;
    }

    const param = await this.prisma.ms_parameters.findUnique({
      where: { company_id_key: { company_id: companyId, key } },
    });

    const value = param?.value ?? null;
    this.cache.set(key, {
      value,
      expiry: now + this.CACHE_TTL,
    });

    return value;
  }

  async getNumber(
    key: string,
    companyId: string,
    defaultValue: number = 0,
  ): Promise<number> {
    const val = await this.getValue(key, companyId);
    return val ? Number(val) : defaultValue;
  }

  async create(key: string, value: string, companyId: string) {
    const res = await this.prisma.ms_parameters.create({
      data: { key, value, company_id: companyId },
    });
    this.cache.delete(key);
    return res;
  }

  async update(key: string, value: string, companyId: string) {
    const res = await this.prisma.ms_parameters.update({
      where: { company_id_key: { company_id: companyId, key } },
      data: { value, company_id: companyId },
    });
    this.cache.delete(key);
    return res;
  }

  async remove(key: string, companyId: string) {
    const res = await this.prisma.ms_parameters.delete({
      where: { company_id_key: { company_id: companyId, key } },
    });
    this.cache.delete(key);
    return res;
  }
}
