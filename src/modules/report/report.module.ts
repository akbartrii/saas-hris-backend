import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { ReportController } from "./report.controller";
import { ReportService } from "./report.service";
import { PdfService } from "../../common/services/pdf.service";

@Module({
  imports: [PrismaModule],
  controllers: [ReportController],
  providers: [ReportService, PdfService],
})
export class ReportModule {}
