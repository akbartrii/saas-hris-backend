import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BaseTenancyGuard } from './common/guards/base-tenancy.guard';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { TenantThrottlerGuard } from './common/guards/tenant-throttler.guard';
import { TenantContextService } from './common/services/tenant-context.service';
import { TenantContextMiddleware } from './common/middleware/tenant-context.middleware';
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
import { TenantModule } from './modules/tenant/tenant.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { CacheModule } from './modules/cache/cache.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { CronModule } from './modules/cron/cron.module';
import { RoleModule } from './modules/role/role.module';
import { UserManagementModule } from './modules/user-management/user-management.module';
import { KeepAliveService } from './common/services/keep-alive.service';
import { TenantMiddlewareSetup } from './common/services/tenant-middleware-setup.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 50,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 200,
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
    TenantModule,
    DashboardModule,
    JobsModule,
    CacheModule,
    MonitoringModule,
    CronModule,
    RoleModule,
    UserManagementModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    KeepAliveService,
    TenantContextService,
    TenantMiddlewareSetup,
    JwtAuthGuard,
    {
      provide: APP_GUARD,
      useClass: BaseTenancyGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
