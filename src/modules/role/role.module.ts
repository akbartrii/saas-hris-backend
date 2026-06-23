import { Module } from "@nestjs/common";
import { RoleController } from "./role.controller";
import { RoleService } from "./role.service";
import { PrismaModule } from "../../prisma/prisma.module";
import { PermissionGuard } from "../../common/guards/permission.guard";

@Module({
  imports: [PrismaModule],
  controllers: [RoleController],
  providers: [RoleService, PermissionGuard],
  exports: [RoleService],
})
export class RoleModule {}
