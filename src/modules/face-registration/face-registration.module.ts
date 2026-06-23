import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { FaceRegistrationController } from "./face-registration.controller";
import { FaceRegistrationService } from "./face-registration.service";
import { SupabaseStorageService } from "../../common/services/supabase-storage.service";

@Module({
  imports: [PrismaModule],
  controllers: [FaceRegistrationController],
  providers: [FaceRegistrationService, SupabaseStorageService],
})
export class FaceRegistrationModule {}
