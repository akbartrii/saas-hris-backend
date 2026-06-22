import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { EncryptionModule } from './modules/encryption/encryption.module';
import { AuthModule } from './modules/auth/auth.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { LeaveModule } from './modules/leave/leave.module';
import { TimeOffModule } from './modules/time-off/time-off.module';
import { OvertimeModule } from './modules/overtime/overtime.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { RecruitmentModule } from './modules/recruitment/recruitment.module';
import { EmployeeModule } from './modules/employee/employee.module';
import { NotificationModule } from './modules/notification/notification.module';
import { ReportModule } from './modules/report/report.module';
import { HolidayCalendarModule } from './modules/holiday-calendar/holiday-calendar.module';
import { LeaveTypeModule } from './modules/leave-type/leave-type.module';
import { TimeOffTypeModule } from './modules/time-off-type/time-off-type.module';
import { WorkScheduleModule } from './modules/work-schedule/work-schedule.module';
import { OvertimeMealAllowanceModule } from './modules/overtime-meal-allowance/overtime-meal-allowance.module';
import { LocationModule } from './modules/location/location.module';
import { CompanyModule } from './modules/company/company.module';
import { RemoteWorkModule } from './modules/remote-work/remote-work.module';
import { OvernightModule } from './modules/overnight/overnight.module';
import { ReimbursementModule } from './modules/reimbursement/reimbursement.module';
import { ParameterModule } from './modules/parameter/parameter.module';
import { FaceRegistrationModule } from './modules/face-registration/face-registration.module';
import { TeamModule } from './modules/team/team.module';
import { KeepAliveService } from './common/services/keep-alive.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
    PrismaModule,
    EncryptionModule,
    AuthModule,
    AttendanceModule,
    LeaveModule,
    TimeOffModule,
    OvertimeModule,
    PayrollModule,
    RecruitmentModule,
    EmployeeModule,
    NotificationModule,
    ReportModule,
    HolidayCalendarModule,
    LeaveTypeModule,
    TimeOffTypeModule,
    WorkScheduleModule,
    OvertimeMealAllowanceModule,
    LocationModule,
    CompanyModule,
    RemoteWorkModule,
    OvernightModule,
    ReimbursementModule,
    ParameterModule,
    FaceRegistrationModule,
    TeamModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    KeepAliveService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
