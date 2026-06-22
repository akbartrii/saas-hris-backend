import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class KeepAliveService {
  private readonly logger = new Logger(KeepAliveService.name);

  // NOTE: Cron jobs do NOT work on Vercel serverless (functions spin down)
  // For Vercel, use an external ping service (e.g., cron-job.org, UptimeRobot)
  // to hit /api/health every 10 minutes instead.
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleCron() {
    this.logger.log('Keep-alive cron job executed');
  }
}
