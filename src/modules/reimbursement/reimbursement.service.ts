import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateReimbursementDto } from "./dto/create-reimbursement.dto";
import { ListReimbursementDto } from "./dto/list-reimbursement.dto";
import { ApproveReimbursementDto } from "./dto/approve-reimbursement.dto";

@Injectable()
export class ReimbursementService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async list(
    userId: string,
    companyId: string,
    userRole: string,
    query: ListReimbursementDto,
  ) {
    const user = await this.prisma.ms_users.findUnique({
      where: { id: userId, company_id: companyId },
      include: { ms_employees: true },
    });
    if (!user || !user.ms_employees) {
      throw new NotFoundException("Employee not found");
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: any = { company_id: companyId };
    const isAdmin = ["admin", "super_admin"].includes(userRole);

    if (!isAdmin) {
      where.employee_id = user.ms_employees.id;
    }

    if (query.status) {
      where.status = query.status;
    }
    if (query.category) {
      where.category = query.category;
    }

    const [data, total] = await Promise.all([
      this.prisma.tr_reimbursements.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
      this.prisma.tr_reimbursements.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return { data, meta: { page, limit, total, totalPages } };
  }

  async listSubordinateReimbursements(
    userId: string,
    companyId: string,
    query: ListReimbursementDto,
  ) {
    const user = await this.prisma.ms_users.findUnique({
      where: { id: userId, company_id: companyId },
      include: { ms_employees: true },
    });
    if (!user || !user.ms_employees) {
      throw new NotFoundException("Employee not found");
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const subordinates = await this.prisma.ms_employees.findMany({
      where: {
        OR: [
          { supervisor_id: user.ms_employees.id },
          { manager_id: user.ms_employees.id },
        ],
        company_id: companyId,
      },
      select: { id: true },
    });

    const subordinateIds = subordinates.map((e) => e.id);
    if (subordinateIds.length === 0) {
      return { data: [], meta: { page, limit, total: 0, totalPages: 0 } };
    }

    const where: any = {
      employee_id: { in: subordinateIds },
      company_id: companyId,
    };

    if (query.status) {
      where.status = query.status;
    }
    if (query.category) {
      where.category = query.category;
    }

    const [data, total] = await Promise.all([
      this.prisma.tr_reimbursements.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
      this.prisma.tr_reimbursements.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return { data, meta: { page, limit, total, totalPages } };
  }

  async create(userId: string, companyId: string, dto: CreateReimbursementDto) {
    const user = await this.prisma.ms_users.findUnique({
      where: { id: userId, company_id: companyId },
      include: { ms_employees: true },
    });
    if (!user || !user.ms_employees) {
      throw new NotFoundException("Employee not found");
    }

    const reimbursement = await this.prisma.tr_reimbursements.create({
      data: {
        employee_id: user.ms_employees.id,
        company_id: companyId,
        supervisor_id: user.ms_employees.supervisor_id,
        date: new Date(dto.date),
        category: dto.category,
        amount: dto.amount,
        description: dto.description || null,
        proof_image_url: dto.proof_image_url || null,
        status: "pending",
      },
    });

    return reimbursement;
  }

  async approve(
    userId: string,
    companyId: string,
    userRole: string,
    reimbursementId: string,
    dto: ApproveReimbursementDto,
  ) {
    const approver = await this.prisma.ms_users.findUnique({
      where: { id: userId, company_id: companyId },
      include: { ms_employees: true },
    });
    if (!approver || !approver.ms_employees) {
      throw new NotFoundException("Approver not found");
    }

    const reimbursement = await this.prisma.tr_reimbursements.findUnique({
      where: { id: reimbursementId, company_id: companyId },
    });
    if (!reimbursement) {
      throw new NotFoundException("Reimbursement not found");
    }

    if (dto.action === "reject") {
      return this.prisma.tr_reimbursements.update({
        where: { id: reimbursementId },
        data: {
          status: "rejected",
          rejection_reason: dto.rejection_reason || "Rejected",
        },
      });
    }

    if (dto.action === "approve") {
      return this.prisma.tr_reimbursements.update({
        where: { id: reimbursementId },
        data: {
          status: "approved",
          approved_at: new Date(),
          hr_approved_by: approver.ms_employees.id,
        },
      });
    }

    throw new BadRequestException("Invalid action");
  }
}
