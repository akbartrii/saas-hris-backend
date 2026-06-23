import { Module, Global } from "@nestjs/common";
import { EncryptionService } from "./encryption.service";
import { SalaryKeyController } from "./salary-key.controller";
import { PrismaModule } from "../../prisma/prisma.module";

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [SalaryKeyController],
  providers: [EncryptionService],
  exports: [EncryptionService],
})
export class EncryptionModule {}
