import { Controller, Post, Get, Body } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { TenantService } from "./tenant.service";
import { RegisterTenantDto } from "./dto/register-tenant.dto";
import { SetupTenantDto } from "./dto/setup-tenant.dto";
import { Public } from "../../common/decorators/public.decorator";
import { CompanyContext } from "../../common/decorators/company-context.decorator";

@ApiTags("Tenants")
@Controller("tenants")
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post("register")
  @Public()
  @ApiOperation({ summary: "Register a new company (tenant)" })
  @ApiResponse({ status: 201, description: "Company registered successfully" })
  @ApiResponse({ status: 409, description: "Email already registered" })
  async register(@Body() dto: RegisterTenantDto) {
    return this.tenantService.register(dto);
  }

  @Post("setup")
  @ApiOperation({ summary: "Complete initial company setup" })
  @ApiResponse({ status: 200, description: "Setup completed successfully" })
  async setup(
    @Body() dto: SetupTenantDto,
    @CompanyContext("id") companyId: string,
  ) {
    return this.tenantService.setup(companyId, dto);
  }

  @Get("onboarding-status")
  @ApiOperation({ summary: "Get company onboarding progress" })
  @ApiResponse({ status: 200, description: "Onboarding status retrieved" })
  async getOnboardingStatus(@CompanyContext("id") companyId: string) {
    return this.tenantService.getOnboardingStatus(companyId);
  }
}
