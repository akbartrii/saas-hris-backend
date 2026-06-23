import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { SupabaseStorageService } from "../../common/services/supabase-storage.service";

@Injectable()
export class FaceRegistrationService {
  private readonly logger = new Logger(FaceRegistrationService.name);
  private readonly STORAGE_BUCKET = "face-registrations";

  constructor(
    private prisma: PrismaService,
    private storageService: SupabaseStorageService,
  ) {}

  async getStatus(userId: string, _companyId: string) {
    const user = await this.prisma.ms_users.findUnique({
      where: { id: userId },
      include: { ms_employees: true },
    });

    if (!user || !user.ms_employees) {
      throw new NotFoundException("Employee not found");
    }

    const registration = await this.prisma.ms_face_registrations.findUnique({
      where: { employee_id: user.ms_employees.id },
    });

    return {
      status: user.ms_employees.face_registration_status || "not_registered",
      registered_at: registration?.registered_at || null,
      photos: registration
        ? {
            front: registration.front_photo_url,
            smile: registration.smile_photo_url,
            right: registration.right_photo_url,
            left: registration.left_photo_url,
          }
        : null,
    };
  }

  async register(
    userId: string,
    companyId: string,
    files: {
      front_photo: Express.Multer.File;
      smile_photo: Express.Multer.File;
      right_photo: Express.Multer.File;
      left_photo: Express.Multer.File;
    },
  ) {
    const user = await this.prisma.ms_users.findUnique({
      where: { id: userId },
      include: { ms_employees: true },
    });

    if (!user || !user.ms_employees) {
      throw new NotFoundException("Employee not found");
    }

    const employeeId = user.ms_employees.id;

    // Upload 4 photos (parallel)
    this.logger.log(
      `[FaceReg] Uploading 4 photos for employee ${employeeId}...`,
    );
    const uploadStart = Date.now();

    const uploadPhoto = async (file: Express.Multer.File, pose: string) => {
      const ext = file.mimetype.split("/")[1] || "jpg";
      const path = `companies/${companyId}/faces/${employeeId}/${pose}.${ext}`;
      return this.storageService.uploadFile(
        this.STORAGE_BUCKET,
        path,
        file.buffer,
        file.mimetype,
      );
    };

    const [frontUrl, smileUrl, rightUrl, leftUrl] = await Promise.all([
      uploadPhoto(files.front_photo, "front"),
      uploadPhoto(files.smile_photo, "smile"),
      uploadPhoto(files.right_photo, "right"),
      uploadPhoto(files.left_photo, "left"),
    ]);

    this.logger.log(`[FaceReg] Upload done in ${Date.now() - uploadStart}ms`);

    // Save to DB
    this.logger.log(`[FaceReg] Saving to database...`);
    await this.prisma.ms_face_registrations.upsert({
      where: { employee_id: employeeId },
      update: {
        front_photo_url: frontUrl,
        smile_photo_url: smileUrl,
        right_photo_url: rightUrl,
        left_photo_url: leftUrl,
        updated_at: new Date(),
      },
      create: {
        company_id: companyId,
        employee_id: employeeId,
        front_photo_url: frontUrl,
        smile_photo_url: smileUrl,
        right_photo_url: rightUrl,
        left_photo_url: leftUrl,
      },
    });

    await this.prisma.ms_employees.update({
      where: { id: employeeId },
      data: { face_registration_status: "registered" },
    });

    this.logger.log(
      `[FaceReg] Registration complete for employee ${employeeId}`,
    );

    return {
      message: "Face registration successful",
      status: "registered",
    };
  }
}
