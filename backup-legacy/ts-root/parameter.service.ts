import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ParameterService {
  private cache = new Map<string, { value: string | null; expiry: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.ms_parameters.findMany({
      orderBy: { key: 'asc' },
    });
  }

  async findOne(key: string) {
    return this.prisma.ms_parameters.findUnique({
      where: { key },
    });
  }

  async getValue(key: string): Promise<string | null> {
    const now = Date.now();
    const cached = this.cache.get(key);

    if (cached && cached.expiry > now) {
      return cached.value;
    }

    const param = await this.prisma.ms_parameters.findUnique({
      where: { key },
    });

    const value = param?.value ?? null;
    this.cache.set(key, {
      value,
      expiry: now + this.CACHE_TTL,
    });

    return value;
  }

  async getNumber(key: string, defaultValue: number = 0): Promise<number> {
    const val = await this.getValue(key);
    return val ? Number(val) : defaultValue;
  }

  async create(key: string, value: string) {
    const res = await this.prisma.ms_parameters.create({
      data: { key, value },
    });
    this.cache.delete(key);
    return res;
  }

  async update(key: string, value: string) {
    const res = await this.prisma.ms_parameters.update({
      where: { key },
      data: { value },
    });
    this.cache.delete(key);
    return res;
  }

  async remove(key: string) {
    const res = await this.prisma.ms_parameters.delete({
      where: { key },
    });
    this.cache.delete(key);
    return res;
  }
}
