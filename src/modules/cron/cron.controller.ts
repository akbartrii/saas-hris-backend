import { Controller, Post, UseGuards, Logger } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiSecurity } from "@nestjs/swagger";
import { CronGuard } from "./cron.guard";
import { CronService } from "./cron.service";
import { Public } from "../../common/decorators/public.decorator";

@ApiTags("Cron")
@Public()
@ApiSecurity("x-cron-secret")
@UseGuards(CronGuard)
@Controller("cron")
export class CronController {
  private readonly logger = new Logger(CronController.name);

  constructor(private readonly cronService: CronService) {}

  @Post("mark-absent")
  @ApiOperation({
    summary: "Mark absent employees for all active companies (daily)",
  })
  async markAbsent() {
    this.logger.log("Cron: mark-absent triggered");
    return this.cronService.markAbsent();
  }

  @Post("generate-payroll")
  @ApiOperation({
    summary:
      "Generate payroll for all active companies with open periods (monthly)",
  })
  async generatePayroll() {
    this.logger.log("Cron: generate-payroll triggered");
    return this.cronService.generatePayroll();
  }

  @Post("cleanup-notifications")
  @ApiOperation({ summary: "Delete notifications older than 90 days (weekly)" })
  async cleanupNotifications() {
    this.logger.log("Cron: cleanup-notifications triggered");
    return this.cronService.cleanupNotifications();
  }

  @Post("keep-alive")
  @ApiOperation({
    summary: "Keep-alive ping to prevent service spin-down (every 10 min)",
  })
  async keepAlive() {
    this.logger.log("Cron: keep-alive triggered");
    return { status: "ok", timestamp: new Date().toISOString() };
  }
}
