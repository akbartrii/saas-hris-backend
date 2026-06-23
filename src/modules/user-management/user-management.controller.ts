import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { UserManagementService } from "./user-management.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UserQueryDto } from "./dto/user-query.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionGuard } from "../../common/guards/permission.guard";
import { RequirePermission } from "../../common/decorators/permission.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("User Management")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller("users")
export class UserManagementController {
  constructor(private readonly userManagementService: UserManagementService) {}

  @Get()
  @RequirePermission("user", "list")
  @ApiOperation({ summary: "List all users for current company" })
  async findAll(
    @CurrentUser("company_id") company_id: string,
    @Query() query: UserQueryDto,
  ) {
    return this.userManagementService.findAll(company_id, query);
  }

  @Get(":id")
  @RequirePermission("user", "list")
  @ApiOperation({ summary: "Get user detail" })
  async findOne(@Param("id") id: string) {
    return this.userManagementService.findOne(id);
  }

  @Post()
  @RequirePermission("user", "create")
  @ApiOperation({ summary: "Create a new user" })
  async create(
    @CurrentUser("company_id") company_id: string,
    @Body() dto: CreateUserDto,
  ) {
    return this.userManagementService.create(company_id, dto);
  }

  @Put(":id")
  @RequirePermission("user", "update")
  @ApiOperation({ summary: "Update user" })
  async update(@Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.userManagementService.update(id, dto);
  }

  @Put(":id/activate")
  @RequirePermission("user", "update")
  @ApiOperation({ summary: "Activate user" })
  async activate(@Param("id") id: string) {
    return this.userManagementService.activate(id);
  }

  @Delete(":id")
  @RequirePermission("user", "delete")
  @ApiOperation({ summary: "Deactivate user (soft delete)" })
  async remove(@Param("id") id: string) {
    return this.userManagementService.remove(id);
  }
}
