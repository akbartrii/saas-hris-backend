import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['warn', 'error'],
    });
  }

  async onModuleInit() {
    let retries = 5;
    while (retries > 0) {
      try {
        const start = Date.now();
        await this.$connect();
        this.logger.log(
          `Prisma connected successfully in ${Date.now() - start}ms`,
        );
        return;
      } catch (error) {
        retries--;
        this.logger.error(
          `Prisma connection failed. Retries left: ${retries}`,
          error.message,
        );
        if (retries === 0) {
          this.logger.error('Prisma connection failed after all retries');
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Prisma disconnected');
  }
}
