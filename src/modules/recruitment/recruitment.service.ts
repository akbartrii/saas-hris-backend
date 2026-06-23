import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateJobDto } from "./dto/create-job.dto";
import { ApplyJobDto } from "./dto/apply-job.dto";
import { UpdateApplicationStatusDto } from "./dto/update-application-status.dto";
import { UpdateJobDto } from "./dto/update-job.dto";
import { ListJobDto } from "./dto/list-job.dto";

@Injectable()
export class RecruitmentService {
  constructor(private prisma: PrismaService) {}

  private async getEmployeeFromUser(userId: string) {
    const user = await this.prisma.ms_users.findUnique({
      where: { id: userId },
      include: { ms_employees: true, ms_roles: true },
    });
    if (!user || !user.ms_employees) {
      throw new NotFoundException("Employee not found");
    }
    return user;
  }

  private generateSlug(title: string): string {
    return (
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") +
      "-" +
      Date.now()
    );
  }

  async createJob(userId: string, companyId: string, dto: CreateJobDto) {
    const user = await this.getEmployeeFromUser(userId);

    const roleName = user.ms_roles?.name || "karyawan";
    if (!["admin", "hrd", "manager_hrga", "super_admin"].includes(roleName)) {
      throw new ForbiddenException("Only HR/Admin can create job postings");
    }

    const slug = dto.public_slug || this.generateSlug(dto.title);

    const existing = await this.prisma.ms_job_postings.findUnique({
      where: { public_slug: slug },
    });
    if (existing) {
      throw new BadRequestException("Public slug already exists");
    }

    const job = await this.prisma.ms_job_postings.create({
      data: {
        company_id: companyId,
        title: dto.title,
        department_id: dto.department_id,
        position_id: dto.position_id,
        location_id: dto.location_id,
        description: dto.description,
        requirements: dto.requirements,
        employment_type: dto.employment_type,
        public_slug: slug,
        status: "active",
        opened_at: dto.opened_at ? new Date(dto.opened_at) : new Date(),
        closed_at: dto.closed_at ? new Date(dto.closed_at) : null,
        created_by: userId,
      },
    });

    return job;
  }

  async updateJob(
    userId: string,
    companyId: string,
    jobId: string,
    dto: UpdateJobDto,
  ) {
    const user = await this.prisma.ms_users.findUnique({
      where: { id: userId },
      include: { ms_roles: true },
    });

    const roleName = user?.ms_roles?.name || "karyawan";
    if (!["admin", "hrd", "super_admin"].includes(roleName)) {
      throw new ForbiddenException("Only HR/Admin can update job postings");
    }

    const job = await this.prisma.ms_job_postings.findUnique({
      where: { id: jobId, company_id: companyId },
    });

    if (!job) {
      throw new NotFoundException("Job posting not found");
    }

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.requirements !== undefined) data.requirements = dto.requirements;
    if (dto.employment_type !== undefined)
      data.employment_type = dto.employment_type;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.closed_at !== undefined)
      data.closed_at = dto.closed_at ? new Date(dto.closed_at) : null;

    const updated = await this.prisma.ms_job_postings.update({
      where: { id: jobId },
      data,
    });

    return updated;
  }

  async deleteJob(userId: string, companyId: string, jobId: string) {
    const user = await this.prisma.ms_users.findUnique({
      where: { id: userId },
      include: { ms_roles: true },
    });

    const roleName = user?.ms_roles?.name || "karyawan";
    if (!["admin", "hrd", "super_admin"].includes(roleName)) {
      throw new ForbiddenException("Only HR/Admin can delete job postings");
    }

    const job = await this.prisma.ms_job_postings.findUnique({
      where: { id: jobId, company_id: companyId },
    });

    if (!job) {
      throw new NotFoundException("Job posting not found");
    }

    await this.prisma.ms_job_postings.update({
      where: { id: jobId },
      data: { status: "closed" },
    });

    return { message: "Job posting deleted successfully" };
  }

  async listJobs(companyId: string, query: ListJobDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = { company_id: companyId };
    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.ms_job_postings.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          ms_departments: { select: { id: true, name: true } },
          ms_positions: { select: { id: true, name: true } },
          ms_locations: { select: { id: true, name: true } },
        },
      }),
      this.prisma.ms_job_postings.count({ where }),
    ]);

    return { data, meta: { page, limit, total } };
  }

  async getJobBySlug(slug: string) {
    const job = await this.prisma.ms_job_postings.findUnique({
      where: { public_slug: slug },
      include: {
        ms_departments: { select: { id: true, name: true } },
        ms_positions: { select: { id: true, name: true } },
        ms_locations: { select: { id: true, name: true } },
      },
    });

    if (!job) {
      throw new NotFoundException("Job posting not found");
    }

    return job;
  }

  async applyJob(dto: ApplyJobDto) {
    const job = await this.prisma.ms_job_postings.findUnique({
      where: { id: dto.job_posting_id },
    });

    if (!job) {
      throw new NotFoundException("Job posting not found");
    }

    if (job.status !== "active") {
      throw new BadRequestException("Job posting is not open for applications");
    }

    const application = await this.prisma.tr_job_applications.create({
      data: {
        job_posting_id: dto.job_posting_id,
        full_name: dto.full_name,
        email: dto.email,
        phone: dto.phone,
        resume_url: dto.resume_url,
        cover_letter: dto.cover_letter,
        status: "new",
        company_id: job.company_id,
      },
    });

    return application;
  }

  async listApplications(userId: string, companyId: string, query: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = { job_posting: { company_id: companyId } };
    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.tr_job_applications.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          ms_job_postings: {
            include: {
              ms_departments: { select: { id: true, name: true } },
              ms_positions: { select: { id: true, name: true } },
              ms_locations: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.tr_job_applications.count({ where }),
    ]);

    return { data, meta: { page, limit, total } };
  }

  async updateApplicationStatus(
    userId: string,
    companyId: string,
    applicationId: string,
    dto: UpdateApplicationStatusDto,
  ) {
    const application = await this.prisma.tr_job_applications.findUnique({
      where: { id: applicationId, company_id: companyId },
      include: { ms_job_postings: true },
    });

    if (!application) {
      throw new NotFoundException("Application not found");
    }

    await this.prisma.tr_job_applications.update({
      where: { id: applicationId },
      data: {
        status: dto.status,
        notes: dto.notes,
        rejection_email_sent: dto.status === "rejected",
        rejection_email_sent_at: dto.status === "rejected" ? new Date() : null,
      },
    });

    return application;
  }
}
