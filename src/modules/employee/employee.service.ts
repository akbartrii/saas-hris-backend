import * as bcrypt from "bcryptjs";
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { ListEmployeeDto } from "./dto/list-employee.dto";
import { UpdateEmployeeDto } from "./dto/update-employee.dto";
import { CreateEmployeeDto } from "./dto/create-employee.dto";

@Injectable()
export class EmployeeService {
  constructor(private prisma: PrismaService) {}

  async createEmployee(
    userId: string,
    companyId: string,
    userRole: string,
    dto: CreateEmployeeDto,
  ) {
    if (!["manager_hrga", "hrd", "admin", "super_admin"].includes(userRole)) {
      throw new ForbiddenException("Only HR/Admin can create employees");
    }

    if (dto.email && dto.password) {
      const existingUser = await this.prisma.ms_users.findUnique({
        where: { email: dto.email },
      });
      if (existingUser) {
        throw new BadRequestException("Email already registered");
      }

      let role_id = dto.role_id;
      if (!role_id) {
        const karyawanRole = await this.prisma.ms_roles.findFirst({
          where: { name: "karyawan" },
        });
        role_id = karyawanRole?.id;
      }

      if (!role_id) {
        throw new BadRequestException("Default role not found");
      }

      const hashedPassword = await bcrypt.hash(dto.password, 10);

      const newUser = await this.prisma.ms_users.create({
        data: {
          email: dto.email,
          password_hash: hashedPassword,
          full_name: dto.full_name,
          phone: dto.phone || null,
          role_id,
          company_id: companyId,
        },
      });

      const newEmployee = await this.prisma.ms_employees.create({
        data: {
          user_id: newUser.id,
          department_id: dto.department_id,
          position_id: dto.position_id,
          location_id: dto.location_id,
          supervisor_id: dto.supervisor_id,
          manager_id: dto.manager_id,
          team_id: dto.team_id,
          nik: dto.nik,
          full_name: dto.full_name,
          gender: dto.gender,
          birth_date: dto.birth_date,
          address: dto.address,
          employment_status: dto.employment_status,
          join_date: dto.join_date,
          contract_end_date: dto.contract_end_date,
          resignation_date: dto.resignation_date,
          base_salary: dto.base_salary,
          fixed_allowance: dto.fixed_allowance,
          phone_allowance: dto.phone_allowance,
          dinas_allowance: dto.dinas_allowance,
          bpjs_payment_type: dto.bpjs_payment_type,
          ptkp_status: dto.ptkp_status,
          npwp: dto.npwp,
          bank_name: dto.bank_name,
          bank_account_number: dto.bank_account_number,
          bank_account_holder: dto.bank_account_holder,
          shift_type: dto.shift_type,
          company_id: companyId,
        },
      });

      return newEmployee;
    }

    return this.prisma.ms_employees.create({
      data: {
        department_id: dto.department_id,
        position_id: dto.position_id,
        location_id: dto.location_id,
        supervisor_id: dto.supervisor_id,
        manager_id: dto.manager_id,
        team_id: dto.team_id,
        nik: dto.nik,
        full_name: dto.full_name,
        gender: dto.gender,
        birth_date: dto.birth_date,
        address: dto.address,
        employment_status: dto.employment_status,
        join_date: dto.join_date,
        contract_end_date: dto.contract_end_date,
        resignation_date: dto.resignation_date,
        base_salary: dto.base_salary,
        fixed_allowance: dto.fixed_allowance,
        phone_allowance: dto.phone_allowance,
        dinas_allowance: dto.dinas_allowance,
        bpjs_payment_type: dto.bpjs_payment_type,
        ptkp_status: dto.ptkp_status,
        npwp: dto.npwp,
        bank_name: dto.bank_name,
        bank_account_number: dto.bank_account_number,
        bank_account_holder: dto.bank_account_holder,
        shift_type: dto.shift_type,
        company_id: companyId,
      },
    });
  }

