import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export enum CacheNamespace {
  LEAVE_TYPES = 'leave_types',
  PARAMETERS = 'parameters',
  SCHEDULES = 'schedules',
  LOCATIONS = 'locations',
  COMPANY_PROFILE = 'company_profile',
}

const TTL_CONFIG: Record<CacheNamespace, number> = {
  [CacheNamespace.LEAVE_TYPES]: 3600,
  [CacheNamespace.PARAMETERS]: 3600,
  [CacheNamespace.SCHEDULES]: 1800,
  [CacheNamespace.LOCATIONS]: 3600,
  [CacheNamespace.COMPANY_PROFILE]: 300,
};

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly redis: Redis;
  private readonly prefix = 'hris:cache:';

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get('REDIS_HOST', 'localhost');
    const port = Number(this.configService.get('REDIS_PORT', 6379));
    const password = this.configService.get('REDIS_PASSWORD') || undefined;

    const db = Number(this.configService.get('REDIS_DB', 4));
    this.redis = new Redis({ host, port, password, db, lazyConnect: true });

    this.redis.on('error', (err) => {
      this.logger.warn(`Redis connection error (cache degraded): ${err.message}`);
    });
  }

  async onModuleDestroy() {
    try {
      await this.redis.quit();
    } catch {
      this.redis.disconnect();
    }
  }

  private buildKey(namespace: CacheNamespace, ...parts: string[]): string {
    return `${this.prefix}${namespace}:${parts.join(':')}`;
  }

  private getTtl(namespace: CacheNamespace): number {
    return TTL_CONFIG[namespace] ?? 300;
  }

  async get<T>(namespace: CacheNamespace, ...keys: string[]): Promise<T | null> {
    try {
      const raw = await this.redis.get(this.buildKey(namespace, ...keys));
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch (error) {
      this.logger.warn(`Cache get error: ${(error as Error).message}`);
      return null;
    }
  }

  async set<T>(namespace: CacheNamespace, value: T, ...keys: string[]): Promise<void> {
    try {
      const ttl = this.getTtl(namespace);
      await this.redis.setex(this.buildKey(namespace, ...keys), ttl, JSON.stringify(value));
    } catch (error) {
      this.logger.warn(`Cache set error: ${(error as Error).message}`);
    }
  }

  async invalidate(namespace: CacheNamespace, ...keys: string[]): Promise<void> {
    try {
      if (keys.length > 0) {
        await this.redis.del(this.buildKey(namespace, ...keys));
      }
    } catch (error) {
      this.logger.warn(`Cache invalidate error: ${(error as Error).message}`);
    }
  }

  async invalidateNamespace(namespace: CacheNamespace): Promise<void> {
    try {
      const pattern = `${this.prefix}${namespace}:*`;
      const stream = this.redis.scanStream({ match: pattern, count: 100 });
      const pipeline = this.redis.pipeline();

      stream.on('data', (keys: string[]) => {
        for (const key of keys) {
          pipeline.del(key);
        }
      });

      await new Promise<void>((resolve, reject) => {
        stream.on('end', () => resolve());
        stream.on('error', (err) => reject(err));
      });

      await pipeline.exec();
    } catch (error) {
      this.logger.warn(`Cache namespace invalidate error: ${(error as Error).message}`);
    }
  }

  async wrap<T>(
    namespace: CacheNamespace,
    factory: () => Promise<T>,
    ...keys: string[]
  ): Promise<T> {
    const cached = await this.get<T>(namespace, ...keys);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(namespace, value, ...keys);
    return value;
  }
}
