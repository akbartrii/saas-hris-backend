import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { TimeOffService } from "./time-off.service";
import { TimeOffController } from "./time-off.controller";

@Module({
  imports: [PrismaModule],
  controllers: [TimeOffController],
  providers: [TimeOffService],
})
export class TimeOffModule {}
