import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ParameterModule } from '../parameter/parameter.module';
import { LeaveService } from './leave.service';
import { LeaveController } from './leave.controller';

@Module({
  imports: [PrismaModule, ParameterModule],
  controllers: [LeaveController],
  providers: [LeaveService],
})
export class LeaveModule {}
