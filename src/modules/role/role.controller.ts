import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { RoleService } from "./role.service";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { AssignPermissionsDto } from "./dto/assign-permissions.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionGuard } from "../../common/guards/permission.guard";
import { RequirePermission } from "../../common/decorators/permission.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("Role")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller("roles")
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @RequirePermission("role", "list")
  @ApiOperation({ summary: "List all roles for current company" })
  async findAll(@CurrentUser("company_id") company_id: string) {
    return this.roleService.findAll(company_id);
  }

  @Get(":id")
  @RequirePermission("role", "list")
  @ApiOperation({ summary: "Get role detail with permissions" })
  async findOne(@Param("id") id: string) {
    return this.roleService.findOne(id);
  }

  @Post()
  @RequirePermission("role", "create")
  @ApiOperation({ summary: "Create a new role" })
  async create(
    @CurrentUser("company_id") company_id: string,
    @Body() dto: CreateRoleDto,
  ) {
    return this.roleService.create(company_id, dto);
  }

  @Put(":id")
  @RequirePermission("role", "update")
  @ApiOperation({ summary: "Update role" })
  async update(@Param("id") id: string, @Body() dto: UpdateRoleDto) {
    return this.roleService.update(id, dto);
  }

  @Put(":id/permissions")
  @RequirePermission("role", "update")
  @ApiOperation({ summary: "Assign permissions to role" })
  async assignPermissions(
    @Param("id") id: string,
    @Body() dto: AssignPermissionsDto,
  ) {
    return this.roleService.assignPermissions(id, dto);
  }

  @Delete(":id")
  @RequirePermission("role", "delete")
  @ApiOperation({ summary: "Deactivate role (soft delete)" })
  async remove(@Param("id") id: string) {
    return this.roleService.remove(id);
  }
}
