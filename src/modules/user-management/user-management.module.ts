import { Module } from '@nestjs/common';
import { UserManagementController } from './user-management.controller';
import { UserManagementService } from './user-management.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { PermissionGuard } from '../../common/guards/permission.guard';

@Module({
  imports: [PrismaModule],
  controllers: [UserManagementController],
  providers: [UserManagementService, PermissionGuard],
  exports: [UserManagementService],
})
export class UserManagementModule {}
