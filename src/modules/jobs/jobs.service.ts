import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { PayrollGeneratorDto } from "./dto/payroll-generator.dto";
import { ExportDto } from "./dto/export.dto";
import { NotificationFanoutDto } from "./dto/notification-fanout.dto";
import { UsageTrackingDto } from "./dto/usage-tracking.dto";

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectQueue("payroll-generation") private payrollQueue: Queue,
    @InjectQueue("export") private exportQueue: Queue,
    @InjectQueue("notification-fanout") private notificationFanoutQueue: Queue,
    @InjectQueue("usage-tracking") private usageTrackingQueue: Queue,
  ) {}

  async dispatchPayrollGeneration(dto: PayrollGeneratorDto) {
    const job = await this.payrollQueue.add("generate", dto, {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
    });
    this.logger.log(
      `Dispatched payroll generation job ${job.id} for period ${dto.periodId}`,
    );
    return { jobId: job.id };
  }

  async dispatchExport(dto: ExportDto) {
    const job = await this.exportQueue.add("export", dto, {
      attempts: 2,
      backoff: { type: "fixed", delay: 30000 },
    });
    this.logger.log(
      `Dispatched export job ${job.id}: ${dto.type} as ${dto.format}`,
    );
    return { jobId: job.id };
  }

  async dispatchNotificationFanout(dto: NotificationFanoutDto) {
    const job = await this.notificationFanoutQueue.add("fanout", dto, {
      attempts: 2,
      backoff: { type: "fixed", delay: 10000 },
    });
    this.logger.log(
      `Dispatched notification fanout job ${job.id} to ${dto.userIds.length} users`,
    );
    return { jobId: job.id };
  }

  async dispatchUsageTracking(dto: UsageTrackingDto) {
    const job = await this.usageTrackingQueue.add("track", dto, {
      attempts: 2,
      backoff: { type: "fixed", delay: 10000 },
    });
    this.logger.log(
      `Dispatched usage tracking job ${job.id} for company ${dto.companyId}`,
    );
    return { jobId: job.id };
  }

  async getJobStatus(queueName: string, jobId: string) {
    const queues: Record<string, Queue> = {
      "payroll-generation": this.payrollQueue,
      export: this.exportQueue,
      "notification-fanout": this.notificationFanoutQueue,
      "usage-tracking": this.usageTrackingQueue,
    };

    const queue = queues[queueName];
    if (!queue) {
      throw new Error(`Unknown queue: ${queueName}`);
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found in queue ${queueName}`);
    }

    const state = await job.getState();
    return {
      jobId: job.id,
      queue: queueName,
      state,
      progress: job.progress,
      data: job.data,
      result: job.returnvalue,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
    };
  }

  async getQueueStats(queueName: string) {
    const queues: Record<string, Queue> = {
      "payroll-generation": this.payrollQueue,
      export: this.exportQueue,
      "notification-fanout": this.notificationFanoutQueue,
      "usage-tracking": this.usageTrackingQueue,
    };

    const queue = queues[queueName];
    if (!queue) {
      throw new Error(`Unknown queue: ${queueName}`);
    }

    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);

    return { queue: queueName, waiting, active, completed, failed };
  }
}
