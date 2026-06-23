import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { ParameterModule } from "../parameter/parameter.module";
import { OvertimeController } from "./overtime.controller";
import { OvertimeService } from "./overtime.service";
import { EncryptionModule } from "../encryption/encryption.module";

@Module({
  imports: [PrismaModule, ParameterModule, EncryptionModule],
  controllers: [OvertimeController],
  providers: [OvertimeService],
})
export class OvertimeModule {}
