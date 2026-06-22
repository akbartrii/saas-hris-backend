import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { HolidayCalendarService } from './holiday-calendar.service';
import { HolidayCalendarController } from './holiday-calendar.controller';

@Module({
  imports: [PrismaModule],
  controllers: [HolidayCalendarController],
  providers: [HolidayCalendarService],
})
export class HolidayCalendarModule {}
