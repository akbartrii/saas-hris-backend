import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags, ApiOperation } from "@nestjs/swagger";
import { DashboardService } from "./dashboard.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { CompanyContext } from "../../common/decorators/company-context.decorator";

@ApiTags("Dashboard")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("overview")
  @Roles("atasan", "hrd", "admin", "super_admin", "manager_hrga")
  @ApiOperation({ summary: "Get dashboard overview analytics" })
  async getOverview(
    @CompanyContext("id") companyId: string,
    @CurrentUser("role") role: string,
  ) {
    return this.dashboardService.getOverview(companyId, role);
  }
}
