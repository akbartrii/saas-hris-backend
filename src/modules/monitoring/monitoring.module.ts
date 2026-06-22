import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { LoggerService } from './logger.service';
import { SentryService } from './sentry.service';
import { HealthController } from './health.controller';

@Global()
@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [HealthController],
  providers: [LoggerService, SentryService],
  exports: [LoggerService, SentryService],
})
export class MonitoringModule {}
