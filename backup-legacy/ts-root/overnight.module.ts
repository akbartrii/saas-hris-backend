import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { OvernightController } from './overnight.controller';
import { OvernightService } from './overnight.service';

@Module({
  imports: [PrismaModule],
  controllers: [OvernightController],
  providers: [OvernightService],
})
export class OvernightModule {}
