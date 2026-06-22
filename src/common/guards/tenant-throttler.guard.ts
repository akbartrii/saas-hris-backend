import { Injectable, ExecutionContext, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ThrottlerGuard,
  ThrottlerModuleOptions,
  ThrottlerStorage,
  getOptionsToken,
  getStorageToken,
} from '@nestjs/throttler';
import { PrismaService } from '../../prisma/prisma.service';

const THROTTLER_LIMIT = 'THROTTLER:LIMIT';
const THROTTLER_TTL = 'THROTTLER:TTL';
const THROTTLER_TRACKER = 'THROTTLER:TRACKER';
const THROTTLER_BLOCK_DURATION = 'THROTTLER:BLOCK_DURATION';
const THROTTLER_KEY_GENERATOR = 'THROTTLER:KEY_GENERATOR';
const THROTTLER_SKIP = 'THROTTLER:SKIP';

const PLAN_LIMITS: Record<string, { medium: number; long: number }> = {
  free: { medium: 10, long: 100 },
  starter: { medium: 50, long: 500 },
  professional: { medium: 100, long: 1000 },
  enterprise: { medium: 500, long: 5000 },
};

@Injectable()
export class TenantThrottlerGuard extends ThrottlerGuard {
  constructor(
    @Inject(getOptionsToken()) options: ThrottlerModuleOptions,
    @Inject(getStorageToken()) storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {
    super(options, storageService, reflector);
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    return req.companyId || req.ip || 'anonymous';
  }

  private async resolveLimitValue(context: ExecutionContext, value: number | ((ctx: ExecutionContext) => number | Promise<number>)): Promise<number> {
    return typeof value === 'function' ? (value as (ctx: ExecutionContext) => number | Promise<number>)(context) : value;
  }

  private async resolvePlanLimit(context: ExecutionContext, fallbackLimit: number, throttlerName: string): Promise<number> {
    const req = context.switchToHttp().getRequest();
    const companyId = req.companyId;

    if (!companyId) return fallbackLimit;

    try {
      const subscription = await this.prisma.ms_subscriptions.findFirst({
        where: { company_id: companyId, status: 'active' },
        include: { plan: true },
      });

      if (subscription?.plan) {
        const planLimits = PLAN_LIMITS[subscription.plan.code];
        if (planLimits) {
          const planLimit = planLimits[throttlerName as keyof typeof planLimits];
          if (planLimit) return planLimit;
        }
      }
    } catch {
      return fallbackLimit;
    }

    return fallbackLimit;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const classRef = context.getClass();

    if (await this.shouldSkip(context)) {
      return true;
    }

    const continues: boolean[] = [];

    for (const namedThrottler of this.throttlers) {
      const name = namedThrottler.name || 'default';
      const skip = this.reflector.getAllAndOverride(THROTTLER_SKIP + name, [handler, classRef]);
      const skipIf = namedThrottler.skipIf || this.commonOptions.skipIf;

      if (skip || skipIf?.(context)) {
        continues.push(true);
        continue;
      }

      const routeOrClassLimit = this.reflector.getAllAndOverride(THROTTLER_LIMIT + name, [handler, classRef]);
      const routeOrClassTtl = this.reflector.getAllAndOverride(THROTTLER_TTL + name, [handler, classRef]);
      const routeOrClassBlockDuration = this.reflector.getAllAndOverride(THROTTLER_BLOCK_DURATION + name, [handler, classRef]);
      const routeOrClassGetTracker = this.reflector.getAllAndOverride(THROTTLER_TRACKER + name, [handler, classRef]);
      const routeOrClassGetKeyGenerator = this.reflector.getAllAndOverride(THROTTLER_KEY_GENERATOR + name, [handler, classRef]);

      let limit = await this.resolveLimitValue(context, routeOrClassLimit || namedThrottler.limit);
      const ttl = await this.resolveLimitValue(context, routeOrClassTtl || namedThrottler.ttl);
      const blockDuration = await this.resolveLimitValue(context, routeOrClassBlockDuration || namedThrottler.blockDuration || ttl);
      const getTracker = routeOrClassGetTracker || namedThrottler.getTracker || this.commonOptions.getTracker;
      const generateKey = routeOrClassGetKeyGenerator || namedThrottler.generateKey || this.commonOptions.generateKey;

      limit = await this.resolvePlanLimit(context, limit, name);

      continues.push(await this.handleRequest({
        context,
        limit,
        ttl,
        throttler: namedThrottler,
        blockDuration,
        getTracker,
        generateKey,
      }));
    }

    return continues.every(cont => cont);
  }
}
