import {
  Controller,
  Get,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags, ApiConsumes } from "@nestjs/swagger";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { FaceRegistrationService } from "./face-registration.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { CompanyContext } from "../../common/decorators/company-context.decorator";

@ApiTags("Face Registration")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("face-registration")
export class FaceRegistrationController {
  constructor(private readonly service: FaceRegistrationService) {}

  @Get("status")
  async getStatus(
    @CurrentUser("userId") userId: string,
    @CompanyContext("id") companyId: string,
  ) {
    return this.service.getStatus(userId, companyId);
  }

  @Post()
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: "front_photo", maxCount: 1 },
      { name: "smile_photo", maxCount: 1 },
      { name: "right_photo", maxCount: 1 },
      { name: "left_photo", maxCount: 1 },
    ]),
  )
  async register(
    @CurrentUser("userId") userId: string,
    @CompanyContext("id") companyId: string,
    @UploadedFiles()
    files: {
      front_photo?: Express.Multer.File[];
      smile_photo?: Express.Multer.File[];
      right_photo?: Express.Multer.File[];
      left_photo?: Express.Multer.File[];
    },
  ) {
    if (
      !files.front_photo?.[0] ||
      !files.smile_photo?.[0] ||
      !files.right_photo?.[0] ||
      !files.left_photo?.[0]
    ) {
      throw new BadRequestException(
        "All 4 photos are required: front, smile, right, left",
      );
    }

    return this.service.register(userId, companyId, {
      front_photo: files.front_photo[0],
      smile_photo: files.smile_photo[0],
      right_photo: files.right_photo[0],
      left_photo: files.left_photo[0],
    });
  }
}
