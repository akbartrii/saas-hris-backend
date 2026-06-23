import {
  CanActivate,
  ExecutionContext,
  Injectable,
  BadRequestException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { PrismaService } from "../../prisma/prisma.service";
import { TenantContextService } from "../services/tenant-context.service";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { SKIP_TENANCY_KEY } from "../decorators/skip-tenancy.decorator";

@Injectable()
export class BaseTenancyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtAuthGuard: JwtAuthGuard,
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const isAuthValid = await this.jwtAuthGuard.canActivate(context);
    if (!isAuthValid) return false;

    const skipTenancy = this.reflector.getAllAndOverride<boolean>(
      SKIP_TENANCY_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipTenancy) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const companyId = request.user.companyId;

    if (!companyId) {
      throw new BadRequestException("Company ID not found in token");
    }

    this.tenantContext.setCompanyId(companyId);

    request.companyId = companyId;
    request.company = await this.prisma.ms_companies.findUnique({
      where: { id: companyId },
    });

    if (request.company && !request.company.is_active) {
      throw new BadRequestException("Company is inactive");
    }

    return true;
  }
}
