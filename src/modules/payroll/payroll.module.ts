import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ParameterModule } from '../parameter/parameter.module';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { PdfService } from '../../common/services/pdf.service';
import { EncryptionModule } from '../encryption/encryption.module';

@Module({
  imports: [PrismaModule, ParameterModule, EncryptionModule],
  controllers: [PayrollController],
  providers: [PayrollService, PdfService],
  exports: [PayrollService],
})
export class PayrollModule {}
