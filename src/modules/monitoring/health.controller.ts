import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Comprehensive health check' })
  async check() {
    const checks: Record<string, { status: string; latency?: number; error?: string }> = {};

    checks.database = await this.checkDatabase();
    checks.supabase = await this.checkSupabase();

    const dbHealthy = checks.database?.status === 'ok';
    const overallStatus = dbHealthy ? 'ok' : 'down';

    const response = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '0.0.1',
      checks,
    };

    if (!dbHealthy) {
      throw new HttpException(response, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return response;
  }

  private async checkDatabase(): Promise<{ status: string; latency?: number; error?: string }> {
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', latency: Date.now() - start };
    } catch (error) {
      return { status: 'error', error: (error as Error).message };
    }
  }

  private async checkSupabase(): Promise<{ status: string; latency?: number; error?: string }> {
    try {
      const supabaseUrl = this.configService.get('SUPABASE_URL');
      if (!supabaseUrl) {
        return { status: 'error', error: 'SUPABASE_URL not configured' };
      }
      const start = Date.now();
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: { apikey: this.configService.get('SUPABASE_ANON_KEY', '') },
        signal: AbortSignal.timeout(5000),
      });
      return {
        status: response.status < 500 ? 'ok' : 'error',
        latency: Date.now() - start,
        error: response.status >= 500 ? `HTTP ${response.status}` : undefined,
      };
    } catch (error) {
      return { status: 'error', error: (error as Error).message };
    }
  }
}
