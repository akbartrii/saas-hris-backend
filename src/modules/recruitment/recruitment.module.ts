import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { RecruitmentController } from "./recruitment.controller";
import { RecruitmentService } from "./recruitment.service";

@Module({
  imports: [PrismaModule],
  controllers: [RecruitmentController],
  providers: [RecruitmentService],
})
export class RecruitmentModule {}
