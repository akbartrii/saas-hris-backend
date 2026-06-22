import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Processor('usage-tracking')
@Injectable()
export class UsageTrackingProcessor extends WorkerHost {
  private readonly logger = new Logger(UsageTrackingProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<{ companyId: string; month: number; year: number }>): Promise<any> {
    this.logger.log(`Processing usage tracking for company ${job.data.companyId}, ${job.data.month}/${job.data.year}`);

    const { companyId, month, year } = job.data;

    const employeeCount = await this.prisma.ms_employees.count({
      where: { company_id: companyId, is_active: true },
    });

    const apiCalls = await this.prisma.tr_audit_logs.count({
      where: {
        company_id: companyId,
        performed_at: {
          gte: new Date(year, month - 1, 1),
          lte: new Date(year, month, 0, 23, 59, 59),
        },
      },
    });

    await this.prisma.ms_usage_tracking.upsert({
      where: { company_id_month_year: { company_id: companyId, month, year } },
      create: {
        company_id: companyId,
        month,
        year,
        employee_count: employeeCount,
        api_calls: apiCalls,
        storage_bytes: 0,
      },
      update: {
        employee_count: employeeCount,
        api_calls: apiCalls,
      },
    });

    this.logger.log(`Usage tracking updated for company ${companyId}: ${employeeCount} employees, ${apiCalls} API calls`);
    return { companyId, month, year, employeeCount, apiCalls };
  }
}