  async listEmployees(
    userId: string,
    companyId: string,
    userRole: string,
    query: ListEmployeeDto,
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = { company_id: companyId };

    if (!["admin", "hrd", "manager_hrga", "super_admin"].includes(userRole)) {
      where.id = userId;
    }

    if (query.search) {
      where.OR = [
        { full_name: { contains: query.search, mode: "insensitive" } },
        { nik: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.ms_employees.findMany({
        where,
        skip,
        take: limit,
        orderBy: { full_name: "asc" },
        include: {
          ms_users: { select: { id: true, email: true, full_name: true } },
          ms_departments_ms_employees_department_idToms_departments: {
            select: { id: true, name: true },
          },
          ms_positions: { select: { id: true, name: true } },
          ms_locations: { select: { id: true, name: true, type: true } },
          ms_teams: { select: { id: true, name: true } },
          tr_leave_requests_tr_leave_requests_employee_idToms_employees: {
            select: {
              id: true,
              start_date: true,
              end_date: true,
              total_days: true,
              reason: true,
              status: true,
            },
          },
          tr_overtime_requests_tr_overtime_requests_employee_idToms_employees: {
            select: {
              id: true,
              date: true,
              total_hours: true,
              description: true,
              status: true,
            },
          },
          tr_remote_work_requests_tr_remote_work_requests_employee_idToms_employees:
            {
              select: {
                id: true,
                start_date: true,
                end_date: true,
                status: true,
                address: true,
              },
            },
        },
      }),
      this.prisma.ms_employees.count({ where }),
    ]);

    return { data, meta: { page, limit, total } };
  }

  async getEmployeeDetail(
    userId: string,
    companyId: string,
    employeeId: string,
  ) {
    const employee = await this.prisma.ms_employees.findUnique({
      where: { id: employeeId, company_id: companyId },
      include: {
        ms_users: {
          select: { id: true, email: true, full_name: true, phone: true },
        },
        ms_departments_ms_employees_department_idToms_departments: {
          select: { id: true, name: true },
        },
        ms_positions: { select: { id: true, name: true } },
        ms_locations: { select: { id: true, name: true, type: true } },
        ms_teams: { select: { id: true, name: true } },
        ms_face_registrations: true,
        tr_leave_requests_tr_leave_requests_employee_idToms_employees: {
          select: {
            id: true,
            start_date: true,
            end_date: true,
            total_days: true,
            reason: true,
            status: true,
            ms_leave_types: { select: { id: true, name: true } },
          },
        },
        tr_overtime_requests_tr_overtime_requests_employee_idToms_employees: {
          select: {
            id: true,
            date: true,
            total_hours: true,
            description: true,
            status: true,
          },
        },
        tr_remote_work_requests_tr_remote_work_requests_employee_idToms_employees:
          {
            select: {
              id: true,
              start_date: true,
              end_date: true,
              status: true,
              address: true,
              radius_meters: true,
            },
          },
      },
    });

    if (!employee) {
      throw new NotFoundException("Employee not found");
    }

    return employee;
  }

  async updateEmployee(
    userId: string,
    companyId: string,
    employeeId: string,
    dto: UpdateEmployeeDto,
  ) {
    const employee = await this.prisma.ms_employees.findUnique({
      where: { id: employeeId, company_id: companyId },
    });
    if (!employee) {
      throw new NotFoundException("Employee not found");
    }

    const data: any = {};
    if (dto.department_id !== undefined) data.department_id = dto.department_id;
    if (dto.position_id !== undefined) data.position_id = dto.position_id;
    if (dto.location_id !== undefined) data.location_id = dto.location_id;
    if (dto.supervisor_id !== undefined) data.supervisor_id = dto.supervisor_id;
    if (dto.manager_id !== undefined) data.manager_id = dto.manager_id;
    if (dto.team_id !== undefined) data.team_id = dto.team_id;
    if (dto.nik !== undefined) data.nik = dto.nik;
    if (dto.full_name !== undefined) data.full_name = dto.full_name;
    if (dto.birth_date !== undefined) data.birth_date = dto.birth_date;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.employment_status !== undefined)
      data.employment_status = dto.employment_status;
    if (dto.join_date !== undefined) data.join_date = dto.join_date;
    if (dto.contract_end_date !== undefined)
      data.contract_end_date = dto.contract_end_date;
    if (dto.resignation_date !== undefined)
      data.resignation_date = dto.resignation_date;
    if (dto.base_salary !== undefined) data.base_salary = dto.base_salary;
    if (dto.fixed_allowance !== undefined)
      data.fixed_allowance = dto.fixed_allowance;
    if (dto.phone_allowance !== undefined)
      data.phone_allowance = dto.phone_allowance;
    if (dto.dinas_allowance !== undefined)
      data.dinas_allowance = dto.dinas_allowance;
    if (dto.bpjs_payment_type !== undefined)
      data.bpjs_payment_type = dto.bpjs_payment_type;
    if (dto.ptkp_status !== undefined) data.ptkp_status = dto.ptkp_status;
    if (dto.npwp !== undefined) data.npwp = dto.npwp;
    if (dto.bank_name !== undefined) data.bank_name = dto.bank_name;
    if (dto.bank_account_number !== undefined)
      data.bank_account_number = dto.bank_account_number;
    if (dto.bank_account_holder !== undefined)
      data.bank_account_holder = dto.bank_account_holder;
    if (dto.shift_type !== undefined) data.shift_type = dto.shift_type;

    return this.prisma.ms_employees.update({
      where: { id: employeeId },
      data,
    });
  }

  async getEmployeeSchedules(
    userId: string,
    companyId: string,
    employeeId: string,
  ) {
    const schedules = await this.prisma.tr_employee_schedules.findMany({
      where: {
        employee_id: employeeId,
        company_id: companyId,
      },
      include: { ms_work_schedules: true },
      orderBy: { effective_date: "asc" },
    });

    return schedules;
  }

  async getTeamMates(employeeId: string, companyId: string) {
    const employee = await this.prisma.ms_employees.findUnique({
      where: { id: employeeId },
    });
    if (!employee) throw new NotFoundException("Employee not found");
    return this.prisma.ms_employees.findMany({
      where: {
        supervisor_id: employee.supervisor_id,
        company_id: companyId,
        id: { not: employeeId },
      },
    });
  }

  async getSubordinates(employeeId: string, companyId: string) {
    return this.prisma.ms_employees.findMany({
      where: { supervisor_id: employeeId, company_id: companyId },
    });
  }

  async assignLocation(
    userId: string,
    companyId: string,
    employeeId: string,
    locationId: string,
  ) {
    const employee = await this.prisma.ms_employees.findUnique({
      where: { id: employeeId, company_id: companyId },
    });
    if (!employee) {
      throw new NotFoundException("Employee not found");
    }

    return this.prisma.ms_employees.update({
      where: { id: employeeId },
      data: { location_id: locationId },
    });
  }
}
