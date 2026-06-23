import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { OvertimeMealAllowanceController } from "./overtime-meal-allowance.controller";
import { OvertimeMealAllowanceService } from "./overtime-meal-allowance.service";

@Module({
  imports: [PrismaModule],
  controllers: [OvertimeMealAllowanceController],
  providers: [OvertimeMealAllowanceService],
})
export class OvertimeMealAllowanceModule {}
