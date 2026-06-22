import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { WorkScheduleController } from './work-schedule.controller';
import { WorkScheduleService } from './work-schedule.service';

@Module({
  imports: [PrismaModule],
  controllers: [WorkScheduleController],
  providers: [WorkScheduleService],
})
export class WorkScheduleModule {}
