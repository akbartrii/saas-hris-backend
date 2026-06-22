import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CronController } from './cron.controller';
import { CronService } from './cron.service';
import { CronGuard } from './cron.guard';
import { AttendanceModule } from '../attendance/attendance.module';
import { PayrollModule } from '../payroll/payroll.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    ConfigModule,
    AttendanceModule,
    PayrollModule,
    PrismaModule,
  ],
  controllers: [CronController],
  providers: [CronService, CronGuard],
})
export class CronModule {}
