import { Controller, Post, Body, Get, Delete, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { SaveFcmTokenDto } from "./dto/save-fcm-token.dto";
import { RevokeFcmTokenDto } from "./dto/revoke-fcm-token.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { Public } from "../../common/decorators/public.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @Public()
  @ApiOperation({ summary: "Login with email and password" })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get("profile")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user profile" })
  async getProfile(@CurrentUser("id") userId: string) {
    return this.authService.getProfile(userId);
  }

  @Post("verify")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Verify JWT token" })
  async verify() {
    return { message: "Token is valid" };
  }

  @Post("fcm-token")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Save FCM token for push notifications" })
  async saveFcmToken(
    @CurrentUser("id") userId: string,
    @Body() dto: SaveFcmTokenDto,
  ) {
    return this.authService.saveFcmToken(userId, dto);
  }

  @Delete("fcm-token")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Revoke a specific FCM token (soft delete)" })
  async revokeFcmToken(
    @CurrentUser("id") userId: string,
    @Body() dto: RevokeFcmTokenDto,
  ) {
    return this.authService.revokeFcmToken(userId, dto);
  }

  @Delete("fcm-token/all")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Revoke all FCM tokens for current user" })
  async revokeAllFcmTokens(@CurrentUser("id") userId: string) {
    return this.authService.revokeAllFcmTokens(userId);
  }
}
