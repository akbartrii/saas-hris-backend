import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from './tenant-context.service';
import { createTenantMiddleware } from '../../prisma/prisma.middleware';

@Injectable()
export class TenantMiddlewareSetup implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  onModuleInit() {
    this.prisma.$use(
      createTenantMiddleware(() => this.tenantContext.getCompanyId()),
    );
  }
}
