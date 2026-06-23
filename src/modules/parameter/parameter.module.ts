import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { ParameterController } from "./parameter.controller";
import { ParameterService } from "./parameter.service";

@Module({
  imports: [PrismaModule],
  controllers: [ParameterController],
  providers: [ParameterService],
  exports: [ParameterService],
})
export class ParameterModule {}
