import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { JobsService } from './jobs.service';
import { PayrollGeneratorProcessor } from './processors/payroll-generator.processor';
import { ExportProcessor } from './processors/export.processor';
import { NotificationFanoutProcessor } from './processors/notification-fanout.processor';
import { UsageTrackingProcessor } from './processors/usage-tracking.processor';
import { FcmService } from '../../common/services/fcm.service';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: Number(configService.get('REDIS_PORT', 6379)),
          password: configService.get('REDIS_PASSWORD') || undefined,
          db: Number(configService.get('REDIS_DB', 4)),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: { age: 86400, count: 1000 },
          removeOnFail: { age: 604800, count: 5000 },
        },
      }),
    }),
    BullModule.registerQueue(
      { name: 'payroll-generation' },
      { name: 'export' },
      { name: 'notification-fanout' },
      { name: 'usage-tracking' },
    ),
    PrismaModule,
  ],
  providers: [
    JobsService,
    PayrollGeneratorProcessor,
    ExportProcessor,
    NotificationFanoutProcessor,
    UsageTrackingProcessor,
    FcmService,
  ],
  exports: [JobsService],
})
export class JobsModule {}
