import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TimeOffTypeController } from './time-off-type.controller';
import { TimeOffTypeService } from './time-off-type.service';

@Module({
  imports: [PrismaModule],
  controllers: [TimeOffTypeController],
  providers: [TimeOffTypeService],
})
export class TimeOffTypeModule {}
